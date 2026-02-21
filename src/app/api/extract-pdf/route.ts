import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024;

// Simple PDF text extraction using just byte parsing for text objects
function extractTextFromPdfBuffer(buffer: Buffer): string {
  try {
    // Convert buffer to string for regex matching (handles most PDFs)
    const text = buffer.toString("latin1");
    
    // Extract text from PDF streams - look for text showing operators
    const matches: string[] = [];
    
    // Pattern 1: Regular text in parentheses (...)
    const parenMatches = text.match(/\((.*?)\)/g) || [];
    for (const match of parenMatches) {
      const cleaned = match
        .slice(1, -1)
        .replace(/\\(.{0,2})/g, (m) => {
          if (m === "\\n") return "\n";
          if (m === "\\r") return "\n";
          if (m === "\\t") return "\t";
          if (m === "\\\\") return "\\";
          if (m === "\\(") return "(";
          if (m === "\\)") return ")";
          return m.length > 1 ? String.fromCharCode(parseInt(m.slice(1), 8)) : m[1] || "";
        });
      if (cleaned && /\S/.test(cleaned)) {
        matches.push(cleaned);
      }
    }
    
    // Pattern 2: Hex strings <...>
    const hexMatches = text.match(/<([0-9A-Fa-f]+)>/g) || [];
    for (const match of hexMatches) {
      try {
        const hex = match.slice(1, -1);
        const cleaned = Buffer.from(hex, "hex")
          .toString("latin1")
          .replace(/[\x00-\x1F\x7F-\x9F]/g, "");
        if (cleaned && /\S/.test(cleaned)) {
          matches.push(cleaned);
        }
      } catch {
        // Skip invalid hex
      }
    }

    const result = matches.join(" ").replace(/\s+/g, " ").trim();
    return result;
  } catch (error) {
    console.error("Error extracting text from PDF buffer:", error);
    return "";
  }
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
    const extractedText = extractTextFromPdfBuffer(pdfBuffer);

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
