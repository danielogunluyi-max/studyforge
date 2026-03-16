'use client';

import { useEffect, useRef, useState } from 'react';
import LoadingButton from '@/app/_components/loading-button';
import Skeleton from '@/app/_components/skeleton';
import EmptyState from '@/app/_components/empty-state';

type Player = {
  id: string;
  userId: string;
  score: number;
  eliminated: boolean;
  user: { name: string | null };
};

type Question = {
  q: string;
  options: string[];
  answer: string;
  points: number;
};

type Battle = {
  id: string;
  code: string;
  subject: string;
  status: 'waiting' | 'active' | 'finished';
  hostId: string;
  questions: Question[];
  currentQuestion: number;
  players: Player[];
};

type Mode = 'menu' | 'host' | 'join' | 'waiting' | 'playing' | 'results';

const POLL_MS = 2000;
const QUESTION_SECS = 15;

export default function BattleRoyalePage() {
  const [mode, setMode] = useState<Mode>('menu');
  const [subject, setSubject] = useState('');
  const [sourceText, setSourceText] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [battle, setBattle] = useState<Battle | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Playing state
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answerResult, setAnswerResult] = useState<'correct' | 'wrong' | null>(null);
  const [timeLeft, setTimeLeft] = useState(QUESTION_SECS);
  const [scores, setScores] = useState<Record<string, number>>({});

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch current user session once
  useEffect(() => {
    fetch('/api/user')
      .then(async (r) => {
        const d = (await r.json().catch(() => null)) as { user?: { id: string } } | null;
        setCurrentUserId(d?.user?.id ?? null);
      })
      .catch(() => undefined);
    return () => {
      clearPoll();
      clearTimer();
    };
  }, []);

  function clearPoll() {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
  }

  function clearTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }

  function startPolling(code: string) {
    clearPoll();
    pollRef.current = setInterval(() => {
      fetch(`/api/battle-royale?code=${code}`)
        .then(async (r) => {
          const d = (await r.json().catch(() => null)) as { battle?: Battle } | null;
          if (d?.battle) handleBattleUpdate(d.battle);
        })
        .catch(() => undefined);
    }, POLL_MS);
  }

  function handleBattleUpdate(b: Battle) {
    setBattle(b);
    if (b.status === 'active' && mode !== 'playing') {
      setMode('playing');
      setSelectedAnswer(null);
      setAnswerResult(null);
      setTimeLeft(QUESTION_SECS);
      startQuestionTimer();
    }
    if (b.status === 'finished') {
      clearPoll();
      clearTimer();
      setMode('results');
    }
    // Sync scores
    const newScores: Record<string, number> = {};
    for (const p of b.players) {
      newScores[p.userId] = p.score;
    }
    setScores(newScores);
  }

  function startQuestionTimer() {
    clearTimer();
    let sec = QUESTION_SECS;
    setTimeLeft(sec);
    timerRef.current = setInterval(() => {
      sec -= 1;
      setTimeLeft(sec);
      if (sec <= 0) {
        clearTimer();
        // Auto-advance — host or just wait for poll
      }
    }, 1000);
  }

  async function createBattle() {
    if (!subject.trim()) { setError('Please enter a subject.'); return; }
    setLoading(true); setError('');
    try {
      const r = await fetch('/api/battle-royale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, sourceText }),
      });
      const d = (await r.json().catch(() => null)) as { battle?: Battle; error?: string } | null;
      if (d?.battle) {
        setBattle(d.battle);
        setMode('waiting');
        startPolling(d.battle.code);
      } else {
        setError(d?.error ?? 'Failed to create battle');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  async function joinBattle() {
    const code = joinCode.trim().toUpperCase();
    if (code.length !== 6) { setError('Enter a valid 6-character code.'); return; }
    setLoading(true); setError('');
    try {
      const r = await fetch('/api/battle-royale/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const d = (await r.json().catch(() => null)) as { battle?: Battle; error?: string } | null;
      if (d?.battle) {
        setBattle(d.battle);
        setMode('waiting');
        startPolling(code);
      } else {
        setError(d?.error ?? 'Could not join battle');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  async function startBattle() {
    if (!battle) return;
    setLoading(true);
    try {
      await fetch(`/api/battle-royale/${battle.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' }),
      });
    } catch {
      setError('Failed to start');
    } finally {
      setLoading(false);
    }
  }

  async function submitAnswer(option: string) {
    if (!battle || selectedAnswer || !currentUserId) return;
    setSelectedAnswer(option);
    const q = battle.questions[battle.currentQuestion ?? 0];
    const correct = q?.answer === option;
    setAnswerResult(correct ? 'correct' : 'wrong');
    clearTimer();
    if (correct && battle) {
      setScores((prev) => ({ ...prev, [currentUserId]: (prev[currentUserId] ?? 0) + (q?.points ?? 10) }));
    }
    // Wait and let host advance
    setTimeout(async () => {
      setSelectedAnswer(null);
      setAnswerResult(null);
      if (battle.hostId === currentUserId) {
        await fetch(`/api/battle-royale/${battle.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'next' }),
        }).catch(() => undefined);
      }
    }, 2000);
  }

  function reset() {
    clearPoll(); clearTimer();
    setBattle(null); setMode('menu');
    setSubject(''); setSourceText(''); setJoinCode('');
    setError(''); setSelectedAnswer(null); setAnswerResult(null);
  }

  const isHost = battle?.hostId === currentUserId;
  const currentQ = battle?.questions?.[battle?.currentQuestion ?? 0];
  const timerPct = (timeLeft / QUESTION_SECS) * 100;
  const sortedPlayers = battle ? [...battle.players].sort((a, b) => (scores[b.userId] ?? b.score) - (scores[a.userId] ?? a.score)) : [];

  return (
    <div style={{ padding: '32px', maxWidth: '860px', margin: '0 auto' }} className="kv-animate-in">
      {/* MENU */}
      {mode === 'menu' && (
        <>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>⚔️</div>
            <h1 style={{ fontSize: '28px', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: '8px' }}>
              Battle Royale
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>
              Multiplayer quiz showdown. Last one standing wins.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', maxWidth: '500px', margin: '0 auto' }}>
            <button
              className="kv-btn-primary"
              onClick={() => { setMode('host'); setError(''); }}
              style={{ padding: '20px', fontSize: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}
            >
              <span style={{ fontSize: '30px' }}>🏠</span>
              Host a Battle
            </button>
            <button
              className="kv-btn-secondary"
              onClick={() => { setMode('join'); setError(''); }}
              style={{ padding: '20px', fontSize: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}
            >
              <span style={{ fontSize: '30px' }}>🚪</span>
              Join Battle
            </button>
          </div>
        </>
      )}

      {/* HOST MODE */}
      {mode === 'host' && (
        <div style={{ maxWidth: '540px', margin: '0 auto' }}>
          <button onClick={() => setMode('menu')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '13px', marginBottom: '20px' }}>← Back</button>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '20px' }}>🏠 Host a Battle</h2>
          <div className="kv-card">
            <div style={{ marginBottom: '14px' }}>
              <label className="kv-label">Subject *</label>
              <input className="kv-input" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Chemistry — Periodic Table" />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label className="kv-label">Source Text (optional)</label>
              <textarea className="kv-input" rows={4} value={sourceText} onChange={(e) => setSourceText(e.target.value)} placeholder="Paste notes or text to generate questions from..." style={{ resize: 'vertical' }} />
            </div>
            {error && <p style={{ color: '#ef4444', fontSize: '13px', marginBottom: '12px' }}>{error}</p>}
            <button className="kv-btn-primary" onClick={() => void createBattle()} disabled={loading}>
              {loading ? (
                <span style={{ opacity: 0.7 }}>⚙️ Generating 20 questions...</span>
              ) : (
                <span>⚔️ Create Battle</span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* JOIN MODE */}
      {mode === 'join' && (
        <div style={{ maxWidth: '400px', margin: '0 auto' }}>
          <button onClick={() => setMode('menu')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '13px', marginBottom: '20px' }}>← Back</button>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '20px' }}>🚪 Join a Battle</h2>
          <div className="kv-card">
            <div style={{ marginBottom: '16px' }}>
              <label className="kv-label">6-Character Battle Code</label>
              <input
                className="kv-input"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="ABC123"
                maxLength={6}
                style={{ fontSize: '22px', letterSpacing: '0.18em', textTransform: 'uppercase', textAlign: 'center' }}
              />
            </div>
            {error && <p style={{ color: '#ef4444', fontSize: '13px', marginBottom: '12px' }}>{error}</p>}
            <button className="kv-btn-primary" onClick={() => void joinBattle()} disabled={loading}>
              {loading ? 'Joining...' : '🚪 Join Battle'}
            </button>
          </div>
        </div>
      )}

      {/* WAITING ROOM */}
      {mode === 'waiting' && battle && (
        <div style={{ maxWidth: '540px', margin: '0 auto' }}>
          <div className="kv-card-gold" style={{ textAlign: 'center', marginBottom: '20px' }}>
            <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Battle Code</p>
            <div
              style={{
                fontSize: '38px',
                fontWeight: 900,
                letterSpacing: '0.2em',
                color: '#f0b429',
                fontFamily: 'monospace',
                marginBottom: '8px',
                cursor: 'pointer',
              }}
              onClick={() => void navigator.clipboard.writeText(battle.code)}
              title="Click to copy"
            >
              {battle.code}
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Click code to copy · Subject: {battle.subject}</p>
          </div>

          <div className="kv-card" style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>
              👥 Players ({battle.players.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {battle.players.map((p) => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #f0b429, #2dd4bf)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '13px',
                      fontWeight: 900,
                      color: '#0a0a0f',
                    }}
                  >
                    {(p.user?.name ?? 'P').charAt(0).toUpperCase()}
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {p.user?.name ?? 'Player'} {p.userId === battle.hostId ? '👑' : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {isHost ? (
            <button className="kv-btn-primary" onClick={() => void startBattle()} disabled={loading || battle.players.length < 1}>
              {loading ? 'Starting...' : '⚔️ Start Battle!'}
            </button>
          ) : (
            <div className="kv-card" style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
              ⏳ Waiting for host to start the battle...
            </div>
          )}
        </div>
      )}

      {/* PLAYING */}
      {mode === 'playing' && battle && currentQ && (
        <div>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '2px' }}>
                Question {(battle.currentQuestion ?? 0) + 1} of {battle.questions.length}
              </p>
              <div style={{ height: '4px', width: '180px', background: 'var(--border-default)', borderRadius: '2px' }}>
                <div style={{ height: '100%', borderRadius: '2px', background: '#f0b429', width: `${(((battle.currentQuestion ?? 0) + 1) / battle.questions.length) * 100}%` }} />
              </div>
            </div>

            {/* Circular countdown */}
            <div style={{ position: 'relative', width: '56px', height: '56px' }}>
              <svg width="56" height="56" viewBox="0 0 56 56" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="28" cy="28" r="22" fill="none" stroke="var(--border-default)" strokeWidth="4" />
                <circle
                  cx="28" cy="28" r="22" fill="none"
                  stroke={timeLeft <= 5 ? '#ef4444' : '#f0b429'}
                  strokeWidth="4"
                  strokeDasharray={`${2 * Math.PI * 22}`}
                  strokeDashoffset={`${2 * Math.PI * 22 * (1 - timerPct / 100)}`}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s ease' }}
                />
              </svg>
              <span style={{
                position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '16px', fontWeight: 900, color: timeLeft <= 5 ? '#ef4444' : 'var(--text-primary)'
              }}>
                {timeLeft}
              </span>
            </div>
          </div>

          {/* Question */}
          <div className="kv-card" style={{ marginBottom: '20px', padding: '28px 24px' }}>
            <p style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.5 }}>{currentQ.q}</p>
          </div>

          {/* Options */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
            {(currentQ.options ?? []).map((opt) => {
              let bg = 'var(--bg-card)';
              let borderColor = 'var(--border-default)';
              let color = 'var(--text-primary)';
              if (selectedAnswer) {
                if (opt === currentQ.answer) { bg = 'rgba(16,185,129,0.15)'; borderColor = '#10b981'; color = '#10b981'; }
                else if (opt === selectedAnswer && opt !== currentQ.answer) { bg = 'rgba(239,68,68,0.12)'; borderColor = '#ef4444'; color = '#ef4444'; }
              }
              return (
                <button
                  key={opt}
                  disabled={!!selectedAnswer}
                  onClick={() => void submitAnswer(opt)}
                  style={{
                    padding: '16px 18px',
                    borderRadius: '12px',
                    border: `2px solid ${borderColor}`,
                    background: bg,
                    color,
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: selectedAnswer ? 'default' : 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {opt}
                </button>
              );
            })}
          </div>

          {answerResult && (
            <div style={{ textAlign: 'center', fontSize: '22px', fontWeight: 900, color: answerResult === 'correct' ? '#10b981' : '#ef4444', marginBottom: '16px' }}>
              {answerResult === 'correct' ? '✅ Correct! +' + (currentQ.points ?? 10) + ' pts' : '❌ Wrong!'}
            </div>
          )}

          {/* Scoreboard */}
          <div className="kv-card">
            <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px' }}>🏆 Live Scoreboard</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {sortedPlayers.map((p, i) => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', opacity: p.eliminated ? 0.4 : 1 }}>
                  <span style={{ width: '20px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textAlign: 'center' }}>{i + 1}</span>
                  <span style={{ flex: 1, fontSize: '13px', color: 'var(--text-primary)' }}>
                    {p.eliminated ? '💀 ' : ''}{p.user?.name ?? 'Player'}
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#f0b429' }}>{scores[p.userId] ?? p.score} pts</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* RESULTS */}
      {mode === 'results' && battle && (
        <div style={{ maxWidth: '540px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏆</div>
          <h2 style={{ fontSize: '24px', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '6px' }}>Battle Over!</h2>
          {sortedPlayers[0] && (
            <p style={{ fontSize: '16px', color: '#f0b429', fontWeight: 700, marginBottom: '28px' }}>
              Winner: {sortedPlayers[0].user?.name ?? 'Player'} 🎉
            </p>
          )}

          <div className="kv-card" style={{ marginBottom: '20px', textAlign: 'left' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>Final Leaderboard</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {sortedPlayers.map((p, i) => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: i === 0 ? 'linear-gradient(135deg, #f0b429, #f97316)' : 'var(--bg-elevated)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '13px',
                      fontWeight: 900,
                      color: i === 0 ? '#0a0a0f' : 'var(--text-muted)',
                    }}
                  >
                    {i + 1}
                  </div>
                  <span style={{ flex: 1, fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {p.user?.name ?? 'Player'} {p.userId === currentUserId ? '(you)' : ''}
                  </span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#f0b429' }}>{scores[p.userId] ?? p.score} pts</span>
                </div>
              ))}
            </div>
          </div>

          <button className="kv-btn-primary" onClick={reset}>⚔️ Play Again</button>
        </div>
      )}
    </div>
  );
}
