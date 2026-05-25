'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { useToast } from '~/app/_components/toast'
import { DashboardSkeleton } from '~/app/_components/skeleton'
import {
  FileText,
  Layers,
  Bot,
  Camera,
  Plus,
  Sparkles,
  BatteryMedium,
  Pin,
  PinOff,
  Flame,
  Brain,
  Clock,
  ArrowRight,
  Eye,
} from 'lucide-react'

/* ─── Types ─────────────────────────────────────────────────── */

type NoteItem = {
  id: string
  title: string
  format: string
  createdAt: string
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
    total: number
    thisMonth: number
  }
  readiness: number
}

type FeatureKey = 'notes' | 'nova' | 'flashcards' | 'screenshot' | 'nova-vision'

type Feature = {
  key: FeatureKey
  label: string
  description: string
  href: string
  icon: typeof FileText
  accent: string
  glow: string
  iconBg: string
}

const FEATURES: Feature[] = [
  {
    key: 'notes',
    label: 'My Notes',
    description: 'Library, drafts, and shared decks',
    href: '/my-notes',
    icon: FileText,
    accent: 'rgba(240, 180, 41, 0.35)',
    glow: 'rgba(240, 180, 41, 0.18)',
    iconBg: 'from-amber-400/20 to-amber-500/5 text-amber-300',
  },
  {
    key: 'nova',
    label: 'Nova AI',
    description: 'Tutor, planner, and study coach',
    href: '/tutor',
    icon: Bot,
    accent: 'rgba(45, 212, 191, 0.35)',
    glow: 'rgba(45, 212, 191, 0.18)',
    iconBg: 'from-teal-400/20 to-emerald-500/5 text-teal-300',
  },
  {
    key: 'flashcards',
    label: 'Flashcards',
    description: 'Spaced repetition + active recall',
    href: '/flashcards',
    icon: Layers,
    accent: 'rgba(168, 85, 247, 0.35)',
    glow: 'rgba(168, 85, 247, 0.18)',
    iconBg: 'from-purple-400/20 to-fuchsia-500/5 text-purple-300',
  },
  {
    key: 'screenshot',
    label: 'Screenshot Tool',
    description: 'Capture, annotate, and convert',
    href: '/upload',
    icon: Camera,
    accent: 'rgba(226, 232, 240, 0.35)',
    glow: 'rgba(226, 232, 240, 0.18)',
    iconBg: 'from-zinc-200/15 to-zinc-400/5 text-zinc-200',
  },
  {
    key: 'nova-vision',
    label: 'Nova Live Vision',
    description: 'Camera-aware Socratic tutor',
    href: '/dashboard/nova-vision',
    icon: Eye,
    accent: 'rgba(34, 211, 238, 0.35)',
    glow: 'rgba(34, 211, 238, 0.18)',
    iconBg: 'from-cyan-400/20 to-sky-500/5 text-cyan-300',
  },
]

const HIDDEN_KEY = 'kyvex:dashboard:hidden'

/* ─── Greeting + date helpers ───────────────────────────────── */

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good Morning'
  if (h < 18) return 'Good Afternoon'
  return 'Good Evening'
}

function formatToday(): string {
  return new Date().toLocaleDateString('en-CA', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

/* ─── Battery hook (graceful fallback) ──────────────────────── */

type NavigatorBattery = Navigator & {
  getBattery?: () => Promise<{
    level: number
    charging: boolean
    addEventListener: (type: string, listener: () => void) => void
    removeEventListener: (type: string, listener: () => void) => void
  }>
}

function useBatteryLevel(): number {
  const [level, setLevel] = useState<number>(20)

  useEffect(() => {
    const nav = navigator as NavigatorBattery
    if (!nav.getBattery) return

    let battery: Awaited<ReturnType<NonNullable<NavigatorBattery['getBattery']>>> | null = null
    let cancelled = false

    const update = () => {
      if (battery && !cancelled) setLevel(Math.round(battery.level * 100))
    }

    void nav.getBattery().then((b) => {
      if (cancelled) return
      battery = b
      update()
      b.addEventListener('levelchange', update)
    })

    return () => {
      cancelled = true
      if (battery) battery.removeEventListener('levelchange', update)
    }
  }, [])

  return level
}

/* ─── Count-up animated number ──────────────────────────────── */

function CountUp({ to, duration = 1.5, suffix = '' }: { to: number; duration?: number; suffix?: string }) {
  const count = useMotionValue(0)
  const rounded = useTransform(count, (latest) => Math.round(latest))
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    const controls = animate(count, to, { duration, ease: [0.16, 1, 0.3, 1] })
    const unsub = rounded.on('change', (v) => setDisplay(v))
    return () => {
      controls.stop()
      unsub()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [to, duration])

  return (
    <span className="will-change-transform" style={{ fontVariantNumeric: 'tabular-nums' }}>
      {display}
      {suffix}
    </span>
  )
}

/* ─── Stat card ─────────────────────────────────────────────── */

function StatCard({
  icon: Icon,
  label,
  value,
  suffix,
  accent,
  caption,
}: {
  icon: typeof Flame
  label: string
  value: number
  suffix?: string
  accent: string
  caption: string
}) {
  return (
    <motion.div
      variants={cardVariants}
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl transition-colors duration-200 hover:border-white/20 will-change-transform"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background: `radial-gradient(circle at 100% 0%, ${accent}, transparent 60%)`,
        }}
      />
      <div className="relative flex items-start justify-between">
        <span
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 backdrop-blur-md"
          style={{ color: accent.replace('0.35', '0.95') }}
        >
          <Icon size={20} strokeWidth={1.75} />
        </span>
        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
          {caption}
        </span>
      </div>
      <div className="relative mt-6 flex items-baseline gap-1">
        <span className="text-5xl font-extrabold leading-none tracking-tight text-zinc-50">
          <CountUp to={value} suffix={suffix} />
        </span>
      </div>
      <p className="relative mt-2 text-sm font-medium text-zinc-400">{label}</p>
    </motion.div>
  )
}

