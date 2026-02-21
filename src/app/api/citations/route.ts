import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

type CitationInput = {
  author: string;
  title: string;
  publication?: string;
  date?: string;
  url?: string;
  pages?: string;
  format: "MLA" | "APA" | "Chicago";
};

function sanitizeCitation(input: CitationInput) {
  return {
    author: input.author.trim(),
    title: input.title.trim(),
    publication: input.publication?.trim() || null,
    date: input.date?.trim() || null,
    url: input.url?.trim() || null,
    pages: input.pages?.trim() || null,
    format: input.format,
  };
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const citations = await db.citation.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ citations });
  } catch (error) {
    console.error("Error fetching citations:", error);
    return NextResponse.json({ error: "Failed to fetch citations" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as CitationInput;
    const citation = sanitizeCitation(body);

    if (!citation.author || !citation.title || !citation.format) {
      return NextResponse.json({ error: "Author, title, and format are required" }, { status: 400 });
    }

    const saved = await db.citation.create({
      data: {
        ...citation,
        userId: session.user.id,
      },
    });

    return NextResponse.json({ citation: saved });
  } catch (error) {
    console.error("Error creating citation:", error);
    return NextResponse.json({ error: "Failed to save citation" }, { status: 500 });
  }
}
