import { NextResponse } from "next/server";

import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { extractJsonBlock, runGroqPrompt } from "~/server/groq";

type PlannerExam = {
  subject: string;
  date: string;
  notes?: string;
};

type HoursPerDay = {
  mon: number;
  tue: number;
  wed: number;
  thu: number;
  fri: number;
  sat: number;
  sun: number;
};

type GeneratePlanBody = {
  subjects?: string[];
  exams?: PlannerExam[];
  hoursPerDay?: Partial<HoursPerDay>;
  weakAreas?: string;
  studyStyle?: "deep" | "mixed" | "light";
  weekStart?: string;
};

type PlanBlock = {
  subject: string;
  topic: string;
  duration: number;
  technique:
    | "Active Recall"
    | "Flashcards"
    | "Practice Test"
    | "Note Review"
    | "Concept Map"
    | "Problem Sets"
    | "Essay Practice";
  techniqueReason: string;
  priority: "High" | "Medium" | "Low";
};

type PlanDay = {
  day: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";
  date: string;
  totalHours: number;
  theme: string;
  motivationalNote: string;
  blocks: PlanBlock[];
};

type GeneratedPlan = {
  weekSummary: string;
  strategyReasoning: string;
  days: PlanDay[];
  tips: string[];
};

const DAY_KEYS: Array<keyof HoursPerDay> = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const DAY_NAMES: PlanDay["day"][] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .slice(0, 30);
}

function clampHours(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(12, Math.round(parsed * 2) / 2));
}

function normalizeHoursPerDay(raw?: Partial<HoursPerDay>): HoursPerDay {
  return {
    mon: clampHours(raw?.mon),
    tue: clampHours(raw?.tue),
    wed: clampHours(raw?.wed),
    thu: clampHours(raw?.thu),
    fri: clampHours(raw?.fri),
    sat: clampHours(raw?.sat),
    sun: clampHours(raw?.sun),
  };
}

function normalizeExams(raw: unknown): PlannerExam[] {
  if (!Array.isArray(raw)) return [];

  const normalized: PlannerExam[] = [];

  for (const exam of raw) {
    if (!exam || typeof exam !== "object") continue;
    const value = exam as Record<string, unknown>;
    const subject = String(value.subject ?? "").trim();
    const date = String(value.date ?? "").trim();
    const notes = String(value.notes ?? "").trim();
    if (!subject || !date) continue;

    normalized.push({ subject, date, notes: notes || undefined });
    if (normalized.length >= 20) break;
  }

  return normalized;
}

