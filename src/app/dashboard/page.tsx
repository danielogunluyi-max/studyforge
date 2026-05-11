'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '~/app/_components/toast'
import {
  FileText,
  Layers,
  BookOpen,
  Zap,
  Flame,
  Clock,
  TrendingUp,
  ArrowRight,
  AlertTriangle,
  Sparkles,
  ScanLine,
  Plus,
  Bot,
  Compass,
} from 'lucide-react'

/* ─── Types ─────────────────────────────────────────────────── */

type NoteItem = {
  id: string
  title: string
  format: string
  createdAt: string
}

type ExamItem = {
  id: string
  subject: string
  examDate: string
  board: string | null
  daysUntil: number
}

type Recommendation = {
  type: string
  message: string
  action: { label: string; href: string }
  urgency: 'high' | 'medium' | 'low'
}

type DashboardStats = {
  user: {
    name: string | null
    studyStreak: number
    lastActive: string | null
    battleXp: number
    soloSessions: number
  }
  notes: {
    recent: NoteItem[]
    total: number
  }
  exams: {
    upcoming: ExamItem[]
    total: number
    thisMonth: number
  }
  readiness: number
  recommendations: Recommendation[]
}

/* ─── Helpers ───────────────────────────────────────────────── */

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / (1000 * 60))
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatLabel(type: string): string {
  switch (type) {
    case 'exam': return 'Exam Alert'
    case 'review': return 'Review Needed'
    case 'streak': return 'Streak'
    case 'readiness': return 'Readiness'
    default: return 'Tip'
  }
}

function urgencyColor(u: 'high' | 'medium' | 'low'): string {
  if (u === 'high') return 'border-red-500/20 bg-red-500/[0.04] text-red-400'
  if (u === 'medium') return 'border-amber-500/20 bg-amber-500/[0.04] text-amber-400'
  return 'border-emerald-500/20 bg-emerald-500/[0.04] text-emerald-400'
}

function urgencyBadge(u: 'high' | 'medium' | 'low'): string {
  if (u === 'high') return 'bg-red-500/10 text-red-400'
  if (u === 'medium') return 'bg-amber-500/10 text-amber-400'
  return 'bg-emerald-500/10 text-emerald-400'
}

/* ─── Circular Progress Ring ────────────────────────────────── */

function CircularRing({ value, max, label, sublabel }: { value: number; max: number; label: string; sublabel: string }) {
  const pct = Math.min(value / max, 1)
  const r = 42
  const c = 2 * Math.PI * r
  const offset = c * (1 - pct)

  return (
    <div className="relative mx-auto h-32 w-32">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
        <circle
          cx="50" cy="50" r={r} fill="none"
          stroke="url(#ringGrad)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="transition-all duration-1000"
        />
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f0b429" />
            <stop offset="100%" stopColor="#f97316" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-white">{value}</span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">{sublabel}</span>
      </div>
      <p className="mt-3 text-center text-xs font-semibold text-zinc-400">{label}</p>
    </div>
  )
}

/* ─── Stat Row ──────────────────────────────────────────────── */

function StatRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between border-t border-white/5 py-3">
      <div className="flex items-center gap-2.5 text-zinc-500">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <span className="text-sm font-bold text-white">{value}</span>
    </div>
  )
}

/* ─── Main Page ───────────────────────────────────────────── */

