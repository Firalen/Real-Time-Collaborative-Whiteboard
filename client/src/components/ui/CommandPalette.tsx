import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface Command {
  id: string;
  label: string;
  hint?: string;
  action: () => void;
  group: string;
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const commands = useMemo<Command[]>(() => {
    const base: Command[] = [
      { id: 'home', label: 'Go to Home', hint: 'G H', action: () => navigate('/'), group: 'Navigate' },
      { id: 'gallery', label: 'Open Gallery', action: () => navigate('/gallery'), group: 'Navigate' },
      { id: 'tasks', label: 'My Tasks', action: () => navigate('/tasks'), group: 'Navigate' },
      { id: 'login', label: 'Sign In', action: () => navigate('/login'), group: 'Account' },
    ];
    if (user) {
      base.push(
        { id: 'logout', label: 'Log Out', action: () => { logout(); navigate('/'); }, group: 'Account' },
      );
    }
    return base;
  }, [navigate, user, logout]);

  const filtered = commands.filter((c) =>
    c.label.toLowerCase().includes(query.toLowerCase()),
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
        setQuery('');
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!open) return null;

  return (
    <div className="cmd-palette-backdrop" onClick={() => setOpen(false)} role="presentation">
      <div
        className="cmd-palette glass-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Command palette"
      >
        <div className="cmd-palette__input-wrap">
          <span className="cmd-palette__icon" aria-hidden>⌘</span>
          <input
            autoFocus
            className="cmd-palette__input"
            placeholder="Search commands..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <kbd className="cmd-palette__kbd">esc</kbd>
        </div>
        <ul className="cmd-palette__list">
          {filtered.length === 0 && (
            <li className="cmd-palette__empty">No commands found</li>
          )}
          {filtered.map((cmd) => (
            <li key={cmd.id}>
              <button
                type="button"
                className="cmd-palette__item"
                onClick={() => { cmd.action(); setOpen(false); }}
              >
                <span>{cmd.label}</span>
                {cmd.hint && <kbd>{cmd.hint}</kbd>}
              </button>
            </li>
          ))}
        </ul>
        <p className="cmd-palette__footer">
          <kbd>↑↓</kbd> navigate · <kbd>↵</kbd> select · <kbd>⌘K</kbd> toggle
        </p>
      </div>
    </div>
  );
}
