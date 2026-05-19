# QuizLive — Full Project Plan

> A real-time multiplayer quiz game platform where a host runs game sessions, teams join by scanning a QR code on their phones, and compete through configurable question rounds with live scoring, leaderboards, and game rules.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Tech Stack](#3-tech-stack)
4. [Feature Specification](#4-feature-specification)
5. [Database Schema](#5-database-schema)
6. [Backend Structure (Go)](#6-backend-structure-go)
7. [API Design](#7-api-design)
8. [WebSocket Event Protocol](#8-websocket-event-protocol)
9. [Game State Machine](#9-game-state-machine)
10. [Scoring System](#10-scoring-system)
11. [Security & Robustness](#11-security--robustness)
12. [Frontend Structure](#12-frontend-structure)
13. [Nginx Configuration](#13-nginx-configuration)
14. [Docker & Docker Compose](#14-docker--docker-compose)
15. [Environment Configuration](#15-environment-configuration)
16. [Directory Layout](#16-directory-layout)
17. [Development Phases](#17-development-phases)

---

## 1. Project Overview

QuizLive is a self-hosted web application that lets a single operator (the host) build question banks, configure game sessions, and run live interactive quiz games with multiple competing teams. Teams join by scanning a QR code that opens a mobile-friendly web interface — no app install required. The game is driven by a real-time WebSocket engine, and all state is persisted in PostgreSQL so sessions can be reviewed or resumed.

### Core goals

- Simple, beautiful UI for both the host dashboard and the team mobile interface
- Real-time feedback for every player action (answer submission, correct/wrong reveal, rank change)
- Flexible question types and configurable scoring rules
- Fully self-hosted with Docker Compose — no external services required
- The QR code always resolves to a URL served by nginx, no port numbers visible to teams

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Host Machine                            │
│                                                                 │
│   ┌────────────────────────────────────────────────────────┐   │
│   │                    Docker Network                       │   │
│   │                                                         │   │
│   │   ┌──────────┐    ┌──────────────┐    ┌────────────┐  │   │
│   │   │  nginx   │───▶│  Go Backend  │───▶│ PostgreSQL │  │   │
│   │   │  :80/443 │    │   :8080      │    │   :5432    │  │   │
│   │   │          │    │              │    │            │  │   │
│   │   │  /api/*  │───▶│  REST API    │    │  quizlive  │  │   │
│   │   │  /ws     │───▶│  WebSocket   │    │  database  │  │   │
│   │   │  /*      │───▶│  Static SPA  │    └────────────┘  │   │
│   │   └──────────┘    └──────────────┘                     │   │
│   │                                                         │   │
│   └────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘

External clients:
  Host browser ──▶ nginx :443 (desktop, dashboard)
  Team phones  ──▶ nginx :443 (mobile, scan QR → join URL)
```

### Data flow for a live game

1. Host creates a game session → backend generates a unique session code and QR URL
2. Host opens the projector/display view on a second screen
3. Teams scan QR → phone browser opens `/join/<session-code>`
4. Teams register team name and player names → WebSocket connection established
5. Host starts game → backend broadcasts questions round by round
6. Teams submit answers via WebSocket → backend validates, scores, and acknowledges
7. After each question → backend broadcasts correct answer + updated leaderboard to everyone
8. After all rounds → final leaderboard, session stored in PostgreSQL for review

---

## 3. Tech Stack

### Backend

| Component | Choice | Reason |
|---|---|---|
| Language | Go 1.22+ | Fast, low memory, excellent WebSocket support, easy Docker packaging |
| HTTP router | `chi` | Lightweight, idiomatic, good middleware support |
| WebSocket | `gorilla/websocket` | Mature, battle-tested, fine-grained control |
| Database driver | `pgx/v5` | Native PostgreSQL driver, best performance |
| Migrations | `pressly/goose/v3` | SQL-file-based migrations, Up/Down in one file, embedded FS support |
| Config | `godotenv` + `os.Getenv` | Simple, no over-engineering |
| QR generation | `skip2/go-qrcode` | Pure Go, no CGO dependencies |
| Password hashing | `bcrypt` | For host admin account |
| Validation | `go-playground/validator` | Struct tag based input validation |
| Logging | `log/slog` (stdlib) | Structured logging, no dependency |

### Frontend

| Component | Choice | Reason |
|---|---|---|
| Framework | React 18 + Vite | Fast dev experience, small bundles |
| Routing | React Router v6 | Standard SPA routing |
| State | Zustand | Minimal, no boilerplate |
| Styling | Tailwind CSS | Utility-first, consistent mobile/desktop |
| WebSocket client | Native browser `WebSocket` | No library needed |
| QR display | `qrcode.react` | Client-side QR rendering as fallback |
| Animations | Framer Motion | Leaderboard rank animations, reveals |
| Icons | Lucide React | Lightweight, consistent |

### Infrastructure

| Component | Choice |
|---|---|
| Reverse proxy | nginx (Alpine) |
| Database | PostgreSQL 16 (Alpine) |
| Containerisation | Docker + Docker Compose v2 |
| TLS (optional) | Certbot / Let's Encrypt (same pattern as your existing stack) |
| Static files | nginx serves the built Vite SPA directly |

---

## 4. Feature Specification

### 4.1 Host Authentication

- Single-host model: one admin account (username + bcrypt password) configured via environment variables on first run
- JWT issued on login, stored in `localStorage`, sent as `Authorization: Bearer <token>` on all API requests
- WebSocket connections from the host also carry the JWT as a query parameter on upgrade
- Session expiry: 24 hours, non-refreshing (host must re-login)

### 4.2 Question Builder

Each question belongs to a **category** and has one **question type**. Questions are reusable across multiple games.

#### Question types

| Type | Description | Answer format |
|---|---|---|
| `multiple_choice` | 2–6 options, exactly one correct | Single option ID |
| `true_false` | Two options: True / False | Boolean |
| `multiple_select` | 2–6 options, 1 or more correct | Array of option IDs |
| `closest_number` | Numeric question, no fixed answer — closest team wins | Integer or float |
| `order_items` | List of 3–6 items, teams drag to correct order | Array of item IDs in order |
| `open_text` | Free text, host manually marks correct/incorrect after reveal | String |

#### Question fields

- `title` — the question text (supports basic Markdown for bold/italic)
- `media_url` — optional image URL to display above the question
- `options` — array of answer options (for applicable types)
- `correct_answer` — stored server-side, never sent to teams before reveal
- `time_limit_seconds` — per-question override (default inherited from game config)
- `points_value` — per-question override (default inherited from game config)
- `explanation` — optional text shown after the answer is revealed
- `category_id` — which category this belongs to
- `difficulty` — `easy` | `medium` | `hard` (cosmetic label, no game effect by default)

### 4.3 Category Management

- Host creates named categories (e.g. "Science", "History", "Local Knowledge")
- Each category has a name, optional icon (emoji), and optional color accent
- Categories are used as filters in the question library and in game setup
- A game can include questions from one or more categories

### 4.4 Game Session Setup

The host configures a game before launching it:

- **Name** — displayed on the projector view and team phones
- **Question source** — pick individual questions, pick by category, or shuffle N random questions from a category
- **Question order** — fixed order or randomise per session
- **Default time limit** — 10 / 20 / 30 / 60 / 90 seconds (per-question overrides are possible)
- **Default points value** — e.g. 100 points per question
- **Scoring mode** — see section 10
- **Max teams** — optional cap (1–99)
- **Max players per team** — optional cap
- **Allow late join** — whether teams can join after the game has started
- **Visibility of other teams' answers** — hidden or visible while timer runs

### 4.5 QR Code & Join Flow

- When the host launches a session, the backend generates:
  - A short unique **session code** (6 uppercase alphanumeric characters, e.g. `XK4R9Z`)
  - A **join URL**: `https://<your-domain>/join/XK4R9Z`
  - A **QR code** encoding that URL (served as SVG/PNG from the API)
- The host projector view displays the QR code prominently while waiting for teams
- On the team phone:
  1. Scan QR → browser opens `/join/XK4R9Z`
  2. Form: enter team name, player names (1–N), optionally pick a team color/avatar
  3. Submit → WebSocket connection established, team enters the lobby
  4. Phone shows a waiting screen with connected teams listed (lobby view)

### 4.6 Live Game Flow

1. **Lobby** — teams join, host sees list of connected teams, can kick teams
2. **Host starts round** → backend advances to first question
3. **Question phase**:
   - Question text + options broadcast to all teams
   - Timer starts (countdown visible on all screens)
   - Each team can submit one answer before time expires
   - First team to answer is recorded (for speed bonus)
   - Once all teams answer OR timer expires → question closes
4. **Reveal phase**:
   - Correct answer revealed on all screens
   - Points awarded and score deltas broadcast
   - Optional: explanation text shown for a configurable duration
5. **Leaderboard flash** — animated rank update shown for a few seconds
6. **Host advances** to next question (manual) or auto-advance after a delay
7. Repeat until all questions done
8. **Final results** screen — podium view, full stats, shareable summary

### 4.7 Projector / Display View

Separate full-screen route (`/display/<session-code>`) designed for a second monitor or projector:

- Large countdown ring (SVG animated)
- Question text in large font
- Answer options (shown without highlighting until reveal phase)
- Live "answered" indicator — shows how many teams have submitted (without revealing answers)
- After reveal: options highlighted correct/incorrect with team answer distribution bar chart
- Between questions: animated leaderboard with rank movement arrows
- Clean dark theme, high contrast, readable from the back of a room

### 4.8 Team Mobile Interface

Designed mobile-first (max-width 480px):

- **Lobby screen** — team name, players listed, connected teams count, waiting animation
- **Question screen** — question text, timer ring, tap/drag answer UI
- **Submitted screen** — "Answer locked! Waiting for others…" with time remaining
- **Reveal screen** — big correct/incorrect indicator, points gained this round, total score
- **Leaderboard screen** — team's rank and score, top 3 teams shown
- **Final screen** — full leaderboard, confetti animation for winner

### 4.9 Scoring & Rules Engine

See section 10 for full details.

### 4.10 Session History & Review

- All sessions stored in PostgreSQL after completion
- Host can review past sessions: which teams answered what, time taken per question, score progression
- Export session results as JSON or CSV
- Questions can be flagged for review from results (e.g. if many teams got it wrong and host suspects ambiguity)

---

## 5. Database Schema

### Conventions

- All tables use `uuid` primary keys generated with `gen_random_uuid()`
- All timestamps are `timestamptz` (UTC stored, displayed in local time on frontend)
- Soft deletes use `deleted_at timestamptz` (nullable) — records are never hard-deleted from the question bank

```sql
-- ─────────────────────────────────────────
-- EXTENSIONS
-- ─────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ─────────────────────────────────────────
-- CATEGORIES
-- ─────────────────────────────────────────
CREATE TABLE categories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    icon        TEXT,                    -- emoji or icon code
    color       TEXT,                    -- hex color string e.g. "#7F77DD"
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ
);

CREATE INDEX idx_categories_deleted ON categories(deleted_at);


-- ─────────────────────────────────────────
-- QUESTIONS
-- ─────────────────────────────────────────
CREATE TYPE question_type AS ENUM (
    'multiple_choice',
    'true_false',
    'multiple_select',
    'closest_number',
    'order_items',
    'open_text'
);

CREATE TYPE difficulty_level AS ENUM ('easy', 'medium', 'hard');

CREATE TABLE questions (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id          UUID REFERENCES categories(id) ON DELETE SET NULL,
    type                 question_type NOT NULL,
    title                TEXT NOT NULL,
    media_url            TEXT,
    explanation          TEXT,
    difficulty           difficulty_level NOT NULL DEFAULT 'medium',
    time_limit_seconds   INTEGER,           -- NULL means use game default
    points_value         INTEGER,           -- NULL means use game default
    correct_answer       JSONB NOT NULL,    -- flexible per type
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at           TIMESTAMPTZ
);

CREATE INDEX idx_questions_category ON questions(category_id);
CREATE INDEX idx_questions_type     ON questions(type);
CREATE INDEX idx_questions_deleted  ON questions(deleted_at);


-- ─────────────────────────────────────────
-- QUESTION OPTIONS
-- (separate table; multiple_choice, true_false, multiple_select, order_items)
-- ─────────────────────────────────────────
CREATE TABLE question_options (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id  UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    label        TEXT NOT NULL,             -- display text
    sort_order   INTEGER NOT NULL DEFAULT 0 -- display order
);

CREATE INDEX idx_question_options_question ON question_options(question_id);


-- ─────────────────────────────────────────
-- GAME SESSIONS
-- ─────────────────────────────────────────
CREATE TYPE session_status AS ENUM (
    'draft',       -- being configured, not yet open
    'lobby',       -- open for teams to join, not started
    'active',      -- game is running
    'paused',      -- host paused mid-game
    'finished',    -- all questions done
    'cancelled'    -- abandoned
);

CREATE TYPE scoring_mode AS ENUM (
    'standard',        -- fixed points per correct answer
    'speed_bonus',     -- points + time-based bonus
    'streak',          -- multiplier for consecutive correct answers
    'elimination',     -- wrong answer = team eliminated
    'custom'           -- combination of the above flags
);

CREATE TABLE game_sessions (
    id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                       TEXT NOT NULL,
    session_code               CHAR(6) NOT NULL UNIQUE,
    status                     session_status NOT NULL DEFAULT 'draft',
    scoring_mode               scoring_mode NOT NULL DEFAULT 'standard',

    -- scoring config (JSONB for flexibility)
    scoring_config             JSONB NOT NULL DEFAULT '{}',
    /*
      scoring_config shape:
      {
        "default_points": 100,
        "default_time_limit": 30,
        "speed_bonus_enabled": true,
        "speed_bonus_max_extra": 50,
        "speed_bonus_window_seconds": 5,
        "wrong_answer_penalty": 0,
        "streak_bonus_enabled": false,
        "streak_bonus_threshold": 3,
        "streak_multiplier": 1.5,
        "steal_enabled": false,
        "auto_advance_seconds": 5,
        "max_teams": null,
        "max_players_per_team": null,
        "allow_late_join": false,
        "reveal_others_answers": false
      }
    */

    current_question_index     INTEGER NOT NULL DEFAULT 0,
    started_at                 TIMESTAMPTZ,
    finished_at                TIMESTAMPTZ,
    created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_code   ON game_sessions(session_code);
CREATE INDEX idx_sessions_status ON game_sessions(status);


-- ─────────────────────────────────────────
-- SESSION QUESTIONS  (ordered list per session)
-- ─────────────────────────────────────────
CREATE TABLE session_questions (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id   UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
    question_id  UUID NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
    sort_order   INTEGER NOT NULL,
    -- per-question overrides for this session instance
    time_limit_override   INTEGER,
    points_override       INTEGER
);

CREATE UNIQUE INDEX idx_session_questions_order
    ON session_questions(session_id, sort_order);


-- ─────────────────────────────────────────
-- TEAMS
-- ─────────────────────────────────────────
CREATE TABLE teams (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id   UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
    name         TEXT NOT NULL,
    color        TEXT NOT NULL DEFAULT '#7F77DD',  -- hex
    avatar_emoji TEXT NOT NULL DEFAULT '🎯',
    score        INTEGER NOT NULL DEFAULT 0,
    rank         INTEGER,                           -- computed after each question
    is_eliminated BOOLEAN NOT NULL DEFAULT FALSE,
    joined_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_teams_session_name ON teams(session_id, name);
CREATE INDEX idx_teams_session            ON teams(session_id);


-- ─────────────────────────────────────────
-- TEAM PLAYERS
-- ─────────────────────────────────────────
CREATE TABLE team_players (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id    UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    name       TEXT NOT NULL,
    joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_team_players_team ON team_players(team_id);


-- ─────────────────────────────────────────
-- ANSWERS
-- ─────────────────────────────────────────
CREATE TYPE answer_result AS ENUM (
    'correct',
    'incorrect',
    'partial',        -- for multiple_select or order_items
    'pending',        -- open_text, awaiting host mark
    'no_answer'       -- team did not submit in time
);

CREATE TABLE answers (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id              UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    session_question_id  UUID NOT NULL REFERENCES session_questions(id) ON DELETE CASCADE,
    submitted_answer     JSONB,             -- null if no_answer
    result               answer_result NOT NULL DEFAULT 'pending',
    points_awarded       INTEGER NOT NULL DEFAULT 0,
    time_taken_ms        INTEGER,           -- milliseconds from question start to submission
    submitted_at         TIMESTAMPTZ,
    marked_at            TIMESTAMPTZ        -- for open_text, when host marked it
);

CREATE UNIQUE INDEX idx_answers_team_question
    ON answers(team_id, session_question_id);
CREATE INDEX idx_answers_session_question
    ON answers(session_question_id);


-- ─────────────────────────────────────────
-- SCORE EVENTS  (audit trail of every point change)
-- ─────────────────────────────────────────
CREATE TABLE score_events (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id      UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    session_id   UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
    delta        INTEGER NOT NULL,      -- positive or negative
    reason       TEXT NOT NULL,         -- e.g. "correct_answer", "speed_bonus", "penalty", "steal"
    question_index INTEGER,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_score_events_team    ON score_events(team_id);
CREATE INDEX idx_score_events_session ON score_events(session_id);
```

### correct_answer JSONB shape per question type

```json
// multiple_choice / true_false
{ "option_id": "uuid-of-correct-option" }

// multiple_select
{ "option_ids": ["uuid1", "uuid2"] }

// closest_number
{ "target": 206, "unit": "bones" }

// order_items
{ "ordered_ids": ["uuid-c", "uuid-a", "uuid-b"] }

// open_text — host provides reference answer but marks manually
{ "reference": "The Battle of Hastings" }
```

---

## 6. Backend Structure (Go)

### Module layout

```
quizlive-backend/
├── cmd/
│   └── server/
│       └── main.go                  # Entry point: wires everything together
│
├── internal/
│   ├── config/
│   │   └── config.go                # Load env vars into a Config struct
│   │
│   ├── db/
│   │   ├── db.go                    # pgx pool + goose migration runner
│   │   └── migrations/              # goose SQL migration files
│   │       ├── 001_initial_schema.sql
│   │       └── ...
│   │
│   ├── middleware/
│   │   ├── auth.go                  # JWT validation middleware
│   │   ├── cors.go                  # CORS headers for dev
│   │   └── logging.go               # Request logging via slog
│   │
│   ├── handler/
│   │   ├── auth.go                  # POST /api/auth/login
│   │   ├── categories.go            # CRUD /api/categories
│   │   ├── questions.go             # CRUD /api/questions
│   │   ├── sessions.go              # CRUD + control /api/sessions
│   │   ├── teams.go                 # GET /api/sessions/:id/teams
│   │   ├── answers.go               # POST /api/sessions/:id/mark (open_text)
│   │   ├── qr.go                    # GET /api/sessions/:id/qr
│   │   └── ws.go                    # WebSocket upgrade handler
│   │
│   ├── game/
│   │   ├── hub.go                   # Central WebSocket hub (map of sessions → clients)
│   │   ├── session.go               # Game session state machine
│   │   ├── client.go                # One WebSocket client (host or team)
│   │   ├── events.go                # All WS event type definitions (in/out)
│   │   ├── scoring.go               # Scoring engine
│   │   └── timer.go                 # Per-question countdown goroutine
│   │
│   ├── store/
│   │   ├── category_store.go        # DB queries for categories
│   │   ├── question_store.go        # DB queries for questions
│   │   ├── session_store.go         # DB queries for sessions
│   │   ├── team_store.go            # DB queries for teams
│   │   └── answer_store.go          # DB queries for answers
│   │
│   └── model/
│       ├── category.go
│       ├── question.go
│       ├── session.go
│       ├── team.go
│       └── answer.go
│
├── go.mod
├── go.sum
├── Dockerfile
└── .env.example
```

### Goose Migration Format

Each file in `internal/db/migrations/` is a single SQL file with `pressly/goose/v3` annotations — Up and Down migrations live together:

```sql
-- 001_initial_schema.sql

-- +goose Up
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ...
);

-- +goose Down
DROP TABLE IF EXISTS categories;
```

Migrations run automatically on startup using an embedded filesystem so the binary is self-contained:

```go
// internal/db/db.go
//go:embed migrations/*.sql
var embedMigrations embed.FS

func RunMigrations(databaseURL string) error {
    db, err := sql.Open("pgx", databaseURL)
    if err != nil {
        return err
    }
    defer db.Close()
    goose.SetBaseFS(embedMigrations)
    return goose.Up(db, "migrations")
}
```

Roll back one step during development:

```bash
goose -dir ./internal/db/migrations postgres "$DATABASE_URL" down
```

Check migration status:

```bash
goose -dir ./internal/db/migrations postgres "$DATABASE_URL" status
```

### main.go responsibilities

```go
// cmd/server/main.go — high level only
func main() {
    cfg := config.Load()
    pool := db.Init(cfg.DatabaseURL)
    db.RunMigrations(cfg.DatabaseURL)

    hub := game.NewHub()
    go hub.Run()

    r := chi.NewRouter()
    r.Use(middleware.Logger)
    r.Use(middleware.Cors(cfg))

    // Public routes
    r.Post("/api/auth/login", handler.Login(cfg))
    r.Get("/ws", handler.WebSocket(hub))              // teams connect here (no auth)

    // Protected routes (JWT required)
    r.Group(func(r chi.Router) {
        r.Use(middleware.JWTAuth(cfg))
        r.Mount("/api/categories", handler.CategoryRoutes(pool))
        r.Mount("/api/questions",  handler.QuestionRoutes(pool))
        r.Mount("/api/sessions",   handler.SessionRoutes(pool, hub))
    })

    // Serve built React SPA for all other routes
    r.Handle("/*", http.FileServer(http.Dir("./static")))

    http.ListenAndServe(":8080", r)
}
```

### game/hub.go — Hub architecture

The Hub maintains a registry of all active game sessions and the WebSocket clients connected to them. It uses a single goroutine with a select loop to avoid any shared-state race conditions.

```go
type ClientRole string
const (
    RoleHost ClientRole = "host"
    RoleTeam ClientRole = "team"
)

type Client struct {
    SessionCode string
    Role        ClientRole
    TeamID      *uuid.UUID     // nil for host
    Conn        *websocket.Conn
    Send        chan []byte     // outbound message queue
}

type Hub struct {
    // sessionCode → set of clients
    sessions map[string]map[*Client]bool

    // game state per session
    states   map[string]*SessionState

    register   chan *Client
    unregister chan *Client
    broadcast  chan *BroadcastMsg  // { sessionCode, payload, excludeClient }
}
```

### game/session.go — Session state machine

See section 9 for the full state machine.

```go
type SessionPhase string
const (
    PhaseLobby     SessionPhase = "lobby"
    PhaseQuestion  SessionPhase = "question"
    PhaseReveal    SessionPhase = "reveal"
    PhaseLeaderboard SessionPhase = "leaderboard"
    PhaseFinished  SessionPhase = "finished"
)

type SessionState struct {
    SessionID           uuid.UUID
    Phase               SessionPhase
    Questions           []SessionQuestion
    CurrentIndex        int
    QuestionStartedAt   time.Time
    Timer               *time.Timer
    TeamAnswers         map[uuid.UUID]*AnswerRecord   // teamID → answer
    Config              ScoringConfig
}
```

---

## 7. API Design

All REST endpoints are prefixed with `/api`. JSON body on all POST/PUT/PATCH. All protected endpoints require `Authorization: Bearer <jwt>`.

### Auth

```
POST   /api/auth/login
  Body:  { "username": string, "password": string }
  200:   { "token": string, "expires_at": string }
  401:   { "error": "invalid credentials" }
```

### Categories

```
GET    /api/categories               → list all (excludes deleted)
POST   /api/categories               → create
  Body:  { "name", "icon", "color" }
GET    /api/categories/:id           → get single
PUT    /api/categories/:id           → update
DELETE /api/categories/:id           → soft delete
```

### Questions

```
GET    /api/questions                → list (filter: ?category_id=&type=&difficulty=&q=)
POST   /api/questions                → create
  Body:  { "category_id", "type", "title", "media_url", "explanation",
           "difficulty", "time_limit_seconds", "points_value",
           "correct_answer", "options": [{"label","sort_order"}] }
GET    /api/questions/:id            → get single (includes options)
PUT    /api/questions/:id            → update (full replace)
DELETE /api/questions/:id            → soft delete

GET    /api/questions/count          → { "total": N } (with same filters)
```

### Game Sessions

```
GET    /api/sessions                 → list sessions (filter: ?status=)
POST   /api/sessions                 → create session
  Body:  { "name", "scoring_mode", "scoring_config", "question_ids": [] }
GET    /api/sessions/:id             → get session detail
PUT    /api/sessions/:id             → update config (only while status=draft)
DELETE /api/sessions/:id             → cancel session

POST   /api/sessions/:id/start       → move draft→lobby (generates session_code + QR)
POST   /api/sessions/:id/launch      → move lobby→active (start first question)
POST   /api/sessions/:id/next        → advance to next question (while active)
POST   /api/sessions/:id/pause       → pause active session
POST   /api/sessions/:id/resume      → resume paused session
POST   /api/sessions/:id/finish      → force-finish session

GET    /api/sessions/:id/qr          → returns QR code as PNG (host display)
GET    /api/sessions/:id/teams       → list teams in session
GET    /api/sessions/:id/answers     → full answer matrix (after finish)
GET    /api/sessions/:id/export      → CSV export of results

POST   /api/sessions/:id/mark        → host marks an open_text answer
  Body:  { "answer_id": string, "result": "correct"|"incorrect" }

GET    /api/join/:code               → validate code, return session info (public, no auth)
  200:  { "session_id", "name", "status", "max_teams", "current_team_count" }
  404:  { "error": "session not found" }
  409:  { "error": "session full" }
  410:  { "error": "session not accepting joins" }
```

### WebSocket endpoint

```
GET    /ws?session=<code>&role=<host|team>
```

The host connects with a valid JWT in the `token` query parameter.  
Teams connect with `role=team` and no JWT — they authenticate by completing the join handshake as the first message.

---

## 8. WebSocket Event Protocol

All messages are JSON with a `type` field. Messages from client to server are called **commands**. Messages from server to client are called **events**. The server can broadcast to everyone in a session or send a targeted message to a single client.

### Message envelope

```json
{
  "type": "event_name",
  "payload": { ... }
}
```

### Commands (client → server)

```json
// Team: complete registration after WebSocket connect
{ "type": "team.join",
  "payload": { "team_name": "The Avengers", "players": ["Ali", "Sara", "Omar"], "color": "#E85D24", "avatar": "🦊" } }

// Team: submit an answer
{ "type": "answer.submit",
  "payload": { "session_question_id": "uuid", "answer": { "option_id": "uuid" } } }

// Host: advance to next question
{ "type": "host.next" }

// Host: pause game
{ "type": "host.pause" }

// Host: resume game
{ "type": "host.resume" }

// Host: kick a team
{ "type": "host.kick", "payload": { "team_id": "uuid" } }

// Host: mark an open_text answer (can also use REST API)
{ "type": "host.mark",
  "payload": { "answer_id": "uuid", "result": "correct" } }
```

### Events (server → client)

```json
// Sent to newly connected team client after successful join
{ "type": "joined",
  "payload": { "team_id": "uuid", "session": { "name": "...", "status": "lobby" }, "teams": [...] } }

// Broadcast to all: a new team joined the lobby
{ "type": "team.connected",
  "payload": { "team": { "id", "name", "color", "avatar", "player_count" } } }

// Broadcast to all: a team disconnected
{ "type": "team.disconnected",
  "payload": { "team_id": "uuid" } }

// Broadcast to all: host started the game, first question coming
{ "type": "game.started",
  "payload": { "total_questions": 10 } }

// Broadcast to all: a new question begins
{ "type": "question.started",
  "payload": {
    "session_question_id": "uuid",
    "index": 0,
    "total": 10,
    "type": "multiple_choice",
    "title": "What is the capital of France?",
    "media_url": null,
    "options": [ { "id": "uuid", "label": "Paris" }, ... ],
    "time_limit_seconds": 30,
    "points_value": 100,
    "started_at": "ISO8601"
  }
}
// NOTE: correct_answer is NEVER included in this event

// Sent only to the host: a team submitted an answer (no answer content revealed)
{ "type": "answer.received",
  "payload": { "team_id": "uuid", "team_name": "The Avengers", "time_taken_ms": 4312 } }

// Broadcast to all: time expired OR all teams answered, question closed
{ "type": "question.closed",
  "payload": { "session_question_id": "uuid" } }

// Broadcast to all: correct answer revealed
{ "type": "question.revealed",
  "payload": {
    "session_question_id": "uuid",
    "correct_answer": { ... },
    "explanation": "Paris has been the capital since...",
    "answer_distribution": {
      "uuid-paris": 3,
      "uuid-london": 1,
      "uuid-berlin": 0,
      "no_answer": 1
    }
  }
}

// Sent per-team (private): their result for this question
{ "type": "team.result",
  "payload": {
    "result": "correct",
    "points_awarded": 150,
    "time_taken_ms": 4312,
    "score_total": 350
  }
}

// Broadcast to all: updated leaderboard after question reveal
{ "type": "leaderboard.updated",
  "payload": {
    "rankings": [
      { "rank": 1, "team_id": "uuid", "name": "The Avengers", "score": 350, "delta": +150, "color": "#E85D24", "avatar": "🦊" },
      { "rank": 2, "team_id": "uuid", "name": "Brain Trust", "score": 200, "delta": 0, "color": "#7F77DD", "avatar": "🧠" }
    ]
  }
}

// Broadcast: game paused
{ "type": "game.paused" }

// Broadcast: game resumed
{ "type": "game.resumed" }

// Broadcast: game finished
{ "type": "game.finished",
  "payload": {
    "winner": { "team_id": "uuid", "name": "The Avengers", "score": 750 },
    "rankings": [ ... ]
  }
}

// Private: team was kicked by host
{ "type": "team.kicked" }

// Private: error response
{ "type": "error",
  "payload": { "code": "ANSWER_ALREADY_SUBMITTED", "message": "Your team already submitted an answer for this question." }
}
```

---

## 9. Game State Machine

The backend enforces a strict phase progression per session. The `SessionState` struct in Go tracks the current phase and only allows valid transitions.

```
                    host.start()
  draft ──────────────────────────► lobby
                                      │
                                  host.launch()
                                      │
                                      ▼
                               ┌──────────────┐
                               │   question   │◄──────────────────┐
                               │   (timer     │                    │
                               │   running)   │                    │
                               └──────────────┘                    │
                                      │                            │
                          all answered OR timer expired            │
                                      │                            │
                                      ▼                            │
                               ┌──────────────┐                    │
                               │   reveal     │                    │
                               │   (correct   │                    │
                               │   answer)    │                    │
                               └──────────────┘                    │
                                      │                            │
                               scoring applied                     │
                                      │                            │
                                      ▼                            │
                               ┌──────────────┐                    │
                               │  leaderboard │  more questions?   │
                               │   flash      │───────────────────►┘
                               └──────────────┘
                                      │
                               last question done
                                      │
                                      ▼
                                  finished
```

### Phase rules

| Phase | Allowed commands | Auto-transition |
|---|---|---|
| `lobby` | `team.join`, `host.kick`, `host.launch` | None |
| `question` | `answer.submit`, `host.pause` | Timer expiry → `reveal` |
| `reveal` | `host.next`, `host.pause` | If `auto_advance_seconds` set → `leaderboard` |
| `leaderboard` | `host.next`, `host.pause` | If `auto_advance_seconds` set → `question` or `finished` |
| `finished` | None | None |
| `paused` | `host.resume` | None |

The `paused` phase is a meta-state — it remembers which phase was active before pausing. On resume, that phase is restored and any timer is restarted with the remaining time.

---

## 10. Scoring System

The scoring engine lives in `internal/game/scoring.go`. It receives an `AnswerRecord` and the session's `ScoringConfig` and returns a `ScoreResult`.

### Base scoring

Every correct answer earns `points_value` (from question override or session default).

### Speed bonus (optional)

If `speed_bonus_enabled = true`:

```
time_ratio = max(0, (time_limit - time_taken_seconds) / time_limit)
bonus = floor(speed_bonus_max_extra * time_ratio)
total = base_points + bonus
```

The speed bonus only applies within `speed_bonus_window_seconds` of the question start — if a team answers in the last second, they still get base points but no bonus.

### Streak bonus (optional)

If `streak_bonus_enabled = true` and a team has answered `streak_bonus_threshold` consecutive questions correctly, their next correct answer earns `base × streak_multiplier`. The streak resets on any wrong answer or no-answer.

Streak state is tracked in `SessionState.TeamAnswers` in memory and does not require a DB round-trip per question.

### Wrong answer penalty (optional)

If `wrong_answer_penalty > 0`, teams lose that many points for a wrong answer (floored at 0 — teams cannot go negative by default, configurable).

### Closest number scoring

For `closest_number` questions, the team with the smallest absolute difference wins full `points_value`. All other teams receive a proportional score:

```
max_diff = max absolute difference across all teams
score = floor(base × (1 - (team_diff / max_diff)))
```

### Partial credit (multiple_select, order_items)

```
correct_count = number of correctly placed/selected items
total_items   = total items in the question
score = floor(base × (correct_count / total_items))
```

### Steal mechanic (optional)

If `steal_enabled = true` and the current team's timer expires without an answer, the host can activate steal mode. All other teams get a 10-second buzzer window. First team to submit the correct answer steals `steal_points` (configurable, default = half the base value).

### Elimination mode

If `scoring_mode = elimination`, any team that submits a wrong answer (or no answer) within `elimination_strike_count` rounds (default: 1) is marked `is_eliminated = true` and loses their WebSocket role to active participant — they can still watch but cannot answer. The session ends when only one team remains.

---

## 11. Security & Robustness

Design decisions that address correctness, security, and reliability risks identified during planning. Each subsection corresponds to a specific gap.

### 11.1 WebSocket Team Identity Binding

Teams authenticate via the `team.join` handshake, not a JWT. To prevent a client from spoofing another team's identity in subsequent messages, the hub binds `TeamID` to the connection at join time and never allows it to be overwritten.

After `team.join` succeeds and the team row is persisted, the hub sets `client.TeamID = &team.ID`. Every subsequent inbound command is validated against this bound value:

```go
// hub.go — read loop, before dispatching any command
if cmd.RequiresTeamAuth() && (client.TeamID == nil || *client.TeamID != cmd.TeamID) {
    client.sendError("IDENTITY_MISMATCH", "team identity mismatch")
    client.Conn.Close()
    return
}
```

A second `team.join` from an already-registered connection is rejected with `ALREADY_JOINED`. The `TeamID` field on `Client` is set exactly once by the hub — never by inbound message content.

### 11.2 Client-Side Timer Synchronisation

Mobile clocks drift. A countdown started from `time.Now()` on receipt of `question.started` diverges from the server timer over 30–90 second question windows.

**Fix:** clients compute an absolute deadline from the `started_at` timestamp already included in `question.started`:

```javascript
// useCountdown.js
const deadline = new Date(started_at).getTime() + time_limit_seconds * 1000;
const remaining = () => Math.max(0, deadline - Date.now());
```

Network round-trip is the only remaining drift source (<100 ms on a local network). The server's `question.closed` event is always the authoritative close — client timers are cosmetic only and cannot block or allow answer submissions.

### 11.3 open_text Marking Flow

`open_text` questions require the host to manually score each team's answer. The game must not auto-advance until all pending answers are resolved.

**Rules:**

1. On `question.closed` for an `open_text` question: transition to `reveal`, insert answer rows with `result = pending` and `points_awarded = 0`. The `question.revealed` broadcast includes `"pending_open_marks": N`.
2. Each `host.mark` (WS command or `POST /api/sessions/:id/mark`) updates one answer row, applies points, sends a targeted `team.result` to the affected team, and broadcasts `leaderboard.updated` to all.
3. `host.next` in the `reveal` phase checks for pending marks. If any remain, the server sends:
   ```json
   { "type": "host.next.warning", "payload": { "unmarked_count": 2 } }
   ```
   The host UI shows a confirmation dialog. A second `host.next` with `"force": true` overrides the gate.
4. `auto_advance_seconds` is ignored while any `open_text` answers remain pending.

### 11.4 Pause / Resume Timer Persistence

When a game pauses mid-question, the remaining countdown must be preserved so the timer resumes accurately without drift.

`SessionState` gains two fields: `RemainingMs int64` and `PausedPhase SessionPhase`.

On `host.pause`:

```go
// session.go
state.Timer.Stop()
state.RemainingMs = int64(state.CurrentQuestion().TimeLimitSeconds)*1000 -
    time.Since(state.QuestionStartedAt).Milliseconds()
state.PausedPhase = state.Phase
state.Phase = PhasePaused
```

On `host.resume`, the timer restarts with `RemainingMs` and `QuestionStartedAt` is back-calculated so client deadline arithmetic (§11.2) stays correct:

```go
state.Phase = state.PausedPhase
state.QuestionStartedAt = time.Now().Add(
    -time.Duration(int64(state.CurrentQuestion().TimeLimitSeconds)*1000-state.RemainingMs) * time.Millisecond,
)
state.Timer = time.AfterFunc(time.Duration(state.RemainingMs)*time.Millisecond, state.onTimerExpiry)
```

The `game.resumed` broadcast includes `"remaining_ms": state.RemainingMs` so clients can recalculate their countdown deadline.

### 11.5 Static File Serving Strategy

nginx owns static asset serving in production. The Go backend's `http.FileServer` is only active in local development (running the backend directly without Docker).

```go
// cmd/server/main.go
if cfg.Environment == "development" {
    r.Handle("/*", http.FileServer(http.Dir("./static")))
}
```

In production (`ENVIRONMENT=production`), the Go router has no catch-all. nginx intercepts all non-`/api`, non-`/ws` routes before they reach Go. This eliminates any risk of silently serving a stale build from the backend container and makes the responsibility boundary explicit.

### 11.6 Session Code Collision Handling

A `UNIQUE` constraint on `game_sessions(session_code)` is the enforcement point. The application retries generation up to 5 times on a constraint violation before surfacing an error to the caller:

```go
// store/session_store.go
func generateUniqueCode(ctx context.Context, pool *pgxpool.Pool, sessionID uuid.UUID) (string, error) {
    for range 5 {
        code := randomCode(6) // [A-Z0-9]{6}
        _, err := pool.Exec(ctx,
            `UPDATE game_sessions SET session_code = $1 WHERE id = $2`, code, sessionID)
        if err == nil {
            return code, nil
        }
        if !isUniqueViolation(err) {
            return "", err
        }
    }
    return "", errors.New("session code: 5 collision retries exhausted")
}
```

---

## 12. Frontend Structure

### Application routes

```
/                           → redirect to /dashboard (if logged in) or /login
/login                      → host login page
/dashboard                  → question bank, session list overview
/questions                  → question library (list, create, edit)
/questions/new              → question builder form
/questions/:id/edit         → edit existing question
/categories                 → category management
/sessions                   → session list
/sessions/new               → session setup wizard
/sessions/:id               → session detail / control panel (host)
/sessions/:id/display       → projector view (full screen, no auth cookie needed if URL is known)
/join/:code                 → team join page (public, mobile)
/play/:code                 → team game interface (public, mobile, after joining)
```

### Component structure

```
src/
├── main.jsx
├── App.jsx                        # Router setup
│
├── stores/
│   ├── auth.store.js              # JWT, login state
│   ├── game.store.js              # Current session state, phase, leaderboard
│   └── ws.store.js                # WebSocket connection, send/receive
│
├── hooks/
│   ├── useWebSocket.js            # Establish WS, parse messages, reconnect logic
│   ├── useCountdown.js            # Client-side countdown (synced with server time)
│   └── useSession.js              # Poll session state via REST
│
├── components/
│   ├── common/
│   │   ├── Button.jsx
│   │   ├── Input.jsx
│   │   ├── Modal.jsx
│   │   ├── Badge.jsx
│   │   ├── Countdown.jsx          # Animated SVG countdown ring
│   │   ├── QRCode.jsx             # Display QR from URL
│   │   └── Leaderboard.jsx        # Animated rank list
│   │
│   ├── host/
│   │   ├── QuestionCard.jsx       # Card in the question library
│   │   ├── QuestionForm.jsx       # Tabbed builder for all question types
│   │   ├── SessionSetup.jsx       # Multi-step session configuration wizard
│   │   ├── SessionControl.jsx     # Live game control panel (start, next, pause)
│   │   ├── TeamList.jsx           # Lobby — connected teams
│   │   └── AnswerMatrix.jsx       # Post-game answer breakdown table
│   │
│   └── team/
│       ├── JoinForm.jsx           # Team name + player names form
│       ├── LobbyWait.jsx          # Waiting for host to start
│       ├── QuestionView.jsx       # MCQ / T/F / Order / Number input
│       ├── AnswerLocked.jsx       # Submitted, waiting for reveal
│       ├── ResultView.jsx         # Correct/incorrect + points
│       └── FinalScreen.jsx        # Podium + confetti
│
└── pages/
    ├── Login.jsx
    ├── Dashboard.jsx
    ├── Questions.jsx
    ├── Categories.jsx
    ├── Sessions.jsx
    ├── SessionDetail.jsx
    ├── DisplayView.jsx            # Full-screen projector
    ├── JoinPage.jsx               # /join/:code
    └── PlayPage.jsx               # /play/:code (team game)
```

### WebSocket client flow (team side)

```javascript
// useWebSocket.js (simplified)
const ws = new WebSocket(`wss://${host}/ws?session=${code}&role=team`);

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'team.join',
    payload: { team_name, players, color, avatar }
  }));
};

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  // Route to Zustand store actions based on msg.type
  switch (msg.type) {
    case 'joined':            store.setJoined(msg.payload); break;
    case 'question.started':  store.setQuestion(msg.payload); break;
    case 'question.revealed': store.setReveal(msg.payload); break;
    case 'leaderboard.updated': store.setLeaderboard(msg.payload); break;
    case 'game.finished':     store.setFinished(msg.payload); break;
    // ...
  }
};
```

---

## 13. Nginx Configuration

nginx handles:

- TLS termination (443 → backend container :8080)
- Serving the built React SPA for all non-API routes
- Proxying `/api/*` to the Go backend
- Upgrading `/ws` connections to WebSocket

```nginx
# /nginx/conf.d/quizlive.conf

upstream backend {
    server backend:8080;
}

server {
    listen 80;
    server_name your-domain.com;

    # Redirect all HTTP to HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate     /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    # Gzip for SPA assets
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    # SPA: serve index.html for any unknown route (React Router handles it)
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # REST API — proxy to Go backend
    location /api/ {
        proxy_pass         http://backend;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }

    # WebSocket — requires upgrade headers
    location /ws {
        proxy_pass          http://backend;
        proxy_http_version  1.1;
        proxy_set_header    Upgrade $http_upgrade;
        proxy_set_header    Connection "upgrade";
        proxy_set_header    Host $host;
        proxy_read_timeout  3600s;   # keep WS alive for up to 1 hour
        proxy_send_timeout  3600s;
    }

    # Cache static assets aggressively (Vite hashes filenames)
    location ~* \.(js|css|png|jpg|svg|ico|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

> For local development without TLS, remove the SSL block and listen on 80 only, and change `wss://` to `ws://` in the frontend config.

---

## 14. Docker & Docker Compose

### Backend Dockerfile

```dockerfile
# quizlive-backend/Dockerfile
FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o quizlive ./cmd/server

FROM alpine:3.19
RUN apk --no-cache add ca-certificates tzdata
WORKDIR /app
COPY --from=builder /app/quizlive .
COPY --from=builder /app/internal/db/migrations ./migrations
EXPOSE 8080
CMD ["./quizlive"]
```

### Frontend Dockerfile

```dockerfile
# quizlive-frontend/Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
# nginx config is mounted via Docker Compose volume
EXPOSE 80 443
```

### docker-compose.yml

```yaml
version: "3.9"

services:

  postgres:
    image: postgres:16-alpine
    container_name: quizlive_db
    restart: unless-stopped
    environment:
      POSTGRES_DB:       ${POSTGRES_DB}
      POSTGRES_USER:     ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - quizlive_net
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./quizlive-backend
      dockerfile: Dockerfile
    container_name: quizlive_backend
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      DATABASE_URL:    postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}?sslmode=disable
      JWT_SECRET:      ${JWT_SECRET}
      ADMIN_USERNAME:  ${ADMIN_USERNAME}
      ADMIN_PASSWORD:  ${ADMIN_PASSWORD}
      BASE_URL:        ${BASE_URL}
      ENVIRONMENT:     ${ENVIRONMENT}
    networks:
      - quizlive_net

  frontend:
    build:
      context: ./quizlive-frontend
      dockerfile: Dockerfile
    container_name: quizlive_frontend
    restart: unless-stopped
    volumes:
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
      - ./nginx/certs:/etc/letsencrypt:ro          # optional TLS
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - backend
    networks:
      - quizlive_net

volumes:
  postgres_data:

networks:
  quizlive_net:
    driver: bridge
```

> The frontend container (nginx) is the only container with exposed ports. The backend and postgres containers are internal to the Docker network.

### Directory layout for Docker

```
quizlive/
├── docker-compose.yml
├── .env
├── nginx/
│   └── conf.d/
│       └── quizlive.conf
├── quizlive-backend/
│   ├── Dockerfile
│   └── ...
└── quizlive-frontend/
    ├── Dockerfile
    └── ...
```

---

## 15. Environment Configuration

### .env (root level, loaded by Docker Compose)

```bash
# Database
POSTGRES_DB=quizlive
POSTGRES_USER=quizlive_user
POSTGRES_PASSWORD=change_this_strong_password

# Backend
DATABASE_URL=postgres://quizlive_user:change_this_strong_password@postgres:5432/quizlive?sslmode=disable
JWT_SECRET=change_this_to_a_random_64_char_string
ADMIN_USERNAME=admin
ADMIN_PASSWORD=change_this_admin_password
BASE_URL=https://your-domain.com
ENVIRONMENT=production

# Frontend (Vite build args)
VITE_API_BASE_URL=https://your-domain.com/api
VITE_WS_URL=wss://your-domain.com/ws
```

### .env.example (committed to repo)

```bash
POSTGRES_DB=quizlive
POSTGRES_USER=quizlive_user
POSTGRES_PASSWORD=CHANGEME
JWT_SECRET=CHANGEME_64_CHARS
ADMIN_USERNAME=admin
ADMIN_PASSWORD=CHANGEME
BASE_URL=http://localhost
ENVIRONMENT=development
VITE_API_BASE_URL=http://localhost/api
VITE_WS_URL=ws://localhost/ws
```

> Never commit `.env` to source control. Add it to `.gitignore`.

---

## 16. Directory Layout

```
quizlive/
│
├── docker-compose.yml
├── .env                          (gitignored)
├── .env.example
├── README.md
│
├── nginx/
│   └── conf.d/
│       └── quizlive.conf
│
├── quizlive-backend/
│   ├── Dockerfile
│   ├── go.mod
│   ├── go.sum
│   ├── .env.example
│   ├── cmd/
│   │   └── server/
│   │       └── main.go
│   └── internal/
│       ├── config/
│       ├── db/
│       │   └── migrations/
│       ├── middleware/
│       ├── handler/
│       ├── game/
│       ├── store/
│       └── model/
│
└── quizlive-frontend/
    ├── Dockerfile
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── stores/
        ├── hooks/
        ├── components/
        └── pages/
```

---

## 17. Development Phases

### Phase 1 — Foundation (Backend + DB)

- [ ] Initialize Go module, set up chi router
- [ ] Connect to PostgreSQL with pgx; add `pressly/goose/v3` for embedded migrations
- [ ] Write all migration SQL files with `-- +goose Up` / `-- +goose Down` annotations (schema from section 5)
- [ ] Verify each migration's Down path before committing (`goose down`)
- [ ] Implement store layer (category, question, session, team, answer); include session code retry logic (§11.6)
- [ ] Implement REST API for categories and questions (CRUD)
- [ ] Implement host auth (login → JWT)
- [ ] Apply environment-gated static file serving (§11.5)
- [ ] Write Dockerfile for backend
- [ ] Write docker-compose.yml with postgres + backend
- [ ] Test all REST endpoints with a HTTP client (curl / Postman)

### Phase 2 — Real-time Engine

- [ ] Implement WebSocket hub with team identity binding enforced at join time (§11.1)
- [ ] Implement session state machine (session.go, events.go)
- [ ] Implement timer goroutine with pause/resume remaining-time persistence (§11.4)
- [ ] Implement scoring engine (all scoring modes)
- [ ] Implement `open_text` marking flow with pending-mark gate on game advance (§11.3)
- [ ] Implement REST endpoints for session control (start, launch, next, pause, finish)
- [ ] Implement QR code generation endpoint
- [ ] End-to-end test: create session → launch → connect 2 test clients → full question round

### Phase 3 — Host Frontend

- [ ] Initialize React + Vite + Tailwind project
- [ ] Implement login page and auth store
- [ ] Implement category management pages
- [ ] Implement question library and question builder (all types)
- [ ] Implement session setup wizard
- [ ] Implement session control panel (live game view for host)
- [ ] Implement projector display view (full screen)
- [ ] Implement session history and export

### Phase 4 — Team Mobile Frontend

- [ ] Implement `/join/:code` page with team registration form
- [ ] Implement WebSocket connection and game store
- [ ] Implement lobby waiting screen
- [ ] Implement question view for each question type
- [ ] Implement `useCountdown` using absolute deadline derived from `started_at` (§11.2)
- [ ] Implement reveal / result screen
- [ ] Implement live leaderboard on team phones
- [ ] Implement final screen with confetti animation
- [ ] Mobile testing (iOS Safari, Android Chrome)

### Phase 5 — nginx + Docker integration

- [ ] Write nginx configuration
- [ ] Add frontend Dockerfile (build Vite → copy to nginx image)
- [ ] Wire everything in docker-compose.yml
- [ ] Test full stack with `docker compose up`
- [ ] Set up TLS with Certbot (optional, following existing stack pattern)
- [ ] Test QR scan → join → full game on real phones

### Phase 6 — Polish & hardening

- [ ] Reconnect logic: teams that drop can reconnect within the same session
- [ ] Host can see disconnected teams in the panel
- [ ] Rate limiting on the WebSocket join command (prevent spam)
- [ ] Input validation on all REST and WebSocket inputs
- [ ] Graceful shutdown: finish current question, broadcast disconnect notice
- [ ] Idle session cleanup: cancel sessions with no activity for 2 hours
- [ ] Structured logging throughout (slog with request ID)
- [ ] Basic health check endpoint: `GET /api/health`
- [ ] Review and load test WebSocket hub (simulate 20 concurrent teams)
```
