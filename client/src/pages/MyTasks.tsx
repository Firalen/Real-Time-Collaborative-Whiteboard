import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import AppLayout from '../components/AppLayout';
import { googleCalendarUrl } from '../utils/calendar';
import type { Task } from '../types/saas';

const PRIORITY_COLORS: Record<string, string> = {
  low: 'var(--text-muted)',
  medium: '#60a5fa',
  high: '#fb923c',
  urgent: '#f87171',
};

export default function MyTasks() {
  const { token } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    api.getMyTasks(token)
      .then(setTasks)
      .finally(() => setLoading(false));
  }, [token]);

  const handleStatusChange = async (taskId: string, status: string) => {
    if (!token) return;
    const updated = await api.updateTask(token, taskId, { status: status as Task['status'] });
    setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
  };

  return (
    <AppLayout>
      <div className="page-wrap">
        <header className="page-header">
          <span className="badge">Productivity</span>
          <h1 className="page-title" style={{ marginTop: '0.5rem' }}>My Tasks</h1>
          <p className="page-subtitle">Tasks assigned to you across all CollabBoard workspaces</p>
        </header>

        {loading && <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '3rem' }}>Loading tasks...</p>}

        {!loading && tasks.length === 0 && (
          <div className="glass-card" style={{ padding: '4rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)' }}>No tasks assigned to you yet.</p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {tasks.map((task) => (
            <div key={task.id} className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.25rem' }}>
              <input
                type="checkbox"
                checked={task.status === 'done'}
                onChange={(e) => handleStatusChange(task.id, e.target.checked ? 'done' : 'todo')}
                style={{ width: '1.1rem', height: '1.1rem', accentColor: '#8b5cf6', cursor: 'pointer' }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 500, fontSize: '0.95rem', ...(task.status === 'done' ? { textDecoration: 'line-through', color: 'var(--text-muted)' } : {}) }}>
                  {task.title}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
                  {task.boardName && (
                    <Link to={`/board/${task.boardId}`} style={{ fontSize: '0.75rem', color: '#a78bfa', textDecoration: 'none' }}>
                      {task.emojiIcon} {task.boardName}
                    </Link>
                  )}
                  {task.dueDate && (
                    <>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Due {new Date(task.dueDate).toLocaleDateString()}
                      </span>
                      <a
                        href={googleCalendarUrl(task.title, task.dueDate, task.description)}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: '0.75rem', color: '#a78bfa' }}
                      >
                        Add to Calendar
                      </a>
                    </>
                  )}
                  <span style={{ fontSize: '0.75rem', textTransform: 'capitalize', color: PRIORITY_COLORS[task.priority] }}>
                    {task.priority}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
