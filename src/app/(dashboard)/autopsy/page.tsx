'use client';

import { useEffect, useState } from 'react';
import { formatTorontoDate } from '~/lib/toronto-time';

type RootCause = { cause: string; severity: 'high' | 'medium' | 'low' };
type ActionItem = { action: string; priority: number; timeEstimate: string };

type AutopsyResult = {
  overallDiagnosis: string;
  weakAreas: string[];
  strongAreas: string[];
  rootCauses: RootCause[];
  actionPlan: ActionItem[];
  preventionStrategy: string;
  motivationalNote: string;
};

type AutopsyRecord = {
  id: string;
  subject: string;
  score: number;
  totalMarks: number;
  createdAt: string;
};

export default function AutopsyPage() {
  const [subject, setSubject] = useState('');
  const [score, setScore] = useState('');
  const [totalMarks, setTotalMarks] = useState('100');
  const [wrongAnswers, setWrongAnswers] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AutopsyResult | null>(null);
  const [history, setHistory] = useState<AutopsyRecord[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/autopsy')
      .then(async (r) => {
        const data = (await r.json().catch(() => null)) as { autopsies?: AutopsyRecord[] } | null;
        setHistory(data?.autopsies ?? []);
      })
      .catch(() => undefined);
  }, []);

  async function runAutopsy() {
    if (!subject.trim() || !score || !totalMarks) {
      setError('Please fill in subject, score, and total marks.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const r = await fetch('/api/autopsy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, score: Number(score), totalMarks: Number(totalMarks), wrongAnswers }),
      });
      const data = (await r.json().catch(() => null)) as { autopsy?: AutopsyResult & { error?: string }; error?: string } | null;
      if (data?.autopsy) {
        setResult(data.autopsy as AutopsyResult);
      } else {
        setError(data?.error ?? 'Autopsy failed');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  const pct = score && totalMarks ? Math.round((Number(score) / Number(totalMarks)) * 100) : null;

  return (
    <main className="kv-page" style={{ padding: '24px 16px 100px' }}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        <div className="kv-crumb">Kyvex / <b>Exam Autopsy</b></div>
        <h1 className="kv-title" style={{ marginTop: 14 }}>Exam Autopsy</h1>
        <p className="kv-sub" style={{ marginTop: 10 }}>
          Diagnose exactly what went wrong — and build a recovery plan.
        </p>

        <p className="kv-meta" style={{ marginTop: 28 }}>Subject</p>
        <input
          className="kv-field"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="e.g. Biology"
          style={{ marginTop: 8 }}
        />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
          <div>
            <p className="kv-meta">Your score</p>
            <input
              className="kv-field num"
              type="number"
              value={score}
              onChange={(e) => setScore(e.target.value)}
              placeholder="e.g. 68"
              style={{ marginTop: 8 }}
            />
          </div>
          <div>
            <p className="kv-meta">Total marks</p>
            <input
              className="kv-field num"
              type="number"
              value={totalMarks}
              onChange={(e) => setTotalMarks(e.target.value)}
              placeholder="100"
              style={{ marginTop: 8 }}
            />
          </div>
        </div>
        <p className="kv-meta" style={{ marginTop: 16 }}>Wrong answer areas (optional)</p>
        <textarea
          className="kv-field"
          rows={3}
          value={wrongAnswers}
          onChange={(e) => setWrongAnswers(e.target.value)}
          placeholder="Describe topics you got wrong, e.g. Cell division, Photosynthesis equations..."
          style={{ marginTop: 8, resize: 'vertical' }}
        />
        {error ? <p className="kv-meta" style={{ color: '#E5484D', marginTop: 12 }}>{error}</p> : null}
        <button type="button" className="kv-btn" style={{ marginTop: 16 }} onClick={() => void runAutopsy()} disabled={loading}>
          {loading ? 'Diagnosing your exam performance...' : 'Run Autopsy'}
        </button>

        {result ? (
          <div style={{ marginTop: 32 }}>
            {pct !== null ? (
              <p className="kv-meta num">{pct}%</p>
            ) : null}
            <p className="kv-sub" style={{ marginTop: 10 }}>{result.overallDiagnosis}</p>

            {result.weakAreas.length > 0 ? (
              <div style={{ marginTop: 24 }}>
                <p className="kv-meta">Weak areas</p>
                {result.weakAreas.map((area) => (
                  <div key={area} className="kv-row">
                    <span className="kv-row-title">{area}</span>
                  </div>
                ))}
              </div>
            ) : null}

            {result.strongAreas.length > 0 ? (
              <div style={{ marginTop: 24 }}>
                <p className="kv-meta">Strong areas</p>
                {result.strongAreas.map((area) => (
                  <div key={area} className="kv-row">
                    <span className="kv-row-title">{area}</span>
                  </div>
                ))}
              </div>
            ) : null}

            {result.rootCauses.length > 0 ? (
              <div style={{ marginTop: 24 }}>
                <p className="kv-meta">Root causes</p>
                {result.rootCauses.map((rc) => (
                  <div key={rc.cause} className="kv-row">
                    <div>
                      <div className="kv-row-title">{rc.cause}</div>
                      <div className="kv-row-sub">
                        <span className="kv-chip">{rc.severity}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {result.actionPlan.length > 0 ? (
              <div style={{ marginTop: 24 }}>
                <p className="kv-meta">Action plan</p>
                {result.actionPlan.map((item, i) => (
                  <div key={`${item.action}-${i}`} className="kv-row">
                    <div>
                      <div className="kv-row-title">{item.action}</div>
                      <p className="kv-meta" style={{ marginTop: 4 }}>{item.timeEstimate}</p>
                    </div>
                    <span className="kv-meta num">{i + 1}</span>
                  </div>
                ))}
              </div>
            ) : null}

            {result.preventionStrategy ? (
              <div style={{ marginTop: 24 }}>
                <p className="kv-meta">Prevention</p>
                <p className="kv-sub" style={{ marginTop: 8 }}>{result.preventionStrategy}</p>
              </div>
            ) : null}

            {result.motivationalNote ? (
              <p className="kv-serif" style={{ marginTop: 24, color: 'var(--kv-text-secondary)', maxWidth: '56ch' }}>
                {result.motivationalNote}
              </p>
            ) : null}
          </div>
        ) : null}

        {history.length > 0 ? (
          <div style={{ marginTop: 32 }}>
            <p className="kv-meta">Past autopsies</p>
            {history.map((record) => {
              const p = Math.round((record.score / record.totalMarks) * 100);
              return (
                <div key={record.id} className="kv-row">
                  <div>
                    <div className="kv-row-title">{record.subject}</div>
                    <p className="kv-meta" style={{ marginTop: 4 }}>{formatTorontoDate(record.createdAt)}</p>
                  </div>
                  <span className="kv-meta num">{record.score}/{record.totalMarks} · {p}%</span>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </main>
  );
}
