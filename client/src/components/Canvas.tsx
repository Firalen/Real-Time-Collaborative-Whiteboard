import { useRef, useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { Tool, DrawEvent, Board } from '../types';
import { useCanvas } from '../hooks/useCanvas';
import { useSocket } from '../hooks/useSocket';
import { useToast } from '../hooks/useToast';
import { useBoardCollaboration } from '../hooks/useBoardCollaboration';
import { useAuth } from '../context/AuthContext';
import Toolbar from './Toolbar';
import Cursors from './Cursors';
import BoardSidebar from './board/BoardSidebar';
import LayersPanel from './canvas/LayersPanel';
import ViewportControls from './canvas/ViewportControls';
import AiPanel from './canvas/AiPanel';
import KeyboardShortcuts from './canvas/KeyboardShortcuts';
import ToastContainer from './ToastContainer';
import { useCanvasViewport } from '../hooks/useCanvasViewport';
import { useWebRTC } from '../hooks/useWebRTC';
import { useCanvasStore } from '../stores/canvasStore';
import { api } from '../utils/api';

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
  const [showShortcuts, setShowShortcuts] = useState(false);

  const canvasStore = useCanvasStore();
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
    loadCanvasData, applyRemoteObject, applyRemoteRemove, applyRemoteClear,
    exportPNG, getCanvasData, applyTaskVisuals, groupSelection, ungroupSelection,
    deleteSelection, addImage, addMindMapNodes,
    canUndo: checkUndo, canRedo: checkRedo, canvasRef: fabricCanvasRef,
  } = useCanvas(containerRef, {
    tool, color, strokeWidth, viewOnly,
    snapEnabled: canvasStore.snapEnabled,
    gridSize: canvasStore.gridSize,
    activeLayerId: canvasStore.activeLayerId,
    onDraw: handleDraw,
    onHistoryChange: updateHistoryState,
    onSelectionChange: collab.setSelectedElementId,
  });

  checkUndoRef.current = checkUndo;
  checkRedoRef.current = checkRedo;
  const { resetView, zoomIn, zoomOut, zoom } = useCanvasViewport(fabricCanvasRef);
  const emitDrawRef = useRef<(event: DrawEvent) => void>();

  const {
    connectionStatus, cursors, onlineUsers, socketRef,
    emitDraw, emitCursorMove, saveCanvas, emitChat,
  } = useSocket({
    boardId, token, guestName: user?.name, viewOnly,
    onBoardState: (canvasData) => loadCanvasData(canvasData),
    onUserDrew: (event) => {
      if (event.type === 'canvas-clear') { applyRemoteClear(); return; }
      if (event.type === 'object-removed' && event.object?.elementId) {
        applyRemoteRemove(event.object.elementId as string);
        return;
      }
      if (event.object) applyRemoteObject(event.object);
    },
    onCanvasSaved: (savedAt) => setLastSaved(savedAt),
    onError: (message) => showToast(message, 'error'),
    onCommentAdded: collab.onRemoteComment,
    onChatMessage: collab.onRemoteChat,
  });

  emitDrawRef.current = emitDraw;

  const meetingUserId = user?.id || 'guest';
  const meeting = useWebRTC(socketRef, meetingUserId, user?.name || 'Guest');

  useEffect(() => {
    if (!token) return;
    api.getLayers(token, boardId).then((layers) => canvasStore.setLayers(layers)).catch(() => {});
  }, [token, boardId, canvasStore]);

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
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'g' && !e.shiftKey) {
        e.preventDefault(); groupSelection();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'g' && e.shiftKey) {
        e.preventDefault(); ungroupSelection();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        deleteSelection();
      } else if (e.key === '?' && e.shiftKey) {
        setShowShortcuts(true);
      } else if (!e.ctrlKey && !e.metaKey && TOOL_SHORTCUTS[e.key]) {
        setTool(TOOL_SHORTCUTS[e.key]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, updateHistoryState, viewOnly, groupSelection, ungroupSelection, deleteSelection]);

  const handleImageUpload = async (file: File) => {
    if (!token || !board.workspaceId) return;
    try {
      const asset = await api.uploadAsset(token, board.workspaceId, file);
      await addImage(asset.url);
      showToast('Image added', 'success');
    } catch {
      showToast('Image upload failed', 'error');
    }
  };

  const handleAddLayer = async () => {
    if (!token) return;
    const layer = await api.createLayer(token, boardId, `Layer ${canvasStore.layers.length + 1}`);
    canvasStore.setLayers([...canvasStore.layers, layer]);
  };

  const shareUrl = window.location.href;
  const backHref = board.workspaceId ? `/workspace/${board.workspaceId}` : '/';
  const backLabel = board.workspaceId ? 'Back to workspace' : 'Back to dashboard';

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
        meeting={{
          inCall: meeting.inCall,
          localStream: meeting.localStream,
          remotePeers: meeting.remotePeers,
          muted: meeting.muted,
          videoOff: meeting.videoOff,
          error: meeting.error,
          onJoin: meeting.joinCall,
          onLeave: meeting.leaveCall,
          onToggleMute: meeting.toggleMute,
          onToggleVideo: meeting.toggleVideo,
        }}
      />

      <div className="canvas-area">
        <nav className="board-nav glass-panel" style={{ margin: '0.75rem', borderRadius: 'var(--radius-lg)', flexShrink: 0 }} aria-label="Board navigation">
          <Link to={backHref} className="board-nav__back">
            <span aria-hidden>←</span>
            {backLabel}
          </Link>
          <span className="board-nav__title">
            {board.emojiIcon || '📋'} {board.name}
          </span>
        </nav>

        {!viewOnly && (
          <div className="toolbar-float-wrap">
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
              onGroup={groupSelection}
              onUngroup={ungroupSelection}
              onImageUpload={handleImageUpload}
              onShowShortcuts={() => setShowShortcuts(true)}
              canUndo={canUndo}
              canRedo={canRedo}
            />
          </div>
        )}

        <ViewportControls
          zoom={zoom}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onReset={resetView}
          gridEnabled={canvasStore.gridEnabled}
          snapEnabled={canvasStore.snapEnabled}
          onToggleGrid={canvasStore.toggleGrid}
          onToggleSnap={canvasStore.toggleSnap}
        />

        <div className="canvas-main-row">
          {canvasStore.showLayers && !viewOnly && (
            <LayersPanel
              onAddLayer={handleAddLayer}
              onToggleVisibility={(id) => {
                const layer = canvasStore.layers.find((l) => l.id === id);
                if (layer && token) {
                  api.updateLayer(token, boardId, id, { visible: !layer.visible });
                  canvasStore.updateLayer(id, { visible: !layer.visible });
                }
              }}
              onToggleLock={(id) => {
                const layer = canvasStore.layers.find((l) => l.id === id);
                if (layer && token) {
                  api.updateLayer(token, boardId, id, { locked: !layer.locked });
                  canvasStore.updateLayer(id, { locked: !layer.locked });
                }
              }}
            />
          )}

          <div ref={containerRef} className="canvas-container">
            <canvas id="whiteboard-canvas" />
            <Cursors cursors={cursors} />
          </div>

          {!viewOnly && board.workspaceId && (
            <AiPanel
              workspaceId={board.workspaceId}
              boardId={boardId}
              token={token}
              onMindMap={(nodes) => addMindMapNodes(nodes as { nodes?: { id: string; label: string; x: number; y: number }[] })}
              onImageUrl={(url) => addImage(url)}
            />
          )}
        </div>
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      <KeyboardShortcuts open={showShortcuts} onClose={() => setShowShortcuts(false)} />
    </div>
  );
}
