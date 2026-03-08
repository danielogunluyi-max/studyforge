"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import { useToast } from "~/app/_components/toast";
import { getGradeColor, percentToLetter } from "~/lib/gradeUtils";
import type { Question, QuizData } from "~/types/quiz";

const SUBJECT_SUGGESTIONS = [
  "Math",
  "Science",
  "English",
  "History",
  "French",
  "Physics",
  "Chemistry",
  "Biology",
  "Computer Science",
] as const;

type Difficulty = "easy" | "medium" | "hard";
type QuizType = "multiple_choice" | "true_false" | "short_answer" | "mixed";
type Confidence = "high" | "medium" | "low";

function formatClock(totalSeconds: number) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function normalizeOptionLabel(option: string) {
  return option.replace(/^[A-D]\.\s*/, "").trim();
}

function getConfidenceBadge(confidence: Confidence) {
  if (confidence === "high") return { className: "badge badge-green", label: "✓ High confidence" };
  if (confidence === "medium") return { className: "badge", label: "~ Medium confidence" };
  return { className: "badge badge-red", label: "⚠ Low confidence - review text" };
}

function getStepState(step: 1 | 2 | 3, current: 1 | 2 | 3) {
  if (step < current) return "done";
  if (step === current) return "active";
  return "pending";
}

