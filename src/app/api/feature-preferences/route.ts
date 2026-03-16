import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "~/server/auth";

const PRESET_FEATURES = {
  HIGHSCHOOL: {
    enabled: [
      "generator", "flashcards", "feynman", "battle", "curriculum",
      "grade-calc", "games", "planner", "calendar", "wellness",
      "tutor", "rooms", "mock-exam", "audio", "scan", "photo-quiz",
      "my-notes", "mastery", "achievements", "habits", "community",
      "search", "capture", "listen", "diagrams", "podcast",
      "battle-royale", "study-ghost", "wrapped", "kyvex-iq",
      "decay-alerts", "predictor", "interleave", "narrative",
      "compress", "debate", "crossover", "contract", "reading-speed",
      "micro-lessons", "lecture", "focus-score", "smart-upload",
      "cornell", "quizlet-import", "library", "study-mode",
      "content-hub", "knowledge-map",
    ],
    hidden: ["career-path", "peer-review", "essay-grade", "counterargument", "debate-judge"],
  },
  COLLEGE: {
    enabled: [
      "generator", "flashcards", "feynman", "planner", "calendar",
      "wellness", "tutor", "mock-exam", "audio", "my-notes",
      "mastery", "achievements", "habits", "community", "search",
      "capture", "diagrams", "essay-grade", "career-path",
      "peer-review", "cornell", "syllabus", "classroom-import",
      "presentations", "citations", "grammar", "plagiarism",
      "kyvex-iq", "study-ghost", "wrapped", "contract",
      "reading-speed", "micro-lessons", "lecture", "focus-score",
      "smart-upload", "library", "study-mode", "content-hub",
      "knowledge-map", "autopsy", "decay-alerts", "adaptive-notes",
      "counterargument", "debate-judge", "crossover",
    ],
    hidden: ["curriculum", "grade-calc", "games", "battle-royale", "boss-battle"],
  },
  UNIVERSITY: {
    enabled: [
      "generator", "flashcards", "feynman", "planner", "calendar",
      "tutor", "voice-tutor", "my-notes", "mastery", "community",
      "search", "capture", "diagrams", "essay-grade", "career-path",
      "peer-review", "cornell", "syllabus", "classroom-import",
      "presentations", "citations", "grammar", "plagiarism",
      "kyvex-iq", "study-ghost", "wrapped", "contract",
      "reading-speed", "micro-lessons", "lecture", "focus-score",
      "smart-upload", "library", "study-mode", "content-hub",
      "knowledge-map", "autopsy", "decay-alerts", "adaptive-notes",
      "counterargument", "debate-judge", "debate", "concept-collision",
      "study-dna", "memory-sim", "note-evolution", "crossover",
      "compress", "narrative", "interleave", "pdf-library",
    ],
    hidden: ["curriculum", "grade-calc", "games", "battle-royale", "battle", "photo-quiz"],
  },
} as const;

type PresetKey = keyof typeof PRESET_FEATURES;

function normalizePreset(value: string | null | undefined): PresetKey {
  if (value === "COLLEGE" || value === "UNIVERSITY") return value;
  return "HIGHSCHOOL";
}

export async function GET() {
  const session = await auth();
  const uid = session?.user?.id;
  if (!uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let prefs = await prisma.featurePreference.findUnique({
    where: { userId: uid },
  });

  if (!prefs) {
    const user = await prisma.user.findUnique({
      where: { id: uid },
      select: { preset: true },
    });

    const preset = normalizePreset(user?.preset ?? "HIGHSCHOOL");
    const defaults = PRESET_FEATURES[preset];

    prefs = await prisma.featurePreference.create({
      data: {
        userId: uid,
        preset,
        enabledFeatures: [...defaults.enabled],
        hiddenFeatures: [...defaults.hidden],
      },
    });
  }

  return NextResponse.json({ prefs, presetDefaults: PRESET_FEATURES });
}

export async function POST(req: Request) {
  const session = await auth();
  const uid = session?.user?.id;
  if (!uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as {
    enabledFeatures?: string[];
    hiddenFeatures?: string[];
    preset?: string;
    resetToPreset?: boolean;
  };

  if (body.resetToPreset && body.preset) {
    const preset = normalizePreset(body.preset);
    const defaults = PRESET_FEATURES[preset];

    const prefs = await prisma.featurePreference.upsert({
      where: { userId: uid },
      update: {
        preset,
        enabledFeatures: [...defaults.enabled],
        hiddenFeatures: [...defaults.hidden],
        customized: false,
      },
      create: {
        userId: uid,
        preset,
        enabledFeatures: [...defaults.enabled],
        hiddenFeatures: [...defaults.hidden],
      },
    });

    return NextResponse.json({ prefs });
  }

  const prefs = await prisma.featurePreference.upsert({
    where: { userId: uid },
    update: {
      enabledFeatures: body.enabledFeatures ?? [],
      hiddenFeatures: body.hiddenFeatures ?? [],
      customized: true,
    },
    create: {
      userId: uid,
      preset: "HIGHSCHOOL",
      enabledFeatures: body.enabledFeatures ?? [],
      hiddenFeatures: body.hiddenFeatures ?? [],
      customized: true,
    },
  });

  return NextResponse.json({ prefs });
}
