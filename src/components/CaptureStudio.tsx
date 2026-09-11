"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, CircleDot, Crop, FileText, Loader2, Monitor, Search, Square, Trash2, Upload, X, ZoomIn } from "lucide-react";
import { formatTorontoDate } from "~/lib/toronto-time";

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
    if (!v?.videoWidth || !v.videoHeight) return;
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
    <main className="kv-page" style={{ padding: "24px 16px 100px" }}>
      <header style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div className="kv-crumb">Kyvex / <b>Capture Studio</b></div>
          <h1 className="kv-title" style={{ marginTop: 14 }}>Capture Studio</h1>
          <p className="kv-sub" style={{ marginTop: 10 }}>Stream a window, snap any frame, save to your gallery.</p>
        </div>
        {streaming ? (
          <span className="kv-meta" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <span className="dot" /> Live
          </span>
        ) : (
          <span className="kv-meta">Idle</span>
        )}
      </header>

      <section style={{ marginTop: 22 }}>
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
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginTop: 16 }}>
          {!streaming ? (
            <button type="button" onClick={() => void startCapture()} className="kv-btn">
              <Monitor size={16} aria-hidden="true" /> Start Capture
            </button>
          ) : (
            <>
              <button type="button" onClick={snap} className="kv-btn">
                <Camera size={16} aria-hidden="true" /> Snap
              </button>
              <button type="button" onClick={stopStream} className="kv-btn-ghost">
                <Square size={14} aria-hidden="true" /> Stop
              </button>
            </>
          )}
          <button type="button" onClick={() => fileInputRef.current?.click()} className="kv-btn-ghost">
            <Upload size={14} aria-hidden="true" /> Upload
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

        {!streaming && !pending && (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) handleFile(f);
            }}
            className="kv-dropzone"
            style={{ marginTop: 12, padding: "16px 12px", textAlign: "center" }}
          >
            <p className="kv-meta" style={{ margin: 0 }}>…or drop a screenshot file here</p>
          </div>
        )}

        {error ? (
          <p className="kv-meta" style={{ marginTop: 12, color: "#E5484D" }}>{error}</p>
        ) : null}
      </section>

      {/* Preview / Save modal */}
      {pending && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.72)" }}>
          <div
            className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden"
            style={{ border: "1px solid var(--border-default)", background: "var(--bg-elevated)" }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border-default)", padding: "12px 16px" }}>
              <h2 className="kv-meta" style={{ margin: 0 }}>Review &amp; Save</h2>
              <button type="button" onClick={discard} className="kv-btn-ghost" aria-label="Discard">
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

            <div style={{ borderTop: "1px solid var(--border-default)", padding: 16, display: "grid", gap: 12 }}>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                {!cropping ? (
                  <button
                    type="button"
                    onClick={() => { setCropping(true); setCropRect(null); }}
                    className="kv-btn-ghost"
                  >
                    <Crop size={12} aria-hidden="true" /> Crop
                  </button>
                ) : (
                  <>
                    <button type="button" onClick={applyCrop} className="kv-btn">
                      Apply Crop
                    </button>
                    <button
                      type="button"
                      onClick={() => { setCropping(false); setCropRect(null); }}
                      className="kv-btn-ghost"
                    >
                      Cancel
                    </button>
                  </>
                )}
                <span className="kv-meta" style={{ marginLeft: "auto" }}>{pending.width} × {pending.height}px</span>
              </div>

              <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
                <div>
                  <label className="kv-meta" htmlFor="capture-title">Title</label>
                  <input
                    id="capture-title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Title"
                    className="kv-field"
                    style={{ marginTop: 6 }}
                  />
                </div>
                <div>
                  <label className="kv-meta" htmlFor="capture-subject">Subject</label>
                  <select
                    id="capture-subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="kv-field"
                    style={{ marginTop: 6 }}
                  >
                    {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-end", gap: 8 }}>
                <button type="button" onClick={discard} disabled={saving} className="kv-btn-ghost">
                  Discard
                </button>
                <button
                  type="button"
                  onClick={openNotePicker}
                  disabled={saving || !title.trim()}
                  className="kv-btn-ghost"
                >
                  <FileText size={14} aria-hidden="true" /> Save to Note
                </button>
                <button
                  type="button"
                  onClick={() => void save()}
                  disabled={saving || !title.trim()}
                  className="kv-btn"
                >
                  {saving ? <><Loader2 size={14} className="animate-spin" aria-hidden="true" /> Saving</> : "Save Capture"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Gallery */}
      <section style={{ marginTop: 28 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <h2 className="kv-meta" style={{ margin: 0 }}>Recent Captures</h2>
          {galleryLoading && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
        </div>
        {!galleryLoading && screenshots.length === 0 ? (
          <p className="kv-sub">No captures yet. Start a session and snap your first frame.</p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              borderTop: "1px solid var(--border-default)",
              borderLeft: "1px solid var(--border-default)",
            }}
          >
            {screenshots.map((s) => (
              <figure
                key={s.id}
                style={{
                  margin: 0,
                  borderRight: "1px solid var(--border-default)",
                  borderBottom: "1px solid var(--border-default)",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.imageData} alt={s.title} style={{ display: "block", width: "100%" }} loading="lazy" />
                <figcaption style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "10px 12px" }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.title}</p>
                    <p className="kv-meta" style={{ marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {s.subject} · {new Date(s.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div style={{ display: "flex", flexShrink: 0, gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => setViewer(s.imageData)}
                      className="kv-btn-ghost"
                      aria-label="View full size"
                    >
                      <ZoomIn size={12} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void remove(s.id)}
                      className="kv-btn-danger"
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
      {notePickerOpen && (
        <div
          className="fixed inset-0 z-[65] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.72)" }}
          onClick={(e) => { if (e.target === e.currentTarget && !transferring) setNotePickerOpen(false); }}
        >
          <div
            className="flex max-h-[82vh] w-full max-w-lg flex-col overflow-hidden"
            style={{ border: "1px solid var(--border-default)", background: "var(--bg-elevated)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border-default)", padding: "12px 16px" }}>
              <div>
                <h3 className="kv-meta" style={{ margin: 0 }}>Save to Note</h3>
                <p className="kv-sub" style={{ marginTop: 6, fontSize: 13 }}>Pick a note to attach this capture to.</p>
              </div>
              <button
                type="button"
                onClick={() => { if (!transferring) setNotePickerOpen(false); }}
                className="kv-btn-ghost"
                disabled={transferring}
                aria-label="Close"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>

            <div style={{ padding: "12px 16px 0" }}>
              <label className="kv-meta" htmlFor="capture-note-search">Search</label>
              <div style={{ position: "relative", marginTop: 6 }}>
                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
                <input
                  id="capture-note-search"
                  type="text"
                  value={noteQuery}
                  onChange={(e) => {
                    setNoteQuery(e.target.value);
                    void loadNotes(e.target.value);
                  }}
                  placeholder="Search your notes..."
                  className="kv-field"
                  style={{ paddingLeft: 32 }}
                  disabled={transferring}
                  autoFocus
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto" style={{ padding: "8px 16px 16px" }}>
              {notesLoading ? (
                <p className="kv-meta" style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 0" }}>
                  <Loader2 size={14} className="mr-2 animate-spin" aria-hidden="true" /> Loading notes…
                </p>
              ) : noteOptions.length === 0 ? (
                <p className="kv-sub" style={{ textAlign: "center", padding: "24px 8px" }}>
                  No notes match. Create a note first, then link the capture.
                </p>
              ) : (
                <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                  {noteOptions.map((n) => (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => void saveToNote(n.id)}
                        disabled={transferring}
                        className="kv-row"
                        style={{ width: "100%", background: "transparent", border: "none", borderTop: "1px solid var(--border-default)", cursor: transferring ? "not-allowed" : "pointer", opacity: transferring ? 0.5 : 1, textAlign: "left" }}
                      >
                        <FileText size={16} className="shrink-0" aria-hidden="true" />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <p className="kv-row-title" style={{ margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.title}</p>
                          <p className="kv-meta" style={{ marginTop: 4 }}>Updated {formatTorontoDate(n.updatedAt)}</p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {transferring ? (
              <div style={{ borderTop: "1px solid var(--border-default)", padding: "12px 16px" }}>
                <p className="kv-meta" style={{ marginBottom: 8 }}>Transferring to note…</p>
                <div className="kv-bar">
                  <div style={{ width: `${Math.min(100, transferProgress)}%` }} />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Full-size viewer */}
      {viewer && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-6"
          style={{ background: "rgba(0,0,0,0.85)" }}
          onClick={() => setViewer(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={viewer} alt="Full size capture" className="max-h-full max-w-full" style={{ border: "1px solid var(--border-default)" }} />
          <button
            type="button"
            onClick={() => setViewer(null)}
            className="kv-btn-ghost"
            style={{ position: "absolute", right: 16, top: 16 }}
            aria-label="Close viewer"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      )}
    </main>
  );
}
