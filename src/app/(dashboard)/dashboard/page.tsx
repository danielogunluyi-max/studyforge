'use client'

import Link from 'next/link'
import { useEffect, useState, type CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '~/app/_components/toast'
import { DISABLED_FEATURES } from '~/lib/disabled-features'
import { capture } from '~/lib/analytics'
import { torontoGreeting } from '~/lib/toronto-time'
import { JustCapturedStrip } from '~/app/_components/just-captured-strip'
import {
  FileText,
  Layers,
  Bot,
  Inbox,
  Pin,
  PinOff,
  Eye,
} from 'lucide-react'

/* ─── Types ─────────────────────────────────────────────────── */

type NoteItem = {
  id: string
  title: string
  format: string
  createdAt: string
}

type UpcomingExam = {
  id: string
  subject: string
  examDate: string
  board: string | null
  daysUntil: number
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
    upcoming?: UpcomingExam[]
    total: number
    thisMonth: number
  }
  readiness: number
}

type DecayAlert = {
  conceptId: string
  conceptTitle: string
  daysOverdue: number
  deckName: string
  deckId: string
}

type FeatureKey = 'notes' | 'nova' | 'flashcards' | 'inbox' | 'nova-vision'

type Feature = {
  key: FeatureKey
  label: string
  description: string
  href: string
  icon: typeof FileText
}

const FEATURES: Feature[] = [
  {
    key: 'notes',
    label: 'My Notes',
    description: 'Library, drafts, and shared decks',
    href: '/my-notes',
    icon: FileText,
  },
  {
    key: 'nova',
    label: 'Nova AI',
    description: 'Tutor, planner, and study coach',
    href: '/tutor',
    icon: Bot,
  },
  {
    key: 'flashcards',
    label: 'Flashcards',
    description: 'Spaced repetition + active recall',
    href: '/flashcards',
    icon: Layers,
  },
  {
    key: 'inbox',
    label: 'Inbox',
    description: 'Photo, PDF, recording, or YouTube → notes',
    href: '/smart-upload',
    icon: Inbox,
  },
  {
    key: 'nova-vision',
    label: 'Nova Live Vision',
    description: 'Camera-aware Socratic tutor',
    href: '/tutor?mode=vision',
    icon: Eye,
  },
]

const HIDDEN_KEY = 'kyvex:dashboard:hidden'

const HAIRLINE_CARD: CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border-default)',
  borderRadius: 'var(--kv-radius)',
  boxShadow: 'none',
}

function torontoWeekday(value: string | Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Toronto',
    weekday: 'long',
  }).format(new Date(value))
}

function looksLikeCourseCode(value: string): boolean {
  return /^[A-Z]{3,4}\d[A-Z]$/i.test(value.trim())
}

function hrefForTechnique(technique: string): string {
  if (technique === 'Flashcards') return '/flashcards'
  if (technique === 'Practice Test') return '/mock-exam'
  if (technique === 'Note Review') return '/my-notes'
  return '/tutor'
}

function tonightFromPlans(
  plans: unknown[],
  weekday: string,
): Array<{ subject: string; topic: string; href: string }> {
  const first = plans[0] as { plan?: { days?: unknown[] } } | undefined
  const days = first?.plan?.days
  if (!Array.isArray(days)) return []
  const match = days.find((day) => {
    if (!day || typeof day !== 'object') return false
    return (day as { day?: string }).day === weekday
  }) as { blocks?: unknown[] } | undefined
  if (!Array.isArray(match?.blocks)) return []
  return match.blocks.flatMap((block) => {
    if (!block || typeof block !== 'object') return []
    const row = block as { subject?: string; topic?: string; technique?: string }
    const subject = String(row.subject ?? '').trim()
    const topic = String(row.topic ?? '').trim()
    if (!subject && !topic) return []
    return [{
      subject: subject || topic,
      topic,
      href: hrefForTechnique(String(row.technique ?? '')),
    }]
  })
}

