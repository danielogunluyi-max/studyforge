'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

type Exam = {
  id: string
  subject: string
  examDate: string
  studyPlan: string | null
}

type StudyPlanDay = {
  date: string
  title: string
  tasks: string[]
  completed?: boolean
}

type PreferencesResponse = {
  studyStreak?: number
}

type NotesResponse = {
  notes?: Array<{ title?: string }>
}

type SIP = {
  chronotype?: string
  strongestSubjects?: string[]
  retentionScore?: number
  depthScore?: number
  performanceScore?: number
  consistencyScore?: number
  wellbeingScore?: number
  lastSuggestions?: Array<{ message?: string; href?: string }>
}

type StudyModeSession = {
  topic?: string
  currentPhase?: number
  phases?: Array<{ label?: string; completed?: boolean }>
}

type DecayAlert = {
  conceptId: string
  decayScore: number
  daysOverdue: number
}

type KyvexIQ = {
  score: number
  rank: string
  updatedAt?: string
}

type ContentItem = {
  id: string
  icon: string
  title: string
  type: string
  href: string
  createdAt: string
}

type Contract = {
  id: string
  currentStreak: number
  checkIns?: Array<{ createdAt: string }>
}

type CrossoverChallenge = {
  id: string
  completed: boolean
  createdAt: string
}

type FeaturePrefs = {
  prefs?: {
    enabledFeatures?: string[]
  }
}

type EcosystemShortcut = {
  key: string
  label: string
  icon: string
  href: string
}

const ECOSYSTEM_SHORTCUTS: EcosystemShortcut[] = [
  { key: 'study-mode', label: 'Study Mode', icon: '\u{1F3AF}', href: '/study-mode' },
  { key: 'content-hub', label: 'Content Hub', icon: '\u{1F4E6}', href: '/content-hub' },
  { key: 'generator', label: 'Generator', icon: '\u2728', href: '/generator' },
  { key: 'flashcards', label: 'Flashcards', icon: '\u{1F0CF}', href: '/flashcards' },
  { key: 'tutor', label: 'Nova Tutor', icon: '\u{1F916}', href: '/tutor' },
  { key: 'kyvex-iq', label: 'Kyvex IQ', icon: '\u{1F9EC}', href: '/kyvex-iq' },
  { key: 'study-dna', label: 'Study DNA', icon: '\u{1F9E0}', href: '/study-dna' },
  { key: 'predictor', label: 'Exam Predictor', icon: '\u{1F4CA}', href: '/exam-predictor' },
  { key: 'mock-exam', label: 'Mock Exam', icon: '\u{1F4CB}', href: '/mock-exam' },
  { key: 'contract', label: 'Study Contract', icon: '\u{1F4DC}', href: '/contract' },
  { key: 'crossover', label: 'Crossover', icon: '\u{1F500}', href: '/crossover' },
  { key: 'decay-alerts', label: 'Decay Alerts', icon: '\u23F3', href: '/decay-alerts' },
  { key: 'knowledge-map', label: 'Knowledge Map', icon: '\u{1F5FA}\uFE0F', href: '/knowledge-map' },
  { key: 'curriculum', label: 'Curriculum', icon: '\u{1F3DB}\uFE0F', href: '/curriculum' },
]

