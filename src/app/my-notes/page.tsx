"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Search, Plus, Folder, Tag, Pin, Trash2, Copy, Share2, MoreHorizontal,
  X, FileText, Edit3, Bold, Italic, Heading1, Heading2, Heading3,
  List, ListOrdered, Save, Filter, Flame, BookOpen,
  Image as ImageIcon, ZoomIn,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "~/app/_components/button";
import AudioPlayer from "~/app/_components/AudioPlayer";
import EmptyState from "@/app/_components/empty-state";
import Skeleton, { SkeletonList } from "@/app/_components/skeleton";
import Listbox from "~/app/_components/Listbox";
import { useToast } from "~/app/_components/toast";
import { renderMath } from "@/lib/mathRenderer";

const PREFILL_STORAGE_KEY = "kyvex:prefillText";
const PREFILL_FORMAT_KEY = "kyvex:prefillFormat";

type Note = {
  id: string;
  title: string;
  content: string;
  format: string;
  createdAt: string;
  updatedAt: string;
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
  "bg-blue-500/10 text-blue-400",
  "bg-emerald-500/10 text-emerald-400",
  "bg-purple-500/10 text-purple-400",
  "bg-orange-500/10 text-orange-400",
  "bg-pink-500/10 text-pink-400",
  "bg-indigo-500/10 text-indigo-400",
];

/* ─── Ontario Grade 12 Subjects ─────────────────────────────── */

type Subject = {
  code: string;
  label: string;
  hex: string;
  glow: string;
  ring: string;
  badge: string;
  dot: string;
};

const SUBJECTS: Subject[] = [
  {
    code: "SCH4U",
    label: "Chemistry",
    hex: "#f0b429",
    glow: "rgba(240, 180, 41, 0.30)",
    ring: "ring-amber-400/30 shadow-[0_0_24px_-4px_rgba(240,180,41,0.55)]",
    badge: "bg-amber-400/10 text-amber-300 border-amber-300/20",
    dot: "bg-amber-400",
  },
  {
    code: "MCV4U",
    label: "Calculus",
    hex: "#60a5fa",
    glow: "rgba(96, 165, 250, 0.30)",
    ring: "ring-blue-400/30 shadow-[0_0_24px_-4px_rgba(96,165,250,0.55)]",
    badge: "bg-blue-400/10 text-blue-300 border-blue-300/20",
    dot: "bg-blue-400",
  },
  {
    code: "ENG4U",
    label: "English",
    hex: "#a78bfa",
    glow: "rgba(167, 139, 250, 0.30)",
    ring: "ring-purple-400/30 shadow-[0_0_24px_-4px_rgba(167,139,250,0.55)]",
    badge: "bg-purple-400/10 text-purple-300 border-purple-300/20",
    dot: "bg-purple-400",
  },
  {
    code: "SPH4U",
    label: "Physics",
    hex: "#2dd4bf",
    glow: "rgba(45, 212, 191, 0.30)",
    ring: "ring-teal-400/30 shadow-[0_0_24px_-4px_rgba(45,212,191,0.55)]",
    badge: "bg-teal-400/10 text-teal-300 border-teal-300/20",
    dot: "bg-teal-400",
  },
];

function detectSubject(note: { tags: string[] }): Subject | null {
  const lower = note.tags.map((t) => t.toLowerCase());
  return (
    SUBJECTS.find((s) => lower.includes(s.code.toLowerCase()) || lower.includes(s.label.toLowerCase())) ??
    null
  );
}

/* ─── Motion variants (opacity + transform only for perf) ──── */

const gridContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.04 },
  },
};

const cardVariants = {
  hidden: { scale: 0.9, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { type: "spring" as const, stiffness: 300, damping: 24 },
  },
  saved: {
    scale: [1, 1.05, 1],
    transition: { duration: 0.42, ease: "easeOut" as const },
  },
};

function getTagColor(tag: string): string {
  const sum = tag.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return TAG_COLOR_CLASSES[sum % TAG_COLOR_CLASSES.length] ?? TAG_COLOR_CLASSES[0]!;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  const vowelGroups = w.match(/[aeiouy]+/g);
  let count = vowelGroups ? vowelGroups.length : 1;
  if (w.endsWith('e') && count > 1) count--;
  return Math.max(1, count);
}

