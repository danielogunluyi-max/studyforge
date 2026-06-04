'use client';

import { useEffect, useMemo, useState } from 'react';
import LoadingButton from '@/app/_components/loading-button';
import Skeleton from '@/app/_components/skeleton';
import EmptyState from '@/app/_components/empty-state';

type Challenge = {
  id: string;
  subject1: string;
  subject2: string;
  challenge: string;
  hint?: string;
  userAnswer?: string | null;
  aiFeedback?: string | null;
  score?: number | null;
  completed?: boolean;
  createdAt: string;
};

export default function CrossoverPage() {
  const [current, setCurrent] = useState<Challenge | null>(null);
  const [history, setHistory] = useState<Challenge[]>([]);
  const [answer, setAnswer] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; feedback: string; modelAnswer?: string } | null>(null);
  const [error, setError] = useState('');

  const completed = useMemo(() => history.filter((item) => item.completed), [history]);
  const avgScore = completed.length
    ? Math.round(completed.reduce((sum, item) => sum + (item.score ?? 0), 0) / completed.length)
    : 0;
  const bestScore = completed.length ? Math.max(...completed.map((item) => item.score ?? 0)) : 0;

  const loadHistory = async () => {
    try {
      const response = await fetch('/api/crossover');
      const data = (await response.json()) as { challenges?: Challenge[]; error?: string };
      if (!response.ok) {
        setError(data.error ?? 'Failed to load challenges');
        return;
      }
      const list = data.challenges ?? [];
      setHistory(list);
      const latestUnfinished = list.find((item) => !item.completed) ?? list[0] ?? null;
      setCurrent(latestUnfinished);
    } catch {
      setError('Network error while loading challenges');
    }
  };

  useEffect(() => {
    void loadHistory();
  }, []);

  const generateNewChallenge = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    setAnswer('');
    setShowHint(false);
    try {
      const response = await fetch('/api/crossover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = (await response.json()) as { challenge?: Challenge; hint?: string; error?: string };
      if (!response.ok || !data.challenge) {
        setError(data.error ?? 'Could not generate challenge');
        return;
      }
      setCurrent({ ...data.challenge, hint: data.hint ?? data.challenge.hint });
      await loadHistory();
    } catch {
      setError('Network error while generating challenge');
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async () => {
    if (!current?.id || !answer.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch('/api/crossover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId: current.id, answer: answer.trim() }),
      });
      const data = (await response.json()) as { score?: number; feedback?: string; modelAnswer?: string; error?: string };
      if (!response.ok) {
        setError(data.error ?? 'Could not submit answer');
      } else {
        setResult({
          score: data.score ?? 0,
          feedback: data.feedback ?? 'No feedback returned.',
          modelAnswer: data.modelAnswer,
        });
        await loadHistory();
      }
    } catch {
      setError('Network error while submitting answer');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 kv-animate-in">
      <header className="mb-6">
        <h1 className="text-3xl font-black">Crossover Challenges 🔀</h1>
        <p className="mt-2 text-[var(--text-secondary)]">One challenge. Two subjects. The rarest skill in education.</p>
      </header>

      {error && <div className="kv-card mb-4 border-[var(--accent-red)] p-3 text-sm text-[var(--accent-red)]">{error}</div>}

      <section className="kv-card kv-card-gold mb-4 p-5">
        <div className="mb-3 inline-block rounded-full bg-[rgba(240,180,41,0.2)] px-3 py-1 text-xs font-bold uppercase tracking-wide">Today's Challenge</div>

        {current ? (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-2 text-sm font-semibold">
              <span className="kv-card-gold rounded-full px-3 py-1">{current.subject1 || 'Subject 1'}</span>
              <span>⚡</span>
              <span className="kv-card-teal rounded-full px-3 py-1">{current.subject2 || 'Subject 2'}</span>
            </div>

            <p className="mb-3 text-lg leading-8">{current.challenge}</p>

            <button className="kv-btn-secondary mb-3" onClick={() => setShowHint((prev) => !prev)}>
              {showHint ? 'Hide Hint' : 'Show Hint'}
            </button>
            {showHint && <div className="kv-card-elevated mb-3 rounded-xl p-3 text-sm italic">{current.hint || 'Try connecting core principles from both subjects.'}</div>}

            <textarea
              className="kv-textarea"
              rows={4}
              placeholder="Write your answer"
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
            />

            <button className="kv-btn-primary mt-3" disabled={submitting || !answer.trim()} onClick={() => void submitAnswer()}>
              {submitting ? 'Submitting...' : 'Submit Answer'}
            </button>
          </>
        ) : (
          <p className="text-sm text-[var(--text-secondary)]">No challenge loaded yet.</p>
        )}
      </section>

      {result && (
        <section className="mb-4 space-y-3">
          <div className="kv-card kv-card-gold p-5 text-center">
            <p className="text-sm text-[var(--text-secondary)]">Score</p>
            <div className="text-6xl font-black text-[var(--accent-gold)]">{result.score}</div>
          </div>
          <div className="kv-card kv-card-elevated p-4">
            <h3 className="mb-2 text-lg font-bold">AI Feedback</h3>
            <p>{result.feedback}</p>
          </div>
          <div className="kv-card kv-card-teal p-4">
            <h3 className="mb-2 text-lg font-bold">Model Answer</h3>
            <p>{result.modelAnswer ?? 'Model answer unavailable.'}</p>
          </div>
        </section>
      )}

      <button className="kv-btn-primary mb-4" disabled={loading} onClick={() => void generateNewChallenge()}>
        {loading ? 'Generating...' : 'Generate New Challenge'}
      </button>

      <section className="kv-card mb-4 p-5">
        <h2 className="mb-3 text-xl font-bold">Past Challenges</h2>
        {history.length === 0 && <p className="text-sm text-[var(--text-secondary)]">No previous challenges.</p>}
        <div className="space-y-2">
          {history.map((item) => (
            <article key={item.id} className="kv-card-elevated rounded-xl p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold">{item.subject1} ⚡ {item.subject2}</p>
                  <p className="text-sm text-[var(--text-secondary)]">{item.challenge.slice(0, 90)}...</p>
                </div>
                <div className="text-right text-sm">
                  <p>{item.completed ? '✅ Completed' : '⭕ Not started'}</p>
                  {typeof item.score === 'number' && <p className="font-bold text-[var(--accent-gold)]">{item.score}</p>}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="kv-card p-5">
        <h2 className="mb-3 text-xl font-bold">Stats</h2>
        <div className="kv-grid-2">
          <div className="kv-card-elevated rounded-xl p-3">
            <p className="text-sm text-[var(--text-secondary)]">Total completed</p>
            <p className="text-3xl font-black">{completed.length}</p>
          </div>
          <div className="kv-card-elevated rounded-xl p-3">
            <p className="text-sm text-[var(--text-secondary)]">Avg score</p>
            <p className="text-3xl font-black">{avgScore}</p>
          </div>
          <div className="kv-card-elevated rounded-xl p-3">
            <p className="text-sm text-[var(--text-secondary)]">Best score</p>
            <p className="text-3xl font-black">{bestScore}</p>
          </div>
        </div>
      </section>
    </main>
  );
}
