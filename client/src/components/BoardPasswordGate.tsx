import { useState } from 'react';
import { api } from '../utils/api';

interface BoardPasswordGateProps {
  boardId: string;
  boardName: string;
  onUnlock: (canvasData?: Record<string, unknown>) => void;
}

export default function BoardPasswordGate({ boardId, boardName, onUnlock }: BoardPasswordGateProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await api.verifyBoardPassword(boardId, password);
      sessionStorage.setItem(`board-unlock-${boardId}`, '1');
      onUnlock(result.canvasData);
    } catch {
      setError('Incorrect password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="password-gate">
      <div className="password-gate-card">
        <h2>{boardName}</h2>
        <p>This board is password protected</p>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            required
          />
          {error && <p className="error-msg">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Checking...' : 'Unlock'}
          </button>
        </form>
      </div>
    </div>
  );
}
