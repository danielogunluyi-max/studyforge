"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { AppNav } from "~/app/_components/app-nav";
import { EmptyState } from "~/app/_components/empty-state";
import { SkeletonList } from "~/app/_components/skeleton-loader";

type Note = {
  id: string;
  title: string;
  content: string;
  format: string;
  createdAt: string;
  tags: string[];
  relevanceScore?: number;
};

type TagCount = {
  name: string;
  count: number;
};

const TAG_COLOR_CLASSES = [
  "bg-blue-100 text-blue-700",
  "bg-green-100 text-green-700",
  "bg-purple-100 text-purple-700",
  "bg-orange-100 text-orange-700",
  "bg-pink-100 text-pink-700",
  "bg-indigo-100 text-indigo-700",
];

function getTagColor(tag: string): string {
  const sum = tag.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return TAG_COLOR_CLASSES[sum % TAG_COLOR_CLASSES.length] ?? TAG_COLOR_CLASSES[0]!;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) {
    return <>{text}</>;
  }

  const pattern = new RegExp(`(${escapeRegex(query)})`, "ig");
  const parts = text.split(pattern);

  return (
    <>
      {parts.map((part, index) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={`${part}-${index}`} className="rounded bg-yellow-200 px-0.5">
            {part}
          </mark>
        ) : (
          <span key={`${part}-${index}`}>{part}</span>
        ),
      )}
    </>
  );
}

