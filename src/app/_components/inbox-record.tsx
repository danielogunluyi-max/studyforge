"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { trackNovaEvent } from "@/lib/novaClient";
import { SendToPanel } from "~/app/_components/send-to-panel";

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

export function InboxRecord() {
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
  const [generatedNoteId, setGeneratedNoteId] = useState("");
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

        ctx.fillStyle = "var(--kv-accent)";
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
        new File([audioBlob!], "recording.webm", { type: "audio/webm" });

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
    setGeneratedNoteId("");
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
      setGeneratedNoteId("");
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
          tags: [subject, "Inbox"].filter(Boolean),
        }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        note?: { id?: string };
        error?: string;
      };
      if (!response.ok) {
        setTranscriptError(data.error ?? "Failed to save notes.");
        return;
      }

      setGeneratedNoteId(data.note?.id ?? "");
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

  useEffect(() => {
    if (!isSaved) return;

    const timer = window.setTimeout(() => setIsSaved(false), 3000);
    return () => window.clearTimeout(timer);
  }, [isSaved]);

  return (
    <div style={{ padding: "18px 0 24px" }}>
      <p className="kv-meta">Record</p>
      <p className="kv-sub" style={{ marginTop: 8 }}>Record a lecture or upload audio.</p>

      <div className="mt-[18px] grid gap-6 lg:grid-cols-2">
        <section>
          <p className="kv-meta" style={{ marginBottom: 16 }}>
            {stepItems.map((item, index) => (
              <span key={item.key} style={{ color: step === item.key ? "var(--kv-text-primary)" : undefined }}>
                {index > 0 ? " · " : ""}
                {item.key} {item.label}
              </span>
            ))}
          </p>

          <div className="kv-tabs" style={{ marginBottom: 16 }}>
            {([
              { value: "record", label: "Record" },
              { value: "upload", label: "Upload" },
            ] as const).map((item) => (
              <button
                key={item.value}
                type="button"
                className={mode === item.value ? "kv-tab on" : "kv-tab"}
                onClick={() => {
                  setMode(item.value);
                  setTranscriptError("");
                }}
              >
                {item.label}
              </button>
            ))}
          </div>

          {mode === "record" ? (
            <div style={{ padding: 16, border: "1px solid var(--border-default)", borderRadius: "var(--kv-radius)" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                <button
                  type="button"
                  className={isRecording ? "kv-btn-danger" : "kv-btn"}
                  onClick={() => {
                    if (isRecording) {
                      stopRecording();
                    } else {
                      void startRecording();
                    }
                  }}
                >
                  {isRecording ? "Stop" : "Start recording"}
                </button>

                <p className="num" style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>{formatSeconds(recordingTime)}</p>
                {recordWarning ? (
                  <p style={{ margin: 0, color: "var(--kv-text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="kv-chip kv-chip-stale">Limit</span>
                    {recordWarning}
                  </p>
                ) : null}

                <canvas
                  ref={canvasRef}
                  width={600}
                  height={60}
                  style={{
                    width: "100%",
                    height: 60,
                    borderRadius: "var(--kv-radius)",
                    border: "1px solid var(--border-default)",
                    background: "var(--bg-card)",
                  }}
                />

                {audioPreviewUrl ? (
                  <audio controls src={audioPreviewUrl} style={{ width: "100%", marginTop: 8 }} />
                ) : null}
              </div>
            </div>
          ) : (
            <div
              role="button"
              tabIndex={0}
              className={`kv-dropzone${isDragOver ? " is-drag" : ""}`}
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
              style={{ padding: "40px 24px", textAlign: "center", cursor: "pointer" }}
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
              <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "var(--kv-text-primary)" }}>
                Drop audio file here or click to browse
              </p>
              <p className="kv-meta" style={{ marginTop: 8 }}>MP3 · MP4 · WAV · M4A · WEBM · OGG</p>
              <p className="kv-meta" style={{ marginTop: 4 }}>Max 25MB</p>

              {uploadedFile ? (
                <div style={{ marginTop: 14 }}>
                  <p className="kv-row-title">{uploadedFile.name}</p>
                  <p className="kv-meta num" style={{ marginTop: 4 }}>{readableBytes(uploadedFile.size)}</p>
                  {audioPreviewUrl ? <audio controls src={audioPreviewUrl} style={{ width: "100%", marginTop: 8 }} /> : null}
                </div>
              ) : null}
            </div>
          )}

          {canTranscribe ? (
            <button
              type="button"
              className="kv-btn"
              onClick={() => {
                void handleTranscribe();
              }}
              disabled={isTranscribing}
              style={{ width: "100%", marginTop: 14, justifyContent: "center" }}
            >
              Transcribe Audio →
            </button>
          ) : null}

          {isTranscribing ? (
            <p className="kv-meta" style={{ marginTop: 16 }}>
              <span className="dot" style={{ marginRight: 8 }} />
              Transcribing audio…
            </p>
          ) : null}

          {transcriptError ? (
            <div style={{ marginTop: 16 }}>
              <p style={{ margin: 0, color: "var(--kv-text-primary)", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span className="kv-chip kv-chip-stale">Error</span>
                {transcriptError.includes("Microphone access denied")
                  ? transcriptError
                  : "Transcription failed. Please try again or check your audio file."}
              </p>
              {!isTranscribing ? (
                <button
                  type="button"
                  className="kv-btn-ghost"
                  onClick={() => {
                    void handleTranscribe();
                  }}
                  style={{ marginTop: 10 }}
                >
                  Retry
                </button>
              ) : null}
            </div>
          ) : null}

          {transcript ? (
            <div style={{ marginTop: 16 }}>
              <p className="kv-meta" style={{ marginBottom: 10 }}>Review Transcript</p>
              <textarea
                className="kv-field"
                value={transcript}
                onChange={(event) => setTranscript(event.target.value)}
                style={{ minHeight: 200, resize: "vertical" }}
              />
              <p className="kv-meta num" style={{ marginTop: 8 }}>
                {transcriptWordCount} words · {transcriptReadMinutes} min read
              </p>
              {audioDuration !== null ? (
                <p className="kv-meta num" style={{ marginTop: 4 }}>
                  Audio duration: {formatDuration(audioDuration)}
                </p>
              ) : null}

              <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label className="kv-meta" style={{ display: "block", marginBottom: 8 }}>Subject</label>
                  <input
                    className="kv-field"
                    value={subject}
                    onChange={(event) => setSubject(event.target.value)}
                    placeholder="e.g. Biology, Math, History"
                  />
                </div>
                <div>
                  <label className="kv-meta" style={{ display: "block", marginBottom: 8 }}>Note type</label>
                  <select
                    value={noteType}
                    onChange={(event) => setNoteType(event.target.value as NoteType)}
                    className="kv-field"
                    style={{ appearance: "none", cursor: "pointer" }}
                  >
                    <option value="summary">Summary</option>
                    <option value="detailed">Detailed Notes</option>
                    <option value="flashcards">Flashcards</option>
                    <option value="quiz">Quiz</option>
                  </select>
                </div>
              </div>

              <button
                type="button"
                className="kv-btn"
                onClick={() => {
                  void handleGenerate();
                }}
                disabled={isGenerating}
                style={{ width: "100%", marginTop: 12, justifyContent: "center" }}
              >
                {isGenerating ? "Generating notes from transcript..." : "Generate Notes"}
              </button>
            </div>
          ) : null}
        </section>

        <section>
          {!generatedContent && !isGenerating ? (
            <p className="kv-sub">Your generated notes will appear here</p>
          ) : isGenerating ? (
            <p className="kv-meta">
              <span className="dot" style={{ marginRight: 8 }} />
              Generating notes…
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input
                className="kv-field"
                value={generatedTitle}
                onChange={(event) => setGeneratedTitle(event.target.value)}
              />

              <span className="kv-chip num" style={{ alignSelf: "flex-start" }}>
                {generatedWordCount} words
              </span>

              <pre
                style={{
                  margin: 0,
                  whiteSpace: "pre-wrap",
                  fontFamily: "inherit",
                  color: "var(--kv-text-primary)",
                  border: "1px solid var(--border-default)",
                  borderRadius: "var(--kv-radius)",
                  padding: 14,
                  maxHeight: 420,
                  overflow: "auto",
                }}
              >
                {generatedContent}
              </pre>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
                <button type="button" className="kv-btn" onClick={() => void handleSave()} style={{ justifyContent: "center" }}>
                  Save to Notes
                </button>
                <button type="button" className="kv-btn-ghost" onClick={() => void handleCopy()} style={{ justifyContent: "center" }}>
                  {copyButtonText}
                </button>
                <button type="button" className="kv-btn-ghost" onClick={handleOpenInGenerator} style={{ justifyContent: "center" }}>
                  Open in Generator
                </button>
              </div>

              <SendToPanel
                contentType="note"
                contentId={generatedNoteId}
                title={generatedTitle || "Audio Lecture Notes"}
                content={generatedContent}
              />

              {isSaved ? (
                <p style={{ margin: 0, color: "var(--kv-accent-text)", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  Saved to My Notes!
                  <Link href="/my-notes" className="kv-btn-ghost">View it →</Link>
                </p>
              ) : null}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
