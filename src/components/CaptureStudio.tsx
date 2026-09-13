"use client";

/**
 * Capture Studio — stitched scroll capture + live crop + ecosystem handoffs.
 * First paint is server-identical; profile/desktop flags load in useEffect.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Camera,
  Crop,
  Download,
  Inbox,
  Loader2,
  Monitor,
  Square,
  StopCircle,
  Trash2,
} from "lucide-react";
import {
  CAPTURE_INBOX_KEY,
  CAPTURE_NOVA_KEY,
  CAPTURE_PHOTO_QUIZ_KEY,
  readStudyProfile,
  writeCaptureHandoff,
} from "~/lib/capture-handoff";
import {
  canvasToPngDataUrl,
  captureVideoFrame,
  cropCanvas,
  DEFAULT_STITCH_LIMITS,
  estimateScrollDelta,
  stitchFrames,
} from "~/lib/capture-stitch";
import {
  detectDeviceClass,
  deviceLabel,
  sourceLabel,
  type DeviceClass,
} from "~/lib/device-class";
import {
  type CaptureRecord,
  fetchRecentCaptures,
  persistCapture,
} from "~/lib/persist-capture";
import { formatTorontoDate } from "~/lib/toronto-time";
import { tutorHref } from "~/lib/tutor-mode";

type Phase = "idle" | "sharing" | "stitching" | "review";

type CropRect = { x: number; y: number; w: number; h: number };

type SavedCrop = {
  id: string;
  label: string;
  dataUrl: string;
  width: number;
  height: number;
  remoteId?: string;
};

type Handle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw" | "move";

const TIMED_MS = 450;

function makeCropId() {
  return `crop-${Math.random().toString(36).slice(2, 9)}`;
}

export default function CaptureStudio() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const framesRef = useRef<HTMLCanvasElement[]>([]);
  const deltasRef = useRef<number[]>([0]);
  const timedRef = useRef<number | null>(null);
  const stitchPreviewRef = useRef<HTMLCanvasElement | null>(null);
  const cropViewportRef = useRef<HTMLDivElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const dragRef = useRef<{
    handle: Handle;
    startX: number;
    startY: number;
    origin: CropRect;
  } | null>(null);

  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [frameCount, setFrameCount] = useState(0);
  const [stitchedUrl, setStitchedUrl] = useState<string | null>(null);
  const [stitchSize, setStitchSize] = useState<{ w: number; h: number } | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [timedOn, setTimedOn] = useState(false);
  const [deviceClass, setDeviceClass] = useState<DeviceClass>("desktop");
  const [courses, setCourses] = useState<string[]>([]);
  const [course, setCourse] = useState("");
  const [headerCropPx, setHeaderCropPx] = useState(0);
  const [footerCropPx, setFooterCropPx] = useState(0);
  const [crop, setCrop] = useState<CropRect | null>(null);
  const [crops, setCrops] = useState<SavedCrop[]>([]);
  const [busy, setBusy] = useState(false);
  const [displayScale, setDisplayScale] = useState(1);
  const [gallery, setGallery] = useState<CaptureRecord[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(true);

  const isDesktop = deviceClass === "desktop";
  const isPhone = deviceClass === "phone";

  const loadGallery = useCallback(async () => {
    setGalleryLoading(true);
    try {
      const items = await fetchRecentCaptures(40);
      setGallery(items);
    } finally {
      setGalleryLoading(false);
    }
  }, []);

  // Hydration-safe: device + courses + gallery only after mount
  useEffect(() => {
    setDeviceClass(detectDeviceClass());
    const profile = readStudyProfile();
    const list = (profile?.courses ?? []).map((c) => c.trim()).filter(Boolean);
    setCourses(list);
    if (list[0]) setCourse(list[0]!);
    void loadGallery();
  }, [loadGallery]);

  useEffect(() => {
    const onFocus = () => void loadGallery();
    const onVis = () => {
      if (document.visibilityState === "visible") void loadGallery();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [loadGallery]);

  const stopTimed = useCallback(() => {
    if (timedRef.current != null) {
      window.clearInterval(timedRef.current);
      timedRef.current = null;
    }
    setTimedOn(false);
  }, []);

  const stopStream = useCallback(() => {
    stopTimed();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, [stopTimed]);

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

  const rebuildStitch = useCallback(() => {
    const frames = framesRef.current;
    if (frames.length === 0) {
      setStitchedUrl(null);
      setStitchSize(null);
      return;
    }

    // Optional sticky header/footer crop-out on each frame before stitch
    const prepared = frames.map((src) => {
      const top = Math.max(0, Math.min(headerCropPx, Math.floor(src.height * 0.4)));
      const bottom = Math.max(0, Math.min(footerCropPx, Math.floor(src.height * 0.4)));
      if (top === 0 && bottom === 0) return src;
      const h = Math.max(1, src.height - top - bottom);
      const c = document.createElement("canvas");
      c.width = src.width;
      c.height = h;
      c.getContext("2d")?.drawImage(src, 0, top, src.width, h, 0, 0, src.width, h);
      return c;
    });

    const result = stitchFrames(prepared, deltasRef.current, DEFAULT_STITCH_LIMITS);
    if (!result) return;
    stitchPreviewRef.current = result.canvas;
    setTruncated(result.truncated);
    setStitchSize({ w: result.canvas.width, h: result.canvas.height });
    setStitchedUrl(canvasToPngDataUrl(result.canvas));
    setFrameCount(result.usedFrames);

    // Default crop: full width, visible-ish band
    setCrop((prev) => {
      if (prev) return prev;
      const w = result.canvas.width;
      const h = result.canvas.height;
      return {
        x: Math.floor(w * 0.05),
        y: 0,
        w: Math.floor(w * 0.9),
        h: Math.min(h, Math.floor(w * 0.6)),
      };
    });
  }, [footerCropPx, headerCropPx]);

  useEffect(() => {
    if (phase === "stitching" || phase === "review") rebuildStitch();
  }, [headerCropPx, footerCropPx, phase, rebuildStitch]);

  const appendFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const frame = captureVideoFrame(video);
    if (!frame) {
      setError("Waiting for the shared screen to produce a frame…");
      return;
    }
    const frames = framesRef.current;
    if (frames.length >= DEFAULT_STITCH_LIMITS.maxFrames) {
      setStatus(`Frame limit (${DEFAULT_STITCH_LIMITS.maxFrames}). Finish stitch to crop.`);
      stopTimed();
      return;
    }

    if (frames.length === 0) {
      frames.push(frame);
      deltasRef.current = [0];
    } else {
      const prev = frames[frames.length - 1]!;
      const delta = estimateScrollDelta(prev, frame);
      if (delta === 0) {
        setStatus("No scroll detected — scroll the shared page, then capture again.");
        return;
      }
      frames.push(frame);
      deltasRef.current.push(delta);
    }
    setError(null);
    setStatus(`Frame ${frames.length} · stitch updating…`);
    rebuildStitch();
  }, [rebuildStitch, stopTimed]);

  const startShare = useCallback(async () => {
    setError(null);
    setStatus(null);
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getDisplayMedia) {
      setError("Screen capture needs a recent Chrome, Edge, or Firefox.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 15 },
        audio: false,
      });
      streamRef.current = stream;
      stream.getVideoTracks().forEach((t) =>
        t.addEventListener("ended", () => {
          stopStream();
          setPhase((p) => (framesRef.current.length ? "review" : "idle"));
        }),
      );
      const v = videoRef.current;
      if (v) {
        v.srcObject = stream;
        await v.play().catch(() => undefined);
      }
      framesRef.current = [];
      deltasRef.current = [0];
      setStitchedUrl(null);
      setCrop(null);
      setCrops([]);
      setTruncated(false);
      setPhase("sharing");
      setStatus("Shared. Open Scroll capture, then scroll the page and grab frames.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not start screen share.";
      if (!/permission|denied|aborted|NotAllowed/i.test(msg)) setError(msg);
      stopStream();
      setPhase("idle");
    }
  }, [stopStream]);

  const beginStitch = useCallback(() => {
    if (!streamRef.current) {
      setError("Share a tab or window first.");
      return;
    }
    framesRef.current = [];
    deltasRef.current = [0];
    setCrop(null);
    setCrops([]);
    setStitchedUrl(null);
    setPhase("stitching");
    setStatus("Press Capture frame (or Space) after each scroll. Timed mode: desktop only.");
    // First frame immediately
    window.setTimeout(() => appendFrame(), 120);
  }, [appendFrame]);

  const finishStitch = useCallback(() => {
    stopTimed();
    stopStream();
    rebuildStitch();
    setPhase("review");
    setStatus(
      framesRef.current.length
        ? "Stitch ready — drag the crop box, save regions, send downstream."
        : "No frames captured.",
    );
  }, [rebuildStitch, stopStream, stopTimed]);

  const toggleTimed = useCallback(() => {
    if (!isDesktop) {
      setError("Timed / auto frame capture is desktop-only. On mobile, capture frames manually while you scroll.");
      return;
    }
    if (timedOn) {
      stopTimed();
      setStatus("Timed capture stopped.");
      return;
    }
    setTimedOn(true);
    setStatus("Timed capture on — scroll the shared page; we grab a frame every ~450ms.");
    timedRef.current = window.setInterval(() => appendFrame(), TIMED_MS);
  }, [appendFrame, isDesktop, stopTimed, timedOn]);

  // Space = capture frame while stitching
  useEffect(() => {
    if (phase !== "stitching") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" && e.key !== " ") return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      e.preventDefault();
      appendFrame();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [appendFrame, phase]);

  // Measure display scale for crop overlay
  useEffect(() => {
    const el = cropViewportRef.current;
    if (!el || !stitchSize) return;
    const sync = () => {
      const w = el.clientWidth;
      if (w > 0 && stitchSize.w > 0) setDisplayScale(w / stitchSize.w);
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, [stitchSize, stitchedUrl, phase]);

  const clampCrop = useCallback(
    (r: CropRect): CropRect => {
      if (!stitchSize) return r;
      const w = Math.max(24, Math.min(r.w, stitchSize.w));
      const h = Math.max(24, Math.min(r.h, stitchSize.h));
      const x = Math.max(0, Math.min(r.x, stitchSize.w - w));
      const y = Math.max(0, Math.min(r.y, stitchSize.h - h));
      return { x, y, w, h };
    },
    [stitchSize],
  );

  const onCropPointerDown = (handle: Handle) => (e: React.PointerEvent) => {
    if (!crop) return;
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      handle,
      startX: e.clientX,
      startY: e.clientY,
      origin: { ...crop },
    };
  };

  const onCropPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || !stitchSize) return;
    const dx = (e.clientX - drag.startX) / displayScale;
    const dy = (e.clientY - drag.startY) / displayScale;
    let { x, y, w, h } = drag.origin;
    const H = drag.handle;
    if (H === "move") {
      x += dx;
      y += dy;
    } else {
      if (H.includes("e")) w += dx;
      if (H.includes("w")) {
        x += dx;
        w -= dx;
      }
      if (H.includes("s")) h += dy;
      if (H.includes("n")) {
        y += dy;
        h -= dy;
      }
    }
    setCrop(clampCrop({ x, y, w, h }));
  };

  const onCropPointerUp = () => {
    dragRef.current = null;
  };

  const saveCrop = async () => {
    const canvas = stitchPreviewRef.current;
    if (!canvas || !crop) return;
    const cut = cropCanvas(canvas, crop);
    const dataUrl = canvasToPngDataUrl(cut);
    const item: SavedCrop = {
      id: makeCropId(),
      label: `Crop ${crops.length + 1}`,
      dataUrl,
      width: cut.width,
      height: cut.height,
    };
    setCrops((prev) => [...prev, item]);
    setStatus(`Saved ${item.label} (${cut.width}×${cut.height}) — syncing everywhere…`);
    const remote = await persistCapture({
      title: item.label,
      subject: course.trim() || "General",
      imageData: dataUrl,
      source: "capture-studio",
      sourceDevice: deviceClass,
    });
    if (remote) {
      setCrops((prev) => prev.map((c) => (c.id === item.id ? { ...c, remoteId: remote.id } : c)));
      setStatus(`${item.label} is yours on every device.`);
      void loadGallery();
    } else {
      setStatus(`${item.label} saved locally — cloud sync failed (try again when online).`);
    }
  };

  const openCameraPhoto = () => {
    cameraInputRef.current?.click();
  };

  const onCameraFile = (file: File | null) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result || "");
      const img = new Image();
      img.onload = () => {
        const c = document.createElement("canvas");
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        c.getContext("2d")?.drawImage(img, 0, 0);
        framesRef.current = [c];
        deltasRef.current = [0];
        stitchPreviewRef.current = c;
        setStitchedUrl(canvasToPngDataUrl(c));
        setStitchSize({ w: c.width, h: c.height });
        setCrop({
          x: Math.floor(c.width * 0.05),
          y: 0,
          w: Math.floor(c.width * 0.9),
          h: Math.min(c.height, Math.floor(c.width * 0.7)),
        });
        setPhase("review");
        setStatus("Photo ready — crop and save. It syncs to all your devices.");
        void persistCapture({
          title: file.name.replace(/\.[^.]+$/, "") || "Camera capture",
          subject: course.trim() || "General",
          imageData: canvasToPngDataUrl(c),
          source: isPhone ? "camera" : "upload",
          sourceDevice: deviceClass,
        }).then((remote) => {
          if (remote) void loadGallery();
        });
      };
      img.src = url;
    };
    reader.readAsDataURL(file);
  };

  const downloadCrop = (item: SavedCrop) => {
    const a = document.createElement("a");
    a.href = item.dataUrl;
    a.download = `${item.label.replace(/\s+/g, "-").toLowerCase()}.png`;
    a.click();
  };

  const sendHandoff = (item: SavedCrop, dest: "inbox" | "photo-quiz" | "nova") => {
    setBusy(true);
    setError(null);
    const payload = {
      imageData: item.dataUrl,
      filename: `${item.label.replace(/\s+/g, "-").toLowerCase()}.png`,
      course: course || undefined,
      title: item.label,
      savedAt: Date.now(),
    };
    const key =
      dest === "inbox" ? CAPTURE_INBOX_KEY : dest === "photo-quiz" ? CAPTURE_PHOTO_QUIZ_KEY : CAPTURE_NOVA_KEY;
    const ok = writeCaptureHandoff(key, payload);
    setBusy(false);
    if (!ok) {
      setError("Could not hand off — image may be too large for sessionStorage. Try a tighter crop.");
      return;
    }
    if (dest === "inbox") router.push("/smart-upload");
    else if (dest === "photo-quiz") router.push("/photo-quiz");
    else router.push(tutorHref("vision"));
  };

  const snapSingle = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const frame = captureVideoFrame(video);
    if (!frame) return;
    framesRef.current = [frame];
    deltasRef.current = [0];
    stopTimed();
    stopStream();
    rebuildStitch();
    setPhase("review");
    setStatus("Single frame captured — crop and send.");
  }, [rebuildStitch, stopStream, stopTimed]);

  const resetAll = () => {
    stopStream();
    framesRef.current = [];
    deltasRef.current = [0];
    stitchPreviewRef.current = null;
    setStitchedUrl(null);
    setStitchSize(null);
    setCrop(null);
    setCrops([]);
    setPhase("idle");
    setStatus(null);
    setError(null);
    setTruncated(false);
    setFrameCount(0);
  };

  const handles: Handle[] = ["nw", "n", "ne", "w", "e", "sw", "s", "se"];

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 py-8">
      <div className="kv-crumb">
        Kyvex / <b>Capture Studio</b>
      </div>
      <h1 className="kv-title" style={{ marginTop: 14 }}>
        Capture Studio
      </h1>
      <p className="kv-sub mt-2 max-w-[54ch]">
        Stitch a scrolling page into one tall image, crop regions live, then send them to Inbox, Photo-Quiz, or
        Nova.
      </p>

      <div
        className="mt-4 rounded border px-3 py-2 text-[13px] leading-relaxed"
        style={{ borderColor: "var(--kv-border)", background: "var(--kv-surface)", color: "var(--kv-muted)" }}
      >
        <strong style={{ color: "var(--kv-ink)" }}>Honest limits:</strong> works on normal scrolling pages.
        Sticky headers/footers can smear — use the crop-out sliders. DRM / Netflix-style protected content will not
        appear in the share. Timed frame capture is <strong>desktop-only</strong>
        {isPhone ? " — on phone use camera or manual Capture frame while you scroll" : ""}. Every saved crop syncs to
        this gallery on all your devices.
      </div>

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(e) => {
          onCameraFile(e.target.files?.[0] ?? null);
          e.target.value = "";
        }}
      />

      {error ? (
        <div className="mt-3 rounded border px-3 py-2 text-[13px]" style={{ borderColor: "#c44", color: "#c44" }}>
          {error}
        </div>
      ) : null}
      {status ? (
        <p className="mt-3 text-[13px]" style={{ color: "var(--kv-muted)" }}>
          {status}
          {truncated ? " · Height/frame limit hit — stitch truncated." : ""}
        </p>
      ) : null}

      {/* Course chip */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <label className="text-[12px]" style={{ color: "var(--kv-muted)" }}>
          Course chip
        </label>
        {courses.length > 0 ? (
          <select
            className="kv-input"
            style={{ width: "auto", minWidth: 120 }}
            value={course}
            onChange={(e) => setCourse(e.target.value)}
          >
            <option value="">None</option>
            {courses.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        ) : (
          <input
            className="kv-input"
            style={{ width: 140 }}
            placeholder="e.g. MHF4U"
            value={course}
            onChange={(e) => setCourse(e.target.value.toUpperCase())}
          />
        )}
        <span className="text-[12px]" style={{ color: "var(--kv-muted)" }}>
          From study profile when set · travels with Inbox / Quiz handoffs
        </span>
      </div>

      {/* Actions — phone: camera-first; desktop: share-first */}
      <div className="mt-5 flex flex-wrap gap-2">
        {phase === "idle" || phase === "review" ? (
          <>
            {isPhone ? (
              <>
                <button type="button" className="kv-btn" onClick={openCameraPhoto}>
                  <Camera size={16} /> Take / pick photo
                </button>
                <button type="button" className="kv-btn-ghost" onClick={() => void startShare()}>
                  <Monitor size={16} /> Share tab (manual scroll)
                </button>
              </>
            ) : (
              <>
                <button type="button" className="kv-btn" onClick={() => void startShare()}>
                  <Monitor size={16} /> Share tab / window
                </button>
                <button type="button" className="kv-btn-ghost" onClick={openCameraPhoto}>
                  <Camera size={16} /> Upload photo
                </button>
              </>
            )}
          </>
        ) : null}
        {phase === "sharing" || phase === "stitching" ? (
          <>
            {phase === "sharing" ? (
              <button type="button" className="kv-btn" onClick={beginStitch}>
                <Camera size={16} /> Start scroll capture
              </button>
            ) : null}
            {phase === "stitching" ? (
              <>
                <button type="button" className="kv-btn" onClick={appendFrame}>
                  <Camera size={16} /> Capture frame
                </button>
                {isDesktop ? (
                  <button type="button" className="kv-btn-ghost" onClick={toggleTimed}>
                    {timedOn ? <StopCircle size={16} /> : <Square size={16} />}
                    {timedOn ? "Stop timed" : "Timed frames"}
                  </button>
                ) : (
                  <span className="text-[12px] self-center" style={{ color: "var(--kv-muted)" }}>
                    Timed frames: desktop only
                  </span>
                )}
                <button type="button" className="kv-btn-ghost" onClick={finishStitch}>
                  Finish stitch
                </button>
              </>
            ) : null}
            <button type="button" className="kv-btn-ghost" onClick={snapSingle}>
              Single snap
            </button>
            <button type="button" className="kv-btn-ghost" onClick={resetAll}>
              Cancel share
            </button>
          </>
        ) : null}
        {phase === "review" ? (
          <button type="button" className="kv-btn-ghost" onClick={resetAll}>
            New capture
          </button>
        ) : null}
      </div>

      {/* Single persistent video — stream stays attached across phases */}
      <div
        className={
          phase === "sharing" || phase === "stitching"
            ? "mt-6 grid gap-4 lg:grid-cols-[1fr_1fr]"
            : undefined
        }
      >
        <div className={phase === "sharing" || phase === "stitching" ? undefined : "sr-only"}>
          {(phase === "sharing" || phase === "stitching") && (
            <div className="text-[12px] mb-2" style={{ color: "var(--kv-muted)" }}>
              Live share
            </div>
          )}
          <div
            className={
              phase === "sharing" || phase === "stitching"
                ? "overflow-hidden rounded border"
                : undefined
            }
            style={
              phase === "sharing" || phase === "stitching"
                ? { borderColor: "var(--kv-border)", background: "#111" }
                : undefined
            }
          >
            <video
              ref={videoRef}
              muted
              playsInline
              autoPlay
              className={
                phase === "sharing" || phase === "stitching"
                  ? "w-full max-h-[320px] object-contain"
                  : "sr-only"
              }
              aria-hidden={phase !== "sharing" && phase !== "stitching"}
            />
          </div>
          {(phase === "sharing" || phase === "stitching") && (
            <p className="mt-2 text-[12px]" style={{ color: "var(--kv-muted)" }}>
              Frames: {frameCount}
              {isDesktop ? " · Space = capture frame" : " · Tap Capture frame after each scroll"}
            </p>
          )}
        </div>

        {(phase === "sharing" || phase === "stitching") && (
          <div>
            <div className="text-[12px] mb-2" style={{ color: "var(--kv-muted)" }}>
              Stitched preview
            </div>
            <div
              className="overflow-auto rounded border max-h-[320px]"
              style={{ borderColor: "var(--kv-border)", background: "var(--kv-surface)" }}
            >
              {stitchedUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={stitchedUrl} alt="Stitched scroll preview" className="w-full h-auto" />
              ) : (
                <div className="p-6 text-[13px]" style={{ color: "var(--kv-muted)" }}>
                  Capture frames to build the tall image here.
                </div>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-[12px]" style={{ color: "var(--kv-muted)" }}>
              <label className="flex items-center gap-2">
                Sticky header crop-out
                <input
                  type="range"
                  min={0}
                  max={200}
                  value={headerCropPx}
                  onChange={(e) => setHeaderCropPx(Number(e.target.value))}
                />
                <span>{headerCropPx}px</span>
              </label>
              <label className="flex items-center gap-2">
                Footer crop-out
                <input
                  type="range"
                  min={0}
                  max={200}
                  value={footerCropPx}
                  onChange={(e) => setFooterCropPx(Number(e.target.value))}
                />
                <span>{footerCropPx}px</span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Review + live crop */}
      {phase === "review" && stitchedUrl && stitchSize && crop ? (
        <div className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div className="text-[12px]" style={{ color: "var(--kv-muted)" }}>
              Live crop · {stitchSize.w}×{stitchSize.h}px stitch
            </div>
            <button type="button" className="kv-btn" onClick={() => void saveCrop()}>
              <Crop size={16} /> Save this crop
            </button>
          </div>
          <div
            ref={cropViewportRef}
            className="relative overflow-auto rounded border max-h-[min(70vh,720px)]"
            style={{ borderColor: "var(--kv-border)", background: "#0c0c0c" }}
            onPointerMove={onCropPointerMove}
            onPointerUp={onCropPointerUp}
            onPointerCancel={onCropPointerUp}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={stitchedUrl}
              alt="Stitched capture"
              className="block w-full h-auto select-none pointer-events-none"
              draggable={false}
            />
            {/* Dim mask outside crop */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `linear-gradient(#0008,#0008) 0 0 / 100% ${crop.y * displayScale}px no-repeat,
                  linear-gradient(#0008,#0008) 0 ${(crop.y + crop.h) * displayScale}px / 100% 100% no-repeat,
                  linear-gradient(#0008,#0008) 0 ${crop.y * displayScale}px / ${crop.x * displayScale}px ${crop.h * displayScale}px no-repeat,
                  linear-gradient(#0008,#0008) ${(crop.x + crop.w) * displayScale}px ${crop.y * displayScale}px / 100% ${crop.h * displayScale}px no-repeat`,
              }}
            />
            <div
              role="presentation"
              className="absolute border-2"
              style={{
                left: crop.x * displayScale,
                top: crop.y * displayScale,
                width: crop.w * displayScale,
                height: crop.h * displayScale,
                borderColor: "var(--kv-accent)",
                boxShadow: "0 0 0 1px #0006",
                cursor: "move",
                touchAction: "none",
              }}
              onPointerDown={onCropPointerDown("move")}
            >
              {handles.map((h) => {
                const size = 10;
                const style: React.CSSProperties = {
                  position: "absolute",
                  width: size,
                  height: size,
                  background: "var(--kv-accent)",
                  border: "1px solid #15150F",
                  touchAction: "none",
                };
                if (h.includes("n")) style.top = -size / 2;
                if (h.includes("s")) style.bottom = -size / 2;
                if (h.includes("w")) style.left = -size / 2;
                if (h.includes("e")) style.right = -size / 2;
                if (h === "n" || h === "s") style.left = `calc(50% - ${size / 2}px)`;
                if (h === "e" || h === "w") style.top = `calc(50% - ${size / 2}px)`;
                const cursor =
                  h === "n" || h === "s"
                    ? "ns-resize"
                    : h === "e" || h === "w"
                      ? "ew-resize"
                      : h === "ne" || h === "sw"
                        ? "nesw-resize"
                        : "nwse-resize";
                return (
                  <div
                    key={h}
                    style={{ ...style, cursor }}
                    onPointerDown={onCropPointerDown(h)}
                  />
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      {/* Saved crops */}
      {crops.length > 0 ? (
        <div className="mt-8">
          <h2 className="text-[15px] font-medium" style={{ color: "var(--kv-ink)" }}>
            Crops ({crops.length})
          </h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {crops.map((item) => (
              <li
                key={item.id}
                className="rounded border p-3"
                style={{ borderColor: "var(--kv-border)", background: "var(--kv-surface)" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.dataUrl}
                  alt={item.label}
                  className="w-full max-h-40 object-contain rounded mb-2"
                  style={{ background: "#111" }}
                />
                <div className="text-[13px]" style={{ color: "var(--kv-ink)" }}>
                  {item.label} · {item.width}×{item.height}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <button type="button" className="kv-btn-ghost" style={{ padding: "4px 8px", fontSize: 12 }} onClick={() => downloadCrop(item)}>
                    <Download size={14} /> PNG
                  </button>
                  <button
                    type="button"
                    className="kv-btn-ghost"
                    style={{ padding: "4px 8px", fontSize: 12 }}
                    disabled={busy}
                    onClick={() => sendHandoff(item, "inbox")}
                  >
                    {busy ? <Loader2 size={14} className="animate-spin" /> : <Inbox size={14} />} Inbox
                  </button>
                  <button
                    type="button"
                    className="kv-btn-ghost"
                    style={{ padding: "4px 8px", fontSize: 12 }}
                    disabled={busy}
                    onClick={() => sendHandoff(item, "photo-quiz")}
                  >
                    Photo-Quiz
                  </button>
                  <button
                    type="button"
                    className="kv-btn-ghost"
                    style={{ padding: "4px 8px", fontSize: 12 }}
                    disabled={busy}
                    onClick={() => sendHandoff(item, "nova")}
                  >
                    Nova
                  </button>
                  <button
                    type="button"
                    className="kv-btn-ghost"
                    style={{ padding: "4px 8px", fontSize: 12 }}
                    onClick={() => setCrops((prev) => prev.filter((c) => c.id !== item.id))}
                    aria-label={`Remove ${item.label}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {phase === "idle" ? (
        <div
          className="mt-10 rounded border px-4 py-6 text-[14px] leading-relaxed"
          style={{ borderColor: "var(--kv-border)", color: "var(--kv-muted)" }}
        >
          <ol className="list-decimal pl-5 space-y-2">
            {isPhone ? (
              <>
                <li>Snap the whiteboard or page with Take photo — crop what you need.</li>
                <li>Or share a tab and Capture frame after each scroll (no timed auto-scroll on phone).</li>
                <li>Saved crops show up here and on your laptop under Just captured.</li>
              </>
            ) : (
              <>
                <li>Share the tab or window you want to capture.</li>
                <li>Start scroll capture — scroll the page, then Capture frame (or Space). Timed frames: desktop only.</li>
                <li>Drag the crop box, save regions — they sync to every device.</li>
              </>
            )}
          </ol>
        </div>
      ) : null}

      {/* Global gallery — yours, everywhere */}
      <section className="mt-12" data-surface="capture-gallery">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-[15px] font-medium" style={{ color: "var(--kv-ink)" }}>
              Yours, everywhere
            </h2>
            <p className="text-[12px] mt-1" style={{ color: "var(--kv-muted)" }}>
              Captures from phone, tablet, and laptop — plus Inbox photos.
            </p>
          </div>
          <button type="button" className="kv-btn-ghost" style={{ fontSize: 12 }} onClick={() => void loadGallery()}>
            Refresh
          </button>
        </div>
        {galleryLoading ? (
          <p className="mt-4 text-[13px]" style={{ color: "var(--kv-muted)" }}>
            Loading gallery…
          </p>
        ) : gallery.length === 0 ? (
          <p className="mt-4 text-[13px]" style={{ color: "var(--kv-muted)" }}>
            No captures yet. Save a crop or drop a photo in Inbox.
          </p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {gallery.map((item) => (
              <li
                key={item.id}
                className="rounded border overflow-hidden"
                style={{ borderColor: "var(--kv-border)", background: "var(--kv-surface)" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.imageData}
                  alt={item.title}
                  className="w-full h-36 object-cover"
                  style={{ background: "#111" }}
                />
                <div className="p-3">
                  <div className="text-[13px] font-medium" style={{ color: "var(--kv-ink)" }}>
                    {item.title}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1.5 text-[11px]" style={{ color: "var(--kv-muted)" }}>
                    <span className="kv-chip">{deviceLabel(item.sourceDevice)}</span>
                    <span className="kv-chip">{sourceLabel(item.source)}</span>
                    {item.subject && item.subject !== "General" ? (
                      <span className="kv-chip kv-chip-course">{item.subject}</span>
                    ) : null}
                    <span>{formatTorontoDate(item.createdAt)}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      className="kv-btn-ghost"
                      style={{ padding: "4px 8px", fontSize: 12 }}
                      onClick={() => {
                        if (item.noteId) {
                          const q = new URLSearchParams({ generateFrom: item.noteId });
                          if (item.subject && item.subject !== "General") q.set("course", item.subject);
                          router.push(`/flashcards?${q}`);
                          return;
                        }
                        try {
                          sessionStorage.setItem(
                            "kyvex-capture-deck-topic",
                            JSON.stringify({
                              topic: item.title,
                              subject: item.subject !== "General" ? item.subject : "",
                              savedAt: Date.now(),
                            }),
                          );
                        } catch {
                          // ignore
                        }
                        const q = new URLSearchParams({ fromCapture: "1" });
                        if (item.subject && item.subject !== "General") q.set("course", item.subject);
                        router.push(`/flashcards?${q}`);
                      }}
                    >
                      Make cards
                    </button>
                    <button
                      type="button"
                      className="kv-btn-ghost"
                      style={{ padding: "4px 8px", fontSize: 12 }}
                      onClick={() => {
                        writeCaptureHandoff(CAPTURE_NOVA_KEY, {
                          imageData: item.imageData,
                          filename: "capture.png",
                          course: item.subject !== "General" ? item.subject : undefined,
                          title: item.title,
                          savedAt: Date.now(),
                        });
                        router.push(tutorHref("vision"));
                      }}
                    >
                      Ask Nova
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
