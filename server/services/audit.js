const pool = require('../db/pool');

async function log({
  workspaceId,
  userId,
  action,
  resourceType,
  resourceId,
  ipAddress,
  userAgent,
  metadata = {},
}) {
  await pool.query(
    `INSERT INTO audit_logs
      (workspace_id, user_id, action, resource_type, resource_id, ip_address, user_agent, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      workspaceId || null,
      userId || null,
      action,
      resourceType || null,
      resourceId || null,
      ipAddress || null,
      userAgent || null,
      JSON.stringify(metadata),
    ],
  );
}

module.exports = { log };
