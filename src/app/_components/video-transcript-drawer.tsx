"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Video,
  X,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ChevronRight,
  PlayCircle,
} from "lucide-react";
import { useYouTubeTranscript } from "@/lib/hooks/useYouTubeTranscript";

type VideoTranscriptDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  onImportToNotes: (content: string) => void;
};

const SUBJECTS = ["General", "Math", "Science", "English", "History", "Chemistry", "Physics"];

export default function VideoTranscriptDrawer({
  isOpen,
  onClose,
  onImportToNotes,
}: VideoTranscriptDrawerProps) {
  const [url, setUrl] = useState("");
  const [subject, setSubject] = useState("General");
  const [curriculumCode, setCurriculumCode] = useState("");
  const [imported, setImported] = useState(false);

  const { loading, error, result, fetchTranscript, reset } = useYouTubeTranscript();

  const handleFetch = async () => {
    if (!url.trim()) return;
    setImported(false);
    await fetchTranscript(url, { subject, curriculumCode: curriculumCode.trim() || undefined });
  };

  const handleImport = () => {
    if (!result) return;
    const contentToImport = result.notes || result.transcript || "";
    if (!contentToImport) return;

    onImportToNotes(contentToImport);
    setImported(true);
  };

  const handleClose = () => {
    onClose();
    reset();
    setUrl("");
    setSubject("General");
    setCurriculumCode("");
    setImported(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
            style={{ willChange: "opacity" }}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 z-50 h-full w-full max-w-md border-l border-white/10 bg-slate-900/95 backdrop-blur-xl shadow-2xl"
            style={{ willChange: "transform" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div className="flex items-center gap-2">
                <Video size={18} className="text-red-400" />
                <h2 className="text-sm font-semibold text-white">YouTube Transcript</h2>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Close drawer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="flex h-[calc(100%-73px)] flex-col overflow-hidden">
              {/* Input section */}
              <div className="border-b border-white/10 px-5 py-4">
                <div className="space-y-3">
                  <div>
                    <label htmlFor="youtube-url" className="mb-1.5 block text-[11px] font-semibold text-zinc-400">
                      YouTube URL
                    </label>
                    <input
                      id="youtube-url"
                      type="text"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleFetch()}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-white/20 focus:bg-white/[0.08]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label htmlFor="subject" className="mb-1.5 block text-[11px] font-semibold text-zinc-400">
                        Subject
                      </label>
                      <select
                        id="subject"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/20 focus:bg-white/[0.08]"
                      >
                        {SUBJECTS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="curriculum" className="mb-1.5 block text-[11px] font-semibold text-zinc-400">
                        Course Code (optional)
                      </label>
                      <input
                        id="curriculum"
                        type="text"
                        value={curriculumCode}
                        onChange={(e) => setCurriculumCode(e.target.value)}
                        placeholder="e.g. SCH4U"
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-white/20 focus:bg-white/[0.08]"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleFetch}
                    disabled={loading || !url.trim()}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:from-red-400 hover:to-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
                    style={{ willChange: "transform" }}
                  >
                    {loading ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Fetching…
                      </>
                    ) : (
                      <>
                        <PlayCircle size={14} />
                        Fetch Transcript
                      </>
                    )}
                  </button>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2"
                    style={{ willChange: "transform, opacity" }}
                  >
                    <AlertTriangle size={14} className="mt-0.5 shrink-0 text-red-400" />
                    <p className="text-[11px] text-red-200">{error}</p>
                  </motion.div>
                )}
              </div>

              {/* Transcript display */}
              <div className="flex-1 overflow-y-auto px-5 py-4">
                {result ? (
                  <div className="space-y-4">
                    {/* Video info */}
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <h3 className="mb-1 text-sm font-semibold text-white">{result.title}</h3>
                      <p className="text-[11px] text-zinc-400">by {result.author}</p>
                      <p className="mt-2 text-[11px] text-zinc-500">
                        {result.transcriptLength.toLocaleString()} characters
                      </p>
                    </div>

                    {/* AI Notes */}
                    {result.notes && (
                      <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-4">
                        <div className="mb-2 flex items-center gap-2">
                          <FileText size={14} className="text-cyan-400" />
                          <h4 className="text-xs font-semibold text-cyan-300">AI-Generated Notes</h4>
                        </div>
                        <div className="prose prose-invert prose-sm max-w-none">
                          <pre className="whitespace-pre-wrap text-[12px] leading-relaxed text-zinc-300">
                            {result.notes}
                          </pre>
                        </div>
                      </div>
                    )}

                    {/* Raw transcript */}
                    {result.transcript && (
                      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                        <div className="mb-2 flex items-center gap-2">
                          <FileText size={14} className="text-zinc-400" />
                          <h4 className="text-xs font-semibold text-zinc-300">Raw Transcript</h4>
                        </div>
                        <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap text-[11px] leading-relaxed text-zinc-400">
                          {result.transcript}
                        </pre>
                      </div>
                    )}

                    {/* Import button */}
                    <button
                      type="button"
                      onClick={handleImport}
                      disabled={imported}
                      className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                        imported
                          ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                          : "border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20"
                      }`}
                      style={{ willChange: "transform" }}
                    >
                      {imported ? (
                        <>
                          <CheckCircle2 size={14} />
                          Imported to Notes
                        </>
                      ) : (
                        <>
                          <ChevronRight size={14} />
                          Import to Notes
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <Video size={32} className="mb-3 text-zinc-600" />
                    <p className="text-sm text-zinc-400">Paste a YouTube URL to fetch its transcript</p>
                    <p className="mt-1 text-[11px] text-zinc-600">AI will generate Ontario-style notes</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
