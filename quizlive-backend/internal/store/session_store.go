package store

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"math/rand"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"quizlive/internal/model"
)

type SessionStore struct {
	pool *pgxpool.Pool
}

func NewSessionStore(pool *pgxpool.Pool) *SessionStore {
	return &SessionStore{pool: pool}
}

type CreateSessionInput struct {
	Name          string              `json:"name"         validate:"required,min=1"`
	ScoringMode   model.ScoringMode   `json:"scoring_mode" validate:"required,oneof=standard speed_bonus streak elimination custom"`
	ScoringConfig json.RawMessage     `json:"scoring_config"`
	QuestionIDs   []uuid.UUID         `json:"question_ids"`
}

type UpdateSessionInput struct {
	Name          string              `json:"name"         validate:"required,min=1"`
	ScoringMode   model.ScoringMode   `json:"scoring_mode" validate:"required,oneof=standard speed_bonus streak elimination custom"`
	ScoringConfig json.RawMessage     `json:"scoring_config"`
	QuestionIDs   []uuid.UUID         `json:"question_ids"`
}

// Create inserts a new draft session with a unique session code.
// The code is generated at creation time so the NOT NULL constraint is satisfied.
// Retries up to 5 times on unique code collisions (§11.6).
func (s *SessionStore) Create(ctx context.Context, in CreateSessionInput) (*model.GameSession, error) {
	cfg := in.ScoringConfig
	if len(cfg) == 0 {
		cfg = json.RawMessage(`{}`)
	}

	for range 5 {
		sess, err := s.tryCreate(ctx, in.Name, in.ScoringMode, cfg, in.QuestionIDs)
		if err == nil {
			return sess, nil
		}
		if !isUniqueViolation(err) {
			return nil, err
		}
	}
	return nil, errors.New("session code: 5 collision retries exhausted")
}

