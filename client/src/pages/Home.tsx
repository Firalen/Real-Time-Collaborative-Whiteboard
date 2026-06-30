import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import AppLayout from '../components/AppLayout';
import type { Workspace } from '../types/saas';

export default function Home() {
  const { user, token, loading: authLoading } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) return;
    api.getWorkspaces(token).then(setWorkspaces).catch(() => setError('Failed to load workspaces'));
  }, [token]);

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newWorkspaceName.trim()) return;
    setLoading(true);
    try {
      const ws = await api.createWorkspace(token, newWorkspaceName.trim());
      navigate(`/workspace/${ws.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create workspace');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="loading-page">
        <div className="badge">CollabBoard</div>
        <p>Loading your canvas...</p>
      </div>
    );
  }

  return (
    <AppLayout>
      {!user ? (
        <section className="hero-section">
          <span className="badge">Real-Time Collaborative Whiteboard</span>
          <h1>Draw together.<br />Ship ideas faster.</h1>
          <p>
            CollabBoard is your team&apos;s infinite canvas — live cursors, tasks,
            video calls, and AI tools in one beautiful workspace.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/login" className="btn-primary" style={{ width: 'auto', padding: '0.75rem 1.75rem' }}>
              Get started free
            </Link>
            <Link to="/gallery" className="btn-ghost">
              Explore gallery
            </Link>
          </div>
          <div className="feature-pills">
            {['Live sync', 'Video meetings', 'AI mind maps', 'Task boards', 'Version history'].map((f) => (
              <span key={f} className="feature-pill">{f}</span>
            ))}
          </div>
        </section>
      ) : (
        <div className="page-wrap">
          <header className="page-header">
            <h1 className="page-title">Your Workspaces</h1>
            <p className="page-subtitle">Pick a workspace or create a new one for your team</p>
          </header>

          <form onSubmit={handleCreateWorkspace} className="glass-card" style={{ padding: '1.25rem', marginBottom: '2rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <input
              type="text"
              value={newWorkspaceName}
              onChange={(e) => setNewWorkspaceName(e.target.value)}
              placeholder="New workspace name..."
              className="input-field"
              style={{ flex: 1, minWidth: '200px' }}
              required
            />
            <button type="submit" disabled={loading} className="btn-primary" style={{ width: 'auto' }}>
              {loading ? 'Creating...' : '+ Create workspace'}
            </button>
          </form>

          {error && <p style={{ color: 'var(--danger)', fontSize: '0.875rem', marginBottom: '1rem' }}>{error}</p>}

          {workspaces.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
              {workspaces.map((ws) => (
                <Link
                  key={ws.id}
                  to={`/workspace/${ws.id}`}
                  className="glass-card glass-card-interactive"
                  style={{ padding: '1.25rem', textDecoration: 'none', color: 'inherit', display: 'block' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <div className="workspace-avatar">{ws.name.charAt(0).toUpperCase()}</div>
                    <div>
                      <h3 style={{ fontWeight: 600, fontSize: '1rem' }}>{ws.name}</h3>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'capitalize', marginTop: '0.15rem' }}>
                        {ws.role} workspace
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-muted)' }}>No workspaces yet. Create your first one above!</p>
            </div>
          )}
        </div>
      )}
    </AppLayout>
  );
}
