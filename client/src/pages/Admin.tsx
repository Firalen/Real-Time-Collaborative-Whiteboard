import { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import AppLayout from '../components/AppLayout';
import LiveDot from '../components/ui/LiveDot';
import type { AdminMetrics, AdminWorkspace } from '../types/enterprise';

const STATS = [
  { key: 'totalUsers' as const, label: 'Total users', icon: '👥' },
  { key: 'totalWorkspaces' as const, label: 'Workspaces', icon: '🏢' },
  { key: 'totalBoards' as const, label: 'Boards', icon: '📋' },
  { key: 'dau' as const, label: 'DAU', icon: '📈' },
];

export default function AdminPage() {
  const { token } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [workspaces, setWorkspaces] = useState<AdminWorkspace[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    api.checkAdmin(token)
      .then(({ isAdmin: admin }) => {
        setIsAdmin(admin);
        if (!admin) return Promise.reject(new Error('not admin'));
        return Promise.all([api.getAdminMetrics(token), api.getAdminWorkspaces(token)]);
      })
      .then(([m, w]) => {
        setMetrics(m);
        setWorkspaces(w);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  if (!token) return <Navigate to="/login" replace />;
  if (!loading && isAdmin === false) return <Navigate to="/" replace />;

  return (
    <AppLayout>
      <div className="page-wrap">
        <header className="ds-page-hero">
          <span className="ds-badge">Platform</span>
          <h1 className="ds-page-title">Admin Dashboard</h1>
          <p className="ds-page-subtitle">
            CollabBoard platform metrics and workspace overview
          </p>
          {metrics && (
            <div style={{ marginTop: '1rem' }}>
              <LiveDot label="Platform live" pulse />
            </div>
          )}
        </header>

        {loading && <p style={{ color: 'var(--text-muted)' }}>Loading...</p>}

        {metrics && (
          <div className="ds-stat-grid">
            {STATS.map((stat) => (
              <div key={stat.key} className="ds-stat-card">
                <span className="ds-stat-card__icon">{stat.icon}</span>
                <p className="ds-stat-card__value">{metrics[stat.key].toLocaleString()}</p>
                <p className="ds-stat-card__label">{stat.label}</p>
              </div>
            ))}
          </div>
        )}

        {workspaces.length > 0 && (
          <>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 700, letterSpacing: 'var(--tracking-snug)', marginBottom: '1rem' }}>
              Workspaces
            </h2>
            <div className="glass-card glass-panel" style={{ overflow: 'hidden', padding: 0 }}>
              <table className="ds-data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Plan</th>
                    <th>Members</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {workspaces.map((ws) => (
                    <tr key={ws.id}>
                      <td>
                        <Link to={`/workspace/${ws.id}`} style={{ fontWeight: 500, color: 'var(--primary-hover)' }}>
                          {ws.name}
                        </Link>
                      </td>
                      <td><span className="ds-badge">{ws.plan_slug || 'free'}</span></td>
                      <td>{ws.member_count}</td>
                      <td style={{ color: 'var(--text-muted)' }}>
                        {new Date(ws.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
