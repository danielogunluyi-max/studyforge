export default function NotFound() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-base)',
        fontFamily: 'inherit',
      }}
    >
      <div
        className="kv-animate-bounce"
        style={{
          fontSize: '80px',
          marginBottom: '24px',
        }}
      >
        🔍
      </div>
      <h1
        style={{
          fontSize: '32px',
          fontWeight: 900,
          color: 'var(--text-primary)',
          letterSpacing: '-0.03em',
          marginBottom: '8px',
        }}
      >
        Page not found
      </h1>
      <p
        style={{
          fontSize: '15px',
          color: 'var(--text-muted)',
          marginBottom: '32px',
        }}
      >
        This page doesn't exist or was moved.
      </p>
      <a href="/dashboard" className="kv-btn-primary" style={{ textDecoration: 'none' }}>
        Back to Dashboard →
      </a>
    </div>
  );
}
