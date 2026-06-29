const express = require('express');
const pool = require('../db/pool');
const { authMiddleware, optionalAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', optionalAuth, async (req, res) => {
  try {
    const { category, featured } = req.query;
    let query = `
      SELECT b.id, b.name, b.emoji_icon, b.cover_url, b.like_count, g.description, g.category, g.featured,
             u.name AS author_name, g.published_at
      FROM public_board_gallery g
      JOIN boards b ON b.id = g.board_id
      JOIN users u ON u.id = g.published_by
      WHERE b.visibility = 'public'`;
    const params = [];
    if (category) {
      params.push(category);
      query += ` AND g.category = $${params.length}`;
    }
    if (featured === 'true') query += ` AND g.featured = true`;
    query += ` ORDER BY g.published_at DESC LIMIT 50`;

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch {
    res.status(500).json({ error: 'Failed to fetch gallery' });
  }
});

router.post('/:boardId/publish', authMiddleware, async (req, res) => {
  try {
    const { description, category } = req.body;
    await pool.query(
      `INSERT INTO public_board_gallery (board_id, published_by, description, category)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (board_id) DO UPDATE SET description = $3, category = $4`,
      [req.params.boardId, req.user.id, description, category],
    );
    await pool.query(`UPDATE boards SET visibility = 'public' WHERE id = $1`, [req.params.boardId]);
    res.json({ published: true });
  } catch {
    res.status(500).json({ error: 'Failed to publish board' });
  }
});

router.post('/:boardId/like', authMiddleware, async (req, res) => {
  try {
    await pool.query(
      `INSERT INTO board_likes (user_id, board_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [req.user.id, req.params.boardId],
    );
    await pool.query(
      `UPDATE boards SET like_count = (SELECT COUNT(*) FROM board_likes WHERE board_id = $1) WHERE id = $1`,
      [req.params.boardId],
    );
    res.json({ liked: true });
  } catch {
    res.status(500).json({ error: 'Failed to like board' });
  }
});

router.get('/templates', optionalAuth, async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT t.*, u.name AS author_name FROM template_marketplace t
       JOIN users u ON u.id = t.author_id
       WHERE t.published = true ORDER BY t.downloads DESC LIMIT 50`,
    );
    res.json(rows);
  } catch {
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

module.exports = router;
