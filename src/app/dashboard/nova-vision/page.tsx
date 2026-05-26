"use client";

/**
 * Phase 3 — Nova Live Vision: Dashboard Workspace
 *
 * Responsive split-pane interface embedded in the dashboard sidebar framework.
 * Left pane: Camera Workbench with live preview and controls.
 * Right pane: Nova Streaming AI Tutor Chat Interface.
 *
 * Midnight Glass styling: dark glassmorphism, subtle borders, neon accents.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Video, VideoOff, Send, Sparkles, Eye, ArrowLeft, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import Link from "next/link";

import { useCameraStream } from "@/lib/hooks/useCameraStream";

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

/* ──────────────────────────────────────────────────────────── */
/*  Helpers                                                     */
/* ──────────────────────────────────────────────────────────── */

function makeId() {
  return `m-${Math.random().toString(36).slice(2, 9)}-${Date.now().toString(36)}`;
}

function stripMarkdownForSpeech(text: string): string {
  return text
    .replace(/\$\$[\s\S]*?\$\$/g, "") // Remove $$...$$ LaTeX blocks
    .replace(/\$[^$]+\$/g, "") // Remove $...$ inline LaTeX
    .replace(/\*\*([^*]+)\*\*/g, "$1") // Remove **bold**
    .replace(/\*([^*]+)\*/g, "$1") // Remove *italic*
    .replace(/`([^`]+)`/g, "$1") // Remove `code`
    .replace(/```[\s\S]*?```/g, "") // Remove ```code blocks```
    .replace(/#{1,6}\s/g, "") // Remove # headers
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Remove [text](url) links
    .replace(/\n+/g, " ") // Replace newlines with spaces
    .trim();
}

/* ──────────────────────────────────────────────────────────── */
/*  Page                                                        */
/* ──────────────────────────────────────────────────────────── */

export default function NovaVisionDashboardPage() {
  const { stream, isActive, error, startCamera, stopCamera } = useCameraStream();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const streamingContentRef = useRef<string>("");

  /* ---- Sync stream to video element ------------------------- */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (stream) {
      video.srcObject = stream;
      video.play().catch(() => undefined);
    } else {
      video.srcObject = null;
    }
  }, [stream]);

  /* ---- Auto-scroll on new messages ------------------------- */
  useEffect(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages]);

  /* ---- TTS: Speak new assistant messages ------------------- */
  useEffect(() => {
    if (!isAudioEnabled) return;
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === "assistant" && !lastMessage.pending && lastMessage.content) {
      const utterance = new SpeechSynthesisUtterance(stripMarkdownForSpeech(lastMessage.content));
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  }, [messages, isAudioEnabled]);

  /* ---- SpeechRecognition voice input ----------------------- */
  const toggleListening = useCallback(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setDraft((prev) => (prev ? `${prev} ${transcript}` : transcript));
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
    setIsListening(true);
  }, [isListening]);

  /* ---- Capture frame from video ----------------------------- */
  const captureFrame = useCallback((): string | null => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return null;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    return dataUrl;
  }, []);

  /* ---- Send message ----------------------------------------- */
  const send = useCallback(
    async (opts: { withSnap: boolean }) => {
      if (busy) return;
      const text = draft.trim();
      if (!text && !opts.withSnap) return;

      let imageBase64: string | undefined;
      if (opts.withSnap) {
        const dataUrl = captureFrame();
        if (!dataUrl) {
          alert("Could not capture frame. Make sure the camera is active.");
          return;
        }
        imageBase64 = dataUrl.replace(/^data:image\/jpeg;base64,/, "");
        setCapturedImage(dataUrl);
      }

      setBusy(true);
      const userMsg: ChatMessage = {
        id: makeId(),
        role: "user",
        content: text || "(snapped a photo)",
        hadImage: opts.withSnap,
      };
      const placeholder: ChatMessage = {
        id: makeId(),
        role: "assistant",
        content: "",
        pending: true,
      };
      setMessages([...messages, userMsg, placeholder]);
      setDraft("");

      try {
        const payload = {
          messages: [
            ...messages.map((m) => ({
              role: m.role as "user" | "assistant",
              content: m.content,
            })),
            {
              role: "user" as const,
              content: text || "(snapped a photo)",
              imageBase64,
              mimeType: "image/jpeg",
            },
          ],
          conversationId,
        };

        const res = await fetch("/api/nova-vision", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Request failed" }));
          throw new Error(err.error || "Vision API error");
        }

        const data = await res.json();
        const replyText = data.message || "No response from Nova.";
        if (data.conversationId) setConversationId(data.conversationId);
        streamingContentRef.current = replyText;

        setMessages((prev) =>
          prev.map((m) =>
            m.id === placeholder.id
              ? { ...m, content: replyText, pending: false }
              : m,
          ),
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Network issue. Please try again.";
        setMessages((prev) =>
          prev.map((m) =>
            m.id === placeholder.id
              ? { ...m, content: `*${msg}*`, pending: false }
              : m,
          ),
        );
      } finally {
        setBusy(false);
        inputRef.current?.focus();
      }
    },
    [busy, draft, messages, conversationId, captureFrame],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send({ withSnap: false });
    }
  };

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
            Back to Dashboard
          </Link>

          <div className="flex flex-1 items-center justify-center gap-2">
            <Eye size={14} strokeWidth={1.7} className="text-cyan-300" />
            <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-300">
              Nova Live Vision
            </span>
            <Sparkles size={11} strokeWidth={1.7} className="text-cyan-300" />
          </div>

          <div className="w-[140px]" /> {/* Spacer for balance */}
        </motion.header>

        {/* Split-pane layout */}
        <div className="grid flex-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)]">
          {/* Left: Camera Workbench */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="will-change-transform"
          >
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/50 backdrop-blur-md">
              {/* Video preview */}
              <div className="relative aspect-video w-full bg-black">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="absolute inset-0 h-full w-full object-cover"
                />

                {/* Status overlay when inactive */}
                {!isActive && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-2 text-center">
                      <VideoOff size={28} strokeWidth={1.5} className="text-zinc-400" />
                      <p className="text-[12px] font-semibold text-zinc-300">
                        Camera is off
                      </p>
                      {error && (
                        <p className="max-w-[80%] text-[11px] text-zinc-500">{error}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Floating glass console pill */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 inline-flex items-center gap-3 rounded-full border border-white/10 bg-slate-900/60 backdrop-blur-md px-4 py-2">
                  {/* Status badge */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`relative flex h-2 w-2 ${
                        isActive ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {isActive && (
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      )}
                      <span
                        className={`relative inline-flex h-2 w-2 rounded-full ${
                          isActive ? "bg-emerald-400" : "bg-red-400"
                        }`}
                      />
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-[0.18em] ${
                        isActive ? "text-emerald-300" : "text-red-300"
                      }`}
                    >
                      {isActive ? "LIVE" : "OFFLINE"}
                    </span>
                  </div>

                  {/* Toggle button */}
                  <button
                    type="button"
                    onClick={isActive ? stopCamera : startCamera}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-[11px] font-semibold text-zinc-100 transition-colors hover:bg-white/[0.12]"
                  >
                    {isActive ? (
                      <>
                        <VideoOff size={11} strokeWidth={2} />
                        Stop
                      </>
                    ) : (
                      <>
                        <Video size={11} strokeWidth={2} />
                        Start
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Instructions */}
              <div className="border-t border-white/10 px-4 py-3">
                <p className="text-[11px] leading-relaxed text-zinc-500">
                  <span className="font-bold text-zinc-300">Tip:</span> point the camera at
                  homework or a textbook, then tap <span className="text-cyan-300">Snap &amp; Ask</span>.
                  Nova will guide you Socratically.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Right: AI Tutor Chat */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="flex min-h-[480px] flex-col rounded-3xl border border-white/10 bg-slate-900/50 backdrop-blur-md will-change-transform"
            style={{
              boxShadow: "0 30px 80px -20px rgba(0,0,0,0.5), 0 0 0 1px rgba(34,211,238,0.06) inset",
            }}
          >
            {/* Chat header with TTS toggle */}
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">
                Nova Tutor
              </span>
              <button
                type="button"
                onClick={() => setIsAudioEnabled((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-all ${
                  isAudioEnabled
                    ? "border-cyan-400/30 bg-cyan-500/10 text-cyan-300 shadow-[0_0_16px_-4px_rgba(34,211,238,0.4)]"
                    : "border-white/10 bg-white/[0.04] text-zinc-400 hover:bg-white/[0.08] hover:text-zinc-200"
                }`}
              >
                {isAudioEnabled ? <Volume2 size={12} strokeWidth={2} /> : <VolumeX size={12} strokeWidth={2} />}
                {isAudioEnabled ? "Audio On" : "Audio Off"}
              </button>
            </div>

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
              {/* Captured image preview */}
              <AnimatePresence>
                {capturedImage && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="mb-3 flex items-center gap-2"
                  >
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-black">
                      <img
                        src={capturedImage}
                        alt="Captured frame"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setCapturedImage(null)}
                      className="text-[11px] font-semibold text-zinc-400 transition-colors hover:text-zinc-200"
                    >
                      Clear
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-end gap-2">
                {/* Mic button for voice input */}
                <motion.button
                  type="button"
                  onClick={toggleListening}
                  disabled={busy}
                  whileHover={busy ? undefined : { scale: 1.02 }}
                  whileTap={busy ? undefined : { scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 450, damping: 28 }}
                  aria-label="Voice input"
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                    isListening
                      ? "border-red-400/50 bg-red-500/10 text-red-300 shadow-[0_0_20px_-4px_rgba(248,113,113,0.5)] animate-pulse"
                      : "border-white/10 bg-white/[0.06] text-zinc-400 hover:bg-white/[0.10] hover:text-zinc-200"
                  }`}
                  style={{ willChange: "transform" }}
                >
                  {isListening ? <MicOff size={14} strokeWidth={2} /> : <Mic size={14} strokeWidth={2} />}
                </motion.button>

                <textarea
                  ref={inputRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    messages.length === 0
                      ? "Ask Nova about anything you can see."
                      : "Follow-up question, or Snap to share a new view."
                  }
                  rows={1}
                  className="min-h-[40px] flex-1 resize-none rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-[13px] leading-relaxed text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-white/20"
                  style={{ maxHeight: "120px" }}
                />

                {/* Snap & Ask (primary) */}
                <motion.button
                  type="button"
                  onClick={() => void send({ withSnap: true })}
                  disabled={busy || !isActive}
                  whileHover={busy || !isActive ? undefined : { scale: 1.02 }}
                  whileTap={busy || !isActive ? undefined : { scale: 0.98 }}
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
    </motion.div>
  );
}
