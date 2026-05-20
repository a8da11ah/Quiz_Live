package model

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type AnswerResult string

const (
	AnswerResultCorrect   AnswerResult = "correct"
	AnswerResultIncorrect AnswerResult = "incorrect"
	AnswerResultPartial   AnswerResult = "partial"
	AnswerResultPending   AnswerResult = "pending"
	AnswerResultNoAnswer  AnswerResult = "no_answer"
)

type Answer struct {
	ID                uuid.UUID       `json:"id"`
	TeamID            uuid.UUID       `json:"team_id"`
	SessionQuestionID uuid.UUID       `json:"session_question_id"`
	SubmittedAnswer   json.RawMessage `json:"submitted_answer"`
	Result            AnswerResult    `json:"result"`
	PointsAwarded     int             `json:"points_awarded"`
	TimeTakenMs       *int            `json:"time_taken_ms"`
	SubmittedAt       *time.Time      `json:"submitted_at"`
	MarkedAt          *time.Time      `json:"marked_at"`
}

type ScoreEvent struct {
	ID            uuid.UUID `json:"id"`
	TeamID        uuid.UUID `json:"team_id"`
	SessionID     uuid.UUID `json:"session_id"`
	Delta         int       `json:"delta"`
	Reason        string    `json:"reason"`
	QuestionIndex *int      `json:"question_index"`
}
