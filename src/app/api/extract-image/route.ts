import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/jpg"]);
const SUPPORTED_LANGUAGES = new Set(["eng", "spa", "fra", "deu", "ita", "por"]);

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
      const extractedText = result.data.text.replace(/\s+/g, " ").trim();

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
