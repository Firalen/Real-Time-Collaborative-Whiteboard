const express = require('express');
const Task = require('../models/Task');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

router.get('/my', async (req, res) => {
  try {
    const tasks = await Task.findByAssignee(req.user.id);
    res.json(tasks.map(formatTask));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

router.get('/board/:boardId', async (req, res) => {
  try {
    const tasks = await Task.findByBoard(req.params.boardId);
    res.json(tasks.map(formatTask));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch board tasks' });
  }
});

router.post('/board/:boardId', async (req, res) => {
  try {
    const { title, description, elementId, assignedTo, dueDate, priority, checklist, workspaceId } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: 'Task title is required' });

    const task = await Task.create({
      boardId: req.params.boardId,
      workspaceId,
      elementId,
      title: title.trim(),
      description,
      assignedTo,
      createdBy: req.user.id,
      dueDate,
      priority,
      checklist,
    });

    res.status(201).json(formatTask(task));
  } catch (err) {
    res.status(500).json({ error: 'Failed to create task' });
  }
});

router.patch('/:taskId', async (req, res) => {
  try {
    const task = await Task.update(req.params.taskId, req.body);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(formatTask(task));
  } catch (err) {
    res.status(500).json({ error: 'Failed to update task' });
  }
});

function formatTask(t) {
  return {
    id: t.id,
    boardId: t.board_id,
    boardName: t.board_name,
    workspaceId: t.workspace_id,
    elementId: t.element_id,
    title: t.title,
    description: t.description,
    assignedTo: t.assigned_to,
    assigneeName: t.assignee_name,
    assigneeColor: t.assignee_color,
    dueDate: t.due_date,
    priority: t.priority,
    status: t.status,
    checklist: t.checklist,
    emojiIcon: t.emoji_icon,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
  };
}

module.exports = router;
