'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Skeleton from '@/app/_components/skeleton';
import { formatTorontoDate } from '~/lib/toronto-time';

type Subject = {
  subject: string;
  mastery: number;
  label: string;
  color: string;
  noteScore: number;
  flashcardScore: number;
  feynmanScore: number;
  curriculumScore: number;
  examScore: number;
  notes: number;
  topics: string[];
  activity: Array<{ date: string; type: string }>;
};

type MasteryData = {
  subjects: Subject[];
  stats: {
    totalSubjects: number;
    masteredCount: number;
    avgMastery: number;
  };
  heatmap: Record<string, number>;
};

const ONTARIO_COURSE = /^[A-Z]{3,4}\d[A-Z]$/i;

function ActivityHeatmap({ heatmap }: { heatmap: Record<string, number> }) {
  const weeks = 16;
  const days = weeks * 7;
  const today = new Date();
  const cells: Array<{ date: string; count: number; intensity: number; label: string }> = [];

  for (let index = days - 1; index >= 0; index -= 1) {
    const date = new Date(today);
    date.setDate(date.getDate() - index);
    const key = date.toISOString().split('T')[0] ?? '';
    const count = heatmap[key] || 0;
    const intensity = count === 0 ? 0 : count === 1 ? 1 : count <= 3 ? 2 : 3;

    cells.push({
      date: key,
      count,
      intensity,
      label: formatTorontoDate(date),
    });
  }

  const fills = ['transparent', 'var(--bg-active)', 'var(--bg-hover)', 'var(--kv-accent)'];

  return (
    <div>
      <div style={{ display: 'flex', gap: 0, flexWrap: 'wrap', maxWidth: '100%' }}>
        {cells.map((cell) => (
          <div
            key={cell.date}
            title={`${cell.label}: ${cell.count}`}
            style={{
              width: 12,
              height: 12,
              border: '1px solid var(--border-default)',
              background: fills[cell.intensity],
              flexShrink: 0,
            }}
          />
        ))}
      </div>
      <p className="kv-meta" style={{ marginTop: 8 }}>
        Less
        <span style={{ display: 'inline-flex', gap: 0, margin: '0 8px', verticalAlign: 'middle' }}>
          {fills.map((color, i) => (
            <span
              key={i}
              style={{
                width: 12,
                height: 12,
                border: '1px solid var(--border-default)',
                background: color,
                display: 'inline-block',
              }}
            />
          ))}
        </span>
        More
      </p>
    </div>
  );
}

