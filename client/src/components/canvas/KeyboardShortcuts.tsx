const SHORTCUTS = [
  { keys: 'V', action: 'Select tool' },
  { keys: 'P', action: 'Pen' },
  { keys: 'E', action: 'Eraser' },
  { keys: 'R', action: 'Rectangle' },
  { keys: 'C', action: 'Circle' },
  { keys: 'L', action: 'Line' },
  { keys: 'T', action: 'Text' },
  { keys: 'S', action: 'Sticky note' },
  { keys: 'Ctrl+Z', action: 'Undo' },
  { keys: 'Ctrl+Y', action: 'Redo' },
  { keys: 'Ctrl+G', action: 'Group selection' },
  { keys: 'Ctrl+Shift+G', action: 'Ungroup' },
  { keys: 'Alt+Drag', action: 'Pan canvas' },
  { keys: 'Scroll', action: 'Zoom in/out' },
  { keys: 'Del', action: 'Delete selection' },
];

interface KeyboardShortcutsProps {
  open: boolean;
  onClose: () => void;
}

export default function KeyboardShortcuts({ open, onClose }: KeyboardShortcutsProps) {
  if (!open) return null;
  return (
    <div className="shortcuts-overlay" onClick={onClose}>
      <div className="shortcuts-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Keyboard shortcuts</h2>
        <table>
          <tbody>
            {SHORTCUTS.map((s) => (
              <tr key={s.keys}>
                <td><kbd>{s.keys}</kbd></td>
                <td>{s.action}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <button type="button" className="panel-btn" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
