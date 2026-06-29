const pool = require('../db/pool');
const notifications = require('../services/notifications');

async function create(data) {
  const { rows } = await pool.query(
    `INSERT INTO tasks (
       board_id, workspace_id, element_id, title, description,
       assigned_to, created_by, due_date, priority, status, checklist
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [
      data.boardId,
      data.workspaceId,
      data.elementId || null,
      data.title,
      data.description || null,
      data.assignedTo || null,
      data.createdBy,
      data.dueDate || null,
      data.priority || 'medium',
      data.status || 'todo',
      JSON.stringify(data.checklist || []),
    ],
  );
  const task = rows[0];

  if (data.assignedTo && data.assignedTo !== data.createdBy) {
    await notifications.create({
      userId: data.assignedTo,
      type: 'task_assigned',
      title: 'New task assigned to you',
      body: data.title,
      payload: { taskId: task.id, boardId: data.boardId },
    });
  }

  return task;
}

async function findByBoard(boardId) {
  const { rows } = await pool.query(
    `SELECT t.*, u.name AS assignee_name, u.avatar_color AS assignee_color
     FROM tasks t
     LEFT JOIN users u ON u.id = t.assigned_to
     WHERE t.board_id = $1
     ORDER BY t.due_date NULLS LAST, t.created_at DESC`,
    [boardId],
  );
  return rows;
}

async function findByAssignee(userId) {
  const { rows } = await pool.query(
    `SELECT t.*, b.name AS board_name, b.emoji_icon
     FROM tasks t
     JOIN boards b ON b.id = t.board_id
     WHERE t.assigned_to = $1 AND t.status != 'done'
     ORDER BY t.due_date NULLS LAST`,
    [userId],
  );
  return rows;
}

async function update(id, fields) {
  const { rows } = await pool.query(
    `UPDATE tasks SET
       title = COALESCE($1, title),
       description = COALESCE($2, description),
       assigned_to = COALESCE($3, assigned_to),
       due_date = COALESCE($4, due_date),
       priority = COALESCE($5, priority),
       status = COALESCE($6, status),
       checklist = COALESCE($7, checklist),
       updated_at = NOW()
     WHERE id = $8 RETURNING *`,
    [
      fields.title,
      fields.description,
      fields.assignedTo,
      fields.dueDate,
      fields.priority,
      fields.status,
      fields.checklist ? JSON.stringify(fields.checklist) : null,
      id,
    ],
  );
  return rows[0] || null;
}

module.exports = { create, findByBoard, findByAssignee, update };
