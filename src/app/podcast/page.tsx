'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type ScriptSpeaker = 'Nova' | 'Alex';

type ScriptLine = {
  speaker: ScriptSpeaker;
  line: string;
};

type PodcastResult = {
  podcastId?: string;
  topic: string;
  podcastTitle: string;
  script: ScriptLine[];
  keyTakeaways?: string[];
};

type SavedPodcast = {
  id: string;
  title: string;
  topic: string;
  createdAt: string;
  script: unknown;
};

const NOVA_COLOR = 'var(--accent-blue)';
const ALEX_COLOR = 'var(--accent-purple)';
const NOVA_BG = 'var(--glow-blue)';
const ALEX_BG = 'rgba(139,92,246,0.1)';

function parseScript(value: unknown): ScriptLine[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const row = entry as { speaker?: unknown; line?: unknown };
      const speaker = row.speaker === 'Nova' || row.speaker === 'Alex' ? row.speaker : null;
      const line = typeof row.line === 'string' ? row.line.trim() : '';
      if (!speaker || !line) return null;
      return { speaker, line } as ScriptLine;
    })
    .filter((entry): entry is ScriptLine => Boolean(entry));
}

function getHostVoices(voices: SpeechSynthesisVoice[]) {
  const allVoices = voices.filter((voice) => voice.lang.toLowerCase().startsWith('en'));

  const novaVoice =
    allVoices.find((voice) =>
      /(female|samantha|karen|moira|victoria|zira|jenny|aria)/i.test(voice.name),
    ) ?? allVoices[0];

  const alexVoice =
    allVoices.find((voice) => voice !== novaVoice && /(male|daniel|alex|david|mark|guy|christopher)/i.test(voice.name)) ??
    allVoices.find((voice) => voice !== novaVoice) ??
    allVoices[0];

  return { novaVoice, alexVoice };
}

