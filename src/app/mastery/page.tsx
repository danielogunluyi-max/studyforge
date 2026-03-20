'use client';

import { useEffect, useState } from 'react';
import Skeleton from '@/app/_components/skeleton';
import EmptyState from '@/app/_components/empty-state';

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

const MASTERY_LEVELS = [
  { label: 'Not Started', min: 0, max: 20, color: '#1e1e30', emoji: '⬜' },
  { label: 'Beginner', min: 21, max: 40, color: '#ef4444', emoji: '🟥' },
  { label: 'Developing', min: 41, max: 60, color: '#f97316', emoji: '🟧' },
  { label: 'Proficient', min: 61, max: 80, color: '#eab308', emoji: '🟨' },
  { label: 'Mastered', min: 81, max: 100, color: '#10b981', emoji: '🟩' },
];

function getMasteryEmoji(mastery: number) {
  if (mastery <= 20) return '⬜';
  if (mastery <= 40) return '🟥';
  if (mastery <= 60) return '🟧';
  if (mastery <= 80) return '🟨';
  return '🟩';
}

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
      label: date.toLocaleDateString(),
    });
  }

  const intensityColors = ['#1e1e30', 'rgba(16,185,129,0.3)', 'rgba(16,185,129,0.6)', '#10b981'];

  return (
    <div>
      <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap', maxWidth: '100%' }}>
        {cells.map((cell) => (
          <div
            key={cell.date}
            title={`${cell.label}: ${cell.count} activities`}
            style={{
              width: 12,
              height: 12,
              borderRadius: '2px',
              border: '1px solid var(--kv-heatmap-cell-border)',
              background: intensityColors[cell.intensity],
              cursor: 'default',
              flexShrink: 0,
            }}
          />
        ))}
      </div>
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '8px' }}>
        <span style={{ fontSize: '11px', color: 'var(--kv-text-muted)' }}>Less</span>
        {intensityColors.map((color) => (
          <div key={color} style={{ width: 12, height: 12, borderRadius: '2px', background: color, border: '1px solid var(--kv-heatmap-cell-border)' }} />
        ))}
        <span style={{ fontSize: '11px', color: 'var(--kv-text-muted)' }}>More</span>
      </div>
    </div>
  );
}

