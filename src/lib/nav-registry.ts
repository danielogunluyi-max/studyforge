import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BookOpen,
  Brain,
  Calculator,
  CalendarDays,
  Camera,
  Clapperboard,
  Columns2,
  ClipboardList,
  Crown,
  FileText,
  Flame,
  FolderOpen,
  Gamepad2,
  Gauge,
  Ghost,
  Gift,
  GraduationCap,
  Handshake,
  Headphones,
  Heart,
  Hourglass,
  Image as ImageIcon,
  Inbox,
  LayoutGrid,
  Leaf,
  Library,
  LineChart,
  Map,
  Network,
  Orbit,
  Package,
  Presentation,
  Quote,
  Radar,
  Repeat2,
  Scroll,
  Search,
  Settings,
  Shuffle,
  Sparkles,
  SpellCheck,
  Stethoscope,
  StickyNote,
  Swords,
  Target,
  Trophy,
  User,
  Users,
  Volume2,
  Wand2,
  Zap,
} from "lucide-react";

export type NavSectionId =
  | "home"
  | "ingest"
  | "study"
  | "test"
  | "track"
  | "social"
  | "account";

export type NavSurfaces = {
  sidebar: boolean; // SidebarGlass pinned
  mobile: boolean; // NavBottom tabs + More sheet
  palette: boolean; // ⌘K
  landing: boolean; // landing ALL_FEATURES
  matrix: boolean; // settings feature matrix
};

export type NavEntry = {
  href: string; // ONE url per capability
  label: string; // ONE name everywhere
  icon: LucideIcon;
  section: NavSectionId;
  keywords: string[]; // palette search
  description?: string; // landing/matrix blurb
  featureKey?: string; // settings/landing toggle key
  surfaces: NavSurfaces;
};

export const SECTION_ORDER: NavSectionId[] = [
  "home",
  "ingest",
  "study",
  "test",
  "track",
  "social",
  "account",
];
export const SECTION_LABELS: Record<NavSectionId, string> = {
  home: "Home",
  ingest: "Get material in",
  study: "Study",
  test: "Test",
  track: "Track",
  social: "Together",
  account: "You",
};

const off = {
  sidebar: false,
  mobile: false,
  palette: false,
  landing: false,
  matrix: false,
} as const;

function surf(partial: Partial<NavSurfaces>): NavSurfaces {
  return { ...off, ...partial };
}

