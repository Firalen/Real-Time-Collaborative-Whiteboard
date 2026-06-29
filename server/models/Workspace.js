const pool = require('../db/pool');
const { ROLES } = require('../constants/roles');

function slugify(name) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
  return base || 'workspace';
}

async function findById(id) {
  const { rows } = await pool.query('SELECT * FROM workspaces WHERE id = $1', [id]);
  return rows[0] || null;
}

async function findBySlug(slug) {
  const { rows } = await pool.query('SELECT * FROM workspaces WHERE slug = $1', [slug]);
  return rows[0] || null;
}

async function findByUser(userId) {
  const { rows } = await pool.query(
    `SELECT w.*, wm.role AS member_role
     FROM workspaces w
     JOIN workspace_members wm ON wm.workspace_id = w.id
     WHERE wm.user_id = $1
     ORDER BY w.name`,
    [userId],
  );
  return rows;
}

async function create({ name, ownerId, timezone = 'UTC' }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let slug = slugify(name);
    const { rows: existing } = await client.query(
      'SELECT 1 FROM workspaces WHERE slug = $1',
      [slug],
    );
    if (existing.length > 0) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    const { rows } = await client.query(
      `INSERT INTO workspaces (name, slug, owner_id, timezone)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, slug, ownerId, timezone],
    );
    const workspace = rows[0];

    await client.query(
      `INSERT INTO workspace_members (workspace_id, user_id, role)
       VALUES ($1, $2, $3)`,
      [workspace.id, ownerId, ROLES.OWNER],
    );

    await client.query('COMMIT');
    return workspace;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function update(id, { name, logoUrl, timezone }) {
  const { rows } = await pool.query(
    `UPDATE workspaces SET
       name = COALESCE($1, name),
       logo_url = COALESCE($2, logo_url),
       timezone = COALESCE($3, timezone),
       updated_at = NOW()
     WHERE id = $4
     RETURNING *`,
    [name, logoUrl, timezone, id],
  );
  return rows[0] || null;
}

async function getMemberRole(workspaceId, userId) {
  const { rows } = await pool.query(
    'SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
    [workspaceId, userId],
  );
  return rows[0]?.role || null;
}

async function getMembers(workspaceId) {
  const { rows } = await pool.query(
    `SELECT wm.role, wm.joined_at, u.id, u.name, u.email, u.avatar_color
     FROM workspace_members wm
     JOIN users u ON u.id = wm.user_id
     WHERE wm.workspace_id = $1
     ORDER BY wm.role DESC, u.name`,
    [workspaceId],
  );
  return rows;
}

async function updateMemberRole(workspaceId, memberId, role) {
  const { rows } = await pool.query(
    `UPDATE workspace_members SET role = $1
     WHERE workspace_id = $2 AND user_id = $3 AND role != 'owner'
     RETURNING *`,
    [role, workspaceId, memberId],
  );
  return rows[0] || null;
}

async function removeMember(workspaceId, memberId) {
  const { rowCount } = await pool.query(
    `DELETE FROM workspace_members
     WHERE workspace_id = $1 AND user_id = $2 AND role != 'owner'`,
    [workspaceId, memberId],
  );
  return rowCount > 0;
}

module.exports = {
  findById,
  findBySlug,
  findByUser,
  create,
  update,
  getMemberRole,
  getMembers,
  updateMemberRole,
  removeMember,
};
