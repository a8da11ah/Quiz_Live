package model

import (
	"time"

	"github.com/google/uuid"
)

type Category struct {
	ID        uuid.UUID `json:"id"`
	Name      string    `json:"name"`
	Icon      *string   `json:"icon"`
	Color     *string   `json:"color"`
	CreatedAt time.Time `json:"created_at"`
}
