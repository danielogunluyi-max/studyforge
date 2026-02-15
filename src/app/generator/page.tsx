"use client";

import { useState } from "react";
import Link from "next/link";

export default function Generator() {
  const [inputText, setInputText] = useState("");
  const [outputFormat, setOutputFormat] = useState("summary");
  const [generatedNotes, setGeneratedNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set());
  const [quizAnswers, setQuizAnswers] = useState<{[key: number]: string}>({});
  const [checkedAnswers, setCheckedAnswers] = useState<Set<number>>(new Set());

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

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    setError("");

    try {
      // Create a title from the input text (first 50 chars)
      const title = inputText.slice(0, 50) + (inputText.length > 50 ? "..." : "");

      const response = await fetch("/api/notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          content: generatedNotes,
          format: outputFormat,
        }),
      });

      if (response.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000); // Hide after 3 seconds
      } else {
        setError("Failed to save note");
      }
    } catch (err) {
      setError("Something went wrong while saving.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = () => {
    setGeneratedNotes("");
    setError("");
    setSaveSuccess(false);
    setFlippedCards(new Set());
    setQuizAnswers({});
    setCheckedAnswers(new Set());
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedNotes);
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
    setQuizAnswers({...quizAnswers, [index]: answer});
  };

  const checkAnswer = (index: number) => {
    setCheckedAnswers(new Set(checkedAnswers).add(index));
  };

  const parseFlashcards = (text: string) => {
    const cards = [];
    const lines = text.split('\n');
    let currentQ = '';
    let currentA = '';
    
    for (let line of lines) {
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
    const questions = [];
    
    const cleanedText = text.replace(/Answer:\s*/gi, '');
    const sections = cleanedText.split(/(?=\d+\.\s)/);
    
    for (let section of sections) {
      const trimmed = section.trim();
      if (!trimmed) continue;
      
      const lines = trimmed.split('\n').filter(l => l.trim());
      if (lines.length === 0) continue;
      
      const questionLine = lines[0].replace(/^\d+\.\s*/, '').trim();
      
      if (questionLine.match(/^[A-D]\)/i) || questionLine.toLowerCase().startsWith('answer')) {
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
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:bg-gray-300"
              >
                {isSaving ? "Saving..." : "💾 Save"}
              </button>
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy
              </button>
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
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:bg-gray-300"
              >
                {isSaving ? "Saving..." : "💾 Save"}
              </button>
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy
              </button>
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
                  value={quizAnswers[index] || ''}
                  onChange={(e) => handleQuizAnswer(index, e.target.value)}
                  placeholder="Type your answer here..."
                  className="mb-3 w-full resize-none rounded-lg border border-gray-300 p-3 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  rows={3}
                  disabled={checkedAnswers.has(index)}
                />
                {!checkedAnswers.has(index) ? (
                  <button
                    onClick={() => checkAnswer(index)}
                    disabled={!quizAnswers[index]?.trim()}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:bg-gray-300"
                  >
                    Check Answer
                  </button>
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
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:bg-gray-300"
            >
              {isSaving ? "Saving..." : "💾 Save"}
            </button>
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy
            </button>
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
      <nav className="border-b border-gray-200 bg-white">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <img 
              src="/StudyForge-logo.png" 
              alt="StudyForge" 
              className="h-8 w-8"
            />
            <span className="text-xl font-semibold text-gray-900">StudyForge</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link
              href="/my-notes"
              className="text-sm font-medium text-gray-600 transition hover:text-gray-900"
            >
              My Notes
            </Link>
            <Link
              href="/"
              className="text-sm font-medium text-gray-600 transition hover:text-gray-900"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </nav>

      <div className="container mx-auto max-w-4xl px-6 py-12">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-4xl font-bold text-gray-900">
            Note Generator
          </h1>
          <p className="text-lg text-gray-600">
            Paste your study material and let AI do the work
          </p>
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
        </div>

        <div className="mb-6 flex gap-3">
          <button
            onClick={handleGenerate}
            disabled={!inputText || isLoading}
            className="flex-1 rounded-lg bg-blue-600 py-4 text-lg font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="h-5 w-5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating... (~{estimatedTime}s)
              </span>
            ) : (
              "Generate Notes"
            )}
          </button>
          {generatedNotes && (
            <button
              onClick={handleClear}
              className="rounded-lg border border-gray-300 bg-white px-6 py-4 text-lg font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Clear
            </button>
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