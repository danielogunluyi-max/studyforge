"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppNav } from "~/app/_components/app-nav";

type Style = "visual" | "auditory" | "reading" | "kinesthetic";

const STYLE_LABEL: Record<Style, string> = {
  visual: "Visual 👁️",
  auditory: "Auditory 🎧",
  reading: "Reading/Writing 📚",
  kinesthetic: "Kinesthetic 🧠",
};

export default function SettingsPage() {
  const [learningStyle, setLearningStyle] = useState<Style>("reading");
  const [autoAdapt, setAutoAdapt] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const load = async () => {
      const response = await fetch("/api/user/preferences");
      const data = (await response.json()) as { learningStyle?: Style; autoAdapt?: boolean };
      if (data.learningStyle) setLearningStyle(data.learningStyle);
      if (typeof data.autoAdapt === "boolean") setAutoAdapt(data.autoAdapt);
    };

    void load();
  }, []);

  const save = async () => {
    setIsSaving(true);
    await fetch("/api/user/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ learningStyle, autoAdapt }),
    });
    setIsSaving(false);
    setSuccess("Preferences saved.");
    setTimeout(() => setSuccess(""), 2000);
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <AppNav />
      <div className="container mx-auto max-w-3xl px-6 py-12">
        <h1 className="mb-2 text-4xl font-bold text-gray-900">Learning Preferences</h1>
        <p className="mb-8 text-lg text-gray-600">Control how StudyForge adapts content to your learning style.</p>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <label className="mb-2 block text-sm font-semibold text-gray-900">Learning Style</label>
          <select
            value={learningStyle}
            onChange={(event) => setLearningStyle(event.target.value as Style)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="visual">{STYLE_LABEL.visual}</option>
            <option value="auditory">{STYLE_LABEL.auditory}</option>
            <option value="reading">{STYLE_LABEL.reading}</option>
            <option value="kinesthetic">{STYLE_LABEL.kinesthetic}</option>
          </select>

          <label className="mt-4 flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={autoAdapt}
              onChange={(event) => setAutoAdapt(event.target.checked)}
            />
            Automatically adapt generated notes to my style
          </label>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              onClick={() => void save()}
              disabled={isSaving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-gray-300"
            >
              {isSaving ? "Saving..." : "Save Settings"}
            </button>
            <Link href="/learning-style-quiz" className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700">
              Retake Quiz
            </Link>
          </div>

          {success && <p className="mt-3 text-sm text-green-700">{success}</p>}
        </div>
      </div>
    </main>
  );
}
