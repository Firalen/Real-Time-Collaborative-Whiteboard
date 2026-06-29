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
  canUndo: boolean;
  canRedo: boolean;
}

const TOOLS: { id: Tool; label: string; icon: string }[] = [
  { id: 'select', label: 'Select', icon: '↖' },
  { id: 'pen', label: 'Pen', icon: '✏️' },
  { id: 'rectangle', label: 'Rectangle', icon: '▭' },
  { id: 'circle', label: 'Circle', icon: '○' },
  { id: 'line', label: 'Line', icon: '╱' },
  { id: 'eraser', label: 'Eraser', icon: '🧹' },
  { id: 'text', label: 'Text', icon: 'T' },
  { id: 'sticky', label: 'Sticky', icon: '📝' },
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
  canUndo,
  canRedo,
}: ToolbarProps) {
  return (
    <div className="toolbar">
      <div className="toolbar-section">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            className={`tool-btn ${tool === t.id ? 'active' : ''}`}
            onClick={() => onToolChange(t.id)}
            title={t.label}
          >
            {t.icon}
          </button>
        ))}
      </div>

      <div className="toolbar-divider" />

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

      <div className="toolbar-section">
        <label className="stroke-label">
          Size
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
        <button className="tool-btn" onClick={onUndo} disabled={!canUndo} title="Undo">
          ↩
        </button>
        <button className="tool-btn" onClick={onRedo} disabled={!canRedo} title="Redo">
          ↪
        </button>
        <button className="tool-btn" onClick={onExport} title="Export PNG">
          💾
        </button>
      </div>
    </div>
  );
}
