-- +goose Up

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────
-- CATEGORIES
-- ─────────────────────────────────────────
CREATE TABLE categories (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name       TEXT        NOT NULL,
    icon       TEXT,
    color      TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
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
    id                 UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id        UUID             REFERENCES categories(id) ON DELETE SET NULL,
    type               question_type    NOT NULL,
    title              TEXT             NOT NULL,
    media_url          TEXT,
    explanation        TEXT,
    difficulty         difficulty_level NOT NULL DEFAULT 'medium',
    time_limit_seconds INTEGER,
    points_value       INTEGER,
    correct_answer     JSONB            NOT NULL,
    created_at         TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    deleted_at         TIMESTAMPTZ
);

CREATE INDEX idx_questions_category ON questions(category_id);
CREATE INDEX idx_questions_type     ON questions(type);
CREATE INDEX idx_questions_deleted  ON questions(deleted_at);


-- ─────────────────────────────────────────
-- QUESTION OPTIONS
-- ─────────────────────────────────────────
CREATE TABLE question_options (
    id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID    NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    label       TEXT    NOT NULL,
    sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_question_options_question ON question_options(question_id);


-- ─────────────────────────────────────────
-- GAME SESSIONS
-- ─────────────────────────────────────────
CREATE TYPE session_status AS ENUM (
    'draft',
    'lobby',
    'active',
    'paused',
    'finished',
    'cancelled'
);

CREATE TYPE scoring_mode AS ENUM (
    'standard',
    'speed_bonus',
    'streak',
    'elimination',
    'custom'
);

CREATE TABLE game_sessions (
    id                     UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    name                   TEXT           NOT NULL,
    session_code           CHAR(6)        NOT NULL UNIQUE,
    status                 session_status NOT NULL DEFAULT 'draft',
    scoring_mode           scoring_mode   NOT NULL DEFAULT 'standard',
    scoring_config         JSONB          NOT NULL DEFAULT '{}',
    current_question_index INTEGER        NOT NULL DEFAULT 0,
    started_at             TIMESTAMPTZ,
    finished_at            TIMESTAMPTZ,
    created_at             TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_code   ON game_sessions(session_code);
CREATE INDEX idx_sessions_status ON game_sessions(status);


-- ─────────────────────────────────────────
-- SESSION QUESTIONS
-- ─────────────────────────────────────────
CREATE TABLE session_questions (
    id                 UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id         UUID    NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
    question_id        UUID    NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
    sort_order         INTEGER NOT NULL,
    time_limit_override INTEGER,
    points_override    INTEGER
);

CREATE UNIQUE INDEX idx_session_questions_order ON session_questions(session_id, sort_order);


-- ─────────────────────────────────────────
-- TEAMS
-- ─────────────────────────────────────────
CREATE TABLE teams (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id    UUID        NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
    name          TEXT        NOT NULL,
    color         TEXT        NOT NULL DEFAULT '#7F77DD',
    avatar_emoji  TEXT        NOT NULL DEFAULT '🎯',
    score         INTEGER     NOT NULL DEFAULT 0,
    rank          INTEGER,
    is_eliminated BOOLEAN     NOT NULL DEFAULT FALSE,
    joined_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_teams_session_name ON teams(session_id, name);
CREATE INDEX        idx_teams_session      ON teams(session_id);


-- ─────────────────────────────────────────
-- TEAM PLAYERS
-- ─────────────────────────────────────────
CREATE TABLE team_players (
    id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id   UUID        NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    name      TEXT        NOT NULL,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_team_players_team ON team_players(team_id);


-- ─────────────────────────────────────────
-- ANSWERS
-- ─────────────────────────────────────────
CREATE TYPE answer_result AS ENUM (
    'correct',
    'incorrect',
    'partial',
    'pending',
    'no_answer'
);

CREATE TABLE answers (
    id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id             UUID          NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    session_question_id UUID          NOT NULL REFERENCES session_questions(id) ON DELETE CASCADE,
    submitted_answer    JSONB,
    result              answer_result NOT NULL DEFAULT 'pending',
    points_awarded      INTEGER       NOT NULL DEFAULT 0,
    time_taken_ms       INTEGER,
    submitted_at        TIMESTAMPTZ,
    marked_at           TIMESTAMPTZ
);

CREATE UNIQUE INDEX idx_answers_team_question   ON answers(team_id, session_question_id);
CREATE INDEX        idx_answers_session_question ON answers(session_question_id);


-- ─────────────────────────────────────────
-- SCORE EVENTS
-- ─────────────────────────────────────────
CREATE TABLE score_events (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id        UUID        NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    session_id     UUID        NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
    delta          INTEGER     NOT NULL,
    reason         TEXT        NOT NULL,
    question_index INTEGER,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_score_events_team    ON score_events(team_id);
CREATE INDEX idx_score_events_session ON score_events(session_id);


-- +goose Down

DROP TABLE IF EXISTS score_events;
DROP TABLE IF EXISTS answers;
DROP TABLE IF EXISTS team_players;
DROP TABLE IF EXISTS teams;
DROP TABLE IF EXISTS session_questions;
DROP TABLE IF EXISTS game_sessions;
DROP TABLE IF EXISTS question_options;
DROP TABLE IF EXISTS questions;
DROP TABLE IF EXISTS categories;
DROP TYPE  IF EXISTS answer_result;
DROP TYPE  IF EXISTS scoring_mode;
DROP TYPE  IF EXISTS session_status;
DROP TYPE  IF EXISTS difficulty_level;
DROP TYPE  IF EXISTS question_type;
DROP EXTENSION IF EXISTS "pgcrypto";
