"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import { inboxHref, parseInboxTab, type InboxTab } from "~/lib/inbox-tab";
import { extractYouTubeVideoId, useYouTubeTranscript } from "~/lib/hooks/useYouTubeTranscript";
import { preprocessHandwritingImage } from "~/lib/imagePreprocessor";
import { formatTorontoDateTime } from "~/lib/toronto-time";

type Preview = {
  title: string;
  notes: string;
  noteId?: string | null;
  kind: InboxKind;
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

function courseChipFromTags(tags: string[] | undefined): string | null {
  if (!tags?.length) return null;
  const code = tags.find((tag) => /^[A-Z]{3,4}\d[A-Z]$/i.test(tag.trim()));
  return code ? code.trim().toUpperCase() : null;
}

const ACCEPT = "application/pdf,image/*,audio/*";

async function structureNotes(transcript: string, subject: string): Promise<{ title: string; content: string }> {
  const res = await fetch("/api/audio-to-notes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      transcript,
      subject: subject.trim() || "General",
      noteType: "detailed",
    }),
  });
  const data = (await res.json().catch(() => ({}))) as { title?: string; content?: string; error?: string };
  if (!res.ok) throw new Error(data.error ?? "Could not turn that into notes.");
  const content = String(data.content ?? "").trim();
  if (!content) throw new Error("No notes came back. Try a clearer file.");
  return { title: String(data.title ?? "Study notes").trim() || "Study notes", content };
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

  const subject = subjectFromCourseCode(curriculumCode);

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
    setPreview(null);
    reset();
  };

  const runYoutube = async (url: string) => {
    setBusy(true);
    setError("");
    setPreview(null);
    setStatus("Fetching captions and writing notes…");
    try {
      const imported = await fetchTranscript(url, {
        subject,
        curriculumCode: curriculumCode.trim() || undefined,
      });
      if (!imported?.notes) {
        return;
      }
      setPreview({
        title: imported.title || "YouTube lecture",
        notes: imported.notes,
        noteId: imported.noteId ?? null,
        kind: "youtube",
      });
      if (imported.noteId) void loadHistory();
    } finally {
      setBusy(false);
      setStatus("");
    }
  };

  const runFile = async (nextFile: File, found: InboxDetection) => {
    setBusy(true);
    setError("");
    setPreview(null);
    try {
      if (found.kind === "pdf") {
        setStatus("Extracting text from the PDF…");
        const form = new FormData();
        form.append("file", nextFile);
        const res = await fetch("/api/extract-pdf", { method: "POST", body: form });
        const data = (await res.json().catch(() => ({}))) as {
          text?: string;
          pageCount?: number;
          error?: string;
        };
        if (!res.ok || !data.text?.trim()) {
          throw new Error(data.error ?? "Couldn't read that PDF.");
        }
        if (typeof data.pageCount === "number" && data.pageCount > 0) {
          setDetection({ kind: "pdf", label: `PDF · ${data.pageCount} pages` });
        }
        setStatus("Turning the PDF into study notes…");
        const structured = await structureNotes(data.text, subject);
        setPreview({ title: structured.title, notes: structured.content, kind: "pdf" });
        return;
      }

      if (found.kind === "image") {
        setStatus("Running handwriting OCR…");
        const processed = await preprocessHandwritingImage(nextFile);
        const res = await fetch("/api/scan-handwriting", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: processed.base64,
            mimeType: processed.mimeType,
            subject,
          }),
        });
        const data = (await res.json().catch(() => ({}))) as { text?: string; error?: string };
        if (!res.ok || !data.text?.trim()) {
          throw new Error(data.error ?? "No readable handwriting in that photo.");
        }
        const ocr = data.text.trim();
        if (countWords(ocr) >= 40) {
          setStatus("Turning the scan into study notes…");
          const structured = await structureNotes(ocr, subject);
          setPreview({ title: structured.title, notes: structured.content, kind: "image" });
        } else {
          setPreview({
            title: nextFile.name.replace(/\.[^.]+$/, "") || "Scanned notes",
            notes: ocr,
            kind: "image",
          });
        }
        return;
      }

      if (found.kind === "audio") {
        setStatus("Transcribing audio…");
        const form = new FormData();
        form.append("audio", nextFile);
        const res = await fetch("/api/transcribe", { method: "POST", body: form });
        const data = (await res.json().catch(() => ({}))) as { transcript?: string; error?: string };
        if (!res.ok || !data.transcript?.trim()) {
          throw new Error(data.error ?? "Couldn't transcribe that recording.");
        }
        setStatus("Turning the transcript into study notes…");
        const structured = await structureNotes(data.transcript, subject);
        setPreview({ title: structured.title, notes: structured.content, kind: "audio" });
        return;
      }

      throw new Error("Couldn't tell what that file was. Try a PDF, photo, or recording.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.");
      setPreview(null);
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
    setBusy(true);
    setError("");
    setPreview(null);
    setStatus("Preparing your notes…");
    try {
      const trimmed = text.trim();
      const title = trimmed.split(/\n/)[0]?.slice(0, 80).trim() || "Pasted notes";
      setPreview({ title, notes: trimmed, kind: "text" });
    } finally {
      setBusy(false);
      setStatus("");
    }
  };

  const ingestDetected = async (
    found: InboxDetection | null,
    payload: { file?: File | null; youtubeUrl?: string; pastedText?: string },
  ) => {
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
          if (target?.closest("input, textarea, select")) return;
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
            Drop tonight&apos;s homework here
          </p>
          <p className="kv-meta" style={{ marginTop: 8 }}>Photo · PDF · Recording · YouTube link</p>
          <input
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

      {status ? (
        <p className="kv-sub" style={{ margin: "12px 0 0" }}>{status}</p>
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
        </p>
      ) : null}

      {preview ? (
        <section className="kv-card" style={{ marginTop: 16, boxShadow: "none", backdropFilter: "none" }}>
          <p className="kv-meta">Structured notes</p>
          <h2 className="kv-row-title" style={{ marginTop: 10, marginBottom: 6, fontSize: 22 }}>{preview.title}</h2>
          {wordHint ? (
            <p className="kv-meta num" style={{ margin: 0 }}>{wordHint}</p>
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
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, marginTop: 16 }}>
              <Link
                href={`/flashcards?generateFrom=${encodeURIComponent(savedId)}`}
                className="kv-btn-ghost"
                style={{ justifyContent: "center" }}
              >
                Make flashcards
              </Link>
              <Link
                href={`/mock-exam?noteId=${encodeURIComponent(savedId)}`}
                className="kv-btn-ghost"
                style={{ justifyContent: "center" }}
              >
                Mock exam
              </Link>
              <Link
                href={`/tutor?noteId=${encodeURIComponent(savedId)}`}
                className="kv-btn-ghost"
                style={{ justifyContent: "center" }}
              >
                Ask Nova
              </Link>
            </div>
          ) : null}

          {savedId ? (
            <Link
              href={`/listen/${encodeURIComponent(savedId)}`}
              className="kv-btn-ghost"
              style={{ marginTop: 8, display: "inline-flex" }}
            >
              Listen
            </Link>
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
