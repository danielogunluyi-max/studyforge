import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Phase 3 — Nova Live Vision: Camera Stream Hook
 *
 * Wraps navigator.mediaDevices.getUserMedia with lifecycle management.
 * Ensures webcam hardware light is fully turned off on unmount by stopping
 * all MediaStream tracks.
 */

type CameraStreamState = {
  stream: MediaStream | null;
  isActive: boolean;
  error: string | null;
};

export function useCameraStream() {
  const [state, setState] = useState<CameraStreamState>({
    stream: null,
    isActive: false,
    error: null,
  });
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setState((prev) => ({ ...prev, error: "Camera API not available in this browser." }));
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "environment",
        },
        audio: false,
      });

      streamRef.current = stream;
      setState({ stream, isActive: true, error: null });
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.name === "NotAllowedError"
            ? "Camera permission denied. Allow access in your browser."
            : err.name === "NotFoundError"
              ? "No camera found on this device."
              : err.message
          : "Could not start camera.";
      setState({ stream: null, isActive: false, error: msg });
    }
  }, []);

  const stopCamera = useCallback(() => {
    const stream = streamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setState({ stream: null, isActive: false, error: null });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const stream = streamRef.current;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  return {
    stream: state.stream,
    isActive: state.isActive,
    error: state.error,
    startCamera,
    stopCamera,
  };
}
