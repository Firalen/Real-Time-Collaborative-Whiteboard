import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import AppLayout from '../components/AppLayout';
import type { Board } from '../types';
import type { Workspace, WorkspaceMember, BoardTemplate, ActivityItem } from '../types/saas';

export default function WorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [boards, setBoards] = useState<Board[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [templates, setTemplates] = useState<BoardTemplate[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [newBoardName, setNewBoardName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('blank');
  const [inviteEmail, setInviteEmail] = useState('');
  const [slackWebhook, setSlackWebhook] = useState('');
  const [integrationMsg, setIntegrationMsg] = useState('');
  const [tab, setTab] = useState<'boards' | 'members' | 'activity' | 'integrations' | 'billing'>('boards');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [plans, setPlans] = useState<import('../types/enterprise').Plan[]>([]);
  const [subscription, setSubscription] = useState<import('../types/enterprise').Subscription | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [upgrading, setUpgrading] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !id) return;
    setLoading(true);
    if (tab === 'billing') {
      Promise.all([api.getPlans(), api.getSubscription(token, id)])
        .then(([p, s]) => { setPlans(p); setSubscription(s); })
        .catch(() => setError('Failed to load billing'))
        .finally(() => setLoading(false));
      return;
    }
    Promise.all([
      api.getWorkspace(token, id),
      api.getWorkspaceBoards(token, id),
      api.getWorkspaceMembers(token, id),
      api.getTemplates(token, id),
      api.getWorkspaceActivity(token, id),
    ])
      .then(([ws, b, m, t, a]) => {
        setWorkspace(ws);
        setBoards(b);
        setMembers(m);
        setTemplates(t);
        setActivity(a);
      })
      .catch(() => setError('Failed to load workspace'))
      .finally(() => setLoading(false));
  }, [token, id, tab]);

  const handleUpgrade = async (planSlug: string) => {
    if (!token || !id || planSlug === 'free' || planSlug === 'enterprise') return;
    setUpgrading(planSlug);
    try {
      const { url } = await api.createCheckout(token, id, planSlug, billingCycle);
      if (url) window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Checkout unavailable — configure Stripe keys');
    } finally {
      setUpgrading(null);
    }
  };

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !id || !newBoardName.trim()) return;
    try {
      const board = await api.createWorkspaceBoard(token, id, {
        name: newBoardName.trim(),
        template: selectedTemplate,
      });
      navigate(`/board/${board.id}`);
    } catch {
      setError('Failed to create board');
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !id || !inviteEmail.trim()) return;
    try {
      await api.inviteMember(token, id, inviteEmail.trim(), 'editor');
      setInviteEmail('');
      alert('Invitation sent!');
    } catch {
      setError('Failed to send invitation');
    }
  };

  const handlePin = async (boardId: string) => {
    if (!token) return;
    await api.pinBoard(token, boardId);
    const updated = await api.getWorkspaceBoards(token, id!);
    setBoards(updated);
  };

  const handleDuplicate = async (boardId: string) => {
    if (!token) return;
    const dup = await api.duplicateBoard(token, boardId);
    setBoards((prev) => [dup, ...prev]);
  };

  if (loading) {
    return <AppLayout><div className="loading-page">Loading workspace...</div></AppLayout>;
  }

  if (!workspace) {
    return <AppLayout><div className="loading-page" style={{ color: 'var(--danger)' }}>{error || 'Workspace not found'}</div></AppLayout>;
  }

  const canEdit = ['owner', 'admin', 'editor'].includes(workspace.role);
  const canAdmin = ['owner', 'admin'].includes(workspace.role);

  type WorkspaceTab = 'boards' | 'members' | 'activity' | 'integrations' | 'billing';

  const tabConfig: { id: WorkspaceTab; label: string; icon: string; description: string; adminOnly?: boolean }[] = [
    { id: 'boards', label: 'Boards', icon: '📋', description: 'Create and open whiteboards in this workspace' },
    { id: 'members', label: 'Members', icon: '👥', description: 'View teammates and invite new collaborators' },
    { id: 'activity', label: 'Activity', icon: '📊', description: 'Recent updates across boards and members' },
    { id: 'integrations', label: 'Integrations', icon: '🔗', description: 'Connect Slack and Google Calendar', adminOnly: true },
    { id: 'billing', label: 'Billing', icon: '💳', description: 'Manage your plan and subscription', adminOnly: true },
  ];

  const visibleTabs = tabConfig.filter((t) => !t.adminOnly || canAdmin);
  const activeTabMeta = tabConfig.find((t) => t.id === tab);

  return (
    <AppLayout>
      <div className="workspace-page">
        <header className="workspace-hero">
          <div className="workspace-avatar workspace-hero__avatar">
            {workspace.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="workspace-hero__title">{workspace.name}</h1>
            <div className="workspace-hero__meta">
              <span className="badge">{workspace.role}</span>
              <span>{members.length} {members.length === 1 ? 'member' : 'members'}</span>
              <span>{boards.length} {boards.length === 1 ? 'board' : 'boards'}</span>
            </div>
          </div>
        </header>

        <div className="workspace-layout">
          <nav className="workspace-nav" aria-label="Workspace sections">
            {visibleTabs.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`workspace-nav-btn ${tab === t.id ? 'active' : ''}`}
                onClick={() => setTab(t.id)}
              >
                <span className="workspace-nav-btn__icon" aria-hidden>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </nav>

          <div className="workspace-content">
            {activeTabMeta && (
              <div className="workspace-section-header">
                <h2>{activeTabMeta.label}</h2>
                <p>{activeTabMeta.description}</p>
              </div>
            )}

            {error && (
              <p style={{ color: 'var(--danger)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>{error}</p>
            )}

        {tab === 'boards' && (
          <div className="workspace-panel">
            {canEdit && (
              <form onSubmit={handleCreateBoard} className="glass-card workspace-create-form">
                <p style={{ fontWeight: 600, fontSize: '0.95rem', margin: 0 }}>Create a new board</p>
                <div className="workspace-create-form__row">
                  <input
                    value={newBoardName}
                    onChange={(e) => setNewBoardName(e.target.value)}
                    placeholder="Board name..."
                    className="input-field"
                    required
                  />
                  <select
                    value={selectedTemplate}
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                    className="input-field"
                  >
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>{t.emoji} {t.name}</option>
                    ))}
                  </select>
                  <button type="submit" className="btn-primary" style={{ width: 'auto', flexShrink: 0 }}>Create Board</button>
                </div>
              </form>
            )}

            <div className="workspace-board-grid">
              {boards.map((board) => (
                <div key={board.id} className="glass-card glass-card-interactive workspace-board-card">
                  <Link to={`/board/${board.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '1.75rem' }}>{board.emojiIcon || '📋'}</span>
                      <h3 style={{ fontWeight: 600, fontSize: '1.05rem' }}>{board.name}</h3>
                      {board.pinned && <span title="Pinned">📌</span>}
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Updated {new Date(board.updatedAt).toLocaleDateString()}
                    </p>
                  </Link>
                  {canEdit && (
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                      <button type="button" onClick={() => handlePin(board.id)} className="btn-ghost" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>Pin</button>
                      <button type="button" onClick={() => handleDuplicate(board.id)} className="btn-ghost" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>Duplicate</button>
                    </div>
                  )}
                </div>
              ))}
              {boards.length === 0 && (
                <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', gridColumn: '1 / -1' }}>
                  <p style={{ color: 'var(--text-muted)' }}>No boards yet. Create your first board above.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'members' && (
          <div className="workspace-panel">
            <div className="glass-card" style={{ overflow: 'hidden' }}>
              {members.map((m, i) => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.15rem 1.5rem', borderTop: i ? '1px solid var(--border)' : undefined }}>
                  <span className="user-chip__avatar" style={{ backgroundColor: m.avatarColor, width: 36, height: 36, fontSize: '0.85rem' }}>{m.name.charAt(0)}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 500, fontSize: '0.95rem' }}>{m.name}</p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>{m.email}</p>
                  </div>
                  <span className="badge">{m.role}</span>
                </div>
              ))}
            </div>
            {canAdmin && (
              <form onSubmit={handleInvite} className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <p style={{ fontWeight: 600, margin: 0 }}>Invite a teammate</p>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="colleague@company.com" className="input-field" style={{ flex: 1, minWidth: '200px' }} required />
                  <button type="submit" className="btn-primary" style={{ width: 'auto' }}>Send Invite</button>
                </div>
              </form>
            )}
          </div>
        )}

        {tab === 'integrations' && canAdmin && (
          <div className="workspace-panel" style={{ maxWidth: '36rem' }}>
            <div className="glass-card" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontWeight: 600, marginBottom: '0.5rem', fontSize: '1rem' }}>Slack</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: 1.55 }}>Post to a channel when boards are updated or comments are added.</p>
              <input
                type="url"
                value={slackWebhook}
                onChange={(e) => setSlackWebhook(e.target.value)}
                placeholder="https://hooks.slack.com/services/..."
                className="input-field"
                style={{ marginBottom: '1rem' }}
              />
              <button
                type="button"
                className="btn-primary"
                style={{ width: 'auto' }}
                onClick={async () => {
                  if (!token || !id) return;
                  await api.saveSlackIntegration(token, id, slackWebhook);
                  setIntegrationMsg('Slack connected');
                }}
              >
                Save Slack webhook
              </button>
            </div>
            <div className="glass-card" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontWeight: 600, marginBottom: '0.5rem', fontSize: '1rem' }}>Google Calendar</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: 1.55 }}>Add task due dates to Google Calendar from the Tasks panel.</p>
              <button
                type="button"
                className="btn-primary"
                style={{ width: 'auto' }}
                onClick={async () => {
                  if (!token || !id) return;
                  await api.enableGoogleCalendar(token, id);
                  setIntegrationMsg('Google Calendar enabled for tasks');
                }}
              >
                Enable Google Calendar
              </button>
            </div>
            {integrationMsg && <p style={{ fontSize: '0.875rem', color: '#4ade80' }}>{integrationMsg}</p>}
          </div>
        )}

        {tab === 'billing' && canAdmin && (
          <div className="workspace-panel">
            {subscription && (
              <div className="glass-card" style={{ padding: '1.5rem' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>Current plan</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.35rem' }}>{subscription.planName}</p>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                  Status: {subscription.status}
                  {subscription.trialEndsAt && (
                    <> · Trial ends {new Date(subscription.trialEndsAt).toLocaleDateString()}</>
                  )}
                </p>
              </div>
            )}

            <div className="tab-bar tab-bar--compact">
              <button type="button" onClick={() => setBillingCycle('monthly')} className={`tab-bar-btn ${billingCycle === 'monthly' ? 'active' : ''}`}>Monthly</button>
              <button type="button" onClick={() => setBillingCycle('annual')} className={`tab-bar-btn ${billingCycle === 'annual' ? 'active' : ''}`}>Annual (save ~17%)</button>
            </div>

            <div className="workspace-plan-grid">
              {plans.map((plan) => {
                const isCurrent = subscription?.planSlug === plan.slug;
                const price = billingCycle === 'annual' ? plan.priceAnnual : plan.priceMonthly;
                return (
                  <div
                    key={plan.slug}
                    className="glass-card"
                    style={{ padding: '1.5rem', borderColor: isCurrent ? 'rgba(139, 92, 246, 0.5)' : undefined, boxShadow: isCurrent ? '0 0 0 1px rgba(139, 92, 246, 0.3)' : undefined }}
                  >
                    <h3 style={{ fontWeight: 700, fontSize: '1.15rem' }}>{plan.name}</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.35rem', marginBottom: '1rem', lineHeight: 1.5 }}>{plan.description}</p>
                    <p style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '1.25rem' }}>
                      {price === 0 ? 'Free' : `$${price}`}
                      {price > 0 && <span style={{ fontSize: '0.85rem', fontWeight: 400, color: 'var(--text-muted)' }}>/{billingCycle === 'annual' ? 'yr' : 'mo'}</span>}
                    </p>
                    <ul style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.25rem', listStyle: 'none', padding: 0, lineHeight: 1.7 }}>
                      {Object.entries(plan.limits).slice(0, 3).map(([k, v]) => (
                        <li key={k}>· {k.replace(/_/g, ' ')}: {v === -1 ? 'Unlimited' : v}</li>
                      ))}
                    </ul>
                    {isCurrent ? (
                      <span style={{ fontSize: '0.875rem', color: '#a78bfa', fontWeight: 500 }}>Current plan</span>
                    ) : plan.slug === 'enterprise' ? (
                      <a href="mailto:sales@example.com" style={{ fontSize: '0.875rem', color: '#a78bfa' }}>Contact sales</a>
                    ) : plan.slug !== 'free' ? (
                      <button
                        type="button"
                        onClick={() => handleUpgrade(plan.slug)}
                        disabled={upgrading === plan.slug}
                        className="btn-primary"
                        style={{ width: '100%' }}
                      >
                        {upgrading === plan.slug ? 'Redirecting...' : 'Upgrade'}
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === 'activity' && (
          <div className="glass-card" style={{ overflow: 'hidden' }}>
            {activity.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', padding: '2.5rem', textAlign: 'center' }}>No activity yet — changes will show up here.</p>
            ) : (
              activity.map((a, i) => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.15rem 1.5rem', borderTop: i ? '1px solid var(--border)' : undefined }}>
                  <span
                    className="user-chip__avatar"
                    style={{ backgroundColor: a.avatarColor || '#8b5cf6', width: 36, height: 36, fontSize: '0.85rem' }}
                  >
                    {(a.userName || '?').charAt(0)}
                  </span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '0.9rem', lineHeight: 1.45 }}>
                      <span style={{ fontWeight: 500 }}>{a.userName || 'Someone'}</span>
                      {' '}{a.action.replace('.', ' ')}
                    </p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{new Date(a.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
