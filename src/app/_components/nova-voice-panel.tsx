'use client';

import { useEffect, useRef, useState } from 'react';
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
  onerror: ((event: unknown) => void) | null;
  start: () => void;
  stop: () => void;
};

type TutorResponse = {
  message?: string;
  error?: string;
};

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function NovaVoicePanel() {
  useSession();
  const [messages, setMessages] = useState<Message[]>([
    { id: "nova-greeting", role: 'assistant', content: 'Hey, I am Nova. Hold to talk and I will help out loud.' },
  ]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [busy, setBusy] = useState(false);
  const [hasRecognition, setHasRecognition] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const transcriptFinalRef = useRef('');
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  useEffect(() => {
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
    setHasRecognition(true);
    return () => {
      try {
        recognition.stop();
      } catch {
        /* noop */
      }
      recognitionRef.current = null;
    };
  }, []);

  function chooseVoice() {
    const voices = window.speechSynthesis.getVoices();
    return (
      voices.find((voice) => voice.name.includes('Google UK English Female')) ||
      voices.find((voice) => /female/i.test(voice.name)) ||
      voices[0] ||
      null
    );
  }

  function stopSpeaking() {
    if (typeof window === "undefined") return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }

  function speak(content: string) {
    if (typeof window === "undefined" || !content.trim()) return;

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

  return (
    <div>
      <p className="kv-meta">Voice input works best in Chrome.</p>
      <p className="kv-meta" style={{ marginTop: 6 }}>
        {isListening ? "Listening" : isSpeaking ? "Speaking" : hasRecognition ? "Hold to talk" : "Speech recognition unavailable"}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className="kv-btn"
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
          disabled={!hasRecognition || busy}
        >
          Hold to Talk
        </button>
        {isSpeaking ? (
          <button type="button" className="kv-btn-ghost" onClick={stopSpeaking}>Stop Speaking</button>
        ) : null}
      </div>

      <p className="kv-sub" style={{ marginTop: 12, minHeight: 24 }}>
        {isListening ? transcript || "Listening…" : transcript ? `Captured: ${transcript}` : "Press and hold to speak."}
      </p>

      <div style={{ marginTop: 22 }}>
        {messages.map((message) =>
          message.role === "user" ? (
            <div key={message.id} className="mb-5 flex justify-end">
              <p className="nova-reply" style={{ color: "var(--kv-text-primary)" }}>{message.content}</p>
            </div>
          ) : (
            <article key={message.id} className="mb-5">
              <div className="mb-2 flex items-center gap-2">
                <span className="nova-k" aria-hidden>K</span>
                <span className="kv-meta">Kyvex / Nova</span>
              </div>
              <p className="nova-reply">{message.content}</p>
            </article>
          ),
        )}
        <div ref={chatEndRef} />
      </div>
    </div>
  );
}
