'use client';

import { useEffect, useMemo, useState } from 'react';

type LessonItem = {
  number: number;
  title: string;
  duration: string;
  content: string;
  keyPoint: string;
  quickCheck: string;
  quickAnswer: string;
};

type LessonSet = {
  id: string;
  topic: string;
  subject: string;
  lessons: LessonItem[];
  totalLessons: number;
  createdAt: string;
};

type ViewMode = 'generate' | 'player';

export default function MicroLessonsPage() {
  const [view, setView] = useState<ViewMode>('generate');
  const [topic, setTopic] = useState('');
  const [subject, setSubject] = useState('');
  const [sourceText, setSourceText] = useState('');
  const [showSource, setShowSource] = useState(false);

  const [lessonSets, setLessonSets] = useState<LessonSet[]>([]);
  const [activeSet, setActiveSet] = useState<LessonSet | null>(null);
  const [lessonIndex, setLessonIndex] = useState(0);
  const [revealAnswer, setRevealAnswer] = useState(false);

  const [loading, setLoading] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [error, setError] = useState('');

  const currentLesson = activeSet?.lessons[lessonIndex] ?? null;
  const done = !!activeSet && lessonIndex >= activeSet.lessons.length;

  const progressPct = useMemo(() => {
    if (!activeSet) return 0;
    return Math.min(100, Math.round((lessonIndex / activeSet.lessons.length) * 100));
  }, [activeSet, lessonIndex]);

  const loadHistory = async () => {
    try {
      const response = await fetch('/api/micro-lessons');
      const data = (await response.json()) as { lessons?: Array<Omit<LessonSet, 'lessons'> & { lessons: unknown }>; error?: string };
      if (!response.ok) {
        setError(data.error ?? 'Failed to load lesson sets');
        return;
      }
      const parsed = (data.lessons ?? []).map((entry) => ({
        ...entry,
        lessons: Array.isArray(entry.lessons) ? (entry.lessons as LessonItem[]) : [],
      }));
      setLessonSets(parsed);
    } catch {
      setError('Network error while loading lesson sets');
    }
  };

  useEffect(() => {
    void loadHistory();
  }, []);

  const generateLessons = async () => {
    if (!topic.trim() || !subject.trim()) {
      setError('Please enter both topic and subject.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/micro-lessons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim(), subject: subject.trim(), sourceText: sourceText.trim() }),
      });
      const data = (await response.json()) as { lesson?: LessonSet; lessons?: LessonItem[]; error?: string };
      if (!response.ok || !data.lesson) {
        setError(data.error ?? 'Could not generate lessons');
        return;
      }

      const normalized: LessonSet = {
        ...data.lesson,
        lessons: data.lessons ?? data.lesson.lessons ?? [],
      };
      setActiveSet(normalized);
      setLessonIndex(0);
      setRevealAnswer(false);
      setView('player');
      await loadHistory();
    } catch {
      setError('Network error while generating lessons');
    } finally {
      setLoading(false);
    }
  };

  const openSet = (setItem: LessonSet) => {
    setActiveSet(setItem);
    setLessonIndex(0);
    setRevealAnswer(false);
    setView('player');
  };

  const saveAsNotes = async () => {
    if (!activeSet) return;
    setSavingNotes(true);
    setError('');
    const content = activeSet.lessons
      .map((lesson) => `# ${lesson.number}. ${lesson.title}\n\n${lesson.content}\n\nKey Point: ${lesson.keyPoint}`)
      .join('\n\n');

    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Micro-lessons: ${activeSet.topic}`,
          content,
          format: 'summary',
          tags: [activeSet.subject, 'micro-lessons'],
        }),
      });
      if (!response.ok) {
        setError('Failed to save notes');
      }
    } catch {
      setError('Network error while saving notes');
    } finally {
      setSavingNotes(false);
    }
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-black">Micro-Lessons ⚡</h1>
        <p className="mt-2 text-[var(--text-secondary)]">Any topic. 6 lessons. 5 minutes each.</p>
      </header>

      {error && <div className="kv-card mb-4 border-[var(--accent-red)] p-3 text-sm text-[var(--accent-red)]">{error}</div>}

      {view === 'generate' && (
        <div className="space-y-4">
          <section className="kv-card p-5">
            <div className="kv-grid-2 mb-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-[var(--text-secondary)]">Topic</label>
                <input className="kv-input" value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="e.g. Cellular Respiration" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-[var(--text-secondary)]">Subject</label>
                <input className="kv-input" value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="e.g. Biology" />
              </div>
            </div>

            <button className="kv-btn-secondary mb-3" onClick={() => setShowSource((prev) => !prev)}>
              {showSource ? 'Hide source text' : 'Add optional source text'}
            </button>

            {showSource && (
              <textarea
                className="kv-textarea mb-4"
                rows={5}
                value={sourceText}
                onChange={(event) => setSourceText(event.target.value)}
                placeholder="Paste supporting text (optional)"
              />
            )}

            <button className="kv-btn-primary" disabled={loading} onClick={() => void generateLessons()}>
              {loading ? 'Breaking down into bite-sized lessons...' : 'Generate 6 Lessons'}
            </button>
          </section>

          <section className="kv-card p-5">
            <h2 className="mb-3 text-xl font-bold">Past Lesson Sets</h2>
            {lessonSets.length === 0 && <p className="text-sm text-[var(--text-secondary)]">No sets yet.</p>}
            <div className="space-y-2">
              {lessonSets.map((setItem) => (
                <button
                  key={setItem.id}
                  className="kv-card-elevated block w-full rounded-xl p-3 text-left"
                  onClick={() => openSet(setItem)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">{setItem.topic}</p>
                      <p className="text-sm text-[var(--text-secondary)]">{setItem.subject}</p>
                    </div>
                    <span className="text-xs text-[var(--text-secondary)]">{new Date(setItem.createdAt).toLocaleDateString()}</span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      {view === 'player' && activeSet && (
        <div className="space-y-4">
          <section className="kv-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-semibold">Lesson progress: {Math.min(lessonIndex + 1, activeSet.lessons.length)} / {activeSet.lessons.length}</p>
              <button className="kv-btn-secondary" onClick={() => setView('generate')}>Back</button>
            </div>
            <div className="mb-3 flex gap-2">
              {activeSet.lessons.map((item, idx) => (
                <span key={item.number} className="h-2 w-2 rounded-full" style={{ background: idx <= lessonIndex ? 'var(--accent-gold)' : 'var(--bg-elevated)' }} />
              ))}
            </div>
            <div className="kv-progress-track">
              <div className="kv-progress-fill" style={{ width: `${progressPct}%` }} />
            </div>
          </section>

          {!done && currentLesson && (
            <section className="kv-card kv-card-gold p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-2xl font-black">{currentLesson.number}. {currentLesson.title}</h2>
                <span className="kv-card-elevated rounded-full px-3 py-1 text-sm">⏱ 5 min</span>
              </div>

              <p className="whitespace-pre-wrap text-lg leading-[1.8]">{currentLesson.content}</p>

              <div className="kv-card kv-card-teal mt-5 p-4">
                <strong>💡 Remember:</strong> {currentLesson.keyPoint}
              </div>

              <div className="kv-card-elevated mt-4 rounded-xl p-4">
                <p className="mb-2 font-semibold">Quick Check</p>
                <p className="mb-3">{currentLesson.quickCheck}</p>
                <button className="kv-btn-secondary" onClick={() => setRevealAnswer((prev) => !prev)}>
                  {revealAnswer ? 'Hide Answer' : 'Reveal Answer'}
                </button>
                {revealAnswer && <p className="mt-3 italic text-[var(--text-secondary)]">{currentLesson.quickAnswer}</p>}
              </div>

              <button
                className="kv-btn-primary mt-5"
                onClick={() => {
                  setLessonIndex((prev) => prev + 1);
                  setRevealAnswer(false);
                }}
              >
                Next Lesson →
              </button>
            </section>
          )}

          {done && (
            <section className="kv-card kv-card-gold p-6">
              <h2 className="text-3xl font-black">🎉 Micro-course complete!</h2>
              <p className="mt-2 text-[var(--text-secondary)]">Here are your 6 key points:</p>
              <ul className="mt-4 space-y-2">
                {activeSet.lessons.map((lesson) => (
                  <li key={lesson.number} className="kv-card-elevated rounded-xl p-3">
                    <strong>{lesson.number}. {lesson.title}:</strong> {lesson.keyPoint}
                  </li>
                ))}
              </ul>
              <button className="kv-btn-primary mt-5" disabled={savingNotes} onClick={() => void saveAsNotes()}>
                {savingNotes ? 'Saving...' : 'Save as Notes'}
              </button>
            </section>
          )}
        </div>
      )}
    </main>
  );
}
