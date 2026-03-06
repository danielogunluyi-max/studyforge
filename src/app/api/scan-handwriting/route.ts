import { NextRequest, NextResponse } from "next/server";

import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { runHandwritingScan } from "~/server/handwriting-scan";

type ScanRequestBody = {
  imageBase64?: string;
  mimeType?: string;
  subject?: string;
};

function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const scans = await db.scanHistory.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    return NextResponse.json({ scans });
  } catch (error) {
    console.error("Scan history GET error:", error);
    return NextResponse.json({ error: "Failed to fetch scan history" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as ScanRequestBody;
    const imageBase64 = String(body.imageBase64 ?? "").trim();
    const mimeType = String(body.mimeType ?? "image/jpeg").trim() || "image/jpeg";
    const subject = String(body.subject ?? "").trim() || null;

    if (!imageBase64) {
      return NextResponse.json({ error: "Image data is required" }, { status: 400 });
    }

    const result = await runHandwritingScan({ imageBase64, mimeType, subject: subject ?? undefined });
    const wordCount = countWords(result.text);

    const history = await db.scanHistory.create({
      data: {
        userId: session.user.id,
        confidence: result.confidence,
        wordCount,
        subject,
      },
    });

    return NextResponse.json({
      text: result.text,
      confidence: result.confidence,
      illegibleCount: result.illegibleCount,
      passes: result.passes,
      historyId: history.id,
      wordCount,
    });
  } catch (error) {
    console.error("Scan handwriting POST error:", error);
    return NextResponse.json({ error: "Failed to scan handwritten notes" }, { status: 500 });
  }
}
