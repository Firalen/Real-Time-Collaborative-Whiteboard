import type { OnlineUser } from '../types';
import type { ConnectionStatus } from '../hooks/useSocket';

interface SidebarProps {
  boardName: string;
  onlineUsers: OnlineUser[];
  connectionStatus: ConnectionStatus;
  shareUrl: string;
  onCopyLink: () => void;
  copied: boolean;
  lastSaved: string | null;
}

const STATUS_LABELS: Record<ConnectionStatus, string> = {
  connected: 'Connected',
  disconnected: 'Disconnected',
  reconnecting: 'Reconnecting...',
};

export default function Sidebar({
  boardName,
  onlineUsers,
  connectionStatus,
  shareUrl,
  onCopyLink,
  copied,
  lastSaved,
}: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>{boardName}</h2>
        <span
          className={`status-dot ${connectionStatus === 'connected' ? 'online' : connectionStatus === 'reconnecting' ? 'reconnecting' : 'offline'}`}
          title={STATUS_LABELS[connectionStatus]}
        />
      </div>

      <div className="sidebar-section">
        <p className="connection-label">{STATUS_LABELS[connectionStatus]}</p>
        {lastSaved && (
          <p className="save-label">
            Saved {new Date(lastSaved).toLocaleTimeString()}
          </p>
        )}
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
