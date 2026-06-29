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
    return <div className="flex items-center justify-center min-h-screen text-gray-500">Loading...</div>;
  }

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-2">Your Workspaces</h1>
        <p className="text-gray-400 mb-8">Collaborate with your team on shared whiteboards</p>

        {user && (
          <form onSubmit={handleCreateWorkspace} className="flex gap-3 mb-10">
            <input
              type="text"
              value={newWorkspaceName}
              onChange={(e) => setNewWorkspaceName(e.target.value)}
              placeholder="New workspace name..."
              className="flex-1 px-4 py-2.5 rounded-lg bg-[#1a1d27] border border-[#2e3348] focus:border-indigo-500 focus:outline-none"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 font-medium transition-colors"
            >
              {loading ? 'Creating...' : 'Create Workspace'}
            </button>
          </form>
        )}

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        {user && workspaces.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {workspaces.map((ws) => (
              <Link
                key={ws.id}
                to={`/workspace/${ws.id}`}
                className="group p-5 rounded-xl bg-[#1a1d27] border border-[#2e3348] hover:border-indigo-500 transition-all"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-indigo-600/20 flex items-center justify-center text-lg">
                    {ws.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold group-hover:text-indigo-400 transition-colors">{ws.name}</h3>
                    <p className="text-xs text-gray-500 capitalize">{ws.role}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {!user && (
          <div className="text-center py-16 text-gray-400">
            <p className="mb-4">Sign in to create workspaces and collaborate with your team.</p>
            <Link to="/login" className="text-indigo-400 hover:text-indigo-300">Sign in →</Link>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
