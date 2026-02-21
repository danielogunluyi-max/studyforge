import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024;

type Pdf2JsonTextRun = { T?: string };
type Pdf2JsonTextItem = { R?: Pdf2JsonTextRun[] };
type Pdf2JsonPage = { Texts?: Pdf2JsonTextItem[] };
type Pdf2JsonData = { Pages?: Pdf2JsonPage[] };

function decodePdfText(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function normalizeExtractedText(text: string): string {
  let normalized = text.replace(/\u0000/g, "").replace(/\s+/g, " ").trim();

  const lines = normalized
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  const repairedLines = lines.map((line) => {
    const tokens = line.split(/\s+/).filter(Boolean);
    if (tokens.length < 8) {
      return line;
    }

    const singleCharAlnum = tokens.filter(
      (token) => token.length === 1 && /[A-Za-z0-9]/.test(token),
    ).length;
    const ratio = singleCharAlnum / tokens.length;

    if (ratio >= 0.85) {
      return tokens.join("");
    }

    return line;
  });

  normalized = repairedLines.join("\n").trim();
  return normalized;
}

async function extractTextFromPdfBuffer(buffer: Buffer): Promise<string> {
  const { default: PDFParser } = await import("pdf2json");

  return new Promise((resolve, reject) => {
    const parser = new PDFParser();

    parser.on("pdfParser_dataError", (errorData: Error | { parserError: Error }) => {
      const parserError =
        errorData instanceof Error ? errorData : errorData?.parserError;
      const message = parserError instanceof Error ? parserError.message : "Failed to parse PDF";
      reject(new Error(message));
    });

    parser.on("pdfParser_dataReady", (pdfData: Pdf2JsonData) => {
      const pages = pdfData.Pages ?? [];
      const lines: string[] = [];

      for (const page of pages) {
        const words: string[] = [];
        for (const textItem of page.Texts ?? []) {
          const token = (textItem.R ?? [])
            .map((run) => decodePdfText(run.T ?? ""))
            .join("")
            .trim();

          if (token) {
            words.push(token);
          }
        }

        const pageText = normalizeExtractedText(words.join(" "));
        if (pageText) {
          lines.push(pageText);
        }
      }

      resolve(normalizeExtractedText(lines.join("\n\n").trim()));
    });

    parser.parseBuffer(buffer);
  });
}

function decodeBase64ToBytes(input: string): Uint8Array {
  const cleaned = input.includes(",") ? input.split(",").pop() ?? "" : input;
  const binary = Buffer.from(cleaned, "base64");
  return new Uint8Array(binary);
}

async function getPdfBytes(request: Request): Promise<Uint8Array> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = (await request.json()) as { fileBase64?: string; base64?: string };
    const raw = body.fileBase64 ?? body.base64;

    if (!raw) {
      throw new Error("No PDF file provided");
    }

    const bytes = decodeBase64ToBytes(raw);
    if (bytes.byteLength > MAX_PDF_SIZE_BYTES) {
      throw new Error("PDF file is too large. Maximum size is 10MB.");
    }

    return bytes;
  }

  const formData = await request.formData();
  const file = formData.get("file") ?? formData.get("pdf") ?? formData.get("document");

  if (!(file instanceof File)) {
    throw new Error("No PDF file provided");
  }

  if (file.size > MAX_PDF_SIZE_BYTES) {
    throw new Error("PDF file is too large. Maximum size is 10MB.");
  }

  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) {
    throw new Error("Invalid file type. Please upload a PDF file.");
  }

  return new Uint8Array(await file.arrayBuffer());
}

function getErrorStatus(message: string): number {
  const lower = message.toLowerCase();
  if (lower.includes("too large")) return 413;
  if (lower.includes("invalid file type")) return 415;
  if (lower.includes("no pdf")) return 400;
  if (lower.includes("password") || lower.includes("encrypted")) return 422;
  if (lower.includes("empty") || lower.includes("blank") || lower.includes("no readable text")) return 422;
  return 500;
}

export async function POST(request: Request) {
  try {
    const pdfBytes = await getPdfBytes(request);

    if (!pdfBytes.byteLength) {
      return NextResponse.json(
        { error: "The uploaded PDF is empty." },
        { status: 400 },
      );
    }

    const pdfBuffer = Buffer.from(pdfBytes);
    const extractedText = await extractTextFromPdfBuffer(pdfBuffer);

    if (!extractedText) {
      return NextResponse.json(
        {
          error:
            "No readable text found in this PDF. It may be scanned or image-based. Try uploading it as an image for OCR.",
        },
        { status: 422 },
      );
    }

    return NextResponse.json({ text: extractedText });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to extract PDF text";
    console.error("PDF extraction error:", error);

    return NextResponse.json(
      { error: message || "Failed to extract PDF text" },
      { status: getErrorStatus(message) },
    );
  }
}
