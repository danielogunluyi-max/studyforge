'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '~/app/_components/toast'
import { getGradeColor, percentToLetter } from '@/lib/gradeUtils'
import { trackNovaEvent } from '@/lib/novaClient'
import LoadingButton from '@/app/_components/loading-button'
import Skeleton from '@/app/_components/skeleton'
import EmptyState from '@/app/_components/empty-state'

type Exam = {
  id: string
  subject: string
  examDate: string
  board: string | null
  difficulty: string | null
  topics: string | null
  studyPlan: string | null
  resultRecorded: boolean
  scorePercent: number | null
  gradeKU: number | null
  gradeThinking: number | null
  gradeComm: number | null
  gradeApp: number | null
  resultNotes: string | null
  resultRecordedAt: string | null
  createdAt: string
}

type StudyPlanDay = {
  date: string
  title: string
  tasks: string[]
  completed?: boolean
}

type NotesResponse = {
  notes?: Array<{ title?: string }>
}

type PreferencesResponse = {
  studyStreak?: number
}

type UrgencyTier = 'green' | 'yellow' | 'orange' | 'red'

type PanicTier = {
  label: string
  color: string
}

const DIFFICULTY_OPTIONS = ['Easy', 'Medium', 'Hard']

function safeDaysUntil(examDate: string): number {
  const target = new Date(examDate).getTime()
  const diff = target - Date.now()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

function countdownParts(examDate: string) {
  const target = new Date(examDate).getTime()
  const diff = Math.max(0, target - Date.now())

  const totalMinutes = Math.floor(diff / (1000 * 60))
  const minutes = totalMinutes % 60
  const totalHours = Math.floor(totalMinutes / 60)
  const hours = totalHours % 24
  const days = Math.floor(totalHours / 24)

  return { days, hours, minutes }
}

function formatCountdown(examDate: string) {
  const { days, hours, minutes } = countdownParts(examDate)
  return `${days} days ${hours} hours ${minutes} minutes`
}

function urgencyFromDays(days: number): UrgencyTier {
  if (days >= 30) return 'green'
  if (days >= 14) return 'yellow'
  if (days >= 7) return 'orange'
  return 'red'
}

function urgencyClasses(tier: UrgencyTier) {
  if (tier === 'green') {
    return {
      badgeBorder: 'rgba(16,185,129,0.45)',
      badgeBg: 'rgba(16,185,129,0.12)',
      badgeText: '#34d399',
      text: '#34d399',
      bar: '#10b981',
      pulse: false,
    }
  }

  if (tier === 'yellow') {
    return {
      badgeBorder: 'rgba(245,158,11,0.45)',
      badgeBg: 'rgba(245,158,11,0.12)',
      badgeText: '#fbbf24',
      text: '#fbbf24',
      bar: '#f59e0b',
      pulse: false,
    }
  }

  if (tier === 'orange') {
    return {
      badgeBorder: 'rgba(249,115,22,0.45)',
      badgeBg: 'rgba(249,115,22,0.12)',
      badgeText: '#fb923c',
      text: '#fb923c',
      bar: '#f97316',
      pulse: true,
    }
  }

  return {
    badgeBorder: 'rgba(239,68,68,0.45)',
    badgeBg: 'rgba(239,68,68,0.12)',
    badgeText: '#f87171',
    text: '#f87171',
    bar: '#ef4444',
    pulse: true,
  }
}

function urgencyProgress(days: number) {
  if (days >= 30) return 20
  if (days >= 14) return 45
  if (days >= 7) return 72
  return 92
}

function parseTopics(topics: string | null): string[] {
  return (topics ?? '')
    .split(',')
    .map((topic) => topic.trim())
    .filter(Boolean)
}

function panicData(exam: Exam): { totalTopics: number; daysAvailable: number; topicsPerDay: number; tier: PanicTier } {
  const totalTopics = parseTopics(exam.topics).length
  const daysAvailable = Math.max(1, safeDaysUntil(exam.examDate))
  const topicsPerDay = totalTopics === 0 ? 0 : totalTopics / daysAvailable

  if (topicsPerDay > 3) {
    return {
      totalTopics,
      daysAvailable,
      topicsPerDay,
      tier: { label: 'High pressure', color: '#ef4444' },
    }
  }

  if (topicsPerDay >= 1) {
    return {
      totalTopics,
      daysAvailable,
      topicsPerDay,
      tier: { label: 'Manageable', color: '#f59e0b' },
    }
  }

  return {
    totalTopics,
    daysAvailable,
    topicsPerDay,
    tier: { label: 'Well prepared', color: '#10b981' },
  }
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

function isTodayLabel(label: string) {
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' }).toLowerCase()
  return label.toLowerCase().includes(today)
}

function subjectIcon(subject: string) {
  const s = subject.toLowerCase()
  if (s.includes('math') || s.includes('algebra') || s.includes('calculus')) return '📐'
  if (s.includes('bio')) return '🧬'
  if (s.includes('chem')) return '⚗️'
  if (s.includes('phys')) return '🧲'
  if (s.includes('history')) return '🏛️'
  if (s.includes('english') || s.includes('literature')) return '📚'
  if (s.includes('computer') || s.includes('coding')) return '💻'
  return '📝'
}

export default function DashboardPage() {
  const router = useRouter()
  const [exams, setExams] = useState<Exam[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [generatingExamId, setGeneratingExamId] = useState('')
  const [savingPlanExamId, setSavingPlanExamId] = useState('')
  const [studyStreak, setStudyStreak] = useState(0)
  const [clockTick, setClockTick] = useState(0)
  const [noteTitles, setNoteTitles] = useState<string[]>([])

  const [subject, setSubject] = useState('')
  const [examDate, setExamDate] = useState('')
  const [board, setBoard] = useState('')
  const [difficulty, setDifficulty] = useState('Medium')
  const [topics, setTopics] = useState('')

  const { showToast } = useToast()

  const fetchExams = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/exams')
      const data = (await response.json()) as { exams?: Exam[]; error?: string }
      if (!response.ok) {
        showToast(data.error ?? 'Failed to load exams', 'error')
        return
      }
      setExams(data.exams ?? [])
    } catch {
      showToast('Failed to load exams', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void fetchExams()

    void (async () => {
      const response = await fetch('/api/user/preferences')
      const data = (await response.json().catch(() => ({}))) as PreferencesResponse
      if (response.ok) {
        setStudyStreak(data.studyStreak ?? 0)
      }
    })()

    void (async () => {
      const response = await fetch('/api/notes?limit=100')
      const data = (await response.json().catch(() => ({}))) as NotesResponse
      if (!response.ok) return
      const titles = (data.notes ?? []).map((note) => String(note.title ?? '').trim()).filter(Boolean)
      setNoteTitles(titles.slice(0, 40))
    })()
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setClockTick((value) => value + 1)
    }, 60_000)

    return () => window.clearInterval(timer)
  }, [])

  const { upcomingExams, pastExams } = useMemo(() => {
    void clockTick
    const now = new Date()
    const nowMs = now.getTime()
    return {
      upcomingExams: exams.filter((e) => new Date(e.examDate).getTime() > nowMs),
      pastExams: exams.filter((e) => new Date(e.examDate).getTime() <= nowMs),
    }
  }, [clockTick, exams])

  const sortedUpcoming = useMemo(
    () => [...upcomingExams].sort((a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime()),
    [upcomingExams],
  )

  const nextExam = sortedUpcoming[0] ?? null

  const totalExamsThisMonth = useMemo(() => {
    const now = new Date()
    const month = now.getMonth()
    const year = now.getFullYear()

    return upcomingExams.filter((exam) => {
      const date = new Date(exam.examDate)
      return date.getMonth() === month && date.getFullYear() === year
    }).length
  }, [upcomingExams])

  const readinessScore = useMemo(() => {
    if (!upcomingExams.length) return 100

    const allDays = upcomingExams.flatMap((exam) => parseStudyPlan(exam.studyPlan))
    if (!allDays.length) return 0

    const completed = allDays.filter((day) => day.completed).length
    return Math.round((completed / allDays.length) * 100)
  }, [upcomingExams])

  const handleDeleteExam = async (examId: string) => {
    try {
      const response = await fetch(`/api/exams/${examId}`, { method: 'DELETE' })
      const data = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) {
        showToast(data.error ?? 'Failed to delete exam', 'error')
        return
      }

      setExams((prev) => prev.filter((exam) => exam.id !== examId))
      showToast('Exam deleted', 'success')
    } catch {
      showToast('Failed to delete exam', 'error')
    }
  }

  const createExam = async () => {
    if (!subject.trim() || !examDate) {
      showToast('Subject and exam date/time are required', 'error')
      return
    }

    setIsSaving(true)

    try {
      const response = await fetch('/api/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: subject.trim(),
          examDate,
          board,
          difficulty,
          topics,
        }),
      })

      const data = (await response.json()) as { exam?: Exam; error?: string }
      if (!response.ok || !data.exam) {
        showToast(data.error ?? 'Failed to create exam', 'error')
        return
      }

      setSubject('')
      setExamDate('')
      setBoard('')
      setDifficulty('Medium')
      setTopics('')
      showToast('Exam added', 'success')
      await fetchExams()
    } catch {
      showToast('Failed to create exam', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const generateStudyPlan = async (examId: string) => {
    setGeneratingExamId(examId)

    try {
      const response = await fetch(`/api/exams/${examId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          generatePlan: true,
          noteTitles,
        }),
      })

      const data = (await response.json()) as { error?: string }
      if (!response.ok) {
        showToast(data.error ?? 'Failed to generate plan', 'error')
        return
      }

      showToast('Study plan generated', 'success')
      await fetchExams()
    } catch {
      showToast('Failed to generate plan', 'error')
    } finally {
      setGeneratingExamId('')
    }
  }

  const togglePlanDay = async (exam: Exam, dayIndex: number) => {
    const current = parseStudyPlan(exam.studyPlan)
    if (!current[dayIndex]) return

    const nextDays = current.map((day, index) =>
      index === dayIndex ? { ...day, completed: !day.completed } : day,
    )

    setSavingPlanExamId(exam.id)

    try {
      const response = await fetch(`/api/exams/${exam.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days: nextDays }),
      })

      const data = (await response.json()) as { error?: string }
      if (!response.ok) {
        showToast(data.error ?? 'Failed to update day', 'error')
        return
      }

      setExams((prev) =>
        prev.map((item) =>
          item.id === exam.id ? { ...item, studyPlan: JSON.stringify({ days: nextDays }) } : item,
        ),
      )
    } catch {
      showToast('Failed to update day', 'error')
    } finally {
      setSavingPlanExamId('')
    }
  }

  const baseCardStyle: React.CSSProperties = {
    background: 'linear-gradient(165deg, rgba(18,25,46,0.86), rgba(13,20,36,0.88))',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '18px',
    padding: '24px',
    boxShadow: '0 10px 30px rgba(3,8,20,0.35)',
    backdropFilter: 'blur(8px)',
    transition: 'all 0.2s ease',
  }

  const applyCardHover = (event: React.MouseEvent<HTMLDivElement>) => {
    event.currentTarget.style.borderColor = 'rgba(240,180,41,0.2)'
    event.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.3)'
  }

  const clearCardHover = (event: React.MouseEvent<HTMLDivElement>) => {
    event.currentTarget.style.borderColor = ''
    event.currentTarget.style.boxShadow = ''
  }

  const inputStyle: React.CSSProperties = {
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.07)',
    background: '#12192e',
    color: '#e8eaf6',
    padding: '11px 13px',
    fontSize: '14px',
    width: '100%',
    fontFamily: 'inherit',
  }

  return (
    <main
      className="kv-animate-in"
      style={{
        minHeight: '100vh',
        background: [
          'radial-gradient(1200px 520px at -15% -10%, rgba(45,212,191,0.12), transparent 60%)',
          'radial-gradient(900px 440px at 115% 0%, rgba(240,180,41,0.12), transparent 60%)',
          '#050810',
        ].join(', '),
        color: '#e8eaf6',
      }}
    >
      <style>{`
        @keyframes dashboard-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        @keyframes float {
          0%,100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes count-up {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .count-up-number { animation: count-up 0.4s ease both; }
      `}</style>

      <div style={{ maxWidth: '1280px', margin: '0 auto', marginBottom: '100px', padding: '36px 24px 80px' }}>
        {/* Nova greeting */}
        {(() => {
          const hour = new Date().getHours()
          const greeting = hour < 12 ? '☀️ Good morning'
            : hour < 17 ? '⚡ Good afternoon'
            : '🌙 Good evening'
          return (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              marginBottom: '24px',
            }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #f0b429, #2dd4bf)',
                display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: '20px',
                boxShadow: '0 0 16px rgba(240,180,41,0.4)',
                animation: 'float 3s ease-in-out infinite',
                flexShrink: 0,
              }}>
                🤖
              </div>
              <div>
                <p style={{ fontSize: '13px', color: '#f0b429', fontWeight: 700, margin: 0 }}>
                  Nova says:
                </p>
                <p style={{ fontSize: '15px', color: '#e8eaf6', fontWeight: 600, margin: 0 }}>
                  {greeting}, Daniel. Ready to get smarter today?
                </p>
              </div>
            </div>
          )
        })()}

        <section style={{ marginBottom: '24px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            borderRadius: '999px',
            border: '1px solid rgba(45,212,191,0.35)',
            background: 'rgba(45,212,191,0.1)',
            color: '#5eead4',
            padding: '6px 12px',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.07em',
            textTransform: 'uppercase',
            marginBottom: '12px',
          }}>
            Study Command Center
          </div>

          <h1 className="kv-heading-page" style={{
            fontSize: 'clamp(28px, 4.4vw, 44px)',
            letterSpacing: '-0.04em',
            fontFamily: '"Space Grotesk", var(--font-inter), sans-serif',
            lineHeight: 1.03,
            marginBottom: '10px',
          }}>
            Build Exam Momentum Every Day
          </h1>
          <p style={{ fontSize: '14px', color: '#9ba7c8', marginBottom: '0', maxWidth: '760px', lineHeight: 1.55 }}>
            Own the timeline: track countdown pressure, turn topics into daily execution plans, and keep your study streak alive with less friction.
          </p>
        </section>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
          <Link
            href="/my-notes"
            style={{
              textDecoration: 'none',
              borderRadius: '12px',
              border: '1px solid rgba(79,142,247,0.42)',
              background: 'rgba(79,142,247,0.14)',
              color: '#bfdbfe',
              padding: '10px 14px',
              fontSize: '12px',
              fontWeight: 700,
            }}
          >
            Open My Notes
          </Link>
        </div>

        <div className="kv-card-hover" onMouseEnter={applyCardHover} onMouseLeave={clearCardHover} style={{
              background: 'linear-gradient(165deg, rgba(16,24,40,0.92), rgba(10,14,26,0.86))',
              border: '1px solid rgba(240,180,41,0.18)',
              borderLeft: '3px solid #f0b429',
              borderRadius: '18px',
              padding: '22px 24px',
              boxShadow: '0 12px 32px rgba(4,8,18,0.35)',
              transition: 'all 0.2s ease',
            }}
          >
            <p style={{
              fontSize: '11px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.09em',
              color: '#7a88af',
              marginBottom: '10px',
            }}>
              Next Exam Countdown
            </p>
            {nextExam ? (
              <>
                <p style={{ fontSize: '14px', fontWeight: 700, color: '#8892b0', marginBottom: '6px' }}>
                  {subjectIcon(nextExam.subject)} {nextExam.subject}
                </p>
                <p className="count-up-number" style={{ fontSize: '32px', fontWeight: 900, letterSpacing: '-0.04em', color: '#f8fbff' }}>
                  {formatCountdown(nextExam.examDate)}
                </p>
                <p style={{ fontSize: '12px', color: '#8892b0', marginTop: '4px' }}>
                  {new Date(nextExam.examDate).toLocaleString()}
                </p>
              </>
            ) : (
              <>
                <p className="count-up-number" style={{ fontSize: '28px', fontWeight: 900, letterSpacing: '-0.03em', color: '#e8eaf6' }}>
                  0 days
                </p>
                <p style={{ fontSize: '13px', color: '#f0b429', marginTop: '6px' }}>
                  No exams added yet 🎉{' '}
                  <Link href="/calendar" style={{ color: '#f0b429', textDecoration: 'underline', fontWeight: 600 }}>
                    Add your first exam →
                  </Link>
                </p>
              </>
            )}
          </div>

          <div
            className="kv-card-hover"
            onMouseEnter={applyCardHover}
            onMouseLeave={clearCardHover}
            style={{
              background: 'linear-gradient(170deg, rgba(13,20,36,0.92), rgba(18,25,46,0.85))',
              border: '1px solid rgba(45,212,191,0.25)',
              borderLeft: '3px solid #2dd4bf',
              borderRadius: '18px',
              padding: '22px 24px',
              boxShadow: '0 12px 32px rgba(4,8,18,0.3)',
              transition: 'all 0.2s ease',
            }}
          >
            <p style={{
              fontSize: '10px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#3d4a6b',
              marginBottom: '8px',
            }}>
              Exams This Month
            </p>
            <p className="count-up-number" style={{ fontSize: '28px', fontWeight: 900, letterSpacing: '-0.03em', color: '#e8eaf6' }}>
              {totalExamsThisMonth}
            </p>
            <p style={{ fontSize: '12px', color: '#8892b0' }}>scheduled</p>
          </div>

          <div
            className="kv-card-hover"
            onMouseEnter={applyCardHover}
            onMouseLeave={clearCardHover}
            style={{
              background: 'linear-gradient(170deg, rgba(13,20,36,0.92), rgba(18,25,46,0.85))',
              border: '1px solid rgba(139,92,246,0.25)',
              borderLeft: '3px solid #8b5cf6',
              borderRadius: '18px',
              padding: '22px 24px',
              boxShadow: '0 12px 32px rgba(4,8,18,0.35)',
              transition: 'all 0.2s ease',
            }}
          >
            <p style={{
              fontSize: '10px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#3d4a6b',
              marginBottom: '8px',
            }}>
              Study Streak
            </p>
            <p className="count-up-number" style={{ fontSize: '28px', fontWeight: 900, letterSpacing: '-0.03em', color: '#e8eaf6' }}>
              {studyStreak}{studyStreak > 2 ? ' 🔥' : ''}
            </p>
            <p style={{ fontSize: '12px', color: '#8892b0' }}>
              {studyStreak === 1 ? (
                <span style={{ color: '#2dd4bf' }}>Day 1 — the best day to start 🚀</span>
              ) : (
                'days'
              )}
            </p>
          </div>
        </div>

        <div className="kv-card-hover" onMouseEnter={applyCardHover} onMouseLeave={clearCardHover} style={{ ...baseCardStyle, marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap' }}>
            <div>
              <p style={{
                fontSize: '11px',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: '#3d4a6b',
                marginBottom: '8px',
              }}>
                Overall Readiness Score
              </p>
              <p style={{ fontSize: '30px', fontWeight: 900, color: '#f0b429', letterSpacing: '-0.03em' }}>
                {upcomingExams.length === 0 ? 'All caught up!' : `${readinessScore}%`}
              </p>
            </div>
            <div style={{ width: '320px', maxWidth: '100%' }}>
              <div style={{ height: '8px', borderRadius: '999px', background: '#12192e', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${readinessScore}%`,
                    borderRadius: '999px',
                    background: 'linear-gradient(90deg, #f0b429, #2dd4bf)',
                    transition: 'width 0.3s ease',
                    boxShadow: '0 0 8px rgba(240,180,41,0.4)',
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="kv-card-hover" onMouseEnter={applyCardHover} onMouseLeave={clearCardHover} style={{ ...baseCardStyle, marginBottom: '24px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <div>
              <p style={{
                fontSize: '11px',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: '#3d4a6b',
                marginBottom: '8px',
              }}>
                Ontario Curriculum
              </p>
              <p style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#e8eaf6' }}>
                Plan study by official Grade 11 expectations
              </p>
              <p style={{ marginTop: '6px', fontSize: '13px', color: '#8892b0' }}>
                Open course units, track completion, and generate targeted lessons.
              </p>
            </div>
            <Link
              href="/curriculum"
              className="kv-pulse-gold"
              style={{
                textDecoration: 'none',
                background: 'linear-gradient(135deg, #f0b429, #2dd4bf)',
                color: '#050810',
                fontWeight: 700,
                borderRadius: '10px',
                padding: '10px 20px',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(240,180,41,0.3)',
                fontSize: '13px',
              }}
            >
              Open Curriculum Hub
            </Link>
          </div>
        </div>

        <div className="kv-card-hover" onMouseEnter={applyCardHover} onMouseLeave={clearCardHover} style={{ ...baseCardStyle, marginBottom: '28px' }}>
          <p style={{
            fontSize: '11px',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: '#3d4a6b',
            marginBottom: '16px',
          }}>
            Add Upcoming Exam
          </p>
          <div style={{ display: 'grid', gap: '10px', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            <input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Subject name"
              style={inputStyle}
            />
            <input
              value={examDate}
              onChange={(event) => setExamDate(event.target.value)}
              type="datetime-local"
              style={inputStyle}
            />
            <input
              value={board}
              onChange={(event) => setBoard(event.target.value)}
              placeholder="Exam board (APA, IB, Ontario...)"
              style={inputStyle}
            />
            <select
              value={difficulty}
              onChange={(event) => setDifficulty(event.target.value)}
              style={inputStyle}
            >
              {DIFFICULTY_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            <input
              value={topics}
              onChange={(event) => setTopics(event.target.value)}
              placeholder="Topics (comma separated)"
              style={inputStyle}
            />
            <LoadingButton
              loading={isSaving}
              onClick={() => {
                void createExam()
              }}
              type="button"
              fullWidth
            >
              Save Exam
            </LoadingButton>
          </div>
        </div>

      </div>
    </main>
  )
}

