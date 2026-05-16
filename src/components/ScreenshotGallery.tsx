'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UploadCloud,
  Search,
  Filter,
  X,
  Loader2,
  ImagePlus,
} from 'lucide-react';
import ScreenshotCapture from './ScreenshotCapture';
import ScreenshotCard from './ScreenshotCard';

interface Screenshot {
  id: string;
  title: string;
  subject: string;
  imageData: string;
  noteId?: string;
  note?: {
    id: string;
    title: string;
  };
  createdAt: string;
}

interface Note {
  id: string;
  title: string;
}

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB
const ACCEPTED_MIME = ['image/png', 'image/jpeg', 'image/webp'];

export default function ScreenshotGallery() {
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [currentImageData, setCurrentImageData] = useState<string>('');
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [saving, setSaving] = useState(false);
  // Dropzone state
  const [dragActive, setDragActive] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Get unique subjects for filter dropdown
  const subjects = useMemo(() => {
    const uniqueSubjects = [...new Set(screenshots.map(s => s.subject))];
    return uniqueSubjects.sort();
  }, [screenshots]);

  // Filter screenshots based on search and subject
  const filteredScreenshots = useMemo(() => {
    return screenshots.filter(screenshot => {
      const matchesSearch = screenshot.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSubject = !selectedSubject || screenshot.subject === selectedSubject;
      return matchesSearch && matchesSubject;
    });
  }, [screenshots, searchTerm, selectedSubject]);

  const loadScreenshots = async () => {
    try {
      const response = await fetch('/api/screenshots');
      if (response.ok) {
        const data = await response.json();
        setScreenshots(data);
      }
    } catch (error) {
      console.error('Error loading screenshots:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadNotes = async () => {
    try {
      const response = await fetch('/api/notes?limit=100');
      if (response.ok) {
        const data = await response.json();
        setNotes(data.notes || []);
      }
    } catch (error) {
      console.error('Error loading notes:', error);
    }
  };

  useEffect(() => {
    loadScreenshots();
    loadNotes();
  }, []);

  const handleScreenshotTaken = (dataUrl: string) => {
    setCurrentImageData(dataUrl);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!title.trim() || !subject.trim() || !currentImageData) {
      alert('Please fill in all fields');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/screenshots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          subject: subject.trim(),
          imageData: currentImageData,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save screenshot');
      }

      const newScreenshot = await response.json();
      setScreenshots(prev => [newScreenshot, ...prev]);

      // Reset form
      setTitle('');
      setSubject('');
      setCurrentImageData('');
      setShowForm(false);
    } catch (error) {
      console.error('Error saving screenshot:', error);
      alert('Failed to save screenshot. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this screenshot?')) {
      return;
    }

    try {
      const response = await fetch(`/api/screenshots?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete screenshot');
      }

      setScreenshots(prev => prev.filter(s => s.id !== id));
    } catch (error) {
      console.error('Error deleting screenshot:', error);
      alert('Failed to delete screenshot. Please try again.');
    }
  };

  const handleLinkToNote = async (screenshotId: string, noteId: string | null) => {
    try {
      const response = await fetch(`/api/screenshots?id=${screenshotId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ noteId }),
      });

      if (!response.ok) {
        throw new Error('Failed to link screenshot to note');
      }

      const updatedScreenshot = await response.json();
      setScreenshots(prev =>
        prev.map(s => s.id === screenshotId ? updatedScreenshot : s)
      );
    } catch (error) {
      console.error('Error linking screenshot to note:', error);
      alert('Failed to link screenshot to note. Please try again.');
    }
  };

  const handleUpdateSubject = async (screenshotId: string, nextSubject: string) => {
    try {
      const response = await fetch(`/api/screenshots?id=${screenshotId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: nextSubject }),
      });
      if (!response.ok) throw new Error('Failed to map subject');
      const updated = await response.json();
      setScreenshots((prev) => prev.map((s) => (s.id === screenshotId ? updated : s)));
    } catch (error) {
      console.error('Error mapping subject:', error);
      alert('Failed to map subject. Please try again.');
    }
  };

  // ── Dropzone file handling ────────────────────────────────────────────────
  const validateImageFile = (file: File): string | null => {
    if (!ACCEPTED_MIME.includes(file.type) && !/\.(png|jpe?g|webp)$/i.test(file.name)) {
      return 'Only PNG, JPG, or WEBP images are supported.';
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return 'Image is too large. Max 5MB per snippet.';
    }
    return null;
  };

  const ingestFile = async (file: File) => {
    setUploadError(null);
    const err = validateImageFile(file);
    if (err) {
      setUploadError(err);
      return;
    }
    const dataUrl: string = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ''));
      reader.onerror = () => reject(new Error('Could not read file'));
      reader.readAsDataURL(file);
    });
    setCurrentImageData(dataUrl);
    setTitle(file.name.replace(/\.[^.]+$/, '').slice(0, 80));
    setSubject((prev) => prev || 'General');
    setShowForm(true);
  };

  const handleDropFiles = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    await ingestFile(file);
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) await ingestFile(file);
    event.target.value = '';
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-zinc-500">
        <Loader2 size={18} className="mr-2 animate-spin" aria-hidden="true" />
        Loading snippet lab…
      </div>
    );
  }

  const isDropActive = dragActive || hovered;

  return (
    <div className="relative">
      {/* Ambient lab glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72"
        style={{
          background:
            'radial-gradient(ellipse at 50% 0%, rgba(34,211,238,0.10), transparent 60%), radial-gradient(ellipse at 80% 0%, rgba(168,85,247,0.08), transparent 55%)',
        }}
      />

      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Snippet Lab
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Drop, capture, and organize visual study snippets across your courses.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ScreenshotCapture onScreenshotTaken={handleScreenshotTaken} />
        </div>
      </div>

      {/* Animated gradient-stroke dropzone */}
      <motion.div
        onDragOver={(e) => {
          e.preventDefault();
          if (!dragActive) setDragActive(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragActive(false);
        }}
        onDrop={(e) => void handleDropFiles(e)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Upload a snippet image"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        className="kv-dropzone group relative cursor-pointer overflow-hidden rounded-3xl will-change-transform"
        animate={dragActive ? { scale: 1.01 } : { scale: 1 }}
        transition={{ type: 'spring', stiffness: 280, damping: 24 }}
      >
        {/* Rotating conic gradient ring */}
        <motion.div
          aria-hidden="true"
          className="kv-dropzone-ring absolute inset-0 rounded-3xl"
          animate={{ opacity: isDropActive ? 1 : 0.4 }}
          transition={{ duration: 0.25 }}
          style={{
            background:
              'conic-gradient(from 0deg, rgba(34,211,238,0.95), rgba(168,85,247,0.95), rgba(34,211,238,0.95))',
          }}
        />
        {/* Pulsing glow during drag */}
        {isDropActive && (
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute -inset-4 rounded-[2rem] blur-2xl"
            style={{
              background:
                'radial-gradient(ellipse at center, rgba(34,211,238,0.35), rgba(168,85,247,0.25), transparent 65%)',
            }}
            initial={{ opacity: 0.4 }}
            animate={{ opacity: [0.4, 0.9, 0.4] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}

        {/* Glass cutout (inside the ring) */}
        <div className="relative m-[1.5px] rounded-[calc(1.5rem-1.5px)] bg-black/85 backdrop-blur-2xl">
          <div className="flex flex-col items-center gap-3 px-6 py-10 sm:py-14">
            <motion.div
              aria-hidden="true"
              className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-zinc-300 backdrop-blur-xl"
              animate={
                isDropActive
                  ? { y: [-2, 2, -2], scale: 1.05 }
                  : { y: 0, scale: 1 }
              }
              transition={
                isDropActive
                  ? { duration: 1.6, repeat: Infinity, ease: 'easeInOut' }
                  : { duration: 0.3 }
              }
            >
              <UploadCloud size={24} aria-hidden="true" />
            </motion.div>
            <p className="text-base font-semibold text-zinc-100 sm:text-lg">
              {dragActive
                ? 'Release to ingest snippet'
                : 'Drop a snippet here or click to browse'}
            </p>
            <p className="max-w-md text-center text-xs text-zinc-400 sm:text-sm">
              PNG, JPG, or WEBP · up to 5MB · auto-titled from filename
            </p>
            <AnimatePresence>
              {uploadError && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="text-xs font-medium text-red-300"
                  role="alert"
                >
                  {uploadError}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
          className="hidden"
          onChange={(e) => void handleFileSelect(e)}
        />
      </motion.div>

      {/* Glass search + filter bar */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
            aria-hidden="true"
          />
          <input
            type="text"
            placeholder="Search snippets…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-white/5 py-2.5 pl-9 pr-3 text-sm text-white placeholder-zinc-500 outline-none backdrop-blur-xl transition focus:border-cyan-400/40 focus:shadow-[0_0_24px_rgba(34,211,238,0.18)]"
            aria-label="Search snippets"
          />
        </div>
        <div className="relative sm:w-56">
          <Filter
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
            aria-hidden="true"
          />
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="w-full appearance-none rounded-2xl border border-white/10 bg-white/5 py-2.5 pl-9 pr-8 text-sm text-white outline-none backdrop-blur-xl transition focus:border-purple-400/40 focus:shadow-[0_0_24px_rgba(168,85,247,0.18)]"
            aria-label="Filter by subject"
          >
            <option value="" className="bg-zinc-900">All Subjects</option>
            {subjects.map((s) => (
              <option key={s} value={s} className="bg-zinc-900">
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Results count */}
      <div className="mt-4 flex items-center gap-2 text-xs text-zinc-500">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 font-mono uppercase tracking-wide text-zinc-400">
          <ImagePlus size={11} aria-hidden="true" />
          {filteredScreenshots.length} snippet{filteredScreenshots.length !== 1 ? 's' : ''}
        </span>
        {searchTerm && <span>matching “{searchTerm}”</span>}
        {selectedSubject && <span>in {selectedSubject}</span>}
      </div>

      {/* Snippet Gallery Grid */}
      {filteredScreenshots.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-8 rounded-3xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center"
        >
          <ImagePlus size={28} className="mx-auto mb-3 text-zinc-600" aria-hidden="true" />
          <p className="text-sm text-zinc-400">
            {screenshots.length === 0
              ? 'No snippets in your lab yet — drop an image above to get started.'
              : 'No snippets match your search criteria.'}
          </p>
        </motion.div>
      ) : (
        <motion.div
          layout
          className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          <AnimatePresence mode="popLayout">
            {filteredScreenshots.map((screenshot) => (
              <ScreenshotCard
                key={screenshot.id}
                screenshot={screenshot}
                notes={notes}
                onDelete={handleDelete}
                onLinkToNote={handleLinkToNote}
                onUpdateSubject={handleUpdateSubject}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Save Snippet Modal — Midnight Glass */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            role="dialog"
            aria-modal="true"
            aria-label="Save snippet"
          >
            <button
              type="button"
              onClick={() => setShowForm(false)}
              aria-label="Close save dialog"
              className="absolute inset-0 cursor-default bg-black/70 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 280, damping: 24 }}
              className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/90 p-6 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)] backdrop-blur-2xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-semibold text-white">Save Snippet</h3>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-md p-1 text-zinc-500 transition hover:bg-white/10 hover:text-white"
                  aria-label="Close"
                >
                  <X size={14} aria-hidden="true" />
                </button>
              </div>

              {currentImageData && (
                <div className="mb-4 overflow-hidden rounded-xl border border-white/10 bg-black/40">
                  <img
                    src={currentImageData}
                    alt="Snippet preview"
                    className="max-h-56 w-full object-contain"
                  />
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label htmlFor="snip-title" className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                    Title
                  </label>
                  <input
                    id="snip-title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-cyan-400/40 focus:shadow-[0_0_18px_rgba(34,211,238,0.18)]"
                    placeholder="e.g. Quadratic formula derivation"
                  />
                </div>

                <div>
                  <label htmlFor="snip-subject" className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                    Subject / Course
                  </label>
                  <input
                    id="snip-subject"
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-purple-400/40 focus:shadow-[0_0_18px_rgba(168,85,247,0.18)]"
                    placeholder="e.g. SCH4U, Math, History"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => void handleSave()}
                    disabled={saving}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-cyan-400 to-purple-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_0_24px_rgba(34,211,238,0.35)] transition hover:shadow-[0_0_32px_rgba(34,211,238,0.5)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
                    {saving ? 'Saving…' : 'Save Snippet'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-300 transition hover:bg-white/10 hover:text-white active:scale-95"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        @keyframes kv-rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .kv-dropzone-ring {
          animation: kv-rotate 6s linear infinite;
          will-change: transform;
        }
        @media (prefers-reduced-motion: reduce) {
          .kv-dropzone-ring { animation: none !important; }
        }
      `}</style>
    </div>
  );
}