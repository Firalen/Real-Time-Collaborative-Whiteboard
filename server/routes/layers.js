const express = require('express');
const pool = require('../db/pool');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM board_layers WHERE board_id = $1 ORDER BY sort_order`,
      [req.params.boardId],
    );
    if (rows.length === 0) {
      const { rows: created } = await pool.query(
        `INSERT INTO board_layers (board_id, name, sort_order) VALUES ($1, 'Layer 1', 0) RETURNING *`,
        [req.params.boardId],
      );
      return res.json(created.map(formatLayer));
    }
    res.json(rows.map(formatLayer));
  } catch {
    res.status(500).json({ error: 'Failed to fetch layers' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    const { rows: max } = await pool.query(
      `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM board_layers WHERE board_id = $1`,
      [req.params.boardId],
    );
    const { rows } = await pool.query(
      `INSERT INTO board_layers (board_id, name, sort_order) VALUES ($1, $2, $3) RETURNING *`,
      [req.params.boardId, name || 'New Layer', max[0].next],
    );
    res.status(201).json(formatLayer(rows[0]));
  } catch {
    res.status(500).json({ error: 'Failed to create layer' });
  }
});

router.patch('/:layerId', async (req, res) => {
  try {
    const { name, visible, locked, sortOrder } = req.body;
    const { rows } = await pool.query(
      `UPDATE board_layers SET
        name = COALESCE($3, name),
        visible = COALESCE($4, visible),
        locked = COALESCE($5, locked),
        sort_order = COALESCE($6, sort_order)
       WHERE id = $1 AND board_id = $2 RETURNING *`,
      [req.params.layerId, req.params.boardId, name, visible, locked, sortOrder],
    );
    if (!rows[0]) return res.status(404).json({ error: 'Layer not found' });
    res.json(formatLayer(rows[0]));
  } catch {
    res.status(500).json({ error: 'Failed to update layer' });
  }
});

router.delete('/:layerId', async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      `DELETE FROM board_layers WHERE id = $1 AND board_id = $2`,
      [req.params.layerId, req.params.boardId],
    );
    if (!rowCount) return res.status(404).json({ error: 'Layer not found' });
    res.json({ deleted: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete layer' });
  }
});

function formatLayer(l) {
  return {
    id: l.id,
    boardId: l.board_id,
    name: l.name,
    sortOrder: l.sort_order,
    visible: l.visible,
    locked: l.locked,
  };
}

module.exports = router;
