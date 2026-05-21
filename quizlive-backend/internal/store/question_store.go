package store

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"quizlive/internal/model"
)

type QuestionStore struct {
	pool *pgxpool.Pool
}

func NewQuestionStore(pool *pgxpool.Pool) *QuestionStore {
	return &QuestionStore{pool: pool}
}

type CreateOptionInput struct {
	Label     string `json:"label"      validate:"required,min=1"`
	SortOrder int    `json:"sort_order"`
}

type CreateQuestionInput struct {
	CategoryID       *uuid.UUID            `json:"category_id"`
	Type             model.QuestionType    `json:"type"       validate:"required,oneof=multiple_choice true_false multiple_select closest_number order_items open_text"`
	Title            string                `json:"title"      validate:"required,min=1"`
	MediaURL         *string               `json:"media_url"`
	Explanation      *string               `json:"explanation"`
	Difficulty       model.DifficultyLevel `json:"difficulty" validate:"required,oneof=easy medium hard"`
	TimeLimitSeconds *int                  `json:"time_limit_seconds" validate:"omitempty,min=5,max=300"`
	PointsValue      *int                  `json:"points_value"       validate:"omitempty,min=0"`
	CorrectAnswer    json.RawMessage       `json:"correct_answer"     validate:"required"`
	Options          []CreateOptionInput   `json:"options"`
}

type UpdateQuestionInput struct {
	CategoryID       *uuid.UUID            `json:"category_id"`
	Type             model.QuestionType    `json:"type"       validate:"required,oneof=multiple_choice true_false multiple_select closest_number order_items open_text"`
	Title            string                `json:"title"      validate:"required,min=1"`
	MediaURL         *string               `json:"media_url"`
	Explanation      *string               `json:"explanation"`
	Difficulty       model.DifficultyLevel `json:"difficulty" validate:"required,oneof=easy medium hard"`
	TimeLimitSeconds *int                  `json:"time_limit_seconds" validate:"omitempty,min=5,max=300"`
	PointsValue      *int                  `json:"points_value"       validate:"omitempty,min=0"`
	CorrectAnswer    json.RawMessage       `json:"correct_answer"     validate:"required"`
	Options          []CreateOptionInput   `json:"options"`
}

type QuestionFilter struct {
	CategoryID *uuid.UUID
	Type       *model.QuestionType
	Difficulty *model.DifficultyLevel
	Search     *string
}

// PatchCorrectAnswer updates only the correct_answer column.
// Used by the bulk importer after real option UUIDs become available.
func (s *QuestionStore) PatchCorrectAnswer(ctx context.Context, id uuid.UUID, ca json.RawMessage) error {
	_, err := s.pool.Exec(ctx,
		`UPDATE questions SET correct_answer = $1, updated_at = NOW() WHERE id = $2`,
		[]byte(ca), id,
	)
	if err != nil {
		return fmt.Errorf("patch correct_answer: %w", err)
	}
	return nil
}

func (s *QuestionStore) Create(ctx context.Context, in CreateQuestionInput) (*model.Question, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var q model.Question
	var correctAnswerBytes []byte
	err = tx.QueryRow(ctx,
		`INSERT INTO questions
		 (category_id, type, title, media_url, explanation, difficulty, time_limit_seconds, points_value, correct_answer)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		 RETURNING id, category_id, type, title, media_url, explanation,
		           difficulty, time_limit_seconds, points_value, correct_answer, created_at, updated_at`,
		in.CategoryID, in.Type, in.Title, in.MediaURL, in.Explanation,
		in.Difficulty, in.TimeLimitSeconds, in.PointsValue, []byte(in.CorrectAnswer),
	).Scan(
		&q.ID, &q.CategoryID, &q.Type, &q.Title, &q.MediaURL, &q.Explanation,
		&q.Difficulty, &q.TimeLimitSeconds, &q.PointsValue, &correctAnswerBytes,
		&q.CreatedAt, &q.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("insert question: %w", err)
	}
	q.CorrectAnswer = json.RawMessage(correctAnswerBytes)

	q.Options, err = insertOptions(ctx, tx, q.ID, in.Options)
	if err != nil {
		return nil, err
	}

	return &q, tx.Commit(ctx)
}

