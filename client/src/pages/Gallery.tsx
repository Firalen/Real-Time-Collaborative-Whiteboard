import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import AppLayout from '../components/AppLayout';
import type { GalleryBoard } from '../types/enterprise';

export default function GalleryPage() {
  const { token } = useAuth();
  const [boards, setBoards] = useState<GalleryBoard[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'featured'>('all');

  useEffect(() => {
    api.getGallery(filter === 'featured' ? { featured: true } : {})
      .then(setBoards)
      .finally(() => setLoading(false));
  }, [filter]);

  const handleLike = async (boardId: string) => {
    if (!token) return;
    await api.likeGalleryBoard(token, boardId);
    setBoards((prev) =>
      prev.map((b) => (b.id === boardId ? { ...b, like_count: b.like_count + 1 } : b)),
    );
  };

  return (
    <AppLayout>
      <div className="page-wrap">
        <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <span className="badge">Community</span>
            <h1 className="page-title" style={{ marginTop: '0.5rem' }}>Public Gallery</h1>
            <p className="page-subtitle">Discover inspiring boards from the CollabBoard community</p>
          </div>
          <div className="tab-bar" style={{ marginBottom: 0 }}>
            <button type="button" className={`tab-bar-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All</button>
            <button type="button" className={`tab-bar-btn ${filter === 'featured' ? 'active' : ''}`} onClick={() => setFilter('featured')}>Featured</button>
          </div>
        </header>

        {loading && <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '4rem' }}>Loading gallery...</p>}

        {!loading && boards.length === 0 && (
          <div className="glass-card" style={{ padding: '4rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)' }}>No public boards yet. Be the first to publish!</p>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
          {boards.map((board) => (
            <article key={board.id} className="glass-card glass-card-interactive" style={{ overflow: 'hidden', padding: 0 }}>
              <div className="gallery-card__preview">{board.emoji_icon || '📋'}</div>
              <div style={{ padding: '1.25rem' }}>
                <Link to={`/board/${board.id}`} style={{ fontWeight: 600, fontSize: '1rem', textDecoration: 'none', color: 'inherit' }}>
                  {board.name}
                </Link>
                {board.description && (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.35rem', lineHeight: 1.5 }}>{board.description}</p>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <span>by {board.author_name}</span>
                  {board.category && <span className="badge">{board.category}</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => handleLike(board.id)}
                    disabled={!token}
                    className="btn-ghost"
                    style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                  >
                    ❤️ {board.like_count}
                  </button>
                  {board.featured && <span style={{ fontSize: '0.7rem', color: '#fcd34d' }}>⭐ Featured</span>}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
