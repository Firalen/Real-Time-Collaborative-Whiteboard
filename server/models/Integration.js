const pool = require('../db/pool');

async function get(workspaceId, type) {
  const { rows } = await pool.query(
    'SELECT * FROM integrations WHERE workspace_id = $1 AND type = $2',
    [workspaceId, type],
  );
  return rows[0] || null;
}

async function upsert(workspaceId, type, config) {
  const { rows } = await pool.query(
    `INSERT INTO integrations (workspace_id, type, config, enabled)
     VALUES ($1, $2, $3, true)
     ON CONFLICT (workspace_id, type)
     DO UPDATE SET config = EXCLUDED.config, enabled = true
     RETURNING *`,
    [workspaceId, type, JSON.stringify(config)],
  );
  return rows[0];
}

async function list(workspaceId) {
  const { rows } = await pool.query(
    'SELECT id, type, enabled, created_at FROM integrations WHERE workspace_id = $1',
    [workspaceId],
  );
  return rows;
}

module.exports = { get, upsert, list };
