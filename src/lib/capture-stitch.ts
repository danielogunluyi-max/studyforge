/**
 * Vertical scroll-stitch helpers.
 * Finds the vertical offset where frame N's bottom strip best matches frame N+1,
 * then crops the overlap and stacks into one tall canvas.
 */

export type StitchFrame = {
  /** Full-resolution canvas for this frame */
  canvas: HTMLCanvasElement;
  /** Approx scroll delta from previous frame (px); 0 for first */
  offsetY: number;
};

export type StitchLimits = {
  maxFrames: number;
  maxHeightPx: number;
};

export const DEFAULT_STITCH_LIMITS: StitchLimits = {
  maxFrames: 40,
  maxHeightPx: 16000,
};

/** Downsample a canvas strip to grayscale Float32 for cheap comparisons. */
function stripSignature(
  ctx: CanvasRenderingContext2D,
  y: number,
  height: number,
  sampleW: number,
): Float32Array {
  const srcW = ctx.canvas.width;
  const srcH = ctx.canvas.height;
  const safeY = Math.max(0, Math.min(srcH - 1, Math.floor(y)));
  const safeH = Math.max(1, Math.min(height, srcH - safeY));
  const data = ctx.getImageData(0, safeY, srcW, safeH).data;
  const out = new Float32Array(sampleW * safeH);
  const stepX = srcW / sampleW;
  let i = 0;
  for (let row = 0; row < safeH; row++) {
    for (let col = 0; col < sampleW; col++) {
      const sx = Math.min(srcW - 1, Math.floor(col * stepX));
      const idx = (row * srcW + sx) * 4;
      out[i++] = data[idx]! * 0.299 + data[idx + 1]! * 0.587 + data[idx + 2]! * 0.114;
    }
  }
  return out;
}

function stripDiff(a: Float32Array, b: Float32Array): number {
  const n = Math.min(a.length, b.length);
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const d = a[i]! - b[i]!;
    sum += d * d;
  }
  return sum / Math.max(1, n);
}

/**
 * Estimate how many pixels the next frame scrolled down relative to prev.
 * Returns 0 when frames look identical (no scroll / sticky-only change).
 */
export function estimateScrollDelta(
  prev: HTMLCanvasElement,
  next: HTMLCanvasElement,
  opts?: { stripHeight?: number; sampleW?: number; searchMaxRatio?: number },
): number {
  if (prev.width !== next.width || prev.height !== next.height) {
    // Different sizes — treat as full new frame (no overlap).
    return next.height;
  }
  const h = prev.height;
  const w = prev.width;
  if (h < 16 || w < 16) return h;

  const stripHeight = opts?.stripHeight ?? Math.max(24, Math.min(64, Math.floor(h * 0.08)));
  const sampleW = opts?.sampleW ?? Math.min(120, w);
  const searchMax = Math.floor(h * (opts?.searchMaxRatio ?? 0.85));

  const prevCtx = prev.getContext("2d", { willReadFrequently: true });
  const nextCtx = next.getContext("2d", { willReadFrequently: true });
  if (!prevCtx || !nextCtx) return h;

  // Bottom strip of previous frame should appear near the top of the next frame.
  const probe = stripSignature(prevCtx, h - stripHeight, stripHeight, sampleW);

  let bestOffset = 0;
  let bestScore = Number.POSITIVE_INFINITY;

  // Coarse then fine search
  const coarseStep = Math.max(2, Math.floor(stripHeight / 4));
  for (let offset = 0; offset <= searchMax; offset += coarseStep) {
    const cand = stripSignature(nextCtx, offset, stripHeight, sampleW);
    const score = stripDiff(probe, cand);
    if (score < bestScore) {
      bestScore = score;
      bestOffset = offset;
    }
  }

  const fineStart = Math.max(0, bestOffset - coarseStep);
  const fineEnd = Math.min(searchMax, bestOffset + coarseStep);
  for (let offset = fineStart; offset <= fineEnd; offset++) {
    const cand = stripSignature(nextCtx, offset, stripHeight, sampleW);
    const score = stripDiff(probe, cand);
    if (score < bestScore) {
      bestScore = score;
      bestOffset = offset;
    }
  }

  // Near-identical frames (user paused) → no advance
  if (bestScore < 40 && bestOffset < 4) return 0;

  return bestOffset;
}

/** Grab a frame from a playing video into a new canvas. */
export function captureVideoFrame(video: HTMLVideoElement): HTMLCanvasElement | null {
  if (!video.videoWidth || !video.videoHeight) return null;
  const c = document.createElement("canvas");
  c.width = video.videoWidth;
  c.height = video.videoHeight;
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0);
  return c;
}

/**
 * Build (or extend) a stitched tall canvas from frames with known scroll deltas.
 * `deltas[i]` = pixels scrolled between frame i-1 and i (deltas[0] unused).
 */
export function stitchFrames(
  frames: HTMLCanvasElement[],
  deltas: number[],
  limits: StitchLimits = DEFAULT_STITCH_LIMITS,
): { canvas: HTMLCanvasElement; usedFrames: number; truncated: boolean } | null {
  if (frames.length === 0) return null;
  const first = frames[0]!;
  const width = first.width;

  let totalHeight = first.height;
  const placements: { frame: HTMLCanvasElement; y: number; drawH: number }[] = [
    { frame: first, y: 0, drawH: first.height },
  ];

  let truncated = false;
  for (let i = 1; i < frames.length && i < limits.maxFrames; i++) {
    const frame = frames[i]!;
    const delta = Math.max(0, Math.floor(deltas[i] ?? frame.height));
    if (delta === 0) continue; // duplicate / no scroll

    const y = placements[placements.length - 1]!.y + delta;
    const drawH = frame.height;
    if (y + drawH > limits.maxHeightPx) {
      truncated = true;
      break;
    }
    placements.push({ frame, y, drawH });
    totalHeight = Math.max(totalHeight, y + drawH);
  }

  if (frames.length > limits.maxFrames) truncated = true;

  const out = document.createElement("canvas");
  out.width = width;
  out.height = totalHeight;
  const ctx = out.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#0a0a0a";
  ctx.fillRect(0, 0, width, totalHeight);

  // Draw bottom-up so newer bottoms win over sticky-header smear in overlaps
  for (const p of placements) {
    ctx.drawImage(p.frame, 0, p.y);
  }

  return { canvas: out, usedFrames: placements.length, truncated };
}

/** Crop a region from a canvas (pixel coords). */
export function cropCanvas(
  source: HTMLCanvasElement,
  rect: { x: number; y: number; w: number; h: number },
): HTMLCanvasElement {
  const x = Math.max(0, Math.floor(rect.x));
  const y = Math.max(0, Math.floor(rect.y));
  const w = Math.max(1, Math.min(source.width - x, Math.floor(rect.w)));
  const h = Math.max(1, Math.min(source.height - y, Math.floor(rect.h)));
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  out.getContext("2d")?.drawImage(source, x, y, w, h, 0, 0, w, h);
  return out;
}

export function canvasToPngDataUrl(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL("image/png");
}

export function dataUrlToFile(dataUrl: string, filename: string): File {
  const [header, base64] = dataUrl.split(",");
  const mime = /data:([^;]+)/.exec(header ?? "")?.[1] ?? "image/png";
  const binary = atob(base64 ?? "");
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], filename, { type: mime });
}
