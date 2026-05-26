import Groq from "groq-sdk";
import { NextResponse } from "next/server";

import { auth } from "~/server/auth";
import { prisma } from "@/lib/prisma";

/**
 * Phase 3 — Nova Live Vision
 * --------------------------
 * Vision-aware Socratic tutor. Each request can include an optional snapshot
 * (base64 image + mime) attached to the latest user message. The model sees
 * what's on the student's page, asks guiding questions, and never just spits
 * out the answer.
 *
 * Persistence: only the text exchange is stored — images are processed in
 * memory and discarded. Conversations are tagged `subject = "Nova Vision"`
 * so they can be filtered separately from normal tutor chats.
 */

const VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
const NOVA_VISION_SUBJECT = "Nova Vision";
const MAX_HISTORY = 12;
const MAX_IMAGE_BYTES = 6 * 1024 * 1024; // 6MB on the wire (Groq vision cap)

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

type IncomingMessage = {
  role: "user" | "assistant";
  content: string;
  imageBase64?: string;
  mimeType?: string;
};

type NovaVisionRequest = {
  messages?: IncomingMessage[];
  subject?: string;
  conversationId?: string;
};

const SYSTEM_PROMPT = [
  "You are Nova Live Vision, an elite, real-time academic supervisor. Analyze the",
  "user's handwritten work, textbook equations, or diagrams from their webcam frame.",
  "If they are solving a problem step-by-step, review their line-by-line logical",
  "derivations. Interrupt immediately with a supportive, highly precise hint if you",
  "detect an arithmetic, calculus, or structural error. Provide clean markdown or",
  "LaTeX syntax for mathematical output.",
  "",
  "Pedagogy:",
  "- ALWAYS use a Socratic style: ask one focused guiding question per turn.",
  "- When you can see the page, name the specific thing you noticed (e.g. 'I see a",
  "  quadratic in standard form on the second line') so the student knows you're",
  "  grounded in what's actually in front of them.",
  "- Break problems into the smallest next step. Never solve the whole thing.",
  "- If the photo is blurry, dim, or cut off, say so plainly and ask them to reframe.",
  "- If the student asks for the answer outright, gently redirect: offer the next",
  "  hint or a worked example for a different but analogous problem.",
  "",
  "Style:",
  "- Warm, sharp, encouraging. Two short paragraphs max per turn.",
  "- Use clean markdown: bold for the key insight, math in $...$ when natural.",
  "- Canadian spelling. Reference Ontario course codes (MHF4U, MCV4U, SCH4U, SBI4U,",
  "  SPH4U, ENG4U) only if the student's question or the page makes the course obvious.",
  "",
  "Honesty:",
  "- If the page genuinely isn't legible or the topic is outside what you can see,",
  "  say so. Don't invent content that isn't on the page.",
].join("\n");

function buildGroqMessage(msg: IncomingMessage): Groq.Chat.ChatCompletionMessageParam {
  // Assistant turns are always plain text.
  if (msg.role === "assistant") {
    return { role: "assistant", content: msg.content };
  }

  // User turn with no image — plain text.
  if (!msg.imageBase64) {
    return { role: "user", content: msg.content };
  }

  // User turn with an image — multimodal payload.
  const mimeType = msg.mimeType?.trim() || "image/jpeg";
  return {
    role: "user",
    content: [
      {
        type: "image_url",
        image_url: {
          url: `data:${mimeType};base64,${msg.imageBase64}`,
        },
      },
      {
        type: "text",
        text:
          msg.content.trim().length > 0
            ? msg.content
            : "Take a look at this page and ask me a guiding question to help me get started.",
      },
    ],
  } as Groq.Chat.ChatCompletionMessageParam;
}

function approxBase64Bytes(base64: string): number {
  // Standard base64 inflates by ~4/3.
  return Math.floor((base64.length * 3) / 4);
}

