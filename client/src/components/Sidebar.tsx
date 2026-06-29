import type { OnlineUser } from '../types';

interface SidebarProps {
  boardName: string;
  onlineUsers: OnlineUser[];
  connected: boolean;
  shareUrl: string;
  onCopyLink: () => void;
  copied: boolean;
}

export default function Sidebar({
  boardName,
  onlineUsers,
  connected,
  shareUrl,
  onCopyLink,
  copied,
}: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>{boardName}</h2>
        <span className={`status-dot ${connected ? 'online' : 'offline'}`} />
      </div>

      <div className="sidebar-section">
        <h3>Share</h3>
        <div className="share-box">
          <input type="text" readOnly value={shareUrl} />
          <button onClick={onCopyLink}>{copied ? 'Copied!' : 'Copy'}</button>
        </div>
      </div>

      <div className="sidebar-section">
        <h3>Online ({onlineUsers.length})</h3>
        <ul className="user-list">
          {onlineUsers.map((user) => (
            <li key={user.userId}>
              <span
                className="user-avatar"
                style={{ backgroundColor: user.avatarColor }}
              >
                {user.name.charAt(0).toUpperCase()}
              </span>
              {user.name}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
