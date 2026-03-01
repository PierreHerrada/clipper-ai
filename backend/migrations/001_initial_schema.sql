-- 001_initial_schema.sql
-- Creates the migration tracking table and all core Corsair tables on PostgreSQL.

-- Migration version tracking (must be first)
CREATE TABLE IF NOT EXISTS schema_migrations (
    version     VARCHAR(255)    NOT NULL PRIMARY KEY,
    applied_at  TIMESTAMPTZ     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Core application tables

CREATE TABLE IF NOT EXISTS tasks (
    id          UUID            NOT NULL PRIMARY KEY,
    title       TEXT            NOT NULL,
    description TEXT            NOT NULL DEFAULT '',
    acceptance  TEXT            NOT NULL DEFAULT '',
    status      VARCHAR(20)     NOT NULL DEFAULT 'backlog',
    jira_key    TEXT,
    jira_url    TEXT,
    slack_channel    TEXT       NOT NULL,
    slack_thread_ts  TEXT       NOT NULL,
    slack_user_id    TEXT       NOT NULL,
    pr_url      TEXT,
    pr_number   INT,
    repo        TEXT,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMPTZ     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS agent_runs (
    id          UUID            NOT NULL PRIMARY KEY,
    task_id     UUID            NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
    stage       VARCHAR(10)     NOT NULL,
    status      VARCHAR(10)     NOT NULL DEFAULT 'running',
    tokens_in   INT             NOT NULL DEFAULT 0,
    tokens_out  INT             NOT NULL DEFAULT 0,
    cost_usd    DECIMAL(10, 6)  NOT NULL DEFAULT 0,
    started_at  TIMESTAMPTZ     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS agent_logs (
    id          UUID            NOT NULL PRIMARY KEY,
    run_id      UUID            NOT NULL REFERENCES agent_runs (id) ON DELETE CASCADE,
    type        VARCHAR(15)     NOT NULL,
    content     JSONB           NOT NULL,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS conversations (
    id          UUID            NOT NULL PRIMARY KEY,
    task_id     UUID            NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
    role        VARCHAR(10)     NOT NULL,
    message     TEXT            NOT NULL,
    slack_ts    TEXT,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_tasks_status     ON tasks (status);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_runs_task_id     ON agent_runs (task_id);
CREATE INDEX IF NOT EXISTS idx_runs_started_at  ON agent_runs (started_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_run_id      ON agent_logs (run_id);
CREATE INDEX IF NOT EXISTS idx_logs_created_at  ON agent_logs (created_at);
CREATE INDEX IF NOT EXISTS idx_convs_task_id    ON conversations (task_id);
