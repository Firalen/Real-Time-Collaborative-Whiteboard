const express = require('express');
const Workspace = require('../models/Workspace');
const Invitation = require('../models/Invitation');
const Folder = require('../models/Folder');
const Board = require('../models/Board');
const activity = require('../services/activity');
const notifications = require('../services/notifications');
const { sendInvitationEmail } = require('../services/email');
const { authMiddleware } = require('../middleware/auth');
const { requireWorkspaceRole } = require('../middleware/workspaceAuth');
const { ROLES, BOARD_TEMPLATES } = require('../constants/roles');

const router = express.Router();

router.use(authMiddleware);

// List workspaces for current user
router.get('/', async (req, res) => {
  try {
    const workspaces = await Workspace.findByUser(req.user.id);
    res.json(workspaces.map(formatWorkspace));
  } catch (err) {
    console.error('List workspaces error:', err);
    res.status(500).json({ error: 'Failed to list workspaces' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, timezone } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Workspace name is required' });

    const workspace = await Workspace.create({
      name: name.trim(),
      ownerId: req.user.id,
      timezone,
    });

    await activity.log({
      workspaceId: workspace.id,
      userId: req.user.id,
      action: 'workspace.created',
      metadata: { name: workspace.name },
    });

    res.status(201).json(formatWorkspace({ ...workspace, member_role: ROLES.OWNER }));
  } catch (err) {
    console.error('Create workspace error:', err);
    res.status(500).json({ error: 'Failed to create workspace' });
  }
});

router.get('/:workspaceId', requireWorkspaceRole(ROLES.VIEWER), async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.workspaceId);
    if (!workspace) return res.status(404).json({ error: 'Workspace not found' });
    res.json(formatWorkspace({ ...workspace, member_role: req.workspaceRole }));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch workspace' });
  }
});

router.patch('/:workspaceId', requireWorkspaceRole(ROLES.ADMIN), async (req, res) => {
  try {
    const workspace = await Workspace.update(
      req.params.workspaceId,
      { name: req.body.name, logoUrl: req.body.logoUrl, timezone: req.body.timezone },
    );
    if (!workspace) return res.status(404).json({ error: 'Workspace not found or not authorized' });
    res.json(formatWorkspace(workspace));
  } catch (err) {
    res.status(500).json({ error: 'Failed to update workspace' });
  }
});

// Members
router.get('/:workspaceId/members', requireWorkspaceRole(ROLES.VIEWER), async (req, res) => {
  try {
    const members = await Workspace.getMembers(req.params.workspaceId);
    res.json(members.map((m) => ({
      id: m.id,
      name: m.name,
      email: m.email,
      avatarColor: m.avatar_color,
      role: m.role,
      joinedAt: m.joined_at,
    })));
  } catch (err) {
    res.status(500).json({ error: 'Failed to list members' });
  }
});

