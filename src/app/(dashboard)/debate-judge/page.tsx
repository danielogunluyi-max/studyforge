'use client';

import { useEffect, useMemo, useState } from 'react';
import LoadingButton from '@/app/_components/loading-button';
import Skeleton from '@/app/_components/skeleton';
import EmptyState from '@/app/_components/empty-state';

type ScoreCard = {
  logic: number;
  evidence: number;
  clarity: number;
  persuasiveness: number;
};

type Debate = {
  id: string;
  code: string;
  topic: string;
  player1Arg: string | null;
  player2Arg: string | null;
  status: 'waiting' | 'judging' | 'complete' | string;
  scores: { A?: ScoreCard; B?: ScoreCard } | null;
  winnerId: string | null;
  verdict: string | null;
  createdAt: string;
};

type VerdictData = {
  winner?: 'A' | 'B' | 'tie';
  scores?: { A?: ScoreCard; B?: ScoreCard };
  verdict?: string;
  strongestPoint?: string;
  weakestPoint?: string;
};

export default function DebateJudgePage() {
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [topic, setTopic] = useState('');
  const [argument, setArgument] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [joinArgument, setJoinArgument] = useState('');
  const [debate, setDebate] = useState<Debate | null>(null);
  const [verdictData, setVerdictData] = useState<VerdictData | null>(null);
  const [history, setHistory] = useState<Debate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    void loadHistory();
  }, []);

  useEffect(() => {
    if (!debate?.code || debate.status === 'complete') return;
    const timer = window.setInterval(() => {
      void pollDebate(debate.code);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [debate?.code, debate?.status]);

  const winnerText = useMemo(() => {
    if (!verdictData?.winner) return '';
    if (verdictData.winner === 'tie') return '🤝 Tie';
    return verdictData.winner === 'A' ? '🏆 Player A wins!' : '🏆 Player B wins!';
  }, [verdictData]);

  async function loadHistory() {
    try {
      const res = await fetch('/api/debate-judge');
      const data = (await res.json().catch(() => ({}))) as { debates?: Debate[] };
      setHistory((data.debates ?? []).filter((entry) => entry.status === 'complete'));
    } catch {
      setHistory([]);
    }
  }

  async function pollDebate(code: string) {
    try {
      const res = await fetch(`/api/debate-judge?code=${encodeURIComponent(code)}`);
      const data = (await res.json().catch(() => ({}))) as { debate?: Debate };
      if (!data.debate) return;
      setDebate(data.debate);
      if (data.debate.status === 'complete') {
        setVerdictData({
          scores: data.debate.scores ?? undefined,
          verdict: data.debate.verdict ?? undefined,
        });
        await loadHistory();
      }
    } catch {
      // keep polling silently
    }
  }

  async function createDebate() {
    if (!topic.trim() || !argument.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/debate-judge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, argument }),
      });
      const data = (await res.json().catch(() => ({}))) as { debate?: Debate; error?: string };
      if (!res.ok || !data.debate) {
        setError(data.error ?? 'Failed to create debate');
        return;
      }
      setDebate(data.debate);
      setVerdictData(null);
    } catch {
      setError('Failed to create debate');
    } finally {
      setLoading(false);
    }
  }

  async function joinDebate() {
    if (!joinCode.trim() || !joinArgument.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/debate-judge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: joinCode.trim().toUpperCase(), argument: joinArgument }),
      });
      const data = (await res.json().catch(() => ({}))) as { debate?: Debate; verdict?: VerdictData; status?: string; error?: string };
      if (!res.ok) {
        setError(data.error ?? 'Failed to join debate');
        return;
      }

      if (data.debate) setDebate(data.debate);
      if (data.status === 'complete' && data.verdict) {
        setVerdictData(data.verdict);
      }
      await loadHistory();
    } catch {
      setError('Failed to join debate');
    } finally {
      setLoading(false);
    }
  }

  function copyCode(code: string) {
    void navigator.clipboard.writeText(code);
  }

  return (
    <main className="kv-page kv-animate-in">
      <section className="kv-section">
        <h1 className="kv-title">AI Debate Judge</h1>
        <p className="kv-subtitle">1v1 academic debates</p>

        <div className="kv-tabs mb-5">
          <button className={`kv-tab ${mode === 'create' ? 'active' : ''}`} onClick={() => setMode('create')} type="button">CREATE</button>
          <button className={`kv-tab ${mode === 'join' ? 'active' : ''}`} onClick={() => setMode('join')} type="button">JOIN</button>
        </div>

        {error && <div className="kv-card mb-4 border border-red-500/40 text-red-300">{error}</div>}

        {mode === 'create' && !debate && (
          <div className="kv-card kv-animate-in">
            <h2 className="mb-3 text-lg font-semibold">Start a Debate</h2>
            <input className="kv-input mb-3" placeholder="Topic" value={topic} onChange={(e) => setTopic(e.target.value)} />
            <textarea className="kv-textarea mb-3" value={argument} onChange={(e) => setArgument(e.target.value)} placeholder="Your argument" />
            <button className="kv-btn-primary" disabled={loading} onClick={() => void createDebate()}>
              {loading ? 'Creating...' : 'Create Debate'}
            </button>
          </div>
        )}

        {mode === 'join' && !debate && (
          <div className="kv-card kv-animate-in">
            <h2 className="mb-3 text-lg font-semibold">Join Debate</h2>
            <input
              className="kv-input mb-3"
              maxLength={6}
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Code (6 chars)"
            />
            <textarea className="kv-textarea mb-3" value={joinArgument} onChange={(e) => setJoinArgument(e.target.value)} placeholder="Your counter-argument" />
            <button className="kv-btn-primary" disabled={loading} onClick={() => void joinDebate()}>
              {loading ? 'Joining...' : 'Join & Submit'}
            </button>
          </div>
        )}

        {debate && debate.status !== 'complete' && (
          <div className="kv-card-gold">
            <p className="mb-2 text-sm">Debate code</p>
            <button className="kv-card w-full text-center font-mono text-4xl font-black" onClick={() => copyCode(debate.code)} type="button">
              {debate.code}
            </button>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">Share this code with your opponent</p>
            <p className="mt-2 text-sm">{debate.status === 'waiting' ? 'Waiting for opponent to join...' : 'Debate is being judged...'}</p>
          </div>
        )}

        {(debate?.status === 'complete' || verdictData) && (
          <div className="kv-card-elevated mt-5">
            <h2 className="mb-2 text-3xl font-black text-[var(--accent-gold)]">The verdict is in...</h2>
            <p className="mb-4 text-2xl font-bold">{winnerText || 'Debate complete'}</p>

            <div className="kv-card mb-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr>
                    <th className="px-2 py-1 text-left">Category</th>
                    <th className="px-2 py-1 text-left">Side A</th>
                    <th className="px-2 py-1 text-left">Side B</th>
                  </tr>
                </thead>
                <tbody>
                  {['logic', 'evidence', 'clarity', 'persuasiveness'].map((category) => (
                    <tr key={category}>
                      <td className="px-2 py-1 capitalize">{category}</td>
                      <td className="px-2 py-1">{verdictData?.scores?.A?.[category as keyof ScoreCard] ?? debate?.scores?.A?.[category as keyof ScoreCard] ?? '-'}</td>
                      <td className="px-2 py-1">{verdictData?.scores?.B?.[category as keyof ScoreCard] ?? debate?.scores?.B?.[category as keyof ScoreCard] ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mb-3 text-lg italic">{verdictData?.verdict ?? debate?.verdict}</p>
            {verdictData?.strongestPoint && <p className="mb-1 text-sm"><strong>Strongest point:</strong> {verdictData.strongestPoint}</p>}
            {verdictData?.weakestPoint && <p className="mb-3 text-sm"><strong>Weakest point:</strong> {verdictData.weakestPoint}</p>}

            <button
              className="kv-btn-secondary"
              onClick={() => {
                setDebate(null);
                setVerdictData(null);
                setTopic('');
                setArgument('');
                setJoinCode('');
                setJoinArgument('');
              }}
            >
              Rematch?
            </button>
          </div>
        )}

        <div className="kv-card mt-6">
          <h3 className="mb-3 text-lg font-semibold">Past Debates</h3>
          {history.length === 0 && <p className="text-sm text-[var(--text-muted)]">No completed debates yet.</p>}
          <div className="space-y-2">
            {history.map((item) => (
              <div key={item.id} className="kv-card-sm">
                <p className="font-semibold text-[var(--text-primary)]">{item.topic}</p>
                <p className="text-sm text-[var(--text-muted)]">Code: {item.code} • {new Date(item.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
