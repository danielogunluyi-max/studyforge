import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { extractJsonBlock, runGroqPrompt } from "~/server/groq";

type Confidence = "High" | "Medium" | "Low";

type SectionConfig = {
  sectionName: string;
  questionType: string;
  questionCount: number;
  marksPerQuestion: number;
};

type PredictedQuestion = {
  id: string;
  question: string;
  type: string;
  confidence: Confidence;
  reason: string;
  marks: number;
  sectionName: string;
  topic: string;
};

type TopicWeight = {
  topic: string;
  percentage: number;
  likelihood: Confidence;
};

type PredictionAnalytics = {
  topicDistribution: TopicWeight[];
  style: string;
  difficultyTrend: string;
  patternAnalysis: {
    repeatedTopics: string[];
    commonQuestionTypes: string[];
    averageDifficultyTrend: string;
    gapsInCoverage: string[];
  };
};

type PredictionResponse = {
  analytics: PredictionAnalytics;
  predictions: PredictedQuestion[];
  totalMarks: number;
};

type MarkSchemeItem = {
  questionId: string;
  question: string;
  totalMarks: number;
  expectedAnswerPoints: string[];
  marksBreakdown: string[];
  commonMistakes: string[];
};

type StudyPlanDay = {
  day: string;
  focusTopics: string[];
  tasks: string[];
  hours: number;
};

type PredictPayload = {
  mode?: "predict" | "mark-scheme" | "study-plan";
  examType?: string;
  pastExamText?: string;
  syllabusText?: string;
  predictionCount?: number;
  difficultyLevel?: string;
  subjectType?: string;
  curriculum?: string;
  testPreset?: string;
  customSections?: SectionConfig[];
  save?: boolean;
  predictions?: PredictedQuestion[];
  examDate?: string;
  hoursPerDay?: number;
  topicDistribution?: TopicWeight[];
};

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function normalizeConfidence(value: unknown): Confidence {
  const normalized = String(value ?? "").toLowerCase();
  if (normalized === "high") return "High";
  if (normalized === "low") return "Low";
  return "Medium";
}

function normalizeSections(sections: unknown): SectionConfig[] {
  if (!Array.isArray(sections)) return [];
  return sections
    .map((item) => {
      const section = item as Partial<SectionConfig>;
      const sectionName = String(section.sectionName ?? "").trim().slice(0, 60);
      const questionType = String(section.questionType ?? "").trim().slice(0, 40);
      const questionCount = clampInt(section.questionCount, 1, 50, 1);
      const marksPerQuestion = clampInt(section.marksPerQuestion, 1, 50, 1);
      if (!sectionName || !questionType) return null;
      return { sectionName, questionType, questionCount, marksPerQuestion };
    })
    .filter((item): item is SectionConfig => Boolean(item));
}

function sectionPlanText(sections: SectionConfig[]): string {
  if (!sections.length) return "No custom sections provided.";
  return sections
    .map(
      (section, index) =>
        `${index + 1}. ${section.sectionName}: ${section.questionCount} x ${section.questionType} @ ${section.marksPerQuestion} marks each`,
    )
    .join("\n");
}

function sanitizePredictionResponse(raw: PredictionResponse, fallbackCount: number): PredictionResponse {
  const predictions = (raw.predictions ?? []).slice(0, Math.max(1, fallbackCount)).map((item, index) => ({
    id: String(item.id ?? `q-${index + 1}`),
    question: String(item.question ?? "").trim(),
    type: String(item.type ?? "Short Answer").trim(),
    confidence: normalizeConfidence(item.confidence),
    reason: String(item.reason ?? "Pattern match from prior exam trend.").trim(),
    marks: clampInt(item.marks, 1, 100, 2),
    sectionName: String(item.sectionName ?? "Main Section").trim().slice(0, 60),
    topic: String(item.topic ?? "General").trim().slice(0, 60),
  }));

  const topics = (raw.analytics?.topicDistribution ?? []).slice(0, 12).map((item) => ({
    topic: String(item.topic ?? "Topic").trim().slice(0, 60),
    percentage: clampInt(item.percentage, 1, 100, 10),
    likelihood: normalizeConfidence(item.likelihood),
  }));

  return {
    analytics: {
      topicDistribution: topics,
      style: String(raw.analytics?.style ?? "Balanced exam style").trim().slice(0, 220),
      difficultyTrend: String(raw.analytics?.difficultyTrend ?? "Moderate to hard").trim().slice(0, 220),
      patternAnalysis: {
        repeatedTopics: (raw.analytics?.patternAnalysis?.repeatedTopics ?? []).map((item) => String(item).slice(0, 60)).slice(0, 10),
        commonQuestionTypes: (raw.analytics?.patternAnalysis?.commonQuestionTypes ?? []).map((item) => String(item).slice(0, 60)).slice(0, 10),
        averageDifficultyTrend: String(raw.analytics?.patternAnalysis?.averageDifficultyTrend ?? "Mixed by year").slice(0, 220),
        gapsInCoverage: (raw.analytics?.patternAnalysis?.gapsInCoverage ?? []).map((item) => String(item).slice(0, 80)).slice(0, 10),
      },
    },
    predictions,
    totalMarks: predictions.reduce((sum, q) => sum + q.marks, 0),
  };
}

