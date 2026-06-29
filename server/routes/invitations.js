const express = require('express');
const Invitation = require('../models/Invitation');
const Workspace = require('../models/Workspace');
const notifications = require('../services/notifications');
const activity = require('../services/activity');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Public: preview invitation
router.get('/:token', async (req, res) => {
  try {
    const invitation = await Invitation.findByToken(req.params.token);
    if (!invitation) return res.status(404).json({ error: 'Invitation not found or expired' });
    res.json({
      workspaceName: invitation.workspace_name,
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expires_at,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch invitation' });
  }
});

// Accept invitation (requires auth)
router.post('/:token/accept', authMiddleware, async (req, res) => {
  try {
    const invitation = await Invitation.accept(req.params.token, req.user.id);
    if (!invitation) return res.status(404).json({ error: 'Invitation not found or expired' });

    const workspace = await Workspace.findById(invitation.workspace_id);

    await activity.log({
      workspaceId: invitation.workspace_id,
      userId: req.user.id,
      action: 'member.joined',
      metadata: { role: invitation.role },
    });

    await notifications.create({
      userId: req.user.id,
      type: 'system',
      title: `Welcome to ${workspace.name}`,
      body: `You joined as ${invitation.role}`,
      payload: { workspaceId: workspace.id },
    });

    res.json({ workspaceId: workspace.id, workspaceName: workspace.name, role: invitation.role });
  } catch (err) {
    console.error('Accept invite error:', err);
    res.status(500).json({ error: 'Failed to accept invitation' });
  }
});

module.exports = router;
