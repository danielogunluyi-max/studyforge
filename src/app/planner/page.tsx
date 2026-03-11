'use client';

import { useEffect, useMemo, useState } from 'react';

import { trackNovaEvent } from '@/lib/novaClient';

type PlannerView = 'form' | 'loading' | 'plan';

type ExamOption = {
  id?: string;
  subject: string;
  date: string;
  notes: string;
  selected: boolean;
};

type HoursPerDay = {
  mon: number;
  tue: number;
  wed: number;
  thu: number;
  fri: number;
  sat: number;
  sun: number;
};

type PlanBlock = {
  subject: string;
  topic: string;
  duration: number;
  technique:
    | 'Active Recall'
    | 'Flashcards'
    | 'Practice Test'
    | 'Note Review'
    | 'Concept Map'
    | 'Problem Sets'
    | 'Essay Practice';
  techniqueReason: string;
  priority: 'High' | 'Medium' | 'Low';
};

type PlanDay = {
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  date: string;
  totalHours: number;
  theme: string;
  motivationalNote: string;
  blocks: PlanBlock[];
};

type GeneratedPlan = {
  weekSummary: string;
  strategyReasoning: string;
  days: PlanDay[];
  tips: string[];
};

type SavedStudyPlan = {
  id: string;
  weekStart: string;
  subjects: string[];
  plan: GeneratedPlan;
  createdAt: string;
};

const DAYS: Array<keyof HoursPerDay> = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const TECHNIQUE_COLORS: Record<PlanBlock['technique'], string> = {
  'Active Recall': 'var(--accent-blue)',
  Flashcards: 'var(--accent-purple)',
  'Practice Test': 'var(--accent-orange)',
  'Note Review': 'var(--accent-green)',
  'Concept Map': 'var(--accent-blue)',
  'Problem Sets': 'var(--accent-red)',
  'Essay Practice': 'var(--accent-purple)',
};

const PRIORITY_COLORS: Record<PlanBlock['priority'], string> = {
  High: 'var(--accent-red)',
  Medium: 'var(--accent-orange)',
  Low: 'var(--accent-green)',
};

function getMonday(): string {
  const date = new Date();
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  return date.toISOString().split('T')[0] ?? '';
}

function formatExamDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

