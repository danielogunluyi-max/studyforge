'use client';

import type { CSSProperties, ReactNode } from 'react';

interface LoadingButtonProps {
  loading: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit';
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  children: ReactNode;
  fullWidth?: boolean;
  style?: CSSProperties;
}

export default function LoadingButton({
  loading,
  onClick,
  type = 'button',
  variant = 'primary',
  disabled,
  children,
  fullWidth,
  style,
}: LoadingButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={loading || disabled}
      className={`kv-btn-${variant}`}
      style={{
        width: fullWidth ? '100%' : undefined,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        opacity: loading ? 0.8 : 1,
        cursor: loading || disabled ? 'not-allowed' : 'pointer',
        ...style,
      }}
    >
      {loading && (
        <span className="kv-spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }} />
      )}
      {children}
    </button>
  );
}
