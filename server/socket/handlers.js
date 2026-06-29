const User = require('../models/User');
const Board = require('../models/Board');
const { verifySocketToken } = require('../middleware/auth');
const redis = require('../redis');

// In-memory presence fallback when Redis set ops aren't available per-connection
const boardUsers = new Map();

/**
 * Real-time sync handlers.
 *
 * Flow:
 * 1. Client connects with JWT token in handshake auth
 * 2. Client emits 'join-board' → server puts socket in room named boardId
 * 3. Draw events are relayed to everyone else in the room (not back to sender)
 * 4. Cursor positions stored in Redis with TTL for ephemeral presence
 */
function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    const tokenUser = verifySocketToken(socket.handshake.auth?.token);
    let currentBoardId = null;
    let displayName = socket.handshake.auth?.guestName || 'Guest';
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
      if (!boardId) return;

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

      // Send existing canvas state to the joining client
      socket.emit('board-state', { canvasData: board.canvas_data });

      // Notify others in the room
      socket.to(boardId).emit('user-joined', userInfo);

      // Send current online users to the joiner
      const onlineUsers = getOnlineUsers(boardId);
      socket.emit('online-users', onlineUsers);
    });

    // Relay draw events to all other users in the board room
    socket.on('draw', (data) => {
      if (!currentBoardId) return;
      socket.to(currentBoardId).emit('user-drew', {
        ...data,
        userId,
      });
    });

    // Broadcast cursor position to other users
    socket.on('cursor-move', async ({ x, y }) => {
      if (!currentBoardId) return;

      const cursorData = { userId, name: displayName, avatarColor, x, y };
      await redis.setWithExpiry(
        `cursor:${currentBoardId}:${userId}`,
        JSON.stringify(cursorData),
        30
      );

      socket.to(currentBoardId).emit('cursor-update', cursorData);
    });

    socket.on('save-canvas', async ({ canvasData }) => {
      if (!currentBoardId) return;
      await Board.updateCanvas(currentBoardId, canvasData);
    });

    socket.on('disconnect', async () => {
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
