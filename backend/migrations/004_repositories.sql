-- Migration: 004_repositories
-- Creates the repositories table for managing enabled GitHub repos

CREATE TABLE IF NOT EXISTS repositories (
    id UUID PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    private BOOLEAN NOT NULL DEFAULT FALSE,
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    default_branch VARCHAR(100) NOT NULL DEFAULT 'main',
    github_url TEXT NOT NULL DEFAULT '',
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_repositories_enabled ON repositories (enabled);
CREATE INDEX IF NOT EXISTS idx_repositories_full_name ON repositories (full_name);
