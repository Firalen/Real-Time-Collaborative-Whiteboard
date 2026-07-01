import { useEffect, useRef, useState, useMemo } from 'react';
import type { ChatMessage } from '../../types/saas';
import LiveDot from '../ui/LiveDot';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '🎉', '🔥', '👀'];

interface FloatingChatDockProps {
  messages: ChatMessage[];
  viewOnly?: boolean;
  onlineCount: number;
  currentUserId?: string;
  onSend: (content: string, parentId?: string) => void;
  onReact: (messageId: string, emoji: string) => void;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function ReactionBar({
  reactions,
  currentUserId,
  onReact,
}: {
  reactions: Record<string, string[]>;
  currentUserId?: string;
  onReact: (emoji: string) => void;
}) {
  const entries = Object.entries(reactions || {}).filter(([, users]) => users.length > 0);
  if (entries.length === 0) return null;

  return (
    <div className="chat-dock__reactions">
      {entries.map(([emoji, users]) => (
        <button
          key={emoji}
          type="button"
          className={`chat-dock__reaction-pill${currentUserId && users.includes(currentUserId) ? ' chat-dock__reaction-pill--active' : ''}`}
          onClick={() => onReact(emoji)}
          title={`${users.length} reaction${users.length === 1 ? '' : 's'}`}
        >
          {emoji} <span>{users.length}</span>
        </button>
      ))}
    </div>
  );
}

function MessageBubble({
  message,
  replies,
  currentUserId,
  viewOnly,
  onReply,
  onOpenThread,
  onReact,
}: {
  message: ChatMessage;
  replies: ChatMessage[];
  currentUserId?: string;
  viewOnly?: boolean;
  onReply: () => void;
  onOpenThread: () => void;
  onReact: (emoji: string) => void;
}) {
  const [showPicker, setShowPicker] = useState(false);

  return (
    <article className="chat-dock__message">
      <div
        className="chat-dock__avatar"
        style={{ backgroundColor: message.avatarColor || '#6366f1' }}
      >
        {(message.userName || '?').charAt(0).toUpperCase()}
      </div>
      <div className="chat-dock__bubble-wrap">
        <header className="chat-dock__meta">
          <span className="chat-dock__author" style={{ color: message.avatarColor || '#a78bfa' }}>
            {message.userName || 'User'}
          </span>
          <time>{formatTime(message.createdAt)}</time>
        </header>
        <p className="chat-dock__content">{message.content}</p>
        <ReactionBar
          reactions={message.reactions || {}}
          currentUserId={currentUserId}
          onReact={onReact}
        />
        <div className="chat-dock__actions">
          {!viewOnly && (
            <>
              <button type="button" className="chat-dock__action" onClick={() => setShowPicker((v) => !v)}>
                React
              </button>
              <button type="button" className="chat-dock__action" onClick={onReply}>
                Reply
              </button>
            </>
          )}
          {replies.length > 0 && (
            <button type="button" className="chat-dock__action chat-dock__action--thread" onClick={onOpenThread}>
              {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
            </button>
          )}
        </div>
        {showPicker && !viewOnly && (
          <div className="chat-dock__emoji-picker">
            {QUICK_REACTIONS.map((emoji) => (
              <button key={emoji} type="button" onClick={() => { onReact(emoji); setShowPicker(false); }}>
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

export default function FloatingChatDock({
  messages,
  viewOnly = false,
  onlineCount,
  currentUserId,
  onSend,
  onReact,
}: FloatingChatDockProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [threadId, setThreadId] = useState<string | null>(null);
  const [lastSeenCount, setLastSeenCount] = useState(messages.length);
  const listRef = useRef<HTMLDivElement>(null);

  const rootMessages = useMemo(
    () => messages.filter((m) => !m.parentId),
    [messages],
  );

  const repliesByParent = useMemo(() => {
    const map = new Map<string, ChatMessage[]>();
    messages.forEach((m) => {
      if (!m.parentId) return;
      const list = map.get(m.parentId) || [];
      list.push(m);
      map.set(m.parentId, list);
    });
    return map;
  }, [messages]);

  const threadParent = threadId ? messages.find((m) => m.id === threadId) : null;
  const threadReplies = threadId ? repliesByParent.get(threadId) || [] : [];
  const unread = !open && messages.length > lastSeenCount ? messages.length - lastSeenCount : 0;

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, open, threadId]);

  useEffect(() => {
    if (open) setLastSeenCount(messages.length);
  }, [open, messages.length]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || viewOnly) return;
    onSend(draft.trim(), threadId || undefined);
    setDraft('');
  };

  return (
    <div className={`chat-dock${open ? ' chat-dock--open' : ''}`}>
      {open && (
        <div className="chat-dock__panel glass-panel glass-panel--glow">
          <header className="chat-dock__header">
            {threadId ? (
              <button type="button" className="chat-dock__back" onClick={() => setThreadId(null)}>
                ← Back
              </button>
            ) : (
              <div className="chat-dock__title-wrap">
                <h3>Board chat</h3>
                <LiveDot label={`${onlineCount} online`} pulse size="sm" />
              </div>
            )}
            <button
              type="button"
              className="chat-dock__minimize"
              onClick={() => { setOpen(false); setThreadId(null); }}
              aria-label="Minimize chat"
            >
              −
            </button>
          </header>

          <div className="chat-dock__messages" ref={listRef}>
            {threadId && threadParent && (
              <div className="chat-dock__thread-parent">
                <MessageBubble
                  message={threadParent}
                  replies={[]}
                  currentUserId={currentUserId}
                  viewOnly={viewOnly}
                  onReply={() => {}}
                  onOpenThread={() => {}}
                  onReact={(emoji) => onReact(threadParent.id, emoji)}
                />
              </div>
            )}

            {threadId ? (
              threadReplies.length === 0 ? (
                <p className="chat-dock__empty">No replies yet — be the first.</p>
              ) : (
                threadReplies.map((m) => (
                  <MessageBubble
                    key={m.id}
                    message={m}
                    replies={[]}
                    currentUserId={currentUserId}
                    viewOnly={viewOnly}
                    onReply={() => setThreadId(m.parentId || m.id)}
                    onOpenThread={() => {}}
                    onReact={(emoji) => onReact(m.id, emoji)}
                  />
                ))
              )
            ) : rootMessages.length === 0 ? (
              <p className="chat-dock__empty">Start the conversation — say hello to your team.</p>
            ) : (
              rootMessages.map((m) => (
                <MessageBubble
                  key={m.id}
                  message={m}
                  replies={repliesByParent.get(m.id) || []}
                  currentUserId={currentUserId}
                  viewOnly={viewOnly}
                  onReply={() => setThreadId(m.id)}
                  onOpenThread={() => setThreadId(m.id)}
                  onReact={(emoji) => onReact(m.id, emoji)}
                />
              ))
            )}
          </div>

          {!viewOnly ? (
            <form className="chat-dock__composer" onSubmit={handleSubmit}>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={threadId ? 'Reply in thread...' : 'Message the board...'}
                className="chat-dock__input"
              />
              <button type="submit" className="btn-primary btn-gradient chat-dock__send" disabled={!draft.trim()}>
                Send
              </button>
            </form>
          ) : (
            <p className="chat-dock__view-only">Sign in to chat with the team</p>
          )}
        </div>
      )}

      <button
        type="button"
        className="chat-dock__toggle btn-gradient"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? 'Close chat' : 'Open chat'}
      >
        <span className="chat-dock__toggle-icon">💬</span>
        {unread > 0 && <span className="chat-dock__badge">{unread > 9 ? '9+' : unread}</span>}
        {!open && onlineCount > 0 && <span className="chat-dock__live-ring" aria-hidden />}
      </button>
    </div>
  );
}
