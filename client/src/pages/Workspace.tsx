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

  const tabs = ['boards', 'members', 'activity', 'integrations', 'billing'] as const;

  return (
    <AppLayout>
      <div className="page-wrap">
        <header className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div className="workspace-avatar" style={{ width: '3.5rem', height: '3.5rem', fontSize: '1.5rem' }}>
              {workspace.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="page-title" style={{ fontSize: '1.5rem' }}>{workspace.name}</h1>
              <p className="page-subtitle">
                <span className="badge" style={{ marginRight: '0.5rem' }}>{workspace.role}</span>
                {members.length} members
              </p>
            </div>
          </div>
        </header>

        <div className="tab-bar">
          {tabs.map((t) => (
            <button
              key={t}
              type="button"
              className={`tab-bar-btn ${tab === t ? 'active' : ''}`}
              onClick={() => setTab(t)}
            >
              {t === 'boards' ? 'Boards' : t === 'members' ? 'Members' : t === 'activity' ? 'Activity' : t === 'integrations' ? 'Integrations' : 'Billing'}
            </button>
          ))}
        </div>

        {error && <p style={{ color: 'var(--danger)', fontSize: '0.875rem', marginBottom: '1rem' }}>{error}</p>}

        {tab === 'boards' && (
          <>
            {canEdit && (
              <form onSubmit={handleCreateBoard} className="glass-card" style={{ padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                <input
                  value={newBoardName}
                  onChange={(e) => setNewBoardName(e.target.value)}
                  placeholder="New board name..."
                  className="input-field"
                  style={{ flex: 1, minWidth: '180px' }}
                  required
                />
                <select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="input-field"
                  style={{ width: 'auto', minWidth: '140px' }}
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>{t.emoji} {t.name}</option>
                  ))}
                </select>
                <button type="submit" className="btn-primary" style={{ width: 'auto' }}>Create Board</button>
              </form>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
              {boards.map((board) => (
                <div key={board.id} className="glass-card glass-card-interactive" style={{ padding: '1.25rem', position: 'relative' }}>
                  <Link to={`/board/${board.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                      <span style={{ fontSize: '1.5rem' }}>{board.emojiIcon || '📋'}</span>
                      <h3 style={{ fontWeight: 600 }}>{board.name}</h3>
                      {board.pinned && <span title="Pinned">📌</span>}
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Updated {new Date(board.updatedAt).toLocaleDateString()}
                    </p>
                  </Link>
                  {canEdit && (
                    <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.75rem' }}>
                      <button type="button" onClick={() => handlePin(board.id)} className="btn-ghost" style={{ padding: '0.25rem 0.6rem', fontSize: '0.7rem' }}>Pin</button>
                      <button type="button" onClick={() => handleDuplicate(board.id)} className="btn-ghost" style={{ padding: '0.25rem 0.6rem', fontSize: '0.7rem' }}>Duplicate</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {tab === 'members' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="glass-card" style={{ overflow: 'hidden' }}>
              {members.map((m, i) => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 1.25rem', borderTop: i ? '1px solid var(--border)' : undefined }}>
                  <span className="user-chip__avatar" style={{ backgroundColor: m.avatarColor }}>{m.name.charAt(0)}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 500, fontSize: '0.9rem' }}>{m.name}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{m.email}</p>
                  </div>
                  <span className="badge">{m.role}</span>
                </div>
              ))}
            </div>
            {canAdmin && (
              <form onSubmit={handleInvite} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="Invite by email..." className="input-field" style={{ flex: 1 }} required />
                <button type="submit" className="btn-primary" style={{ width: 'auto' }}>Send Invite</button>
              </form>
            )}
          </div>
        )}

        {tab === 'integrations' && canAdmin && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '32rem' }}>
            <div className="glass-card" style={{ padding: '1.25rem' }}>
              <h3 style={{ fontWeight: 600, marginBottom: '0.35rem' }}>Slack</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Post to a channel when boards are updated or comments are added.</p>
              <input
                type="url"
                value={slackWebhook}
                onChange={(e) => setSlackWebhook(e.target.value)}
                placeholder="https://hooks.slack.com/services/..."
                className="input-field"
                style={{ marginBottom: '0.75rem' }}
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
            <div className="glass-card" style={{ padding: '1.25rem' }}>
              <h3 style={{ fontWeight: 600, marginBottom: '0.35rem' }}>Google Calendar</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Add task due dates to Google Calendar from the Tasks panel.</p>
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
            {integrationMsg && <p style={{ fontSize: '0.85rem', color: '#4ade80' }}>{integrationMsg}</p>}
          </div>
        )}

        {tab === 'billing' && canAdmin && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {subscription && (
              <div className="glass-card" style={{ padding: '1.25rem' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Current plan</p>
                <p style={{ fontSize: '1.35rem', fontWeight: 700, marginTop: '0.25rem' }}>{subscription.planName}</p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                  Status: {subscription.status}
                  {subscription.trialEndsAt && (
                    <> · Trial ends {new Date(subscription.trialEndsAt).toLocaleDateString()}</>
                  )}
                </p>
              </div>
            )}

            <div className="tab-bar" style={{ marginBottom: 0, width: 'fit-content' }}>
              <button type="button" onClick={() => setBillingCycle('monthly')} className={`tab-bar-btn ${billingCycle === 'monthly' ? 'active' : ''}`}>Monthly</button>
              <button type="button" onClick={() => setBillingCycle('annual')} className={`tab-bar-btn ${billingCycle === 'annual' ? 'active' : ''}`}>Annual (save ~17%)</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
              {plans.map((plan) => {
                const isCurrent = subscription?.planSlug === plan.slug;
                const price = billingCycle === 'annual' ? plan.priceAnnual : plan.priceMonthly;
                return (
                  <div
                    key={plan.slug}
                    className="glass-card"
                    style={{ padding: '1.25rem', borderColor: isCurrent ? 'rgba(139, 92, 246, 0.5)' : undefined, boxShadow: isCurrent ? '0 0 0 1px rgba(139, 92, 246, 0.3)' : undefined }}
                  >
                    <h3 style={{ fontWeight: 700, fontSize: '1.1rem' }}>{plan.name}</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem', marginBottom: '0.75rem' }}>{plan.description}</p>
                    <p style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>
                      {price === 0 ? 'Free' : `$${price}`}
                      {price > 0 && <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-muted)' }}>/{billingCycle === 'annual' ? 'yr' : 'mo'}</span>}
                    </p>
                    <ul style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem', listStyle: 'none', padding: 0 }}>
                      {Object.entries(plan.limits).slice(0, 3).map(([k, v]) => (
                        <li key={k} style={{ marginBottom: '0.25rem' }}>· {k.replace(/_/g, ' ')}: {v === -1 ? 'Unlimited' : v}</li>
                      ))}
                    </ul>
                    {isCurrent ? (
                      <span style={{ fontSize: '0.85rem', color: '#a78bfa', fontWeight: 500 }}>Current plan</span>
                    ) : plan.slug === 'enterprise' ? (
                      <a href="mailto:sales@example.com" style={{ fontSize: '0.85rem', color: '#a78bfa' }}>Contact sales</a>
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
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', padding: '1.5rem', textAlign: 'center' }}>No activity yet</p>
            ) : (
              activity.map((a, i) => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1.25rem', borderTop: i ? '1px solid var(--border)' : undefined }}>
                  <span
                    className="user-chip__avatar"
                    style={{ backgroundColor: a.avatarColor || '#8b5cf6' }}
                  >
                    {(a.userName || '?').charAt(0)}
                  </span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '0.875rem' }}>
                      <span style={{ fontWeight: 500 }}>{a.userName || 'Someone'}</span>
                      {' '}{a.action.replace('.', ' ')}
                    </p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(a.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
