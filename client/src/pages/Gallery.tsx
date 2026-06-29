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
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Public Gallery</h1>
            <p className="text-gray-500 text-sm mt-1">Discover and explore community boards</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-sm ${filter === 'all' ? 'bg-indigo-600' : 'bg-white/5'}`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('featured')}
              className={`px-3 py-1.5 rounded-lg text-sm ${filter === 'featured' ? 'bg-indigo-600' : 'bg-white/5'}`}
            >
              Featured
            </button>
          </div>
        </div>

        {loading && <p className="text-gray-500 text-center py-16">Loading gallery...</p>}

        {!loading && boards.length === 0 && (
          <p className="text-gray-500 text-center py-16">No public boards yet. Publish one from your workspace!</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {boards.map((board) => (
            <div
              key={board.id}
              className="rounded-xl bg-[#1a1d27] border border-[#2e3348] hover:border-indigo-500 transition-all overflow-hidden"
            >
              <div className="h-32 bg-gradient-to-br from-indigo-900/40 to-purple-900/40 flex items-center justify-center text-5xl">
                {board.emoji_icon || '📋'}
              </div>
              <div className="p-4">
                <Link to={`/board/${board.id}`} className="font-semibold hover:text-indigo-400 transition-colors">
                  {board.name}
                </Link>
                {board.description && (
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{board.description}</p>
                )}
                <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                  <span>by {board.author_name}</span>
                  {board.category && (
                    <span className="px-2 py-0.5 rounded bg-white/5 capitalize">{board.category}</span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-3">
                  <button
                    onClick={() => handleLike(board.id)}
                    disabled={!token}
                    className="text-sm text-gray-400 hover:text-pink-400 disabled:opacity-40"
                    title={token ? 'Like' : 'Sign in to like'}
                  >
                    ❤️ {board.like_count}
                  </button>
                  {board.featured && <span className="text-xs text-yellow-500">⭐ Featured</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