function SubjectRadar({ subject }: { subject: Subject }) {
  const size = 160;
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = 60;

  const axes = [
    { label: 'Notes', value: subject.noteScore, max: 20 },
    { label: 'Flashcards', value: subject.flashcardScore, max: 25 },
    { label: 'Feynman', value: subject.feynmanScore, max: 25 },
    { label: 'Curriculum', value: subject.curriculumScore, max: 20 },
    { label: 'Exams', value: subject.examScore, max: 10 },
  ];

  const points = axes.map((axis, index) => {
    const angle = (index / axes.length) * 2 * Math.PI - Math.PI / 2;
    const ratio = axis.max > 0 ? axis.value / axis.max : 0;

    return {
      x: centerX + Math.cos(angle) * radius * ratio,
      y: centerY + Math.sin(angle) * radius * ratio,
      labelX: centerX + Math.cos(angle) * (radius + 18),
      labelY: centerY + Math.sin(angle) * (radius + 18),
      label: axis.label,
    };
  });

  const polygon = points.map((point) => `${point.x},${point.y}`).join(' ');
  const gridLevels = [0.25, 0.5, 0.75, 1];

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {gridLevels.map((level) => {
        const gridPoints = axes
          .map((_, index) => {
            const angle = (index / axes.length) * 2 * Math.PI - Math.PI / 2;
            return `${centerX + Math.cos(angle) * radius * level},${centerY + Math.sin(angle) * radius * level}`;
          })
          .join(' ');

        return <polygon key={`grid-${level}`} points={gridPoints} fill="none" stroke="#1e1e30" strokeWidth="1" />;
      })}

      {axes.map((_, index) => {
        const angle = (index / axes.length) * 2 * Math.PI - Math.PI / 2;
        return (
          <line
            key={`axis-${index}`}
            x1={centerX}
            y1={centerY}
            x2={centerX + Math.cos(angle) * radius}
            y2={centerY + Math.sin(angle) * radius}
            stroke="#1e1e30"
            strokeWidth="1"
          />
        );
      })}

      <polygon points={polygon} fill={`${subject.color}30`} stroke={subject.color} strokeWidth="2" />

      {points.map((point) => (
        <text
          key={point.label}
          x={point.labelX}
          y={point.labelY}
          fill="#8888a0"
          fontSize="8"
          textAnchor="middle"
          dominantBaseline="middle"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
        >
          {point.label}
        </text>
      ))}

      <text
        x={centerX}
        y={centerY - 4}
        fill={subject.color}
        fontSize="16"
        fontWeight="800"
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
      >
        {subject.mastery}
      </text>
      <text x={centerX} y={centerY + 12} fill="#8888a0" fontSize="7" textAnchor="middle" fontFamily="ui-sans-serif, system-ui, sans-serif">
        /100
      </text>
    </svg>
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
      <div style={{ padding: '32px', maxWidth: '1000px', margin: '0 auto' }} className="kv-animate-in">
        <Skeleton variant="card" count={3} />
      </div>
    );
  }

  if (!data || subjects.length === 0) {
    return (
      <div style={{ padding: '32px', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }} className="kv-animate-in">
        <EmptyState
          icon="🎯"
          title="No mastery data yet"
          description="Create notes and flashcards to start tracking mastery"
          action={{ label: 'Create your first note', href: '/generator' }}
        />
      </div>
    );
  }

  return (
    <div style={{ padding: '32px', maxWidth: '1100px', margin: '0 auto' }} className="kv-animate-in">
      {error ? <div className="kv-alert-error kv-animate-in">{error}</div> : null}
      <div style={{ marginBottom: '28px' }}>
        <h1 className="kv-heading-page" style={{ marginBottom: '6px' }}>
          🗺 Mastery Chart
        </h1>
        <p className="kv-text-description">A visual map of everything you've learned across all subjects.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Subjects Tracked', value: data.stats.totalSubjects, color: 'var(--accent-blue)', emoji: '📚' },
          { label: 'Mastered', value: data.stats.masteredCount, color: '#10b981', emoji: '🏆' },
          {
            label: 'Avg Mastery',
            value: `${data.stats.avgMastery}%`,
            color: data.stats.avgMastery > 60 ? '#10b981' : data.stats.avgMastery > 40 ? '#f97316' : '#ef4444',
            emoji: '📊',
          },
        ].map((stat) => (
          <div key={stat.label} className="card" style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', marginBottom: '6px' }}>{stat.emoji}</div>
            <div style={{ fontSize: '28px', fontWeight: 900, color: stat.color, letterSpacing: '-0.03em', marginBottom: '4px' }}>{stat.value}</div>
            <div style={{ fontSize: '12px', color: 'var(--kv-text-tertiary)' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: '16px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span className="kv-heading-section" style={{ flexShrink: 0 }}>
            Mastery Scale:
          </span>

          {MASTERY_LEVELS.map((level) => (
            <div key={level.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: 12, height: 12, borderRadius: '3px', background: level.color, flexShrink: 0 }} />
              <span style={{ fontSize: '12px', color: 'var(--kv-text-secondary)' }}>
                {level.emoji} {level.label}
                <span style={{ color: 'var(--kv-text-muted)', marginLeft: '4px' }}>
                  ({level.min}-{level.max})
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: '20px', marginBottom: '20px' }}>
        <h3 className="kv-heading-section" style={{ marginBottom: '14px' }}>📅 Study Activity (last 16 weeks)</h3>
        <ActivityHeatmap heatmap={data.heatmap} />
      </div>

      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {[
          { value: 'all', label: 'All subjects' },
          { value: 'mastered', label: '🟩 Mastered' },
          { value: 'in-progress', label: '🟧 In Progress' },
          { value: 'needs-work', label: '🟥 Needs Work' },
        ].map((entry) => (
          <button
            key={entry.value}
            onClick={() => setFilter(entry.value)}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              border: `1px solid ${filter === entry.value ? 'var(--accent-blue)' : 'var(--border-default)'}`,
              background: filter === entry.value ? 'var(--accent-blue)' : 'var(--bg-elevated)',
              color: filter === entry.value ? 'white' : 'var(--text-muted)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {entry.label}
            <span style={{ marginLeft: '6px', opacity: 0.8 }}>
              {entry.value === 'all'
                ? subjects.length
                : entry.value === 'mastered'
                  ? subjects.filter((subject) => subject.mastery > 80).length
                  : entry.value === 'in-progress'
                    ? subjects.filter((subject) => subject.mastery > 20 && subject.mastery <= 80).length
                    : subjects.filter((subject) => subject.mastery <= 60).length}
            </span>
          </button>
        ))}
      </div>

      <div className="kv-stagger kv-animate-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        {filteredSubjects.map((subject) => (
          <div
            key={subject.subject}
            className="card kv-card-hover kv-animate-in"
            onClick={() => setSelectedSubject(selectedSubject?.subject === subject.subject ? null : subject)}
            style={{
              padding: '20px',
              cursor: 'pointer',
              border: `1px solid ${selectedSubject?.subject === subject.subject ? subject.color : 'var(--border-default)'}`,
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(event) => {
              event.currentTarget.style.borderColor = subject.color;
              event.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(event) => {
              if (selectedSubject?.subject !== subject.subject) {
                event.currentTarget.style.borderColor = 'var(--border-default)';
              }
              event.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{ flexShrink: 0 }}>
                <SubjectRadar subject={subject} />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '4px', marginBottom: '6px' }}>
                  <h3
                    style={{
                      fontSize: '15px',
                      fontWeight: 'var(--kv-mastery-subject-weight)',
                      color: 'var(--kv-mastery-subject-color)',
                      textTransform: 'capitalize',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {subject.subject}
                  </h3>
                  <span style={{ fontSize: '16px', flexShrink: 0 }}>{getMasteryEmoji(subject.mastery)}</span>
                </div>

                <div style={{ marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                    <span style={{ color: subject.color, fontWeight: 700 }}>{subject.label}</span>
                    <span style={{ color: 'var(--kv-mastery-status-color)', fontSize: 'var(--kv-mastery-status-size)' }}>{subject.mastery}/100</span>
                  </div>

                  <div style={{ height: '6px', background: 'var(--border-default)', borderRadius: '3px' }}>
                    <div
                      style={{
                        height: '100%',
                        borderRadius: '3px',
                        background: subject.color,
                        width: `${subject.mastery}%`,
                        transition: 'width 0.6s ease',
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {[
                    { label: '📝', value: subject.noteScore, max: 20, title: 'Notes' },
                    { label: '🃏', value: Math.round(subject.flashcardScore), max: 25, title: 'Flashcards' },
                    { label: '🧠', value: Math.round(subject.feynmanScore), max: 25, title: 'Feynman' },
                    { label: '🍁', value: Math.round(subject.curriculumScore), max: 20, title: 'Curriculum' },
                    { label: '🎯', value: Math.round(subject.examScore), max: 10, title: 'Exams' },
                  ].map((score) => (
                    <div
                      key={score.label}
                      title={`${score.title}: ${score.value}/${score.max}`}
                      style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: score.value > 0 ? `${subject.color}20` : 'var(--bg-elevated)',
                        fontSize: '10px',
                        fontWeight: 600,
                        color: score.value > 0 ? subject.color : 'var(--text-muted)',
                      }}
                    >
                      {score.label} {score.value}/{score.max}
                    </div>
                  ))}
                </div>

                {subject.topics.length > 0 ? (
                  <div
                    style={{
                      marginTop: '8px',
                      fontSize: '11px',
                      color: 'var(--kv-text-muted)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {subject.topics.slice(0, 3).join(' · ')}
                    {subject.topics.length > 3 ? ` +${subject.topics.length - 3} more` : ''}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>

      {subjects.some((subject) => subject.mastery < 60) ? (
        <div
          className="card"
          style={{
            padding: '20px',
            background: 'var(--glow-blue)',
            border: '1px solid rgba(91,127,255,0.2)',
          }}
        >
          <h3 className="kv-heading-section" style={{ marginBottom: '12px' }}>📈 Focus here next</h3>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {subjects
              .filter((subject) => subject.mastery < 60)
              .slice(0, 4)
              .map((subject) => (
                <div
                  key={subject.subject}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'var(--bg-elevated)',
                    border: `1px solid ${subject.color}40`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <span style={{ fontSize: '16px' }}>{getMasteryEmoji(subject.mastery)}</span>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--kv-mastery-subject-color)', textTransform: 'capitalize' }}>{subject.subject}</div>
                    <div style={{ fontSize: '11px', color: subject.color }}>
                      {subject.mastery}/100 - {subject.label}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