async function handlePredict(body: PredictPayload, userId: string) {
  const examType = String(body.examType ?? "Midterm").trim() || "Midterm";
  const pastExamText = String(body.pastExamText ?? "").trim();
  const syllabusText = String(body.syllabusText ?? "").trim();
  const predictionCount = clampInt(body.predictionCount, 5, 50, 10);
  const difficultyLevel = String(body.difficultyLevel ?? "Exam-Level").trim() || "Exam-Level";
  const subjectType = String(body.subjectType ?? "Other").trim() || "Other";
  const curriculum = String(body.curriculum ?? "").trim() || "Custom";
  const testPreset = String(body.testPreset ?? "Mixed (Standard)").trim() || "Mixed (Standard)";
  const sections = normalizeSections(body.customSections);

  if (!pastExamText) {
    return NextResponse.json({ error: "Past exam content is required" }, { status: 400 });
  }

  const prompt = `You are an elite exam analyst AI.

Build exam predictions from this context:
- Exam type: ${examType}
- Subject type: ${subjectType}
- Difficulty target: ${difficultyLevel}
- Curriculum: ${curriculum}
- Prediction count target: ${predictionCount}
- Test preset: ${testPreset}
- Custom sections:
${sectionPlanText(sections)}

Past exam text:
${pastExamText.slice(0, 30000)}

Syllabus text:
${(syllabusText || "N/A").slice(0, 15000)}

Rules:
- Respect section marks and question-type distribution.
- Each predicted question must include: confidence (High|Medium|Low), brief reason (frequency evidence), marks, and topic.
- Topic percentages should reflect likelihood based on frequency in past content.
- Include pattern analysis for repeated topics, frequent question types, average difficulty trend, and coverage gaps.
- Keep wording exam-paper quality.

Return strict JSON only:
{
  "analytics": {
    "topicDistribution": [{ "topic": "Functions", "percentage": 85, "likelihood": "High" }],
    "style": "...",
    "difficultyTrend": "...",
    "patternAnalysis": {
      "repeatedTopics": ["..."],
      "commonQuestionTypes": ["..."],
      "averageDifficultyTrend": "...",
      "gapsInCoverage": ["..."]
    }
  },
  "predictions": [
    {
      "id": "q1",
      "question": "...",
      "type": "Multiple Choice",
      "confidence": "High",
      "reason": "Appeared in 3 of 4 past exams",
      "marks": 2,
      "sectionName": "Part A",
      "topic": "Functions"
    }
  ],
  "totalMarks": 100
}`;

  const aiOutput = await runGroqPrompt({
    system: "Return only valid JSON. No markdown.",
    user: prompt,
    temperature: 0.35,
    maxTokens: 3200,
  });

  const parsed = extractJsonBlock<PredictionResponse>(aiOutput);
  if (!parsed || !Array.isArray(parsed.predictions)) {
    return NextResponse.json({ error: "Failed to parse exam predictions" }, { status: 502 });
  }

  const sanitized = sanitizePredictionResponse(parsed, predictionCount);

  if (body.save !== false) {
    await db.examPrediction.create({
      data: {
        userId,
        examType,
        uploadedContent: pastExamText,
        syllabusContent: syllabusText || null,
        predictions: sanitized.predictions,
        analytics: sanitized.analytics,
      },
    });
  }

  return NextResponse.json(sanitized);
}

