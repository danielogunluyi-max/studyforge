'use client';

import { useEffect, useMemo, useState } from 'react';

type ReadingQuestion = {
  question: string;
  answer: string;
  type?: string;
};

type ReadingHistoryItem = {
  id: string;
  topic: string;
  wpm: number;
  comprehension: number;
  createdAt: string;
};

type Phase = 'setup' | 'reading' | 'quiz' | 'result';

const TARGETS = [200, 250, 300, 400];
const SAMPLE_TEXT = `Photosynthesis is the process plants use to convert light energy into chemical energy. Chlorophyll in leaf cells captures sunlight, and this energy drives reactions that combine carbon dioxide with water to form glucose. Oxygen is released as a byproduct. The glucose produced can be used immediately for cellular respiration or stored as starch for later use. Environmental factors such as light intensity, carbon dioxide concentration, and temperature affect the rate of photosynthesis. Understanding this process is important because it supports nearly all food chains on Earth.`;

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
}

export default function ReadingSpeedPage() {
  const [phase, setPhase] = useState<Phase>('setup');
  const [topic, setTopic] = useState('');
  const [text, setText] = useState('');
  const [targetWpm, setTargetWpm] = useState(250);

  const [questions, setQuestions] = useState<ReadingQuestion[]>([]);
  const [history, setHistory] = useState<ReadingHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [startedAt, setStartedAt] = useState<number>(0);

  const [quizIndex, setQuizIndex] = useState(0);
  const [quizSecondsLeft, setQuizSecondsLeft] = useState(20);
  const [answers, setAnswers] = useState<string[]>([]);

  const [wpmAchieved, setWpmAchieved] = useState(0);
  const [comprehensionScore, setComprehensionScore] = useState(0);
  const [benchmarkPercentile, setBenchmarkPercentile] = useState(0);

  const words = useMemo(() => text.split(/\s+/).filter(Boolean), [text]);
  const chunkSize = targetWpm >= 350 ? 2 : 1;

  const chunkText = useMemo(() => {
    return words.slice(currentWordIndex, currentWordIndex + chunkSize).join(' ');
  }, [words, currentWordIndex, chunkSize]);

  const readingProgress = words.length > 0 ? Math.min(100, Math.round((currentWordIndex / words.length) * 100)) : 0;

  const loadHistory = async () => {
    try {
      const response = await fetch('/api/reading-speed');
      const data = (await response.json()) as { sessions?: ReadingHistoryItem[] };
      if (response.ok) setHistory(data.sessions ?? []);
    } catch {
      // ignore history load failures
    }
  };

  useEffect(() => {
    void loadHistory();
  }, []);

  useEffect(() => {
    if (phase !== 'reading' || isPaused || words.length === 0) return;

    const intervalMs = Math.max(80, Math.round((60000 * chunkSize) / targetWpm));
    const timer = window.setInterval(() => {
      setCurrentWordIndex((prev) => {
        const next = prev + chunkSize;
        if (next >= words.length) {
          window.clearInterval(timer);
          setPhase('quiz');
          setQuizIndex(0);
          setQuizSecondsLeft(20);
          return words.length;
        }
        return next;
      });
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [phase, isPaused, targetWpm, words.length, chunkSize]);

  useEffect(() => {
    if (phase !== 'quiz') return;
    if (quizIndex >= questions.length) return;

    setQuizSecondsLeft(20);
    const timer = window.setInterval(() => {
      setQuizSecondsLeft((prev) => {
        if (prev <= 1) {
          setQuizIndex((idx) => Math.min(idx + 1, questions.length));
          return 20;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [phase, quizIndex, questions.length]);

  useEffect(() => {
    if (phase === 'quiz' && quizIndex >= questions.length && questions.length > 0) {
      void submitQuiz();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizIndex, phase, questions.length]);

  const startTraining = async () => {
    if (!text.trim()) {
      setError('Please add reading text first.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/reading-speed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate-questions', text, topic: topic.trim() || 'General' }),
      });
      const data = (await response.json()) as { questions?: ReadingQuestion[]; error?: string };
      if (!response.ok) {
        setError(data.error ?? 'Could not start trainer');
        return;
      }

      setQuestions((data.questions ?? []).slice(0, 5));
      setAnswers(Array.from({ length: 5 }).map(() => ''));
      setCurrentWordIndex(0);
      setStartedAt(Date.now());
      setPhase('reading');
      setIsPaused(false);
    } catch {
      setError('Network error while starting training');
    } finally {
      setLoading(false);
    }
  };

  const submitQuiz = async () => {
    const elapsedMins = Math.max(1 / 60, (Date.now() - startedAt) / 60000);
    const achieved = Math.round(words.length / elapsedMins);

    let correct = 0;
    questions.forEach((q, idx) => {
      const user = normalize(answers[idx] ?? '');
      const expected = normalize(q.answer ?? '');
      if (user && expected && (user.includes(expected) || expected.includes(user))) {
        correct += 1;
      }
    });

    const comprehension = questions.length ? Math.round((correct / questions.length) * 100) : 0;
    const percentile = Math.min(99, Math.max(5, Math.round((achieved / 420) * 100)));

    setWpmAchieved(achieved);
    setComprehensionScore(comprehension);
    setBenchmarkPercentile(percentile);
    setPhase('result');

    try {
      await fetch('/api/reading-speed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save-result',
          text,
          topic: topic.trim() || 'General',
          wpm: achieved,
          comprehension,
          questions,
          answers,
        }),
      });
      await loadHistory();
    } catch {
      // ignore save failures for UX continuity
    }
  };

  const setAnswerForCurrent = (value: string) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[quizIndex] = value;
      return next;
    });
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-black">Reading Speed Trainer ⚡</h1>
        <p className="mt-2 text-[var(--text-secondary)]">Train yourself to read faster without losing comprehension</p>
      </header>

      {error && <div className="kv-card mb-4 border-[var(--accent-red)] p-3 text-sm text-[var(--accent-red)]">{error}</div>}

      {phase === 'setup' && (
        <section className="kv-card p-5">
          <div className="kv-grid-2 mb-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-[var(--text-secondary)]">Topic</label>
              <input className="kv-input" value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="e.g. Biology" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-[var(--text-secondary)]">Target WPM</label>
              <div className="flex flex-wrap gap-2">
                {TARGETS.map((value) => (
                  <button key={value} className={targetWpm === value ? 'kv-btn-primary' : 'kv-btn-secondary'} onClick={() => setTargetWpm(value)}>
                    {value}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <label className="mb-2 block text-sm font-semibold text-[var(--text-secondary)]">Paste text</label>
          <textarea className="kv-textarea mb-3" rows={9} value={text} onChange={(event) => setText(event.target.value)} />
          <div className="mb-5 flex flex-wrap gap-2">
            <button className="kv-btn-secondary" onClick={() => setText(SAMPLE_TEXT)}>
              Use sample text
            </button>
          </div>

          <button className="kv-btn-primary" disabled={loading || !text.trim()} onClick={() => void startTraining()}>
            {loading ? 'Preparing quiz...' : 'Start Training'}
          </button>
        </section>
      )}

      {phase === 'reading' && (
        <section className="kv-card kv-card-gold p-5">
          <div className="mb-4 text-center">
            <div className="mb-3 text-[48px] font-black leading-none">{chunkText || 'Ready...'}</div>
            <p className="text-sm text-[var(--text-secondary)]">RSVP mode at {targetWpm} WPM</p>
          </div>

          <div className="kv-progress-track mb-4">
            <div className="kv-progress-fill" style={{ width: `${readingProgress}%` }} />
          </div>
          <p className="mb-4 text-sm text-[var(--text-secondary)]">{readingProgress}% completed</p>

          <div className="mb-5 flex gap-2">
            <button className="kv-btn-primary" onClick={() => setIsPaused((prev) => !prev)}>
              {isPaused ? 'Resume' : 'Pause'}
            </button>
          </div>

          <div className="kv-card-elevated rounded-xl p-4">
            <p className="text-sm font-semibold text-[var(--text-secondary)]">Traditional view</p>
            <p className="mt-2 whitespace-pre-wrap leading-8 text-[var(--text-primary)]">{text}</p>
          </div>
        </section>
      )}

      {phase === 'quiz' && questions.length > 0 && (
        <section className="kv-card p-5">
          <h2 className="text-2xl font-black">How well did you understand?</h2>
          <p className="mb-4 mt-1 text-sm text-[var(--text-secondary)]">Question {Math.min(quizIndex + 1, questions.length)} of {questions.length}</p>

          <div className="kv-card-elevated rounded-xl p-4">
            <p className="mb-2 text-sm font-semibold text-[var(--accent-teal)]">20s timer: {quizSecondsLeft}s</p>
            <p className="mb-3 text-lg font-semibold">{questions[quizIndex]?.question}</p>
            <textarea
              className="kv-textarea"
              rows={3}
              placeholder="Type your answer"
              value={answers[quizIndex] ?? ''}
              onChange={(event) => setAnswerForCurrent(event.target.value)}
            />

            <div className="mt-3 flex gap-2">
              <button
                className="kv-btn-primary"
                onClick={() => setQuizIndex((prev) => Math.min(prev + 1, questions.length))}
              >
                {quizIndex + 1 >= questions.length ? 'Submit' : 'Next'}
              </button>
            </div>
          </div>
        </section>
      )}

      {phase === 'result' && (
        <section className="space-y-4">
          <div className="kv-card kv-card-gold p-5 text-center">
            <p className="text-sm text-[var(--text-secondary)]">WPM achieved</p>
            <div className="text-6xl font-black text-[var(--accent-gold)]">{wpmAchieved}</div>
            <p className="mt-2 text-lg">Comprehension score: {comprehensionScore}%</p>
            <p className="text-sm text-[var(--text-secondary)]">Faster than {benchmarkPercentile}% of students</p>
          </div>

          <div className="kv-card p-5">
            <h3 className="mb-3 text-xl font-bold">WPM History</h3>
            <div className="flex items-end gap-2" style={{ minHeight: 180 }}>
              {[...history.slice(0, 7).reverse(), { id: 'new', topic: topic || 'Current', wpm: wpmAchieved, comprehension: comprehensionScore, createdAt: new Date().toISOString() }].map((item) => {
                const height = Math.max(20, Math.min(160, Math.round((item.wpm / 450) * 160)));
                return (
                  <div key={item.id} className="flex flex-1 flex-col items-center gap-2">
                    <div className="kv-card-teal w-full rounded-md" style={{ height }} />
                    <span className="text-xs text-[var(--text-secondary)]">{item.wpm}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <button className="kv-btn-primary" onClick={() => setPhase('setup')}>Train Again</button>
        </section>
      )}
    </main>
  );
}
