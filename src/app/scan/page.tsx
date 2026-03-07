"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "~/app/_components/button";
import { PageHero } from "~/app/_components/page-hero";
import { useToast } from "~/app/_components/toast";
import { preprocessHandwritingImage } from "~/lib/imagePreprocessor";

const MAX_FILE_BYTES = 15 * 1024 * 1024;
const PREFILL_STORAGE_KEY = "studyforge:prefillText";
const PREFILL_FORMAT_KEY = "studyforge:prefillFormat";

const SUBJECT_OPTIONS = [
  "Math",
  "Science",
  "English",
  "History",
  "Chemistry",
  "Physics",
  "General",
] as const;

type SubjectOption = (typeof SUBJECT_OPTIONS)[number];
type StageId = "preprocess" | "pass1" | "pass2" | "cleanup" | "done";

type StageState = {
  id: StageId;
  label: string;
  active: boolean;
  completed: boolean;
};

type ScanHistoryItem = {
  id: string;
  confidence: number;
  wordCount: number;
  subject: string | null;
  createdAt: string;
};

function confidenceBadge(confidence: number) {
  if (confidence >= 85) {
    return "border-emerald-500/50 bg-emerald-500/20 text-emerald-200";
  }

  if (confidence >= 70) {
    return "border-yellow-500/50 bg-yellow-500/20 text-yellow-200";
  }

  return "border-red-500/50 bg-red-500/20 text-red-200";
}

function estimateReadMinutes(wordCount: number) {
  return Math.max(1, Math.ceil(wordCount / 200));
}

