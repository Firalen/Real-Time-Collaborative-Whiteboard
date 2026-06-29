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
  const [tab, setTab] = useState<'boards' | 'members' | 'activity'>('boards');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token || !id) return;
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
  }, [token, id]);

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
    return <AppLayout><div className="p-10 text-center text-gray-500">Loading workspace...</div></AppLayout>;
  }

  if (!workspace) {
    return <AppLayout><div className="p-10 text-center text-red-400">{error || 'Workspace not found'}</div></AppLayout>;
  }

  const canEdit = ['owner', 'admin', 'editor'].includes(workspace.role);
  const canAdmin = ['owner', 'admin'].includes(workspace.role);

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">{workspace.name}</h1>
            <p className="text-sm text-gray-500 capitalize">{workspace.role} · {members.length} members</p>
          </div>
        </div>

        <div className="flex gap-1 mb-6 border-b border-[#2e3348]">
          {(['boards', 'members', 'activity'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
                tab === t ? 'border-indigo-500 text-white' : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        {tab === 'boards' && (
          <>
            {canEdit && (
              <form onSubmit={handleCreateBoard} className="flex flex-wrap gap-3 mb-6 p-4 rounded-xl bg-[#1a1d27] border border-[#2e3348]">
                <input
                  value={newBoardName}
                  onChange={(e) => setNewBoardName(e.target.value)}
                  placeholder="Board name..."
                  className="flex-1 min-w-[200px] px-3 py-2 rounded-lg bg-[#0f1117] border border-[#2e3348] focus:border-indigo-500 focus:outline-none"
                  required
                />
                <select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-[#0f1117] border border-[#2e3348] focus:outline-none"
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>{t.emoji} {t.name}</option>
                  ))}
                </select>
                <button type="submit" className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 font-medium">
                  Create Board
                </button>
              </form>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {boards.map((board) => (
                <div
                  key={board.id}
                  className="group relative p-4 rounded-xl bg-[#1a1d27] border border-[#2e3348] hover:border-indigo-500 transition-all"
                >
                  <Link to={`/board/${board.id}`} className="block">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{board.emojiIcon || '📋'}</span>
                      <h3 className="font-semibold group-hover:text-indigo-400 transition-colors">{board.name}</h3>
                      {board.pinned && <span className="text-xs text-yellow-500">📌</span>}
                    </div>
                    <p className="text-xs text-gray-500">
                      Updated {new Date(board.updatedAt).toLocaleDateString()}
                    </p>
                  </Link>
                  {canEdit && (
                    <div className="flex gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handlePin(board.id)} className="text-xs px-2 py-1 rounded bg-white/5 hover:bg-white/10">
                        Pin
                      </button>
                      <button onClick={() => handleDuplicate(board.id)} className="text-xs px-2 py-1 rounded bg-white/5 hover:bg-white/10">
                        Duplicate
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {tab === 'members' && (
          <div className="space-y-6">
            <div className="rounded-xl bg-[#1a1d27] border border-[#2e3348] divide-y divide-[#2e3348]">
              {members.map((m) => (
                <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                  <span
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                    style={{ backgroundColor: m.avatarColor }}
                  >
                    {m.name.charAt(0)}
                  </span>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{m.name}</p>
                    <p className="text-xs text-gray-500">{m.email}</p>
                  </div>
                  <span className="text-xs capitalize px-2 py-1 rounded bg-white/5 text-gray-400">{m.role}</span>
                </div>
              ))}
            </div>

            {canAdmin && (
              <form onSubmit={handleInvite} className="flex gap-3">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="Invite by email..."
                  className="flex-1 px-3 py-2 rounded-lg bg-[#1a1d27] border border-[#2e3348] focus:border-indigo-500 focus:outline-none"
                  required
                />
                <button type="submit" className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 font-medium">
                  Send Invite
                </button>
              </form>
            )}
          </div>
        )}

        {tab === 'activity' && (
          <div className="rounded-xl bg-[#1a1d27] border border-[#2e3348] divide-y divide-[#2e3348]">
            {activity.length === 0 ? (
              <p className="text-gray-500 text-sm p-4 text-center">No activity yet</p>
            ) : (
              activity.map((a) => (
                <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                  <span
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ backgroundColor: a.avatarColor || '#6366f1' }}
                  >
                    {(a.userName || '?').charAt(0)}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm">
                      <span className="font-medium">{a.userName || 'Someone'}</span>
                      {' '}{a.action.replace('.', ' ')}
                    </p>
                    <p className="text-xs text-gray-500">{new Date(a.createdAt).toLocaleString()}</p>
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
