import { useRef, useState, useCallback, useEffect } from 'react';
import type { Tool, DrawEvent } from '../types';
import { useCanvas } from '../hooks/useCanvas';
import { useSocket } from '../hooks/useSocket';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../context/AuthContext';
import Toolbar from './Toolbar';
import Cursors from './Cursors';
import Sidebar from './Sidebar';
import ToastContainer from './ToastContainer';

interface CanvasProps {
  boardId: string;
  boardName: string;
}

const TOOL_SHORTCUTS: Record<string, Tool> = {
  v: 'select',
  p: 'pen',
  r: 'rectangle',
  c: 'circle',
  l: 'line',
  e: 'eraser',
  t: 'text',
  s: 'sticky',
};

export default function Canvas({ boardId, boardName }: CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { token, user } = useAuth();
  const { toasts, showToast, dismissToast } = useToast();

  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [copied, setCopied] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  const updateHistoryState = useCallback(() => {
    setCanUndo(checkUndoRef.current());
    setCanRedo(checkRedoRef.current());
  }, []);

  const handleDraw = useCallback((event: DrawEvent) => {
    emitDrawRef.current?.(event);
  }, []);

  const checkUndoRef = useRef<() => boolean>(() => false);
  const checkRedoRef = useRef<() => boolean>(() => false);

  const {
    undo,
    redo,
    addText,
    addStickyNote,
    clearCanvas,
    loadCanvasData,
    applyRemoteObject,
    applyRemoteClear,
    exportPNG,
    getCanvasData,
    canUndo: checkUndo,
    canRedo: checkRedo,
  } = useCanvas(containerRef, {
    tool,
    color,
    strokeWidth,
    onDraw: handleDraw,
    onHistoryChange: updateHistoryState,
  });

  checkUndoRef.current = checkUndo;
  checkRedoRef.current = checkRedo;

  const emitDrawRef = useRef<(event: DrawEvent) => void>();

  const { connectionStatus, cursors, onlineUsers, emitDraw, emitCursorMove, saveCanvas } = useSocket({
    boardId,
    token,
    guestName: user?.name,
    onBoardState: (canvasData) => loadCanvasData(canvasData),
    onUserDrew: (event) => {
      if (event.type === 'canvas-clear') {
        applyRemoteClear();
        return;
      }
      if (event.object) applyRemoteObject(event.object);
    },
    onCanvasSaved: (savedAt) => setLastSaved(savedAt),
    onError: (message) => showToast(message, 'error'),
  });

  emitDrawRef.current = emitDraw;

  const wasConnectedRef = useRef(false);

  useEffect(() => {
    if (connectionStatus === 'reconnecting' && wasConnectedRef.current) {
      showToast('Reconnecting...', 'info');
    } else if (connectionStatus === 'connected' && wasConnectedRef.current) {
      showToast('Reconnected', 'success');
    }
    if (connectionStatus === 'connected') {
      wasConnectedRef.current = true;
    }
  }, [connectionStatus, showToast]);

  useEffect(() => {
    const interval = setInterval(() => {
      const data = getCanvasData();
      if (data) saveCanvas(data);
    }, 10000);
    return () => clearInterval(interval);
  }, [getCanvasData, saveCanvas]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      emitCursorMove(e.clientX - rect.left, e.clientY - rect.top);
    };

    container.addEventListener('mousemove', handleMouseMove);
    return () => container.removeEventListener('mousemove', handleMouseMove);
  }, [emitCursorMove]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (tool !== 'text' && tool !== 'sticky') return;

    const handleClick = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (tool === 'text') addText(x, y);
      else addStickyNote(x, y);
    };

    container.addEventListener('click', handleClick);
    return () => container.removeEventListener('click', handleClick);
  }, [tool, addText, addStickyNote]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        updateHistoryState();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
        updateHistoryState();
      } else if (!e.ctrlKey && !e.metaKey && TOOL_SHORTCUTS[e.key]) {
        setTool(TOOL_SHORTCUTS[e.key]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, updateHistoryState]);

  const handleClear = () => {
    if (confirm('Clear the entire canvas? This cannot be undone across users.')) {
      clearCanvas();
    }
  };

  const shareUrl = window.location.href;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    showToast('Link copied to clipboard', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="board-layout">
      <Sidebar
        boardName={boardName}
        onlineUsers={onlineUsers}
        connectionStatus={connectionStatus}
        shareUrl={shareUrl}
        onCopyLink={handleCopyLink}
        copied={copied}
        lastSaved={lastSaved}
      />

      <div className="canvas-area">
        <Toolbar
          tool={tool}
          color={color}
          strokeWidth={strokeWidth}
          onToolChange={setTool}
          onColorChange={setColor}
          onStrokeWidthChange={setStrokeWidth}
          onUndo={() => { undo(); updateHistoryState(); }}
          onRedo={() => { redo(); updateHistoryState(); }}
          onExport={exportPNG}
          onClear={handleClear}
          canUndo={canUndo}
          canRedo={canRedo}
        />

        <div ref={containerRef} className="canvas-container">
          <canvas id="whiteboard-canvas" />
          <Cursors cursors={cursors} />
        </div>
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
