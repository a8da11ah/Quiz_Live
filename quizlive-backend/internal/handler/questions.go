package handler

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
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
	r.Post("/import", h.Import)
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

// ─── Bulk import ──────────────────────────────────────────────────────────────

// importOption is the AI-generated per-option format.
type importOption struct {
	Label     string `json:"label"`
	IsCorrect bool   `json:"is_correct"`
}

// importQuestionItem is the AI-generated question format.
type importQuestionItem struct {
	Type             string          `json:"type"`
	Title            string          `json:"title"`
	Difficulty       string          `json:"difficulty"`
	TimeLimitSeconds *int            `json:"time_limit_seconds"`
	PointsValue      *int            `json:"points_value"`
	Explanation      *string         `json:"explanation"`
	MediaURL         *string         `json:"media_url"`
	CategoryID       *uuid.UUID      `json:"category_id"`
	Options          []importOption  `json:"options"`
	CorrectAnswer    json.RawMessage `json:"correct_answer"`
}

// Import accepts a JSON array in the AI-prompt format and bulk-creates questions.
// POST /api/questions/import
// Returns { imported: N, errors: [{index, title, error}] }
func (h *QuestionHandler) Import(w http.ResponseWriter, r *http.Request) {
	var items []importQuestionItem
	if err := parseJSON(r, &items); err != nil {
		writeError(w, http.StatusBadRequest, "body must be a JSON array of question objects")
		return
	}
	if len(items) == 0 {
		writeError(w, http.StatusUnprocessableEntity, "no questions found in array")
		return
	}

	type importErr struct {
		Index int    `json:"index"`
		Title string `json:"title"`
		Error string `json:"error"`
	}

	var imported int
	var errs []importErr

	for i, item := range items {
		if err := h.importOne(r.Context(), item); err != nil {
			errs = append(errs, importErr{Index: i, Title: item.Title, Error: err.Error()})
		} else {
			imported++
		}
	}

	status := http.StatusOK
	if imported == 0 && len(errs) > 0 {
		status = http.StatusUnprocessableEntity
	}
	writeJSON(w, status, map[string]any{
		"imported": imported,
		"errors":   errs,
	})
}

// importOne converts a single AI-generated item and persists it to the DB.
func (h *QuestionHandler) importOne(ctx context.Context, item importQuestionItem) error {
	if item.Title == "" {
		return errors.New("title is required")
	}

	qType := model.QuestionType(item.Type)
	switch qType {
	case model.QuestionTypeMultipleChoice, model.QuestionTypeTrueFalse,
		model.QuestionTypeMultipleSelect, model.QuestionTypeClosestNumber,
		model.QuestionTypeOrderItems, model.QuestionTypeOpenText:
		// valid
	default:
		return fmt.Errorf("unknown question type %q", item.Type)
	}

	diff := model.DifficultyLevel(item.Difficulty)
	switch diff {
	case model.DifficultyEasy, model.DifficultyMedium, model.DifficultyHard:
		// valid
	default:
		diff = model.DifficultyMedium
	}

	isOptionType := qType == model.QuestionTypeMultipleChoice ||
		qType == model.QuestionTypeTrueFalse ||
		qType == model.QuestionTypeMultipleSelect ||
		qType == model.QuestionTypeOrderItems

	// Build option slice
	optInputs := make([]store.CreateOptionInput, len(item.Options))
	for i, o := range item.Options {
		optInputs[i] = store.CreateOptionInput{Label: o.Label, SortOrder: i}
	}

	// Initial correct_answer: use placeholder for option-based types so we can
	// fill in real UUIDs after the insert; use the AI-provided value otherwise.
	initCA := item.CorrectAnswer
	if isOptionType || len(initCA) == 0 || string(initCA) == "null" {
		initCA = json.RawMessage(`{}`)
	}

	// Step 1 — create question + options
	created, err := h.store.Create(ctx, store.CreateQuestionInput{
		Type:             qType,
		Title:            item.Title,
		Difficulty:       diff,
		CategoryID:       item.CategoryID,
		TimeLimitSeconds: item.TimeLimitSeconds,
		PointsValue:      item.PointsValue,
		MediaURL:         item.MediaURL,
		Explanation:      item.Explanation,
		CorrectAnswer:    initCA,
		Options:          optInputs,
	})
	if err != nil {
		return fmt.Errorf("create: %w", err)
	}

	if !isOptionType || len(created.Options) == 0 {
		return nil // nothing more to do
	}

	// Step 2 — build real correct_answer using actual option UUIDs
	var realCA json.RawMessage
	switch qType {
	case model.QuestionTypeMultipleChoice, model.QuestionTypeTrueFalse:
		for i, o := range item.Options {
			if o.IsCorrect && i < len(created.Options) {
				realCA, _ = json.Marshal(map[string]any{"option_id": created.Options[i].ID})
				break
			}
		}
	case model.QuestionTypeMultipleSelect:
		ids := []uuid.UUID{}
		for i, o := range item.Options {
			if o.IsCorrect && i < len(created.Options) {
				ids = append(ids, created.Options[i].ID)
			}
		}
		realCA, _ = json.Marshal(map[string]any{"option_ids": ids})
	case model.QuestionTypeOrderItems:
		ids := make([]uuid.UUID, len(created.Options))
		for i, o := range created.Options {
			ids[i] = o.ID
		}
		realCA, _ = json.Marshal(map[string]any{"ordered_ids": ids})
	}

	if realCA == nil {
		return nil
	}

	// Step 3 — patch only correct_answer (options already created, don't touch them)
	return h.store.PatchCorrectAnswer(ctx, created.ID, realCA)
}
