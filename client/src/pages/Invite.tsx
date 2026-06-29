import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';

export default function Invite() {
  const { token: inviteToken } = useParams<{ token: string }>();
  const { token, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [invite, setInvite] = useState<{ workspaceName: string; email: string; role: string } | null>(null);
  const [error, setError] = useState('');
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (!inviteToken) return;
    api.getInvite(inviteToken)
      .then(setInvite)
      .catch(() => setError('Invitation not found or expired'));
  }, [inviteToken]);

  const handleAccept = async () => {
    if (!token || !inviteToken) return;
    setAccepting(true);
    try {
      const result = await api.acceptInvite(token, inviteToken);
      navigate(`/workspace/${result.workspaceId}`);
    } catch {
      setError('Failed to accept invitation');
    } finally {
      setAccepting(false);
    }
  };

  if (authLoading) return <div className="flex items-center justify-center min-h-screen text-gray-500">Loading...</div>;

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#0f1117] text-gray-100 px-4">
      <div className="w-full max-w-md p-8 rounded-2xl bg-[#1a1d27] border border-[#2e3348] text-center">
        {error && <p className="text-red-400 mb-4">{error}</p>}

        {invite && (
          <>
            <h1 className="text-xl font-bold mb-2">You're invited!</h1>
            <p className="text-gray-400 mb-6">
              Join <strong className="text-white">{invite.workspaceName}</strong> as{' '}
              <span className="capitalize">{invite.role}</span>
            </p>

            {!user ? (
              <Link
                to="/login"
                className="inline-block px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 font-medium"
              >
                Sign in to accept
              </Link>
            ) : (
              <button
                onClick={handleAccept}
                disabled={accepting}
                className="px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 font-medium"
              >
                {accepting ? 'Joining...' : 'Accept Invitation'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
