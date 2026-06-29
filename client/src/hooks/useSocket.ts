import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { CursorState, DrawEvent, OnlineUser } from '../types';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '';

interface UseSocketOptions {
  boardId: string;
  token: string | null;
  guestName?: string;
  onBoardState?: (canvasData: Record<string, unknown>) => void;
  onUserDrew?: (event: DrawEvent) => void;
}

export function useSocket({
  boardId,
  token,
  guestName,
  onBoardState,
  onUserDrew,
}: UseSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [cursors, setCursors] = useState<Map<string, CursorState>>(new Map());
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);

  const onBoardStateRef = useRef(onBoardState);
  const onUserDrewRef = useRef(onUserDrew);
  onBoardStateRef.current = onBoardState;
  onUserDrewRef.current = onUserDrew;

  useEffect(() => {
    const guestId = crypto.randomUUID();

    const socket = io(SOCKET_URL, {
      auth: {
        token: token || undefined,
        guestName: guestName || 'Guest',
        guestId,
      },
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join-board', { boardId });
    });

    socket.on('disconnect', () => setConnected(false));

    socket.on('board-state', ({ canvasData }) => {
      onBoardStateRef.current?.(canvasData);
    });

    // Real-time sync: apply remote draw events without re-emitting
    socket.on('user-drew', (event: DrawEvent) => {
      onUserDrewRef.current?.(event);
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

  return { connected, cursors, onlineUsers, emitDraw, emitCursorMove, saveCanvas };
}
