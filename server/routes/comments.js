const express = require('express');
const Comment = require('../models/Comment');
const Board = require('../models/Board');
const { notifySlack } = require('../services/integrations');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const comments = await Comment.findByBoard(req.params.boardId);
    res.json(comments.map(formatComment));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { content, elementId, parentId, mentionIds } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'Comment content is required' });

    const comment = await Comment.create({
      boardId: req.params.boardId,
      elementId,
      userId: req.user.id,
      content: content.trim(),
      parentId,
      mentionIds: mentionIds || [],
    });

    const formatted = formatComment({
      ...comment,
      user_name: req.user.name || req.user.email,
      avatar_color: '#6366f1',
    });
    const io = req.app.get('io');
    if (io) {
      io.to(req.params.boardId).emit('comment-added', formatted);
    }

    const board = await Board.findById(req.params.boardId);
    if (board?.workspace_id) {
      await notifySlack(board.workspace_id, `New comment on board "${board.name}": ${content.slice(0, 100)}`);
    }

    res.status(201).json(formatted);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create comment' });
  }
});

router.post('/:commentId/resolve', async (req, res) => {
  try {
    const comment = await Comment.resolve(req.params.commentId, req.user.id);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });
    res.json({ resolved: comment.resolved });
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle resolve' });
  }
});

router.post('/reactions', async (req, res) => {
  try {
    const { elementId, emoji } = req.body;
    if (!elementId || !emoji) return res.status(400).json({ error: 'elementId and emoji required' });

    const reaction = await Comment.addReaction({
      boardId: req.params.boardId,
      elementId,
      userId: req.user.id,
      emoji,
    });
    res.status(201).json(reaction);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add reaction' });
  }
});

router.get('/reactions', async (req, res) => {
  try {
    const reactions = await Comment.getReactions(req.params.boardId);
    res.json(reactions);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch reactions' });
  }
});

function formatComment(c) {
  return {
    id: c.id,
    boardId: c.board_id,
    elementId: c.element_id,
    userId: c.user_id,
    userName: c.user_name,
    avatarColor: c.avatar_color,
    parentId: c.parent_id,
    content: c.content,
    resolved: c.resolved,
    mentions: c.mentions,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  };
}

module.exports = router;
