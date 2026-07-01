const express = require('express');
const Chat = require('../models/Chat');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const messages = await Chat.findByBoard(req.params.boardId);
    res.json(messages.map(formatMessage));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch chat' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { content, parentId } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'Message required' });

    if (parentId) {
      const parent = await Chat.findById(parentId);
      if (!parent || parent.board_id !== req.params.boardId) {
        return res.status(400).json({ error: 'Invalid thread parent' });
      }
    }

    const message = await Chat.create({
      boardId: req.params.boardId,
      userId: req.user.id,
      content: content.trim(),
      parentId: parentId || null,
    });

    const formatted = formatMessage({
      ...message,
      user_name: req.user.name || req.user.email,
      avatar_color: req.user.avatar_color,
    });

    const io = req.app.get('io');
    if (io) {
      io.to(req.params.boardId).emit('chat-message', formatted);
    }

    res.status(201).json(formatted);
  } catch (err) {
    res.status(500).json({ error: 'Failed to send message' });
  }
});

router.post('/:messageId/reactions', async (req, res) => {
  try {
    const { emoji } = req.body;
    if (!emoji?.trim()) return res.status(400).json({ error: 'Emoji required' });

    const existing = await Chat.findById(req.params.messageId);
    if (!existing || existing.board_id !== req.params.boardId) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const updated = await Chat.toggleReaction(req.params.messageId, req.user.id, emoji.trim());
    if (!updated) return res.status(404).json({ error: 'Message not found' });

    const payload = {
      messageId: updated.id,
      boardId: req.params.boardId,
      reactions: updated.reactions || {},
    };

    const io = req.app.get('io');
    if (io) {
      io.to(req.params.boardId).emit('chat-reaction', payload);
    }

    res.json(payload);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update reaction' });
  }
});

function formatMessage(m) {
  return {
    id: m.id,
    boardId: m.board_id,
    userId: m.user_id,
    userName: m.user_name,
    avatarColor: m.avatar_color,
    content: m.content,
    parentId: m.parent_id || undefined,
    reactions: m.reactions || {},
    createdAt: m.created_at,
  };
}

module.exports = router;