export default function ScanPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { showToast } = useToast();

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [subject, setSubject] = useState<SubjectOption>("General");
  const [isDragging, setIsDragging] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [text, setText] = useState("");
  const [confidence, setConfidence] = useState<number | null>(null);
  const [passes, setPasses] = useState<number | null>(null);
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);
  const [savedHistoryIds, setSavedHistoryIds] = useState<Set<string>>(new Set());
  const [latestHistoryId, setLatestHistoryId] = useState<string | null>(null);

  const uploadInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?from=/scan");
    }
  }, [status, router]);

  useEffect(() => {
    const raw = localStorage.getItem("studyforge:scanSavedHistoryIds") ?? "[]";
    try {
      const parsed = JSON.parse(raw) as string[];
      setSavedHistoryIds(new Set(parsed.filter(Boolean)));
    } catch {
      setSavedHistoryIds(new Set());
    }
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;

    const loadHistory = async () => {
      const response = await fetch("/api/scan-handwriting").catch(() => null);
      if (!response?.ok) return;
      const payload = (await response.json().catch(() => ({}))) as { scans?: ScanHistoryItem[] };
      setHistory(Array.isArray(payload.scans) ? payload.scans : []);
    };

    void loadHistory();
  }, [status]);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const wordCount = useMemo(() => text.trim().split(/\s+/).filter(Boolean).length, [text]);
  const readMinutes = useMemo(() => estimateReadMinutes(wordCount), [wordCount]);

  const stages: StageState[] = [
    { id: "preprocess", label: "Preprocessing image...", active: isScanning, completed: !isScanning && confidence !== null },
    { id: "pass1", label: "Reading handwriting (Pass 1)...", active: isScanning, completed: !isScanning && confidence !== null },
    { id: "pass2", label: "Improving unclear sections (Pass 2)...", active: isScanning && (passes ?? 0) >= 3, completed: !isScanning && (passes ?? 0) >= 3 },
    { id: "cleanup", label: "Cleaning and structuring...", active: isScanning, completed: !isScanning && confidence !== null },
    { id: "done", label: "Done!", active: false, completed: confidence !== null },
  ];

  const setSavedId = (id: string) => {
    setSavedHistoryIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      localStorage.setItem("studyforge:scanSavedHistoryIds", JSON.stringify(Array.from(next)));
      return next;
    });
  };

  const validateFile = (selected: File) => {
    const accepted = /\.(png|jpe?g|webp|heic)$/i.test(selected.name) || selected.type.startsWith("image/");
    if (!accepted) {
      showToast("Please upload JPG, PNG, HEIC, or WebP image files", "error");
      return false;
    }

    if (selected.size > MAX_FILE_BYTES) {
      showToast("File is too large. Maximum size is 15MB.", "error");
      return false;
    }

    return true;
  };

  const onSelectFile = async (selected: File, autoProcess = false) => {
    if (!validateFile(selected)) return;
    setFile(selected);
    if (autoProcess) {
      await handleScan(selected);
    }
  };

  const handleScan = async (explicitFile?: File) => {
    const activeFile = explicitFile ?? file;
    if (!activeFile) {
      showToast("Select a photo to scan first", "error");
      return;
    }

    setIsScanning(true);
    setConfidence(null);
    setPasses(null);
    setLatestHistoryId(null);

    try {
      const processed = await preprocessHandwritingImage(activeFile);

      const response = await fetch("/api/scan-handwriting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: processed.base64,
          mimeType: processed.mimeType,
          subject,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        text?: string;
        confidence?: number;
        passes?: number;
        historyId?: string;
        error?: string;
      };

      if (!response.ok) {
        showToast(payload.error ?? "Failed to scan handwriting", "error");
        return;
      }

      const nextText = String(payload.text ?? "").trim();
      if (!nextText) {
        showToast("No readable text found in this image", "error");
        return;
      }

      setText(nextText);
      setConfidence(typeof payload.confidence === "number" ? payload.confidence : null);
      setPasses(typeof payload.passes === "number" ? payload.passes : null);
      setLatestHistoryId(typeof payload.historyId === "string" ? payload.historyId : null);

      const historyResponse = await fetch("/api/scan-handwriting").catch(() => null);
      if (historyResponse?.ok) {
        const historyPayload = (await historyResponse.json().catch(() => ({}))) as { scans?: ScanHistoryItem[] };
        setHistory(Array.isArray(historyPayload.scans) ? historyPayload.scans : []);
      }

      showToast("Handwriting scan completed", "success");
    } catch {
      showToast("Failed to preprocess or scan image", "error");
    } finally {
      setIsScanning(false);
    }
  };

  const handleSendToGenerator = () => {
    if (!text.trim()) return;
    sessionStorage.setItem(PREFILL_STORAGE_KEY, text.trim());
    sessionStorage.setItem(PREFILL_FORMAT_KEY, "summary");
    router.push("/generator?source=upload");
  };

  const handleSaveAsNote = async () => {
    if (!text.trim()) {
      showToast("No scanned text to save", "error");
      return;
    }

    const title = `${subject} Handwritten Scan - ${new Date().toLocaleDateString()}`;

    const response = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        content: text.trim(),
        format: "summary",
        tags: [subject, "Handwritten", "Scan"],
      }),
    }).catch(() => null);

    if (!response?.ok) {
      showToast("Failed to save note", "error");
      return;
    }

    if (latestHistoryId) {
      setSavedId(latestHistoryId);
    }

    showToast("Saved to My Notes", "success");
  };

  const handleCopy = async () => {
    if (!text.trim()) return;
    await navigator.clipboard.writeText(text);
    showToast("Copied to clipboard", "success");
  };

  const resetAll = () => {
    setFile(null);
    setText("");
    setConfidence(null);
    setPasses(null);
    setLatestHistoryId(null);
  };

  if (status === "loading") {
    return (
      <main className="app-premium-dark min-h-screen bg-gray-950 text-white">
      </main>
    );
  }

  if (!session) return null;

  return (
    <main className="app-premium-dark min-h-screen bg-gray-950 text-white">

      <div className="container mx-auto mb-[100px] max-w-6xl px-4 py-8 sm:mb-0 sm:px-6 sm:py-12">
        <PageHero
          title="Handwriting Scanner"
          description="Even the messiest notes, read perfectly"
          actions={<Button href="/upload" variant="secondary" size="sm">Back to Upload</Button>}
        />

        <section className="rounded-2xl border border-slate-700 bg-[#0d142b] p-5">
          <div
            className={`rounded-xl border-2 border-dashed p-6 text-center transition ${isDragging ? "border-blue-400 bg-blue-500/10" : "border-slate-600 bg-slate-900/60"}`}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              setIsDragging(false);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setIsDragging(false);
              const dropped = event.dataTransfer.files?.[0];
              if (dropped) {
                void onSelectFile(dropped);
              }
            }}
            onClick={() => uploadInputRef.current?.click()}
          >
            <p className="text-base font-semibold text-slate-100">Drop your photo here or click to upload</p>
            <p className="mt-2 text-sm text-slate-400">Accepts: JPG, PNG, HEIC, WebP • Max size: 15MB</p>

            <input
              ref={uploadInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/heic,.heic,.jpg,.jpeg,.png,.webp"
              className="hidden"
              onChange={(event) => {
                const selected = event.target.files?.[0];
                if (selected) {
                  void onSelectFile(selected);
                }
                event.target.value = "";
              }}
            />

            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(event) => {
                const selected = event.target.files?.[0];
                if (selected) {
                  void onSelectFile(selected, true);
                }
                event.target.value = "";
              }}
            />
          </div>

          {previewUrl && (
            <div className="mt-4">
              <p className="mb-2 text-sm text-slate-300">Preview</p>
              <img src={previewUrl} alt="Selected notes" className="max-h-80 w-full rounded-xl border border-slate-700 object-contain" />
            </div>
          )}

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <label className="md:col-span-1">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Subject</span>
              <select
                value={subject}
                onChange={(event) => setSubject(event.target.value as SubjectOption)}
                className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white"
              >
                {SUBJECT_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>

            <div className="md:col-span-2 flex flex-wrap items-end gap-2">
              <Button onClick={() => void handleScan()} loading={isScanning} disabled={isScanning || !file}>
                Scan My Notes
              </Button>
              <Button onClick={() => cameraInputRef.current?.click()} variant="secondary">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M3 7.5h4.2l1.3-2h6.9l1.3 2H21v10.8A1.7 1.7 0 0119.3 20H4.7A1.7 1.7 0 013 18.3V7.5z" /><circle cx="12" cy="13" r="3.2" strokeWidth="1.8" /></svg>
                Take Photo
              </Button>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-slate-700 bg-slate-900/60 p-4">
            <p className="text-sm font-semibold text-slate-200">Tips for best results:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">
              <li>Good lighting helps</li>
              <li>Hold camera steady</li>
              <li>Include the whole page</li>
              <li>Works even with very messy handwriting</li>
            </ul>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-700 bg-[#0d142b] p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Processing Stages</h2>
          <div className="mt-3 space-y-2">
            {stages.map((stage) => (
              <div key={stage.id} className="flex items-center gap-3 text-sm">
                {stage.completed ? (
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">✓</span>
                ) : stage.active ? (
                  <span className="inline-flex h-5 w-5 items-center justify-center">
                    <svg className="h-4 w-4 animate-spin text-blue-300" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" /></svg>
                  </span>
                ) : (
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-600 text-slate-500">•</span>
                )}
                <span className={stage.active ? "text-blue-200" : stage.completed ? "text-emerald-200" : "text-slate-400"}>{stage.label}</span>
              </div>
            ))}
          </div>
        </section>

        {text.trim() && (
          <section className="mt-6 rounded-2xl border border-slate-700 bg-[#0d142b] p-5">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {confidence !== null && (
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${confidenceBadge(confidence)}`}>
                  {confidence}% accuracy
                </span>
              )}
              {passes !== null && (
                <span className="rounded-full border border-slate-600 bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-200">
                  {passes} passes used
                </span>
              )}
              <span className="text-xs text-slate-400">{wordCount.toLocaleString()} words • {readMinutes} min read</span>
            </div>

            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              className="h-80 w-full resize-none rounded-lg border border-slate-600 bg-slate-950 p-4 text-sm text-slate-100"
            />

            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={handleSendToGenerator}>Send to Generator</Button>
              <Button onClick={() => void handleSaveAsNote()} variant="secondary">Save as Note</Button>
              <Button onClick={() => void handleCopy()} variant="secondary">Copy Text</Button>
              <Button onClick={resetAll} variant="secondary">Scan Another</Button>
            </div>
          </section>
        )}

        <section className="mt-6 rounded-2xl border border-slate-700 bg-[#0d142b] p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Recent Scans</h2>
          {history.length === 0 ? (
            <p className="mt-3 text-sm text-slate-400">No scan history yet.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {history.map((item) => {
                const canView = savedHistoryIds.has(item.id);
                return (
                  <div key={item.id} className="rounded-lg border border-slate-700 bg-slate-900/60 p-3 text-sm text-slate-200">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p>{new Date(item.createdAt).toLocaleString()}</p>
                      <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${confidenceBadge(item.confidence)}`}>
                        {item.confidence}%
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">{item.subject || "General"} • {item.wordCount} words</p>
                    {canView ? (
                      <a href="/my-notes" className="mt-2 inline-block text-xs font-semibold text-blue-300 hover:text-blue-200">View in My Notes →</a>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

