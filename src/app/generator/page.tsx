"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { AppNav } from "~/app/_components/app-nav";
import { Button } from "~/app/_components/button";
import { PageHero } from "~/app/_components/page-hero";
import Listbox from "~/app/_components/Listbox";

const PREFILL_STORAGE_KEY = "studyforge:prefillText";
const PREFILL_FORMAT_KEY = "studyforge:prefillFormat";
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

type Flashcard = {
  id: number;
  question: string;
  answer: string;
};

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
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set());
  const [shuffledCards, setShuffledCards] = useState<Flashcard[]>([]);
  const [reviewedCards, setReviewedCards] = useState<Set<number>>(new Set());
  const [knownCards, setKnownCards] = useState<Set<number>>(new Set());
  const [stillLearningCards, setStillLearningCards] = useState<Set<number>>(new Set());
  const [studyMode, setStudyMode] = useState(false);
  const [studyCardIndex, setStudyCardIndex] = useState(0);
  const [studyCompleted, setStudyCompleted] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [checkedAnswers, setCheckedAnswers] = useState<Set<number>>(new Set());
  const [checkingAnswers, setCheckingAnswers] = useState<Set<number>>(new Set());
  const [answerChecks, setAnswerChecks] = useState<Record<number, { correct: boolean; feedback: string }>>({});
  const [quizQuestionCount, setQuizQuestionCount] = useState(5);
  const [quizDifficulty, setQuizDifficulty] = useState("medium");
  const [quizType, setQuizType] = useState("open-ended");
  const [notesLength, setNotesLength] = useState("medium");
  const [detectedSubject, setDetectedSubject] = useState<string | null>(null);
  const [suggestedFormat, setSuggestedFormat] = useState<string | null>(null);
  const [learningStyle, setLearningStyle] = useState<string | null>(null);
  const [adaptContent, setAdaptContent] = useState(false);
  const isGeneratingRef = useRef(false);
  const detectSubjectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const detectSubjectOnNextChangeRef = useRef(false);

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
    const prefillFormat = sessionStorage.getItem(PREFILL_FORMAT_KEY) ?? "";
    if (!text.trim()) {
      return;
    }

    setInputText(text);
    setGeneratedNotes("");
    setFlippedCards(new Set());
    setShuffledCards([]);
    setReviewedCards(new Set());
    setKnownCards(new Set());
    setStillLearningCards(new Set());
    setStudyMode(false);
    setStudyCardIndex(0);
    setStudyCompleted(false);
    setQuizAnswers({});
    setCheckedAnswers(new Set());
    setCheckingAnswers(new Set());
    setAnswerChecks({});

    if (["summary", "detailed", "flashcards", "questions"].includes(prefillFormat)) {
      setOutputFormat(prefillFormat);
    }

    sessionStorage.removeItem(PREFILL_STORAGE_KEY);
    sessionStorage.removeItem(PREFILL_FORMAT_KEY);
  }, []);

  useEffect(() => {
    return () => {
      if (detectSubjectTimeoutRef.current) {
        clearTimeout(detectSubjectTimeoutRef.current);
      }
    };
  }, []);

  if (status === "loading") {
    return (
      <main className="app-premium-dark flex min-h-screen items-center justify-center bg-gray-950">
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

  const handleGenerate = async (source: "default" | "regenerate" = "default") => {
    if (isGeneratingRef.current) {
      return;
    }

    isGeneratingRef.current = true;
    setIsRegenerating(source === "regenerate");
    setIsLoading(true);
    setError("");
    setSaveSuccess(false);
    setFlippedCards(new Set());
    setReviewedCards(new Set());
    setKnownCards(new Set());
    setStillLearningCards(new Set());
    setStudyMode(false);
    setStudyCardIndex(0);
    setStudyCompleted(false);
    setQuizAnswers({});
    setCheckedAnswers(new Set());
    setCheckingAnswers(new Set());
    setAnswerChecks({});
    
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: inputText,
          format: outputFormat,
          quizQuestionCount,
          quizDifficulty,
          quizType,
          notesLength,
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
      isGeneratingRef.current = false;
      setIsRegenerating(false);
      setIsLoading(false);
    }
  };

  const detectSubjectFromPastedText = async (textToAnalyze: string) => {
    const sample = textToAnalyze.trim().slice(0, 200);
    if (!sample) {
      setDetectedSubject(null);
      setSuggestedFormat(null);
      return;
    }

    try {
      const response = await fetch("/api/detect-subject", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: sample }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        subject?: string;
        suggestedFormat?: string;
      };

      const hasSuggestion = Boolean(data.subject?.trim() && data.suggestedFormat?.trim());
      if (!response.ok || !hasSuggestion) {
        setDetectedSubject(null);
        setSuggestedFormat(null);
        return;
      }

      setDetectedSubject(data.subject ?? null);
      setSuggestedFormat(data.suggestedFormat ?? null);
    } catch {
      setDetectedSubject(null);
      setSuggestedFormat(null);
    }
  };

  const scheduleSubjectDetection = (textValue: string) => {
    if (detectSubjectTimeoutRef.current) {
      clearTimeout(detectSubjectTimeoutRef.current);
    }

    detectSubjectTimeoutRef.current = setTimeout(() => {
      void detectSubjectFromPastedText(textValue);
    }, 1000);
  };

  const handleInputChange = (value: string) => {
    setInputText(value);

    if (detectSubjectOnNextChangeRef.current) {
      detectSubjectOnNextChangeRef.current = false;
      scheduleSubjectDetection(value);
    }
  };

  const formatSuggestionLabel = (format: string) => {
    if (format === "questions") return "Practice Quiz";
    if (format === "flashcards") return "Flashcards";
    if (format === "detailed") return "Detailed Notes";
    return "Summary";
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
    setDetectedSubject(null);
    setSuggestedFormat(null);
    setError("");
    setSaveSuccess(false);
    setFlippedCards(new Set());
    setShuffledCards([]);
    setReviewedCards(new Set());
    setKnownCards(new Set());
    setStillLearningCards(new Set());
    setStudyMode(false);
    setStudyCardIndex(0);
    setStudyCompleted(false);
    setQuizAnswers({});
    setCheckedAnswers(new Set());
    setCheckingAnswers(new Set());
    setAnswerChecks({});
  };

  const handleCopy = () => {
    void navigator.clipboard.writeText(generatedNotes);
    alert("Notes copied to clipboard.");
  };

  const handleExportPdf = () => {
    window.print();
  };

  const handleExportWord = async () => {
    const content = generatedNotes.trim();
    if (!content) return;

    const { Document, HeadingLevel, Packer, Paragraph, TextRun } = await import("docx");

    const paragraphs = content
      .split("\n")
      .map((line) => line.trim())
      .map((line) =>
        new Paragraph({
          children: [new TextRun(line.length ? line : " ")],
        })
      );

    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              text: "StudyForge Notes",
              heading: HeadingLevel.HEADING_1,
            }),
            ...paragraphs,
          ],
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "studyforge-notes.docx";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const toggleCard = (index: number) => {
    const newFlipped = new Set(flippedCards);
    const wasFlipped = newFlipped.has(index);
    if (wasFlipped) {
      newFlipped.delete(index);
    } else {
      newFlipped.add(index);
      setReviewedCards((prev) => {
        const next = new Set(prev);
        next.add(index);
        return next;
      });
    }
    setFlippedCards(newFlipped);
  };

  const handleQuizAnswer = (index: number, answer: string) => {
    const newAnswers = { ...quizAnswers };
    newAnswers[index] = answer;
    setQuizAnswers(newAnswers);
  };

  const checkAnswer = async (index: number, correctAnswer: string) => {
    if (checkingAnswers.has(index)) return;

    const studentAnswer = (quizAnswers[index] ?? "").trim();
    if (!studentAnswer) return;

    setCheckingAnswers((prev) => {
      const next = new Set(prev);
      next.add(index);
      return next;
    });

    try {
      const response = await fetch("/api/check-answer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentAnswer,
          correctAnswer,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as { correct?: boolean; feedback?: string };
      const isCorrect = data.correct === true;
      const feedback = data.feedback?.trim() || (isCorrect ? "Good work." : "Not quite right. Review the steps in the sample answer.");

      setAnswerChecks((prev) => ({
        ...prev,
        [index]: {
          correct: isCorrect,
          feedback,
        },
      }));
    } catch (err) {
      void err;
      setAnswerChecks((prev) => ({
        ...prev,
        [index]: {
          correct: false,
          feedback: "Could not verify answer right now. Please compare with the sample answer below.",
        },
      }));
    } finally {
      setCheckingAnswers((prev) => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });

      setCheckedAnswers((prev) => {
        const next = new Set(prev);
        next.add(index);
        return next;
      });
    }
  };

  const formatMathAnswerSteps = (answer: string) => {
    const cleaned = answer
      .replace(/\$/g, "")
      .replace(/\^2/g, "²")
      .replace(/\^3/g, "³")
      .trim();

    const stepLines = cleaned
      .split(/\n+/)
      .flatMap((line) => line.split(/(?=Step\s*\d*[:.)-]?\s*)/i))
      .flatMap((line) => line.split(/\.\s+(?=[A-Z0-9(])/))
      .map((line) => line.replace(/^Step\s*\d*[:.)-]?\s*/i, "").trim())
      .filter(Boolean);

    return stepLines.length ? stepLines : [cleaned];
  };

  const parseFlashcards = (text: string): Flashcard[] => {
    const cards: Flashcard[] = [];
    const lines = text.split('\n');
    let currentQ = '';
    let currentA = '';
    let nextId = 0;
    
    for (const line of lines) {
      if (line.trim().startsWith('Q:')) {
        if (currentQ && currentA) {
          cards.push({ id: nextId++, question: currentQ, answer: currentA });
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
      cards.push({ id: nextId++, question: currentQ, answer: currentA });
    }
    return cards;
  };

  useEffect(() => {
    if (outputFormat !== "flashcards") {
      setStudyMode(false);
      setStudyCardIndex(0);
      setStudyCompleted(false);
      return;
    }

    const parsed = parseFlashcards(generatedNotes);
    setShuffledCards(parsed);
    setStudyCardIndex(0);
    setFlippedCards(new Set());
    setReviewedCards(new Set());
    setKnownCards(new Set());
    setStillLearningCards(new Set());
    setStudyCompleted(false);
  }, [generatedNotes, outputFormat]);

  const shuffleFlashcards = () => {
    const baseCards = shuffledCards.length ? [...shuffledCards] : parseFlashcards(generatedNotes);
    for (let i = baseCards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [baseCards[i], baseCards[j]] = [baseCards[j]!, baseCards[i]!];
    }
    setShuffledCards(baseCards);
    setStudyCardIndex(0);
    setStudyCompleted(false);
  };

  const resetFlashcardProgress = () => {
    setFlippedCards(new Set());
    setReviewedCards(new Set());
    setKnownCards(new Set());
    setStillLearningCards(new Set());
    setStudyCardIndex(0);
    setStudyCompleted(false);
  };

  const markCardKnown = (cardId: number) => {
    setKnownCards((prev) => {
      const next = new Set(prev);
      next.add(cardId);
      return next;
    });
    setStillLearningCards((prev) => {
      const next = new Set(prev);
      next.delete(cardId);
      return next;
    });
  };

  const markCardStillLearning = (cardId: number) => {
    setStillLearningCards((prev) => {
      const next = new Set(prev);
      next.add(cardId);
      return next;
    });
    setKnownCards((prev) => {
      const next = new Set(prev);
      next.delete(cardId);
      return next;
    });
  };

  const moveStudyCard = (delta: number) => {
    setStudyCardIndex((prev) => {
      const maxIndex = Math.max(0, shuffledCards.length - 1);
      return Math.min(maxIndex, Math.max(0, prev + delta));
    });
  };

  const markStudyCard = (cardId: number, status: "known" | "learning") => {
    if (status === "known") {
      markCardKnown(cardId);
    } else {
      markCardStillLearning(cardId);
    }

    setReviewedCards((prev) => {
      const next = new Set(prev);
      next.add(cardId);

      const totalCards = shuffledCards.length;
      if (totalCards > 0 && next.size >= totalCards) {
        setStudyCompleted(true);
      } else {
        setStudyCardIndex((prevIndex) => Math.min(totalCards - 1, prevIndex + 1));
      }

      return next;
    });
  };

  useEffect(() => {
    if (!studyMode || studyCompleted || outputFormat !== "flashcards") return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        event.preventDefault();
        const activeCard = shuffledCards[studyCardIndex];
        if (activeCard) toggleCard(activeCard.id);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        moveStudyCard(1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        moveStudyCard(-1);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [studyMode, studyCompleted, outputFormat, shuffledCards, studyCardIndex, flippedCards]);

  const parseQuestions = (text: string) => {
    const questions: Array<{ question: string; answer: string }> = [];
    const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);

    let currentQuestion = "";
    let currentAnswer = "";
    let inAnswer = false;

    const pushCurrent = () => {
      if (currentQuestion.trim() && currentAnswer.trim()) {
        questions.push({
          question: currentQuestion.trim(),
          answer: currentAnswer.trim(),
        });
      }
    };

    for (const line of lines) {
      const questionStartMatch = line.match(/^\d+\.\s*(.+\?)\s*$/);

      if (questionStartMatch) {
        pushCurrent();
        currentQuestion = (questionStartMatch[1] ?? "").trim();
        currentAnswer = "";
        inAnswer = false;
        continue;
      }

      if (/^answer:\s*/i.test(line)) {
        currentAnswer = line.replace(/^answer:\s*/i, "").trim();
        inAnswer = true;
        continue;
      }

      if (inAnswer) {
        // Preserve full detailed answer/solution until next numbered question
        currentAnswer = `${currentAnswer}\n${line}`.trim();
      } else if (currentQuestion) {
        // If question accidentally wrapped, keep it attached to current question
        currentQuestion = `${currentQuestion} ${line}`.trim();
      }
    }

    pushCurrent();
    
    return questions;
  };

  const characterCount = inputText.length;
  const estimatedTime = Math.ceil(characterCount / 200);

  const renderOutput = () => {
    if (!generatedNotes) return null;

    if (outputFormat === "flashcards") {
      const cards = shuffledCards;
      const knownCount = cards.filter((card) => knownCards.has(card.id)).length;
      const stillLearningCount = cards.filter((card) => stillLearningCards.has(card.id)).length;
      const markedCount = cards.filter((card) => knownCards.has(card.id) || stillLearningCards.has(card.id)).length;
      const progressPct = cards.length ? Math.round((markedCount / cards.length) * 100) : 0;
      const activeCard = cards[studyCardIndex] ?? null;
      return (
        <div className="rounded-xl border border-gray-700 bg-gray-900 p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between border-b border-gray-200 pb-4">
            <h2 className="text-xl font-semibold text-white">
              Your Flashcards ({cards.length} cards)
            </h2>
            <div className="flex gap-2">
              <Button
                onClick={shuffleFlashcards}
                variant="secondary"
                size="sm"
                disabled={cards.length < 2}
              >
                Shuffle
              </Button>
              <Button
                onClick={resetFlashcardProgress}
                variant="secondary"
                size="sm"
                disabled={cards.length === 0}
              >
                Reset Progress
              </Button>
              <Button
                onClick={() => {
                  setStudyMode((prev) => {
                    const next = !prev;
                    if (next) setStudyCompleted(false);
                    return next;
                  });
                  setStudyCardIndex(0);
                }}
                variant="secondary"
                size="sm"
                disabled={cards.length === 0}
              >
                {studyMode ? "Exit Study Mode" : "Study Mode"}
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                size="sm"
                loading={isSaving}
              >
                {isSaving ? "Saving..." : "Save"}
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
          <div className="mb-5">
            <div className="mb-2 flex items-center justify-between text-sm text-gray-600">
              <span>{reviewedCount}/{cards.length} cards reviewed</span>
              <span>{progressPct}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-blue-600 transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {studyMode && activeCard ? (
            <div>
              <div className="mb-3 text-center text-sm font-semibold text-gray-700">
                Card {studyCardIndex + 1} of {cards.length}
              </div>
              <div
                onClick={() => toggleCard(activeCard.id)}
                className="group relative h-56 cursor-pointer perspective"
              >
                <div className={`relative h-full w-full transition-transform duration-500 transform-style-3d ${flippedCards.has(activeCard.id) ? 'rotate-y-180' : ''}`}>
                  <div className="absolute inset-0 flex items-center justify-center rounded-lg border-2 border-blue-200 bg-white p-6 backface-hidden">
                    <p className="text-center text-lg font-medium leading-relaxed text-gray-900">
                      {activeCard.question}
                    </p>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center rounded-lg border-2 border-green-200 bg-white p-6 backface-hidden rotate-y-180">
                    <p className="text-center leading-relaxed text-gray-700">
                      {activeCard.answer}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-center gap-2">
                <Button
                  onClick={() => setStudyCardIndex((prev) => Math.max(0, prev - 1))}
                  variant="secondary"
                  size="sm"
                  disabled={studyCardIndex === 0}
                >
                  Previous
                </Button>
                <Button
                  onClick={() => setStudyCardIndex((prev) => Math.min(cards.length - 1, prev + 1))}
                  variant="secondary"
                  size="sm"
                  disabled={studyCardIndex >= cards.length - 1}
                >
                  Next
                </Button>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                <div className="mb-2 flex items-center justify-between text-sm text-gray-400">
                  <span>{markedCount}/{cards.length} cards marked</span>
                  onClick={() => markCardKnown(activeCard.id)}
                  className="rounded-lg border border-green-300 bg-green-50 px-3 py-1.5 text-sm font-semibold text-green-700 hover:bg-green-100"
                <div className="h-2 w-full rounded-full bg-gray-800">
                  ✓ Got it
                </button>
                <button
                  type="button"
                  onClick={() => markCardStillLearning(activeCard.id)}
                <div className="mt-2 text-sm font-semibold text-gray-300">
                  {knownCount} known • {stillLearningCount} still learning
                </div>
                  className="rounded-lg border border-yellow-300 bg-yellow-50 px-3 py-1.5 text-sm font-semibold text-yellow-700 hover:bg-yellow-100"
                >
              {studyMode && studyCompleted ? (
                <div className="rounded-xl border border-green-700 bg-green-900/20 p-8 text-center">
                  <p className="text-3xl font-bold text-white">You got {knownCount}/{cards.length} correct! 🎉</p>
                  <p className="mt-2 text-gray-300">Keep practicing to improve your retention.</p>
                  <div className="mt-6 flex items-center justify-center gap-3">
                    <Button
                      onClick={() => {
                        resetFlashcardProgress();
                        setStudyMode(true);
                      }}
                      size="sm"
                    >
                      Retry
                    </Button>
                    <Button
                      onClick={() => {
                        setStudyMode(false);
                        setStudyCompleted(false);
                      }}
                      variant="secondary"
                      size="sm"
                    >
                      Back to Grid
                    </Button>
                  </div>
                </div>
              ) : studyMode && activeCard ? (
                </button>
                  <div className="mb-4 text-center text-base font-semibold text-gray-200">
                    {studyCardIndex + 1} of {cards.length}
          ) : (
                  <div className="flex items-center justify-center gap-4">
                    <button
                      type="button"
                      onClick={() => moveStudyCard(-1)}
                      disabled={studyCardIndex === 0}
                      className="flex h-14 w-14 items-center justify-center rounded-full border border-gray-700 bg-gray-800 text-3xl font-bold text-white transition hover:border-blue-400 hover:text-blue-200 disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="Previous card"
                    >
                      ‹
                    </button>

                    <div
                      onClick={() => toggleCard(activeCard.id)}
                      className="group perspective relative w-full max-w-3xl cursor-pointer"
                    >
                      <div className={`flashcard relative h-[300px] w-full ${flippedCards.has(activeCard.id) ? "flipped" : ""}`}>
                        <div className="flashcard-front absolute inset-0 overflow-hidden rounded-xl border border-blue-500/40 bg-gradient-to-br from-slate-900 via-blue-950 to-blue-900 p-8 shadow-[0_0_0_1px_rgba(96,165,250,0.12)] transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_0_0_1px_rgba(96,165,250,0.32),0_0_22px_rgba(59,130,246,0.25)]">
                          <span className="absolute left-4 top-4 rounded-full border border-blue-300/40 bg-blue-600/20 px-2 py-0.5 text-xs font-bold text-blue-100">Q</span>
                          <p className="flex h-full items-center justify-center text-center text-lg font-semibold leading-relaxed text-white">
                            {activeCard.question}
                          </p>
                        </div>
                        <div className="flashcard-back absolute inset-0 overflow-hidden rounded-xl border border-purple-500/40 bg-gradient-to-br from-slate-900 via-purple-950 to-purple-900 p-8 shadow-[0_0_0_1px_rgba(168,85,247,0.12)] transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_0_0_1px_rgba(168,85,247,0.32),0_0_22px_rgba(147,51,234,0.25)]">
                          <span className="absolute left-4 top-4 rounded-full border border-purple-300/40 bg-purple-600/20 px-2 py-0.5 text-xs font-bold text-purple-100">A</span>
                          <p className="flex h-full items-center justify-center text-center text-lg font-medium leading-relaxed text-blue-200">
                            {activeCard.answer}
                          </p>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => moveStudyCard(1)}
                      disabled={studyCardIndex >= cards.length - 1}
                      className="flex h-14 w-14 items-center justify-center rounded-full border border-gray-700 bg-gray-800 text-3xl font-bold text-white transition hover:border-blue-400 hover:text-blue-200 disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="Next card"
                    >
                      ›
                    </button>
                  </div>

                  <div className="mt-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-400">
                    <svg className="mr-1 inline h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
                    </svg>
                    Flip card • Space | Navigate • ← →
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => markStudyCard(activeCard.id, "known")}
                      className="rounded-xl border border-green-500/60 bg-green-900/30 px-5 py-4 text-base font-bold text-green-200 transition hover:bg-green-800/40"
                    >
                      ✓ Got it
                    </button>
                    <button
                      type="button"
                      onClick={() => markStudyCard(activeCard.id, "learning")}
                      className="rounded-xl border border-orange-500/60 bg-orange-900/30 px-5 py-4 text-base font-bold text-orange-200 transition hover:bg-orange-800/40"
                    >
                      ↺ Still Learning
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2">
                  {cards.map((card, index) => (
                    <div key={card.id}>
                      <div className="mb-2 flex items-center justify-between">
                        <p className="inline-flex items-center gap-2 text-sm font-semibold text-gray-300">
                          <span>Card {index + 1}</span>
                          <span className="rounded-full border border-gray-600 bg-gray-800 px-2 py-0.5 text-xs text-gray-300">
                            {index + 1}/{cards.length}
                          </span>
                        </p>
                        {knownCards.has(card.id) ? (
                          <span className="rounded-full border border-green-500/60 bg-green-900/30 px-2 py-0.5 text-xs font-semibold text-green-300">Known</span>
                        ) : stillLearningCards.has(card.id) ? (
                          <span className="rounded-full border border-orange-500/60 bg-orange-900/30 px-2 py-0.5 text-xs font-semibold text-orange-300">Still Learning</span>
                        ) : null}
                      </div>
                      <div
                        onClick={() => toggleCard(card.id)}
                        className="group perspective relative cursor-pointer"
                      >
                        <div className={`flashcard relative min-h-[200px] w-full ${flippedCards.has(card.id) ? "flipped" : ""}`}>
                          <div
                            className={`flashcard-front absolute inset-0 overflow-hidden rounded-xl border bg-gradient-to-br from-slate-900 via-blue-950 to-blue-900 p-6 shadow-[0_0_0_1px_rgba(96,165,250,0.12)] transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_0_0_1px_rgba(96,165,250,0.32),0_0_16px_rgba(59,130,246,0.22)] ${stillLearningCards.has(card.id) ? "border-orange-500/70" : "border-blue-500/40"}`}
                          >
                            <span className="absolute left-4 top-4 rounded-full border border-blue-300/40 bg-blue-600/20 px-2 py-0.5 text-xs font-bold text-blue-100">Q</span>
                            {knownCards.has(card.id) ? (
                              <span className="absolute right-4 top-4 inline-flex h-7 w-7 items-center justify-center rounded-full border border-green-400 bg-green-500/20 text-sm font-bold text-green-200">
                                ✓
                              </span>
                            ) : null}
                            <p className="flex min-h-[200px] items-center justify-center text-center text-lg font-semibold leading-relaxed text-white">
                              {card.question}
                            </p>
                          </div>
                          <div
                            className={`flashcard-back absolute inset-0 overflow-hidden rounded-xl border bg-gradient-to-br from-slate-900 via-purple-950 to-purple-900 p-6 shadow-[0_0_0_1px_rgba(168,85,247,0.12)] transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_0_0_1px_rgba(168,85,247,0.32),0_0_16px_rgba(147,51,234,0.22)] ${stillLearningCards.has(card.id) ? "border-orange-500/70" : "border-purple-500/40"}`}
                          >
                            <span className="absolute left-4 top-4 rounded-full border border-purple-300/40 bg-purple-600/20 px-2 py-0.5 text-xs font-bold text-purple-100">A</span>
                            {knownCards.has(card.id) ? (
                              <span className="absolute right-4 top-4 inline-flex h-7 w-7 items-center justify-center rounded-full border border-green-400 bg-green-500/20 text-sm font-bold text-green-200">
                                ✓
                              </span>
                            ) : null}
                            <p className="flex min-h-[200px] items-center justify-center text-center text-base font-medium leading-relaxed text-blue-200">
                              {card.answer}
                            </p>
                          </div>
                        </div>
                      </div>
                      <p className="mt-3 text-center text-xs text-gray-400" aria-label="Flip card hint">
                        <svg className="inline h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
                        </svg>
                      </p>
                      <div className="mt-3 flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => markCardKnown(card.id)}
                          className="rounded-lg border border-green-500/60 bg-green-900/30 px-3 py-1.5 text-sm font-semibold text-green-200 hover:bg-green-800/40"
                        >
                          ✓ Got it
                        </button>
                        <button
                          type="button"
                          onClick={() => markCardStillLearning(card.id)}
                          className="rounded-lg border border-orange-500/60 bg-orange-900/30 px-3 py-1.5 text-sm font-semibold text-orange-200 hover:bg-orange-800/40"
                        >
                          ↺ Still Learning
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
                    disabled={!quizAnswers[index]?.trim() || checkingAnswers.has(index)}
                    size="sm"
                <div className="mt-5 border-t border-gray-700 pt-4 text-sm font-semibold text-gray-300">
                  {knownCount} known • {stillLearningCount} still learning
                  </Button>
                ) : (
                  <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                    {answerChecks[index] && (
                <div className="mt-4 rounded-lg border border-yellow-700 bg-yellow-900/30 p-4 text-sm text-yellow-300">
                        <p className="font-semibold">
                  <p className="mt-2 whitespace-pre-wrap text-xs text-gray-200">{generatedNotes}</p>
                        </p>
                        <p className="mt-1">{answerChecks[index]?.feedback}</p>
                      </div>
                    )}
                    <p className="mb-2 text-sm font-semibold text-green-800">
                      ✓ Sample Answer:
                    </p>
                    <div className="space-y-1">
                      {formatMathAnswerSteps(q.answer).map((line, stepIndex, arr) => (
                        <p
                          key={`${index}-${stepIndex}`}
                          className={`text-sm ${stepIndex === arr.length - 1 ? "font-bold" : ""}`}
                          style={{ color: "#111827" }}
                        >
                          <span className="mr-1 font-semibold">{stepIndex + 1}.</span>
                          {line}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="print-notes-only rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="print-hide mb-4 flex flex-col gap-3 border-b border-gray-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            Your Study Notes
          </h2>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              size="sm"
              loading={isSaving}
            >
              {isSaving ? "Saving..." : "Save"}
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
            <Button
              onClick={handleExportPdf}
              variant="secondary"
              size="sm"
            >
              Export PDF
            </Button>
            <Button
              onClick={() => void handleExportWord()}
              variant="secondary"
              size="sm"
            >
              Export Word
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
    <main className="app-premium-dark min-h-screen bg-gray-950">
      <AppNav />

      <div className="container mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        <PageHero
          title="Note Generator"
          description="Paste your study material and let AI transform it into focused study formats in seconds."
          actions={
            <>
              <Button href="/upload" variant="secondary" size="sm">Upload File</Button>
              <Button href="/my-notes" variant="secondary" size="sm">My Notes</Button>
            </>
          }
        />

        <div className="mb-6 rounded-xl border border-gray-200 border-l-4 border-l-blue-500 bg-white p-4 shadow-sm">
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

        <div className="mb-6 rounded-xl border border-gray-200 border-l-4 border-l-blue-500 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">1</span>
            <h2 className="text-lg font-semibold text-white">Your Notes or Content</h2>
          </div>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm text-gray-500">
              {characterCount} characters
              {characterCount > 0 && ` • ~${estimatedTime}s`}
            </span>
          </div>
          <textarea
            value={inputText}
            onPaste={() => {
              detectSubjectOnNextChangeRef.current = true;
            }}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Paste lecture notes, textbook paragraphs, or study material here...

Example: 'Photosynthesis is the process by which plants convert sunlight into energy. It occurs in the chloroplasts and involves...'"
            className="min-h-[300px] w-full resize-none rounded-lg border border-gray-300 p-4 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {detectedSubject && suggestedFormat && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
              <span>
                📚 Detected: {detectedSubject} — Try {formatSuggestionLabel(suggestedFormat)} for best results
              </span>
              <button
                type="button"
                onClick={() => setOutputFormat(suggestedFormat)}
                className="rounded-md border border-blue-300 bg-white px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100"
              >
                {suggestedFormat === "questions" ? "Switch to Practice Quiz" : `Switch to ${formatSuggestionLabel(suggestedFormat)}`}
              </button>
            </div>
          )}
        </div>

        <div className="mb-6 rounded-xl border border-gray-200 border-l-4 border-l-blue-500 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">2</span>
            <h2 className="text-lg font-semibold text-white">Tags</h2>
          </div>
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
                className="rounded-full border border-gray-700 bg-transparent px-3 py-1 text-xs text-gray-200 hover:border-blue-400 hover:bg-blue-500/20 hover:text-blue-200"
              >
                {tag}
              </Button>
            ))}
          </div>
        </div>

        <div className="mb-6 rounded-xl border border-gray-200 border-l-4 border-l-blue-500 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">3</span>
            <h2 className="text-lg font-semibold text-white">Output & Settings</h2>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <label className="mb-3 block text-sm font-semibold text-gray-900">Output Format</label>
              <Listbox
                value={outputFormat}
                onChange={(v) => setOutputFormat(v)}
                options={[
                  { value: "summary", label: "Summary - Quick overview of main points" },
                  { value: "detailed", label: "Detailed Notes - Comprehensive study guide" },
                  { value: "flashcards", label: "Flashcards - Interactive flip cards" },
                  { value: "questions", label: "Practice Quiz - Answer questions interactively" },
                ]}
              />
            </div>

            {(outputFormat === "summary" || outputFormat === "detailed") && (
              <div>
                <p className="mb-3 text-sm font-semibold text-gray-900">Notes Length</p>
                <Listbox
                  value={notesLength}
                  onChange={(v) => setNotesLength(v)}
                  options={[
                    { value: "brief", label: "Brief" },
                    { value: "medium", label: "Medium" },
                    { value: "comprehensive", label: "Comprehensive" },
                  ]}
                />
              </div>
            )}
          </div>

          {outputFormat === "questions" && (
            <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4 lg:col-span-2">
              <p className="mb-3 text-sm font-semibold text-gray-900">Practice Quiz Settings</p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className="mb-2 block text-xs font-semibold text-gray-700">Number of questions</label>
                  <Listbox
                    value={String(quizQuestionCount)}
                    onChange={(v) => setQuizQuestionCount(Number(v))}
                    options={[
                      { value: "5", label: "5" },
                      { value: "10", label: "10" },
                      { value: "15", label: "15" },
                      { value: "20", label: "20" },
                    ]}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold text-gray-700">Difficulty</label>
                  <Listbox
                    value={quizDifficulty}
                    onChange={(v) => setQuizDifficulty(v)}
                    options={[
                      { value: "easy", label: "Easy" },
                      { value: "medium", label: "Medium" },
                      { value: "hard", label: "Hard" },
                    ]}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold text-gray-700">Question type</label>
                  <Listbox
                    value={quizType}
                    onChange={(v) => setQuizType(v)}
                    options={[
                      { value: "open-ended", label: "Open Ended" },
                      { value: "multiple-choice", label: "Multiple Choice" },
                      { value: "true-false", label: "True/False" },
                      { value: "calculation", label: "Calculation" },
                    ]}
                  />
                </div>
              </div>
            </div>
          )}

          {learningStyle && (
            <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Adapt to Your Learning Style
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

        <div className="mb-6 flex flex-col gap-3 sm:flex-row">
          <Button
            onClick={handleGenerate}
            disabled={!inputText || isLoading}
            fullWidth
            size="lg"
            loading={isLoading}
            className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 py-4 text-lg font-bold text-white shadow-lg shadow-blue-500/25 hover:from-blue-700 hover:to-purple-700"
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
            <>
              <Button
                onClick={() => void handleGenerate("regenerate")}
                variant="secondary"
                size="lg"
                disabled={isLoading}
                fullWidth
              >
                {isRegenerating ? (
                  <span className="flex items-center gap-2">
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Regenerating...
                  </span>
                ) : (
                  "Regenerate"
                )}
              </Button>
              <Button
                onClick={handleClear}
                variant="secondary"
                size="lg"
                fullWidth
              >
                Clear
              </Button>
            </>
          )}
        </div>

        {saveSuccess && (
          <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            Note saved successfully. <Link href="/my-notes" className="font-semibold underline">View all notes</Link>
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