package model

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type QuestionType string

const (
	QuestionTypeMultipleChoice QuestionType = "multiple_choice"
	QuestionTypeTrueFalse      QuestionType = "true_false"
	QuestionTypeMultipleSelect QuestionType = "multiple_select"
	QuestionTypeClosestNumber  QuestionType = "closest_number"
	QuestionTypeOrderItems     QuestionType = "order_items"
	QuestionTypeOpenText       QuestionType = "open_text"
)

type DifficultyLevel string

const (
	DifficultyEasy   DifficultyLevel = "easy"
	DifficultyMedium DifficultyLevel = "medium"
	DifficultyHard   DifficultyLevel = "hard"
)

type QuestionOption struct {
	ID         uuid.UUID `json:"id"`
	QuestionID uuid.UUID `json:"question_id"`
	Label      string    `json:"label"`
	SortOrder  int       `json:"sort_order"`
}

type Question struct {
	ID               uuid.UUID        `json:"id"`
	CategoryID       *uuid.UUID       `json:"category_id"`
	Type             QuestionType     `json:"type"`
	Title            string           `json:"title"`
	MediaURL         *string          `json:"media_url"`
	Explanation      *string          `json:"explanation"`
	Difficulty       DifficultyLevel  `json:"difficulty"`
	TimeLimitSeconds *int             `json:"time_limit_seconds"`
	PointsValue      *int             `json:"points_value"`
	CorrectAnswer    json.RawMessage  `json:"correct_answer"`
	Options          []QuestionOption `json:"options,omitempty"`
	CreatedAt        time.Time        `json:"created_at"`
	UpdatedAt        time.Time        `json:"updated_at"`
}
