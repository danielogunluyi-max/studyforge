import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

/**
 * Single source of truth for feature keys.
 * Keep this list in sync with FEATURE_CATALOG in
 * src/app/(dashboard)/settings/features/page.tsx.
 */
const ALL_FEATURE_KEYS = [
  "smart-upload",
  "my-notes",
  "library",
  "flashcards",
  "mock-exam",
  "tutor",
  "planner",
  "curriculum",
  "podcast",
  "presentation",
  "study-groups",
  "battle",
  "match",
  "essay-grader",
  "peer-review",
  "citations",
  "handwriting",
  "diagrams",
  "mindmap",
  "concept-web",
  "photo-quiz",
  "syllabus",
  "exam-predictor",
  "mastery",
  "wellness",
  "focus",
  "calendar",
  "achievements",
  "career-path",
  "learning-style",
  "study-wrapped",
  "contracts",
  "arcade",
  "listen",
  "results",
  "search",
] as const;

/** THE LOOP — Upload → Notes → Cards → Mock → Tutor. Default sidebar. */
const LOOP_FEATURE_KEYS = [
  "smart-upload",
  "my-notes",
  "flashcards",
  "mock-exam",
  "tutor",
] as const;

const ACADEMIC_PRESETS = ["HIGHSCHOOL", "COLLEGE", "UNIVERSITY"] as const;
const FEATURE_PRESETS = [...ACADEMIC_PRESETS, "FOCUSED", "CUSTOM"] as const;

function normalizePreset(raw: string | null | undefined): string {
  const p = (raw ?? "FOCUSED").toUpperCase();
  return (FEATURE_PRESETS as readonly string[]).includes(p) ? p : "FOCUSED";
}

/**
 * Focused / THE LOOP — five core tools + account chrome only.
 * Everything else stays in the Features matrix as an honest opt-in toggle.
 */
function buildFocusedDefaults() {
  const loop = new Set<string>(LOOP_FEATURE_KEYS);
  return {
    enabledFeatures: [...LOOP_FEATURE_KEYS],
    hiddenFeatures: ALL_FEATURE_KEYS.filter((k) => !loop.has(k)),
  };
}

function defaultsForPreset(_preset: string) {
  // Beta: every named reset starts as THE LOOP; the matrix is how students opt in.
  return buildFocusedDefaults();
}

function reconcileFeatureLists(
  enabledRaw: unknown,
  hiddenRaw: unknown,
  opts?: { forceEnableAll?: boolean },
) {
  const enabled = Array.isArray(enabledRaw)
    ? enabledRaw.filter((k): k is string => typeof k === "string")
    : [];
  const hidden = Array.isArray(hiddenRaw)
    ? hiddenRaw.filter((k): k is string => typeof k === "string")
    : [];

  const enabledSet = new Set(enabled);
  const hiddenSet = new Set(hidden);

  if (opts?.forceEnableAll) {
    for (const key of ALL_FEATURE_KEYS) {
      enabledSet.add(key);
      hiddenSet.delete(key);
    }
  } else {
    // Opt-in model: keys missing from both lists stay hidden until the matrix enables them.
    for (const key of ALL_FEATURE_KEYS) {
      if (!enabledSet.has(key) && !hiddenSet.has(key)) {
        hiddenSet.add(key);
      }
    }
  }

  for (const key of [...hiddenSet]) {
    if (enabledSet.has(key)) hiddenSet.delete(key);
  }

  return {
    enabledFeatures: [...enabledSet],
    hiddenFeatures: [...hiddenSet],
  };
}

export async function GET() {
  const session = await auth();
  const uid = session?.user?.id;
  if (!uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let prefs = await db.featurePreference.findUnique({ where: { userId: uid } });

  if (!prefs) {
    const focused = buildFocusedDefaults();
    prefs = await db.featurePreference.create({
      data: {
        userId: uid,
        preset: "FOCUSED",
        enabledFeatures: focused.enabledFeatures,
        hiddenFeatures: focused.hiddenFeatures,
      },
    });
  } else if (!prefs.customized) {
    // Non-customized → THE LOOP (Focused). Matrix opt-in sets customized=true.
    const defaults = buildFocusedDefaults();
    const same =
      prefs.preset === "FOCUSED" &&
      JSON.stringify([...(prefs.enabledFeatures as string[])].sort()) ===
        JSON.stringify([...defaults.enabledFeatures].sort()) &&
      JSON.stringify([...(prefs.hiddenFeatures as string[])].sort()) ===
        JSON.stringify([...defaults.hiddenFeatures].sort());
    if (!same) {
      prefs = await db.featurePreference.update({
        where: { userId: uid },
        data: {
          preset: "FOCUSED",
          enabledFeatures: defaults.enabledFeatures,
          hiddenFeatures: defaults.hiddenFeatures,
        },
      });
    }
  }

  return NextResponse.json({ prefs });
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
    const defaults = defaultsForPreset(preset);

    const prefs = await db.featurePreference.upsert({
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

  const prefs = await db.featurePreference.upsert({
    where: { userId: uid },
    update: {
      ...reconcileFeatureLists(body.enabledFeatures ?? [], body.hiddenFeatures ?? [], {
        forceEnableAll: false,
      }),
      customized: true,
      preset: "CUSTOM",
    },
    create: {
      userId: uid,
      preset: "CUSTOM",
      ...reconcileFeatureLists(body.enabledFeatures ?? [], body.hiddenFeatures ?? [], {
        forceEnableAll: false,
      }),
      customized: true,
    },
  });

  return NextResponse.json({ prefs });
}
