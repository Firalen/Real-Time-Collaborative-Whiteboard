const crypto = require('crypto');
const pool = require('../db/pool');

async function create({ workspaceId, email, role, invitedBy, expiresInDays = 7 }) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

  const { rows } = await pool.query(
    `INSERT INTO workspace_invitations (workspace_id, email, role, token, invited_by, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [workspaceId, email.toLowerCase(), role, token, invitedBy, expiresAt],
  );
  return rows[0];
}

async function findByToken(token) {
  const { rows } = await pool.query(
    `SELECT i.*, w.name AS workspace_name
     FROM workspace_invitations i
     JOIN workspaces w ON w.id = i.workspace_id
     WHERE i.token = $1 AND i.accepted_at IS NULL AND i.expires_at > NOW()`,
    [token],
  );
  return rows[0] || null;
}

async function accept(token, userId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: invRows } = await client.query(
      `SELECT * FROM workspace_invitations
       WHERE token = $1 AND accepted_at IS NULL AND expires_at > NOW()
       FOR UPDATE`,
      [token],
    );
    const invitation = invRows[0];
    if (!invitation) {
      await client.query('ROLLBACK');
      return null;
    }

    await client.query(
      `INSERT INTO workspace_members (workspace_id, user_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
      [invitation.workspace_id, userId, invitation.role],
    );

    await client.query(
      'UPDATE workspace_invitations SET accepted_at = NOW() WHERE id = $1',
      [invitation.id],
    );

    await client.query('COMMIT');
    return invitation;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function listPending(workspaceId) {
  const { rows } = await pool.query(
    `SELECT id, email, role, expires_at, created_at
     FROM workspace_invitations
     WHERE workspace_id = $1 AND accepted_at IS NULL AND expires_at > NOW()
     ORDER BY created_at DESC`,
    [workspaceId],
  );
  return rows;
}

module.exports = { create, findByToken, accept, listPending };
