'use client';

import { useEffect, useRef, useState } from 'react';
import { SendToPanel } from '~/app/_components/send-to-panel';
import { formatTorontoDateTime } from '~/lib/toronto-time';

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

export function InboxLecture() {
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
        tags: [subject || 'lecture', 'live-transcript', 'Inbox'],
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
    <div style={{ padding: '18px 0 24px' }}>
      <p className="kv-meta">Lecture</p>
      <p className="kv-sub" style={{ marginTop: 8 }}>Hit record. Talk. Get notes + flashcards automatically.</p>
      <p className="kv-meta" style={{ marginTop: 8 }}>Works in Chrome or Edge</p>

      {error ? (
        <p role="alert" style={{ marginTop: 16, color: 'var(--kv-text-primary)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span className="kv-chip kv-chip-stale">Error</span>
          {error}
        </p>
      ) : null}

      {state === 'idle' && (
        <div>
          <section style={{ marginTop: 18 }}>
            <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
              <div>
                <label className="kv-meta" style={{ display: 'block', marginBottom: 8 }}>Subject</label>
                <input className="kv-field" value={subject} onChange={(event) => setSubject(event.target.value)} />
              </div>
              <div>
                <label className="kv-meta" style={{ display: 'block', marginBottom: 8 }}>Lecture title</label>
                <input className="kv-field" value={title} onChange={(event) => setTitle(event.target.value)} />
              </div>
            </div>
            <button type="button" className="kv-btn" style={{ marginTop: 14 }} onClick={startRecording}>
              Start Recording
            </button>
          </section>

          <section style={{ marginTop: 28 }}>
            <p className="kv-meta">Past lectures</p>
            {history.length === 0 ? <p className="kv-sub" style={{ marginTop: 12 }}>No past lectures yet.</p> : null}
            {history.map((item) => (
              <div key={item.id} className="kv-row">
                <div>
                  <div className="kv-row-title">{item.title}</div>
                  <div className="kv-row-sub">
                    {item.subject ? <span className="kv-chip kv-chip-course">{item.subject}</span> : null}
                    <span className="kv-chip">Lecture</span>
                  </div>
                </div>
                <span className="kv-row-side num">{item.duration}s · {formatTorontoDateTime(item.createdAt)}</span>
              </div>
            ))}
          </section>
        </div>
      )}

      {state === 'recording' && (
        <section style={{ marginTop: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <span className="dot" />
              <span className="kv-meta">Recording</span>
            </span>
            <p className="kv-meta num">{seconds}s · {transcript.split(/\s+/).filter(Boolean).length} words</p>
          </div>

          <div style={{ border: '1px solid var(--border-default)', borderRadius: 'var(--kv-radius)', padding: 14 }}>
            <p style={{ margin: 0, whiteSpace: 'pre-wrap', color: 'var(--kv-text-primary)' }}>{transcript || 'Start speaking...'}</p>
            {interimTranscript ? <p className="kv-sub" style={{ marginTop: 8 }}>{interimTranscript}</p> : null}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
            <button type="button" className="kv-btn-ghost" onClick={togglePause} style={{ justifyContent: 'center' }}>{isPaused ? 'Resume' : 'Pause'}</button>
            <button type="button" className="kv-btn" onClick={() => void stopAndProcess()} style={{ justifyContent: 'center' }}>Stop & Process</button>
          </div>
        </section>
      )}

      {state === 'processing' && (
        <p className="kv-meta" style={{ marginTop: 18 }}>
          <span className="dot" style={{ marginRight: 8 }} />
          Generating notes and flashcards…
        </p>
      )}

      {state === 'done' && result && (
        <section style={{ marginTop: 18 }}>
          <div className="kv-tabs">
            <button type="button" className={activeTab === 'notes' ? 'kv-tab on' : 'kv-tab'} onClick={() => setActiveTab('notes')}>Notes</button>
            <button type="button" className={activeTab === 'flashcards' ? 'kv-tab on' : 'kv-tab'} onClick={() => setActiveTab('flashcards')}>Flashcards</button>
            <button type="button" className={activeTab === 'transcript' ? 'kv-tab on' : 'kv-tab'} onClick={() => setActiveTab('transcript')}>Transcript</button>
          </div>

          {activeTab === 'notes' && (
            <article style={{ marginTop: 16 }}>
              <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, color: 'var(--kv-text-primary)' }}>{result.notes || 'No notes generated.'}</p>
              <button type="button" className="kv-btn" style={{ marginTop: 14 }} onClick={() => void saveNotes()}>Save Notes</button>
              <div style={{ marginTop: 16 }}>
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
            <article style={{ marginTop: 16 }}>
              {result.flashcards.map((card, idx) => (
                <div key={`${card.question}-${idx}`} className="kv-row">
                  <div>
                    <div className="kv-row-title">{card.question}</div>
                    <p className="kv-sub" style={{ marginTop: 6 }}>{card.answer}</p>
                  </div>
                </div>
              ))}
              <button type="button" className="kv-btn" style={{ marginTop: 14 }} onClick={() => void saveAsDeck()}>Save as Deck</button>
            </article>
          )}

          {activeTab === 'transcript' && (
            <article style={{ marginTop: 16 }}>
              <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, color: 'var(--kv-text-primary)' }}>{result.transcript}</p>
            </article>
          )}

          <button type="button" className="kv-btn-ghost" style={{ marginTop: 16 }} onClick={() => setState('idle')}>New Lecture</button>
        </section>
      )}
    </div>
  );
}
