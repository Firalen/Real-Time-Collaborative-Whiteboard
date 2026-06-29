import { useState } from 'react';
import { googleCalendarUrl } from '../../utils/calendar';
import type { OnlineUser, Board } from '../../types';
import type { ConnectionStatus } from '../../hooks/useSocket';
import type { Comment, ChatMessage, Task, ActivityItem, BoardVersion, WorkspaceMember } from '../../types/saas';

import MeetingPanel from './MeetingPanel';
import type { RemotePeer } from '../../hooks/useWebRTC';

export type SidebarTab = 'share' | 'chat' | 'comments' | 'tasks' | 'activity' | 'history' | 'meeting';

interface BoardSidebarProps {
  board: Board;
  onlineUsers: OnlineUser[];
  connectionStatus: ConnectionStatus;
  lastSaved: string | null;
  viewOnly: boolean;
  comments: Comment[];
  chatMessages: ChatMessage[];
  tasks: Task[];
  activity: ActivityItem[];
  versions: BoardVersion[];
  members: WorkspaceMember[];
  selectedElementId: string | null;
  onAddComment: (content: string, mentionIds: string[]) => void;
  onResolveComment: (id: string) => void;
  onSendChat: (content: string) => void;
  onCreateTask: (data: { title: string; elementId?: string; assignedTo?: string; dueDate?: string }) => void;
  onUpdateTask: (id: string, status: Task['status']) => void;
  onRestoreVersion: (versionId: string) => void;
  onUpdateSharing: (data: { visibility?: string; allowGuestView?: boolean; allowExport?: boolean; password?: string }) => void;
  onCopyLink: () => void;
  copied: boolean;
  shareUrl: string;
  parseMentions: (text: string) => string[];
  meeting: {
    inCall: boolean;
    localStream: MediaStream | null;
    remotePeers: RemotePeer[];
    muted: boolean;
    videoOff: boolean;
    error: string | null;
    onJoin: () => void;
    onLeave: () => void;
    onToggleMute: () => void;
    onToggleVideo: () => void;
  };
}

const TABS: { id: SidebarTab; label: string; icon: string }[] = [
  { id: 'share', label: 'Share', icon: '🔗' },
  { id: 'chat', label: 'Chat', icon: '💬' },
  { id: 'comments', label: 'Comments', icon: '🗨️' },
  { id: 'tasks', label: 'Tasks', icon: '✅' },
  { id: 'activity', label: 'Activity', icon: '📋' },
  { id: 'meeting', label: 'Meeting', icon: '📹' },
  { id: 'history', label: 'History', icon: '🕐' },
];

