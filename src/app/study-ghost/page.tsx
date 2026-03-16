'use client';

import { useEffect, useState } from 'react';
import LoadingButton from '@/app/_components/loading-button';
import EmptyState from '@/app/_components/empty-state';

type GhostSnapshot = {
  id: string;
  createdAt: string;
  totalNotes: number;
  totalCards: number;
  totalExams: number;
  avgExamScore: number;
  totalSessions: number;
  narrative: string;
};

type GhostResponse = {
  ghost: GhostSnapshot;
  prevSnapshot: GhostSnapshot | null;
  growth: {
    notes: number;
    cards: number;
    scoreChange: number;
  };
};

export default function StudyGhostPage() {
  const [snapshots, setSnapshots] = useState<GhostSnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState<GhostResponse | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [displayedText, setDisplayedText] = useState('');

  async function loadHistory() {
    const response = await fetch('/api/study-ghost');
    const data = (await response.json().catch(() => null)) as { ghosts?: GhostSnapshot[] } | null;
    setSnapshots(data?.ghosts ?? []);
  }

  useEffect(() => {
    void loadHistory();
  }, []);

  async function takeSnapshot() {
    setLoading(true);
    try {
      const response = await fetch('/api/study-ghost', { method: 'POST' });
      const data = (await response.json().catch(() => null)) as GhostResponse | null;
      if (!response.ok || !data) return;
      setActive(data);
        setDisplayedText('');
      await loadHistory();
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!active) {
      setDisplayedText('');
      return;
    }
    const text = active.ghost.narrative || '';
    let i = 0;
    const timer = setInterval(() => {
      if (i <= text.length) {
        setDisplayedText(text.substring(0, i));
        i++;
      } else {
        clearInterval(timer);
      }
    }, 25);
    return () => clearInterval(timer);
  }, [active]);

  return (
    <div className="kv-page kv-animate-in" style={{ maxWidth: '940px', margin: '0 auto' }}>
      <h1 className="kv-page-title">Study Ghost 👻</h1>
      <p className="kv-page-subtitle">A letter from your past self to remind you how far you have come.</p>

      <div style={{ marginBottom: 20 }}>
        <button className="kv-btn-primary" onClick={() => void takeSnapshot()} disabled={loading}>
          {loading ? (
            <span style={{ opacity: 0.7 }}>Capturing your current study self...</span>
          ) : (
            <span>Take Snapshot</span>
          )}
        </button>
      </div>

      {active ? (
        <div className="kv-card-gold" style={{ maxWidth: 760, margin: '0 auto 20px auto' }}>
          <h2 style={{ marginTop: 0, marginBottom: 10, textAlign: 'center' }}>👻 Your Study Ghost</h2>
          <p
            style={{
              margin: 0,
              fontFamily: 'Georgia, serif',
              lineHeight: 1.8,
              fontStyle: 'italic',
              color: 'var(--text-secondary)',
              whiteSpace: 'pre-wrap',
            }}
          >
            {displayedText}
          </p>

          {active?.prevSnapshot ? (
            <div className="kv-grid-3" style={{ marginTop: 16 }}>
              <div className="kv-card-sm">Notes: +{active?.growth.notes} ↑</div>
              <div className="kv-card-sm">Cards: +{active?.growth.cards} ↑</div>
              <div className="kv-card-sm">Avg Score: {active?.growth.scoreChange! >= 0 ? '+' : ''}{active?.growth.scoreChange.toFixed(1)}% ↑</div>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="kv-card">
        <h3 className="kv-section-title">Timeline</h3>
        {snapshots.length === 0 ? (
          <div className="kv-empty">
            <div className="kv-empty-icon">👻</div>
            <p className="kv-empty-title">Take your first snapshot to start tracking your growth</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {snapshots.map((snap) => {
              const isOpen = !!expanded[snap.id];
              return (
                <div key={snap.id} className="kv-card-sm">
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{new Date(snap.createdAt).toLocaleDateString()}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                        Notes {snap.totalNotes} • Cards {snap.totalCards} • Avg {snap.avgExamScore.toFixed(1)}%
                      </div>
                    </div>
                    <button className="kv-btn-secondary" onClick={() => setExpanded((prev) => ({ ...prev, [snap.id]: !prev[snap.id] }))}>
                      {isOpen ? 'Hide letter' : 'Read full letter'}
                    </button>
                  </div>

                  <p style={{ marginBottom: 0, marginTop: 8, color: 'var(--text-secondary)' }}>
                    {isOpen ? snap.narrative : `${snap.narrative.slice(0, 100)}${snap.narrative.length > 100 ? '...' : ''}`}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
