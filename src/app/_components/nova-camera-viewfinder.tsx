"use client";

/**
 * Nova Live Vision: Camera Viewfinder
 * Hairline frame; native aspect preview; no glass/cyan.
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
  maxLongAxis?: number;
  jpegQuality?: number;
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
    <div
      className="card relative w-full overflow-hidden"
      style={{
        borderRadius: "var(--kv-radius)",
        border: "1px solid var(--border-default)",
        background: "#000",
      }}
    >
      <div className="relative aspect-[4/3] w-full" style={{ background: "#000" }}>
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
          style={{
            transform: facing === "user" ? "scaleX(-1)" : "none",
          }}
        />

        <motion.div
          aria-hidden
          initial={false}
          animate={{ opacity: flashing ? 1 : 0 }}
          transition={{ duration: 0.18 }}
          className="pointer-events-none absolute inset-0 bg-white"
        />

        {status !== "live" && (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: "rgba(0,0,0,.7)" }}
          >
            {status === "starting" && (
              <div className="kv-meta flex items-center gap-2">
                <RefreshCw size={14} strokeWidth={1.7} className="animate-spin" />
                Starting camera…
              </div>
            )}
            {status === "error" && (
              <div className="max-w-[80%] text-center">
                <VideoOff size={28} strokeWidth={1.5} className="mx-auto" style={{ color: "#E5484D" }} />
                <p className="kv-meta" style={{ marginTop: 12 }}>{errorMsg}</p>
                <button type="button" onClick={restartCamera} className="kv-btn" style={{ marginTop: 16, padding: "6px 12px", fontSize: 12 }}>
                  <RefreshCw size={11} strokeWidth={2} />
                  Retry
                </button>
              </div>
            )}
            {status === "idle" && (
              <div className="kv-meta flex items-center gap-2">
                <Video size={14} strokeWidth={1.7} />
                Camera idle
              </div>
            )}
          </div>
        )}

        {status === "live" && (
          <div
            className="absolute left-3 top-3 inline-flex items-center gap-1.5 px-2.5 py-1"
            style={{
              border: "1px solid var(--border-default)",
              borderRadius: "var(--kv-radius)",
              background: "var(--bg-card)",
            }}
          >
            <span className="dot" style={{ width: 6, height: 6, background: "var(--kv-accent)" }} />
            <span className="kv-meta">Live</span>
          </div>
        )}

        {status === "live" && (
          <button
            type="button"
            onClick={flipCamera}
            aria-label="Flip camera"
            className="kv-btn-ghost absolute right-3 top-3"
            style={{ height: 36, width: 36, padding: 0, justifyContent: "center" }}
          >
            <RotateCw size={14} strokeWidth={1.8} />
          </button>
        )}

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