export default function PhotoQuizPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { showToast } = useToast();

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedText, setExtractedText] = useState("");
  const [textExpanded, setTextExpanded] = useState(false);
  const [confidence, setConfidence] = useState<Confidence>("high");
  const [subject, setSubject] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [quizType, setQuizType] = useState<QuizType>("mixed");
  const [count, setCount] = useState(10);
  const [isGenerating, setIsGenerating] = useState(false);
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [quizStarted, setQuizStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [shortAnswer, setShortAnswer] = useState("");
  const [answered, setAnswered] = useState(false);
  const [isLastCorrect, setIsLastCorrect] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [incorrect, setIncorrect] = useState(0);
  const [quizComplete, setQuizComplete] = useState(false);
  const [wrongQuestions, setWrongQuestions] = useState<Question[]>([]);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isMobile, setIsMobile] = useState(false);

  const [lastCheckedAnswer, setLastCheckedAnswer] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const quizTrackedRef = useRef(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?from=/photo-quiz");
    }
  }, [router, status]);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 960);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  useEffect(() => {
    if (!quizComplete || quizTrackedRef.current) return;
    quizTrackedRef.current = true;
    fetch("/api/nova", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "NOTE_GENERATED" }),
    }).catch(() => {});
  }, [quizComplete]);

  const score = useMemo(() => {
    if (!quiz?.questions.length) return 0;
    return Math.round((correct / quiz.questions.length) * 100);
  }, [correct, quiz]);

  const scoreColor = useMemo(() => getGradeColor(score), [score]);

  const currentQuestion = quiz?.questions[currentIndex] ?? null;

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    if (!selected) return;
    setImageFromFile(selected);
    event.target.value = "";
  };

  const setImageFromFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      showToast("Please choose an image file", "error");
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      showToast("Image must be 15MB or less", "error");
      return;
    }

    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }

    setImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
    setExtractedText("");
    setQuiz(null);
    setQuizStarted(false);
    setQuizComplete(false);
    setStep(1);
    quizTrackedRef.current = false;
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    const dropped = event.dataTransfer.files?.[0];
    if (!dropped) return;
    setImageFromFile(dropped);
  };

  const clearImage = () => {
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }

    setImageFile(null);
    setImagePreviewUrl("");
    setExtractedText("");
    setTextExpanded(false);
    setQuiz(null);
    setQuizStarted(false);
    setQuizComplete(false);
    setCurrentIndex(0);
    setCorrect(0);
    setIncorrect(0);
    setStep(1);
    setWrongQuestions([]);
    quizTrackedRef.current = false;
  };

  const handleCameraCapture = () => {
    cameraInputRef.current?.click();
  };

  const handleExtract = async () => {
    if (!imageFile) {
      showToast("Upload a photo first", "error");
      return;
    }

    setIsExtracting(true);
    try {
      const form = new FormData();
      form.append("image", imageFile);

      const response = await fetch("/api/photo-quiz/extract", {
        method: "POST",
        body: form,
      });

      const payload = (await response.json().catch(() => ({}))) as {
        extractedText?: string;
        confidence?: Confidence;
        error?: string;
      };

      if (!response.ok) {
        showToast(payload.error ?? "Failed to extract text", "error");
        return;
      }

      const text = String(payload.extractedText ?? "").trim();
      if (!text) {
        showToast("No readable text detected", "error");
        return;
      }

      setExtractedText(text);
      setConfidence(payload.confidence === "low" || payload.confidence === "medium" || payload.confidence === "high" ? payload.confidence : "medium");
      setTextExpanded(true);
      setStep(2);
      showToast("Text extracted", "success");
    } catch {
      showToast("Failed to read image", "error");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleGenerate = async () => {
    if (!extractedText.trim()) {
      showToast("Extract text first", "error");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch("/api/photo-quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          extractedText,
          subject: subject.trim() || "General",
          difficulty,
          count,
          quizType,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        quiz?: QuizData;
        error?: string;
      };

      if (!response.ok || !payload.quiz) {
        showToast(payload.error ?? "Failed to generate quiz", "error");
        return;
      }

      setQuiz(payload.quiz);
      setQuizStarted(false);
      setQuizComplete(false);
      setCurrentIndex(0);
      setCorrect(0);
      setIncorrect(0);
      setAnswered(false);
      setSelectedAnswer("");
      setShortAnswer("");
      setWrongQuestions([]);
      setStep(3);
      quizTrackedRef.current = false;
      showToast("Quiz generated", "success");
    } catch {
      showToast("Failed to generate quiz", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  const startQuiz = () => {
    setQuizStarted(true);
    setQuizComplete(false);
    setCurrentIndex(0);
    setAnswered(false);
    setSelectedAnswer("");
    setShortAnswer("");
    setLastCheckedAnswer("");
    setCorrect(0);
    setIncorrect(0);
    setWrongQuestions([]);
    quizTrackedRef.current = false;
  };

  const registerAnswer = (question: Question, value: string, isCorrectAnswer: boolean) => {
    setAnswered(true);
    setIsLastCorrect(isCorrectAnswer);
    setLastCheckedAnswer(value);
    if (isCorrectAnswer) {
      setCorrect((prev) => prev + 1);
    } else {
      setIncorrect((prev) => prev + 1);
      setWrongQuestions((prev) => [...prev, question]);
    }
  };

  const handleAnswer = (value: string) => {
    if (!currentQuestion || answered) return;

    setSelectedAnswer(value);
    const expected = String(currentQuestion.correct ?? "").trim();
    const normalizedValue = value.trim().toUpperCase();
    const normalizedExpected = expected.trim().toUpperCase();
    registerAnswer(currentQuestion, value, normalizedValue === normalizedExpected);
  };

  const handleShortAnswer = () => {
    if (!currentQuestion || answered) return;
    const keywords = currentQuestion.keywords ?? [];

    const isCorrectAnswer = keywords.some((kw) => shortAnswer.toLowerCase().includes(String(kw).toLowerCase()));
    registerAnswer(currentQuestion, shortAnswer, isCorrectAnswer);
  };

  const nextQuestion = () => {
    if (!quiz) return;

    if (currentIndex < quiz.questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setAnswered(false);
      setSelectedAnswer("");
      setShortAnswer("");
      setLastCheckedAnswer("");
      return;
    }

    setQuizComplete(true);
    setQuizStarted(false);
    setStep(3);
  };

  const retryQuiz = () => {
    if (!quiz) return;
    setQuiz({ ...quiz, questions: [...quiz.questions] });
    startQuiz();
  };

  const retryWrong = () => {
    if (!wrongQuestions.length) return;
    setQuiz({
      title: `${quiz?.title ?? "Quiz"} (Retry Wrong)` ,
      questions: wrongQuestions.map((q, index) => ({ ...q, id: String(index + 1) })),
    });
    startQuiz();
  };

  const saveAsNote = async () => {
    if (!quiz) return;

    const noteContent =
      `# ${quiz.title}\n\n` +
      quiz.questions
        .map((q, i) => {
          const options = q.options ? `${q.options.map((o) => `- ${o}`).join("\n")}\n` : "";
          const answerLine = `**Answer:** ${q.correct ?? q.answer ?? "N/A"}\n`;
          const explanation = q.explanation ? `**Explanation:** ${q.explanation}\n` : "";
          return `**Q${i + 1}:** ${q.question}\n${options}${answerLine}${explanation}\n`;
        })
        .join("\n");

    const response = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: quiz.title,
        content: noteContent,
        format: "quiz",
      }),
    }).catch(() => null);

    if (!response?.ok) {
      showToast("Failed to save quiz as note", "error");
      return;
    }

    showToast("Quiz saved to notes", "success");
  };

  const generateNew = () => {
    clearImage();
    setSubject("");
    setDifficulty("medium");
    setQuizType("mixed");
    setCount(10);
  };

  const stepIndicator = (num: 1 | 2 | 3, label: string) => {
    const state = getStepState(num, step);
    const background = state === "active" ? "var(--accent-blue)" : state === "done" ? "var(--accent-green)" : "var(--bg-elevated)";
    const color = state === "pending" ? "var(--text-muted)" : "var(--text-primary)";

    return (
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background,
            color,
            fontWeight: 700,
            fontSize: "12px",
            border: "1px solid var(--border-default)",
          }}
        >
          {num}
        </div>
        <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>{label}</span>
      </div>
    );
  };

  if (status === "loading") {
    return <main style={{ minHeight: "100vh", background: "var(--bg-base)" }} />;
  }

  if (!session) {
    return null;
  }

  const confidenceBadge = getConfidenceBadge(confidence);

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg-base)", padding: "24px 16px 96px" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ marginBottom: "32px" }}>
          <h1 className="text-title">Photo to Quiz 📸</h1>
          <p style={{ color: "var(--text-secondary)", marginTop: "4px" }}>
            Snap any textbook page and get an instant quiz
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
            gap: "24px",
            alignItems: "start",
          }}
        >
          <section className="card" style={{ padding: "20px" }}>
            <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", marginBottom: "20px" }}>
              {stepIndicator(1, "Upload Photo")}
              {stepIndicator(2, "Configure Quiz")}
              {stepIndicator(3, "Take Quiz")}
            </div>

            <div
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${isDragOver ? "var(--accent-blue)" : "var(--border-strong)"}`,
                borderRadius: "12px",
                padding: "40px 24px",
                textAlign: "center",
                cursor: "pointer",
                background: isDragOver ? "var(--bg-hover)" : "var(--bg-elevated)",
                transition: "all 0.2s ease",
              }}
            >
              <div style={{ fontSize: "40px", marginBottom: "12px" }}>📸</div>
              <p style={{ color: "var(--text-primary)", fontWeight: 600, marginBottom: "4px" }}>
                Drop textbook photo here
              </p>
              <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>or click to browse</p>
              <p style={{ color: "var(--text-muted)", fontSize: "11px", marginTop: "8px" }}>
                JPG, PNG, WEBP - max 15MB
              </p>
            </div>

            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileSelect} />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: "none" }}
              onChange={handleFileSelect}
            />

            <button className="btn btn-ghost" style={{ width: "100%", marginTop: "8px", gap: "8px" }} onClick={handleCameraCapture}>
              📷 Use Camera
            </button>

            {imagePreviewUrl && (
              <div style={{ position: "relative", marginTop: "16px" }}>
                <img
                  src={imagePreviewUrl}
                  alt="Textbook page"
                  style={{
                    width: "100%",
                    borderRadius: "8px",
                    border: "1px solid var(--border-default)",
                    maxHeight: "300px",
                    objectFit: "contain",
                    background: "var(--bg-elevated)",
                  }}
                />
                <button
                  onClick={clearImage}
                  style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-default)",
                    color: "var(--text-primary)",
                    borderRadius: "50%",
                    width: 28,
                    height: 28,
                    cursor: "pointer",
                    fontSize: "14px",
                  }}
                  aria-label="Clear selected image"
                >
                  ✕
                </button>
              </div>
            )}

            {imageFile && !extractedText && (
              <button className="btn btn-primary" style={{ width: "100%", marginTop: "12px" }} onClick={handleExtract} disabled={isExtracting}>
                {isExtracting ? "⏳ Reading image..." : "🔍 Extract Text →"}
              </button>
            )}

            {extractedText && (
              <div className="card" style={{ marginTop: "16px", padding: "14px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", marginBottom: textExpanded ? "10px" : 0 }}>
                  <button
                    type="button"
                    onClick={() => setTextExpanded((prev) => !prev)}
                    style={{
                      border: "none",
                      background: "transparent",
                      color: "var(--text-primary)",
                      cursor: "pointer",
                      fontWeight: 600,
                      fontSize: "14px",
                    }}
                  >
                    Extracted Text {textExpanded ? "▴" : "▾"}
                  </button>
                  <span className={confidenceBadge.className}>{confidenceBadge.label}</span>
                </div>

                {textExpanded && (
                  <textarea
                    className="textarea"
                    value={extractedText}
                    onChange={(event) => setExtractedText(event.target.value)}
                    style={{ width: "100%", minHeight: "160px" }}
                  />
                )}
              </div>
            )}

            {extractedText && (
              <div style={{ marginTop: "16px", display: "grid", gap: "12px" }}>
                <input
                  className="input"
                  placeholder="Subject (e.g. Biology, Chapter 4)"
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  list="photo-quiz-subjects"
                />
                <datalist id="photo-quiz-subjects">
                  {SUBJECT_SUGGESTIONS.map((item) => (
                    <option key={item} value={item} />
                  ))}
                </datalist>

                <div>
                  <p className="text-label" style={{ marginBottom: "8px" }}>Difficulty</p>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {([
                      { value: "easy", label: "Easy", color: "var(--accent-green)" },
                      { value: "medium", label: "Medium", color: "var(--accent-orange)" },
                      { value: "hard", label: "Hard", color: "var(--accent-red)" },
                    ] as const).map((item) => {
                      const active = difficulty === item.value;
                      return (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() => setDifficulty(item.value)}
                          style={{
                            border: "1px solid var(--border-default)",
                            borderRadius: "999px",
                            padding: "6px 12px",
                            background: active ? item.color : "var(--bg-elevated)",
                            color: active ? "var(--text-primary)" : "var(--text-muted)",
                            fontSize: "12px",
                            cursor: "pointer",
                          }}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="text-label" style={{ marginBottom: "8px" }}>Quiz Type</p>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {([
                      { value: "multiple_choice", label: "Multiple Choice" },
                      { value: "true_false", label: "True/False" },
                      { value: "short_answer", label: "Short Answer" },
                      { value: "mixed", label: "Mixed" },
                    ] as const).map((item) => {
                      const active = quizType === item.value;
                      return (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() => setQuizType(item.value)}
                          style={{
                            border: "1px solid var(--border-default)",
                            borderRadius: "999px",
                            padding: "6px 12px",
                            background: active ? "var(--accent-blue)" : "var(--bg-elevated)",
                            color: active ? "var(--text-primary)" : "var(--text-muted)",
                            fontSize: "12px",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          {item.label}
                          {item.value === "mixed" && <span className="badge badge-blue">Recommended</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-label">Questions: {count}</label>
                  <input
                    type="range"
                    min="5"
                    max="20"
                    step="1"
                    value={count}
                    onChange={(event) => setCount(Number.parseInt(event.target.value, 10))}
                    style={{ width: "100%", accentColor: "var(--accent-blue)", marginTop: "8px" }}
                  />
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "11px",
                      color: "var(--text-muted)",
                    }}
                  >
                    <span>5 quick</span>
                    <span>20 thorough</span>
                  </div>
                </div>

                <button className="btn btn-primary" style={{ width: "100%" }} onClick={handleGenerate} disabled={isGenerating || !extractedText.trim()}>
                  {isGenerating ? "⚡ Generating quiz..." : "⚡ Generate Quiz →"}
                </button>
              </div>
            )}
          </section>

          <section>
            {!quiz && !isGenerating && (
              <div
                className="card"
                style={{
                  padding: "60px 24px",
                  textAlign: "center",
                  minHeight: "500px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div style={{ fontSize: "56px", marginBottom: "16px" }}>🎯</div>
                <p style={{ color: "var(--text-secondary)", fontSize: "15px" }}>Upload a photo to generate your quiz</p>
                <p style={{ color: "var(--text-muted)", fontSize: "13px", marginTop: "8px" }}>
                  Works with textbooks, worksheets, slides, handwritten notes
                </p>
              </div>
            )}

            {isGenerating && (
              <div className="card" style={{ padding: "24px", minHeight: "500px" }}>
                {[...Array(5)].map((_, idx) => (
                  <div key={idx} className="skeleton" style={{ height: "18px", marginBottom: "12px", borderRadius: "8px" }} />
                ))}
              </div>
            )}

            {quiz && !quizStarted && !quizComplete && !isGenerating && (
              <div className="card" style={{ padding: "24px", textAlign: "center" }}>
                <div style={{ fontSize: "48px", marginBottom: "12px" }}>🎯</div>
                <h2 style={{ fontWeight: 700, fontSize: "20px", color: "var(--text-primary)" }}>{quiz.title}</h2>
                <p style={{ color: "var(--text-secondary)", margin: "8px 0 20px" }}>
                  {quiz.questions.length} questions • {difficulty} difficulty
                </p>
                <button className="btn btn-primary" onClick={startQuiz}>
                  Start Quiz →
                </button>
              </div>
            )}

            {quiz && quizStarted && !quizComplete && currentQuestion && (
              <div>
                <div style={{ marginBottom: "24px" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "13px",
                      color: "var(--text-secondary)",
                      marginBottom: "8px",
                    }}
                  >
                    <span>
                      Question {currentIndex + 1} of {quiz.questions.length}
                    </span>
                    <span>
                      ✓ {correct} ✗ {incorrect}
                    </span>
                  </div>
                  <div style={{ height: "4px", background: "var(--border-default)", borderRadius: "2px" }}>
                    <div
                      style={{
                        height: "100%",
                        borderRadius: "2px",
                        width: `${(currentIndex / quiz.questions.length) * 100}%`,
                        background: "var(--accent-blue)",
                        transition: "width 0.3s ease",
                      }}
                    />
                  </div>
                </div>

                <div className="card" style={{ padding: "24px", marginBottom: "16px" }}>
                  <p
                    style={{
                      fontSize: "16px",
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      lineHeight: 1.5,
                      marginBottom: "20px",
                    }}
                  >
                    {currentQuestion.question}
                  </p>

                  {currentQuestion.options?.length ? (
                    <div>
                      {currentQuestion.options.map((opt, i) => {
                        const letter = ["A", "B", "C", "D"][i] ?? "";
                        const isSelected = selectedAnswer === letter;
                        const isCorrect = answered && letter === currentQuestion.correct;
                        const isWrong = answered && isSelected && letter !== currentQuestion.correct;

                        return (
                          <button
                            key={`${currentQuestion.id}-${letter}`}
                            onClick={() => !answered && handleAnswer(letter)}
                            style={{
                              width: "100%",
                              textAlign: "left",
                              padding: "12px 16px",
                              marginBottom: "8px",
                              borderRadius: "10px",
                              cursor: answered ? "default" : "pointer",
                              border: `1px solid ${
                                isCorrect
                                  ? "var(--accent-green)"
                                  : isWrong
                                    ? "var(--accent-red)"
                                    : isSelected
                                      ? "var(--accent-blue)"
                                      : "var(--border-default)"
                              }`,
                              background: isCorrect
                                ? "var(--bg-hover)"
                                : isWrong
                                  ? "var(--bg-hover)"
                                  : isSelected
                                    ? "var(--glow-blue)"
                                    : "var(--bg-elevated)",
                              color: "var(--text-primary)",
                              fontSize: "14px",
                              transition: "all 0.2s ease",
                              display: "flex",
                              alignItems: "center",
                              gap: "10px",
                            }}
                          >
                            <span
                              style={{
                                width: 24,
                                height: 24,
                                borderRadius: "50%",
                                flexShrink: 0,
                                background: isCorrect
                                  ? "var(--accent-green)"
                                  : isWrong
                                    ? "var(--accent-red)"
                                    : "var(--bg-card)",
                                border: "1px solid var(--border-strong)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "11px",
                                fontWeight: 700,
                                color: "var(--text-primary)",
                              }}
                            >
                              {isCorrect ? "✓" : isWrong ? "✗" : letter}
                            </span>
                            {normalizeOptionLabel(opt)}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}

                  {!currentQuestion.options &&
                  (currentQuestion.correct === "True" || currentQuestion.correct === "False") ? (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                      {["True", "False"].map((opt) => {
                        const isSelected = selectedAnswer === opt;
                        const isCorrect = answered && opt === currentQuestion.correct;
                        const isWrong = answered && isSelected && opt !== currentQuestion.correct;
                        return (
                          <button
                            key={opt}
                            onClick={() => !answered && handleAnswer(opt)}
                            style={{
                              padding: "16px",
                              borderRadius: "10px",
                              fontWeight: 600,
                              fontSize: "15px",
                              cursor: answered ? "default" : "pointer",
                              border: `1px solid ${
                                isCorrect
                                  ? "var(--accent-green)"
                                  : isWrong
                                    ? "var(--accent-red)"
                                    : "var(--border-default)"
                              }`,
                              background: isCorrect
                                ? "var(--bg-hover)"
                                : isWrong
                                  ? "var(--bg-hover)"
                                  : "var(--bg-elevated)",
                              color: opt === "True" ? "var(--accent-green)" : "var(--accent-red)",
                              transition: "all 0.2s ease",
                            }}
                          >
                            {opt === "True" ? "✓ True" : "✗ False"}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}

                  {currentQuestion.keywords?.length ? (
                    <div>
                      <textarea
                        className="textarea"
                        value={shortAnswer}
                        onChange={(event) => setShortAnswer(event.target.value)}
                        placeholder="Type your answer..."
                        disabled={answered}
                        style={{ width: "100%", marginBottom: "8px" }}
                      />
                      {!answered && (
                        <button className="btn btn-primary" onClick={handleShortAnswer}>
                          Submit Answer
                        </button>
                      )}
                    </div>
                  ) : null}
                </div>

                {answered && (
                  <div
                    className="animate-fade-in-up"
                    style={{
                      background: isLastCorrect ? "var(--bg-hover)" : "var(--bg-hover)",
                      border: `1px solid ${isLastCorrect ? "var(--accent-green)" : "var(--accent-red)"}`,
                      borderRadius: "10px",
                      padding: "12px 16px",
                      marginBottom: "16px",
                    }}
                  >
                    <p
                      style={{
                        fontWeight: 600,
                        color: isLastCorrect ? "var(--accent-green)" : "var(--accent-red)",
                        marginBottom: "4px",
                      }}
                    >
                      {isLastCorrect ? "✓ Correct!" : "✗ Not quite"}
                    </p>
                    <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                      {currentQuestion.explanation ??
                        `Correct answer: ${currentQuestion.correct ?? currentQuestion.answer ?? "N/A"}`}
                      {!isLastCorrect && currentQuestion.keywords?.length
                        ? `\nYour answer: ${lastCheckedAnswer || "(empty)"}`
                        : ""}
                    </p>
                  </div>
                )}

                {answered && (
                  <button className="btn btn-primary" style={{ width: "100%" }} onClick={nextQuestion}>
                    {currentIndex < quiz.questions.length - 1 ? "Next Question →" : "See Results →"}
                  </button>
                )}
              </div>
            )}

            {quiz && quizComplete && (
              <div className="card animate-fade-in-up" style={{ padding: "32px", textAlign: "center" }}>
                <div
                  style={{
                    width: 100,
                    height: 100,
                    borderRadius: "50%",
                    margin: "0 auto 20px",
                    background: `conic-gradient(${scoreColor} ${score}%, var(--border-default) 0)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: "50%",
                      background: "var(--bg-card)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "20px",
                      fontWeight: 800,
                      color: scoreColor,
                    }}
                  >
                    {score}%
                  </div>
                </div>

                <h2 style={{ fontWeight: 700, fontSize: "22px", color: "var(--text-primary)" }}>
                  {score >= 80 ? "🏆 Excellent!" : score >= 60 ? "👍 Good Work!" : "📚 Keep Studying!"}
                </h2>
                <p style={{ color: "var(--text-secondary)", margin: "8px 0 24px" }}>
                  {correct} correct out of {quiz.questions.length} questions
                </p>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3,1fr)",
                    gap: "12px",
                    marginBottom: "24px",
                  }}
                >
                  <div className="card" style={{ padding: "12px" }}>
                    <div style={{ fontSize: "20px", fontWeight: 800, color: "var(--accent-green)" }}>{correct}</div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Correct</div>
                  </div>
                  <div className="card" style={{ padding: "12px" }}>
                    <div style={{ fontSize: "20px", fontWeight: 800, color: "var(--accent-red)" }}>{incorrect}</div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Wrong</div>
                  </div>
                  <div className="card" style={{ padding: "12px" }}>
                    <div style={{ fontSize: "20px", fontWeight: 800, color: "var(--accent-blue)" }}>{percentToLetter(score)}</div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Grade</div>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <button className="btn btn-primary" onClick={retryQuiz}>
                    🔄 Retry Quiz
                  </button>
                  <button className="btn btn-ghost" onClick={retryWrong} disabled={incorrect === 0}>
                    ✗ Retry Wrong Only ({incorrect})
                  </button>
                  <button className="btn btn-ghost" onClick={saveAsNote}>
                    💾 Save Quiz as Note
                  </button>
                  <button className="btn btn-ghost" onClick={generateNew}>
                    📸 Quiz a New Photo
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
