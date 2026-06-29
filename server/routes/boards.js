const express = require('express');
const Board = require('../models/Board');
const activity = require('../services/activity');
const { authMiddleware } = require('../middleware/auth');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const boards = await Board.findByOwner(req.user.id);
    res.json(boards.map(formatBoard));
  } catch (err) {
    res.status(500).json({ error: 'Failed to list boards' });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, workspaceId, template } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Board name is required' });

    const board = await Board.create({
      name: name.trim(),
      ownerId: req.user.id,
      workspaceId,
      template: template || 'blank',
    });
    res.status(201).json(formatBoard(board));
  } catch (err) {
    res.status(500).json({ error: 'Failed to create board' });
  }
});

router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const board = await Board.findById(req.params.id);
    if (!board) return res.status(404).json({ error: 'Board not found' });

    res.json({
      ...formatBoard(board),
      canvasData: board.canvas_data,
      allowGuestView: board.allow_guest_view,
      allowExport: board.allow_export,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch board' });
  }
});

router.patch('/:id', authMiddleware, async (req, res) => {
  try {
    const board = await Board.update(req.params.id, {
      name: req.body.name?.trim(),
      emojiIcon: req.body.emojiIcon,
      coverUrl: req.body.coverUrl,
      folderId: req.body.folderId,
      visibility: req.body.visibility,
    }, req.user.id);
    if (!board) return res.status(404).json({ error: 'Board not found or not authorized' });
    res.json(formatBoard(board));
  } catch (err) {
    res.status(500).json({ error: 'Failed to update board' });
  }
});

router.post('/:id/duplicate', authMiddleware, async (req, res) => {
  try {
    const board = await Board.duplicate(req.params.id, req.user.id);
    if (!board) return res.status(404).json({ error: 'Board not found' });
    res.status(201).json(formatBoard(board));
  } catch (err) {
    res.status(500).json({ error: 'Failed to duplicate board' });
  }
});

router.post('/:id/pin', authMiddleware, async (req, res) => {
  try {
    const pinned = await Board.togglePin(req.user.id, req.params.id);
    res.json({ pinned });
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle pin' });
  }
});

router.post('/:id/archive', authMiddleware, async (req, res) => {
  try {
    const board = await Board.archive(req.params.id, req.user.id);
    if (!board) return res.status(404).json({ error: 'Board not found' });
    res.json(formatBoard(board));
  } catch (err) {
    res.status(500).json({ error: 'Failed to archive board' });
  }
});

router.post('/:id/unarchive', authMiddleware, async (req, res) => {
  try {
    const board = await Board.unarchive(req.params.id, req.user.id);
    if (!board) return res.status(404).json({ error: 'Board not found' });
    res.json(formatBoard(board));
  } catch (err) {
    res.status(500).json({ error: 'Failed to unarchive board' });
  }
});

router.post('/:id/restore', authMiddleware, async (req, res) => {
  try {
    const board = await Board.restore(req.params.id, req.user.id);
    if (!board) return res.status(404).json({ error: 'Board not in trash or expired' });
    res.json(formatBoard(board));
  } catch (err) {
    res.status(500).json({ error: 'Failed to restore board' });
  }
});

router.get('/:id/versions', authMiddleware, async (req, res) => {
  try {
    const versions = await Board.getVersions(req.params.id);
    res.json(versions);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch versions' });
  }
});

router.post('/:id/versions/:versionId/restore', authMiddleware, async (req, res) => {
  try {
    const version = await Board.getVersion(req.params.versionId);
    if (!version || version.board_id !== req.params.id) {
      return res.status(404).json({ error: 'Version not found' });
    }
    const result = await Board.updateCanvas(req.params.id, version.canvas_data);
    res.json({ updatedAt: result.updated_at });
  } catch (err) {
    res.status(500).json({ error: 'Failed to restore version' });
  }
});

router.get('/:id/activity', authMiddleware, async (req, res) => {
  try {
    const feed = await activity.getByBoard(req.params.id);
    res.json(feed);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

router.put('/:id/canvas', authMiddleware, async (req, res) => {
  try {
    const board = await Board.findById(req.params.id);
    if (!board) return res.status(404).json({ error: 'Board not found' });

    const result = await Board.updateCanvas(req.params.id, req.body.canvasData);
    res.json({ updatedAt: result.updated_at });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save canvas' });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const deleted = await Board.remove(req.params.id, req.user.id);
    if (!deleted) return res.status(404).json({ error: 'Board not found or not authorized' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete board' });
  }
});

function formatBoard(board) {
  return {
    id: board.id,
    name: board.name,
    ownerId: board.owner_id,
    workspaceId: board.workspace_id,
    folderId: board.folder_id,
    template: board.template,
    emojiIcon: board.emoji_icon,
    coverUrl: board.cover_url,
    visibility: board.visibility,
    archivedAt: board.archived_at,
    pinned: board.pinned || false,
    createdAt: board.created_at,
    updatedAt: board.updated_at,
  };
}

module.exports = router;
