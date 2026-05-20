package model

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type SessionStatus string

const (
	SessionStatusDraft     SessionStatus = "draft"
	SessionStatusLobby     SessionStatus = "lobby"
	SessionStatusActive    SessionStatus = "active"
	SessionStatusPaused    SessionStatus = "paused"
	SessionStatusFinished  SessionStatus = "finished"
	SessionStatusCancelled SessionStatus = "cancelled"
)

type ScoringMode string

const (
	ScoringModeStandard    ScoringMode = "standard"
	ScoringModeSpeedBonus  ScoringMode = "speed_bonus"
	ScoringModeStreak      ScoringMode = "streak"
	ScoringModeElimination ScoringMode = "elimination"
	ScoringModeCustom      ScoringMode = "custom"
)

type GameSession struct {
	ID                   uuid.UUID       `json:"id"`
	Name                 string          `json:"name"`
	SessionCode          string          `json:"session_code"`
	Status               SessionStatus   `json:"status"`
	ScoringMode          ScoringMode     `json:"scoring_mode"`
	ScoringConfig        json.RawMessage `json:"scoring_config"`
	CurrentQuestionIndex int             `json:"current_question_index"`
	StartedAt            *time.Time      `json:"started_at"`
	FinishedAt           *time.Time      `json:"finished_at"`
	CreatedAt            time.Time       `json:"created_at"`
	UpdatedAt            time.Time       `json:"updated_at"`
}

type SessionQuestion struct {
	ID                uuid.UUID `json:"id"`
	SessionID         uuid.UUID `json:"session_id"`
	QuestionID        uuid.UUID `json:"question_id"`
	SortOrder         int       `json:"sort_order"`
	TimeLimitOverride *int      `json:"time_limit_override"`
	PointsOverride    *int      `json:"points_override"`
}
