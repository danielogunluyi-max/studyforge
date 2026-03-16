export default function Loading() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      <div
        style={{
          width: '40px',
          height: '40px',
          border: '3px solid var(--bg-elevated)',
          borderTopColor: 'var(--accent-gold)',
          borderRadius: '50%',
          animation: 'kv-spin 0.7s linear infinite',
        }}
      />
      <p
        style={{
          fontSize: '13px',
          color: 'var(--text-muted)',
          fontWeight: 600,
        }}
      >
        Loading Kyvex...
      </p>
    </div>
  );
}
