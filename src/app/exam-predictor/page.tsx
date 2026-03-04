"use client";

import { useEffect, useMemo, useState } from "react";
import { AppNav } from "~/app/_components/app-nav";
import { Button } from "~/app/_components/button";
import Listbox from "~/app/_components/Listbox";
import { EmptyState } from "~/app/_components/empty-state";
import { SkeletonList } from "~/app/_components/skeleton-loader";

type Confidence = "High" | "Medium" | "Low";

type SectionConfig = {
  id: string;
  sectionName: string;
  questionType: string;
  questionCount: number;
  marksPerQuestion: number;
};

type CustomPreset = {
  id: string;
  name: string;
  sections: SectionConfig[];
};

type TopicWeight = {
  topic: string;
  percentage: number;
  likelihood: Confidence;
};

type Prediction = {
  id: string;
  question: string;
  type: string;
  confidence: Confidence;
  reason: string;
  marks: number;
  sectionName: string;
  topic: string;
};

type PatternAnalysis = {
  repeatedTopics: string[];
  commonQuestionTypes: string[];
  averageDifficultyTrend: string;
  gapsInCoverage: string[];
};

type Analytics = {
  topicDistribution: TopicWeight[];
  style: string;
  difficultyTrend: string;
  patternAnalysis: PatternAnalysis;
};

type MarkSchemeItem = {
  questionId: string;
  question: string;
  totalMarks: number;
  expectedAnswerPoints: string[];
  marksBreakdown: string[];
  commonMistakes: string[];
};

type StudyPlanDay = {
  day: string;
  focusTopics: string[];
  tasks: string[];
  hours: number;
};

type SubjectType = "Math" | "Science" | "English" | "History" | "Other";

const PRESET_KEY = "studyforge:exam-custom-presets";

const testPresets = [
  "Multiple Choice Only",
  "Essay Based",
  "Math/Calculation",
  "Mixed (Standard)",
  "Custom",
];

const sectionQuestionTypes = [
  "Multiple Choice",
  "True/False",
  "Short Answer",
  "Long Answer/Essay",
  "Calculation",
  "Fill in the Blank",
  "Diagram/Explain",
];

const presetSections: Record<string, SectionConfig[]> = {
  "Multiple Choice Only": [
    { id: "mc-1", sectionName: "Part A", questionType: "Multiple Choice", questionCount: 25, marksPerQuestion: 1 },
  ],
  "Essay Based": [
    { id: "es-1", sectionName: "Part A", questionType: "Short Answer", questionCount: 6, marksPerQuestion: 4 },
    { id: "es-2", sectionName: "Part B", questionType: "Long Answer/Essay", questionCount: 3, marksPerQuestion: 10 },
  ],
  "Math/Calculation": [
    { id: "ma-1", sectionName: "Part A", questionType: "Calculation", questionCount: 12, marksPerQuestion: 3 },
    { id: "ma-2", sectionName: "Part B", questionType: "Short Answer", questionCount: 6, marksPerQuestion: 4 },
  ],
  "Mixed (Standard)": [
    { id: "mx-1", sectionName: "Part A", questionType: "Multiple Choice", questionCount: 15, marksPerQuestion: 1 },
    { id: "mx-2", sectionName: "Part B", questionType: "Short Answer", questionCount: 6, marksPerQuestion: 4 },
    { id: "mx-3", sectionName: "Part C", questionType: "Long Answer/Essay", questionCount: 2, marksPerQuestion: 8 },
  ],
};