export default function PodcastPage() {
  const [view, setView] = useState<'input' | 'loading' | 'player'>('input');
  const [text, setText] = useState('');
  const [result, setResult] = useState<PodcastResult | null>(null);
  const [error, setError] = useState('');
  const [savedPodcasts, setSavedPodcasts] = useState<SavedPodcast[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentLine, setCurrentLine] = useState(-1);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [speed, setSpeed] = useState(1);

  const isPlayingRef = useRef(false);
  const currentLineRef = useRef(-1);
  const speedRef = useRef(1);
  const scriptRef = useRef<ScriptLine[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const loadVoices = () => setVoices(window.speechSynthesis.getVoices());
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  const speakLine = useCallback(
    (index: number) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) return;

      if (index < 0 || index >= scriptRef.current.length) {
        isPlayingRef.current = false;
        setIsPlaying(false);
        setCurrentLine(-1);
        currentLineRef.current = -1;
        return;
      }

      const line = scriptRef.current[index];
      if (!line) return;

      const { novaVoice, alexVoice } = getHostVoices(voices);
      const utterance = new SpeechSynthesisUtterance(line.line);
      utterance.rate = speedRef.current;
      utterance.pitch = line.speaker === 'Nova' ? 1.1 : 0.9;
      utterance.voice = line.speaker === 'Nova' ? (novaVoice ?? null) : (alexVoice ?? null);

      utterance.onstart = () => {
        currentLineRef.current = index;
        setCurrentLine(index);
      };

      utterance.onend = () => {
        if (!isPlayingRef.current) return;
        setTimeout(() => speakLine(index + 1), 280);
      };

      utterance.onerror = (event) => {
        if (event.error !== 'interrupted') speakLine(index + 1);
      };

      window.speechSynthesis.speak(utterance);
    },
    [voices],
  );

  const play = useCallback(
    (fromIndex = 0) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      isPlayingRef.current = true;
      setIsPlaying(true);
      setTimeout(() => speakLine(fromIndex), 80);
    },
    [speakLine],
  );

  const pause = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.pause();
    isPlayingRef.current = false;
    setIsPlaying(false);
  }, []);

  const resume = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.resume();
    isPlayingRef.current = true;
    setIsPlaying(true);
  }, []);

  const stop = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    isPlayingRef.current = false;
    setIsPlaying(false);
    setCurrentLine(-1);
    currentLineRef.current = -1;
  }, []);

  const jumpTo = useCallback(
    (index: number) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) return;
      const bounded = Math.max(0, Math.min(index, scriptRef.current.length - 1));
      window.speechSynthesis.cancel();

      if (isPlayingRef.current) {
        speakLine(bounded);
        return;
      }

      currentLineRef.current = bounded;
      setCurrentLine(bounded);
    },
    [speakLine],
  );

  useEffect(
    () => () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      isPlayingRef.current = false;
    },
    [],
  );

  const handleGenerate = async () => {
    if (text.trim().length < 50) {
      setError('Please paste more content - at least a paragraph');
      return;
    }

    setError('');
    setView('loading');

    try {
      const response = await fetch('/api/podcast/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      const data = (await response.json().catch(() => ({}))) as PodcastResult & { error?: string };
      if (!response.ok || data.error) {
        throw new Error(data.error ?? 'Failed to generate podcast');
      }

      const script = parseScript(data.script);
      const normalized: PodcastResult = {
        podcastId: data.podcastId,
        topic: data.topic ?? 'Study Session',
        podcastTitle: data.podcastTitle ?? 'Nova & Alex Study Podcast',
        script,
        keyTakeaways: Array.isArray(data.keyTakeaways) ? data.keyTakeaways : [],
      };

      setResult(normalized);
      scriptRef.current = normalized.script;
      setCurrentLine(-1);
      currentLineRef.current = -1;
      setView('player');
    } catch {
      setError('Failed to generate podcast. Try again.');
      setView('input');
    }
  };

  const loadHistory = async () => {
    try {
      const response = await fetch('/api/podcast', { cache: 'no-store' });
      const data = (await response.json().catch(() => ({}))) as { podcasts?: SavedPodcast[] };
      setSavedPodcasts(Array.isArray(data.podcasts) ? data.podcasts : []);
    } catch {
      setSavedPodcasts([]);
    }
  };

  const downloadTranscript = () => {
    if (!result) return;

    const lines = result.script.map((line) => `${line.speaker}: ${line.line}`).join('\n\n');
    const takeaways = (result.keyTakeaways ?? []).map((item) => `- ${item}`).join('\n');
    const content = `${result.podcastTitle}\n${'='.repeat(40)}\n\n${lines}\n\n---\nKey Takeaways:\n${takeaways}`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `kyvex-podcast-${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (view === 'loading') {
    return (
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
          gap: '24px',
        }}
      >
        <div style={{ display: 'flex', gap: '20px' }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-cyan, #22d3ee))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              animation: 'glow-pulse 1.8s ease-in-out infinite',
            }}
          >
            🤖
          </div>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-pink, #ec4899))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              animation: 'glow-pulse 1.8s ease-in-out infinite',
            }}
          >
            🎓
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
            Nova and Alex are preparing your podcast...
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            Writing a script, challenging ideas, and making it useful to study from.
          </p>
        </div>
      </div>
    );
  }

  if (view === 'player' && result) {
    const script = result.script;
    const progress = currentLine >= 0 && script.length > 0 ? Math.round((currentLine / script.length) * 100) : 0;

    return (
      <div style={{ padding: '32px', maxWidth: '860px', margin: '0 auto' }} className="animate-fade-in-up">
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
            <span className="badge badge-blue">🎙 Podcast</span>
            <span className="badge badge-purple">{result.topic}</span>
          </div>
          <h1
            style={{
              fontSize: '24px',
              fontWeight: 800,
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
              marginBottom: '6px',
            }}
          >
            {result.podcastTitle}
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            {script.length} exchanges • ~{Math.ceil((script.length * 8) / 60)} min listen
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '20px' }}>
          {[
            {
              name: 'Nova',
              emoji: '🤖',
              color: NOVA_COLOR,
              bg: NOVA_BG,
              desc: 'Enthusiastic explainer',
              lines: script.filter((line) => line.speaker === 'Nova').length,
            },
            {
              name: 'Alex',
              emoji: '🎓',
              color: ALEX_COLOR,
              bg: ALEX_BG,
              desc: 'Critical thinker',
              lines: script.filter((line) => line.speaker === 'Alex').length,
            },
          ].map((host) => (
            <div
              key={host.name}
              style={{
                padding: '16px',
                borderRadius: '12px',
                background: host.bg,
                border: `1px solid ${host.color}30`,
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: host.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  flexShrink: 0,
                }}
              >
                {host.emoji}
              </div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: host.color }}>{host.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {host.desc} • {host.lines} lines
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="card" style={{ padding: '24px', marginBottom: '20px' }}>
          <div
            style={{
              minHeight: '56px',
              padding: '14px',
              background:
                currentLine >= 0
                  ? script[currentLine]?.speaker === 'Nova'
                    ? NOVA_BG
                    : ALEX_BG
                  : 'var(--bg-elevated)',
              borderRadius: '10px',
              marginBottom: '20px',
              border: `1px solid ${
                currentLine >= 0
                  ? script[currentLine]?.speaker === 'Nova'
                    ? `${NOVA_COLOR}30`
                    : `${ALEX_COLOR}30`
                  : 'var(--border-default)'
              }`,
              transition: 'all 0.3s ease',
            }}
          >
            {currentLine >= 0 ? (
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '18px', flexShrink: 0 }}>
                  {script[currentLine]?.speaker === 'Nova' ? '🤖' : '🎓'}
                </span>
                <div>
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: script[currentLine]?.speaker === 'Nova' ? NOVA_COLOR : ALEX_COLOR,
                      marginBottom: '4px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    {script[currentLine]?.speaker}
                  </div>
                  <p style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: 1.6, fontStyle: 'italic' }}>
                    "{script[currentLine]?.line}"
                  </p>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', paddingTop: '6px' }}>
                {isPlaying ? '...' : 'Press play to start the podcast.'}
              </p>
            )}
          </div>

          <div style={{ marginBottom: '20px' }}>
            <div
              style={{
                height: '4px',
                background: 'var(--border-default)',
                borderRadius: '2px',
                cursor: 'pointer',
                position: 'relative',
              }}
              onClick={(event) => {
                const rect = event.currentTarget.getBoundingClientRect();
                const percent = (event.clientX - rect.left) / rect.width;
                jumpTo(Math.floor(percent * script.length));
              }}
            >
              <div
                style={{
                  height: '100%',
                  borderRadius: '2px',
                  background: 'linear-gradient(90deg, var(--accent-blue), var(--accent-purple))',
                  width: `${progress}%`,
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '11px',
                color: 'var(--text-muted)',
                marginTop: '6px',
              }}
            >
              <span>{currentLine >= 0 ? `Line ${currentLine + 1}` : 'Ready'}</span>
              <span>{progress}%</span>
              <span>{script.length} lines</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '20px' }}>
            <button
              onClick={() => {
                const previous = Math.max(0, currentLineRef.current - 3);
                jumpTo(previous);
                if (isPlaying) play(previous);
              }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '20px', padding: '8px' }}
            >
              ⏮
            </button>

            <button
              onClick={() => {
                if (isPlaying) {
                  pause();
                  return;
                }
                if (currentLine >= 0) {
                  resume();
                  return;
                }
                play(0);
              }}
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))',
                border: 'none',
                cursor: 'pointer',
                fontSize: '24px',
                color: 'white',
                boxShadow: '0 4px 20px rgba(91,127,255,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'transform 0.15s ease',
              }}
              onMouseEnter={(event) => {
                event.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.transform = 'scale(1)';
              }}
            >
              {isPlaying ? '⏸' : currentLine >= 0 ? '▶' : '🎙'}
            </button>

            <button
              onClick={stop}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '20px', padding: '8px' }}
            >
              ⏹
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {[0.75, 1, 1.25, 1.5].map((value) => (
              <button
                key={value}
                onClick={() => {
                  setSpeed(value);
                  speedRef.current = value;
                  if (!isPlaying || currentLineRef.current < 0) return;
                  if (typeof window === 'undefined' || !window.speechSynthesis) return;
                  window.speechSynthesis.cancel();
                  setTimeout(() => speakLine(currentLineRef.current), 80);
                }}
                style={{
                  padding: '4px 10px',
                  borderRadius: '20px',
                  border: `1px solid ${speed === value ? 'var(--accent-blue)' : 'var(--border-default)'}`,
                  background: speed === value ? 'var(--accent-blue)' : 'var(--bg-elevated)',
                  color: speed === value ? 'white' : 'var(--text-muted)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {value}x
              </button>
            ))}

            <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
              <button onClick={downloadTranscript} className="btn btn-ghost btn-sm">
                ⬇ Transcript
              </button>
              <button
                onClick={() => {
                  stop();
                  setView('input');
                }}
                className="btn btn-ghost btn-sm"
              >
                🔄 New podcast
              </button>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>
            📜 Full Script
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 400, marginLeft: '8px' }}>
              Click any line to jump to it
            </span>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {script.map((line, index) => {
              const isNova = line.speaker === 'Nova';
              const isCurrent = currentLine === index;

              return (
                <div
                  key={`${line.speaker}-${index}`}
                  onClick={() => {
                    jumpTo(index);
                    if (isPlaying) play(index);
                  }}
                  style={{
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'flex-start',
                    padding: '12px',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    background: isCurrent ? (isNova ? NOVA_BG : ALEX_BG) : index < currentLine ? 'transparent' : 'var(--bg-elevated)',
                    border: `1px solid ${isCurrent ? (isNova ? `${NOVA_COLOR}40` : `${ALEX_COLOR}40`) : 'transparent'}`,
                    opacity: index < currentLine && !isCurrent ? 0.5 : 1,
                    transition: 'all 0.2s ease',
                    borderLeft: `3px solid ${isNova ? NOVA_COLOR : ALEX_COLOR}`,
                  }}
                >
                  <div style={{ flexShrink: 0, paddingTop: '2px' }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: isNova ? NOVA_COLOR : ALEX_COLOR,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                      }}
                    >
                      {isNova ? '🤖' : '🎓'}
                    </div>
                  </div>

                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: isNova ? NOVA_COLOR : ALEX_COLOR,
                        marginBottom: '4px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      {line.speaker}
                    </div>
                    <p
                      style={{
                        fontSize: '14px',
                        lineHeight: 1.6,
                        color: isCurrent ? 'var(--text-primary)' : 'var(--text-secondary)',
                        fontWeight: isCurrent ? 500 : 400,
                      }}
                    >
                      {line.line}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {(result.keyTakeaways ?? []).length > 0 ? (
          <div
            className="card"
            style={{
              padding: '20px',
              marginTop: '16px',
              background: 'var(--glow-blue)',
              border: '1px solid rgba(91,127,255,0.2)',
            }}
          >
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent-blue)', marginBottom: '12px' }}>🎯 Key Takeaways</h3>
            <ul style={{ margin: 0, paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {(result.keyTakeaways ?? []).map((takeaway, index) => (
                <li key={`${takeaway}-${index}`} style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  {takeaway}
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
      <div
        style={{
          marginBottom: '28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
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
            🎙 Notes → Podcast
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '480px', lineHeight: 1.6 }}>
            Paste your notes and Nova + Alex will turn them into an engaging podcast debate. Listen while you commute or relax.
          </p>
        </div>

        <button
          onClick={async () => {
            setShowHistory(true);
            await loadHistory();
          }}
          className="btn btn-ghost btn-sm"
        >
          📻 History
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        <div style={{ padding: '16px', borderRadius: '12px', background: NOVA_BG, border: `1px solid ${NOVA_COLOR}30` }}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>🤖</div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: NOVA_COLOR, marginBottom: '4px' }}>Nova</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Explains clearly, uses analogies, relates to your life, and keeps things accessible.
          </div>
        </div>

        <div style={{ padding: '16px', borderRadius: '12px', background: ALEX_BG, border: `1px solid ${ALEX_COLOR}30` }}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>🎓</div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: ALEX_COLOR, marginBottom: '4px' }}>Alex</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Challenges ideas, digs deeper, connects concepts, and asks hard questions.
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: '24px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <label
            style={{
              fontSize: '13px',
              fontWeight: 700,
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Paste your notes
          </label>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{text.length} chars</span>
        </div>

        <textarea
          className="textarea"
          rows={10}
          placeholder="Paste notes, chapter summaries, or key bullet points. Nova and Alex will turn it into a podcast-style discussion."
          value={text}
          onChange={(event) => setText(event.target.value)}
          style={{ resize: 'vertical' }}
        />

        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
          💡 Works best with 1-3 paragraphs. Long notes are summarized automatically.
        </p>
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

      <button onClick={handleGenerate} disabled={text.trim().length < 50} className="btn btn-primary btn-lg" style={{ width: '100%' }}>
        🎙 Generate podcast →
      </button>

      {showHistory ? (
        <div style={{ marginTop: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>📻 Past Podcasts</h3>
            <button onClick={() => setShowHistory(false)} className="btn btn-ghost btn-sm">
              Close
            </button>
          </div>

          {savedPodcasts.length === 0 ? (
            <div className="card" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              No podcasts yet. Generate your first one above.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {savedPodcasts.map((podcast) => {
                const script = parseScript(podcast.script);

                return (
                  <div
                    key={podcast.id}
                    className="card"
                    style={{
                      padding: '16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '12px',
                      cursor: 'pointer',
                    }}
                    onClick={() => {
                      const normalized: PodcastResult = {
                        podcastId: podcast.id,
                        topic: podcast.topic,
                        podcastTitle: podcast.title,
                        script,
                        keyTakeaways: [],
                      };
                      setResult(normalized);
                      scriptRef.current = script;
                      setCurrentLine(-1);
                      currentLineRef.current = -1;
                      setView('player');
                      setShowHistory(false);
                    }}
                  >
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>
                        {podcast.title}
                      </p>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {podcast.topic} • {new Date(podcast.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button className="btn btn-ghost btn-sm">▶ Listen</button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
