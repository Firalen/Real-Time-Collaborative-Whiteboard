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
    description: 'Pen, shapes, text, sticky notes, images — sketch without limits on a boundless whiteboard.',
    wide: true,
  },
  {
    icon: '⚡',
    title: 'Real-time sync',
    description: 'Live cursors and instant stroke sync across every browser.',
    wide: true,
  },
  {
    icon: '👥',
    title: 'Workspaces',
    description: 'Roles, invites, and shared access for your team.',
  },
  {
    icon: '💬',
    title: 'Comments & chat',
    description: 'Threaded comments, @mentions, and board chat.',
  },
  {
    icon: '✅',
    title: 'Tasks',
    description: 'Turn ideas into tasks with due dates and assignees.',
  },
  {
    icon: '📹',
    title: 'Video calls',
    description: 'WebRTC meetings built into every board.',
  },
  {
    icon: '🤖',
    title: 'AI tools',
    description: 'Generate mind maps and images to brainstorm faster.',
  },
  {
    icon: '🕐',
    title: 'History',
    description: 'Restore any previous version in one click.',
  },
];

const STEPS = [
  { title: 'Create workspace', description: 'Spin up a shared home for your team or project in seconds.' },
  { title: 'Add boards', description: 'Blank canvas or templates — wireframes, retros, mind maps.' },
  { title: 'Collaborate live', description: 'Draw, chat, call, and ship ideas together in real time.' },
];

function HeroVisual() {
  return (
    <div className="home-hero__visual" aria-hidden>
      <div className="home-mock-board">
        <div className="home-mock-board__toolbar">
          <span className="home-mock-board__dot" />
          <span className="home-mock-board__dot" />
          <span className="home-mock-board__dot" />
        </div>
        <div className="home-mock-board__canvas">
          <div className="home-mock-sticky home-mock-sticky--yellow">Ship v2 🚀</div>
          <div className="home-mock-sticky home-mock-sticky--pink">Ideas</div>
          <div className="home-mock-stroke home-mock-stroke--1" />
          <div className="home-mock-stroke home-mock-stroke--2" />
          <div className="home-mock-cursor home-mock-cursor--1">Alex</div>
          <div className="home-mock-cursor home-mock-cursor--2">Sam</div>
        </div>
      </div>
      <div className="home-mock-float-card home-mock-float-card--live">
        <strong>● 3 online</strong>
        Syncing live
      </div>
    </div>
  );
}

function HomeShowcase({ loggedIn }: { loggedIn: boolean }) {
  return (
    <div className="home-page">
      <section className="home-showcase" aria-labelledby="home-hero-title">
        <div className="home-hero">
          <div className="home-hero__glow home-hero__glow--purple" />
          <div className="home-hero__glow home-hero__glow--cyan" />

          <div className="home-hero__copy">
            <div className="home-hero__eyebrow">
              <span className="home-hero__eyebrow-dot" />
              Real-Time Collaborative Whiteboard
            </div>

            <h1 id="home-hero-title" className="home-hero__title">
              <span className="home-hero__title-line">Think bigger.</span>
              <span className="home-hero__title-accent">Build together.</span>
            </h1>

            <p className="home-hero__lead">
              <strong>CollabBoard</strong> is the all-in-one canvas where remote teams sketch,
              plan, chat, and meet — without switching between a dozen different tools.
            </p>

            <div className="home-hero__actions">
              {!loggedIn ? (
                <>
                  <Link to="/login" className="btn-primary home-btn-glow" style={{ width: 'auto' }}>
                    Start for free →
                  </Link>
                  <Link to="/gallery" className="home-btn-outline">
                    Browse gallery
                  </Link>
                </>
              ) : (
                <a href="#dashboard" className="btn-primary home-btn-glow" style={{ width: 'auto' }}>
                  Open dashboard ↓
                </a>
              )}
            </div>

            <div className="home-hero__stats">
              <div className="home-hero__stat">
                <span className="home-hero__stat-value">Live</span>
                <span className="home-hero__stat-label">Multiplayer sync</span>
              </div>
              <div className="home-hero__stat">
                <span className="home-hero__stat-value">8+</span>
                <span className="home-hero__stat-label">Built-in tools</span>
              </div>
              <div className="home-hero__stat">
                <span className="home-hero__stat-value">∞</span>
                <span className="home-hero__stat-label">Canvas size</span>
              </div>
            </div>
          </div>

          <HeroVisual />
        </div>

        <div className="home-section">
          <span className="home-section__label">Everything included</span>
          <h2 className="home-section__title">One platform. Every workflow.</h2>
          <p className="home-section__desc">
            From solo brainstorming to full-team sprints — CollabBoard packs drawing,
            communication, and project tools into a single beautiful experience.
          </p>

          <div className="home-bento">
            {FEATURES.map((f) => (
              <article
                key={f.title}
                className={`home-bento-card${f.wide ? ' home-bento-card--wide' : ''}`}
              >
                <div className="home-bento-card__icon-wrap" aria-hidden>{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.description}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="home-section">
          <span className="home-section__label">Get started</span>
          <h2 className="home-section__title">Up and running in 3 steps</h2>
          <p className="home-section__desc">No complex setup. Create, invite, and start drawing in under a minute.</p>

          <div className="home-timeline">
            {STEPS.map((step, i) => (
              <div key={step.title} className="home-timeline-step">
                <span className="home-timeline-step__orb">{i + 1}</span>
                <h4>{step.title}</h4>
                <p>{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
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
      <div className="home-dashboard__zone">
        <span className="home-dashboard__badge">✦ Your dashboard</span>

        <header className="home-dashboard__header">
          <h2>Your Workspaces</h2>
          <p>Jump into an existing workspace or create a new one for your team</p>
        </header>

        <form onSubmit={onCreate} className="home-create-form">
          <input
            type="text"
            value={newWorkspaceName}
            onChange={(e) => setNewWorkspaceName(e.target.value)}
            placeholder="Name your new workspace..."
            className="input-field"
            required
          />
          <button type="submit" disabled={loading} className="btn-primary home-btn-glow" style={{ width: 'auto', flexShrink: 0 }}>
            {loading ? 'Creating...' : '+ Create workspace'}
          </button>
        </form>

        {error && <p style={{ color: 'var(--danger)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>{error}</p>}

        {workspaces.length > 0 ? (
          <div className="home-workspace-grid">
            {workspaces.map((ws) => (
              <Link key={ws.id} to={`/workspace/${ws.id}`} className="home-workspace-card">
                <div className="home-workspace-card__inner">
                  <div className="workspace-avatar">{ws.name.charAt(0).toUpperCase()}</div>
                  <div style={{ minWidth: 0 }}>
                    <h3>{ws.name}</h3>
                    <p className="home-workspace-card__role">{ws.role} workspace</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="home-empty-state">
            <div className="home-empty-state__icon">🏢</div>
            <p style={{ fontWeight: 600, marginBottom: '0.35rem' }}>No workspaces yet</p>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Create your first workspace above to start collaborating.
            </p>
          </div>
        )}
      </div>
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
