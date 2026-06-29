const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const pool = require('../db/pool');

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads');
const PUBLIC_URL = process.env.UPLOAD_PUBLIC_URL || '';

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

function buildUrl(storageKey) {
  if (PUBLIC_URL) return `${PUBLIC_URL.replace(/\/$/, '')}/${storageKey}`;
  return `/uploads/${storageKey}`;
}

async function saveFile({ workspaceId, uploadedBy, buffer, originalName, mimeType }) {
  const ext = path.extname(originalName) || '';
  const storageKey = `${workspaceId}/${crypto.randomUUID()}${ext}`;
  const fullPath = path.join(UPLOAD_DIR, storageKey);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, buffer);

  const url = buildUrl(storageKey);
  const { rows } = await pool.query(
    `INSERT INTO assets (workspace_id, uploaded_by, name, mime_type, size_bytes, storage_key, url)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [workspaceId, uploadedBy, originalName, mimeType, buffer.length, storageKey, url],
  );
  return rows[0];
}

async function findByWorkspace(workspaceId, limit = 50) {
  const { rows } = await pool.query(
    `SELECT * FROM assets WHERE workspace_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [workspaceId, limit],
  );
  return rows;
}

module.exports = { saveFile, findByWorkspace, UPLOAD_DIR };
