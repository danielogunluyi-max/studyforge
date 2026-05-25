"use client";

/**
 * Phase 3 — Nova Live Vision
 *
 * Camera-aware Socratic tutor. The student points the camera at homework or
 * a textbook, snaps a frame, and asks a question. Nova sees the page and
 * guides them through it Socratically — never just dropping the answer.
 *
 * Layout:
 *   Desktop  → 2-column grid (viewfinder left, chat right)
 *   Mobile   → stacked (viewfinder top, chat below)
 *
 * Voice:
 *   - SpeechRecognition for input (Chrome/Edge)
 *   - SpeechSynthesis for Nova's reply (toggleable)
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Camera,
  Eye,
  Mic,
  MicOff,
  RotateCcw,
  Send,
  Sparkles,
  Volume2,
  VolumeX,
} from "lucide-react";
import Link from "next/link";

import NovaCameraViewfinder, {
  type NovaCameraHandle,
} from "@/app/_components/nova-camera-viewfinder";

/* ──────────────────────────────────────────────────────────── */
/*  Types                                                       */
/* ──────────────────────────────────────────────────────────── */

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  hadImage?: boolean;
  pending?: boolean;
};

type NovaSpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort?: () => void;
  onresult:
    | ((event: {
        results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
      }) => void)
    | null;
  onerror: ((event: unknown) => void) | null;
  onend: (() => void) | null;
};

type NovaSpeechRecognitionCtor = new () => NovaSpeechRecognitionLike;

type WindowWithSpeech = typeof window & {
  SpeechRecognition?: NovaSpeechRecognitionCtor;
  webkitSpeechRecognition?: NovaSpeechRecognitionCtor;
};

/* ──────────────────────────────────────────────────────────── */
/*  Helpers                                                     */
/* ──────────────────────────────────────────────────────────── */

function makeId() {
  return `m-${Math.random().toString(36).slice(2, 9)}-${Date.now().toString(36)}`;
}

function getSpeechRecognitionCtor(): NovaSpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as WindowWithSpeech;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/* ──────────────────────────────────────────────────────────── */
/*  Page                                                        */
/* ──────────────────────────────────────────────────────────── */

