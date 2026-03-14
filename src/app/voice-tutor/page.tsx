'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: unknown) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechSynthesisVoiceLike = SpeechSynthesisVoice;

type TutorResponse = {
  message?: string;
  error?: string;
};

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function VoiceTutorPage() {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([
    { id: makeId(), role: 'assistant', content: 'Hey, I am Nova. Hold to talk and I will help out loud.' },
  ]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [busy, setBusy] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const transcriptFinalRef = useRef('');
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const canUseSpeech = typeof window !== 'undefined';

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  useEffect(() => {
    if (!canUseSpeech) return;

    const RecognitionCtor =
      (window as typeof window & { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike })
        .SpeechRecognition ||
      (window as typeof window & { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike })
        .webkitSpeechRecognition;

    if (!RecognitionCtor) return;

    const recognition = new RecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (rawEvent: unknown) => {
      const event = rawEvent as {
        resultIndex: number;
        results: ArrayLike<ArrayLike<{ transcript: string }>>;
      };

      let interim = '';
      let finalText = transcriptFinalRef.current;

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const alt = result?.[0]?.transcript ?? '';
        const isFinal = (result as unknown as { isFinal?: boolean }).isFinal;
        if (isFinal) {
          finalText += `${alt} `;
        } else {
          interim += alt;
        }
      }

      transcriptFinalRef.current = finalText;
      setTranscript(`${finalText}${interim}`.trim());
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
  }, [canUseSpeech]);

  function chooseVoice() {
    const voices = window.speechSynthesis.getVoices();
    return (
      voices.find((voice) => voice.name.includes('Google UK English Female')) ||
      voices.find((voice) => /female/i.test(voice.name)) ||
      voices[0] ||
      null
    ) as SpeechSynthesisVoiceLike | null;
  }

  function stopSpeaking() {
    if (!canUseSpeech) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }

  function speak(content: string) {
    if (!canUseSpeech || !content.trim()) return;

    stopSpeaking();
    const utterance = new SpeechSynthesisUtterance(content);
    const selectedVoice = chooseVoice();
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }

  async function askNova(userText: string) {
    const clean = userText.trim();
    if (!clean || busy) return;

    const userMsg: Message = { id: makeId(), role: 'user', content: clean };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setBusy(true);

    try {
      const res = await fetch('/api/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: 'General',
          messages: nextMessages.map((msg) => ({ role: msg.role, content: msg.content })),
        }),
      });

      const data = (await res.json()) as TutorResponse;
      const content = data.message || data.error || 'I could not respond right now.';
      const assistant: Message = { id: makeId(), role: 'assistant', content };
      setMessages((prev) => [...prev, assistant]);
      speak(content);
    } catch {
      const fail: Message = { id: makeId(), role: 'assistant', content: 'Network issue. Please try again.' };
      setMessages((prev) => [...prev, fail]);
    } finally {
      setBusy(false);
    }
  }

  function startListening() {
    if (!recognitionRef.current || isListening) return;
    transcriptFinalRef.current = '';
    setTranscript('');
    setIsListening(true);
    recognitionRef.current.start();
  }

  function stopListening() {
    if (!recognitionRef.current || !isListening) return;
    recognitionRef.current.stop();
    setIsListening(false);
    const finalText = transcript.trim();
    setTranscript('');
    if (finalText) {
      void askNova(finalText);
    }
  }

  const idleCentered = useMemo(() => messages.length <= 1 && !isListening && !isSpeaking, [messages.length, isListening, isSpeaking]);
  const userInitial = (session?.user?.name?.trim()?.[0] || 'Y').toUpperCase();

  return (
    <main className="kv-page" style={{ minHeight: 'calc(100vh - 72px)', display: 'flex', flexDirection: 'column' }}>
      <h1 className="kv-page-title">Voice Tutor</h1>
      <p className="kv-page-subtitle">Talk to Nova out loud with live speech I/O.</p>

      <section className="kv-card" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className={`nova-avatar ${isListening ? 'listening' : ''} ${isSpeaking ? 'speaking' : ''}`}>
              <span>🤖</span>
            </div>
            <div>
              <p style={{ margin: 0, fontWeight: 700 }}>Nova</p>
              <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 12 }}>
                {isListening ? 'Listening...' : isSpeaking ? 'Speaking...' : 'Idle'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              className={`kv-btn-primary ${isListening ? 'listening-btn' : ''}`}
              onMouseDown={startListening}
              onMouseUp={stopListening}
              onMouseLeave={stopListening}
              onTouchStart={(event) => {
                event.preventDefault();
                startListening();
              }}
              onTouchEnd={(event) => {
                event.preventDefault();
                stopListening();
              }}
              disabled={!recognitionRef.current || busy}
            >
              Hold to Talk
            </button>
            {isSpeaking && (
              <button className="kv-btn-secondary" onClick={stopSpeaking}>Stop Speaking</button>
            )}
          </div>
        </div>

        <p style={{ marginTop: 10, minHeight: 24, fontSize: 13, color: 'var(--text-secondary)' }}>
          {isListening ? transcript || 'Listening...' : transcript ? `Captured: ${transcript}` : 'Press and hold to speak.'}
        </p>
      </section>

      <section className="kv-card" style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
        {idleCentered && (
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>
            <div className={`nova-avatar idle-hero ${isListening ? 'listening' : ''} ${isSpeaking ? 'speaking' : ''}`}>
              <span>🤖</span>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gap: 12 }}>
          {messages.map((message) => (
            <div
              key={message.id}
              style={{
                display: 'flex',
                justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', maxWidth: '82%' }}>
                {message.role === 'assistant' && <span className="chat-avatar nova">🤖</span>}
                <div className={message.role === 'user' ? 'chat-bubble user' : 'chat-bubble nova'}>
                  {message.content}
                </div>
                {message.role === 'user' && <span className="chat-avatar user">{userInitial}</span>}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
      </section>

      <style jsx>{`
        .nova-avatar {
          width: 80px;
          height: 80px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          background: radial-gradient(circle at 30% 30%, #f0b429, #2dd4bf);
          box-shadow: 0 0 0 2px rgba(240,180,41,0.5), 0 0 28px rgba(45,212,191,0.18);
          animation: pulse-idle 3s ease-in-out infinite;
          color: #091024;
          font-size: 36px;
          font-weight: 700;
        }

        .nova-avatar.idle-hero {
          width: 120px;
          height: 120px;
          font-size: 54px;
          opacity: 0.45;
        }

        .nova-avatar.listening {
          animation: pulse-listening 900ms ease-in-out infinite;
          box-shadow: 0 0 0 2px rgba(59,130,246,0.55), 0 0 34px rgba(59,130,246,0.35);
        }

        .nova-avatar.speaking {
          animation: wave-speaking 1.1s ease-in-out infinite;
          box-shadow: 0 0 0 2px rgba(240,180,41,0.55), 0 0 34px rgba(240,180,41,0.4);
        }

        .listening-btn {
          animation: pulse-listening 900ms ease-in-out infinite;
        }

        .chat-avatar {
          width: 28px;
          height: 28px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 700;
          border: 1px solid var(--border-default);
        }

        .chat-avatar.nova {
          background: linear-gradient(135deg, #f0b429, #2dd4bf);
          color: #091024;
        }

        .chat-avatar.user {
          background: rgba(59,130,246,0.22);
          color: #bfdbfe;
        }

        .chat-bubble {
          border-radius: 16px;
          padding: 10px 12px;
          font-size: 14px;
          line-height: 1.55;
          animation: bubble-in 220ms ease-out;
        }

        .chat-bubble.user {
          background: rgba(59,130,246,0.22);
          border: 1px solid rgba(59,130,246,0.4);
          color: #dbeafe;
        }

        .chat-bubble.nova {
          background: rgba(15,23,51,0.95);
          border: 1px solid var(--border-default);
          color: var(--text-primary);
        }

        @keyframes pulse-idle {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.04); }
        }

        @keyframes pulse-listening {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }

        @keyframes wave-speaking {
          0%, 100% { transform: translateY(0) scale(1); }
          25% { transform: translateY(-2px) scale(1.05); }
          50% { transform: translateY(0px) scale(1.08); }
          75% { transform: translateY(2px) scale(1.05); }
        }

        @keyframes bubble-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </main>
  );
}