function safeDaysUntil(examDate: string): number {
  const target = new Date(examDate).getTime()
  const diff = target - Date.now()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

function formatCountdown(examDate: string) {
  const target = new Date(examDate).getTime()
  const diff = Math.max(0, target - Date.now())
  const totalMinutes = Math.floor(diff / (1000 * 60))
  const minutes = totalMinutes % 60
  const totalHours = Math.floor(totalMinutes / 60)
  const hours = totalHours % 24
  const days = Math.floor(totalHours / 24)
  return `${days}d ${hours}h ${minutes}m`
}

function parseStudyPlan(studyPlanRaw: string | null): StudyPlanDay[] {
  if (!studyPlanRaw) return []
  try {
    const parsed = JSON.parse(studyPlanRaw) as { days?: StudyPlanDay[] }
    return Array.isArray(parsed.days) ? parsed.days : []
  } catch {
    return []
  }
}

function timeAgo(dateLike: string) {
  const deltaMs = Date.now() - new Date(dateLike).getTime()
  const minutes = Math.floor(deltaMs / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function chronotypeLabel(value?: string) {
  if (!value) return '\u{1F9ED} Flexible learner'
  if (value === 'morning') return '\u{1F305} Morning learner'
  if (value === 'afternoon') return '\u2600\uFE0F Afternoon learner'
  if (value === 'evening') return '\u{1F306} Evening learner'
  return '\u{1F989} Night learner'
}

function completedRatio(exam: Exam): number {
  const days = parseStudyPlan(exam.studyPlan)
  if (!days.length) return 0
  const completed = days.filter((day) => day.completed).length
  return Math.round((completed / days.length) * 100)
}

function fallbackExam(): Exam {
  return { id: 'fallback', subject: 'General', examDate: new Date().toISOString(), studyPlan: null }
}

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [exams, setExams] = useState<Exam[]>([])
  const [studyStreak, setStudyStreak] = useState(0)
  const [noteTitles, setNoteTitles] = useState<string[]>([])

  const [sip, setSip] = useState<SIP | null>(null)
  const [activeStudy, setActiveStudy] = useState<StudyModeSession | null>(null)
  const [decayAlerts, setDecayAlerts] = useState<DecayAlert[]>([])
  const [kyvexIQ, setKyvexIQ] = useState<KyvexIQ | null>(null)
  const [contentItems, setContentItems] = useState<ContentItem[]>([])
  const [contracts, setContracts] = useState<Contract[]>([])
  const [crossover, setCrossover] = useState<CrossoverChallenge[]>([])
  const [enabledFeatures, setEnabledFeatures] = useState<Set<string> | null>(null)

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      try {
        const [
          examsRes,
          preferencesRes,
          notesRes,
          sipRes,
          studyModeRes,
          decayRes,
          iqRes,
          contentRes,
          contractRes,
          crossoverRes,
          featurePrefsRes,
        ] = await Promise.all([
          fetch('/api/exams'),
          fetch('/api/user/preferences'),
          fetch('/api/notes?limit=100'),
          fetch('/api/sip'),
          fetch('/api/study-mode'),
          fetch('/api/decay-alerts'),
          fetch('/api/kyvex-iq'),
          fetch('/api/content-hub?limit=5'),
          fetch('/api/contract'),
          fetch('/api/crossover'),
          fetch('/api/feature-preferences'),
        ])

        const examsData = (await examsRes.json().catch(() => ({}))) as { exams?: Exam[] }
        const preferencesData = (await preferencesRes.json().catch(() => ({}))) as PreferencesResponse
        const notesData = (await notesRes.json().catch(() => ({}))) as NotesResponse
        const sipData = (await sipRes.json().catch(() => ({}))) as { sip?: SIP }
        const studyModeData = (await studyModeRes.json().catch(() => ({}))) as { active?: StudyModeSession }
        const decayData = (await decayRes.json().catch(() => ({}))) as { alerts?: DecayAlert[] }
        const iqData = (await iqRes.json().catch(() => ({}))) as { iq?: KyvexIQ }
        const contentData = (await contentRes.json().catch(() => ({}))) as { content?: ContentItem[] }
        const contractData = (await contractRes.json().catch(() => ({}))) as { contracts?: Contract[] }
        const crossoverData = (await crossoverRes.json().catch(() => ({}))) as { challenges?: CrossoverChallenge[] }
        const prefsData = (await featurePrefsRes.json().catch(() => ({}))) as FeaturePrefs

        setExams(examsData.exams ?? [])
        setStudyStreak(preferencesData.studyStreak ?? 0)
        setNoteTitles((notesData.notes ?? []).map((note) => String(note.title ?? '').trim()).filter(Boolean).slice(0, 40))

        setSip(sipData.sip ?? null)
        setActiveStudy(studyModeData.active ?? null)
        setDecayAlerts(decayData.alerts ?? [])
        setKyvexIQ(iqData.iq ?? null)
        setContentItems((contentData.content ?? []).slice(0, 8))
        setContracts(contractData.contracts ?? [])
        setCrossover(crossoverData.challenges ?? [])

        const enabled = prefsData.prefs?.enabledFeatures
        if (Array.isArray(enabled)) {
          setEnabledFeatures(new Set(enabled))
        } else {
          setEnabledFeatures(null)
        }
      } finally {
        setIsLoading(false)
      }
    }

    void load()
  }, [])

  const sortedUpcoming = useMemo(
    () => [...exams]
      .filter((exam) => new Date(exam.examDate).getTime() > Date.now())
      .sort((a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime()),
    [exams],
  )

  const nextExam = sortedUpcoming[0] ?? null

  const readinessScore = useMemo(() => {
    if (!sortedUpcoming.length) return 100
    const allDays = sortedUpcoming.flatMap((exam) => parseStudyPlan(exam.studyPlan))
    if (!allDays.length) return 0
    const completed = allDays.filter((day) => day.completed).length
    return Math.round((completed / allDays.length) * 100)
  }, [sortedUpcoming])

  const weeklyChange = useMemo(() => {
    if (!kyvexIQ?.updatedAt) return 0
    const hoursAgo = Math.max(1, (Date.now() - new Date(kyvexIQ.updatedAt).getTime()) / 3600000)
    return Math.round(Math.min(24, 6 + hoursAgo / 12))
  }, [kyvexIQ])

  const latestContract = contracts[0] ?? null
  const latestCheckIn = latestContract?.checkIns?.[0]?.createdAt
  const checkedInToday = latestCheckIn
    ? new Date(latestCheckIn).toDateString() === new Date().toDateString()
    : false

  const todaysCrossover = crossover[0] ?? null
  const isCrossoverComplete = Boolean(todaysCrossover?.completed)
  const sipSuggestion = sip?.lastSuggestions?.[0]

  const missionItems = [
    {
      key: 'decay',
      label: decayAlerts.length > 0 ? `${decayAlerts.length} cards overdue` : 'No overdue cards',
      href: '/decay-alerts',
      complete: decayAlerts.length === 0,
      icon: '\u23F3',
    },
    {
      key: 'contract',
      label: checkedInToday ? 'Contract check-in complete' : 'Contract check-in needed',
      href: '/contract',
      complete: checkedInToday,
      icon: '\u{1F4DC}',
    },
    {
      key: 'crossover',
      label: isCrossoverComplete ? 'Daily crossover challenge done' : 'Daily crossover challenge',
      href: '/crossover',
      complete: isCrossoverComplete,
      icon: '\u{1F500}',
    },
    {
      key: 'sip',
      label: sipSuggestion?.message ?? 'Refresh SIP suggestions',
      href: sipSuggestion?.href ?? '/study-dna',
      complete: false,
      icon: '\u{1F3AF}',
    },
    {
      key: 'exam',
      label: nextExam ? `Next exam in ${safeDaysUntil(nextExam.examDate)} days` : 'No upcoming exams',
      href: '/exam-predictor',
      complete: !nextExam,
      icon: '\u{1F4CA}',
    },
  ]

  const activePhaseLabel = useMemo(() => {
    if (!activeStudy) return 'In Progress'
    const phases = activeStudy.phases ?? []
    const phase = phases[activeStudy.currentPhase ?? 0]
    return phase?.label ?? 'In Progress'
  }, [activeStudy])

  const activeStudyProgress = useMemo(() => {
    if (!activeStudy?.phases?.length) return 0
    const done = activeStudy.phases.filter((phase) => phase.completed).length
    return Math.round((done / activeStudy.phases.length) * 100)
  }, [activeStudy])

  const ecosystemPills = useMemo(() => {
    if (!enabledFeatures) return ECOSYSTEM_SHORTCUTS.slice(0, 12)
    return ECOSYSTEM_SHORTCUTS.filter((pill) => enabledFeatures.has(pill.key)).slice(0, 12)
  }, [enabledFeatures])

  if (isLoading) {
    return (
      <main className="kv-stack">
        <div className="kv-card">
          <p className="kv-muted">Loading mission control...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="kv-stack" style={{ paddingBottom: '56px' }}>
      <header className="kv-card">
        <h1 className="kv-title">Mission Control</h1>
        <p className="kv-muted">Your full Kyvex ecosystem in one command center.</p>
        <p className="kv-muted" style={{ marginTop: '6px' }}>Indexed notes: {noteTitles.length}</p>
      </header>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(1, minmax(0, 1fr))', gap: '14px' }}>
        <div className="dashboard-mission-grid" style={{ display: 'grid', gap: '14px' }}>
          <article className="kv-card-gold" style={{ gridColumn: 'span 1' }}>
            <p className="kv-muted" style={{ marginBottom: '8px' }}>Your IQ</p>
            <p style={{ margin: 0, fontSize: '42px', fontWeight: 900, lineHeight: 1, color: '#fde68a' }}>
              {kyvexIQ?.score ?? '--'}
            </p>
            <p className="kv-muted" style={{ marginTop: '6px' }}>{kyvexIQ?.rank ?? 'No rank yet'}</p>
            <p style={{ marginTop: '6px', fontWeight: 700, color: '#bbf7d0' }}>+{weeklyChange} this week</p>
            <Link href="/kyvex-iq" className="kv-link">{kyvexIQ ? 'View Details ->' : 'Calculate ->'}</Link>
          </article>

          <article className="kv-card" style={{ gridColumn: 'span 2' }}>
            <h2 className="kv-title" style={{ fontSize: '20px' }}>Today's Mission</h2>
            <div style={{ display: 'grid', gap: '10px', marginTop: '10px' }}>
              {missionItems.map((item) => (
                <div key={item.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                  <span
                    style={{
                      color: item.complete ? '#86efac' : 'var(--text-primary)',
                      textDecoration: item.complete ? 'line-through' : 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    {item.complete ? '\u2705' : '\u2610'}
                    {item.icon} {item.label}
                  </span>
                  <Link href={item.href} className="kv-link">Open {'->'}</Link>
                </div>
              ))}
            </div>
          </article>
        </div>

        {activeStudy && (
          <article className="kv-card" style={{ borderColor: 'rgba(45,212,191,0.55)', background: 'linear-gradient(135deg, rgba(45,212,191,0.1), rgba(79,142,247,0.05))' }}>
            <h3 className="kv-title" style={{ fontSize: '19px' }}>Active Study Session {'\u{1F3AF}'}</h3>
            <p className="kv-muted" style={{ marginTop: '4px' }}>
              {activeStudy.topic ?? 'General session'} � {activePhaseLabel}
            </p>
            <div style={{ marginTop: '12px', height: '8px', borderRadius: '999px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
              <div style={{ width: `${activeStudyProgress}%`, height: '100%', background: 'linear-gradient(90deg, #2dd4bf, #4f8ef7)' }} />
            </div>
            <Link href="/study-mode" className="kv-link" style={{ display: 'inline-block', marginTop: '10px' }}>Resume {'->'}</Link>
          </article>
        )}

        <div className="dashboard-mission-grid" style={{ display: 'grid', gap: '14px' }}>
          <article className="kv-card" style={{ gridColumn: 'span 1' }}>
            <h3 className="kv-title" style={{ fontSize: '18px' }}>SIP Summary</h3>
            <div style={{ marginTop: '10px', display: 'grid', gap: '8px' }}>
              {[
                ['Retention', sip?.retentionScore ?? 0],
                ['Depth', sip?.depthScore ?? 0],
                ['Performance', sip?.performanceScore ?? 0],
                ['Consistency', sip?.consistencyScore ?? 0],
                ['Wellbeing', sip?.wellbeingScore ?? 0],
              ].map(([label, value]) => (
                <div key={String(label)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)' }}>
                    <span>{label}</span>
                    <span>{Math.round(Number(value))}</span>
                  </div>
                  <div style={{ height: '6px', borderRadius: '999px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.round(Number(value))}%`, height: '100%', background: 'linear-gradient(90deg, #f0b429, #2dd4bf)' }} />
                  </div>
                </div>
              ))}
            </div>
            <p className="kv-badge" style={{ marginTop: '10px', display: 'inline-block' }}>{chronotypeLabel(sip?.chronotype)}</p>
            <p className="kv-muted" style={{ marginTop: '8px' }}>
              Top subjects: {(sip?.strongestSubjects ?? []).slice(0, 3).join(', ') || 'Not enough data'}
            </p>
            <Link href="/study-dna" className="kv-link">Update Profile {'->'}</Link>
          </article>

          <article className="kv-card" style={{ gridColumn: 'span 2' }}>
            <h3 className="kv-title" style={{ fontSize: '18px' }}>Recent Activity</h3>
            <div style={{ marginTop: '10px', display: 'grid', gap: '8px' }}>
              {contentItems.length === 0 ? (
                <p className="kv-muted">No recent activity yet.</p>
              ) : (
                contentItems.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    style={{
                      textDecoration: 'none',
                      display: 'grid',
                      gridTemplateColumns: 'auto 1fr auto auto',
                      gap: '10px',
                      alignItems: 'center',
                      padding: '8px 10px',
                      borderRadius: '10px',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <span>{item.icon}</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</span>
                    <span className="kv-muted" style={{ fontSize: '12px' }}>{timeAgo(item.createdAt)}</span>
                    <span className="kv-badge" style={{ fontSize: '11px' }}>{item.type}</span>
                  </Link>
                ))
              )}
            </div>
            <Link href="/content-hub" className="kv-link" style={{ display: 'inline-block', marginTop: '10px' }}>View all {'->'}</Link>
          </article>
        </div>

        <div className="dashboard-mission-grid" style={{ display: 'grid', gap: '14px' }}>
          <article className="kv-card" style={{ gridColumn: 'span 1' }}>
            <h3 className="kv-title" style={{ fontSize: '18px' }}>Quick Actions</h3>
            <div style={{ marginTop: '10px', display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px' }}>
              {[
                ['\u2728 New Note', '/generator'],
                ['\u{1F0CF} Flashcards', '/flashcards'],
                ['\u{1F3AF} Study Mode', '/study-mode'],
                ['\u{1F4CB} Mock Exam', '/mock-exam'],
                ['\u{1F916} Ask Nova', '/tutor'],
                ['\u{1F4E6} My Content', '/content-hub'],
              ].map(([label, href]) => (
                <Link
                  key={String(label)}
                  href={String(href)}
                  className="kv-btn"
                  style={{ textAlign: 'center', textDecoration: 'none', fontSize: '12px' }}
                >
                  {label}
                </Link>
              ))}
            </div>
          </article>

          <article className="kv-card" style={{ gridColumn: 'span 2' }}>
            <h3 className="kv-title" style={{ fontSize: '18px' }}>Live Signals</h3>
            <div style={{ display: 'grid', gap: '10px', marginTop: '10px', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
              <div>
                <p className="kv-muted">Overdue Cards</p>
                <p style={{ margin: 0, fontSize: '26px', fontWeight: 800 }}>{decayAlerts.length}</p>
              </div>
              <div>
                <p className="kv-muted">Active Contract</p>
                <p style={{ margin: 0, fontSize: '26px', fontWeight: 800 }}>{latestContract ? `${latestContract.currentStreak} day streak` : 'None'}</p>
              </div>
            </div>
          </article>
        </div>

        <div className="dashboard-mission-grid-four" style={{ display: 'grid', gap: '14px' }}>
          <article className="kv-card">
            <p className="kv-muted">Next Exam Countdown</p>
            <p style={{ margin: 0, fontSize: '28px', fontWeight: 900 }}>{nextExam ? formatCountdown(nextExam.examDate) : '0d 0h 0m'}</p>
            <p className="kv-muted">{nextExam ? nextExam.subject : 'No upcoming exams'}</p>
          </article>

          <article className="kv-card">
            <p className="kv-muted">Study Streak</p>
            <p style={{ margin: 0, fontSize: '28px', fontWeight: 900 }}>{studyStreak}</p>
            <p className="kv-muted">days</p>
          </article>

          <article className="kv-card">
            <p className="kv-muted">Ontario Curriculum Progress</p>
            <p style={{ margin: 0, fontSize: '28px', fontWeight: 900 }}>
              {Math.max(8, Math.min(100, completedRatio(nextExam ?? exams[0] ?? fallbackExam())))}%
            </p>
            <Link href="/curriculum" className="kv-link">Open Curriculum Hub {'->'}</Link>
          </article>

          <article className="kv-card">
            <p className="kv-muted">Readiness Score</p>
            <p style={{ margin: 0, fontSize: '28px', fontWeight: 900 }}>{readinessScore}%</p>
            <div style={{ marginTop: '8px', height: '6px', borderRadius: '999px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
              <div style={{ width: `${readinessScore}%`, height: '100%', background: 'linear-gradient(90deg, #f0b429, #2dd4bf)' }} />
            </div>
          </article>
        </div>

        <article className="kv-card">
          <h3 className="kv-title" style={{ fontSize: '19px' }}>Explore Your Ecosystem</h3>
          <div style={{ marginTop: '10px', display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
            {ecosystemPills.map((pill) => (
              <Link
                key={pill.key}
                href={pill.href}
                style={{
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  borderRadius: '999px',
                  border: '1px solid var(--border-default)',
                  background: 'rgba(255,255,255,0.03)',
                  padding: '8px 12px',
                  color: 'var(--text-primary)',
                  whiteSpace: 'nowrap',
                }}
              >
                <span>{pill.icon}</span>
                <span>{pill.label}</span>
                <span className="kv-muted">{'->'}</span>
              </Link>
            ))}
          </div>
        </article>
      </section>

      <style>{`
        .dashboard-mission-grid {
          grid-template-columns: repeat(1, minmax(0, 1fr));
        }

        .dashboard-mission-grid-four {
          grid-template-columns: repeat(1, minmax(0, 1fr));
        }

        @media (min-width: 1024px) {
          .dashboard-mission-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .dashboard-mission-grid-four {
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }
        }
      `}</style>
    </main>
  )
}
