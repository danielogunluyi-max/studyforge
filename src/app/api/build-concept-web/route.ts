import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { extractJsonBlock, runGroqPrompt } from "~/server/groq";

type BuildNode = {
  id: string;
  label: string;
  description: string;
  connection: string;
};

type BuildResponse = {
  central: string;
  nodes: BuildNode[];
};

type BuildRequest = {
  mode?: "topic" | "note" | "expand" | "legacy-notes";
  topic?: string;
  noteId?: string;
  nodeLabel?: string;
};

type LegacyConnection = {
  concept1: string;
  concept2: string;
  note1Id: string;
  note2Id: string;
  connectionDescription: string;
  strength: "low" | "medium" | "high";
};

function normalizeNodes(nodes: unknown): BuildNode[] {
  if (!Array.isArray(nodes)) return [];
  return nodes
    .map((item, index) => {
      if (!item || typeof item !== "object") return null;
      const raw = item as Record<string, unknown>;
      const label = typeof raw.label === "string" ? raw.label.trim() : "";
      const description = typeof raw.description === "string" ? raw.description.trim() : "";
      const connection = typeof raw.connection === "string" ? raw.connection.trim() : "Related";
      if (!label || !description) return null;

      return {
        id: typeof raw.id === "string" && raw.id.trim() ? raw.id.trim() : `n-${index + 1}`,
        label,
        description,
        connection,
      };
    })
    .filter((item): item is BuildNode => Boolean(item))
    .slice(0, 14);
}

async function generateFromPrompt(prompt: string): Promise<BuildResponse | null> {
  const aiOutput = await runGroqPrompt({
    system: "Return strict JSON only.",
    user: `${prompt}\n\nReturn JSON exactly in this shape: {"central":"...","nodes":[{"id":"1","label":"...","description":"...","connection":"..."}]}`,
    temperature: 0.4,
    maxTokens: 2200,
  });

  const parsed = extractJsonBlock<{ central?: string; nodes?: unknown }>(aiOutput);
  const central = (parsed?.central ?? "").trim();
  const nodes = normalizeNodes(parsed?.nodes);

  if (!central || nodes.length === 0) return null;
  return { central, nodes };
}

async function generateFromTopic(topic: string) {
  return generateFromPrompt(
    `Build a high-quality concept web for the topic "${topic}". Include 8-12 connected concepts with concise descriptions and a connection type like Definition, Process, Cause, Effect, Example, Formula, Application, Comparison, Prerequisite.`,
  );
}

async function generateFromNoteContent(noteTitle: string, noteContent: string) {
  const excerpt = noteContent.slice(0, 7000);
  return generateFromPrompt(
    `Build a concept web from this note. Use the note title as central topic unless a better central concept appears.\n\nTitle: ${noteTitle}\n\nContent:\n${excerpt}`,
  );
}

async function generateExpansion(central: string, nodeLabel: string) {
  return generateFromPrompt(
    `Expand the concept "${nodeLabel}" within the broader topic "${central}". Return 4-7 deeper sub-concepts for exploration.`,
  );
}

