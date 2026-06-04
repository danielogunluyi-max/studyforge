'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type FocusScore = {
  id: string;
  score: number;
  activeMinutes: number;
  totalMinutes: number;
  distractions: number;
  createdAt: string;
};

function getLabel(score: number): string {
  if (score > 80) return 'Deep Focus';
  if (score >= 60) return 'Good Focus';
  if (score >= 40) return 'Distracted';
  return 'Poor Focus';
}

function getColor(score: number): string {
  if (score > 80) return '#22c55e';
  if (score >= 60) return '#f0b429';
  if (score >= 40) return '#fb923c';
  return '#ef4444';
}

export default function FocusScorePage() {
  const timerRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  const [active, setActive] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [distractions, setDistractions] = useState(0);
  const [history, setHistory] = useState<FocusScore[]>([]);
  const [latest, setLatest] = useState<FocusScore | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    void loadHistory();
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, []);

  async function loadHistory() {
    try {
      const res = await fetch('/api/focus-score');
      const data = (await res.json().catch(() => ({}))) as { scores?: FocusScore[] };
      const list = (data.scores ?? []).slice(0, 14);
      setHistory(list);
      setLatest(list[0] ?? null);
    } catch {
      setHistory([]);
    }
  }

  function startSession() {
    setError('');
    setActive(true);
    setElapsedSeconds(0);
    setDistractions(0);
    startRef.current = Date.now();
    timerRef.current = window.setInterval(() => {
      const started = startRef.current ?? Date.now();
      setElapsedSeconds(Math.floor((Date.now() - started) / 1000));
    }, 1000);
  }

  function logDistraction() {
    setDistractions((prev) => prev + 1);
  }

  async function endSession() {
    if (!active) return;
    if (timerRef.current) window.clearInterval(timerRef.current);
    setActive(false);
    setSaving(true);
    setError('');

    const totalMinutes = Math.max(1, Math.round(elapsedSeconds / 60));
    const activeMinutes = Math.max(0, totalMinutes - distractions);

    try {
      const res = await fetch('/api/focus-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activeMinutes, totalMinutes, distractions }),
      });
      const data = (await res.json().catch(() => ({}))) as { focusScore?: FocusScore; error?: string };
      if (!res.ok || !data.focusScore) {
        setError(data.error ?? 'Failed to save focus session');
        return;
      }
      const entry = data.focusScore;
      setLatest(entry);
      setHistory((prev) => [entry, ...prev].slice(0, 14));
    } catch {
      setError('Failed to save focus session');
    } finally {
      setSaving(false);
    }
  }

  const average = useMemo(() => {
    if (!history.length) return 0;
    return Math.round(history.reduce((sum, item) => sum + item.score, 0) / history.length);
  }, [history]);

  const best = useMemo(() => {
    if (!history.length) return 0;
    return Math.max(...history.map((item) => item.score));
  }, [history]);

  const trend = useMemo(() => {
    if (history.length < 4) return 'stable';
    const recent = history.slice(0, 4).reduce((sum, item) => sum + item.score, 0) / 4;
    const older = history.slice(4, 8).reduce((sum, item) => sum + item.score, 0) / Math.max(1, history.slice(4, 8).length);
    if (recent >= older + 5) return 'improving';
    if (recent <= older - 5) return 'declining';
    return 'stable';
  }, [history]);

  return (
    <main className="kv-page">
      <section className="kv-section">
        <h1 className="kv-title">Focus Score 🎯</h1>
        <p className="kv-subtitle">How deep is your focus? Track it scientifically.</p>

        <div className="kv-card mt-5">
          <h2 className="mb-3 text-lg font-semibold">Active Session Tracker</h2>
          {!active ? (
            <button className="kv-btn-primary" onClick={startSession}>Start Focus Session</button>
          ) : (
            <div>
              <p className="mb-3 text-xl font-bold">Elapsed: {Math.floor(elapsedSeconds / 60)}m {elapsedSeconds % 60}s</p>
              <div className="flex flex-wrap gap-2">
                <button className="kv-btn-secondary" onClick={logDistraction}>Distraction detected ({distractions})</button>
                <button className="kv-btn-primary" onClick={() => void endSession()}>End Session</button>
              </div>
            </div>
          )}
          {saving && <p className="mt-3 text-sm text-[var(--text-muted)]">Saving focus score...</p>}
          {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
        </div>

        {latest && (
          <div className="kv-card-elevated mt-5" style={{ borderColor: `${getColor(latest.score)}66` }}>
            <p className="text-sm text-[var(--text-secondary)]">Latest session score</p>
            <p className="text-6xl font-black" style={{ color: getColor(latest.score) }}>{latest.score}</p>
            <p className="mb-2 font-semibold" style={{ color: getColor(latest.score) }}>{getLabel(latest.score)}</p>
            <p className="text-sm text-[var(--text-muted)]">
              Breakdown: active {latest.activeMinutes} min, total {latest.totalMinutes} min, distractions {latest.distractions}
            </p>
          </div>
        )}

        <div className="kv-card mt-5">
          <h2 className="mb-3 text-lg font-semibold">History (last 14 sessions)</h2>
          <div className="mb-4 flex items-end gap-2" style={{ minHeight: 160 }}>
            {history.length === 0 && <p className="text-sm text-[var(--text-muted)]">No sessions yet.</p>}
            {history.map((item) => (
              <div key={item.id} className="flex-1 rounded-t" title={`${item.score}`} style={{ height: `${Math.max(8, item.score)}%`, background: getColor(item.score) }} />
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="kv-card-sm">Average focus score: <strong>{average}</strong></div>
            <div className="kv-card-sm">Best session: <strong>{best}</strong></div>
            <div className="kv-card-sm">Current trend: <strong>{trend}</strong></div>
          </div>
        </div>

        <div className="kv-card-teal mt-5">
          <h3 className="mb-2 text-lg font-semibold">Tips</h3>
          {latest && latest.score < 60 && <p>Try the Pomodoro technique with 25-min sessions</p>}
          {latest && latest.score >= 60 && latest.score <= 79 && <p>Good focus! Reduce your phone notifications</p>}
          {latest && latest.score > 80 && <p>Excellent! You're in deep work territory 🔥</p>}
          {!latest && <p>Complete a focus session to unlock your personalized focus tip.</p>}
        </div>
      </section>
    </main>
  );
}
