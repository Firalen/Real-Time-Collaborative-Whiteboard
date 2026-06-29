/**
 * SaaS schema v2 — workspaces, collaboration, tasks, notifications, analytics.
 * All statements are idempotent (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).
 */
module.exports = `
  -- ─── Workspaces ───────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    logo_url TEXT,
    timezone VARCHAR(64) DEFAULT 'UTC',
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS workspace_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'editor'
      CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (workspace_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS workspace_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'editor'
      CHECK (role IN ('admin', 'editor', 'viewer')),
    token VARCHAR(64) UNIQUE NOT NULL,
    invited_by UUID NOT NULL REFERENCES users(id),
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- ─── Board organization ───────────────────────────────────────
  CREATE TABLE IF NOT EXISTS board_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    parent_id UUID REFERENCES board_folders(id) ON DELETE SET NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  ALTER TABLE boards ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
  ALTER TABLE boards ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES board_folders(id) ON DELETE SET NULL;
  ALTER TABLE boards ADD COLUMN IF NOT EXISTS template VARCHAR(50);
  ALTER TABLE boards ADD COLUMN IF NOT EXISTS emoji_icon VARCHAR(10) DEFAULT '📋';
  ALTER TABLE boards ADD COLUMN IF NOT EXISTS cover_url TEXT;
  ALTER TABLE boards ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) DEFAULT 'workspace'
    CHECK (visibility IN ('private', 'workspace', 'public'));
  ALTER TABLE boards ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
  ALTER TABLE boards ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
  ALTER TABLE boards ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
  ALTER TABLE boards ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';
  ALTER TABLE boards ADD COLUMN IF NOT EXISTS allow_guest_view BOOLEAN DEFAULT true;
  ALTER TABLE boards ADD COLUMN IF NOT EXISTS allow_export BOOLEAN DEFAULT true;

  CREATE TABLE IF NOT EXISTS user_board_pins (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    pinned_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, board_id)
  );

  CREATE TABLE IF NOT EXISTS board_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    canvas_data JSONB NOT NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    label VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- ─── In-board communication ───────────────────────────────────
  CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    element_id VARCHAR(255),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS comment_mentions (
    comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (comment_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS element_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    element_id VARCHAR(255) NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    emoji VARCHAR(10) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (board_id, element_id, user_id, emoji)
  );

  CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS voice_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    element_id VARCHAR(255) NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    audio_url TEXT NOT NULL,
    duration_seconds INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- ─── Tasks ────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    element_id VARCHAR(255),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    created_by UUID NOT NULL REFERENCES users(id),
    due_date TIMESTAMPTZ,
    priority VARCHAR(20) DEFAULT 'medium'
      CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status VARCHAR(20) DEFAULT 'todo'
      CHECK (status IN ('todo', 'in_progress', 'done')),
    checklist JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- ─── Notifications & activity ─────────────────────────────────
  CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL
      CHECK (type IN ('mention', 'comment', 'task_assigned', 'invite', 'board_activity', 'system')),
    title VARCHAR(255) NOT NULL,
    body TEXT,
    payload JSONB DEFAULT '{}',
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS board_watchers (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, board_id)
  );

  CREATE TABLE IF NOT EXISTS user_notification_prefs (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    email_mentions BOOLEAN DEFAULT true,
    email_tasks BOOLEAN DEFAULT true,
    email_board_activity BOOLEAN DEFAULT false,
    in_app_enabled BOOLEAN DEFAULT true
  );

  -- ─── Integrations & analytics ─────────────────────────────────
  CREATE TABLE IF NOT EXISTS integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    config JSONB DEFAULT '{}',
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (workspace_id, type)
  );

  CREATE TABLE IF NOT EXISTS webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    events TEXT[] NOT NULL,
    secret VARCHAR(64),
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS board_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    event_count INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS session_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES board_sessions(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    payload JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- ─── Indexes ──────────────────────────────────────────────────
  CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members(user_id);
  CREATE INDEX IF NOT EXISTS idx_workspace_members_ws ON workspace_members(workspace_id);
  CREATE INDEX IF NOT EXISTS idx_boards_workspace ON boards(workspace_id);
  CREATE INDEX IF NOT EXISTS idx_boards_folder ON boards(folder_id);
  CREATE INDEX IF NOT EXISTS idx_boards_deleted ON boards(deleted_at) WHERE deleted_at IS NOT NULL;
  CREATE INDEX IF NOT EXISTS idx_comments_board ON comments(board_id);
  CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to);
  CREATE INDEX IF NOT EXISTS idx_tasks_board ON tasks(board_id);
  CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read_at);
  CREATE INDEX IF NOT EXISTS idx_activity_workspace ON activity_log(workspace_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_activity_board ON activity_log(board_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_board_versions_board ON board_versions(board_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_chat_board ON chat_messages(board_id, created_at DESC);
`;
