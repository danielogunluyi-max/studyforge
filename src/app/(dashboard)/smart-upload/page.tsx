"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { OntarioCourseField, subjectFromCourseCode } from "~/app/_components/ontario-course-field";
import { InboxClassroom } from "~/app/_components/inbox-classroom";
import { InboxLecture } from "~/app/_components/inbox-lecture";
import { InboxQuizlet } from "~/app/_components/inbox-quizlet";
import { InboxRecord } from "~/app/_components/inbox-record";
import {
  countWords,
  detectInboxInput,
  formatCount,
  sniffPdfPageCount,
  type InboxDetection,
  type InboxKind,
} from "~/lib/inbox-detect";
import {
  clearInboxResume,
  readInboxResume,
  stageLabel,
  writeInboxResume,
  type InboxResumeState,
  type InboxStage,
} from "~/lib/inbox-resume";
import { inboxHref, parseInboxTab, type InboxTab } from "~/lib/inbox-tab";
import { extractYouTubeVideoId, useYouTubeTranscript } from "~/lib/hooks/useYouTubeTranscript";
import { preprocessHandwritingImage } from "~/lib/imagePreprocessor";
import { CAPTURE_INBOX_KEY, consumeCaptureHandoff, readStudyProfile } from "~/lib/capture-handoff";
import { detectDeviceClass, type DeviceClass } from "~/lib/device-class";
import { dataUrlToFile } from "~/lib/capture-stitch";
import { fileToDataUrl, persistCapture } from "~/lib/persist-capture";
import { formatTorontoDateTime } from "~/lib/toronto-time";
import { tutorHref } from "~/lib/tutor-mode";

type Preview = {
  title: string;
  notes: string;
  noteId?: string | null;
  kind: InboxKind;
  hint?: string | null;
};

type HistoryItem = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  tags?: string[];
};

const TABS: { id: InboxTab; label: string }[] = [
  { id: "inbox", label: "Inbox" },
  { id: "record", label: "Record" },
  { id: "lecture", label: "Lecture" },
  { id: "classroom", label: "Classroom" },
  { id: "quizlet", label: "Quizlet" },
];

const STAGES: InboxStage[] = ["uploading", "reading", "structuring", "ready"];

function courseChipFromTags(tags: string[] | undefined): string | null {
  if (!tags?.length) return null;
  const code = tags.find((tag) => /^[A-Z]{3,4}\d[A-Z]$/i.test(tag.trim()));
  return code ? code.trim().toUpperCase() : null;
}

function followUpHref(
  path: "flashcards" | "mock-exam" | "tutor" | "listen",
  noteId: string,
  course: string,
): string {
  const code = course.trim().toUpperCase();
  if (path === "flashcards") {
    const q = new URLSearchParams({ generateFrom: noteId });
    if (code) q.set("course", code);
    return `/flashcards?${q}`;
  }
  if (path === "mock-exam") {
    const q = new URLSearchParams({ noteId });
    if (code) q.set("course", code);
    return `/mock-exam?${q}`;
  }
  if (path === "tutor") {
    return tutorHref("chat", { noteId }) + (code ? `&course=${encodeURIComponent(code)}` : "");
  }
  return `/listen/${encodeURIComponent(noteId)}${code ? `?course=${encodeURIComponent(code)}` : ""}`;
}

const ACCEPT = "application/pdf,image/*,audio/*";
const ACCEPT_CAMERA = "image/*";

async function structureNotes(transcript: string, subject: string): Promise<{ title: string; content: string; hint?: string | null }> {
  const res = await fetch("/api/audio-to-notes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      transcript,
      subject: subject.trim() || "General",
      noteType: "detailed",
    }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    title?: string;
    content?: string;
    error?: string;
    chunkHint?: string | null;
  };
  if (!res.ok) throw new Error(data.error ?? "Could not turn that into notes.");
  const content = String(data.content ?? "").trim();
  if (!content) throw new Error("No notes came back. Try a clearer file.");
  return {
    title: String(data.title ?? "Study notes").trim() || "Study notes",
    content,
    hint: data.chunkHint ?? null,
  };
}

