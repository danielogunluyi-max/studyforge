'use client';

import { useEffect, useMemo, useState } from 'react';

type Counter = {
  attack: string;
  explanation: string;
  strength: number;
  type: string;
};

type Session = {
  id: string;
  topic: string;
  originalArgument: string;
  counterarguments: Counter[];
  score: number;
  createdAt: string;
};

type RebuttalResult = {
  score: number;
  feedback: string;
  improvedVersion: string;
};

function clampStrength(value: number): number {
  return Math.max(0, Math.min(100, Number(value) || 0));
}

export default function CounterargumentPage() {
  const [topic, setTopic] = useState('');
  const [argument, setArgument] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [counterarguments, setCounterarguments] = useState<Counter[]>([]);
  const [overallWeakness, setOverallWeakness] = useState('');
  const [verdict, setVerdict] = useState(0);
  const [rebuttal, setRebuttal] = useState('');
  const [rebuttalResult, setRebuttalResult] = useState<RebuttalResult | null>(null);
  const [history, setHistory] = useState<Session[]>([]);
  const [loadingAttack, setLoadingAttack] = useState(false);
  const [loadingRebuttal, setLoadingRebuttal] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    void loadHistory();
  }, []);

  const strongest = useMemo(() => {
    return [...counterarguments].sort((a, b) => clampStrength(b.strength) - clampStrength(a.strength))[0] ?? null;
  }, [counterarguments]);

  async function loadHistory() {
    try {
      const res = await fetch('/api/counterargument');
      const data = (await res.json().catch(() => ({}))) as { sessions?: Session[] };
      setHistory(data.sessions ?? []);
    } catch {
      setHistory([]);
    }
  }

  async function attackArgument() {
    if (!argument.trim()) return;
    setLoadingAttack(true);
    setError('');
    setRebuttalResult(null);

    try {
      const res = await fetch('/api/counterargument', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, argument }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        counterarguments?: Counter[];
        overallWeakness?: string;
        verdict?: number | string;
        sessionId?: string;
        error?: string;
      };

      if (!res.ok) {
        setError(data.error ?? 'Failed to generate counterarguments');
        return;
      }

      setCounterarguments(data.counterarguments ?? []);
      setOverallWeakness(data.overallWeakness ?? 'No single flaw detected.');
      setVerdict(Number(data.verdict ?? 0));
      setSessionId(data.sessionId ?? '');
      setRebuttal('');
      await loadHistory();
    } catch {
      setError('Failed to generate counterarguments');
    } finally {
      setLoadingAttack(false);
    }
  }

  async function submitRebuttal() {
    if (!sessionId || !rebuttal.trim()) return;
    setLoadingRebuttal(true);
    setError('');
    try {
      const res = await fetch('/api/counterargument', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, topic, argument, userRebuttal: rebuttal }),
      });
      const data = (await res.json().catch(() => ({}))) as RebuttalResult & { error?: string };
      if (!res.ok) {
        setError(data.error ?? 'Failed to score rebuttal');
        return;
      }
      setRebuttalResult({
        score: Number(data.score ?? 0),
        feedback: data.feedback ?? '',
        improvedVersion: data.improvedVersion ?? '',
      });
      await loadHistory();
    } catch {
      setError('Failed to score rebuttal');
    } finally {
      setLoadingRebuttal(false);
    }
  }

  const hasAttacks = counterarguments.length > 0;

  return (
    <main className="kv-page">
      <section className="kv-section">
        <h1 className="kv-title">Counterargument Trainer ⚔️</h1>
        <p className="kv-subtitle">Write your argument. AI destroys it. You defend. Get stronger.</p>

        {!hasAttacks && (
          <div className="kv-card mt-5">
            <label className="mb-2 block text-sm font-semibold">Topic</label>
            <input className="kv-input mb-3" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Should exams be open-book?" />
            <label className="mb-2 block text-sm font-semibold">Your argument</label>
            <textarea
              className="kv-textarea mb-4"
              style={{ minHeight: 220 }}
              value={argument}
              onChange={(e) => setArgument(e.target.value)}
              placeholder="Write your essay argument or thesis here..."
            />
            <button
              className="kv-btn-primary"
              style={{ background: 'linear-gradient(135deg, #ef4444, #b91c1c)', borderColor: '#ef4444' }}
              disabled={loadingAttack || !argument.trim()}
              onClick={() => void attackArgument()}
            >
              {loadingAttack ? 'Finding the weaknesses in your argument...' : 'Attack My Argument'}
            </button>
          </div>
        )}

        {error && <div className="kv-card mt-4 border border-red-500/40 text-red-300">{error}</div>}

        {hasAttacks && (
          <>
            <div className="mt-5 kv-card-gold">
              <h2 className="mb-2 text-2xl font-black text-[var(--text-primary)]">Your argument has been attacked 🗡️</h2>
              <div className="kv-card">
                <p className="text-sm text-[var(--text-secondary)]">Argument strength score</p>
                <p className="text-4xl font-black text-[var(--accent-gold)]">{Math.max(0, Math.min(100, verdict))}/100</p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {counterarguments.map((item, idx) => (
                <div key={`${item.attack}-${idx}`} className="kv-card-elevated" style={{ borderLeft: '4px solid #ef4444' }}>
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="font-bold text-[var(--text-primary)]">{item.attack}</p>
                    <span className="kv-badge kv-badge-red">{item.type}</span>
                  </div>
                  <p className="mb-2 text-sm text-[var(--text-secondary)]">{item.explanation}</p>
                  <div className="kv-progress-track">
                    <div className="kv-progress-fill" style={{ width: `${clampStrength(item.strength)}%`, background: '#ef4444' }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="kv-card mt-4" style={{ border: '1px solid rgba(251,146,60,0.5)' }}>
              <p className="font-semibold text-orange-300">Biggest flaw: {overallWeakness}</p>
            </div>

            {strongest && (
              <div className="kv-card mt-5">
                <h3 className="mb-3 text-xl font-bold">Now defend your argument against each attack</h3>
                <div className="kv-card mb-3" style={{ borderLeft: '4px solid #ef4444' }}>
                  <p className="text-sm text-red-300">Strongest counterargument</p>
                  <p className="font-semibold text-[var(--text-primary)]">{strongest.attack}</p>
                </div>
                <label className="mb-2 block text-sm font-semibold">Your rebuttal</label>
                <textarea className="kv-textarea mb-3" value={rebuttal} onChange={(e) => setRebuttal(e.target.value)} />
                <button className="kv-btn-secondary" disabled={loadingRebuttal || !rebuttal.trim()} onClick={() => void submitRebuttal()}>
                  {loadingRebuttal ? 'Scoring rebuttal...' : 'Submit Rebuttal'}
                </button>

                {rebuttalResult && (
                  <div className="kv-card-teal mt-4">
                    <p className="mb-2 text-lg font-bold">Rebuttal score: {rebuttalResult.score}/100</p>
                    <p className="mb-2 text-sm">{rebuttalResult.feedback}</p>
                    <p className="text-sm italic">Improved version: {rebuttalResult.improvedVersion}</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        <div className="kv-card mt-6">
          <h3 className="mb-3 text-lg font-semibold">Past sessions</h3>
          {history.length === 0 && <p className="text-sm text-[var(--text-muted)]">No sessions yet.</p>}
          <div className="space-y-2">
            {history.map((item) => (
              <div key={item.id} className="kv-card-sm">
                <p className="font-semibold text-[var(--text-primary)]">{item.topic || 'General'}</p>
                <p className="text-sm text-[var(--text-muted)]">Score: {item.score}/100 • {new Date(item.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
