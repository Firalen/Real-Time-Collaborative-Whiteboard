/**
 * Backfill personal workspaces for existing users and link their boards.
 */
module.exports = `
  INSERT INTO workspaces (name, slug, owner_id)
  SELECT
    u.name || '''s Workspace',
    'personal-' || REPLACE(u.id::text, '-', ''),
    u.id
  FROM users u
  WHERE NOT EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.user_id = u.id AND wm.role = 'owner'
  )
  ON CONFLICT (slug) DO NOTHING;

  INSERT INTO workspace_members (workspace_id, user_id, role)
  SELECT w.id, w.owner_id, 'owner'
  FROM workspaces w
  WHERE w.slug LIKE 'personal-%'
  ON CONFLICT (workspace_id, user_id) DO NOTHING;

  UPDATE boards b
  SET workspace_id = w.id
  FROM workspaces w
  WHERE b.owner_id = w.owner_id
    AND w.slug LIKE 'personal-%'
    AND b.workspace_id IS NULL;
`;
