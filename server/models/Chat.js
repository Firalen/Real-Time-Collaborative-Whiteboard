const pool = require('../db/pool');

async function create({ boardId, userId, content }) {
  const { rows } = await pool.query(
    `INSERT INTO chat_messages (board_id, user_id, content)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [boardId, userId, content],
  );
  return rows[0];
}

async function findByBoard(boardId, limit = 100) {
  const { rows } = await pool.query(
    `SELECT m.*, u.name AS user_name, u.avatar_color
     FROM chat_messages m
     JOIN users u ON u.id = m.user_id
     WHERE m.board_id = $1
     ORDER BY m.created_at DESC
     LIMIT $2`,
    [boardId, limit],
  );
  return rows.reverse();
}

module.exports = { create, findByBoard };
