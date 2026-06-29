const ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  EDITOR: 'editor',
  VIEWER: 'viewer',
};

const ROLE_HIERARCHY = {
  owner: 4,
  admin: 3,
  editor: 2,
  viewer: 1,
};

const BOARD_TEMPLATES = {
  blank: { name: 'Blank Board', emoji: '📋', canvas: { version: '6.0.0', objects: [] } },
  brainstorm: {
    name: 'Brainstorm',
    emoji: '💡',
    canvas: {
      version: '6.0.0',
      objects: [],
      background: '#fefce8',
    },
  },
  sprint: {
    name: 'Sprint Planning',
    emoji: '🏃',
    canvas: { version: '6.0.0', objects: [] },
  },
  mindmap: {
    name: 'Mind Map',
    emoji: '🧠',
    canvas: { version: '6.0.0', objects: [] },
  },
  kanban: {
    name: 'Kanban',
    emoji: '📊',
    canvas: { version: '6.0.0', objects: [] },
  },
};

function hasMinRole(userRole, requiredRole) {
  return (ROLE_HIERARCHY[userRole] || 0) >= (ROLE_HIERARCHY[requiredRole] || 0);
}

module.exports = { ROLES, ROLE_HIERARCHY, BOARD_TEMPLATES, hasMinRole };
