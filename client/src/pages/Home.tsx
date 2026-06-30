import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import AppLayout from '../components/AppLayout';
import type { Workspace } from '../types/saas';

const FEATURES = [
  {
    icon: '✏️',
    title: 'Infinite canvas',
    description: 'Draw, sketch, and brainstorm on a limitless whiteboard with pen, shapes, text, sticky notes, and images.',
  },
  {
    icon: '⚡',
    title: 'Real-time sync',
    description: 'See teammates\' cursors and edits live. Every stroke syncs instantly across all connected browsers.',
  },
  {
    icon: '👥',
    title: 'Team workspaces',
    description: 'Organize boards by workspace with roles, invitations, and shared access for your whole team.',
  },
  {
    icon: '💬',
    title: 'Comments & chat',
    description: 'Discuss ideas in-context with threaded comments, @mentions, and a built-in board chat.',
  },
  {
    icon: '✅',
    title: 'Tasks & activity',
    description: 'Turn canvas elements into tasks, track due dates, and follow everything in the activity feed.',
  },
  {
    icon: '📹',
    title: 'Video meetings',
    description: 'Jump into a WebRTC call right from the board sidebar — no extra app required.',
  },
  {
    icon: '🤖',
    title: 'AI assistant',
    description: 'Generate mind maps and images with AI to kickstart brainstorming sessions faster.',
  },
  {
    icon: '🕐',
    title: 'Version history',
    description: 'Never lose work — restore previous board snapshots whenever you need to roll back.',
  },
];

const STEPS = [
  { title: 'Create a workspace', description: 'Set up a shared space for your team or project.' },
  { title: 'Add boards', description: 'Start from blank or use templates for wireframes, retros, and more.' },
  { title: 'Collaborate live', description: 'Invite teammates, draw together, chat, and ship ideas faster.' },
];

function HomeShowcase({ loggedIn }: { loggedIn: boolean }) {
  return (
    <section className="home-showcase" aria-labelledby="home-showcase-title">
      <div className="home-showcase__hero">
        <span className="badge">Real-Time Collaborative Whiteboard</span>
        <h1 id="home-showcase-title" className="home-showcase__title">
          Your team&apos;s creative<br />command center
        </h1>
        <p className="home-showcase__lead">
          <strong style={{ color: 'var(--text)', fontWeight: 600 }}>CollabBoard</strong> brings drawing,
          planning, and communication into one place. Whether you&apos;re wireframing a product,
          running a retro, or whiteboarding with remote teammates — everyone stays in sync.
        </p>
        <div className="home-showcase__actions">
          {!loggedIn ? (
            <>
              <Link to="/login" className="btn-primary" style={{ width: 'auto', padding: '0.75rem 1.75rem' }}>
                Get started free
              </Link>
              <Link to="/gallery" className="btn-ghost">Explore gallery</Link>
            </>
          ) : (
            <a href="#dashboard" className="btn-primary" style={{ width: 'auto', padding: '0.75rem 1.75rem' }}>
              Go to your workspaces ↓
            </a>
          )}
        </div>
        <div className="feature-pills" style={{ marginTop: '1.75rem' }}>
          {['Live cursors', 'WebRTC calls', 'AI tools', 'Slack integration', 'PWA ready'].map((f) => (
            <span key={f} className="feature-pill">{f}</span>
          ))}
        </div>
      </div>

      <div className="home-features">
        {FEATURES.map((f) => (
          <article key={f.title} className="home-feature-card">
            <span className="home-feature-card__icon" aria-hidden>{f.icon}</span>
            <h3>{f.title}</h3>
            <p>{f.description}</p>
          </article>
        ))}
      </div>

      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem', letterSpacing: '-0.01em' }}>
        How it works
      </h2>
      <div className="home-steps">
        {STEPS.map((step, i) => (
          <div key={step.title} className="home-step">
            <span className="home-step__num">{i + 1}</span>
            <h4>{step.title}</h4>
            <p>{step.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function WorkspaceDashboard({
  workspaces,
  newWorkspaceName,
  setNewWorkspaceName,
  loading,
  error,
  onCreate,
}: {
  workspaces: Workspace[];
  newWorkspaceName: string;
  setNewWorkspaceName: (v: string) => void;
  loading: boolean;
  error: string;
  onCreate: (e: React.FormEvent) => void;
}) {
  return (
    <section id="dashboard" className="home-dashboard">
      <div className="home-dashboard__divider">Your dashboard</div>

      <header className="home-dashboard__header">
        <h2>Your Workspaces</h2>
        <p>Pick a workspace or create a new one to start collaborating</p>
      </header>

      <form onSubmit={onCreate} className="glass-card home-create-form">
        <input
          type="text"
          value={newWorkspaceName}
          onChange={(e) => setNewWorkspaceName(e.target.value)}
          placeholder="New workspace name..."
          className="input-field"
          required
        />
        <button type="submit" disabled={loading} className="btn-primary" style={{ width: 'auto', flexShrink: 0 }}>
          {loading ? 'Creating...' : '+ Create workspace'}
        </button>
      </form>

      {error && <p style={{ color: 'var(--danger)', fontSize: '0.875rem', marginBottom: '1rem' }}>{error}</p>}

      {workspaces.length > 0 ? (
        <div className="home-workspace-grid">
          {workspaces.map((ws) => (
            <Link
              key={ws.id}
              to={`/workspace/${ws.id}`}
              className="glass-card glass-card-interactive home-workspace-card"
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
          <p style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>No workspaces yet</p>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Create your first workspace above to get started.</p>
        </div>
      )}
    </section>
  );
}

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
      <HomeShowcase loggedIn={!!user} />
      {user && (
        <WorkspaceDashboard
          workspaces={workspaces}
          newWorkspaceName={newWorkspaceName}
          setNewWorkspaceName={setNewWorkspaceName}
          loading={loading}
          error={error}
          onCreate={handleCreateWorkspace}
        />
      )}
    </AppLayout>
  );
}
