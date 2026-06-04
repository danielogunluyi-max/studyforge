'use client';

import { useEffect, useMemo, useState } from 'react';
import LoadingButton from '@/app/_components/loading-button';
import EmptyState from '@/app/_components/empty-state';

type WrappedData = {
  totalHours: number;
  totalNotes: number;
  totalCards: number;
  totalDecks: number;
  totalExams: number;
  avgScore: number;
  feynmanSessions: number;
  focusSessions: number;
  communityPosts: number;
  podcasts: number;
  topSubject: string;
  topFeature: string;
  avgMood: number;
  subjectBreakdown: Record<string, number>;
};

const CARD_BG = [
  'linear-gradient(135deg, #0a1020 0%, #13223f 100%)',
  'linear-gradient(135deg, #1a1126 0%, #2d1844 100%)',
  'linear-gradient(135deg, #10221f 0%, #17443f 100%)',
  'linear-gradient(135deg, #1f1a10 0%, #473712 100%)',
  'linear-gradient(135deg, #201018 0%, #4b1930 100%)',
  'linear-gradient(135deg, #111821 0%, #24364f 100%)',
  'linear-gradient(135deg, #182018 0%, #2e4e2e 100%)',
  'linear-gradient(135deg, #22130f 0%, #503020 100%)',
];

function moodEmoji(score: number): string {
  if (score <= 1.5) return '😩';
  if (score <= 2.5) return '😕';
  if (score <= 3.2) return '😐';
  if (score <= 4.2) return '🙂';
  return '😄';
}

function letterGrade(score: number): string {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  return 'D';
}

