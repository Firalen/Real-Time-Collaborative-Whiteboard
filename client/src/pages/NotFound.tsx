import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="loading-page">
      <h2>Page not found</h2>
      <p>The page you're looking for doesn't exist.</p>
      <Link to="/" className="btn-primary">Go home</Link>
    </div>
  );
}