function fleschKincaid(text: string): { score: number; label: string; color: string } {
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const words = text.trim().split(/\s+/).filter((w) => w.length > 0);
  const syllables = words.reduce((sum, w) => sum + countSyllables(w), 0);
  const S = sentences.length || 1;
  const W = words.length || 1;
  const score = Math.round(206.835 - 1.015 * (W / S) - 84.6 * (syllables / W));
  const clamped = Math.max(0, Math.min(100, score));
  let label: string;
  let color: string;
  if (clamped >= 80) { label = 'Easy'; color = '#2dd4bf'; }
  else if (clamped >= 60) { label = 'Standard'; color = '#60a5fa'; }
  else if (clamped >= 40) { label = 'Moderate'; color = '#f0b429'; }
  else { label = 'Complex'; color = '#f87171'; }
  return { score: clamped, label, color };
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
          <mark key={`${part}-${index}`} className="rounded bg-amber-400/20 px-0.5 text-amber-200">
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
  const [activeSubject, setActiveSubject] = useState<string>("");
  const [savedNoteId, setSavedNoteId] = useState<string>("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderColor, setNewFolderColor] = useState("#f0b429");
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [eli5Loading, setEli5Loading] = useState(false);
  const [eli5Result, setEli5Result] = useState("");
  const [eli5ModalOpen, setEli5ModalOpen] = useState(false);
  const [mockExamLoadingId, setMockExamLoadingId] = useState<string | null>(null);
  const evolutionSnapshotCacheRef = useRef<Record<string, string>>({});
  const { showToast } = useToast();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const editorRef = useRef<HTMLDivElement>(null);

  // Media Gallery (screenshots linked to selected note)
  type NoteMedia = { id: string; title: string; imageData: string; createdAt: string };
  const [noteMedia, setNoteMedia] = useState<NoteMedia[]>([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaViewer, setMediaViewer] = useState<string | null>(null);

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
        if (editorOpen) { setEditorOpen(false); setSelectedNote(null); setEditTitle(""); }
        else if (selectedNote) setSelectedNote(null);
        else if (tagModalOpen) setTagModalOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [editorOpen, selectedNote, tagModalOpen]);

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

  const queueEvolutionSnapshot = (noteId: string, content: string) => {
    const normalized = content.trim();
    if (!noteId || !normalized) return;
    if (evolutionSnapshotCacheRef.current[noteId] === normalized) return;
    evolutionSnapshotCacheRef.current[noteId] = normalized;

    // Fire-and-forget snapshot call so existing save UX never blocks.
    void fetch("/api/note-evolution", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ noteId, content: normalized }),
    }).catch(() => {
      // Silent fail by design.
    });
  };

  const openEditor = async (note: Note) => {
    setSelectedNote(note);
    setEditTitle(note.title);
    setEditorOpen(true);

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
      queueEvolutionSnapshot(note.id, note.content);
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

  const generateMockExam = async (noteId: string) => {
    if (mockExamLoadingId) return;
    setMockExamLoadingId(noteId);
    try {
      const res = await fetch("/api/mock-exam/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          noteId,
          numMultipleChoice: 10,
          numShortAnswer: 5,
          timeLimitMinutes: 45,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        exam?: { id: string };
        error?: string;
      };
      if (!res.ok || !data.exam?.id) {
        showToast(data.error ?? "Failed to generate mock exam", "error");
        return;
      }
      showToast("Mock exam ready", "success");
      router.push(`/mock-exam/${data.exam.id}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Network error", "error");
    } finally {
      setMockExamLoadingId(null);
    }
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

      const note = notes.find((item) => item.id === noteId);
      if (note) {
        queueEvolutionSnapshot(note.id, note.content);
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
      queueEvolutionSnapshot(note.id, note.content);
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

      queueEvolutionSnapshot(note.id, note.content);
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

  const closeEditor = () => {
    setEditorOpen(false);
    setSelectedNote(null);
    setEditTitle("");
  };

  const saveNoteEdit = async () => {
    if (!selectedNote) return;
    const content = editorRef.current?.innerHTML ?? selectedNote.content;
    try {
      const response = await fetch("/api/notes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedNote.id, title: editTitle, content }),
      });
      if (!response.ok) {
        setError("Failed to save note");
        return;
      }
      const data = (await response.json().catch(() => ({}))) as { note?: Note };
      if (data.note) {
        setNotes((prev) => prev.map((n) => (n.id === data.note!.id ? { ...n, title: data.note!.title, content: data.note!.content } : n)));
        setSavedNoteId(data.note.id);
        setTimeout(() => setSavedNoteId((prev) => (prev === data.note!.id ? "" : prev)), 600);
        showToast("Note saved", "success");
      }
      closeEditor();
    } catch {
      setError("Failed to save note");
    }
  };

  const execEditor = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  // Fetch screenshots attached to the open note
  useEffect(() => {
    if (!editorOpen || !selectedNote) {
      setNoteMedia([]);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setMediaLoading(true);
      try {
        const r = await fetch(`/api/screenshots?noteId=${encodeURIComponent(selectedNote.id)}`);
        if (!r.ok) return;
        const data = (await r.json()) as NoteMedia[];
        if (!cancelled) setNoteMedia(Array.isArray(data) ? data : []);
      } finally {
        if (!cancelled) setMediaLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [editorOpen, selectedNote]);

  const insertImageIntoEditor = (dataUrl: string, altText: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    const safeAlt = altText.replace(/"/g, '&quot;');
    // Inline image; max-width keeps it responsive inside the editor
    const html = `<p><img src="${dataUrl}" alt="${safeAlt}" style="max-width:100%;height:auto;border-radius:8px;" /></p><p><br/></p>`;
    document.execCommand("insertHTML", false, html);
    showToast("Image inserted into note", "success");
  };

  const unlinkMediaFromNote = async (id: string) => {
    if (!selectedNote) return;
    const prev = noteMedia;
    setNoteMedia((items) => items.filter((m) => m.id !== id));
    try {
      const r = await fetch(`/api/screenshots?id=${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteId: null }),
      });
      if (!r.ok) {
        setNoteMedia(prev);
        showToast("Failed to remove media", "error");
      }
    } catch {
      setNoteMedia(prev);
      showToast("Failed to remove media", "error");
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
        return "bg-blue-500/10 text-blue-400";
      case "detailed":
        return "bg-purple-500/10 text-purple-400";
      case "flashcards":
        return "bg-emerald-500/10 text-emerald-400";
      case "questions":
        return "bg-orange-500/10 text-orange-400";
      default:
        return "bg-zinc-500/10 text-zinc-400";
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

  const displayNotes = useMemo(() => {
    if (!activeSubject) return notes;
    return notes.filter((n) => {
      const lower = n.tags.map((t) => t.toLowerCase());
      const subj = SUBJECTS.find((s) => s.code === activeSubject);
      if (!subj) return true;
      return lower.includes(subj.code.toLowerCase()) || lower.includes(subj.label.toLowerCase());
    });
  }, [notes, activeSubject]);

  const subjectCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of SUBJECTS) counts[s.code] = 0;
    for (const n of notes) {
      const subj = detectSubject(n);
      if (subj) counts[subj.code] = (counts[subj.code] ?? 0) + 1;
    }
    return counts;
  }, [notes]);

  const resultLabel = useMemo(() => {
    if (isLoading) return "Loading...";
    return `${displayNotes.length} result${displayNotes.length === 1 ? "" : "s"}`;
  }, [isLoading, displayNotes.length]);

  if (status === "loading") {
    return (
      <main className="min-h-screen bg-black p-6">
        <SkeletonList count={6} />
      </main>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-zinc-100">
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/4 h-[480px] w-[480px] rounded-full bg-amber-500/10 blur-[140px]" />
        <div className="absolute top-1/3 right-0 h-[420px] w-[420px] rounded-full bg-teal-500/10 blur-[140px]" />
        <div className="absolute bottom-0 left-0 h-[420px] w-[420px] rounded-full bg-purple-500/10 blur-[140px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        {/* Header */}
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-100 sm:text-4xl">My Notes</h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-400">
              <span className="inline-flex items-center gap-1.5">
                <Flame size={14} className="text-amber-400" aria-hidden="true" />
                {studyStreak} day streak
              </span>
              <span className="h-1 w-1 rounded-full bg-zinc-700" />
              <span>{notes.length} notes total</span>
              {activeSubject && (
                <>
                  <span className="h-1 w-1 rounded-full bg-zinc-700" />
                  <span>Filtering by {activeSubject}</span>
                </>
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={exportAllNotes}
              disabled={!notes.length}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-200 backdrop-blur-xl transition-colors duration-200 hover:border-white/25 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50 will-change-transform"
            >
              Export All
            </button>
            <button
              type="button"
              onClick={() => setTagModalOpen(true)}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-200 backdrop-blur-xl transition-colors duration-200 hover:border-white/25 hover:bg-white/10 will-change-transform"
            >
              Manage Tags
            </button>
          </div>
        </header>

        {/* Glass Search Bar */}
        <div className="mb-6">
          <div
            className={`relative flex items-center gap-3 rounded-2xl border bg-white/5 px-5 py-3 backdrop-blur-xl transition-colors duration-200 ${
              searchFocused
                ? "border-teal-500/50 shadow-[0_0_24px_-6px_rgba(45,212,191,0.45)]"
                : "border-white/10"
            }`}
          >
            <Search
              size={18}
              className={`transition-colors duration-200 ${searchFocused ? "text-teal-300" : "text-zinc-400"}`}
              aria-hidden="true"
            />
            <label htmlFor="note-search" className="sr-only">Search notes</label>
            <input
              id="note-search"
              type="text"
              placeholder="Search notes by title, content, or tag…"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              className="flex-1 bg-transparent text-base text-zinc-100 placeholder-zinc-500 outline-none"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => { setSearchInput(""); setDebouncedSearch(""); }}
                className="rounded-lg p-1 text-zinc-400 transition-colors duration-200 hover:text-zinc-100"
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
            <div className="hidden h-6 w-px bg-white/10 sm:block" />
            <div className="hidden gap-2 sm:flex">
              <div className="w-[140px]">
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
              <div className="w-[130px]">
                <Listbox
                  value={sortBy}
                  onChange={(v) => setSortBy(v)}
                  options={[
                    { value: "newest", label: "Newest" },
                    { value: "oldest", label: "Oldest" },
                    { value: "a-z", label: "A-Z" },
                  ]}
                />
              </div>
            </div>
          </div>

          {/* Format pills */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {[
              { value: "", label: "All" },
              { value: "summary", label: "Summary" },
              { value: "flashcards", label: "Flashcards" },
              { value: "questions", label: "Quiz" },
              { value: "detailed", label: "Detailed" },
            ].map((option) => (
              <button
                key={option.label}
                type="button"
                onClick={() => setActiveFormat(option.value)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors duration-200 will-change-transform ${
                  activeFormat === option.value
                    ? "border-teal-300/30 bg-teal-400/10 text-teal-200"
                    : "border-white/10 bg-white/5 text-zinc-300 hover:border-white/20 hover:bg-white/10"
                }`}
              >
                {option.label}
              </button>
            ))}

            <div className="ml-auto flex items-center gap-3 text-xs text-zinc-400">
              <span>{resultLabel}</span>
              {(activeTag || activeFolder || activeFormat || activePeriod || activeSubject || debouncedSearch) && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveTag("");
                    setActiveFolder("");
                    setActiveFormat("");
                    setActivePeriod("");
                    setActiveSubject("");
                    setSearchInput("");
                    setDebouncedSearch("");
                  }}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-semibold text-zinc-300 transition-colors duration-200 hover:border-white/20 hover:bg-white/10"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile filter toggle */}
        <div className="mb-4 lg:hidden">
          <button
            type="button"
            onClick={() => setShowMobileFilters((prev) => !prev)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-zinc-200 backdrop-blur-xl transition-colors duration-200 hover:bg-white/10"
          >
            <Filter size={14} aria-hidden="true" />
            {showMobileFilters ? "Hide Subject Rail" : "Show Subject Rail"}
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          {/* ─── Subject Rail ─────────────────────────────── */}
          <aside className={`${showMobileFilters ? "block" : "hidden"} space-y-5 lg:block`}>
            {/* Subjects */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
              <h2 className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
                <BookOpen size={11} aria-hidden="true" /> Subjects
              </h2>
              <button
                type="button"
                onClick={() => setActiveSubject("")}
                className={`mb-1 flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition-colors duration-200 will-change-transform ${
                  !activeSubject
                    ? "border-white/15 bg-white/10 text-zinc-100"
                    : "border-transparent text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-zinc-400" aria-hidden="true" />
                  All Notes
                </span>
                <span className="text-xs text-zinc-500">{notes.length}</span>
              </button>
              <div className="space-y-1">
                {SUBJECTS.map((subj) => {
                  const isActive = activeSubject === subj.code;
                  return (
                    <button
                      key={subj.code}
                      type="button"
                      onClick={() => setActiveSubject(isActive ? "" : subj.code)}
                      className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left transition-all duration-200 will-change-transform ${
                        isActive
                          ? `border-white/20 bg-white/[0.07] text-zinc-100 ring-1 ${subj.ring}`
                          : "border-transparent text-zinc-300 hover:bg-white/5 hover:text-zinc-100"
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <span className={`h-2 w-2 rounded-full ${subj.dot}`} aria-hidden="true" />
                        <span className="flex flex-col leading-tight">
                          <span className="text-xs font-bold text-zinc-100">{subj.code}</span>
                          <span className="text-[10px] text-zinc-500">{subj.label}</span>
                        </span>
                      </span>
                      <span className="text-xs text-zinc-500">{subjectCounts[subj.code] ?? 0}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Folders */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
                  <Folder size={11} aria-hidden="true" /> Folders
                </h2>
                <button
                  type="button"
                  onClick={() => setNewFolderOpen((prev) => !prev)}
                  className="rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-zinc-300 transition-colors duration-200 hover:border-white/20 hover:bg-white/10"
                >
                  + New
                </button>
              </div>

              {newFolderOpen && (
                <div className="mb-3 rounded-xl border border-white/10 bg-black/40 p-3">
                  <label htmlFor="folder-name" className="sr-only">Folder name</label>
                  <input
                    id="folder-name"
                    value={newFolderName}
                    onChange={(event) => setNewFolderName(event.target.value)}
                    placeholder="Folder name"
                    className="mb-2 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none ring-teal-500/20 transition focus:border-teal-500/40 focus:ring-2"
                  />
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-xs text-zinc-400">Color</span>
                    <input
                      type="color"
                      value={newFolderColor}
                      onChange={(event) => setNewFolderColor(event.target.value)}
                      className="h-7 w-12 cursor-pointer rounded border border-white/10 bg-transparent p-0"
                      aria-label="Folder color"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => void createFolder()}
                    className="w-full rounded-lg bg-gradient-to-r from-teal-400 to-blue-500 py-2 text-xs font-semibold text-white transition-transform duration-200 hover:scale-[1.02] active:scale-95"
                  >
                    Create Folder
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => setActiveFolder("")}
                className={`mb-1 flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors duration-200 ${!activeFolder ? "bg-white/10 text-zinc-100" : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100"}`}
              >
                <span className="flex items-center gap-2">
                  <Folder size={13} aria-hidden="true" />
                  All Folders
                </span>
              </button>

              <div className="space-y-1">
                {folders.map((folder) => (
                  <button
                    key={folder.id}
                    type="button"
                    onClick={() => setActiveFolder(folder.id)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      const noteId = event.dataTransfer.getData("text/note-id");
                      if (noteId) void moveNoteToFolder(noteId, folder.id);
                    }}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors duration-200 ${activeFolder === folder.id ? "bg-white/10 text-zinc-100" : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100"}`}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <Folder size={13} aria-hidden="true" />
                      <span className="truncate">{folder.name}</span>
                    </span>
                    <span className="text-xs text-zinc-500">{folder.noteCount}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
              <h2 className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
                <Tag size={11} aria-hidden="true" /> Tags
              </h2>
              <button
                type="button"
                onClick={() => setActiveTag("")}
                className={`mb-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors duration-200 ${!activeTag ? "bg-white/10 text-zinc-100" : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100"}`}
              >
                <Tag size={13} aria-hidden="true" />
                All
              </button>

              {isTagLoading ? (
                <Skeleton variant="text" count={4} />
              ) : tagStats.length === 0 ? (
                <p className="text-xs text-zinc-500">No tags yet.</p>
              ) : (
                <div className="space-y-1">
                  {tagStats.slice(0, 10).map((tag) => (
                    <button
                      key={tag.name}
                      type="button"
                      onClick={() => setActiveTag(tag.name)}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors duration-200 ${activeTag === tag.name ? "bg-white/10 text-zinc-100" : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100"}`}
                    >
                      <span className="truncate">{tag.name}</span>
                      <span className="text-xs text-zinc-500">{tag.count}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </aside>

          {/* ─── Note Grid ────────────────────────────────── */}
          <section>
            {/* Bulk action bar */}
            <AnimatePresence>
              {selectedNoteIds.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="mb-4 rounded-2xl border border-teal-300/20 bg-teal-400/[0.06] p-3 backdrop-blur-xl will-change-transform"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-teal-200">{selectedNoteIds.length} selected</span>
                    <button
                      type="button"
                      onClick={bulkDeleteSelected}
                      className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-300 transition-colors duration-200 hover:bg-red-500/20"
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      onClick={bulkExportSelected}
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-zinc-300 transition-colors duration-200 hover:bg-white/10"
                    >
                      Export
                    </button>
                    <div className="w-40">
                      <Listbox
                        value={bulkMoveFolderId}
                        onChange={(v) => setBulkMoveFolderId(v)}
                        options={[
                          { value: "", label: "No Folder" },
                          ...folders.map((folder) => ({ value: folder.id, label: folder.name })),
                        ]}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={bulkMoveSelected}
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-zinc-300 transition-colors duration-200 hover:bg-white/10"
                    >
                      Move
                    </button>
                    <button
                      type="button"
                      onClick={selectAllVisible}
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-zinc-300 transition-colors duration-200 hover:bg-white/10"
                    >
                      {selectedNoteIds.length === notes.length ? "Unselect All" : "Select All"}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {isLoading ? (
              <SkeletonList count={6} />
            ) : displayNotes.length === 0 ? (
              <EmptyState
                icon="📝"
                title={debouncedSearch || activeTag || activeFolder || activePeriod || activeFormat || activeSubject ? "No notes found" : "No notes yet"}
                description={
                  debouncedSearch || activeTag || activeFolder || activePeriod || activeFormat || activeSubject
                    ? "Try adjusting your search or removing filters to see more results."
                    : "Generate your first AI note from any topic"
                }
                action={{ label: "Create your first note", href: "/generator" }}
              />
            ) : (
              <motion.div
                key={`grid-${activeSubject}-${debouncedSearch}-${activeFolder}-${activeTag}-${activeFormat}-${activePeriod}-${sortBy}`}
                variants={gridContainerVariants}
                initial="hidden"
                animate="visible"
                className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
              >
                {displayNotes.map((note) => {
                  const subj = detectSubject(note);
                  const spotColor = subj?.glow ?? "rgba(45, 212, 191, 0.18)";
                  const handleCardMouseMove = (e: React.MouseEvent<HTMLElement>) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    e.currentTarget.style.setProperty("--mx", `${e.clientX - rect.left}px`);
                    e.currentTarget.style.setProperty("--my", `${e.clientY - rect.top}px`);
                  };

                  return (
                    <motion.article
                      key={note.id}
                      variants={cardVariants}
                      animate={savedNoteId === note.id ? "saved" : "visible"}
                      whileHover={{ y: -4 }}
                      transition={{ type: "spring", stiffness: 300, damping: 24 }}
                      draggable
                      onDragStart={(event) =>
                        (event as unknown as React.DragEvent<HTMLElement>).dataTransfer?.setData(
                          "text/note-id",
                          note.id,
                        )
                      }
                      onMouseMove={handleCardMouseMove}
                      className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl transition-colors duration-200 hover:border-white/25 will-change-transform"
                      style={{
                        // @ts-expect-error CSS custom property
                        "--mx": "50%",
                        "--my": "50%",
                      }}
                    >
                      {/* Mouse-follow spotlight */}
                      <div
                        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                        style={{
                          background: `radial-gradient(420px circle at var(--mx) var(--my), ${spotColor}, transparent 60%)`,
                        }}
                      />

                      {/* Top row: badges + hover actions */}
                      <div className="relative mb-3 flex items-start justify-between gap-2">
                        <div className="flex flex-1 flex-wrap items-center gap-1.5">
                          <input
                            type="checkbox"
                            checked={selectedNoteIds.includes(note.id)}
                            onChange={() => toggleNoteSelected(note.id)}
                            className="h-4 w-4 rounded border-white/20 bg-white/10 text-teal-500 focus:ring-teal-500/30"
                            aria-label={`Select note ${note.title}`}
                          />
                          {subj && (
                            <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${subj.badge}`}>
                              {subj.code}
                            </span>
                          )}
                          {note.isPinned && (
                            <span className="rounded-md border border-amber-300/20 bg-amber-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-200">
                              Pinned
                            </span>
                          )}
                          <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getFormatBadgeColor(note.format)}`}>
                            {getFormatLabel(note.format)}
                          </span>
                          {note.isShared && (
                            <span className="rounded-md border border-emerald-300/20 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-200">
                              Shared
                            </span>
                          )}
                        </div>

                        {/* Hover actions: Pin + Delete + More */}
                        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={() => void togglePin(note)}
                            className={`rounded-lg p-1.5 backdrop-blur-md transition-colors duration-200 ${note.isPinned ? "bg-amber-500/15 text-amber-300" : "bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-amber-300"}`}
                            aria-label={note.isPinned ? "Unpin" : "Pin"}
                            title={note.isPinned ? "Unpin note" : "Pin note"}
                          >
                            <Pin size={13} aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void deleteNote(note.id)}
                            className="rounded-lg bg-white/5 p-1.5 text-zinc-300 backdrop-blur-md transition-colors duration-200 hover:bg-red-500/15 hover:text-red-300"
                            aria-label="Delete"
                            title="Delete note"
                          >
                            <Trash2 size={13} aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setMenuOpenNoteId((prev) => (prev === note.id ? "" : note.id))}
                            className="rounded-lg bg-white/5 p-1.5 text-zinc-300 backdrop-blur-md transition-colors duration-200 hover:bg-white/10 hover:text-zinc-100"
                            aria-label="More"
                            title="More actions"
                          >
                            <MoreHorizontal size={13} aria-hidden="true" />
                          </button>
                        </div>
                      </div>

                      {/* Title — high contrast */}
                      <h3 className="relative mb-2 line-clamp-2 text-lg font-bold leading-snug text-zinc-100">
                        <HighlightText text={note.title} query={debouncedSearch} />
                      </h3>

                      {/* Body */}
                      <div
                        className="relative mb-3 line-clamp-3 text-sm leading-relaxed text-zinc-400"
                        dangerouslySetInnerHTML={{ __html: renderMath(note.content) }}
                      />

                      {/* Audio */}
                      <div className="relative mb-3">
                        <AudioPlayer
                          noteId={note.id}
                          noteTitle={note.title}
                          noteContent={note.content}
                          compact
                        />
                      </div>

                      {/* Tags */}
                      {note.tags.length > 0 && (
                        <div className="relative mb-3 flex flex-wrap gap-1.5">
                          {note.tags.slice(0, 4).map((tag) => (
                            <button
                              key={`${note.id}-${tag}`}
                              type="button"
                              onClick={() => setActiveTag(tag)}
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold transition-colors duration-200 hover:opacity-80 ${getTagColor(tag)}`}
                            >
                              <HighlightText text={tag} query={debouncedSearch} />
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Footer: last edited */}
                      <div className="relative mt-auto flex items-center justify-between gap-2 border-t border-white/5 pt-3 text-xs text-zinc-400">
                        <span>Last edited {formatDate(note.updatedAt ?? note.createdAt)}</span>
                        <span className="text-zinc-500">{getReadTime(note.content)} min</span>
                      </div>

                      {/* Action row */}
                      <div className="relative mt-3 grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => void openEditor(note)}
                          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-xs font-semibold text-zinc-200 transition-colors duration-200 hover:border-white/20 hover:bg-white/10"
                        >
                          <Edit3 size={12} aria-hidden="true" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => continueStudying(note)}
                          className="rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-xs font-semibold text-zinc-200 transition-colors duration-200 hover:border-white/20 hover:bg-white/10"
                        >
                          Continue
                        </button>
                        <button
                          type="button"
                          onClick={() => openFlashcardsFromNote(note.id)}
                          className="rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-xs font-semibold text-zinc-200 transition-colors duration-200 hover:border-white/20 hover:bg-white/10"
                        >
                          Cards
                        </button>
                      </div>

                      {/* More menu */}
                      {menuOpenNoteId === note.id && (
                        <div className="absolute right-3 top-12 z-20 w-40 rounded-xl border border-white/10 bg-zinc-900/95 p-1 shadow-2xl backdrop-blur-xl">
                          <button
                            type="button"
                            onClick={() => { void duplicateNote(note); setMenuOpenNoteId(""); }}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-zinc-200 transition-colors duration-200 hover:bg-white/10"
                          >
                            <Copy size={12} aria-hidden="true" /> Duplicate
                          </button>
                          <button
                            type="button"
                            onClick={() => { void shareNote(note); setMenuOpenNoteId(""); }}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-zinc-200 transition-colors duration-200 hover:bg-white/10"
                          >
                            <Share2 size={12} aria-hidden="true" /> Share
                          </button>
                          <button
                            type="button"
                            onClick={() => { void exportNotePdf(note.id); setMenuOpenNoteId(""); }}
                            disabled={exportingNoteId === note.id}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-zinc-200 transition-colors duration-200 hover:bg-white/10 disabled:opacity-60"
                          >
                            <FileText size={12} aria-hidden="true" />
                            {exportingNoteId === note.id ? "Exporting…" : "Export PDF"}
                          </button>
                        </div>
                      )}
                    </motion.article>
                  );
                })}
              </motion.div>
            )}
          </section>
        </div>
      </div>

      {/* ─── Floating Action Button ──────────────────────── */}
      <Link
        href="/generator"
        className="group fixed bottom-6 right-6 z-30 inline-flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-blue-500 shadow-xl shadow-teal-500/40 transition-transform duration-200 hover:scale-110 active:scale-95 will-change-transform"
        aria-label="New Note"
        title="New Note"
      >
        <span className="absolute -inset-1 -z-10 rounded-full bg-gradient-to-br from-teal-400 to-blue-500 opacity-40 blur-md" aria-hidden="true" />
        <Plus size={22} strokeWidth={2.5} className="text-white transition-transform duration-200 group-hover:rotate-90" aria-hidden="true" />
      </Link>

      {editorOpen && selectedNote && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 p-4 backdrop-blur-sm sm:items-center"
          onClick={(e) => { if (e.target === e.currentTarget) closeEditor(); }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="editor-title"
        >
          <div
            className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-wrap items-center gap-1 border-b border-white/10 bg-zinc-900/80 p-2">
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => execEditor('bold')} className="rounded-md p-2 text-zinc-300 transition hover:bg-white/10 hover:text-white" aria-label="Bold"><Bold size={16} /></button>
                <button type="button" onClick={() => execEditor('italic')} className="rounded-md p-2 text-zinc-300 transition hover:bg-white/10 hover:text-white" aria-label="Italic"><Italic size={16} /></button>
              </div>
              <div className="h-5 w-px bg-white/10" />
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => execEditor('formatBlock', 'H1')} className="rounded-md p-2 text-zinc-300 transition hover:bg-white/10 hover:text-white" aria-label="Heading 1"><Heading1 size={16} /></button>
                <button type="button" onClick={() => execEditor('formatBlock', 'H2')} className="rounded-md p-2 text-zinc-300 transition hover:bg-white/10 hover:text-white" aria-label="Heading 2"><Heading2 size={16} /></button>
                <button type="button" onClick={() => execEditor('formatBlock', 'H3')} className="rounded-md p-2 text-zinc-300 transition hover:bg-white/10 hover:text-white" aria-label="Heading 3"><Heading3 size={16} /></button>
              </div>
              <div className="h-5 w-px bg-white/10" />
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => execEditor('insertUnorderedList')} className="rounded-md p-2 text-zinc-300 transition hover:bg-white/10 hover:text-white" aria-label="Bullet list"><List size={16} /></button>
                <button type="button" onClick={() => execEditor('insertOrderedList')} className="rounded-md p-2 text-zinc-300 transition hover:bg-white/10 hover:text-white" aria-label="Numbered list"><ListOrdered size={16} /></button>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <Button onClick={closeEditor} variant="secondary" size="sm" className="rounded-lg border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 active:scale-95">
                  Cancel
                </Button>
                <Button onClick={() => void saveNoteEdit()} size="sm" className="rounded-lg active:scale-95">
                  <Save size={14} className="mr-1.5" aria-hidden="true" />
                  Save
                </Button>
              </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6">
                <div className="mb-4">
                  <label htmlFor="editor-title-input" className="sr-only">Note title</label>
                  <input
                    id="editor-title-input"
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full border-b border-white/10 bg-transparent pb-2 text-2xl font-bold text-white placeholder-zinc-600 outline-none transition focus:border-amber-500/50"
                    placeholder="Note title"
                  />
                </div>
                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  className="min-h-[300px] text-base leading-relaxed text-zinc-200 outline-none"
                  dangerouslySetInnerHTML={{ __html: selectedNote.content }}
                  onPaste={(e) => {
                    e.preventDefault();
                    const text = e.clipboardData.getData('text/plain');
                    document.execCommand('insertText', false, text);
                  }}
                />
              </div>

              {/* Media Gallery sidebar */}
              <aside className="hidden w-64 shrink-0 flex-col border-l border-white/10 bg-black/30 md:flex">
                <div className="flex items-center justify-between border-b border-white/10 px-3 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <ImageIcon size={13} className="text-amber-400" aria-hidden="true" />
                    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-300">Media</h3>
                    <span className="text-[10px] text-zinc-500">({noteMedia.length})</span>
                  </div>
                  <Link
                    href="/capture-studio"
                    className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium text-zinc-300 transition hover:bg-white/10 hover:text-white"
                    title="Add via Capture Studio"
                  >
                    + Add
                  </Link>
                </div>
                <div className="flex-1 overflow-y-auto p-3">
                  {mediaLoading ? (
                    <p className="px-1 py-4 text-center text-[11px] text-zinc-500">Loading…</p>
                  ) : noteMedia.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-white/10 bg-black/20 p-3 text-center text-[11px] text-zinc-500">
                      No media yet. Snap one in the
                      {" "}
                      <Link href="/capture-studio" className="text-amber-400 underline-offset-2 hover:underline">Capture Studio</Link>
                      {" "}and save it to this note.
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {noteMedia.map((m) => (
                        <li key={m.id} className="group overflow-hidden rounded-lg border border-white/10 bg-zinc-900/60">
                          <button
                            type="button"
                            onClick={() => insertImageIntoEditor(m.imageData, m.title)}
                            className="block w-full text-left"
                            title="Click to insert into note"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={m.imageData}
                              alt={m.title}
                              loading="lazy"
                              className="block w-full transition group-hover:brightness-110"
                            />
                          </button>
                          <div className="flex items-center justify-between gap-1 border-t border-white/10 bg-black/40 px-2 py-1.5">
                            <p className="truncate text-[10px] text-zinc-400" title={m.title}>{m.title}</p>
                            <div className="flex shrink-0 gap-0.5">
                              <button
                                type="button"
                                onClick={() => setMediaViewer(m.imageData)}
                                className="rounded p-1 text-zinc-400 transition hover:bg-white/10 hover:text-white"
                                aria-label="View full size"
                                title="View"
                              >
                                <ZoomIn size={11} aria-hidden="true" />
                              </button>
                              <button
                                type="button"
                                onClick={() => void unlinkMediaFromNote(m.id)}
                                className="rounded p-1 text-zinc-400 transition hover:bg-red-500/15 hover:text-red-300"
                                aria-label="Remove from note"
                                title="Unlink from note"
                              >
                                <X size={11} aria-hidden="true" />
                              </button>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </aside>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-zinc-900/80 p-4">
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => { void navigator.clipboard.writeText(selectedNote.content); showToast("Copied to clipboard", "success"); }} variant="secondary" size="sm" className="rounded-lg border-white/10 bg-white/5 text-xs text-zinc-300 hover:bg-white/10 active:scale-95">
                  Copy
                </Button>
                <Button onClick={() => void eli5Note(selectedNote.content)} variant="secondary" size="sm" className="rounded-lg border-white/10 bg-white/5 text-xs text-zinc-300 hover:bg-white/10 active:scale-95" loading={eli5Loading} disabled={eli5Loading}>
                  ELI5
                </Button>
                <Button onClick={() => openFlashcardsFromNote(selectedNote.id)} variant="secondary" size="sm" className="rounded-lg border-white/10 bg-white/5 text-xs text-zinc-300 hover:bg-white/10 active:scale-95">
                  Flashcards
                </Button>
                <Button
                  onClick={() => router.push(`/split?left=nova&right=notes&noteId=${encodeURIComponent(selectedNote.id)}&focus=1`)}
                  variant="secondary"
                  size="sm"
                  className="rounded-lg border-amber-300/30 bg-gradient-to-r from-amber-300/10 to-teal-300/10 text-xs text-amber-100 hover:from-amber-300/20 hover:to-teal-300/20 active:scale-95"
                >
                  Open in Split View
                </Button>
                <Button
                  onClick={() => void generateMockExam(selectedNote.id)}
                  loading={mockExamLoadingId === selectedNote.id}
                  disabled={mockExamLoadingId !== null}
                  size="sm"
                  className="rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 text-xs font-semibold text-black hover:brightness-110 active:scale-95"
                >
                  {mockExamLoadingId === selectedNote.id ? "Building exam…" : "Generate Mock Exam"}
                </Button>
                <Button onClick={() => void exportNotePdf(selectedNote.id)} disabled={exportingNoteId === selectedNote.id} loading={exportingNoteId === selectedNote.id} size="sm" className="rounded-lg text-xs active:scale-95">
                  {exportingNoteId === selectedNote.id ? "Exporting..." : "Export PDF"}
                </Button>
              </div>
              <Button onClick={() => { void deleteNote(selectedNote.id); closeEditor(); }} variant="danger" size="sm" className="rounded-lg text-xs active:scale-95">
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {mediaViewer && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-6 backdrop-blur-sm"
          onClick={() => setMediaViewer(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Media viewer"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={mediaViewer}
            alt="Linked media"
            className="max-h-full max-w-full rounded-xl border border-white/10 shadow-2xl"
          />
          <button
            type="button"
            onClick={() => setMediaViewer(null)}
            className="absolute right-4 top-4 rounded-md bg-black/60 p-2 text-zinc-200 transition hover:bg-black/80"
            aria-label="Close viewer"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      )}

      {eli5ModalOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setEli5ModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="ELI5 explanation"
        >
          <div
            className="w-full max-w-xl overflow-y-auto rounded-2xl border border-amber-500/20 bg-zinc-950 p-6 shadow-2xl"
            style={{ maxHeight: "70vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-amber-400">ELI5 Explanation</h2>
              <button type="button" onClick={() => setEli5ModalOpen(false)} className="rounded-lg p-1 text-zinc-400 transition hover:text-white" aria-label="Close ELI5 modal">
                <X size={18} />
              </button>
            </div>
            {eli5Loading ? (
              <div className="flex items-center gap-2 py-4 text-sm text-zinc-400">
                <span className="h-2 w-2 animate-bounce rounded-full bg-amber-400 [animation-delay:-0.3s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-amber-400 [animation-delay:-0.15s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-amber-400" />
                <span className="ml-2">Getting simple explanation...</span>
              </div>
            ) : (
              <p className="whitespace-pre-wrap text-base leading-relaxed text-zinc-200">{eli5Result}</p>
            )}
          </div>
        </div>
      )}

      {tagModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={() => setTagModalOpen(false)} role="dialog" aria-modal="true" aria-label="Manage tags">
          <div
            className="w-full max-w-xl overflow-y-auto rounded-2xl border border-white/10 bg-zinc-950 p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Manage Tags</h2>
              <button type="button" onClick={() => setTagModalOpen(false)} className="rounded-lg p-1 text-zinc-400 transition hover:text-white" aria-label="Close tag modal">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-5">
              <div className="rounded-lg border border-white/10 bg-zinc-900/50 p-4">
                <p className="mb-2 text-sm font-semibold text-white">Rename tag</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <label htmlFor="rename-old" className="sr-only">Current tag name</label>
                  <input
                    id="rename-old"
                    value={renameOldTag}
                    onChange={(event) => setRenameOldTag(event.target.value)}
                    placeholder="Current tag"
                    className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none ring-amber-500/20 transition focus:border-amber-500/30 focus:ring-2"
                  />
                  <label htmlFor="rename-new" className="sr-only">New tag name</label>
                  <input
                    id="rename-new"
                    value={renameNewTag}
                    onChange={(event) => setRenameNewTag(event.target.value)}
                    placeholder="New tag"
                    className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none ring-amber-500/20 transition focus:border-amber-500/30 focus:ring-2"
                  />
                </div>
                <Button onClick={() => void updateTags({ action: "rename", oldTag: renameOldTag, newTag: renameNewTag })} size="sm" className="mt-2 rounded-lg px-3 py-2 text-xs active:scale-95">
                  Rename
                </Button>
              </div>

              <div className="rounded-lg border border-white/10 bg-zinc-900/50 p-4">
                <p className="mb-2 text-sm font-semibold text-white">Delete tag</p>
                <label htmlFor="delete-tag" className="sr-only">Tag to delete</label>
                <input
                  id="delete-tag"
                  value={deleteTagName}
                  onChange={(event) => setDeleteTagName(event.target.value)}
                  placeholder="Tag to delete"
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none ring-amber-500/20 transition focus:border-amber-500/30 focus:ring-2"
                />
                <Button onClick={() => void updateTags({ action: "delete", tag: deleteTagName })} variant="danger" size="sm" className="mt-2 rounded-lg px-3 py-2 text-xs active:scale-95">
                  Delete
                </Button>
              </div>

              <div className="rounded-lg border border-white/10 bg-zinc-900/50 p-4">
                <p className="mb-2 text-sm font-semibold text-white">Merge tags</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <label htmlFor="merge-source" className="sr-only">Source tag</label>
                  <input
                    id="merge-source"
                    value={mergeSourceTag}
                    onChange={(event) => setMergeSourceTag(event.target.value)}
                    placeholder="Source tag"
                    className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none ring-amber-500/20 transition focus:border-amber-500/30 focus:ring-2"
                  />
                  <label htmlFor="merge-target" className="sr-only">Target tag</label>
                  <input
                    id="merge-target"
                    value={mergeTargetTag}
                    onChange={(event) => setMergeTargetTag(event.target.value)}
                    placeholder="Target tag"
                    className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none ring-amber-500/20 transition focus:border-amber-500/30 focus:ring-2"
                  />
                </div>
                <Button onClick={() => void updateTags({ action: "merge", sourceTag: mergeSourceTag, targetTag: mergeTargetTag })} size="sm" className="mt-2 rounded-lg px-3 py-2 text-xs active:scale-95">
                  Merge
                </Button>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <Button onClick={() => setTagModalOpen(false)} variant="secondary" size="sm" className="rounded-lg border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 active:scale-95">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}


