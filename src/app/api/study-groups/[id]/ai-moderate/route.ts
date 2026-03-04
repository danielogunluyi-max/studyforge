import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { runGroqPrompt } from "~/server/groq";
import { ensureGroupMember } from "~/server/study-groups";

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
    const membership = await ensureGroupMember(id, session.user.id);

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const recentMessages = await db.groupMessage.findMany({
      where: { groupId: id },
      orderBy: { timestamp: "desc" },
      take: 12,
      include: { user: { select: { name: true, email: true } } },
    });

    const transcript = recentMessages
      .reverse()
      .map((msg) => `${msg.isAI ? "AI Moderator" : msg.user?.name || msg.user?.email || "Member"}: ${msg.message}`)
      .join("\n");

    const body = (await request.json().catch(() => ({}))) as { mode?: "tip" | "summary" };
    const mode = body.mode ?? "tip";

    const aiMessage = await runGroqPrompt({
      system:
        "You are a concise AI study-group moderator. Keep discussion productive, ask Socratic questions, and redirect gently if needed.",
      user:
        mode === "summary"
          ? `Study group topic: ${membership.group.topic || membership.group.name}\n\nRecent discussion:\n${transcript || "(No messages yet)"}\n\nProvide a concise end-of-session summary in bullet style.`
          : `Study group topic: ${membership.group.topic || membership.group.name}\n\nRecent discussion:\n${transcript || "(No messages yet)"}\n\nRespond with one moderator message (max 80 words).`,
      temperature: 0.7,
      maxTokens: 260,
    });

    const saved = await db.groupMessage.create({
      data: {
        groupId: id,
        userId: null,
        message: aiMessage.trim() || "What concept should we break down next step-by-step?",
        isAI: true,
      },
    });

    return NextResponse.json({ message: saved });
  } catch (error) {
    console.error("Study group AI moderate error:", error);
    return NextResponse.json({ error: "Failed to generate moderator response" }, { status: 500 });
  }
}
