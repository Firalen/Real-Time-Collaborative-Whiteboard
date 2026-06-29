const express = require('express');
const Board = require('../models/Board');
const User = require('../models/User');
const { authMiddleware, optionalAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const boards = await Board.findByOwner(req.user.id);
    res.json(boards.map(formatBoard));
  } catch (err) {
    console.error('List boards error:', err);
    res.status(500).json({ error: 'Failed to list boards' });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ error: 'Board name is required' });
    }

    const board = await Board.create({ name: name.trim(), ownerId: req.user.id });
    res.status(201).json(formatBoard(board));
  } catch (err) {
    console.error('Create board error:', err);
    res.status(500).json({ error: 'Failed to create board' });
  }
});

// Public read for shareable links — returns board metadata + canvas
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const board = await Board.findById(req.params.id);
    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }

    res.json({
      ...formatBoard(board),
      canvasData: board.canvas_data,
    });
  } catch (err) {
    console.error('Get board error:', err);
    res.status(500).json({ error: 'Failed to fetch board' });
  }
});

router.patch('/:id', authMiddleware, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ error: 'Board name is required' });
    }

    const board = await Board.updateName(req.params.id, name.trim(), req.user.id);
    if (!board) {
      return res.status(404).json({ error: 'Board not found or not authorized' });
    }

    res.json(formatBoard(board));
  } catch (err) {
    console.error('Update board error:', err);
    res.status(500).json({ error: 'Failed to update board' });
  }
});

router.put('/:id/canvas', authMiddleware, async (req, res) => {
  try {
    const board = await Board.findById(req.params.id);
    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }

    const result = await Board.updateCanvas(req.params.id, req.body.canvasData);
    res.json({ updatedAt: result.updated_at });
  } catch (err) {
    console.error('Save canvas error:', err);
    res.status(500).json({ error: 'Failed to save canvas' });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const deleted = await Board.remove(req.params.id, req.user.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Board not found or not authorized' });
    }
    res.status(204).send();
  } catch (err) {
    console.error('Delete board error:', err);
    res.status(500).json({ error: 'Failed to delete board' });
  }
});

function formatBoard(board) {
  return {
    id: board.id,
    name: board.name,
    ownerId: board.owner_id,
    createdAt: board.created_at,
    updatedAt: board.updated_at,
  };
}

module.exports = router;
