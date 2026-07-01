const User = require('../models/User');
const Board = require('../models/Board');
const activity = require('../services/activity');
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
const socketByUser = new Map();
const meetingUsers = new Map();
const SAVE_INTERVAL_MS = 5000;
const VERSION_INTERVAL_MS = 30000;
const lastSaveBySocket = new Map();
const lastVersionByBoard = new Map();

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
      socketByUser.set(userId, socket.id);

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

        // Version snapshot every 30 seconds per board
        const lastVersion = lastVersionByBoard.get(currentBoardId) || 0;
        if (now - lastVersion >= VERSION_INTERVAL_MS) {
          await Board.saveVersion(currentBoardId, canvasData, userId, null);
          lastVersionByBoard.set(currentBoardId, now);
        }

        await activity.log({
          boardId: currentBoardId,
          userId,
          action: 'canvas.saved',
          metadata: { via: 'socket' },
        });

        const board = await Board.findById(currentBoardId);
        if (board?.workspace_id) {
          const { notifySlack } = require('../services/integrations');
          await notifySlack(board.workspace_id, `Board "${board.name}" was updated`);
        }

        socket.emit('canvas-saved', { savedAt: new Date().toISOString() });
      } catch (err) {
        console.error('Canvas save error:', err.message);
        socket.emit('error', { message: 'Failed to save canvas' });
      }
    });

    socket.on('webrtc-join', () => {
      if (!currentBoardId) return;
      if (!meetingUsers.has(currentBoardId)) meetingUsers.set(currentBoardId, new Set());
      const inMeeting = meetingUsers.get(currentBoardId);
      const existing = Array.from(inMeeting)
        .filter((id) => id !== userId)
        .map((id) => {
          const u = boardUsers.get(currentBoardId)?.get(id);
          return { userId: id, name: u?.name || 'User' };
        });
      socket.emit('webrtc-existing-peers', { peers: existing });
      inMeeting.add(userId);
      socket.to(currentBoardId).emit('webrtc-peer-joined', { userId, name: displayName });
    });

    socket.on('webrtc-signal', ({ targetUserId, type, payload }) => {
      if (!targetUserId || !type) return;
      const targetSocket = socketByUser.get(targetUserId);
      if (targetSocket) {
        io.to(targetSocket).emit('webrtc-signal', {
          fromUserId: userId,
          fromName: displayName,
          type,
          payload,
        });
      }
    });

    socket.on('webrtc-leave', () => {
      if (!currentBoardId) return;
      meetingUsers.get(currentBoardId)?.delete(userId);
      socket.to(currentBoardId).emit('webrtc-peer-left', { userId });
    });

    socket.on('chat-message', async ({ content, parentId }) => {
      if (!currentBoardId || !tokenUser) return;
      if (!content?.trim()) return;

      const Chat = require('../models/Chat');
      if (parentId) {
        const parent = await Chat.findById(parentId);
        if (!parent || parent.board_id !== currentBoardId) return;
      }

      const message = await Chat.create({
        boardId: currentBoardId,
        userId,
        content: content.trim(),
        parentId: parentId || null,
      });

      const user = await User.findById(userId);
      socket.to(currentBoardId).emit('chat-message', {
        id: message.id,
        boardId: currentBoardId,
        userId,
        userName: user?.name || displayName,
        avatarColor: user?.avatar_color || avatarColor,
        content: message.content,
        parentId: message.parent_id || undefined,
        reactions: message.reactions || {},
        createdAt: message.created_at,
      });
    });

    socket.on('chat-reaction', async ({ messageId, emoji }) => {
      if (!currentBoardId || !tokenUser || !messageId || !emoji) return;

      const Chat = require('../models/Chat');
      const existing = await Chat.findById(messageId);
      if (!existing || existing.board_id !== currentBoardId) return;

      const updated = await Chat.toggleReaction(messageId, userId, emoji);
      if (!updated) return;

      socket.to(currentBoardId).emit('chat-reaction', {
        messageId: updated.id,
        boardId: currentBoardId,
        reactions: updated.reactions || {},
      });
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
  meetingUsers.get(boardId)?.delete(userId);
  socket.to(boardId).emit('webrtc-peer-left', { userId });
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
