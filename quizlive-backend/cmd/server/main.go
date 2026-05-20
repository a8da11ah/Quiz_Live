package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"quizlive/internal/config"
	"quizlive/internal/db"
	"quizlive/internal/handler"
	"quizlive/internal/middleware"
	"quizlive/internal/store"
)

func main() {
	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, nil)))

	cfg := config.Load()

	if err := db.RunMigrations(cfg.DatabaseURL); err != nil {
		slog.Error("migrations failed", "error", err)
		os.Exit(1)
	}

	pool, err := db.NewPool(context.Background(), cfg.DatabaseURL)
	if err != nil {
		slog.Error("database connection failed", "error", err)
		os.Exit(1)
	}
	defer pool.Close()

	catStore := store.NewCategoryStore(pool)
	qStore := store.NewQuestionStore(pool)
	sessStore := store.NewSessionStore(pool)

	r := chi.NewRouter()
	r.Use(chimiddleware.Recoverer)
	r.Use(middleware.Logger)
	r.Use(middleware.Cors(cfg))

	// Public
	r.Post("/api/auth/login", handler.Login(cfg))
	r.Get("/api/health", handler.Health)

	// Host-only (JWT required)
	r.Group(func(r chi.Router) {
		r.Use(middleware.JWTAuth(cfg))
		r.Mount("/api/categories", handler.NewCategoryHandler(catStore).Routes())
		r.Mount("/api/questions", handler.NewQuestionHandler(qStore).Routes())
		r.Mount("/api/sessions", handler.NewSessionHandler(sessStore).Routes())
	})

	// Static SPA — development only (nginx owns this in production)
	if cfg.Environment == "development" {
		r.Handle("/*", http.FileServer(http.Dir("./static")))
	}

	slog.Info("server starting", "port", cfg.Port, "env", cfg.Environment)
	if err := http.ListenAndServe(":"+cfg.Port, r); err != nil {
		slog.Error("server failed", "error", err)
		os.Exit(1)
	}
}
