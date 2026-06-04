'use client';

import { useEffect, useMemo, useState } from 'react';

type PredictorFactor = {
  factor: string;
  impact: 'positive' | 'neutral' | 'negative' | string;
  detail: string;
};

type PredictorResult = {
  predictedScore?: number;
  confidence?: number;
  grade?: string;
  factors?: PredictorFactor[];
  recommendation?: string;
};

type PredictionHistoryItem = {
  id: string;
  subject: string | null;
  examDate: string | null;
  predictedScore: number | null;
  confidence: number | null;
  createdAt: string;
  predictions: PredictorResult | null;
};

function impactBadge(impact: string) {
  if (impact === 'positive') return { cls: 'kv-badge-green', icon: '+' };
  if (impact === 'negative') return { cls: 'kv-badge-red', icon: '-' };
  return { cls: 'kv-badge-blue', icon: '=' };
}

export default function PredictorPage() {
  const [subject, setSubject] = useState('');
  const [examDate, setExamDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PredictorResult | null>(null);
  const [history, setHistory] = useState<PredictionHistoryItem[]>([]);
  const [error, setError] = useState('');

  async function loadHistory() {
    try {
      const res = await fetch('/api/predictor');
      const data = (await res.json()) as { predictions?: PredictionHistoryItem[] };
      setHistory(data.predictions || []);
    } catch {
      setHistory([]);
    }
  }

  useEffect(() => {
    void loadHistory();
  }, []);

  async function generatePrediction() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/predictor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, examDate }),
      });
      const data = (await res.json()) as PredictorResult | { error?: string };
      if (!res.ok) {
        setError((data as { error?: string }).error || 'Prediction failed');
        return;
      }
      setResult(data as PredictorResult);
      await loadHistory();
    } catch {
      setError('Prediction failed');
    } finally {
      setLoading(false);
    }
  }

  const confidencePct = useMemo(() => Math.round((result?.confidence || 0) * 100), [result?.confidence]);

  return (
    <main className="kv-page">
      <h1 className="kv-page-title">Exam Score Predictor</h1>
      <p className="kv-page-subtitle">Estimate likely exam outcome from your study signals.</p>

      <section className="kv-card" style={{ marginBottom: 16 }}>
        <div className="kv-grid-2" style={{ marginBottom: 12 }}>
          <div>
            <label className="kv-label" htmlFor="predict-subject">Subject</label>
            <input
              id="predict-subject"
              className="kv-input"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Chemistry"
            />
          </div>

          <div>
            <label className="kv-label" htmlFor="predict-date">Exam Date</label>
            <input
              id="predict-date"
              type="date"
              className="kv-input"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
            />
          </div>
        </div>

        <button
          className="kv-btn-primary"
          disabled={loading || subject.trim().length < 2 || !examDate}
          onClick={() => void generatePrediction()}
        >
          {loading ? 'Predicting...' : 'Run Prediction'}
        </button>
      </section>

      {error && <div className="kv-alert-error">{error}</div>}

      {result && (
        <section className="kv-card-elevated" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <p className="kv-label" style={{ marginBottom: 2 }}>Predicted Score</p>
              <p style={{ margin: 0, fontSize: 44, fontWeight: 900, color: 'var(--accent-gold)' }}>
                {Math.round(result.predictedScore || 0)}%
              </p>
            </div>
            <span className="kv-badge kv-badge-gold" style={{ fontSize: 13 }}>
              Grade {result.grade || 'N/A'}
            </span>
          </div>

          <div style={{ marginTop: 10 }}>
            <p style={{ margin: '0 0 6px', fontSize: 13, color: 'var(--text-secondary)' }}>
              Confidence: {confidencePct}% confident
            </p>
            <div className="kv-progress-track">
              <div className="kv-progress-fill" style={{ width: `${confidencePct}%` }} />
            </div>
          </div>

          <div className="kv-grid-3" style={{ marginTop: 14 }}>
            {(result.factors || []).slice(0, 3).map((factor, idx) => {
              const meta = impactBadge(factor.impact);
              return (
                <article key={`${factor.factor}-${idx}`} className="kv-card-sm">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <strong>{factor.factor}</strong>
                    <span className={`kv-badge ${meta.cls}`}>{meta.icon} {factor.impact}</span>
                  </div>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 12 }}>{factor.detail}</p>
                </article>
              );
            })}
          </div>

          {result.recommendation && (
            <div className="kv-card-gold" style={{ marginTop: 14 }}>
              <p className="kv-label" style={{ marginBottom: 6 }}>Recommendation</p>
              <p style={{ margin: 0, color: 'var(--text-primary)' }}>{result.recommendation}</p>
            </div>
          )}
        </section>
      )}

      <section className="kv-card">
        <h2 className="kv-section-title">Past Predictions</h2>
        {history.length === 0 ? (
          <div className="kv-empty">
            <p className="kv-empty-title">No predictions yet</p>
            <p className="kv-empty-text">Run a prediction to build your history.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
            {history.map((item) => (
              <article key={item.id} className="kv-card-sm">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <p style={{ margin: 0, fontWeight: 700 }}>{item.subject || 'Unknown subject'}</p>
                  <span className="kv-badge kv-badge-gold">{Math.round(item.predictedScore || 0)}%</span>
                </div>
                <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: 12 }}>
                  Exam: {item.examDate ? new Date(item.examDate).toLocaleDateString() : 'N/A'}
                </p>
                <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 11 }}>
                  Created: {new Date(item.createdAt).toLocaleString()}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