export default function MasteryPage() {
  const [data, setData] = useState<MasteryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError('');
      try {
        const response = await fetch('/api/mastery');
        const payload = (await response.json().catch(() => null)) as MasteryData | null;
        setData(payload);
      } catch {
        setError('Failed to load mastery data');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const subjects = data?.subjects ?? [];
  const filteredSubjects = subjects.filter((subject) => {
    if (filter === 'all') return true;
    if (filter === 'mastered') return subject.mastery > 80;
    if (filter === 'needs-work') return subject.mastery <= 60;
    if (filter === 'in-progress') return subject.mastery > 20 && subject.mastery <= 80;
    return true;
  });

  if (loading) {
    return (
      <main className="kv-page" style={{ padding: '24px 16px 100px' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <Skeleton variant="card" count={3} />
        </div>
      </main>
    );
  }

  if (!data || subjects.length === 0) {
    return (
      <main className="kv-page" style={{ padding: '24px 16px 100px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div className="kv-crumb">Kyvex / <b>Mastery</b></div>
          <h1 className="kv-title" style={{ marginTop: 14 }}>Mastery</h1>
          <p className="kv-sub" style={{ marginTop: 16 }}>No mastery data yet. Create notes and flashcards to start tracking retention.</p>
          <Link href="/generator" className="kv-row" style={{ marginTop: 8 }}>
            <span className="kv-row-title">Create your first note</span>
          </Link>
        </div>
      </main>
    );
  }

  const filters = [
    { value: 'all', label: 'All', count: subjects.length },
    { value: 'mastered', label: 'Mastered', count: subjects.filter((s) => s.mastery > 80).length },
    { value: 'in-progress', label: 'In progress', count: subjects.filter((s) => s.mastery > 20 && s.mastery <= 80).length },
    { value: 'needs-work', label: 'Needs work', count: subjects.filter((s) => s.mastery <= 60).length },
  ];

  return (
    <main className="kv-page" style={{ padding: '24px 16px 100px' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        {error ? <p className="kv-meta" style={{ color: '#E5484D' }}>{error}</p> : null}
        <div className="kv-crumb">Kyvex / <b>Mastery</b></div>
        <h1 className="kv-title" style={{ marginTop: 14 }}>Mastery</h1>
        <p className="kv-sub" style={{ marginTop: 10 }}>
          Aggregated from your notes, SM-2 cards, curriculum checklists, exams, and mocks — no invented scores.
        </p>

        <div className="kv-stats" style={{ marginTop: 28, gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <div className="kv-stat">
            <span className="kv-meta">Subjects</span>
            <b className="num">{data.stats.totalSubjects}</b>
          </div>
          <div className="kv-stat">
            <span className="kv-meta">Mastered</span>
            <b className="num">{data.stats.masteredCount}</b>
          </div>
          <div className="kv-stat">
            <span className="kv-meta">Avg mastery</span>
            <b className="num">{data.stats.avgMastery}%</b>
          </div>
        </div>

        <p className="kv-meta" style={{ marginTop: 28 }}>Activity · 16 weeks</p>
        <div style={{ marginTop: 12 }}>
          <ActivityHeatmap heatmap={data.heatmap} />
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 28 }}>
          {filters.map((entry) => (
            <button
              key={entry.value}
              type="button"
              onClick={() => setFilter(entry.value)}
              className="kv-chip"
              style={
                filter === entry.value
                  ? { borderColor: 'var(--kv-accent-text)', color: 'var(--kv-accent-text)' }
                  : undefined
              }
            >
              {entry.label}
              <span className="num" style={{ marginLeft: 6 }}>{entry.count}</span>
            </button>
          ))}
        </div>

        <div style={{ marginTop: 8 }}>
          {filteredSubjects.map((subject) => {
            const open = selectedSubject?.subject === subject.subject;
            return (
              <button
                key={subject.subject}
                type="button"
                className="kv-row"
                onClick={() => setSelectedSubject(open ? null : subject)}
                style={{ width: '100%', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
                aria-expanded={open}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="kv-row-title">{subject.subject}</div>
                  <div className="kv-row-sub">
                    {ONTARIO_COURSE.test(subject.subject.trim()) ? (
                      <span className="kv-chip kv-chip-course">{subject.subject}</span>
                    ) : null}
                    <span className="kv-chip">{subject.label}</span>
                    {subject.curriculumScore > 0 ? (
                      <span className="kv-chip num">Curriculum {Math.round(subject.curriculumScore)}/20</span>
                    ) : null}
                  </div>
                  <div className="kv-bar" style={{ marginTop: 10, maxWidth: 280 }}>
                    <div style={{ width: `${Math.max(0, Math.min(100, subject.mastery))}%` }} />
                  </div>
                  {open && subject.topics.length > 0 ? (
                    <p className="kv-meta" style={{ marginTop: 8 }}>
                      {subject.topics.slice(0, 6).join(' · ')}
                      {subject.topics.length > 6 ? ` +${subject.topics.length - 6}` : ''}
                    </p>
                  ) : null}
                </div>
                <span className="kv-meta num">{subject.mastery}%</span>
              </button>
            );
          })}
        </div>

        {subjects.some((subject) => subject.mastery < 60) ? (
          <div style={{ marginTop: 32 }}>
            <p className="kv-meta">Focus next</p>
            {subjects
              .filter((subject) => subject.mastery < 60)
              .slice(0, 4)
              .map((subject) => (
                <div key={subject.subject} className="kv-row">
                  <div>
                    <div className="kv-row-title">{subject.subject}</div>
                    <div className="kv-row-sub">
                      <span className="kv-chip">{subject.label}</span>
                    </div>
                  </div>
                  <span className="kv-meta num">{subject.mastery}%</span>
                </div>
              ))}
          </div>
        ) : null}
      </div>
    </main>
  );
}
