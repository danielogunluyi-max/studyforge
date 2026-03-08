"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { trackNovaEvent } from "@/lib/novaClient";

type NoteType = "summary" | "detailed" | "flashcards" | "quiz";
type InputMode = "record" | "upload";

type TranscribeResponse = {
  transcript?: string;
  segments?: Array<{ start: number; end: number; text: string }>;
  duration?: number;
  error?: string;
};

type GenerateResponse = {
  title?: string;
  content?: string;
  error?: string;
};

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const MAX_RECORDING_SECONDS = 600;
const RECORDING_WARNING_SECONDS = 590;

function formatSeconds(total: number) {
  const safe = Math.max(0, Math.floor(total));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function formatDuration(total: number) {
  const safe = Math.max(0, Math.floor(total));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function readableBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AudioPage() {
  const router = useRouter();

  const [mode, setMode] = useState<InputMode>("record");
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [transcriptError, setTranscriptError] = useState("");
  const [subject, setSubject] = useState("");
  const [noteType, setNoteType] = useState<NoteType>("summary");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedTitle, setGeneratedTitle] = useState("");
  const [generatedContent, setGeneratedContent] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

  const [audioDuration, setAudioDuration] = useState<number | null>(null);
  const [recordWarning, setRecordWarning] = useState("");
  const [copyButtonText, setCopyButtonText] = useState("📋 Copy");

  const audioUrlRef = useRef<string | null>(null);
  const recordingIntervalRef = useRef<number | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const canTranscribe = Boolean(audioBlob || uploadedFile);

  const transcriptWordCount = useMemo(() => {
    const words = transcript.trim().split(/\s+/).filter(Boolean).length;
    return words;
  }, [transcript]);

  const transcriptReadMinutes = useMemo(() => {
    if (transcriptWordCount === 0) return 0;
    return Math.max(1, Math.round(transcriptWordCount / 180));
  }, [transcriptWordCount]);

  const generatedWordCount = useMemo(() => {
    return generatedContent.trim().split(/\s+/).filter(Boolean).length;
  }, [generatedContent]);

  const stepItems = [
    { key: 1, label: "Record or Upload" },
    { key: 2, label: "Review Transcript" },
    { key: 3, label: "Generate Notes" },
  ] as const;

  const drawWaveform = () => {
    const analyser = analyserRef.current;
    const canvas = canvasRef.current;
    if (!analyser || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyser.fftSize;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      analyser.getByteTimeDomainData(dataArray);
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const dpr = window.devicePixelRatio || 1;

      if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const barCount = 48;
      const barWidth = width / barCount;
      for (let i = 0; i < barCount; i += 1) {
        const dataIndex = Math.floor((i / barCount) * bufferLength);
        const sample = dataArray[dataIndex] ?? 128;
        const normalized = Math.abs((sample - 128) / 128);
        const barHeight = Math.max(2, normalized * (height * 0.9));
        const x = i * barWidth + 1;
        const y = (height - barHeight) / 2;

        ctx.fillStyle = "var(--accent-blue)";
        ctx.fillRect(x, y, Math.max(1, barWidth - 2), barHeight);
      }

      animFrameRef.current = window.requestAnimationFrame(render);
    };

    animFrameRef.current = window.requestAnimationFrame(render);
  };

  const stopRecordingTracks = () => {
    if (recordingIntervalRef.current) {
      window.clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }

    if (animFrameRef.current) {
      window.cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = 0;
    }

    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;

    if (audioContextRef.current) {
      void audioContextRef.current.close();
      audioContextRef.current = null;
    }

    analyserRef.current = null;
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const startRecording = async () => {
    setTranscriptError("");
    setRecordWarning("");

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setTranscriptError("Recording is not supported in this browser.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const audioCtx = new AudioContext();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        chunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setUploadedFile(null);
        stopRecordingTracks();
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      setAudioBlob(null);
      setStep(1);
      drawWaveform();

      recordingIntervalRef.current = window.setInterval(() => {
        setRecordingTime((prev) => {
          const next = prev + 1;
          if (next >= RECORDING_WARNING_SECONDS && next < MAX_RECORDING_SECONDS) {
            setRecordWarning("Approaching max recording length. Auto-stop at 10:00.");
          }
          if (next >= MAX_RECORDING_SECONDS) {
            setRecordWarning("Maximum recording length reached. Recording stopped.");
            stopRecording();
            return MAX_RECORDING_SECONDS;
          }
          return next;
        });
      }, 1000);
    } catch (error) {
      const err = error as { name?: string };
      if (err?.name === "NotAllowedError") {
        setTranscriptError("Microphone access denied. Please allow microphone access in your browser settings.");
      } else {
        setTranscriptError("Unable to start recording. Please try again.");
      }
      stopRecordingTracks();
      setIsRecording(false);
    }
  };

  const handleFileSelect = (file: File | null) => {
    setTranscriptError("");
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      setTranscriptError("File too large. Maximum size is 25MB.");
      return;
    }

    if (!file.type.startsWith("audio/")) {
      setTranscriptError("Please upload a valid audio file.");
      return;
    }

    setUploadedFile(file);
    setAudioBlob(null);
    setStep(1);
  };

  const handleTranscribe = async () => {
    if (!canTranscribe) return;

    setIsTranscribing(true);
    setTranscriptError("");
    setTranscript("");
    setAudioDuration(null);

    try {
      const formData = new FormData();
      const file =
        uploadedFile ||
        new File([audioBlob as Blob], "recording.webm", { type: "audio/webm" });

      formData.append("audio", file);

      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as TranscribeResponse;
      if (!response.ok || data.error) {
        setTranscriptError(data.error ?? "Transcription failed. Please try again or check your audio file.");
        return;
      }

      setTranscript(String(data.transcript ?? ""));
      setAudioDuration(typeof data.duration === "number" ? data.duration : null);
      setStep(2);
    } catch {
      setTranscriptError("Transcription failed. Please try again or check your audio file.");
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleGenerate = async () => {
    if (!transcript.trim() || !subject.trim()) {
      setTranscriptError("Please enter subject and transcript before generating notes.");
      return;
    }

    setIsGenerating(true);
    setTranscriptError("");
    setGeneratedContent("");
    setGeneratedTitle("");
    setIsSaved(false);
    setStep(3);

    try {
      const response = await fetch("/api/audio-to-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript,
          subject,
          noteType,
        }),
      });

      const data = (await response.json()) as GenerateResponse;
      if (!response.ok || data.error) {
        setTranscriptError(data.error ?? "Failed to generate notes.");
        return;
      }

      setGeneratedTitle(String(data.title ?? "Lecture Notes"));
      setGeneratedContent(String(data.content ?? ""));
      trackNovaEvent("AUDIO_CONVERTED");
    } catch {
      setTranscriptError("Failed to generate notes.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!generatedContent.trim()) return;

    try {
      const response = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: generatedTitle || "Audio Lecture Notes",
          content: generatedContent,
          format: noteType,
          tags: [subject].filter(Boolean),
        }),
      });

      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setTranscriptError(data.error ?? "Failed to save notes.");
        return;
      }

      setIsSaved(true);
    } catch {
      setTranscriptError("Failed to save notes.");
    }
  };

  const handleCopy = async () => {
    if (!generatedContent.trim()) return;

    try {
      await navigator.clipboard.writeText(generatedContent);
      setCopyButtonText("✓ Copied!");
      window.setTimeout(() => setCopyButtonText("📋 Copy"), 2000);
    } catch {
      setTranscriptError("Failed to copy notes.");
    }
  };

  const handleOpenInGenerator = () => {
    try {
      localStorage.setItem(
        "generator_prefill",
        JSON.stringify({
          text: transcript,
          source: "audio",
          format: noteType,
        }),
      );
    } catch {
      // Ignore storage errors.
    }
    router.push("/generator");
  };

  useEffect(() => {
    return () => {
      stopRecordingTracks();
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }
    };
  }, []);

  const audioPreviewUrl = useMemo(() => {
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }

    if (uploadedFile) {
      const url = URL.createObjectURL(uploadedFile);
      audioUrlRef.current = url;
      return url;
    }

    if (audioBlob) {
      const url = URL.createObjectURL(audioBlob);
      audioUrlRef.current = url;
      return url;
    }

    return "";
  }, [audioBlob, uploadedFile]);

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg-base)", color: "var(--text-primary)", padding: "28px 16px 100px" }}>
      <div style={{ maxWidth: 1240, margin: "0 auto" }}>
        <div style={{ marginBottom: "32px" }}>
          <h1 className="text-title">Audio to Notes 🎙️</h1>
          <p className="text-body" style={{ color: "var(--text-secondary)", marginTop: "4px" }}>
            Record a lecture or upload audio — get instant study notes
          </p>
        </div>

        <div className="audio-layout">
          <section className="card" style={{ padding: 20 }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
              {stepItems.map((item) => {
                const completed = step > item.key;
                const active = step === item.key;
                return (
                  <div key={item.key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "999px",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 13,
                        fontWeight: 700,
                        background: active ? "var(--accent-blue)" : completed ? "var(--accent-green)" : "var(--bg-elevated)",
                        color: active || completed ? "#fff" : "var(--text-muted)",
                      }}
                    >
                      {completed ? "✓" : item.key}
                    </span>
                    <span style={{ fontSize: 13, color: active ? "var(--text-primary)" : "var(--text-secondary)" }}>{item.label}</span>
                  </div>
                );
              })}
            </div>

            <div
              style={{
                display: "inline-flex",
                gap: 4,
                background: "var(--bg-elevated)",
                padding: 4,
                borderRadius: 10,
                marginBottom: 16,
              }}
            >
              {([
                { value: "record", label: "🎙️ Record" },
                { value: "upload", label: "📁 Upload" },
              ] as const).map((item) => {
                const active = mode === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => {
                      setMode(item.value);
                      setTranscriptError("");
                    }}
                    style={{
                      border: "none",
                      borderRadius: 8,
                      padding: "8px 20px",
                      fontWeight: 600,
                      background: active ? "var(--accent-blue)" : "transparent",
                      color: active ? "#fff" : "var(--text-muted)",
                      cursor: "pointer",
                    }}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            {mode === "record" ? (
              <div className="card" style={{ padding: 16, background: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => {
                      if (isRecording) {
                        stopRecording();
                      } else {
                        void startRecording();
                      }
                    }}
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: "50%",
                      border: "none",
                      background: "var(--accent-red)",
                      color: "#fff",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      animation: isRecording ? "pulse-ring 1.8s infinite" : "none",
                      boxShadow: "0 0 0 0 rgba(239,68,68,0.4)",
                    }}
                  >
                    {isRecording ? (
                      <span style={{ width: 24, height: 24, background: "#fff", borderRadius: 4, display: "inline-block" }} />
                    ) : (
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                        <line x1="12" y1="19" x2="12" y2="23" />
                        <line x1="8" y1="23" x2="16" y2="23" />
                      </svg>
                    )}
                  </button>

                  <p style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{formatSeconds(recordingTime)}</p>
                  {recordWarning && <p style={{ margin: 0, color: "var(--accent-red)", fontSize: 12 }}>{recordWarning}</p>}

                  <canvas
                    ref={canvasRef}
                    width={600}
                    height={60}
                    style={{
                      width: "100%",
                      height: 60,
                      borderRadius: 10,
                      border: "1px solid var(--border-default)",
                      background: "var(--bg-card)",
                    }}
                  />

                  {audioPreviewUrl && (
                    <audio controls src={audioPreviewUrl} style={{ width: "100%", marginTop: 8 }} />
                  )}
                </div>
              </div>
            ) : (
              <div
                role="button"
                tabIndex={0}
                onClick={() => {
                  const input = document.getElementById("audio-upload-input") as HTMLInputElement | null;
                  input?.click();
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    const input = document.getElementById("audio-upload-input") as HTMLInputElement | null;
                    input?.click();
                  }
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => {
                  setIsDragOver(false);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  setIsDragOver(false);
                  const file = event.dataTransfer.files?.[0] ?? null;
                  handleFileSelect(file);
                }}
                style={{
                  border: "2px dashed var(--border-strong)",
                  borderRadius: "12px",
                  padding: "40px 24px",
                  textAlign: "center",
                  cursor: "pointer",
                  background: isDragOver ? "var(--bg-hover)" : "var(--bg-elevated)",
                  transition: "all 0.2s ease",
                }}
              >
                <input
                  id="audio-upload-input"
                  type="file"
                  accept="audio/*"
                  onChange={(event) => {
                    handleFileSelect(event.target.files?.[0] ?? null);
                  }}
                  style={{ display: "none" }}
                />
                <div style={{ fontSize: 40, marginBottom: 10 }}>🎵</div>
                <p style={{ margin: 0, color: "var(--text-primary)", fontWeight: 600 }}>Drop audio file here or click to browse</p>
                <p style={{ margin: "8px 0 0", color: "var(--text-secondary)", fontSize: 12 }}>Supported: MP3, MP4, WAV, M4A, WEBM, OGG</p>
                <p style={{ margin: "4px 0 0", color: "var(--text-muted)", fontSize: 12 }}>Max size: 25MB</p>

                {uploadedFile && (
                  <div style={{ marginTop: 14 }}>
                    <p style={{ margin: 0, color: "var(--text-primary)", fontSize: 13 }}>{uploadedFile.name}</p>
                    <p style={{ margin: "4px 0 0", color: "var(--text-secondary)", fontSize: 12 }}>{readableBytes(uploadedFile.size)}</p>
                    {audioPreviewUrl && <audio controls src={audioPreviewUrl} style={{ width: "100%", marginTop: 8 }} />}
                  </div>
                )}
              </div>
            )}

            {canTranscribe && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  void handleTranscribe();
                }}
                disabled={isTranscribing}
                style={{ width: "100%", marginTop: 14, justifyContent: "center" }}
              >
                Transcribe Audio →
              </button>
            )}

            {isTranscribing && (
              <div className="card" style={{ marginTop: 16, padding: 14, border: "1px solid var(--border-default)", background: "var(--bg-elevated)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <span
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      border: "2px solid var(--border-strong)",
                      borderTopColor: "var(--accent-blue)",
                      animation: "spin 0.8s linear infinite",
                    }}
                  />
                  <p style={{ margin: 0 }}>Transcribing audio with Whisper AI...</p>
                </div>
                <p style={{ margin: "0 0 10px", color: "var(--text-secondary)", fontSize: 12 }}>This usually takes 10-30 seconds</p>
                <div style={{ display: "grid", gap: 8 }}>
                  <div className="skeleton" style={{ height: 12, borderRadius: 6 }} />
                  <div className="skeleton" style={{ height: 12, borderRadius: 6, width: "92%" }} />
                  <div className="skeleton" style={{ height: 12, borderRadius: 6, width: "84%" }} />
                </div>
              </div>
            )}

            {transcriptError && (
              <div className="card" style={{ marginTop: 16, border: "1px solid var(--accent-red)", padding: 14, background: "rgba(239, 68, 68, 0.08)" }}>
                <p style={{ margin: 0, color: "var(--accent-red)", fontWeight: 600 }}>
                  {transcriptError.includes("Microphone access denied")
                    ? transcriptError
                    : "Transcription failed. Please try again or check your audio file."}
                </p>
                {!isTranscribing && (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => {
                      void handleTranscribe();
                    }}
                    style={{ marginTop: 10 }}
                  >
                    Retry
                  </button>
                )}
              </div>
            )}

            {transcript && (
              <div className="card" style={{ marginTop: 16, padding: 14, border: "1px solid var(--border-default)", background: "var(--bg-elevated)" }}>
                <h3 style={{ margin: "0 0 10px", fontSize: 16 }}>Review Transcript</h3>
                <textarea
                  className="textarea"
                  value={transcript}
                  onChange={(event) => setTranscript(event.target.value)}
                  style={{ width: "100%", minHeight: 200 }}
                />
                <p style={{ margin: "8px 0 0", color: "var(--text-secondary)", fontSize: 12 }}>
                  ~{transcriptWordCount} words • ~{transcriptReadMinutes} min read
                </p>
                {audioDuration !== null && (
                  <p style={{ margin: "4px 0 0", color: "var(--text-secondary)", fontSize: 12 }}>
                    Audio duration: {formatDuration(audioDuration)}
                  </p>
                )}

                <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <input
                    className="input"
                    value={subject}
                    onChange={(event) => setSubject(event.target.value)}
                    placeholder="e.g. Biology, Math, History"
                  />
                  <select
                    value={noteType}
                    onChange={(event) => setNoteType(event.target.value as NoteType)}
                    className="input"
                    style={{ appearance: "none", cursor: "pointer" }}
                  >
                    <option value="summary">Summary</option>
                    <option value="detailed">Detailed Notes</option>
                    <option value="flashcards">Flashcards</option>
                    <option value="quiz">Quiz</option>
                  </select>
                </div>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    void handleGenerate();
                  }}
                  disabled={isGenerating}
                  style={{ width: "100%", marginTop: 12, justifyContent: "center" }}
                >
                  {isGenerating ? "Generating notes from transcript..." : "Generate Notes"}
                </button>
              </div>
            )}
          </section>

          <section>
            {!generatedContent && !isGenerating ? (
              <div className="card" style={{ padding: "48px 24px", textAlign: "center", minHeight: "400px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>📝</div>
                <p style={{ color: "var(--text-secondary)" }}>Your generated notes will appear here</p>
              </div>
            ) : isGenerating ? (
              <div className="card" style={{ padding: 20, minHeight: 400 }}>
                <div style={{ display: "grid", gap: 10 }}>
                  <div className="skeleton" style={{ height: 20, borderRadius: 8, width: "70%" }} />
                  <div className="skeleton" style={{ height: 12, borderRadius: 6 }} />
                  <div className="skeleton" style={{ height: 12, borderRadius: 6, width: "92%" }} />
                  <div className="skeleton" style={{ height: 12, borderRadius: 6, width: "86%" }} />
                  <div className="skeleton" style={{ height: 12, borderRadius: 6, width: "78%" }} />
                </div>
              </div>
            ) : (
              <div className="card" style={{ padding: 16, minHeight: 400, display: "flex", flexDirection: "column", gap: 12 }}>
                <input
                  className="input"
                  value={generatedTitle}
                  onChange={(event) => setGeneratedTitle(event.target.value)}
                />

                <span className="badge badge-blue" style={{ alignSelf: "flex-start" }}>
                  {generatedWordCount} words
                </span>

                <pre
                  style={{
                    margin: 0,
                    whiteSpace: "pre-wrap",
                    fontFamily: "inherit",
                    color: "var(--text-primary)",
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border-default)",
                    borderRadius: 12,
                    padding: 14,
                    maxHeight: 420,
                    overflow: "auto",
                  }}
                >
                  {generatedContent}
                </pre>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <button type="button" className="btn btn-primary" onClick={() => void handleSave()}>
                    💾 Save to Notes
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => void handleCopy()}>
                    {copyButtonText}
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={handleOpenInGenerator}>
                    ⚡ Open in Generator
                  </button>
                </div>

                {isSaved && (
                  <div className="animate-fade-in-up" style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--accent-green)", fontWeight: 600 }}>
                    <span>✓</span>
                    <span>Saved to My Notes!</span>
                    <Link href="/my-notes" style={{ color: "var(--accent-green)", textDecoration: "underline" }}>
                      View it →
                    </Link>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>

      <style jsx>{`
        .audio-layout {
          display: grid;
          grid-template-columns: 1fr;
          gap: 24px;
        }

        @media (min-width: 1024px) {
          .audio-layout {
            grid-template-columns: 1fr 1fr;
          }
        }

        @keyframes pulse-ring {
          0% { box-shadow: 0 0 0 0 rgba(239,68,68,0.4); }
          70% { box-shadow: 0 0 0 20px rgba(239,68,68,0); }
          100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  );
}