export default function PlannerPage() {
  const [view, setView] = useState<PlannerView>('form');
  const [plan, setPlan] = useState<GeneratedPlan | null>(null);
  const [planId, setPlanId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [selectedDay, setSelectedDay] = useState(0);

  const [subjects, setSubjects] = useState<string[]>(['']);
  const [exams, setExams] = useState<ExamOption[]>([]);
  const [upcomingExams, setUpcomingExams] = useState<ExamOption[]>([]);
  const [hoursPerDay, setHoursPerDay] = useState<HoursPerDay>({
    mon: 2,
    tue: 2,
    wed: 2,
    thu: 2,
    fri: 2,
    sat: 3,
    sun: 3,
  });
  const [weakAreas, setWeakAreas] = useState('');
  const [studyStyle, setStudyStyle] = useState<'deep' | 'mixed' | 'light'>('mixed');
  const [weekStart] = useState(getMonday());
  const [savedPlans, setSavedPlans] = useState<SavedStudyPlan[]>([]);

  useEffect(() => {
    void fetch('/api/exams')
      .then((response) => response.json())
      .then((data: { exams?: Array<{ id: string; subject: string; examDate: string; topics?: string | null }> }) => {
        const list = data.exams ?? [];
        const now = Date.now();
        const upcoming = list
          .filter((exam) => {
            const examTime = new Date(exam.examDate).getTime();
            return Number.isFinite(examTime) && examTime > now;
          })
          .map((exam) => ({
            id: exam.id,
            subject: exam.subject,
            date: formatExamDate(exam.examDate),
            notes: exam.topics ?? '',
            selected: true,
          }))
          .slice(0, 7);

        setUpcomingExams(upcoming);
        setExams(upcoming);

        if (upcoming.length > 0) {
          const uniqueSubjects = Array.from(new Set(upcoming.map((exam) => exam.subject))).slice(0, 6);
          if (uniqueSubjects.length > 0) setSubjects(uniqueSubjects);
        }
      })
      .catch(() => {
        setUpcomingExams([]);
      });

    void fetch('/api/planner')
      .then((response) => response.json())
      .then((data: { plans?: SavedStudyPlan[] }) => {
        setSavedPlans(data.plans ?? []);
      })
      .catch(() => {
        setSavedPlans([]);
      });
  }, []);

  const addSubject = () => setSubjects((current) => [...current, '']);
  const removeSubject = (index: number) => setSubjects((current) => current.filter((_, idx) => idx !== index));
  const updateSubject = (index: number, value: string) =>
    setSubjects((current) => current.map((subject, idx) => (idx === index ? value : subject)));

  const totalWeeklyHours = useMemo(
    () => Object.values(hoursPerDay).reduce((total, value) => total + value, 0),
    [hoursPerDay],
  );

  const handleGenerate = async () => {
    const validSubjects = subjects.map((subject) => subject.trim()).filter(Boolean);
    if (validSubjects.length === 0) {
      setError('Add at least one subject.');
      return;
    }

    setError('');
    setView('loading');

    try {
      const response = await fetch('/api/planner/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjects: validSubjects,
          exams: exams.filter((exam) => exam.selected),
          hoursPerDay,
          weakAreas,
          studyStyle,
          weekStart,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        plan?: GeneratedPlan;
        planId?: string;
      };

      if (!response.ok || !data.plan || data.error) {
        throw new Error(data.error ?? 'Failed to generate plan');
      }

      setPlan(data.plan);
      setPlanId(data.planId ?? null);
      setSelectedDay(0);
      setView('plan');
      trackNovaEvent('NOTE_GENERATED');

      void fetch('/api/planner')
        .then((result) => result.json())
        .then((payload: { plans?: SavedStudyPlan[] }) => {
          setSavedPlans(payload.plans ?? []);
        })
        .catch(() => {});
    } catch {
      setError('Failed to generate plan. Try again.');
      setView('form');
    }
  };

  if (view === 'loading') {
    return (
      <>
        <div
          style={{
            padding: '32px',
            maxWidth: '800px',
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            gap: '20px',
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
            }}
          >
            📅
          </div>
          <div style={{ textAlign: 'center' }}>
            <h2
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: 'var(--text-primary)',
                marginBottom: '8px',
              }}
            >
              Nova is building your week...
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
              Applying interleaving and spaced repetition to your schedule
            </p>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {[0, 1, 2].map((index) => (
              <div
                key={index}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: 'var(--accent-blue)',
                  animation: `planner-bounce 1.2s ${index * 0.2}s infinite`,
                }}
              />
            ))}
          </div>
        </div>
        <style jsx global>{`
          @keyframes planner-bounce {
            0%, 80%, 100% { transform: translateY(0); opacity: 0.55; }
            40% { transform: translateY(-6px); opacity: 1; }
          }
        `}</style>
      </>
    );
  }

  if (view === 'plan' && plan) {
    const days = plan.days ?? [];
    const selected = days[selectedDay] ?? days[0];

    return (
      <div style={{ padding: '32px', maxWidth: '1000px', margin: '0 auto' }} className="animate-fade-in-up">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1
              style={{
                fontSize: '26px',
                fontWeight: 800,
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em',
                marginBottom: '6px',
              }}
            >
              📅 Your Weekly Study Plan
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '560px', lineHeight: 1.6 }}>
              {plan.weekSummary}
            </p>
            {planId ? (
              <span className="badge badge-green" style={{ marginTop: '10px' }}>
                Saved automatically
              </span>
            ) : null}
          </div>
          <button onClick={() => setView('form')} className="btn btn-ghost btn-sm">
            🔄 Regenerate
          </button>
        </div>

        <div className="card" style={{ padding: '16px 20px', marginBottom: '20px', background: 'var(--glow-blue)', border: '1px solid rgba(91,127,255,0.2)' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            <strong style={{ color: 'var(--accent-blue)' }}>🧠 Strategy: </strong>
            {plan.strategyReasoning}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '4px' }}>
          {days.map((day, index) => {
            const totalMins = (day.blocks ?? []).reduce((sum, block) => sum + block.duration, 0);
            const active = selectedDay === index;
            return (
              <button
                key={`${day.day}-${index}`}
                onClick={() => setSelectedDay(index)}
                style={{
                  padding: '10px 16px',
                  borderRadius: '12px',
                  border: `1px solid ${active ? 'var(--accent-blue)' : 'var(--border-default)'}`,
                  background: active ? 'var(--accent-blue)' : 'var(--bg-elevated)',
                  color: active ? 'white' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'all 0.15s ease',
                  textAlign: 'center',
                  minWidth: '72px',
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: 700 }}>{DAY_LABELS[index] ?? day.day.slice(0, 3)}</div>
                <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '2px' }}>{Math.round(totalMins / 60)}h</div>
              </button>
            );
          })}
        </div>

        {selected ? (
          <div className="card" style={{ padding: '24px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  {selected.day}
                  <span className="badge badge-blue" style={{ marginLeft: '10px', fontSize: '11px' }}>
                    {selected.theme}
                  </span>
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>💬 {selected.motivationalNote}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--accent-blue)' }}>
                  {Math.round(((selected.blocks ?? []).reduce((sum, block) => sum + block.duration, 0) / 60) * 10) / 10}h
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>total study</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {(selected.blocks ?? []).map((block, index) => (
                <div
                  key={`${block.subject}-${block.topic}-${index}`}
                  style={{
                    display: 'flex',
                    gap: '14px',
                    alignItems: 'flex-start',
                    padding: '14px',
                    background: 'var(--bg-elevated)',
                    borderRadius: '10px',
                    border: '1px solid var(--border-default)',
                    borderLeft: `3px solid ${TECHNIQUE_COLORS[block.technique]}`,
                  }}
                >
                  <div style={{ minWidth: '44px', textAlign: 'center', paddingTop: '2px' }}>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>{block.duration}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>min</div>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '4px' }}>
                      <div>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{block.subject}</span>
                        <span style={{ fontSize: '13px', color: 'var(--text-secondary)', marginLeft: '6px' }}>— {block.topic}</span>
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: PRIORITY_COLORS[block.priority], flexShrink: 0 }}>
                        {block.priority}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '20px',
                          fontSize: '11px',
                          fontWeight: 600,
                          background: `${TECHNIQUE_COLORS[block.technique]}20`,
                          color: TECHNIQUE_COLORS[block.technique],
                          border: `1px solid ${TECHNIQUE_COLORS[block.technique]}30`,
                        }}
                      >
                        {block.technique}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        {block.techniqueReason}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {plan.tips?.length ? (
          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>
              💡 Nova's tips for your week
            </h3>
            <ul style={{ margin: 0, paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {plan.tips.map((tip, index) => (
                <li key={`${tip}-${index}`} style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div style={{ padding: '32px', maxWidth: '800px', margin: '0 auto' }} className="animate-fade-in-up">
      <div style={{ marginBottom: '28px' }}>
        <h1
          style={{
            fontSize: '26px',
            fontWeight: 800,
            color: 'var(--text-primary)',
            letterSpacing: '-0.02em',
            marginBottom: '6px',
          }}
        >
          📅 AI Study Planner
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.6 }}>
          Tell Nova what you&apos;re studying and she&apos;ll build a personalized week using interleaving and spaced repetition.
        </p>
      </div>

      {savedPlans.length > 0 ? (
        <div className="card" style={{ padding: '20px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Recent saved plans
            </label>
            <span className="badge badge-blue">{savedPlans.length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {savedPlans.slice(0, 3).map((saved) => (
              <button
                key={saved.id}
                type="button"
                className="btn btn-ghost"
                style={{ justifyContent: 'space-between' }}
                onClick={() => {
                  setPlan(saved.plan);
                  setPlanId(saved.id);
                  setSelectedDay(0);
                  setView('plan');
                }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  Week of {new Date(saved.weekStart).toLocaleDateString()} • {saved.subjects.join(', ')}
                </span>
                <span className="badge badge-green">Open</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="card" style={{ padding: '24px', marginBottom: '16px' }}>
        <label
          style={{
            fontSize: '13px',
            fontWeight: 700,
            color: 'var(--text-secondary)',
            display: 'block',
            marginBottom: '12px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          📚 Subjects to study this week
        </label>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
          {subjects.map((subject, index) => (
            <div key={index} style={{ display: 'flex', gap: '8px' }}>
              <input
                className="input"
                placeholder={`Subject ${index + 1} e.g. "Grade 11 Chemistry"`}
                value={subject}
                onChange={(event) => updateSubject(index, event.target.value)}
                style={{ flex: 1 }}
              />
              {subjects.length > 1 ? (
                <button onClick={() => removeSubject(index)} className="btn btn-ghost btn-sm" style={{ color: 'var(--accent-red)', flexShrink: 0 }}>
                  ✕
                </button>
              ) : null}
            </div>
          ))}
        </div>

        <button onClick={addSubject} className="btn btn-ghost btn-sm">
          + Add subject
        </button>
      </div>

      {upcomingExams.length > 0 ? (
        <div className="card" style={{ padding: '24px', marginBottom: '16px' }}>
          <label
            style={{
              fontSize: '13px',
              fontWeight: 700,
              color: 'var(--text-secondary)',
              display: 'block',
              marginBottom: '12px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            🎯 Upcoming exams (from your dashboard)
          </label>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {exams.map((exam, index) => (
              <div
                key={`${exam.subject}-${exam.date}-${index}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 14px',
                  background: exam.selected ? 'var(--glow-blue)' : 'var(--bg-elevated)',
                  border: `1px solid ${exam.selected ? 'rgba(91,127,255,0.3)' : 'var(--border-default)'}`,
                  borderRadius: '10px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onClick={() =>
                  setExams((current) =>
                    current.map((value, idx) => (idx === index ? { ...value, selected: !value.selected } : value)),
                  )
                }
              >
                <input
                  type="checkbox"
                  checked={exam.selected}
                  onChange={() => {}}
                  style={{ accentColor: 'var(--accent-blue)', width: 16, height: 16, flexShrink: 0 }}
                />
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{exam.subject}</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '8px' }}>{exam.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="card" style={{ padding: '24px', marginBottom: '16px' }}>
        <label
          style={{
            fontSize: '13px',
            fontWeight: 700,
            color: 'var(--text-secondary)',
            display: 'block',
            marginBottom: '12px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          ⏰ Available study hours per day
        </label>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
          {DAYS.map((day, index) => (
            <div key={day} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>{DAY_LABELS[index]}</div>
              <input
                type="number"
                min="0"
                max="12"
                step="0.5"
                value={hoursPerDay[day]}
                onChange={(event) =>
                  setHoursPerDay((current) => ({
                    ...current,
                    [day]: Math.max(0, Math.min(12, Number(event.target.value) || 0)),
                  }))
                }
                className="input"
                style={{ textAlign: 'center', padding: '8px 4px', fontSize: '16px', fontWeight: 700 }}
              />
            </div>
          ))}
        </div>

        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '10px', textAlign: 'center' }}>
          Total: {totalWeeklyHours}h available this week
        </p>
      </div>

      <div className="card" style={{ padding: '24px', marginBottom: '16px' }}>
        <label
          style={{
            fontSize: '13px',
            fontWeight: 700,
            color: 'var(--text-secondary)',
            display: 'block',
            marginBottom: '12px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          🎨 Study style
        </label>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {[
            { value: 'deep', label: 'Deep Focus', desc: 'Fewer subjects, longer blocks', emoji: '🎯' },
            { value: 'mixed', label: 'Mixed', desc: 'Balanced interleaving', emoji: '⚖️' },
            { value: 'light', label: 'Light Review', desc: 'Short, frequent sessions', emoji: '🌿' },
          ].map((style) => (
            <div
              key={style.value}
              onClick={() => setStudyStyle(style.value as 'deep' | 'mixed' | 'light')}
              style={{
                flex: 1,
                minWidth: '140px',
                padding: '14px',
                borderRadius: '12px',
                cursor: 'pointer',
                border: `1px solid ${studyStyle === style.value ? 'var(--accent-blue)' : 'var(--border-default)'}`,
                background: studyStyle === style.value ? 'var(--glow-blue)' : 'var(--bg-elevated)',
                transition: 'all 0.15s ease',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '24px', marginBottom: '6px' }}>{style.emoji}</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: studyStyle === style.value ? 'var(--accent-blue)' : 'var(--text-primary)', marginBottom: '4px' }}>
                {style.label}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{style.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
        <label
          style={{
            fontSize: '13px',
            fontWeight: 700,
            color: 'var(--text-secondary)',
            display: 'block',
            marginBottom: '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          ⚠️ Weak areas / extra focus (optional)
        </label>

        <textarea
          className="textarea"
          rows={3}
          placeholder='e.g. "I struggle with integration by parts and organic chemistry reactions. Need more practice with essay writing."'
          value={weakAreas}
          onChange={(event) => setWeakAreas(event.target.value)}
        />
      </div>

      {error ? (
        <div
          style={{
            padding: '10px 14px',
            marginBottom: '16px',
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: '10px',
            fontSize: '13px',
            color: 'var(--accent-red)',
          }}
        >
          {error}
        </div>
      ) : null}

      <button onClick={handleGenerate} className="btn btn-primary btn-lg" style={{ width: '100%' }}>
        📅 Generate my weekly plan →
      </button>
    </div>
  );
}
