'use client';

import { useEffect, useState } from 'react';

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

const SEVERITY_COLORS: Record<string, string> = {
  high: '#ef4444',
  medium: '#f97316',
  low: '#eab308',
};

function gradeLabel(pct: number) {
  if (pct >= 90) return { grade: 'A+', color: '#10b981' };
  if (pct >= 80) return { grade: 'A', color: '#10b981' };
  if (pct >= 70) return { grade: 'B', color: '#3b82f6' };
  if (pct >= 60) return { grade: 'C', color: '#f97316' };
  if (pct >= 50) return { grade: 'D', color: '#ef4444' };
  return { grade: 'F', color: '#ef4444' };
}

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
  const grade = pct !== null ? gradeLabel(pct) : null;

  return (
    <div style={{ padding: '32px', maxWidth: '860px', margin: '0 auto' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: '6px' }}>
          🔬 Exam Autopsy
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          Diagnose exactly what went wrong — and build a recovery plan.
        </p>
      </div>

      {/* Form */}
      <div className="kv-card" style={{ marginBottom: '28px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '14px' }}>
          <div>
            <label className="kv-label">Subject *</label>
            <input
              className="kv-input"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Biology"
            />
          </div>
          <div>
            <label className="kv-label">Your Score *</label>
            <input
              className="kv-input"
              type="number"
              value={score}
              onChange={(e) => setScore(e.target.value)}
              placeholder="e.g. 68"
            />
          </div>
          <div>
            <label className="kv-label">Total Marks *</label>
            <input
              className="kv-input"
              type="number"
              value={totalMarks}
              onChange={(e) => setTotalMarks(e.target.value)}
              placeholder="100"
            />
          </div>
        </div>
        <div style={{ marginBottom: '16px' }}>
          <label className="kv-label">Wrong Answer Areas (optional)</label>
          <textarea
            className="kv-input"
            rows={3}
            value={wrongAnswers}
            onChange={(e) => setWrongAnswers(e.target.value)}
            placeholder="Describe topics you got wrong, e.g. Cell division, Photosynthesis equations..."
            style={{ resize: 'vertical' }}
          />
        </div>
        {error && <p style={{ color: '#ef4444', fontSize: '13px', marginBottom: '12px' }}>{error}</p>}
        <button className="kv-btn-primary" onClick={() => void runAutopsy()} disabled={loading}>
          {loading ? '🔬 Diagnosing your exam performance...' : '🔬 Run Autopsy'}
        </button>
      </div>

      {/* Result */}
      {result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '32px' }}>
          {/* Banner */}
          {pct !== null && grade && (
            <div
              style={{
                padding: '28px 24px',
                borderRadius: '14px',
                background: `linear-gradient(135deg, ${grade.color}15, ${grade.color}05)`,
                border: `1px solid ${grade.color}40`,
                display: 'flex',
                alignItems: 'center',
                gap: '24px',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '52px', fontWeight: 900, color: grade.color, lineHeight: 1 }}>{grade.grade}</div>
                <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-muted)' }}>{pct}%</div>
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Overall Diagnosis
                </div>
                <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.5 }}>
                  {result.overallDiagnosis}
                </p>
              </div>
            </div>
          )}

          {/* Two columns */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* Left — What went wrong */}
            <div className="kv-card">
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#ef4444', marginBottom: '14px' }}>❌ What Went Wrong</h3>
              {result.weakAreas.length > 0 && (
                <div style={{ marginBottom: '14px' }}>
                  <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Weak Areas</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {result.weakAreas.map((a) => (
                      <span
                        key={a}
                        style={{ padding: '3px 10px', borderRadius: '99px', background: 'rgba(239,68,68,0.12)', color: '#ef4444', fontSize: '12px', fontWeight: 600 }}
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {result.rootCauses.length > 0 && (
                <div>
                  <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Root Causes</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {result.rootCauses.map((rc, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                        <span
                          style={{
                            flexShrink: 0,
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '2px 7px',
                            borderRadius: '99px',
                            background: `${SEVERITY_COLORS[rc.severity] ?? '#666'}20`,
                            color: SEVERITY_COLORS[rc.severity] ?? '#666',
                            textTransform: 'uppercase',
                            marginTop: '1px',
                          }}
                        >
                          {rc.severity}
                        </span>
                        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{rc.cause}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right — What went right */}
            <div className="kv-card">
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#10b981', marginBottom: '14px' }}>✅ What Went Right</h3>
              {result.strongAreas.length > 0 && (
                <div style={{ marginBottom: '14px' }}>
                  <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Strong Areas</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {result.strongAreas.map((a) => (
                      <span
                        key={a}
                        style={{ padding: '3px 10px', borderRadius: '99px', background: 'rgba(16,185,129,0.12)', color: '#10b981', fontSize: '12px', fontWeight: 600 }}
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div
                style={{
                  padding: '12px',
                  borderRadius: '10px',
                  background: 'rgba(16,185,129,0.06)',
                  border: '1px solid rgba(16,185,129,0.15)',
                  fontSize: '13px',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.6,
                }}
              >
                Keep leaning into your strengths while shoring up weak areas. Consistent review beats cramming every time.
              </div>
            </div>
          </div>

          {/* Action Plan */}
          {result.actionPlan.length > 0 && (
            <div className="kv-card">
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '14px' }}>📋 Action Plan</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {result.actionPlan.map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div
                      style={{
                        width: '26px',
                        height: '26px',
                        minWidth: '26px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #f0b429, #2dd4bf)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 900,
                        color: '#0a0a0f',
                      }}
                    >
                      {i + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>{item.action}</p>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>⏱ {item.timeEstimate}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Prevention strategy */}
          {result.preventionStrategy && (
            <div className="kv-card-teal">
              <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#2dd4bf', marginBottom: '8px' }}>🛡️ Prevention Strategy</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{result.preventionStrategy}</p>
            </div>
          )}

          {/* Motivational note */}
          {result.motivationalNote && (
            <div className="kv-card-gold">
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: 1.7 }}>
                ✨ "{result.motivationalNote}"
              </p>
            </div>
          )}
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '14px' }}>📂 Past Autopsies</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {history.map((a) => {
              const p = Math.round((a.score / a.totalMarks) * 100);
              const g = gradeLabel(p);
              return (
                <div key={a.id} className="kv-card" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      minWidth: '44px',
                      borderRadius: '10px',
                      background: `${g.color}15`,
                      border: `1px solid ${g.color}40`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '15px',
                      fontWeight: 900,
                      color: g.color,
                    }}
                  >
                    {g.grade}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px', textTransform: 'capitalize' }}>{a.subject}</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {a.score}/{a.totalMarks} ({p}%) · {new Date(a.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
