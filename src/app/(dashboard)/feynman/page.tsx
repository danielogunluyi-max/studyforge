'use client';

import { useEffect, useState } from 'react';
import Skeleton from '@/app/_components/skeleton';
import EmptyState from '@/app/_components/empty-state';
import LoadingButton from '@/app/_components/loading-button';

import { trackNovaEvent } from '@/lib/novaClient';

type FeynmanView = 'input' | 'loading' | 'results' | 'history';

type FeynmanResult = {
  sessionId: string;
  score: number;
  gradeLabel: 'Needs Work' | 'Getting There' | 'Good' | 'Excellent';
  gradeSummary: string;
  correct: string[];
  missing: string[];
  wrong: string[];
  studyNext: string[];
  simplifiedExplanation: string;
  encouragement: string;
};

type FeynmanHistoryItem = {
  id: string;
  concept: string;
  score: number;
  gradeLabel: string;
  feedback: {
    correct?: string[];
    missing?: string[];
  } | null;
  attemptNumber: number;
  createdAt: string;
};

const SUGGESTED_CONCEPTS = [
  {
    subject: 'Math',
    concepts: [
      'The Pythagorean theorem',
      'What a derivative means',
      'How integration works',
      'Why imaginary numbers exist',
      'What a logarithm is',
    ],
  },
  {
    subject: 'Science',
    concepts: [
      'How photosynthesis works',
      'What DNA does',
      'How gravity works',
      'What atoms are made of',
      'How vaccines work',
    ],
  },
  {
    subject: 'History',
    concepts: [
      'Why World War I started',
      'What the Cold War was',
      'Why the Roman Empire fell',
      'What colonialism was',
    ],
  },
  {
    subject: 'Computer Science',
    concepts: [
      'What recursion is',
      'How the internet works',
      'What machine learning is',
      'How sorting algorithms work',
      'What a database is',
    ],
  },
  {
    subject: 'Economics',
    concepts: [
      'What inflation is',
      'How supply and demand works',
      'What GDP measures',
      'How interest rates work',
    ],
  },
] as const;

function getScoreColor(score: number): string {
  if (score >= 86) return 'var(--accent-green)';
  if (score >= 66) return 'var(--accent-blue)';
  if (score >= 41) return 'var(--accent-orange)';
  return 'var(--accent-red)';
}

function getScoreBg(score: number): string {
  if (score >= 86) return 'rgba(16,185,129,0.12)';
  if (score >= 66) return 'var(--glow-blue)';
  if (score >= 41) return 'rgba(249,115,22,0.1)';
  return 'rgba(239,68,68,0.1)';
}

