'use client';

import { useEffect, useMemo, useState } from 'react';

type ExamQuestion = {
  id: string;
  question: string;
  options: string[];
  answer: string;
  explanation: string;
  points: number;
};

type ExamAttempt = {
  id: string;
  score: number;
  createdAt: string;
};

type MockExam = {
  id: string;
  title: string;
  subject: string;
  timeLimit: number;
  questions: Array<{ id: string; points: number }>;
  attempts: ExamAttempt[];
};

type FullExam = {
  id: string;
  title: string;
  subject: string;
  timeLimit: number;
  questions: ExamQuestion[];
};

type ResultPayload = {
  score: number;
  correct: number;
  total: number;
  attempt: { id: string; timeTaken: number };
};

const QUESTION_COUNTS = [5, 10, 15, 20] as const;
const TIME_LIMITS = [15, 30, 45, 60] as const;

export default function MockExamPage() {
  const [tab, setTab] = useState<'create' | 'my-exams'>('create');
  const [sourceText, setSourceText] = useState('');
  const [subject, setSubject] = useState('');
  const [numQuestions, setNumQuestions] = useState<(typeof QUESTION_COUNTS)[number]>(10);
  const [timeLimit, setTimeLimit] = useState<(typeof TIME_LIMITS)[number]>(30);
  const [generating, setGenerating] = useState(false);
  const [loadingExams, setLoadingExams] = useState(false);
  const [exams, setExams] = useState<MockExam[]>([]);

  const [activeExam, setActiveExam] = useState<FullExam | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [result, setResult] = useState<ResultPayload | null>(null);

  async function loadExams() {
    setLoadingExams(true);
    try {
      const res = await fetch('/api/mock-exam');
      const data = (await res.json()) as { exams?: MockExam[] };
      if (res.ok) setExams(data.exams || []);
    } finally {
      setLoadingExams(false);
    }
  }

  useEffect(() => {
    void loadExams();
  }, []);

  useEffect(() => {
    if (!activeExam || result) return;
    const timer = window.setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          void submitAttempt();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [activeExam, result]);

  async function generateExam() {
    if (!sourceText.trim() || !subject.trim()) return;
    setGenerating(true);
    try {
      const res = await fetch('/api/mock-exam/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceText, subject, numQuestions, timeLimit }),
      });
      if (res.ok) {
        setSourceText('');
        setSubject('');
        setTab('my-exams');
        await loadExams();
      }
    } finally {
      setGenerating(false);
    }
  }

  async function startExam(examId: string) {
    const res = await fetch(`/api/mock-exam/${examId}/attempt`);
    const data = (await res.json()) as { exam?: FullExam };
    if (res.ok && data.exam) {
      setActiveExam({
        ...data.exam,
        questions: data.exam.questions.map((q) => ({
          ...q,
          options: Array.isArray(q.options) ? q.options : [],
        })),
      });
      setCurrentQuestion(0);
      setAnswers({});
      setRemainingSeconds((data.exam.timeLimit || 30) * 60);
      setResult(null);
    }
  }

  async function submitAttempt() {
    if (!activeExam || result) return;
    const timeTaken = activeExam.timeLimit * 60 - remainingSeconds;
    const res = await fetch(`/api/mock-exam/${activeExam.id}/attempt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers, timeTaken }),
    });
    const data = (await res.json()) as ResultPayload;
    if (res.ok) {
      setResult(data);
      await loadExams();
    }
  }

  const activeQuestion = activeExam?.questions[currentQuestion];
  const bestScores = useMemo(() => {
    const map: Record<string, number> = {};
    exams.forEach((exam) => {
      const best = exam.attempts.reduce((acc, item) => Math.max(acc, item.score), 0);
      map[exam.id] = best;
    });
    return map;
  }, [exams]);

  function formatClock(totalSeconds: number) {
    const mm = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const ss = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
    return `${mm}:${ss}`;
  }

  return (
    <main className="kv-page">
      <h1 className="kv-page-title">Mock Exam</h1>
      <p className="kv-page-subtitle">Build and take timed exams from your notes.</p>

      <div className="kv-tabs" style={{ marginBottom: 14 }}>
        <button className={`kv-tab ${tab === 'create' ? 'active' : ''}`} onClick={() => setTab('create')}>CREATE</button>
        <button className={`kv-tab ${tab === 'my-exams' ? 'active' : ''}`} onClick={() => { setTab('my-exams'); void loadExams(); }}>MY EXAMS</button>
      </div>

      {tab === 'create' && (
        <section className="kv-card">
          <label className="kv-label" htmlFor="mock-source">Source Notes</label>
          <textarea
            id="mock-source"
            className="kv-textarea"
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            style={{ minHeight: 190, marginBottom: 12 }}
            placeholder="Paste notes to generate a mock exam"
          />

          <div className="kv-grid-2" style={{ marginBottom: 12 }}>
            <div>
              <label className="kv-label" htmlFor="mock-subject">Subject</label>
              <input
                id="mock-subject"
                className="kv-input"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Physics"
              />
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <p className="kv-label">Number of Questions</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {QUESTION_COUNTS.map((count) => (
                <button key={count} className={numQuestions === count ? 'kv-btn-primary' : 'kv-btn-secondary'} onClick={() => setNumQuestions(count)}>
                  {count}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <p className="kv-label">Time Limit (minutes)</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {TIME_LIMITS.map((limit) => (
                <button key={limit} className={timeLimit === limit ? 'kv-btn-primary' : 'kv-btn-secondary'} onClick={() => setTimeLimit(limit)}>
                  {limit}
                </button>
              ))}
            </div>
          </div>

          <button className="kv-btn-primary" disabled={generating || !sourceText.trim() || !subject.trim()} onClick={() => void generateExam()}>
            {generating ? 'Generating...' : 'Generate Exam'}
          </button>

          {generating && (
            <div className="kv-card-elevated" style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
              <div className="kv-spinner" />
              <span>Creating your exam...</span>
            </div>
          )}
        </section>
      )}

      {tab === 'my-exams' && (
        <section className="kv-grid-3">
          {loadingExams && (
            <div className="kv-card-elevated" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div className="kv-spinner" />
              <span>Loading exams...</span>
            </div>
          )}

          {!loadingExams && exams.map((exam) => (
            <article key={exam.id} className="kv-card">
              <h3 className="kv-section-title" style={{ marginBottom: 6 }}>{exam.title}</h3>
              <span className="kv-badge kv-badge-gold" style={{ marginBottom: 8 }}>{exam.subject}</span>
              <p style={{ margin: '4px 0', color: 'var(--text-secondary)' }}>{exam.questions.length} questions</p>
              <p style={{ margin: '4px 0', color: 'var(--text-secondary)' }}>{exam.timeLimit} minutes</p>
              <p style={{ margin: '4px 0 10px', color: 'var(--text-secondary)' }}>Best score: {Math.round(bestScores[exam.id] || 0)}%</p>
              <button className="kv-btn-primary" onClick={() => void startExam(exam.id)}>Take Exam →</button>
            </article>
          ))}

          {!loadingExams && exams.length === 0 && (
            <div className="kv-empty kv-card">
              <p className="kv-empty-title">No exams yet</p>
              <p className="kv-empty-text">Generate your first mock exam in the CREATE tab.</p>
            </div>
          )}
        </section>
      )}

      {activeExam && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2000,
            background: 'rgba(5,8,16,0.96)',
            overflowY: 'auto',
            padding: 20,
          }}
        >
          <div className="kv-card" style={{ maxWidth: 900, margin: '0 auto' }}>
            {!result && activeQuestion && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Question {currentQuestion + 1} of {activeExam.questions.length}</p>
                  <span className="kv-badge kv-badge-red">⏱ {formatClock(remainingSeconds)}</span>
                </div>
                <div className="kv-progress-track" style={{ marginBottom: 16 }}>
                  <div
                    className="kv-progress-fill"
                    style={{ width: `${((currentQuestion + 1) / activeExam.questions.length) * 100}%` }}
                  />
                </div>

                <article className="kv-card-elevated" style={{ marginBottom: 12 }}>
                  <h3 className="kv-section-title" style={{ marginBottom: 12 }}>{activeQuestion.question}</h3>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {activeQuestion.options.map((option) => (
                      <button
                        key={option}
                        className="kv-card-sm"
                        style={{
                          textAlign: 'left',
                          cursor: 'pointer',
                          borderColor: answers[activeQuestion.id] === option ? 'var(--accent-gold)' : undefined,
                          boxShadow: answers[activeQuestion.id] === option ? '0 0 0 1px rgba(240,180,41,0.4) inset' : undefined,
                        }}
                        onClick={() =>
                          setAnswers((prev) => ({
                            ...prev,
                            [activeQuestion.id]: option,
                          }))
                        }
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </article>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <button className="kv-btn-ghost" onClick={() => setActiveExam(null)}>Exit</button>
                  {currentQuestion < activeExam.questions.length - 1 ? (
                    <button className="kv-btn-primary" onClick={() => setCurrentQuestion((prev) => prev + 1)}>Next</button>
                  ) : (
                    <button className="kv-btn-primary" onClick={() => void submitAttempt()}>Submit</button>
                  )}
                </div>
              </>
            )}

            {result && (
              <>
                <h2 className="kv-page-title" style={{ marginBottom: 8 }}>Results</h2>
                <p style={{ margin: 0, fontSize: 42, fontWeight: 900, color: 'var(--accent-gold)' }}>{Math.round(result.score)}%</p>
                <p className="kv-page-subtitle" style={{ marginBottom: 12 }}>{result.correct}/{result.total} correct</p>
                <p className="kv-page-subtitle" style={{ marginBottom: 14 }}>Time taken: {formatClock(result.attempt?.timeTaken || 0)}</p>

                <div style={{ display: 'grid', gap: 10, marginBottom: 14 }}>
                  {activeExam.questions.map((q) => {
                    const selected = answers[q.id];
                    const ok = selected === q.answer;
                    return (
                      <article key={q.id} className={ok ? 'kv-card-teal' : 'kv-card-gold'}>
                        <p style={{ margin: 0, fontWeight: 700 }}>{ok ? '✓' : '✗'} {q.question}</p>
                        <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)' }}>Your answer: {selected || 'No answer'}</p>
                        <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)' }}>Correct: {q.answer}</p>
                        <p style={{ margin: '8px 0 0', fontSize: 13 }}>{q.explanation}</p>
                      </article>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="kv-btn-primary" onClick={() => void startExam(activeExam.id)}>Try Again</button>
                  <button className="kv-btn-secondary" onClick={() => setActiveExam(null)}>Back to Exams</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
