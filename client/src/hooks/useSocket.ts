import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { CursorState, DrawEvent, OnlineUser } from '../types';
import type { Comment, ChatMessage } from '../types/saas';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '';

export type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';

interface UseSocketOptions {
  boardId: string;
  token: string | null;
  guestName?: string;
  onBoardState?: (canvasData: Record<string, unknown>) => void;
  onUserDrew?: (event: DrawEvent) => void;
  onCanvasSaved?: (savedAt: string) => void;
  onError?: (message: string) => void;
  onCommentAdded?: (comment: Comment) => void;
  onChatMessage?: (message: ChatMessage) => void;
  onChatReaction?: (payload: { messageId: string; reactions: Record<string, string[]> }) => void;
  viewOnly?: boolean;
}

export function useSocket({
  boardId,
  token,
  guestName,
  onBoardState,
  onUserDrew,
  onCanvasSaved,
  onError,
  onCommentAdded,
  onChatMessage,
  onChatReaction,
  viewOnly = false,
}: UseSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [cursors, setCursors] = useState<Map<string, CursorState>>(new Map());
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);

  const onBoardStateRef = useRef(onBoardState);
  const onUserDrewRef = useRef(onUserDrew);
  const onCanvasSavedRef = useRef(onCanvasSaved);
  const onErrorRef = useRef(onError);
  const onCommentRef = useRef(onCommentAdded);
  const onChatRef = useRef(onChatMessage);
  const onChatReactionRef = useRef(onChatReaction);
  onBoardStateRef.current = onBoardState;
  onUserDrewRef.current = onUserDrew;
  onCanvasSavedRef.current = onCanvasSaved;
  onErrorRef.current = onError;
  onCommentRef.current = onCommentAdded;
  onChatRef.current = onChatMessage;
  onChatReactionRef.current = onChatReaction;

  useEffect(() => {
    const guestId = crypto.randomUUID();

    const socket = io(SOCKET_URL, {
      auth: {
        token: token || undefined,
        guestName: guestName || 'Guest',
        guestId,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnectionStatus('connected');
      socket.emit('join-board', { boardId });
    });

    socket.on('disconnect', () => setConnectionStatus('disconnected'));

    socket.io.on('reconnect_attempt', () => setConnectionStatus('reconnecting'));

    socket.on('connect_error', () => {
      setConnectionStatus('reconnecting');
      onErrorRef.current?.('Connection lost — retrying...');
    });

    socket.on('error', ({ message }: { message: string }) => {
      onErrorRef.current?.(message);
    });

    socket.on('board-state', ({ canvasData }) => {
      onBoardStateRef.current?.(canvasData);
    });

    socket.on('user-drew', (event: DrawEvent) => {
      onUserDrewRef.current?.(event);
    });

    socket.on('canvas-saved', ({ savedAt }: { savedAt: string }) => {
      onCanvasSavedRef.current?.(savedAt);
    });

    socket.on('comment-added', (comment: Comment) => {
      onCommentRef.current?.(comment);
    });

    socket.on('chat-message', (message: ChatMessage) => {
      onChatRef.current?.(message);
    });

    socket.on('chat-reaction', (payload: { messageId: string; reactions: Record<string, string[]> }) => {
      onChatReactionRef.current?.(payload);
    });

    socket.on('cursor-update', (data: CursorState) => {
      setCursors((prev) => {
        const next = new Map(prev);
        next.set(data.userId, data);
        return next;
      });
    });

    socket.on('user-left', ({ userId }: { userId: string }) => {
      setCursors((prev) => {
        const next = new Map(prev);
        next.delete(userId);
        return next;
      });
      setOnlineUsers((prev) => prev.filter((u) => u.userId !== userId));
    });

    socket.on('user-joined', (user: OnlineUser) => {
      setOnlineUsers((prev) => {
        if (prev.some((u) => u.userId === user.userId)) return prev;
        return [...prev, user];
      });
    });

    socket.on('online-users', (users: OnlineUser[]) => {
      setOnlineUsers(users);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [boardId, token, guestName]);

  const emitDraw = useCallback((event: DrawEvent) => {
    socketRef.current?.emit('draw', event);
  }, []);

  const emitCursorMove = useCallback((x: number, y: number) => {
    socketRef.current?.emit('cursor-move', { x, y });
  }, []);

  const saveCanvas = useCallback((canvasData: Record<string, unknown>) => {
    socketRef.current?.emit('save-canvas', { canvasData });
  }, []);

  const emitChat = useCallback((content: string, parentId?: string) => {
    socketRef.current?.emit('chat-message', { content, parentId });
  }, []);

  const emitChatReaction = useCallback((messageId: string, emoji: string) => {
    socketRef.current?.emit('chat-reaction', { messageId, emoji });
  }, []);

  return {
    connected: connectionStatus === 'connected',
    connectionStatus,
    cursors,
    onlineUsers,
    socketRef,
    emitDraw,
    emitCursorMove,
    saveCanvas,
    emitChat,
    emitChatReaction,
    viewOnly,
  };
}
