"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppNav } from "~/app/_components/app-nav";
import { Button } from "~/app/_components/button";

type Style = "visual" | "auditory" | "reading" | "kinesthetic";

type Question = {
  prompt: string;
  options: Array<{ label: string; style: Style }>;
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
  visual: "Visual 👁️",
  auditory: "Auditory 🎧",
  reading: "Reading/Writing 📚",
  kinesthetic: "Kinesthetic 🧠",
};

export default function LearningStyleQuizPage() {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<number, Style>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<Style | null>(null);

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

  const calculateResult = () => {
    const entries = Object.entries(scores) as Array<[Style, number]>;
    entries.sort((a, b) => b[1] - a[1]);
    const winner = entries[0]?.[0] ?? "reading";
    setResult(winner);
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

  return (
    <main className="min-h-screen bg-gray-50">
      <AppNav />
      <div className="container mx-auto max-w-4xl px-6 py-12">
        <h1 className="mb-2 text-4xl font-bold text-gray-900">Learning Style Quiz 🧬</h1>
        <p className="mb-8 text-lg text-gray-600">Answer 10 questions to personalize all AI output to your brain’s preferred style.</p>

        <div className="space-y-4">
          {QUESTIONS.map((question, index) => (
            <div key={question.prompt} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="mb-3 text-sm font-semibold text-gray-900">{index + 1}. {question.prompt}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {question.options.map((option) => (
                  <Button
                    key={`${question.prompt}-${option.label}`}
                    onClick={() => setAnswers((prev) => ({ ...prev, [index]: option.style }))}
                    variant="secondary"
                    size="sm"
                    className={`justify-start px-3 py-2 text-left text-sm ${
                      answers[index] === option.style
                        ? "border-blue-500 bg-blue-50 text-blue-800"
                        : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            onClick={calculateResult}
            disabled={Object.keys(answers).length < QUESTIONS.length}
            size="md"
          >
            Calculate Learning Style
          </Button>

          {result && (
            <Button
              onClick={() => void saveResult()}
              disabled={isSaving}
              loading={isSaving}
              variant="secondary"
              size="md"
            >
              {isSaving ? "Saving..." : `Save as ${STYLE_LABEL[result]}`}
            </Button>
          )}
        </div>

        {result && (
          <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-5 text-green-800">
            <p className="text-sm font-semibold">Detected style: {STYLE_LABEL[result]}</p>
            <p className="mt-1 text-xs">Visual: {scores.visual} • Auditory: {scores.auditory} • Reading: {scores.reading} • Kinesthetic: {scores.kinesthetic}</p>
          </div>
        )}
      </div>
    </main>
  );
}
