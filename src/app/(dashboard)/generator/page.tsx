"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { loginUrlFor } from "~/lib/auth-redirect";
import { useToast } from "~/app/_components/toast";
import { SkeletonList } from "~/app/_components/skeleton";
import { SendToPanel } from "~/app/_components/send-to-panel";
import { trackNovaEvent } from "@/lib/novaClient";
import { renderMath } from "@/lib/mathRenderer";

const PREFILL_STORAGE_KEY = "kyvex:prefillText";
const PREFILL_FORMAT_KEY = "kyvex:prefillFormat";
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

type CurriculumOption = {
  code: string;
  title: string;
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

function deriveGeneratedTitle(source: string, fallback: string) {
  const base = source.trim() || fallback.trim() || "Generated notes";
  return base.slice(0, 50) + (base.length > 50 ? "..." : "");
}

export default function Generator() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [inputText, setInputText] = useState("");
  const [outputFormat, setOutputFormat] = useState("summary");
  const [autoSaveNotes, setAutoSaveNotes] = useState(true);
  const [generatedNotes, setGeneratedNotes] = useState("");
  const [generatedNoteId, setGeneratedNoteId] = useState("");
  const [generatedTitle, setGeneratedTitle] = useState("");
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
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [checkedAnswers, setCheckedAnswers] = useState<Set<number>>(new Set());
  const [checkingAnswers, setCheckingAnswers] = useState<Set<number>>(new Set());
  const [answerChecks, setAnswerChecks] = useState<Record<number, { correct: boolean; feedback: string }>>({});
  const [quizQuestionCount, setQuizQuestionCount] = useState(5);
  const [quizDifficulty, setQuizDifficulty] = useState("medium");
  const [quizType, setQuizType] = useState("open-ended");
  const [notesLength, setNotesLength] = useState("medium");
  const [curriculumCode, setCurriculumCode] = useState("");
  const [curriculumOptions, setCurriculumOptions] = useState<CurriculumOption[]>([]);
  const [detectedSubject, setDetectedSubject] = useState<string | null>(null);
  const [suggestedFormat, setSuggestedFormat] = useState<string | null>(null);
  const [learningStyle, setLearningStyle] = useState<string | null>(null);
  const [adaptContent, setAdaptContent] = useState(false);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const isGeneratingRef = useRef(false);
  const detectSubjectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const detectSubjectOnNextChangeRef = useRef(false);
  const { showToast } = useToast();
  const loadingMessages = ["Reading your notes...", "Generating content...", "Almost ready..."];

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(loginUrlFor("/generator"));
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user?.id) {
      fetch("/api/user/preferences")
        .then((res) => res.json())
        .then((data: { preferences?: { learningStyle?: string; autoAdapt?: boolean } }) => {
          if (data.preferences?.learningStyle) {
            setLearningStyle(data.preferences.learningStyle);
            setAdaptContent(data.preferences.autoAdapt ?? false);
          }
        })
        .catch(() => {
          // Silent fail - learning style is optional
        });

      fetch("/api/user/settings")
        .then((res) => res.json())
        .then(
          (data: {
            defaultNoteFormat?: string;
            autoSaveNotes?: boolean;
          }) => {
            if (
              data.defaultNoteFormat &&
              ["summary", "detailed", "flashcards", "questions"].includes(data.defaultNoteFormat)
            ) {
              setOutputFormat(data.defaultNoteFormat);
            }
            if (typeof data.autoSaveNotes === "boolean") {
              setAutoSaveNotes(data.autoSaveNotes);
            }
          },
        )
        .catch(() => {
          // Silent fail - settings defaults remain
        });
    }
  }, [session]);

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/curriculum?grade=11&limit=100");
      if (!response.ok) return;
      const data = (await response.json().catch(() => ({}))) as { courses?: CurriculumOption[] };
      setCurriculumOptions(data.courses ?? []);
    })();
  }, []);

  useEffect(() => {
    const source = new URLSearchParams(window.location.search).get("source");
    if (!source || !["upload", "scan", "dashboard-scan"].includes(source)) {
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

  useEffect(() => {
    if (!isLoading) {
      setLoadingMessageIndex(0);
      return;
    }
    const interval = window.setInterval(() => {
      setLoadingMessageIndex((prev) => (prev + 1) % loadingMessages.length);
    }, 900);
    return () => window.clearInterval(interval);
  }, [isLoading, loadingMessages.length]);

  useEffect(() => {
    if (!error) return;
    showToast(error, "error");
  }, [error, showToast]);

  useEffect(() => {
    if (!saveSuccess) return;
    showToast("Note saved successfully.", "success");
  }, [saveSuccess, showToast]);

  // Hoisted above the early returns to satisfy react-hooks/rules-of-hooks.
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
      return;
    }

    const parsed = parseFlashcards(generatedNotes);
    setShuffledCards(parsed);
    setStudyCardIndex(0);
    setFlippedCards(new Set());
    setReviewedCards(new Set());
    setKnownCards(new Set());
    setStillLearningCards(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- parseFlashcards is stable per render and intentionally excluded
  }, [generatedNotes, outputFormat]);

  if (status === "loading") {
    return (
      <main className="kv-page" style={{ padding: "24px 16px 100px" }}>
        <SkeletonList count={4} />
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
    setGeneratedNoteId("");
    setFlippedCards(new Set());
    setReviewedCards(new Set());
    setKnownCards(new Set());
    setStillLearningCards(new Set());
    setStudyMode(false);
    setStudyCardIndex(0);
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
          curriculumCode: curriculumCode || undefined,
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
        setGeneratedTitle(deriveGeneratedTitle(inputText, finalNotes));

        if (autoSaveNotes && finalNotes.trim()) {
          try {
            const title = deriveGeneratedTitle(inputText, finalNotes);
            const saveRes = await fetch("/api/notes", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title,
                content: finalNotes,
                format: outputFormat,
                tags: parseTags(tagsInput),
              }),
            });
            const saveData = (await saveRes.json().catch(() => ({}))) as {
              note?: { id?: string; title?: string };
            };
            if (saveRes.ok) {
              setGeneratedNoteId(saveData.note?.id ?? "");
              setGeneratedTitle(saveData.note?.title ?? title);
              setSaveSuccess(true);
              setTimeout(() => setSaveSuccess(false), 3000);
              showToast("Auto-saved to My Notes", "success");
              trackNovaEvent("NOTE_GENERATED");
            }
          } catch {
            // Manual save remains available
          }
        }
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
      const title = deriveGeneratedTitle(sourceForTitle, contentToSave);

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

      const result = (await response.json().catch(() => ({}))) as {
        note?: { id?: string; title?: string };
        error?: string;
      };

      if (response.ok) {
        setGeneratedNoteId(result.note?.id ?? "");
        setGeneratedTitle(result.note?.title ?? title);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        trackNovaEvent("NOTE_GENERATED");
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
    setGeneratedNoteId("");
    setGeneratedTitle("");
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
    setQuizAnswers({});
    setCheckedAnswers(new Set());
    setCheckingAnswers(new Set());
    setAnswerChecks({});
  };

  const handleCopy = () => {
    void navigator.clipboard.writeText(generatedNotes);
    showToast("Notes copied to clipboard.", "info");
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
              text: "Kyvex Notes",
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
    anchor.download = "kyvex-notes.docx";
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

  // parseFlashcards + its useEffect were moved above the early returns below;
  // see the block right before `if (status === "loading")`.

  const shuffleFlashcards = () => {
    const baseCards = shuffledCards.length ? [...shuffledCards] : parseFlashcards(generatedNotes);
    for (let i = baseCards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [baseCards[i], baseCards[j]] = [baseCards[j]!, baseCards[i]!];
    }
    setShuffledCards(baseCards);
    setStudyCardIndex(0);
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
      const questionStartMatch = /^\d+\.\s*(.+\?)\s*$/.exec(line);

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
      const reviewedCount = cards.filter((card) => reviewedCards.has(card.id)).length;
      const knownCount = cards.filter((card) => knownCards.has(card.id)).length;
      const stillLearningCount = cards.filter((card) => stillLearningCards.has(card.id)).length;
      const progressPct = cards.length ? Math.round((reviewedCount / cards.length) * 100) : 0;
      const activeCard = cards[studyCardIndex] ?? null;
      return (
        <div className="card">
          <div className="kv-row" style={{ borderTop: "none", paddingTop: 0, flexWrap: "wrap" }}>
            <div className="kv-row-title">Your Flashcards ({cards.length} cards)</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={shuffleFlashcards}
                className="kv-btn-ghost"
                disabled={cards.length < 2}
              >
                Shuffle
              </button>
              <button
                type="button"
                onClick={() => {
                  setStudyMode((prev) => !prev);
                  setStudyCardIndex(0);
                }}
                className="kv-btn-ghost"
                disabled={cards.length === 0}
              >
                {studyMode ? "Exit Study Mode" : "Study Mode"}
              </button>
              <button type="button" onClick={handleSave} disabled={isSaving} className="kv-btn">
                {isSaving ? "Saving..." : "Save"}
              </button>
              <button type="button" onClick={handleCopy} className="kv-btn-ghost">
                Copy
              </button>
            </div>
          </div>
          <div style={{ marginTop: 8 }}>
            <div className="kv-row" style={{ paddingTop: 8, paddingBottom: 8 }}>
              <span className="kv-meta num">{reviewedCount}/{cards.length} cards reviewed</span>
              <span className="kv-meta num">{progressPct}%</span>
            </div>
            <div className="kv-bar">
              <div style={{ width: `${progressPct}%` }} />
            </div>
          </div>

          {studyMode && activeCard ? (
            <div>
              <p className="kv-meta num" style={{ textAlign: "center", marginBottom: 12 }}>
                Card {studyCardIndex + 1} of {cards.length}
              </p>
              <div
                onClick={() => toggleCard(activeCard.id)}
                className="group relative h-56 cursor-pointer perspective"
              >
                <div className={`relative h-full w-full transition-transform duration-500 transform-style-3d ${flippedCards.has(activeCard.id) ? 'rotate-y-180' : ''}`}>
                  <div className="absolute inset-0 flex items-center justify-center p-6 backface-hidden" style={{ border: "1px solid var(--border-default)" }}>
                    <p className="kv-row-title" style={{ textAlign: "center" }}>
                      {activeCard.question}
                    </p>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center p-6 backface-hidden rotate-y-180" style={{ border: "1px solid var(--border-default)" }}>
                    <p className="kv-sub" style={{ textAlign: "center", maxWidth: "none" }}>
                      {activeCard.answer}
                    </p>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 16, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => setStudyCardIndex((prev) => Math.max(0, prev - 1))}
                  className="kv-btn-ghost"
                  disabled={studyCardIndex === 0}
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setStudyCardIndex((prev) => Math.min(cards.length - 1, prev + 1))}
                  className="kv-btn-ghost"
                  disabled={studyCardIndex >= cards.length - 1}
                >
                  Next
                </button>
              </div>

              <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 12, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => markCardKnown(activeCard.id)}
                  className={knownCards.has(activeCard.id) ? "kv-btn-ghost on" : "kv-btn-ghost"}
                >
                  ✓ Got it
                </button>
                <button
                  type="button"
                  onClick={() => markCardStillLearning(activeCard.id)}
                  className={stillLearningCards.has(activeCard.id) ? "kv-btn-ghost on" : "kv-btn-ghost"}
                >
                  ↺ Still Learning
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 24, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", marginTop: 16 }}>
              {cards.map((card, index) => (
                <div key={card.id}>
                  <p className="kv-meta" style={{ marginBottom: 8 }}>Card {index + 1}</p>
                  <div
                    onClick={() => toggleCard(card.id)}
                    className="group relative h-48 cursor-pointer perspective"
                  >
                    <div className={`relative h-full w-full transition-transform duration-500 transform-style-3d ${flippedCards.has(card.id) ? 'rotate-y-180' : ''}`}>
                      <div className="absolute inset-0 flex items-center justify-center p-6 backface-hidden" style={{ border: "1px solid var(--border-default)" }}>
                        <p className="kv-row-title" style={{ textAlign: "center" }}>
                          {card.question}
                        </p>
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center p-6 backface-hidden rotate-y-180" style={{ border: "1px solid var(--border-default)" }}>
                        <p className="kv-sub" style={{ textAlign: "center", maxWidth: "none" }}>
                          {card.answer}
                        </p>
                      </div>
                    </div>
                  </div>
                  <p className="kv-meta" style={{ textAlign: "center", marginTop: 12 }}>
                    Click to flip
                  </p>
                  <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 12, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => markCardKnown(card.id)}
                      className={knownCards.has(card.id) ? "kv-btn-ghost on" : "kv-btn-ghost"}
                    >
                      Got it
                    </button>
                    <button
                      type="button"
                      onClick={() => markCardStillLearning(card.id)}
                      className={stillLearningCards.has(card.id) ? "kv-btn-ghost on" : "kv-btn-ghost"}
                    >
                      Still Learning
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {cards.length > 0 && (
            <p className="kv-meta num" style={{ marginTop: 20 }}>
              Known: {knownCount} | Still Learning: {stillLearningCount}
            </p>
          )}

          {cards.length === 0 && (
            <div style={{ marginTop: 16 }}>
              <p className="kv-meta">No flashcards parsed from AI output.</p>
              <div
                className="kv-sub"
                style={{ marginTop: 8 }}
                dangerouslySetInnerHTML={{ __html: renderMath(generatedNotes) }}
              />
            </div>
          )}
        </div>
      );
    }

    if (outputFormat === "questions") {
      const questions = parseQuestions(generatedNotes);
      return (
        <div className="card">
          <div className="kv-row" style={{ borderTop: "none", paddingTop: 0, flexWrap: "wrap" }}>
            <div className="kv-row-title">Practice Quiz ({questions.length} questions)</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" onClick={handleSave} disabled={isSaving} className="kv-btn">
                {isSaving ? "Saving..." : "Save"}
              </button>
              <button type="button" onClick={handleCopy} className="kv-btn-ghost">
                Copy
              </button>
            </div>
          </div>
          <div>
            {questions.map((q, index) => (
              <div key={index} className="card" style={{ marginTop: 16 }}>
                <div className="kv-row" style={{ borderTop: "none", paddingTop: 0, alignItems: "flex-start" }}>
                  <span className="kv-meta num">{index + 1}</span>
                  <p className="kv-row-title" style={{ flex: 1 }}>
                    {q.question.replace(/\$/g, "")}
                  </p>
                </div>
                <textarea
                  value={quizAnswers[index] ?? ''}
                  onChange={(e) => handleQuizAnswer(index, e.target.value)}
                  placeholder="Type your answer here..."
                  className="kv-field"
                  rows={3}
                  disabled={checkedAnswers.has(index)}
                  style={{ marginTop: 12, resize: "vertical" }}
                />
                {!checkedAnswers.has(index) ? (
                  <button
                    type="button"
                    onClick={() => void checkAnswer(index, q.answer)}
                    disabled={!quizAnswers[index]?.trim() || checkingAnswers.has(index)}
                    className="kv-btn"
                    style={{ marginTop: 12 }}
                  >
                    {checkingAnswers.has(index) ? "Checking..." : "Check Answer"}
                  </button>
                ) : (
                  <div style={{ marginTop: 12 }}>
                    {answerChecks[index] && (
                      <div style={{ marginBottom: 12 }}>
                        <span className={answerChecks[index]?.correct ? "kv-chip" : "kv-chip kv-chip-stale"}>
                          {answerChecks[index]?.correct ? "✓ Correct" : "✗ Incorrect"}
                        </span>
                        <p className="kv-sub" style={{ marginTop: 8 }}>{answerChecks[index]?.feedback}</p>
                      </div>
                    )}
                    <p className="kv-meta" style={{ marginBottom: 8 }}>✓ Sample Answer:</p>
                    <div>
                      {formatMathAnswerSteps(q.answer).map((line, stepIndex, arr) => (
                        <p
                          key={`${index}-${stepIndex}`}
                          className="kv-sub"
                          style={{ marginTop: 4, fontWeight: stepIndex === arr.length - 1 ? 600 : undefined }}
                        >
                          <span className="kv-meta num" style={{ marginRight: 6 }}>{stepIndex + 1}.</span>
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
      <div className="print-notes-only card">
        <div className="print-hide kv-row" style={{ borderTop: "none", paddingTop: 0, flexWrap: "wrap" }}>
          <div className="kv-row-title">Your Study Notes</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" onClick={handleSave} disabled={isSaving} className="kv-btn">
              {isSaving ? "Saving..." : "Save"}
            </button>
            <button type="button" onClick={handleCopy} className="kv-btn-ghost">
              Copy
            </button>
            <button type="button" onClick={handleExportPdf} className="kv-btn-ghost">
              Export PDF
            </button>
            <button type="button" onClick={() => void handleExportWord()} className="kv-btn-ghost">
              Export Word
            </button>
          </div>
        </div>
        <div
          className="prose max-w-none"
          dangerouslySetInnerHTML={{ __html: renderMath(generatedNotes) }}
        />
      </div>
    );
  };

  return (
    <main className="kv-page" style={{ padding: "24px 16px 100px" }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <div className="kv-crumb">Kyvex / <b>Note Generator</b></div>
        <h1 className="kv-title" style={{ marginTop: 14 }}>Note Generator</h1>
        <p className="kv-sub" style={{ marginTop: 10 }}>Paste your study material and let AI transform it into focused study formats in seconds.</p>
        <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
          <Link href="/smart-upload" className="kv-btn-ghost">Upload File</Link>
          <Link href="/my-notes" className="kv-btn-ghost">My Notes</Link>
        </div>

        <div className="kv-row" style={{ marginTop: 20 }}>
          <p className="kv-sub" style={{ margin: 0 }}>
            Prefer uploading a PDF or image? Use the dedicated upload workflow.
          </p>
          <Link href="/smart-upload" className="kv-btn-ghost">
            Upload File Instead
          </Link>
        </div>

        <p className="kv-meta" style={{ marginTop: 28 }}>Your Notes or Content</p>
        <p className="kv-meta num" style={{ marginTop: 8 }}>
          {characterCount} characters
          {characterCount > 0 ? ` · ~${estimatedTime}s` : ""}
        </p>
        <textarea
          value={inputText}
          onPaste={() => {
            detectSubjectOnNextChangeRef.current = true;
          }}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder="Paste lecture notes, textbook paragraphs, or study material here...

Example: 'Photosynthesis is the process by which plants convert sunlight into energy. It occurs in the chloroplasts and involves...'"
          className="kv-field"
          style={{ minHeight: 300, marginTop: 10, resize: "vertical" }}
        />
        {detectedSubject && suggestedFormat && (
          <div className="kv-row">
            <span className="kv-sub" style={{ margin: 0 }}>
              📚 Detected: {detectedSubject} — Try {formatSuggestionLabel(suggestedFormat)} for best results
            </span>
            <button
              type="button"
              onClick={() => setOutputFormat(suggestedFormat)}
              className="kv-btn-ghost"
            >
              {suggestedFormat === "questions" ? "Switch to Practice Quiz" : `Switch to ${formatSuggestionLabel(suggestedFormat)}`}
            </button>
          </div>
        )}

        <p className="kv-meta" style={{ marginTop: 28 }}>Tags</p>
        <input
          value={tagsInput}
          onChange={(event) => setTagsInput(event.target.value)}
          placeholder="Comma-separated tags (e.g., Biology, Exam Prep, Chapter 5)"
          className="kv-field"
          style={{ marginTop: 10 }}
        />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
          {TAG_SUGGESTIONS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => {
                const existing = parseTags(tagsInput);
                if (existing.includes(tag)) return;
                setTagsInput(existing.length ? `${existing.join(", ")}, ${tag}` : tag);
              }}
              className="kv-btn-ghost"
            >
              {tag}
            </button>
          ))}
        </div>

        <p className="kv-meta" style={{ marginTop: 28 }}>Output & Settings</p>
        <div style={{ display: "grid", gap: 14, marginTop: 10, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <div>
            <label className="kv-meta" style={{ display: "block", marginBottom: 8 }}>Output Format</label>
            <select className="kv-field" value={outputFormat} onChange={(e) => setOutputFormat(e.target.value)}>
              <option value="summary">Summary - Quick overview of main points</option>
              <option value="detailed">Detailed Notes - Comprehensive study guide</option>
              <option value="flashcards">Flashcards - Interactive flip cards</option>
              <option value="questions">Practice Quiz - Answer questions interactively</option>
            </select>
          </div>

          {(outputFormat === "summary" || outputFormat === "detailed") && (
            <div>
              <label className="kv-meta" style={{ display: "block", marginBottom: 8 }}>Notes Length</label>
              <select className="kv-field" value={notesLength} onChange={(e) => setNotesLength(e.target.value)}>
                <option value="brief">Brief</option>
                <option value="medium">Medium</option>
                <option value="comprehensive">Comprehensive</option>
              </select>
            </div>
          )}
        </div>

        <div style={{ marginTop: 16 }}>
          <label className="kv-meta" style={{ display: "block", marginBottom: 8 }}>Curriculum Course (optional)</label>
          <select className="kv-field" value={curriculumCode} onChange={(event) => setCurriculumCode(event.target.value)}>
            <option value="">None</option>
            {curriculumOptions.map((course) => (
              <option key={course.code} value={course.code}>{course.code} - {course.title}</option>
            ))}
          </select>
          {curriculumCode ? (
            <span className="kv-chip kv-chip-course" style={{ marginTop: 8, display: "inline-block" }}>{curriculumCode}</span>
          ) : null}
        </div>

        {outputFormat === "questions" && (
          <div style={{ marginTop: 16 }}>
            <p className="kv-meta">Practice Quiz Settings</p>
            <div style={{ display: "grid", gap: 14, marginTop: 10, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
              <div>
                <label className="kv-meta" style={{ display: "block", marginBottom: 8 }}>Number of questions</label>
                <select className="kv-field" value={String(quizQuestionCount)} onChange={(e) => setQuizQuestionCount(Number(e.target.value))}>
                  <option value="5">5</option>
                  <option value="10">10</option>
                  <option value="15">15</option>
                  <option value="20">20</option>
                </select>
              </div>
              <div>
                <label className="kv-meta" style={{ display: "block", marginBottom: 8 }}>Difficulty</label>
                <select className="kv-field" value={quizDifficulty} onChange={(e) => setQuizDifficulty(e.target.value)}>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <div>
                <label className="kv-meta" style={{ display: "block", marginBottom: 8 }}>Question type</label>
                <select className="kv-field" value={quizType} onChange={(e) => setQuizType(e.target.value)}>
                  <option value="open-ended">Open Ended</option>
                  <option value="multiple-choice">Multiple Choice</option>
                  <option value="true-false">True/False</option>
                  <option value="calculation">Calculation</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {learningStyle && (
          <div className="kv-row" style={{ marginTop: 8 }}>
            <div>
              <p className="kv-row-title">Adapt to Your Learning Style</p>
              <p className="kv-meta" style={{ marginTop: 6, textTransform: "none", letterSpacing: 0 }}>
                Current style: <span style={{ textTransform: "capitalize" }}>{learningStyle}</span>
              </p>
            </div>
            <label className="kv-meta" style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={adaptContent}
                onChange={(e) => setAdaptContent(e.target.checked)}
              />
            </label>
          </div>
        )}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 22 }}>
          <button
            type="button"
            onClick={() => void handleGenerate()}
            disabled={!inputText || isLoading}
            className="kv-btn"
          >
            {isLoading ? `${loadingMessages[loadingMessageIndex]} (~${estimatedTime}s)` : "Generate Notes"}
          </button>
          {generatedNotes && (
            <>
              <button
                type="button"
                onClick={() => void handleGenerate("regenerate")}
                className="kv-btn-ghost"
                disabled={isLoading}
              >
                {isRegenerating ? "Regenerating..." : "Regenerate"}
              </button>
              <button type="button" onClick={handleClear} className="kv-btn-ghost">
                Clear
              </button>
            </>
          )}
        </div>

        {saveSuccess && !generatedNotes && (
          <p className="kv-meta" style={{ marginTop: 16 }}>
            Saved. <Link href="/my-notes">View all notes</Link>
          </p>
        )}

        {isLoading && !generatedNotes ? (
          <div style={{ marginTop: 24 }}>
            <SkeletonList count={2} />
          </div>
        ) : (
          <div style={{ marginTop: 24 }}>
            {renderOutput()}
            {generatedNotes ? (
              <SendToPanel
                contentType="note"
                contentId={generatedNoteId}
                title={generatedTitle || deriveGeneratedTitle(inputText, generatedNotes)}
                content={generatedNotes}
              />
            ) : null}
          </div>
        )}
      </div>
    </main>
  );
}

