import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

type ConceptNode = {
  id: string;
  label: string;
  description: string;
  connection: string;
  parentId: string | null;
  x: number;
  y: number;
};

type ConceptWebPayload = {
  central: string;
  nodes: ConceptNode[];
  breadcrumb: string[];
};

function normalizeWeb(input: unknown): ConceptWebPayload | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;
  const central = typeof raw.central === "string" ? raw.central.trim() : "";
  const breadcrumb = Array.isArray(raw.breadcrumb)
    ? raw.breadcrumb.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean).slice(0, 20)
    : [];

  if (!Array.isArray(raw.nodes) || !central) return null;

  const nodes = raw.nodes
    .map((node) => {
      if (!node || typeof node !== "object") return null;
      const item = node as Record<string, unknown>;
      const id = typeof item.id === "string" ? item.id.trim() : "";
      const label = typeof item.label === "string" ? item.label.trim() : "";
      const description = typeof item.description === "string" ? item.description.trim() : "";
      const connection = typeof item.connection === "string" ? item.connection.trim() : "Related";
      const parentId = typeof item.parentId === "string" ? item.parentId : null;
      const x = typeof item.x === "number" ? item.x : 0;
      const y = typeof item.y === "number" ? item.y : 0;
      if (!id || !label) return null;
      return { id, label, description, connection, parentId, x, y };
    })
    .filter((node): node is ConceptNode => Boolean(node))
    .slice(0, 300);

  return { central, nodes, breadcrumb };
}

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = (searchParams.get("id") ?? "").trim();

    if (id) {
      const web = await db.conceptWeb.findFirst({
        where: { id, userId: session.user.id },
        select: { id: true, title: true, topic: true, shareToken: true, webData: true, updatedAt: true },
      });

      if (!web) return NextResponse.json({ error: "Concept web not found" }, { status: 404 });
      return NextResponse.json({ web });
    }

    const webs = await db.conceptWeb.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: { id: true, title: true, topic: true, shareToken: true, updatedAt: true },
    });

    return NextResponse.json({ webs });
  } catch (error) {
    console.error("Concept web get error:", error);
    return NextResponse.json({ error: "Failed to fetch concept webs" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      id?: string;
      title?: string;
      topic?: string;
      web?: unknown;
      isShared?: boolean;
    };

    const web = normalizeWeb(body.web);
    if (!web) return NextResponse.json({ error: "Invalid web payload" }, { status: 400 });

    const topic = (body.topic ?? web.central ?? "").trim();
    const title = ((body.title ?? topic) || "Concept Web").trim();

    if (!topic) return NextResponse.json({ error: "Topic is required" }, { status: 400 });

    const isShared = typeof body.isShared === "boolean" ? body.isShared : true;
    const id = (body.id ?? "").trim();

    if (id) {
      const updated = await db.conceptWeb.updateMany({
        where: { id, userId: session.user.id },
        data: {
          title,
          topic,
          webData: web,
          isShared,
        },
      });

      if (updated.count === 0) {
        return NextResponse.json({ error: "Concept web not found" }, { status: 404 });
      }

      const saved = await db.conceptWeb.findFirst({
        where: { id, userId: session.user.id },
        select: { id: true, title: true, topic: true, shareToken: true, isShared: true, updatedAt: true },
      });

      return NextResponse.json({ web: saved });
    }

    const shareToken = randomUUID();

    const created = await db.conceptWeb.create({
      data: {
        userId: session.user.id,
        title,
        topic,
        webData: web,
        shareToken,
        isShared,
      },
      select: { id: true, title: true, topic: true, shareToken: true, isShared: true, updatedAt: true },
    });

    return NextResponse.json({ web: created });
  } catch (error) {
    console.error("Concept web save error:", error);
    return NextResponse.json({ error: "Failed to save concept web" }, { status: 500 });
  }
}
