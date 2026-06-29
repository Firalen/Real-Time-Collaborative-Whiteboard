const pool = require('../db/pool');

const AVATAR_COLORS = [
  '#6366f1', '#ec4899', '#f59e0b', '#10b981',
  '#3b82f6', '#8b5cf6', '#ef4444', '#14b8a6',
];

function randomAvatarColor() {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

async function findByEmail(email) {
  const { rows } = await pool.query(
    'SELECT * FROM users WHERE email = $1',
    [email.toLowerCase()]
  );
  return rows[0] || null;
}

async function findById(id) {
  const { rows } = await pool.query(
    'SELECT id, email, name, avatar_color, created_at FROM users WHERE id = $1',
    [id]
  );
  return rows[0] || null;
}

async function create({ email, passwordHash, name }) {
  const avatarColor = randomAvatarColor();
  const { rows } = await pool.query(
    `INSERT INTO users (email, password_hash, name, avatar_color)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, name, avatar_color, created_at`,
    [email.toLowerCase(), passwordHash, name, avatarColor]
  );
  return rows[0];
}

module.exports = { findByEmail, findById, create };
