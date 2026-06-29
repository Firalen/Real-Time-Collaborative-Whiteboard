interface ViewportControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  gridEnabled: boolean;
  snapEnabled: boolean;
  onToggleGrid: () => void;
  onToggleSnap: () => void;
}

export default function ViewportControls({
  zoom, onZoomIn, onZoomOut, onReset,
  gridEnabled, snapEnabled, onToggleGrid, onToggleSnap,
}: ViewportControlsProps) {
  return (
    <div className="viewport-controls">
      <button type="button" className="tool-btn sm" onClick={onZoomOut} title="Zoom out">−</button>
      <span className="zoom-label">{Math.round(zoom * 100)}%</span>
      <button type="button" className="tool-btn sm" onClick={onZoomIn} title="Zoom in">+</button>
      <button type="button" className="tool-btn sm" onClick={onReset} title="Reset view">⌂</button>
      <button
        type="button"
        className={`tool-btn sm ${gridEnabled ? 'active' : ''}`}
        onClick={onToggleGrid}
        title="Toggle grid"
      >
        #
      </button>
      <button
        type="button"
        className={`tool-btn sm ${snapEnabled ? 'active' : ''}`}
        onClick={onToggleSnap}
        title="Snap to grid"
      >
        ⊞
      </button>
    </div>
  );
}
