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

const REQUIRED_FEATURE_KEYS = [
  "concept-web",
  "focus",
  "learning-style-quiz",
  "study-groups",
  "youtube-import",
  "match",
  "referral",
  "handwriting",
] as const;

const UNIVERSAL_FEATURE_KEYS = Array.from(
  new Set([
    ...PRESET_FEATURES.HIGHSCHOOL.enabled,
    ...PRESET_FEATURES.COLLEGE.enabled,
    ...PRESET_FEATURES.UNIVERSITY.enabled,
    ...REQUIRED_FEATURE_KEYS,
  ]),
);

type PresetKey = keyof typeof PRESET_FEATURES;

function normalizePreset(value: string | null | undefined): PresetKey {
  if (value === "COLLEGE" || value === "UNIVERSITY") return value;
  return "HIGHSCHOOL";
}

function buildUniversalDefaults() {
  return {
    enabledFeatures: [...UNIVERSAL_FEATURE_KEYS],
    hiddenFeatures: [] as string[],
  };
}

function reconcileFeatureLists(
  enabledFeatures: unknown,
  hiddenFeatures: unknown,
  options: { forceEnableAll: boolean },
) {
  const enabled = Array.isArray(enabledFeatures) ? enabledFeatures.filter((value): value is string => typeof value === "string") : [];
  const hidden = Array.isArray(hiddenFeatures) ? hiddenFeatures.filter((value): value is string => typeof value === "string") : [];

  const enabledSet = new Set<string>(enabled);
  const hiddenSet = new Set<string>(hidden);

  if (options.forceEnableAll) {
    for (const key of UNIVERSAL_FEATURE_KEYS) {
      enabledSet.add(key);
      hiddenSet.delete(key);
    }
  } else {
    for (const key of UNIVERSAL_FEATURE_KEYS) {
      if (!enabledSet.has(key) && !hiddenSet.has(key)) {
        enabledSet.add(key);
      }
    }
  }

  const nextEnabled = Array.from(enabledSet);
  const nextHidden = Array.from(hiddenSet).filter((key) => !enabledSet.has(key));

  return {
    enabledFeatures: nextEnabled,
    hiddenFeatures: nextHidden,
  };
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
    const defaults = buildUniversalDefaults();

    prefs = await prisma.featurePreference.create({
      data: {
        userId: uid,
        preset,
        enabledFeatures: defaults.enabledFeatures,
        hiddenFeatures: defaults.hiddenFeatures,
      },
    });
  } else {
    const normalized = reconcileFeatureLists(prefs.enabledFeatures, prefs.hiddenFeatures, {
      forceEnableAll: false,
    });

    const currentEnabled = Array.isArray(prefs.enabledFeatures) ? prefs.enabledFeatures : [];
    const currentHidden = Array.isArray(prefs.hiddenFeatures) ? prefs.hiddenFeatures : [];
    const enabledChanged =
      normalized.enabledFeatures.length !== currentEnabled.length ||
      normalized.enabledFeatures.some((key) => !currentEnabled.includes(key));
    const hiddenChanged =
      normalized.hiddenFeatures.length !== currentHidden.length ||
      normalized.hiddenFeatures.some((key) => !currentHidden.includes(key));

    if (enabledChanged || hiddenChanged) {
      prefs = await prisma.featurePreference.update({
        where: { userId: uid },
        data: {
          enabledFeatures: normalized.enabledFeatures,
          hiddenFeatures: normalized.hiddenFeatures,
        },
      });
    }
  }

  return NextResponse.json({
    prefs,
    presetDefaults: PRESET_FEATURES,
    allFeatureKeys: UNIVERSAL_FEATURE_KEYS,
  });
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
    const defaults = buildUniversalDefaults();

    const prefs = await prisma.featurePreference.upsert({
      where: { userId: uid },
      update: {
        preset,
        enabledFeatures: defaults.enabledFeatures,
        hiddenFeatures: defaults.hiddenFeatures,
        customized: false,
      },
      create: {
        userId: uid,
        preset,
        enabledFeatures: defaults.enabledFeatures,
        hiddenFeatures: defaults.hiddenFeatures,
      },
    });

    return NextResponse.json({ prefs });
  }

  const prefs = await prisma.featurePreference.upsert({
    where: { userId: uid },
    update: {
      ...reconcileFeatureLists(body.enabledFeatures ?? [], body.hiddenFeatures ?? [], {
        forceEnableAll: false,
      }),
      customized: true,
    },
    create: {
      userId: uid,
      preset: "HIGHSCHOOL",
      ...reconcileFeatureLists(body.enabledFeatures ?? [], body.hiddenFeatures ?? [], {
        forceEnableAll: false,
      }),
      customized: true,
    },
  });

  return NextResponse.json({ prefs });
}
