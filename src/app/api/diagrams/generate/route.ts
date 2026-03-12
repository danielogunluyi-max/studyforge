import { NextResponse } from "next/server";
import type { Prisma } from "../../../../../generated/prisma";

import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { extractJsonBlock, runGroqPrompt } from "~/server/groq";

type DiagramType = "concept_map" | "flowchart" | "timeline" | "comparison" | "hierarchy";

type DiagramRequestBody = {
  text?: string;
  diagramType?: DiagramType | "auto";
};

const TYPE_INSTRUCTIONS: Record<DiagramType, string> = {
  concept_map: `Generate a concept map with nodes and edges.
Return JSON:
{
  "title": "...",
  "type": "concept_map",
  "nodes": [
    { "id": "1", "label": "Main concept", "type": "main" },
    { "id": "2", "label": "Related idea", "type": "secondary" },
    { "id": "3", "label": "Detail", "type": "detail" }
  ],
  "edges": [
    { "from": "1", "to": "2", "label": "leads to" },
    { "from": "1", "to": "3", "label": "includes" }
  ]
}
Use 6-12 nodes. Keep labels short (1-5 words max).
node types: "main" (1 only), "secondary" (2-4), "detail" (rest)`,

  flowchart: `Generate a flowchart with steps and decisions.
Return JSON:
{
  "title": "...",
  "type": "flowchart",
  "nodes": [
    { "id": "1", "label": "Start", "type": "start" },
    { "id": "2", "label": "First step", "type": "process" },
    { "id": "3", "label": "Decision?", "type": "decision" },
    { "id": "4", "label": "Yes path", "type": "process" },
    { "id": "5", "label": "No path", "type": "process" },
    { "id": "6", "label": "End", "type": "end" }
  ],
  "edges": [
    { "from": "1", "to": "2", "label": "" },
    { "from": "2", "to": "3", "label": "" },
    { "from": "3", "to": "4", "label": "Yes" },
    { "from": "3", "to": "5", "label": "No" },
    { "from": "4", "to": "6", "label": "" },
    { "from": "5", "to": "6", "label": "" }
  ]
}
Use 5-10 nodes. Keep labels short.
node types: "start", "end", "process", "decision"`,

  timeline: `Generate a timeline of events.
Return JSON:
{
  "title": "...",
  "type": "timeline",
  "events": [
    { "date": "1776", "label": "Event name", "description": "Brief description" },
    { "date": "1789", "label": "Event name", "description": "Brief description" }
  ]
}
Use 4-8 events. Keep labels short (1-5 words).
Descriptions max 10 words.`,

  comparison: `Generate a comparison table.
Return JSON:
{
  "title": "...",
  "type": "comparison",
  "items": ["Item A", "Item B"],
  "criteria": [
    {
      "label": "Criterion name",
      "values": ["Value for A", "Value for B"]
    }
  ]
}
Use 2-4 items. Use 4-7 criteria. Keep values short (1-6 words).`,

  hierarchy: `Generate a hierarchy tree.
Return JSON:
{
  "title": "...",
  "type": "hierarchy",
  "root": {
    "id": "1",
    "label": "Root concept",
    "children": [
      {
        "id": "2",
        "label": "Branch A",
        "children": [
          { "id": "4", "label": "Leaf 1", "children": [] },
          { "id": "5", "label": "Leaf 2", "children": [] }
        ]
      },
      {
        "id": "3",
        "label": "Branch B",
        "children": [
          { "id": "6", "label": "Leaf 3", "children": [] }
        ]
      }
    ]
  }
}
Max 3 levels deep. Keep labels short (1-4 words).`,
};

const AUTO_CHOOSE_INSTRUCTION = `First choose the BEST diagram type for this content from: concept_map, flowchart, timeline, comparison, hierarchy.
- Use timeline for historical events or sequences
- Use flowchart for processes or steps
- Use hierarchy for categories or classifications
- Use comparison for comparing items or concepts
- Use concept_map for interconnected ideas (default)
Then generate the diagram using that type's format.`;

function normalizeType(value: unknown): DiagramType | null {
  if (
    value === "concept_map" ||
    value === "flowchart" ||
    value === "timeline" ||
    value === "comparison" ||
    value === "hierarchy"
  ) {
    return value;
  }
  return null;
}

function normalizeDiagramPayload(value: unknown, fallbackType: DiagramType): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;

  const type = normalizeType(raw.type) ?? fallbackType;
  const title = typeof raw.title === "string" && raw.title.trim() ? raw.title.trim() : "Generated Diagram";

  return {
    ...raw,
    type,
    title,
  };
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as DiagramRequestBody;
    const text = (body.text ?? "").trim();
    const requestedType = body.diagramType ?? "auto";

    if (!text) {
      return NextResponse.json({ error: "Please provide a topic or notes" }, { status: 400 });
    }

    const selectedType = requestedType === "auto" ? null : normalizeType(requestedType);

    const instruction = selectedType
      ? TYPE_INSTRUCTIONS[selectedType]
      : `${AUTO_CHOOSE_INSTRUCTION}\n\nThen use the appropriate JSON format from these options:\n${Object.values(TYPE_INSTRUCTIONS).join("\n\n---\n\n")}`;

    const systemPrompt = `You are Nova, an AI diagram generator for Kyvex.
You create clear, educational diagrams from student notes and topics.
You MUST respond with ONLY valid JSON and no markdown or backticks.
The JSON must be complete and valid.
Keep all labels concise and max 5 words per label.`;

    const userPrompt = `Create a diagram for this content:\n"${text.slice(0, 2000)}"\n\n${instruction}`;

    const raw = await runGroqPrompt({
      system: systemPrompt,
      user: userPrompt,
      temperature: 0.3,
      maxTokens: 1500,
    });

    const parsed = extractJsonBlock<Record<string, unknown>>(raw);
    const fallbackType = selectedType ?? "concept_map";
    const diagramData = normalizeDiagramPayload(parsed, fallbackType);

    if (!diagramData) {
      throw new Error("Invalid diagram response format");
    }

    const saved = await db.diagram.create({
      data: {
        userId: session.user.id,
        title:
          (typeof diagramData.title === "string" && diagramData.title.trim()) ||
          text.slice(0, 60) ||
          "Generated Diagram",
        type: normalizeType(diagramData.type) ?? fallbackType,
        sourceText: text,
        diagramData: diagramData as Prisma.InputJsonValue,
      },
      select: { id: true },
    });

    return NextResponse.json({ diagramData, diagramId: saved.id });
  } catch (error) {
    console.error("Diagram generation error:", error);
    return NextResponse.json({ error: "Failed to generate diagram" }, { status: 500 });
  }
}