export default function WrappedPage() {
  const yearNow = new Date().getFullYear();
  const [year, setYear] = useState(yearNow);
  const [month, setMonth] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<WrappedData | null>(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState('');
  const [displayHours, setDisplayHours] = useState(0);
  const [displayNotes, setDisplayNotes] = useState(0);
  const [displayCards, setDisplayCards] = useState(0);
  const [displayAvg, setDisplayAvg] = useState(0);

  async function generateWrapped() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/wrapped', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, month: month === '' ? null : month }),
      });
      const payload = (await response.json().catch(() => null)) as { data?: WrappedData } | null;
      setData(payload?.data ?? null);
      setIndex(0);
    } catch {
      setError('Failed to generate wrapped data');
    } finally {
      setLoading(false);
    }
  }

  const cards = useMemo(() => {
    if (!data) return [];

    const monthLabel = month ? new Date(year, month - 1, 1).toLocaleString('en-US', { month: 'long' }) : 'Year';
    const topSubjectCount = data.subjectBreakdown?.[data.topSubject] ?? 0;
    const sharedCount = data.communityPosts + data.feynmanSessions;

    return [
      {
        title: `Your ${month ? `${monthLabel} ${year}` : `${year}`} in Review`,
        body: 'This is your study story.',
      },
      {
        title: `${data.totalHours} hours`,
        body: `of deep focus. National benchmark: 8 hrs/month`,
      },
      {
        title: data.topSubject,
        body: `You couldn't stop studying ${data.topSubject}. ${topSubjectCount} notes this period.`,
      },
      {
        title: data.topFeature,
        body: 'Your most-used Kyvex tool.',
      },
      {
        title: `${data.avgScore}% (${letterGrade(data.avgScore)})`,
        body: 'Average exam score.',
      },
      {
        title: `${sharedCount} times`,
        body: 'You shared your knowledge through community + Feynman.',
      },
      {
        title: `${moodEmoji(data.avgMood)} ${data.avgMood.toFixed(1)}`,
        body: 'Your average study mood.',
      },
      {
        title: 'Keep Going',
        body: `${data.totalHours}h focus • ${data.totalNotes} notes • ${data.totalCards} cards • Avg ${data.avgScore}%`,
      },
    ];
  }, [data, month, year]);

  useEffect(() => {
    if (!data || paused) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % Math.max(cards.length, 1));
    }, 4000);
    return () => clearInterval(timer);
  }, [data, paused, cards.length]);

  useEffect(() => {
    if (!data) {
      setDisplayHours(0);
      setDisplayNotes(0);
      setDisplayCards(0);
      setDisplayAvg(0);
      return;
    }

    const duration = 1200;
    const start = performance.now();
    let raf = 0;

    const animate = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      setDisplayHours(Math.round(data.totalHours * progress));
      setDisplayNotes(Math.round(data.totalNotes * progress));
      setDisplayCards(Math.round(data.totalCards * progress));
      setDisplayAvg(Math.round(data.avgScore * progress));
      if (progress < 1) raf = requestAnimationFrame(animate);
    };

    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [data]);

  async function shareWrapped() {
    if (!data) return;
    const text = `My Kyvex Wrapped: ${data.totalHours}h focus, ${data.totalNotes} notes, avg score ${data.avgScore}%`;

    if (navigator.share) {
      await navigator.share({ title: 'Kyvex Wrapped', text });
    } else {
      await navigator.clipboard.writeText(text);
    }
  }

  return (
    <div className="kv-page kv-animate-in" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <h1 className="kv-page-title">Kyvex Wrapped</h1>
      <p className="kv-page-subtitle">Spotify Wrapped for your study life.</p>
      {error ? <div className="kv-alert-error kv-animate-in">{error}</div> : null}

      <div className="kv-card" style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'end' }}>
          <div>
            <label className="kv-label">Year</label>
            <input className="kv-input" type="number" value={year} onChange={(e) => setYear(Number(e.target.value) || yearNow)} />
          </div>
          <div>
            <label className="kv-label">Month (optional)</label>
            <select className="kv-select" value={month} onChange={(e) => setMonth(e.target.value ? Number(e.target.value) : '')}>
              <option value="">Full year</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>{new Date(2000, m - 1, 1).toLocaleString('en-US', { month: 'long' })}</option>
              ))}
            </select>
          </div>
          <LoadingButton loading={loading} type="button" onClick={() => void generateWrapped()}>
            Generate My Wrapped
          </LoadingButton>
        </div>
      </div>

      {!data && !loading ? (
        <EmptyState
          icon="🎬"
          title="No wrapped data yet"
          description="Study more this month to generate your Kyvex Wrapped"
          action={{ label: 'Generate wrapped', onClick: () => void generateWrapped() }}
        />
      ) : null}

      {data ? (
        <div
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          style={{
            minHeight: 540,
            borderRadius: 20,
            padding: 28,
            background: CARD_BG[index % CARD_BG.length],
            color: '#fff',
            border: index === cards.length - 1 ? '2px solid rgba(240,180,41,0.8)' : '1px solid rgba(255,255,255,0.18)',
            boxShadow: '0 30px 80px rgba(0,0,0,0.35)',
            display: 'grid',
            alignContent: 'space-between',
            transition: 'all 0.35s ease',
          }}
        >
          <div className="kv-animate-scale" style={{ animation: 'fadeSlide 0.35s ease' }}>
            <div style={{ fontSize: 12, opacity: 0.8, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>Kyvex Wrapped</div>
            <h2 style={{ fontSize: 46, lineHeight: 1.06, margin: 0, marginBottom: 14 }}>{cards[index]?.title}</h2>
            <p style={{ fontSize: 20, lineHeight: 1.6, margin: 0, maxWidth: 760 }}>{cards[index]?.body}</p>
            <div className="kv-grid-4" style={{ marginTop: 14 }}>
              <div className="kv-card-sm kv-count" style={{ padding: 8 }}>Hours: {displayHours}</div>
              <div className="kv-card-sm kv-count" style={{ padding: 8 }}>Notes: {displayNotes}</div>
              <div className="kv-card-sm kv-count" style={{ padding: 8 }}>Cards: {displayCards}</div>
              <div className="kv-card-sm kv-count" style={{ padding: 8 }}>Avg: {displayAvg}%</div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {cards.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIndex(i)}
                  style={{ width: 10, height: 10, borderRadius: 999, border: 'none', background: i === index ? '#f0b429' : 'rgba(255,255,255,0.35)', cursor: 'pointer' }}
                  aria-label={`Go to card ${i + 1}`}
                />
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="kv-btn-secondary" onClick={() => setIndex((prev) => (prev - 1 + cards.length) % cards.length)}>←</button>
              <button className="kv-btn-secondary" onClick={() => setIndex((prev) => (prev + 1) % cards.length)}>→</button>
              {index === cards.length - 1 ? (
                <button className="kv-btn-primary" onClick={() => void shareWrapped()}>Share</button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <style jsx>{`
        @keyframes fadeSlide {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
