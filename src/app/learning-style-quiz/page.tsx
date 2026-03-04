"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppNav } from "~/app/_components/app-nav";
import { Button } from "~/app/_components/button";
import { PageHero } from "~/app/_components/page-hero";

type Style = "visual" | "auditory" | "reading" | "kinesthetic";

type Question = {
  prompt: string;
  options: Array<{ label: string; style: Style }>;
};

type HistoryItem = {
  id: string;
  dominantStyle: Style;
  visualPercent: number;
  auditoryPercent: number;
  readingPercent: number;
  kinestheticPercent: number;
  createdAt: string;
};

type Comparison = {
  totalUsers: number;
  percentages: Record<Style, number>;
};

const QUESTIONS: Question[] = [
  {
    prompt: "When learning a new topic, what helps most?",
    options: [
      { label: "Diagrams and charts", style: "visual" },
      { label: "Listening to explanations", style: "auditory" },
      { label: "Detailed notes and reading", style: "reading" },
      { label: "Hands-on examples", style: "kinesthetic" },
    ],
  },
  {
    prompt: "In class, you remember best when...",
    options: [
      { label: "The board has clear visuals", style: "visual" },
      { label: "The teacher explains verbally", style: "auditory" },
      { label: "You rewrite key points", style: "reading" },
      { label: "You do a quick activity", style: "kinesthetic" },
    ],
  },
  {
    prompt: "For revision, you prefer...",
    options: [
      { label: "Mind maps", style: "visual" },
      { label: "Talking through concepts", style: "auditory" },
      { label: "Summaries and flashcards", style: "reading" },
      { label: "Practice problems", style: "kinesthetic" },
    ],
  },
  {
    prompt: "When stuck, your first move is...",
    options: [
      { label: "Sketch it out", style: "visual" },
      { label: "Ask someone to explain", style: "auditory" },
      { label: "Read reference material", style: "reading" },
      { label: "Try it experimentally", style: "kinesthetic" },
    ],
  },
  {
    prompt: "Your ideal study guide has...",
    options: [
      { label: "Visual flow and color coding", style: "visual" },
      { label: "Narrative walkthroughs", style: "auditory" },
      { label: "Structured text and bullet points", style: "reading" },
      { label: "Action steps and drills", style: "kinesthetic" },
    ],
  },
  {
    prompt: "For memorization, what works best?",
    options: [
      { label: "Image association", style: "visual" },
      { label: "Repeating out loud", style: "auditory" },
      { label: "Writing repeatedly", style: "reading" },
      { label: "Physical cues/movement", style: "kinesthetic" },
    ],
  },
  {
    prompt: "In group study, you naturally...",
    options: [
      { label: "Draw diagrams for others", style: "visual" },
      { label: "Lead explanations", style: "auditory" },
      { label: "Document key notes", style: "reading" },
      { label: "Set up exercises", style: "kinesthetic" },
    ],
  },
  {
    prompt: "You understand fastest when content is...",
    options: [
      { label: "Spatially organized", style: "visual" },
      { label: "Story-like and spoken", style: "auditory" },
      { label: "Text-first and explicit", style: "reading" },
      { label: "Grounded in real actions", style: "kinesthetic" },
    ],
  },
  {
    prompt: "When reviewing mistakes, you...",
    options: [
      { label: "Map where logic broke", style: "visual" },
      { label: "Explain the correction aloud", style: "auditory" },
      { label: "Write corrected method", style: "reading" },
      { label: "Redo problem physically", style: "kinesthetic" },
    ],
  },
  {
    prompt: "Best exam prep mode?",
    options: [
      { label: "Visual summaries", style: "visual" },
      { label: "Oral recitation", style: "auditory" },
      { label: "Past papers + notes", style: "reading" },
      { label: "Timed drills", style: "kinesthetic" },
    ],
  },
];

const STYLE_LABEL: Record<Style, string> = {
  visual: "Visual",
  auditory: "Auditory",
  reading: "Reading/Writing",
  kinesthetic: "Kinesthetic",
};