export const NAV_ENTRIES: NavEntry[] = [
  // ── home ──────────────────────────────────────────────────
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutGrid,
    section: "home",
    keywords: ["home", "dash", "main"],
    featureKey: "dashboard",
    surfaces: surf({ sidebar: true, mobile: true, palette: true, landing: true }),
  },
  {
    href: "/content-hub",
    label: "Content Hub",
    icon: Package,
    section: "home",
    keywords: ["all", "content", "hub"],
    description: "Cross-link notes, decks, and uploads.",
    featureKey: "content-hub",
    surfaces: surf({ mobile: true, palette: true, landing: true, matrix: true }),
  },
  {
    href: "/study-mode",
    label: "Study Mode",
    icon: Target,
    section: "home",
    keywords: ["focus", "session", "study"],
    featureKey: "study-mode",
    surfaces: surf({ mobile: true, palette: true, landing: true }),
  },
  {
    href: "/search",
    label: "Smart Search",
    icon: Search,
    section: "home",
    keywords: ["find", "search"],
    featureKey: "search",
    surfaces: surf({ palette: true, landing: true }),
  },

  // ── ingest ────────────────────────────────────────────────
  {
    href: "/generator",
    label: "Note Generator",
    icon: Wand2,
    section: "ingest",
    keywords: ["ai", "generate", "create", "notes"],
    description: "One-click structured notes from any source.",
    featureKey: "generator",
    surfaces: surf({ mobile: true, palette: true, matrix: true }),
  },
  {
    href: "/smart-upload",
    label: "Inbox",
    icon: Inbox,
    section: "ingest",
    keywords: [
      "upload",
      "file",
      "pdf",
      "everything",
      "scan",
      "photo",
      "homework",
      "record",
      "lecture",
      "import",
      "youtube",
      "quizlet",
      "quick capture",
      "screenshot notes",
    ],
    description: "Photo, PDF, recording, or YouTube → notes.",
    featureKey: "smart-upload",
    // Inbox is the product's front door; it leads Get material in.
    surfaces: surf({ sidebar: true, mobile: true, palette: true, landing: true, matrix: true }),
  },
  {
    href: "/capture-studio",
    label: "Capture Studio",
    icon: Camera,
    section: "ingest",
    keywords: ["capture", "studio", "screenshot"],
    surfaces: surf({ mobile: true, palette: true }),
  },

  // ── study ─────────────────────────────────────────────────
  {
    href: "/my-notes",
    label: "My Notes",
    icon: StickyNote,
    section: "study",
    keywords: ["notes", "library", "folders"],
    featureKey: "my-notes",
    surfaces: surf({ sidebar: true, mobile: true, palette: true, landing: true }),
  },
  {
    href: "/flashcards",
    label: "Flashcards",
    icon: FolderOpen,
    section: "study",
    keywords: ["cards", "flash", "review", "spaced"],
    description: "Spaced repetition decks with Nova review.",
    featureKey: "flashcards",
    surfaces: surf({ sidebar: true, mobile: true, palette: true, landing: true, matrix: true }),
  },
  {
    href: "/feynman",
    label: "Feynman Technique",
    icon: Brain,
    section: "study",
    keywords: ["feynman", "explain", "teach", "understand"],
    description: "Force yourself to teach the concept back.",
    featureKey: "feynman",
    surfaces: surf({ mobile: true, palette: true, landing: true, matrix: true }),
  },
  {
    href: "/micro-lessons",
    label: "Micro-Lessons",
    icon: BookOpen,
    section: "study",
    keywords: ["micro", "lesson", "bite", "quick"],
    description: "Auto-split notes into 90-second bites.",
    featureKey: "micro-lessons",
    surfaces: surf({ mobile: true, palette: true, landing: true, matrix: true }),
  },
  {
    href: "/adaptive-notes",
    label: "Adaptive Notes",
    icon: Target,
    section: "study",
    keywords: ["adaptive", "difficulty", "levels"],
    description: "Notes restructure based on your gaps.",
    featureKey: "adaptive-notes",
    surfaces: surf({ mobile: true, palette: true, landing: true, matrix: true }),
  },
  {
    href: "/cornell",
    label: "Cornell Notes",
    icon: ClipboardList,
    section: "study",
    keywords: ["cornell", "format", "notes"],
    description: "Cue · Notes · Summary split layout.",
    featureKey: "cornell",
    surfaces: surf({ mobile: true, palette: true, matrix: true }),
  },
  {
    href: "/narrative",
    label: "Narrative Memory",
    icon: Scroll,
    section: "study",
    keywords: ["narrative", "story", "memory"],
    description: "Convert notes into story-form recall.",
    featureKey: "narrative",
    surfaces: surf({ palette: true, landing: true, matrix: true }),
  },
  {
    href: "/compress",
    label: "Compress Notes",
    icon: FileText,
    section: "study",
    keywords: ["compress", "summarize", "shorten"],
    description: "Distill any note into a single sheet.",
    featureKey: "compress",
    surfaces: surf({ palette: true, landing: true, matrix: true }),
  },
  {
    href: "/reading-speed",
    label: "Reading Trainer",
    icon: Zap,
    section: "study",
    keywords: ["reading", "speed", "wpm", "comprehension"],
    featureKey: "reading-speed",
    surfaces: surf({ mobile: true, palette: true, landing: true }),
  },
  {
    href: "/pdfs",
    label: "PDF Library",
    icon: FileText,
    section: "study",
    keywords: ["pdf", "document", "annotate"],
    featureKey: "pdf-library",
    surfaces: surf({ mobile: true, palette: true, landing: true }),
  },
  {
    href: "/tutor",
    label: "Nova Chat",
    icon: Sparkles,
    section: "study",
    keywords: ["tutor", "nova", "chat", "ai", "ask", "voice", "vision", "camera", "speak"],
    description: "Conversational tutor with memory.",
    featureKey: "tutor",
    surfaces: surf({ sidebar: true, mobile: true, palette: true, landing: true, matrix: true }),
  },
  {
    href: "/debate",
    label: "AI Debate",
    icon: Swords,
    section: "study",
    keywords: ["debate", "argue", "both sides"],
    description: "Argue both sides with Nova as moderator.",
    featureKey: "debate",
    surfaces: surf({ mobile: true, palette: true, landing: true, matrix: true }),
  },
  {
    href: "/counterargument",
    label: "Counterargument",
    icon: Radar,
    section: "study",
    keywords: ["counter", "attack", "argument", "critique"],
    description: "Nova stress-tests your reasoning.",
    featureKey: "counterargument",
    surfaces: surf({ mobile: true, palette: true, landing: true, matrix: true }),
  },
  {
    href: "/concept-web",
    label: "Concept Web",
    icon: Network,
    section: "study",
    keywords: ["concept", "web", "map", "connections"],
    description: "Pull-from-memory mind-map weaver.",
    featureKey: "concept-web",
    surfaces: surf({ palette: true, landing: true, matrix: true }),
  },
  {
    href: "/concept-collision",
    label: "Concept Collision",
    icon: Flame,
    section: "study",
    keywords: ["collision", "connect", "subjects", "cross"],
    featureKey: "concept-collision",
    surfaces: surf({ mobile: true, palette: true, landing: true }),
  },
  {
    href: "/listen",
    label: "Listen to Notes",
    icon: Volume2,
    section: "study",
    keywords: ["listen", "audio", "tts", "text to speech"],
    description: "Pristine TTS playback of any note.",
    featureKey: "listen",
    surfaces: surf({ palette: true, landing: true, matrix: true }),
  },
  {
    href: "/podcast",
    label: "Notes to Podcast",
    icon: Headphones,
    section: "study",
    keywords: ["podcast", "audio", "listen", "notes"],
    featureKey: "podcast",
    surfaces: surf({ palette: true }),
  },
  {
    href: "/diagrams",
    label: "Diagram Generator",
    icon: Orbit,
    section: "study",
    keywords: ["diagram", "visual", "flowchart", "mindmap"],
    description: "Auto-build visual explainers.",
    featureKey: "diagrams",
    surfaces: surf({ mobile: true, palette: true, matrix: true }),
  },
  {
    href: "/presentation",
    label: "Presentations",
    icon: Presentation,
    section: "study",
    keywords: ["presentation", "slides", "pptx", "powerpoint"],
    featureKey: "presentations",
    surfaces: surf({ sidebar: true, mobile: true, palette: true }),
  },
  {
    href: "/presentation/create",
    label: "New Presentation",
    icon: Presentation,
    section: "study",
    keywords: ["presentation", "slides", "create", "new"],
    surfaces: surf({ palette: true }),
  },
  {
    href: "/split",
    label: "Split View",
    icon: Columns2,
    section: "study",
    keywords: ["split", "view", "columns", "dual", "side by side"],
    surfaces: surf({ palette: true }),
  },
  {
    href: "/citations",
    label: "Citations",
    icon: Quote,
    section: "study",
    keywords: ["citation", "apa", "mla", "chicago", "reference"],
    featureKey: "citations",
    surfaces: surf({ mobile: true, palette: true, landing: true }),
  },
  {
    href: "/essay-grade",
    label: "Essay Grader",
    icon: FileText,
    section: "study",
    keywords: ["essay", "grade", "ontario", "rubric"],
    featureKey: "essay-grade",
    surfaces: surf({ mobile: true, palette: true, landing: true }),
  },
  {
    href: "/grammar",
    label: "Grammar Check",
    icon: SpellCheck,
    section: "study",
    keywords: ["grammar", "spelling", "style", "writing"],
    featureKey: "grammar",
    surfaces: surf({ mobile: true, palette: true, landing: true }),
  },
  {
    href: "/curriculum",
    label: "Ontario Curriculum",
    icon: Leaf,
    section: "study",
    keywords: ["ontario", "curriculum", "courses", "gr9", "gr12"],
    featureKey: "curriculum",
    surfaces: surf({ mobile: true, palette: true, landing: true }),
  },
  {
    href: "/knowledge-map",
    label: "Knowledge Map",
    icon: Map,
    section: "study",
    keywords: ["map", "knowledge", "visual", "graph", "connections"],
    description: "Topic graph of everything you know.",
    featureKey: "knowledge-map",
    surfaces: surf({ palette: true, landing: true, matrix: true }),
  },
  {
    href: "/focus",
    label: "Focus Mode",
    icon: Target,
    section: "study",
    keywords: ["focus", "mode", "session"],
    featureKey: "focus",
    surfaces: surf({ landing: true }),
  },
  {
    href: "/learning-style-quiz",
    label: "Learning Style",
    icon: Brain,
    section: "study",
    keywords: ["learning", "style", "quiz"],
    featureKey: "learning-style-quiz",
    surfaces: surf({ landing: true }),
  },

  // ── test ──────────────────────────────────────────────────
  {
    href: "/mock-exam",
    label: "Mock Exam",
    icon: GraduationCap,
    section: "test",
    keywords: ["mock", "exam", "test", "practice"],
    description: "Full-length timed exam simulator.",
    featureKey: "mock-exam",
    surfaces: surf({ sidebar: true, mobile: true, palette: true, matrix: true }),
  },
  {
    href: "/battle",
    label: "Battle Arena",
    icon: Swords,
    section: "test",
    keywords: ["battle", "arena", "1v1", "pvp"],
    description: "Head-to-head review races.",
    featureKey: "battle",
    surfaces: surf({ mobile: true, palette: true, landing: true, matrix: true }),
  },
  {
    href: "/games",
    label: "Boss Battle",
    icon: Gamepad2,
    section: "test",
    keywords: ["boss", "game", "fight", "flashcard"],
    featureKey: "games",
    surfaces: surf({ mobile: true, palette: true, landing: true }),
  },
  {
    href: "/battle-royale",
    label: "Battle Royale",
    icon: Crown,
    section: "test",
    keywords: ["royale", "100", "multiplayer", "battle"],
    description: "Multi-player elimination drills.",
    featureKey: "battle-royale",
    surfaces: surf({ mobile: true, palette: true, landing: true, matrix: true }),
  },
  {
    href: "/crossover",
    label: "Crossover Challenge",
    icon: Shuffle,
    section: "test",
    keywords: ["crossover", "challenge", "daily", "two subjects"],
    description: "Mash topics together to stress recall.",
    featureKey: "crossover",
    surfaces: surf({ mobile: true, palette: true, landing: true, matrix: true }),
  },
  {
    href: "/debate-judge",
    label: "Debate Judge",
    icon: GraduationCap,
    section: "test",
    keywords: ["judge", "debate", "1v1", "argument"],
    featureKey: "debate-judge",
    surfaces: surf({ palette: true, landing: true }),
  },
  {
    href: "/photo-quiz",
    label: "Photo Quiz",
    icon: ImageIcon,
    section: "test",
    keywords: ["photo", "image", "quiz", "picture"],
    description: "Snap a page, get instant questions.",
    featureKey: "photo-quiz",
    surfaces: surf({ palette: true, matrix: true }),
  },
  {
    href: "/exam-predictor",
    label: "Exam Predictor",
    icon: Sparkles,
    section: "test",
    keywords: ["exam", "predictor", "questions"],
    description: "Predict likely exam questions from your notes.",
    featureKey: "exam-predictor",
    surfaces: surf({ palette: true, landing: true, matrix: true }),
  },

  // ── track ─────────────────────────────────────────────────
  {
    href: "/mastery",
    label: "Mastery Chart",
    icon: Trophy,
    section: "track",
    keywords: ["mastery", "chart", "progress", "subjects"],
    description: "Topic-level retention meter.",
    featureKey: "mastery",
    surfaces: surf({ mobile: true, palette: true, landing: true, matrix: true }),
  },
  {
    href: "/autopsy",
    label: "Exam Autopsy",
    icon: Stethoscope,
    section: "track",
    keywords: ["autopsy", "exam", "failed", "diagnose"],
    description: "Deep post-mortem on missed questions.",
    featureKey: "autopsy",
    surfaces: surf({ mobile: true, palette: true, landing: true, matrix: true }),
  },
  {
    href: "/decay-alerts",
    label: "Decay Alerts",
    icon: Hourglass,
    section: "track",
    keywords: ["decay", "forget", "overdue", "review"],
    featureKey: "decay-alerts",
    surfaces: surf({ mobile: true, palette: true, landing: true }),
  },
  {
    href: "/memory-sim",
    label: "Memory Simulation",
    icon: Brain,
    section: "track",
    keywords: ["memory", "simulation", "retention", "future"],
    featureKey: "memory-sim",
    surfaces: surf({ palette: true, landing: true }),
  },
  {
    href: "/note-evolution",
    label: "Note Evolution",
    icon: LineChart,
    section: "track",
    keywords: ["evolution", "note", "growth", "history"],
    featureKey: "note-evolution",
    surfaces: surf({ palette: true, landing: true }),
  },
  {
    href: "/focus-score",
    label: "Focus Score",
    icon: Gauge,
    section: "track",
    keywords: ["focus", "score", "quality", "session"],
    description: "Live attention rating across sessions.",
    featureKey: "focus-score",
    surfaces: surf({ mobile: true, palette: true, landing: true, matrix: true }),
  },
  {
    href: "/planner",
    label: "AI Planner",
    icon: CalendarDays,
    section: "track",
    keywords: ["planner", "weekly", "schedule", "plan"],
    description: "Time-block today with AI suggestions.",
    featureKey: "planner",
    surfaces: surf({ mobile: true, palette: true, landing: true, matrix: true }),
  },
  {
    href: "/calendar",
    label: "Calendar",
    icon: CalendarDays,
    section: "track",
    keywords: ["calendar", "events", "deadlines", "timetable"],
    description: "Exams, classes, and Nova reminders.",
    featureKey: "calendar",
    surfaces: surf({ mobile: true, palette: true, landing: true, matrix: true }),
  },
  {
    href: "/syllabus",
    label: "Syllabus Scanner",
    icon: FileText,
    section: "track",
    keywords: ["syllabus", "semester", "scan", "course"],
    featureKey: "syllabus",
    surfaces: surf({ mobile: true, palette: true, landing: true }),
  },
  {
    href: "/contract",
    label: "Study Contract",
    icon: Scroll,
    section: "track",
    keywords: ["contract", "commitment", "accountability", "habit"],
    featureKey: "contract",
    surfaces: surf({ mobile: true, palette: true, landing: true }),
  },
  {
    href: "/interleave",
    label: "Interleaving",
    icon: Shuffle,
    section: "track",
    keywords: ["interleave", "mix", "subjects", "schedule"],
    featureKey: "interleave",
    surfaces: surf({ palette: true, landing: true }),
  },
  {
    href: "/grade-calc",
    label: "Grade Calculator",
    icon: Calculator,
    section: "track",
    keywords: ["grade", "final", "calculate", "need"],
    description: "What-if forecasts for each course.",
    featureKey: "grade-calc",
    surfaces: surf({ mobile: true, palette: true, landing: true, matrix: true }),
  },
  {
    href: "/study-ghost",
    label: "Study Ghost",
    icon: Ghost,
    section: "track",
    keywords: ["ghost", "past", "growth", "history"],
    featureKey: "study-ghost",
    surfaces: surf({ mobile: true, palette: true, landing: true }),
  },
  {
    href: "/wrapped",
    label: "Kyvex Wrapped",
    icon: Clapperboard,
    section: "track",
    keywords: ["wrapped", "stats", "semester", "review"],
    featureKey: "wrapped",
    surfaces: surf({ mobile: true, palette: true, landing: true }),
  },
  {
    href: "/career-path",
    label: "Career Path",
    icon: Map,
    section: "track",
    keywords: ["career", "path", "ontario", "university"],
    featureKey: "career-path",
    surfaces: surf({ mobile: true, palette: true, landing: true }),
  },

  // ── social ────────────────────────────────────────────────
  {
    href: "/community",
    label: "Community",
    icon: Users,
    section: "social",
    keywords: ["community", "post", "students", "social"],
    featureKey: "community",
    surfaces: surf({ mobile: true, palette: true, landing: true }),
  },
  {
    href: "/rooms",
    label: "Study Rooms",
    icon: Users,
    section: "social",
    keywords: ["rooms", "study", "together", "co-study"],
    featureKey: "rooms",
    surfaces: surf({ mobile: true, palette: true, landing: true }),
  },
  {
    href: "/library",
    label: "Study Library",
    icon: Library,
    section: "social",
    keywords: ["library", "share", "decks", "public"],
    featureKey: "library",
    surfaces: surf({ mobile: true, palette: true, landing: true }),
  },
  {
    href: "/peer-review",
    label: "Peer Review",
    icon: Handshake,
    section: "social",
    keywords: ["peer", "review", "feedback", "essay"],
    featureKey: "peer-review",
    surfaces: surf({ mobile: true, palette: true, landing: true }),
  },
  {
    href: "/match",
    label: "Study Buddy",
    icon: Users,
    section: "social",
    keywords: ["buddy", "match", "partner", "find"],
    featureKey: "match",
    surfaces: surf({ palette: true, landing: true }),
  },
  {
    href: "/study-groups",
    label: "Study Groups",
    icon: Users,
    section: "social",
    keywords: ["groups", "collaborate", "ai"],
    featureKey: "study-groups",
    surfaces: surf({ palette: true, landing: true }),
  },

  // ── account ───────────────────────────────────────────────
  {
    href: "/achievements",
    label: "Achievements",
    icon: Trophy,
    section: "account",
    keywords: ["achievements", "badges", "unlock", "rewards"],
    description: "Badges and milestones surfaced on home.",
    featureKey: "achievements",
    surfaces: surf({ mobile: true, palette: true, landing: true, matrix: true }),
  },
  {
    href: "/wellness",
    label: "Wellness",
    icon: Heart,
    section: "account",
    keywords: ["wellness", "mood", "burnout", "mental health"],
    description: "Mood + energy gates before deep work.",
    featureKey: "wellness",
    surfaces: surf({ mobile: true, palette: true, landing: true, matrix: true }),
  },
  {
    href: "/habits",
    label: "Habits",
    icon: Repeat2,
    section: "account",
    keywords: ["habits", "streak", "daily", "routine"],
    description: "Streaks, rituals, and study cadence.",
    featureKey: "habits",
    surfaces: surf({ mobile: true, palette: true, landing: true, matrix: true }),
  },
  {
    href: "/features",
    label: "Features",
    icon: Settings,
    section: "account",
    keywords: ["features", "toggle", "enable", "disable"],
    surfaces: surf({ palette: true }),
  },
  {
    href: "/settings",
    label: "Settings",
    icon: Settings,
    section: "account",
    keywords: ["settings", "preferences", "theme", "account"],
    surfaces: surf({ sidebar: true, mobile: true, palette: true }),
  },
  {
    href: "/referral",
    label: "Referral",
    icon: Gift,
    section: "account",
    keywords: ["referral", "invite", "friends", "share"],
    featureKey: "referral",
    surfaces: surf({ palette: true, landing: true }),
  },
  {
    href: "/results",
    label: "My Results",
    icon: BarChart3,
    section: "account",
    keywords: ["results", "grades", "history", "scores"],
    featureKey: "results",
    surfaces: surf({ sidebar: true, palette: true, landing: true }),
  },
  {
    href: "/profile",
    label: "Profile",
    icon: User,
    section: "account",
    keywords: ["profile", "account"],
    surfaces: surf({ sidebar: true, palette: true }),
  },
];

