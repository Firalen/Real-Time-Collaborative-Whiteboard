const pool = require('../db/pool');

async function create(workspaceId, name, createdBy, parentId = null) {
  const { rows } = await pool.query(
    `INSERT INTO board_folders (workspace_id, name, parent_id, created_by)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [workspaceId, name, parentId, createdBy],
  );
  return rows[0];
}

async function findByWorkspace(workspaceId) {
  const { rows } = await pool.query(
    'SELECT * FROM board_folders WHERE workspace_id = $1 ORDER BY name',
    [workspaceId],
  );
  return rows;
}

async function update(id, name) {
  const { rows } = await pool.query(
    'UPDATE board_folders SET name = $1 WHERE id = $2 RETURNING *',
    [name, id],
  );
  return rows[0] || null;
}

async function remove(id) {
  const { rowCount } = await pool.query(
    'DELETE FROM board_folders WHERE id = $1',
    [id],
  );
  return rowCount > 0;
}

module.exports = { create, findByWorkspace, update, remove };
