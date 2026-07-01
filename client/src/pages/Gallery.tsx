import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import AppLayout from '../components/AppLayout';
import LiveDot from '../components/ui/LiveDot';
import type { GalleryBoard } from '../types/enterprise';

export default function GalleryPage() {
  const { token } = useAuth();
  const [boards, setBoards] = useState<GalleryBoard[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'featured'>('all');

  useEffect(() => {
    setLoading(true);
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
        <header className="ds-page-hero" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div>
            <span className="ds-badge">Community</span>
            <h1 className="ds-page-title">Public Gallery</h1>
            <p className="ds-page-subtitle">
              Discover inspiring boards from the CollabBoard community — remix ideas, learn workflows, and share your own.
            </p>
            {boards.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <LiveDot label={`${boards.length} boards published`} pulse />
              </div>
            )}
          </div>
          <div className="tab-bar tab-bar--compact">
            <button type="button" className={`tab-bar-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
              All
            </button>
            <button type="button" className={`tab-bar-btn ${filter === 'featured' ? 'active' : ''}`} onClick={() => setFilter('featured')}>
              Featured
            </button>
          </div>
        </header>

        {loading && (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '4rem' }}>
            Loading gallery...
          </p>
        )}

        {!loading && boards.length === 0 && (
          <div className="glass-card glass-panel" style={{ padding: '4rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-base)' }}>
              No public boards yet. Be the first to publish!
            </p>
            <Link to="/" className="btn-primary btn-gradient" style={{ marginTop: '1.5rem', width: 'auto', display: 'inline-flex' }}>
              Go to dashboard
            </Link>
          </div>
        )}

        <div className="ds-gallery-grid">
          {boards.map((board) => (
            <article key={board.id} className="glass-card glass-card-interactive ds-gallery-card">
              <div className="ds-gallery-card__preview">{board.emoji_icon || '📋'}</div>
              <div className="ds-gallery-card__body">
                <Link
                  to={`/board/${board.id}`}
                  style={{ fontWeight: 600, fontSize: 'var(--text-base)', textDecoration: 'none', color: 'inherit' }}
                >
                  {board.name}
                </Link>
                {board.description && (
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: '0.35rem', lineHeight: 1.5 }}>
                    {board.description}
                  </p>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  <span>by {board.author_name}</span>
                  {board.category && <span className="ds-badge">{board.category}</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => handleLike(board.id)}
                    disabled={!token}
                    className="btn-ghost"
                    style={{ padding: '0.25rem 0.6rem', fontSize: 'var(--text-xs)' }}
                    title={token ? 'Like this board' : 'Sign in to like'}
                  >
                    ♥ {board.like_count}
                  </button>
                  {board.featured && (
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--warning)' }}>★ Featured</span>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
