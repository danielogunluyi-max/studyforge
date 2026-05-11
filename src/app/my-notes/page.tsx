"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Search, Plus, Folder, Tag, Pin, Trash2, Copy, Share2, MoreHorizontal,
  X, FileText, Edit3, Bold, Italic, Heading1, Heading2, Heading3,
  List, ListOrdered, Save, Filter, Flame,
  Image as ImageIcon, ZoomIn,
} from "lucide-react";
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

  const resultLabel = useMemo(() => {
    if (isLoading) return "Loading...";
    return `${notes.length} result${notes.length === 1 ? "" : "s"}`;
  }, [isLoading, notes.length]);

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
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">My Notes</h1>
            <p className="mt-1 text-base text-zinc-400">
              All your saved study notes in one place · <span className="inline-flex items-center gap-1 text-amber-400"><Flame size={14} aria-hidden="true" /> {studyStreak} day streak</span>
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={exportAllNotes} variant="secondary" size="sm" disabled={!notes.length} className="active:scale-95">
              Export All
            </Button>
            <Button onClick={() => setTagModalOpen(true)} variant="secondary" size="sm" className="active:scale-95">
              Manage Tags
            </Button>
          </div>
        </div>

        <div className="mb-4 lg:hidden">
          <Button
            onClick={() => setShowMobileFilters((prev) => !prev)}
            variant="secondary"
            fullWidth
            size="sm"
            className="rounded-lg border-white/10 bg-white/5 py-2.5 text-sm text-zinc-300 hover:bg-white/10 active:scale-95"
          >
            <Filter size={14} className="mr-2" aria-hidden="true" />
            {showMobileFilters ? "Hide Filters" : "Show Filters"}
          </Button>
        </div>

        <div className="mb-6 rounded-xl border border-white/10 bg-zinc-900/50 p-4 backdrop-blur-sm">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="relative md:col-span-2">
              <label htmlFor="note-search" className="sr-only">Search notes</label>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" aria-hidden="true" />
              <input
                id="note-search"
                type="text"
                placeholder="Search title and content..."
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/40 py-2.5 pl-10 pr-4 text-base text-white placeholder-zinc-600 outline-none ring-amber-500/20 transition focus:border-amber-500/30 focus:ring-2"
              />
            </div>
            <div className="w-full">
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
            <div className="w-full">
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
                className={`rounded-full px-3 py-1 text-xs active:scale-95 ${activeFormat === option.value ? "bg-white text-black" : "border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10"}`}
              >
                {option.label}
              </Button>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-sm text-zinc-400">{resultLabel}</span>
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
                className="rounded-full border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300 hover:bg-white/10 active:scale-95"
              >
                Clear filters
              </Button>
            )}
          </div>
        </div>

        {recentlyViewed.length > 0 && (
          <div className="mb-6 rounded-xl border border-white/10 bg-zinc-900/50 p-4 backdrop-blur-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Recently Viewed</h2>
              <span className="text-sm text-zinc-400">Last 3 notes accessed</span>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {recentlyViewed.slice(0, 3).map((note) => (
                <button
                  key={`recent-${note.id}`}
                  type="button"
                  onClick={() => void openEditor(note)}
                  className="rounded-xl border border-white/10 bg-black/40 p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:bg-black/60 active:scale-95"
                >
                  <p className="line-clamp-1 text-base font-semibold text-white">{note.title}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-zinc-400">{note.content}</p>
                  <p className="mt-2 text-xs text-zinc-500">
                    {note.lastViewedAt ? formatDate(note.lastViewedAt) : "Recently viewed"}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <aside className={`${showMobileFilters ? "block" : "hidden"} space-y-6 lg:block`}>
            <Link
              href="/generator"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white px-4 py-3 text-sm font-semibold text-black transition-all hover:bg-zinc-100 active:scale-95"
            >
              <Plus size={16} aria-hidden="true" />
              New Note
            </Link>

            <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4 backdrop-blur-sm">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-semibold text-white">Folders</h2>
                <Button onClick={() => setNewFolderOpen((prev) => !prev)} variant="secondary" size="sm" className="rounded-lg border-white/10 bg-white/5 px-2 py-1 text-xs text-zinc-300 hover:bg-white/10 active:scale-95">
                  New Folder
                </Button>
              </div>

              {newFolderOpen && (
                <div className="mb-3 rounded-lg border border-white/10 bg-black/40 p-3">
                  <label htmlFor="folder-name" className="sr-only">Folder name</label>
                  <input
                    id="folder-name"
                    value={newFolderName}
                    onChange={(event) => setNewFolderName(event.target.value)}
                    placeholder="Folder name"
                    className="mb-2 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none ring-amber-500/20 transition focus:border-amber-500/30 focus:ring-2"
                  />
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-xs text-zinc-400">Color</span>
                    <input
                      type="color"
                      value={newFolderColor}
                      onChange={(event) => setNewFolderColor(event.target.value)}
                      className="h-8 w-12 cursor-pointer rounded border border-white/10 bg-transparent p-0"
                      aria-label="Folder color"
                    />
                  </div>
                  <Button onClick={() => void createFolder()} size="sm" className="w-full rounded-lg py-2 text-xs active:scale-95">
                    Create Folder
                  </Button>
                </div>
              )}

              <button
                type="button"
                onClick={() => setActiveFolder("")}
                className={`mb-1 flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${!activeFolder ? "bg-white/10 text-white" : "text-zinc-400 hover:bg-white/5 hover:text-white"}`}
              >
                <span className="flex items-center gap-2">
                  <Folder size={14} aria-hidden="true" />
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
                      if (noteId) {
                        void moveNoteToFolder(noteId, folder.id);
                      }
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${activeFolder === folder.id ? "bg-white/10 text-white" : "text-zinc-400 hover:bg-white/5 hover:text-white"}`}
                  >
                    <span className="flex items-center gap-2">
                      <Folder size={14} aria-hidden="true" />
                      <span className="truncate">{folder.name}</span>
                    </span>
                    <span className="text-xs text-zinc-500">{folder.noteCount}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4 backdrop-blur-sm">
              <h2 className="mb-3 text-base font-semibold text-white">Tags</h2>
              <button
                type="button"
                onClick={() => setActiveTag("")}
                className={`mb-1 flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${!activeTag ? "bg-white/10 text-white" : "text-zinc-400 hover:bg-white/5 hover:text-white"}`}
              >
                <span className="flex items-center gap-2">
                  <Tag size={14} aria-hidden="true" />
                  All Notes
                </span>
              </button>

              {isTagLoading ? (
                <Skeleton variant="text" count={4} />
              ) : tagStats.length === 0 ? (
                <p className="text-sm text-zinc-500">No tags yet.</p>
              ) : (
                <div className="space-y-1">
                  {tagStats.map((tag) => (
                    <button
                      key={tag.name}
                      type="button"
                      onClick={() => setActiveTag(tag.name)}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${activeTag === tag.name ? "bg-white/10 text-white" : "text-zinc-400 hover:bg-white/5 hover:text-white"}`}
                    >
                      <span className="truncate">{tag.name}</span>
                      <span className="text-xs text-zinc-500">{tag.count}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </aside>

          <section>
            {selectedNoteIds.length > 0 && (
              <div className="mb-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-amber-300">{selectedNoteIds.length} selected</span>
                  <Button onClick={bulkDeleteSelected} variant="danger" size="sm" className="rounded-lg px-3 py-1 text-xs active:scale-95">
                    Delete Selected
                  </Button>
                  <Button onClick={bulkExportSelected} variant="secondary" size="sm" className="rounded-lg border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300 hover:bg-white/10 active:scale-95">
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
                  <Button onClick={bulkMoveSelected} variant="secondary" size="sm" className="rounded-lg border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300 hover:bg-white/10 active:scale-95">
                    Move to Folder
                  </Button>
                  <Button onClick={selectAllVisible} variant="secondary" size="sm" className="rounded-lg border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300 hover:bg-white/10 active:scale-95">
                    {selectedNoteIds.length === notes.length ? "Unselect All" : "Select All"}
                  </Button>
                </div>
              </div>
            )}

            {isLoading ? (
              <SkeletonList count={6} />
            ) : notes.length === 0 ? (
              <EmptyState
                icon="📝"
                title={debouncedSearch || activeTag || activeFolder || activePeriod || activeFormat ? "No notes found" : "No notes yet"}
                description={
                  debouncedSearch || activeTag || activeFolder || activePeriod || activeFormat
                    ? "Try adjusting your search or removing filters to see more results."
                    : "Generate your first AI note from any topic"
                }
                action={{ label: 'Create your first note', href: '/generator' }}
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {notes.map((note) => (
                  <article
                    key={note.id}
                    draggable
                    onDragStart={(event) => event.dataTransfer.setData("text/note-id", note.id)}
                    onMouseEnter={() => setHoveredNoteId(note.id)}
                    onMouseLeave={() => setHoveredNoteId("")}
                    className="group relative flex flex-col rounded-xl border border-white/10 bg-zinc-900/50 p-5 backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-white/20"
                  >
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <div className="flex flex-1 flex-wrap items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedNoteIds.includes(note.id)}
                          onChange={() => toggleNoteSelected(note.id)}
                          className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-amber-500 focus:ring-amber-500/20"
                          aria-label={`Select note ${note.title}`}
                        />
                        {note.isPinned && <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400">Pinned</span>}
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${getFormatBadgeColor(note.format)}`}>
                          {getFormatLabel(note.format)}
                        </span>
                        {note.isShared && <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">Shared</span>}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => void togglePin(note)}
                          className={`rounded-lg p-1.5 transition ${note.isPinned ? "text-amber-400" : "text-zinc-500 hover:text-amber-400"}`}
                          aria-label={note.isPinned ? "Unpin note" : "Pin note"}
                          title={note.isPinned ? "Unpin note" : "Pin note"}
                        >
                          <Pin size={14} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void shareNote(note)}
                          className="rounded-lg p-1.5 text-zinc-500 transition hover:text-emerald-400"
                          aria-label="Share note link"
                          title="Share note link"
                        >
                          <Share2 size={14} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setMenuOpenNoteId((prev) => (prev === note.id ? "" : note.id))}
                          className="rounded-lg p-1.5 text-zinc-500 transition hover:text-white"
                          aria-label="More actions"
                          title="More actions"
                        >
                          <MoreHorizontal size={14} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteNote(note.id)}
                          className="rounded-lg p-1.5 text-zinc-500 opacity-0 transition hover:text-red-400 group-hover:opacity-100"
                          aria-label="Delete note"
                          title="Delete note"
                        >
                          <Trash2 size={14} aria-hidden="true" />
                        </button>
                      </div>
                    </div>

                    <h3 className="mb-2 line-clamp-2 text-xl font-bold text-white">
                      <HighlightText text={note.title} query={debouncedSearch} />
                    </h3>

                    <div
                      className="mb-3 line-clamp-3 text-base leading-relaxed text-zinc-400"
                      dangerouslySetInnerHTML={{ __html: renderMath(note.content) }}
                    />

                    <div className="mb-3">
                      <AudioPlayer
                        noteId={note.id}
                        noteTitle={note.title}
                        noteContent={note.content}
                        compact={true}
                      />
                    </div>

                    {note.tags.length > 0 && (
                      <div className="mb-3 flex flex-wrap gap-1.5">
                        {note.tags.map((tag) => (
                          <button
                            key={`${note.id}-${tag}`}
                            type="button"
                            onClick={() => setActiveTag(tag)}
                            className={`rounded-full px-2 py-0.5 text-xs transition hover:opacity-80 ${getTagColor(tag)}`}
                          >
                            <HighlightText text={tag} query={debouncedSearch} />
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="mt-auto border-t border-white/5 pt-3">
                      <p className="text-xs text-zinc-500">{formatDate(note.updatedAt ?? note.createdAt)}</p>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {getWordCount(note.content).toLocaleString()} words · {getReadTime(note.content)} min read
                      </p>
                    </div>

                    {menuOpenNoteId === note.id && (
                      <div className="absolute right-12 top-8 z-20 rounded-lg border border-white/10 bg-zinc-900 p-2 shadow-xl">
                        <button
                          type="button"
                          onClick={() => {
                            void duplicateNote(note);
                            setMenuOpenNoteId("");
                          }}
                          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs text-zinc-300 transition hover:bg-white/5 hover:text-white"
                        >
                          <Copy size={14} aria-hidden="true" />
                          Duplicate
                        </button>
                      </div>
                    )}

                    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <Button
                        onClick={() => void openEditor(note)}
                        variant="secondary"
                        size="sm"
                        className="rounded-lg border-white/10 bg-white/5 py-2 text-xs text-zinc-300 hover:bg-white/10 active:scale-95"
                      >
                        <Edit3 size={14} className="mr-1.5" aria-hidden="true" />
                        Edit
                      </Button>
                      <Button
                        onClick={() => continueStudying(note)}
                        variant="secondary"
                        size="sm"
                        className="rounded-lg border-white/10 bg-white/5 py-2 text-xs text-zinc-300 hover:bg-white/10 active:scale-95"
                      >
                        Continue
                      </Button>
                      <Button
                        onClick={() => openFlashcardsFromNote(note.id)}
                        variant="secondary"
                        size="sm"
                        className="rounded-lg border-white/10 bg-white/5 py-2 text-xs text-zinc-300 hover:bg-white/10 active:scale-95"
                      >
                        Flashcards
                      </Button>
                      <Button
                        onClick={() => void exportNotePdf(note.id)}
                        disabled={exportingNoteId === note.id}
                        loading={exportingNoteId === note.id}
                        size="sm"
                        className="rounded-lg py-2 text-xs active:scale-95"
                      >
                        {exportingNoteId === note.id ? "Exporting..." : "Export PDF"}
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

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