func (s *SessionStore) tryCreate(
	ctx context.Context,
	name string,
	mode model.ScoringMode,
	cfg json.RawMessage,
	questionIDs []uuid.UUID,
) (*model.GameSession, error) {
	code := randomCode(6)

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var sess model.GameSession
	var cfgBytes []byte
	err = tx.QueryRow(ctx,
		`INSERT INTO game_sessions (name, session_code, scoring_mode, scoring_config)
		 VALUES ($1, $2, $3, $4)
		 RETURNING id, name, session_code, status, scoring_mode, scoring_config,
		           current_question_index, started_at, finished_at, created_at, updated_at`,
		name, code, string(mode), []byte(cfg),
	).Scan(
		&sess.ID, &sess.Name, &sess.SessionCode, &sess.Status, &sess.ScoringMode,
		&cfgBytes, &sess.CurrentQuestionIndex, &sess.StartedAt, &sess.FinishedAt,
		&sess.CreatedAt, &sess.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	sess.ScoringConfig = json.RawMessage(cfgBytes)

	for i, qID := range questionIDs {
		if _, err := tx.Exec(ctx,
			`INSERT INTO session_questions (session_id, question_id, sort_order) VALUES ($1, $2, $3)`,
			sess.ID, qID, i,
		); err != nil {
			return nil, fmt.Errorf("insert session question: %w", err)
		}
	}

	return &sess, tx.Commit(ctx)
}

func (s *SessionStore) Get(ctx context.Context, id uuid.UUID) (*model.GameSession, error) {
	var sess model.GameSession
	var cfgBytes []byte
	err := s.pool.QueryRow(ctx,
		`SELECT id, name, session_code, status, scoring_mode, scoring_config,
		        current_question_index, started_at, finished_at, created_at, updated_at
		 FROM game_sessions
		 WHERE id = $1`,
		id,
	).Scan(
		&sess.ID, &sess.Name, &sess.SessionCode, &sess.Status, &sess.ScoringMode,
		&cfgBytes, &sess.CurrentQuestionIndex, &sess.StartedAt, &sess.FinishedAt,
		&sess.CreatedAt, &sess.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("get session: %w", err)
	}
	sess.ScoringConfig = json.RawMessage(cfgBytes)
	return &sess, nil
}

func (s *SessionStore) GetByCode(ctx context.Context, code string) (*model.GameSession, error) {
	var sess model.GameSession
	var cfgBytes []byte
	err := s.pool.QueryRow(ctx,
		`SELECT id, name, session_code, status, scoring_mode, scoring_config,
		        current_question_index, started_at, finished_at, created_at, updated_at
		 FROM game_sessions
		 WHERE session_code = $1`,
		code,
	).Scan(
		&sess.ID, &sess.Name, &sess.SessionCode, &sess.Status, &sess.ScoringMode,
		&cfgBytes, &sess.CurrentQuestionIndex, &sess.StartedAt, &sess.FinishedAt,
		&sess.CreatedAt, &sess.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("get session by code: %w", err)
	}
	sess.ScoringConfig = json.RawMessage(cfgBytes)
	return &sess, nil
}

func (s *SessionStore) List(ctx context.Context, status *model.SessionStatus) ([]model.GameSession, error) {
	var (
		rows pgx.Rows
		err  error
	)
	if status != nil {
		rows, err = s.pool.Query(ctx,
			`SELECT id, name, session_code, status, scoring_mode, scoring_config,
			        current_question_index, started_at, finished_at, created_at, updated_at
			 FROM game_sessions
			 WHERE status = $1
			 ORDER BY created_at DESC`,
			string(*status),
		)
	} else {
		rows, err = s.pool.Query(ctx,
			`SELECT id, name, session_code, status, scoring_mode, scoring_config,
			        current_question_index, started_at, finished_at, created_at, updated_at
			 FROM game_sessions
			 ORDER BY created_at DESC`,
		)
	}
	if err != nil {
		return nil, fmt.Errorf("list sessions: %w", err)
	}
	defer rows.Close()

	var sessions []model.GameSession
	for rows.Next() {
		var sess model.GameSession
		var cfgBytes []byte
		if err := rows.Scan(
			&sess.ID, &sess.Name, &sess.SessionCode, &sess.Status, &sess.ScoringMode,
			&cfgBytes, &sess.CurrentQuestionIndex, &sess.StartedAt, &sess.FinishedAt,
			&sess.CreatedAt, &sess.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan session: %w", err)
		}
		sess.ScoringConfig = json.RawMessage(cfgBytes)
		sessions = append(sessions, sess)
	}
	return sessions, rows.Err()
}

func (s *SessionStore) Update(ctx context.Context, id uuid.UUID, in UpdateSessionInput) (*model.GameSession, error) {
	cfg := in.ScoringConfig
	if len(cfg) == 0 {
		cfg = json.RawMessage(`{}`)
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var sess model.GameSession
	var cfgBytes []byte
	err = tx.QueryRow(ctx,
		`UPDATE game_sessions
		 SET name = $1, scoring_mode = $2, scoring_config = $3, updated_at = NOW()
		 WHERE id = $4 AND status = 'draft'
		 RETURNING id, name, session_code, status, scoring_mode, scoring_config,
		           current_question_index, started_at, finished_at, created_at, updated_at`,
		in.Name, string(in.ScoringMode), []byte(cfg), id,
	).Scan(
		&sess.ID, &sess.Name, &sess.SessionCode, &sess.Status, &sess.ScoringMode,
		&cfgBytes, &sess.CurrentQuestionIndex, &sess.StartedAt, &sess.FinishedAt,
		&sess.CreatedAt, &sess.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("update session: %w", err)
	}
	sess.ScoringConfig = json.RawMessage(cfgBytes)

	// Replace question list
	if _, err := tx.Exec(ctx, `DELETE FROM session_questions WHERE session_id = $1`, id); err != nil {
		return nil, fmt.Errorf("clear session questions: %w", err)
	}
	for i, qID := range in.QuestionIDs {
		if _, err := tx.Exec(ctx,
			`INSERT INTO session_questions (session_id, question_id, sort_order) VALUES ($1, $2, $3)`,
			id, qID, i,
		); err != nil {
			return nil, fmt.Errorf("insert session question: %w", err)
		}
	}

	return &sess, tx.Commit(ctx)
}

// Start transitions a draft session to lobby status.
func (s *SessionStore) Start(ctx context.Context, id uuid.UUID) (*model.GameSession, error) {
	var sess model.GameSession
	var cfgBytes []byte
	err := s.pool.QueryRow(ctx,
		`UPDATE game_sessions
		 SET status = 'lobby', updated_at = NOW()
		 WHERE id = $1 AND status = 'draft'
		 RETURNING id, name, session_code, status, scoring_mode, scoring_config,
		           current_question_index, started_at, finished_at, created_at, updated_at`,
		id,
	).Scan(
		&sess.ID, &sess.Name, &sess.SessionCode, &sess.Status, &sess.ScoringMode,
		&cfgBytes, &sess.CurrentQuestionIndex, &sess.StartedAt, &sess.FinishedAt,
		&sess.CreatedAt, &sess.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("start session: %w", err)
	}
	sess.ScoringConfig = json.RawMessage(cfgBytes)
	return &sess, nil
}

// Cancel marks a session as cancelled.
func (s *SessionStore) Cancel(ctx context.Context, id uuid.UUID) error {
	ct, err := s.pool.Exec(ctx,
		`UPDATE game_sessions SET status = 'cancelled', updated_at = NOW()
		 WHERE id = $1 AND status NOT IN ('finished', 'cancelled')`,
		id,
	)
	if err != nil {
		return fmt.Errorf("cancel session: %w", err)
	}
	if ct.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	return nil
}

func (s *SessionStore) ListQuestions(ctx context.Context, sessionID uuid.UUID) ([]model.SessionQuestion, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, session_id, question_id, sort_order, time_limit_override, points_override
		 FROM session_questions
		 WHERE session_id = $1
		 ORDER BY sort_order`,
		sessionID,
	)
	if err != nil {
		return nil, fmt.Errorf("list session questions: %w", err)
	}
	defer rows.Close()

	var sqs []model.SessionQuestion
	for rows.Next() {
		var sq model.SessionQuestion
		if err := rows.Scan(&sq.ID, &sq.SessionID, &sq.QuestionID, &sq.SortOrder,
			&sq.TimeLimitOverride, &sq.PointsOverride); err != nil {
			return nil, err
		}
		sqs = append(sqs, sq)
	}
	return sqs, rows.Err()
}

// ReorderQuestions updates the sort_order of session questions to match the
// given slice of question IDs (index 0 = first question played).
// Only valid while the session is in lobby status (enforced by the WS handler).
func (s *SessionStore) ReorderQuestions(ctx context.Context, sessionID uuid.UUID, questionIDs []uuid.UUID) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	for i, qID := range questionIDs {
		if _, err := tx.Exec(ctx,
			`UPDATE session_questions SET sort_order = $1 WHERE session_id = $2 AND question_id = $3`,
			i, sessionID, qID,
		); err != nil {
			return fmt.Errorf("reorder question %v: %w", qID, err)
		}
	}

	return tx.Commit(ctx)
}

func randomCode(n int) string {
	const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, n)
	for i := range b {
		b[i] = chars[rand.Intn(len(chars))]
	}
	return string(b)
}

func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}
