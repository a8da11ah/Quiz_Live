package store

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"quizlive/internal/model"
)

type CategoryStore struct {
	pool *pgxpool.Pool
}

func NewCategoryStore(pool *pgxpool.Pool) *CategoryStore {
	return &CategoryStore{pool: pool}
}

type CreateCategoryInput struct {
	Name  string  `json:"name"  validate:"required,min=1,max=100"`
	Icon  *string `json:"icon"`
	Color *string `json:"color"`
}

type UpdateCategoryInput struct {
	Name  string  `json:"name"  validate:"required,min=1,max=100"`
	Icon  *string `json:"icon"`
	Color *string `json:"color"`
}

func (s *CategoryStore) Create(ctx context.Context, in CreateCategoryInput) (*model.Category, error) {
	var c model.Category
	err := s.pool.QueryRow(ctx,
		`INSERT INTO categories (name, icon, color)
		 VALUES ($1, $2, $3)
		 RETURNING id, name, icon, color, created_at`,
		in.Name, in.Icon, in.Color,
	).Scan(&c.ID, &c.Name, &c.Icon, &c.Color, &c.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("create category: %w", err)
	}
	return &c, nil
}

func (s *CategoryStore) List(ctx context.Context) ([]model.Category, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, name, icon, color, created_at
		 FROM categories
		 WHERE deleted_at IS NULL
		 ORDER BY name`)
	if err != nil {
		return nil, fmt.Errorf("list categories: %w", err)
	}
	defer rows.Close()

	var cats []model.Category
	for rows.Next() {
		var c model.Category
		if err := rows.Scan(&c.ID, &c.Name, &c.Icon, &c.Color, &c.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan category: %w", err)
		}
		cats = append(cats, c)
	}
	return cats, rows.Err()
}

func (s *CategoryStore) Get(ctx context.Context, id uuid.UUID) (*model.Category, error) {
	var c model.Category
	err := s.pool.QueryRow(ctx,
		`SELECT id, name, icon, color, created_at
		 FROM categories
		 WHERE id = $1 AND deleted_at IS NULL`,
		id,
	).Scan(&c.ID, &c.Name, &c.Icon, &c.Color, &c.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("get category: %w", err)
	}
	return &c, nil
}

func (s *CategoryStore) Update(ctx context.Context, id uuid.UUID, in UpdateCategoryInput) (*model.Category, error) {
	var c model.Category
	err := s.pool.QueryRow(ctx,
		`UPDATE categories
		 SET name = $1, icon = $2, color = $3
		 WHERE id = $4 AND deleted_at IS NULL
		 RETURNING id, name, icon, color, created_at`,
		in.Name, in.Icon, in.Color, id,
	).Scan(&c.ID, &c.Name, &c.Icon, &c.Color, &c.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("update category: %w", err)
	}
	return &c, nil
}

func (s *CategoryStore) Delete(ctx context.Context, id uuid.UUID) error {
	ct, err := s.pool.Exec(ctx,
		`UPDATE categories SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL`,
		id,
	)
	if err != nil {
		return fmt.Errorf("delete category: %w", err)
	}
	if ct.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	return nil
}
