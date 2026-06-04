'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { SendToPanel } from '~/app/_components/send-to-panel';

type SmartUploadResult = {
  title?: string;
  notes?: string;
  flashcards?: Array<{ question?: string; answer?: string }>;
  quiz?: Array<{ question?: string; options?: string[]; answer?: string; explanation?: string }>;
  summary?: string;
  keyTerms?: string[];
  noteId?: string;
  deckId?: string;
  counts?: { flashcards?: number; quizQuestions?: number };
};

const STAGES = [
  'Reading your file...',
  'Extracting content...',
  'Generating notes...',
  'Creating flashcards...',
  'Building quiz...',
  'Done! ✅',
] as const;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result || '');
      resolve(value.split(',')[1] || '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function SmartUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [subject, setSubject] = useState('');
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);
  const [result, setResult] = useState<SmartUploadResult | null>(null);
  const [error, setError] = useState('');

  const [quizChoice, setQuizChoice] = useState('');
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  const firstQuiz = result?.quiz?.[0];
  const quizCorrect = quizSubmitted && firstQuiz ? quizChoice === firstQuiz.answer : false;

  const notesPreview = useMemo(() => (result?.notes || '').slice(0, 200), [result?.notes]);

  async function runStages() {
    setStageIndex(0);
    await delay(500);
    setStageIndex(1);
    await delay(1000);
    setStageIndex(2);
    await delay(1000);
    setStageIndex(3);
    await delay(1000);
    setStageIndex(4);
    await delay(500);
  }

  async function generateEverything() {
    if (!file) return;
    setLoading(true);
    setError('');
    setResult(null);
    setQuizChoice('');
    setQuizSubmitted(false);

    try {
      const [fileBase64] = await Promise.all([fileToBase64(file), runStages()]);
      const res = await fetch('/api/smart-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileBase64,
          mediaType: file.type,
          fileName: file.name,
          subject,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as SmartUploadResult & { error?: string };
      if (!res.ok) {
        setError(data.error ?? 'SmartUpload failed');
        return;
      }
      setStageIndex(5);
      setResult(data);
    } catch {
      setError('SmartUpload failed');
    } finally {
      setLoading(false);
    }
  }

  function onDropFile(nextFile: File | null) {
    if (!nextFile) return;
    const isPdf = nextFile.type === 'application/pdf';
    const isImage = nextFile.type.startsWith('image/');
    if (!isPdf && !isImage) {
      setError('Only PDF or image files are supported');
      return;
    }
    setError('');
    setFile(nextFile);
  }

  return (
    <main className="kv-page">
      <section className="kv-section">
        <h1 className="kv-title">SmartUpload ⚡</h1>
        <p className="kv-subtitle">Upload anything. Get notes + flashcards + quiz instantly.</p>

        <div
          className="kv-card mt-5"
          style={{
            border: dragging ? '2px dashed var(--accent-blue)' : '2px dashed var(--border-default)',
            minHeight: 220,
            display: 'grid',
            placeItems: 'center',
            textAlign: 'center',
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            onDropFile(e.dataTransfer.files?.[0] ?? null);
          }}
        >
          <div>
            <p className="mb-2 text-lg font-semibold">Drop PDF or image here</p>
            <p className="mb-3 text-sm text-[var(--text-muted)]">📄 PDF · 🖼️ Image · ✍️ Handwriting</p>
            <input
              type="file"
              accept="application/pdf,image/*"
              onChange={(e) => onDropFile(e.target.files?.[0] ?? null)}
              className="kv-input"
            />
            {file && <p className="mt-2 text-sm text-[var(--text-secondary)]">Selected: {file.name}</p>}
          </div>
        </div>

        <div className="kv-card mt-4">
          <input
            className="kv-input mb-3"
            placeholder="Subject (optional)"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
          <button className="kv-btn-primary" disabled={!file || loading} onClick={() => void generateEverything()}>
            {loading ? STAGES[stageIndex] : 'Generate Everything'}
          </button>
          {loading && <p className="mt-2 text-sm text-[var(--text-muted)]">{STAGES[stageIndex]}</p>}
          {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
        </div>

        {result && (
          <>
            <section className="kv-grid-3 mt-5" style={{ alignItems: 'start' }}>
              <article className="kv-card-gold">
                <h3 className="mb-2 text-lg font-bold">📝 Study Notes</h3>
                <p className="mb-2 font-semibold">{result.title || 'Generated notes'}</p>
                <p className="mb-2 text-sm text-[var(--text-secondary)]">{notesPreview}{(result.notes || '').length > 200 ? '...' : ''}</p>
                <span className="kv-badge kv-badge-gold">{result.counts?.flashcards || result.flashcards?.length || 0} cards</span>
                <div className="mt-3">
                  <Link href="/my-notes" className="kv-btn-secondary">Open Notes →</Link>
                </div>
              </article>

              <article className="kv-card-teal">
                <h3 className="mb-2 text-lg font-bold">🃏 Flashcard Deck</h3>
                <p className="mb-2 text-sm">{result.counts?.flashcards || result.flashcards?.length || 0} cards created</p>
                <div className="mb-3 space-y-2 text-sm">
                  {(result.flashcards || []).slice(0, 2).map((item, index) => (
                    <div key={`fc-${index}`} className="kv-card-sm">
                      <p><strong>Q:</strong> {item.question}</p>
                      <p><strong>A:</strong> {item.answer}</p>
                    </div>
                  ))}
                </div>
                {result.deckId ? (
                  <Link href={`/flashcards/${result.deckId}/study`} className="kv-btn-secondary">Study Now →</Link>
                ) : (
                  <button className="kv-btn-secondary" disabled>Study Now →</button>
                )}
              </article>

              <article className="kv-card">
                <h3 className="mb-2 text-lg font-bold">🧠 Practice Quiz</h3>
                <p className="mb-2 text-sm">{result.counts?.quizQuestions || result.quiz?.length || 0} questions</p>
                {firstQuiz ? (
                  <div>
                    <p className="mb-2 text-sm font-semibold">{firstQuiz.question}</p>
                    <div className="space-y-2">
                      {(firstQuiz.options || []).map((option) => (
                        <button
                          key={option}
                          type="button"
                          className={`kv-tab w-full text-left ${quizChoice === option ? 'active' : ''}`}
                          onClick={() => setQuizChoice(option)}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                    <button
                      className="kv-btn-primary mt-3"
                      disabled={!quizChoice || quizSubmitted}
                      onClick={() => setQuizSubmitted(true)}
                    >
                      Submit Answer
                    </button>
                    {quizSubmitted && (
                      <p className="mt-2 text-sm">
                        Score: {quizCorrect ? '1/1 ✅' : '0/1'}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-[var(--text-muted)]">No quiz generated.</p>
                )}
                <button className="kv-btn-secondary mt-3">Full Quiz →</button>
              </article>
            </section>

            <div className="mt-4 flex flex-wrap gap-2">
              {(result.keyTerms || []).map((term) => (
                <span key={term} className="kv-badge kv-badge-blue">{term}</span>
              ))}
            </div>

            <div className="kv-card-elevated mt-4 italic">{result.summary}</div>

            <div className="mt-4">
              <SendToPanel
                contentType="note"
                contentId={result.noteId}
                title={result.title || 'Generated notes'}
                content={result.notes || result.summary || ''}
              />
            </div>
          </>
        )}
      </section>
    </main>
  );
}
