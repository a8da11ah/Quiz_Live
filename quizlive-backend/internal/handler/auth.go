package handler

import (
	"net/http"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"quizlive/internal/config"
	"quizlive/internal/middleware"
)

type loginRequest struct {
	Username string `json:"username" validate:"required"`
	Password string `json:"password" validate:"required"`
}

func Login(cfg *config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req loginRequest
		if err := parseJSON(r, &req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid request body")
			return
		}
		if err := validate.Struct(req); err != nil {
			writeError(w, http.StatusUnprocessableEntity, err.Error())
			return
		}

		if req.Username != cfg.AdminUsername {
			writeError(w, http.StatusUnauthorized, "invalid credentials")
			return
		}
		if err := bcrypt.CompareHashAndPassword(cfg.AdminPasswordHash, []byte(req.Password)); err != nil {
			writeError(w, http.StatusUnauthorized, "invalid credentials")
			return
		}

		expiresAt := time.Now().Add(24 * time.Hour)
		claims := &middleware.Claims{
			RegisteredClaims: jwt.RegisteredClaims{
				ExpiresAt: jwt.NewNumericDate(expiresAt),
				IssuedAt:  jwt.NewNumericDate(time.Now()),
				Subject:   req.Username,
			},
			Role: "host",
		}

		token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
		tokenStr, err := token.SignedString([]byte(cfg.JWTSecret))
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to create token")
			return
		}

		writeJSON(w, http.StatusOK, map[string]any{
			"token":      tokenStr,
			"expires_at": expiresAt,
		})
	}
}
