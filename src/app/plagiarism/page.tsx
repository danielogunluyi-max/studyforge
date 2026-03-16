'use client';

import { useMemo, useState } from 'react';

type Flag = {
  phrase: string;
  reason: string;
  type: 'ai_generated' | 'templated' | 'inconsistent_style' | string;
};

type Result = {
  originalityScore?: number;
  aiLikelihoodScore?: number;
  riskLevel?: 'low' | 'medium' | 'high' | string;
  flags?: Flag[];
  verdict?: string;
  recommendation?: string;
};

function colorByScore(score: number, type: 'originality' | 'ai'): string {
  if (type === 'originality') {
    if (score > 80) return '#22c55e';
    if (score >= 60) return '#f0b429';
    return '#ef4444';
  }

  if (score < 20) return '#22c55e';
  if (score <= 40) return '#f0b429';
  return '#ef4444';
}

function riskMeta(level: string) {
  if (level === 'low') return { cls: 'kv-badge kv-badge-green', text: 'Your writing looks original ✅' };
  if (level === 'medium') return { cls: 'kv-badge kv-badge-gold', text: 'Some sections need review ⚠️' };
  return { cls: 'kv-badge kv-badge-red', text: 'High risk of detection ❌' };
}

function flagBorder(type: string): string {
  if (type === 'ai_generated') return '#ef4444';
  if (type === 'templated') return '#f0b429';
  return '#60a5fa';
}

function fixHint(type: string): string {
  if (type === 'ai_generated') return 'Add personal examples and vary sentence patterns.';
  if (type === 'templated') return 'Rewrite this line in your own voice with concrete detail.';
  return 'Revise nearby sentences for a consistent tone and complexity level.';
}

export default function PlagiarismPage() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Result | null>(null);

  const words = useMemo(() => text.trim().split(/\s+/).filter(Boolean).length, [text]);

  async function checkOriginality() {
    if (!text.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch('/api/plagiarism', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = (await res.json().catch(() => ({}))) as Result & { error?: string };
      if (!res.ok) {
        setError(data.error || 'Originality check failed');
        return;
      }
      setResult(data);
    } catch {
      setError('Originality check failed');
    } finally {
      setLoading(false);
    }
  }

  const originality = result?.originalityScore ?? 0;
  const aiRisk = result?.aiLikelihoodScore ?? 0;
  const risk = riskMeta((result?.riskLevel || 'low').toLowerCase());

  return (
    <main className="kv-page">
      <section className="kv-section">
        <h1 className="kv-title">Originality Check 🔍</h1>
        <p className="kv-subtitle">Check your essay for originality and AI-detection risk</p>

        <div className="kv-card mt-5" style={{ border: '1px solid rgba(240,180,41,0.5)' }}>
          <p>
            This checks writing patterns and style consistency.
            <br />
            It does not scan the internet. For full plagiarism
            <br />
            detection, also use Turnitin or your school's tools.
          </p>
        </div>

        <div className="kv-card mt-4">
          <textarea
            className="kv-textarea"
            style={{ minHeight: 250 }}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste essay text here..."
          />
          <p className="mt-2 text-sm text-[var(--text-muted)]">{words} words</p>
          <button className="kv-btn-primary mt-3" disabled={loading || !text.trim()} onClick={() => void checkOriginality()}>
            {loading ? 'Analyzing writing patterns...' : 'Check Originality'}
          </button>
          {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
        </div>

        {result && (
          <>
            <div className="kv-grid-2 mt-5">
              <div className="kv-card" style={{ textAlign: 'center' }}>
                <div
                  style={{
                    width: 140,
                    height: 140,
                    borderRadius: '50%',
                    margin: '0 auto 10px',
                    border: `8px solid ${colorByScore(originality, 'originality')}`,
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: 34,
                    fontWeight: 900,
                    color: colorByScore(originality, 'originality'),
                  }}
                >
                  {originality}%
                </div>
                <p className="font-semibold">Originality Score</p>
              </div>

              <div className="kv-card" style={{ textAlign: 'center' }}>
                <div
                  style={{
                    width: 140,
                    height: 140,
                    borderRadius: '50%',
                    margin: '0 auto 10px',
                    border: `8px solid ${colorByScore(aiRisk, 'ai')}`,
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: 34,
                    fontWeight: 900,
                    color: colorByScore(aiRisk, 'ai'),
                  }}
                >
                  {aiRisk}%
                </div>
                <p className="font-semibold">Chance of AI detection</p>
              </div>
            </div>

            <div className="kv-card mt-4">
              <span className={risk.cls}>{(result.riskLevel || 'LOW').toUpperCase()}</span>
              <p className="mt-2">{risk.text}</p>
            </div>

            <div className="kv-card mt-4">
              <h3 className="mb-3 text-lg font-semibold">Flags</h3>
              {(result.flags || []).length === 0 && <p className="text-sm text-[var(--text-muted)]">No major flags found.</p>}
              <div className="space-y-2">
                {(result.flags || []).map((flag, index) => (
                  <div key={`${flag.phrase}-${index}`} className="kv-card" style={{ borderLeft: `4px solid ${flagBorder(flag.type)}` }}>
                    <p className="mb-1 font-semibold">{flag.phrase}</p>
                    <p className="mb-1 text-sm text-[var(--text-secondary)]">{flag.reason}</p>
                    <span className="kv-badge kv-badge-blue">{flag.type}</span>
                    <p className="mt-2 text-xs text-[var(--text-muted)]">How to fix this: {fixHint(flag.type)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="kv-card-gold mt-4">
              <p className="mb-2"><strong>Verdict:</strong> {result.verdict}</p>
              <p><strong>Recommendation:</strong> {result.recommendation}</p>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