function normalizePlan(raw: unknown): GeneratedPlan | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;

  if (typeof value.weekSummary !== "string" || typeof value.strategyReasoning !== "string") {
    return null;
  }

  const daysRaw = Array.isArray(value.days) ? value.days : [];
  const days: PlanDay[] = daysRaw
    .map((day) => {
      if (!day || typeof day !== "object") return null;
      const item = day as Record<string, unknown>;
      const dayName = String(item.day ?? "") as PlanDay["day"];
      if (!DAY_NAMES.includes(dayName)) return null;

      const blocksRaw = Array.isArray(item.blocks) ? item.blocks : [];
      const blocks: PlanBlock[] = blocksRaw
        .map((block) => {
          if (!block || typeof block !== "object") return null;
          const b = block as Record<string, unknown>;
          const subject = String(b.subject ?? "").trim();
          const topic = String(b.topic ?? "").trim();
          const duration = Math.max(0, Math.round(Number(b.duration) || 0));
          const technique = String(b.technique ?? "").trim() as PlanBlock["technique"];
          const techniqueReason = String(b.techniqueReason ?? "").trim();
          const priority = String(b.priority ?? "").trim() as PlanBlock["priority"];

          if (!subject || !topic || !duration || !techniqueReason) return null;
          if (!["Active Recall", "Flashcards", "Practice Test", "Note Review", "Concept Map", "Problem Sets", "Essay Practice"].includes(technique)) return null;
          if (!["High", "Medium", "Low"].includes(priority)) return null;

          return { subject, topic, duration, technique, techniqueReason, priority };
        })
        .filter((block): block is PlanBlock => Boolean(block));

      return {
        day: dayName,
        date: String(item.date ?? "").trim() || dayName,
        totalHours: Math.max(0, Number(item.totalHours) || 0),
        theme: String(item.theme ?? "").trim() || "Focus",
        motivationalNote: String(item.motivationalNote ?? "").trim() || "Stay consistent and keep momentum.",
        blocks,
      };
    })
    .filter((day): day is PlanDay => Boolean(day));

  return {
    weekSummary: value.weekSummary.trim(),
    strategyReasoning: value.strategyReasoning.trim(),
    days,
    tips: normalizeStringArray(value.tips),
  };
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as GeneratePlanBody;
    const subjects = normalizeStringArray(body.subjects).slice(0, 12);
    const exams = normalizeExams(body.exams);
    const hoursPerDay = normalizeHoursPerDay(body.hoursPerDay);
    const weakAreas = String(body.weakAreas ?? "").trim();
    const studyStyle = body.studyStyle === "deep" || body.studyStyle === "light" ? body.studyStyle : "mixed";
    const weekStart = String(body.weekStart ?? "").trim();

    if (subjects.length === 0) {
      return NextResponse.json({ error: "At least one subject is required" }, { status: 400 });
    }

    const weekStartDate = new Date(weekStart);
    if (!weekStart || Number.isNaN(weekStartDate.getTime())) {
      return NextResponse.json({ error: "Invalid weekStart date" }, { status: 400 });
    }

    const dayDates = DAY_NAMES.map((day, index) => {
      const date = new Date(weekStartDate);
      date.setDate(date.getDate() + index);
      return {
        day,
        date: date.toDateString(),
        hours: hoursPerDay[DAY_KEYS[index]!],
      };
    });

    const systemPrompt = `You are Nova, an expert AI study coach for Kyvex.
Your job is to create a personalized 7-day study schedule.
Use interleaving (mixing subjects) and spaced repetition principles.
Prioritize subjects with closer exam dates.
Match techniques to goals: active recall for memorization,
practice tests near exam dates, concept review early in the week.

You MUST respond with ONLY valid JSON — no preamble, no markdown, no backticks.
Use this exact structure:
{
  "weekSummary": "<2-3 sentence overview of the week's strategy>",
  "strategyReasoning": "<why you ordered things this way>",
  "days": [
    {
      "day": "Monday",
      "date": "<date string>",
      "totalHours": <number>,
      "theme": "<one word theme e.g. 'Foundation' or 'Deep Dive'>",
      "motivationalNote": "<short encouraging note for this day>",
      "blocks": [
        {
          "subject": "<subject name>",
          "topic": "<specific topic to study>",
          "duration": <minutes as number>,
          "technique": "<Active Recall | Flashcards | Practice Test | Note Review | Concept Map | Problem Sets | Essay Practice>",
          "techniqueReason": "<one sentence why this technique for this block>",
          "priority": "<High | Medium | Low>"
        }
      ]
    }
  ],
  "tips": ["<3-5 personalized study tips based on their subjects and exams>"]
}`;

    const userPrompt = `Create a 7-day study plan for a student with these details:

Subjects to study: ${subjects.join(", ")}

Upcoming exams:
${
  exams.length > 0
    ? exams
        .map((exam) => `- ${exam.subject}: ${exam.date}${exam.notes ? ` (Notes: ${exam.notes})` : ""}`)
        .join("\n")
    : "- No exams specified"
}

Available study hours per day:
${dayDates.map((day) => `- ${day.day} (${day.date}): ${day.hours} hours`).join("\n")}

Weak areas / focus notes: ${weakAreas || "None specified"}
Study style preference: ${
  studyStyle === "deep"
    ? "Deep focus (fewer subjects per day, longer blocks)"
    : studyStyle === "light"
      ? "Light review (short frequent sessions, many subjects)"
      : "Mixed (balanced approach)"
}

Generate a realistic, actionable 7-day plan. Only schedule study time up to the available hours per day. Skip days with 0 hours. Use interleaving where possible. Prioritize subjects with closer exams.`;

    const raw = await runGroqPrompt({
      system: systemPrompt,
      user: userPrompt,
      temperature: 0.4,
      maxTokens: 2000,
    });

    const plan = normalizePlan(extractJsonBlock<GeneratedPlan>(raw));
    if (!plan || plan.days.length === 0) {
      throw new Error("Planner returned invalid JSON");
    }

    const saved = await db.studyPlan.create({
      data: {
        userId: session.user.id,
        weekStart: weekStartDate,
        subjects,
        plan,
      },
      select: { id: true },
    });

    return NextResponse.json({ plan, planId: saved.id });
  } catch (error) {
    console.error("Planner error:", error);
    return NextResponse.json({ error: "Failed to generate plan" }, { status: 500 });
  }
}
