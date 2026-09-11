import { extractYouTubeVideoId } from "~/lib/hooks/useYouTubeTranscript";

export type InboxKind = "youtube" | "pdf" | "image" | "audio" | "quizlet" | "text";

export type InboxDetection = {
  kind: InboxKind;
  label: string;
};

const WORD_SPLIT = /\s+/;

export function countWords(text: string): number {
  return text.trim().split(WORD_SPLIT).filter(Boolean).length;
}

export function formatCount(n: number): string {
  return new Intl.NumberFormat("en-CA").format(n);
}

export function looksLikeQuizletTsv(text: string): boolean {
  const lines = text
    .trim()
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 3) return false;
  const paired = lines.filter((line) => {
    const cols = line.split("\t");
    return cols.length >= 2 && Boolean(cols[0]?.trim()) && Boolean(cols[1]?.trim());
  });
  return paired.length >= 3 && paired.length / lines.length >= 0.6;
}

export function detectInboxInput(input: {
  file?: File | null;
  youtubeUrl?: string;
  pastedText?: string;
  pdfPages?: number | null;
}): InboxDetection | null {
  const url = input.youtubeUrl?.trim() ?? "";
  if (url && extractYouTubeVideoId(url)) {
    return { kind: "youtube", label: "YouTube link" };
  }

  const file = input.file;
  if (file) {
    const mime = file.type.toLowerCase();
    const name = file.name.toLowerCase();
    if (mime === "application/pdf" || name.endsWith(".pdf")) {
      const pages = input.pdfPages;
      return {
        kind: "pdf",
        label: pages && pages > 0 ? `PDF · ${pages} pages` : "PDF",
      };
    }
    if (mime.startsWith("image/")) {
      return { kind: "image", label: "Image → handwriting OCR" };
    }
    if (mime.startsWith("audio/")) {
      return { kind: "audio", label: "Audio → transcript" };
    }
    return null;
  }

  const pasted = input.pastedText?.trim() ?? "";
  if (!pasted) return null;
  if (extractYouTubeVideoId(pasted)) {
    return { kind: "youtube", label: "YouTube link" };
  }
  if (looksLikeQuizletTsv(pasted)) {
    return { kind: "quizlet", label: "Tab-separated Q/A pairs" };
  }
  const words = countWords(pasted);
  return { kind: "text", label: `Text · ${formatCount(words)} words` };
}

export async function sniffPdfPageCount(file: File): Promise<number | null> {
  try {
    const slice = file.slice(0, Math.min(file.size, 2_000_000));
    const bytes = new Uint8Array(await slice.arrayBuffer());
    let ascii = "";
    for (const byte of bytes) ascii += String.fromCharCode(byte);
    const matches = ascii.match(/\/Type\s*\/Page(?!s)/g);
    return matches && matches.length > 0 ? matches.length : null;
  } catch {
    return null;
  }
}
