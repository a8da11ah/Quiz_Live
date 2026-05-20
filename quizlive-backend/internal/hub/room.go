package hub

import (
	"context"
	"encoding/json"
	"log/slog"
	"math"
	"sync"
	"time"

	"github.com/google/uuid"
	"quizlive/internal/model"
	"quizlive/internal/store"
)

type roomPhase string

const (
	phaseLobby       roomPhase = "lobby"
	phaseQuestion    roomPhase = "question"
	phaseReveal      roomPhase = "reveal"
	phaseLeaderboard roomPhase = "leaderboard"
	phaseFinished    roomPhase = "finished"
)

// submittedAnswer stores a team's answer for the current question.
type submittedAnswer struct {
	teamID      uuid.UUID
	answer      json.RawMessage
	submittedAt time.Time
}

// questionState holds the full question data loaded at game start.
type questionState struct {
	sessionQuestionID uuid.UUID
	sortOrder         int
	question          *model.Question
	timeLimitSeconds  int
	pointsValue       int
}

// Room manages a single live quiz session.
type Room struct {
	code string
	hub  *Hub
	mu   sync.Mutex

	loaded    bool
	sess      *model.GameSession
	phase     roomPhase
	questions []questionState
	currentQ  int

	host    *Client
	teams   map[uuid.UUID]*Client
	dbTeams map[uuid.UUID]*model.Team

	questionStartedAt time.Time
	answers           map[uuid.UUID]submittedAnswer
	timer             *time.Timer
	pausedRemaining   time.Duration
	isPaused          bool
}

func newRoom(code string, hub *Hub) *Room {
	return &Room{
		code:    code,
		hub:     hub,
		phase:   phaseLobby,
		teams:   make(map[uuid.UUID]*Client),
		dbTeams: make(map[uuid.UUID]*model.Team),
		answers: make(map[uuid.UUID]submittedAnswer),
	}
}

// EnsureLoaded loads session + questions from DB if not already done.
func (r *Room) EnsureLoaded(ctx context.Context, sess *model.GameSession, sessStore *store.SessionStore, qStore *store.QuestionStore) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if r.loaded {
		return nil
	}

	r.sess = sess

	// Load session questions (ordered)
	sqs, err := sessStore.ListQuestions(ctx, sess.ID)
	if err != nil {
		return err
	}

	r.questions = make([]questionState, 0, len(sqs))
	for _, sq := range sqs {
		q, err := qStore.Get(ctx, sq.QuestionID)
		if err != nil {
			slog.Warn("skip question load error", "qid", sq.QuestionID, "err", err)
			continue
		}

		timeLimit := 30
		if sq.TimeLimitOverride != nil {
			timeLimit = *sq.TimeLimitOverride
		} else if q.TimeLimitSeconds != nil {
			timeLimit = *q.TimeLimitSeconds
		}

		points := 100
		if sq.PointsOverride != nil {
			points = *sq.PointsOverride
		} else if q.PointsValue != nil {
			points = *q.PointsValue
		}

		r.questions = append(r.questions, questionState{
			sessionQuestionID: sq.ID,
			sortOrder:         sq.SortOrder,
			question:          q,
			timeLimitSeconds:  timeLimit,
			pointsValue:       points,
		})
	}

	// Sync phase from DB status
	switch sess.Status {
	case model.SessionStatusLobby:
		r.phase = phaseLobby
	case model.SessionStatusActive:
		r.phase = phaseQuestion
	case model.SessionStatusPaused:
		r.phase = phaseQuestion
		r.isPaused = true
	}

	r.loaded = true
	return nil
}

// RegisterHost adds/replaces the host client and sends a state sync.
func (r *Room) RegisterHost(c *Client) {
	r.mu.Lock()
	r.host = c
	sess := r.sess
	teams := r.teamListLocked()
	phase := string(r.phase)
	totalQ := len(r.questions)
	curQ := r.currentQ

	// Queue: lightweight per-question metadata (host-only, no answer keys).
	queue := make([]map[string]any, len(r.questions))
	for i, qs := range r.questions {
		queue[i] = map[string]any{
			"index":              i,
			"title":              qs.question.Title,
			"type":               qs.question.Type,
			"time_limit_seconds": qs.timeLimitSeconds,
			"points_value":       qs.pointsValue,
		}
	}
	r.mu.Unlock()

	if sess != nil {
		c.SendMsg("state.sync", map[string]any{
			"phase":           phase,
			"session":         sess,
			"teams":           teams,
			"total_questions": totalQ,
			"current_index":   curQ,
			"questions":       queue,
		})
	}
}

