import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "~/server/auth";
import { runGroqPrompt } from "~/server/groq";

type ExtensionGenerateBody = {
  text?: string;
  format?: "summary" | "flashcards" | "questions" | "detailed";
};

async function resolveUserId(request: NextRequest) {
  const session = await auth();
  if (session?.user?.id) {
    return session.user.id;
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,
  });

  return typeof token?.sub === "string" ? token.sub : null;
}

function buildPrompt(format: string, text: string) {
  if (format === "summary") {
    return `Create concise study notes in paragraph form from this content:\n\n${text}`;
  }

  if (format === "detailed") {
    return `Create detailed, structured study notes with clear sections from this content:\n\n${text}`;
  }

  if (format === "flashcards") {
    return `Create flashcards in this exact format:\nQ: question\nA: answer\n\nUse 8-12 cards from:\n\n${text}`;
  }

  return `Create 10 practice questions with answers from this content. Keep each in this format:\n1. Question?\nAnswer: ...\n\nContent:\n${text}`;
}

export async function POST(request: NextRequest) {
  try {
    const userId = await resolveUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as ExtensionGenerateBody;
    const text = String(body.text ?? "").trim();
    const format = ["summary", "flashcards", "questions", "detailed"].includes(String(body.format ?? ""))
      ? String(body.format)
      : "summary";

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const prompt = buildPrompt(format, text.slice(0, 12000));
    const result = await runGroqPrompt({
      user: prompt,
      temperature: 0.5,
      maxTokens: 1800,
    });

    return NextResponse.json({ format, result });
  } catch (error) {
    console.error("Extension generate POST error:", error);
    return NextResponse.json({ error: "Failed to generate content" }, { status: 500 });
  }
}
