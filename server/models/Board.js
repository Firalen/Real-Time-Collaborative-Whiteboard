const pool = require('../db/pool');
const { BOARD_TEMPLATES } = require('../constants/roles');

async function findById(id, { includeDeleted = false } = {}) {
  const deletedClause = includeDeleted ? '' : 'AND deleted_at IS NULL';
  const { rows } = await pool.query(
    `SELECT * FROM boards WHERE id = $1 ${deletedClause}`,
    [id],
  );
  return rows[0] || null;
}

async function findByWorkspace(workspaceId, userId, { includeArchived = false } = {}) {
  const archivedClause = includeArchived ? '' : 'AND b.archived_at IS NULL';
  const { rows } = await pool.query(
    `SELECT b.*,
            EXISTS(SELECT 1 FROM user_board_pins p WHERE p.board_id = b.id AND p.user_id = $2) AS pinned
     FROM boards b
     WHERE b.workspace_id = $1 AND b.deleted_at IS NULL ${archivedClause}
     ORDER BY pinned DESC, b.updated_at DESC`,
    [workspaceId, userId],
  );
  return rows;
}

async function findByOwner(ownerId) {
  const { rows } = await pool.query(
    `SELECT * FROM boards
     WHERE owner_id = $1 AND deleted_at IS NULL AND archived_at IS NULL
     ORDER BY updated_at DESC`,
    [ownerId],
  );
  return rows;
}

async function create({
  name,
  ownerId,
  workspaceId,
  folderId,
  template = 'blank',
  emojiIcon,
  coverUrl,
  visibility = 'workspace',
}) {
  const tpl = BOARD_TEMPLATES[template] || BOARD_TEMPLATES.blank;
  const canvasData = tpl.canvas;

  const { rows } = await pool.query(
    `INSERT INTO boards (
       name, owner_id, workspace_id, folder_id, template,
       emoji_icon, cover_url, visibility, canvas_data
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      name,
      ownerId,
      workspaceId,
      folderId || null,
      template,
      emojiIcon || tpl.emoji,
      coverUrl || null,
      visibility,
      JSON.stringify(canvasData),
    ],
  );
  return rows[0];
}

async function duplicate(id, userId) {
  const board = await findById(id);
  if (!board) return null;

  const { rows } = await pool.query(
    `INSERT INTO boards (
       name, owner_id, workspace_id, folder_id, template,
       emoji_icon, cover_url, visibility, canvas_data
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      `${board.name} (copy)`,
      userId,
      board.workspace_id,
      board.folder_id,
      board.template,
      board.emoji_icon,
      board.cover_url,
      board.visibility,
      JSON.stringify(board.canvas_data),
    ],
  );
  return rows[0];
}

async function update(id, fields, ownerId) {
  const { rows } = await pool.query(
    `UPDATE boards SET
       name = COALESCE($1, name),
       emoji_icon = COALESCE($2, emoji_icon),
       cover_url = COALESCE($3, cover_url),
       folder_id = COALESCE($4, folder_id),
       visibility = COALESCE($5, visibility),
       updated_at = NOW()
     WHERE id = $6 AND owner_id = $7 AND deleted_at IS NULL
     RETURNING *`,
    [
      fields.name,
      fields.emojiIcon,
      fields.coverUrl,
      fields.folderId,
      fields.visibility,
      id,
      ownerId,
    ],
  );
  return rows[0] || null;
}

async function updateName(id, name, ownerId) {
  return update(id, { name }, ownerId);
}

async function updateCanvas(id, canvasData) {
  const { rows } = await pool.query(
    `UPDATE boards SET canvas_data = $1, updated_at = NOW()
     WHERE id = $2 AND deleted_at IS NULL
     RETURNING id, canvas_data, updated_at, workspace_id`,
    [JSON.stringify(canvasData), id],
  );
  return rows[0] || null;
}

async function saveVersion(boardId, canvasData, userId, label) {
  const { rows } = await pool.query(
    `INSERT INTO board_versions (board_id, canvas_data, created_by, label)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [boardId, JSON.stringify(canvasData), userId, label || null],
  );
  return rows[0];
}

async function getVersions(boardId, limit = 20) {
  const { rows } = await pool.query(
    `SELECT id, label, created_by, created_at
     FROM board_versions WHERE board_id = $1
     ORDER BY created_at DESC LIMIT $2`,
    [boardId, limit],
  );
  return rows;
}

async function getVersion(versionId) {
  const { rows } = await pool.query(
    'SELECT * FROM board_versions WHERE id = $1',
    [versionId],
  );
  return rows[0] || null;
}

async function archive(id, ownerId) {
  const { rows } = await pool.query(
    `UPDATE boards SET archived_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND owner_id = $2 AND deleted_at IS NULL
     RETURNING *`,
    [id, ownerId],
  );
  return rows[0] || null;
}

async function unarchive(id, ownerId) {
  const { rows } = await pool.query(
    `UPDATE boards SET archived_at = NULL, updated_at = NOW()
     WHERE id = $1 AND owner_id = $2
     RETURNING *`,
    [id, ownerId],
  );
  return rows[0] || null;
}

async function softDelete(id, ownerId) {
  const { rows } = await pool.query(
    `UPDATE boards SET deleted_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND owner_id = $2 AND deleted_at IS NULL
     RETURNING *`,
    [id, ownerId],
  );
  return rows[0] || null;
}

async function restore(id, ownerId) {
  const { rows } = await pool.query(
    `UPDATE boards SET deleted_at = NULL, updated_at = NOW()
     WHERE id = $1 AND owner_id = $2
       AND deleted_at > NOW() - INTERVAL '30 days'
     RETURNING *`,
    [id, ownerId],
  );
  return rows[0] || null;
}

async function remove(id, ownerId) {
  return softDelete(id, ownerId);
}

async function togglePin(userId, boardId) {
  const { rows: pinned } = await pool.query(
    'SELECT 1 FROM user_board_pins WHERE user_id = $1 AND board_id = $2',
    [userId, boardId],
  );
  if (pinned.length > 0) {
    await pool.query(
      'DELETE FROM user_board_pins WHERE user_id = $1 AND board_id = $2',
      [userId, boardId],
    );
    return false;
  }
  await pool.query(
    'INSERT INTO user_board_pins (user_id, board_id) VALUES ($1, $2)',
    [userId, boardId],
  );
  return true;
}

module.exports = {
  findById,
  findByWorkspace,
  findByOwner,
  create,
  duplicate,
  update,
  updateName,
  updateCanvas,
  saveVersion,
  getVersions,
  getVersion,
  archive,
  unarchive,
  softDelete,
  restore,
  remove,
  togglePin,
};