const STYLE_THEME: Record<
  Style,
  {
    title: string;
    emoji: string;
    description: string;
    accent: string;
    bg: string;
    chip: string;
    confetti: string[];
    techniques: string[];
    bestFeatures: Array<{ label: string; href: string }>;
    avoid: string;
    toolkit: Array<{ icon: string; label: string }>;
    external: string[];
  }
> = {
  visual: {
    title: "You are a Visual Learner",
    emoji: "🎨",
    description: "You absorb information fastest when ideas are mapped, color-coded, and seen at a glance.",
    accent: "bg-purple-500",
    bg: "from-purple-50 via-white to-violet-100",
    chip: "border-purple-200 bg-purple-50 text-purple-700",
    confetti: ["bg-purple-400", "bg-fuchsia-400", "bg-violet-300"],
    techniques: ["Convert chapters into mind maps", "Use color-coded summaries", "Sketch diagrams before memorizing"],
    bestFeatures: [
      { label: "Concept Web Builder", href: "/concept-web" },
      { label: "AI Generator", href: "/generator" },
      { label: "Upload + Transform", href: "/upload" },
    ],
    avoid: "Avoid text-only cram sessions without visuals.",
    toolkit: [
      { icon: "🧠", label: "Mind map every topic before revision" },
      { icon: "🎯", label: "Use one-page visual cheat sheets" },
      { icon: "🗂️", label: "Group related ideas into concept clusters" },
    ],
    external: ["Try Khan Academy videos", "Use Canva for revision posters", "Use YouTube explainers with diagrams"],
  },
  auditory: {
    title: "You are an Auditory Learner",
    emoji: "🎧",
    description: "You retain concepts best when you hear, explain, and discuss them out loud.",
    accent: "bg-blue-500",
    bg: "from-blue-50 via-white to-cyan-100",
    chip: "border-blue-200 bg-blue-50 text-blue-700",
    confetti: ["bg-blue-400", "bg-cyan-400", "bg-sky-300"],
    techniques: ["Teach concepts out loud", "Record short voice summaries", "Join active discussion sessions"],
    bestFeatures: [
      { label: "Study Groups", href: "/study-groups" },
      { label: "Battle Arena", href: "/battle" },
      { label: "Exam Predictor", href: "/exam-predictor" },
    ],
    avoid: "Avoid silent passive review for long periods.",
    toolkit: [
      { icon: "🎤", label: "Read notes aloud in mini sessions" },
      { icon: "🔁", label: "Use verbal repetition loops" },
      { icon: "👥", label: "Discuss one concept daily with peers" },
    ],
    external: ["Use podcast-style lessons", "Use text-to-speech readers", "Try language exchange speaking drills"],
  },
  reading: {
    title: "You are a Reading/Writing Learner",
    emoji: "📚",
    description: "You thrive when ideas are structured in text and rewritten into your own words.",
    accent: "bg-green-500",
    bg: "from-green-50 via-white to-emerald-100",
    chip: "border-green-200 bg-green-50 text-green-700",
    confetti: ["bg-green-400", "bg-emerald-400", "bg-lime-300"],
    techniques: ["Rewrite class notes into summaries", "Build Q&A flash note banks", "Use active recall writing drills"],
    bestFeatures: [
      { label: "My Notes", href: "/my-notes" },
      { label: "Citations", href: "/citations" },
      { label: "Generator", href: "/generator" },
    ],
    avoid: "Avoid skimming large blocks without rewriting key points.",
    toolkit: [
      { icon: "✍️", label: "Summarize each chapter in 5 bullets" },
      { icon: "📄", label: "Turn notes into essay-style answers" },
      { icon: "🧩", label: "Write question banks and self-test" },
    ],
    external: ["Use SparkNotes for summaries", "Use Purdue OWL writing guides", "Use Quizlet text flashcards"],
  },
  kinesthetic: {
    title: "You are a Kinesthetic Learner",
    emoji: "🏃",
    description: "You learn fastest by doing, testing, and turning theory into action.",
    accent: "bg-orange-500",
    bg: "from-orange-50 via-white to-amber-100",
    chip: "border-orange-200 bg-orange-50 text-orange-700",
    confetti: ["bg-orange-400", "bg-amber-400", "bg-yellow-300"],
    techniques: ["Practice with timed drills", "Build mini-projects from theory", "Use movement-based review cycles"],
    bestFeatures: [
      { label: "Practice Quiz Arena", href: "/battle" },
      { label: "Exam Predictor", href: "/exam-predictor" },
      { label: "Study Groups", href: "/study-groups" },
    ],
    avoid: "Avoid passive reading — you need active engagement.",
    toolkit: [
      { icon: "⚡", label: "Solve problems under time pressure" },
      { icon: "🧪", label: "Create hands-on demos per topic" },
      { icon: "📌", label: "Use movement breaks between recall rounds" },
    ],
    external: ["Use interactive labs and simulators", "Try Brilliant guided problem solving", "Use practical coding sandboxes"],
  },
};

