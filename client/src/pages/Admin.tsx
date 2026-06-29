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
      <div className="max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-gray-500 text-sm mb-8">Platform metrics and workspace overview</p>

        {loading && <p className="text-gray-500">Loading...</p>}

        {metrics && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            {[
              { label: 'Total users', value: metrics.totalUsers, icon: '👥' },
              { label: 'Workspaces', value: metrics.totalWorkspaces, icon: '🏢' },
              { label: 'Boards', value: metrics.totalBoards, icon: '📋' },
              { label: 'DAU', value: metrics.dau, icon: '📈' },
            ].map((stat) => (
              <div key={stat.label} className="p-5 rounded-xl bg-[#1a1d27] border border-[#2e3348]">
                <span className="text-2xl">{stat.icon}</span>
                <p className="text-3xl font-bold mt-2">{stat.value.toLocaleString()}</p>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </div>
            ))}
          </div>
        )}

        {workspaces.length > 0 && (
          <>
            <h2 className="text-lg font-semibold mb-4">Workspaces</h2>
            <div className="rounded-xl bg-[#1a1d27] border border-[#2e3348] overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#2e3348] text-gray-500 text-left">
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Plan</th>
                    <th className="px-4 py-3">Members</th>
                    <th className="px-4 py-3">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {workspaces.map((ws) => (
                    <tr key={ws.id} className="border-b border-[#2e3348]/50 hover:bg-white/5">
                      <td className="px-4 py-3">
                        <Link to={`/workspace/${ws.id}`} className="hover:text-indigo-400">{ws.name}</Link>
                      </td>
                      <td className="px-4 py-3 capitalize">{ws.plan_slug || 'free'}</td>
                      <td className="px-4 py-3">{ws.member_count}</td>
                      <td className="px-4 py-3 text-gray-500">
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