export default function DashboardPage() {
  const router = useRouter()
  const { showToast } = useToast()
  const scanFileInputRef = useRef<HTMLInputElement>(null)

  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isScanningNotes, setIsScanningNotes] = useState(false)

  /* Fetch consolidated stats */
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/dashboard/stats')
        if (!res.ok) throw new Error('Failed to load stats')
        const data = (await res.json()) as DashboardStats
        setStats(data)
      } catch (err) {
        showToast('Failed to load dashboard stats', 'error')
      } finally {
        setIsLoading(false)
      }
    }
    void load()
  }, [showToast])

  /* Handwritten scan (preserved from original) */
  const openScanPicker = () => scanFileInputRef.current?.click()

  const handleScanFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      showToast('Please select an image for handwritten scanning', 'error')
      return
    }
    setIsScanningNotes(true)
    try {
      const formData = new FormData()
      formData.append('image', file)
      const response = await fetch('/api/scan-handwritten', { method: 'POST', body: formData })
      const data = (await response.json().catch(() => ({}))) as {
        text?: string
        confidence?: number
        error?: string
      }
      if (!response.ok) {
        showToast(data.error ?? 'Failed to scan handwritten notes', 'error')
        return
      }
      const text = String(data.text ?? '').trim()
      if (!text) {
        showToast('No readable handwritten text found', 'error')
        return
      }
      sessionStorage.setItem('kyvex:prefillText', text)
      sessionStorage.setItem('kyvex:prefillFormat', 'summary')
      showToast('Handwritten notes ready in generator', 'success')
      router.push('/generator?source=dashboard-scan')
    } catch {
      showToast('Failed to scan handwritten notes', 'error')
    } finally {
      setIsScanningNotes(false)
    }
  }

  const userName = stats?.user.name?.split(' ')[0] ?? 'Student'

  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white antialiased md:px-6 md:py-8">
      {/* Hidden scan input */}
      <input
        ref={scanFileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleScanFile}
      />

      <div className="mx-auto max-w-[1280px]">
        {/* Header */}
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">
              Welcome back, {userName}
            </p>
            <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-white" style={{ fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}>
              COMMAND CENTER
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-400">
              Your mission control for exams, notes, and daily study momentum.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={openScanPicker}
              disabled={isScanningNotes}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-300 transition-all hover:border-white/20 hover:bg-zinc-800 active:scale-95 disabled:opacity-60"
            >
              <ScanLine size={16} strokeWidth={1.5} />
              {isScanningNotes ? 'Scanning…' : 'Scan Notes'}
            </button>
            <Link
              href="/generator"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-black transition-all hover:scale-[1.02] active:scale-95"
            >
              <Plus size={16} strokeWidth={2.5} />
              New Note
            </Link>
          </div>
        </div>

        {isLoading || !stats ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className={`rounded-2xl border border-white/5 bg-zinc-900/50 ${i === 0 ? 'md:col-span-2 md:row-span-2 min-h-[340px]' : i === 1 ? 'md:col-span-1 md:row-span-2 min-h-[340px]' : i === 2 ? 'md:col-span-1 min-h-[160px]' : 'md:col-span-4 min-h-[140px]'}`}
              >
                <div className="animate-pulse p-6">
                  <div className="mb-4 h-3 w-24 rounded bg-white/5" />
                  <div className="h-4 w-3/4 rounded bg-white/5" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">

            {/* ═══════════════════════════════════════════════════
                CARD 1 — CURRENT FOCUS (Wide, 2 cols, 2 rows)
            ═══════════════════════════════════════════════════ */}
            <section className="group relative flex flex-col rounded-2xl border border-white/10 bg-[#0a0a0a] p-6 transition-all duration-300 hover:border-white/20 md:col-span-2 md:row-span-2">
              <div className="mb-4 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                <h2 className="text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-500">Current Focus</h2>
              </div>

              {stats.notes.recent.length > 0 ? (
                <div className="flex flex-1 flex-col">
                  <p className="mb-4 text-sm text-zinc-500">
                    Your last {stats.notes.recent.length} activity
                  </p>
                  <div className="flex flex-1 flex-col gap-2">
                    {stats.notes.recent.map((note) => (
                      <div
                        key={note.id}
                        className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3"
                      >
                        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white/5 text-zinc-500">
                          <FileText size={16} strokeWidth={1.5} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-white">{note.title}</p>
                          <p className="text-[11px] text-zinc-600 capitalize">{note.format}</p>
                        </div>
                        <span className="flex-shrink-0 text-[11px] text-zinc-600">{timeAgo(note.createdAt)}</span>
                      </div>
                    ))}
                  </div>
                  <Link
                    href="/my-notes"
                    className="mt-4 inline-flex items-center gap-1.5 self-start text-xs font-bold text-amber-400 transition-colors hover:text-amber-300"
                  >
                    View all {stats.notes.total} notes <ArrowRight size={12} strokeWidth={2.5} />
                  </Link>
                </div>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-zinc-500">
                    <FileText size={28} strokeWidth={1} />
                  </div>
                  <h3 className="text-lg font-bold text-white">Start your first note</h3>
                  <p className="mt-2 max-w-xs text-sm text-zinc-500">
                    Generate AI-powered notes, flashcards, or practice quizzes from any topic.
                  </p>
                  <Link
                    href="/generator"
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-black transition-all hover:scale-[1.02] active:scale-95"
                  >
                    <Plus size={16} strokeWidth={2.5} />
                    Create Note
                  </Link>
                </div>
              )}
            </section>

            {/* ═══════════════════════════════════════════════════
                CARD 2 — STUDY STATS (Tall, 1 col, 2 rows)
            ═══════════════════════════════════════════════════ */}
            <section className="relative flex flex-col rounded-2xl border border-white/10 bg-[#0a0a0a] p-6 transition-all duration-300 hover:border-white/20 md:col-span-1 md:row-span-2">
              <div className="mb-4 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                <h2 className="text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-500">Study Stats</h2>
              </div>

              <div className="mt-2 flex flex-col">
                <CircularRing
                  value={stats.user.studyStreak}
                  max={30}
                  label={stats.user.studyStreak > 0 ? 'Keep it up!' : 'Start today'}
                  sublabel="Days"
                />

                <div className="mt-4">
                  <StatRow
                    icon={<Layers size={14} strokeWidth={1.5} />}
                    label="Total Notes"
                    value={stats.notes.total}
                  />
                  <StatRow
                    icon={<BookOpen size={14} strokeWidth={1.5} />}
                    label="Exams Tracked"
                    value={stats.exams.total}
                  />
                  <StatRow
                    icon={<TrendingUp size={14} strokeWidth={1.5} />}
                    label="Readiness"
                    value={`${stats.readiness}%`}
                  />
                  <StatRow
                    icon={<Zap size={14} strokeWidth={1.5} />}
                    label="Battle XP"
                    value={stats.user.battleXp}
                  />
                  <StatRow
                    icon={<Clock size={14} strokeWidth={1.5} />}
                    label="Solo Sessions"
                    value={stats.user.soloSessions}
                  />
                </div>
              </div>
            </section>

            {/* ═══════════════════════════════════════════════════
                CARD 3 — QUICK ACTIONS (Square, 1 col)
            ═══════════════════════════════════════════════════ */}
            <section className="relative flex flex-col rounded-2xl border border-white/10 bg-[#0a0a0a] p-6 transition-all duration-300 hover:border-white/20 md:col-span-1">
              <div className="mb-4 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <h2 className="text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-500">Quick Actions</h2>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-3">
                <Link
                  href="/generator"
                  className="flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-4 text-center transition-all hover:border-amber-500/30 hover:bg-amber-500/[0.04] hover:shadow-[0_0_20px_-5px_rgba(240,180,41,0.15)] active:scale-95"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
                    <FileText size={18} strokeWidth={1.5} />
                  </span>
                  <span className="text-[11px] font-bold text-white">Create Note</span>
                </Link>

                <Link
                  href="/flashcards"
                  className="flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-4 text-center transition-all hover:border-blue-500/30 hover:bg-blue-500/[0.04] hover:shadow-[0_0_20px_-5px_rgba(59,130,246,0.15)] active:scale-95"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
                    <Layers size={18} strokeWidth={1.5} />
                  </span>
                  <span className="text-[11px] font-bold text-white">Flashcards</span>
                </Link>

                <Link
                  href="/tutor"
                  className="flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-4 text-center transition-all hover:border-emerald-500/30 hover:bg-emerald-500/[0.04] hover:shadow-[0_0_20px_-5px_rgba(16,185,129,0.15)] active:scale-95"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                    <Bot size={18} strokeWidth={1.5} />
                  </span>
                  <span className="text-[11px] font-bold text-white">Ask Nova</span>
                </Link>

                <Link
                  href="/features"
                  className="flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-4 text-center transition-all hover:border-purple-500/30 hover:bg-purple-500/[0.04] hover:shadow-[0_0_20px_-5px_rgba(168,85,247,0.15)] active:scale-95"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400">
                    <Compass size={18} strokeWidth={1.5} />
                  </span>
                  <span className="text-[11px] font-bold text-white">Curriculum</span>
                </Link>
              </div>
            </section>

            {/* ═══════════════════════════════════════════════════
                CARD 4 — STUDY RECOMMENDATIONS (Wide, 4 cols)
            ═══════════════════════════════════════════════════ */}
            <section className="rounded-2xl border border-white/10 bg-[#0a0a0a] p-6 transition-all duration-300 hover:border-white/20 md:col-span-4">
              <div className="mb-5 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                <h2 className="text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-500">Study Recommendations</h2>
              </div>

              {stats.recommendations.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {stats.recommendations.map((rec, i) => (
                    <div
                      key={i}
                      className={`flex flex-col justify-between rounded-xl border p-4 ${urgencyColor(rec.urgency)}`}
                    >
                      <div>
                        <div className="mb-2 flex items-center gap-2">
                          {rec.urgency === 'high' ? (
                            <AlertTriangle size={14} strokeWidth={2} />
                          ) : rec.urgency === 'medium' ? (
                            <Sparkles size={14} strokeWidth={2} />
                          ) : (
                            <Flame size={14} strokeWidth={2} />
                          )}
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${urgencyBadge(rec.urgency)}`}>
                            {formatLabel(rec.type)}
                          </span>
                        </div>
                        <p className="text-sm font-semibold leading-snug text-white">{rec.message}</p>
                      </div>
                      <Link
                        href={rec.action.href}
                        className="mt-3 inline-flex items-center gap-1 self-start rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-bold text-white transition-all hover:bg-white/[0.06] active:scale-95"
                      >
                        {rec.action.label} <ArrowRight size={12} strokeWidth={2.5} />
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-zinc-500">
                    <Sparkles size={24} strokeWidth={1} />
                  </div>
                  <h3 className="text-base font-bold text-white">All caught up</h3>
                  <p className="mt-1 max-w-sm text-sm text-zinc-500">
                    You are on track. Explore the curriculum or generate new notes to keep learning.
                  </p>
                </div>
              )}
            </section>

          </div>
        )}
      </div>
    </main>
  )
}
