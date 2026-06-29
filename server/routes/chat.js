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
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'Message required' });

    const message = await Chat.create({
      boardId: req.params.boardId,
      userId: req.user.id,
      content: content.trim(),
    });

    const io = req.app.get('io');
    if (io) {
      io.to(req.params.boardId).emit('chat-message', formatMessage({
        ...message,
        user_name: req.user.name || req.user.email,
      }));
    }

    res.status(201).json(formatMessage(message));
  } catch (err) {
    res.status(500).json({ error: 'Failed to send message' });
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
    createdAt: m.created_at,
  };
}

module.exports = router;
