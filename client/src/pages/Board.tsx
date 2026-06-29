import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import Canvas from '../components/Canvas';

export default function Board() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const [boardName, setBoardName] = useState('Whiteboard');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;

    api.getBoard(id, token)
      .then((board) => setBoardName(board.name))
      .catch(() => setError('Board not found'))
      .finally(() => setLoading(false));
  }, [id, token]);

  if (!id) {
    return <div className="loading-page">Invalid board</div>;
  }

  if (loading) {
    return <div className="loading-page">Loading board...</div>;
  }

  if (error) {
    return (
      <div className="loading-page">
        <p>{error}</p>
        <Link to="/">← Back to home</Link>
      </div>
    );
  }

  return <Canvas boardId={id} boardName={boardName} />;
}
