import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

export const runtime = "nodejs";

type ExportRequest = {
  noteId?: string;
};

function sanitizeFilename(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function wrapLine(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text];

  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxChars) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }

  if (current) lines.push(current);
  return lines;
}

function normalizeContent(content: string): string[] {
  return content
    .replace(/\r\n/g, "\n")
    .split("\n")
    .flatMap((line) => (line.trim() ? [line.trim()] : [""]))
    .flatMap((line) => wrapLine(line, 95));
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as ExportRequest;
    if (!body.noteId) {
      return NextResponse.json({ error: "noteId is required" }, { status: 400 });
    }

    const note = await db.note.findUnique({ where: { id: body.noteId } });
    if (!note || note.userId !== session.user.id) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    const pdfDoc = await PDFDocument.create();
    const titleFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const bodyFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const pageWidth = 612;
    const pageHeight = 792;
    const margin = 56;

    let page = pdfDoc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - margin;

    const drawHeader = () => {
      page.drawText("StudyForge", {
        x: margin,
        y,
        size: 16,
        font: titleFont,
        color: rgb(0.1, 0.2, 0.55),
      });
      y -= 26;

      page.drawText(note.title, {
        x: margin,
        y,
        size: 13,
        font: titleFont,
        color: rgb(0.1, 0.1, 0.1),
      });
      y -= 18;

      page.drawText(`Created: ${new Date(note.createdAt).toLocaleString()}`, {
        x: margin,
        y,
        size: 10,
        font: bodyFont,
        color: rgb(0.35, 0.35, 0.35),
      });
      y -= 24;

      page.drawLine({
        start: { x: margin, y },
        end: { x: pageWidth - margin, y },
        thickness: 1,
        color: rgb(0.85, 0.85, 0.85),
      });
      y -= 18;
    };

    const ensureSpace = (requiredHeight: number) => {
      if (y - requiredHeight < margin) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin;
      }
    };

    drawHeader();

    const lines = normalizeContent(note.content);
    for (const line of lines) {
      ensureSpace(14);
      page.drawText(line, {
        x: margin,
        y,
        size: 11,
        font: bodyFont,
        color: rgb(0.15, 0.15, 0.15),
      });
      y -= 14;
    }

    const pages = pdfDoc.getPages();
    pages.forEach((pdfPage, index) => {
      const pageNumber = `${index + 1} / ${pages.length}`;
      pdfPage.drawText(pageNumber, {
        x: pageWidth - margin - 34,
        y: 24,
        size: 9,
        font: bodyFont,
        color: rgb(0.5, 0.5, 0.5),
      });
    });

    const bytes = await pdfDoc.save();
    const filename = sanitizeFilename(note.title || "studyforge-note") || "studyforge-note";

    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error exporting PDF:", error);
    return NextResponse.json({ error: "Failed to export PDF" }, { status: 500 });
  }
}