export default function MyNotes() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [tagStats, setTagStats] = useState<TagCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTagLoading, setIsTagLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeTag, setActiveTag] = useState("");
  const [activePeriod, setActivePeriod] = useState("");
  const [activeFormat, setActiveFormat] = useState("");
  const [error, setError] = useState("");
  const [exportingNoteId, setExportingNoteId] = useState("");
  const [tagModalOpen, setTagModalOpen] = useState(false);
  const [tagActionError, setTagActionError] = useState("");
  const [renameOldTag, setRenameOldTag] = useState("");
  const [renameNewTag, setRenameNewTag] = useState("");
  const [deleteTagName, setDeleteTagName] = useState("");
  const [mergeSourceTag, setMergeSourceTag] = useState("");
  const [mergeTargetTag, setMergeTargetTag] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?from=/my-notes");
    }
  }, [status, router]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const query = params.get("q") ?? "";
    const tag = params.get("tag") ?? "";
    setSearchInput(query);
    setDebouncedSearch(query);
    setActiveTag(tag);
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    if (session) {
      void fetchNotes();
    }
  }, [session, debouncedSearch, activeTag, activePeriod, activeFormat]);

  useEffect(() => {
    if (session) {
      void fetchTagStats();
    }
  }, [session]);

  const fetchNotes = async () => {
    setIsLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      if (debouncedSearch.trim()) params.set("q", debouncedSearch.trim());
      if (activeTag) params.set("tag", activeTag);
      if (activePeriod) params.set("period", activePeriod);
      if (activeFormat) params.set("format", activeFormat);

      const query = params.toString();
      const response = await fetch(`/api/notes${query ? `?${query}` : ""}`);
      const data = (await response.json()) as { notes?: Note[]; error?: string };

      if (!response.ok) {
        setError(data.error ?? "Failed to fetch notes");
        return;
      }

      setNotes(data.notes ?? []);
    } catch (fetchError) {
      void fetchError;
      setError("Failed to fetch notes");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTagStats = async () => {
    setIsTagLoading(true);
    try {
      const response = await fetch("/api/tags");
      const data = (await response.json()) as { tags?: TagCount[] };
      setTagStats(data.tags ?? []);
    } catch (tagError) {
      void tagError;
    } finally {
      setIsTagLoading(false);
    }
  };

  const deleteNote = async (id: string) => {
    if (!confirm("Are you sure you want to delete this note?")) return;

    try {
      const response = await fetch(`/api/notes?id=${id}`, { method: "DELETE" });

      if (response.ok) {
        setNotes((prev) => prev.filter((note) => note.id !== id));
        if (selectedNote?.id === id) {
          setSelectedNote(null);
        }
        await fetchTagStats();
      }
    } catch (deleteError) {
      void deleteError;
      setError("Failed to delete note");
    }
  };

  const exportNotePdf = async (noteId: string) => {
    setExportingNoteId(noteId);
    setError("");

    try {
      const response = await fetch("/api/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteId }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Failed to export note as PDF");
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "studyforge-note.pdf";
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (exportError) {
      void exportError;
      setError("Failed to export note as PDF");
    } finally {
      setExportingNoteId("");
    }
  };

  const updateTags = async (payload: object) => {
    setTagActionError("");

    const response = await fetch("/api/tags", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      setTagActionError(data.error ?? "Failed to update tags");
      return;
    }

    await Promise.all([fetchTagStats(), fetchNotes()]);
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

  const resultLabel = useMemo(() => {
    if (isLoading) return "Loading...";
    return `${notes.length} result${notes.length === 1 ? "" : "s"}`;
  }, [isLoading, notes.length]);

  if (status === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </main>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <AppNav />

      <div className="container mx-auto max-w-7xl px-6 py-12">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="mb-2 text-4xl font-bold text-gray-900">My Notes</h1>
            <p className="text-lg text-gray-600">All your saved study notes in one place</p>
          </div>
          <button
            onClick={() => setTagModalOpen(true)}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            Manage Tags
          </button>
        </div>

        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-4">
            <input
              type="text"
              placeholder="Search title, content, tags..."
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              className="md:col-span-2 w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              aria-label="Search notes"
            />
            <select
              value={activePeriod}
              onChange={(event) => setActivePeriod(event.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All dates</option>
              <option value="7d">Last 7 days</option>
              <option value="month">This month</option>
            </select>
            <select
              value={activeFormat}
              onChange={(event) => setActiveFormat(event.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All formats</option>
              <option value="flashcards">Flashcards only</option>
              <option value="questions">Questions only</option>
              <option value="summary">Summary only</option>
              <option value="detailed">Detailed only</option>
            </select>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-500">{resultLabel}</span>
            {(activeTag || activeFormat || activePeriod || debouncedSearch) && (
              <button
                onClick={() => {
                  setActiveTag("");
                  setActiveFormat("");
                  setActivePeriod("");
                  setSearchInput("");
                  setDebouncedSearch("");
                }}
                className="rounded-full border border-gray-300 bg-white px-3 py-1 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <aside className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Tags</h2>
            <button
              onClick={() => setActiveTag("")}
              className={`mb-2 w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
                !activeTag ? "bg-blue-600 text-white" : "border border-gray-200 text-gray-700 hover:bg-gray-50"
              }`}
            >
              All Notes
            </button>

            {isTagLoading ? (
              <p className="text-xs text-gray-500">Loading tags...</p>
            ) : tagStats.length === 0 ? (
              <p className="text-xs text-gray-500">No tags yet.</p>
            ) : (
              <div className="space-y-2">
                {tagStats.map((tag) => (
                  <button
                    key={tag.name}
                    onClick={() => setActiveTag(tag.name)}
                    className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm transition ${
                      activeTag === tag.name
                        ? "border-blue-200 bg-blue-50 text-blue-700"
                        : "border-gray-200 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <span className="truncate">{tag.name}</span>
                    <span className="text-xs text-gray-500">{tag.count}</span>
                  </button>
                ))}
              </div>
            )}
          </aside>

          <section>
            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                {error}
              </div>
            )}

            {isLoading ? (
              <SkeletonList count={6} />
            ) : notes.length === 0 ? (
              <EmptyState
                icon="📝"
                title={debouncedSearch || activeTag || activePeriod || activeFormat ? "No notes found" : "No notes yet"}
                description={
                  debouncedSearch || activeTag || activePeriod || activeFormat
                    ? "Try adjusting your search or removing filters to see more results."
                    : "Start creating notes from your study materials. Upload a PDF, paste text, or type directly into the generator."
                }
                actionLabel="Create Your First Note"
                actionHref="/generator"
                secondaryActionLabel="Upload a File"
                secondaryActionHref="/upload"
              />
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    className="group rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getFormatBadgeColor(note.format)}`}>
                        {getFormatLabel(note.format)}
                      </span>
                      <button
                        onClick={() => void deleteNote(note.id)}
                        className="text-gray-400 opacity-0 transition hover:text-red-600 group-hover:opacity-100"
                        title="Delete note"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>

                    <h3 className="mb-2 line-clamp-2 text-lg font-semibold text-gray-900">
                      <HighlightText text={note.title} query={debouncedSearch} />
                    </h3>

                    <p className="mb-3 line-clamp-3 text-sm text-gray-600">
                      <HighlightText text={note.content} query={debouncedSearch} />
                    </p>

                    {note.tags.length > 0 && (
                      <div className="mb-3 flex flex-wrap gap-2">
                        {note.tags.map((tag) => (
                          <button
                            key={`${note.id}-${tag}`}
                            onClick={() => setActiveTag(tag)}
                            className={`rounded-full px-2 py-1 text-xs font-semibold ${getTagColor(tag)}`}
                          >
                            <HighlightText text={tag} query={debouncedSearch} />
                          </button>
                        ))}
                      </div>
                    )}

                    <p className="text-xs text-gray-500">{formatDate(note.createdAt)}</p>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setSelectedNote(note)}
                        className="rounded-lg border border-gray-300 bg-white py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                      >
                        View
                      </button>
                      <button
                        onClick={() => void exportNotePdf(note.id)}
                        disabled={exportingNoteId === note.id}
                        className="rounded-lg bg-blue-600 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:bg-gray-300"
                      >
                        {exportingNoteId === note.id ? "Exporting..." : "Export PDF"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {selectedNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelectedNote(null)}>
          <div
            className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white p-8 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-6 flex items-start justify-between">
              <div>
                <span className={`mb-3 inline-block rounded-full px-3 py-1 text-xs font-semibold ${getFormatBadgeColor(selectedNote.format)}`}>
                  {getFormatLabel(selectedNote.format)}
                </span>
                <h2 className="text-2xl font-bold text-gray-900">{selectedNote.title}</h2>
                <p className="mt-1 text-sm text-gray-500">{formatDate(selectedNote.createdAt)}</p>
                {selectedNote.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedNote.tags.map((tag) => (
                      <span key={`modal-${tag}`} className={`rounded-full px-2 py-1 text-xs font-semibold ${getTagColor(tag)}`}>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={() => setSelectedNote(null)}
                className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="prose max-w-none whitespace-pre-wrap rounded-lg border border-gray-200 bg-gray-50 p-6 text-gray-700">
              <HighlightText text={selectedNote.content} query={debouncedSearch} />
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <button
                onClick={() => {
                  void navigator.clipboard.writeText(selectedNote.content);
                }}
                className="rounded-lg border border-gray-300 bg-white py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Copy
              </button>
              <button
                onClick={() => void exportNotePdf(selectedNote.id)}
                disabled={exportingNoteId === selectedNote.id}
                className="rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:bg-gray-300"
              >
                {exportingNoteId === selectedNote.id ? "Exporting..." : "Export as PDF"}
              </button>
              <button
                onClick={() => {
                  void deleteNote(selectedNote.id);
                  setSelectedNote(null);
                }}
                className="rounded-lg bg-red-600 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {tagModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setTagModalOpen(false)}>
          <div
            className="w-full max-w-xl rounded-xl bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="mb-4 text-xl font-semibold text-gray-900">Manage Tags</h2>

            <div className="space-y-5">
              <div className="rounded-lg border border-gray-200 p-4">
                <p className="mb-2 text-sm font-semibold text-gray-800">Rename tag</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    value={renameOldTag}
                    onChange={(event) => setRenameOldTag(event.target.value)}
                    placeholder="Current tag"
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                  <input
                    value={renameNewTag}
                    onChange={(event) => setRenameNewTag(event.target.value)}
                    placeholder="New tag"
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <button
                  onClick={() =>
                    void updateTags({
                      action: "rename",
                      oldTag: renameOldTag,
                      newTag: renameNewTag,
                    })
                  }
                  className="mt-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white"
                >
                  Rename
                </button>
              </div>

              <div className="rounded-lg border border-gray-200 p-4">
                <p className="mb-2 text-sm font-semibold text-gray-800">Delete tag</p>
                <input
                  value={deleteTagName}
                  onChange={(event) => setDeleteTagName(event.target.value)}
                  placeholder="Tag to delete"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
                <button
                  onClick={() => void updateTags({ action: "delete", tag: deleteTagName })}
                  className="mt-2 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white"
                >
                  Delete
                </button>
              </div>

              <div className="rounded-lg border border-gray-200 p-4">
                <p className="mb-2 text-sm font-semibold text-gray-800">Merge tags</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    value={mergeSourceTag}
                    onChange={(event) => setMergeSourceTag(event.target.value)}
                    placeholder="Source tag"
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                  <input
                    value={mergeTargetTag}
                    onChange={(event) => setMergeTargetTag(event.target.value)}
                    placeholder="Target tag"
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <button
                  onClick={() =>
                    void updateTags({
                      action: "merge",
                      sourceTag: mergeSourceTag,
                      targetTag: mergeTargetTag,
                    })
                  }
                  className="mt-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white"
                >
                  Merge
                </button>
              </div>
            </div>

            {tagActionError && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                {tagActionError}
              </div>
            )}

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setTagModalOpen(false)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
