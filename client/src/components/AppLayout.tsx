import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../utils/api';
import NotificationBell from './NotificationBell';
import BrandLogo from './BrandLogo';
import LiveDot from './ui/LiveDot';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { user, logout, token } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!token) return;
    api.checkAdmin(token).then((r) => setIsAdmin(r.isAdmin)).catch(() => {});
  }, [token]);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__inner">
          <BrandLogo size="md" />

          <nav className="app-header__nav">
            <button
              type="button"
              className="theme-toggle"
              onClick={toggleTheme}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? '☀' : '☾'}
            </button>
            {user && (
              <>
                <Link to="/gallery" className="nav-pill">Gallery</Link>
                <Link to="/tasks" className="nav-pill">My Tasks</Link>
                {isAdmin && <Link to="/admin" className="nav-pill">Admin</Link>}
                <NotificationBell />
                <div className="user-chip">
                  <LiveDot size="sm" pulse />
                  <span className="user-chip__avatar">{user.name.charAt(0)}</span>
                  <span>{user.name}</span>
                </div>
                <button type="button" onClick={logout} className="btn-ghost">
                  Logout
                </button>
              </>
            )}
            {!user && (
              <Link to="/login" className="btn-primary btn-gradient" style={{ width: 'auto' }}>
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