func (s *QuestionStore) List(ctx context.Context, f QuestionFilter) ([]model.Question, error) {
	args := []any{}
	where := []string{"q.deleted_at IS NULL"}

	if f.CategoryID != nil {
		args = append(args, *f.CategoryID)
		where = append(where, fmt.Sprintf("q.category_id = $%d", len(args)))
	}
	if f.Type != nil {
		args = append(args, string(*f.Type))
		where = append(where, fmt.Sprintf("q.type = $%d::question_type", len(args)))
	}
	if f.Difficulty != nil {
		args = append(args, string(*f.Difficulty))
		where = append(where, fmt.Sprintf("q.difficulty = $%d::difficulty_level", len(args)))
	}
	if f.Search != nil {
		args = append(args, "%"+*f.Search+"%")
		where = append(where, fmt.Sprintf("q.title ILIKE $%d", len(args)))
	}

	query := `SELECT q.id, q.category_id, q.type, q.title, q.media_url, q.explanation,
	                 q.difficulty, q.time_limit_seconds, q.points_value, q.correct_answer,
	                 q.created_at, q.updated_at
	          FROM questions q
	          WHERE ` + strings.Join(where, " AND ") + `
	          ORDER BY q.created_at DESC`

	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list questions: %w", err)
	}
	defer rows.Close()

	var qs []model.Question
	for rows.Next() {
		var q model.Question
		var correctAnswerBytes []byte
		if err := rows.Scan(
			&q.ID, &q.CategoryID, &q.Type, &q.Title, &q.MediaURL, &q.Explanation,
			&q.Difficulty, &q.TimeLimitSeconds, &q.PointsValue, &correctAnswerBytes,
			&q.CreatedAt, &q.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan question: %w", err)
		}
		q.CorrectAnswer = json.RawMessage(correctAnswerBytes)
		qs = append(qs, q)
	}
	return qs, rows.Err()
}

func (s *QuestionStore) Count(ctx context.Context, f QuestionFilter) (int, error) {
	args := []any{}
	where := []string{"deleted_at IS NULL"}

	if f.CategoryID != nil {
		args = append(args, *f.CategoryID)
		where = append(where, fmt.Sprintf("category_id = $%d", len(args)))
	}
	if f.Type != nil {
		args = append(args, string(*f.Type))
		where = append(where, fmt.Sprintf("type = $%d::question_type", len(args)))
	}
	if f.Difficulty != nil {
		args = append(args, string(*f.Difficulty))
		where = append(where, fmt.Sprintf("difficulty = $%d::difficulty_level", len(args)))
	}
	if f.Search != nil {
		args = append(args, "%"+*f.Search+"%")
		where = append(where, fmt.Sprintf("title ILIKE $%d", len(args)))
	}

	query := `SELECT COUNT(*) FROM questions WHERE ` + strings.Join(where, " AND ")
	var n int
	if err := s.pool.QueryRow(ctx, query, args...).Scan(&n); err != nil {
		return 0, fmt.Errorf("count questions: %w", err)
	}
	return n, nil
}

func (s *QuestionStore) Get(ctx context.Context, id uuid.UUID) (*model.Question, error) {
	var q model.Question
	var correctAnswerBytes []byte
	err := s.pool.QueryRow(ctx,
		`SELECT id, category_id, type, title, media_url, explanation,
		        difficulty, time_limit_seconds, points_value, correct_answer, created_at, updated_at
		 FROM questions
		 WHERE id = $1 AND deleted_at IS NULL`,
		id,
	).Scan(
		&q.ID, &q.CategoryID, &q.Type, &q.Title, &q.MediaURL, &q.Explanation,
		&q.Difficulty, &q.TimeLimitSeconds, &q.PointsValue, &correctAnswerBytes,
		&q.CreatedAt, &q.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("get question: %w", err)
	}
	q.CorrectAnswer = json.RawMessage(correctAnswerBytes)

	opts, err := s.getOptions(ctx, id)
	if err != nil {
		return nil, err
	}
	q.Options = opts
	return &q, nil
}