// Unregister removes a client from the room.
func (r *Room) Unregister(c *Client) {
	r.mu.Lock()
	defer r.mu.Unlock()

	if c.Role == "host" {
		if r.host == c {
			r.host = nil
		}
		return
	}

	if _, ok := r.teams[c.TeamID]; ok {
		delete(r.teams, c.TeamID)
		if team, ok := r.dbTeams[c.TeamID]; ok {
			r.broadcastLocked("team.disconnected", map[string]any{"team_id": c.TeamID})
			slog.Info("team disconnected", "team", team.Name, "session", r.code)
		}
	}
}

// HandleMessage dispatches an incoming message to the appropriate handler.
func (r *Room) HandleMessage(c *Client, msg InMessage) {
	if c.Role == "host" {
		r.handleHostMessage(c, msg)
	} else {
		r.handleTeamMessage(c, msg)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Message dispatch
// ─────────────────────────────────────────────────────────────────────────────

func (r *Room) handleHostMessage(c *Client, msg InMessage) {
	switch msg.Type {
	case "host.launch":
		r.handleLaunch(c)
	case "host.next":
		var p struct {
			Force bool `json:"force"`
		}
		json.Unmarshal(msg.Payload, &p)
		r.handleNext(c, p.Force)
	case "host.pause":
		r.handlePause()
	case "host.resume":
		r.handleResume()
	case "host.finish":
		r.handleFinish()
	case "host.kick":
		var p struct {
			TeamID uuid.UUID `json:"team_id"`
		}
		if err := json.Unmarshal(msg.Payload, &p); err == nil {
			r.handleKick(p.TeamID)
		}
	case "host.skip_question":
		r.handleSkipQuestion(c)
	case "host.extend_time":
		var p struct {
			Seconds int `json:"seconds"`
		}
		if err := json.Unmarshal(msg.Payload, &p); err != nil {
			c.SendError("invalid extend_time payload")
			return
		}
		r.handleExtendTime(c, p.Seconds)
	case "host.adjust_score":
		var p struct {
			TeamID uuid.UUID `json:"team_id"`
			Delta  int       `json:"delta"`
		}
		if err := json.Unmarshal(msg.Payload, &p); err != nil {
			c.SendError("invalid adjust_score payload")
			return
		}
		r.handleAdjustScore(c, p.TeamID, p.Delta)
	default:
		c.SendError("unknown message type: " + msg.Type)
	}
}

func (r *Room) handleTeamMessage(c *Client, msg InMessage) {
	switch msg.Type {
	case "team.join":
		var p struct {
			TeamName string   `json:"team_name"`
			Players  []string `json:"players"`
			Color    string   `json:"color"`
			Avatar   string   `json:"avatar"`
		}
		if err := json.Unmarshal(msg.Payload, &p); err != nil {
			c.SendError("invalid team.join payload")
			return
		}
		r.handleTeamJoin(c, p.TeamName, p.Players, p.Color, p.Avatar)

	case "team.rejoin":
		var p struct {
			TeamID uuid.UUID `json:"team_id"`
		}
		if err := json.Unmarshal(msg.Payload, &p); err != nil || p.TeamID == uuid.Nil {
			c.SendError("invalid team.rejoin payload")
			return
		}
		r.handleTeamRejoin(c, p.TeamID)

	case "answer.submit":
		var p struct {
			SessionQuestionID uuid.UUID       `json:"session_question_id"`
			Answer            json.RawMessage `json:"answer"`
		}
		if err := json.Unmarshal(msg.Payload, &p); err != nil {
			c.SendError("invalid answer.submit payload")
			return
		}
		r.handleAnswerSubmit(c, p.SessionQuestionID, p.Answer)

	default:
		c.SendError("unknown message type: " + msg.Type)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Team join
// ─────────────────────────────────────────────────────────────────────────────

func (r *Room) handleTeamJoin(c *Client, teamName string, players []string, color, avatar string) {
	r.mu.Lock()

	if r.sess == nil {
		r.mu.Unlock()
		c.SendError("session not ready")
		return
	}
	if r.phase != phaseLobby {
		r.mu.Unlock()
		c.SendError("session is not in lobby — can't join now")
		return
	}
	if len(players) == 0 {
		players = []string{teamName}
	}

	sessID := r.sess.ID
	sessName := r.sess.Name
	r.mu.Unlock()

	team, err := r.hub.teamStore.Create(context.Background(), store.CreateTeamInput{
		SessionID:   sessID,
		Name:        teamName,
		Color:       color,
		AvatarEmoji: avatar,
		Players:     players,
	})
	if err != nil {
		slog.Error("create team", "err", err)
		c.SendError("failed to join: " + err.Error())
		return
	}

	r.mu.Lock()
	c.TeamID = team.ID
	r.teams[team.ID] = c
	r.dbTeams[team.ID] = team
	teamList := r.teamListLocked()
	r.mu.Unlock()

	c.SendMsg("joined", map[string]any{
		"team_id": team.ID,
		"session": map[string]any{"name": sessName},
		"teams":   teamList,
	})

	r.broadcastExcept(c, "team.connected", map[string]any{"team": team})
	slog.Info("team joined", "team", teamName, "session", r.code)
}

// handleTeamRejoin reconnects a returning team (e.g. after a page refresh).
// It looks the team up in memory first, falls back to DB, then replaces any
// stale connection and sends the client a full state snapshot.
func (r *Room) handleTeamRejoin(c *Client, teamID uuid.UUID) {
	// 1. Resolve team — check in-memory map first, fall back to DB.
	r.mu.Lock()
	team, inMem := r.dbTeams[teamID]
	r.mu.Unlock()

	if !inMem {
		t, err := r.hub.teamStore.Get(context.Background(), teamID)
		if err != nil {
			slog.Warn("team.rejoin: team not found", "team_id", teamID)
			c.SendError("team not found — session may have ended")
			return
		}
		r.mu.Lock()
		r.dbTeams[t.ID] = t
		r.mu.Unlock()
		team = t
	}

	// 2. Register client (close stale connection if any).
	r.mu.Lock()
	if old, exists := r.teams[teamID]; exists && old != c {
		go old.Conn.Close()
	}
	c.TeamID = teamID
	r.teams[teamID] = c

	// 3. Capture state snapshot while holding the lock.
	phase := string(r.phase)
	sessName := ""
	if r.sess != nil {
		sessName = r.sess.Name
	}
	teamList := r.teamListLocked()
	totalQ := len(r.questions)

	var questionPayload map[string]any
	if r.phase == phaseQuestion && r.currentQ < len(r.questions) {
		qs := r.questions[r.currentQ]
		q := qs.question
		opts := make([]map[string]any, len(q.Options))
		for i, o := range q.Options {
			opts[i] = map[string]any{
				"id": o.ID, "label": o.Label, "sort_order": o.SortOrder,
			}
		}
		questionPayload = map[string]any{
			"session_question_id": qs.sessionQuestionID,
			"index":               r.currentQ,
			"total":               len(r.questions),
			"type":                q.Type,
			"title":               q.Title,
			"options":             opts,
			"time_limit_seconds":  qs.timeLimitSeconds,
			"points_value":        qs.pointsValue,
			"started_at":          r.questionStartedAt.UTC().Format(time.RFC3339Nano),
		}
	}
	r.mu.Unlock()

	// 4. Send full state to the rejoining client.
	payload := map[string]any{
		"team_id":         teamID,
		"session":         map[string]any{"name": sessName},
		"teams":           teamList,
		"phase":           phase,
		"total_questions": totalQ,
	}
	if questionPayload != nil {
		payload["question"] = questionPayload
	}

	c.SendMsg("rejoined", payload)
	slog.Info("team rejoined", "team", team.Name, "session", r.code)
}

// ─────────────────────────────────────────────────────────────────────────────
// Game control
// ─────────────────────────────────────────────────────────────────────────────

func (r *Room) handleLaunch(c *Client) {
	r.mu.Lock()
	defer r.mu.Unlock()

	if r.phase != phaseLobby {
		c.SendError("can only launch from lobby")
		return
	}
	if len(r.teams) == 0 {
		c.SendError("no teams have joined yet")
		return
	}
	if len(r.questions) == 0 {
		c.SendError("session has no questions")
		return
	}

	r.phase = phaseQuestion
	r.currentQ = 0

	r.broadcastLocked("game.started", map[string]any{
		"total_questions": len(r.questions),
	})

	r.startQuestionLocked()
}

func (r *Room) handleNext(c *Client, force bool) {
	r.mu.Lock()
	defer r.mu.Unlock()

	if r.phase != phaseReveal && r.phase != phaseLeaderboard {
		c.SendError("can only advance from reveal or leaderboard phase")
		return
	}

	r.currentQ++
	if r.currentQ >= len(r.questions) {
		r.finishLocked()
		return
	}

	r.phase = phaseQuestion
	r.answers = make(map[uuid.UUID]submittedAnswer)
	r.startQuestionLocked()
}

func (r *Room) handlePause() {
	r.mu.Lock()
	defer r.mu.Unlock()

	if r.phase != phaseQuestion || r.isPaused {
		return
	}

	r.isPaused = true
	elapsed := time.Since(r.questionStartedAt)
	total := time.Duration(r.questions[r.currentQ].timeLimitSeconds) * time.Second
	r.pausedRemaining = total - elapsed
	if r.pausedRemaining < 0 {
		r.pausedRemaining = 0
	}
	if r.timer != nil {
		r.timer.Stop()
	}

	r.broadcastLocked("game.paused", map[string]any{})
}

func (r *Room) handleResume() {
	r.mu.Lock()
	defer r.mu.Unlock()

	if !r.isPaused {
		return
	}
	r.isPaused = false
	remaining := r.pausedRemaining

	r.questionStartedAt = time.Now().Add(
		-time.Duration(r.questions[r.currentQ].timeLimitSeconds)*time.Second + remaining,
	)
	r.timer = time.AfterFunc(remaining, func() {
		r.mu.Lock()
		defer r.mu.Unlock()
		r.closeQuestionLocked()
	})

	r.broadcastLocked("game.resumed", map[string]any{
		"remaining_ms": remaining.Milliseconds(),
	})
}

func (r *Room) handleFinish() {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.finishLocked()
}

// handleSkipQuestion forcibly closes the active question now, instead of
// waiting for the timer to expire.
func (r *Room) handleSkipQuestion(c *Client) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if r.phase != phaseQuestion {
		c.SendError("not in question phase")
		return
	}
	r.closeQuestionLocked()
}

// handleExtendTime adds `seconds` to the current question's time limit and
// reschedules the auto-close timer.  Broadcasts question.extended so clients
// can refresh their countdowns.
func (r *Room) handleExtendTime(c *Client, seconds int) {
	r.mu.Lock()
	defer r.mu.Unlock()

	if r.phase != phaseQuestion {
		c.SendError("not in question phase")
		return
	}
	if seconds < 1 || seconds > 300 {
		c.SendError("seconds must be between 1 and 300")
		return
	}
	if r.isPaused {
		c.SendError("cannot extend a paused question")
		return
	}

	// Bump the configured limit and reschedule the timer.
	r.questions[r.currentQ].timeLimitSeconds += seconds
	newLimit := r.questions[r.currentQ].timeLimitSeconds

	elapsed := time.Since(r.questionStartedAt)
	total := time.Duration(newLimit) * time.Second
	remaining := total - elapsed
	if remaining < 0 {
		remaining = time.Duration(seconds) * time.Second
	}

	if r.timer != nil {
		r.timer.Stop()
	}
	r.timer = time.AfterFunc(remaining, func() {
		r.mu.Lock()
		defer r.mu.Unlock()
		r.closeQuestionLocked()
	})

	r.broadcastLocked("question.extended", map[string]any{
		"added_seconds":          seconds,
		"new_time_limit_seconds": newLimit,
		"remaining_ms":           remaining.Milliseconds(),
	})
}

// handleAdjustScore lets the host nudge a team's score by `delta` (positive or
// negative). Persists to DB, updates in-memory team, broadcasts an updated
// leaderboard so every client refreshes.
func (r *Room) handleAdjustScore(c *Client, teamID uuid.UUID, delta int) {
	if delta == 0 {
		return
	}

	r.mu.Lock()
	team, ok := r.dbTeams[teamID]
	r.mu.Unlock()
	if !ok {
		c.SendError("team not found in this session")
		return
	}

	if err := r.hub.teamStore.UpdateScore(context.Background(), teamID, delta); err != nil {
		slog.Error("adjust score", "err", err)
		c.SendError("failed to update score")
		return
	}

	r.mu.Lock()
	team.Score += delta
	rankings := r.buildRankings()
	r.mu.Unlock()

	r.broadcastLocked("score.adjusted", map[string]any{
		"team_id":   teamID,
		"delta":     delta,
		"new_score": team.Score,
	})
	r.broadcastLocked("leaderboard.updated", map[string]any{
		"rankings": rankings,
	})
}

func (r *Room) handleKick(teamID uuid.UUID) {
	r.mu.Lock()
	kicked, ok := r.teams[teamID]
	if ok {
		delete(r.teams, teamID)
		delete(r.dbTeams, teamID)
	}
	r.mu.Unlock()

	if ok {
		kicked.SendMsg("team.kicked", map[string]any{})
		kicked.Conn.Close()
		r.broadcastExcept(kicked, "team.disconnected", map[string]any{"team_id": teamID})
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Question lifecycle (called with r.mu held)
// ─────────────────────────────────────────────────────────────────────────────

func (r *Room) startQuestionLocked() {
	qs := r.questions[r.currentQ]
	q := qs.question

	opts := make([]map[string]any, len(q.Options))
	for i, o := range q.Options {
		opts[i] = map[string]any{
			"id":         o.ID,
			"label":      o.Label,
			"sort_order": o.SortOrder,
		}
	}

	r.questionStartedAt = time.Now()
	r.answers = make(map[uuid.UUID]submittedAnswer)

	payload := map[string]any{
		"session_question_id": qs.sessionQuestionID,
		"index":               r.currentQ,
		"total":               len(r.questions),
		"type":                q.Type,
		"title":               q.Title,
		"options":             opts,
		"time_limit_seconds":  qs.timeLimitSeconds,
		"points_value":        qs.pointsValue,
		"started_at":          r.questionStartedAt.UTC().Format(time.RFC3339Nano),
	}

	r.broadcastLocked("question.started", payload)

	if r.timer != nil {
		r.timer.Stop()
	}
	limit := time.Duration(qs.timeLimitSeconds) * time.Second
	r.timer = time.AfterFunc(limit, func() {
		r.mu.Lock()
		defer r.mu.Unlock()
		r.closeQuestionLocked()
	})
}

func (r *Room) closeQuestionLocked() {
	if r.phase != phaseQuestion {
		return
	}
	r.phase = phaseReveal

	if r.timer != nil {
		r.timer.Stop()
		r.timer = nil
	}

	qs := r.questions[r.currentQ]
	q := qs.question

	pendingOpenMarks := 0
	for teamID, client := range r.teams {
		sa, answered := r.answers[teamID]
		var result string
		var points int
		var timeTakenMs int64

		if answered {
			timeTakenMs = sa.submittedAt.Sub(r.questionStartedAt).Milliseconds()
			result, points = scoreAnswer(q, sa.answer, timeTakenMs, qs.timeLimitSeconds, qs.pointsValue)
			if result == "pending" {
				pendingOpenMarks++
			}
		} else {
			result = "no_answer"
		}

		if points > 0 {
			if err := r.hub.teamStore.UpdateScore(context.Background(), teamID, points); err != nil {
				slog.Error("update score", "err", err)
			}
			if dbTeam, ok := r.dbTeams[teamID]; ok {
				dbTeam.Score += points
			}
		}

		if dbTeam, ok := r.dbTeams[teamID]; ok {
			client.SendMsg("team.result", map[string]any{
				"result":         result,
				"points_awarded": points,
				"time_taken_ms":  timeTakenMs,
				"score_total":    dbTeam.Score,
			})
		}
	}

	distribution := buildDistribution(q, r.answers)

	r.broadcastLocked("question.revealed", map[string]any{
		"correct_answer":      q.CorrectAnswer,
		"explanation":         q.Explanation,
		"answer_distribution": distribution,
		"pending_open_marks":  pendingOpenMarks,
	})

	rankings := r.buildRankings()
	r.broadcastLocked("leaderboard.updated", map[string]any{
		"rankings": rankings,
	})

	r.phase = phaseLeaderboard
}

func (r *Room) finishLocked() {
	if r.timer != nil {
		r.timer.Stop()
		r.timer = nil
	}
	r.phase = phaseFinished

	rankings := r.buildRankings()
	var winner any
	if len(rankings) > 0 {
		winner = rankings[0]
	}

	r.broadcastLocked("game.finished", map[string]any{
		"winner":   winner,
		"rankings": rankings,
	})

	go func() {
		time.Sleep(30 * time.Minute)
		r.hub.Remove(r.code)
	}()
}

// ─────────────────────────────────────────────────────────────────────────────
// Answer submission
// ─────────────────────────────────────────────────────────────────────────────

func (r *Room) handleAnswerSubmit(c *Client, sqID uuid.UUID, answer json.RawMessage) {
	r.mu.Lock()

	if r.phase != phaseQuestion {
		r.mu.Unlock()
		c.SendError("not in question phase")
		return
	}

	qs := r.questions[r.currentQ]
	if qs.sessionQuestionID != sqID {
		r.mu.Unlock()
		c.SendError("wrong question")
		return
	}

	if _, already := r.answers[c.TeamID]; already {
		r.mu.Unlock()
		c.SendError("already answered")
		return
	}

	r.answers[c.TeamID] = submittedAnswer{
		teamID:      c.TeamID,
		answer:      answer,
		submittedAt: time.Now(),
	}

	// Notify host
	if r.host != nil {
		team := r.dbTeams[c.TeamID]
		teamName := ""
		if team != nil {
			teamName = team.Name
		}
		r.host.SendMsg("answer.received", map[string]any{
			"team_id":       c.TeamID,
			"team_name":     teamName,
			"time_taken_ms": time.Since(r.questionStartedAt).Milliseconds(),
		})
	}

	allAnswered := len(r.answers) >= len(r.teams)
	r.mu.Unlock()

	if allAnswered {
		go func() {
			r.mu.Lock()
			defer r.mu.Unlock()
			r.closeQuestionLocked()
		}()
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Scoring
// ─────────────────────────────────────────────────────────────────────────────

func scoreAnswer(q *model.Question, answer json.RawMessage, timeTakenMs int64, timeLimitSec, pointsValue int) (result string, points int) {
	switch q.Type {
	case model.QuestionTypeMultipleChoice, model.QuestionTypeTrueFalse:
		var ca struct {
			OptionID uuid.UUID `json:"option_id"`
		}
		var ans struct {
			OptionID uuid.UUID `json:"option_id"`
		}
		json.Unmarshal(q.CorrectAnswer, &ca)
		json.Unmarshal(answer, &ans)
		if ans.OptionID == ca.OptionID {
			return "correct", pointsValue
		}
		return "incorrect", 0

	case model.QuestionTypeMultipleSelect:
		var ca struct {
			OptionIDs []uuid.UUID `json:"option_ids"`
		}
		var ans struct {
			OptionIDs []uuid.UUID `json:"option_ids"`
		}
		json.Unmarshal(q.CorrectAnswer, &ca)
		json.Unmarshal(answer, &ans)
		correct := uuidSet(ca.OptionIDs)
		given := uuidSet(ans.OptionIDs)
		if setsEqual(correct, given) {
			return "correct", pointsValue
		}
		matches := 0
		for id := range given {
			if correct[id] {
				matches++
			}
		}
		if matches > 0 && len(given) <= len(correct) {
			return "partial", int(math.Round(float64(pointsValue) * float64(matches) / float64(len(correct))))
		}
		return "incorrect", 0

	case model.QuestionTypeOrderItems:
		var ca struct {
			OrderedIDs []uuid.UUID `json:"ordered_ids"`
		}
		var ans struct {
			OrderedIDs []uuid.UUID `json:"ordered_ids"`
		}
		json.Unmarshal(q.CorrectAnswer, &ca)
		json.Unmarshal(answer, &ans)
		if uuidSlicesEqual(ca.OrderedIDs, ans.OrderedIDs) {
			return "correct", pointsValue
		}
		correct := 0
		for i := 0; i < len(ca.OrderedIDs) && i < len(ans.OrderedIDs); i++ {
			if ca.OrderedIDs[i] == ans.OrderedIDs[i] {
				correct++
			}
		}
		if correct > 0 && len(ca.OrderedIDs) > 0 {
			return "partial", int(math.Round(float64(pointsValue) * float64(correct) / float64(len(ca.OrderedIDs))))
		}
		return "incorrect", 0

	case model.QuestionTypeClosestNumber:
		var ca struct {
			Target float64 `json:"target"`
		}
		var ans struct {
			Value float64 `json:"value"`
		}
		json.Unmarshal(q.CorrectAnswer, &ca)
		json.Unmarshal(answer, &ans)
		diff := math.Abs(ans.Value - ca.Target)
		if diff == 0 {
			return "correct", pointsValue
		}
		threshold := math.Abs(ca.Target) * 0.1
		if ca.Target == 0 {
			threshold = 1
		}
		if diff <= threshold {
			ratio := 1 - (diff / threshold)
			return "partial", int(math.Round(float64(pointsValue) * ratio))
		}
		return "incorrect", 0

	case model.QuestionTypeOpenText:
		return "pending", 0
	}

	return "incorrect", 0
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

func (r *Room) teamListLocked() []any {
	list := make([]any, 0, len(r.dbTeams))
	for _, t := range r.dbTeams {
		list = append(list, t)
	}
	return list
}

func (r *Room) buildRankings() []map[string]any {
	type entry struct {
		team  *model.Team
	}
	entries := make([]entry, 0, len(r.dbTeams))
	for _, t := range r.dbTeams {
		entries = append(entries, entry{team: t})
	}
	for i := 0; i < len(entries); i++ {
		for j := i + 1; j < len(entries); j++ {
			if entries[j].team.Score > entries[i].team.Score {
				entries[i], entries[j] = entries[j], entries[i]
			}
		}
	}
	rankings := make([]map[string]any, len(entries))
	for i, e := range entries {
		rankings[i] = map[string]any{
			"rank":    i + 1,
			"team_id": e.team.ID,
			"name":    e.team.Name,
			"score":   e.team.Score,
			"color":   e.team.Color,
			"avatar":  e.team.AvatarEmoji,
		}
	}
	return rankings
}

func buildDistribution(q *model.Question, answers map[uuid.UUID]submittedAnswer) map[string]int {
	dist := make(map[string]int)
	for _, sa := range answers {
		switch q.Type {
		case model.QuestionTypeMultipleChoice, model.QuestionTypeTrueFalse:
			var ans struct {
				OptionID string `json:"option_id"`
			}
			if err := json.Unmarshal(sa.answer, &ans); err == nil && ans.OptionID != "" {
				dist[ans.OptionID]++
			}
		}
	}
	return dist
}

func (r *Room) broadcastLocked(typ string, payload any) {
	data := mustMarshal(OutMessage{Type: typ, Payload: payload})
	if r.host != nil {
		select {
		case r.host.Send <- data:
		default:
		}
	}
	for _, c := range r.teams {
		select {
		case c.Send <- data:
		default:
		}
	}
}

func (r *Room) broadcastExcept(exclude *Client, typ string, payload any) {
	data := mustMarshal(OutMessage{Type: typ, Payload: payload})
	r.mu.Lock()
	defer r.mu.Unlock()
	if r.host != nil && r.host != exclude {
		select {
		case r.host.Send <- data:
		default:
		}
	}
	for _, c := range r.teams {
		if c != exclude {
			select {
			case c.Send <- data:
			default:
			}
		}
	}
}

func uuidSet(ids []uuid.UUID) map[uuid.UUID]bool {
	m := make(map[uuid.UUID]bool, len(ids))
	for _, id := range ids {
		m[id] = true
	}
	return m
}

func setsEqual(a, b map[uuid.UUID]bool) bool {
	if len(a) != len(b) {
		return false
	}
	for k := range a {
		if !b[k] {
			return false
		}
	}
	return true
}

func uuidSlicesEqual(a, b []uuid.UUID) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}
