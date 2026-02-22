import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/jpg"]);
const SUPPORTED_LANGUAGES = new Set(["eng", "spa", "fra", "deu", "ita", "por"]);

type OcrWord = { text?: string };
type OcrLine = { text?: string; words?: OcrWord[] };
type OcrParagraph = { text?: string; lines?: OcrLine[] };

function normalizeLanguages(raw: string | null | undefined): string {
  const input = (raw ?? "eng").trim();
  const candidates = input
    .split("+")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);

  const valid = candidates.filter((lang) => SUPPORTED_LANGUAGES.has(lang));
  const ordered = ["eng", ...valid.filter((lang) => lang !== "eng")];

  return Array.from(new Set(ordered)).join("+");
}

function decodeBase64ToBuffer(input: string): Buffer {
  const cleaned = input.includes(",") ? input.split(",").pop() ?? "" : input;
  return Buffer.from(cleaned, "base64");
}

async function getImageData(request: Request): Promise<{ buffer: Buffer; languages: string }> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = (await request.json()) as { fileBase64?: string; base64?: string; language?: string };
    const raw = body.fileBase64 ?? body.base64;

    if (!raw) {
      throw new Error("No image file provided");
    }

    const buffer = decodeBase64ToBuffer(raw);
    if (buffer.byteLength > MAX_IMAGE_SIZE_BYTES) {
      throw new Error("Image file is too large. Maximum size is 5MB.");
    }

    return { buffer, languages: normalizeLanguages(body.language) };
  }

  const formData = await request.formData();
  const file = formData.get("file") ?? formData.get("image");
  const language = formData.get("language");

  if (!(file instanceof File)) {
    throw new Error("No image file provided");
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error("Image file is too large. Maximum size is 5MB.");
  }

  const looksLikeImage =
    ACCEPTED_IMAGE_TYPES.has(file.type) ||
    /\.(png|jpe?g)$/i.test(file.name);

  if (!looksLikeImage) {
    throw new Error("Invalid file type. Please upload a PNG or JPG image.");
  }

  const langValue = typeof language === "string" ? language : null;

  return {
    buffer: Buffer.from(await file.arrayBuffer()),
    languages: normalizeLanguages(langValue),
  };
}

function getErrorStatus(message: string): number {
  const lower = message.toLowerCase();
  if (lower.includes("too large")) return 413;
  if (lower.includes("invalid file type")) return 415;
  if (lower.includes("no image")) return 400;
  if (lower.includes("no readable text") || lower.includes("blurry")) return 422;
  return 500;
}

function normalizeOcrText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\u0000/g, "")
    // Fix hyphenated line breaks
    .replace(/(\w)-\n(\w)/g, "$1$2")
    // Normalize spaces
    .replace(/[ \t]+/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    // Fix spacing around punctuation
    .replace(/\s+([,.;:!?%\)])/g, "$1")
    .replace(/([\(])\s+/g, "$1")
    // Normalize quotes
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    // Common OCR errors: rn → m, vv → w, l1 → li, etc.
    .replace(/\brn\b/g, "m")
    .replace(/\bvv\b/g, "w")
    .replace(/\bl1\b/g, "li")
    .replace(/\b0\b/g, "O")
    // Fix missing spaces after punctuation
    .replace(/([.!?])([A-Z])/g, "$1 $2")
    // Fix missing spaces between words (common OCR issue)
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim();
}

function buildTextFromParagraphs(paragraphs: OcrParagraph[]): string {
  const formatted = paragraphs
    .map((paragraph) => {
      if (paragraph.lines?.length) {
        const lines = paragraph.lines
          .map((line) => {
            if (line.text?.trim()) {
              return line.text.trim();
            }

            const words = (line.words ?? [])
              .map((word) => (word.text ?? "").trim())
              .filter(Boolean)
              .join(" ");

            return words.trim();
          })
          .filter(Boolean);

        return lines.join("\n").trim();
      }

      return (paragraph.text ?? "").trim();
    })
    .filter(Boolean);

  return formatted.join("\n\n");
}

export async function POST(request: Request) {
  try {
    const { buffer, languages } = await getImageData(request);

    if (!buffer.byteLength) {
      return NextResponse.json(
        { error: "The uploaded image is empty." },
        { status: 400 },
      );
    }

    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker(languages);

    try {
      const result = await worker.recognize(buffer);
      const rawParagraphText = buildTextFromParagraphs(
        ((result.data as { paragraphs?: OcrParagraph[] }).paragraphs ?? []),
      );
      const fallbackText = (result.data.text ?? "").toString();
      const extractedText = normalizeOcrText(rawParagraphText || fallbackText);

      if (!extractedText) {
        return NextResponse.json(
          {
            error:
              "No readable text found in this image. Try a clearer image with better lighting and contrast.",
          },
          { status: 422 },
        );
      }

      return NextResponse.json({ text: extractedText, language: languages });
    } finally {
      await worker.terminate();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to extract text from image";
    console.error("Image OCR error:", error);

    return NextResponse.json(
      { error: message || "Failed to extract text from image" },
      { status: getErrorStatus(message) },
    );
  }
}