func (s *QuestionStore) Update(ctx context.Context, id uuid.UUID, in UpdateQuestionInput) (*model.Question, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var q model.Question
	var correctAnswerBytes []byte
	err = tx.QueryRow(ctx,
		`UPDATE questions
		 SET category_id = $1, type = $2, title = $3, media_url = $4, explanation = $5,
		     difficulty = $6, time_limit_seconds = $7, points_value = $8,
		     correct_answer = $9, updated_at = NOW()
		 WHERE id = $10 AND deleted_at IS NULL
		 RETURNING id, category_id, type, title, media_url, explanation,
		           difficulty, time_limit_seconds, points_value, correct_answer, created_at, updated_at`,
		in.CategoryID, in.Type, in.Title, in.MediaURL, in.Explanation,
		in.Difficulty, in.TimeLimitSeconds, in.PointsValue, []byte(in.CorrectAnswer), id,
	).Scan(
		&q.ID, &q.CategoryID, &q.Type, &q.Title, &q.MediaURL, &q.Explanation,
		&q.Difficulty, &q.TimeLimitSeconds, &q.PointsValue, &correctAnswerBytes,
		&q.CreatedAt, &q.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("update question: %w", err)
	}
	q.CorrectAnswer = json.RawMessage(correctAnswerBytes)

	if _, err := tx.Exec(ctx, `DELETE FROM question_options WHERE question_id = $1`, id); err != nil {
		return nil, fmt.Errorf("delete old options: %w", err)
	}

	q.Options, err = insertOptions(ctx, tx, q.ID, in.Options)
	if err != nil {
		return nil, err
	}

	return &q, tx.Commit(ctx)
}

func (s *QuestionStore) Delete(ctx context.Context, id uuid.UUID) error {
	ct, err := s.pool.Exec(ctx,
		`UPDATE questions SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL`,
		id,
	)
	if err != nil {
		return fmt.Errorf("delete question: %w", err)
	}
	if ct.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	return nil
}

func (s *QuestionStore) getOptions(ctx context.Context, questionID uuid.UUID) ([]model.QuestionOption, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, question_id, label, sort_order
		 FROM question_options
		 WHERE question_id = $1
		 ORDER BY sort_order`,
		questionID,
	)
	if err != nil {
		return nil, fmt.Errorf("get options: %w", err)
	}
	defer rows.Close()

	var opts []model.QuestionOption
	for rows.Next() {
		var o model.QuestionOption
		if err := rows.Scan(&o.ID, &o.QuestionID, &o.Label, &o.SortOrder); err != nil {
			return nil, fmt.Errorf("scan option: %w", err)
		}
		opts = append(opts, o)
	}
	return opts, rows.Err()
}

type txQuerier interface {
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}

func insertOptions(ctx context.Context, tx txQuerier, questionID uuid.UUID, opts []CreateOptionInput) ([]model.QuestionOption, error) {
	var result []model.QuestionOption
	for _, opt := range opts {
		var o model.QuestionOption
		err := tx.QueryRow(ctx,
			`INSERT INTO question_options (question_id, label, sort_order)
			 VALUES ($1, $2, $3)
			 RETURNING id, question_id, label, sort_order`,
			questionID, opt.Label, opt.SortOrder,
		).Scan(&o.ID, &o.QuestionID, &o.Label, &o.SortOrder)
		if err != nil {
			return nil, fmt.Errorf("insert option: %w", err)
		}
		result = append(result, o)
	}
	return result, nil
}