export async function POST(request: Request) {
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json(
      { error: "GROQ_API_KEY is not configured on the server." },
      { status: 500 },
    );
  }

  let session;
  try {
    session = await auth();
  } catch (authErr) {
    console.error("[nova-vision] auth() failed:", authErr);
    return NextResponse.json(
      { error: "Authentication unavailable. Try again in a moment." },
      { status: 503 },
    );
  }

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as NovaVisionRequest | null;
  if (!body || !Array.isArray(body.messages) || body.messages.length === 0) {
    return NextResponse.json(
      { error: "messages[] is required" },
      { status: 400 },
    );
  }

  // Validate + normalize incoming messages.
  const incoming: IncomingMessage[] = body.messages
    .filter((m): m is IncomingMessage => {
      return (
        m !== null &&
        typeof m === "object" &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string"
      );
    })
    .slice(-MAX_HISTORY);

  if (incoming.length === 0) {
    return NextResponse.json({ error: "No valid messages." }, { status: 400 });
  }

  const latestUser = [...incoming].reverse().find((m) => m.role === "user");
  if (!latestUser) {
    return NextResponse.json({ error: "No user message found." }, { status: 400 });
  }

  // Image size guard.
  if (latestUser.imageBase64 && approxBase64Bytes(latestUser.imageBase64) > MAX_IMAGE_BYTES) {
    return NextResponse.json(
      { error: "Image too large. Please use a smaller frame (max 6MB)." },
      { status: 413 },
    );
  }

  if (!latestUser.content.trim() && !latestUser.imageBase64) {
    return NextResponse.json(
      { error: "Send a question, a photo, or both." },
      { status: 400 },
    );
  }

  // Compose the Groq request. Keep image only on the LATEST user message —
  // history images are too expensive and the model has already described them.
  const historyForGroq = incoming.slice(0, -1).map((m) => ({
    ...m,
    imageBase64: undefined,
    mimeType: undefined,
  }));
  const groqMessages: Groq.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...historyForGroq.map(buildGroqMessage),
    buildGroqMessage(latestUser),
  ];

  let assistantText: string;
  try {
    const completion = await groq.chat.completions.create({
      model: VISION_MODEL,
      temperature: 0.55,
      max_tokens: 900,
      messages: groqMessages,
    });
    assistantText = (completion.choices[0]?.message?.content ?? "").trim();
  } catch (err) {
    console.error("[nova-vision] Groq call failed:", err);
    const detail = err instanceof Error ? err.message : "Unknown vision error";
    return NextResponse.json(
      { error: `Vision tutor error: ${detail}` },
      { status: 502 },
    );
  }

  if (!assistantText) {
    return NextResponse.json(
      { error: "Nova returned an empty response. Try rephrasing or resnapping." },
      { status: 502 },
    );
  }

  // Best-effort persistence — never block the response on DB.
  let persistedConversationId: string | null = null;
  try {
    let conversationId = body.conversationId;
    if (conversationId) {
      const existing = await prisma.conversation.findFirst({
        where: { id: conversationId, userId: session.user.id },
        select: { id: true },
      });
      if (!existing) conversationId = undefined;
    }

    if (!conversationId) {
      const titleSeed =
        latestUser.content.trim().slice(0, 60) ||
        (latestUser.imageBase64 ? "Camera question" : "Nova Vision");
      const created = await prisma.conversation.create({
        data: {
          userId: session.user.id,
          title: titleSeed,
          subject: NOVA_VISION_SUBJECT,
        },
        select: { id: true },
      });
      conversationId = created.id;
    }

    await prisma.message.createMany({
      data: [
        {
          conversationId,
          role: "user",
          content: latestUser.content || "(snapped a photo)",
          command: latestUser.imageBase64 ? "vision-snap" : null,
        },
        {
          conversationId,
          role: "assistant",
          content: assistantText,
          command: null,
        },
      ],
    });

    persistedConversationId = conversationId;
  } catch (persistErr) {
    console.error("[nova-vision] persist failed:", persistErr);
  }

  return NextResponse.json({
    message: assistantText,
    conversationId: persistedConversationId,
    subject: NOVA_VISION_SUBJECT,
  });
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const conversations = await prisma.conversation.findMany({
    where: {
      userId: session.user.id,
      subject: NOVA_VISION_SUBJECT,
    },
    orderBy: { updatedAt: "desc" },
    take: 20,
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { messages: true } },
    },
  });

  return NextResponse.json({ conversations });
}
