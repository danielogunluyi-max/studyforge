import { NextResponse } from "next/server";
import { requireAuth } from "~/server/api-utils";
import { prisma, type Prisma } from "@/lib/prisma";
import { groqJSON } from "~/server/groq";

export async function POST(req: Request) {
  const { userId, response } = await requireAuth();
  if (response) return response;

  const { subject, score, totalMarks, wrongAnswers, examId } = (await req.json()) as {
    subject?: string;
    score?: number;
    totalMarks?: number;
    wrongAnswers?: string;
    examId?: string;
  };

  const parsed = await groqJSON<{
    overallDiagnosis?: string;
    weakAreas?: string[];
    strongAreas?: string[];
    rootCauses?: Record<string, string>[];
    actionPlan?: Record<string, string>[];
    preventionStrategy?: string;
    motivationalNote?: string;
  }>({
    user: `You are an academic performance diagnostician. Perform a detailed exam autopsy.

Subject: ${subject}
Score: ${score}/${totalMarks} (${(((score ?? 0) / (totalMarks ?? 1)) * 100).toFixed(1)}%)
Wrong answers/areas: ${wrongAnswers || "Not provided"}

Respond ONLY in JSON:
{
  "overallDiagnosis": "One sentence summary of what happened",
  "weakAreas": ["Topic 1", "Topic 2"],
  "strongAreas": ["Topic 3", "Topic 4"],
  "rootCauses": [
    { "cause": "Insufficient practice on X", "severity": "high" },
    { "cause": "Conceptual gap in Y", "severity": "medium" }
  ],
  "actionPlan": [
    { "action": "Review X using Feynman technique", "priority": 1, "timeEstimate": "2 hours" },
    { "action": "Create flashcards for Y formulas", "priority": 2, "timeEstimate": "1 hour" }
  ],
  "preventionStrategy": "What to do differently next time",
  "motivationalNote": "Encouraging but honest note to the student"
}`,
    maxTokens: 800,
  });

  if (!parsed) return NextResponse.json({ error: "Autopsy failed" }, { status: 500 });

  const autopsy = await prisma.examAutopsy.create({
    data: {
      userId,
      examId: examId || null,
      subject: subject ?? "",
      score: score ?? 0,
      totalMarks: totalMarks ?? 0,
      diagnosis: parsed as unknown as Prisma.InputJsonValue,
      weakAreas: parsed.weakAreas || [],
      strongAreas: parsed.strongAreas || [],
      actionPlan: (parsed.actionPlan || []) as unknown as Prisma.InputJsonValue,
    },
  });
  return NextResponse.json({ autopsy: { ...autopsy, ...parsed } });
}

export async function GET() {
  const { userId, response } = await requireAuth();
  if (response) return response;

  const autopsies = await prisma.examAutopsy.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return NextResponse.json({ autopsies });
}
