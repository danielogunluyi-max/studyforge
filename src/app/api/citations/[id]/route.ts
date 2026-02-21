import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

type CitationPatchInput = {
  author?: string;
  title?: string;
  publication?: string;
  date?: string;
  url?: string;
  pages?: string;
  format?: "MLA" | "APA" | "Chicago";
};

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const existing = await db.citation.findUnique({ where: { id } });

    if (!existing || existing.userId !== session.user.id) {
      return NextResponse.json({ error: "Citation not found" }, { status: 404 });
    }

    const body = (await request.json()) as CitationPatchInput;

    const updated = await db.citation.update({
      where: { id },
      data: {
        ...(typeof body.author === "string" ? { author: body.author.trim() } : {}),
        ...(typeof body.title === "string" ? { title: body.title.trim() } : {}),
        ...(typeof body.publication === "string"
          ? { publication: body.publication.trim() || null }
          : {}),
        ...(typeof body.date === "string" ? { date: body.date.trim() || null } : {}),
        ...(typeof body.url === "string" ? { url: body.url.trim() || null } : {}),
        ...(typeof body.pages === "string" ? { pages: body.pages.trim() || null } : {}),
        ...(body.format ? { format: body.format } : {}),
      },
    });

    return NextResponse.json({ citation: updated });
  } catch (error) {
    console.error("Error updating citation:", error);
    return NextResponse.json({ error: "Failed to update citation" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const existing = await db.citation.findUnique({ where: { id } });

    if (!existing || existing.userId !== session.user.id) {
      return NextResponse.json({ error: "Citation not found" }, { status: 404 });
    }

    await db.citation.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting citation:", error);
    return NextResponse.json({ error: "Failed to delete citation" }, { status: 500 });
  }
}
