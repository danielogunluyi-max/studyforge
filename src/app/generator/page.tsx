"use client";

import { useState } from "react";
import Link from "next/link";

export default function Generator() {
  const [inputText, setInputText] = useState("");
  const [outputFormat, setOutputFormat] = useState("summary");
  const [generatedNotes, setGeneratedNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    setIsLoading(true);
    setError("");
    
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

      const data = await response.json();

      if (response.ok) {
        setGeneratedNotes(data.notes);
      } else {
        setError(data.error || "Failed to generate notes");
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedNotes);
    alert("Notes copied to clipboard!");
  };

  const characterCount = inputText.length;
  const estimatedTime = Math.ceil(characterCount / 200); // rough estimate

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#2e026d] to-[#15162c] p-4 sm:p-8">
      <div className="mx-auto max-w-4xl">
        {/* Header with Back Button */}
        <div className="mb-8 flex items-center justify-between">
          <Link
            href="/"
            className="rounded-full bg-white/10 px-6 py-2 text-white transition hover:bg-white/20"
          >
            ← Back to Home
          </Link>
          <h1 className="text-3xl font-bold text-white sm:text-4xl">
            <span className="text-[hsl(280,100%,70%)]">StudyForge</span> Generator
          </h1>
        </div>

        {/* Input Section */}
        <div className="mb-6 rounded-2xl bg-white/10 p-6 backdrop-blur-sm">
          <div className="mb-2 flex items-center justify-between">
            <label className="text-lg font-semibold text-white">
              Paste Your Notes or Content:
            </label>
            <span className="text-sm text-white/60">
              {characterCount} characters
              {characterCount > 0 && ` • ~${estimatedTime}s to generate`}
            </span>
          </div>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Try pasting lecture notes, textbook paragraphs, or study material here...

Example: 'Photosynthesis is the process by which plants convert sunlight into energy...'"
            className="h-64 w-full rounded-xl bg-white/20 p-4 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[hsl(280,100%,70%)]"
          />
        </div>

        {/* Format Selection */}
        <div className="mb-6 rounded-2xl bg-white/10 p-6 backdrop-blur-sm">
          <label className="mb-3 block text-lg font-semibold text-white">
            Choose Output Format:
          </label>
          <select
            value={outputFormat}
            onChange={(e) => setOutputFormat(e.target.value)}
            className="w-full rounded-xl bg-white/20 p-4 text-white focus:outline-none focus:ring-2 focus:ring-[hsl(280,100%,70%)]"
          >
            <option value="summary">📝 Summary - Quick overview of main points</option>
            <option value="detailed">📚 Detailed Notes - Comprehensive study guide</option>
            <option value="flashcards">🎯 Flashcards - Question & answer format</option>
            <option value="questions">❓ Practice Questions - Test your knowledge</option>
          </select>
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={!inputText || isLoading}
          className="mb-6 w-full rounded-xl bg-[hsl(280,100%,70%)] px-8 py-5 text-xl font-bold text-white shadow-2xl transition-all hover:scale-105 hover:bg-[hsl(280,100%,60%)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Generating with AI... (~{estimatedTime}s)
            </span>
          ) : (
            "✨ Generate Notes"
          )}
        </button>

        {/* Error Message */}
        {error && (
          <div className="mb-6 rounded-xl bg-red-500/20 p-4 text-red-200 backdrop-blur-sm">
            ⚠️ {error}
          </div>
        )}

        {/* Output Section */}
        {generatedNotes && (
          <div className="rounded-2xl bg-white/10 p-6 backdrop-blur-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">
                Your AI-Generated Study Notes:
              </h2>
              <button
                onClick={handleCopy}
                className="rounded-lg bg-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/30"
              >
                📋 Copy to Clipboard
              </button>
            </div>
            <div className="whitespace-pre-wrap rounded-xl bg-white/20 p-6 text-white shadow-inner">
              {generatedNotes}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}