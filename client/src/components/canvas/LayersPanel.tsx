import { useCanvasStore } from '../../stores/canvasStore';

interface LayersPanelProps {
  onAddLayer: () => void;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
}

export default function LayersPanel({ onAddLayer, onToggleVisibility, onToggleLock }: LayersPanelProps) {
  const { layers, activeLayerId, setActiveLayerId } = useCanvasStore();

  return (
    <div className="layers-panel">
      <div className="layers-header">
        <h3>Layers</h3>
        <button type="button" className="panel-btn sm" onClick={onAddLayer}>+</button>
      </div>
      <ul className="layers-list">
        {layers.map((layer) => (
          <li
            key={layer.id}
            className={`layer-item ${activeLayerId === layer.id ? 'active' : ''}`}
            onClick={() => setActiveLayerId(layer.id)}
          >
            <button
              type="button"
              className="layer-toggle"
              onClick={(e) => { e.stopPropagation(); onToggleVisibility(layer.id); }}
              title={layer.visible ? 'Hide' : 'Show'}
            >
              {layer.visible ? '👁' : '🚫'}
            </button>
            <span className="layer-name">{layer.name}</span>
            <button
              type="button"
              className="layer-toggle"
              onClick={(e) => { e.stopPropagation(); onToggleLock(layer.id); }}
              title={layer.locked ? 'Unlock' : 'Lock'}
            >
              {layer.locked ? '🔒' : '🔓'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
