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
    <main className="kv-page" style={{ minHeight: '100vh', background: '#050810', color: '#e8eaf6' }}>
      <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '64px 24px' }}>
        <h1 style={{ margin: 0, fontSize: '2.5rem', color: '#f0b429' }}>Dashboard temporarily unavailable</h1>
        <p style={{ marginTop: '16px', color: '#cbd5e1' }}>
          The dashboard page is being repaired. Please check back shortly.
        </p>
      </div>
    </main>
  )
}
