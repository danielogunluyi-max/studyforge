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

function decayStatus(score: number): { label: string; color: string; bg: string } {
  if (score <= 30) return { label: 'Fresh', color: '#10b981', bg: 'rgba(16,185,129,0.12)' };
  if (score <= 60) return { label: 'Fading', color: '#f0b429', bg: 'rgba(240,180,41,0.12)' };
  if (score <= 85) return { label: 'Decaying', color: '#f97316', bg: 'rgba(249,115,22,0.12)' };
  return { label: 'Almost forgotten!', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' };
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

  // Most at-risk subject = subject of highest decay score
  const worstDeck = visible.length > 0 ? visible[0]?.deckName ?? '—' : '—';

  return (
    <div style={{ padding: '32px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 className="kv-heading-page" style={{ marginBottom: '6px' }}>
          Knowledge Decay Alerts ⏳
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          Concepts you're about to forget — review them now.
        </p>
      </div>

      {/* Summary stats */}
      {!loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'Overdue Cards', value: totalOverdue, color: '#ef4444', emoji: '⚠️' },
            { label: 'Avg Decay Score', value: `${avgDecay}%`, color: '#f97316', emoji: '📉' },
            { label: 'Most At-Risk', value: worstDeck.length > 16 ? worstDeck.slice(0, 14) + '…' : worstDeck, color: '#f0b429', emoji: '🔥' },
          ].map((stat) => (
            <div key={stat.label} className="kv-card" style={{ textAlign: 'center', padding: '18px 10px' }}>
              <div style={{ fontSize: '22px', marginBottom: '4px' }}>{stat.emoji}</div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: stat.color, marginBottom: '2px' }}>{stat.value}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton" style={{ height: 100, borderRadius: '12px' }} />
          ))}
        </div>
      )}

      {!loading && visible.length === 0 && (
        <div
          className="kv-card"
          style={{
            textAlign: 'center',
            padding: '48px 24px',
            border: '1px solid rgba(16,185,129,0.3)',
            background: 'rgba(16,185,129,0.05)',
          }}
        >
          <div style={{ fontSize: '52px', marginBottom: '14px' }}>✅</div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#10b981', marginBottom: '8px' }}>
            You're all caught up!
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>No concepts are decaying. Keep studying to maintain your knowledge.</p>
        </div>
      )}

      {!loading && visible.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {visible.map((alert) => {
            const status = decayStatus(alert.decayScore);
            return (
              <div key={alert.conceptId} className="kv-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px', gap: '12px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {alert.conceptTitle}
                    </h3>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Deck: {alert.deckName}</p>
                  </div>
                  <span
                    style={{
                      flexShrink: 0,
                      padding: '3px 10px',
                      borderRadius: '99px',
                      background: status.bg,
                      color: status.color,
                      fontSize: '11px',
                      fontWeight: 700,
                    }}
                  >
                    {alert.daysOverdue}d overdue
                  </span>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Decay Score
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: status.color }}>
                      {alert.decayScore}% — {status.label}
                    </span>
                  </div>
                  <div className="kv-progress-track">
                    <div
                      className="kv-progress-fill"
                      style={{ width: `${alert.decayScore}%`, background: status.color, transition: 'width 0.5s ease' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <a href={`/flashcards/${alert.deckId}/study`} style={{ textDecoration: 'none' }}>
                    <button className="kv-btn-primary" style={{ fontSize: '13px', padding: '7px 16px' }}>
                      Review Now →
                    </button>
                  </a>
                  <button
                    className="kv-btn-secondary"
                    style={{ fontSize: '13px', padding: '7px 16px' }}
                    onClick={() => setDismissed((prev) => new Set([...prev, alert.conceptId]))}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
