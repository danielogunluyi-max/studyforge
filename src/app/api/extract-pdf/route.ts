import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024;

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
  if (message.toLowerCase().includes("too large")) return 413;
  if (message.toLowerCase().includes("invalid file type")) return 415;
  if (message.toLowerCase().includes("no pdf")) return 400;
  if (message.toLowerCase().includes("empty") || message.toLowerCase().includes("blank")) return 422;
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

    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

    const loadingTask = pdfjs.getDocument({
      data: pdfBytes,
      isEvalSupported: false,
      useWorkerFetch: false,
      useSystemFonts: true,
      verbosity: 0,
    });

    const document = await loadingTask.promise;
    if (!document.numPages) {
      return NextResponse.json(
        { error: "No pages found in this PDF." },
        { status: 422 },
      );
    }

    const pageTexts: string[] = [];

    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item) => ("str" in item && typeof item.str === "string" ? item.str : ""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      if (pageText) {
        pageTexts.push(pageText);
      }
    }

    await document.destroy();

    const extractedText = pageTexts.join("\n\n").trim();

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
