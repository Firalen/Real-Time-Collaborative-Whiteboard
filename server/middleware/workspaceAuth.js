const Workspace = require('../models/Workspace');
const { hasMinRole } = require('../constants/roles');

function requireWorkspaceRole(minRole) {
  return async (req, res, next) => {
    try {
      const workspaceId = req.params.workspaceId || req.body.workspaceId;
      if (!workspaceId) {
        return res.status(400).json({ error: 'Workspace ID required' });
      }

      const role = await Workspace.getMemberRole(workspaceId, req.user.id);
      if (!role || !hasMinRole(role, minRole)) {
        return res.status(403).json({ error: 'Insufficient workspace permissions' });
      }

      req.workspaceRole = role;
      req.workspaceId = workspaceId;
      next();
    } catch (err) {
      console.error('Workspace auth error:', err);
      res.status(500).json({ error: 'Authorization check failed' });
    }
  };
}

module.exports = { requireWorkspaceRole };
