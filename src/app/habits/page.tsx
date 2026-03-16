'use client';

import { useEffect, useMemo, useState } from 'react';
import LoadingButton from '@/app/_components/loading-button';
import Skeleton from '@/app/_components/skeleton';
import EmptyState from '@/app/_components/empty-state';

type Habit = {
  id: string;
  name: string;
  emoji: string;
  streak: number;
  bestStreak: number;
  color: string;
  active: boolean;
};

type HabitEntry = {
  id: string;
  habitName: string;
  completed: boolean;
  date: string;
};

const EMOJIS = ['✅', '📚', '🏃', '🧠', '💧', '🛌'];
const COLORS = ['#f0b429', '#2dd4bf', '#4f8ef7', '#818cf8', '#f472b6', '#10b981'];

function toDayKey(value: Date | string) {
  const d = new Date(value);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [entries, setEntries] = useState<HabitEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState(EMOJIS[0]!);
  const [color, setColor] = useState(COLORS[0]!);

  async function load() {
    try {
      const res = await fetch('/api/habits');
      const data = (await res.json()) as { habits?: Habit[]; todayEntries?: HabitEntry[] };
      if (res.ok) {
        setHabits(data.habits || []);
        setEntries(data.todayEntries || []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function addHabit() {
    if (!name.trim()) return;
    const res = await fetch('/api/habits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, emoji, color }),
    });
    if (res.ok) {
      setName('');
      await load();
    }
  }

  const todayKey = toDayKey(new Date());

  function isCompleted(habit: Habit) {
    return entries.some((e) => e.habitName === habit.name && e.completed && toDayKey(e.date) === todayKey);
  }

  async function toggleHabit(habit: Habit, completed: boolean) {
    const snapshot = entries;
    const existing = entries.find((e) => e.habitName === habit.name && toDayKey(e.date) === todayKey);

    if (existing) {
      setEntries((prev) => prev.map((e) => (e.id === existing.id ? { ...e, completed } : e)));
    } else {
      setEntries((prev) => [
        ...prev,
        { id: `tmp-${Date.now()}`, habitName: habit.name, completed, date: new Date().toISOString() },
      ]);
    }

    try {
      const res = await fetch('/api/habits/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ habitId: habit.id, completed }),
      });
      if (!res.ok) setEntries(snapshot);
      if (res.ok && completed) {
        setHabits((prev) => prev.map((h) => (h.id === habit.id ? { ...h, streak: h.streak + 1 } : h)));
      }
    } catch {
      setEntries(snapshot);
    }
  }

  const leaderboard = useMemo(() => [...habits].sort((a, b) => b.streak - a.streak), [habits]);

  const days = useMemo(() => {
    return Array.from({ length: 7 }).map((_, idx) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - idx));
      return d;
    });
  }, []);

  return (
    <main className="kv-page kv-animate-in">
      <h1 className="kv-page-title">Habit Tracker</h1>
      <p className="kv-page-subtitle">Build consistency with daily check-ins and streak momentum.</p>

      <section className="kv-card" style={{ marginBottom: 16 }}>
        <label className="kv-label" htmlFor="habit-name">Habit Name</label>
        <div style={{ display: 'grid', gap: 10 }}>
          <input
            id="habit-name"
            className="kv-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Review flashcards"
          />

          <div>
            <p className="kv-label">Emoji</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {EMOJIS.map((item) => (
                <button key={item} className={emoji === item ? 'kv-btn-primary' : 'kv-btn-secondary'} onClick={() => setEmoji(item)}>
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="kv-label">Color</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {COLORS.map((item) => (
                <button
                  key={item}
                  className={color === item ? 'kv-btn-primary' : 'kv-btn-secondary'}
                  onClick={() => setColor(item)}
                  style={{ borderColor: item }}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <button className="kv-btn-primary" onClick={() => void addHabit()} disabled={!name.trim()}>
            Add Habit
          </button>
        </div>
      </section>

      {loading && (
        <Skeleton variant="card" count={3} />
      )}

      {!loading && habits.length === 0 && (
        <EmptyState icon="📝" title="Add your first habit" description="Start with one tiny daily action" action={{label: 'Add habit', onClick: () => setName('Exercise')}}/>
      )}

      {!loading && habits.length > 0 && (
        <>
          <section className="kv-grid-3" style={{ marginBottom: 16 }}>
            {habits.map((habit) => {
              const completed = isCompleted(habit);
              return (
                <article
                  key={habit.id}
                  className={`${completed ? 'kv-bounce-in' : ''} kv-animate-in`}
                  style={{
                    borderColor: completed ? 'var(--accent-gold)' : undefined,
                    boxShadow: completed ? '0 0 0 1px rgba(240,180,41,0.35) inset' : undefined,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ margin: 0, fontSize: 28 }}>{habit.emoji}</p>
                    {completed && <span className="kv-badge kv-badge-gold">✓ Done</span>}
                  </div>
                  <p style={{ margin: '6px 0', fontWeight: 700 }}>{habit.name}</p>
                  <p style={{ margin: '0 0 10px', color: 'var(--text-secondary)' }}>
                    {habit.streak} day streak {habit.streak > 2 ? '🔥' : ''}
                  </p>
                  <button
                    className={completed ? 'kv-btn-primary' : 'kv-btn-secondary'}
                    onClick={() => void toggleHabit(habit, !completed)}
                  >
                    {completed ? 'Completed' : 'Mark Complete'}
                  </button>
                </article>
              );
            })}
          </section>

          <section className="kv-card" style={{ marginBottom: 16 }}>
            <h2 className="kv-section-title">Streak Leaderboard</h2>
            <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
              {leaderboard.map((habit, index) => (
                <div key={habit.id} className="kv-card-sm" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p style={{ margin: 0, fontWeight: 700 }}>
                    #{index + 1} {habit.emoji} {habit.name}
                  </p>
                  <span className="kv-badge kv-badge-gold">{habit.streak}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="kv-card">
            <h2 className="kv-section-title">Weekly Grid</h2>
            <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
              {habits.map((habit) => (
                <div key={`week-${habit.id}`} className="kv-card-sm" style={{ padding: 12 }}>
                  <p style={{ margin: '0 0 8px', fontWeight: 700 }}>{habit.emoji} {habit.name}</p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {days.map((day) => {
                      const dayKey = toDayKey(day);
                      const filled = entries.some((e) => e.habitName === habit.name && e.completed && toDayKey(e.date) === dayKey);
                      return (
                        <div
                          key={`${habit.id}-${dayKey}`}
                          title={day.toLocaleDateString()}
                          style={{
                            width: 14,
                            height: 14,
                            borderRadius: '999px',
                            border: '1px solid var(--border-default)',
                            background: filled ? 'var(--accent-gold)' : 'transparent',
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