async function handleMarkScheme(body: PredictPayload) {
  const predictions = Array.isArray(body.predictions) ? body.predictions.slice(0, 60) : [];
  if (!predictions.length) {
    return NextResponse.json({ error: "Predictions are required for mark scheme generation" }, { status: 400 });
  }

  const prompt = `Generate a mark scheme for these predicted exam questions.

Questions JSON:
${JSON.stringify(predictions, null, 2)}

Return strict JSON only:
{
  "markScheme": [
    {
      "questionId": "q1",
      "question": "...",
      "totalMarks": 4,
      "expectedAnswerPoints": ["..."],
      "marksBreakdown": ["1 mark for ..."],
      "commonMistakes": ["..."]
    }
  ]
}`;

  const output = await runGroqPrompt({
    system: "Return only valid JSON.",
    user: prompt,
    temperature: 0.25,
    maxTokens: 2200,
  });

  const parsed = extractJsonBlock<{ markScheme?: MarkSchemeItem[] }>(output);
  const markScheme = (parsed?.markScheme ?? []).map((item, index) => ({
    questionId: String(item.questionId ?? predictions[index]?.id ?? `q-${index + 1}`),
    question: String(item.question ?? predictions[index]?.question ?? "Question"),
    totalMarks: clampInt(item.totalMarks, 1, 100, clampInt(predictions[index]?.marks, 1, 100, 2)),
    expectedAnswerPoints: (item.expectedAnswerPoints ?? []).map((point) => String(point).slice(0, 200)).slice(0, 8),
    marksBreakdown: (item.marksBreakdown ?? []).map((point) => String(point).slice(0, 200)).slice(0, 8),
    commonMistakes: (item.commonMistakes ?? []).map((point) => String(point).slice(0, 200)).slice(0, 8),
  }));

  return NextResponse.json({ markScheme });
}

async function handleStudyPlan(body: PredictPayload) {
  const predictions = Array.isArray(body.predictions) ? body.predictions.slice(0, 80) : [];
  const topicDistribution = Array.isArray(body.topicDistribution) ? body.topicDistribution.slice(0, 20) : [];
  const examDate = String(body.examDate ?? "").trim();
  const hoursPerDay = clampInt(body.hoursPerDay, 1, 8, 2);

  if (!examDate) {
    return NextResponse.json({ error: "Exam date is required for study plan" }, { status: 400 });
  }

  const prompt = `Create a day-by-day study plan.

Exam date: ${examDate}
Hours/day available: ${hoursPerDay}
Predicted questions JSON:
${JSON.stringify(predictions, null, 2)}
Topic distribution JSON:
${JSON.stringify(topicDistribution, null, 2)}

Rules:
- Prioritize high-likelihood topics first.
- Return practical tasks for each day.
- Keep each day realistic to the hour limit.

Return strict JSON only:
{
  "studyPlan": [
    {
      "day": "Day 1",
      "focusTopics": ["Functions"],
      "tasks": ["Solve 15 mixed function problems", "Review formula sheet"],
      "hours": 3
    }
  ],
  "summary": "..."
}`;

  const output = await runGroqPrompt({
    system: "Return only valid JSON.",
    user: prompt,
    temperature: 0.3,
    maxTokens: 2200,
  });

  const parsed = extractJsonBlock<{ studyPlan?: StudyPlanDay[]; summary?: string }>(output);

  const studyPlan = (parsed?.studyPlan ?? []).map((day, index) => ({
    day: String(day.day ?? `Day ${index + 1}`).slice(0, 60),
    focusTopics: (day.focusTopics ?? []).map((item) => String(item).slice(0, 60)).slice(0, 6),
    tasks: (day.tasks ?? []).map((item) => String(item).slice(0, 180)).slice(0, 8),
    hours: clampInt(day.hours, 1, 12, hoursPerDay),
  }));

  return NextResponse.json({
    studyPlan,
    summary: String(parsed?.summary ?? "Study plan generated from predicted high-priority topics.").slice(0, 400),
  });
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as PredictPayload;
    const mode = body.mode ?? "predict";

    if (mode === "mark-scheme") {
      return await handleMarkScheme(body);
    }

    if (mode === "study-plan") {
      return await handleStudyPlan(body);
    }

    return await handlePredict(body, session.user.id);
  } catch (error) {
    console.error("Exam predictor API error:", error);
    return NextResponse.json({ error: "Failed to process exam prediction request" }, { status: 500 });
  }
}
