package handler

import (
	"context"
	"errors"
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/golang-jwt/jwt/v5"
	"github.com/gorilla/websocket"
	"github.com/jackc/pgx/v5"
	"quizlive/internal/config"
	"quizlive/internal/hub"
	"quizlive/internal/model"
	"quizlive/internal/store"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	// Allow all origins (nginx already handles CORS at the proxy level)
	CheckOrigin: func(r *http.Request) bool { return true },
}

// WsHandler handles WebSocket connections for both hosts and teams.
// URL: /ws?session=CODE&role=host|team[&token=JWT]
func WsHandler(h *hub.Hub, sessStore *store.SessionStore, qStore *store.QuestionStore, cfg *config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		code := r.URL.Query().Get("session")
		role := r.URL.Query().Get("role")

		if code == "" {
			http.Error(w, "missing session code", http.StatusBadRequest)
			return
		}
		if role != "host" && role != "team" {
			http.Error(w, "role must be host or team", http.StatusBadRequest)
			return
		}

		// Hosts must supply a valid JWT
		if role == "host" {
			token := r.URL.Query().Get("token")
			if token == "" {
				http.Error(w, "missing token", http.StatusUnauthorized)
				return
			}
			if !validateJWT(token, cfg.JWTSecret) {
				http.Error(w, "invalid token", http.StatusUnauthorized)
				return
			}
		}

		// Look up session by code
		sess, err := sessStore.GetByCode(r.Context(), code)
		if errors.Is(err, pgx.ErrNoRows) || sess == nil {
			http.Error(w, "session not found", http.StatusNotFound)
			return
		}
		if err != nil {
			slog.Error("getByCode", "err", err)
			http.Error(w, "internal error", http.StatusInternalServerError)
			return
		}

		// Reject finished/cancelled/draft sessions
		if sess.Status == model.SessionStatusDraft ||
			sess.Status == model.SessionStatusFinished ||
			sess.Status == model.SessionStatusCancelled {
			http.Error(w, "session is not open", http.StatusConflict)
			return
		}

		// Upgrade to WebSocket
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			slog.Warn("ws upgrade failed", "err", err)
			return
		}

		// Get/create room and load questions
		room := h.GetOrCreate(code)
		if err := room.EnsureLoaded(r.Context(), sess, sessStore, qStore); err != nil {
			slog.Error("EnsureLoaded", "err", err)
			conn.Close()
			return
		}

		client := hub.NewClient(room, conn, role)
		go client.WritePump()

		if role == "host" {
			room.RegisterHost(client)
		}
		client.ReadPump() // blocks until connection closes
	}
}

// JoinInfo returns public session info for a given session code.
// GET /api/join/{code}
func JoinInfo(sessStore *store.SessionStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		code := chi.URLParam(r, "code")
		if code == "" {
			writeError(w, http.StatusBadRequest, "missing code")
			return
		}

		sess, err := sessStore.GetByCode(context.Background(), code)
		if errors.Is(err, pgx.ErrNoRows) || sess == nil {
			writeError(w, http.StatusNotFound, "session not found or not open")
			return
		}
		if err != nil {
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}

		if sess.Status != model.SessionStatusLobby &&
			sess.Status != model.SessionStatusActive &&
			sess.Status != model.SessionStatusPaused {
			writeError(w, http.StatusConflict, "session is not open for joining")
			return
		}

		writeJSON(w, http.StatusOK, map[string]any{
			"id":     sess.ID,
			"name":   sess.Name,
			"status": sess.Status,
			"code":   sess.SessionCode,
		})
	}
}

func validateJWT(tokenStr, secret string) bool {
	tok, err := jwt.Parse(tokenStr, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, jwt.ErrSignatureInvalid
		}
		return []byte(secret), nil
	})
	return err == nil && tok.Valid
}