async function legacyConnections(userId: string) {
  const notes = await db.note.findMany({
    where: { userId },
    select: { id: true, title: true, tags: true, content: true },
    take: 40,
  });

  if (notes.length < 2) {
    return { error: "Need at least two notes to build a concept web", status: 400 as const };
  }

  const compressed = notes.map((note) => ({
    id: note.id,
    title: note.title,
    tags: note.tags,
    excerpt: note.content.slice(0, 500),
  }));

  const aiOutput = await runGroqPrompt({
    system: "Return strict JSON only.",
    user: `Find strong conceptual links between these notes. Return JSON: {"connections":[{"concept1":"...","concept2":"...","note1Id":"...","note2Id":"...","connectionDescription":"...","strength":"low|medium|high"}]}. Keep 8-25 connections.\n\n${JSON.stringify(compressed)}`,
    temperature: 0.5,
    maxTokens: 2400,
  });

  const parsed = extractJsonBlock<{ connections?: LegacyConnection[] }>(aiOutput);
  const connections = (parsed?.connections ?? [])
    .filter((item) => item.note1Id && item.note2Id && item.concept1 && item.concept2)
    .slice(0, 30)
    .map((item) => ({
      ...item,
      strength:
        item.strength === "high" || item.strength === "low" ? item.strength : "medium",
    }));

  if (!connections.length) {
    return { error: "No meaningful connections found", status: 422 as const };
  }

  await db.conceptConnection.deleteMany({ where: { userId } });
  await db.conceptConnection.createMany({
    data: connections.map((connection) => ({
      userId,
      note1Id: connection.note1Id,
      note2Id: connection.note2Id,
      concept1: connection.concept1,
      concept2: connection.concept2,
      connectionDescription: connection.connectionDescription,
      strength: connection.strength,
    })),
  });

  return {
    nodes: notes.map((note) => ({ id: note.id, label: note.title, tags: note.tags })),
    edges: connections.map((connection, index) => ({
      id: `${connection.note1Id}-${connection.note2Id}-${index}`,
      source: connection.note1Id,
      target: connection.note2Id,
      label: connection.connectionDescription,
      strength: connection.strength,
      concept1: connection.concept1,
      concept2: connection.concept2,
    })),
  };
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as BuildRequest;
    const mode = body.mode ?? "legacy-notes";

    if (mode === "legacy-notes") {
      const legacy = await legacyConnections(session.user.id);
      if ("error" in legacy) return NextResponse.json({ error: legacy.error }, { status: legacy.status });
      return NextResponse.json(legacy);
    }

    if (mode === "topic") {
      const topic = (body.topic ?? "").trim();
      if (!topic) return NextResponse.json({ error: "Topic is required" }, { status: 400 });

      const generated = await generateFromTopic(topic);
      if (!generated) return NextResponse.json({ error: "Failed to generate concept web" }, { status: 422 });
      return NextResponse.json(generated);
    }

    if (mode === "note") {
      const noteId = (body.noteId ?? "").trim();
      if (!noteId) return NextResponse.json({ error: "noteId is required" }, { status: 400 });

      const note = await db.note.findFirst({
        where: { id: noteId, userId: session.user.id },
        select: { id: true, title: true, content: true },
      });

      if (!note) return NextResponse.json({ error: "Note not found" }, { status: 404 });

      const generated = await generateFromNoteContent(note.title, note.content);
      if (!generated) return NextResponse.json({ error: "Failed to generate from note" }, { status: 422 });

      return NextResponse.json({ ...generated, sourceNoteId: note.id, sourceNoteTitle: note.title });
    }

    if (mode === "expand") {
      const topic = (body.topic ?? "").trim();
      const nodeLabel = (body.nodeLabel ?? "").trim();
      if (!topic || !nodeLabel) {
        return NextResponse.json({ error: "topic and nodeLabel are required" }, { status: 400 });
      }

      const generated = await generateExpansion(topic, nodeLabel);
      if (!generated) return NextResponse.json({ error: "Failed to expand concept" }, { status: 422 });
      return NextResponse.json({ central: nodeLabel, nodes: generated.nodes });
    }

    return NextResponse.json({ error: "Unsupported mode" }, { status: 400 });
  } catch (error) {
    console.error("Concept web build error:", error);
    return NextResponse.json({ error: "Failed to build concept web" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [savedWebs, notes] = await Promise.all([
      db.conceptWeb.findMany({
        where: { userId: session.user.id },
        orderBy: { updatedAt: "desc" },
        take: 25,
        select: {
          id: true,
          title: true,
          topic: true,
          shareToken: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      db.note.findMany({
        where: { userId: session.user.id },
        select: { id: true, title: true, format: true, createdAt: true },
        orderBy: { updatedAt: "desc" },
        take: 120,
      }),
    ]);

    return NextResponse.json({ savedWebs, notes });
  } catch (error) {
    console.error("Concept web get error:", error);
    return NextResponse.json({ error: "Failed to fetch concept web" }, { status: 500 });
  }
}
