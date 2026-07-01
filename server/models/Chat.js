const pool = require('../db/pool');

async function create({ boardId, userId, content, parentId }) {
  const { rows } = await pool.query(
    `INSERT INTO chat_messages (board_id, user_id, content, parent_id)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [boardId, userId, content, parentId || null],
  );
  return rows[0];
}

async function findByBoard(boardId, limit = 200) {
  const { rows } = await pool.query(
    `SELECT m.*, u.name AS user_name, u.avatar_color
     FROM chat_messages m
     JOIN users u ON u.id = m.user_id
     WHERE m.board_id = $1
     ORDER BY m.created_at ASC
     LIMIT $2`,
    [boardId, limit],
  );
  return rows;
}

async function findById(messageId) {
  const { rows } = await pool.query(
    `SELECT m.*, u.name AS user_name, u.avatar_color
     FROM chat_messages m
     JOIN users u ON u.id = m.user_id
     WHERE m.id = $1`,
    [messageId],
  );
  return rows[0] || null;
}

async function toggleReaction(messageId, userId, emoji) {
  const { rows } = await pool.query(
    `SELECT reactions FROM chat_messages WHERE id = $1`,
    [messageId],
  );
  if (!rows[0]) return null;

  const reactions = rows[0].reactions || {};
  const users = new Set(reactions[emoji] || []);
  if (users.has(userId)) {
    users.delete(userId);
  } else {
    users.add(userId);
  }

  if (users.size === 0) {
    delete reactions[emoji];
  } else {
    reactions[emoji] = [...users];
  }

  const { rows: updated } = await pool.query(
    `UPDATE chat_messages SET reactions = $2 WHERE id = $1 RETURNING *`,
    [messageId, JSON.stringify(reactions)],
  );
  return updated[0];
}

module.exports = { create, findByBoard, findById, toggleReaction };