const SUBJECT_TIPS: Record<Style, Record<string, string[]>> = {
  visual: {
    Math: ["Map formulas into visual trees", "Color-code equation types", "Use graph sketches before solving"],
    Science: ["Convert processes into flowcharts", "Label diagrams repeatedly", "Use animation-style explainers"],
    English: ["Storyboard themes and arguments", "Highlight rhetorical patterns by color", "Use quote mind maps"],
    History: ["Build timeline infographics", "Map cause-effect relationships", "Use visual era comparison tables"],
    Languages: ["Use image vocabulary cards", "Map grammar visually", "Watch subtitled concept clips"],
  },
  auditory: {
    Math: ["Explain each step aloud", "Use verbal formula chants", "Discuss mistakes with peers"],
    Science: ["Record short concept explainers", "Debate hypotheses verbally", "Use spoken recall drills"],
    English: ["Read passages out loud", "Discuss tone and themes", "Oral recitation of key quotes"],
    History: ["Narrate events as stories", "Use discussion-based revision", "Teach timelines verbally"],
    Languages: ["Prioritize listening practice", "Shadow native audio", "Practice speaking over writing"],
  },
  reading: {
    Math: ["Write step-by-step method sheets", "Maintain formula notebooks", "Create written error logs"],
    Science: ["Summarize each chapter in text", "Write definitions in your own words", "Use structured lab notes"],
    English: ["Annotate deeply", "Write thesis and argument outlines", "Create quote analysis sheets"],
    History: ["Write concise era summaries", "Build comparison essays", "Use keyword-focused note cards"],
    Languages: ["Keep grammar journals", "Write daily vocabulary logs", "Translate short paragraphs"],
  },
  kinesthetic: {
    Math: ["Solve timed mixed sets", "Use whiteboard standing drills", "Rebuild solutions from memory"],
    Science: ["Run practical experiments", "Use simulation tools", "Recreate processes physically"],
    English: ["Act out scenes", "Build argument cards and sort them", "Use speaking-plus-writing cycles"],
    History: ["Role-play debates", "Use map-based movement activities", "Create event sequence games"],
    Languages: ["Use gesture-based vocab", "Practice with real-life dialogues", "Do interactive speaking tasks"],
  },
};

