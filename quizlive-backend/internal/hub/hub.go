package hub

import (
	"sync"

	"quizlive/internal/store"
)

// Hub is the global manager of all active session rooms.
type Hub struct {
	mu    sync.RWMutex
	rooms map[string]*Room // keyed by session code

	sessStore *store.SessionStore
	qStore    *store.QuestionStore
	teamStore *store.TeamStore
}

// New creates a new Hub.
func New(sess *store.SessionStore, q *store.QuestionStore, t *store.TeamStore) *Hub {
	return &Hub{
		rooms:     make(map[string]*Room),
		sessStore: sess,
		qStore:    q,
		teamStore: t,
	}
}

// GetOrCreate returns the existing room for the session code or creates a new one.
func (h *Hub) GetOrCreate(code string) *Room {
	h.mu.Lock()
	defer h.mu.Unlock()

	if r, ok := h.rooms[code]; ok {
		return r
	}
	r := newRoom(code, h)
	h.rooms[code] = r
	return r
}

// Remove deletes a room from the hub (called when a session finishes).
func (h *Hub) Remove(code string) {
	h.mu.Lock()
	defer h.mu.Unlock()
	delete(h.rooms, code)
}
