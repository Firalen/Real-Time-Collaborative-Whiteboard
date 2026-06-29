import type { Tool } from '../types';

interface ToolbarProps {
  tool: Tool;
  color: string;
  strokeWidth: number;
  onToolChange: (tool: Tool) => void;
  onColorChange: (color: string) => void;
  onStrokeWidthChange: (width: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onExport: () => void;
  onClear: () => void;
  onGroup: () => void;
  onUngroup: () => void;
  onImageUpload: (file: File) => void;
  onShowShortcuts: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const TOOLS: { id: Tool; label: string; icon: string; shortcut?: string }[] = [
  { id: 'select', label: 'Select', icon: '↖', shortcut: 'V' },
  { id: 'pen', label: 'Pen', icon: '✏️', shortcut: 'P' },
  { id: 'rectangle', label: 'Rectangle', icon: '▭', shortcut: 'R' },
  { id: 'circle', label: 'Circle', icon: '○', shortcut: 'C' },
  { id: 'line', label: 'Line', icon: '╱', shortcut: 'L' },
  { id: 'eraser', label: 'Eraser', icon: '🧹', shortcut: 'E' },
  { id: 'text', label: 'Text', icon: 'T', shortcut: 'T' },
  { id: 'sticky', label: 'Sticky', icon: '📝', shortcut: 'S' },
];

const COLORS = [
  '#000000', '#ef4444', '#f59e0b', '#10b981',
  '#3b82f6', '#8b5cf6', '#ec4899', '#ffffff',
];

export default function Toolbar({
  tool,
  color,
  strokeWidth,
  onToolChange,
  onColorChange,
  onStrokeWidthChange,
  onUndo,
  onRedo,
  onExport,
  onClear,
  onGroup,
  onUngroup,
  onImageUpload,
  onShowShortcuts,
  canUndo,
  canRedo,
}: ToolbarProps) {
  return (
    <div className="toolbar">
      <div className="toolbar-section tools-primary">
        {TOOLS.filter((t) => ['select', 'pen', 'eraser'].includes(t.id)).map((t) => (
          <button
            key={t.id}
            className={`tool-btn ${tool === t.id ? 'active' : ''} ${t.id === 'eraser' ? 'eraser-btn' : ''}`}
            onClick={() => onToolChange(t.id)}
            title={`${t.label}${t.shortcut ? ` (${t.shortcut})` : ''}`}
          >
            {t.icon}
          </button>
        ))}
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-section tools-shapes">
        {TOOLS.filter((t) => ['rectangle', 'circle', 'line', 'text', 'sticky'].includes(t.id)).map((t) => (
          <button
            key={t.id}
            className={`tool-btn ${tool === t.id ? 'active' : ''}`}
            onClick={() => onToolChange(t.id)}
            title={`${t.label}${t.shortcut ? ` (${t.shortcut})` : ''}`}
          >
            {t.icon}
          </button>
        ))}
      </div>

      <div className="toolbar-divider" />

      {tool !== 'eraser' && (
        <>
      <div className="toolbar-section colors">
        {COLORS.map((c) => (
          <button
            key={c}
            className={`color-btn ${color === c ? 'active' : ''}`}
            style={{ backgroundColor: c, border: c === '#ffffff' ? '1px solid #ccc' : 'none' }}
            onClick={() => onColorChange(c)}
            title={c}
          />
        ))}
        <input
          type="color"
          value={color}
          onChange={(e) => onColorChange(e.target.value)}
          className="color-picker"
          title="Custom color"
        />
      </div>

      <div className="toolbar-divider" />
        </>
      )}

      <div className="toolbar-section">
        <label className="stroke-label">
          {tool === 'eraser' ? 'Eraser' : 'Size'}
          <input
            type="range"
            min={1}
            max={30}
            value={strokeWidth}
            onChange={(e) => onStrokeWidthChange(Number(e.target.value))}
          />
          <span>{strokeWidth}</span>
        </label>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-section">
        <button className="tool-btn" onClick={onGroup} title="Group (Ctrl+G)">⊞</button>
        <button className="tool-btn" onClick={onUngroup} title="Ungroup (Ctrl+Shift+G)">⊟</button>
        <label className="tool-btn image-upload" title="Upload image">
          🖼
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onImageUpload(file);
              e.target.value = '';
            }}
          />
        </label>
        <button className="tool-btn" onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)">
          ↩
        </button>
        <button className="tool-btn" onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Y)">
          ↪
        </button>
        <button className="tool-btn" onClick={onExport} title="Export PNG">
          💾
        </button>
        <button className="tool-btn" onClick={onClear} title="Clear canvas">
          🗑️
        </button>
        <button className="tool-btn" onClick={onShowShortcuts} title="Shortcuts (?)">
          ⌨
        </button>
      </div>
    </div>
  );
}
