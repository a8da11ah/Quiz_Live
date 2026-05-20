package handler

import (
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"quizlive/internal/model"
	"quizlive/internal/store"
)

type SessionHandler struct {
	store *store.SessionStore
}

func NewSessionHandler(s *store.SessionStore) *SessionHandler {
	return &SessionHandler{store: s}
}

func (h *SessionHandler) Routes() chi.Router {
	r := chi.NewRouter()
	r.Get("/", h.List)
	r.Post("/", h.Create)
	r.Get("/{id}", h.Get)
	r.Put("/{id}", h.Update)
	r.Delete("/{id}", h.Cancel)
	r.Post("/{id}/start", h.Start)
	r.Get("/{id}/questions", h.ListQuestions)
	return r
}

func (h *SessionHandler) List(w http.ResponseWriter, r *http.Request) {
	var status *model.SessionStatus
	if v := r.URL.Query().Get("status"); v != "" {
		s := model.SessionStatus(v)
		status = &s
	}
	sessions, err := h.store.List(r.Context(), status)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list sessions")
		return
	}
	if sessions == nil {
		sessions = []model.GameSession{}
	}
	writeJSON(w, http.StatusOK, sessions)
}

func (h *SessionHandler) Create(w http.ResponseWriter, r *http.Request) {
	var body store.CreateSessionInput
	if err := parseJSON(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if err := validate.Struct(body); err != nil {
		writeError(w, http.StatusUnprocessableEntity, err.Error())
		return
	}
	sess, err := h.store.Create(r.Context(), body)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create session")
		return
	}
	writeJSON(w, http.StatusCreated, sess)
}

func (h *SessionHandler) Get(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}
	sess, err := h.store.Get(r.Context(), id)
	if errors.Is(err, pgx.ErrNoRows) {
		writeError(w, http.StatusNotFound, "session not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to get session")
		return
	}
	writeJSON(w, http.StatusOK, sess)
}

func (h *SessionHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}
	var body store.UpdateSessionInput
	if err := parseJSON(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if err := validate.Struct(body); err != nil {
		writeError(w, http.StatusUnprocessableEntity, err.Error())
		return
	}
	sess, err := h.store.Update(r.Context(), id, body)
	if errors.Is(err, pgx.ErrNoRows) {
		writeError(w, http.StatusNotFound, "session not found or not in draft status")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update session")
		return
	}
	writeJSON(w, http.StatusOK, sess)
}

func (h *SessionHandler) Cancel(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}
	err = h.store.Cancel(r.Context(), id)
	if errors.Is(err, pgx.ErrNoRows) {
		writeError(w, http.StatusNotFound, "session not found or already finished")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to cancel session")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// Start moves a draft session to lobby status and returns the session with its code.
func (h *SessionHandler) Start(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}
	sess, err := h.store.Start(r.Context(), id)
	if errors.Is(err, pgx.ErrNoRows) {
		writeError(w, http.StatusConflict, "session not found or not in draft status")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to start session")
		return
	}
	writeJSON(w, http.StatusOK, sess)
}

func (h *SessionHandler) ListQuestions(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}
	sqs, err := h.store.ListQuestions(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list session questions")
		return
	}
	if sqs == nil {
		sqs = []model.SessionQuestion{}
	}
	writeJSON(w, http.StatusOK, sqs)
}
