import type { CursorState } from '../types';

interface CursorsProps {
  cursors: Map<string, CursorState>;
}

export default function Cursors({ cursors }: CursorsProps) {
  return (
    <div className="cursors-overlay">
      {Array.from(cursors.values()).map((cursor) => (
        <div
          key={cursor.userId}
          className="remote-cursor"
          style={{
            left: cursor.x,
            top: cursor.y,
            '--cursor-color': cursor.avatarColor,
          } as React.CSSProperties}
        >
          <svg width="16" height="20" viewBox="0 0 16 20" fill="none">
            <path
              d="M0 0L0 16L4.5 12.5L7.5 19L10 18L7 11.5L12 11L0 0Z"
              fill={cursor.avatarColor}
              stroke="#fff"
              strokeWidth="1"
            />
          </svg>
          <div
            className="cursor-label"
            style={{ backgroundColor: cursor.avatarColor }}
          >
            <span className="cursor-avatar">
              {cursor.name.charAt(0).toUpperCase()}
            </span>
            {cursor.name}
          </div>
        </div>
      ))}
    </div>
  );
}
