import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import type { Board } from '../types';

export default function Home() {
  const { user, token, logout, loading: authLoading } = useAuth();
  const [boards, setBoards] = useState<Board[]>([]);
  const [newBoardName, setNewBoardName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) return;
    api.getBoards(token).then(setBoards).catch(() => setError('Failed to load boards'));
  }, [token]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newBoardName.trim()) return;

    setLoading(true);
    try {
      const board = await api.createBoard(token, newBoardName.trim());
      setBoards((prev) => [board, ...prev]);
      setNewBoardName('');
      navigate(`/board/${board.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create board');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!token || !confirm('Delete this board?')) return;
    try {
      await api.deleteBoard(token, id);
      setBoards((prev) => prev.filter((b) => b.id !== id));
    } catch {
      setError('Failed to delete board');
    }
  };

  if (authLoading) {
    return <div className="loading-page">Loading...</div>;
  }

  return (
    <div className="home-page">
      <header className="home-header">
        <h1>Collaborative Whiteboard</h1>
        <div className="header-actions">
          {user ? (
            <>
              <span className="user-greeting">Hi, {user.name}</span>
              <button onClick={logout} className="btn-secondary">Logout</button>
            </>
          ) : (
            <Link to="/login" className="btn-primary">Sign In</Link>
          )}
        </div>
      </header>

      <main className="home-main">
        {user && (
          <section className="create-section">
            <h2>Create a New Board</h2>
            <form onSubmit={handleCreate} className="create-form">
              <input
                type="text"
                value={newBoardName}
                onChange={(e) => setNewBoardName(e.target.value)}
                placeholder="Board name..."
                required
              />
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Creating...' : 'Create Board'}
              </button>
            </form>
          </section>
        )}

        {error && <p className="error-msg">{error}</p>}

        {user && boards.length > 0 && (
          <section className="boards-section">
            <h2>Your Boards</h2>
            <div className="board-grid">
              {boards.map((board) => (
                <div key={board.id} className="board-card">
                  <Link to={`/board/${board.id}`} className="board-card-link">
                    <h3>{board.name}</h3>
                    <p>Updated {new Date(board.updatedAt).toLocaleDateString()}</p>
                  </Link>
                  <button
                    className="board-delete"
                    onClick={() => handleDelete(board.id)}
                    title="Delete board"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {!user && (
          <section className="guest-section">
            <h2>Join a Board</h2>
            <p>Have a share link? Paste the board ID or open the link directly.</p>
            <p>
              <Link to="/login">Sign in</Link> to create and manage your own boards.
            </p>
          </section>
        )}
      </main>
    </div>
  );
}