/* ─── Feature glow card ─────────────────────────────────────── */

function FeatureCard({
  feature,
  isHidden,
  onTogglePin,
}: {
  feature: Feature
  isHidden: boolean
  onTogglePin: (key: FeatureKey) => void
}) {
  const handleMouseMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    e.currentTarget.style.setProperty('--mx', `${x}px`)
    e.currentTarget.style.setProperty('--my', `${y}px`)
  }

  const Icon = feature.icon

  return (
    <motion.div
      variants={cardVariants}
      className="group relative will-change-transform"
    >
      <Link
        href={feature.href}
        onMouseMove={handleMouseMove}
        className={`relative block overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl transition-colors duration-200 hover:border-white/25 ${isHidden ? 'opacity-40' : ''}`}
        style={{
          '--mx': '50%',
          '--my': '50%',
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background: `radial-gradient(420px circle at var(--mx) var(--my), ${feature.glow}, transparent 60%)`,
          }}
        />
        <div className="relative flex items-start justify-between">
          <span
            className={`flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br backdrop-blur-md ${feature.iconBg}`}
          >
            <Icon size={22} strokeWidth={1.75} />
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onTogglePin(feature.key)
            }}
            aria-label={isHidden ? `Show ${feature.label}` : `Hide ${feature.label}`}
            className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-zinc-400 opacity-0 transition-all duration-200 hover:border-white/20 hover:bg-white/10 hover:text-zinc-100 group-hover:opacity-100"
          >
            {isHidden ? <PinOff size={14} strokeWidth={2} /> : <Pin size={14} strokeWidth={2} />}
          </button>
        </div>
        <div className="relative mt-6">
          <h3 className="text-lg font-bold text-zinc-50">{feature.label}</h3>
          <p className="mt-1 text-sm text-zinc-400">{feature.description}</p>
        </div>
        <div className="relative mt-5 inline-flex items-center gap-1 text-xs font-semibold text-zinc-300 transition-colors duration-200 group-hover:text-white">
          Open
          <ArrowRight size={12} strokeWidth={2.5} className="transition-transform duration-200 group-hover:translate-x-0.5" />
        </div>
      </Link>
    </motion.div>
  )
}

/* ─── Motion variants ───────────────────────────────────────── */

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.04,
    },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 280, damping: 26 },
  },
}

/* ─── Main Page ─────────────────────────────────────────────── */

