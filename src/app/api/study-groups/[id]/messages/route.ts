import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { runGroqPrompt } from "~/server/groq";
import { bumpGroupStreak, bumpMessageStats, ensureGroupMember } from "~/server/study-groups";

function getLinkPreview(text: string): { title: string; url: string; host: string } | null {
  const urlMatch = text.match(/https?:\/\/[^\s]+/i);
  if (!urlMatch?.[0]) return null;

  try {
    const parsed = new URL(urlMatch[0]);
    return {
      title: parsed.hostname.replace("www.", ""),
      url: parsed.toString(),
      host: parsed.hostname,
    };
  } catch {
    return null;
  }
}

async function sendAiMessage(groupId: string, message: string) {
  return db.groupMessage.create({
    data: {
      groupId,
      userId: null,
      isAI: true,
      message,
    },
  });
}

export async function GET(
  _request: Request,
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

    await db.studyGroupMember.update({
      where: { groupId_userId: { groupId: id, userId: session.user.id } },
      data: { lastSeenAt: new Date() },
    });

    const messages = await db.groupMessage.findMany({
      where: { groupId: id },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
      },
      orderBy: { timestamp: "asc" },
      take: 200,
    });

    return NextResponse.json({
      messages: messages.map((msg) => ({
        ...msg,
        senderName: msg.isAI ? "Kyvex AI" : msg.user?.name || msg.user?.email || "Member",
      })),
    });
  } catch (error) {
    console.error("Study group messages get error:", error);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}

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

    const body = (await request.json()) as { message?: string };
    const message = (body.message ?? "").trim();

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const linkPreview = getLinkPreview(message);

    const saved = await db.groupMessage.create({
      data: {
        groupId: id,
        userId: session.user.id,
        message,
        isAI: false,
        metadata: linkPreview ? { resourceType: "link", preview: linkPreview } : undefined,
      },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
      },
    });

    await bumpMessageStats(id, session.user.id);
    await bumpGroupStreak(id);

    if (linkPreview) {
      await db.groupResource.create({
        data: {
          groupId: id,
          sharedById: session.user.id,
          type: "link",
          title: linkPreview.title,
          url: linkPreview.url,
          metadata: { preview: linkPreview },
        },
      });
    }

    const topic = membership.group.topic || membership.group.name;
    const lowered = message.toLowerCase();

    if (lowered.includes("/quiz")) {
      const quizPrompt = await runGroqPrompt({
        system: "Return exactly one concise multiple-choice quiz question with 4 options and answer.",
        user: `Generate one ${topic} quiz question in plain text.`,
        temperature: 0.5,
        maxTokens: 220,
      });
      await sendAiMessage(id, `Kyvex AI Quiz:\n${quizPrompt.trim()}`);
    }

    if (lowered.includes("@ai") || lowered.includes("?")) {
      const aiReply = await runGroqPrompt({
        system: "You are Kyvex AI moderator. Be concise and helpful.",
        user: `Group topic: ${topic}\nUser message: ${message}\nProvide a concise helpful response.`,
        temperature: 0.4,
        maxTokens: 320,
      });
      await sendAiMessage(id, aiReply.trim() || `Let's break that down step-by-step for ${topic}.`);
    }

    const totalMessages = await db.groupMessage.count({ where: { groupId: id } });
    if (totalMessages % 5 === 0) {
      const recent = await db.groupMessage.findMany({
        where: { groupId: id },
        include: { user: { select: { name: true, email: true } } },
        orderBy: { timestamp: "desc" },
        take: 8,
      });
      const transcript = recent
        .reverse()
        .map((item) => `${item.isAI ? "Kyvex AI" : item.user?.name || item.user?.email || "Member"}: ${item.message}`)
        .join("\n");
      const aiTip = await runGroqPrompt({
        system: "You are Kyvex AI moderator. Summarize progress and add one actionable tip.",
        user: `Topic: ${topic}\nRecent chat:\n${transcript}`,
        temperature: 0.4,
        maxTokens: 180,
      });
      await sendAiMessage(id, aiTip.trim() || `Quick tip: apply one concrete ${topic} example together before moving on.`);

      const offTopic = !transcript.toLowerCase().includes(topic.toLowerCase().split(" ")[0] ?? "");
      if (offTopic) {
        await sendAiMessage(id, `Lets refocus on ${topic}`);
      }
    }

    return NextResponse.json({ message: saved });
  } catch (error) {
    console.error("Study group messages post error:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
