'use client';

import { useEffect, useState } from 'react';

type DecayAlert = {
  conceptId: string;
  conceptType: string;
  conceptTitle: string;
  decayScore: number;
  daysOverdue: number;
  deckName: string;
  deckId: string;
};

function decayStatus(score: number): string {
  if (score <= 30) return 'Fresh';
  if (score <= 60) return 'Fading';
  if (score <= 85) return 'Decaying';
  return 'Almost forgotten';
}

export default function DecayAlertsPage() {
  const [alerts, setAlerts] = useState<DecayAlert[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/decay-alerts')
      .then(async (r) => {
        const data = (await r.json().catch(() => null)) as { alerts?: DecayAlert[] } | null;
        setAlerts(data?.alerts ?? []);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  const visible = alerts.filter((a) => !dismissed.has(a.conceptId));
  const totalOverdue = visible.length;
  const avgDecay = totalOverdue > 0 ? Math.round(visible.reduce((s, a) => s + a.decayScore, 0) / totalOverdue) : 0;

  const worstDeck = visible.length > 0 ? visible[0]?.deckName ?? '—' : '—';

  return (
    <main className="kv-page" style={{ padding: '24px 16px 100px' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div className="kv-crumb">Kyvex / <b>Decay Alerts</b></div>
        <h1 className="kv-title" style={{ marginTop: 14 }}>Decay Alerts</h1>
        <p className="kv-sub" style={{ marginTop: 10 }}>
          Concepts you&apos;re about to forget — review them now.
        </p>

        {!loading ? (
          <div className="kv-stats" style={{ marginTop: 28, gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <div className="kv-stat">
              <span className="kv-meta">Overdue cards</span>
              <b className="num">{totalOverdue}</b>
            </div>
            <div className="kv-stat">
              <span className="kv-meta">Avg decay</span>
              <b className="num">{avgDecay}%</b>
            </div>
            <div className="kv-stat">
              <span className="kv-meta">Most at-risk</span>
              <b style={{ fontSize: 16 }}>{worstDeck}</b>
            </div>
          </div>
        ) : null}

        {loading ? <p className="kv-meta" style={{ marginTop: 24 }}>Loading…</p> : null}

        {!loading && visible.length === 0 ? (
          <p className="kv-sub" style={{ marginTop: 28 }}>You&apos;re all caught up. No concepts are decaying.</p>
        ) : null}

        {!loading && visible.length > 0 ? (
          <div style={{ marginTop: 8 }}>
            {visible.map((alert) => {
              const status = decayStatus(alert.decayScore);
              return (
                <div key={alert.conceptId} className="kv-row">
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="kv-row-title">{alert.conceptTitle}</div>
                    <div className="kv-row-sub">
                      <span className="kv-chip">{alert.deckName}</span>
                      <span className="kv-chip kv-chip-stale num">{alert.daysOverdue}d overdue</span>
                      <span className="kv-chip">{status}</span>
                    </div>
                    <div className="kv-bar" style={{ marginTop: 10, maxWidth: 280 }}>
                      <div style={{ width: `${Math.max(0, Math.min(100, alert.decayScore))}%` }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <span className="kv-meta num">{alert.decayScore}%</span>
                    <a href={`/flashcards/${alert.deckId}/study`} className="kv-btn-ghost" style={{ textDecoration: 'none' }}>
                      Review
                    </a>
                    <button
                      type="button"
                      className="kv-btn-ghost"
                      onClick={() => setDismissed((prev) => new Set([...prev, alert.conceptId]))}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </main>
  );
}
