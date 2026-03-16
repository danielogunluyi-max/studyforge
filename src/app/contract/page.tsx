'use client';

import { useEffect, useMemo, useState } from 'react';
import LoadingButton from '@/app/_components/loading-button';
import Skeleton from '@/app/_components/skeleton';
import EmptyState from '@/app/_components/empty-state';

type CheckIn = {
  id: string;
  hoursStudied: number;
  notes: string | null;
  mood: number;
  aiResponse: string;
  createdAt: string;
};

type StudyContract = {
  id: string;
  commitment: string;
  dailyHours: number;
  durationDays: number;
  currentStreak: number;
  totalDays: number;
  startDate?: string;
  endDate: string;
  createdAt: string;
  checkIns: CheckIn[];
};

const HOUR_OPTIONS = [1, 1.5, 2, 3];
const DURATION_OPTIONS = [
  { label: '1 week', days: 7 },
  { label: '2 weeks', days: 14 },
  { label: '1 month', days: 30 },
];
const CHECKIN_HOURS = [0, 0.5, 1, 1.5, 2, 2.5, 3];
const MOODS = ['😞', '😕', '😐', '🙂', '😄'];

export default function ContractPage() {
  const [contracts, setContracts] = useState<StudyContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [commitment, setCommitment] = useState('');
  const [dailyHours, setDailyHours] = useState(2);
  const [durationDays, setDurationDays] = useState(14);
  const [creating, setCreating] = useState(false);

  const [hoursStudied, setHoursStudied] = useState(1);
  const [mood, setMood] = useState(4);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [latestAiResponse, setLatestAiResponse] = useState('');

  const activeContract = useMemo(() => contracts[0] ?? null, [contracts]);

  const refreshContracts = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/contract');
      const data = (await response.json()) as { contracts?: StudyContract[]; error?: string };
      if (!response.ok) {
        setError(data.error ?? 'Could not load contract');
      } else {
        setContracts(data.contracts ?? []);
      }
    } catch {
      setError('Network error while loading contract');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshContracts();
  }, []);

  const onCreateContract = async () => {
    if (!commitment.trim()) return;
    setCreating(true);
    setError('');
    try {
      const response = await fetch('/api/contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commitment: commitment.trim(), dailyHours, durationDays }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? 'Failed to create contract');
      } else {
        setCommitment('');
        setLatestAiResponse('');
        await refreshContracts();
      }
    } catch {
      setError('Network error while creating contract');
    } finally {
      setCreating(false);
    }
  };

  const onSubmitCheckIn = async () => {
    if (!activeContract) return;
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch('/api/contract/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractId: activeContract.id,
          hoursStudied,
          mood,
          notes: notes.trim(),
        }),
      });
      const data = (await response.json()) as { aiResponse?: string; error?: string };
      if (!response.ok) {
        setError(data.error ?? 'Failed to submit check-in');
      } else {
        setLatestAiResponse(data.aiResponse ?? 'Great work. Keep going.');
        setNotes('');
        await refreshContracts();
      }
    } catch {
      setError('Network error while submitting check-in');
    } finally {
      setSubmitting(false);
    }
  };

  const progressPct = activeContract
    ? Math.min(100, Math.round((activeContract.totalDays / activeContract.durationDays) * 100))
    : 0;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 kv-animate-in">
      <header className="mb-6">
        <h1 className="text-3xl font-black text-[var(--text-primary)]">Study Contract 📜</h1>
        <p className="mt-2 text-[var(--text-secondary)]">Make a commitment. Let AI hold you to it.</p>
      </header>

      {error && (
        <div className="kv-card kv-animate-in mb-4 border-[var(--accent-red)] p-3 text-sm text-[var(--accent-red)]">
          {error}
        </div>
      )}

      {loading ? (
        <Skeleton variant="card" count={2} />
      ) : !activeContract ? (
        <section className="kv-card kv-card-gold mx-auto w-full max-w-[500px] p-6">
          <label className="mb-2 block text-sm font-semibold text-[var(--text-secondary)]">I commit to...</label>
          <textarea
            className="kv-textarea mb-4"
            rows={4}
            placeholder="I will study 2 hours every day for the next 2 weeks, focusing on Grade 11 Functions and Chemistry"
            value={commitment}
            onChange={(event) => setCommitment(event.target.value)}
          />

          <div className="mb-4">
            <p className="mb-2 text-sm font-semibold text-[var(--text-secondary)]">Daily hours goal</p>
            <div className="flex flex-wrap gap-2">
              {HOUR_OPTIONS.map((option) => (
                <button
                  key={option}
                  className={dailyHours === option ? 'kv-btn-primary' : 'kv-btn-secondary'}
                  onClick={() => setDailyHours(option)}
                >
                  {option} hours
                </button>
              ))}
            </div>
          </div>

          <div className="mb-5">
            <p className="mb-2 text-sm font-semibold text-[var(--text-secondary)]">Duration</p>
            <div className="flex flex-wrap gap-2">
              {DURATION_OPTIONS.map((option) => (
                <button
                  key={option.days}
                  className={durationDays === option.days ? 'kv-btn-primary' : 'kv-btn-secondary'}
                  onClick={() => setDurationDays(option.days)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <button className="kv-btn-primary w-full" disabled={creating || !commitment.trim()} onClick={() => void onCreateContract()}>
            {creating ? 'Signing...' : 'Sign My Contract ✍️'}
          </button>
          <p className="mt-3 text-center text-sm text-[var(--text-secondary)]">AI will check in with you daily</p>
        </section>
      ) : (
        <div className="space-y-4">
          <section className="kv-card kv-card-gold p-5">
            <p className="mb-3 text-xl italic text-[var(--text-primary)]">"{activeContract.commitment}"</p>
            <div className="mb-2 flex items-center justify-between text-sm text-[var(--text-secondary)]">
              <span>
                {activeContract.totalDays} / {activeContract.durationDays} days completed
              </span>
              <span>🔥 {activeContract.currentStreak} days</span>
            </div>
            <div className="kv-progress-track mb-3">
              <div className="kv-progress-fill" style={{ width: `${progressPct}%` }} />
            </div>
            <p className="text-sm text-[var(--text-secondary)]">
              {new Date(activeContract.createdAt).toLocaleDateString()} → {new Date(activeContract.endDate).toLocaleDateString()}
            </p>
          </section>

          <section className="kv-card p-5">
            <h2 className="mb-4 text-xl font-bold">Today's Check-in</h2>

            <p className="mb-2 text-sm font-semibold text-[var(--text-secondary)]">Hours studied</p>
            <div className="mb-4 flex flex-wrap gap-2">
              {CHECKIN_HOURS.map((option) => (
                <button
                  key={option}
                  className={hoursStudied === option ? 'kv-btn-primary' : 'kv-btn-secondary'}
                  onClick={() => setHoursStudied(option)}
                >
                  {option >= 3 ? '3+' : option}
                </button>
              ))}
            </div>

            <p className="mb-2 text-sm font-semibold text-[var(--text-secondary)]">Mood</p>
            <div className="mb-4 flex gap-2">
              {MOODS.map((icon, idx) => (
                <button
                  key={icon}
                  className={mood === idx + 1 ? 'kv-btn-primary' : 'kv-btn-secondary'}
                  onClick={() => setMood(idx + 1)}
                >
                  {icon}
                </button>
              ))}
            </div>

            <label className="mb-2 block text-sm font-semibold text-[var(--text-secondary)]">Optional notes</label>
            <textarea className="kv-textarea" rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} />

            <button className="kv-btn-primary mt-4" disabled={submitting} onClick={() => void onSubmitCheckIn()}>
              {submitting ? 'Submitting...' : 'Submit Check-in'}
            </button>

            {latestAiResponse && (
              <div className="kv-card kv-card-teal mt-4 p-4 italic text-[var(--text-primary)]">{latestAiResponse}</div>
            )}
          </section>

          <section className="kv-card p-5">
            <h3 className="mb-3 text-lg font-bold">Last 7 Days</h3>
            <div className="space-y-3">
              {activeContract.checkIns.length === 0 && <p className="text-sm text-[var(--text-secondary)]">No check-ins yet.</p>}
              {activeContract.checkIns.map((item) => {
                const metGoal = item.hoursStudied >= activeContract.dailyHours;
                return (
                  <article key={item.id} className="kv-card-elevated flex items-start gap-3 rounded-xl p-3">
                    <span className="mt-1 text-lg" style={{ color: metGoal ? '#10b981' : '#ef4444' }}>
                      ●
                    </span>
                    <div className="flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2 text-sm">
                        <strong>{new Date(item.createdAt).toLocaleDateString()}</strong>
                        <span>{item.hoursStudied}h</span>
                        <span>{metGoal ? 'Met goal' : 'Missed goal'}</span>
                      </div>
                      <p className="text-sm italic text-[var(--text-secondary)]">{item.aiResponse.slice(0, 120)}...</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