export default function NovaLivePage() {
  const cameraRef = useRef<NovaCameraHandle | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [error, setError] = useState("");

  // Voice
  const [listening, setListening] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const recognitionRef = useRef<NovaSpeechRecognitionLike | null>(null);
  const finalTranscriptRef = useRef("");

  /* ---- Voice setup ----------------------------------------- */
  useEffect(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;
    setVoiceSupported(true);
    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = 0; i < event.results.length; i++) {
        const res = event.results[i];
        if (!res) continue;
        const alt = res[0];
        if (!alt) continue;
        if (res.isFinal) {
          finalTranscriptRef.current += alt.transcript + " ";
        } else {
          interim += alt.transcript;
        }
      }
      setDraft((finalTranscriptRef.current + interim).trimStart());
    };

    recognition.onerror = () => {
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
    return () => {
      try {
        recognition.abort?.();
      } catch {
        /* noop */
      }
      recognitionRef.current = null;
    };
  }, []);

  const toggleListening = useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec) return;
    if (listening) {
      try {
        rec.stop();
      } catch {
        /* noop */
      }
      setListening(false);
      return;
    }
    finalTranscriptRef.current = draft.endsWith(" ") ? draft : draft + (draft.length > 0 ? " " : "");
    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }, [listening, draft]);

  /* ---- TTS for Nova replies -------------------------------- */
  const speak = useCallback(
    (text: string) => {
      if (!ttsEnabled || typeof window === "undefined" || !window.speechSynthesis) return;
      const cleaned = text
        .replace(/[*_`#>~]/g, "")
        .replace(/\$([^$]+)\$/g, "$1")
        .replace(/\s+/g, " ")
        .trim();
      if (!cleaned) return;
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(cleaned);
        utterance.rate = 1.02;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
      } catch {
        /* noop */
      }
    },
    [ttsEnabled],
  );

  useEffect(() => {
    if (!ttsEnabled && typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, [ttsEnabled]);

  /* ---- Auto-scroll on new messages ------------------------- */
  useEffect(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages]);

  /* ---- Send (with optional image snap) --------------------- */
  const send = useCallback(
    async (opts: { withSnap: boolean }) => {
      if (busy) return;
      const text = draft.trim();
      const wantsSnap = opts.withSnap && cameraReady;

      if (!text && !wantsSnap) {
        setError("Type a question, or use Snap & Ask to send a photo.");
        return;
      }

      setError("");

      // Capture frame if requested
      let snap: { base64: string; mimeType: string } | null = null;
      if (wantsSnap) {
        snap = (await cameraRef.current?.snap()) ?? null;
        if (!snap) {
          setError("Couldn't capture a frame. Make sure the camera is live.");
          return;
        }
      }

      const userMsg: ChatMessage = {
        id: makeId(),
        role: "user",
        content: text || "(snapped a photo)",
        hadImage: wantsSnap,
      };
      const placeholder: ChatMessage = {
        id: makeId(),
        role: "assistant",
        content: "",
        pending: true,
      };
      const nextMessages = [...messages, userMsg];
      setMessages([...nextMessages, placeholder]);
      setDraft("");
      finalTranscriptRef.current = "";
      setBusy(true);

      try {
        const payload = {
          conversationId: conversationId ?? undefined,
          messages: [
            ...nextMessages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            // Replace last user message with image-attached version for the API
          ].slice(0, -1),
          // The API treats the LAST entry as the freshest user turn. So we send
          // the full prior history + the new user msg w/ optional image.
        };
        const messagesForApi = [
          ...nextMessages.slice(0, -1).map((m) => ({
            role: m.role,
            content: m.content,
          })),
          {
            role: "user" as const,
            content: text || "Take a look at this and help me get started.",
            imageBase64: snap?.base64,
            mimeType: snap?.mimeType,
          },
        ];

        const res = await fetch("/api/nova-vision", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId: payload.conversationId,
            messages: messagesForApi,
          }),
        });
        const data = (await res.json().catch(() => null)) as
          | { message?: string; conversationId?: string | null; error?: string }
          | null;

        if (!res.ok || !data?.message) {
          const errMsg = data?.error ?? "Nova couldn't respond. Try again.";
          setMessages((prev) =>
            prev.map((m) =>
              m.id === placeholder.id
                ? { ...m, content: `*${errMsg}*`, pending: false }
                : m,
            ),
          );
          setError(errMsg);
          return;
        }

        const replyText = data.message.trim();
        setMessages((prev) =>
          prev.map((m) =>
            m.id === placeholder.id
              ? { ...m, content: replyText, pending: false }
              : m,
          ),
        );
        if (data.conversationId) setConversationId(data.conversationId);
        speak(replyText);
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === placeholder.id
              ? { ...m, content: "*Network issue. Please try again.*", pending: false }
              : m,
          ),
        );
        setError("Network issue. Please try again.");
      } finally {
        setBusy(false);
        inputRef.current?.focus();
      }
    },
    [busy, draft, cameraReady, messages, conversationId, speak],
  );

  const resetSession = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setMessages([]);
    setConversationId(null);
    setDraft("");
    setError("");
    finalTranscriptRef.current = "";
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send({ withSnap: false });
    }
  };

  const placeholderHint = useMemo(() => {
    if (listening) return "Listening… speak now.";
    if (messages.length === 0) return "Ask Nova about anything you can see.";
    return "Follow-up question, or Snap to share a new view.";
  }, [listening, messages.length]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-black font-sans text-white antialiased">
      {/* Background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[-180px] h-[420px] w-[420px] -translate-x-1/2 rounded-full blur-[120px]"
        style={{ background: "rgba(34,211,238,0.18)" }}
      />

      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mb-6 flex items-center justify-between gap-3 will-change-transform"
        >
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold text-zinc-300 transition-colors hover:bg-white/[0.08] hover:text-zinc-100"
          >
            <ArrowLeft size={12} strokeWidth={2} />
            Back
          </Link>

          <div className="flex flex-1 items-center justify-center gap-2">
            <Eye size={14} strokeWidth={1.7} className="text-cyan-300" />
            <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-300">
              Nova Live Vision
            </span>
            <Sparkles size={11} strokeWidth={1.7} className="text-cyan-300" />
          </div>

          <button
            type="button"
            onClick={resetSession}
            disabled={messages.length === 0}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold text-zinc-300 transition-colors hover:bg-white/[0.08] hover:text-zinc-100 disabled:opacity-40 disabled:hover:bg-white/[0.04] disabled:hover:text-zinc-300"
          >
            <RotateCcw size={11} strokeWidth={2} />
            Reset
          </button>
        </motion.header>

        {/* Main grid */}
        <div className="grid flex-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
          {/* Viewfinder column */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="will-change-transform"
          >
            <NovaCameraViewfinder
              ref={cameraRef}
              onReadyChange={setCameraReady}
            />
            <p className="mt-3 px-1 text-[11px] leading-relaxed text-zinc-500">
              <span className="font-bold text-zinc-300">Tip:</span> hold the page steady,
              fill the frame, and tap <span className="text-cyan-300">Snap &amp; Ask</span>.
              Nova responds Socratically — it'll guide you, not solve it.
            </p>
          </motion.div>

          {/* Chat column */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="flex min-h-[480px] flex-col rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-2xl will-change-transform"
            style={{
              boxShadow: "0 30px 80px -20px rgba(0,0,0,0.5), 0 0 0 1px rgba(34,211,238,0.06) inset",
            }}
          >
            {/* Chat history */}
            <div
              ref={chatScrollRef}
              className="flex-1 overflow-y-auto px-5 py-5"
              style={{ scrollbarWidth: "thin", maxHeight: "calc(100vh - 280px)" }}
            >
              {messages.length === 0 ? (
                <EmptyState />
              ) : (
                <div className="space-y-3">
                  <AnimatePresence initial={false}>
                    {messages.map((m) => (
                      <ChatBubble key={m.id} message={m} />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Input bar */}
            <div className="border-t border-white/10 px-4 py-3">
              {error ? (
                <p className="mb-2 text-[11px] font-semibold text-red-400">{error}</p>
              ) : null}

              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={placeholderHint}
                  rows={1}
                  className="min-h-[40px] flex-1 resize-none rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-[13px] leading-relaxed text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-white/20"
                  style={{ maxHeight: "120px" }}
                />

                {/* Voice toggle */}
                {voiceSupported ? (
                  <button
                    type="button"
                    onClick={toggleListening}
                    disabled={busy}
                    aria-label={listening ? "Stop dictation" : "Start dictation"}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] transition-colors hover:bg-white/[0.08] disabled:opacity-40"
                    style={{
                      color: listening ? "#22d3ee" : "#a1a1aa",
                      borderColor: listening ? "rgba(34,211,238,0.4)" : undefined,
                      background: listening ? "rgba(34,211,238,0.08)" : undefined,
                    }}
                  >
                    {listening ? (
                      <Mic size={15} strokeWidth={1.8} />
                    ) : (
                      <MicOff size={15} strokeWidth={1.8} />
                    )}
                  </button>
                ) : null}

                {/* TTS toggle */}
                <button
                  type="button"
                  onClick={() => setTtsEnabled((v) => !v)}
                  aria-label={ttsEnabled ? "Mute Nova's voice" : "Enable Nova's voice"}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] transition-colors hover:bg-white/[0.08]"
                  style={{
                    color: ttsEnabled ? "#a78bfa" : "#a1a1aa",
                    borderColor: ttsEnabled ? "rgba(167,139,250,0.4)" : undefined,
                    background: ttsEnabled ? "rgba(167,139,250,0.08)" : undefined,
                  }}
                >
                  {ttsEnabled ? (
                    <Volume2 size={15} strokeWidth={1.8} />
                  ) : (
                    <VolumeX size={15} strokeWidth={1.8} />
                  )}
                </button>

                {/* Snap & Ask (primary) */}
                <motion.button
                  type="button"
                  onClick={() => void send({ withSnap: true })}
                  disabled={busy || !cameraReady}
                  whileHover={busy || !cameraReady ? undefined : { scale: 1.02 }}
                  whileTap={busy || !cameraReady ? undefined : { scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 450, damping: 28 }}
                  className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-2xl px-3 text-[12px] font-bold text-black disabled:cursor-not-allowed disabled:opacity-40"
                  style={{
                    background: "linear-gradient(135deg, #22d3ee 0%, #67e8f9 100%)",
                    boxShadow: "0 0 0 1px rgba(34,211,238,0.5) inset, 0 12px 30px -10px rgba(34,211,238,0.5)",
                    willChange: "transform",
                  }}
                >
                  <Camera size={13} strokeWidth={2.2} />
                  Snap &amp; Ask
                </motion.button>

                {/* Send (text only) */}
                <motion.button
                  type="button"
                  onClick={() => void send({ withSnap: false })}
                  disabled={busy || draft.trim().length === 0}
                  whileHover={busy || draft.trim().length === 0 ? undefined : { scale: 1.02 }}
                  whileTap={busy || draft.trim().length === 0 ? undefined : { scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 450, damping: 28 }}
                  aria-label="Send text"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-zinc-100 disabled:cursor-not-allowed disabled:opacity-40"
                  style={{ willChange: "transform" }}
                >
                  <Send size={14} strokeWidth={2} />
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </main>
  );
}

/* ──────────────────────────────────────────────────────────── */
/*  Bubbles + states                                            */
/* ──────────────────────────────────────────────────────────── */

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
      style={{ willChange: "transform" }}
    >
      <div
        className={`max-w-[85%] rounded-2xl border px-4 py-2.5 text-[13.5px] leading-relaxed ${
          isUser
            ? "border-cyan-400/25 bg-cyan-500/10 text-cyan-50"
            : "border-white/10 bg-white/[0.05] text-zinc-100"
        }`}
      >
        {message.hadImage ? (
          <div className="mb-1.5 inline-flex items-center gap-1 rounded-full bg-cyan-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-300">
            <Camera size={9} strokeWidth={2.2} />
            Snapped
          </div>
        ) : null}
        {message.pending ? (
          <TypingDots />
        ) : (
          <div className="whitespace-pre-wrap break-words">{message.content}</div>
        )}
      </div>
    </motion.div>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-1.5">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-zinc-400"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18 }}
        />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex h-full flex-col items-center justify-center px-4 py-10 text-center"
    >
      <div
        className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-500/10 text-cyan-300"
        style={{ boxShadow: "0 0 32px -4px rgba(34,211,238,0.4)" }}
      >
        <Eye size={20} strokeWidth={1.7} />
      </div>
      <h2 className="bg-gradient-to-b from-zinc-100 to-zinc-500 bg-clip-text text-xl font-bold tracking-tight text-transparent">
        Show Nova your page
      </h2>
      <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-zinc-400">
        Point the camera at homework, a textbook, or your scratch work. Tap{" "}
        <span className="font-bold text-cyan-300">Snap &amp; Ask</span> and Nova will guide
        you Socratically — never just hand you the answer.
      </p>
      <div className="mt-5 grid w-full max-w-sm grid-cols-3 gap-2 text-[10px] text-zinc-500">
        <ExampleHint label="Math" hint="Show me the next step." />
        <ExampleHint label="Science" hint="What concept is this?" />
        <ExampleHint label="Essays" hint="How can I tighten this?" />
      </div>
    </motion.div>
  );
}

function ExampleHint({ label, hint }: { label: string; hint: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-2.5 py-2 text-left">
      <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-cyan-300/80">
        {label}
      </p>
      <p className="mt-1 text-[10.5px] leading-snug text-zinc-400">{hint}</p>
    </div>
  );
}
