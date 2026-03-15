"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "~/app/_components/button";
import AudioPlayer from "~/app/_components/AudioPlayer";
import { PageHero } from "~/app/_components/page-hero";
import { EmptyState } from "~/app/_components/empty-state";
import { SkeletonList } from "~/app/_components/skeleton";
import Listbox from "~/app/_components/Listbox";
import { useToast } from "~/app/_components/toast";

const PREFILL_STORAGE_KEY = "kyvex:prefillText";
const PREFILL_FORMAT_KEY = "kyvex:prefillFormat";

type Note = {
  id: string;
  title: string;
  content: string;
  format: string;
  createdAt: string;
  tags: string[];
  isPinned: boolean;
  lastViewedAt: string | null;
  isShared: boolean;
  folderId: string | null;
  relevanceScore?: number;
};

type TagCount = {
  name: string;
  count: number;
};

type Folder = {
  id: string;
  name: string;
  noteCount: number;
};

const TAG_COLOR_CLASSES = [
  "badge-blue",
  "badge-green",
  "badge-purple",
  "badge-orange",
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
  const [recentlyViewed, setRecentlyViewed] = useState<Note[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [tagStats, setTagStats] = useState<TagCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTagLoading, setIsTagLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeTag, setActiveTag] = useState("");
  const [activeFolder, setActiveFolder] = useState("");
  const [activePeriod, setActivePeriod] = useState("");
  const [activeFormat, setActiveFormat] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [studyStreak, setStudyStreak] = useState(0);
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);
  const [bulkMoveFolderId, setBulkMoveFolderId] = useState("");
  const [hoveredNoteId, setHoveredNoteId] = useState("");
  const [menuOpenNoteId, setMenuOpenNoteId] = useState("");
  const [error, setError] = useState("");
  const [exportingNoteId, setExportingNoteId] = useState("");
  const [tagModalOpen, setTagModalOpen] = useState(false);
  const [tagActionError, setTagActionError] = useState("");
  const [renameOldTag, setRenameOldTag] = useState("");
  const [renameNewTag, setRenameNewTag] = useState("");
  const [deleteTagName, setDeleteTagName] = useState("");
  const [mergeSourceTag, setMergeSourceTag] = useState("");
  const [mergeTargetTag, setMergeTargetTag] = useState("");
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderColor, setNewFolderColor] = useState("#f0b429");
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [eli5Loading, setEli5Loading] = useState(false);
  const [eli5Result, setEli5Result] = useState("");
  const [eli5ModalOpen, setEli5ModalOpen] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?from=/my-notes");
    }
  }, [status, router]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const query = params.get("q") ?? "";
    const tag = params.get("tag") ?? "";
    const folder = params.get("folder") ?? "";
    setSearchInput(query);
    setDebouncedSearch(query);
    setActiveTag(tag);
    setActiveFolder(folder);
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    if (!error) return;
    showToast(error, "error");
  }, [error, showToast]);

  useEffect(() => {
    if (!tagActionError) return;
    showToast(tagActionError, "error");
  }, [tagActionError, showToast]);

  useEffect(() => {
    if (session) {
      void fetchNotes();
    }
  }, [session, debouncedSearch, activeTag, activeFolder, activePeriod, activeFormat, sortBy]);

  useEffect(() => {
    if (session) {
      void fetchTagStats();
      void fetchFolders();
      void fetchStreak();
    }
  }, [session]);

  // Handle Escape key to close modals
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (selectedNote) setSelectedNote(null);
        else if (tagModalOpen) setTagModalOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [selectedNote, tagModalOpen]);

  const fetchNotes = async () => {
    setIsLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      if (debouncedSearch.trim()) params.set("q", debouncedSearch.trim());
      if (activeTag) params.set("tag", activeTag);
      if (activeFolder) params.set("folderId", activeFolder);
      if (activePeriod) params.set("period", activePeriod);
      if (activeFormat) params.set("format", activeFormat);
      if (sortBy) params.set("sort", sortBy);

      const query = params.toString();
      const response = await fetch(`/api/notes${query ? `?${query}` : ""}`);
      const data = (await response.json()) as { notes?: Note[]; recentlyViewed?: Note[]; error?: string };

      if (!response.ok) {
        setError(data.error ?? "Failed to fetch notes");
        return;
      }

      setNotes(data.notes ?? []);
      setRecentlyViewed(data.recentlyViewed ?? []);
      setSelectedNoteIds([]);
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

  const fetchFolders = async () => {
    try {
      const response = await fetch("/api/folders");
      const data = (await response.json().catch(() => ({}))) as { folders?: Folder[] };
      setFolders(data.folders ?? []);
    } catch {
      setFolders([]);
    }
  };

  const fetchStreak = async () => {
    try {
      const response = await fetch("/api/user/preferences");
      const data = (await response.json().catch(() => ({}))) as { studyStreak?: number };
      if (response.ok) {
        setStudyStreak(Math.max(0, data.studyStreak ?? 0));
      }
    } catch {
      setStudyStreak(0);
    }
  };

  const deleteNote = async (id: string) => {
    if (!confirm("Are you sure you want to delete this note?")) return;

    try {
      const response = await fetch(`/api/notes?id=${id}`, { method: "DELETE" });

      if (response.ok) {
        setNotes((prev) => prev.filter((note) => note.id !== id));
        setRecentlyViewed((prev) => prev.filter((note) => note.id !== id));
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
      anchor.download = "kyvex-note.pdf";
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (exportError) {
      void exportError;
      setError("Failed to export note as PDF");
    } finally {
      setExportingNoteId("");
    }
  };

  const getWordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

  const getReadTime = (text: string) => Math.max(1, Math.ceil(getWordCount(text) / 200));

  const openNote = async (note: Note) => {
    setSelectedNote(note);

    try {
      const response = await fetch("/api/notes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: note.id, markViewed: true }),
      });

      if (!response.ok) return;
      const data = (await response.json().catch(() => ({}))) as { note?: Note };
      if (!data.note) return;

      setNotes((prev) => prev.map((item) => (item.id === note.id ? { ...item, lastViewedAt: data.note!.lastViewedAt } : item)));
      setRecentlyViewed((prev) => {
        const next = [data.note!, ...prev.filter((item) => item.id !== data.note!.id)];
        return next.slice(0, 3);
      });
      setSelectedNote((prev) => (prev?.id === data.note!.id ? { ...prev, lastViewedAt: data.note!.lastViewedAt } : prev));
    } catch {
      // ignore viewed-tracking errors to preserve UX
    }
  };

  const togglePin = async (note: Note) => {
    try {
      const response = await fetch("/api/notes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: note.id, isPinned: !note.isPinned }),
      });

      const data = (await response.json().catch(() => ({}))) as { note?: Note; error?: string };
      if (!response.ok || !data.note) {
        setError(data.error ?? "Failed to update pin state");
        return;
      }

      setNotes((prev) => prev.map((item) => (item.id === note.id ? { ...item, isPinned: data.note!.isPinned } : item)));
      setRecentlyViewed((prev) => prev.map((item) => (item.id === note.id ? { ...item, isPinned: data.note!.isPinned } : item)));
      setSelectedNote((prev) => (prev?.id === note.id ? { ...prev, isPinned: data.note!.isPinned } : prev));
    } catch {
      setError("Failed to update pin state");
    }
  };

  const continueStudying = (note: Note) => {
    sessionStorage.setItem(PREFILL_STORAGE_KEY, note.content);
    sessionStorage.setItem(PREFILL_FORMAT_KEY, note.format);
    router.push("/generator?source=upload");
  };

  const openFlashcardsFromNote = (noteId: string) => {
    router.push(`/flashcards?generateFrom=${encodeURIComponent(noteId)}`);
  };

  const createFolder = async () => {
    const name = newFolderName.trim();
    if (!name) {
      setError("Folder name is required");
      return;
    }

    try {
      const response = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, color: newFolderColor }),
      });

      const data = (await response.json().catch(() => ({}))) as { folder?: Folder; error?: string };
      if (!response.ok || !data.folder) {
        setError(data.error ?? "Failed to create folder");
        return;
      }

      setFolders((prev) => [...prev, data.folder!]);
      setNewFolderName("");
      setNewFolderColor("#f0b429");
      setNewFolderOpen(false);
    } catch {
      setError("Failed to create folder");
    }
  };

  const moveNoteToFolder = async (noteId: string, folderId: string | null) => {
    try {
      const response = await fetch("/api/notes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: noteId, folderId }),
      });

      if (!response.ok) {
        setError("Failed to move note");
        return;
      }

      await Promise.all([fetchNotes(), fetchFolders()]);
    } catch {
      setError("Failed to move note");
    }
  };

  const toggleNoteSelected = (noteId: string) => {
    setSelectedNoteIds((prev) =>
      prev.includes(noteId) ? prev.filter((id) => id !== noteId) : [...prev, noteId],
    );
  };

  const selectAllVisible = () => {
    const allIds = notes.map((note) => note.id);
    setSelectedNoteIds((prev) => (prev.length === allIds.length ? [] : allIds));
  };

  const bulkDeleteSelected = async () => {
    if (!selectedNoteIds.length) return;
    if (!confirm(`Delete ${selectedNoteIds.length} selected notes?`)) return;

    try {
      const response = await fetch("/api/notes/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedNoteIds, action: "delete" }),
      });

      if (!response.ok) {
        setError("Failed to delete selected notes");
        return;
      }

      await Promise.all([fetchNotes(), fetchTagStats(), fetchFolders()]);
    } catch {
      setError("Failed to delete selected notes");
    }
  };

  const bulkMoveSelected = async () => {
    if (!selectedNoteIds.length) return;

    try {
      const response = await fetch("/api/notes/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedNoteIds, action: "move", folderId: bulkMoveFolderId || null }),
      });

      if (!response.ok) {
        setError("Failed to move selected notes");
        return;
      }

      await Promise.all([fetchNotes(), fetchFolders()]);
    } catch {
      setError("Failed to move selected notes");
    }
  };

  const bulkExportSelected = () => {
    if (!selectedNoteIds.length) return;

    const selected = notes.filter((note) => selectedNoteIds.includes(note.id));
    const payload = selected
      .map((note) => `${note.title}\n${"-".repeat(note.title.length)}\n${note.content}`)
      .join("\n\n\n");

    const blob = new Blob([payload], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "kyvex-notes.txt";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const exportAllNotes = () => {
    if (!notes.length) return;
    const payload = notes
      .map((note) => `=== ${note.title} ===\n${note.content}`)
      .join("\n\n");
    const blob = new Blob([payload], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "kyvex-all-notes.txt";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const eli5Note = async (content: string) => {
    setEli5Loading(true);
    setEli5Result("");
    setEli5ModalOpen(true);
    try {
      const res = await fetch("/api/eli5", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: content }),
      });
      const data = (await res.json().catch(() => ({}))) as { explanation?: string; error?: string };
      if (!res.ok || !data.explanation) {
        setEli5Result(data.error ?? "Failed to get ELI5 explanation.");
        return;
      }
      setEli5Result(data.explanation);
    } catch {
      setEli5Result("Failed to get ELI5 explanation.");
    } finally {
      setEli5Loading(false);
    }
  };

  const shareNote = async (note: Note) => {
    try {
      const response = await fetch("/api/notes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: note.id, isShared: true }),
      });

      const data = (await response.json().catch(() => ({}))) as { note?: Note };
      if (!response.ok || !data.note) {
        setError("Failed to share note");
        return;
      }

      setNotes((prev) => prev.map((item) => (item.id === note.id ? { ...item, isShared: true } : item)));
      const link = `${window.location.origin}/notes/shared/${note.id}`;
      await navigator.clipboard.writeText(link);
    } catch {
      setError("Failed to share note");
    }
  };

  const duplicateNote = async (note: Note) => {
    try {
      const response = await fetch("/api/notes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: note.id, duplicate: true }),
      });

      if (!response.ok) {
        setError("Failed to duplicate note");
        return;
      }

      await Promise.all([fetchNotes(), fetchTagStats(), fetchFolders(), fetchStreak()]);
    } catch {
      setError("Failed to duplicate note");
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
        return "badge-blue";
      case "detailed":
        return "badge-purple";
      case "flashcards":
        return "badge-green";
      case "questions":
        return "badge-orange";
      default:
        return "badge-neutral";
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
      <main className="app-premium-dark min-h-screen bg-gray-950 p-6">
        <SkeletonList count={6} />
      </main>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <main className="app-premium-dark min-h-screen bg-gray-950">

      <div className="kv-page container mx-auto mb-[100px] max-w-7xl px-4 py-8 sm:mb-0 sm:px-6 sm:py-12">
        <PageHero
          title="My Notes"
          description={`All your saved study notes in one place • 🔥 ${studyStreak} day streak`}
          actions={
            <div className="flex gap-2">
              <Button onClick={exportAllNotes} variant="secondary" size="sm" disabled={!notes.length}>Export All Notes</Button>
              <Button onClick={() => setTagModalOpen(true)} variant="secondary" size="sm">Manage Tags</Button>
            </div>
          }
        />

        <div className="mb-4 lg:hidden">
          <Button
            onClick={() => setShowMobileFilters((prev) => !prev)}
            variant="secondary"
            fullWidth
            size="sm"
          >
            {showMobileFilters ? "Hide Filters" : "Show Filters"}
          </Button>
        </div>

        <div className="mb-6 kv-card">
          <div className="grid gap-3 md:grid-cols-4">
            <input
              type="text"
              placeholder="Search title and content..."
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              className="md:col-span-2 w-full kv-input"
              aria-label="Search notes"
            />
            <div className="w-full sm:w-48">
              <Listbox
                value={activePeriod}
                onChange={(v) => setActivePeriod(v)}
                options={[
                  { value: "", label: "All dates" },
                  { value: "7d", label: "Last 7 days" },
                  { value: "month", label: "This month" },
                ]}
              />
            </div>
            <div className="w-full sm:w-48">
              <Listbox
                value={sortBy}
                onChange={(v) => setSortBy(v)}
                options={[
                  { value: "newest", label: "Sort: Newest" },
                  { value: "oldest", label: "Sort: Oldest" },
                  { value: "a-z", label: "Sort: A-Z" },
                ]}
              />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {[
              { value: "", label: "All" },
              { value: "summary", label: "Summary" },
              { value: "flashcards", label: "Flashcards" },
              { value: "questions", label: "Quiz" },
              { value: "detailed", label: "Detailed" },
            ].map((option) => (
              <Button
                key={option.label}
                onClick={() => setActiveFormat(option.value)}
                variant={activeFormat === option.value ? "primary" : "secondary"}
                size="sm"
                className="px-3 py-1 text-xs"
              >
                {option.label}
              </Button>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-500">{resultLabel}</span>
            {(activeTag || activeFolder || activeFormat || activePeriod || debouncedSearch) && (
              <Button
                onClick={() => {
                  setActiveTag("");
                  setActiveFolder("");
                  setActiveFormat("");
                  setActivePeriod("");
                  setSearchInput("");
                  setDebouncedSearch("");
                }}
                variant="secondary"
                size="sm"
                className="rounded-full px-3 py-1 text-xs"
              >
                Clear filters
              </Button>
            )}
          </div>
        </div>

        {recentlyViewed.length > 0 && (
          <div className="mb-6 kv-card">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Recently Viewed</h2>
              <span className="text-xs text-gray-500">Last 3 notes accessed</span>
            </div>
            <div className="stagger-grid grid gap-3 md:grid-cols-3">
              {recentlyViewed.slice(0, 3).map((note) => (
                <button
                  key={`recent-${note.id}`}
                  type="button"
                  onClick={() => void openNote(note)}
                  className="stagger-card kv-card text-left transition-all duration-200 hover:-translate-y-1 hover:border-blue-300 hover:bg-blue-50"
                >
                  <p className="line-clamp-1 text-sm font-semibold text-white">{note.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-gray-600">{note.content}</p>
                  <p className="mt-2 text-[11px] text-gray-500">
                    {note.lastViewedAt ? formatDate(note.lastViewedAt) : "Recently viewed"}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <aside className={`${showMobileFilters ? "block" : "hidden"} kv-card lg:block`}>
            <div className="mb-3 flex items-center justify-between lg:hidden">
              <p className="text-sm font-semibold text-white">Filters</p>
              <Button size="sm" variant="secondary" onClick={() => setShowMobileFilters(false)}>
                Close
              </Button>
            </div>
            <div className="mb-4 rounded-lg border border-gray-100 p-3">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white">Folders</h2>
                <Button onClick={() => setNewFolderOpen((prev) => !prev)} variant="secondary" size="sm" className="px-2 py-1 text-xs">
                  New Folder
                </Button>
              </div>

              {newFolderOpen && (
                <div className="mb-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-2">
                  <input
                    value={newFolderName}
                    onChange={(event) => setNewFolderName(event.target.value)}
                    placeholder="Folder name"
                    className="kv-input mb-2"
                  />
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-xs text-gray-500">Color</span>
                    <input
                      type="color"
                      value={newFolderColor}
                      onChange={(event) => setNewFolderColor(event.target.value)}
                      className="h-8 w-12 cursor-pointer rounded border border-[var(--border-default)] bg-transparent p-0"
                    />
                  </div>
                  <Button onClick={() => void createFolder()} size="sm" className="w-full px-2 py-2 text-xs">
                    Create Folder
                  </Button>
                </div>
              )}

              <Button
                onClick={() => setActiveFolder("")}
                variant={!activeFolder ? "primary" : "secondary"}
                fullWidth
                size="sm"
                className="mb-2 justify-start px-3 py-2 text-left text-sm"
              >
                All Folders
              </Button>

              <div className="space-y-2">
                {folders.map((folder) => (
                  <button
                    key={folder.id}
                    type="button"
                    onClick={() => setActiveFolder(folder.id)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      const noteId = event.dataTransfer.getData("text/note-id");
                      if (noteId) {
                        void moveNoteToFolder(noteId, folder.id);
                      }
                    }}
                    className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm ${
                      activeFolder === folder.id
                        ? "border-blue-200 bg-blue-50 text-blue-700"
                        : "border-[var(--border-default)] bg-[var(--bg-card)] text-gray-700 hover:bg-[var(--bg-surface)]"
                    }`}
                  >
                    <span className="truncate">{folder.name}</span>
                    <span className="text-xs text-gray-500">{folder.noteCount}</span>
                  </button>
                ))}
              </div>
            </div>

            <h2 className="mb-3 text-sm font-semibold text-white">Tags</h2>
            <Button
              onClick={() => setActiveTag("")}
              variant={!activeTag ? "primary" : "secondary"}
              fullWidth
              size="sm"
              className={`mb-2 justify-start px-3 py-2 text-left text-sm font-medium ${
                !activeTag ? "bg-blue-600 text-white" : "border border-[var(--border-default)] text-gray-700 hover:bg-[var(--bg-surface)]"
              }`}
            >
              All Notes
            </Button>

            {isTagLoading ? (
              <p className="text-xs text-gray-500">Loading tags...</p>
            ) : tagStats.length === 0 ? (
              <p className="text-xs text-gray-500">No tags yet.</p>
            ) : (
              <div className="space-y-2">
                {tagStats.map((tag) => (
                  <Button
                    key={tag.name}
                    onClick={() => setActiveTag(tag.name)}
                    variant="secondary"
                    fullWidth
                    size="sm"
                    className={`flex justify-between px-3 py-2 text-sm ${
                      activeTag === tag.name
                        ? "border-blue-200 bg-blue-50 text-blue-700"
                        : "border-[var(--border-default)] text-gray-700 hover:bg-[var(--bg-surface)]"
                    }`}
                  >
                    <span className="truncate">{tag.name}</span>
                    <span className="text-xs text-gray-500">{tag.count}</span>
                  </Button>
                ))}
              </div>
            )}
          </aside>

          <section>
            {selectedNoteIds.length > 0 && (
              <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-blue-800">{selectedNoteIds.length} selected</span>
                  <Button onClick={bulkDeleteSelected} variant="danger" size="sm" className="px-3 py-1 text-xs">
                    Delete Selected
                  </Button>
                  <Button onClick={bulkExportSelected} variant="secondary" size="sm" className="px-3 py-1 text-xs">
                    Export Selected
                  </Button>
                  <div className="w-44">
                    <Listbox
                      value={bulkMoveFolderId}
                      onChange={(v) => setBulkMoveFolderId(v)}
                      options={[
                        { value: "", label: "No Folder" },
                        ...folders.map((folder) => ({ value: folder.id, label: folder.name })),
                      ]}
                    />
                  </div>
                  <Button onClick={bulkMoveSelected} variant="secondary" size="sm" className="px-3 py-1 text-xs">
                    Move to Folder
                  </Button>
                  <Button onClick={selectAllVisible} variant="secondary" size="sm" className="px-3 py-1 text-xs">
                    {selectedNoteIds.length === notes.length ? "Unselect All" : "Select All"}
                  </Button>
                </div>
              </div>
            )}

            {isLoading ? (
              <SkeletonList count={6} />
            ) : notes.length === 0 ? (
              <EmptyState
                title={debouncedSearch || activeTag || activeFolder || activePeriod || activeFormat ? "No notes found" : "Nothing here yet - generate your first note!"}
                description={
                  debouncedSearch || activeTag || activeFolder || activePeriod || activeFormat
                    ? "Try adjusting your search or removing filters to see more results."
                    : "Upload a file or paste text and we will turn it into study-ready notes in seconds."
                }
                actionLabel="Create Your First Note"
                actionHref="/generator"
                secondaryActionLabel="Upload a File"
                secondaryActionHref="/upload"
              />
            ) : (
              <div className="stagger-grid grid gap-6 md:grid-cols-2">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    draggable
                    onDragStart={(event) => event.dataTransfer.setData("text/note-id", note.id)}
                    onMouseEnter={() => setHoveredNoteId(note.id)}
                    onMouseLeave={() => setHoveredNoteId("")}
                    className="stagger-card group relative kv-card transition-all duration-200 hover:-translate-y-1"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedNoteIds.includes(note.id)}
                          onChange={() => toggleNoteSelected(note.id)}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          aria-label="Select note"
                        />
                        {note.isPinned && <span className="badge badge-warning px-2 py-1 text-[10px] font-semibold">Pinned</span>}
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getFormatBadgeColor(note.format)}`}>
                          {getFormatLabel(note.format)}
                        </span>
                        {note.isShared && <span className="badge badge-success px-2 py-1 text-[10px] font-semibold">Shared</span>}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          onClick={() => void togglePin(note)}
                          variant="ghost"
                          size="sm"
                          className={`p-2 transition ${note.isPinned ? "text-yellow-600" : "text-gray-400 hover:text-yellow-600"}`}
                          title={note.isPinned ? "Unpin note" : "Pin note"}
                          aria-label={note.isPinned ? "Unpin note" : "Pin note"}
                        >
                          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path d="M10 1l2.4 4.86L18 6.69l-4 3.9.94 5.48L10 13.77l-4.94 2.3L6 10.6 2 6.7l5.6-.83L10 1z" />
                          </svg>
                        </Button>
                        <Button
                          onClick={() => void shareNote(note)}
                          variant="ghost"
                          size="sm"
                          className="p-2 text-gray-400 transition hover:text-emerald-600"
                          title="Share note link"
                          aria-label="Share note link"
                        >
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C9.886 14.544 11.544 15.25 13.25 15.25s3.364-.706 4.566-1.908l1.768-1.768a4.75 4.75 0 00-6.717-6.717l-1.012 1.012m-.77 7.274l-1.012 1.012a4.75 4.75 0 01-6.717-6.717l1.768-1.768a4.75 4.75 0 016.717 0" />
                          </svg>
                        </Button>
                        <Button
                          onClick={() => setMenuOpenNoteId((prev) => (prev === note.id ? "" : note.id))}
                          variant="ghost"
                          size="sm"
                          className="p-2 text-gray-400 transition hover:text-gray-700"
                          title="More actions"
                          aria-label="More actions"
                        >
                          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path d="M10 4a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 7a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 7a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" />
                          </svg>
                        </Button>
                        <Button
                          onClick={() => void deleteNote(note.id)}
                          variant="ghost"
                          size="sm"
                          className="p-2 text-gray-400 opacity-0 transition hover:text-red-600 group-hover:opacity-100"
                          title="Delete note"
                          aria-label="Delete note"
                        >
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </Button>
                      </div>
                    </div>

                    <h3 className="mb-2 line-clamp-2 text-[20px] font-semibold text-white">
                      <HighlightText text={note.title} query={debouncedSearch} />
                    </h3>

                    <p className="mb-3 line-clamp-3 text-sm text-gray-600">
                      <HighlightText text={note.content} query={debouncedSearch} />
                    </p>

                    <div style={{ marginTop: "12px", marginBottom: "12px" }}>
                      <AudioPlayer
                        noteId={note.id}
                        noteTitle={note.title}
                        noteContent={note.content}
                        compact={true}
                      />
                    </div>

                    {note.tags.length > 0 && (
                      <div className="mb-3 flex flex-wrap gap-2">
                        {note.tags.map((tag) => (
                          <Button
                            key={`${note.id}-${tag}`}
                            onClick={() => setActiveTag(tag)}
                            variant="secondary"
                            size="sm"
                            className={`rounded-full px-2 py-1 text-xs ${getTagColor(tag)}`}
                          >
                            <HighlightText text={tag} query={debouncedSearch} />
                          </Button>
                        ))}
                      </div>
                    )}

                    <p className="text-xs text-gray-500">{formatDate(note.createdAt)}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {getWordCount(note.content).toLocaleString()} words • {getReadTime(note.content)} min read
                    </p>

                    {menuOpenNoteId === note.id && (
                      <div className="mt-3 kv-card p-2">
                        <Button
                          onClick={() => {
                            void duplicateNote(note);
                            setMenuOpenNoteId("");
                          }}
                          variant="secondary"
                          size="sm"
                          className="w-full justify-start px-3 py-2 text-xs"
                        >
                          Duplicate
                        </Button>
                      </div>
                    )}

                    {hoveredNoteId === note.id && (
                      <div className="pointer-events-none absolute left-full top-0 z-30 ml-3 hidden w-80 kv-card md:block">
                        <p className="mb-2 text-sm font-semibold text-white">Preview</p>
                        <p className="max-h-72 overflow-y-auto whitespace-pre-wrap text-xs text-gray-700">{note.content}</p>
                      </div>
                    )}

                    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <Button
                        onClick={() => void openNote(note)}
                        variant="secondary"
                        size="sm"
                        className="py-2"
                      >
                        View
                      </Button>
                      <Button
                        onClick={() => continueStudying(note)}
                        variant="secondary"
                        size="sm"
                        className="py-2"
                      >
                        Continue Studying
                      </Button>
                      <Button
                        onClick={() => openFlashcardsFromNote(note.id)}
                        variant="secondary"
                        size="sm"
                        className="py-2"
                      >
                        -&gt; Flashcards
                      </Button>
                      <Button
                        onClick={() => void exportNotePdf(note.id)}
                        disabled={exportingNoteId === note.id}
                        loading={exportingNoteId === note.id}
                        size="sm"
                        className="py-2"
                      >
                        {exportingNoteId === note.id ? "Exporting..." : "Export PDF"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {selectedNote && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" 
          onClick={() => setSelectedNote(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="note-title"
        >
          <div
            className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-[var(--bg-card)] p-8"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-6 flex items-start justify-between">
              <div>
                <span className={`mb-3 inline-block rounded-full px-3 py-1 text-xs font-semibold ${getFormatBadgeColor(selectedNote.format)}`}>
                  {getFormatLabel(selectedNote.format)}
                </span>
                <h2 id="note-title" className="text-2xl font-bold text-white">{selectedNote.title}</h2>
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

                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Move to folder</span>
                  <div className="w-44">
                    <Listbox
                      value={selectedNote.folderId ?? ""}
                      onChange={(value) => {
                        const nextFolderId = value || null;
                        void moveNoteToFolder(selectedNote.id, nextFolderId);
                        setSelectedNote((prev) => (prev ? { ...prev, folderId: nextFolderId } : prev));
                      }}
                      options={[
                        { value: "", label: "No Folder" },
                        ...folders.map((folder) => ({ value: folder.id, label: folder.name })),
                      ]}
                    />
                  </div>
                </div>
              </div>

              <Button
                onClick={() => setSelectedNote(null)}
                variant="ghost"
                size="sm"
                className="p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                aria-label="Close modal"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Button>
            </div>

            <div className="prose kv-card max-w-none whitespace-pre-wrap text-gray-700">
              <HighlightText text={selectedNote.content} query={debouncedSearch} />
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-4">
              <Button
                onClick={() => {
                  void navigator.clipboard.writeText(selectedNote.content);
                }}
                variant="secondary"
                size="md"
              >
                Copy
              </Button>
              <Button
                onClick={() => void eli5Note(selectedNote.content)}
                variant="secondary"
                size="md"
                loading={eli5Loading}
                disabled={eli5Loading}
              >
                ELI5 this
              </Button>
              <Button
                onClick={() => openFlashcardsFromNote(selectedNote.id)}
                variant="secondary"
                size="md"
              >
                -&gt; Flashcards
              </Button>
              <Button
                onClick={() => void exportNotePdf(selectedNote.id)}
                disabled={exportingNoteId === selectedNote.id}
                loading={exportingNoteId === selectedNote.id}
                size="md"
              >
                {exportingNoteId === selectedNote.id ? "Exporting..." : "Export as PDF"}
              </Button>
              <Button
                onClick={() => {
                  void deleteNote(selectedNote.id);
                  setSelectedNote(null);
                }}
                variant="danger"
                size="md"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {eli5ModalOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
          onClick={() => setEli5ModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="ELI5 explanation"
        >
          <div
            className="kv-card-gold w-full max-w-xl overflow-y-auto rounded-2xl p-6 shadow-2xl"
            style={{ maxHeight: "70vh", background: "var(--bg-elevated)", border: "1px solid rgba(240,180,41,0.3)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--accent-gold)]">🧠 ELI5 Explanation</h2>
              <Button onClick={() => setEli5ModalOpen(false)} variant="ghost" size="sm" aria-label="Close ELI5 modal">✕</Button>
            </div>
            {eli5Loading ? (
              <div className="flex items-center gap-2 py-4 text-sm text-[var(--text-secondary)]">
                <span className="h-2 w-2 animate-bounce rounded-full bg-[var(--accent-gold)] [animation-delay:-0.3s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-[var(--accent-gold)] [animation-delay:-0.15s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-[var(--accent-gold)]" />
                <span className="ml-2">Getting simple explanation...</span>
              </div>
            ) : (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--text-primary)]">{eli5Result}</p>
            )}
          </div>
        </div>
      )}

      {tagModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setTagModalOpen(false)}>
          <div
            className="w-full max-w-xl rounded-xl bg-[var(--bg-card)] p-6"
            onClick={(event) => event.stopPropagation()}
          >

            <div className="space-y-5">
              <div className="rounded-lg border border-[var(--border-default)] p-4">
                <p className="mb-2 text-sm font-semibold text-gray-800">Rename tag</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    value={renameOldTag}
                    onChange={(event) => setRenameOldTag(event.target.value)}
                    placeholder="Current tag"
                    className="kv-input"
                  />
                  <input
                    value={renameNewTag}
                    onChange={(event) => setRenameNewTag(event.target.value)}
                    placeholder="New tag"
                    className="kv-input"
                  />
                </div>
                <Button
                  onClick={() =>
                    void updateTags({
                      action: "rename",
                      oldTag: renameOldTag,
                      newTag: renameNewTag,
                    })
                  }
                  size="sm"
                  className="mt-2 px-3 py-2 text-xs"
                >
                  Rename
                </Button>
              </div>

              <div className="rounded-lg border border-[var(--border-default)] p-4">
                <p className="mb-2 text-sm font-semibold text-gray-800">Delete tag</p>
                <input
                  value={deleteTagName}
                  onChange={(event) => setDeleteTagName(event.target.value)}
                  placeholder="Tag to delete"
                  className="w-full kv-input"
                />
                <Button
                  onClick={() => void updateTags({ action: "delete", tag: deleteTagName })}
                  variant="danger"
                  size="sm"
                  className="mt-2 px-3 py-2 text-xs"
                >
                  Delete
                </Button>
              </div>

              <div className="rounded-lg border border-[var(--border-default)] p-4">
                <p className="mb-2 text-sm font-semibold text-gray-800">Merge tags</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    value={mergeSourceTag}
                    onChange={(event) => setMergeSourceTag(event.target.value)}
                    placeholder="Source tag"
                    className="kv-input"
                  />
                  <input
                    value={mergeTargetTag}
                    onChange={(event) => setMergeTargetTag(event.target.value)}
                    placeholder="Target tag"
                    className="kv-input"
                  />
                </div>
                <Button
                  onClick={() =>
                    void updateTags({
                      action: "merge",
                      sourceTag: mergeSourceTag,
                      targetTag: mergeTargetTag,
                    })
                  }
                  size="sm"
                  className="mt-2 px-3 py-2 text-xs"
                >
                  Merge
                </Button>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <Button
                onClick={() => setTagModalOpen(false)}
                variant="secondary"
                size="sm"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}


