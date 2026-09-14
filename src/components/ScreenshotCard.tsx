'use client';

import { useMemo, useState } from 'react';
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
import { formatTorontoDate } from '~/lib/toronto-time';

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

function tiltFor(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) | 0;
  }
  const buckets = [-1.6, -1.1, -0.6, 0.6, 1.1, 1.6];
  return buckets[Math.abs(h) % buckets.length] ?? 0;
}

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

  const [active, setActive] = useState<ActivePanel>('none');
  const [linking, setLinking] = useState(false);
  const [savingSubject, setSavingSubject] = useState(false);
  const [courseCode, setCourseCode] = useState('');
  const [ocrText, setOcrText] = useState<string | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);

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

  return (
    <motion.div
      layout
      initial={{ scale: 0.82, opacity: 0, rotate: tilt }}
      animate={{ scale: 1, opacity: 1, rotate: tilt }}
      exit={{ y: 48, opacity: 0, scale: 0.94 }}
      whileHover={{ rotate: 0, y: -4 }}
      transition={{ type: 'spring', stiffness: 260, damping: 22, mass: 0.6 }}
      className="group relative will-change-transform"
    >
      <div className="card relative overflow-hidden p-3">
        <div
          className="relative overflow-hidden"
          style={{ border: '1px solid var(--border-default)', borderRadius: 2 }}
        >
          <img
            src={screenshot.imageData}
            alt={screenshot.title}
            className="aspect-video w-full object-cover"
            draggable={false}
          />

          <button
            type="button"
            onClick={() => onDelete(screenshot.id)}
            title="Delete snippet"
            aria-label="Delete snippet"
            className="kv-btn-ghost absolute right-2 top-2 opacity-0 group-hover:opacity-100"
            style={{ padding: 6, minHeight: 28, minWidth: 28 }}
          >
            <Trash2 size={13} aria-hidden="true" />
          </button>

          <div
            className="absolute inset-x-2 bottom-2 flex translate-y-[110%] items-center justify-center gap-1.5 opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100"
            style={{ pointerEvents: 'none' }}
          >
            <div className="flex gap-1.5" style={{ pointerEvents: 'auto' }}>
              <HudButton
                icon={<BookOpen size={13} aria-hidden="true" />}
                label="Map to Subject"
                active={active === 'subject'}
                onClick={() => setActive(active === 'subject' ? 'none' : 'subject')}
              />
              <HudButton
                icon={<Link2 size={13} aria-hidden="true" />}
                label="Link to Note"
                active={active === 'link'}
                onClick={() => setActive(active === 'link' ? 'none' : 'link')}
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
              />
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-start justify-between gap-2">
          <h3 className="kv-row-title line-clamp-2">{screenshot.title}</h3>
          <span className="kv-chip shrink-0">{screenshot.subject}</span>
        </div>

        <div className="mt-1 flex items-center justify-between">
          <span className="kv-meta">{formatTorontoDate(screenshot.createdAt)}</span>
          {screenshot.note && (
            <span className="kv-sub line-clamp-1 max-w-[60%] text-right">
              <Link2 size={10} className="mr-1 inline align-text-bottom" aria-hidden="true" />
              {screenshot.note.title}
            </span>
          )}
        </div>

        <AnimatePresence initial={false} mode="wait">
          {active === 'subject' && (
            <motion.div
              key="subject"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="mt-3 p-3"
              style={{ border: '1px solid var(--border-default)' }}
            >
              <div className="mb-2 flex items-center justify-between">
                <p className="kv-meta">Map to Subject</p>
                <button
                  type="button"
                  onClick={() => setActive('none')}
                  className="kv-btn-ghost"
                  style={{ padding: 4 }}
                  aria-label="Close subject picker"
                >
                  <X size={12} aria-hidden="true" />
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {SUBJECT_PRESETS.map((s) => {
                  const isActive = s === screenshot.subject;
                  return (
                    <button
                      key={s}
                      type="button"
                      disabled={savingSubject || !onUpdateSubject}
                      onClick={() => void handleMapSubject(s)}
                      className={isActive ? 'kv-chip' : 'kv-btn-ghost'}
                      style={{ padding: '4px 8px', fontSize: 11 }}
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
                  className="kv-field"
                  aria-label="Custom course code"
                />
                <button
                  type="button"
                  disabled={!courseCode.trim() || savingSubject || !onUpdateSubject}
                  onClick={() => void handleMapSubject(courseCode)}
                  className="kv-btn"
                  style={{ padding: '6px 10px', fontSize: 11 }}
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
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="mt-3 p-3"
              style={{ border: '1px solid var(--border-default)' }}
            >
              <div className="mb-2 flex items-center justify-between">
                <p className="kv-meta">Link to Note</p>
                <button
                  type="button"
                  onClick={() => setActive('none')}
                  className="kv-btn-ghost"
                  style={{ padding: 4 }}
                  aria-label="Close link picker"
                >
                  <X size={12} aria-hidden="true" />
                </button>
              </div>
              {notes.length === 0 ? (
                <p className="kv-sub">You have no notes yet to link.</p>
              ) : (
                <div className="max-h-40 space-y-0.5 overflow-y-auto pr-1">
                  <button
                    type="button"
                    onClick={() => void handleLinkToNote(null)}
                    disabled={linking}
                    className="kv-btn-ghost block w-full text-left"
                    style={{ padding: '6px 8px', fontSize: 11 }}
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
                        className="kv-btn-ghost block w-full text-left"
                        style={{
                          padding: '6px 8px',
                          fontSize: 11,
                          borderColor: isLinked ? 'var(--border-strong)' : undefined,
                        }}
                      >
                        {isLinked ? '● ' : ''}{note.title}
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
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="mt-3 p-3"
              style={{ border: '1px solid var(--border-default)' }}
            >
              <div className="mb-2 flex items-center justify-between">
                <p className="kv-meta">Extracted Text</p>
                <button
                  type="button"
                  onClick={() => setActive('none')}
                  className="kv-btn-ghost"
                  style={{ padding: 4 }}
                  aria-label="Close OCR panel"
                >
                  <X size={12} aria-hidden="true" />
                </button>
              </div>
              {ocrLoading ? (
                <div className="flex items-center gap-2 py-2">
                  <Loader2 size={12} className="animate-spin" aria-hidden="true" />
                  <span className="kv-sub">Reading snippet…</span>
                </div>
              ) : ocrError ? (
                <p className="kv-sub" style={{ color: 'var(--kv-danger)' }}>{ocrError}</p>
              ) : (
                <pre
                  className="kv-sub max-h-40 overflow-y-auto whitespace-pre-wrap break-words p-2"
                  style={{ background: 'var(--bg-surface)', margin: 0 }}
                >
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
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={active ? 'kv-btn' : 'kv-btn-ghost'}
      style={{ padding: '6px 8px', fontSize: 10, gap: 4 }}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
