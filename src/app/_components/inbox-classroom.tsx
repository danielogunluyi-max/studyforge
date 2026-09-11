'use client';

import Link from 'next/link';
import { useState } from 'react';

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

export function InboxClassroom() {
  const [courseName, setCourseName] = useState('');
  const [type, setType] = useState('Assignment');
  const [assignmentText, setAssignmentText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);

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

  return (
    <div style={{ padding: '18px 0 24px' }}>
      <p className="kv-meta">Classroom</p>
      <p className="kv-sub" style={{ marginTop: 8 }}>Paste any assignment from Google Classroom, Canvas, or any LMS.</p>

      <section style={{ marginTop: 18 }}>
        <p className="kv-meta">Step 1</p>
        <ol style={{ margin: '10px 0 0', paddingLeft: 18, lineHeight: 1.9, color: 'var(--kv-text-secondary)' }}>
          <li>Open your assignment in Google Classroom or Canvas</li>
          <li>Select all text (Ctrl+A)</li>
          <li>Copy (Ctrl+C)</li>
          <li>Paste below</li>
        </ol>
        <div className="kv-row-sub" style={{ marginTop: 12 }}>
          <span className="kv-chip">Google Classroom</span>
          <span className="kv-chip">Canvas</span>
        </div>
      </section>

      <section style={{ marginTop: 22 }}>
        <p className="kv-meta" style={{ marginBottom: 12 }}>Step 2</p>
        <div style={{ display: 'grid', gap: 12 }}>
          <div>
            <label className="kv-meta" htmlFor="classroom-course" style={{ display: 'block', marginBottom: 8 }}>Course name</label>
            <input
              id="classroom-course"
              className="kv-field"
              value={courseName}
              onChange={(event) => setCourseName(event.target.value)}
              placeholder="Course name"
            />
          </div>
          <div>
            <label className="kv-meta" htmlFor="classroom-type" style={{ display: 'block', marginBottom: 8 }}>Type</label>
            <select id="classroom-type" className="kv-field" value={type} onChange={(event) => setType(event.target.value)} style={{ appearance: 'none', cursor: 'pointer' }}>
              {TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="kv-meta" htmlFor="classroom-text" style={{ display: 'block', marginBottom: 8 }}>Assignment text</label>
            <textarea
              id="classroom-text"
              className="kv-field"
              value={assignmentText}
              onChange={(event) => setAssignmentText(event.target.value)}
              placeholder="Paste assignment text, rubric, instructions, lecture notes, or reading material here..."
              style={{ minHeight: 250, resize: 'vertical' }}
            />
          </div>
          <button
            type="button"
            className="kv-btn"
            onClick={() => void handleImport()}
            disabled={loading}
          >
            {loading ? 'Importing...' : 'Import & Generate Study Materials'}
          </button>
        </div>
      </section>

      {error ? (
        <p role="alert" style={{ marginTop: 16, color: 'var(--kv-text-primary)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span className="kv-chip kv-chip-stale">Error</span>
          {error}
        </p>
      ) : null}

      {result ? (
        <>
          <p style={{ marginTop: 16, color: 'var(--kv-accent-text)' }}>
            Created note + flashcard deck automatically.
          </p>

          <div className="kv-row-sub" style={{ marginTop: 12 }}>
            <span className="kv-chip">Difficulty: {result.difficulty}</span>
            {result.keyDeadlines.map((deadline) => (
              <span key={deadline} className="kv-chip">{deadline}</span>
            ))}
          </div>

          <Link href={result.noteId ? `/my-notes?note=${encodeURIComponent(result.noteId)}` : '/my-notes'} className="kv-row">
            <div>
              <div className="kv-row-title">Note saved</div>
              <div className="kv-row-sub">
                <span className="kv-chip">Notes</span>
              </div>
            </div>
            <span className="kv-row-side">Open →</span>
          </Link>

          <Link href={`/flashcards/${result.deckId}`} className="kv-row">
            <div>
              <div className="kv-row-title">{result.cardCount} cards created</div>
              <div className="kv-row-sub">
                <span className="kv-chip">Flashcards</span>
              </div>
            </div>
            <span className="kv-row-side num">Open →</span>
          </Link>

          <p className="kv-meta" style={{ marginTop: 22 }}>Study plan</p>
          {result.studyPlan.map((item) => (
            <div key={`${item.day}-${item.task}`} className="kv-row">
              <div>
                <div className="kv-row-title">Day {item.day}</div>
                <p className="kv-sub" style={{ marginTop: 6 }}>{item.task}</p>
              </div>
              <span className="kv-row-side">{item.duration}</span>
            </div>
          ))}
        </>
      ) : null}
    </div>
  );
}
