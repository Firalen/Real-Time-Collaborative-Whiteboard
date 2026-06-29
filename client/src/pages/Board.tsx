import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import Canvas from '../components/Canvas';
import BoardPasswordGate from '../components/BoardPasswordGate';
import type { Board } from '../types';

export default function BoardPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    if (!id) return;

    api.getBoard(id, token)
      .then((b) => {
        setBoard(b);
        if (!b.hasPassword || sessionStorage.getItem(`board-unlock-${id}`)) {
          setUnlocked(true);
        }
      })
      .catch(() => setError('Board not found'))
      .finally(() => setLoading(false));
  }, [id, token]);

  if (!id) return <div className="loading-page">Invalid board</div>;
  if (loading) return <div className="loading-page">Loading board...</div>;
  if (error || !board) {
    return (
      <div className="loading-page">
        <p>{error}</p>
        <Link to="/">← Back to home</Link>
      </div>
    );
  }

  if (board.hasPassword && !unlocked) {
    return (
      <BoardPasswordGate
        boardId={id}
        boardName={board.name}
        onUnlock={(canvasData) => {
          setUnlocked(true);
          setBoard((prev) => prev ? { ...prev, canvasData: canvasData || prev.canvasData } : prev);
        }}
      />
    );
  }

  const viewOnly = (board.isViewOnly || board.visibility === 'public') && !token;

  return <Canvas boardId={id} board={board} viewOnly={viewOnly} />;
}
