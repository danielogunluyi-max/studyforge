'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';

type ModeState = 'setup' | 'active' | 'complete';
type PhaseKey = 'learn' | 'encode' | 'test' | 'reflect';

type SessionPhase = {
  phase: PhaseKey;
  minutes: number;
  label: string;
  completed: boolean;
  features: Array<{ label: string; href: string; icon: string }>;
};

type StudyModeSession = {
  id: string;
  topic: string;
  subject: string;
  totalMinutes: number;
  currentPhase: number;
  phases: SessionPhase[];
};

const PHASE_META: Record<PhaseKey, { name: string; emoji: string; description: string }> = {
  learn: {
    name: 'LEARN',
    emoji: '📖',
    description: 'Absorb core concepts and build a clear mental model before practicing.',
  },
  encode: {
    name: 'ENCODE',
    emoji: '🃏',
    description: 'Convert what you learned into memory anchors using active encoding.',
  },
  test: {
    name: 'TEST',
    emoji: '📋',
    description: 'Challenge recall under pressure and close the weakest gaps.',
  },
  reflect: {
    name: 'REFLECT',
    emoji: '💚',
    description: 'Review what stuck, what did not, and what to improve next session.',
  },
};

function formatClock(totalSeconds: number) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safe / 60)
    .toString()
    .padStart(2, '0');
  const secs = (safe % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export default function StudyModePage() {
  const [view, setView] = useState<ModeState>('setup');
  const [topic, setTopic] = useState('');
  const [subject, setSubject] = useState('');
  const [selectedMinutes, setSelectedMinutes] = useState<30 | 60 | 90 | 120>(60);
  const [session, setSession] = useState<StudyModeSession | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState<number>(Date.now());
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState('');
  const [isBreak, setIsBreak] = useState(false);
  const [breakSecondsLeft, setBreakSecondsLeft] = useState(30);
  const [autoTransformNotice, setAutoTransformNotice] = useState(false);
  const [iqImpactEstimate, setIqImpactEstimate] = useState<number>(0);
  const [iqLoading, setIqLoading] = useState(false);
  const [iqSummary, setIqSummary] = useState<string>('');
  const [iqError, setIqError] = useState('');

  const breakTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (view !== 'active') return;

    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, [view]);

  useEffect(() => {
    if (!autoTransformNotice) return;

    const timer = window.setTimeout(() => setAutoTransformNotice(false), 10000);
    return () => window.clearTimeout(timer);
  }, [autoTransformNotice]);

  useEffect(() => {
    return () => {
      if (breakTimerRef.current) {
        window.clearInterval(breakTimerRef.current);
      }
    };
  }, []);

  const currentPhase = useMemo(() => {
    if (!session) return null;
    return session.phases[session.currentPhase] ?? null;
  }, [session]);

  const elapsedSeconds = useMemo(() => {
    if (!startedAt || view !== 'active') return 0;
    return Math.max(0, Math.floor((nowMs - startedAt) / 1000));
  }, [startedAt, nowMs, view]);

  const totalSeconds = useMemo(() => (session ? session.totalMinutes * 60 : selectedMinutes * 60), [session, selectedMinutes]);
  const remainingSeconds = Math.max(0, totalSeconds - elapsedSeconds);

  const phaseTotalSeconds = currentPhase ? currentPhase.minutes * 60 : 0;
  const secondsBeforePhase = useMemo(() => {
    if (!session) return 0;
    return session.phases.slice(0, session.currentPhase).reduce((sum, phase) => sum + phase.minutes * 60, 0);
  }, [session]);

  const phaseElapsed = clamp(elapsedSeconds - secondsBeforePhase, 0, phaseTotalSeconds);
  const phaseRemaining = Math.max(0, phaseTotalSeconds - phaseElapsed);
  const phaseProgress = phaseTotalSeconds ? phaseElapsed / phaseTotalSeconds : 0;
  const sessionProgress = totalSeconds ? elapsedSeconds / totalSeconds : 0;

  const circleRadius = 56;
  const circleCircumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circleCircumference * (1 - phaseProgress);

  const timerColor = phaseRemaining <= 60 ? '#ef4444' : phaseRemaining <= 180 ? '#f97316' : '#f0b429';

  const startStudyMode = async () => {
    if (!topic.trim() || !subject.trim()) {
      setError('Please enter both topic and subject before starting.');
      return;
    }

    setError('');
    setIqError('');
    setIqSummary('');
    setIsStarting(true);

    try {
      const response = await fetch('/api/study-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          subject: subject.trim(),
          totalMinutes: selectedMinutes,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        session?: StudyModeSession;
        phases?: SessionPhase[];
        error?: string;
      };

      if (!response.ok || !payload.session) {
        setError(payload.error ?? 'Could not start study mode.');
        return;
      }

      const sessionData: StudyModeSession = {
        ...payload.session,
        phases: Array.isArray(payload.phases) ? payload.phases : payload.session.phases,
      };

      setSession(sessionData);
      setStartedAt(Date.now());
      setNowMs(Date.now());
      setView('active');

      setAutoTransformNotice(true);
      void fetch('/api/auto-transform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceType: 'note',
          sourceId: `study-mode-${Date.now()}`,
          sourceTitle: `${topic.trim()} (${subject.trim()})`,
          subject: subject.trim(),
          content: `${topic.trim()}\n${subject.trim()}`,
        }),
      }).catch(() => undefined);
    } catch {
      setError('Could not start study mode.');
    } finally {
      setIsStarting(false);
    }
  };

  const beginBreak = () => {
    setIsBreak(true);
    setBreakSecondsLeft(30);

    if (breakTimerRef.current) {
      window.clearInterval(breakTimerRef.current);
    }

    breakTimerRef.current = window.setInterval(() => {
      setBreakSecondsLeft((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          if (breakTimerRef.current) {
            window.clearInterval(breakTimerRef.current);
          }
          setIsBreak(false);
          return 0;
        }
        return next;
      });
    }, 1000);
  };

  const completePhase = async () => {
    if (!session || !currentPhase) return;

    try {
      const response = await fetch('/api/study-mode', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          action: 'complete-phase',
          phaseIndex: session.currentPhase,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        phases?: SessionPhase[];
        currentPhase?: number;
        completed?: boolean;
      };

      if (!response.ok) return;

      const nextSession: StudyModeSession = {
        ...session,
        phases: payload.phases ?? session.phases,
        currentPhase: typeof payload.currentPhase === 'number' ? payload.currentPhase : session.currentPhase + 1,
      };

      setSession(nextSession);

      if (payload.completed) {
        setView('complete');
        const completedPhases = (payload.phases ?? session.phases).filter((phase) => phase.completed).length;
        setIqImpactEstimate(Math.max(5, Math.round(session.totalMinutes / 8 + completedPhases * 2)));
      } else {
        beginBreak();
      }
    } catch {
      // Keep session running even if completion update fails.
    }
  };

  const abandonSession = async () => {
    if (!session) {
      setView('setup');
      return;
    }

    void fetch('/api/study-mode', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: session.id, action: 'abandon' }),
    }).catch(() => undefined);

    setView('setup');
    setSession(null);
    setStartedAt(null);
    setIsBreak(false);
    setBreakSecondsLeft(30);
  };

  const calculateIq = async () => {
    setIqLoading(true);
    setIqError('');
    setIqSummary('');

    try {
      const response = await fetch('/api/kyvex-iq', { method: 'POST' });
      const payload = (await response.json().catch(() => ({}))) as {
        breakdown?: { total?: number; rank?: string };
        error?: string;
      };

      if (!response.ok) {
        setIqError(payload.error ?? 'Could not calculate updated IQ.');
        return;
      }

      const total = payload.breakdown?.total ?? 0;
      const rank = payload.breakdown?.rank ?? 'Updated';
      setIqSummary(`Kyvex IQ updated: ${total} (${rank})`);
    } catch {
      setIqError('Could not calculate updated IQ.');
    } finally {
      setIqLoading(false);
    }
  };

  const resetSession = () => {
    setView('setup');
    setSession(null);
    setStartedAt(null);
    setIsBreak(false);
    setBreakSecondsLeft(30);
    setIqError('');
    setIqSummary('');
    setError('');
  };

  if (view === 'active' && session && currentPhase) {
    const meta = PHASE_META[currentPhase.phase];
    const completedCount = session.phases.filter((phase) => phase.completed).length;

    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
        {autoTransformNotice ? (
          <div className="page-enter" style={{ position: 'fixed', top: 14, left: '50%', transform: 'translateX(-50%)', zIndex: 250 }}>
            <div className="kv-card" style={{ padding: '10px 14px', borderRadius: 12 }}>
              ⚡ Auto-generating flashcards...
            </div>
          </div>
        ) : null}

        <header className="kv-card" style={{ margin: 12, padding: 12, display: 'grid', gap: 10 }}>
          <div style={{ height: 10, borderRadius: 999, background: 'var(--bg-elevated)', overflow: 'hidden' }}>
            <div
              style={{
                width: `${clamp(sessionProgress * 100, 0, 100)}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #f0b429, #f97316)',
                transition: 'width 300ms ease',
              }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span className="kv-badge kv-badge-blue">Elapsed: {formatClock(elapsedSeconds)}</span>
              <span className="kv-badge kv-badge-gold">Remaining: {formatClock(remainingSeconds)}</span>
              <span className="kv-badge">Phases done: {completedCount}/4</span>
            </div>
            <button type="button" className="kv-btn-ghost" style={{ padding: '6px 10px' }} onClick={abandonSession}>
              Abandon Session
            </button>
          </div>
        </header>

        <main style={{ minHeight: 'calc(100vh - 110px)', display: 'grid', placeItems: 'center', padding: 16 }}>
          {isBreak ? (
            <section className="kv-card kv-card-elevated page-enter" style={{ width: 'min(760px, 100%)', padding: 30, textAlign: 'center' }}>
              <p className="kv-badge kv-badge-blue" style={{ width: 'fit-content', margin: '0 auto 10px' }}>Between Phases</p>
              <h2 className="kv-title-lg" style={{ fontSize: 40, marginBottom: 8 }}>Take a breath 🌬️</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
                Great work. Next phase will begin automatically.
              </p>
              <p style={{ fontSize: 30, fontWeight: 900 }}>{breakSecondsLeft}s</p>
            </section>
          ) : (
            <section className="kv-stack-lg" style={{ width: 'min(1100px, 100%)' }}>
              <div className="kv-card kv-card-gold page-enter" style={{ textAlign: 'center', padding: 28 }}>
                <p className="kv-badge kv-badge-blue" style={{ width: 'fit-content', margin: '0 auto 10px' }}>
                  Phase {session.currentPhase + 1}/4
                </p>
                <h1 className="kv-title-xl" style={{ fontSize: 46, fontWeight: 900, letterSpacing: '-0.03em' }}>
                  {meta.name}
                </h1>
                <p style={{ fontSize: 44, marginTop: 6, marginBottom: 8 }}>{meta.emoji}</p>
                <p style={{ fontWeight: 700 }}>{currentPhase.minutes} minutes</p>
                <p style={{ color: 'var(--text-secondary)', maxWidth: 700, margin: '10px auto 0' }}>{meta.description}</p>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                {currentPhase.features.slice(0, 3).map((feature) => (
                  <button
                    key={feature.href}
                    type="button"
                    className="kv-card-hover"
                    onClick={() => window.open(feature.href, '_blank', 'noopener,noreferrer')}
                    style={{
                      border: '1px solid var(--border-default)',
                      borderRadius: 14,
                      background: 'var(--bg-card)',
                      padding: 16,
                      textAlign: 'left',
                      display: 'grid',
                      gap: 8,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 20 }}>{feature.icon}</span>
                      <span style={{ fontWeight: 700 }}>{feature.label}</span>
                    </div>
                    <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Open in new tab</span>
                  </button>
                ))}
              </div>

              <div className="kv-card" style={{ padding: 20, display: 'grid', gap: 12, justifyItems: 'center' }}>
                <svg width="140" height="140" viewBox="0 0 140 140" role="img" aria-label="Phase countdown">
                  <circle cx="70" cy="70" r={circleRadius} fill="none" stroke="var(--border-default)" strokeWidth="10" />
                  <circle
                    cx="70"
                    cy="70"
                    r={circleRadius}
                    fill="none"
                    stroke={timerColor}
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={circleCircumference}
                    strokeDashoffset={strokeDashoffset}
                    transform="rotate(-90 70 70)"
                    style={{ transition: 'stroke-dashoffset 1s linear, stroke 400ms ease' }}
                  />
                  <text x="70" y="72" textAnchor="middle" dominantBaseline="middle" style={{ fill: 'var(--text-primary)', fontWeight: 800, fontSize: 24 }}>
                    {Math.ceil(phaseRemaining / 60)}m
                  </text>
                </svg>
                <p style={{ color: 'var(--text-secondary)' }}>{formatClock(phaseRemaining)} left in this phase</p>
                <button type="button" className="kv-btn-primary" onClick={completePhase}>
                  Phase Complete ✓
                </button>
              </div>
            </section>
          )}
        </main>
      </div>
    );
  }

  if (view === 'complete' && session) {
    const phasesCompleted = session.phases.filter((phase) => phase.completed).length;
    const totalStudied = Math.round(session.totalMinutes - remainingSeconds / 60);

    return (
      <main className="kv-page" style={{ padding: '36px 16px 90px' }}>
        <section className="kv-container kv-stack-lg" style={{ maxWidth: 760, margin: '0 auto' }}>
          <header className="kv-card kv-card-gold kv-animate-bounce" style={{ padding: 28, textAlign: 'center' }}>
            <h1 className="kv-title-xl" style={{ fontSize: 42, fontWeight: 900 }}>Session Complete! 🎉</h1>
            <p style={{ marginTop: 10, color: 'var(--text-secondary)' }}>
              Total time studied: <strong>{totalStudied} minutes</strong>
            </p>
            <p style={{ marginTop: 6, color: 'var(--text-secondary)' }}>
              Phases completed: <strong>{phasesCompleted}/4</strong>
            </p>
            <p style={{ marginTop: 6, color: 'var(--text-secondary)' }}>
              IQ impact estimate: <strong>+{iqImpactEstimate} points to your Kyvex IQ</strong>
            </p>
          </header>

          <section className="kv-card kv-stack-md" style={{ padding: 20 }}>
            <button type="button" className="kv-btn-primary" onClick={() => void calculateIq()} disabled={iqLoading}>
              {iqLoading ? 'Calculating...' : 'Calculate Updated IQ'}
            </button>
            {iqSummary ? <p style={{ color: 'var(--accent-green)', fontWeight: 700 }}>{iqSummary}</p> : null}
            {iqError ? <p style={{ color: 'var(--accent-red)' }}>{iqError}</p> : null}

            <div className="flex flex-wrap gap-3">
              <button type="button" className="kv-btn-secondary" onClick={resetSession}>
                Start Another Session
              </button>
              <Link href="/dashboard" className="kv-btn-ghost" style={{ textDecoration: 'none' }}>
                Back to Dashboard
              </Link>
            </div>
          </section>
        </section>
      </main>
    );
  }

  return (
    <main className="kv-page" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '32px 16px' }}>
      <section className="kv-stack-lg" style={{ width: '100%', maxWidth: 520 }}>
        <header className="kv-stack-xs" style={{ textAlign: 'center' }}>
          <h1 className="kv-title-xl" style={{ fontSize: 42, fontWeight: 900 }}>Study Mode 🎯</h1>
          <p className="kv-subtitle" style={{ color: 'var(--text-secondary)' }}>
            Lock in. Kyvex sequences everything automatically.
          </p>
        </header>

        <section className="kv-card kv-card-gold kv-stack-md" style={{ maxWidth: 480, margin: '0 auto', padding: 22 }}>
          <input
            className="kv-input"
            placeholder="Topic"
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
          />
          <input
            className="kv-input"
            placeholder="Subject"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
          />

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {[30, 60, 90, 120].map((minutes) => (
              <button
                key={minutes}
                type="button"
                className={selectedMinutes === minutes ? 'kv-btn-primary' : 'kv-btn-secondary'}
                onClick={() => setSelectedMinutes(minutes as 30 | 60 | 90 | 120)}
              >
                {minutes} min
              </button>
            ))}
          </div>

          <button
            type="button"
            className="kv-btn-primary"
            style={{ width: '100%', padding: '12px 16px', fontSize: 16 }}
            disabled={isStarting}
            onClick={() => void startStudyMode()}
          >
            {isStarting ? 'Starting...' : 'Start Study Mode'}
          </button>

          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
            Your session will be automatically sequenced into 4 phases
          </p>

          {error ? <p style={{ color: 'var(--accent-red)' }}>{error}</p> : null}
        </section>
      </section>
    </main>
  );
}
