'use client';

import { useEffect, useMemo, useState } from 'react';

import { trackNovaEvent } from '@/lib/novaClient';
import { formatTorontoDate } from '~/lib/toronto-time';

type PlannerView = 'form' | 'loading' | 'plan';

type ExamOption = {
  id?: string;
  subject: string;
  date: string;
  notes: string;
  selected: boolean;
  kind?: 'exam' | 'mock';
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

function getMonday(): string {
  const date = new Date();
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  return date.toISOString().split('T')[0] ?? '';
}

const ONTARIO_COURSE = /^[A-Z]{3,4}\d[A-Z]$/i;

function courseChip(value: string) {
  const token = value.trim();
  if (!ONTARIO_COURSE.test(token)) return null;
  return <span className="kv-chip kv-chip-course">{token}</span>;
}

function formatExamDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return formatTorontoDate(date);
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
    void Promise.all([
      fetch('/api/exams')
        .then((response) => response.json())
        .then((data: { exams?: Array<{ id: string; subject: string; examDate: string; topics?: string | null }> }) => {
          const list = data.exams ?? [];
          const now = Date.now();
          return list
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
              kind: 'exam' as const,
            }))
            .slice(0, 7);
        })
        .catch(() => [] as ExamOption[]),
      fetch('/api/mock-exam')
        .then((response) => response.json())
        .then(
          (data: {
            exams?: Array<{
              id: string;
              title: string;
              subject: string;
              curriculumCode?: string | null;
              createdAt: string;
              attempts?: Array<{ score: number }>;
            }>;
          }) => {
            const list = data.exams ?? [];
            return list.slice(0, 5).map((mock) => {
              const last = mock.attempts?.[0];
              const code = mock.curriculumCode?.trim();
              return {
                id: `mock-${mock.id}`,
                subject: code ? `${code} · Mock` : `Mock · ${mock.subject || mock.title}`,
                date: formatExamDate(mock.createdAt),
                notes: last
                  ? `Last score ${Math.round(last.score)}% — retake or review misses`
                  : 'Practice mock on your schedule',
                selected: true,
                kind: 'mock' as const,
              };
            });
          },
        )
        .catch(() => [] as ExamOption[]),
    ]).then(([realExams, mocks]) => {
      const upcoming = [...realExams, ...mocks].slice(0, 10);
      setUpcomingExams(upcoming);
      setExams(upcoming);
      if (upcoming.length > 0) {
        const uniqueSubjects = Array.from(new Set(upcoming.map((exam) => exam.subject))).slice(0, 6);
        if (uniqueSubjects.length > 0) setSubjects(uniqueSubjects);
      }
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
      <main className="kv-page" style={{ padding: '24px 16px 100px' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <div className="kv-crumb">Kyvex / <b>AI Planner</b></div>
          <h1 className="kv-title" style={{ marginTop: 14 }}>AI Planner</h1>
          <p className="kv-sub" style={{ marginTop: 10 }}>Nova is building your week from your subjects and hours.</p>
        </div>
      </main>
    );
  }

  if (view === 'plan' && plan) {
    const days = plan.days ?? [];
    const selected = days[selectedDay] ?? days[0];

    return (
      <main className="kv-page" style={{ padding: '24px 16px 100px' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div className="kv-crumb">Kyvex / <b>AI Planner</b></div>
            <h1 className="kv-title" style={{ marginTop: 14 }}>Weekly plan</h1>
            <p className="kv-sub" style={{ marginTop: 10 }}>{plan.weekSummary}</p>
            {planId ? <p className="kv-meta" style={{ marginTop: 8 }}>Saved</p> : null}
          </div>
          <button type="button" onClick={() => setView('form')} className="kv-btn-ghost">
            Regenerate
          </button>
        </div>

        <p className="kv-sub" style={{ marginTop: 20 }}>{plan.strategyReasoning}</p>

        <div className="kv-tabs" style={{ marginTop: 22, overflowX: 'auto' }}>
          {days.map((day, index) => {
            const totalMins = (day.blocks ?? []).reduce((sum, block) => sum + block.duration, 0);
            const active = selectedDay === index;
            return (
              <button
                key={`${day.day}-${index}`}
                type="button"
                onClick={() => setSelectedDay(index)}
                className={active ? 'kv-tab on' : 'kv-tab'}
              >
                {DAY_LABELS[index] ?? day.day.slice(0, 3)}
                <span className="num" style={{ marginLeft: 8 }}>{Math.round(totalMins / 60)}h</span>
              </button>
            );
          })}
        </div>

        {selected ? (
          <div style={{ marginTop: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <h2 className="kv-title" style={{ fontSize: 22 }}>{selected.day}</h2>
                {selected.date ? <p className="kv-meta" style={{ marginTop: 6 }}>{formatTorontoDate(selected.date)}</p> : null}
                <p className="kv-sub" style={{ marginTop: 8 }}>{selected.theme}. {selected.motivationalNote}</p>
              </div>
              <span className="kv-meta num">
                {Math.round(((selected.blocks ?? []).reduce((sum, block) => sum + block.duration, 0) / 60) * 10) / 10}h
              </span>
            </div>

            {(selected.blocks ?? []).map((block, index) => (
              <div key={`${block.subject}-${block.topic}-${index}`} className="kv-row">
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="kv-row-title">{block.subject} — {block.topic}</div>
                  <div className="kv-row-sub">
                    {courseChip(block.subject)}
                    <span className="kv-chip">{block.technique}</span>
                    <span className="kv-chip">{block.priority}</span>
                  </div>
                  {block.techniqueReason ? (
                    <p className="kv-meta" style={{ marginTop: 6, textTransform: 'none', letterSpacing: 0 }}>{block.techniqueReason}</p>
                  ) : null}
                </div>
                <span className="kv-row-side num">{block.duration} min</span>
              </div>
            ))}
          </div>
        ) : null}

        {plan.tips?.length ? (
          <div style={{ marginTop: 32 }}>
            <p className="kv-meta">Tips</p>
            <ul style={{ margin: '10px 0 0', paddingLeft: 18 }}>
              {plan.tips.map((tip, index) => (
                <li key={`${tip}-${index}`} className="kv-sub" style={{ marginTop: 6 }}>{tip}</li>
              ))}
            </ul>
          </div>
        ) : null}
        </div>
      </main>
    );
  }

  return (
    <main className="kv-page" style={{ padding: '24px 16px 100px' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div className="kv-crumb">Kyvex / <b>AI Planner</b></div>
      <h1 className="kv-title" style={{ marginTop: 14 }}>AI Planner</h1>
      <p className="kv-sub" style={{ marginTop: 10 }}>
        Tell Nova what you&apos;re studying and she&apos;ll build a week using interleaving and spaced repetition.
      </p>

      {savedPlans.length > 0 ? (
        <div style={{ marginTop: 28 }}>
          <p className="kv-meta">Saved plans <span className="num">{savedPlans.length}</span></p>
          {savedPlans.slice(0, 3).map((saved) => (
            <button
              key={saved.id}
              type="button"
              className="kv-row"
              style={{ width: '100%', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
              onClick={() => {
                setPlan(saved.plan);
                setPlanId(saved.id);
                setSelectedDay(0);
                setView('plan');
              }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="kv-row-title">Week of {formatTorontoDate(saved.weekStart)}</div>
                <div className="kv-row-sub">
                  {saved.subjects.slice(0, 4).map((subject) => (
                    courseChip(subject) ?? <span key={subject} className="kv-chip">{subject}</span>
                  ))}
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : null}
      <p className="kv-meta" style={{ marginTop: 28 }}>Subjects this week</p>
      <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
          {subjects.map((subject, index) => (
            <div key={index} style={{ display: 'flex', gap: 8 }}>
              <input
                className="kv-field"
                placeholder={`Subject ${index + 1}`}
                value={subject}
                onChange={(event) => updateSubject(index, event.target.value)}
                style={{ flex: 1 }}
              />
              {subjects.length > 1 ? (
                <button type="button" onClick={() => removeSubject(index)} className="kv-btn-danger">
                  Remove
                </button>
              ) : null}
            </div>
          ))}
      </div>
      <button type="button" onClick={addSubject} className="kv-btn-ghost" style={{ marginTop: 10 }}>
        Add subject
      </button>

      {upcomingExams.length > 0 ? (
        <div style={{ marginTop: 28 }}>
          <p className="kv-meta">Upcoming exams</p>
          {exams.map((exam, index) => (
            <button
              key={`${exam.subject}-${exam.date}-${index}`}
              type="button"
              className="kv-row"
              style={{
                width: '100%',
                background: 'transparent',
                cursor: 'pointer',
                textAlign: 'left',
                boxShadow: exam.selected ? 'inset 2px 0 0 var(--kv-accent)' : undefined,
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
                aria-label={`Include ${exam.subject}`}
              />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="kv-row-title">{exam.subject}</div>
                <div className="kv-row-sub">
                  {courseChip(exam.subject)}
                </div>
              </div>
              <span className="kv-row-side">{formatExamDate(exam.date)}</span>
            </button>
          ))}
        </div>
      ) : null}

      <p className="kv-meta" style={{ marginTop: 28 }}>Hours per day</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, marginTop: 12 }}>
        {DAYS.map((day, index) => (
          <div key={day}>
            <div className="kv-meta" style={{ marginBottom: 6 }}>{DAY_LABELS[index]}</div>
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
              className="kv-field num"
              style={{ textAlign: 'center' }}
            />
          </div>
        ))}
      </div>
      <p className="kv-meta num" style={{ marginTop: 10 }}>{totalWeeklyHours}h this week</p>

      <p className="kv-meta" style={{ marginTop: 28 }}>Study style</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
        {[
          { value: 'deep', label: 'Deep focus', desc: 'Fewer subjects, longer blocks' },
          { value: 'mixed', label: 'Mixed', desc: 'Balanced interleaving' },
          { value: 'light', label: 'Light review', desc: 'Short, frequent sessions' },
        ].map((style) => (
          <button
            key={style.value}
            type="button"
            onClick={() => setStudyStyle(style.value as 'deep' | 'mixed' | 'light')}
            className={studyStyle === style.value ? 'kv-btn-ghost on' : 'kv-btn-ghost'}
            style={{ flexDirection: 'column', alignItems: 'flex-start', minWidth: 140 }}
          >
            <span>{style.label}</span>
            <span className="kv-meta" style={{ textTransform: 'none', letterSpacing: 0 }}>{style.desc}</span>
          </button>
        ))}
      </div>

      <p className="kv-meta" style={{ marginTop: 28 }}>Weak areas</p>
      <textarea
        className="kv-field"
        rows={3}
        placeholder="Optional: topics that need extra practice"
        value={weakAreas}
        onChange={(event) => setWeakAreas(event.target.value)}
        style={{ marginTop: 12 }}
      />

      {error ? <p className="kv-meta" style={{ marginTop: 16, color: '#E5484D' }}>{error}</p> : null}

      <button type="button" onClick={() => void handleGenerate()} className="kv-btn" style={{ marginTop: 24 }}>
        Generate my weekly plan
      </button>
      </div>
    </main>
  );
}


