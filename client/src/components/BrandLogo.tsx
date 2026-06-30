import { Link } from 'react-router-dom';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
  linkToHome?: boolean;
}

export default function BrandLogo({ size = 'md', showTagline = false, linkToHome = true }: BrandLogoProps) {
  const content = (
    <div className={`brand-logo brand-logo--${size}`}>
      <div className="brand-logo__icon" aria-hidden>
        <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="4" y="6" width="24" height="20" rx="4" stroke="url(#brandGrad)" strokeWidth="2" />
          <path d="M9 20 L14 12 L18 16 L23 10" stroke="url(#brandGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="22" cy="11" r="2" fill="#22d3ee" />
          <defs>
            <linearGradient id="brandGrad" x1="4" y1="6" x2="28" y2="26" gradientUnits="userSpaceOnUse">
              <stop stopColor="#a78bfa" />
              <stop offset="1" stopColor="#22d3ee" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <div className="brand-logo__text">
        <span className="brand-logo__title">CollabBoard</span>
        {showTagline && (
          <span className="brand-logo__tagline">Real-Time Collaborative Whiteboard</span>
        )}
      </div>
    </div>
  );

  if (linkToHome) {
    return <Link to="/" className="brand-logo-link">{content}</Link>;
  }
  return content;
}
