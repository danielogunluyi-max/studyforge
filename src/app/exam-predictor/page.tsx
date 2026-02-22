"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AppNav } from "~/app/_components/app-nav";
import { Button } from "~/app/_components/button";
import { EmptyState } from "~/app/_components/empty-state";
import { SkeletonList } from "~/app/_components/skeleton-loader";

type Prediction = {
  question: string;
  type: "multiple-choice" | "short-answer" | "essay";
  confidence: "High" | "Medium" | "Low";
  reason: string;
};

type Analytics = {
  topicDistribution: Array<{ topic: string; percentage: number }>;
  style: string;
  difficultyTrend: string;
};

export default function ExamPredictorPage() {
  const [examType, setExamType] = useState("Midterm");
  const [pastExamText, setPastExamText] = useState("");
  const [syllabusText, setSyllabusText] = useState("");
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [practiceMode, setPracticeMode] = useState(false);
  const [accuracy, setAccuracy] = useState<Record<number, "correct" | "wrong">>({});

  const confidenceCounts = useMemo(() => {
    const high = predictions.filter((item) => item.confidence === "High").length;
    const medium = predictions.filter((item) => item.confidence === "Medium").length;
    const low = predictions.filter((item) => item.confidence === "Low").length;
    return { high, medium, low };
  }, [predictions]);

  const extractFileText = async (file: File, target: "past" | "syllabus") => {
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    const endpoint = isPdf ? "/api/extract-pdf" : "/api/extract-image";
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(endpoint, { method: "POST", body: formData });
    const data = (await response.json()) as { text?: string; error?: string };

    if (!response.ok || !data.text) {
      throw new Error(data.error ?? "Failed to extract file text");
    }

    if (target === "past") {
      setPastExamText((prev) => `${prev}\n\n${data.text}`.trim());
    } else {
      setSyllabusText((prev) => `${prev}\n\n${data.text}`.trim());
    }
  };

  const generatePredictions = async () => {
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/predict-exam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examType, pastExamText, syllabusText, save: true }),
      });

      const data = (await response.json()) as {
        predictions?: Prediction[];
        analytics?: Analytics;
        error?: string;
      };

      if (!response.ok) {
        setError(data.error ?? "Failed to generate predictions");
        return;
      }

      setPredictions(data.predictions ?? []);
      setAnalytics(data.analytics ?? null);
      setAccuracy({});
      setPracticeMode(false);
      setSuccess("Predictions generated and saved to My Predictions.");
    } catch (predictionError) {
      void predictionError;
      setError("Failed to generate predictions");
    } finally {
      setIsLoading(false);
    }
  };

  const exportStudyGuide = () => {
    const lines = predictions.map(
      (item, index) =>
        `${index + 1}. [${item.confidence}] ${item.question}\nType: ${item.type}\nWhy predicted: ${item.reason}`,
    );

    const content = [
      `StudyForge Exam Predictor - ${examType}`,
      `Generated: ${new Date().toLocaleString()}`,
      "",
      ...(analytics
        ? [
            `Professor style: ${analytics.style}`,
            `Difficulty trend: ${analytics.difficultyTrend}`,
            "",
          ]
        : []),
      ...lines,
    ].join("\n");

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `studyforge-${examType.toLowerCase()}-predictions.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <AppNav />

      <div className="container mx-auto max-w-6xl px-6 py-12">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">AI Exam Predictor 🎯</h1>
            <p className="mt-2 text-lg text-gray-600">
              Analyze past exams and syllabus patterns to predict likely test questions.
            </p>
          </div>
          <Link
            href="/my-predictions"
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            My Predictions
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <label className="mb-2 block text-sm font-semibold text-gray-900">Exam Type</label>
            <select
              value={examType}
              onChange={(event) => setExamType(event.target.value)}
              className="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option>Midterm</option>
              <option>Final</option>
              <option>Quiz</option>
            </select>

            <label className="mb-2 block text-sm font-semibold text-gray-900">Past Exams Content</label>
            <textarea
              value={pastExamText}
              onChange={(event) => setPastExamText(event.target.value)}
              placeholder="Paste past exam questions or drop upload text here..."
              className="h-44 w-full rounded-lg border border-gray-300 p-3 text-sm"
            />

            <div className="mt-2 flex flex-wrap gap-2">
              <input
                type="file"
                accept="application/pdf,image/png,image/jpeg,.pdf,.png,.jpg,.jpeg"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  void extractFileText(file, "past");
                  event.target.value = "";
                }}
                className="text-xs"
                aria-label="Upload past exam"
              />
            </div>

            <label className="mb-2 mt-4 block text-sm font-semibold text-gray-900">Syllabus Content (Optional)</label>
            <textarea
              value={syllabusText}
              onChange={(event) => setSyllabusText(event.target.value)}
              placeholder="Paste syllabus topics, weighting, and objectives..."
              className="h-32 w-full rounded-lg border border-gray-300 p-3 text-sm"
            />

            <div className="mt-2 flex flex-wrap gap-2">
              <input
                type="file"
                accept="application/pdf,image/png,image/jpeg,.pdf,.png,.jpg,.jpeg"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  void extractFileText(file, "syllabus");
                  event.target.value = "";
                }}
                className="text-xs"
                aria-label="Upload syllabus"
              />
            </div>

            <Button
              onClick={() => void generatePredictions()}
              disabled={!pastExamText.trim() || isLoading}
              loading={isLoading}
              fullWidth
              size="md"
              className="mt-4"
            >
              {isLoading ? "Analyzing patterns..." : "Generate Predicted Questions"}
            </Button>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold text-gray-900">Pattern Analytics</h2>
            {analytics ? (
              <>
                <p className="text-sm text-gray-700"><span className="font-semibold">Professor style:</span> {analytics.style}</p>
                <p className="mt-1 text-sm text-gray-700"><span className="font-semibold">Difficulty progression:</span> {analytics.difficultyTrend}</p>
                <div className="mt-4 space-y-2">
                  {analytics.topicDistribution.map((topic) => (
                    <div key={topic.topic}>
                      <div className="mb-1 flex items-center justify-between text-xs text-gray-600">
                        <span>{topic.topic}</span>
                        <span>{topic.percentage}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-200">
                        <div className="h-2 rounded-full bg-blue-600" style={{ width: `${topic.percentage}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-500">Analytics will appear after prediction generation.</p>
            )}

            <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm font-semibold text-gray-800">Confidence Distribution</p>
              <p className="mt-2 text-sm text-gray-600">High: {confidenceCounts.high} • Medium: {confidenceCounts.medium} • Low: {confidenceCounts.low}</p>
            </div>
          </div>
        </div>

        {success && <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">{success}</div>}
        {error && <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}

        {isLoading && (
          <div className="mt-8">
            <SkeletonList count={3} />
          </div>
        )}

        {!isLoading && predictions.length === 0 && !error && (
          <div className="mt-8">
            <EmptyState
              icon="🎯"
              title="No predictions yet"
              description="Upload a past exam to get AI-powered predictions for your upcoming test. Our AI analyzes patterns, difficulty trends, and professor style to give you the best study guide."
            />
          </div>
        )}

        {!isLoading && predictions.length > 0 && (
          <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xl font-semibold text-gray-900">Predicted Questions ({predictions.length})</h2>
              <div className="flex gap-2">
                <Button
                  onClick={() => setPracticeMode((prev) => !prev)}
                  variant="secondary"
                  size="sm"
                >
                  {practiceMode ? "Exit Practice Mode" : "Practice Mode"}
                </Button>
                <Button
                  onClick={exportStudyGuide}
                  size="sm"
                >
                  Export Study Guide
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {predictions.map((prediction, index) => (
                <div key={`${prediction.question}-${index}`} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">{prediction.type}</span>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        prediction.confidence === "High"
                          ? "bg-green-100 text-green-700"
                          : prediction.confidence === "Medium"
                            ? "bg-orange-100 text-orange-700"
                            : "bg-red-100 text-red-700"
                      }`}
                    >
                      {prediction.confidence}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">{index + 1}. {prediction.question}</p>
                  <p className="mt-1 text-xs text-gray-600">Why predicted: {prediction.reason}</p>

                  {practiceMode && (
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => setAccuracy((prev) => ({ ...prev, [index]: "correct" }))}
                        className={`rounded px-2 py-1 text-xs font-semibold ${accuracy[index] === "correct" ? "bg-green-600 text-white" : "bg-green-100 text-green-700"}`}
                      >
                        Got it Right
                      </button>
                      <button
                        onClick={() => setAccuracy((prev) => ({ ...prev, [index]: "wrong" }))}
                        className={`rounded px-2 py-1 text-xs font-semibold ${accuracy[index] === "wrong" ? "bg-red-600 text-white" : "bg-red-100 text-red-700"}`}
                      >
                        Missed It
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
