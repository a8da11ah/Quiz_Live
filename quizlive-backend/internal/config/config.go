package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
	"golang.org/x/crypto/bcrypt"
)

type Config struct {
	DatabaseURL       string
	JWTSecret         string
	AdminUsername     string
	AdminPasswordHash []byte
	BaseURL           string
	Environment       string
	Port              string
}

func Load() *Config {
	_ = godotenv.Load()

	rawPassword := mustGet("ADMIN_PASSWORD")
	hash, err := bcrypt.GenerateFromPassword([]byte(rawPassword), bcrypt.DefaultCost)
	if err != nil {
		log.Fatalf("bcrypt admin password: %v", err)
	}

	return &Config{
		DatabaseURL:       mustGet("DATABASE_URL"),
		JWTSecret:         mustGet("JWT_SECRET"),
		AdminUsername:     mustGet("ADMIN_USERNAME"),
		AdminPasswordHash: hash,
		BaseURL:           getOr("BASE_URL", "http://localhost"),
		Environment:       getOr("ENVIRONMENT", "development"),
		Port:              getOr("PORT", "8080"),
	}
}

func mustGet(key string) string {
	v := os.Getenv(key)
	if v == "" {
		log.Fatalf("required env var %s is not set", key)
	}
	return v
}

func getOr(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}
