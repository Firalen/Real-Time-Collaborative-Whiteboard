const express = require('express');
const Integration = require('../models/Integration');
const { authMiddleware } = require('../middleware/auth');
const { requireWorkspaceRole } = require('../middleware/workspaceAuth');
const { ROLES } = require('../constants/roles');

const router = express.Router({ mergeParams: true });

router.use(authMiddleware);
router.use(requireWorkspaceRole(ROLES.ADMIN));

router.get('/', async (req, res) => {
  try {
    const integrations = await Integration.list(req.params.workspaceId);
    res.json(integrations);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list integrations' });
  }
});

router.put('/slack', async (req, res) => {
  try {
    const { webhookUrl } = req.body;
    if (!webhookUrl) return res.status(400).json({ error: 'Webhook URL required' });

    const integration = await Integration.upsert(req.params.workspaceId, 'slack', { webhookUrl });
    res.json({ type: integration.type, enabled: integration.enabled });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save Slack integration' });
  }
});

router.put('/google-calendar', async (req, res) => {
  try {
    const integration = await Integration.upsert(req.params.workspaceId, 'google_calendar', {
      enabled: true,
    });
    res.json({ type: integration.type, enabled: integration.enabled });
  } catch (err) {
    res.status(500).json({ error: 'Failed to enable Google Calendar' });
  }
});

module.exports = router;
