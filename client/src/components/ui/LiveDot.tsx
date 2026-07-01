interface LiveDotProps {
  label?: string;
  size?: 'sm' | 'md';
  pulse?: boolean;
}

export default function LiveDot({ label, size = 'sm', pulse = true }: LiveDotProps) {
  return (
    <span className={`live-dot live-dot--${size}${pulse ? ' live-dot--pulse' : ''}`}>
      <span className="live-dot__ring" aria-hidden />
      <span className="live-dot__core" aria-hidden />
      {label && <span className="live-dot__label">{label}</span>}
    </span>
  );
}