/** Keys that appear in the settings/landing feature matrix (toggleable). */
export const MATRIX_FEATURE_KEYS = new Set(
  NAV_ENTRIES.filter((entry) => entry.surfaces.matrix && entry.featureKey).map(
    (entry) => entry.featureKey!,
  ),
);

/** Hide when a matrix-gated featureKey is loaded and not in the enabled set. */
export function isNavEntryEnabled(
  entry: NavEntry,
  enabled: Set<string> | null,
): boolean {
  if (!entry.featureKey) return true;
  if (!MATRIX_FEATURE_KEYS.has(entry.featureKey)) return true;
  if (!enabled) return true;
  return enabled.has(entry.featureKey);
}

export const SECTION_GLOW: Record<NavSectionId, string> = {
  home: "#f0b429",
  ingest: "#f97316",
  study: "#2dd4bf",
  test: "#34d399",
  track: "#10b981",
  social: "#ec4899",
  account: "#60a5fa",
};

export function navEntriesFor(surface: keyof NavSurfaces): NavEntry[] {
  return NAV_ENTRIES.filter((entry) => entry.surfaces[surface]);
}

export function groupNavEntries(entries: NavEntry[]) {
  return SECTION_ORDER.map((id) => ({
    id,
    label: SECTION_LABELS[id],
    items: entries.filter((entry) => entry.section === id),
  })).filter((group) => group.items.length > 0);
}

export function titleFromHref(pathname: string): string {
  const path = (pathname.split("?")[0] ?? "").replace(/\/+$/, "") || "/";
  let best: NavEntry | undefined;
  for (const entry of NAV_ENTRIES) {
    if (path === entry.href || path.startsWith(`${entry.href}/`)) {
      if (!best || entry.href.length > best.href.length) best = entry;
    }
  }
  if (best) return best.label;
  const last = path.split("/").filter(Boolean).at(-1) ?? "Kyvex";
  return last
    .split("-")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}
