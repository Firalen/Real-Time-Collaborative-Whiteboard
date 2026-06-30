import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BrandLogo from '../components/BrandLogo';

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        await register(email, password, name);
      } else {
        await login(email, password);
      }
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <aside className="auth-brand-panel">
        <BrandLogo size="lg" showTagline linkToHome={false} />
        <h2>Where teams think visually</h2>
        <p>
          Sketch, collaborate, and present on an infinite canvas — with live cursors,
          built-in video, and AI-powered workflows.
        </p>
        <div className="feature-pills" style={{ justifyContent: 'flex-start', marginTop: '2.5rem' }}>
          {['Free to start', 'No credit card', 'Real-time sync'].map((f) => (
            <span key={f} className="feature-pill">{f}</span>
          ))}
        </div>
      </aside>

      <div className="auth-form-panel">
        <div className="auth-card">
          <BrandLogo size="sm" showTagline linkToHome={false} />
          <p className="auth-subtitle" style={{ marginTop: '1rem' }}>
            {isRegister ? 'Create your CollabBoard account' : 'Welcome back'}
          </p>

          <form onSubmit={handleSubmit}>
            {isRegister && (
              <div className="form-group">
                <label htmlFor="name">Name</label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Your name"
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                placeholder="••••••••"
              />
            </div>

            {error && <p className="error-msg">{error}</p>}

            <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '0.5rem' }}>
              {loading ? 'Please wait...' : isRegister ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <p className="auth-toggle">
            {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button type="button" onClick={() => setIsRegister(!isRegister)}>
              {isRegister ? 'Sign in' : 'Register'}
            </button>
          </p>

          <Link to="/" className="auth-skip">
            Continue without account →
          </Link>
        </div>
      </div>
    </div>
  );
}
