'use client';

import { useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Link2,
  ScanText,
  Trash2,
  X,
  Loader2,
  Check,
} from 'lucide-react';

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

interface ScreenshotCardProps {
  screenshot: Screenshot;
  notes: Note[];
  onDelete: (id: string) => void;
  onLinkToNote: (screenshotId: string, noteId: string | null) => void;
  onUpdateSubject?: (id: string, subject: string) => Promise<void> | void;
}

const SUBJECT_PRESETS = [
  'Math',
  'Science',
  'English',
  'History',
  'Chemistry',
  'Physics',
  'General',
];

// Stable hash-based tilt so each card has a fixed casual angle across renders
function tiltFor(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) | 0;
  }
  const buckets = [-1.6, -1.1, -0.6, 0.6, 1.1, 1.6];
  return buckets[Math.abs(h) % buckets.length] ?? 0;
}

// Convert a base64 data URL back into a Blob so we can post to /api/extract-image
function dataUrlToBlob(dataUrl: string): Blob {
  const [meta = '', b64 = ''] = dataUrl.split(',');
  const mime = (/data:(.*?);base64/.exec(meta))?.[1] ?? 'image/png';
  const bin = atob(b64);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return new Blob([u8], { type: mime });
}

type ActivePanel = 'none' | 'subject' | 'link' | 'ocr';

