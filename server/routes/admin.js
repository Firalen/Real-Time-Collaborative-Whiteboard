const express = require('express');
const pool = require('../db/pool');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

async function requireSuperAdmin(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT 1 FROM super_admins WHERE user_id = $1`,
      [req.user.id],
    );
    if (!rows.length) return res.status(403).json({ error: 'Super admin required' });
    next();
  } catch {
    res.status(500).json({ error: 'Auth check failed' });
  }
}

router.get('/check', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT 1 FROM super_admins WHERE user_id = $1`,
      [req.user.id],
    );
    res.json({ isAdmin: rows.length > 0 });
  } catch {
    res.status(500).json({ error: 'Check failed' });
  }
});

router.use(requireSuperAdmin);

router.get('/metrics', async (_req, res) => {
  try {
    const [users, workspaces, boards, sessions] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS c FROM users WHERE deleted_at IS NULL`),
      pool.query(`SELECT COUNT(*)::int AS c FROM workspaces`),
      pool.query(`SELECT COUNT(*)::int AS c FROM boards WHERE deleted_at IS NULL`),
      pool.query(
        `SELECT COUNT(DISTINCT user_id)::int AS dau FROM board_sessions
         WHERE started_at > NOW() - INTERVAL '1 day'`,
      ),
    ]);
    res.json({
      totalUsers: users.rows[0].c,
      totalWorkspaces: workspaces.rows[0].c,
      totalBoards: boards.rows[0].c,
      dau: sessions.rows[0].dau,
    });
  } catch {
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

router.get('/workspaces', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT w.*, p.slug AS plan_slug,
        (SELECT COUNT(*)::int FROM workspace_members m WHERE m.workspace_id = w.id) AS member_count
       FROM workspaces w
       LEFT JOIN subscriptions s ON s.workspace_id = w.id
       LEFT JOIN subscription_plans p ON p.id = s.plan_id
       ORDER BY w.created_at DESC LIMIT 100`,
    );
    res.json(rows);
  } catch {
    res.status(500).json({ error: 'Failed to list workspaces' });
  }
});

router.get('/announcements', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM announcements ORDER BY created_at DESC LIMIT 20`,
    );
    res.json(rows);
  } catch {
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

router.post('/announcements', async (req, res) => {
  try {
    const { title, body, type } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO announcements (title, body, type) VALUES ($1, $2, $3) RETURNING *`,
      [title, body, type || 'info'],
    );
    res.status(201).json(rows[0]);
  } catch {
    res.status(500).json({ error: 'Failed to create announcement' });
  }
});

router.get('/feature-flags', async (_req, res) => {
  try {
    const { rows } = await pool.query(`SELECT * FROM feature_flags ORDER BY key`);
    res.json(rows);
  } catch {
    res.status(500).json({ error: 'Failed to fetch feature flags' });
  }
});

router.patch('/feature-flags/:key', async (req, res) => {
  try {
    const { enabledGlobally } = req.body;
    const { rows } = await pool.query(
      `UPDATE feature_flags SET enabled_globally = $2 WHERE key = $1 RETURNING *`,
      [req.params.key, enabledGlobally],
    );
    res.json(rows[0]);
  } catch {
    res.status(500).json({ error: 'Failed to update flag' });
  }
});

router.get('/tickets', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT t.*, u.name AS user_name FROM support_tickets t
       JOIN users u ON u.id = t.user_id ORDER BY t.created_at DESC LIMIT 50`,
    );
    res.json(rows);
  } catch {
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

module.exports = router;
