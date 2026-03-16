'use client';

import Link from 'next/link';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  action?: { label: string; href?: string; onClick?: () => void };
  secondaryAction?: { label: string; href?: string };
  actionLabel?: string;
  actionHref?: string;
  actionOnClick?: () => void;
  secondaryActionLabel?: string;
  secondaryActionHref?: string;
}

export default function EmptyState({
  icon = '📭',
  title,
  description,
  action,
  secondaryAction,
  actionLabel,
  actionHref,
  actionOnClick,
  secondaryActionLabel,
  secondaryActionHref,
}: EmptyStateProps) {
  const primaryAction =
    action ??
    (actionLabel
      ? {
          label: actionLabel,
          href: actionHref,
          onClick: actionOnClick,
        }
      : undefined);

  const secondary =
    secondaryAction ??
    (secondaryActionLabel
      ? {
          label: secondaryActionLabel,
          href: secondaryActionHref,
        }
      : undefined);

  return (
    <div
      className="kv-animate-in"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '64px 24px',
        textAlign: 'center',
        maxWidth: '400px',
        margin: '0 auto',
      }}
    >
      <div
        className="kv-float"
        style={{
          fontSize: '56px',
          marginBottom: '20px',
          lineHeight: 1,
          filter: 'drop-shadow(0 4px 12px rgba(240,180,41,0.2))',
        }}
      >
        {icon}
      </div>
      <h3
        style={{
          fontSize: '17px',
          fontWeight: 800,
          color: 'var(--text-primary)',
          marginBottom: '8px',
          letterSpacing: '-0.02em',
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontSize: '13px',
          color: 'var(--text-muted)',
          lineHeight: 1.6,
          marginBottom: primaryAction ? '24px' : '0',
        }}
      >
        {description}
      </p>
      {primaryAction && (
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {primaryAction.href ? (
            <Link href={primaryAction.href} className="kv-btn-primary" style={{ textDecoration: 'none' }}>
              {primaryAction.label}
            </Link>
          ) : (
            <button className="kv-btn-primary" onClick={primaryAction.onClick}>
              {primaryAction.label}
            </button>
          )}
          {secondary &&
            (secondary.href ? (
              <Link href={secondary.href} className="kv-btn-ghost" style={{ textDecoration: 'none' }}>
                {secondary.label}
              </Link>
            ) : null)}
        </div>
      )}
    </div>
  );
}

export { EmptyState };
