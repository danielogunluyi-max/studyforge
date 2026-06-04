'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

type Match = {
  id: string;
  name: string;
  notes: number;
  decks: number;
  sharedTags: string[];
  matchScore: number;
};

export default function MatchPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [matches, setMatches] = useState<Match[]>([]);
  const [myTopTags, setMyTopTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login?from=/match');
  }, [status, router]);

  useEffect(() => {
    if (!session) return;
    void fetch('/api/study-buddy')
      .then((r) => r.json() as Promise<{ matches?: Match[]; myTopTags?: string[] }>)
      .then((d) => {
        setMatches(d.matches ?? []);
        setMyTopTags(d.myTopTags ?? []);
      })
      .catch(() => setError('Failed to load matches'))
      .finally(() => setLoading(false));
  }, [session]);

  const sendRequest = async (targetUserId: string) => {
    setSending(targetUserId);
    setError('');
    try {
      const res = await fetch('/api/study-buddy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId }),
      });
      if (!res.ok) {
        const d = (await res.json()) as { error?: string };
        setError(d.error ?? 'Failed to send request');
        return;
      }
      setSentIds((prev) => new Set([...prev, targetUserId]));
    } catch {
      setError('Failed to send request');
    } finally {
      setSending(null);
    }
  };

  if (status === 'loading' || (status === 'authenticated' && loading)) {
    return (
      <main className="kv-page">
        <div className="kv-card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 24 }}>
          <div className="kv-spinner" />
          <span>Finding your study matches...</span>
        </div>
      </main>
    );
  }

  if (!session) return null;

  return (
    <main className="kv-page">
      <h1 className="kv-page-title">Study Buddy</h1>
      <p className="kv-page-subtitle">Find students who study the same subjects as you and team up.</p>

      {myTopTags.length > 0 && (
        <div className="kv-card" style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8 }}>
            Your top study topics
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {myTopTags.map((tag) => (
              <span key={tag} className="kv-badge kv-badge-gold">{tag}</span>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="kv-card" style={{ marginBottom: 16, borderColor: 'rgba(239,68,68,0.4)', color: 'var(--accent-red)' }}>
          {error}
        </div>
      )}

      {matches.length === 0 && !loading && (
        <div className="kv-empty kv-card">
          <p className="kv-empty-title">No matches found yet</p>
          <p className="kv-empty-text">
            Add tags to your notes to help us find students with the same study topics.
          </p>
        </div>
      )}

      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
        {matches.map((match) => (
          <div key={match.id} className="kv-card" style={{ padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--accent-gold), var(--accent-teal))',
                  color: '#0b1020',
                  fontWeight: 900,
                  fontSize: 18,
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                }}
              >
                {match.name.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {match.name}
                </p>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
                  {match.notes} notes · {match.decks} decks
                </p>
              </div>
            </div>

            {match.sharedTags.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>
                  Shared topics
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {match.sharedTags.map((tag) => (
                    <span
                      key={tag}
                      style={{
                        padding: '2px 8px',
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 600,
                        background: 'rgba(240,180,41,0.12)',
                        color: 'var(--accent-gold)',
                        border: '1px solid rgba(240,180,41,0.25)',
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {match.matchScore > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                <div style={{ flex: 1, height: 4, borderRadius: 999, background: 'var(--border-subtle)', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.min(100, (match.matchScore / 5) * 100)}%`,
                      borderRadius: 999,
                      background: 'linear-gradient(90deg, #f0b429, #2dd4bf)',
                    }}
                  />
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  {match.matchScore} topic{match.matchScore !== 1 ? 's' : ''} in common
                </span>
              </div>
            )}

            <button
              type="button"
              className={sentIds.has(match.id) ? 'kv-btn-secondary' : 'kv-btn-primary'}
              disabled={sending === match.id || sentIds.has(match.id)}
              onClick={() => void sendRequest(match.id)}
              style={{ width: '100%' }}
            >
              {sentIds.has(match.id)
                ? '✓ Request Sent'
                : sending === match.id
                ? 'Sending...'
                : '👋 Connect'}
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}