export default function BoardSidebar(props: BoardSidebarProps) {
  const [tab, setTab] = useState<SidebarTab>('share');
  const [commentText, setCommentText] = useState('');
  const [chatText, setChatText] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [taskDue, setTaskDue] = useState('');
  const [visibility, setVisibility] = useState(props.board.visibility || 'workspace');
  const [boardPassword, setBoardPassword] = useState('');
  const [allowGuest, setAllowGuest] = useState(props.board.allowGuestView ?? true);
  const [allowExport, setAllowExport] = useState(props.board.allowExport ?? true);

  const rootComments = props.comments.filter((c) => !c.parentId);
  const replies = (parentId: string) => props.comments.filter((c) => c.parentId === parentId);

  const handleComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    props.onAddComment(commentText.trim(), props.parseMentions(commentText));
    setCommentText('');
  };

  const handleChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatText.trim()) return;
    props.onSendChat(chatText.trim());
    setChatText('');
  };

  const handleTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    props.onCreateTask({
      title: taskTitle.trim(),
      elementId: props.selectedElementId || undefined,
      assignedTo: taskAssignee || undefined,
      dueDate: taskDue || undefined,
    });
    setTaskTitle('');
    setTaskAssignee('');
    setTaskDue('');
  };

  const saveSharing = () => {
    props.onUpdateSharing({
      visibility,
      allowGuestView: allowGuest,
      allowExport,
      password: boardPassword || undefined,
    });
    setBoardPassword('');
  };

  return (
    <aside className="board-sidebar">
      <div className="sidebar-header">
        <h2>{props.board.emojiIcon || '📋'} {props.board.name}</h2>
        <span className={`status-dot ${props.connectionStatus === 'connected' ? 'online' : props.connectionStatus === 'reconnecting' ? 'reconnecting' : 'offline'}`} />
      </div>

      {props.viewOnly && (
        <div className="view-only-badge">View only — editing disabled</div>
      )}

      {props.lastSaved && (
        <p className="save-label">Saved {new Date(props.lastSaved).toLocaleTimeString()}</p>
      )}

      <div className="sidebar-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`sidebar-tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
            title={t.label}
          >
            {t.icon}
          </button>
        ))}
      </div>

      <div className="sidebar-panel">
        {tab === 'share' && (
          <div className="panel-content">
            <h3>Share link</h3>
            <div className="share-box">
              <input readOnly value={props.shareUrl} />
              <button onClick={props.onCopyLink}>{props.copied ? 'Copied!' : 'Copy'}</button>
            </div>

            {!props.viewOnly && (
              <>
                <h3 className="mt-4">Permissions</h3>
                <label className="field-label">
                  Visibility
                  <select value={visibility} onChange={(e) => setVisibility(e.target.value)} className="sidebar-select">
                    <option value="private">Private</option>
                    <option value="workspace">Workspace</option>
                    <option value="public">Public (view only)</option>
                  </select>
                </label>
                <label className="checkbox-label">
                  <input type="checkbox" checked={allowGuest} onChange={(e) => setAllowGuest(e.target.checked)} />
                  Allow guest view
                </label>
                <label className="checkbox-label">
                  <input type="checkbox" checked={allowExport} onChange={(e) => setAllowExport(e.target.checked)} />
                  Allow export
                </label>
                <label className="field-label">
                  Password (optional)
                  <input
                    type="password"
                    value={boardPassword}
                    onChange={(e) => setBoardPassword(e.target.value)}
                    placeholder={props.board.hasPassword ? 'Set new password...' : 'No password'}
                  />
                </label>
                <button className="panel-btn" onClick={saveSharing}>Save settings</button>
              </>
            )}

            <h3 className="mt-4">Online ({props.onlineUsers.length})</h3>
            <ul className="user-list">
              {props.onlineUsers.map((u) => (
                <li key={u.userId}>
                  <span className="user-avatar" style={{ backgroundColor: u.avatarColor }}>
                    {u.name.charAt(0)}
                  </span>
                  {u.name}
                </li>
              ))}
            </ul>
          </div>
        )}

        {tab === 'chat' && (
          <div className="panel-content panel-scroll">
            <div className="chat-messages">
              {props.chatMessages.map((m) => (
                <div key={m.id} className="chat-bubble">
                  <span className="chat-author" style={{ color: m.avatarColor || '#818cf8' }}>{m.userName}</span>
                  <p>{m.content}</p>
                </div>
              ))}
            </div>
            {!props.viewOnly && (
              <form onSubmit={handleChat} className="panel-form">
                <input value={chatText} onChange={(e) => setChatText(e.target.value)} placeholder="Message..." />
                <button type="submit">Send</button>
              </form>
            )}
          </div>
        )}

        {tab === 'comments' && (
          <div className="panel-content panel-scroll">
            {props.selectedElementId && (
              <p className="element-hint">Commenting on selected element</p>
            )}
            {rootComments.map((c) => (
              <div key={c.id} className={`comment-thread ${c.resolved ? 'resolved' : ''}`}>
                <div className="comment-header">
                  <span className="user-avatar sm" style={{ backgroundColor: c.avatarColor || '#6366f1' }}>
                    {(c.userName || '?').charAt(0)}
                  </span>
                  <strong>{c.userName}</strong>
                  {c.resolved && <span className="resolved-tag">Resolved</span>}
                </div>
                <p>{c.content}</p>
                {replies(c.id).map((r) => (
                  <div key={r.id} className="comment-reply">
                    <strong>{r.userName}</strong>: {r.content}
                  </div>
                ))}
                {!props.viewOnly && (
                  <button className="link-btn" onClick={() => props.onResolveComment(c.id)}>
                    {c.resolved ? 'Unresolve' : 'Resolve'}
                  </button>
                )}
              </div>
            ))}
            {!props.viewOnly && (
              <form onSubmit={handleComment} className="panel-form">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add comment... Use @name to mention"
                  rows={2}
                />
                <button type="submit">Post</button>
              </form>
            )}
          </div>
        )}

        {tab === 'tasks' && (
          <div className="panel-content panel-scroll">
            {props.tasks.map((t) => (
              <div key={t.id} className={`task-item ${t.status === 'done' ? 'done' : ''}`}>
                <input
                  type="checkbox"
                  checked={t.status === 'done'}
                  onChange={() => props.onUpdateTask(t.id, t.status === 'done' ? 'todo' : 'done')}
                  disabled={props.viewOnly}
                />
                <div>
                  <p className="task-title">{t.title}</p>
                  {t.assigneeName && <span className="task-meta">@{t.assigneeName}</span>}
                  {t.dueDate && (
                    <>
                      <span className="task-meta">Due {new Date(t.dueDate).toLocaleDateString()}</span>
                      <a
                        href={googleCalendarUrl(t.title, t.dueDate, t.description)}
                        target="_blank"
                        rel="noreferrer"
                        className="link-btn"
                      >
                        Add to Calendar
                      </a>
                    </>
                  )}
                  {t.elementId && <span className="task-meta">📌 On canvas</span>}
                </div>
              </div>
            ))}
            {!props.viewOnly && (
              <form onSubmit={handleTask} className="panel-form task-form">
                {props.selectedElementId && (
                  <p className="task-meta">📌 Task will link to selected canvas element</p>
                )}
                <input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="Task title..." required />
                <select value={taskAssignee} onChange={(e) => setTaskAssignee(e.target.value)} className="sidebar-select">
                  <option value="">Unassigned</option>
                  {props.members.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
                <input type="date" value={taskDue} onChange={(e) => setTaskDue(e.target.value)} />
                <button type="submit">Add task</button>
              </form>
            )}
          </div>
        )}

        {tab === 'activity' && (
          <div className="panel-content panel-scroll">
            {props.activity.map((a) => (
              <div key={a.id} className="activity-item">
                <span className="user-avatar sm" style={{ backgroundColor: a.avatarColor || '#6366f1' }}>
                  {(a.userName || '?').charAt(0)}
                </span>
                <div>
                  <p><strong>{a.userName || 'System'}</strong> {a.action.replace('.', ' ')}</p>
                  <span className="task-meta">{new Date(a.createdAt).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'history' && (
          <div className="panel-content panel-scroll">
            {props.versions.map((v) => (
              <div key={v.id} className="version-item">
                <div>
                  <p>{v.label || 'Auto-save'}</p>
                  <span className="task-meta">{new Date(v.created_at).toLocaleString()}</span>
                </div>
                {!props.viewOnly && (
                  <button className="link-btn" onClick={() => props.onRestoreVersion(v.id)}>
                    Restore
                  </button>
                )}
              </div>
            ))}
            {props.versions.length === 0 && <p className="text-gray-500 text-sm">No versions yet</p>}
          </div>
        )}

        {tab === 'meeting' && (
          <MeetingPanel
            inCall={props.meeting.inCall}
            localStream={props.meeting.localStream}
            remotePeers={props.meeting.remotePeers}
            muted={props.meeting.muted}
            videoOff={props.meeting.videoOff}
            error={props.meeting.error}
            onlineCount={props.onlineUsers.length}
            onJoin={props.meeting.onJoin}
            onLeave={props.meeting.onLeave}
            onToggleMute={props.meeting.onToggleMute}
            onToggleVideo={props.meeting.onToggleVideo}
            viewOnly={props.viewOnly}
          />
        )}
      </div>
    </aside>
  );
}
