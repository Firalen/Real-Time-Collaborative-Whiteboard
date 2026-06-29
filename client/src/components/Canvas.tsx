import { useRef, useState, useCallback, useEffect } from 'react';
import type { Tool, DrawEvent } from '../types';
import { useCanvas } from '../hooks/useCanvas';
import { useSocket } from '../hooks/useSocket';
import { useAuth } from '../context/AuthContext';
import Toolbar from './Toolbar';
import Cursors from './Cursors';
import Sidebar from './Sidebar';

interface CanvasProps {
  boardId: string;
  boardName: string;
}

export default function Canvas({ boardId, boardName }: CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { token, user } = useAuth();

  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleDraw = useCallback(
    (event: DrawEvent) => {
      emitDrawRef.current?.(event);
    },
    [],
  );

  const {
    undo,
    redo,
    addText,
    addStickyNote,
    loadCanvasData,
    applyRemoteObject,
    exportPNG,
    getCanvasData,
    canUndo: checkUndo,
    canRedo: checkRedo,
  } = useCanvas(containerRef, { tool, color, strokeWidth, onDraw: handleDraw });

  const emitDrawRef = useRef<(event: DrawEvent) => void>();

  const { connected, cursors, onlineUsers, emitDraw, emitCursorMove, saveCanvas } = useSocket({
    boardId,
    token,
    guestName: user?.name,
    onBoardState: (canvasData) => loadCanvasData(canvasData),
    onUserDrew: (event) => {
      if (event.object) applyRemoteObject(event.object);
    },
  });

  emitDrawRef.current = emitDraw;

  // Auto-save canvas every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const data = getCanvasData();
      if (data) saveCanvas(data);
    }, 10000);
    return () => clearInterval(interval);
  }, [getCanvasData, saveCanvas]);

  // Track cursor position for live cursors
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

  // Handle text/sticky tools on click
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

  const handleUndo = () => {
    undo();
    setCanUndo(checkUndo());
    setCanRedo(checkRedo());
  };

  const handleRedo = () => {
    redo();
    setCanUndo(checkUndo());
    setCanRedo(checkRedo());
  };

  const shareUrl = window.location.href;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="board-layout">
      <Sidebar
        boardName={boardName}
        onlineUsers={onlineUsers}
        connected={connected}
        shareUrl={shareUrl}
        onCopyLink={handleCopyLink}
        copied={copied}
      />

      <div className="canvas-area">
        <Toolbar
          tool={tool}
          color={color}
          strokeWidth={strokeWidth}
          onToolChange={setTool}
          onColorChange={setColor}
          onStrokeWidthChange={setStrokeWidth}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onExport={exportPNG}
          canUndo={canUndo}
          canRedo={canRedo}
        />

        <div ref={containerRef} className="canvas-container">
          <canvas id="whiteboard-canvas" />
          <Cursors cursors={cursors} />
        </div>
      </div>
    </div>
  );
}
