import { put } from "@vercel/blob";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { NextResponse } from "next/server";

import { auth } from "~/server/auth";
import { db } from "~/server/db";

export const runtime = "nodejs";

const MAX_BYTES = 20 * 1024 * 1024;

function stripPdfExtension(name: string) {
  return name.replace(/\.pdf$/i, "").trim() || "Untitled PDF";
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const docs = await db.pDFDocument.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        fileName: true,
        fileSize: true,
        pageCount: true,
        createdAt: true,
        _count: { select: { annotations: true } },
      },
    });

    const documents = docs.map((doc) => ({
      id: doc.id,
      title: doc.title,
      fileName: doc.fileName,
      fileSize: doc.fileSize,
      pageCount: doc.pageCount,
      annotationCount: doc._count.annotations,
      createdAt: doc.createdAt,
    }));

    return NextResponse.json({ documents });
  } catch (error) {
    console.error("PDF list GET error:", error);
    return NextResponse.json({ error: "Failed to fetch PDFs" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData().catch(() => null);
    const pdf = formData?.get("pdf");

    if (!(pdf instanceof File)) {
      return NextResponse.json({ error: "PDF file is required" }, { status: 400 });
    }

    if (pdf.type !== "application/pdf") {
      return NextResponse.json({ error: "Only PDF uploads are allowed" }, { status: 415 });
    }

    if (pdf.size > MAX_BYTES) {
      return NextResponse.json({ error: "PDF exceeds 20MB limit" }, { status: 413 });
    }

    const buffer = await pdf.arrayBuffer();
    const loaded = await pdfjsLib.getDocument({ data: buffer }).promise;
    const pageCount = loaded.numPages;

    const blob = await put(`pdfs/${session.user.id}/${Date.now()}-${pdf.name}`, pdf, {
      access: "public",
    });

    const created = await db.pDFDocument.create({
      data: {
        userId: session.user.id,
        title: stripPdfExtension(pdf.name),
        fileName: pdf.name,
        fileSize: pdf.size,
        pageCount,
        blobUrl: blob.url,
      },
      select: {
        id: true,
        title: true,
        fileName: true,
        fileSize: true,
        pageCount: true,
        blobUrl: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ document: created });
  } catch (error) {
    console.error("PDF upload POST error:", error);
    return NextResponse.json({ error: "Failed to upload PDF" }, { status: 500 });
  }
}
