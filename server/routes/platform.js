const express = require('express');
const pool = require('../db/pool');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.get('/active', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM announcements
       WHERE active = true AND starts_at <= NOW()
         AND (ends_at IS NULL OR ends_at > NOW())
       ORDER BY created_at DESC LIMIT 1`,
    );
    res.json(rows[0] || null);
  } catch {
    res.status(500).json({ error: 'Failed to fetch announcement' });
  }
});

router.post('/tickets', async (req, res) => {
  try {
    const { subject, body, workspaceId } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO support_tickets (user_id, workspace_id, subject, body)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.user.id, workspaceId, subject, body],
    );
    res.status(201).json(rows[0]);
  } catch {
    res.status(500).json({ error: 'Failed to create ticket' });
  }
});

module.exports = router;
