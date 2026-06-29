const User = require('../models/User');
const Board = require('../models/Board');
const { verifySocketToken } = require('../middleware/auth');
const redis = require('../redis');
const {
  isValidUUID,
  validateDrawEvent,
  validateCanvasData,
  validateCursorMove,
  sanitizeGuestName,
} = require('./validation');

const boardUsers = new Map();
const SAVE_INTERVAL_MS = 5000;
const lastSaveBySocket = new Map();

/**
 * Real-time sync handlers.
 *
 * Flow:
 * 1. Client connects with JWT token in handshake auth
 * 2. Client emits 'join-board' → server validates board exists, joins Socket.IO room
 * 3. Draw events are validated and relayed to other users in the room
 * 4. Canvas saves are rate-limited and payload-validated before persisting to PostgreSQL
 */
function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    const tokenUser = verifySocketToken(socket.handshake.auth?.token);
    let currentBoardId = null;
    let displayName = sanitizeGuestName(socket.handshake.auth?.guestName);
    let userId = socket.handshake.auth?.guestId || socket.id;
    let avatarColor = '#6366f1';

    if (tokenUser) {
      userId = tokenUser.id;
      User.findById(tokenUser.id).then((user) => {
        if (user) {
          displayName = user.name;
          avatarColor = user.avatar_color;
        }
      });
    }

    socket.on('join-board', async ({ boardId }) => {
      if (!isValidUUID(boardId)) {
        socket.emit('error', { message: 'Invalid board ID' });
        return;
      }

      const board = await Board.findById(boardId);
      if (!board) {
        socket.emit('error', { message: 'Board not found' });
        return;
      }

      if (currentBoardId) {
        await leaveBoard(socket, currentBoardId, userId);
      }

      currentBoardId = boardId;
      socket.join(boardId);

      const userInfo = { userId, name: displayName, avatarColor };
      trackUser(boardId, userId, userInfo);

      socket.emit('board-state', { canvasData: board.canvas_data });
      socket.to(boardId).emit('user-joined', userInfo);
      socket.emit('online-users', getOnlineUsers(boardId));
    });

    socket.on('draw', (data) => {
      if (!currentBoardId) return;
      if (!validateDrawEvent(data)) return;

      socket.to(currentBoardId).emit('user-drew', { ...data, userId });
    });

    socket.on('cursor-move', async (data) => {
      if (!currentBoardId || !validateCursorMove(data)) return;

      const cursorData = {
        userId,
        name: displayName,
        avatarColor,
        x: data.x,
        y: data.y,
      };

      await redis.setWithExpiry(
        `cursor:${currentBoardId}:${userId}`,
        JSON.stringify(cursorData),
        30,
      );

      socket.to(currentBoardId).emit('cursor-update', cursorData);
    });

    socket.on('save-canvas', async ({ canvasData }) => {
      if (!currentBoardId) return;
      if (!validateCanvasData(canvasData)) {
        socket.emit('error', { message: 'Invalid canvas data' });
        return;
      }

      const now = Date.now();
      const lastSave = lastSaveBySocket.get(socket.id) || 0;
      if (now - lastSave < SAVE_INTERVAL_MS) return;

      lastSaveBySocket.set(socket.id, now);

      try {
        await Board.updateCanvas(currentBoardId, canvasData);
        socket.emit('canvas-saved', { savedAt: new Date().toISOString() });
      } catch (err) {
        console.error('Canvas save error:', err.message);
        socket.emit('error', { message: 'Failed to save canvas' });
      }
    });

    socket.on('disconnect', async () => {
      lastSaveBySocket.delete(socket.id);
      if (currentBoardId) {
        await leaveBoard(socket, currentBoardId, userId);
      }
    });
  });
}

async function leaveBoard(socket, boardId, userId) {
  socket.leave(boardId);
  untrackUser(boardId, userId);
  await redis.del(`cursor:${boardId}:${userId}`);
  socket.to(boardId).emit('user-left', { userId });
}

function trackUser(boardId, userId, userInfo) {
  if (!boardUsers.has(boardId)) {
    boardUsers.set(boardId, new Map());
  }
  boardUsers.get(boardId).set(userId, userInfo);
}

function untrackUser(boardId, userId) {
  const users = boardUsers.get(boardId);
  if (users) {
    users.delete(userId);
    if (users.size === 0) boardUsers.delete(boardId);
  }
}

function getOnlineUsers(boardId) {
  const users = boardUsers.get(boardId);
  if (!users) return [];
  return Array.from(users.values());
}

module.exports = { registerSocketHandlers };
