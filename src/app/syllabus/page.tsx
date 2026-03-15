'use client';

import { useState } from 'react';

type KeyDate = { event: string; week: number; type: string };
type WeekPlan = { week: number; focus: string; tasks: string[]; hours: number };
type Unit = {
  name: string;
  weeks: string;
  topics: string[];
  assessments: string[];
  studyHours: number;
  difficulty: 'low' | 'medium' | 'high';
};

type SyllabusResult = {
  id?: string;
  units: Unit[];
  keyDates: KeyDate[];
  weeklyPlan: WeekPlan[];
  totalStudyHours: number;
  recommendation: string;
};

type ActiveTab = 'units' | 'weekly' | 'dates' | 'summary';

const DIFFICULTY_COLORS: Record<string, string> = {
  low: '#10b981',
  medium: '#f0b429',
  high: '#ef4444',
};

function difficultyBar(d: string, hours: number, maxHours: number) {
  const pct = maxHours > 0 ? Math.round((hours / maxHours) * 100) : 0;
  return { pct, color: DIFFICULTY_COLORS[d] ?? '#5b7fff' };
}

export default function SyllabusPage() {
  const [courseName, setCourseName] = useState('');
  const [semester, setSemester] = useState('');
  const [syllabusText, setSyllabusText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SyllabusResult | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('units');
  const [error, setError] = useState('');
  const [calendarMsg, setCalendarMsg] = useState('');

  async function scan() {
    if (!courseName.trim() || !syllabusText.trim()) {
      setError('Please enter a course name and paste your syllabus.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const r = await fetch('/api/syllabus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseName, semester, syllabusText }),
      });
      const data = (await r.json().catch(() => null)) as (SyllabusResult & { error?: string }) | null;
      if (data?.units) {
        setResult(data as SyllabusResult);
        setActiveTab('units');
      } else {
        setError(data?.error ?? 'Analysis failed');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  async function addToCalendar(event: KeyDate) {
    try {
      await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: event.event,
          description: `${courseName} — Week ${event.week}`,
          type: event.type,
        }),
      });
      setCalendarMsg(`Added "${event.event}" to calendar!`);
      setTimeout(() => setCalendarMsg(''), 3000);
    } catch {
      setCalendarMsg('Failed to add to calendar');
    }
  }

  const maxHours = result ? Math.max(...(result.units.map((u) => u.studyHours) ?? [1])) : 1;

  const TABS: Array<{ key: ActiveTab; label: string }> = [
    { key: 'units', label: '📚 Units' },
    { key: 'weekly', label: '📅 Weekly Plan' },
    { key: 'dates', label: '📌 Key Dates' },
    { key: 'summary', label: '📊 Summary' },
  ];

  return (
    <div style={{ padding: '32px', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: '6px' }}>
          📄 AI Syllabus Scanner
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          Paste your syllabus and get a full semester study plan in seconds.
        </p>
      </div>

      {/* Form */}
      {!result && (
        <div className="kv-card" style={{ marginBottom: '28px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div>
              <label className="kv-label">Course Name *</label>
              <input className="kv-input" value={courseName} onChange={(e) => setCourseName(e.target.value)} placeholder="e.g. BIOL 201" />
            </div>
            <div>
              <label className="kv-label">Semester</label>
              <input className="kv-input" value={semester} onChange={(e) => setSemester(e.target.value)} placeholder="e.g. Spring 2026" />
            </div>
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label className="kv-label">Syllabus Text *</label>
            <textarea
              className="kv-input"
              rows={10}
              value={syllabusText}
              onChange={(e) => setSyllabusText(e.target.value)}
              placeholder="Paste your full syllabus here..."
              style={{ resize: 'vertical' }}
            />
          </div>
          {error && <p style={{ color: '#ef4444', fontSize: '13px', marginBottom: '12px' }}>{error}</p>}
          <button className="kv-btn-primary" onClick={() => void scan()} disabled={loading}>
            {loading ? '⚙️ Building your semester plan...' : '📄 Scan Syllabus'}
          </button>
        </div>
      )}

      {result && (
        <>
          {/* Reset button */}
          <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button className="kv-btn-secondary" onClick={() => setResult(null)}>← Scan Another</button>
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{courseName}</span>
            {semester && <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{semester}</span>}
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', flexWrap: 'wrap' }}>
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '99px',
                  border: `1px solid ${activeTab === tab.key ? 'var(--accent-gold)' : 'var(--border-default)'}`,
                  background: activeTab === tab.key ? 'rgba(240,180,41,0.12)' : 'var(--bg-elevated)',
                  color: activeTab === tab.key ? '#f0b429' : 'var(--text-secondary)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Units tab */}
          {activeTab === 'units' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {result.units.map((unit, i) => {
                const bar = difficultyBar(unit.difficulty, unit.studyHours, maxHours);
                return (
                  <div key={i} className="kv-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px', gap: '8px', flexWrap: 'wrap' }}>
                      <div>
                        <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '2px' }}>{unit.name}</h3>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Weeks {unit.weeks}</p>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <span
                          style={{
                            padding: '3px 10px',
                            borderRadius: '99px',
                            background: `${DIFFICULTY_COLORS[unit.difficulty] ?? '#5b7fff'}15`,
                            color: DIFFICULTY_COLORS[unit.difficulty] ?? '#5b7fff',
                            fontSize: '11px',
                            fontWeight: 700,
                            textTransform: 'capitalize',
                          }}
                        >
                          {unit.difficulty}
                        </span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>~{unit.studyHours}h</span>
                      </div>
                    </div>

                    {unit.topics.length > 0 && (
                      <div style={{ marginBottom: '10px' }}>
                        <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>Topics</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                          {unit.topics.map((t) => (
                            <span key={t} style={{ padding: '3px 8px', borderRadius: '6px', background: 'var(--bg-elevated)', fontSize: '12px', color: 'var(--text-secondary)' }}>{t}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {unit.assessments.length > 0 && (
                      <div style={{ marginBottom: '10px' }}>
                        <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>Assessments</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                          {unit.assessments.map((a) => (
                            <span key={a} style={{ padding: '3px 8px', borderRadius: '6px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: '12px', fontWeight: 600 }}>{a}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="kv-progress-track">
                      <div className="kv-progress-fill" style={{ width: `${bar.pct}%`, background: bar.color, transition: 'width 0.6s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Weekly Plan tab */}
          {activeTab === 'weekly' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {result.weeklyPlan.map((week) => {
                const hasExam = result.keyDates.some((d) => d.week === week.week && d.type === 'exam');
                const borderCol = hasExam ? '#ef4444' : week.hours >= 6 ? '#f97316' : 'var(--border-default)';
                return (
                  <div key={week.week} className="kv-card" style={{ borderLeft: `3px solid ${borderCol}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>Week {week.week}</span>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        {hasExam && (
                          <span style={{ padding: '2px 8px', borderRadius: '99px', background: 'rgba(239,68,68,0.12)', color: '#ef4444', fontSize: '10px', fontWeight: 700 }}>
                            EXAM
                          </span>
                        )}
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>~{week.hours}h</span>
                      </div>
                    </div>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>{week.focus}</p>
                    {week.tasks.length > 0 && (
                      <ul style={{ margin: 0, padding: '0 0 0 16px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        {week.tasks.map((task, i) => (
                          <li key={i} style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{task}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Key Dates tab */}
          {activeTab === 'dates' && (
            <div>
              {calendarMsg && (
                <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(16,185,129,0.1)', color: '#10b981', fontSize: '13px', marginBottom: '14px' }}>
                  {calendarMsg}
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {result.keyDates.map((d, i) => {
                  const typeColor = d.type === 'exam' ? '#ef4444' : d.type === 'assignment' ? '#f97316' : '#5b7fff';
                  return (
                    <div key={i} className="kv-card" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div
                        style={{
                          width: '44px',
                          height: '44px',
                          minWidth: '44px',
                          borderRadius: '10px',
                          background: `${typeColor}15`,
                          border: `1px solid ${typeColor}40`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          fontWeight: 900,
                          color: typeColor,
                          textAlign: 'center',
                          lineHeight: 1.1,
                        }}
                      >
                        Wk{d.week}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>{d.event}</p>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '99px',
                            background: `${typeColor}12`,
                            color: typeColor,
                            fontSize: '10px',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                          }}
                        >
                          {d.type}
                        </span>
                      </div>
                      <button
                        className="kv-btn-secondary"
                        style={{ fontSize: '12px', padding: '6px 12px', flexShrink: 0 }}
                        onClick={() => void addToCalendar(d)}
                      >
                        + Calendar
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Summary tab */}
          {activeTab === 'summary' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                <div className="kv-card" style={{ textAlign: 'center', padding: '20px' }}>
                  <div style={{ fontSize: '28px', fontWeight: 900, color: '#f0b429', marginBottom: '4px' }}>{result.totalStudyHours}h</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total Study Hours</div>
                </div>
                <div className="kv-card" style={{ textAlign: 'center', padding: '20px' }}>
                  <div style={{ fontSize: '28px', fontWeight: 900, color: '#2dd4bf', marginBottom: '4px' }}>{result.units.length}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Units</div>
                </div>
                <div className="kv-card" style={{ textAlign: 'center', padding: '20px' }}>
                  <div style={{ fontSize: '28px', fontWeight: 900, color: '#ef4444', marginBottom: '4px' }}>{result.keyDates.filter((d) => d.type === 'exam').length}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Exams</div>
                </div>
              </div>

              {/* Difficulty curve */}
              <div className="kv-card">
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '14px' }}>📈 Difficulty Curve</h3>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end', height: '80px' }}>
                  {result.units.map((unit, i) => {
                    const bar = difficultyBar(unit.difficulty, unit.studyHours, maxHours);
                    return (
                      <div
                        key={i}
                        title={`${unit.name}: ${unit.studyHours}h (${unit.difficulty})`}
                        style={{
                          flex: 1,
                          height: `${bar.pct}%`,
                          minHeight: '8px',
                          borderRadius: '4px 4px 0 0',
                          background: bar.color,
                          opacity: 0.85,
                          transition: 'all 0.4s ease',
                          cursor: 'default',
                        }}
                      />
                    );
                  })}
                </div>
                <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                  {result.units.map((_, i) => (
                    <div key={i} style={{ flex: 1, fontSize: '9px', color: 'var(--text-muted)', textAlign: 'center' }}>U{i + 1}</div>
                  ))}
                </div>
              </div>

              {result.recommendation && (
                <div className="kv-card-gold">
                  <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#f0b429', marginBottom: '8px' }}>💡 Recommendation</h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{result.recommendation}</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