export default function ScreenshotCard({
  screenshot,
  notes,
  onDelete,
  onLinkToNote,
  onUpdateSubject,
}: ScreenshotCardProps) {
  const tilt = useMemo(() => tiltFor(screenshot.id), [screenshot.id]);
  const cardRef = useRef<HTMLDivElement | null>(null);

  const [active, setActive] = useState<ActivePanel>('none');
  const [linking, setLinking] = useState(false);
  const [savingSubject, setSavingSubject] = useState(false);
  const [courseCode, setCourseCode] = useState('');
  const [ocrText, setOcrText] = useState<string | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);

  // Cursor-tracked spotlight via CSS custom properties (no React state per move)
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    el.style.setProperty('--mx', `${x}%`);
    el.style.setProperty('--my', `${y}%`);
  };

  const handleLinkToNote = async (noteId: string | null) => {
    setLinking(true);
    try {
      await onLinkToNote(screenshot.id, noteId);
      setActive('none');
    } catch (error) {
      console.error('Error linking to note:', error);
    } finally {
      setLinking(false);
    }
  };

  const handleMapSubject = async (next: string) => {
    if (!onUpdateSubject) return;
    const trimmed = next.trim();
    if (!trimmed) return;
    setSavingSubject(true);
    try {
      await onUpdateSubject(screenshot.id, trimmed);
      setCourseCode('');
      setActive('none');
    } catch (error) {
      console.error('Error mapping subject:', error);
    } finally {
      setSavingSubject(false);
    }
  };

  const handleOcr = async () => {
    if (ocrText) {
      setActive('ocr');
      return;
    }
    setActive('ocr');
    setOcrError(null);
    setOcrLoading(true);
    try {
      const blob = dataUrlToBlob(screenshot.imageData);
      const ext = blob.type.includes('jpeg') ? 'jpg' : 'png';
      const file = new File([blob], `${screenshot.title || 'snippet'}.${ext}`, {
        type: blob.type,
      });
      const fd = new FormData();
      fd.append('file', file);
      fd.append('language', 'eng');
      const res = await fetch('/api/extract-image', { method: 'POST', body: fd });
      const data = (await res.json().catch(() => ({}))) as { text?: string; error?: string };
      if (!res.ok) {
        setOcrError(data.error ?? 'Could not extract text from snippet.');
        return;
      }
      setOcrText((data.text ?? '').trim() || '(No readable text found.)');
    } catch (err) {
      console.error('OCR error', err);
      setOcrError('Network error during OCR. Try again.');
    } finally {
      setOcrLoading(false);
    }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  return (
    <motion.div
      layout
      initial={{ scale: 0.82, opacity: 0, rotate: tilt }}
      animate={{ scale: 1, opacity: 1, rotate: tilt }}
      exit={{ y: 48, opacity: 0, scale: 0.94 }}
      whileHover={{ rotate: 0, y: -8 }}
      transition={{ type: 'spring', stiffness: 260, damping: 22, mass: 0.6 }}
      className="kv-snippet group relative will-change-transform"
      ref={cardRef}
      onMouseMove={handleMouseMove}
    >
      {/* Glass slate */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur-xl transition-colors duration-300 group-hover:border-white/30">
        {/* Cursor-tracked radial spotlight (pure CSS, GPU) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background:
              'radial-gradient(220px circle at var(--mx, 50%) var(--my, 50%), rgba(34,211,238,0.16), transparent 55%)',
          }}
        />

        {/* Subtle inner highlight on hover */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{
            background:
              'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, transparent 40%)',
          }}
        />

        {/* Image plate */}
        <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black/40">
          <img
            src={screenshot.imageData}
            alt={screenshot.title}
            className="aspect-video w-full object-cover transition-transform duration-500 group-hover:scale-[1.02] will-change-transform"
            draggable={false}
          />

          {/* Top-right delete (only on hover) */}
          <button
            type="button"
            onClick={() => onDelete(screenshot.id)}
            title="Delete snippet"
            aria-label="Delete snippet"
            className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-black/50 text-zinc-300 opacity-0 backdrop-blur-md transition-all hover:border-red-400/40 hover:bg-red-500/20 hover:text-red-200 group-hover:opacity-100"
          >
            <Trash2 size={13} aria-hidden="true" />
          </button>

          {/* Floating HUD toolbar — hidden by default, slides up on hover */}
          <div className="pointer-events-none absolute inset-x-2 bottom-2 flex translate-y-[120%] items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-black/55 px-1.5 py-1.5 opacity-0 backdrop-blur-xl transition-all duration-300 will-change-transform group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100">
            <HudButton
              icon={<BookOpen size={13} aria-hidden="true" />}
              label="Map to Subject"
              active={active === 'subject'}
              onClick={() => setActive(active === 'subject' ? 'none' : 'subject')}
              accent="cyan"
            />
            <HudButton
              icon={<Link2 size={13} aria-hidden="true" />}
              label="Link to Note"
              active={active === 'link'}
              onClick={() => setActive(active === 'link' ? 'none' : 'link')}
              accent="purple"
            />
            <HudButton
              icon={<ScanText size={13} aria-hidden="true" />}
              label="OCR Text"
              active={active === 'ocr'}
              onClick={() => {
                if (active === 'ocr') {
                  setActive('none');
                } else {
                  void handleOcr();
                }
              }}
              accent="amber"
            />
          </div>
        </div>

        {/* Title row */}
        <div className="mt-3 flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-sm font-semibold text-zinc-100">
            {screenshot.title}
          </h3>
          <span className="shrink-0 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-cyan-200">
            {screenshot.subject}
          </span>
        </div>

        <div className="mt-1 flex items-center justify-between text-[11px] text-zinc-500">
          <span>{formatDate(screenshot.createdAt)}</span>
          {screenshot.note && (
            <span className="line-clamp-1 max-w-[60%] text-right text-zinc-400">
              <Link2 size={10} className="mr-1 inline align-text-bottom" aria-hidden="true" />
              {screenshot.note.title}
            </span>
          )}
        </div>

        {/* Action panels (subject / link / OCR) */}
        <AnimatePresence initial={false} mode="wait">
          {active === 'subject' && (
            <motion.div
              key="subject"
              initial={{ opacity: 0, y: -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ duration: 0.18 }}
              className="mt-3 rounded-xl border border-white/10 bg-black/50 p-3 backdrop-blur-xl"
            >
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300">
                  Map to Subject
                </p>
                <button
                  type="button"
                  onClick={() => setActive('none')}
                  className="rounded-md p-0.5 text-zinc-500 transition hover:bg-white/10 hover:text-white"
                  aria-label="Close subject picker"
                >
                  <X size={12} aria-hidden="true" />
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {SUBJECT_PRESETS.map((s) => {
                  const active = s === screenshot.subject;
                  return (
                    <button
                      key={s}
                      type="button"
                      disabled={savingSubject || !onUpdateSubject}
                      onClick={() => void handleMapSubject(s)}
                      className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold transition-all disabled:opacity-40 ${
                        active
                          ? 'border-cyan-400/50 bg-cyan-400/15 text-cyan-100'
                          : 'border-white/10 bg-white/5 text-zinc-300 hover:border-white/25 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                <input
                  type="text"
                  value={courseCode}
                  onChange={(e) => setCourseCode(e.target.value.toUpperCase().slice(0, 12))}
                  placeholder="e.g. SCH4U"
                  className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/40 px-2 py-1 font-mono text-[11px] text-white placeholder-zinc-600 outline-none transition focus:border-cyan-400/40"
                  aria-label="Custom course code"
                />
                <button
                  type="button"
                  disabled={!courseCode.trim() || savingSubject || !onUpdateSubject}
                  onClick={() => void handleMapSubject(courseCode)}
                  className="inline-flex h-7 items-center gap-1 rounded-lg bg-cyan-400/20 px-2 text-[11px] font-semibold text-cyan-100 transition hover:bg-cyan-400/30 disabled:opacity-40"
                >
                  {savingSubject ? (
                    <Loader2 size={11} className="animate-spin" aria-hidden="true" />
                  ) : (
                    <Check size={11} aria-hidden="true" />
                  )}
                  Apply
                </button>
              </div>
            </motion.div>
          )}

          {active === 'link' && (
            <motion.div
              key="link"
              initial={{ opacity: 0, y: -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ duration: 0.18 }}
              className="mt-3 rounded-xl border border-white/10 bg-black/50 p-3 backdrop-blur-xl"
            >
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-purple-300">
                  Link to Note
                </p>
                <button
                  type="button"
                  onClick={() => setActive('none')}
                  className="rounded-md p-0.5 text-zinc-500 transition hover:bg-white/10 hover:text-white"
                  aria-label="Close link picker"
                >
                  <X size={12} aria-hidden="true" />
                </button>
              </div>
              {notes.length === 0 ? (
                <p className="text-[11px] text-zinc-500">You have no notes yet to link.</p>
              ) : (
                <div className="max-h-40 space-y-0.5 overflow-y-auto pr-1">
                  <button
                    type="button"
                    onClick={() => void handleLinkToNote(null)}
                    disabled={linking}
                    className="block w-full rounded-md px-2 py-1 text-left text-[11px] text-zinc-400 transition hover:bg-white/5 hover:text-zinc-200 disabled:opacity-50"
                  >
                    {linking ? 'Unlinking…' : 'Unlink from note'}
                  </button>
                  {notes.map((note) => {
                    const isLinked = screenshot.noteId === note.id;
                    return (
                      <button
                        key={note.id}
                        type="button"
                        onClick={() => void handleLinkToNote(note.id)}
                        disabled={linking}
                        className={`block w-full rounded-md px-2 py-1 text-left text-[11px] transition disabled:opacity-50 ${
                          isLinked
                            ? 'bg-purple-400/15 text-purple-100'
                            : 'text-zinc-300 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        {isLinked ? '◉ ' : ''}{note.title}
                      </button>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {active === 'ocr' && (
            <motion.div
              key="ocr"
              initial={{ opacity: 0, y: -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ duration: 0.18 }}
              className="mt-3 rounded-xl border border-white/10 bg-black/50 p-3 backdrop-blur-xl"
            >
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300">
                  Extracted Text
                </p>
                <button
                  type="button"
                  onClick={() => setActive('none')}
                  className="rounded-md p-0.5 text-zinc-500 transition hover:bg-white/10 hover:text-white"
                  aria-label="Close OCR panel"
                >
                  <X size={12} aria-hidden="true" />
                </button>
              </div>
              {ocrLoading ? (
                <div className="flex items-center gap-2 py-2 text-[11px] text-zinc-400">
                  <Loader2 size={12} className="animate-spin" aria-hidden="true" />
                  Reading snippet…
                </div>
              ) : ocrError ? (
                <p className="text-[11px] text-red-300">{ocrError}</p>
              ) : (
                <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap break-words rounded-md bg-black/40 p-2 font-sans text-[11px] leading-relaxed text-zinc-200">
                  {ocrText}
                </pre>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function HudButton({
  icon,
  label,
  onClick,
  active,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active: boolean;
  accent: 'cyan' | 'purple' | 'amber';
}) {
  const accentMap: Record<typeof accent, string> = {
    cyan:
      'hover:border-cyan-400/40 hover:bg-cyan-400/15 hover:text-cyan-100 hover:shadow-[0_0_14px_rgba(34,211,238,0.35)]',
    purple:
      'hover:border-purple-400/40 hover:bg-purple-400/15 hover:text-purple-100 hover:shadow-[0_0_14px_rgba(168,85,247,0.35)]',
    amber:
      'hover:border-amber-400/40 hover:bg-amber-400/15 hover:text-amber-100 hover:shadow-[0_0_14px_rgba(245,158,11,0.35)]',
  };
  const activeMap: Record<typeof accent, string> = {
    cyan: 'border-cyan-400/50 bg-cyan-400/15 text-cyan-100 shadow-[0_0_14px_rgba(34,211,238,0.35)]',
    purple:
      'border-purple-400/50 bg-purple-400/15 text-purple-100 shadow-[0_0_14px_rgba(168,85,247,0.35)]',
    amber:
      'border-amber-400/50 bg-amber-400/15 text-amber-100 shadow-[0_0_14px_rgba(245,158,11,0.35)]',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-semibold transition-all active:scale-95 ${
        active
          ? activeMap[accent]
          : `border-white/10 bg-white/5 text-zinc-300 ${accentMap[accent]}`
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}