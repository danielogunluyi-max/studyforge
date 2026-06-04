'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

type StudyPlanItem = {
  day: number;
  task: string;
  duration: string;
};

type ImportResult = {
  notes: string;
  flashcards: Array<{ question: string; answer: string }>;
  studyPlan: StudyPlanItem[];
  keyDeadlines: string[];
  difficulty: 'low' | 'medium' | 'high' | string;
  noteId: string;
  deckId: string;
  cardCount: number;
};

const TYPE_OPTIONS = ['Assignment', 'Lecture Notes', 'Syllabus', 'Reading'];

export default function ClassroomImportPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [courseName, setCourseName] = useState('');
  const [type, setType] = useState('Assignment');
  const [assignmentText, setAssignmentText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?from=/classroom-import');
    }
  }, [status, router]);

  const handleImport = async () => {
    if (!courseName.trim() || !assignmentText.trim()) {
      setError('Course name and pasted assignment text are required.');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/classroom-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseName: courseName.trim(),
          assignmentText: assignmentText.trim(),
          type: type.toLowerCase(),
        }),
      });

      const data = (await response.json().catch(() => ({}))) as ImportResult & { error?: string };
      if (!response.ok) {
        setError(data.error ?? 'Import failed');
        return;
      }

      setResult(data);
    } catch {
      setError('Import failed');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <main className="kv-page">
        <div className="kv-card" style={{ padding: 24 }}>Loading importer...</div>
      </main>
    );
  }

  if (!session) return null;

  return (
    <main className="kv-page">
      <h1 className="kv-page-title">Import from Classroom 🎓</h1>
      <p className="kv-page-subtitle">Paste any assignment from Google Classroom, Canvas, or any LMS</p>

      <section className="kv-card" style={{ marginTop: 18 }}>
        <p style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 12 }}>
          Step 1
        </p>
        <ol style={{ margin: 0, paddingLeft: 18, lineHeight: 1.9, color: 'var(--text-secondary)' }}>
          <li>Open your assignment in Google Classroom or Canvas</li>
          <li>Select all text (Ctrl+A)</li>
          <li>Copy (Ctrl+C)</li>
          <li>Paste below</li>
        </ol>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
          <span className="kv-badge kv-badge-teal">Google Classroom</span>
          <span className="kv-badge kv-badge-gold">Canvas</span>
        </div>
      </section>

      <section className="kv-card" style={{ marginTop: 16 }}>
        <p style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 12 }}>
          Step 2
        </p>
        <div style={{ display: 'grid', gap: 12 }}>
          <input
            className="kv-input"
            value={courseName}
            onChange={(event) => setCourseName(event.target.value)}
            placeholder="Course name"
          />
          <select className="kv-input" value={type} onChange={(event) => setType(event.target.value)}>
            {TYPE_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <textarea
            className="kv-textarea"
            value={assignmentText}
            onChange={(event) => setAssignmentText(event.target.value)}
            placeholder="Paste assignment text, rubric, instructions, lecture notes, or reading material here..."
            style={{ minHeight: 250, resize: 'vertical' }}
          />
          <button
            type="button"
            className="kv-btn-primary"
            onClick={() => void handleImport()}
            disabled={loading}
          >
            {loading ? 'Importing...' : 'Import & Generate Study Materials'}
          </button>
        </div>
      </section>

      {error && (
        <section className="kv-card" style={{ marginTop: 16, borderColor: 'rgba(239,68,68,0.35)', color: 'var(--accent-red)' }}>
          {error}
        </section>
      )}

      {result && (
        <>
          <section className="kv-card-teal" style={{ marginTop: 16 }}>
            <strong>✅ Created note + flashcard deck automatically!</strong>
          </section>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12, marginBottom: 12 }}>
            <span className={result.difficulty === 'high' ? 'kv-badge kv-badge-gold' : result.difficulty === 'low' ? 'kv-badge kv-badge-teal' : 'kv-badge'}>
              Difficulty: {result.difficulty}
            </span>
            {result.keyDeadlines.map((deadline) => (
              <span key={deadline} className="kv-badge kv-badge-gold">Deadline: {deadline}</span>
            ))}
          </div>

          <section className="kv-grid-3" style={{ alignItems: 'start' }}>
            <article className="kv-card-teal">
              <p style={{ margin: 0, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
                Notes card
              </p>
              <h2 style={{ marginTop: 10, marginBottom: 8, fontSize: 22, fontWeight: 800 }}>Note saved</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 14 }}>
                Your cleaned notes were saved automatically from this import.
              </p>
              <Link href="/my-notes" className="kv-btn-secondary" style={{ display: 'inline-flex' }}>
                Open My Notes
              </Link>
            </article>

            <article className="kv-card-gold">
              <p style={{ margin: 0, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
                Flashcards card
              </p>
              <h2 style={{ marginTop: 10, marginBottom: 8, fontSize: 22, fontWeight: 800 }}>{result.cardCount} cards created</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 14 }}>
                A flashcard deck was created for quick review and spaced repetition.
              </p>
              <Link href={`/flashcards/${result.deckId}`} className="kv-btn-secondary" style={{ display: 'inline-flex' }}>
                Open Deck
              </Link>
            </article>

            <article className="kv-card">
              <p style={{ margin: 0, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
                Study Plan card
              </p>
              <h2 style={{ marginTop: 10, marginBottom: 10, fontSize: 22, fontWeight: 800 }}>Day-by-day plan</h2>
              <div style={{ display: 'grid', gap: 10 }}>
                {result.studyPlan.map((item) => (
                  <div key={`${item.day}-${item.task}`} style={{ padding: 12, borderRadius: 14, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                    <p style={{ margin: 0, fontWeight: 700 }}>Day {item.day}</p>
                    <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)' }}>{item.task}</p>
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>{item.duration}</p>
                  </div>
                ))}
              </div>
            </article>
          </section>
        </>
      )}
    </main>
  );
}
