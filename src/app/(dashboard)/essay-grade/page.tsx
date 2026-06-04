'use client';

import { useEffect, useMemo, useState } from 'react';

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

function scoreColor(score: number): string {
  if (score >= 80) return '#f0b429';
  if (score >= 70) return '#2dd4bf';
  if (score >= 60) return '#4f8ef7';
  return '#ef4444';
}

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
      { label: 'Knowledge', data: result.categories.knowledge },
      { label: 'Thinking', data: result.categories.thinking },
      { label: 'Communication', data: result.categories.communication },
      { label: 'Application', data: result.categories.application },
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
    <div className="kv-page" style={{ maxWidth: '980px', margin: '0 auto' }}>
      <h1 className="kv-page-title">AI Essay Grader</h1>
      <p className="kv-page-subtitle">Ontario Achievement Chart based grading for your essays.</p>

      <div className="kv-card" style={{ marginBottom: 24 }}>
        <div className="kv-grid-2" style={{ marginBottom: 12 }}>
          <div>
            <label className="kv-label">Subject</label>
            <input className="kv-input" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. English" />
          </div>
          <div>
            <label className="kv-label">Grade Level</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {LEVELS.map((level) => (
                <button
                  key={level}
                  className={gradeLevel === level ? 'kv-btn-primary' : 'kv-btn-secondary'}
                  onClick={() => setGradeLevel(level)}
                  type="button"
                  style={{ padding: '7px 12px' }}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
        </div>

        <label className="kv-label">Essay</label>
        <textarea
          className="kv-textarea"
          style={{ minHeight: 300 }}
          placeholder="Paste your essay here..."
          value={essay}
          onChange={(e) => setEssay(e.target.value)}
        />

        {error ? <div className="kv-alert-error" style={{ marginTop: 12 }}>{error}</div> : null}

        <div style={{ marginTop: 12 }}>
          <button className="kv-btn-primary" onClick={() => void gradeEssay()} disabled={loading}>
            {loading ? 'Analyzing with Ontario Achievement Chart...' : 'Grade My Essay'}
          </button>
        </div>
      </div>

      {result ? (
        <div style={{ display: 'grid', gap: 16 }}>
          <div className="kv-card-gold" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
            <div>
              <p className="kv-section-label">Ontario Achievement Chart Score</p>
              <div style={{ fontSize: 48, lineHeight: 1, fontWeight: 900, color: '#f0b429' }}>{result.overallGrade}%</div>
            </div>
            <div>
              <p className="kv-section-label">Letter Grade</p>
              <div style={{ fontSize: 34, fontWeight: 800, color: 'var(--text-primary)' }}>{result.letterGrade || 'N/A'}</div>
            </div>
          </div>

          <div className="kv-grid-2">
            {categoryEntries.map((entry) => (
              <div key={entry.label} className="kv-card">
                <p className="kv-section-label">{entry.label}</p>
                <div style={{ fontSize: 38, fontWeight: 900, color: scoreColor(entry.data?.score ?? 0), marginBottom: 8 }}>
                  {entry.data?.score ?? 0}
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65 }}>
                  {entry.data?.comment || 'No comment available.'}
                </p>
              </div>
            ))}
          </div>

          <div className="kv-card-teal">
            <p className="kv-section-title">Strengths</p>
            <ul style={{ margin: 0, paddingLeft: 16, display: 'grid', gap: 8 }}>
              {(result.strengths || []).map((point) => (
                <li key={point} style={{ color: 'var(--text-secondary)' }}>✅ {point}</li>
              ))}
            </ul>
          </div>

          <div className="kv-card">
            <p className="kv-section-title">Improvements</p>
            <ul style={{ margin: 0, paddingLeft: 16, display: 'grid', gap: 8 }}>
              {(result.improvements || []).map((point) => (
                <li key={point} style={{ color: 'var(--text-secondary)' }}>⚠️ {point}</li>
              ))}
            </ul>
          </div>

          <div className="kv-card-gold">
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: 1.75 }}>
              {result.overallFeedback || 'No overall feedback available.'}
            </p>
          </div>
        </div>
      ) : null}

      <div className="kv-card" style={{ marginTop: 24 }}>
        <p className="kv-section-title">Past Essays</p>
        {history.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>No grading history yet.</p>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {history.map((item) => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--border-default)', borderRadius: 10, padding: '10px 12px' }}>
                <span style={{ color: 'var(--text-primary)' }}>{item.subject}</span>
                <span style={{ color: '#f0b429', fontWeight: 700 }}>{Math.round(item.grade)}%</span>
                <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{new Date(item.createdAt).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
