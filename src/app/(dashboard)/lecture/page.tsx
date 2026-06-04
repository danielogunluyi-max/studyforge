'use client';

import { useEffect, useRef, useState } from 'react';
import { SendToPanel } from '~/app/_components/send-to-panel';

type LectureHistory = {
  id: string;
  title: string;
  subject: string;
  duration: number;
  createdAt: string;
};

type LectureResult = {
  notes: string;
  flashcards: Array<{ question: string; answer: string }>;
  transcript: string;
};

type LectureState = 'idle' | 'recording' | 'processing' | 'done';
type Tab = 'notes' | 'flashcards' | 'transcript';

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: any) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: any) => void) | null;
  start: () => void;
  stop: () => void;
};

declare global {
  interface Window {
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

export default function LecturePage() {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const timerRef = useRef<number | null>(null);

  const [state, setState] = useState<LectureState>('idle');
  const [activeTab, setActiveTab] = useState<Tab>('notes');
  const [subject, setSubject] = useState('');
  const [title, setTitle] = useState('');

  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const [seconds, setSeconds] = useState(0);

  const [history, setHistory] = useState<LectureHistory[]>([]);
  const [result, setResult] = useState<LectureResult | null>(null);
  const [error, setError] = useState('');
  const [savedNoteId, setSavedNoteId] = useState('');

  const loadHistory = async () => {
    try {
      const response = await fetch('/api/lecture');
      const data = (await response.json()) as { lectures?: LectureHistory[] };
      if (response.ok) setHistory(data.lectures ?? []);
    } catch {
      // ignore history failures
    }
  };

  useEffect(() => {
    void loadHistory();
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      recognitionRef.current?.stop();
    };
  }, []);

  const startTimer = () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startRecording = () => {
    const SpeechApi = window.webkitSpeechRecognition;
    if (!SpeechApi) {
      setError('Web Speech API is not supported in this browser. Use Chrome/Edge.');
      return;
    }

    setError('');
    setTranscript('');
    setInterimTranscript('');
    setResult(null);
    setSavedNoteId('');
    setSeconds(0);

    const recognition = new SpeechApi();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let interim = '';
      let finalChunk = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const piece = event.results[i]?.[0]?.transcript ?? '';
        if (event.results[i].isFinal) finalChunk += `${piece} `;
        else interim += piece;
      }
      if (finalChunk) {
        setTranscript((prev) => `${prev}${finalChunk}`);
      }
      setInterimTranscript(interim);
    };

    recognition.onerror = () => {
      setError('Speech recognition error occurred.');
    };

    recognition.onend = () => {
      if (state === 'recording' && !isPaused) {
        try {
          recognition.start();
        } catch {
          // silence repeated start errors
        }
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setState('recording');
    setIsPaused(false);
    startTimer();
  };

  const togglePause = () => {
    if (!recognitionRef.current) return;
    if (isPaused) {
      recognitionRef.current.start();
      setIsPaused(false);
      startTimer();
    } else {
      recognitionRef.current.stop();
      setIsPaused(true);
      stopTimer();
    }
  };

  const stopAndProcess = async () => {
    recognitionRef.current?.stop();
    stopTimer();

    const fullTranscript = `${transcript} ${interimTranscript}`.trim();
    if (!fullTranscript) {
      setError('No transcript captured yet.');
      setState('idle');
      return;
    }

    setState('processing');
    setError('');

    try {
      const response = await fetch('/api/lecture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: fullTranscript,
          title: title.trim() || 'Live Lecture',
          subject: subject.trim() || 'General',
          duration: seconds,
        }),
      });

      const data = (await response.json()) as {
        notes?: string;
        flashcards?: Array<{ question: string; answer: string }>;
        error?: string;
      };

      if (!response.ok) {
        setError(data.error ?? 'Processing failed');
        setState('idle');
        return;
      }

      setResult({
        notes: data.notes ?? '',
        flashcards: data.flashcards ?? [],
        transcript: fullTranscript,
      });
      setSavedNoteId('');
      setState('done');
      setActiveTab('notes');
      await loadHistory();
    } catch {
      setError('Network error while processing lecture');
      setState('idle');
    }
  };

  const saveNotes = async () => {
    if (!result?.notes) return;
    const response = await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title.trim() || 'Lecture Notes',
        content: result.notes,
        format: 'summary',
        tags: [subject || 'lecture', 'live-transcript'],
      }),
    });

    const data = (await response.json().catch(() => ({}))) as { note?: { id?: string } };
    if (response.ok) {
      setSavedNoteId(data.note?.id ?? '');
    }
  };

  const saveAsDeck = async () => {
    if (!result?.flashcards?.length) return;
    await fetch('/api/flashcards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `${title || 'Lecture'} Deck`,
        cards: result.flashcards,
      }),
    });
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-black">Live Lecture Mode 🎤</h1>
        <p className="mt-2 text-[var(--text-secondary)]">Hit record. Talk. Get notes + flashcards automatically.</p>
      </header>

      {error && <div className="kv-card mb-4 border-[var(--accent-red)] p-3 text-sm text-[var(--accent-red)]">{error}</div>}

      {state === 'idle' && (
        <div className="space-y-4">
          <section className="kv-card p-5">
            <div className="kv-grid-2 mb-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-[var(--text-secondary)]">Subject</label>
                <input className="kv-input" value={subject} onChange={(event) => setSubject(event.target.value)} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-[var(--text-secondary)]">Lecture title</label>
                <input className="kv-input" value={title} onChange={(event) => setTitle(event.target.value)} />
              </div>
            </div>
            <button className="kv-btn-primary px-8 py-4 text-lg" onClick={startRecording}>
              Start Recording 🎤
            </button>
          </section>

          <section className="kv-card p-5">
            <h2 className="mb-3 text-xl font-bold">Past Lectures</h2>
            {history.length === 0 && <p className="text-sm text-[var(--text-secondary)]">No past lectures yet.</p>}
            <div className="space-y-2">
              {history.map((item) => (
                <div key={item.id} className="kv-card-elevated rounded-xl p-3">
                  <p className="font-semibold">{item.title}</p>
                  <p className="text-sm text-[var(--text-secondary)]">{item.subject} • {item.duration}s • {new Date(item.createdAt).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {state === 'recording' && (
        <section className="kv-card p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-lg font-black text-[var(--accent-red)]">● RECORDING</p>
            <p className="text-sm text-[var(--text-secondary)]">{seconds}s • {transcript.split(/\s+/).filter(Boolean).length} words</p>
          </div>

          <div className="kv-card-elevated mb-4 rounded-xl p-4">
            <p className="whitespace-pre-wrap text-[var(--text-primary)]">{transcript || 'Start speaking...'}</p>
            {interimTranscript && <p className="mt-2 italic text-[var(--text-secondary)]">{interimTranscript}</p>}
          </div>

          <div className="flex gap-2">
            <button className="kv-btn-secondary" onClick={togglePause}>{isPaused ? 'Resume' : 'Pause'}</button>
            <button className="kv-btn-primary" onClick={() => void stopAndProcess()}>Stop & Process</button>
          </div>
        </section>
      )}

      {state === 'processing' && (
        <section className="kv-card kv-card-elevated p-8 text-center">
          <p className="text-2xl font-black">Processing your lecture...</p>
          <p className="mt-2 text-[var(--text-secondary)]">Generating notes and flashcards.</p>
        </section>
      )}

      {state === 'done' && result && (
        <section className="space-y-4">
          <div className="kv-card p-4">
            <div className="flex flex-wrap gap-2">
              <button className={activeTab === 'notes' ? 'kv-btn-primary' : 'kv-btn-secondary'} onClick={() => setActiveTab('notes')}>Notes</button>
              <button className={activeTab === 'flashcards' ? 'kv-btn-primary' : 'kv-btn-secondary'} onClick={() => setActiveTab('flashcards')}>Flashcards</button>
              <button className={activeTab === 'transcript' ? 'kv-btn-primary' : 'kv-btn-secondary'} onClick={() => setActiveTab('transcript')}>Transcript</button>
            </div>
          </div>

          {activeTab === 'notes' && (
            <article className="kv-card p-5">
              <p className="whitespace-pre-wrap leading-8">{result.notes || 'No notes generated.'}</p>
              <button className="kv-btn-primary mt-4" onClick={() => void saveNotes()}>Save Notes</button>
              <div className="mt-4">
                <SendToPanel
                  contentType="note"
                  contentId={savedNoteId}
                  title={title.trim() || 'Lecture Notes'}
                  content={result.notes}
                />
              </div>
            </article>
          )}

          {activeTab === 'flashcards' && (
            <article className="kv-card p-5">
              <div className="space-y-2">
                {result.flashcards.map((card, idx) => (
                  <div key={`${card.question}-${idx}`} className="kv-card-elevated rounded-xl p-3">
                    <p><strong>Q:</strong> {card.question}</p>
                    <p className="mt-1 text-[var(--text-secondary)]"><strong>A:</strong> {card.answer}</p>
                  </div>
                ))}
              </div>
              <button className="kv-btn-primary mt-4" onClick={() => void saveAsDeck()}>Save as Deck</button>
            </article>
          )}

          {activeTab === 'transcript' && (
            <article className="kv-card p-5">
              <p className="whitespace-pre-wrap leading-8">{result.transcript}</p>
            </article>
          )}

          <button className="kv-btn-secondary" onClick={() => setState('idle')}>New Lecture</button>
        </section>
      )}
    </main>
  );
}
