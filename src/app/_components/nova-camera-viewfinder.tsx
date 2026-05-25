"use client";

/**
 * Phase 3 — Nova Live Vision: Camera Viewfinder
 *
 * Wraps getUserMedia in a Midnight-Glass frame. Exposes an imperative `snap()`
 * via ref that returns a downscaled JPEG base64 + mime ready to ship to the
 * vision API.
 */

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { motion } from "framer-motion";
import { Camera, RefreshCw, RotateCw, Video, VideoOff } from "lucide-react";

export type Snapshot = { base64: string; mimeType: string };

export type NovaCameraHandle = {
  snap: () => Promise<Snapshot | null>;
  hasStream: () => boolean;
};

type Facing = "user" | "environment";

type Props = {
  /** Override the default 1024px long-axis snapshot size. */
  maxLongAxis?: number;
  /** JPEG quality (0–1). Defaults to 0.85. */
  jpegQuality?: number;
  /** Notified when the camera transitions ready/error. */
  onReadyChange?: (ready: boolean) => void;
};

const NovaCameraViewfinder = forwardRef<NovaCameraHandle, Props>(function NovaCameraViewfinder(
  { maxLongAxis = 1024, jpegQuality = 0.85, onReadyChange },
  ref,
) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<Facing>("environment");
  const [status, setStatus] = useState<"idle" | "starting" | "live" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [flashing, setFlashing] = useState(false);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startStream = useCallback(
    async (nextFacing: Facing) => {
      stopStream();
      setStatus("starting");
      setErrorMsg("");

      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setStatus("error");
        setErrorMsg("Camera API not available in this browser.");
        onReadyChange?.(false);
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: nextFacing },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // play() is sometimes needed despite autoPlay on iOS Safari
          await videoRef.current.play().catch(() => undefined);
        }
        setStatus("live");
        onReadyChange?.(true);
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.name === "NotAllowedError"
              ? "Camera permission denied. Allow access in your browser to use Nova Live Vision."
              : err.name === "NotFoundError"
                ? "No camera found on this device."
                : err.message
            : "Could not start camera.";
        setStatus("error");
        setErrorMsg(msg);
        onReadyChange?.(false);
      }
    },
    [onReadyChange, stopStream],
  );

  useEffect(() => {
    void startStream(facing);
    return () => stopStream();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facing]);

  useImperativeHandle(
    ref,
    () => ({
      hasStream: () => Boolean(streamRef.current),
      async snap() {
        const video = videoRef.current;
        if (!video || !streamRef.current) return null;
        const w = video.videoWidth;
        const h = video.videoHeight;
        if (!w || !h) return null;

        const long = Math.max(w, h);
        const scale = long > maxLongAxis ? maxLongAxis / long : 1;
        const targetW = Math.round(w * scale);
        const targetH = Math.round(h * scale);

        const canvas = document.createElement("canvas");
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext("2d");
        if (!ctx) return null;
        ctx.drawImage(video, 0, 0, targetW, targetH);

        const dataUrl = canvas.toDataURL("image/jpeg", jpegQuality);
        const base64 = dataUrl.split(",")[1] ?? "";
        if (!base64) return null;

        // Visual flash to confirm capture
        setFlashing(true);
        setTimeout(() => setFlashing(false), 220);

        return { base64, mimeType: "image/jpeg" };
      },
    }),
    [jpegQuality, maxLongAxis],
  );

  const flipCamera = () => setFacing((f) => (f === "environment" ? "user" : "environment"));
  const restartCamera = () => void startStream(facing);

  return (
    <div className="relative w-full overflow-hidden rounded-3xl border border-white/10 bg-black/60 backdrop-blur-2xl">
      {/* Aspect-ratio wrapper — 4:3 keeps it tall enough on desktop, fills mobile */}
      <div className="relative aspect-[4/3] w-full bg-black">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
          style={{
            transform: facing === "user" ? "scaleX(-1)" : "none",
            willChange: "transform",
          }}
        />

        {/* Capture flash */}
        <motion.div
          aria-hidden
          initial={false}
          animate={{ opacity: flashing ? 1 : 0 }}
          transition={{ duration: 0.18 }}
          className="pointer-events-none absolute inset-0 bg-white"
        />

        {/* Status overlays */}
        {status !== "live" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            {status === "starting" && (
              <div className="flex items-center gap-2 text-[12px] font-semibold text-zinc-300">
                <RefreshCw size={14} strokeWidth={1.7} className="animate-spin" />
                Starting camera…
              </div>
            )}
            {status === "error" && (
              <div className="max-w-[80%] text-center">
                <VideoOff size={28} strokeWidth={1.5} className="mx-auto text-red-400" />
                <p className="mt-3 text-[12px] leading-relaxed text-zinc-300">{errorMsg}</p>
                <button
                  type="button"
                  onClick={restartCamera}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-[11px] font-semibold text-zinc-100 transition-colors hover:bg-white/[0.12]"
                >
                  <RefreshCw size={11} strokeWidth={2} />
                  Retry
                </button>
              </div>
            )}
            {status === "idle" && (
              <div className="flex items-center gap-2 text-[12px] font-semibold text-zinc-400">
                <Video size={14} strokeWidth={1.7} />
                Camera idle
              </div>
            )}
          </div>
        )}

        {/* Top-left live badge */}
        {status === "live" && (
          <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 backdrop-blur-md">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300">
              Live
            </span>
          </div>
        )}

        {/* Top-right flip camera */}
        {status === "live" && (
          <button
            type="button"
            onClick={flipCamera}
            aria-label="Flip camera"
            className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/40 text-zinc-100 backdrop-blur-md transition-colors hover:bg-black/60"
          >
            <RotateCw size={14} strokeWidth={1.8} />
          </button>
        )}

        {/* Bottom-center frame guide */}
        {status === "live" && (
          <svg
            aria-hidden
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <path
              d="M 4,4 L 14,4 M 4,4 L 4,14 M 96,4 L 86,4 M 96,4 L 96,14 M 4,96 L 14,96 M 4,96 L 4,86 M 96,96 L 86,96 M 96,96 L 96,86"
              fill="none"
              stroke="rgba(255,255,255,0.55)"
              strokeWidth="0.4"
              vectorEffect="non-scaling-stroke"
              style={{ strokeWidth: 2 }}
            />
          </svg>
        )}
      </div>
    </div>
  );
});

export default NovaCameraViewfinder;
export { Camera as NovaCameraIcon };
