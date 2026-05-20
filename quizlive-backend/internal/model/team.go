package model

import (
	"time"

	"github.com/google/uuid"
)

type Team struct {
	ID           uuid.UUID `json:"id"`
	SessionID    uuid.UUID `json:"session_id"`
	Name         string    `json:"name"`
	Color        string    `json:"color"`
	AvatarEmoji  string    `json:"avatar_emoji"`
	Score        int       `json:"score"`
	Rank         *int      `json:"rank"`
	IsEliminated bool      `json:"is_eliminated"`
	JoinedAt     time.Time `json:"joined_at"`
}

type TeamPlayer struct {
	ID       uuid.UUID `json:"id"`
	TeamID   uuid.UUID `json:"team_id"`
	Name     string    `json:"name"`
	JoinedAt time.Time `json:"joined_at"`
}
