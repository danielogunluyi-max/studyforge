import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024;

type Pdf2JsonTextRun = { T?: string };
type Pdf2JsonTextItem = {
  x?: number;
  y?: number;
  w?: number;
  sw?: number;
  R?: Pdf2JsonTextRun[];
};
type Pdf2JsonPage = { Texts?: Pdf2JsonTextItem[] };
type Pdf2JsonData = { Pages?: Pdf2JsonPage[] };

function decodePdfText(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function normalizeLineText(text: string): string {
  return text
    .replace(/\u0000/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\s+([,.;:!?%\)])/, "$1")
    .replace(/([\(])\s+/g, "$1")
    .trim();
}

function normalizeDocumentText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function buildLineFromItems(items: Pdf2JsonTextItem[]): string {
  if (!items.length) {
    return "";
  }

  const sorted = [...items].sort((a, b) => (a.x ?? 0) - (b.x ?? 0));

  let line = "";
  let previousRight = 0;
  let previousCharWidth = 0.4;

  for (const item of sorted) {

    const tokenRaw = (item.R ?? []).map((run) => decodePdfText(run.T ?? "")).join("");
    const token = tokenRaw.replace(/[\t ]+/g, " ").trim();

    if (!token) {
      continue;
    }

    const x = item.x ?? previousRight;
    const width = item.w ?? token.length * previousCharWidth;
    const tokenCharWidth = Math.max(width / Math.max(token.length, 1), 0.2);

    if (line.length > 0) {
      const gap = x - previousRight;
      const spacingUnit = Math.max(previousCharWidth, tokenCharWidth, 0.2);

      // Improved spacing detection: use lower threshold for better word separation
      if (gap > spacingUnit * 0.25) {
        // Add space for all gaps, ensuring minimum word separation
        const estimatedSpaces = Math.min(Math.max(Math.round(gap / spacingUnit), 1), 4);
        line += " ".repeat(estimatedSpaces);
      } else if (gap > 0.05 && line.length > 0) {
        // Even tiny gaps should get a space to prevent word concatenation
        line += " ";
      }
    }

    line += token;
    previousRight = x + width;
    previousCharWidth = tokenCharWidth;
  }

  return normalizeLineText(line);
}

function extractTextFromPage(page: Pdf2JsonPage): string {
  const textItems = [...(page.Texts ?? [])].filter((item) => (item.R ?? []).length > 0);
  if (!textItems.length) {
    return "";
  }

  textItems.sort((a, b) => {
    const yDiff = (a.y ?? 0) - (b.y ?? 0);
    if (Math.abs(yDiff) > 0.25) {
      return yDiff;
    }
    return (a.x ?? 0) - (b.x ?? 0);
  });

  const lines: Pdf2JsonTextItem[][] = [];

  for (const item of textItems) {
    const currentY = item.y ?? 0;
    const currentLine = lines[lines.length - 1];

    if (!currentLine) {
      lines.push([item]);
      continue;
    }

    const previousY = currentLine[0]?.y ?? currentY;
    const sameLine = Math.abs(currentY - previousY) <= 0.45;

    if (sameLine) {
      currentLine.push(item);
    } else {
      lines.push([item]);
    }
  }

  const builtLines = lines
    .map((lineItems) => buildLineFromItems(lineItems))
    .filter(Boolean);

  return builtLines.join("\n");
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
      const pageTexts: string[] = [];

      for (const page of pages) {
        const pageText = extractTextFromPage(page);
        if (pageText) {
          pageTexts.push(pageText);
        }
      }

      resolve(normalizeDocumentText(pageTexts.join("\n\n")));
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
