"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type Note = {
  id: string;
  title: string;
  content: string;
  format: string;
  createdAt: string;
};

export default function MyNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch notes on page load
  useEffect(() => {
    void fetchNotes();
  }, []);

  const fetchNotes = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/notes");
      const data = (await response.json()) as { notes?: Note[] };
      setNotes(data.notes ?? []);
    } catch (error) {
      void error;
      console.error("Error fetching notes:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteNote = async (id: string) => {
    if (!confirm("Are you sure you want to delete this note?")) return;

    try {
      const response = await fetch(`/api/notes?id=${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setNotes(notes.filter((note) => note.id !== id));
        if (selectedNote?.id === id) {
          setSelectedNote(null);
        }
      }
    } catch (error) {
      console.error("Error deleting note:", error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getFormatBadgeColor = (format: string) => {
    switch (format) {
      case "summary":
        return "bg-blue-100 text-blue-700";
      case "detailed":
        return "bg-purple-100 text-purple-700";
      case "flashcards":
        return "bg-green-100 text-green-700";
      case "questions":
        return "bg-orange-100 text-orange-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getFormatLabel = (format: string) => {
    switch (format) {
      case "summary":
        return "Summary";
      case "detailed":
        return "Detailed";
      case "flashcards":
        return "Flashcards";
      case "questions":
        return "Quiz";
      default:
        return format;
    }
  };

  const filteredNotes = notes.filter(
    (note) =>
      note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="border-b border-gray-200 bg-white">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <img
              src="/StudyForge-logo.png"
              alt="StudyForge"
              className="h-8 w-8"
            />
            <span className="text-xl font-semibold text-gray-900">
              StudyForge
            </span>
          </Link>
          <div className="flex items-center gap-6">
            <Link
              href="/generator"
              className="text-sm font-medium text-gray-600 transition hover:text-gray-900"
            >
              Generator
            </Link>
            <Link
              href="/"
              className="text-sm font-medium text-gray-600 transition hover:text-gray-900"
            >
              Home
            </Link>
          </div>
        </div>
      </nav>

      <div className="container mx-auto max-w-7xl px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="mb-2 text-4xl font-bold text-gray-900">My Notes</h1>
          <p className="text-lg text-gray-600">
            All your saved study notes in one place
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <svg
                className="mx-auto h-12 w-12 animate-spin text-blue-600"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <p className="mt-4 text-gray-600">Loading your notes...</p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && notes.length === 0 && (
          <div className="rounded-xl border-2 border-dashed border-gray-300 bg-white p-12 text-center">
            <svg
              className="mx-auto h-16 w-16 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-4 text-xl font-semibold text-gray-900">
              No notes yet
            </h3>
            <p className="mt-2 text-gray-600">
              Generate and save some notes to see them here!
            </p>
            <Link
              href="/generator"
              className="mt-6 inline-block rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Create Your First Note
            </Link>
          </div>
        )}

        {/* Notes Grid */}
        {!isLoading && filteredNotes.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredNotes.map((note) => (
              <div
                key={note.id}
                className="group relative rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md"
              >
                {/* Format Badge */}
                <div className="mb-3 flex items-center justify-between">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${getFormatBadgeColor(note.format)}`}
                  >
                    {getFormatLabel(note.format)}
                  </span>
                  <button
                    onClick={() => deleteNote(note.id)}
                    className="text-gray-400 opacity-0 transition hover:text-red-600 group-hover:opacity-100"
                    title="Delete note"
                  >
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>

                {/* Title */}
                <h3 className="mb-2 line-clamp-2 text-lg font-semibold text-gray-900">
                  {note.title}
                </h3>

                {/* Content Preview */}
                <p className="mb-4 line-clamp-3 text-sm text-gray-600">
                  {note.content}
                </p>

                {/* Date */}
                <p className="text-xs text-gray-500">{formatDate(note.createdAt)}</p>

                {/* View Button */}
                <button
                  onClick={() => setSelectedNote(note)}
                  className="mt-4 w-full rounded-lg border border-gray-300 bg-white py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  View Full Note
                </button>
              </div>
            ))}
          </div>
        )}

        {/* No Search Results */}
        {!isLoading && notes.length > 0 && filteredNotes.length === 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
            <p className="text-gray-600">
              No notes found matching &quot;{searchTerm}&quot;
            </p>
          </div>
        )}
      </div>

      {/* Note Detail Modal */}
      {selectedNote && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelectedNote(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="mb-6 flex items-start justify-between">
              <div>
                <span
                  className={`mb-3 inline-block rounded-full px-3 py-1 text-xs font-semibold ${getFormatBadgeColor(selectedNote.format)}`}
                >
                  {getFormatLabel(selectedNote.format)}
                </span>
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedNote.title}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  {formatDate(selectedNote.createdAt)}
                </p>
              </div>
              <button
                onClick={() => setSelectedNote(null)}
                className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="prose max-w-none whitespace-pre-wrap rounded-lg border border-gray-200 bg-gray-50 p-6 text-gray-700">
              {selectedNote.content}
            </div>

            {/* Modal Actions */}
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  void navigator.clipboard.writeText(selectedNote.content);
                  alert("✓ Note copied to clipboard!");
                }}
                className="flex-1 rounded-lg border border-gray-300 bg-white py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Copy to Clipboard
              </button>
              <button
                onClick={() => {
                  void deleteNote(selectedNote.id);
                  setSelectedNote(null);
                }}
                className="rounded-lg bg-red-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}