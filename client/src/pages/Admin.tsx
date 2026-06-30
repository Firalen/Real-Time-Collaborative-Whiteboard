import { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import AppLayout from '../components/AppLayout';
import type { AdminMetrics, AdminWorkspace } from '../types/enterprise';

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
        <header className="page-header">
          <span className="badge">Platform</span>
          <h1 className="page-title" style={{ marginTop: '0.5rem' }}>Admin Dashboard</h1>
          <p className="page-subtitle">CollabBoard platform metrics and workspace overview</p>
        </header>

        {loading && <p style={{ color: 'var(--text-muted)' }}>Loading...</p>}

        {metrics && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
            {[
              { label: 'Total users', value: metrics.totalUsers, icon: '👥' },
              { label: 'Workspaces', value: metrics.totalWorkspaces, icon: '🏢' },
              { label: 'Boards', value: metrics.totalBoards, icon: '📋' },
              { label: 'DAU', value: metrics.dau, icon: '📈' },
            ].map((stat) => (
              <div key={stat.label} className="stat-card">
                <span style={{ fontSize: '1.5rem' }}>{stat.icon}</span>
                <p className="stat-card__value">{stat.value.toLocaleString()}</p>
                <p className="stat-card__label">{stat.label}</p>
              </div>
            ))}
          </div>
        )}

        {workspaces.length > 0 && (
          <>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>Workspaces</h2>
            <div className="glass-card" style={{ overflow: 'hidden' }}>
              <table style={{ width: '100%', fontSize: '0.875rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', textAlign: 'left' }}>
                    <th style={{ padding: '0.85rem 1.25rem', fontWeight: 500 }}>Name</th>
                    <th style={{ padding: '0.85rem 1.25rem', fontWeight: 500 }}>Plan</th>
                    <th style={{ padding: '0.85rem 1.25rem', fontWeight: 500 }}>Members</th>
                    <th style={{ padding: '0.85rem 1.25rem', fontWeight: 500 }}>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {workspaces.map((ws) => (
                    <tr key={ws.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.85rem 1.25rem' }}>
                        <Link to={`/workspace/${ws.id}`} style={{ fontWeight: 500 }}>{ws.name}</Link>
                      </td>
                      <td style={{ padding: '0.85rem 1.25rem' }}><span className="badge">{ws.plan_slug || 'free'}</span></td>
                      <td style={{ padding: '0.85rem 1.25rem' }}>{ws.member_count}</td>
                      <td style={{ padding: '0.85rem 1.25rem', color: 'var(--text-muted)' }}>
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