function FeatureCard({
  feature,
  isHidden,
  onTogglePin,
}: {
  feature: Feature
  isHidden: boolean
  onTogglePin: (key: FeatureKey) => void
}) {
  const Icon = feature.icon

  return (
    <div className="card" style={{ ...HAIRLINE_CARD, opacity: isHidden ? 0.4 : 1, padding: 16 }}>
      <div className="flex items-start justify-between gap-3">
        <Link href={feature.href} style={{ textDecoration: 'none', minWidth: 0 }}>
          <span className="flex items-center gap-2">
            <Icon size={16} strokeWidth={1.75} aria-hidden="true" style={{ color: 'var(--kv-text-tertiary)' }} />
            <span className="kv-row-title">{feature.label}</span>
          </span>
          <p className="kv-sub" style={{ marginTop: 6 }}>{feature.description}</p>
        </Link>
        <button
          type="button"
          onClick={() => onTogglePin(feature.key)}
          aria-label={isHidden ? `Show ${feature.label}` : `Hide ${feature.label}`}
          className="kv-btn-ghost"
          style={{ padding: '6px 8px' }}
        >
          {isHidden ? <PinOff size={14} strokeWidth={2} /> : <Pin size={14} strokeWidth={2} />}
        </button>
      </div>
    </div>
  )
}

/* ─── Main Page ─────────────────────────────────────────────── */