export default function DashboardPage() {
  const { showToast } = useToast()

  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hidden, setHidden] = useState<Record<FeatureKey, boolean>>({
    notes: false,
    nova: false,
    flashcards: false,
    screenshot: false,
    'nova-vision': false,
  })
  const battery = useBatteryLevel()

  /* Load hidden feature preferences */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(HIDDEN_KEY)
      if (raw) setHidden({ ...hidden, ...(JSON.parse(raw) as Record<FeatureKey, boolean>) })
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* Fetch consolidated stats */
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/dashboard/stats')
        if (!res.ok) throw new Error('Failed to load stats')
        const data = (await res.json()) as DashboardStats
        setStats(data)
      } catch {
        showToast('Failed to load dashboard stats', 'error')
      } finally {
        setIsLoading(false)
      }
    }
    void load()
  }, [showToast])

  const togglePin = (key: FeatureKey) => {
    setHidden((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      try {
        localStorage.setItem(HIDDEN_KEY, JSON.stringify(next))
      } catch {
        /* ignore */
      }
      return next
    })
  }

  const userName = stats?.user.name?.split(' ')[0] ?? 'Student'
  const greeting = getGreeting()
  const today = formatToday()

  /* Derived stat values */
  const streak = stats?.user.studyStreak ?? 0
  const readiness = stats?.readiness ?? 0
  const battleXp = stats?.user.battleXp ?? 0
  const soloSessions = stats?.user.soloSessions ?? 0
  const kyvexIQ = Math.round(100 + readiness * 1.4 + battleXp / 40 + streak * 1.5)
  const hoursFocused = Math.round(soloSessions * 0.42)

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-zinc-100 antialiased">
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/4 h-[480px] w-[480px] rounded-full bg-amber-500/10 blur-[140px]" />
        <div className="absolute top-1/2 right-0 h-[420px] w-[420px] rounded-full bg-teal-500/10 blur-[140px]" />
        <div className="absolute bottom-0 left-0 h-[420px] w-[420px] rounded-full bg-purple-500/10 blur-[140px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12" data-tour="dashboard">
        {isLoading || !stats ? (
          <DashboardSkeleton />
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col gap-8"
          >
            {/* ─── Header ─────────────────────────────────── */}
            <motion.header
              variants={cardVariants}
              className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between will-change-transform"
            >
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-zinc-100 sm:text-4xl">
                  {greeting}, <span className="text-white">{userName}</span>
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-400">
                  <span>{today}</span>
                  <span className="h-1 w-1 rounded-full bg-zinc-700" />
                  <span>Ontario Grade 12</span>
                  <span className="h-1 w-1 rounded-full bg-zinc-700" />
                  <span className="inline-flex items-center gap-1.5">
                    <BatteryMedium size={14} strokeWidth={1.75} className="text-emerald-400" />
                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>{battery}% Battery</span>
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/generator"
                  className="group inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-zinc-100 backdrop-blur-xl transition-colors duration-200 hover:border-white/25 hover:bg-white/10 will-change-transform"
                >
                  <Plus size={16} strokeWidth={2.25} className="transition-transform duration-200 group-hover:rotate-90" />
                  New Note
                </Link>
                <Link
                  href="/tutor"
                  className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl border border-teal-300/20 bg-teal-400/10 px-4 py-2.5 text-sm font-semibold text-teal-100 backdrop-blur-xl transition-colors duration-200 hover:border-teal-300/40 hover:bg-teal-400/15 will-change-transform"
                >
                  <span className="absolute inset-0 -z-10 animate-pulse-glow rounded-xl bg-teal-400/20" />
                  <Sparkles size={16} strokeWidth={2.25} className="text-teal-200" />
                  Ask Nova
                </Link>
              </div>
            </motion.header>

            {/* ─── Stats Row ──────────────────────────────── */}
            <section>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Today&apos;s Flex
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <StatCard
                  icon={Flame}
                  label="Study Streak"
                  value={streak}
                  suffix=" days"
                  caption="Daily"
                  accent="rgba(240, 180, 41, 0.35)"
                />
                <StatCard
                  icon={Brain}
                  label="Kyvex IQ Score"
                  value={kyvexIQ}
                  caption="Ranking"
                  accent="rgba(45, 212, 191, 0.35)"
                />
                <StatCard
                  icon={Clock}
                  label="Hours Focused"
                  value={hoursFocused}
                  suffix="h"
                  caption="This Term"
                  accent="rgba(168, 85, 247, 0.35)"
                />
              </div>
            </section>

            {/* ─── Feature Grid ───────────────────────────── */}
            <section>
              <div className="mb-3 flex items-end justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                  Workspace
                </h2>
                <span className="text-xs text-zinc-600">Hover a card to pin or hide</span>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {FEATURES.map((feature) => (
                  <FeatureCard
                    key={feature.key}
                    feature={feature}
                    isHidden={hidden[feature.key]}
                    onTogglePin={togglePin}
                  />
                ))}
              </div>
            </section>

            {/* ─── Recent Activity ────────────────────────── */}
            {stats.notes.recent.length > 0 && (
              <motion.section
                variants={cardVariants}
                className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl will-change-transform"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                      Recent Notes
                    </h2>
                    <p className="mt-1 text-sm text-zinc-400">Pick up where you left off</p>
                  </div>
                  <Link
                    href="/my-notes"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-300 transition-colors duration-200 hover:text-white"
                  >
                    View all {stats.notes.total}
                    <ArrowRight size={12} strokeWidth={2.5} />
                  </Link>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {stats.notes.recent.slice(0, 6).map((note) => (
                    <Link
                      key={note.id}
                      href={`/my-notes?note=${note.id}`}
                      className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 transition-colors duration-200 hover:border-white/15 hover:bg-white/[0.06]"
                    >
                      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white/5 text-zinc-300">
                        <FileText size={15} strokeWidth={1.5} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-zinc-100">{note.title}</p>
                        <p className="text-[11px] capitalize text-zinc-500">{note.format}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </motion.section>
            )}
          </motion.div>
        )}
      </div>

      <style jsx>{`
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50%      { opacity: 0.7; transform: scale(1.04); }
        }
        :global(.animate-pulse-glow) {
          animation: pulse-glow 2.6s ease-in-out infinite;
        }
      `}</style>
    </main>
  )
}
