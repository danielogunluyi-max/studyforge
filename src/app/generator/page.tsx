"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { AppNav } from "~/app/_components/app-nav";
import { Button } from "~/app/_components/button";

const PREFILL_STORAGE_KEY = "studyforge:prefillText";
const TAG_SUGGESTIONS = [
  "Math",
  "Biology",
  "History",
  "Chemistry",
  "Physics",
  "Literature",
  "Exam Prep",
  "Homework",
];

function parseTags(input: string): string[] {
  const tags = input
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 20)
    .map((tag) => tag.slice(0, 32));

  return Array.from(new Set(tags));
}

export default function Generator() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [inputText, setInputText] = useState("");
  const [outputFormat, setOutputFormat] = useState("summary");
  const [generatedNotes, setGeneratedNotes] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set());
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [checkedAnswers, setCheckedAnswers] = useState<Set<number>>(new Set());
  const [learningStyle, setLearningStyle] = useState<string | null>(null);
  const [adaptContent, setAdaptContent] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?from=/generator");
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user?.id) {
      fetch("/api/user/preferences")
        .then(res => res.json())
        .then((data: { preferences?: { learningStyle?: string; autoAdapt?: boolean } }) => {
          if (data.preferences?.learningStyle) {
            setLearningStyle(data.preferences.learningStyle);
            setAdaptContent(data.preferences.autoAdapt ?? false);
          }
        })
        .catch(() => {
          // Silent fail - learning style is optional
        });
    }
  }, [session]);

  useEffect(() => {
    const source = new URLSearchParams(window.location.search).get("source");
    if (source !== "upload") {
      return;
    }

    const text = sessionStorage.getItem(PREFILL_STORAGE_KEY) ?? "";
    if (!text.trim()) {
      return;
    }

    setInputText(text);
    setGeneratedNotes("");
    setFlippedCards(new Set());
    setQuizAnswers({});
    setCheckedAnswers(new Set());
    sessionStorage.removeItem(PREFILL_STORAGE_KEY);
  }, []);

  if (status === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </main>
    );
  }

  if (!session) {
    return null;
  }

  const handleGenerate = async () => {
    setIsLoading(true);
    setError("");
    setSaveSuccess(false);
    setFlippedCards(new Set());
    setQuizAnswers({});
    setCheckedAnswers(new Set());
    
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: inputText,
          format: outputFormat,
        }),
      });

      const data = (await response.json()) as { notes?: string; error?: string };

      if (response.ok) {
        let finalNotes = data.notes ?? "";
        
        // Apply learning style adaptation if enabled
        if (adaptContent && learningStyle && finalNotes.trim()) {
          try {
            const adaptRes = await fetch("/api/transform-content", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                content: finalNotes,
                learningStyle: learningStyle,
              }),
            });
            
            if (adaptRes.ok) {
              const adaptData = (await adaptRes.json()) as { transformedContent?: string };
              finalNotes = adaptData.transformedContent ?? finalNotes;
            }
          } catch {
            // Silent fail - use original notes if adaptation fails
          }
        }
        
        setGeneratedNotes(finalNotes);
      } else {
        setError(data.error ?? "Failed to generate notes");
      }
    } catch (err) {
      void err;
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    setError("");

    try {
      const contentToSave = generatedNotes.trim() || inputText.trim();
      if (!contentToSave) {
        setError("Nothing to save yet. Generate notes or upload/paste content first.");
        return;
      }

      const sourceForTitle = inputText.trim() || contentToSave;
      const title = sourceForTitle.slice(0, 50) + (sourceForTitle.length > 50 ? "..." : "");

      const response = await fetch("/api/notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          content: contentToSave,
          format: outputFormat,
          tags: parseTags(tagsInput),
        }),
      });

      const result = (await response.json().catch(() => ({}))) as { error?: string };

      if (response.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setError(result.error ?? "Failed to save note");
      }
    } catch (err) {
      void err;
      setError("Something went wrong while saving.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = () => {
    setInputText("");
    setTagsInput("");
    setGeneratedNotes("");
    setError("");
    setSaveSuccess(false);
    setFlippedCards(new Set());
    setQuizAnswers({});
    setCheckedAnswers(new Set());
  };

  const handleCopy = () => {
    void navigator.clipboard.writeText(generatedNotes);
    alert("✓ Notes copied to clipboard!");
  };

  const toggleCard = (index: number) => {
    const newFlipped = new Set(flippedCards);
    if (newFlipped.has(index)) {
      newFlipped.delete(index);
    } else {
      newFlipped.add(index);
    }
    setFlippedCards(newFlipped);
  };

  const handleQuizAnswer = (index: number, answer: string) => {
    const newAnswers = { ...quizAnswers };
    newAnswers[index] = answer;
    setQuizAnswers(newAnswers);
  };

  const checkAnswer = (index: number) => {
    const newChecked = new Set(checkedAnswers);
    newChecked.add(index);
    setCheckedAnswers(newChecked);
  };

  const parseFlashcards = (text: string) => {
    const cards: Array<{ question: string; answer: string }> = [];
    const lines = text.split('\n');
    let currentQ = '';
    let currentA = '';
    
    for (const line of lines) {
      if (line.trim().startsWith('Q:')) {
        if (currentQ && currentA) {
          cards.push({ question: currentQ, answer: currentA });
        }
        currentQ = line.replace(/^Q:\s*/, '').trim();
        currentA = '';
      } else if (line.trim().startsWith('A:')) {
        currentA = line.replace(/^A:\s*/, '').trim();
      } else if (line.trim() && currentA) {
        currentA += ' ' + line.trim();
      } else if (line.trim() && currentQ && !currentA) {
        currentQ += ' ' + line.trim();
      }
    }
    if (currentQ && currentA) {
      cards.push({ question: currentQ, answer: currentA });
    }
    return cards;
  };

  const parseQuestions = (text: string) => {
    const questions: Array<{ question: string; answer: string }> = [];
    
    const cleanedText = text.replace(/Answer:\s*/gi, '');
    const sections = cleanedText.split(/(?=\d+\.\s)/);
    
    for (const section of sections) {
      const trimmed = section.trim();
      if (!trimmed) continue;
      
      const lines = trimmed.split('\n').filter(l => l.trim());
      if (lines.length === 0) continue;
      
      // FIXED: Added safety check
      const firstLine = lines[0];
      if (!firstLine) continue;
      
      const questionLine = firstLine.replace(/^\d+\.\s*/, '').trim();
      
      if (/^[A-D]\)/i.exec(questionLine) || questionLine.toLowerCase().startsWith('answer')) {
        continue;
      }
      
      const answerLines = lines.slice(1);
      const answer = answerLines.join(' ').trim();
      
      if (questionLine && answer) {
        questions.push({ 
          question: questionLine, 
          answer: answer 
        });
      }
    }
    
    return questions;
  };

  const characterCount = inputText.length;
  const estimatedTime = Math.ceil(characterCount / 200);

  const renderOutput = () => {
    if (!generatedNotes) return null;

    if (outputFormat === "flashcards") {
      const cards = parseFlashcards(generatedNotes);
      return (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between border-b border-gray-200 pb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Your Flashcards ({cards.length} cards)
            </h2>
            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                disabled={isSaving}
                size="sm"
                loading={isSaving}
              >
                {isSaving ? "Saving..." : "💾 Save"}
              </Button>
              <Button
                onClick={handleCopy}
                variant="secondary"
                size="sm"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy
              </Button>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {cards.map((card, index) => (
              <div
                key={index}
                onClick={() => toggleCard(index)}
                className="group relative h-48 cursor-pointer perspective"
              >
                <div className={`relative h-full w-full transition-transform duration-500 transform-style-3d ${flippedCards.has(index) ? 'rotate-y-180' : ''}`}>
                  <div className="absolute inset-0 flex items-center justify-center rounded-lg border-2 border-blue-200 bg-blue-50 p-6 backface-hidden">
                    <p className="text-center text-lg font-medium text-gray-900">
                      {card.question}
                    </p>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center rounded-lg border-2 border-green-200 bg-green-50 p-6 backface-hidden rotate-y-180">
                    <p className="text-center text-gray-700">
                      {card.answer}
                    </p>
                  </div>
                </div>
                <p className="mt-2 text-center text-xs text-gray-500">
                  Click to flip • Card {index + 1}
                </p>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (outputFormat === "questions") {
      const questions = parseQuestions(generatedNotes);
      return (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between border-b border-gray-200 pb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Practice Quiz ({questions.length} questions)
            </h2>
            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                disabled={isSaving}
                size="sm"
                loading={isSaving}
              >
                {isSaving ? "Saving..." : "💾 Save"}
              </Button>
              <Button
                onClick={handleCopy}
                variant="secondary"
                size="sm"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy
              </Button>
            </div>
          </div>
          <div className="space-y-6">
            {questions.map((q, index) => (
              <div key={index} className="rounded-lg border border-gray-200 bg-gray-50 p-6">
                <div className="mb-4 flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                    {index + 1}
                  </span>
                  <p className="flex-1 pt-1 text-lg font-medium text-gray-900">
                    {q.question}
                  </p>
                </div>
                <textarea
                  value={quizAnswers[index] ?? ''}
                  onChange={(e) => handleQuizAnswer(index, e.target.value)}
                  placeholder="Type your answer here..."
                  className="mb-3 w-full resize-none rounded-lg border border-gray-300 p-3 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  rows={3}
                  disabled={checkedAnswers.has(index)}
                />
                {!checkedAnswers.has(index) ? (
                  <Button
                    onClick={() => checkAnswer(index)}
                    disabled={!quizAnswers[index]?.trim()}
                    size="sm"
                  >
                    Check Answer
                  </Button>
                ) : (
                  <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                    <p className="mb-2 text-sm font-semibold text-green-800">
                      ✓ Sample Answer:
                    </p>
                    <p className="text-sm text-gray-700">{q.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between border-b border-gray-200 pb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Your Study Notes
          </h2>
          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              size="sm"
              loading={isSaving}
            >
              {isSaving ? "Saving..." : "💾 Save"}
            </Button>
            <Button
              onClick={handleCopy}
              variant="secondary"
              size="sm"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy
            </Button>
          </div>
        </div>
        <div className="prose max-w-none whitespace-pre-wrap text-gray-700">
          {generatedNotes}
        </div>
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <AppNav />

      <div className="container mx-auto max-w-4xl px-6 py-12">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-4xl font-bold text-gray-900">
            Note Generator
          </h1>
          <p className="text-lg text-gray-600">
            Paste your study material and let AI do the work
          </p>
        </div>

        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-gray-600">
              Prefer uploading a PDF or image? Use the dedicated upload workflow.
            </p>
            <Link
              href="/upload"
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Upload File Instead
            </Link>
          </div>
        </div>

        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <label className="text-sm font-semibold text-gray-900">
              Your Notes or Content
            </label>
            <span className="text-sm text-gray-500">
              {characterCount} characters
              {characterCount > 0 && ` • ~${estimatedTime}s`}
            </span>
          </div>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Paste lecture notes, textbook paragraphs, or study material here...

Example: 'Photosynthesis is the process by which plants convert sunlight into energy. It occurs in the chloroplasts and involves...'"
            className="h-64 w-full resize-none rounded-lg border border-gray-300 p-4 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <label className="mb-3 block text-sm font-semibold text-gray-900">
            Tags
          </label>
          <input
            value={tagsInput}
            onChange={(event) => setTagsInput(event.target.value)}
            placeholder="Comma-separated tags (e.g., Biology, Exam Prep, Chapter 5)"
            className="w-full rounded-lg border border-gray-300 bg-white p-3 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {TAG_SUGGESTIONS.map((tag) => (
              <Button
                key={tag}
                type="button"
                onClick={() => {
                  const existing = parseTags(tagsInput);
                  if (existing.includes(tag)) return;
                  setTagsInput(existing.length ? `${existing.join(", ")}, ${tag}` : tag);
                }}
                variant="secondary"
                size="sm"
                className="rounded-full px-3 py-1 text-xs"
              >
                {tag}
              </Button>
            ))}
          </div>
        </div>

        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <label className="mb-3 block text-sm font-semibold text-gray-900">
            Output Format
          </label>
          <select
            value={outputFormat}
            onChange={(e) => setOutputFormat(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white p-3 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="summary">Summary - Quick overview of main points</option>
            <option value="detailed">Detailed Notes - Comprehensive study guide</option>
            <option value="flashcards">Flashcards - Interactive flip cards</option>
            <option value="questions">Practice Quiz - Answer questions interactively</option>
          </select>

          {learningStyle && (
            <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    🎯 Adapt to Your Learning Style
                  </p>
                  <p className="mt-1 text-xs text-gray-600">
                    Current style: <span className="font-semibold capitalize">{learningStyle}</span>
                  </p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={adaptContent}
                    onChange={(e) => setAdaptContent(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="peer h-6 w-11 rounded-full bg-gray-300 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300"></div>
                </label>
              </div>
            </div>
          )}
        </div>

        <div className="mb-6 flex gap-3">
          <Button
            onClick={handleGenerate}
            disabled={!inputText || isLoading}
            fullWidth
            size="lg"
            loading={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                Generating... (~{estimatedTime}s)
              </span>
            ) : (
              "Generate Notes"
            )}
          </Button>
          {generatedNotes && (
            <Button
              onClick={handleClear}
              variant="secondary"
              size="lg"
            >
              Clear
            </Button>
          )}
        </div>

        {saveSuccess && (
          <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            ✓ Note saved successfully! <Link href="/my-notes" className="font-semibold underline">View all notes</Link>
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        {renderOutput()}
      </div>
    </main>
  );
}