function uid(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

function toParagraphs(text: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function confidenceColor(confidence: Confidence) {
  if (confidence === "High") return "bg-green-100 text-green-700";
  if (confidence === "Medium") return "bg-yellow-100 text-yellow-700";
  return "bg-red-100 text-red-700";
}

function likelihoodBarColor(likelihood: Confidence) {
  if (likelihood === "High") return "bg-green-500";
  if (likelihood === "Medium") return "bg-yellow-500";
  return "bg-red-500";
}

export default function ExamPredictorPage() {
  const [step, setStep] = useState(1);

  const [examType, setExamType] = useState("Final");
  const [pastExamText, setPastExamText] = useState("");
  const [syllabusText, setSyllabusText] = useState("");
  const [uploadedPastExams, setUploadedPastExams] = useState<string[]>([]);

  const [testPreset, setTestPreset] = useState("Mixed (Standard)");
  const [customSections, setCustomSections] = useState<SectionConfig[]>(presetSections["Mixed (Standard)"] ?? []);
  const [savedCustomPresets, setSavedCustomPresets] = useState<CustomPreset[]>([]);

  const [predictionCountOption, setPredictionCountOption] = useState("10");
  const [customPredictionCount, setCustomPredictionCount] = useState(12);
  const [difficultyLevel, setDifficultyLevel] = useState("Exam-Level");
  const [subjectType, setSubjectType] = useState<SubjectType>("Other");
  const [curriculum, setCurriculum] = useState("Custom");

  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [totalMarks, setTotalMarks] = useState(0);

  const [markScheme, setMarkScheme] = useState<MarkSchemeItem[]>([]);
  const [studyPlan, setStudyPlan] = useState<StudyPlanDay[]>([]);
  const [studyPlanSummary, setStudyPlanSummary] = useState("");

  const [examDate, setExamDate] = useState("");
  const [hoursPerDay, setHoursPerDay] = useState(2);

  const [simulationRunning, setSimulationRunning] = useState(false);
  const [simulationCompleted, setSimulationCompleted] = useState(false);
  const [simulationIndex, setSimulationIndex] = useState(0);
  const [simulationAnswers, setSimulationAnswers] = useState<Record<string, string>>({});
  const [simulationTimeLimit, setSimulationTimeLimit] = useState(60);
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState(0);
  const [weakTopics, setWeakTopics] = useState<string[]>([]);
  const [simulationScore, setSimulationScore] = useState(0);

  const [isLoading, setIsLoading] = useState(false);
  const [isMarkSchemeLoading, setIsMarkSchemeLoading] = useState(false);
  const [isStudyPlanLoading, setIsStudyPlanLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PRESET_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as CustomPreset[];
      if (Array.isArray(parsed)) {
        setSavedCustomPresets(parsed);
      }
    } catch {
      setSavedCustomPresets([]);
    }
  }, []);

  useEffect(() => {
    if (!simulationRunning) return;
    const timer = window.setInterval(() => {
      setTimeRemainingSeconds((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          finishSimulation();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [simulationRunning]);

  const totalConfiguredMarks = useMemo(() => {
    return customSections.reduce((sum, section) => sum + section.questionCount * section.marksPerQuestion, 0);
  }, [customSections]);

  const predictionCount = useMemo(() => {
    if (predictionCountOption === "custom") return Math.max(5, customPredictionCount);
    return Number(predictionCountOption);
  }, [predictionCountOption, customPredictionCount]);

  const detectedStep = useMemo(() => {
    if (predictions.length > 0) return 4;
    if (pastExamText.trim() && (testPreset || subjectType)) return 3;
    if (pastExamText.trim()) return 2;
    return 1;
  }, [predictions.length, pastExamText, testPreset, subjectType]);

  useEffect(() => {
    setStep(detectedStep);
  }, [detectedStep]);

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
      setUploadedPastExams((prev) => [...prev, file.name]);
    } else {
      setSyllabusText((prev) => `${prev}\n\n${data.text}`.trim());
    }
  };

  const applyPreset = (preset: string) => {
    setTestPreset(preset);
    if (preset !== "Custom") {
      setCustomSections((presetSections[preset] ?? []).map((section) => ({ ...section, id: uid("sec") })));
    }
  };

  const addSection = () => {
    setCustomSections((prev) => [
      ...prev,
      {
        id: uid("sec"),
        sectionName: `Part ${String.fromCharCode(65 + prev.length)}`,
        questionType: "Short Answer",
        questionCount: 3,
        marksPerQuestion: 2,
      },
    ]);
  };

  const updateSection = (id: string, patch: Partial<SectionConfig>) => {
    setCustomSections((prev) => prev.map((section) => (section.id === id ? { ...section, ...patch } : section)));
  };

  const removeSection = (id: string) => {
    setCustomSections((prev) => prev.filter((section) => section.id !== id));
  };

  const saveCustomPreset = () => {
    const name = prompt("Custom preset name")?.trim();
    if (!name) return;

    const item: CustomPreset = {
      id: uid("preset"),
      name,
      sections: customSections,
    };

    const next = [...savedCustomPresets, item];
    setSavedCustomPresets(next);
    localStorage.setItem(PRESET_KEY, JSON.stringify(next));
  };

  const loadCustomPreset = (id: string) => {
    const preset = savedCustomPresets.find((item) => item.id === id);
    if (!preset) return;
    setTestPreset("Custom");
    setCustomSections(preset.sections.map((section) => ({ ...section, id: uid("sec") })));
  };

  const generatePredictions = async () => {
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/predict-exam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "predict",
          examType,
          pastExamText,
          syllabusText,
          predictionCount,
          difficultyLevel,
          subjectType,
          curriculum,
          testPreset,
          customSections,
          save: true,
        }),
      });

      const data = (await response.json()) as {
        analytics?: Analytics;
        predictions?: Prediction[];
        totalMarks?: number;
        error?: string;
      };

      if (!response.ok) {
        setError(data.error ?? "Failed to generate predictions");
        return;
      }

      setPredictions(data.predictions ?? []);
      setAnalytics(data.analytics ?? null);
      setTotalMarks(data.totalMarks ?? 0);
      setMarkScheme([]);
      setStudyPlan([]);
      setStudyPlanSummary("");
      setSimulationRunning(false);
      setSimulationCompleted(false);
      setSimulationAnswers({});
      setSimulationIndex(0);
      setSuccess("Predictions generated and saved to My Predictions.");
    } catch {
      setError("Failed to generate predictions");
    } finally {
      setIsLoading(false);
    }
  };

  const generateMarkScheme = async () => {
    setIsMarkSchemeLoading(true);
    setError("");

    try {
      const response = await fetch("/api/predict-exam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "mark-scheme",
          predictions,
          customSections,
        }),
      });

      const data = (await response.json()) as { markScheme?: MarkSchemeItem[]; error?: string };
      if (!response.ok) {
        setError(data.error ?? "Failed to generate mark scheme");
        return;
      }

      setMarkScheme(data.markScheme ?? []);
    } catch {
      setError("Failed to generate mark scheme");
    } finally {
      setIsMarkSchemeLoading(false);
    }
  };

  const generateStudyPlan = async () => {
    if (!examDate) {
      setError("Select exam date first.");
      return;
    }

    setIsStudyPlanLoading(true);
    setError("");

    try {
      const response = await fetch("/api/predict-exam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "study-plan",
          predictions,
          topicDistribution: analytics?.topicDistribution ?? [],
          examDate,
          hoursPerDay,
        }),
      });

      const data = (await response.json()) as {
        studyPlan?: StudyPlanDay[];
        summary?: string;
        error?: string;
      };

      if (!response.ok) {
        setError(data.error ?? "Failed to generate study plan");
        return;
      }

      setStudyPlan(data.studyPlan ?? []);
      setStudyPlanSummary(data.summary ?? "");
    } catch {
      setError("Failed to generate study plan");
    } finally {
      setIsStudyPlanLoading(false);
    }
  };

  const startSimulation = () => {
    if (!predictions.length) return;
    setSimulationAnswers({});
    setSimulationScore(0);
    setWeakTopics([]);
    setSimulationCompleted(false);
    setSimulationIndex(0);
    setTimeRemainingSeconds(Math.max(5, simulationTimeLimit) * 60);
    setSimulationRunning(true);
  };

  const finishSimulation = () => {
    setSimulationRunning(false);

    const results = predictions.map((question) => {
      const answer = (simulationAnswers[question.id] ?? "").trim();
      const score = answer.length >= 25 ? question.marks : answer.length >= 10 ? Math.ceil(question.marks / 2) : 0;
      return {
        topic: question.topic,
        marks: question.marks,
        score,
      };
    });

    const topicTotals = new Map<string, { scored: number; possible: number }>();
    for (const item of results) {
      const current = topicTotals.get(item.topic) ?? { scored: 0, possible: 0 };
      current.scored += item.score;
      current.possible += item.marks;
      topicTotals.set(item.topic, current);
    }

    const weak = Array.from(topicTotals.entries())
      .filter(([, value]) => value.possible > 0 && value.scored / value.possible < 0.6)
      .map(([topic]) => topic)
      .slice(0, 6);

    setWeakTopics(weak);
    setSimulationScore(results.reduce((sum, item) => sum + item.score, 0));
    setSimulationCompleted(true);
  };

  const exportPredictedExam = () => {
    const lines: string[] = [];
    lines.push(`StudyForge Predicted ${examType}`);
    lines.push(`Generated: ${new Date().toLocaleString()}`);
    lines.push(`Total Marks: ${totalMarks}`);
    lines.push("");

    for (const question of predictions) {
      lines.push(`[${question.sectionName}] (${question.marks} marks) ${question.question}`);
      lines.push(`Type: ${question.type} | Topic: ${question.topic} | Confidence: ${question.confidence}`);
      lines.push("");
    }

    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `studyforge-${examType.toLowerCase()}-predicted-exam.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const currentQuestion = predictions[simulationIndex] ?? null;

  return (
    <main className="min-h-screen bg-gray-50">
      <AppNav />

      <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">AI Exam Predictor</h1>
            <p className="mt-2 text-base text-gray-600 sm:text-lg">Premium prediction engine with structure builder, confidence intelligence, and simulation mode.</p>
          </div>
          <Button href="/my-predictions" variant="secondary" size="sm">My Predictions</Button>
        </div>

        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="overflow-x-auto">
            <div className="flex min-w-max gap-2 sm:grid sm:min-w-0 sm:grid-cols-4">
            {[
              { id: 1, label: "Step 1", desc: "Upload" },
              { id: 2, label: "Step 2", desc: "Configure" },
              { id: 3, label: "Step 3", desc: "Generate" },
              { id: 4, label: "Step 4", desc: "Results" },
            ].map((item) => (
              <div key={item.id} className={`w-[132px] shrink-0 rounded-lg border px-3 py-2 sm:w-auto sm:shrink ${step >= item.id ? "border-blue-200 bg-blue-50" : "border-gray-200 bg-gray-50"}`}>
                <p className={`text-xs font-semibold ${step >= item.id ? "text-blue-700" : "text-gray-500"}`}>{item.label}</p>
                <p className="text-sm font-medium text-gray-800">{item.desc}</p>
              </div>
            ))}
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
          <div className="space-y-6">
            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-3 text-lg font-semibold text-gray-900">Step 1 • Upload & Source Content</h2>

              <label className="mb-1 block text-sm font-semibold text-gray-900">Past Exams (multiple uploads supported)</label>
              <textarea
                value={pastExamText}
                onChange={(event) => setPastExamText(event.target.value)}
                placeholder="Paste one or more past exams..."
                className="h-44 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />

              <div className="mt-2 flex flex-wrap items-center gap-3">
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
                />
                {uploadedPastExams.length > 0 && (
                  <span className="text-xs text-gray-600">Uploaded: {uploadedPastExams.length} file(s)</span>
                )}
              </div>

              <label className="mb-1 mt-4 block text-sm font-semibold text-gray-900">Syllabus Content (optional)</label>
              <textarea
                value={syllabusText}
                onChange={(event) => setSyllabusText(event.target.value)}
                placeholder="Paste syllabus, outcomes, and objectives..."
                className="h-32 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />

              <div className="mt-2">
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
                />
              </div>
            </section>

            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-3 text-lg font-semibold text-gray-900">Step 2 • Test Structure Builder</h2>

              <label className="mb-1 block text-sm font-semibold text-gray-900">Preset</label>
              <Listbox
                value={testPreset}
                onChange={(value: string) => applyPreset(value)}
                options={testPresets.map((preset) => ({ value: preset, label: preset }))}
              />

              {testPreset === "Custom" && (
                <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                    <Button onClick={addSection} variant="secondary" size="sm" className="w-full sm:w-auto">Add Section</Button>
                    <Button onClick={saveCustomPreset} variant="secondary" size="sm" className="w-full sm:w-auto">Save Custom Preset</Button>
                    <span className="text-xs text-gray-600">Live total marks: {totalConfiguredMarks}</span>
                  </div>

                  {savedCustomPresets.length > 0 && (
                    <div className="mb-3">
                      <label className="mb-1 block text-xs font-semibold text-gray-700">Load saved preset</label>
                      <Listbox
                        value=""
                        onChange={(value: string) => loadCustomPreset(value)}
                        options={[
                          { value: "", label: "Select saved preset" },
                          ...savedCustomPresets.map((preset) => ({ value: preset.id, label: preset.name })),
                        ]}
                      />
                    </div>
                  )}

                  <div className="space-y-3">
                    {customSections.map((section) => (
                      <div key={section.id} className="rounded-lg border border-gray-200 bg-white p-3">
                        <div className="grid gap-2 md:grid-cols-4">
                          <input
                            value={section.sectionName}
                            onChange={(event) => updateSection(section.id, { sectionName: event.target.value })}
                            placeholder="Section name"
                            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                          />
                          <Listbox
                            value={section.questionType}
                            onChange={(value: string) => updateSection(section.id, { questionType: value })}
                            options={sectionQuestionTypes.map((item) => ({ value: item, label: item }))}
                          />
                          <input
                            type="number"
                            min={1}
                            value={section.questionCount}
                            onChange={(event) => updateSection(section.id, { questionCount: Math.max(1, Number(event.target.value) || 1) })}
                            placeholder="No. questions"
                            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                          />
                          <input
                            type="number"
                            min={1}
                            value={section.marksPerQuestion}
                            onChange={(event) => updateSection(section.id, { marksPerQuestion: Math.max(1, Number(event.target.value) || 1) })}
                            placeholder="Marks each"
                            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                          />
                        </div>
                        <div className="mt-2 flex justify-end">
                          <Button onClick={() => removeSection(section.id)} variant="danger" size="sm">Remove</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-900">Exam Type</label>
                  <Listbox
                    value={examType}
                    onChange={(value: string) => setExamType(value)}
                    options={[
                      { value: "Quiz", label: "Quiz" },
                      { value: "Midterm", label: "Midterm" },
                      { value: "Final", label: "Final" },
                      { value: "Practice", label: "Practice Exam" },
                    ]}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-900">Predicted Questions</label>
                  <Listbox
                    value={predictionCountOption}
                    onChange={(value: string) => setPredictionCountOption(value)}
                    options={[
                      { value: "5", label: "5" },
                      { value: "10", label: "10" },
                      { value: "15", label: "15" },
                      { value: "20", label: "20" },
                      { value: "custom", label: "Custom" },
                    ]}
                  />
                </div>

                {predictionCountOption === "custom" && (
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-900">Custom Count</label>
                    <input
                      type="number"
                      min={5}
                      max={50}
                      value={customPredictionCount}
                      onChange={(event) => setCustomPredictionCount(Math.max(5, Math.min(50, Number(event.target.value) || 10)))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                )}

                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-900">Difficulty Level</label>
                  <Listbox
                    value={difficultyLevel}
                    onChange={(value: string) => setDifficultyLevel(value)}
                    options={[
                      { value: "Easy", label: "Easy" },
                      { value: "Medium", label: "Medium" },
                      { value: "Hard", label: "Hard" },
                      { value: "Exam-Level", label: "Exam-Level" },
                    ]}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-900">Subject Type</label>
                  <Listbox
                    value={subjectType}
                    onChange={(value: string) => setSubjectType(value as SubjectType)}
                    options={[
                      { value: "Math", label: "Math" },
                      { value: "Science", label: "Science" },
                      { value: "English", label: "English" },
                      { value: "History", label: "History" },
                      { value: "Other", label: "Other" },
                    ]}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-900">Exam Board / Curriculum</label>
                  <Listbox
                    value={curriculum}
                    onChange={(value: string) => setCurriculum(value)}
                    options={[
                      { value: "IB", label: "IB" },
                      { value: "AP", label: "AP" },
                      { value: "Ontario", label: "Ontario" },
                      { value: "GCSE", label: "GCSE" },
                      { value: "Custom", label: "Custom" },
                    ]}
                  />
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-3 text-lg font-semibold text-gray-900">Step 3 • Generate</h2>
              <Button onClick={() => void generatePredictions()} disabled={!pastExamText.trim() || isLoading} loading={isLoading} fullWidth>
                {isLoading ? "Analyzing patterns..." : "Generate Predicted Exam"}
              </Button>
              <p className="mt-2 text-xs text-gray-500">Uses frequency analysis + curriculum context + structure constraints.</p>
            </section>
          </div>

          <div className="space-y-6">
            {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
            {success && <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">{success}</div>}

            {isLoading && <SkeletonList count={4} />}

            {!isLoading && predictions.length === 0 && (
              <EmptyState
                title="No predictions yet"
                description="Upload past exams, configure structure, and generate a premium predicted paper."
              />
            )}

            {!isLoading && predictions.length > 0 && (
              <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm print:bg-white">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-xl font-semibold text-gray-900">Step 4 • Predicted Exam Paper</h2>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => window.print()} variant="secondary" size="sm">Print</Button>
                    <Button onClick={exportPredictedExam} size="sm">Export</Button>
                  </div>
                </div>

                <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
                  <p><span className="font-semibold">Total Marks:</span> {totalMarks}</p>
                  <p><span className="font-semibold">Exam Style:</span> {analytics?.style}</p>
                  <p><span className="font-semibold">Difficulty Trend:</span> {analytics?.difficultyTrend}</p>
                </div>

                <div className="mb-6 rounded-lg border border-gray-200 p-4">
                  <h3 className="mb-2 text-sm font-semibold text-gray-900">Topic Weighting Analysis</h3>
                  <div className="space-y-2">
                    {(analytics?.topicDistribution ?? []).map((item) => (
                      <div key={item.topic}>
                        <div className="mb-1 flex items-center justify-between text-xs text-gray-700">
                          <span>{item.topic}</span>
                          <span>{item.percentage}% likely</span>
                        </div>
                        <div className="h-2 rounded-full bg-gray-200">
                          <div className={`h-2 rounded-full ${likelihoodBarColor(item.likelihood)}`} style={{ width: `${item.percentage}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mb-6 rounded-lg border border-gray-200 p-4">
                  <h3 className="mb-2 text-sm font-semibold text-gray-900">Past Exam Pattern Analyzer</h3>
                  <div className="grid gap-3 text-sm text-gray-700 md:grid-cols-2">
                    <div>
                      <p className="font-semibold">Most repeated topics</p>
                      <ul className="list-disc pl-5">
                        {(analytics?.patternAnalysis.repeatedTopics ?? []).map((item) => <li key={item}>{item}</li>)}
                      </ul>
                    </div>
                    <div>
                      <p className="font-semibold">Most common question types</p>
                      <ul className="list-disc pl-5">
                        {(analytics?.patternAnalysis.commonQuestionTypes ?? []).map((item) => <li key={item}>{item}</li>)}
                      </ul>
                    </div>
                    <div>
                      <p className="font-semibold">Average difficulty trend</p>
                      <p>{analytics?.patternAnalysis.averageDifficultyTrend}</p>
                    </div>
                    <div>
                      <p className="font-semibold">Gaps in coverage</p>
                      <ul className="list-disc pl-5">
                        {(analytics?.patternAnalysis.gapsInCoverage ?? []).map((item) => <li key={item}>{item}</li>)}
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {predictions.map((prediction, index) => (
                    <div key={prediction.id} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                        <span className="rounded-full bg-blue-100 px-2 py-1 font-semibold text-blue-700">{prediction.sectionName}</span>
                        <span className="rounded-full bg-purple-100 px-2 py-1 font-semibold text-purple-700">{prediction.type}</span>
                        <span className={`rounded-full px-2 py-1 font-semibold ${confidenceColor(prediction.confidence)}`}>{prediction.confidence}</span>
                        <span className="rounded-full bg-gray-200 px-2 py-1 font-semibold text-gray-700">{prediction.marks} marks</span>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">{index + 1}. {prediction.question}</p>
                      <p className="mt-1 text-xs text-gray-600">Reasoning: {prediction.reason}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 grid gap-3 md:grid-cols-3">
                  <Button onClick={startSimulation} variant="secondary" size="sm">Start Exam Simulation</Button>
                  <Button onClick={() => void generateMarkScheme()} loading={isMarkSchemeLoading} variant="secondary" size="sm">Generate Mark Scheme</Button>
                  <Button onClick={() => void generateStudyPlan()} loading={isStudyPlanLoading} variant="secondary" size="sm">Generate Study Plan</Button>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
                  <input
                    type="date"
                    value={examDate}
                    onChange={(event) => setExamDate(event.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
                    Hours/day: <span className="font-semibold">{hoursPerDay}</span>
                    <input
                      type="range"
                      min={1}
                      max={8}
                      value={hoursPerDay}
                      onChange={(event) => setHoursPerDay(Number(event.target.value))}
                      className="ml-2 align-middle"
                    />
                  </div>
                </div>
              </section>
            )}

            {simulationRunning && currentQuestion && (
              <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Exam Simulation Mode</h3>
                  <span className="text-sm font-semibold text-red-600">
                    {Math.floor(timeRemainingSeconds / 60)}:{String(timeRemainingSeconds % 60).padStart(2, "0")}
                  </span>
                </div>

                <div className="mb-3 flex items-center gap-2 text-xs">
                  <span className="rounded-full bg-blue-100 px-2 py-1 font-semibold text-blue-700">Q {simulationIndex + 1} / {predictions.length}</span>
                  <span className="rounded-full bg-gray-200 px-2 py-1 font-semibold text-gray-700">{currentQuestion.marks} marks</span>
                </div>

                <p className="text-sm font-semibold text-gray-900">{currentQuestion.question}</p>
                <textarea
                  value={simulationAnswers[currentQuestion.id] ?? ""}
                  onChange={(event) => setSimulationAnswers((prev) => ({ ...prev, [currentQuestion.id]: event.target.value }))}
                  placeholder="Type your answer here..."
                  className="mt-3 h-36 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />

                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <Button
                    onClick={() => setSimulationIndex((prev) => Math.max(0, prev - 1))}
                    variant="secondary"
                    size="sm"
                    className="w-full sm:w-auto"
                    disabled={simulationIndex === 0}
                  >
                    Previous
                  </Button>
                  <Button
                    onClick={() => setSimulationIndex((prev) => Math.min(predictions.length - 1, prev + 1))}
                    variant="secondary"
                    size="sm"
                    className="w-full sm:w-auto"
                    disabled={simulationIndex >= predictions.length - 1}
                  >
                    Next
                  </Button>
                  <Button onClick={finishSimulation} size="sm" className="w-full sm:w-auto">Submit Simulation</Button>
                </div>
              </section>
            )}

            {simulationCompleted && (
              <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900">Simulation Results</h3>
                <p className="mt-1 text-sm text-gray-700">Score: {simulationScore} / {predictions.reduce((sum, q) => sum + q.marks, 0)}</p>
                <p className="text-sm text-gray-700">Time used: {Math.max(0, simulationTimeLimit * 60 - timeRemainingSeconds)} sec</p>
                <p className="mt-2 text-sm font-semibold text-gray-900">Weak topics</p>
                <ul className="list-disc pl-5 text-sm text-gray-700">
                  {weakTopics.length ? weakTopics.map((topic) => <li key={topic}>{topic}</li>) : <li>No obvious weak areas detected.</li>}
                </ul>
              </section>
            )}

            {markScheme.length > 0 && (
              <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="mb-3 text-lg font-semibold text-gray-900">Mark Scheme</h3>
                <div className="space-y-3">
                  {markScheme.map((item) => (
                    <div key={item.questionId} className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
                      <p className="font-semibold text-gray-900">{item.question}</p>
                      <p className="mt-1 text-xs">Total marks: {item.totalMarks}</p>
                      <p className="mt-2 font-semibold">Expected points</p>
                      <ul className="list-disc pl-5">{item.expectedAnswerPoints.map((point) => <li key={point}>{point}</li>)}</ul>
                      <p className="mt-2 font-semibold">Marks breakdown</p>
                      <ul className="list-disc pl-5">{item.marksBreakdown.map((point) => <li key={point}>{point}</li>)}</ul>
                      <p className="mt-2 font-semibold">Common mistakes</p>
                      <ul className="list-disc pl-5">{item.commonMistakes.map((point) => <li key={point}>{point}</li>)}</ul>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {studyPlan.length > 0 && (
              <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900">Study Plan</h3>
                {studyPlanSummary && <p className="mt-1 text-sm text-gray-700">{studyPlanSummary}</p>}
                <div className="mt-3 space-y-3">
                  {studyPlan.map((day) => (
                    <div key={day.day} className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
                      <p className="font-semibold text-gray-900">{day.day} • {day.hours}h</p>
                      <p className="mt-1"><span className="font-semibold">Focus topics:</span> {day.focusTopics.join(", ")}</p>
                      <ul className="mt-1 list-disc pl-5">{day.tasks.map((task) => <li key={task}>{task}</li>)}</ul>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
