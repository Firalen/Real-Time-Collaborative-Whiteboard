const pool = require('../db/pool');

async function log({ workspaceId, boardId, userId, action, metadata = {} }) {
  const { rows } = await pool.query(
    `INSERT INTO activity_log (workspace_id, board_id, user_id, action, metadata)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [workspaceId, boardId, userId, action, JSON.stringify(metadata)],
  );
  return rows[0];
}

async function getByWorkspace(workspaceId, limit = 50) {
  const { rows } = await pool.query(
    `SELECT a.*, u.name AS user_name, u.avatar_color
     FROM activity_log a
     LEFT JOIN users u ON u.id = a.user_id
     WHERE a.workspace_id = $1
     ORDER BY a.created_at DESC
     LIMIT $2`,
    [workspaceId, limit],
  );
  return rows;
}

async function getByBoard(boardId, limit = 50) {
  const { rows } = await pool.query(
    `SELECT a.*, u.name AS user_name, u.avatar_color
     FROM activity_log a
     LEFT JOIN users u ON u.id = a.user_id
     WHERE a.board_id = $1
     ORDER BY a.created_at DESC
     LIMIT $2`,
    [boardId, limit],
  );
  return rows;
}

module.exports = { log, getByWorkspace, getByBoard };