function chartSegmentPath(startAngle: number, endAngle: number, radius = 52, center = 60): string {
  const start = polarToCartesian(center, center, radius, endAngle);
  const end = polarToCartesian(center, center, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return [`M`, center, center, `L`, start.x, start.y, `A`, radius, radius, 0, largeArcFlag, 0, end.x, end.y, `Z`].join(" ");
}

function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

export default function LearningStyleQuizPage() {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<number, Style>>({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [result, setResult] = useState<Style | null>(null);
  const [barAnimate, setBarAnimate] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPersistingResult, setIsPersistingResult] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [dominantChanged, setDominantChanged] = useState(false);
  const [comparison, setComparison] = useState<Comparison>({
    totalUsers: 0,
    percentages: { visual: 0, auditory: 0, reading: 0, kinesthetic: 0 },
  });
  const [userId, setUserId] = useState<string>("");
  const [showShareCard, setShowShareCard] = useState(false);
  const [copied, setCopied] = useState(false);

  const scores = useMemo(() => {
    const initial: Record<Style, number> = {
      visual: 0,
      auditory: 0,
      reading: 0,
      kinesthetic: 0,
    };

    Object.values(answers).forEach((style) => {
      initial[style] += 1;
    });

    return initial;
  }, [answers]);

  const percentages = useMemo(() => {
    const total = Math.max(1, Object.keys(answers).length);
    return {
      visual: Math.round((scores.visual / total) * 100),
      auditory: Math.round((scores.auditory / total) * 100),
      reading: Math.round((scores.reading / total) * 100),
      kinesthetic: Math.round((scores.kinesthetic / total) * 100),
    } as Record<Style, number>;
  }, [answers, scores]);

  const progressPercent = Math.round(((currentQuestion + 1) / QUESTIONS.length) * 100);
  const selected = answers[currentQuestion];
  const question = QUESTIONS[currentQuestion];

  const resultTheme = result ? STYLE_THEME[result] : null;

  const loadInsights = async () => {
    const response = await fetch("/api/learning-style/result");
    if (!response.ok) return;

    const data = (await response.json()) as {
      user?: { id: string };
      history?: HistoryItem[];
      dominantChanged?: boolean;
      comparison?: Comparison;
    };

    setUserId(data.user?.id ?? "");
    setHistory(data.history ?? []);
    setDominantChanged(Boolean(data.dominantChanged));
    setComparison(
      data.comparison ?? {
        totalUsers: 0,
        percentages: { visual: 0, auditory: 0, reading: 0, kinesthetic: 0 },
      },
    );
  };

  useEffect(() => {
    void loadInsights();
  }, []);

  useEffect(() => {
    if (!result) return;
    setBarAnimate(false);
    const timer = setTimeout(() => setBarAnimate(true), 80);
    return () => clearTimeout(timer);
  }, [result]);

  const navigateQuestion = (direction: "next" | "prev") => {
    const nextIndex = direction === "next" ? currentQuestion + 1 : currentQuestion - 1;
    if (nextIndex < 0 || nextIndex >= QUESTIONS.length) return;

    setTransitioning(true);
    setTimeout(() => {
      setCurrentQuestion(nextIndex);
      setTransitioning(false);
    }, 170);
  };

  const revealResult = async () => {
    const entries = Object.entries(scores) as Array<[Style, number]>;
    entries.sort((a, b) => b[1] - a[1]);
    const winner = entries[0]?.[0] ?? "reading";
    setResult(winner);
    setIsPersistingResult(true);

    await fetch("/api/learning-style/result", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dominantStyle: winner, scores: percentages, autoAdapt: true }),
    });

    await loadInsights();
    setIsPersistingResult(false);
  };

  const saveResult = async () => {
    if (!result) return;
    setIsSaving(true);

    await fetch("/api/user/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ learningStyle: result, autoAdapt: true }),
    });

    setIsSaving(false);
    router.push("/settings");
  };

  const shareUrl = typeof window !== "undefined" && userId
    ? `${window.location.origin}/learning-style/shared/${userId}`
    : userId
      ? `/learning-style/shared/${userId}`
      : "";

  const copyShare = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const comparisonSlices = useMemo(() => {
    const styles: Style[] = ["visual", "auditory", "reading", "kinesthetic"];
    let current = 0;
    return styles.map((style) => {
      const value = comparison.percentages[style];
      const start = (current / 100) * 360;
      current += value;
      const end = (current / 100) * 360;
      return { style, value, start, end };
    });
  }, [comparison]);

  const mainBgClass = resultTheme ? `bg-gradient-to-br ${resultTheme.bg}` : "bg-gray-50";

  return (
    <main className={`min-h-screen ${mainBgClass} transition-colors duration-500`}>
      <AppNav />
      <div className="container mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        {!result && (
          <>
            <PageHero
              title="Learning Style Shapeshifter"
              description="Discover how your brain learns best with a personalized quiz experience."
              actions={<Button href="/generator" variant="secondary" size="sm">Open Generator</Button>}
            />

            <div className="mb-5 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between text-sm text-gray-700">
                <p className="font-semibold">Question {currentQuestion + 1} of {QUESTIONS.length}</p>
                <p>{progressPercent}% complete</p>
              </div>
              <div className="h-2 rounded-full bg-gray-200">
                <div className="h-2 rounded-full bg-blue-500 transition-all duration-300" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>

            <div className={`rounded-2xl border border-gray-200 bg-white p-6 shadow-md transition-all duration-200 ${transitioning ? "translate-x-2 opacity-0" : "translate-x-0 opacity-100"}`}>
              <p className="mb-4 text-xl font-semibold text-gray-900">{question?.prompt}</p>

              <div className="grid gap-3 sm:grid-cols-2">
                {(question?.options ?? []).map((option) => {
                  const active = selected === option.style;
                  return (
                    <button
                      key={`${question?.prompt ?? "q"}-${option.label}`}
                      type="button"
                      onClick={() => setAnswers((prev) => ({ ...prev, [currentQuestion]: option.style }))}
                      className={`flex items-center justify-between rounded-xl border-2 px-4 py-3 text-left text-sm font-medium transition ${
                        active
                          ? "border-blue-500 bg-blue-50 text-blue-800"
                          : "border-gray-200 bg-white text-gray-700 hover:border-blue-200 hover:bg-gray-50"
                      }`}
                    >
                      <span>{option.label}</span>
                      {active && <span className="text-blue-600">✓</span>}
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Button variant="secondary" onClick={() => navigateQuestion("prev")} disabled={currentQuestion === 0}>Previous</Button>

                {currentQuestion < QUESTIONS.length - 1 ? (
                  <Button onClick={() => navigateQuestion("next")} disabled={!selected}>Next</Button>
                ) : (
                  <Button onClick={() => void revealResult()} disabled={!selected || isPersistingResult} loading={isPersistingResult}>
                    Reveal My Style
                  </Button>
                )}

                {!selected && <p className="text-xs text-red-500">Select an answer to continue.</p>}
              </div>
            </div>
          </>
        )}

        {result && resultTheme && (
          <div className="space-y-6">
            <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-md">
              <div className="pointer-events-none absolute inset-0">
                {resultTheme.confetti.map((dot, idx) => (
                  <span
                    key={`${dot}-${idx}`}
                    className={`absolute h-2 w-2 animate-bounce rounded-full opacity-70 ${dot}`}
                    style={{
                      top: `${12 + idx * 8}%`,
                      left: `${8 + idx * 10}%`,
                      animationDelay: `${idx * 100}ms`,
                    }}
                  />
                ))}
              </div>

              <p className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${resultTheme.chip}`}>Learning Profile Unlocked</p>
              <h2 className="mt-3 text-3xl font-bold text-gray-900">{resultTheme.title} {resultTheme.emoji}</h2>
              <p className="mt-2 text-gray-700">{resultTheme.description}</p>

              <div className="mt-6 space-y-3">
                {(["visual", "auditory", "reading", "kinesthetic"] as Style[]).map((style) => (
                  <div key={style}>
                    <div className="mb-1 flex items-center justify-between text-sm text-gray-700">
                      <span>{STYLE_LABEL[style]}</span>
                      <span>{percentages[style]}%</span>
                    </div>
                    <div className="h-3 rounded-full bg-gray-200">
                      <div
                        className={`h-3 rounded-full transition-all duration-700 ${STYLE_THEME[style].accent}`}
                        style={{ width: `${barAnimate ? percentages[style] : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-xl font-bold text-gray-900">Your Study Strategy</h3>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-gray-700">
                {resultTheme.techniques.slice(0, 3).map((tip) => <li key={tip}>{tip}</li>)}
              </ul>
              <p className="mt-3 text-sm text-red-600">{resultTheme.avoid}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {resultTheme.bestFeatures.map((feature) => (
                  <Button key={feature.href} href={feature.href} size="sm" variant="secondary">{feature.label}</Button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-xl font-bold text-gray-900">Subject-specific Tips</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Object.entries(SUBJECT_TIPS[result]).map(([subject, tips]) => (
                  <div key={subject} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <p className="text-sm font-semibold text-gray-900">{subject}</p>
                    <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-gray-700">
                      {tips.map((tip) => <li key={tip}>{tip}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-xl font-bold text-gray-900">Your Study Toolkit</h3>
              <div className="mt-4 grid gap-4 lg:grid-cols-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Techniques</p>
                  <div className="mt-2 space-y-2 text-sm text-gray-700">
                    {resultTheme.toolkit.map((item) => <p key={item.label}>{item.icon} {item.label}</p>)}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">StudyForge Features</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {resultTheme.bestFeatures.map((feature) => (
                      <Button key={`${feature.href}-tool`} href={feature.href} size="sm" variant="secondary">{feature.label}</Button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">External Resources</p>
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-gray-700">
                    {resultTheme.external.map((resource) => <li key={resource}>{resource}</li>)}
                  </ul>
                </div>
              </div>
            </div>

            {history.length > 1 && (
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="text-xl font-bold text-gray-900">Your Style History</h3>
                <p className="mt-1 text-sm text-gray-600">
                  {dominantChanged ? "Your dominant style changed since your previous attempt." : "Your dominant style has stayed consistent so far."}
                </p>
                <div className="mt-3 space-y-2">
                  {history.slice(0, 5).map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm">
                      <span>{new Date(item.createdAt).toLocaleString()}</span>
                      <span className="font-semibold">{STYLE_LABEL[item.dominantStyle]}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-xl font-bold text-gray-900">Shareable Style Card</h3>
                <Button size="sm" onClick={() => setShowShareCard((prev) => !prev)}>Share My Style</Button>
                {showShareCard && <Button size="sm" variant="secondary" onClick={() => void copyShare()} disabled={!shareUrl}>{copied ? "Copied" : "Copy Link"}</Button>}
              </div>
              {showShareCard && (
                <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Learning Style Card</p>
                  <p className="mt-1 text-lg font-bold text-gray-900">{resultTheme.title} {resultTheme.emoji}</p>
                  <p className="text-sm text-gray-700">Top trait: {STYLE_LABEL[result]}</p>
                  <p className="mt-2 text-xs text-gray-600">Visual {percentages.visual}% • Auditory {percentages.auditory}% • Reading {percentages.reading}% • Kinesthetic {percentages.kinesthetic}%</p>
                  {shareUrl && <p className="mt-2 break-all text-xs text-blue-700">{shareUrl}</p>}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-xl font-bold text-gray-900">How You Compare</h3>
              <p className="mt-1 text-sm text-gray-600">{comparison.percentages[result]}% of StudyForge users are {STYLE_LABEL[result]} learners.</p>
              <div className="mt-4 grid gap-4 lg:grid-cols-[180px_1fr]">
                <div className="relative mx-auto h-36 w-36">
                  <svg viewBox="0 0 120 120" className="h-36 w-36 -rotate-90">
                    {comparisonSlices.map((segment) => (
                      <path
                        key={segment.style}
                        d={chartSegmentPath(segment.start, segment.end)}
                        className={
                          segment.style === "visual"
                            ? "fill-purple-500"
                            : segment.style === "auditory"
                              ? "fill-blue-500"
                              : segment.style === "reading"
                                ? "fill-green-500"
                                : "fill-orange-500"
                        }
                      />
                    ))}
                    <circle cx="60" cy="60" r="28" className="fill-white" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-gray-700">
                    {comparison.totalUsers} users
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  {(["visual", "auditory", "reading", "kinesthetic"] as Style[]).map((style) => (
                    <p key={style} className="text-gray-700">{STYLE_LABEL[style]}: <span className="font-semibold">{comparison.percentages[style]}%</span></p>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button onClick={() => void saveResult()} loading={isSaving} disabled={isSaving}>Save to Profile & Open Settings</Button>
              <Button variant="secondary" onClick={() => window.location.reload()}>Retake Quiz</Button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