export default function InboxPage() {
  const { loading: youtubeLoading, error: youtubeHookError, result: youtubeResult, fetchTranscript, reset } =
    useYouTubeTranscript();

  const [tab, setTab] = useState<InboxTab>("inbox");
  const [file, setFile] = useState<File | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [pastedText, setPastedText] = useState("");
  const [curriculumCode, setCurriculumCode] = useState("");
  const [dragging, setDragging] = useState(false);
  const [detection, setDetection] = useState<InboxDetection | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [stage, setStage] = useState<InboxStage | null>(null);
  const [resumeBanner, setResumeBanner] = useState<InboxResumeState | null>(null);
  const [deviceClass, setDeviceClass] = useState<DeviceClass>("desktop");
  const [warning, setWarning] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const jobIdRef = useRef(`job-${Date.now().toString(36)}`);
  const lastPayloadRef = useRef<{
    file?: File | null;
    youtubeUrl?: string;
    pastedText?: string;
  }>({});

  const subject = subjectFromCourseCode(curriculumCode);
  const isPhone = deviceClass === "phone";

  const persistJob = useCallback(
    (partial: Partial<InboxResumeState> & { stage: InboxStage; kind: InboxKind; label: string }) => {
      const yt = (partial.youtubeUrl ?? youtubeUrl).trim();
      const paste = (partial.pastedText ?? pastedText).trim();
      writeInboxResume({
        id: jobIdRef.current,
        kind: partial.kind,
        label: partial.label,
        stage: partial.stage,
        curriculumCode: curriculumCode.trim() || undefined,
        youtubeUrl: yt || undefined,
        pastedText: paste || undefined,
        fileName: partial.fileName ?? file?.name,
        statusMessage: partial.statusMessage ?? (status || undefined),
        error: partial.error,
        resumable: partial.resumable ?? Boolean(yt || paste),
      });
    },
    [curriculumCode, file?.name, pastedText, status, youtubeUrl],
  );

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/notes?tag=Inbox&limit=20");
      const data = (await res.json().catch(() => ({}))) as { notes?: HistoryItem[] };
      if (res.ok) setHistory(data.notes ?? []);
    } catch {
      // History is optional.
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    setTab(parseInboxTab(new URLSearchParams(window.location.search).get("tab")));
    setDeviceClass(detectDeviceClass());
    const profile = readStudyProfile();
    const firstCourse = profile?.courses?.map((c) => c.trim()).find(Boolean);
    if (firstCourse) setCurriculumCode(firstCourse.toUpperCase());
    const pending = readInboxResume();
    if (pending && (pending.stage === "failed" || pending.stage === "reading" || pending.stage === "structuring" || pending.stage === "uploading")) {
      setResumeBanner(pending);
    }
  }, []);

  const selectTab = (next: InboxTab) => {
    setTab(next);
    window.history.replaceState(null, "", inboxHref(next));
  };

  const showDetection = useCallback(
    async (next: { file?: File | null; youtubeUrl?: string; pastedText?: string }) => {
      let pdfPages: number | null = null;
      const nextFile = next.file ?? null;
      if (nextFile && (nextFile.type === "application/pdf" || nextFile.name.toLowerCase().endsWith(".pdf"))) {
        pdfPages = await sniffPdfPageCount(nextFile);
      }
      const found = detectInboxInput({
        file: nextFile,
        youtubeUrl: next.youtubeUrl,
        pastedText: next.pastedText,
        pdfPages,
      });
      setDetection(found);
      return found;
    },
    [],
  );

  const resetWork = () => {
    setError("");
    setStatus("");
    setWarning("");
    setPreview(null);
    setStage(null);
    reset();
  };

  const runYoutube = async (url: string) => {
    jobIdRef.current = `job-${Date.now().toString(36)}`;
    lastPayloadRef.current = { youtubeUrl: url };
    setBusy(true);
    setError("");
    setWarning("");
    setPreview(null);
    setStage("reading");
    setStatus("Reading captions…");
    persistJob({
      stage: "reading",
      kind: "youtube",
      label: url.slice(0, 80),
      youtubeUrl: url,
      statusMessage: "Reading captions…",
      resumable: true,
    });
    try {
      setStage("structuring");
      setStatus("Structuring notes (long lectures are chunked so the ending is covered)…");
      persistJob({
        stage: "structuring",
        kind: "youtube",
        label: url.slice(0, 80),
        youtubeUrl: url,
        statusMessage: "Structuring notes…",
        resumable: true,
      });
      const imported = await fetchTranscript(url, {
        subject,
        curriculumCode: curriculumCode.trim() || undefined,
      });
      if (!imported?.notes) {
        const msg = "No notes came back from that video.";
        setError(msg);
        setStage("failed");
        persistJob({
          stage: "failed",
          kind: "youtube",
          label: url.slice(0, 80),
          youtubeUrl: url,
          error: msg,
          resumable: true,
        });
        return;
      }
      const hint =
        (imported as { chunkHint?: string | null }).chunkHint ??
        (typeof (imported as { chunkCount?: number }).chunkCount === "number" &&
        ((imported as { chunkCount?: number }).chunkCount ?? 0) > 1
          ? `Long lecture — summarised in ${(imported as { chunkCount?: number }).chunkCount} sections.`
          : null);
      setPreview({
        title: imported.title || "YouTube lecture",
        notes: imported.notes,
        noteId: imported.noteId ?? null,
        kind: "youtube",
        hint,
      });
      if (hint) setWarning(hint);
      setStage("ready");
      clearInboxResume();
      setResumeBanner(null);
      if (imported.noteId) void loadHistory();
    } finally {
      setBusy(false);
      setStatus("");
    }
  };

  const runFile = async (nextFile: File, found: InboxDetection) => {
    jobIdRef.current = `job-${Date.now().toString(36)}`;
    lastPayloadRef.current = { file: nextFile };
    setBusy(true);
    setError("");
    setWarning("");
    setPreview(null);
    setStage("uploading");
    setStatus("Uploading…");
    persistJob({
      stage: "uploading",
      kind: found.kind,
      label: nextFile.name,
      fileName: nextFile.name,
      resumable: false,
      statusMessage: "Uploading…",
    });
    try {
      if (found.kind === "pdf") {
        setStage("reading");
        setStatus("Reading PDF…");
        persistJob({
          stage: "reading",
          kind: "pdf",
          label: nextFile.name,
          fileName: nextFile.name,
          resumable: false,
          statusMessage: "Reading PDF…",
        });
        const form = new FormData();
        form.append("file", nextFile);
        const res = await fetch("/api/extract-pdf", { method: "POST", body: form });
        const data = (await res.json().catch(() => ({}))) as {
          text?: string;
          pageCount?: number;
          pagesWithText?: number;
          warning?: string | null;
          error?: string;
        };
        if (!res.ok || !data.text?.trim()) {
          throw new Error(
            data.error ??
              (typeof data.pageCount === "number"
                ? `Scanned PDF — read 0/${data.pageCount} pages as text.`
                : "Couldn't read that PDF."),
          );
        }
        if (typeof data.pageCount === "number" && data.pageCount > 0) {
          const withText = data.pagesWithText ?? data.pageCount;
          setDetection({ kind: "pdf", label: `PDF · read ${withText}/${data.pageCount} pages` });
        }
        if (data.warning) setWarning(data.warning);
        setStage("structuring");
        setStatus("Structuring notes…");
        persistJob({
          stage: "structuring",
          kind: "pdf",
          label: nextFile.name,
          fileName: nextFile.name,
          resumable: false,
          statusMessage: "Structuring notes…",
        });
        const structured = await structureNotes(data.text, subject);
        setPreview({
          title: structured.title,
          notes: structured.content,
          kind: "pdf",
          hint: structured.hint ?? data.warning,
        });
        setStage("ready");
        clearInboxResume();
        setResumeBanner(null);
        return;
      }

      if (found.kind === "image") {
        setStage("reading");
        setStatus("Reading photo (OCR)…");
        persistJob({
          stage: "reading",
          kind: "image",
          label: nextFile.name,
          fileName: nextFile.name,
          resumable: false,
          statusMessage: "Reading photo…",
        });
        const processed = await preprocessHandwritingImage(nextFile);
        void (async () => {
          try {
            const dataUrl = await fileToDataUrl(nextFile);
            await persistCapture({
              title: nextFile.name.replace(/\.[^.]+$/, "") || "Inbox photo",
              subject: curriculumCode.trim() || subject || "General",
              imageData: dataUrl,
              source: "inbox",
              sourceDevice: detectDeviceClass(),
            });
          } catch {
            // Gallery save is best-effort
          }
        })();
        const res = await fetch("/api/scan-handwriting", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: processed.base64,
            mimeType: processed.mimeType,
            subject,
          }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          text?: string;
          error?: string;
          confidence?: string;
          wordCount?: number;
        };
        if (!res.ok || !data.text?.trim()) {
          throw new Error(
            data.error ??
              "Couldn't read that photo — try a sharper shot of the whiteboard or page (avoid heavy glare).",
          );
        }
        const ocr = data.text.trim();
        const words = data.wordCount ?? countWords(ocr);
        if (words < 8) {
          throw new Error(
            `Photo OCR only found ${words} word${words === 1 ? "" : "s"} — retake closer / brighter, or paste the text.`,
          );
        }
        if (countWords(ocr) >= 40) {
          setStage("structuring");
          setStatus("Structuring notes…");
          const structured = await structureNotes(ocr, subject);
          setPreview({
            title: structured.title,
            notes: structured.content,
            kind: "image",
            hint: structured.hint,
          });
        } else {
          setPreview({
            title: nextFile.name.replace(/\.[^.]+$/, "") || "Scanned notes",
            notes: ocr,
            kind: "image",
            hint: `OCR kept ${words} words as-is (too short to restructure).`,
          });
          setWarning(`OCR kept ${words} words as-is (too short to restructure).`);
        }
        setStage("ready");
        clearInboxResume();
        setResumeBanner(null);
        return;
      }

      if (found.kind === "audio") {
        setStage("reading");
        setStatus("Reading audio (transcription)…");
        persistJob({
          stage: "reading",
          kind: "audio",
          label: nextFile.name,
          fileName: nextFile.name,
          resumable: false,
          statusMessage: "Transcribing…",
        });
        if (nextFile.size > 24 * 1024 * 1024) {
          throw new Error(
            `Audio is ${(nextFile.size / (1024 * 1024)).toFixed(0)}MB — max 25MB. Trim the recording or split a 90-min lecture.`,
          );
        }
        const form = new FormData();
        form.append("audio", nextFile);
        const res = await fetch("/api/transcribe", { method: "POST", body: form });
        const data = (await res.json().catch(() => ({}))) as {
          transcript?: string;
          error?: string;
          duration?: number;
        };
        if (!res.ok || !data.transcript?.trim()) {
          throw new Error(
            data.error ??
              "Couldn't transcribe that recording — muffled / silent audio often fails. Try a clearer clip.",
          );
        }
        setStage("structuring");
        setStatus("Structuring notes (long recordings are chunked)…");
        persistJob({
          stage: "structuring",
          kind: "audio",
          label: nextFile.name,
          fileName: nextFile.name,
          resumable: false,
          statusMessage: "Structuring…",
        });
        const structured = await structureNotes(data.transcript, subject);
        setPreview({
          title: structured.title,
          notes: structured.content,
          kind: "audio",
          hint: structured.hint,
        });
        if (structured.hint) setWarning(structured.hint);
        setStage("ready");
        clearInboxResume();
        setResumeBanner(null);
        return;
      }

      throw new Error("Couldn't tell what that file was. Try a PDF, photo, or recording.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Import failed.";
      setError(msg);
      setPreview(null);
      setStage("failed");
      persistJob({
        stage: "failed",
        kind: found.kind,
        label: nextFile.name,
        fileName: nextFile.name,
        error: msg,
        resumable: false,
      });
      setResumeBanner(readInboxResume());
    } finally {
      setBusy(false);
      setStatus("");
    }
  };

  const runText = async (text: string, found: InboxDetection) => {
    if (found.kind === "youtube") {
      setYoutubeUrl(text.trim());
      await runYoutube(text.trim());
      return;
    }
    if (found.kind === "quizlet") {
      setPastedText(text);
      setError("");
      setPreview(null);
      return;
    }
    jobIdRef.current = `job-${Date.now().toString(36)}`;
    lastPayloadRef.current = { pastedText: text };
    setBusy(true);
    setError("");
    setPreview(null);
    setStage("structuring");
    setStatus("Preparing your notes…");
    try {
      const trimmed = text.trim();
      if (trimmed.length > 200_000) {
        throw new Error(
          `Paste is huge (${formatCount(trimmed.length)} chars). Trim to the chapter you need, or split into two pastes.`,
        );
      }
      const title = trimmed.split(/\n/)[0]?.slice(0, 80).trim() || "Pasted notes";
      setPreview({ title, notes: trimmed, kind: "text" });
      setStage("ready");
      clearInboxResume();
      setResumeBanner(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Paste failed.";
      setError(msg);
      setStage("failed");
      persistJob({
        stage: "failed",
        kind: "text",
        label: "Pasted text",
        pastedText: text.slice(0, 50_000),
        error: msg,
        resumable: true,
      });
      setResumeBanner(readInboxResume());
    } finally {
      setBusy(false);
      setStatus("");
    }
  };

  const ingestDetected = async (
    found: InboxDetection | null,
    payload: { file?: File | null; youtubeUrl?: string; pastedText?: string },
  ) => {
    lastPayloadRef.current = payload;
    if (!found) {
      setError("Couldn't tell what that was. Drop a PDF, photo, recording, YouTube link, or paste your notes.");
      setPreview(null);
      return;
    }
    setError("");
    if (payload.file && (found.kind === "pdf" || found.kind === "image" || found.kind === "audio")) {
      await runFile(payload.file, found);
      return;
    }
    const text = (payload.pastedText || payload.youtubeUrl || "").trim();
    if (found.kind === "youtube" && text) {
      await runYoutube(text);
      return;
    }
    if (text) {
      await runText(text, found);
    }
  };

  const onPickFile = async (nextFile: File | null) => {
    if (!nextFile) return;
    resetWork();
    setFile(nextFile);
    setPastedText("");
    const found = await showDetection({ file: nextFile, youtubeUrl, pastedText: "" });
    await ingestDetected(found, { file: nextFile, youtubeUrl });
  };

  const retryLast = async () => {
    const payload = lastPayloadRef.current;
    setResumeBanner(null);
    if (payload.file) {
      await onPickFile(payload.file);
      return;
    }
    if (payload.youtubeUrl) {
      resetWork();
      await runYoutube(payload.youtubeUrl);
      return;
    }
    if (payload.pastedText) {
      resetWork();
      const found = await showDetection({ file: null, youtubeUrl: "", pastedText: payload.pastedText });
      await ingestDetected(found, { pastedText: payload.pastedText });
    }
  };

  const finishResume = async () => {
    const pending = resumeBanner ?? readInboxResume();
    if (!pending) return;
    setResumeBanner(null);
    selectTab("inbox");
    if (pending.curriculumCode) setCurriculumCode(pending.curriculumCode);
    if (pending.resumable && pending.youtubeUrl) {
      setYoutubeUrl(pending.youtubeUrl);
      resetWork();
      await runYoutube(pending.youtubeUrl);
      return;
    }
    if (pending.resumable && pending.pastedText) {
      setPastedText(pending.pastedText);
      resetWork();
      const found = await showDetection({ file: null, youtubeUrl: "", pastedText: pending.pastedText });
      await ingestDetected(found, { pastedText: pending.pastedText });
      return;
    }
    // File jobs need a re-drop
    setStatus(`Re-drop ${pending.fileName ?? pending.label} to finish — we kept your course chip.`);
    if (pending.fileName?.match(/\.(png|jpe?g|webp|heic)$/i) && isPhone && cameraInputRef.current) {
      cameraInputRef.current.click();
    } else {
      fileInputRef.current?.click();
    }
  };

  // Capture Studio → Inbox handoff (image + optional course chip)
  useEffect(() => {
    const handoff = consumeCaptureHandoff(CAPTURE_INBOX_KEY);
    if (!handoff?.imageData) return;
    if (handoff.course) setCurriculumCode(handoff.course);
    const next = dataUrlToFile(handoff.imageData, handoff.filename || "capture-studio.png");
    setStatus("Imported from Capture Studio.");
    void onPickFile(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot handoff on mount
  }, []);

  const onPasteYoutube = async () => {
    resetWork();
    const found = await showDetection({ file: null, youtubeUrl, pastedText });
    if (!found || found.kind !== "youtube") {
      setError("That doesn't look like a YouTube link.");
      return;
    }
    await ingestDetected(found, { youtubeUrl });
  };

  const saveToNotes = async () => {
    if (!preview?.notes) return;
    setSaving(true);
    setError("");
    try {
      const tags = ["Inbox", subject, curriculumCode.trim().toUpperCase()].filter(
        (tag) => tag && tag !== "General",
      );
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: preview.title,
          content: preview.notes,
          format: "detailed",
          tags,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { note?: { id?: string }; error?: string };
      if (!res.ok || !data.note?.id) {
        setError(data.error ?? "Could not save to My Notes.");
        return;
      }
      setPreview({ ...preview, noteId: data.note.id });
      clearInboxResume();
      setResumeBanner(null);
      void loadHistory();
    } catch {
      setError("Could not save to My Notes.");
    } finally {
      setSaving(false);
    }
  };

  const openHistoryItem = (item: HistoryItem) => {
    selectTab("inbox");
    setPreview({ title: item.title, notes: item.content, noteId: item.id, kind: "text" });
    setDetection({ kind: "text", label: "Inbox note" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const savedId = preview?.noteId ?? youtubeResult?.noteId ?? null;
  const notesText = preview?.notes ?? "";
  const displayError = error || (youtubeHookError && youtubeHookError !== "Unauthorized" ? youtubeHookError : "");
  const loading = busy || youtubeLoading;

  const wordHint = useMemo(() => {
    if (!notesText) return "";
    return `${formatCount(countWords(notesText))} words`;
  }, [notesText]);

  return (
    <main>
      <div className="kv-crumb">Kyvex / <b>Inbox</b></div>
      <h1 className="kv-title" style={{ marginTop: 14 }}>Inbox</h1>
      <p className="kv-sub" style={{ marginTop: 10 }}>
        Tonight&apos;s homework, in <span className="kv-serif">one step.</span>
      </p>

      <nav className="kv-tabs" aria-label="Inbox tools" style={{ marginTop: 22 }}>
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={tab === item.id ? "kv-tab on" : "kv-tab"}
            onClick={() => selectTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {resumeBanner && tab === "inbox" ? (
        <section
          className="kv-card"
          style={{ marginTop: 16, padding: 16, boxShadow: "none" }}
          data-surface="inbox-resume"
        >
          <p className="kv-meta" style={{ margin: 0 }}>
            Continue where you left off
          </p>
          <p className="kv-sub" style={{ marginTop: 8 }}>
            Finish importing <span className="kv-serif">{resumeBanner.label}</span>?
            {resumeBanner.stage === "failed" && resumeBanner.error
              ? ` Last stop: ${resumeBanner.error}`
              : ` · was on ${stageLabel(resumeBanner.stage)}`}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
            <button type="button" className="kv-btn" onClick={() => void finishResume()} disabled={loading}>
              Finish import
            </button>
            <button
              type="button"
              className="kv-btn-ghost"
              onClick={() => {
                clearInboxResume();
                setResumeBanner(null);
              }}
            >
              Dismiss
            </button>
          </div>
        </section>
      ) : null}

      {tab === "record" ? <InboxRecord /> : null}
      {tab === "lecture" ? <InboxLecture /> : null}
      {tab === "classroom" ? <InboxClassroom /> : null}
      {tab === "quizlet" ? <InboxQuizlet /> : null}

      {tab === "inbox" ? (
      <>
      <section
        className={`kv-card kv-dropzone${dragging ? " is-drag" : ""}`}
        tabIndex={0}
        style={{ marginTop: 18, padding: "28px 20px" }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void onPickFile(event.dataTransfer.files?.[0] ?? null);
        }}
        onPaste={(event) => {
          const target = event.target as HTMLElement | null;
          // Allow paste on the dropzone even if a file input inside it is focused.
          if (target?.closest("input:not([type=file]), textarea, select")) return;
          const pastedFile = event.clipboardData?.files?.[0] ?? null;
          if (pastedFile) {
            event.preventDefault();
            void onPickFile(pastedFile);
            return;
          }
          const text = event.clipboardData?.getData("text")?.trim() ?? "";
          if (!text) return;
          event.preventDefault();
          setFile(null);
          if (extractYouTubeVideoId(text)) {
            setYoutubeUrl(text);
            setPastedText("");
            void (async () => {
              const found = await showDetection({ file: null, youtubeUrl: text, pastedText: "" });
              await ingestDetected(found, { youtubeUrl: text });
            })();
            return;
          }
          setPastedText(text);
          void (async () => {
            const found = await showDetection({ file: null, youtubeUrl: "", pastedText: text });
            await ingestDetected(found, { pastedText: text });
          })();
        }}
      >
        <div style={{ textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "var(--kv-text-primary)" }}>
            {isPhone ? "Snap tonight's homework" : "Drop tonight's homework here"}
          </p>
          <p className="kv-meta" style={{ marginTop: 8 }}>
            {isPhone ? "Camera · Photo · PDF · Recording · YouTube" : "Photo · PDF · Recording · YouTube link"}
          </p>
          {isPhone ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 14 }}>
              <button type="button" className="kv-btn" disabled={loading} onClick={() => cameraInputRef.current?.click()}>
                Take photo
              </button>
              <button type="button" className="kv-btn-ghost" disabled={loading} onClick={() => fileInputRef.current?.click()}>
                Choose file
              </button>
            </div>
          ) : (
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT}
              className="kv-field"
              disabled={loading}
              onChange={(event) => {
                const picked = event.target.files?.[0] ?? null;
                event.target.value = "";
                void onPickFile(picked);
              }}
              style={{ marginTop: 14, maxWidth: 360 }}
            />
          )}
          {/* Hidden pickers for phone (and resume re-drop) */}
          {isPhone ? (
            <>
              <input
                ref={cameraInputRef}
                type="file"
                accept={ACCEPT_CAMERA}
                capture="environment"
                className="sr-only"
                tabIndex={-1}
                aria-hidden
                disabled={loading}
                onChange={(event) => {
                  const picked = event.target.files?.[0] ?? null;
                  event.target.value = "";
                  void onPickFile(picked);
                }}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPT}
                className="sr-only"
                tabIndex={-1}
                aria-hidden
                disabled={loading}
                onChange={(event) => {
                  const picked = event.target.files?.[0] ?? null;
                  event.target.value = "";
                  void onPickFile(picked);
                }}
              />
            </>
          ) : null}
          {file ? (
            <p className="kv-meta" style={{ marginTop: 10 }}>{file.name}</p>
          ) : null}
        </div>
      </section>

      <div
        style={{
          display: "grid",
          gap: 14,
          marginTop: 18,
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          alignItems: "start",
        }}
      >
        <div>
          <label htmlFor="inbox-youtube" className="kv-meta" style={{ display: "block", marginBottom: 8 }}>
            Paste a YouTube link
          </label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              id="inbox-youtube"
              className="kv-field"
              value={youtubeUrl}
              onChange={(event) => {
                setYoutubeUrl(event.target.value);
                void showDetection({ file: null, youtubeUrl: event.target.value, pastedText });
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") void onPasteYoutube();
              }}
              placeholder="https://www.youtube.com/watch?v=…"
              autoComplete="off"
              style={{ flex: 1, minWidth: 180 }}
            />
            <button type="button" className="kv-btn-ghost" onClick={() => void onPasteYoutube()} disabled={loading || !youtubeUrl.trim()}>
              {loading && detection?.kind === "youtube" ? "Importing…" : "Import"}
            </button>
          </div>
        </div>

        <OntarioCourseField value={curriculumCode} onChange={setCurriculumCode} id="inbox-ontario-courses" />
      </div>

      {detection ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 16 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <span className="dot" />
            <span className="kv-meta">{detection.label}</span>
          </span>
          {curriculumCode.trim() ? (
            <span className="kv-chip kv-chip-course">{curriculumCode.trim().toUpperCase()}</span>
          ) : null}
        </div>
      ) : null}

      {stage ? (
        <div
          style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 14, alignItems: "center" }}
          aria-live="polite"
        >
          {STAGES.map((s, i) => {
            const active = stage === s || (stage === "failed" && s === "reading");
            const done =
              stage !== "failed" &&
              STAGES.indexOf(stage) > i;
            return (
              <span
                key={s}
                className="kv-chip"
                style={{
                  opacity: active || done ? 1 : 0.45,
                  borderColor: active ? "var(--kv-accent)" : undefined,
                }}
              >
                {stageLabel(s)}
                {i < STAGES.length - 1 ? " →" : ""}
              </span>
            );
          })}
        </div>
      ) : null}

      {status ? (
        <p className="kv-sub" style={{ margin: "12px 0 0" }}>{status}</p>
      ) : null}

      {warning ? (
        <p className="kv-sub" style={{ margin: "8px 0 0", color: "var(--kv-text-primary)" }}>
          {warning}
        </p>
      ) : null}

      {detection?.kind === "quizlet" ? (
        <p className="kv-sub" style={{ margin: "12px 0 0" }}>
          That looks like Quizlet-style Q/A pairs.{" "}
          <button
            type="button"
            className="kv-btn-ghost"
            style={{ display: "inline-flex", marginLeft: 6 }}
            onClick={() => selectTab("quizlet")}
          >
            Open Quizlet import
          </button>
        </p>
      ) : null}

      {displayError ? (
        <p role="alert" style={{ margin: "12px 0 0", color: "var(--kv-text-primary)", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span className="kv-chip kv-chip-stale">Error</span>
          {displayError}
          <button type="button" className="kv-btn-ghost" style={{ padding: "4px 8px", fontSize: 12 }} onClick={() => void retryLast()} disabled={loading}>
            Retry
          </button>
        </p>
      ) : null}

      {preview ? (
        <section className="kv-card" style={{ marginTop: 16, boxShadow: "none", backdropFilter: "none" }}>
          <p className="kv-meta">Structured notes</p>
          <h2 className="kv-row-title" style={{ marginTop: 10, marginBottom: 6, fontSize: 22 }}>{preview.title}</h2>
          {wordHint ? (
            <p className="kv-meta num" style={{ margin: 0 }}>{wordHint}</p>
          ) : null}
          {preview.hint ? (
            <p className="kv-meta" style={{ marginTop: 8 }}>{preview.hint}</p>
          ) : null}

          {savedId ? (
            <p className="kv-meta" style={{ marginTop: 12, color: "var(--kv-accent-text)" }}>
              Saved to My Notes
              {curriculumCode ? ` · ${curriculumCode.trim().toUpperCase()}` : ""}
            </p>
          ) : (
            <button
              type="button"
              className="kv-btn"
              style={{ marginTop: 14 }}
              onClick={() => void saveToNotes()}
              disabled={saving || !preview.notes}
            >
              {saving ? "Saving…" : "Save to My Notes →"}
            </button>
          )}

          {savedId ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                gap: 8,
                marginTop: 16,
              }}
            >
              <Link
                href={followUpHref("flashcards", savedId, curriculumCode)}
                className="kv-btn-ghost"
                style={{ justifyContent: "center" }}
              >
                Make flashcards
              </Link>
              <Link
                href={followUpHref("mock-exam", savedId, curriculumCode)}
                className="kv-btn-ghost"
                style={{ justifyContent: "center" }}
              >
                Mock exam
              </Link>
              <Link
                href={followUpHref("tutor", savedId, curriculumCode)}
                className="kv-btn-ghost"
                style={{ justifyContent: "center" }}
              >
                Ask Nova
              </Link>
              <Link
                href={followUpHref("listen", savedId, curriculumCode)}
                className="kv-btn-ghost"
                style={{ justifyContent: "center" }}
              >
                Listen
              </Link>
            </div>
          ) : null}

          <pre
            style={{
              marginTop: 16,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              fontFamily: "inherit",
              fontSize: 14,
              lineHeight: 1.7,
              color: "var(--kv-text-secondary)",
            }}
          >
            {preview.notes}
          </pre>
        </section>
      ) : !loading && !displayError && tab === "inbox" ? (
        <p className="kv-sub" style={{ marginTop: 18 }}>
          Empty for now — drop a file, paste a lecture link, or snap a page.
        </p>
      ) : null}
      </>
      ) : null}

      <section style={{ marginTop: 28 }}>
        <p className="kv-meta">Recent imports</p>
        {history.length === 0 ? (
          <p className="kv-sub" style={{ marginTop: 12 }}>
            Nothing saved from Inbox yet. Saved notes tagged Inbox show up here.
          </p>
        ) : (
          <div>
            {history.map((item) => {
              const course = courseChipFromTags(item.tags);
              return (
                <Link
                  key={item.id}
                  href={`/my-notes?note=${encodeURIComponent(item.id)}`}
                  className="kv-row"
                  onClick={(event) => {
                    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                    event.preventDefault();
                    openHistoryItem(item);
                  }}
                >
                  <div>
                    <div className="kv-row-title">{item.title}</div>
                    <div className="kv-row-sub">
                      {course ? <span className="kv-chip kv-chip-course">{course}</span> : null}
                      <span className="kv-chip">Inbox</span>
                    </div>
                  </div>
                  <span className="kv-row-side num">{formatTorontoDateTime(item.createdAt)}</span>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
