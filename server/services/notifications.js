const pool = require('../db/pool');
const { sendEmail } = require('./email');

async function create({ userId, type, title, body, payload = {} }) {
  const { rows } = await pool.query(
    `INSERT INTO notifications (user_id, type, title, body, payload)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [userId, type, title, body, JSON.stringify(payload)],
  );
  const notification = rows[0];

  // Email for high-priority types if user prefs allow
  if (['mention', 'task_assigned', 'invite'].includes(type)) {
    const { rows: prefRows } = await pool.query(
      'SELECT * FROM user_notification_prefs WHERE user_id = $1',
      [userId],
    );
    const prefs = prefRows[0];
    const shouldEmail =
      (!prefs && true) ||
      (type === 'mention' && prefs?.email_mentions) ||
      (type === 'task_assigned' && prefs?.email_tasks) ||
      (type === 'invite');

    if (shouldEmail) {
      const { rows: userRows } = await pool.query(
        'SELECT email, name FROM users WHERE id = $1',
        [userId],
      );
      const user = userRows[0];
      if (user) {
        await sendEmail({
          to: user.email,
          subject: title,
          text: body || title,
        });
      }
    }
  }

  return notification;
}

async function getForUser(userId, { unreadOnly = false, limit = 30 } = {}) {
  const query = unreadOnly
    ? `SELECT * FROM notifications WHERE user_id = $1 AND read_at IS NULL ORDER BY created_at DESC LIMIT $2`
    : `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`;
  const { rows } = await pool.query(query, [userId, limit]);
  return rows;
}

async function markRead(userId, notificationId) {
  const { rows } = await pool.query(
    `UPDATE notifications SET read_at = NOW()
     WHERE id = $1 AND user_id = $2
     RETURNING *`,
    [notificationId, userId],
  );
  return rows[0] || null;
}

async function markAllRead(userId) {
  await pool.query(
    'UPDATE notifications SET read_at = NOW() WHERE user_id = $1 AND read_at IS NULL',
    [userId],
  );
}

async function getUnreadCount(userId) {
  const { rows } = await pool.query(
    'SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 AND read_at IS NULL',
    [userId],
  );
  return rows[0].count;
}

module.exports = { create, getForUser, markRead, markAllRead, getUnreadCount };
