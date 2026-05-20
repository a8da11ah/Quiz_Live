package handler

import (
	"encoding/json"
	"net/http"

	"github.com/go-playground/validator/v10"
)

var validate = validator.New()

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

func parseJSON(r *http.Request, v any) error {
	return json.NewDecoder(r.Body).Decode(v)
}
