"use client";

import { useState } from "react";

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

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#2e026d] to-[#15162c] p-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-8 text-center text-5xl font-bold text-white">
          <span className="text-[hsl(280,100%,70%)]">StudyForge</span> Note Generator
        </h1>

        {/* Input Section */}
        <div className="mb-6 rounded-xl bg-white/10 p-6">
          <label className="mb-2 block text-lg font-semibold text-white">
            Paste Your Notes or Content:
          </label>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Paste lecture notes, textbook paragraphs, or any study material here..."
            className="h-64 w-full rounded-lg bg-white/20 p-4 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[hsl(280,100%,70%)]"
          />
        </div>

        {/* Format Selection */}
        <div className="mb-6 rounded-xl bg-white/10 p-6">
          <label className="mb-2 block text-lg font-semibold text-white">
            Choose Output Format:
          </label>
          <select
            value={outputFormat}
            onChange={(e) => setOutputFormat(e.target.value)}
            className="w-full rounded-lg bg-white/20 p-3 text-white focus:outline-none focus:ring-2 focus:ring-[hsl(280,100%,70%)]"
          >
            <option value="summary">Summary</option>
            <option value="detailed">Detailed Notes</option>
            <option value="flashcards">Flashcards</option>
            <option value="questions">Practice Questions</option>
          </select>
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={!inputText || isLoading}
          className="mb-6 w-full rounded-lg bg-[hsl(280,100%,70%)] px-8 py-4 text-xl font-bold text-white transition hover:bg-[hsl(280,100%,60%)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? "Generating with AI..." : "Generate Notes"}
        </button>

        {/* Error Message */}
        {error && (
          <div className="mb-6 rounded-xl bg-red-500/20 p-4 text-red-200">
            {error}
          </div>
        )}

        {/* Output Section */}
        {generatedNotes && (
          <div className="rounded-xl bg-white/10 p-6">
            <h2 className="mb-4 text-2xl font-bold text-white">Your AI-Generated Study Notes:</h2>
            <div className="whitespace-pre-wrap rounded-lg bg-white/20 p-4 text-white">
              {generatedNotes}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}