router.patch('/:workspaceId/members/:memberId', requireWorkspaceRole(ROLES.ADMIN), async (req, res) => {
  try {
    const { role } = req.body;
    if (!['admin', 'editor', 'viewer'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    const updated = await Workspace.updateMemberRole(req.params.workspaceId, req.params.memberId, role);
    if (!updated) return res.status(404).json({ error: 'Member not found or cannot change owner' });
    res.json({ role: updated.role });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update member role' });
  }
});

router.delete('/:workspaceId/members/:memberId', requireWorkspaceRole(ROLES.ADMIN), async (req, res) => {
  try {
    const removed = await Workspace.removeMember(req.params.workspaceId, req.params.memberId);
    if (!removed) return res.status(404).json({ error: 'Member not found or cannot remove owner' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

// Invitations
router.post('/:workspaceId/invitations', requireWorkspaceRole(ROLES.ADMIN), async (req, res) => {
  try {
    const { email, role = 'editor' } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });
    if (!['admin', 'editor', 'viewer'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const invitation = await Invitation.create({
      workspaceId: req.params.workspaceId,
      email,
      role,
      invitedBy: req.user.id,
    });

    const workspace = await Workspace.findById(req.params.workspaceId);
    const inviteUrl = `${process.env.CLIENT_URL}/invite/${invitation.token}`;

    await sendInvitationEmail({
      to: email,
      workspaceName: workspace.name,
      inviteUrl,
      inviterName: req.user.email,
    });

    await notifications.create({
      userId: req.user.id,
      type: 'invite',
      title: `Invitation sent to ${email}`,
      body: `Invited to ${workspace.name}`,
      payload: { invitationId: invitation.id },
    });

    res.status(201).json({
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expires_at,
    });
  } catch (err) {
    console.error('Invite error:', err);
    res.status(500).json({ error: 'Failed to send invitation' });
  }
});

router.get('/:workspaceId/invitations', requireWorkspaceRole(ROLES.ADMIN), async (req, res) => {
  try {
    const invitations = await Invitation.listPending(req.params.workspaceId);
    res.json(invitations);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list invitations' });
  }
});

// Boards within workspace
router.get('/:workspaceId/boards', requireWorkspaceRole(ROLES.VIEWER), async (req, res) => {
  try {
    const boards = await Board.findByWorkspace(req.params.workspaceId, req.user.id, {
      includeArchived: req.query.archived === 'true',
    });
    res.json(boards.map(formatBoard));
  } catch (err) {
    res.status(500).json({ error: 'Failed to list boards' });
  }
});

router.post('/:workspaceId/boards', requireWorkspaceRole(ROLES.EDITOR), async (req, res) => {
  try {
    const { name, folderId, template, emojiIcon, coverUrl, visibility } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Board name is required' });

    const board = await Board.create({
      name: name.trim(),
      ownerId: req.user.id,
      workspaceId: req.params.workspaceId,
      folderId,
      template: template || 'blank',
      emojiIcon,
      coverUrl,
      visibility,
    });

    await activity.log({
      workspaceId: req.params.workspaceId,
      boardId: board.id,
      userId: req.user.id,
      action: 'board.created',
      metadata: { name: board.name, template: board.template },
    });

    res.status(201).json(formatBoard(board));
  } catch (err) {
    res.status(500).json({ error: 'Failed to create board' });
  }
});

// Folders
router.get('/:workspaceId/folders', requireWorkspaceRole(ROLES.VIEWER), async (req, res) => {
  try {
    const folders = await Folder.findByWorkspace(req.params.workspaceId);
    res.json(folders);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list folders' });
  }
});

router.post('/:workspaceId/folders', requireWorkspaceRole(ROLES.EDITOR), async (req, res) => {
  try {
    const { name, parentId } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Folder name is required' });
    const folder = await Folder.create(req.params.workspaceId, name.trim(), req.user.id, parentId);
    res.status(201).json(folder);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create folder' });
  }
});

// Activity feed
router.get('/:workspaceId/activity', requireWorkspaceRole(ROLES.VIEWER), async (req, res) => {
  try {
    const activityFeed = await activity.getByWorkspace(req.params.workspaceId);
    res.json(activityFeed);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

// Templates list
router.get('/:workspaceId/templates', requireWorkspaceRole(ROLES.VIEWER), (_req, res) => {
  res.json(
    Object.entries(BOARD_TEMPLATES).map(([key, tpl]) => ({
      id: key,
      name: tpl.name,
      emoji: tpl.emoji,
    })),
  );
});

function formatWorkspace(w) {
  return {
    id: w.id,
    name: w.name,
    slug: w.slug,
    logoUrl: w.logo_url,
    timezone: w.timezone,
    ownerId: w.owner_id,
    role: w.member_role,
    createdAt: w.created_at,
    updatedAt: w.updated_at,
  };
}

function formatBoard(b) {
  return {
    id: b.id,
    name: b.name,
    ownerId: b.owner_id,
    workspaceId: b.workspace_id,
    folderId: b.folder_id,
    template: b.template,
    emojiIcon: b.emoji_icon,
    coverUrl: b.cover_url,
    visibility: b.visibility,
    archivedAt: b.archived_at,
    pinned: b.pinned || false,
    createdAt: b.created_at,
    updatedAt: b.updated_at,
  };
}

module.exports = router;
