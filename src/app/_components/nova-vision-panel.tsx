"use client";

/**
 * Nova Vision panel — camera workbench + tutor chat.
 * Hairline .card surfaces; lime only on primary capture action.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Video, VideoOff, Send, Sparkles, Mic, MicOff, Volume2, VolumeX, Layers } from "lucide-react";
import FlashcardDeck from "~/app/_components/flashcard-deck";

import { useCameraStream } from "@/lib/hooks/useCameraStream";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  hadImage?: boolean;
  pending?: boolean;
};

function makeId() {
  return `m-${Math.random().toString(36).slice(2, 9)}-${Date.now().toString(36)}`;
}

function stripMarkdownForSpeech(text: string): string {
  return text
    .replace(/\$\$[\s\S]*?\$\$/g, "")
    .replace(/\$[^$]+\$/g, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/#{1,6}\s/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\n+/g, " ")
    .trim();
}

export default function NovaVisionPanel() {
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
  const [flashcards, setFlashcards] = useState<Array<{ front: string; back: string }>>([]);
  const [flashcardModalOpen, setFlashcardModalOpen] = useState(false);
  const [generatingFlashcards, setGeneratingFlashcards] = useState(false);

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

  useEffect(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages]);

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

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
    setIsListening(true);
  }, [isListening]);

  const handleGenerateFlashcards = async () => {
    if (messages.length === 0) {
      alert("No conversation history to generate flashcards from.");
      return;
    }

    const chatText = messages
      .map((m) => `${m.role === "user" ? "Student" : "Nova"}: ${m.content}`)
      .join("\n\n");

    setGeneratingFlashcards(true);
    try {
      const response = await fetch("/api/flashcards/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ textContext: chatText, count: 10 }),
      });

      if (!response.ok) {
        const errBody = await response.json();
        throw new Error(errBody.error || "Failed to generate flashcards");
      }

      const data = await response.json();
      setFlashcards(data.flashcards);
      setFlashcardModalOpen(true);
    } catch (err) {
      console.error("[flashcards] Error:", err);
      alert("Failed to generate flashcards. Please try again.");
    } finally {
      setGeneratingFlashcards(false);
    }
  };

  const captureFrame = useCallback((): string | null => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return null;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.85);
  }, []);

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
            m.id === placeholder.id ? { ...m, content: replyText, pending: false } : m,
          ),
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Network issue. Please try again.";
        setMessages((prev) =>
          prev.map((m) =>
            m.id === placeholder.id ? { ...m, content: `*${msg}*`, pending: false } : m,
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

  const frameStyle = {
    borderRadius: "var(--kv-radius)",
    border: "1px solid var(--border-default)",
    background: "var(--bg-card)",
  } as const;

  return (
    <div>
      <p className="kv-meta">Camera needs permission in the browser address bar.</p>
      <p className="kv-meta" style={{ marginTop: 6 }}>Vision works best in Chrome.</p>
      {error ? (
        <p className="kv-meta" style={{ marginTop: 8, color: "var(--kv-text-primary)" }}>
          {error}
        </p>
      ) : null}

      <div className="grid flex-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)]" style={{ marginTop: 16 }}>
        <div>
          <div className="card overflow-hidden" style={frameStyle}>
            <div className="relative aspect-video w-full" style={{ background: "#000" }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 h-full w-full object-cover"
              />

              {!isActive && (
                <div
                  className="absolute inset-0 flex items-center justify-center"
                  style={{ background: "rgba(0,0,0,.7)" }}
                >
                  <div className="flex flex-col items-center gap-2 text-center">
                    <VideoOff size={28} strokeWidth={1.5} style={{ color: "var(--kv-text-tertiary)" }} />
                    <p className="kv-meta">Camera is off</p>
                    {error ? <p className="kv-meta" style={{ maxWidth: "80%" }}>{error}</p> : null}
                  </div>
                </div>
              )}

              <div
                className="absolute bottom-4 left-1/2 inline-flex -translate-x-1/2 items-center gap-3 px-3 py-2"
                style={{
                  border: "1px solid var(--border-default)",
                  borderRadius: "var(--kv-radius)",
                  background: "var(--bg-card)",
                }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="dot"
                    style={{
                      background: isActive ? "var(--kv-accent)" : "var(--kv-text-tertiary)",
                      width: 8,
                      height: 8,
                    }}
                  />
                  <span className="kv-meta">{isActive ? "LIVE" : "OFFLINE"}</span>
                </div>
                <button
                  type="button"
                  onClick={isActive ? stopCamera : startCamera}
                  className="kv-btn-ghost"
                  style={{ padding: "4px 10px", fontSize: 11 }}
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

            <div style={{ borderTop: "1px solid var(--border-default)", padding: "12px 16px" }}>
              <p className="kv-meta">
                Tip: point the camera at homework or a textbook, then tap Snap &amp; Ask. Nova will guide you Socratically.
              </p>
            </div>
          </div>
        </div>

        <div className="card flex min-h-[480px] flex-col" style={frameStyle}>
          <div
            className="flex items-center justify-between px-5 py-3"
            style={{ borderBottom: "1px solid var(--border-default)" }}
          >
            <span className="kv-meta">Nova Tutor</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleGenerateFlashcards}
                disabled={generatingFlashcards || messages.length === 0}
                className="kv-btn-ghost"
                style={{ padding: "4px 10px", fontSize: 11 }}
              >
                <Layers size={12} strokeWidth={2} className={generatingFlashcards ? "animate-spin" : ""} />
                {generatingFlashcards ? "Generating..." : "Flashcards"}
              </button>
              <button
                type="button"
                onClick={() => setIsAudioEnabled((prev) => !prev)}
                className={isAudioEnabled ? "kv-btn" : "kv-btn-ghost"}
                style={{ padding: "4px 10px", fontSize: 11 }}
              >
                {isAudioEnabled ? <Volume2 size={12} strokeWidth={2} /> : <VolumeX size={12} strokeWidth={2} />}
                {isAudioEnabled ? "Audio On" : "Audio Off"}
              </button>
            </div>
          </div>

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

          <div style={{ borderTop: "1px solid var(--border-default)", padding: "12px 16px" }}>
            <AnimatePresence>
              {capturedImage && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="mb-3 flex items-center gap-2"
                >
                  <div
                    className="relative h-16 w-16 shrink-0 overflow-hidden"
                    style={{ border: "1px solid var(--border-default)", borderRadius: "var(--kv-radius)", background: "#000" }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={capturedImage} alt="Captured frame" className="h-full w-full object-cover" />
                  </div>
                  <button type="button" onClick={() => setCapturedImage(null)} className="kv-btn-ghost" style={{ padding: "4px 8px", fontSize: 11 }}>
                    Clear
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={toggleListening}
                disabled={busy}
                aria-label="Voice input"
                className="kv-btn-ghost"
                style={{
                  height: 40,
                  width: 40,
                  padding: 0,
                  justifyContent: "center",
                  color: isListening ? "#E5484D" : undefined,
                  borderColor: isListening ? "#E5484D" : undefined,
                }}
              >
                {isListening ? <MicOff size={14} strokeWidth={2} /> : <Mic size={14} strokeWidth={2} />}
              </button>

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
                className="min-h-[40px] flex-1 resize-none px-3 py-2.5 text-[13px] leading-relaxed outline-none"
                style={{
                  maxHeight: 120,
                  border: "1px solid var(--border-default)",
                  borderRadius: "var(--kv-radius)",
                  background: "var(--bg-base)",
                  color: "var(--kv-text-primary)",
                }}
              />

              <button
                type="button"
                onClick={() => void send({ withSnap: true })}
                disabled={busy || !isActive}
                className="kv-btn"
                style={{ height: 40, padding: "0 12px", fontSize: 12 }}
              >
                <Camera size={13} strokeWidth={2.2} />
                Snap &amp; Ask
              </button>

              <button
                type="button"
                onClick={() => void send({ withSnap: false })}
                disabled={busy || draft.trim().length === 0}
                aria-label="Send text"
                className="kv-btn-ghost"
                style={{ height: 40, width: 40, padding: 0, justifyContent: "center" }}
              >
                <Send size={14} strokeWidth={2} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {flashcardModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,.6)" }}
            onClick={() => setFlashcardModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-4xl"
              onClick={(e) => e.stopPropagation()}
            >
              <FlashcardDeck flashcards={flashcards} onClose={() => setFlashcardModalOpen(false)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className="max-w-[85%] px-4 py-2.5 text-[13.5px] leading-relaxed"
        style={{
          borderRadius: "var(--kv-radius)",
          border: "1px solid var(--border-default)",
          background: isUser ? "var(--bg-elevated, var(--bg-card))" : "var(--bg-base)",
          color: "var(--kv-text-primary)",
        }}
      >
        {message.hadImage ? (
          <div className="kv-meta mb-1.5 inline-flex items-center gap-1">
            <Camera size={9} strokeWidth={2.2} />
            Snapped
          </div>
        ) : null}
        {message.pending ? <TypingDots /> : <div className="whitespace-pre-wrap break-words">{message.content}</div>}
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
          className="h-1.5 w-1.5"
          style={{ borderRadius: "var(--kv-radius)", background: "var(--kv-text-tertiary)" }}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18 }}
        />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-4 py-10 text-center">
      <Sparkles size={32} strokeWidth={1.5} style={{ color: "var(--kv-text-tertiary)", marginBottom: 12 }} />
      <p style={{ color: "var(--kv-text-primary)", fontWeight: 600, fontSize: 14 }}>Start a conversation</p>
      <p className="kv-meta" style={{ marginTop: 6 }}>Ask Nova about your homework or snap a photo</p>
    </div>
  );
}
