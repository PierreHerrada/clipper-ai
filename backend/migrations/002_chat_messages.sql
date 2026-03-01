-- Migration: 002_chat_messages
-- Creates the chat_messages table for persisting Slack messages

CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY,
    channel_id TEXT NOT NULL,
    channel_name TEXT NOT NULL DEFAULT '',
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL DEFAULT '',
    message TEXT NOT NULL,
    slack_ts TEXT NOT NULL,
    thread_ts TEXT,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX idx_chat_messages_channel_id ON chat_messages(channel_id);
CREATE INDEX idx_chat_messages_slack_ts ON chat_messages(slack_ts);
CREATE INDEX idx_chat_messages_task_id ON chat_messages(task_id);
