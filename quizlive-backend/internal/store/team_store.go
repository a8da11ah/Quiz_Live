package store

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"quizlive/internal/model"
)

type TeamStore struct {
	pool *pgxpool.Pool
}

func NewTeamStore(pool *pgxpool.Pool) *TeamStore {
	return &TeamStore{pool: pool}
}

type CreateTeamInput struct {
	SessionID   uuid.UUID `json:"session_id"`
	Name        string    `json:"name"         validate:"required,min=1,max=50"`
	Color       string    `json:"color"        validate:"required"`
	AvatarEmoji string    `json:"avatar_emoji"`
	Players     []string  `json:"players"      validate:"required,min=1"`
}

func (s *TeamStore) Create(ctx context.Context, in CreateTeamInput) (*model.Team, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	avatar := in.AvatarEmoji
	if avatar == "" {
		avatar = "🎯"
	}

	var t model.Team
	err = tx.QueryRow(ctx,
		`INSERT INTO teams (session_id, name, color, avatar_emoji)
		 VALUES ($1, $2, $3, $4)
		 RETURNING id, session_id, name, color, avatar_emoji, score, rank, is_eliminated, joined_at`,
		in.SessionID, in.Name, in.Color, avatar,
	).Scan(&t.ID, &t.SessionID, &t.Name, &t.Color, &t.AvatarEmoji, &t.Score, &t.Rank, &t.IsEliminated, &t.JoinedAt)
	if err != nil {
		return nil, fmt.Errorf("create team: %w", err)
	}

	for _, name := range in.Players {
		if _, err := tx.Exec(ctx,
			`INSERT INTO team_players (team_id, name) VALUES ($1, $2)`,
			t.ID, name,
		); err != nil {
			return nil, fmt.Errorf("insert player: %w", err)
		}
	}

	return &t, tx.Commit(ctx)
}

func (s *TeamStore) ListBySession(ctx context.Context, sessionID uuid.UUID) ([]model.Team, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, session_id, name, color, avatar_emoji, score, rank, is_eliminated, joined_at
		 FROM teams
		 WHERE session_id = $1
		 ORDER BY score DESC, joined_at ASC`,
		sessionID,
	)
	if err != nil {
		return nil, fmt.Errorf("list teams: %w", err)
	}
	defer rows.Close()

	var teams []model.Team
	for rows.Next() {
		var t model.Team
		if err := rows.Scan(&t.ID, &t.SessionID, &t.Name, &t.Color, &t.AvatarEmoji,
			&t.Score, &t.Rank, &t.IsEliminated, &t.JoinedAt); err != nil {
			return nil, fmt.Errorf("scan team: %w", err)
		}
		teams = append(teams, t)
	}
	return teams, rows.Err()
}

func (s *TeamStore) Get(ctx context.Context, id uuid.UUID) (*model.Team, error) {
	var t model.Team
	err := s.pool.QueryRow(ctx,
		`SELECT id, session_id, name, color, avatar_emoji, score, rank, is_eliminated, joined_at
		 FROM teams WHERE id = $1`,
		id,
	).Scan(&t.ID, &t.SessionID, &t.Name, &t.Color, &t.AvatarEmoji,
		&t.Score, &t.Rank, &t.IsEliminated, &t.JoinedAt)
	if err != nil {
		return nil, fmt.Errorf("get team: %w", err)
	}
	return &t, nil
}

func (s *TeamStore) Delete(ctx context.Context, id uuid.UUID) error {
	ct, err := s.pool.Exec(ctx, `DELETE FROM teams WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("delete team: %w", err)
	}
	if ct.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	return nil
}

func (s *TeamStore) UpdateScore(ctx context.Context, teamID uuid.UUID, delta int) error {
	_, err := s.pool.Exec(ctx,
		`UPDATE teams SET score = score + $1 WHERE id = $2`,
		delta, teamID,
	)
	return err
}