export default function FeynmanPage() {
  const [view, setView] = useState<FeynmanView>('input');
  const [concept, setConcept] = useState('');
  const [explanation, setExplanation] = useState('');
  const [attemptNumber, setAttemptNumber] = useState(1);
  const [result, setResult] = useState<FeynmanResult | null>(null);
  const [history, setHistory] = useState<FeynmanHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState('');
  const [charCount, setCharCount] = useState(0);

  const handleSubmit = async () => {
    if (!concept.trim()) {
      setError('Please enter a concept to explain');
      return;
    }
    if (explanation.trim().length < 30) {
      setError('Your explanation is too short — try to explain it fully!');
      return;
    }

    setError('');
    setView('loading');

    try {
      const response = await fetch('/api/feynman', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concept, explanation, attemptNumber }),
      });

      const data = (await response.json().catch(() => ({}))) as Partial<FeynmanResult> & {
        error?: string;
      };

      if (!response.ok || data.error) {
        throw new Error(data.error ?? 'Failed to grade explanation');
      }

      setResult(data as FeynmanResult);
      setView('results');
      trackNovaEvent('NOTE_GENERATED');
    } catch {
      setError('Failed to grade your explanation. Please try again.');
      setView('input');
    }
  };

  const handleTryAgain = () => {
    setExplanation('');
    setCharCount(0);
    setAttemptNumber((value) => value + 1);
    setView('input');
  };

  const handleNewConcept = () => {
    setConcept('');
    setExplanation('');
    setCharCount(0);
    setAttemptNumber(1);
    setResult(null);
    setError('');
    setView('input');
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const response = await fetch('/api/feynman');
      const data = (await response.json().catch(() => ({}))) as {
        sessions?: FeynmanHistoryItem[];
      };
      setHistory(data.sessions ?? []);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (view === 'history') {
      void loadHistory();
    }
  }, [view]);

  if (view === 'loading') {
    return (
      <>
        <div
          className="kv-page kv-animate-in"
          style={{
            padding: '32px',
            maxWidth: '800px',
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            gap: '20px',
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
              animation: 'feynman-pulse 2s infinite',
            }}
          >
            🧠
          </div>
          <div style={{ textAlign: 'center' }}>
            <h2
              className="kv-page-title"
              style={{
                fontSize: '20px',
                fontWeight: 700,
                marginBottom: '8px',
              }}
            >
              Nova is reading your explanation...
            </h2>
            <p className="kv-page-subtitle" style={{ fontSize: '14px' }}>
              Checking your understanding of &quot;{concept}&quot;
            </p>
          </div>
          <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
            {[0, 1, 2].map((index) => (
              <div
                key={index}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: 'var(--accent-blue)',
                  animation: `feynman-bounce 1.2s ${index * 0.2}s infinite`,
                }}
              />
            ))}
          </div>
        </div>
        <style jsx global>{`
          @keyframes feynman-pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.06); opacity: 0.88; }
          }

          @keyframes feynman-bounce {
            0%, 80%, 100% { transform: translateY(0); opacity: 0.55; }
            40% { transform: translateY(-6px); opacity: 1; }
          }
        `}</style>
      </>
    );
  }

  if (view === 'results' && result) {
    const scoreColor = getScoreColor(result.score);
    const scoreBg = getScoreBg(result.score);

    return (
      <div
        className="kv-page kv-animate-in"
        style={{ padding: '32px', maxWidth: '800px', margin: '0 auto' }}
      >
        <div style={{ marginBottom: '28px' }}>
          <h1
            className="kv-page-title"
            style={{
              fontSize: '26px',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              marginBottom: '6px',
            }}
          >
            🧠 Feynman Results
          </h1>
          <p className="kv-page-subtitle" style={{ fontSize: '14px' }}>
            Concept:{' '}
            <strong style={{ color: 'var(--text-secondary)' }}>{concept}</strong>
            {attemptNumber > 1 ? (
              <span className="badge badge-purple" style={{ marginLeft: '8px' }}>
                Attempt #{attemptNumber}
              </span>
            ) : null}
          </p>
        </div>

        <div
          className="kv-card"
          style={{
            padding: '28px',
            marginBottom: '16px',
            background: scoreBg,
            border: `1px solid ${scoreColor}30`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            <div
              style={{
                width: 90,
                height: 90,
                borderRadius: '50%',
                background: `conic-gradient(${scoreColor} ${result.score * 3.6}deg, var(--bg-elevated) 0deg)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                position: 'relative',
              }}
            >
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: '50%',
                  background: 'var(--bg-card)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span
                  style={{
                    fontSize: '20px',
                    fontWeight: 900,
                    color: scoreColor,
                    lineHeight: 1,
                  }}
                >
                  {result.score}
                </span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>/100</span>
              </div>
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <span style={{ fontSize: '22px', fontWeight: 800, color: scoreColor }}>
                  {result.gradeLabel}
                </span>
                <span style={{ fontSize: '22px' }}>
                  {result.score >= 86 ? '🏆' : result.score >= 66 ? '⭐' : result.score >= 41 ? '📈' : '💪'}
                </span>
              </div>
              <p
                style={{
                  fontSize: '14px',
                  color: 'var(--text-secondary)',
                  marginBottom: '8px',
                  lineHeight: 1.5,
                }}
              >
                {result.gradeSummary}
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                &quot;{result.encouragement}&quot;
              </p>
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: '12px',
            marginBottom: '16px',
          }}
        >
          {result.correct.length > 0 ? (
            <div className="kv-card" style={{ padding: '20px' }}>
              <h3
                style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  color: 'var(--accent-green)',
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                ✅ What you got right
              </h3>
              <ul
                style={{
                  margin: 0,
                  paddingLeft: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                {result.correct.map((item, index) => (
                  <li key={`${item}-${index}`} style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {result.missing.length > 0 ? (
            <div className="kv-card" style={{ padding: '20px' }}>
              <h3
                style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  color: 'var(--accent-orange)',
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                ⚠️ What you missed
              </h3>
              <ul
                style={{
                  margin: 0,
                  paddingLeft: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                {result.missing.map((item, index) => (
                  <li key={`${item}-${index}`} style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {result.wrong.length > 0 ? (
            <div className="kv-card" style={{ padding: '20px' }}>
              <h3
                style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  color: 'var(--accent-red)',
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                ❌ Misconceptions to fix
              </h3>
              <ul
                style={{
                  margin: 0,
                  paddingLeft: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                {result.wrong.map((item, index) => (
                  <li key={`${item}-${index}`} style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {result.studyNext.length > 0 ? (
            <div className="kv-card" style={{ padding: '20px' }}>
              <h3
                style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  color: 'var(--accent-blue)',
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                📚 Study these next
              </h3>
              <ul
                style={{
                  margin: 0,
                  paddingLeft: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                {result.studyNext.map((item, index) => (
                  <li key={`${item}-${index}`} style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div
          className="kv-card kv-card-elevated"
          style={{
            padding: '20px',
            marginBottom: '24px',
            border: '1px solid rgba(91,127,255,0.2)',
            background: 'var(--glow-blue)',
          }}
        >
          <h3
            style={{
              fontSize: '14px',
              fontWeight: 700,
              color: 'var(--accent-blue)',
              marginBottom: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            🤖 Nova&apos;s reference explanation
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.7, fontStyle: 'italic' }}>
            &quot;{result.simplifiedExplanation}&quot;
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={handleTryAgain} className="kv-btn-primary">
            🔄 Try again with same concept
          </button>
          <button onClick={handleNewConcept} className="kv-btn-ghost">
            ✨ New concept
          </button>
          <button onClick={() => setView('history')} className="kv-btn-ghost">
            📊 View history
          </button>
        </div>
      </div>
    );
  }

  if (view === 'history') {
    return (
      <div style={{ padding: '32px', maxWidth: '800px', margin: '0 auto' }} className="kv-page kv-animate-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <h1
              className="kv-page-title"
              style={{
                fontSize: '26px',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                marginBottom: '4px',
              }}
            >
              🧠 Your Feynman History
            </h1>
            <p className="kv-page-subtitle" style={{ fontSize: '14px' }}>
              Track how your understanding improves over time
            </p>
          </div>
          <button onClick={handleNewConcept} className="kv-btn-primary">
            + New session
          </button>
        </div>

        {historyLoading ? (
          <Skeleton variant="list" count={5} />
        ) : history.length === 0 ? (
          <EmptyState
            icon="🔬"
            title="No Feynman sessions yet"
            description="Pick a concept and explain it in your own words"
            action={{ label: 'Start now', onClick: handleNewConcept }}
          />
        ) : (
          <div className="kv-stagger kv-animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {history.map((session) => (
              <div
                key={session.id}
                className="kv-card kv-card-hover kv-animate-in"
                style={{ padding: '18px', display: 'flex', alignItems: 'center', gap: '16px' }}
              >
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: '50%',
                    background: getScoreBg(session.score),
                    border: `2px solid ${getScoreColor(session.score)}`,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      fontSize: '16px',
                      fontWeight: 900,
                      color: getScoreColor(session.score),
                      lineHeight: 1,
                    }}
                  >
                    {session.score}
                  </span>
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <h3
                      style={{
                        fontSize: '15px',
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        marginBottom: '2px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {session.concept}
                    </h3>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0 }}>
                      {new Date(session.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: getScoreColor(session.score) }}>
                      {session.gradeLabel}
                    </span>
                    {session.attemptNumber > 1 ? (
                      <span className="badge badge-purple">Attempt #{session.attemptNumber}</span>
                    ) : null}
                    {session.feedback?.correct?.length ? (
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        ✅ {session.feedback.correct.length} correct
                      </span>
                    ) : null}
                    {session.feedback?.missing?.length ? (
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        ⚠️ {session.feedback.missing.length} gaps
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: '32px', maxWidth: '800px', margin: '0 auto' }} className="kv-page kv-animate-in">
      <div
        style={{
          marginBottom: '28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h1
            className="kv-page-title"
            style={{
              fontSize: '26px',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              marginBottom: '6px',
            }}
          >
            🧠 Feynman Technique
          </h1>
          <p
            className="kv-page-subtitle"
            style={{
              fontSize: '14px',
              maxWidth: '480px',
              lineHeight: 1.6,
            }}
          >
            Explain a concept as if teaching a 12-year-old. Nova will grade your understanding and
            show you exactly what you&apos;re missing.
          </p>
        </div>
        <button onClick={() => setView('history')} className="kv-btn-ghost">
          📊 History
        </button>
      </div>

      <div
        className="kv-card kv-card-elevated"
        style={{
          padding: '16px 20px',
          marginBottom: '24px',
          background: 'var(--glow-blue)',
          border: '1px solid rgba(91,127,255,0.2)',
        }}
      >
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          {[
            { step: '1', text: 'Pick any concept' },
            { step: '2', text: 'Explain it simply' },
            { step: '3', text: 'Nova grades you' },
            { step: '4', text: 'Fill the gaps' },
          ].map(({ step, text }) => (
            <div key={step} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: 'var(--accent-blue)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: 800,
                  color: 'white',
                  flexShrink: 0,
                }}
              >
                {step}
              </div>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                {text}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="kv-card" style={{ padding: '24px', marginBottom: '16px' }}>
        <label
          style={{
            fontSize: '13px',
            fontWeight: 700,
            color: 'var(--text-secondary)',
            display: 'block',
            marginBottom: '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          What concept are you explaining?
        </label>
        <input
          className="kv-input"
          placeholder='e.g. "How photosynthesis works" or "What a derivative is"'
          value={concept}
          onChange={(event) => setConcept(event.target.value)}
          style={{ marginBottom: '14px' }}
        />

        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>
          Try one of these:
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {SUGGESTED_CONCEPTS.map((group) => (
            <div key={group.subject}>
              <p
                style={{
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'var(--text-muted)',
                  marginBottom: '6px',
                }}
              >
                {group.subject}
              </p>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {group.concepts.map((item) => (
                  <button
                    key={item}
                    onClick={() => setConcept(item)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '20px',
                      border: `1px solid ${concept === item ? 'var(--accent-blue)' : 'var(--border-default)'}`,
                      background: concept === item ? 'var(--glow-blue)' : 'var(--bg-elevated)',
                      color: concept === item ? 'var(--accent-blue)' : 'var(--text-muted)',
                      fontSize: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    type="button"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="kv-card" style={{ padding: '24px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <label
            style={{
              fontSize: '13px',
              fontWeight: 700,
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Your explanation
          </label>
          <span style={{ fontSize: '12px', color: charCount < 30 ? 'var(--accent-orange)' : 'var(--text-muted)' }}>
            {charCount} chars
            {charCount < 30 && charCount > 0 ? ' — keep going!' : ''}
          </span>
        </div>
        <textarea
          className="kv-textarea"
          rows={7}
          placeholder={
            concept
              ? `Explain "${concept}" as if you're teaching a 12-year-old. Use simple words, examples, and analogies. No jargon allowed!`
              : 'First pick a concept above, then explain it here in simple terms...'
          }
          value={explanation}
          onChange={(event) => {
            setExplanation(event.target.value);
            setCharCount(event.target.value.length);
          }}
          style={{ resize: 'vertical' }}
        />
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
          💡 Tip: Use analogies and real-world examples. Avoid technical terms — if you can&apos;t
          explain it simply, you don&apos;t understand it yet.
        </p>
      </div>

      {error ? (
        <div
          className="kv-alert-error"
          style={{
            padding: '10px 14px',
            marginBottom: '16px',
            borderRadius: '10px',
            fontSize: '13px',
          }}
        >
          {error}
        </div>
      ) : null}

      <LoadingButton
        loading={false}
        onClick={handleSubmit}
        disabled={!concept.trim() || explanation.trim().length < 30}
        type="button"
        fullWidth
      >
        🧠 Grade my explanation →
      </LoadingButton>

      {attemptNumber > 1 ? (
        <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)', marginTop: '12px' }}>
          Attempt #{attemptNumber} — you&apos;re improving! 💪
        </p>
      ) : null}
    </div>
  );
}
