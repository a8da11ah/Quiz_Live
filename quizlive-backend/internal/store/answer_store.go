package store

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"quizlive/internal/model"
)

type AnswerStore struct {
	pool *pgxpool.Pool
}

func NewAnswerStore(pool *pgxpool.Pool) *AnswerStore {
	return &AnswerStore{pool: pool}
}

type CreateAnswerInput struct {
	TeamID            uuid.UUID       `json:"team_id"`
	SessionQuestionID uuid.UUID       `json:"session_question_id"`
	SubmittedAnswer   json.RawMessage `json:"submitted_answer"`
	Result            model.AnswerResult `json:"result"`
	PointsAwarded     int             `json:"points_awarded"`
	TimeTakenMs       *int            `json:"time_taken_ms"`
}

func (s *AnswerStore) Create(ctx context.Context, in CreateAnswerInput) (*model.Answer, error) {
	now := time.Now()
	var a model.Answer
	var submittedBytes []byte
	err := s.pool.QueryRow(ctx,
		`INSERT INTO answers
		 (team_id, session_question_id, submitted_answer, result, points_awarded, time_taken_ms, submitted_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 RETURNING id, team_id, session_question_id, submitted_answer, result, points_awarded, time_taken_ms, submitted_at, marked_at`,
		in.TeamID, in.SessionQuestionID, []byte(in.SubmittedAnswer),
		string(in.Result), in.PointsAwarded, in.TimeTakenMs, now,
	).Scan(
		&a.ID, &a.TeamID, &a.SessionQuestionID, &submittedBytes,
		&a.Result, &a.PointsAwarded, &a.TimeTakenMs, &a.SubmittedAt, &a.MarkedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("create answer: %w", err)
	}
	a.SubmittedAnswer = json.RawMessage(submittedBytes)
	return &a, nil
}

func (s *AnswerStore) ListBySessionQuestion(ctx context.Context, sessionQuestionID uuid.UUID) ([]model.Answer, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, team_id, session_question_id, submitted_answer, result,
		        points_awarded, time_taken_ms, submitted_at, marked_at
		 FROM answers
		 WHERE session_question_id = $1`,
		sessionQuestionID,
	)
	if err != nil {
		return nil, fmt.Errorf("list answers: %w", err)
	}
	defer rows.Close()

	var answers []model.Answer
	for rows.Next() {
		var a model.Answer
		var submittedBytes []byte
		if err := rows.Scan(
			&a.ID, &a.TeamID, &a.SessionQuestionID, &submittedBytes,
			&a.Result, &a.PointsAwarded, &a.TimeTakenMs, &a.SubmittedAt, &a.MarkedAt,
		); err != nil {
			return nil, fmt.Errorf("scan answer: %w", err)
		}
		a.SubmittedAnswer = json.RawMessage(submittedBytes)
		answers = append(answers, a)
	}
	return answers, rows.Err()
}

// Mark updates an open_text answer with the host's verdict.
func (s *AnswerStore) Mark(ctx context.Context, id uuid.UUID, result model.AnswerResult, points int) (*model.Answer, error) {
	var a model.Answer
	var submittedBytes []byte
	err := s.pool.QueryRow(ctx,
		`UPDATE answers
		 SET result = $1, points_awarded = $2, marked_at = NOW()
		 WHERE id = $3 AND result = 'pending'
		 RETURNING id, team_id, session_question_id, submitted_answer, result, points_awarded, time_taken_ms, submitted_at, marked_at`,
		string(result), points, id,
	).Scan(
		&a.ID, &a.TeamID, &a.SessionQuestionID, &submittedBytes,
		&a.Result, &a.PointsAwarded, &a.TimeTakenMs, &a.SubmittedAt, &a.MarkedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("mark answer: %w", err)
	}
	a.SubmittedAnswer = json.RawMessage(submittedBytes)
	return &a, nil
}

func (s *AnswerStore) CountPending(ctx context.Context, sessionQuestionID uuid.UUID) (int, error) {
	var n int
	err := s.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM answers WHERE session_question_id = $1 AND result = 'pending'`,
		sessionQuestionID,
	).Scan(&n)
	if err != nil {
		return 0, fmt.Errorf("count pending: %w", err)
	}
	return n, nil
}

func (s *AnswerStore) Get(ctx context.Context, id uuid.UUID) (*model.Answer, error) {
	var a model.Answer
	var submittedBytes []byte
	err := s.pool.QueryRow(ctx,
		`SELECT id, team_id, session_question_id, submitted_answer, result,
		        points_awarded, time_taken_ms, submitted_at, marked_at
		 FROM answers WHERE id = $1`,
		id,
	).Scan(
		&a.ID, &a.TeamID, &a.SessionQuestionID, &submittedBytes,
		&a.Result, &a.PointsAwarded, &a.TimeTakenMs, &a.SubmittedAt, &a.MarkedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("get answer: %w", err)
	}
	a.SubmittedAnswer = json.RawMessage(submittedBytes)
	return &a, nil
}

// NoAnswer inserts a no_answer record for teams that did not submit.
func (s *AnswerStore) NoAnswer(ctx context.Context, teamID, sessionQuestionID uuid.UUID) error {
	_, err := s.pool.Exec(ctx,
		`INSERT INTO answers (team_id, session_question_id, result)
		 VALUES ($1, $2, 'no_answer')
		 ON CONFLICT (team_id, session_question_id) DO NOTHING`,
		teamID, sessionQuestionID,
	)
	return err
}

// ensure pgx is imported (used transitively via pgx.ErrNoRows in callers)
var _ = pgx.ErrNoRows
