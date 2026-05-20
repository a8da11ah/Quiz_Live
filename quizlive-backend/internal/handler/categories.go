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

type CategoryHandler struct {
	store *store.CategoryStore
}

func NewCategoryHandler(s *store.CategoryStore) *CategoryHandler {
	return &CategoryHandler{store: s}
}

func (h *CategoryHandler) Routes() chi.Router {
	r := chi.NewRouter()
	r.Get("/", h.List)
	r.Post("/", h.Create)
	r.Get("/{id}", h.Get)
	r.Put("/{id}", h.Update)
	r.Delete("/{id}", h.Delete)
	return r
}

func (h *CategoryHandler) List(w http.ResponseWriter, r *http.Request) {
	cats, err := h.store.List(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list categories")
		return
	}
	if cats == nil {
		cats = []model.Category{}
	}
	writeJSON(w, http.StatusOK, cats)
}

func (h *CategoryHandler) Create(w http.ResponseWriter, r *http.Request) {
	var body store.CreateCategoryInput
	if err := parseJSON(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if err := validate.Struct(body); err != nil {
		writeError(w, http.StatusUnprocessableEntity, err.Error())
		return
	}
	cat, err := h.store.Create(r.Context(), body)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create category")
		return
	}
	writeJSON(w, http.StatusCreated, cat)
}

func (h *CategoryHandler) Get(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}
	cat, err := h.store.Get(r.Context(), id)
	if errors.Is(err, pgx.ErrNoRows) {
		writeError(w, http.StatusNotFound, "category not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to get category")
		return
	}
	writeJSON(w, http.StatusOK, cat)
}

func (h *CategoryHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}
	var body store.UpdateCategoryInput
	if err := parseJSON(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if err := validate.Struct(body); err != nil {
		writeError(w, http.StatusUnprocessableEntity, err.Error())
		return
	}
	cat, err := h.store.Update(r.Context(), id, body)
	if errors.Is(err, pgx.ErrNoRows) {
		writeError(w, http.StatusNotFound, "category not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update category")
		return
	}
	writeJSON(w, http.StatusOK, cat)
}

func (h *CategoryHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}
	err = h.store.Delete(r.Context(), id)
	if errors.Is(err, pgx.ErrNoRows) {
		writeError(w, http.StatusNotFound, "category not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to delete category")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
