import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { NextResponse } from "next/server";

import { auth } from "~/server/auth";
import { db } from "~/server/db";

type SearchBody = {
  query?: string;
};

type PdfTextItem = {
  str?: string;
};

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as SearchBody;
    const query = String(body.query ?? "").trim();

    if (!query) {
      return NextResponse.json({ results: [], totalMatches: 0 });
    }

    const doc = await db.pDFDocument.findFirst({
      where: { id, userId: session.user.id },
      select: { blobUrl: true },
    });

    if (!doc?.blobUrl) {
      return NextResponse.json({ error: "PDF not found" }, { status: 404 });
    }

    const loadingTask = pdfjsLib.getDocument({ url: doc.blobUrl });
    const pdf = await loadingTask.promise;
    const queryLower = query.toLowerCase();

    const results: Array<{ page: number; snippet: string }> = [];
    let totalMatches = 0;

    for (let i = 1; i <= pdf.numPages; i += 1) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = (content.items as PdfTextItem[])
        .map((item) => String(item.str ?? ""))
        .join(" ");

      const lower = pageText.toLowerCase();
      let searchFrom = 0;
      let matchIndex = lower.indexOf(queryLower, searchFrom);

      if (matchIndex >= 0) {
        const snippetStart = Math.max(0, matchIndex - 60);
        const snippetEnd = Math.min(pageText.length, matchIndex + query.length + 60);
        const snippet = pageText.slice(snippetStart, snippetEnd);
        results.push({ page: i, snippet: `...${snippet}...` });
      }

      while (matchIndex >= 0) {
        totalMatches += 1;
        searchFrom = matchIndex + queryLower.length;
        matchIndex = lower.indexOf(queryLower, searchFrom);
      }
    }

    return NextResponse.json({ results, totalMatches });
  } catch (error) {
    console.error("PDF search POST error:", error);
    return NextResponse.json({ error: "Failed to search PDF" }, { status: 500 });
  }
}
