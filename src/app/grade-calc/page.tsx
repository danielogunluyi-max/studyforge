'use client';

import { useEffect, useMemo, useState } from 'react';
import LoadingButton from '@/app/_components/loading-button';
import EmptyState from '@/app/_components/empty-state';

type GradeCalcRow = {
  id: string;
  courseName: string;
  neededOnFinal: number;
  createdAt?: string;
};

type GradeCalcResult = {
  neededOnFinal: number;
  isPossible: boolean;
  isEasy: boolean;
  message: string;
};

function asNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function resultTone(score: number): { color: string; label: string } {
  if (score <= 50) return { color: '#10b981', label: "Easy! You've basically got this 🎉" };
  if (score <= 70) return { color: '#14b8a6', label: 'Totally doable 👍' };
  if (score <= 85) return { color: '#f0b429', label: "You'll need to study hard 📚" };
  if (score <= 99) return { color: '#f97316', label: 'Very challenging ⚠️' };
  return { color: '#ef4444', label: 'Not mathematically possible ❌' };
}

export default function GradeCalcPage() {
  const [courseName, setCourseName] = useState('');
  const [currentGrade, setCurrentGrade] = useState('75');
  const [currentWeight, setCurrentWeight] = useState('70');
  const [finalWeight, setFinalWeight] = useState('30');
  const [targetGrade, setTargetGrade] = useState('85');

  const [result, setResult] = useState<GradeCalcResult | null>(null);
  const [recent, setRecent] = useState<GradeCalcRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const tone = useMemo(() => (result ? resultTone(result.neededOnFinal) : null), [result]);
  const [displayScore, setDisplayScore] = useState(0);

  async function loadRecent() {

      useEffect(() => {
        if (!result) {
          setDisplayScore(0);
          return;
        }
        const target = result.neededOnFinal;
        const duration = 1200;
        const start = performance.now();
        let rafId = 0;
        const tick = (now: number) => {
          const elapsed = now - start;
          const progress = Math.min(1, elapsed / duration);
          setDisplayScore(Math.round(target * progress * 10) / 10);
          if (progress < 1) {
            rafId = requestAnimationFrame(tick);
          }
        };
        rafId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafId);
      }, [result?.neededOnFinal]);
    const response = await fetch('/api/grade-calc');
    if (!response.ok) return;

    const payload = (await response.json().catch(() => null)) as { calcs?: Array<Record<string, unknown>> } | null;
    const rows = (payload?.calcs ?? []).map((entry, index) => {
      const id = String(entry.id ?? index);
      const rawCourse = entry.courseName;
      const rawNeed = entry.neededOnFinal;
      return {
        id,
        courseName: typeof rawCourse === 'string' ? rawCourse : 'Untitled course',
        neededOnFinal: typeof rawNeed === 'number' ? rawNeed : 0,
        createdAt: typeof entry.createdAt === 'string' ? entry.createdAt : undefined,
      };
    });

    setRecent(rows);
  }

  useEffect(() => {
    loadRecent().catch(() => undefined);
  }, []);

  async function calculate() {
    setLoading(true);
    setError('');

    try {
      const payload = {
        courseName,
        currentGrade: asNumber(currentGrade),
        currentWeight: asNumber(currentWeight),
        finalWeight: asNumber(finalWeight),
        targetGrade: asNumber(targetGrade),
      };

      const response = await fetch('/api/grade-calc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const body = (await response.json().catch(() => null)) as Partial<GradeCalcResult> & { error?: string } | null;
      if (!response.ok || !body) {
        setError(body?.error ?? 'Could not calculate right now.');
        return;
      }

      setResult({
        neededOnFinal: typeof body.neededOnFinal === 'number' ? body.neededOnFinal : 0,
        isPossible: Boolean(body.isPossible),
        isEasy: Boolean(body.isEasy),
        message: typeof body.message === 'string' ? body.message : 'Calculation complete.',
      });

      await loadRecent();
    } catch {
      setError('Could not calculate right now.');
    } finally {
      setLoading(false);
    }
  }

  async function saveCalculation() {
    setSaving(true);
    setError('');

    try {
      const response = await fetch('/api/grade-calc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseName,
          currentGrade: asNumber(currentGrade),
          currentWeight: asNumber(currentWeight),
          finalWeight: asNumber(finalWeight),
          targetGrade: asNumber(targetGrade),
        }),
      });

      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setError(body?.error ?? 'Could not save.');
        return;
      }

      await loadRecent();
    } catch {
      setError('Could not save.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="kv-page kv-page-grade-calc kv-animate-in" style={{ padding: '32px 16px 48px' }}>
      <section className="kv-container kv-stack-lg" style={{ maxWidth: 980, margin: '0 auto' }}>
        <header className="kv-hero kv-text-center" style={{ marginBottom: 20 }}>
          <h1 className="kv-title-xl" style={{ fontSize: 40, fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 8 }}>
            Grade Calculator 🎯
          </h1>
          <p className="kv-subtitle" style={{ color: 'var(--text-secondary)', fontSize: 16 }}>
            Find out exactly what you need on your final
          </p>
        </header>

        <div className="kv-card kv-card-gold kv-card-xl" style={{ maxWidth: 500, margin: '0 auto', padding: 22 }}>
          <div className="kv-stack-md">
            <label className="kv-label" htmlFor="courseName">Course name</label>
            <input
              id="courseName"
              className="kv-input"
              placeholder="e.g. Biology"
              value={courseName}
              onChange={(event) => setCourseName(event.target.value)}
            />

            <label className="kv-label" htmlFor="currentGrade">My current grade</label>
            <div className="kv-input-wrap kv-input-percent" style={{ display: 'flex', gap: 8 }}>
              <input
                id="currentGrade"
                type="number"
                className="kv-input kv-input-number"
                value={currentGrade}
                onChange={(event) => setCurrentGrade(event.target.value)}
              />
              <span className="kv-input-suffix" style={{ alignSelf: 'center', fontWeight: 700 }}>%</span>
            </div>

            <label className="kv-label" htmlFor="currentWeight">Worth (current weight)</label>
            <div className="kv-input-wrap kv-input-percent" style={{ display: 'flex', gap: 8 }}>
              <input
                id="currentWeight"
                type="number"
                className="kv-input kv-input-number"
                value={currentWeight}
                onChange={(event) => setCurrentWeight(event.target.value)}
              />
              <span className="kv-input-suffix" style={{ alignSelf: 'center', fontWeight: 700 }}>%</span>
            </div>

            <label className="kv-label" htmlFor="finalWeight">Final exam worth</label>
            <div className="kv-input-wrap kv-input-percent" style={{ display: 'flex', gap: 8 }}>
              <input
                id="finalWeight"
                type="number"
                className="kv-input kv-input-number"
                value={finalWeight}
                onChange={(event) => setFinalWeight(event.target.value)}
              />
              <span className="kv-input-suffix" style={{ alignSelf: 'center', fontWeight: 700 }}>%</span>
            </div>

            <label className="kv-label" htmlFor="targetGrade">I want to get</label>
            <div className="kv-input-wrap kv-input-percent" style={{ display: 'flex', gap: 8 }}>
              <input
                id="targetGrade"
                type="number"
                className="kv-input kv-input-number"
                value={targetGrade}
                onChange={(event) => setTargetGrade(event.target.value)}
              />
              <span className="kv-input-suffix" style={{ alignSelf: 'center', fontWeight: 700 }}>%</span>
            </div>

            <button className="kv-btn-primary kv-btn-block" onClick={calculate} disabled={loading}>
              {loading ? 'Calculating...' : 'CALCULATE'}
            </button>

            {error ? <p className="kv-text-danger" style={{ color: '#ef4444', fontSize: 13 }}>{error}</p> : null}
          </div>
        </div>

        {result && tone ? (
          <section className="kv-card kv-card-result kv-stack-sm" style={{ maxWidth: 680, margin: '20px auto 0', padding: 20 }}>
            <div className="kv-text-center" style={{ marginBottom: 8 }}>
              <p className="kv-caption">You need</p>
              <div
                className={`kv-number-xl ${!result.isPossible ? 'kv-shake' : ''}`}
                style={{ fontSize: 56, fontWeight: 900, color: tone.color, lineHeight: 1, letterSpacing: '-0.04em' }}
              >
                {displayScore.toFixed(1)}%
              </div>
              <p className="kv-result-tone" style={{ color: tone.color, fontWeight: 700, marginTop: 8 }}>{tone.label}</p>
            </div>

            <p className="kv-body" style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>{result.message}</p>

            <button className="kv-btn-secondary kv-btn-block" onClick={saveCalculation} disabled={saving}>
              {saving ? (
                <span style={{ opacity: 0.7 }}>Saving...</span>
              ) : (
                <span>Save Calculation</span>
              )}
            </button>
          </section>
        ) : null}

        <section className="kv-stack-sm" style={{ maxWidth: 700, margin: '10px auto 0' }}>
          <h2 className="kv-title-md" style={{ fontSize: 18, fontWeight: 800 }}>Recent calculations</h2>
          {recent.length === 0 ? (
            <div className="kv-card-sm kv-empty">No calculations yet.</div>
          ) : (
            <div className="kv-stack-sm">
              {recent.map((entry) => (
                <div
                  key={entry.id}
                  className="kv-card-sm kv-row-between"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 14px',
                    gap: 10,
                    borderRadius: 10,
                  }}
                >
                  <span className="kv-badge kv-badge-gold" style={{ fontWeight: 800 }}>{entry.neededOnFinal.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>

  );
}

