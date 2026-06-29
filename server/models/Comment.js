const pool = require('../db/pool');
const notifications = require('../services/notifications');

async function create({ boardId, elementId, userId, content, parentId, mentionIds = [] }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `INSERT INTO comments (board_id, element_id, user_id, parent_id, content)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [boardId, elementId || null, userId, parentId || null, content],
    );
    const comment = rows[0];

    for (const mentionId of mentionIds) {
      await client.query(
        'INSERT INTO comment_mentions (comment_id, user_id) VALUES ($1, $2)',
        [comment.id, mentionId],
      );
      if (mentionId !== userId) {
        await notifications.create({
          userId: mentionId,
          type: 'mention',
          title: 'You were mentioned in a comment',
          body: content.slice(0, 200),
          payload: { boardId, commentId: comment.id, elementId },
        });
      }
    }

    await client.query('COMMIT');
    return comment;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function findByBoard(boardId) {
  const { rows } = await pool.query(
    `SELECT c.*, u.name AS user_name, u.avatar_color,
            (SELECT json_agg(json_build_object('id', u2.id, 'name', u2.name))
             FROM comment_mentions cm JOIN users u2 ON u2.id = cm.user_id
             WHERE cm.comment_id = c.id) AS mentions
     FROM comments c
     JOIN users u ON u.id = c.user_id
     WHERE c.board_id = $1
     ORDER BY c.created_at`,
    [boardId],
  );
  return rows;
}

async function resolve(id, userId) {
  const { rows } = await pool.query(
    `UPDATE comments SET resolved = NOT resolved, updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id],
  );
  return rows[0] || null;
}

async function addReaction({ boardId, elementId, userId, emoji }) {
  const { rows } = await pool.query(
    `INSERT INTO element_reactions (board_id, element_id, user_id, emoji)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (board_id, element_id, user_id, emoji) DO NOTHING
     RETURNING *`,
    [boardId, elementId, userId, emoji],
  );
  return rows[0] || null;
}

async function getReactions(boardId) {
  const { rows } = await pool.query(
    `SELECT element_id, emoji, COUNT(*)::int AS count,
            json_agg(json_build_object('userId', user_id)) AS users
     FROM element_reactions
     WHERE board_id = $1
     GROUP BY element_id, emoji`,
    [boardId],
  );
  return rows;
}

module.exports = { create, findByBoard, resolve, addReaction, getReactions };
