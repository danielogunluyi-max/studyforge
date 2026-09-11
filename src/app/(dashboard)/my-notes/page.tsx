"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { loginUrlFor } from "~/lib/auth-redirect";
import { formatTorontoDate } from "~/lib/toronto-time";
import {
  Search, Plus, Pin, Trash2, Copy, Share2, MoreHorizontal,
  X, FileText, Edit3, Bold, Italic, Heading1, Heading2, Heading3,
  List, ListOrdered, Save,
  Image as ImageIcon, ZoomIn, Video, Layers,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import EmptyState from "@/app/_components/empty-state";
import Skeleton, { SkeletonList } from "@/app/_components/skeleton";
import Listbox from "~/app/_components/Listbox";
import { useToast } from "~/app/_components/toast";
import VideoTranscriptDrawer from "~/app/_components/video-transcript-drawer";
import FlashcardDeck from "~/app/_components/flashcard-deck";

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

const ONTARIO_COURSE = /^[A-Z]{3,4}\d[A-Z]$/i;

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
          <mark key={`${part}-${index}`} style={{ color: "var(--kv-accent-text)", background: "none" }}>
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
  const [activeSubject, setActiveSubject] = useState<string>("");
  const [savedNoteId, setSavedNoteId] = useState<string>("");
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderColor, setNewFolderColor] = useState("#f0b429");
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [eli5Loading, setEli5Loading] = useState(false);
  const [eli5Result, setEli5Result] = useState("");
  const [eli5ModalOpen, setEli5ModalOpen] = useState(false);
  const [mockExamLoadingId, setMockExamLoadingId] = useState<string | null>(null);
  const evolutionSnapshotCacheRef = useRef<Record<string, string>>({});
  const deepLinkHandledRef = useRef(false);
  const [deepLinkNoteId, setDeepLinkNoteId] = useState("");
  const { showToast } = useToast();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const editorRef = useRef<HTMLDivElement>(null);
  const [transcriptDrawerOpen, setTranscriptDrawerOpen] = useState(false);
  const [flashcards, setFlashcards] = useState<Array<{ front: string; back: string }>>([]);
  const [flashcardModalOpen, setFlashcardModalOpen] = useState(false);
  const [generatingFlashcards, setGeneratingFlashcards] = useState(false);

  const handleImportTranscript = (content: string) => {
    if (!editorRef.current) return;
    const editor = editorRef.current;

    // Insert at cursor position or append to end
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const span = document.createElement('span');
      span.innerHTML = content;
      range.insertNode(span);
      range.setStartAfter(span);
      range.setEndAfter(span);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      // Append to end
      editor.innerHTML += `<br><br>${content}`;
    }

    // Update the note content state
    if (selectedNote) {
      setSelectedNote({ ...selectedNote, content: editor.innerHTML });
    }

    showToast("Transcript imported to notes", "success");
  };

  const handleGenerateFlashcards = async () => {
    if (!selectedNote || !selectedNote.content) {
      showToast("Please select a note with content first", "error");
      return;
    }

    setGeneratingFlashcards(true);
    try {
      const response = await fetch("/api/flashcards/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ textContext: selectedNote.content, count: 10 }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate flashcards");
      }

      const data = await response.json();
      setFlashcards(data.flashcards);
      setFlashcardModalOpen(true);
      showToast("Flashcards generated successfully!", "success");
    } catch (error) {
      console.error("[flashcards] Error:", error);
      showToast("Failed to generate flashcards. Please try again.", "error");
    } finally {
      setGeneratingFlashcards(false);
    }
  };

  // Media Gallery (screenshots linked to selected note)
  type NoteMedia = { id: string; title: string; imageData: string; createdAt: string };
  const [noteMedia, setNoteMedia] = useState<NoteMedia[]>([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaViewer, setMediaViewer] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(loginUrlFor("/my-notes"));
    }
  }, [status, router]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const query = params.get("q") ?? "";
    const tag = params.get("tag") ?? "";
    const folder = params.get("folder") ?? "";
    const noteId = params.get("note") ?? params.get("open") ?? "";
    setSearchInput(query);
    setDebouncedSearch(query);
    setActiveTag(tag);
    setActiveFolder(folder);
    if (noteId) setDeepLinkNoteId(noteId);
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
    if (!deepLinkNoteId || deepLinkHandledRef.current || isLoading) return;
    const note = notes.find((item) => item.id === deepLinkNoteId);
    if (!note) return;
    deepLinkHandledRef.current = true;
    void openEditor(note);
  }, [deepLinkNoteId, isLoading, notes]);

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

  const formatDate = (dateString: string) => formatTorontoDate(dateString);

  const activeChipStyle = (active: boolean): CSSProperties | undefined =>
    active ? { borderColor: "var(--kv-accent-text)", color: "var(--kv-accent-text)" } : undefined;

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

  const resultLabel = useMemo(() => {
    if (isLoading) return "Loading...";
    return `${displayNotes.length} result${displayNotes.length === 1 ? "" : "s"}`;
  }, [isLoading, displayNotes.length]);

  if (status === "loading") {
    return (
      <main className="kv-page" style={{ padding: "24px 16px 100px" }}>
        <SkeletonList count={6} />
      </main>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <main className="kv-page" style={{ padding: "24px 16px 100px" }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
          <div>
            <div className="kv-crumb">Kyvex / <b>My Notes</b></div>
            <h1 className="kv-title" style={{ marginTop: 14 }}>My Notes</h1>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <button
              type="button"
              onClick={exportAllNotes}
              disabled={!notes.length}
              className="kv-btn-ghost"
            >
              Export All
            </button>
            <button
              type="button"
              onClick={() => setTagModalOpen(true)}
              className="kv-btn-ghost"
            >
              Manage Tags
            </button>
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, marginTop: 24 }}>
          <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
            <label htmlFor="note-search" className="sr-only">Search notes</label>
            <Search
              size={16}
              style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "var(--kv-text-tertiary)", pointerEvents: "none" }}
              aria-hidden="true"
            />
            <input
              id="note-search"
              type="text"
              placeholder="Search notes by title, content, or tag…"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              className="kv-field"
              style={{ paddingLeft: 38 }}
            />
            {searchInput ? (
              <button
                type="button"
                onClick={() => { setSearchInput(""); setDebouncedSearch(""); }}
                className="kv-btn-ghost"
                style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", padding: "4px 8px" }}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            ) : null}
          </div>
          <span className="kv-meta">{resultLabel}</span>
        </div>

        <div className="hidden sm:flex" style={{ flexWrap: "wrap", gap: 8, marginTop: 12 }}>
          <div style={{ width: 140 }}>
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
          <div style={{ width: 130 }}>
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

        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 16, alignItems: "center" }}>
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
              className="kv-chip"
              style={activeChipStyle(activeFormat === option.value)}
            >
              {option.label}
            </button>
          ))}
          {(activeTag || activeFolder || activeFormat || activePeriod || activeSubject || debouncedSearch) ? (
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
              className="kv-btn-ghost"
              style={{ padding: "3px 10px", fontSize: 11 }}
            >
              Clear filters
            </button>
          ) : null}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12, alignItems: "center" }}>
          <span className="kv-meta" style={{ marginRight: 4 }}>Subject</span>
          <button
            type="button"
            onClick={() => setActiveSubject("")}
            className="kv-chip"
            style={activeChipStyle(!activeSubject)}
          >
            All
          </button>
          {SUBJECTS.map((subj) => (
            <button
              key={subj.code}
              type="button"
              onClick={() => setActiveSubject(activeSubject === subj.code ? "" : subj.code)}
              className="kv-chip kv-chip-course"
              style={activeChipStyle(activeSubject === subj.code)}
            >
              {subj.code}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12, alignItems: "center" }}>
          <span className="kv-meta" style={{ marginRight: 4 }}>Folder</span>
          <button
            type="button"
            onClick={() => setActiveFolder("")}
            className="kv-chip"
            style={activeChipStyle(!activeFolder)}
          >
            All
          </button>
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
              className="kv-chip"
              style={activeChipStyle(activeFolder === folder.id)}
            >
              {folder.name}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setNewFolderOpen((prev) => !prev)}
            className="kv-btn-ghost"
            style={{ padding: "3px 10px", fontSize: 11 }}
          >
            + New
          </button>
        </div>

        {newFolderOpen ? (
          <div style={{ marginTop: 12, padding: 12, border: "1px solid var(--border-default)", borderRadius: "var(--kv-radius)" }}>
            <label htmlFor="folder-name" className="sr-only">Folder name</label>
            <input
              id="folder-name"
              value={newFolderName}
              onChange={(event) => setNewFolderName(event.target.value)}
              placeholder="Folder name"
              className="kv-field"
              style={{ marginBottom: 8 }}
            />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
              <span className="kv-meta">Color</span>
              <input
                type="color"
                value={newFolderColor}
                onChange={(event) => setNewFolderColor(event.target.value)}
                aria-label="Folder color"
              />
            </div>
            <button type="button" onClick={() => void createFolder()} className="kv-btn">
              Create Folder
            </button>
          </div>
        ) : null}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12, alignItems: "center" }}>
          <span className="kv-meta" style={{ marginRight: 4 }}>Tag</span>
          <button
            type="button"
            onClick={() => setActiveTag("")}
            className="kv-chip"
            style={activeChipStyle(!activeTag)}
          >
            All
          </button>
          {isTagLoading ? (
            <Skeleton variant="text" count={3} />
          ) : (
            tagStats.map((tag) => (
              <button
                key={tag.name}
                type="button"
                onClick={() => setActiveTag(tag.name)}
                className="kv-chip"
                style={activeChipStyle(activeTag === tag.name)}
              >
                {tag.name}
              </button>
            ))
          )}
        </div>

        <section style={{ marginTop: 28 }}>
          <AnimatePresence>
            {selectedNoteIds.length > 0 ? (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                style={{ marginBottom: 16, padding: 12, border: "1px solid var(--border-default)", borderRadius: "var(--kv-radius)" }}
              >
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                  <span className="kv-meta">{selectedNoteIds.length} selected</span>
                  <button type="button" onClick={bulkDeleteSelected} className="kv-btn-danger">
                    Delete
                  </button>
                  <button type="button" onClick={bulkExportSelected} className="kv-btn-ghost" style={{ padding: "6px 12px", fontSize: 12 }}>
                    Export
                  </button>
                  <div style={{ width: 160 }}>
                    <Listbox
                      value={bulkMoveFolderId}
                      onChange={(v) => setBulkMoveFolderId(v)}
                      options={[
                        { value: "", label: "No Folder" },
                        ...folders.map((folder) => ({ value: folder.id, label: folder.name })),
                      ]}
                    />
                  </div>
                  <button type="button" onClick={bulkMoveSelected} className="kv-btn-ghost" style={{ padding: "6px 12px", fontSize: 12 }}>
                    Move
                  </button>
                  <button type="button" onClick={selectAllVisible} className="kv-btn-ghost" style={{ padding: "6px 12px", fontSize: 12 }}>
                    {selectedNoteIds.length === notes.length ? "Unselect All" : "Select All"}
                  </button>
                </div>
              </motion.div>
            ) : null}
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
            <div>
              {displayNotes.map((note) => {
                const subj = detectSubject(note);
                return (
                  <div
                    key={note.id}
                    className="kv-row"
                    draggable
                    onDragStart={(event) => event.dataTransfer.setData("text/note-id", note.id)}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                        <input
                          type="checkbox"
                          checked={selectedNoteIds.includes(note.id)}
                          onChange={() => toggleNoteSelected(note.id)}
                          aria-label={`Select note ${note.title}`}
                          style={{ marginTop: 3 }}
                        />
                        <Link
                          href={`/my-notes?note=${encodeURIComponent(note.id)}`}
                          style={{ textDecoration: "none", color: "inherit", flex: 1, minWidth: 0 }}
                        >
                          <div className="kv-row-title">
                            <HighlightText text={note.title} query={debouncedSearch} />
                          </div>
                        </Link>
                      </div>
                      <div className="kv-row-sub">
                        {subj ? (
                          <span className="kv-chip kv-chip-course">{subj.code}</span>
                        ) : note.tags.find((t) => ONTARIO_COURSE.test(t.trim())) ? (
                          <span className="kv-chip kv-chip-course">
                            {note.tags.find((t) => ONTARIO_COURSE.test(t.trim()))}
                          </span>
                        ) : null}
                        <span className="kv-chip">{getFormatLabel(note.format)}</span>
                        {note.isPinned ? <span className="kv-chip">Pinned</span> : null}
                        {note.isShared ? <span className="kv-chip">Shared</span> : null}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                      <span className="kv-row-side">{formatDate(note.updatedAt ?? note.createdAt)}</span>
                      <button
                        type="button"
                        onClick={() => void togglePin(note)}
                        className="kv-btn-ghost"
                        style={{ padding: "6px 8px" }}
                        aria-label={note.isPinned ? "Unpin" : "Pin"}
                        title={note.isPinned ? "Unpin note" : "Pin note"}
                      >
                        <Pin size={13} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void openEditor(note)}
                        className="kv-btn-ghost"
                        style={{ padding: "6px 8px" }}
                        aria-label="Edit"
                        title="Edit note"
                      >
                        <Edit3 size={13} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteNote(note.id)}
                        className="kv-btn-ghost"
                        style={{ padding: "6px 8px" }}
                        aria-label="Delete"
                        title="Delete note"
                      >
                        <Trash2 size={13} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setMenuOpenNoteId((prev) => (prev === note.id ? "" : note.id))}
                        className="kv-btn-ghost"
                        style={{ padding: "6px 8px", position: "relative" }}
                        aria-label="More"
                        title="More actions"
                      >
                        <MoreHorizontal size={13} aria-hidden="true" />
                        {menuOpenNoteId === note.id ? (
                          <div
                            style={{
                              position: "absolute",
                              right: 0,
                              top: "100%",
                              zIndex: 20,
                              marginTop: 4,
                              width: 160,
                              padding: 4,
                              border: "1px solid var(--border-default)",
                              borderRadius: "var(--kv-radius)",
                              background: "var(--bg-elevated, var(--bg-base))",
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => { void duplicateNote(note); setMenuOpenNoteId(""); }}
                              className="kv-btn-ghost"
                              style={{ width: "100%", justifyContent: "flex-start", padding: "8px 10px", fontSize: 12 }}
                            >
                              <Copy size={12} aria-hidden="true" /> Duplicate
                            </button>
                            <button
                              type="button"
                              onClick={() => { void shareNote(note); setMenuOpenNoteId(""); }}
                              className="kv-btn-ghost"
                              style={{ width: "100%", justifyContent: "flex-start", padding: "8px 10px", fontSize: 12 }}
                            >
                              <Share2 size={12} aria-hidden="true" /> Share
                            </button>
                            <button
                              type="button"
                              onClick={() => continueStudying(note)}
                              className="kv-btn-ghost"
                              style={{ width: "100%", justifyContent: "flex-start", padding: "8px 10px", fontSize: 12 }}
                            >
                              Continue
                            </button>
                            <button
                              type="button"
                              onClick={() => openFlashcardsFromNote(note.id)}
                              className="kv-btn-ghost"
                              style={{ width: "100%", justifyContent: "flex-start", padding: "8px 10px", fontSize: 12 }}
                            >
                              Cards
                            </button>
                            <button
                              type="button"
                              onClick={() => { void exportNotePdf(note.id); setMenuOpenNoteId(""); }}
                              disabled={exportingNoteId === note.id}
                              className="kv-btn-ghost"
                              style={{ width: "100%", justifyContent: "flex-start", padding: "8px 10px", fontSize: 12 }}
                            >
                              <FileText size={12} aria-hidden="true" />
                              {exportingNoteId === note.id ? "Exporting…" : "Export PDF"}
                            </button>
                          </div>
                        ) : null}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <Link
        href="/generator"
        className="kv-btn"
        style={{ position: "fixed", bottom: 24, right: 24, zIndex: 30, borderRadius: "999px", width: 48, height: 48, padding: 0, justifyContent: "center" }}
        aria-label="New Note"
        title="New Note"
      >
        <Plus size={22} strokeWidth={2.5} aria-hidden="true" />
      </Link>

      {editorOpen && selectedNote && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:items-center"
          style={{ background: "rgba(0,0,0,.6)" }}
          onClick={(e) => { if (e.target === e.currentTarget) closeEditor(); }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="editor-title"
        >
          <div
            className="card flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden"
            style={{ borderRadius: "var(--kv-radius)", border: "1px solid var(--border-default)", background: "var(--bg-card)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="flex flex-wrap items-center gap-1 p-2"
              style={{ borderBottom: "1px solid var(--border-default)" }}
            >
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => execEditor("bold")} className="kv-btn-ghost" style={{ padding: 8 }} aria-label="Bold"><Bold size={16} /></button>
                <button type="button" onClick={() => execEditor("italic")} className="kv-btn-ghost" style={{ padding: 8 }} aria-label="Italic"><Italic size={16} /></button>
              </div>
              <div style={{ width: 1, height: 20, background: "var(--border-default)", margin: "0 4px" }} />
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => execEditor("formatBlock", "H1")} className="kv-btn-ghost" style={{ padding: 8 }} aria-label="Heading 1"><Heading1 size={16} /></button>
                <button type="button" onClick={() => execEditor("formatBlock", "H2")} className="kv-btn-ghost" style={{ padding: 8 }} aria-label="Heading 2"><Heading2 size={16} /></button>
                <button type="button" onClick={() => execEditor("formatBlock", "H3")} className="kv-btn-ghost" style={{ padding: 8 }} aria-label="Heading 3"><Heading3 size={16} /></button>
              </div>
              <div style={{ width: 1, height: 20, background: "var(--border-default)", margin: "0 4px" }} />
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => execEditor("insertUnorderedList")} className="kv-btn-ghost" style={{ padding: 8 }} aria-label="Bullet list"><List size={16} /></button>
                <button type="button" onClick={() => execEditor("insertOrderedList")} className="kv-btn-ghost" style={{ padding: 8 }} aria-label="Numbered list"><ListOrdered size={16} /></button>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <button type="button" onClick={() => setTranscriptDrawerOpen(true)} className="kv-btn-ghost" style={{ padding: "6px 10px", fontSize: 12 }} title="Import YouTube transcript">
                  <Video size={14} />
                  Transcript
                </button>
                <button type="button" onClick={handleGenerateFlashcards} disabled={generatingFlashcards} className="kv-btn-ghost" style={{ padding: "6px 10px", fontSize: 12 }} title="Generate flashcards from note">
                  <Layers size={14} className={generatingFlashcards ? "animate-spin" : ""} />
                  {generatingFlashcards ? "Generating..." : "Flashcards"}
                </button>
                <button type="button" onClick={closeEditor} className="kv-btn-ghost" style={{ padding: "6px 10px", fontSize: 12 }}>Cancel</button>
                <button type="button" onClick={() => void saveNoteEdit()} className="kv-btn" style={{ padding: "6px 12px", fontSize: 12 }}>
                  <Save size={14} aria-hidden="true" />
                  Save
                </button>
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
                    className="kv-title w-full bg-transparent outline-none"
                    style={{ fontSize: 20, borderBottom: "1px solid var(--border-default)", paddingBottom: 8, color: "var(--kv-text-primary)" }}
                    placeholder="Note title"
                  />
                </div>
                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  className="min-h-[300px] text-base leading-relaxed outline-none"
                  style={{ color: "var(--kv-text-secondary)" }}
                  dangerouslySetInnerHTML={{ __html: selectedNote.content }}
                  onPaste={(e) => {
                    e.preventDefault();
                    const text = e.clipboardData.getData("text/plain");
                    document.execCommand("insertText", false, text);
                  }}
                />
              </div>

              <aside className="hidden w-64 shrink-0 flex-col md:flex" style={{ borderLeft: "1px solid var(--border-default)", background: "var(--bg-base)" }}>
                <div className="flex items-center justify-between px-3 py-2.5" style={{ borderBottom: "1px solid var(--border-default)" }}>
                  <div className="flex items-center gap-1.5">
                    <ImageIcon size={13} style={{ color: "var(--kv-accent-text)" }} aria-hidden="true" />
                    <h3 className="kv-meta">Media</h3>
                    <span className="kv-meta num">({noteMedia.length})</span>
                  </div>
                  <Link href="/capture-studio" className="kv-btn-ghost" style={{ padding: "2px 8px", fontSize: 10 }} title="Add via Capture Studio">+ Add</Link>
                </div>
                <div className="flex-1 overflow-y-auto p-3">
                  {mediaLoading ? (
                    <p className="kv-meta" style={{ textAlign: "center", padding: "16px 0" }}>Loading…</p>
                  ) : noteMedia.length === 0 ? (
                    <div className="p-3 text-center" style={{ border: "1px dashed var(--border-default)", borderRadius: "var(--kv-radius)" }}>
                      <p className="kv-meta">
                        No media yet. Snap one in the{" "}
                        <Link href="/capture-studio" style={{ color: "var(--kv-accent-text)", textDecoration: "underline" }}>Capture Studio</Link>
                        {" "}and save it to this note.
                      </p>
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {noteMedia.map((m) => (
                        <li key={m.id} className="overflow-hidden" style={{ border: "1px solid var(--border-default)", borderRadius: "var(--kv-radius)", background: "var(--bg-card)" }}>
                          <button type="button" onClick={() => insertImageIntoEditor(m.imageData, m.title)} className="block w-full text-left" title="Click to insert into note">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={m.imageData} alt={m.title} loading="lazy" className="block w-full" />
                          </button>
                          <div className="flex items-center justify-between gap-1 px-2 py-1.5" style={{ borderTop: "1px solid var(--border-default)" }}>
                            <p className="kv-meta truncate" title={m.title}>{m.title}</p>
                            <div className="flex shrink-0 gap-0.5">
                              <button type="button" onClick={() => setMediaViewer(m.imageData)} className="kv-btn-ghost" style={{ padding: 4 }} aria-label="View full size" title="View">
                                <ZoomIn size={11} aria-hidden="true" />
                              </button>
                              <button type="button" onClick={() => void unlinkMediaFromNote(m.id)} className="kv-btn-danger" style={{ padding: 4 }} aria-label="Remove from note" title="Unlink from note">
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

            <div className="flex flex-wrap items-center justify-between gap-3 p-4" style={{ borderTop: "1px solid var(--border-default)" }}>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => { void navigator.clipboard.writeText(selectedNote.content); showToast("Copied to clipboard", "success"); }} className="kv-btn-ghost" style={{ padding: "6px 10px", fontSize: 12 }}>Copy</button>
                <button type="button" onClick={() => void eli5Note(selectedNote.content)} disabled={eli5Loading} className="kv-btn-ghost" style={{ padding: "6px 10px", fontSize: 12 }}>{eli5Loading ? "…" : "ELI5"}</button>
                <button type="button" onClick={() => openFlashcardsFromNote(selectedNote.id)} className="kv-btn-ghost" style={{ padding: "6px 10px", fontSize: 12 }}>Flashcards</button>
                <button type="button" onClick={() => router.push(`/split?left=nova&right=notes&noteId=${encodeURIComponent(selectedNote.id)}&focus=1`)} className="kv-btn-ghost" style={{ padding: "6px 10px", fontSize: 12 }}>Open in Split View</button>
                <button type="button" onClick={() => void generateMockExam(selectedNote.id)} disabled={mockExamLoadingId !== null} className="kv-btn" style={{ padding: "6px 12px", fontSize: 12 }}>
                  {mockExamLoadingId === selectedNote.id ? "Building exam…" : "Generate Mock Exam"}
                </button>
                <button type="button" onClick={() => void exportNotePdf(selectedNote.id)} disabled={exportingNoteId === selectedNote.id} className="kv-btn-ghost" style={{ padding: "6px 10px", fontSize: 12 }}>
                  {exportingNoteId === selectedNote.id ? "Exporting..." : "Export PDF"}
                </button>
              </div>
              <button type="button" onClick={() => { void deleteNote(selectedNote.id); closeEditor(); }} className="kv-btn-danger" style={{ padding: "6px 10px", fontSize: 12 }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {mediaViewer && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-6"
          style={{ background: "rgba(0,0,0,.6)" }}
          onClick={() => setMediaViewer(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Media viewer"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mediaViewer} alt="Linked media" className="max-h-full max-w-full" style={{ border: "1px solid var(--border-default)", borderRadius: "var(--kv-radius)" }} />
          <button type="button" onClick={() => setMediaViewer(null)} className="kv-btn-ghost absolute right-4 top-4" style={{ padding: 8 }} aria-label="Close viewer">
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      )}

      {eli5ModalOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,.6)" }}
          onClick={() => setEli5ModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="ELI5 explanation"
        >
          <div
            className="card w-full max-w-xl overflow-y-auto p-6"
            style={{ maxHeight: "70vh", borderRadius: "var(--kv-radius)", border: "1px solid var(--border-default)", background: "var(--bg-card)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="kv-title" style={{ fontSize: 20 }}>ELI5 Explanation</h2>
              <button type="button" onClick={() => setEli5ModalOpen(false)} className="kv-btn-ghost" style={{ padding: 6 }} aria-label="Close ELI5 modal"><X size={18} /></button>
            </div>
            {eli5Loading ? (
              <p className="kv-meta">Getting simple explanation…</p>
            ) : (
              <p className="whitespace-pre-wrap text-base leading-relaxed" style={{ color: "var(--kv-text-secondary)" }}>{eli5Result}</p>
            )}
          </div>
        </div>
      )}

      {tagModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,.6)" }}
          onClick={() => setTagModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Manage tags"
        >
          <div
            className="card w-full max-w-xl overflow-y-auto p-6"
            style={{ borderRadius: "var(--kv-radius)", border: "1px solid var(--border-default)", background: "var(--bg-card)" }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="kv-title" style={{ fontSize: 20 }}>Manage Tags</h2>
              <button type="button" onClick={() => setTagModalOpen(false)} className="kv-btn-ghost" style={{ padding: 6 }} aria-label="Close tag modal"><X size={18} /></button>
            </div>

            <div className="space-y-5">
              <div className="p-4" style={{ border: "1px solid var(--border-default)", borderRadius: "var(--kv-radius)" }}>
                <p className="kv-meta" style={{ marginBottom: 8 }}>Rename tag</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <label htmlFor="rename-old" className="sr-only">Current tag name</label>
                  <input id="rename-old" value={renameOldTag} onChange={(event) => setRenameOldTag(event.target.value)} placeholder="Current tag" className="w-full px-3 py-2 text-sm outline-none" style={{ border: "1px solid var(--border-default)", borderRadius: "var(--kv-radius)", background: "var(--bg-base)", color: "var(--kv-text-primary)" }} />
                  <label htmlFor="rename-new" className="sr-only">New tag name</label>
                  <input id="rename-new" value={renameNewTag} onChange={(event) => setRenameNewTag(event.target.value)} placeholder="New tag" className="w-full px-3 py-2 text-sm outline-none" style={{ border: "1px solid var(--border-default)", borderRadius: "var(--kv-radius)", background: "var(--bg-base)", color: "var(--kv-text-primary)" }} />
                </div>
                <button type="button" onClick={() => void updateTags({ action: "rename", oldTag: renameOldTag, newTag: renameNewTag })} className="kv-btn" style={{ marginTop: 8, padding: "6px 12px", fontSize: 12 }}>Rename</button>
              </div>

              <div className="p-4" style={{ border: "1px solid var(--border-default)", borderRadius: "var(--kv-radius)" }}>
                <p className="kv-meta" style={{ marginBottom: 8 }}>Delete tag</p>
                <label htmlFor="delete-tag" className="sr-only">Tag to delete</label>
                <input id="delete-tag" value={deleteTagName} onChange={(event) => setDeleteTagName(event.target.value)} placeholder="Tag to delete" className="w-full px-3 py-2 text-sm outline-none" style={{ border: "1px solid var(--border-default)", borderRadius: "var(--kv-radius)", background: "var(--bg-base)", color: "var(--kv-text-primary)" }} />
                <button type="button" onClick={() => void updateTags({ action: "delete", tag: deleteTagName })} className="kv-btn-danger" style={{ marginTop: 8, padding: "6px 12px", fontSize: 12 }}>Delete</button>
              </div>

              <div className="p-4" style={{ border: "1px solid var(--border-default)", borderRadius: "var(--kv-radius)" }}>
                <p className="kv-meta" style={{ marginBottom: 8 }}>Merge tags</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <label htmlFor="merge-source" className="sr-only">Source tag</label>
                  <input id="merge-source" value={mergeSourceTag} onChange={(event) => setMergeSourceTag(event.target.value)} placeholder="Source tag" className="w-full px-3 py-2 text-sm outline-none" style={{ border: "1px solid var(--border-default)", borderRadius: "var(--kv-radius)", background: "var(--bg-base)", color: "var(--kv-text-primary)" }} />
                  <label htmlFor="merge-target" className="sr-only">Target tag</label>
                  <input id="merge-target" value={mergeTargetTag} onChange={(event) => setMergeTargetTag(event.target.value)} placeholder="Target tag" className="w-full px-3 py-2 text-sm outline-none" style={{ border: "1px solid var(--border-default)", borderRadius: "var(--kv-radius)", background: "var(--bg-base)", color: "var(--kv-text-primary)" }} />
                </div>
                <button type="button" onClick={() => void updateTags({ action: "merge", sourceTag: mergeSourceTag, targetTag: mergeTargetTag })} className="kv-btn" style={{ marginTop: 8, padding: "6px 12px", fontSize: 12 }}>Merge</button>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button type="button" onClick={() => setTagModalOpen(false)} className="kv-btn-ghost" style={{ padding: "6px 12px", fontSize: 12 }}>Close</button>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {flashcardModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,.6)" }}
            onClick={() => setFlashcardModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-4xl"
              onClick={(e) => e.stopPropagation()}
            >
              <FlashcardDeck flashcards={flashcards} onClose={() => setFlashcardModalOpen(false)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Video Transcript Drawer */}
      <VideoTranscriptDrawer
        isOpen={transcriptDrawerOpen}
        onClose={() => setTranscriptDrawerOpen(false)}
        onImportToNotes={handleImportTranscript}
      />
    </main>
  );
}