export default function DashboardPage() {
  const { showToast } = useToast()
  const router = useRouter()

  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [decayAlerts, setDecayAlerts] = useState<DecayAlert[]>([])
  const [tonight, setTonight] = useState<Array<{ subject: string; topic: string; href: string }>>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hidden, setHidden] = useState<Record<FeatureKey, boolean>>({
    notes: false,
    nova: false,
    flashcards: false,
    inbox: false,
    'nova-vision': false,
  })

  useEffect(() => {
    capture('dashboard_view')
  }, [])

  useEffect(() => {
    const slug = new URLSearchParams(window.location.search).get('disabled')
    if (!slug) return
    const feature = DISABLED_FEATURES.find((item) => item.slug === slug)
    const name = feature?.name ?? 'This feature'
    showToast(`${name} is temporarily offline while we make sure its numbers are real.`)
    router.replace('/dashboard')
  }, [router, showToast])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(HIDDEN_KEY)
      if (raw) setHidden({ ...hidden, ...(JSON.parse(raw) as Record<FeatureKey, boolean>) })
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, decayRes, plannerRes] = await Promise.all([
          fetch('/api/dashboard/stats'),
          fetch('/api/decay-alerts'),
          fetch('/api/planner'),
        ])
        if (!statsRes.ok) throw new Error('Failed to load stats')
        const data = (await statsRes.json()) as DashboardStats
        setStats(data)

        if (decayRes.ok) {
          const decay = (await decayRes.json().catch(() => ({}))) as { alerts?: DecayAlert[] }
          setDecayAlerts(Array.isArray(decay.alerts) ? decay.alerts : [])
        }

        if (plannerRes.ok) {
          const planner = (await plannerRes.json().catch(() => ({}))) as { plans?: unknown[] }
          const weekday = torontoWeekday(new Date())
          setTonight(tonightFromPlans(Array.isArray(planner.plans) ? planner.plans : [], weekday))
        }
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

  if (isLoading || !stats) {
    return (
      <main>
        <p className="kv-meta">Loading</p>
      </main>
    )
  }

  const userName = stats.user.name?.split(' ')[0] ?? 'Student'
  const greeting = torontoGreeting()
  const upcoming = stats.exams.upcoming ?? []
  const nextExam = upcoming[0] ?? null
  const examWeekday = nextExam ? torontoWeekday(nextExam.examDate) : null
  const streak = stats.user.studyStreak
  const notesTotal = stats.notes.total
  const dueCount = decayAlerts.length
  const reviewHref = decayAlerts[0]?.deckId
    ? `/flashcards/${decayAlerts[0].deckId}/study`
    : '/flashcards'

  const statsRow: Array<{ label: string; value: number; suffix?: string }> = []
  if (streak > 0) statsRow.push({ label: 'Streak', value: streak })
  if (notesTotal > 0) statsRow.push({ label: 'Notes', value: notesTotal })
  if (dueCount > 0) statsRow.push({ label: 'Cards due', value: dueCount })
  if (nextExam) statsRow.push({ label: 'Revision', value: stats.readiness, suffix: '%' })
  else if (stats.exams.total > 0) statsRow.push({ label: 'Exams', value: stats.exams.total })
  const shownStats = statsRow.slice(0, 4)

  const examMeta = nextExam
    ? [nextExam.subject, nextExam.board, examWeekday].filter((part) => Boolean(part && String(part).trim())).join(' · ')
    : ''

  return (
    <main data-tour="dashboard">
      <div className="kv-crumb">Kyvex / <b>Home</b></div>

      <h1 className="kv-title" style={{ marginTop: 14, fontSize: 44, lineHeight: 1.05 }}>
        {nextExam && examWeekday ? (
          <>Ready for <span className="kv-serif">{examWeekday}.</span></>
        ) : (
          <>{greeting}, {userName}</>
        )}
      </h1>

      {examMeta ? (
        <p className="kv-meta" style={{ marginTop: 10 }}>{examMeta}</p>
      ) : null}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 18 }}>
        <Link href="/generator" className="kv-btn-ghost">New Note</Link>
        <Link href="/tutor" className="kv-btn">Ask Nova</Link>
      </div>

      <JustCapturedStrip />

      {shownStats.length > 0 ? (
        <div className="kv-stats" style={{ marginTop: 28 }}>
          {shownStats.map((item) => (
            <div key={item.label} className="kv-stat">
              <span className="kv-meta">{item.label}</span>
              <b className="num">{item.value}{item.suffix ?? ''}</b>
            </div>
          ))}
        </div>
      ) : null}

      {nextExam || dueCount > 0 ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: nextExam && dueCount > 0 ? '1fr 1fr' : '1fr',
            gap: 12,
            marginTop: 16,
          }}
        >
          {nextExam ? (
            <div className="card" style={{ ...HAIRLINE_CARD, padding: 18 }}>
              <p className="num" style={{ margin: 0, fontSize: 44, fontWeight: 600, letterSpacing: '-0.03em', color: 'var(--kv-text-primary)' }}>
                {Math.max(0, nextExam.daysUntil)}
              </p>
              <p className="kv-meta" style={{ marginTop: 8 }}>
                Days until {nextExam.subject}
              </p>
              <div className="kv-bar" style={{ marginTop: 14 }}>
                <div style={{ width: `${Math.max(0, Math.min(100, stats.readiness))}%` }} />
              </div>
            </div>
          ) : null}

          {dueCount > 0 ? (
            <div className="card" style={{ ...HAIRLINE_CARD, padding: 18 }}>
              <span className="kv-chip kv-chip-stale num">{dueCount}</span>
              <p className="kv-sub" style={{ marginTop: 12 }}>
                {dueCount === 1
                  ? `${decayAlerts[0]?.conceptTitle ?? 'A card'} is overdue.`
                  : `${dueCount} cards are overdue.`}
              </p>
              <Link href={reviewHref} className="kv-btn" style={{ marginTop: 16 }}>
                Review due cards →
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}

      {tonight.length > 0 ? (
        <section style={{ marginTop: 28 }}>
          <p className="kv-meta">Tonight</p>
          {tonight.map((item, index) => (
            <Link
              key={`${item.subject}-${item.topic}-${index}`}
              href={item.href}
              className="kv-row"
            >
              <div>
                <div className="kv-row-title">{item.topic || item.subject}</div>
                <div className="kv-row-sub">
                  <span className={looksLikeCourseCode(item.subject) ? 'kv-chip kv-chip-course' : 'kv-chip'}>
                    {item.subject}
                  </span>
                </div>
              </div>
              <span className="kv-row-side">Open →</span>
            </Link>
          ))}
        </section>
      ) : null}

      <section style={{ marginTop: 28 }}>
        <p className="kv-meta" style={{ marginBottom: 12 }}>Workspace</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
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

      {stats.notes.recent.length > 0 ? (
        <section style={{ marginTop: 28 }}>
          <div className="kv-row" style={{ borderTop: 'none', paddingTop: 0 }}>
            <p className="kv-meta">Recent notes</p>
            <Link href="/my-notes" className="kv-row-side num" style={{ textDecoration: 'none' }}>
              {notesTotal} total
            </Link>
          </div>
          {stats.notes.recent.map((note) => (
            <Link
              key={note.id}
              href={`/my-notes?note=${note.id}`}
              className="kv-row"
            >
              <div>
                <div className="kv-row-title">{note.title}</div>
                <div className="kv-row-sub">
                  <span className="kv-chip">{note.format}</span>
                </div>
              </div>
              <span className="kv-row-side">Open →</span>
            </Link>
          ))}
        </section>
      ) : null}
    </main>
  )
}
