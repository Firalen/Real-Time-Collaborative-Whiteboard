const express = require('express');
const notifications = require('../services/notifications');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const items = await notifications.getForUser(req.user.id, {
      unreadOnly: req.query.unread === 'true',
    });
    res.json(items.map(formatNotification));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

router.get('/unread-count', async (req, res) => {
  try {
    const count = await notifications.getUnreadCount(req.user.id);
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch count' });
  }
});

router.patch('/:id/read', async (req, res) => {
  try {
    const n = await notifications.markRead(req.user.id, req.params.id);
    if (!n) return res.status(404).json({ error: 'Notification not found' });
    res.json(formatNotification(n));
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark read' });
  }
});

router.post('/read-all', async (req, res) => {
  try {
    await notifications.markAllRead(req.user.id);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark all read' });
  }
});

function formatNotification(n) {
  return {
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    payload: n.payload,
    readAt: n.read_at,
    createdAt: n.created_at,
  };
}

module.exports = router;
