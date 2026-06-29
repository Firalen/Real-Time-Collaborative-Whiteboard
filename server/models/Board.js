const pool = require('../db/pool');

async function findById(id) {
  const { rows } = await pool.query(
    'SELECT * FROM boards WHERE id = $1',
    [id]
  );
  return rows[0] || null;
}

async function findByOwner(ownerId) {
  const { rows } = await pool.query(
    'SELECT id, name, owner_id, created_at, updated_at FROM boards WHERE owner_id = $1 ORDER BY updated_at DESC',
    [ownerId]
  );
  return rows;
}

async function create({ name, ownerId }) {
  const { rows } = await pool.query(
    `INSERT INTO boards (name, owner_id)
     VALUES ($1, $2)
     RETURNING id, name, owner_id, canvas_data, created_at, updated_at`,
    [name, ownerId]
  );
  return rows[0];
}

async function updateName(id, name, ownerId) {
  const { rows } = await pool.query(
    `UPDATE boards SET name = $1, updated_at = NOW()
     WHERE id = $2 AND owner_id = $3
     RETURNING id, name, owner_id, created_at, updated_at`,
    [name, id, ownerId]
  );
  return rows[0] || null;
}

async function updateCanvas(id, canvasData) {
  const { rows } = await pool.query(
    `UPDATE boards SET canvas_data = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING id, canvas_data, updated_at`,
    [JSON.stringify(canvasData), id]
  );
  return rows[0] || null;
}

async function remove(id, ownerId) {
  const { rowCount } = await pool.query(
    'DELETE FROM boards WHERE id = $1 AND owner_id = $2',
    [id, ownerId]
  );
  return rowCount > 0;
}

module.exports = {
  findById,
  findByOwner,
  create,
  updateName,
  updateCanvas,
  remove,
};
