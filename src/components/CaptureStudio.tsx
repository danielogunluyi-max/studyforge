"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, CircleDot, Crop, FileText, Loader2, Monitor, Search, Square, Trash2, Upload, X, ZoomIn } from "lucide-react";

type Screenshot = {
  id: string;
  title: string;
  subject: string;
  imageData: string;
  createdAt: string;
};
type Pending = { imageData: string; width: number; height: number };
type CropRect = { x: number; y: number; w: number; h: number };

const SUBJECTS = ["General", "Math", "Science", "English", "History", "Chemistry", "Physics", "Other"];

// TODO: Swap base64-in-Postgres storage for Vercel Blob (or S3) when budget allows.
// Current /api/screenshots persists base64 directly which keeps the $0 path simple.

export default function CaptureStudio() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previewWrapRef = useRef<HTMLDivElement | null>(null);
  const cropStartRef = useRef<{ x: number; y: number } | null>(null);

  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("General");
  const [saving, setSaving] = useState(false);
  const [cropping, setCropping] = useState(false);
  const [cropRect, setCropRect] = useState<CropRect | null>(null);

  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(true);
  const [viewer, setViewer] = useState<string | null>(null);

  // Note-picker modal state
  type NoteOption = { id: string; title: string; updatedAt: string };
  const [notePickerOpen, setNotePickerOpen] = useState(false);
  const [noteOptions, setNoteOptions] = useState<NoteOption[]>([]);
  const [noteQuery, setNoteQuery] = useState("");
  const [notesLoading, setNotesLoading] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [transferProgress, setTransferProgress] = useState(0);

  const fetchAll = useCallback(async () => {
    setGalleryLoading(true);
    try {
      const r = await fetch("/api/screenshots");
      if (r.ok) {
        const data = (await r.json()) as Screenshot[];
        setScreenshots(Array.isArray(data) ? data : []);
      }
    } finally {
      setGalleryLoading(false);
    }
  }, []);
  useEffect(() => { void fetchAll(); }, [fetchAll]);

  const stopStream = useCallback(() => {
    if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setStreaming(false);
  }, []);

  useEffect(() => {
    const onHide = () => stopStream();
    window.addEventListener("pagehide", onHide);
    window.addEventListener("beforeunload", onHide);
    return () => {
      stopStream();
      window.removeEventListener("pagehide", onHide);
      window.removeEventListener("beforeunload", onHide);
    };
  }, [stopStream]);

  const drawLoop = useCallback(() => {
    const v = videoRef.current; const c = canvasRef.current;
    if (v && c && v.videoWidth && v.videoHeight) {
      if (c.width !== v.videoWidth) c.width = v.videoWidth;
      if (c.height !== v.videoHeight) c.height = v.videoHeight;
      c.getContext("2d")?.drawImage(v, 0, 0, v.videoWidth, v.videoHeight);
    }
    rafRef.current = requestAnimationFrame(drawLoop);
  }, []);

  const startCapture = useCallback(async () => {
    setError(null);
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getDisplayMedia) {
      setError("Your browser doesn't support screen capture. Try the latest Chrome, Edge, or Firefox.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: false });
      streamRef.current = stream;
      stream.getVideoTracks().forEach((t) => t.addEventListener("ended", () => stopStream()));
      const v = videoRef.current;
      if (v) { v.srcObject = stream; await v.play().catch(() => undefined); }
      setStreaming(true);
      rafRef.current = requestAnimationFrame(drawLoop);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to start screen capture.";
      if (!/permission|denied|aborted/i.test(msg)) setError(msg);
      stopStream();
    }
  }, [drawLoop, stopStream]);

  const snap = useCallback(() => {
    const v = videoRef.current;
    if (!v || !v.videoWidth || !v.videoHeight) return;
    const off = document.createElement("canvas");
    off.width = v.videoWidth; off.height = v.videoHeight;
    off.getContext("2d")?.drawImage(v, 0, 0);
    setPending({ imageData: off.toDataURL("image/png"), width: off.width, height: off.height });
    setTitle(`Capture ${new Date().toLocaleString()}`);
    setCropRect(null); setCropping(false);
  }, []);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) { setError("Please select an image file."); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result || "");
      const img = new Image();
      img.onload = () => {
        setPending({ imageData: url, width: img.naturalWidth, height: img.naturalHeight });
        setTitle(file.name.replace(/\.[^.]+$/, "") || "Uploaded screenshot");
        setCropRect(null); setCropping(false);
      };
      img.src = url;
    };
    reader.readAsDataURL(file);
  }, []);

  const beginCrop = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!cropping || !previewWrapRef.current) return;
    const rect = previewWrapRef.current.getBoundingClientRect();
    cropStartRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setCropRect({ x: cropStartRef.current.x, y: cropStartRef.current.y, w: 0, h: 0 });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const moveCrop = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!cropping || !cropStartRef.current || !previewWrapRef.current) return;
    const r = previewWrapRef.current.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    const sx = cropStartRef.current.x, sy = cropStartRef.current.y;
    setCropRect({ x: Math.min(sx, x), y: Math.min(sy, y), w: Math.abs(x - sx), h: Math.abs(y - sy) });
  };

  const applyCrop = () => {
    if (!pending || !cropRect || !previewWrapRef.current) return;
    if (cropRect.w < 8 || cropRect.h < 8) { setCropping(false); setCropRect(null); return; }
    const wr = previewWrapRef.current.getBoundingClientRect();
    const scale = Math.min(wr.width / pending.width, wr.height / pending.height);
    const drawnW = pending.width * scale, drawnH = pending.height * scale;
    const offX = (wr.width - drawnW) / 2, offY = (wr.height - drawnH) / 2;
    const sx = Math.max(0, (cropRect.x - offX) / scale);
    const sy = Math.max(0, (cropRect.y - offY) / scale);
    const sw = Math.min(pending.width - sx, cropRect.w / scale);
    const sh = Math.min(pending.height - sy, cropRect.h / scale);
    if (sw < 4 || sh < 4) { setCropping(false); setCropRect(null); return; }
    const off = document.createElement("canvas");
    off.width = Math.round(sw); off.height = Math.round(sh);
    const ctx = off.getContext("2d"); if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, off.width, off.height);
      setPending({ imageData: off.toDataURL("image/png"), width: off.width, height: off.height });
      setCropping(false); setCropRect(null);
    };
    img.src = pending.imageData;
  };

  const discard = () => { setPending(null); setTitle(""); setCropping(false); setCropRect(null); };

  const save = async () => {
    if (!pending) return;
    if (!title.trim()) { setError("Please add a title."); return; }
    setSaving(true); setError(null);
    try {
      const r = await fetch("/api/screenshots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), subject: subject || "General", imageData: pending.imageData }),
      });
      if (!r.ok) {
        const t = await r.text();
        setError(`Save failed (${r.status}). ${t.slice(0, 200)}`);
        return;
      }
      discard();
      await fetchAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this screenshot?")) return;
    const r = await fetch(`/api/screenshots?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (r.ok) setScreenshots((prev) => prev.filter((s) => s.id !== id));
  };

  const loadNotes = useCallback(async (q?: string) => {
    setNotesLoading(true);
    try {
      const url = new URL("/api/notes", window.location.origin);
      url.searchParams.set("limit", "100");
      if (q?.trim()) url.searchParams.set("q", q.trim());
      const r = await fetch(url.toString());
      if (!r.ok) return;
      const data = (await r.json()) as { notes?: NoteOption[] };
      setNoteOptions(Array.isArray(data.notes) ? data.notes : []);
    } finally {
      setNotesLoading(false);
    }
  }, []);

  const openNotePicker = () => {
    if (!pending) return;
    if (!title.trim()) {
      setError("Please add a title before linking to a note.");
      return;
    }
    setNotePickerOpen(true);
    setNoteQuery("");
    void loadNotes();
  };

  const saveToNote = async (noteId: string) => {
    if (!pending) return;
    setTransferring(true);
    setTransferProgress(5);
    setError(null);
    // Simulated progress for the gold bar (real POST resolves async)
    const tick = window.setInterval(() => {
      setTransferProgress((p) => (p < 85 ? p + Math.random() * 10 : p));
    }, 120);
    try {
      const r = await fetch("/api/screenshots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          subject: subject || "General",
          imageData: pending.imageData,
          noteId,
        }),
      });
      if (!r.ok) {
        const t = await r.text();
        setError(`Transfer failed (${r.status}). ${t.slice(0, 200)}`);
        return;
      }
      setTransferProgress(100);
      await new Promise((res) => window.setTimeout(res, 280));
      setNotePickerOpen(false);
      discard();
      await fetchAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Transfer failed.");
    } finally {
      window.clearInterval(tick);
      setTransferring(false);
      setTransferProgress(0);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 text-white">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Capture Studio</h1>
          <p className="mt-1 text-sm text-zinc-400">Stream a window, snap any frame, save to your gallery.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          {streaming ? (
            <><span className="inline-block h-2 w-2 animate-pulse rounded-full bg-red-500" /> LIVE</>
          ) : (
            <><span className="inline-block h-2 w-2 rounded-full bg-zinc-700" /> Idle</>
          )}
        </div>
      </header>

      {/* Viewfinder */}
      <section className="rounded-2xl border border-white/10 bg-black/40 p-4 backdrop-blur-xl">
        <div className="relative aspect-video w-full overflow-hidden rounded-xl border-2 border-dashed border-white/15 bg-black">
          <video ref={videoRef} muted playsInline className="hidden" />
          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full object-contain" />
          {/* HUD corners */}
          {[
            "left-2 top-2 border-l-2 border-t-2",
            "right-2 top-2 border-r-2 border-t-2",
            "left-2 bottom-2 border-l-2 border-b-2",
            "right-2 bottom-2 border-r-2 border-b-2",
          ].map((c) => (
            <span key={c} aria-hidden="true" className={`pointer-events-none absolute h-5 w-5 border-white/60 ${c}`} />
          ))}
          {streaming && (
            <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-red-400 backdrop-blur">
              <CircleDot size={12} className="animate-pulse" aria-hidden="true" /> REC
            </div>
          )}
          {!streaming && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center text-zinc-500">
              <Monitor size={42} strokeWidth={1.25} aria-hidden="true" />
              <p className="text-sm">No active stream. Start a capture session to begin.</p>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {!streaming ? (
            <button
              type="button"
              onClick={() => void startCapture()}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-br from-amber-300 to-amber-500 px-4 py-2.5 text-sm font-semibold text-black transition hover:brightness-110 active:scale-95"
            >
              <Monitor size={16} aria-hidden="true" /> Start Capture Session
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={snap}
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-br from-teal-400 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-black transition hover:brightness-110 active:scale-95"
              >
                <Camera size={16} aria-hidden="true" /> Snap Photo
              </button>
              <button
                type="button"
                onClick={stopStream}
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-white/10"
              >
                <Square size={14} aria-hidden="true" /> Stop
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-white/10"
          >
            <Upload size={14} aria-hidden="true" /> Upload Manually
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
        </div>

        {/* Drop zone (subtle, only visible when not streaming and no pending) */}
        {!streaming && !pending && (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) handleFile(f);
            }}
            className="mt-3 rounded-lg border border-dashed border-white/10 bg-black/30 px-4 py-3 text-center text-xs text-zinc-500"
          >
            …or drop a screenshot file here
          </div>
        )}

        {error && (
          <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {error}
          </div>
        )}
      </section>

      {/* Preview / Save modal */}
      {pending && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-950">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-300">Review &amp; Save</h2>
              <button
                type="button"
                onClick={discard}
                className="rounded-md p-1.5 text-zinc-400 transition hover:bg-white/10 hover:text-white"
                aria-label="Discard"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>

            <div
              ref={previewWrapRef}
              onPointerDown={beginCrop}
              onPointerMove={moveCrop}
              onPointerUp={() => { cropStartRef.current = null; }}
              className={`relative flex-1 overflow-hidden bg-black ${cropping ? "cursor-crosshair" : ""}`}
              style={{ minHeight: 320 }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={pending.imageData} alt="Preview" className="h-full max-h-[60vh] w-full object-contain" />
              {cropping && cropRect && (
                <div
                  className="pointer-events-none absolute border-2 border-amber-400 bg-amber-400/10"
                  style={{ left: cropRect.x, top: cropRect.y, width: cropRect.w, height: cropRect.h }}
                />
              )}
            </div>

            <div className="space-y-3 border-t border-white/10 bg-zinc-900/60 p-4">
              <div className="flex flex-wrap items-center gap-2">
                {!cropping ? (
                  <button
                    type="button"
                    onClick={() => { setCropping(true); setCropRect(null); }}
                    className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-200 transition hover:bg-white/10"
                  >
                    <Crop size={12} aria-hidden="true" /> Crop
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={applyCrop}
                      className="inline-flex items-center gap-2 rounded-md bg-amber-400 px-3 py-1.5 text-xs font-semibold text-black transition hover:brightness-110"
                    >
                      Apply Crop
                    </button>
                    <button
                      type="button"
                      onClick={() => { setCropping(false); setCropRect(null); }}
                      className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-300 transition hover:bg-white/10"
                    >
                      Cancel
                    </button>
                  </>
                )}
                <span className="ml-auto text-[11px] text-zinc-500">{pending.width} × {pending.height}px</span>
              </div>

              <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Title"
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-amber-400/40 focus:outline-none"
                />
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-amber-400/40 focus:outline-none"
                >
                  {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={discard}
                  disabled={saving}
                  className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300 transition hover:bg-white/10 disabled:opacity-50"
                >
                  Discard
                </button>
                <button
                  type="button"
                  onClick={openNotePicker}
                  disabled={saving || !title.trim()}
                  className="inline-flex items-center gap-2 rounded-lg border border-amber-400/40 bg-amber-400/10 px-4 py-2 text-sm font-semibold text-amber-200 transition hover:bg-amber-400/20 disabled:opacity-50"
                >
                  <FileText size={14} aria-hidden="true" /> Save to Note
                </button>
                <button
                  type="button"
                  onClick={() => void save()}
                  disabled={saving || !title.trim()}
                  className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-br from-teal-400 to-cyan-500 px-4 py-2 text-sm font-semibold text-black transition hover:brightness-110 disabled:opacity-50"
                >
                  {saving ? <><Loader2 size={14} className="animate-spin" aria-hidden="true" /> Saving</> : "Save Capture"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Gallery */}
      <section className="rounded-2xl border border-white/10 bg-black/40 p-4 backdrop-blur-xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-300">Recent Captures</h2>
          {galleryLoading && <Loader2 size={14} className="animate-spin text-zinc-500" aria-hidden="true" />}
        </div>
        {!galleryLoading && screenshots.length === 0 ? (
          <p className="text-xs text-zinc-500">No captures yet. Start a session and snap your first frame.</p>
        ) : (
          <div className="[column-fill:_balance] gap-3 sm:columns-2 md:columns-3">
            {screenshots.map((s) => (
              <figure
                key={s.id}
                className="group relative mb-3 break-inside-avoid overflow-hidden rounded-xl border border-white/10 bg-zinc-900"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.imageData} alt={s.title} className="block w-full" loading="lazy" />
                <figcaption className="flex items-center justify-between gap-2 px-3 py-2 text-[11px]">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-white">{s.title}</p>
                    <p className="truncate text-[10px] text-zinc-500">
                      {s.subject} · {new Date(s.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => setViewer(s.imageData)}
                      className="rounded-md p-1.5 text-zinc-300 transition hover:bg-white/10 hover:text-white"
                      aria-label="View full size"
                    >
                      <ZoomIn size={12} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void remove(s.id)}
                      className="rounded-md p-1.5 text-zinc-300 transition hover:bg-red-500/20 hover:text-red-300"
                      aria-label="Delete"
                    >
                      <Trash2 size={12} aria-hidden="true" />
                    </button>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </section>

      {/* Note picker modal */}
      <AnimatePresence>
        {notePickerOpen && (
          <motion.div
            key="note-picker-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[65] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
            onClick={(e) => { if (e.target === e.currentTarget && !transferring) setNotePickerOpen(false); }}
          >
            <motion.div
              key="note-picker-panel"
              initial={{ opacity: 0, scale: 0.92, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ type: "spring", stiffness: 300, damping: 24 }}
              className="flex max-h-[82vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/70 shadow-[0_12px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-200">Save to Note</h3>
                  <p className="mt-0.5 text-[11px] text-zinc-500">Pick a note to attach this capture to.</p>
                </div>
                <button
                  type="button"
                  onClick={() => { if (!transferring) setNotePickerOpen(false); }}
                  className="rounded-md p-1.5 text-zinc-400 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
                  disabled={transferring}
                  aria-label="Close"
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </div>

              <div className="px-5 pt-3">
                <div className="relative">
                  <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" aria-hidden="true" />
                  <input
                    type="text"
                    value={noteQuery}
                    onChange={(e) => {
                      setNoteQuery(e.target.value);
                      void loadNotes(e.target.value);
                    }}
                    placeholder="Search your notes..."
                    className="w-full rounded-lg border border-white/10 bg-black/40 py-2 pl-9 pr-3 text-sm text-white placeholder:text-zinc-600 focus:border-amber-400/40 focus:outline-none"
                    disabled={transferring}
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-3 py-3">
                {notesLoading ? (
                  <div className="flex items-center justify-center py-8 text-xs text-zinc-500">
                    <Loader2 size={14} className="mr-2 animate-spin" aria-hidden="true" /> Loading notes…
                  </div>
                ) : noteOptions.length === 0 ? (
                  <p className="px-2 py-6 text-center text-xs text-zinc-500">
                    No notes match. Create a note first, then link the capture.
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {noteOptions.map((n) => (
                      <li key={n.id}>
                        <button
                          type="button"
                          onClick={() => void saveToNote(n.id)}
                          disabled={transferring}
                          className="flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <FileText size={16} className="mt-0.5 shrink-0 text-amber-400" aria-hidden="true" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-white">{n.title}</p>
                            <p className="mt-0.5 text-[10px] text-zinc-500">Updated {new Date(n.updatedAt).toLocaleDateString()}</p>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Transferring progress */}
              <AnimatePresence>
                {transferring && (
                  <motion.div
                    key="transfer-bar"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="border-t border-amber-400/20 bg-amber-500/5 px-5 py-3"
                  >
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-amber-300">
                      Transferring to note…
                    </p>
                    <div className="relative h-1.5 overflow-hidden rounded-full bg-black/60">
                      <motion.div
                        className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500"
                        animate={{ width: `${Math.min(100, transferProgress)}%` }}
                        transition={{ duration: 0.25, ease: "easeOut" }}
                        style={{ boxShadow: "0 0 12px rgba(240,180,41,0.7), 0 0 24px rgba(240,180,41,0.35)" }}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full-size viewer */}
      {viewer && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-6 backdrop-blur-sm"
          onClick={() => setViewer(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={viewer} alt="Full size capture" className="max-h-full max-w-full rounded-xl border border-white/10" />
          <button
            type="button"
            onClick={() => setViewer(null)}
            className="absolute right-4 top-4 rounded-md bg-black/60 p-2 text-zinc-200 transition hover:bg-black/80"
            aria-label="Close viewer"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
