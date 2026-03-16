'use client';

import { useEffect, useMemo, useState } from 'react';
import LoadingButton from '@/app/_components/loading-button';
import EmptyState from '@/app/_components/empty-state';

type IQBreakdown = {
  masteryScore: number;
  consistencyScore: number;
  velocityScore: number;
  depthScore: number;
  total: number;
  rank: string;
};

type IQResult = {
  score: number;
  rank: string;
  masteryScore: number;
  consistencyScore: number;
  velocityScore: number;
  depthScore: number;
  breakdown?: {
    notes?: number;
    cards?: number;
    exams?: number;
    feynman?: number;
  };
};

export default function KyvexIQPage() {
  const [iq, setIq] = useState<IQResult | null>(null);
  const [calcDetails, setCalcDetails] = useState<IQBreakdown | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [displayScore, setDisplayScore] = useState(0);

  const cardText = useMemo(() => {
    if (!iq) return 'My Kyvex IQ: Not calculated yet';
    return `My Kyvex IQ: ${iq.score}\n${iq.rank}\nMastery ${iq.masteryScore}/250 • Consistency ${iq.consistencyScore}/250 • Velocity ${iq.velocityScore}/250 • Depth ${iq.depthScore}/250`;
  }, [iq]);

  useEffect(() => {
    if (!iq) {
      setDisplayScore(0);
      return;
    }

    const duration = 1500;
    const start = performance.now();
    const target = iq.score;

    let rafId = 0;
    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / duration);
      setDisplayScore(Math.round(target * progress));
      if (progress < 1) {
        rafId = requestAnimationFrame(tick);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [iq]);

  const calcIQ = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/kyvex-iq', { method: 'POST' });
      const data = (await response.json()) as { iq?: IQResult; breakdown?: IQBreakdown; error?: string };
      if (!response.ok || !data.iq) {
        setError(data.error ?? 'Calculation failed');
        return;
      }
      setIq(data.iq);
      setCalcDetails(data.breakdown ?? null);
    } catch {
      setError('Network error while calculating score');
    } finally {
      setLoading(false);
    }
  };

  const shareScore = async () => {
    if (!iq) return;
    const shareText = `My Kyvex IQ: ${iq.score} (${iq.rank})`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'My Kyvex IQ',
          text: shareText,
        });
        return;
      }
      await navigator.clipboard.writeText(`${shareText}\n${cardText}`);
    } catch {
      setError('Could not share score.');
    }
  };

  const downloadCardAsImage = () => {
    if (!iq) return;

    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 630;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gradient = ctx.createLinearGradient(0, 0, 1200, 630);
    gradient.addColorStop(0, '#0d1424');
    gradient.addColorStop(1, '#12192e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1200, 630);

    ctx.fillStyle = '#f0b429';
    ctx.font = '900 72px Inter, Arial, sans-serif';
    ctx.fillText(`My Kyvex IQ: ${iq.score}`, 70, 170);

    ctx.fillStyle = '#2dd4bf';
    ctx.font = '700 44px Inter, Arial, sans-serif';
    ctx.fillText(iq.rank, 70, 245);

    ctx.fillStyle = '#e8eaf6';
    ctx.font = '600 34px Inter, Arial, sans-serif';
    ctx.fillText(`Mastery ${iq.masteryScore}/250`, 70, 330);
    ctx.fillText(`Consistency ${iq.consistencyScore}/250`, 70, 380);
    ctx.fillText(`Velocity ${iq.velocityScore}/250`, 70, 430);
    ctx.fillText(`Depth ${iq.depthScore}/250`, 70, 480);

    ctx.fillStyle = '#8892b0';
    ctx.font = '700 28px Inter, Arial, sans-serif';
    ctx.fillText('KYVEX', 70, 560);

    const link = document.createElement('a');
    link.download = 'kyvex-iq-card.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 kv-animate-in">
      <header className="mb-6">
        <h1 className="text-3xl font-black">Kyvex IQ Score</h1>
        <p className="mt-2 text-[var(--text-secondary)]">your academic intelligence rating</p>
      </header>

      {error && <div className="kv-card mb-4 border-[var(--accent-red)] p-3 text-sm text-[var(--accent-red)]">{error}</div>}

      <section className="kv-card kv-card-gold mb-4 p-6 text-center">
        <LoadingButton loading={loading} type="button" onClick={() => void calcIQ()}>
          Calculate My IQ
        </LoadingButton>

        {iq && (
          <div className="mt-6">
            <p className="kv-animate-bounce bg-gradient-to-r from-[#f0b429] to-[#2dd4bf] bg-clip-text text-[96px] font-black leading-none text-transparent">{displayScore}</p>
            <p className="mt-2 text-2xl font-bold">{iq.rank}</p>
            <p className="text-sm text-[var(--text-secondary)]">out of 1000</p>
          </div>
        )}
      </section>

      {!iq && !loading ? (
        <EmptyState
          icon="🧬"
          title="IQ not calculated yet"
          description="Calculate your Kyvex IQ to see your academic intelligence score"
          action={{ label: 'Calculate my IQ', onClick: () => void calcIQ() }}
        />
      ) : null}

      {iq && (
        <>
          <section className="kv-grid-2 kv-stagger kv-animate-in mb-4">
            {[
              { label: 'Mastery', value: iq.masteryScore, desc: 'Understanding and exam performance' },
              { label: 'Consistency', value: iq.consistencyScore, desc: 'Habit and streak reliability' },
              { label: 'Velocity', value: iq.velocityScore, desc: 'Study output over time' },
              { label: 'Depth', value: iq.depthScore, desc: 'Concept clarity and explanation quality' },
            ].map((item) => (
              <article key={item.label} className="kv-card kv-animate-in p-4">
                <p className="text-sm font-semibold text-[var(--text-secondary)]">{item.label}</p>
                <p className="text-4xl font-black">{item.value}<span className="text-base font-semibold text-[var(--text-secondary)]"> / 250</span></p>
                <div className="kv-progress-track mt-3">
                  <div className="kv-progress-fill" style={{ width: `${Math.round((item.value / 250) * 100)}%` }} />
                </div>
                <p className="mt-2 text-xs text-[var(--text-secondary)]">{item.desc}</p>
              </article>
            ))}
          </section>

          <section className="kv-card kv-card-elevated mb-4 p-5">
            <h2 className="mb-3 text-xl font-bold">Breakdown</h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="kv-card-sm p-3">Notes created: <strong>{iq.breakdown?.notes ?? 0}</strong></div>
              <div className="kv-card-sm p-3">Flashcards: <strong>{iq.breakdown?.cards ?? 0}</strong></div>
              <div className="kv-card-sm p-3">Exams logged: <strong>{iq.breakdown?.exams ?? 0}</strong></div>
              <div className="kv-card-sm p-3">Feynman sessions: <strong>{iq.breakdown?.feynman ?? 0}</strong></div>
            </div>
            {calcDetails && (
              <p className="mt-3 text-sm text-[var(--text-secondary)]">
                Last calculation: Mastery {calcDetails.masteryScore}, Consistency {calcDetails.consistencyScore}, Velocity {calcDetails.velocityScore}, Depth {calcDetails.depthScore}
              </p>
            )}
          </section>

          <section className="kv-card kv-card-gold p-5">
            <div className="kv-card-elevated rounded-2xl p-5">
              <p className="text-5xl font-black kv-count">My Kyvex IQ: {displayScore}</p>
              <p className="mt-2 inline-block rounded-full bg-[rgba(45,212,191,0.2)] px-3 py-1 text-sm font-bold">{iq.rank}</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="kv-card-sm p-2">Mastery: {iq.masteryScore}</div>
                <div className="kv-card-sm p-2">Consistency: {iq.consistencyScore}</div>
                <div className="kv-card-sm p-2">Velocity: {iq.velocityScore}</div>
                <div className="kv-card-sm p-2">Depth: {iq.depthScore}</div>
              </div>
              <p className="mt-4 text-sm font-semibold text-[var(--text-secondary)]">KYVEX</p>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button className="kv-btn-primary" onClick={() => void shareScore()}>Share Score</button>
              <button className="kv-btn-secondary" onClick={downloadCardAsImage}>Download as Image</button>
              <button className="kv-btn-secondary" onClick={() => void calcIQ()} disabled={loading}>Update Score</button>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
