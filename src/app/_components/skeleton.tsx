'use client';

interface SkeletonProps {
  variant?: 'card' | 'text' | 'title' | 'avatar' | 'list';
  count?: number;
  className?: string;
}

export default function Skeleton({ variant = 'card', count = 1, className = '' }: SkeletonProps) {
  const items = Array.from({ length: count });

  if (variant === 'list') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {items.map((_, i) => (
          <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div className="kv-skeleton kv-skeleton-avatar" />
            <div style={{ flex: 1 }}>
              <div className="kv-skeleton kv-skeleton-title" style={{ width: '40%' }} />
              <div className="kv-skeleton kv-skeleton-text" style={{ width: '70%' }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'text') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {items.map((_, i) => (
          <div
            key={i}
            className={`kv-skeleton kv-skeleton-text ${className}`}
            style={{ width: i === items.length - 1 ? '60%' : '100%' }}
          />
        ))}
      </div>
    );
  }

  if (variant === 'title') {
    return <div className={`kv-skeleton kv-skeleton-title ${className}`.trim()} />;
  }

  if (variant === 'avatar') {
    return <div className={`kv-skeleton kv-skeleton-avatar ${className}`.trim()} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {items.map((_, i) => (
        <div key={i} className={`kv-skeleton kv-skeleton-card ${className}`.trim()} />
      ))}
    </div>
  );
}

export { Skeleton };

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return <Skeleton variant="text" count={lines + 2} className="h-3" />;
}

export function SkeletonList({ count = 4 }: { count?: number }) {
  return <Skeleton variant="list" count={count} />;
}
