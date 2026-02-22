import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { extractJsonBlock, runGroqPrompt } from "~/server/groq";

type PredictionItem = {
  question: string;
  type: "multiple-choice" | "short-answer" | "essay";
  confidence: "High" | "Medium" | "Low";
  reason: string;
};

type PredictionResponse = {
  analytics: {
    topicDistribution: Array<{ topic: string; percentage: number }>;
    style: string;
    difficultyTrend: string;
  };
  predictions: PredictionItem[];
};

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      examType?: string;
      pastExamText?: string;
      syllabusText?: string;
      save?: boolean;
    };

    const examType = (body.examType ?? "Midterm").trim();
    const pastExamText = (body.pastExamText ?? "").trim();
    const syllabusText = (body.syllabusText ?? "").trim();

    if (!pastExamText) {
      return NextResponse.json({ error: "Past exam content is required" }, { status: 400 });
    }

    const aiOutput = await runGroqPrompt({
      system:
        "You are an expert assessment analyst. Return strict JSON only. No markdown. Keep predictions realistic and exam-style.",
      user: `Analyze these materials and predict likely ${examType} questions.

Past exams:
${pastExamText}

Syllabus (optional):
${syllabusText || "N/A"}

Return JSON with this exact shape:
{
  "analytics": {
    "topicDistribution": [{ "topic": "Cell Biology", "percentage": 30 }],
    "style": "Conceptual with short calculations",
    "difficultyTrend": "Starts moderate, ends with hard synthesis"
  },
  "predictions": [
    {
      "question": "...",
      "type": "multiple-choice|short-answer|essay",
      "confidence": "High|Medium|Low",
      "reason": "Short explanation of pattern match"
    }
  ]
}
Create 10-20 predictions.`,
      temperature: 0.5,
      maxTokens: 2400,
    });

    const parsed = extractJsonBlock<PredictionResponse>(aiOutput);
    if (!parsed || !Array.isArray(parsed.predictions)) {
      return NextResponse.json({ error: "Failed to parse exam predictions" }, { status: 502 });
    }

    const sanitized: PredictionResponse = {
      analytics: {
        topicDistribution: (parsed.analytics?.topicDistribution ?? [])
          .slice(0, 8)
          .map((item) => ({
            topic: String(item.topic ?? "Topic").slice(0, 80),
            percentage: Math.max(1, Math.min(100, Number(item.percentage ?? 10))),
          })),
        style: String(parsed.analytics?.style ?? "Balanced mixed-style exam").slice(0, 200),
        difficultyTrend: String(parsed.analytics?.difficultyTrend ?? "Moderate to hard").slice(0, 200),
      },
      predictions: parsed.predictions.slice(0, 20).map((item) => ({
        question: String(item.question ?? "").trim(),
        type: item.type === "essay" || item.type === "short-answer" ? item.type : "multiple-choice",
        confidence: item.confidence === "High" || item.confidence === "Low" ? item.confidence : "Medium",
        reason: String(item.reason ?? "Pattern-based prediction").trim(),
      })),
    };

    if (body.save !== false) {
      await db.examPrediction.create({
        data: {
          userId: session.user.id,
          examType,
          uploadedContent: pastExamText,
          syllabusContent: syllabusText || null,
          predictions: sanitized.predictions,
          analytics: sanitized.analytics,
        },
      });
    }

    return NextResponse.json(sanitized);
  } catch (error) {
    console.error("Exam prediction error:", error);
    return NextResponse.json({ error: "Failed to predict exam questions" }, { status: 500 });
  }
}
