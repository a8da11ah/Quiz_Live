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

type QuestionHandler struct {
	store *store.QuestionStore
}

func NewQuestionHandler(s *store.QuestionStore) *QuestionHandler {
	return &QuestionHandler{store: s}
}

func (h *QuestionHandler) Routes() chi.Router {
	r := chi.NewRouter()
	r.Get("/", h.List)
	r.Post("/", h.Create)
	r.Get("/count", h.Count)
	r.Get("/{id}", h.Get)
	r.Put("/{id}", h.Update)
	r.Delete("/{id}", h.Delete)
	return r
}

func (h *QuestionHandler) List(w http.ResponseWriter, r *http.Request) {
	f := store.QuestionFilter{}
	q := r.URL.Query()

	if v := q.Get("category_id"); v != "" {
		if id, err := uuid.Parse(v); err == nil {
			f.CategoryID = &id
		}
	}
	if v := q.Get("type"); v != "" {
		t := model.QuestionType(v)
		f.Type = &t
	}
	if v := q.Get("difficulty"); v != "" {
		d := model.DifficultyLevel(v)
		f.Difficulty = &d
	}
	if v := q.Get("q"); v != "" {
		f.Search = &v
	}

	questions, err := h.store.List(r.Context(), f)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list questions")
		return
	}
	if questions == nil {
		questions = []model.Question{}
	}
	writeJSON(w, http.StatusOK, questions)
}

func (h *QuestionHandler) Count(w http.ResponseWriter, r *http.Request) {
	f := store.QuestionFilter{}
	q := r.URL.Query()

	if v := q.Get("category_id"); v != "" {
		if id, err := uuid.Parse(v); err == nil {
			f.CategoryID = &id
		}
	}
	if v := q.Get("type"); v != "" {
		t := model.QuestionType(v)
		f.Type = &t
	}
	if v := q.Get("difficulty"); v != "" {
		d := model.DifficultyLevel(v)
		f.Difficulty = &d
	}
	if v := q.Get("q"); v != "" {
		f.Search = &v
	}

	n, err := h.store.Count(r.Context(), f)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to count questions")
		return
	}
	writeJSON(w, http.StatusOK, map[string]int{"total": n})
}

func (h *QuestionHandler) Create(w http.ResponseWriter, r *http.Request) {
	var body store.CreateQuestionInput
	if err := parseJSON(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if err := validate.Struct(body); err != nil {
		writeError(w, http.StatusUnprocessableEntity, err.Error())
		return
	}
	q, err := h.store.Create(r.Context(), body)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create question")
		return
	}
	writeJSON(w, http.StatusCreated, q)
}

func (h *QuestionHandler) Get(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}
	q, err := h.store.Get(r.Context(), id)
	if errors.Is(err, pgx.ErrNoRows) {
		writeError(w, http.StatusNotFound, "question not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to get question")
		return
	}
	writeJSON(w, http.StatusOK, q)
}

func (h *QuestionHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}
	var body store.UpdateQuestionInput
	if err := parseJSON(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if err := validate.Struct(body); err != nil {
		writeError(w, http.StatusUnprocessableEntity, err.Error())
		return
	}
	q, err := h.store.Update(r.Context(), id, body)
	if errors.Is(err, pgx.ErrNoRows) {
		writeError(w, http.StatusNotFound, "question not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update question")
		return
	}
	writeJSON(w, http.StatusOK, q)
}

func (h *QuestionHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}
	err = h.store.Delete(r.Context(), id)
	if errors.Is(err, pgx.ErrNoRows) {
		writeError(w, http.StatusNotFound, "question not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to delete question")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
