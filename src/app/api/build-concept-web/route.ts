import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { extractJsonBlock, runGroqPrompt } from "~/server/groq";

type Connection = {
  concept1: string;
  concept2: string;
  note1Id: string;
  note2Id: string;
  connectionDescription: string;
  strength: "low" | "medium" | "high";
};

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const notes = await db.note.findMany({
      where: { userId: session.user.id },
      select: { id: true, title: true, tags: true, content: true },
      take: 40,
    });

    if (notes.length < 2) {
      return NextResponse.json({ error: "Need at least two notes to build a concept web" }, { status: 400 });
    }

    const compressed = notes.map((note) => ({
      id: note.id,
      title: note.title,
      tags: note.tags,
      excerpt: note.content.slice(0, 500),
    }));

    const aiOutput = await runGroqPrompt({
      system: "Return strict JSON only.",
      user: `Find strong conceptual links between these notes. Return JSON: {"connections":[{"concept1":"...","concept2":"...","note1Id":"...","note2Id":"...","connectionDescription":"...","strength":"low|medium|high"}]}. Keep 8-25 connections.\n\n${JSON.stringify(
        compressed,
      )}`,
      temperature: 0.5,
      maxTokens: 2400,
    });

    const parsed = extractJsonBlock<{ connections?: Connection[] }>(aiOutput);
    const connections = (parsed?.connections ?? [])
      .filter((item) => item.note1Id && item.note2Id && item.concept1 && item.concept2)
      .slice(0, 30)
      .map((item) => ({
        ...item,
        strength:
          item.strength === "high" || item.strength === "low" ? item.strength : "medium",
      }));

    if (!connections.length) {
      return NextResponse.json({ error: "No meaningful connections found" }, { status: 422 });
    }

    await db.conceptConnection.deleteMany({ where: { userId: session.user.id } });
    await db.conceptConnection.createMany({
      data: connections.map((connection) => ({
        userId: session.user.id,
        note1Id: connection.note1Id,
        note2Id: connection.note2Id,
        concept1: connection.concept1,
        concept2: connection.concept2,
        connectionDescription: connection.connectionDescription,
        strength: connection.strength,
      })),
    });

    const nodes = notes.map((note) => ({
      id: note.id,
      label: note.title,
      tags: note.tags,
    }));

    const edges = connections.map((connection, index) => ({
      id: `${connection.note1Id}-${connection.note2Id}-${index}`,
      source: connection.note1Id,
      target: connection.note2Id,
      label: connection.connectionDescription,
      strength: connection.strength,
      concept1: connection.concept1,
      concept2: connection.concept2,
    }));

    return NextResponse.json({ nodes, edges });
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

    const notes = await db.note.findMany({
      where: { userId: session.user.id },
      select: { id: true, title: true, tags: true },
    });

    const connections = await db.conceptConnection.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 80,
    });

    return NextResponse.json({
      nodes: notes.map((note) => ({ id: note.id, label: note.title, tags: note.tags })),
      edges: connections.map((connection) => ({
        id: connection.id,
        source: connection.note1Id,
        target: connection.note2Id,
        label: connection.connectionDescription,
        strength: connection.strength,
        concept1: connection.concept1,
        concept2: connection.concept2,
      })),
    });
  } catch (error) {
    console.error("Concept web get error:", error);
    return NextResponse.json({ error: "Failed to fetch concept web" }, { status: 500 });
  }
}
