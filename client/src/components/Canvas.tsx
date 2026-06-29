import { useRef, useState, useCallback, useEffect } from 'react';
import type { Tool, DrawEvent, Board } from '../types';
import { useCanvas } from '../hooks/useCanvas';
import { useSocket } from '../hooks/useSocket';
import { useToast } from '../hooks/useToast';
import { useBoardCollaboration } from '../hooks/useBoardCollaboration';
import { useAuth } from '../context/AuthContext';
import Toolbar from './Toolbar';
import Cursors from './Cursors';
import BoardSidebar from './board/BoardSidebar';
import ToastContainer from './ToastContainer';

interface CanvasProps {
  boardId: string;
  board: Board;
  viewOnly?: boolean;
}

const TOOL_SHORTCUTS: Record<string, Tool> = {
  v: 'select', p: 'pen', r: 'rectangle', c: 'circle',
  l: 'line', e: 'eraser', t: 'text', s: 'sticky',
};

export default function Canvas({ boardId, board, viewOnly = false }: CanvasProps) {
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

  const collab = useBoardCollaboration(boardId, token, board.workspaceId);

  const updateHistoryState = useCallback(() => {
    setCanUndo(checkUndoRef.current());
    setCanRedo(checkRedoRef.current());
  }, []);

  const handleDraw = useCallback((event: DrawEvent) => {
    if (viewOnly) return;
    emitDrawRef.current?.(event);
  }, [viewOnly]);

  const checkUndoRef = useRef<() => boolean>(() => false);
  const checkRedoRef = useRef<() => boolean>(() => false);

  const {
    undo, redo, addText, addStickyNote, clearCanvas,
    loadCanvasData, applyRemoteObject, applyRemoteClear,
    exportPNG, getCanvasData, applyTaskVisuals, canUndo: checkUndo, canRedo: checkRedo,
  } = useCanvas(containerRef, {
    tool, color, strokeWidth, viewOnly,
    onDraw: handleDraw,
    onHistoryChange: updateHistoryState,
    onSelectionChange: collab.setSelectedElementId,
  });

  checkUndoRef.current = checkUndo;
  checkRedoRef.current = checkRedo;
  const emitDrawRef = useRef<(event: DrawEvent) => void>();

  const {
    connectionStatus, cursors, onlineUsers,
    emitDraw, emitCursorMove, saveCanvas, emitChat,
  } = useSocket({
    boardId, token, guestName: user?.name, viewOnly,
    onBoardState: (canvasData) => loadCanvasData(canvasData),
    onUserDrew: (event) => {
      if (event.type === 'canvas-clear') { applyRemoteClear(); return; }
      if (event.object) applyRemoteObject(event.object);
    },
    onCanvasSaved: (savedAt) => setLastSaved(savedAt),
    onError: (message) => showToast(message, 'error'),
    onCommentAdded: collab.onRemoteComment,
    onChatMessage: collab.onRemoteChat,
  });

  emitDrawRef.current = emitDraw;

  useEffect(() => {
    if (!board.canvasData) return;
    loadCanvasData(board.canvasData);
  }, [board.canvasData, loadCanvasData]);

  useEffect(() => {
    applyTaskVisuals(collab.tasks);
  }, [collab.tasks, applyTaskVisuals]);

  useEffect(() => {
    if (viewOnly) return;
    const interval = setInterval(() => {
      const data = getCanvasData();
      if (data) saveCanvas(data);
    }, 10000);
    return () => clearInterval(interval);
  }, [viewOnly, getCanvasData, saveCanvas]);

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
    if (viewOnly) return;
    const container = containerRef.current;
    if (!container || (tool !== 'text' && tool !== 'sticky')) return;
    const handleClick = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (tool === 'text') addText(x, y);
      else addStickyNote(x, y);
    };
    container.addEventListener('click', handleClick);
    return () => container.removeEventListener('click', handleClick);
  }, [tool, addText, addStickyNote, viewOnly]);

  useEffect(() => {
    if (viewOnly) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault(); undo(); updateHistoryState();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault(); redo(); updateHistoryState();
      } else if (!e.ctrlKey && !e.metaKey && TOOL_SHORTCUTS[e.key]) {
        setTool(TOOL_SHORTCUTS[e.key]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, updateHistoryState, viewOnly]);

  const shareUrl = window.location.href;

  const handleRestoreVersion = async (versionId: string) => {
    try {
      const result = await collab.restoreVersion(versionId);
      if (result?.canvasData) {
        loadCanvasData(result.canvasData);
        showToast('Version restored', 'success');
        collab.refresh();
      }
    } catch {
      showToast('Failed to restore version', 'error');
    }
  };

  return (
    <div className="board-layout">
      <BoardSidebar
        board={board}
        onlineUsers={onlineUsers}
        connectionStatus={connectionStatus}
        lastSaved={lastSaved}
        viewOnly={viewOnly}
        comments={collab.comments}
        chatMessages={collab.chatMessages}
        tasks={collab.tasks}
        activity={collab.activity}
        versions={collab.versions}
        members={collab.members}
        selectedElementId={collab.selectedElementId}
        onAddComment={(content, mentionIds) => collab.addComment(content, mentionIds)}
        onResolveComment={collab.resolveComment}
        onSendChat={(content) => collab.sendChat(content, emitChat)}
        onCreateTask={(data) => collab.createTask(data)}
        onUpdateTask={collab.updateTaskStatus}
        onRestoreVersion={handleRestoreVersion}
        onUpdateSharing={async (data) => {
          await collab.updateSharing(data);
          showToast('Sharing settings saved', 'success');
        }}
        onCopyLink={() => {
          navigator.clipboard.writeText(shareUrl);
          setCopied(true);
          showToast('Link copied', 'success');
          setTimeout(() => setCopied(false), 2000);
        }}
        copied={copied}
        shareUrl={shareUrl}
        parseMentions={collab.parseMentions}
      />

      <div className="canvas-area">
        {!viewOnly && (
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
            onClear={() => { if (confirm('Clear canvas?')) clearCanvas(); }}
            canUndo={canUndo}
            canRedo={canRedo}
          />
        )}

        <div ref={containerRef} className="canvas-container">
          <canvas id="whiteboard-canvas" />
          <Cursors cursors={cursors} />
        </div>
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
