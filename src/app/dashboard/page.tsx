'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '~/app/_components/toast'
import { RecordResultModal } from '@/components/RecordResultModal'
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
  const [isScanningNotes, setIsScanningNotes] = useState(false)
  const [scanConfidence, setScanConfidence] = useState<number | null>(null)

  const [subject, setSubject] = useState('')
  const [examDate, setExamDate] = useState('')
  const [board, setBoard] = useState('')
  const [difficulty, setDifficulty] = useState('Medium')
  const [topics, setTopics] = useState('')
  const [selectedExamForResult, setSelectedExamForResult] = useState<{
    id: string
    subject: string
    examDate: string
    board: string | null
  } | null>(null)
  const scanFileInputRef = useRef<HTMLInputElement>(null)

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

  const openScanPicker = () => {
    scanFileInputRef.current?.click()
  }

  const handleScanFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    if (!file.type.startsWith('image/')) {
      showToast('Please select an image for handwritten scanning', 'error')
      return
    }

    setIsScanningNotes(true)
    setScanConfidence(null)

    try {
      const formData = new FormData()
      formData.append('image', file)

      const response = await fetch('/api/scan-handwritten', {
        method: 'POST',
        body: formData,
      })

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

      if (typeof data.confidence === 'number') {
        setScanConfidence(data.confidence)
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

  const baseCardStyle: React.CSSProperties = {
    background: '#0d1424',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '16px',
    padding: '24px',
    transition: 'all 0.2s ease',
  }

  const applyCardHover = (event: React.MouseEvent<HTMLDivElement>) => {
    event.currentTarget.style.borderColor = 'rgba(240,180,41,0.2)'
    event.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.3)'
  }

  const clearCardHover = (event: React.MouseEvent<HTMLDivElement>) => {
    event.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'
    event.currentTarget.style.boxShadow = 'none'
  }

  const inputStyle: React.CSSProperties = {
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.07)',
    background: '#12192e',
    color: '#e8eaf6',
    padding: '10px 12px',
    fontSize: '13px',
    width: '100%',
    fontFamily: 'inherit',
  }

  return (
    <main className="kv-animate-in" style={{ minHeight: '100vh', background: '#050810', color: '#e8eaf6' }}>
      <style>{`
        @keyframes dashboard-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>

      <div style={{ maxWidth: '1280px', margin: '0 auto', marginBottom: '100px', padding: '32px 24px 72px' }}>
        <h1 style={{
          fontSize: '22px',
          fontWeight: 900,
          letterSpacing: '-0.025em',
          color: '#e8eaf6',
          marginBottom: '4px',
        }}>
          Exam Countdown Dashboard
        </h1>
        <p style={{ fontSize: '13px', color: '#8892b0', marginBottom: '28px' }}>
          Track every upcoming exam, pressure level, and AI-generated day-by-day preparation plan.
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '18px' }}>
          <Link
            href="/my-notes"
            style={{
              textDecoration: 'none',
              borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.07)',
              background: '#12192e',
              color: '#e8eaf6',
              padding: '10px 14px',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            Open My Notes
          </Link>
          <button
            type="button"
            onClick={openScanPicker}
            disabled={isScanningNotes}
            style={{
              borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.07)',
              background: '#12192e',
              color: '#e8eaf6',
              padding: '10px 14px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: isScanningNotes ? 'not-allowed' : 'pointer',
              opacity: isScanningNotes ? 0.7 : 1,
              fontFamily: 'inherit',
            }}
          >
            {isScanningNotes ? 'Scanning...' : 'Scan Handwritten Notes'}
          </button>
        </div>

        <input
          ref={scanFileInputRef}
          type="file"
          accept="image/png,image/jpeg,.jpg,.jpeg"
          style={{ display: 'none' }}
          onChange={(event) => {
            void handleScanFile(event)
          }}
        />

        {scanConfidence !== null && (
          <div style={{
            marginBottom: '16px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            borderRadius: '10px',
            border: '1px solid rgba(79,142,247,0.45)',
            background: 'rgba(79,142,247,0.15)',
            padding: '8px 12px',
            fontSize: '12px',
            fontWeight: 700,
            color: '#93c5fd',
          }}>
            Latest handwritten scan confidence: {scanConfidence}%
          </div>
        )}

        <div style={{
          marginBottom: '24px',
          display: 'grid',
          gap: '12px',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        }}>
          <div
            className="kv-card-hover"
            onMouseEnter={applyCardHover}
            onMouseLeave={clearCardHover}
            style={{
              background: '#0d1424',
              border: '1px solid rgba(255,255,255,0.07)',
              borderLeft: '3px solid #f0b429',
              borderRadius: '16px',
              padding: '20px 24px',
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
              Next Exam Countdown
            </p>
            {nextExam ? (
              <>
                <p style={{ fontSize: '14px', fontWeight: 700, color: '#8892b0', marginBottom: '6px' }}>
                  {subjectIcon(nextExam.subject)} {nextExam.subject}
                </p>
                <p className="kv-bounce-in" style={{ fontSize: '28px', fontWeight: 900, letterSpacing: '-0.03em', color: '#e8eaf6' }}>
                  {formatCountdown(nextExam.examDate)}
                </p>
                <p style={{ fontSize: '12px', color: '#8892b0', marginTop: '4px' }}>
                  {new Date(nextExam.examDate).toLocaleString()}
                </p>
              </>
            ) : (
              <>
                <p className="kv-bounce-in" style={{ fontSize: '28px', fontWeight: 900, letterSpacing: '-0.03em', color: '#e8eaf6' }}>
                  0 days
                </p>
                <p style={{ fontSize: '12px', color: '#8892b0', marginTop: '4px' }}>
                  No upcoming exams yet.
                </p>
              </>
            )}
          </div>

          <div
            className="kv-card-hover"
            onMouseEnter={applyCardHover}
            onMouseLeave={clearCardHover}
            style={{
              background: '#0d1424',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '16px',
              padding: '20px 24px',
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
            <p className="kv-bounce-in" style={{ fontSize: '28px', fontWeight: 900, letterSpacing: '-0.03em', color: '#e8eaf6' }}>
              {totalExamsThisMonth}
            </p>
            <p style={{ fontSize: '12px', color: '#8892b0' }}>scheduled</p>
          </div>

          <div
            className="kv-card-hover"
            onMouseEnter={applyCardHover}
            onMouseLeave={clearCardHover}
            style={{
              background: '#0d1424',
              border: '1px solid rgba(255,255,255,0.07)',
              borderLeft: '3px solid #2dd4bf',
              borderRadius: '16px',
              padding: '20px 24px',
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
            <p className="kv-bounce-in" style={{ fontSize: '28px', fontWeight: 900, letterSpacing: '-0.03em', color: '#e8eaf6' }}>
              {studyStreak}
            </p>
            <p style={{ fontSize: '12px', color: '#8892b0' }}>days</p>
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
              <div style={{ height: '6px', borderRadius: '999px', background: '#12192e', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${readinessScore}%`,
                    borderRadius: '999px',
                    background: 'linear-gradient(90deg, #f0b429, #2dd4bf)',
                    transition: 'width 0.3s ease',
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

        {isLoading ? (
          <Skeleton variant="card" count={3} />
        ) : exams.length === 0 ? (
          <EmptyState
            icon="🚀"
            title="Your dashboard is empty"
            description="Start by creating a note or importing a flashcard deck"
            action={{ label: 'Create your first note', href: '/generator' }}
          />
        ) : (
          <>
            {upcomingExams.length === 0 ? (
              <EmptyState
                icon="📅"
                title="No events scheduled"
                description="Add your exams, assignments, and deadlines"
              />
            ) : (
              <>
                <p style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: '#3d4a6b',
                  marginBottom: '16px',
                }}>
                  Upcoming Exams
                </p>
                <div className="kv-stagger kv-animate-in" style={{ display: 'grid', gap: '20px', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))' }}>
                  {[...upcomingExams]
                    .sort((a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime())
                    .map((exam) => {
                      const days = safeDaysUntil(exam.examDate)
                      const urgencyTier = urgencyFromDays(days)
                      const urgency = urgencyClasses(urgencyTier)
                      const panic = panicData(exam)
                      const planDays = parseStudyPlan(exam.studyPlan)

                      return (
                        <div
                          key={exam.id}
                          className="kv-card-hover kv-animate-in"
                          onMouseEnter={applyCardHover}
                          onMouseLeave={clearCardHover}
                          style={baseCardStyle}
                        >
                          <div style={{ marginBottom: '12px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                            <p style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#e8eaf6' }}>
                              {subjectIcon(exam.subject)} {exam.subject}
                            </p>
                            <span style={{
                              borderRadius: '999px',
                              border: `1px solid ${urgency.badgeBorder}`,
                              background: urgency.badgeBg,
                              padding: '4px 10px',
                              fontSize: '11px',
                              fontWeight: 700,
                              color: urgency.badgeText,
                              animation: urgency.pulse ? 'dashboard-pulse 1.2s ease infinite' : 'none',
                            }}>
                              {urgencyTier.toUpperCase()} URGENCY
                            </span>
                          </div>

                          <p style={{ fontSize: '12px', color: '#8892b0', margin: 0 }}>
                            {new Date(exam.examDate).toLocaleString()} • {exam.board || 'No board'} • {exam.difficulty || 'Medium'}
                          </p>

                          <p style={{
                            marginTop: '14px',
                            marginBottom: '0',
                            fontSize: '34px',
                            fontWeight: 900,
                            letterSpacing: '-0.03em',
                            color: '#e8eaf6',
                            animation: urgency.pulse ? 'dashboard-pulse 1.2s ease infinite' : 'none',
                          }}>
                            {formatCountdown(exam.examDate)}
                          </p>

                          <div style={{ marginTop: '14px' }}>
                            <div style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', color: '#8892b0' }}>
                              <span>Panic meter</span>
                              <span>{urgencyProgress(days)}%</span>
                            </div>
                            <div style={{ height: '8px', borderRadius: '999px', overflow: 'hidden', background: '#12192e' }}>
                              <div style={{ height: '100%', width: `${urgencyProgress(days)}%`, background: urgency.bar }} />
                            </div>
                          </div>

                          <div style={{
                            marginTop: '12px',
                            borderRadius: '12px',
                            border: '1px solid rgba(255,255,255,0.07)',
                            background: '#12192e',
                            padding: '12px',
                            fontSize: '13px',
                          }}>
                            <p style={{ margin: 0, fontWeight: 700, color: panic.tier.color }}>{panic.tier.label}</p>
                            <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#8892b0' }}>
                              Topics: {panic.totalTopics} • Days available: {panic.daysAvailable} • Topics/day needed: {panic.topicsPerDay.toFixed(2)}
                            </p>
                          </div>

                          <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button
                              type="button"
                              onClick={() => {
                                void generateStudyPlan(exam.id)
                              }}
                              disabled={generatingExamId === exam.id}
                              style={{
                                borderRadius: '10px',
                                border: 'none',
                                background: '#4f8ef7',
                                color: '#050810',
                                fontWeight: 700,
                                fontSize: '12px',
                                padding: '9px 12px',
                                cursor: generatingExamId === exam.id ? 'not-allowed' : 'pointer',
                                opacity: generatingExamId === exam.id ? 0.75 : 1,
                                fontFamily: 'inherit',
                              }}
                            >
                              {generatingExamId === exam.id ? 'Generating...' : 'Generate Study Plan'}
                            </button>
                          </div>

                          {planDays.length > 0 && (
                            <div style={{ marginTop: '16px' }}>
                              <p style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: 700, color: '#e8eaf6' }}>Study Timeline</p>
                              <div style={{ display: 'grid', gap: '8px' }}>
                                {planDays.map((day, index) => {
                                  const completed = Boolean(day.completed)
                                  const today = isTodayLabel(day.date)

                                  let dayBg = '#12192e'
                                  let dayBorder = 'rgba(255,255,255,0.07)'
                                  if (completed) {
                                    dayBg = 'rgba(16,185,129,0.12)'
                                    dayBorder = 'rgba(16,185,129,0.4)'
                                  } else if (today) {
                                    dayBg = 'rgba(79,142,247,0.14)'
                                    dayBorder = 'rgba(79,142,247,0.4)'
                                  }

                                  return (
                                    <div
                                      key={`${exam.id}-${index}`}
                                      style={{ borderRadius: '10px', border: `1px solid ${dayBorder}`, background: dayBg, padding: '12px' }}
                                    >
                                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                        <input
                                          type="checkbox"
                                          checked={completed}
                                          disabled={savingPlanExamId === exam.id}
                                          onChange={() => {
                                            void togglePlanDay(exam, index)
                                          }}
                                          style={{ marginTop: '2px', accentColor: '#2dd4bf' }}
                                        />
                                        <div style={{ minWidth: 0 }}>
                                          <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#e8eaf6' }}>
                                            Day {index + 1} ({day.date}): {day.title}
                                          </p>
                                          {day.tasks.length > 0 && (
                                            <ul style={{ margin: '6px 0 0', paddingLeft: '16px', color: '#8892b0', fontSize: '12px' }}>
                                              {day.tasks.map((task, taskIndex) => (
                                                <li key={`${exam.id}-${index}-${taskIndex}`} style={{ marginBottom: '3px' }}>{task}</li>
                                              ))}
                                            </ul>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                </div>
              </>
            )}

            {pastExams.length > 0 && (
              <div style={{ marginTop: '48px' }}>
                <p style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: '#3d4a6b',
                  marginBottom: '16px',
                }}>
                  Past Exams
                </p>
                {[...pastExams]
                  .sort((a, b) => new Date(b.examDate).getTime() - new Date(a.examDate).getTime())
                  .map((exam) => (
                    <div
                      key={exam.id}
                      onMouseEnter={applyCardHover}
                      onMouseLeave={clearCardHover}
                      style={{
                        ...baseCardStyle,
                        opacity: 0.62,
                        marginBottom: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '16px 20px',
                      }}
                    >
                      <div>
                        <p style={{
                          fontWeight: 600,
                          color: '#8892b0',
                          textDecoration: 'line-through',
                          fontSize: '15px',
                          margin: 0,
                        }}>
                          {exam.subject}
                        </p>
                        <p style={{ fontSize: '12px', color: '#3d4a6b', marginTop: '2px', marginBottom: 0 }}>
                          Completed — {new Date(exam.examDate).toLocaleDateString('en-CA', {
                            month: 'short', day: 'numeric', year: 'numeric',
                          })}
                        </p>
                        {exam.board && (
                          <p style={{ fontSize: '11px', color: '#3d4a6b', marginTop: '2px', marginBottom: 0 }}>{exam.board}</p>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {!exam.resultRecorded ? (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedExamForResult({
                                id: exam.id,
                                subject: exam.subject,
                                examDate: exam.examDate,
                                board: exam.board,
                              })
                            }}
                            style={{
                              border: '1px solid #4f8ef7',
                              borderRadius: '8px',
                              background: 'transparent',
                              color: '#4f8ef7',
                              padding: '6px 10px',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              fontFamily: 'inherit',
                            }}
                          >
                            Record Result
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              void router.push('/results')
                            }}
                            style={{
                              border: 'none',
                              borderRadius: '20px',
                              background: getGradeColor(exam.scorePercent ?? 0),
                              color: '#e8eaf6',
                              padding: '6px 10px',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              fontFamily: 'inherit',
                            }}
                          >
                            {percentToLetter(exam.scorePercent ?? 0)} {(exam.scorePercent ?? 0).toFixed(1)}%
                          </button>
                        )}
                        <button
                          onClick={() => {
                            void handleDeleteExam(exam.id)
                          }}
                          style={{
                            border: '1px solid rgba(239,68,68,0.35)',
                            background: 'rgba(239,68,68,0.1)',
                            color: '#ef4444',
                            borderRadius: '8px',
                            padding: '6px 10px',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </>
        )}
      </div>

      {selectedExamForResult && (
        <RecordResultModal
          exam={selectedExamForResult}
          onClose={() => {
            setSelectedExamForResult(null)
          }}
          onSuccess={() => {
            setSelectedExamForResult(null)
            trackNovaEvent('EXAM_RESULT_SAVED')
            void fetchExams()
          }}
        />
      )}
    </main>
  )
}
