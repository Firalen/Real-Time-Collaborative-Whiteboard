import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import AppLayout from '../components/AppLayout';
import LiveDot from '../components/ui/LiveDot';
import type { Workspace } from '../types/saas';

const FEATURES = [
  {
    icon: '✏️',
    tag: 'Canvas',
    title: 'Infinite canvas',
    description: 'Pen, shapes, text, sticky notes, images — sketch without limits on a boundless whiteboard.',
    spotlight: true,
  },
  {
    icon: '⚡',
    tag: 'Live',
    title: 'Real-time sync',
    description: 'Live cursors and instant stroke sync across every browser.',
    spotlight: true,
  },
  {
    icon: '👥',
    tag: 'Team',
    title: 'Workspaces',
    description: 'Roles, invites, and shared access for your team.',
  },
  {
    icon: '💬',
    tag: 'Chat',
    title: 'Comments & chat',
    description: 'Threaded comments, @mentions, and floating board chat with reactions.',
  },
  {
    icon: '✅',
    tag: 'Ship',
    title: 'Tasks',
    description: 'Turn ideas into tasks with due dates and assignees.',
  },
  {
    icon: '📹',
    tag: 'Meet',
    title: 'Video calls',
    description: 'WebRTC meetings built into every board.',
  },
  {
    icon: '🤖',
    tag: 'AI',
    title: 'AI tools',
    description: 'Generate mind maps and images to brainstorm faster.',
  },
  {
    icon: '🕐',
    tag: 'Safe',
    title: 'History',
    description: 'Restore any previous version in one click.',
  },
];

const STEPS = [
  { icon: '🏢', title: 'Create workspace', description: 'Spin up a shared home for your team or project in seconds.' },
  { icon: '📋', title: 'Add boards', description: 'Blank canvas or templates — wireframes, retros, mind maps.' },
  { icon: '🚀', title: 'Collaborate live', description: 'Draw, chat, call, and ship ideas together in real time.' },
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
                  <Link to="/login" className="btn-primary btn-gradient home-btn-glow" style={{ width: 'auto' }}>
                    Start for free →
                  </Link>
                  <Link to="/gallery" className="home-btn-outline">
                    Browse gallery
                  </Link>
                </>
              ) : (
                <a href="#dashboard" className="btn-primary btn-gradient home-btn-glow" style={{ width: 'auto' }}>
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

        <div className="home-premium-divider" aria-hidden />

        <section className="home-premium-block">
          <header className="home-premium-block__head">
            <span className="ds-badge">Everything included</span>
            <h2 className="home-premium-block__title">One platform. Every workflow.</h2>
            <p className="home-premium-block__desc">
              From solo brainstorming to full-team sprints — drawing, communication,
              and project tools in a single, beautiful workspace.
            </p>
          </header>

          <div className="home-feature-showcase">
            <div className="home-feature-spotlight">
              {FEATURES.filter((f) => f.spotlight).map((f) => (
                <article key={f.title} className="home-feature-spotlight__card glass-panel glass-panel--glow">
                  <span className="home-feature-card__tag">{f.tag}</span>
                  <div className="home-feature-spotlight__icon" aria-hidden>{f.icon}</div>
                  <h3>{f.title}</h3>
                  <p>{f.description}</p>
                  <div className="home-feature-spotlight__shine" aria-hidden />
                </article>
              ))}
            </div>

            <div className="home-feature-grid">
              {FEATURES.filter((f) => !f.spotlight).map((f) => (
                <article key={f.title} className="home-feature-card glass-panel">
                  <div className="home-feature-card__top">
                    <div className="home-feature-card__icon" aria-hidden>{f.icon}</div>
                    <span className="home-feature-card__tag">{f.tag}</span>
                  </div>
                  <h3>{f.title}</h3>
                  <p>{f.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="home-premium-block home-premium-block--steps">
          <header className="home-premium-block__head home-premium-block__head--center">
            <span className="ds-badge">Get started</span>
            <h2 className="home-premium-block__title">Up and running in 3 steps</h2>
            <p className="home-premium-block__desc">
              No complex setup. Create, invite, and start drawing in under a minute.
            </p>
          </header>

          <div className="home-steps">
            {STEPS.map((step, i) => (
              <article key={step.title} className="home-step-card glass-panel">
                <div className="home-step-card__track" aria-hidden>
                  <span className="home-step-card__node">{i + 1}</span>
                  {i < STEPS.length - 1 && <span className="home-step-card__line" />}
                </div>
                <div className="home-step-card__icon" aria-hidden>{step.icon}</div>
                <h4>{step.title}</h4>
                <p>{step.description}</p>
              </article>
            ))}
          </div>
        </section>
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
      <div className="home-dashboard__shell glass-panel glass-panel--glow">
        <div className="home-dashboard__top">
          <div className="home-dashboard__intro">
            <span className="ds-badge">Your dashboard</span>
            <h2 className="home-dashboard__title">Your workspaces</h2>
            <p className="home-dashboard__subtitle">
              Jump into an existing space or spin up a new one for your team.
            </p>
            {workspaces.length > 0 && (
              <LiveDot label={`${workspaces.length} workspace${workspaces.length === 1 ? '' : 's'}`} pulse />
            )}
          </div>

          <form onSubmit={onCreate} className="home-dashboard__create glass-panel">
            <label htmlFor="new-workspace" className="home-dashboard__create-label">
              New workspace
            </label>
            <div className="home-dashboard__create-row">
              <input
                id="new-workspace"
                type="text"
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
                placeholder="e.g. Product design, Sprint planning..."
                className="home-dashboard__input"
                required
              />
              <button type="submit" disabled={loading} className="btn-primary btn-gradient">
                {loading ? 'Creating...' : 'Create'}
              </button>
            </div>
          </form>
        </div>

        {error && <p className="home-dashboard__error">{error}</p>}

        {workspaces.length > 0 ? (
          <div className="home-dashboard__grid">
            {workspaces.map((ws) => (
              <Link key={ws.id} to={`/workspace/${ws.id}`} className="home-ws-tile glass-panel">
                <div className="home-ws-tile__accent" aria-hidden />
                <div className="home-ws-tile__avatar">{ws.name.charAt(0).toUpperCase()}</div>
                <div className="home-ws-tile__body">
                  <h3>{ws.name}</h3>
                  <span className="home-ws-tile__role">{ws.role}</span>
                </div>
                <span className="home-ws-tile__arrow" aria-hidden>→</span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="home-dashboard__empty glass-panel">
            <div className="home-dashboard__empty-icon" aria-hidden>◇</div>
            <p className="home-dashboard__empty-title">No workspaces yet</p>
            <p className="home-dashboard__empty-desc">
              Name your first workspace above — you&apos;ll be drawing in seconds.
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
