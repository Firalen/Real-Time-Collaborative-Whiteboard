import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import NotificationBell from './NotificationBell';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { user, logout, token } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!token) return;
    api.checkAdmin(token).then((r) => setIsAdmin(r.isAdmin)).catch(() => {});
  }, [token]);

  return (
    <div className="min-h-screen bg-[#0f1117] text-gray-100">
      <header className="border-b border-[#2e3348] bg-[#1a1d27]/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="font-bold text-lg hover:text-indigo-400 transition-colors">
            Whiteboard
          </Link>

          <nav className="flex items-center gap-4">
            {user && (
              <>
                <Link to="/gallery" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Gallery
                </Link>
                {isAdmin && (
                  <Link to="/admin" className="text-sm text-gray-400 hover:text-white transition-colors">
                    Admin
                  </Link>
                )}
                <Link to="/tasks" className="text-sm text-gray-400 hover:text-white transition-colors">
                  My Tasks
                </Link>
                <NotificationBell />
                <span className="text-sm text-gray-400">{user.name}</span>
                <button
                  onClick={logout}
                  className="text-sm px-3 py-1.5 rounded-lg border border-[#2e3348] hover:bg-white/5 transition-colors"
                >
                  Logout
                </button>
              </>
            )}
            {!user && (
              <Link
                to="/login"
                className="text-sm px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 transition-colors"
              >
                Sign In
              </Link>
            )}
          </nav>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
