'use client';

import { useEffect, useMemo, useState } from 'react';
import { formatTorontoDate } from '~/lib/toronto-time';

type Category = {
  score: number;
  comment: string;
};

type EssayGradeResult = {
  overallGrade: number;
  letterGrade: string;
  categories: {
    knowledge: Category;
    thinking: Category;
    communication: Category;
    application: Category;
  };
  strengths: string[];
  improvements: string[];
  overallFeedback: string;
};

type EssayHistory = {
  id: string;
  subject: string;
  grade: number;
  createdAt: string;
};

const LEVELS = ['Gr 9', 'Gr 10', 'Gr 11', 'Gr 12'];

export default function EssayGradePage() {
  const [subject, setSubject] = useState('English');
  const [gradeLevel, setGradeLevel] = useState('Gr 11');
  const [essay, setEssay] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<EssayGradeResult | null>(null);
  const [history, setHistory] = useState<EssayHistory[]>([]);

  useEffect(() => {
    fetch('/api/essay-grade')
      .then(async (response) => {
        const data = (await response.json().catch(() => null)) as { grades?: EssayHistory[] } | null;
        setHistory(data?.grades ?? []);
      })
      .catch(() => undefined);
  }, []);

  const categoryEntries = useMemo(() => {
    if (!result?.categories) return [];
    return [
      { label: 'Knowledge', short: 'KU', data: result.categories.knowledge },
      { label: 'Thinking', short: 'T', data: result.categories.thinking },
      { label: 'Communication', short: 'C', data: result.categories.communication },
      { label: 'Application', short: 'A', data: result.categories.application },
    ];
  }, [result]);

  async function gradeEssay() {
    if (!essay.trim()) {
      setError('Please paste your essay first.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/essay-grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ essay, subject, gradeLevel }),
      });

      const data = (await response.json().catch(() => null)) as EssayGradeResult & { error?: string };
      if (!response.ok) {
        setError(data?.error ?? 'Failed to grade essay.');
        return;
      }

      setResult(data);
      const historyResponse = await fetch('/api/essay-grade');
      const historyData = (await historyResponse.json().catch(() => null)) as { grades?: EssayHistory[] } | null;
      setHistory(historyData?.grades ?? []);
    } catch {
      setError('Network error while grading essay.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="kv-page" style={{ padding: '24px 16px 100px' }}>
      <div style={{ maxWidth: 980, margin: '0 auto' }}>
        <div className="kv-crumb">Kyvex / <b>Essay Grader</b></div>
        <h1 className="kv-title" style={{ marginTop: 14 }}>Essay Grader</h1>
        <p className="kv-sub" style={{ marginTop: 10 }}>Ontario Achievement Chart based grading for your essays.</p>

        <p className="kv-meta" style={{ marginTop: 28 }}>Subject</p>
        <input
          className="kv-field"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="e.g. English"
          style={{ marginTop: 8 }}
        />

        <p className="kv-meta" style={{ marginTop: 18 }}>Grade level</p>
        <div className="kv-tabs" style={{ marginTop: 10, flexWrap: 'wrap' }}>
          {LEVELS.map((level) => (
            <button
              key={level}
              className={gradeLevel === level ? 'kv-tab on' : 'kv-tab'}
              onClick={() => setGradeLevel(level)}
              type="button"
            >
              {level}
            </button>
          ))}
        </div>

        <p className="kv-meta" style={{ marginTop: 18 }}>Essay</p>
        <textarea
          className="kv-field"
          style={{ minHeight: 300, marginTop: 8 }}
          placeholder="Paste your essay here..."
          value={essay}
          onChange={(e) => setEssay(e.target.value)}
        />

        {error ? <p className="kv-meta" style={{ marginTop: 12, color: '#E5484D' }}>{error}</p> : null}

        <button type="button" className="kv-btn" style={{ marginTop: 16 }} onClick={() => void gradeEssay()} disabled={loading}>
          {loading ? 'Analyzing with Ontario Achievement Chart...' : 'Grade My Essay'}
        </button>

        {result ? (
          <div style={{ marginTop: 32 }}>
            {typeof result.overallGrade === 'number' ? (
              <p className="kv-meta num">Overall {result.overallGrade}%</p>
            ) : null}
            {result.letterGrade ? (
              <p className="kv-meta" style={{ marginTop: 6 }}>Letter {result.letterGrade}</p>
            ) : null}

            {categoryEntries.map((entry) => {
              const score = entry.data?.score ?? 0;
              return (
                <div key={entry.label} className="kv-row">
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="kv-row-title">{entry.short} · {entry.label}</div>
                    {entry.data?.comment ? (
                      <p className="kv-sub" style={{ marginTop: 6, maxWidth: 'none' }}>{entry.data.comment}</p>
                    ) : null}
                    <div className="kv-bar" style={{ marginTop: 10, maxWidth: 280 }}>
                      <div style={{ width: `${Math.max(0, Math.min(100, score))}%` }} />
                    </div>
                  </div>
                  <span className="kv-meta num">{score}</span>
                </div>
              );
            })}

            {(result.strengths || []).length > 0 ? (
              <div style={{ marginTop: 24 }}>
                <p className="kv-meta">Strengths</p>
                {(result.strengths || []).map((point) => (
                  <div key={point} className="kv-row">
                    <span className="kv-row-title">{point}</span>
                  </div>
                ))}
              </div>
            ) : null}

            {(result.improvements || []).length > 0 ? (
              <div style={{ marginTop: 24 }}>
                <p className="kv-meta">Improvements</p>
                {(result.improvements || []).map((point) => (
                  <div key={point} className="kv-row">
                    <span className="kv-row-title">{point}</span>
                  </div>
                ))}
              </div>
            ) : null}

            {result.overallFeedback ? (
              <p className="kv-serif" style={{ marginTop: 24, color: 'var(--kv-text-secondary)', maxWidth: '56ch' }}>
                {result.overallFeedback}
              </p>
            ) : null}
          </div>
        ) : null}

        <p className="kv-meta" style={{ marginTop: 32 }}>Past essays</p>
        {history.length === 0 ? (
          <p className="kv-sub" style={{ marginTop: 10 }}>No grading history yet.</p>
        ) : (
          history.map((item) => (
            <div key={item.id} className="kv-row">
              <span className="kv-row-title">{item.subject}</span>
              <span className="kv-meta num">{Math.round(item.grade)}%</span>
              <span className="kv-row-side">{formatTorontoDate(item.createdAt)}</span>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
