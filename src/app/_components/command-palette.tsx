'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

const ALL_ROUTES = [
  // HOME
  { label: 'Dashboard', href: '/dashboard', icon: '🏠', category: 'Home', keywords: ['home', 'dash', 'main'] },
  { label: 'Content Hub', href: '/content-hub', icon: '📦', category: 'Home', keywords: ['all', 'content', 'hub'] },
  { label: 'Study Mode', href: '/study-mode', icon: '🎯', category: 'Home', keywords: ['focus', 'session', 'study'] },
  { label: 'Smart Search', href: '/search', icon: '🔍', category: 'Home', keywords: ['find', 'search'] },
  // CREATE
  { label: 'Note Generator', href: '/generator', icon: '✨', category: 'Create', keywords: ['ai', 'generate', 'create', 'notes'] },
  { label: 'Smart Upload', href: '/smart-upload', icon: '⚡', category: 'Create', keywords: ['upload', 'file', 'pdf', 'everything'] },
  { label: 'Audio to Notes', href: '/audio', icon: '🎙', category: 'Create', keywords: ['audio', 'voice', 'record', 'transcribe'] },
  { label: 'YouTube Import', href: '/youtube-import', icon: '🎬', category: 'Create', keywords: ['youtube', 'video', 'import'] },
  { label: 'Handwriting Scan', href: '/handwriting', icon: '✍️', category: 'Create', keywords: ['handwriting', 'scan', 'photo'] },
  { label: 'Live Lecture Mode', href: '/lecture', icon: '🎤', category: 'Create', keywords: ['lecture', 'live', 'class', 'record'] },
  { label: 'Classroom Import', href: '/classroom-import', icon: '🎓', category: 'Create', keywords: ['classroom', 'canvas', 'google', 'import'] },
  // STUDY
  { label: 'My Notes', href: '/my-notes', icon: '📝', category: 'Study', keywords: ['notes', 'library', 'folders'] },
  { label: 'Flashcards', href: '/flashcards', icon: '🃏', category: 'Study', keywords: ['cards', 'flash', 'review', 'spaced'] },
  { label: 'Feynman Technique', href: '/feynman', icon: '🔬', category: 'Study', keywords: ['feynman', 'explain', 'teach', 'understand'] },
  { label: 'Micro-Lessons', href: '/micro-lessons', icon: '📖', category: 'Study', keywords: ['micro', 'lesson', 'bite', 'quick'] },
  { label: 'Adaptive Notes', href: '/adaptive-notes', icon: '🎯', category: 'Study', keywords: ['adaptive', 'difficulty', 'levels'] },
  { label: 'Cornell Notes', href: '/cornell', icon: '📋', category: 'Study', keywords: ['cornell', 'format', 'notes'] },
  { label: 'Narrative Memory', href: '/narrative', icon: '📖', category: 'Study', keywords: ['narrative', 'story', 'memory'] },
  { label: 'Compress Notes', href: '/compress', icon: '🗜', category: 'Study', keywords: ['compress', 'summarize', 'shorten'] },
  { label: 'Reading Trainer', href: '/reading-speed', icon: '⚡', category: 'Study', keywords: ['reading', 'speed', 'wpm', 'comprehension'] },
  { label: 'PDF Library', href: '/pdfs', icon: '📄', category: 'Study', keywords: ['pdf', 'document', 'annotate'] },
  // DEEP LEARN
  { label: 'AI Tutor (Nova)', href: '/tutor', icon: '🤖', category: 'Deep Learn', keywords: ['tutor', 'nova', 'chat', 'ai', 'ask'] },
  { label: 'Voice Tutor', href: '/voice-tutor', icon: '🗣', category: 'Deep Learn', keywords: ['voice', 'talk', 'speak', 'tutor'] },
  { label: 'AI Debate', href: '/debate', icon: '⚔️', category: 'Deep Learn', keywords: ['debate', 'argue', 'both sides'] },
  { label: 'Counterargument', href: '/counterargument', icon: '🗡', category: 'Deep Learn', keywords: ['counter', 'attack', 'argument', 'critique'] },
  { label: 'Concept Web', href: '/concept-web', icon: '🕸', category: 'Deep Learn', keywords: ['concept', 'web', 'map', 'connections'] },
  { label: 'Concept Collision', href: '/concept-collision', icon: '💥', category: 'Deep Learn', keywords: ['collision', 'connect', 'subjects', 'cross'] },
  // TEST
  { label: 'Mock Exam', href: '/mock-exam', icon: '📋', category: 'Test', keywords: ['mock', 'exam', 'test', 'practice'] },
  { label: 'Battle Arena', href: '/battle', icon: '⚔️', category: 'Test', keywords: ['battle', 'arena', '1v1', 'pvp'] },
  { label: 'Boss Battle', href: '/games', icon: '🎮', category: 'Test', keywords: ['boss', 'game', 'fight', 'flashcard'] },
  { label: 'Battle Royale', href: '/battle-royale', icon: '👑', category: 'Test', keywords: ['royale', '100', 'multiplayer', 'battle'] },
  { label: 'Debate Judge', href: '/debate-judge', icon: '🧑‍⚖️', category: 'Test', keywords: ['judge', 'debate', '1v1', 'argument'] },
  { label: 'Crossover Challenge', href: '/crossover', icon: '🔀', category: 'Test', keywords: ['crossover', 'challenge', 'daily', 'two subjects'] },
  { label: 'Exam Predictor', href: '/predictor', icon: '📊', category: 'Test', keywords: ['predict', 'score', 'forecast', 'exam'] },
  { label: 'Photo Quiz', href: '/photo-quiz', icon: '📸', category: 'Test', keywords: ['photo', 'image', 'quiz', 'picture'] },
  // TRACK
  { label: 'Mastery Chart', href: '/mastery', icon: '🏆', category: 'Track', keywords: ['mastery', 'chart', 'progress', 'subjects'] },
  { label: 'Kyvex IQ', href: '/kyvex-iq', icon: '🧬', category: 'Track', keywords: ['iq', 'score', 'intelligence', 'kyvex'] },
  { label: 'Study DNA', href: '/study-dna', icon: '🧬', category: 'Track', keywords: ['dna', 'learning style', 'profile', 'how you learn'] },
  { label: 'Exam Autopsy', href: '/autopsy', icon: '🔬', category: 'Track', keywords: ['autopsy', 'exam', 'failed', 'diagnose'] },
  { label: 'Decay Alerts', href: '/decay-alerts', icon: '⏳', category: 'Track', keywords: ['decay', 'forget', 'overdue', 'review'] },
  { label: 'Memory Simulation', href: '/memory-sim', icon: '🧠', category: 'Track', keywords: ['memory', 'simulation', 'retention', 'future'] },
  { label: 'Note Evolution', href: '/note-evolution', icon: '📈', category: 'Track', keywords: ['evolution', 'note', 'growth', 'history'] },
  { label: 'Focus Score', href: '/focus-score', icon: '🎯', category: 'Track', keywords: ['focus', 'score', 'quality', 'session'] },
  // PLAN
  { label: 'AI Planner', href: '/planner', icon: '📅', category: 'Plan', keywords: ['planner', 'weekly', 'schedule', 'plan'] },
  { label: 'Calendar', href: '/calendar', icon: '📆', category: 'Plan', keywords: ['calendar', 'events', 'deadlines', 'timetable'] },
  { label: 'Syllabus Scanner', href: '/syllabus', icon: '📄', category: 'Plan', keywords: ['syllabus', 'semester', 'scan', 'course'] },
  { label: 'Study Contract', href: '/contract', icon: '📜', category: 'Plan', keywords: ['contract', 'commitment', 'accountability', 'habit'] },
  { label: 'Interleaving', href: '/interleave', icon: '🔀', category: 'Plan', keywords: ['interleave', 'mix', 'subjects', 'schedule'] },
  { label: 'Grade Calculator', href: '/grade-calc', icon: '🎯', category: 'Plan', keywords: ['grade', 'final', 'calculate', 'need'] },
  // SOCIAL
  { label: 'Community', href: '/community', icon: '🌍', category: 'Social', keywords: ['community', 'post', 'students', 'social'] },
  { label: 'Study Rooms', href: '/rooms', icon: '🏠', category: 'Social', keywords: ['rooms', 'study', 'together', 'co-study'] },
  { label: 'Peer Review', href: '/peer-review', icon: '🤝', category: 'Social', keywords: ['peer', 'review', 'feedback', 'essay'] },
  { label: 'Study Library', href: '/library', icon: '📚', category: 'Social', keywords: ['library', 'share', 'decks', 'public'] },
  { label: 'Study Buddy', href: '/match', icon: '👥', category: 'Social', keywords: ['buddy', 'match', 'partner', 'find'] },
  // GROW
  { label: 'Achievements', href: '/achievements', icon: '🏆', category: 'Grow', keywords: ['achievements', 'badges', 'unlock', 'rewards'] },
  { label: 'Study Ghost', href: '/study-ghost', icon: '👻', category: 'Grow', keywords: ['ghost', 'past', 'growth', 'history'] },
  { label: 'Kyvex Wrapped', href: '/wrapped', icon: '🎬', category: 'Grow', keywords: ['wrapped', 'stats', 'semester', 'review'] },
  { label: 'Career Path', href: '/career-path', icon: '🗺️', category: 'Grow', keywords: ['career', 'path', 'ontario', 'university'] },
  { label: 'Wellness Check', href: '/wellness', icon: '💚', category: 'Grow', keywords: ['wellness', 'mood', 'burnout', 'mental health'] },
  { label: 'Habits', href: '/habits', icon: '✅', category: 'Grow', keywords: ['habits', 'streak', 'daily', 'routine'] },
  // TOOLS
  { label: 'Diagram Generator', href: '/diagrams', icon: '🗺', category: 'Tools', keywords: ['diagram', 'visual', 'flowchart', 'mindmap'] },
  { label: 'Presentations', href: '/presentation', icon: '📊', category: 'Tools', keywords: ['presentation', 'slides', 'pptx', 'powerpoint'] },
  { label: 'Citations', href: '/citations', icon: '📚', category: 'Tools', keywords: ['citation', 'apa', 'mla', 'chicago', 'reference'] },
  { label: 'Notes to Podcast', href: '/podcast', icon: '🎙', category: 'Tools', keywords: ['podcast', 'audio', 'listen', 'notes'] },
  { label: 'Essay Grader', href: '/essay-grade', icon: '📝', category: 'Tools', keywords: ['essay', 'grade', 'ontario', 'rubric'] },
  { label: 'Grammar Check', href: '/grammar', icon: '✍️', category: 'Tools', keywords: ['grammar', 'spelling', 'style', 'writing'] },
  { label: 'Originality Check', href: '/plagiarism', icon: '🔍', category: 'Tools', keywords: ['originality', 'plagiarism', 'check', 'ai detection'] },
  { label: 'Quizlet Import', href: '/quizlet-import', icon: '📥', category: 'Tools', keywords: ['quizlet', 'import', 'transfer', 'cards'] },
  { label: 'Ontario Curriculum', href: '/curriculum', icon: '🍁', category: 'Tools', keywords: ['ontario', 'curriculum', 'courses', 'gr9', 'gr12'] },
  { label: 'Listen to Notes', href: '/listen', icon: '🔊', category: 'Tools', keywords: ['listen', 'audio', 'tts', 'text to speech'] },
  { label: 'Knowledge Map', href: '/knowledge-map', icon: '🗺', category: 'Tools', keywords: ['map', 'knowledge', 'visual', 'graph', 'connections'] },
  // PERSONAL
  { label: 'Quick Capture', href: '/capture', icon: '⚡', category: 'Personal', keywords: ['capture', 'quick', 'brain dump', 'idea'] },
  { label: 'Features', href: '/features', icon: '⚙️', category: 'Personal', keywords: ['features', 'toggle', 'enable', 'disable'] },
  { label: 'Settings', href: '/settings', icon: '⚙️', category: 'Personal', keywords: ['settings', 'preferences', 'theme', 'account'] },
  { label: 'Referral', href: '/referral', icon: '🎁', category: 'Personal', keywords: ['referral', 'invite', 'friends', 'share'] },
  { label: 'My Results', href: '/results', icon: '📊', category: 'Personal', keywords: ['results', 'grades', 'history', 'scores'] },
]

export default function CommandPalette({ showTrigger = true }: { showTrigger?: boolean }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // Filter routes
  const filtered = query.length < 1
    ? ALL_ROUTES.slice(0, 8)
    : ALL_ROUTES.filter(r => {
        const q = query.toLowerCase()
        return (
          r.label.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q) ||
          r.keywords.some(k => k.includes(q))
        )
      }).slice(0, 10)

  // Keyboard handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(o => !o)
        setQuery('')
        setSelected(0)
      }
      if (!open) return
      if (e.key === 'Escape') { setOpen(false); setQuery('') }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, filtered.length - 1)) }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)) }
      if (e.key === 'Enter') {
        e.preventDefault()
        if (filtered[selected]) {
          router.push(filtered[selected].href)
          setOpen(false)
          setQuery('')
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, filtered, selected, router])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  useEffect(() => { setSelected(0) }, [query])

  // Group filtered results by category
  const grouped = filtered.reduce((acc, route) => {
    if (!acc[route.category]) acc[route.category] = []
    acc[route.category]!.push(route)
    return acc
  }, {} as Record<string, typeof ALL_ROUTES>)

  if (!open) {
    if (!showTrigger) return null
    return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '6px 12px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '8px',
        color: 'var(--text-muted)',
        fontSize: '12px', fontWeight: 500,
        cursor: 'pointer', fontFamily: 'inherit',
        transition: 'all 0.15s ease',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'rgba(240,180,41,0.2)'
        e.currentTarget.style.color = 'var(--text-secondary)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'
        e.currentTarget.style.color = 'var(--text-muted)'
      }}
    >
      <span>🔍</span>
      <span>Search features...</span>
      <span style={{
        padding: '2px 6px', borderRadius: '4px',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        fontSize: '10px', fontWeight: 700,
        letterSpacing: '0.02em',
      }}>
        ⌘K
      </span>
    </button>
  )
  }

  return (
    <>
      <style>{`
        @keyframes palette-in {
          from { opacity: 0; transform: translate(-50%,-48%) scale(0.96); }
          to   { opacity: 1; transform: translate(-50%,-50%) scale(1); }
        }
        @keyframes overlay-in {
          from { opacity: 0; } to { opacity: 1; }
        }
        .palette-item {
          display: flex; align-items: center; gap: 12px;
          padding: 10px 14px; border-radius: 10px;
          cursor: pointer; transition: background 0.1s ease;
          border: 1px solid transparent;
          width: 100%; background: none; text-align: left;
          font-family: inherit;
        }
        .palette-item.selected {
          background: rgba(240,180,41,0.08);
          border-color: rgba(240,180,41,0.2);
        }
        .palette-item:hover {
          background: rgba(255,255,255,0.04);
        }
      `}</style>

      {/* OVERLAY */}
      <div
        onClick={() => { setOpen(false); setQuery('') }}
        style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          background: 'rgba(5,8,16,0.8)',
          backdropFilter: 'blur(4px)',
          animation: 'overlay-in 0.15s ease both',
          pointerEvents: 'auto',
        }}
      />

      {/* PALETTE */}
      <div style={{
        position: 'fixed',
        top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)',
        zIndex: 9999,
        width: '560px', maxWidth: '90vw',
        background: 'rgba(8,13,26,0.98)',
        border: '1px solid rgba(240,180,41,0.15)',
        borderRadius: '20px',
        boxShadow: '0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(240,180,41,0.05)',
        overflow: 'hidden',
        animation: 'palette-in 0.2s ease both',
        pointerEvents: 'auto',
      }}>

        {/* SEARCH INPUT */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <span style={{ fontSize: '18px', flexShrink: 0 }}>🔍</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search features, tools, pages..."
            style={{
              flex: 1, background: 'none', border: 'none',
              outline: 'none', color: 'var(--text-primary)',
              fontSize: '16px', fontFamily: 'inherit',
              fontWeight: 500,
            }}
          />
          <kbd style={{
            padding: '3px 8px', borderRadius: '6px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            fontSize: '11px', color: 'var(--text-muted)',
            fontFamily: 'inherit',
          }}>
            ESC
          </kbd>
        </div>

        {/* RESULTS */}
        <div style={{ maxHeight: '400px', overflowY: 'auto', padding: '8px' }}>
          {filtered.length === 0 && (
            <div style={{ padding: '32px', textAlign: 'center',
              color: 'var(--text-muted)', fontSize: '14px' }}>
              No results for &ldquo;{query}&rdquo;
            </div>
          )}

          {query.length < 1 ? (
            <div>
              <p style={{ fontSize: '10px', fontWeight: 800,
                color: 'var(--text-muted)', textTransform: 'uppercase',
                letterSpacing: '0.08em', padding: '6px 14px 8px' }}>
                Popular
              </p>
              {filtered.map((route, i) => (
                <button
                  key={route.href}
                  type="button"
                  className={`palette-item ${selected === i ? 'selected' : ''}`}
                  onClick={() => { router.push(route.href); setOpen(false); setQuery('') }}
                  onMouseEnter={() => setSelected(i)}
                >
                  <span style={{ fontSize: '18px', width: '28px',
                    textAlign: 'center', flexShrink: 0 }}>
                    {route.icon}
                  </span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '14px', fontWeight: 600,
                      color: 'var(--text-primary)' }}>
                      {route.label}
                    </p>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)',
                    background: 'rgba(255,255,255,0.04)',
                    padding: '2px 8px', borderRadius: '4px',
                    border: '1px solid rgba(255,255,255,0.06)',
                    flexShrink: 0 }}>
                    {route.category}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            Object.entries(grouped).map(([category, routes]) => (
              <div key={category}>
                <p style={{ fontSize: '10px', fontWeight: 800,
                  color: 'var(--text-muted)', textTransform: 'uppercase',
                  letterSpacing: '0.08em', padding: '6px 14px 4px',
                  marginTop: '4px' }}>
                  {category}
                </p>
                {routes.map(route => {
                  const globalIndex = filtered.indexOf(route)
                  return (
                    <button
                      key={route.href}
                      type="button"
                      className={`palette-item ${selected === globalIndex ? 'selected' : ''}`}
                      onClick={() => { router.push(route.href); setOpen(false); setQuery('') }}
                      onMouseEnter={() => setSelected(globalIndex)}
                    >
                      <span style={{ fontSize: '18px', width: '28px',
                        textAlign: 'center', flexShrink: 0 }}>
                        {route.icon}
                      </span>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '14px', fontWeight: 600,
                          color: 'var(--text-primary)' }}>
                          {route.label}
                        </p>
                      </div>
                      {selected === globalIndex && (
                        <kbd style={{
                          padding: '2px 8px', borderRadius: '4px',
                          background: 'rgba(240,180,41,0.1)',
                          border: '1px solid rgba(240,180,41,0.2)',
                          fontSize: '10px', color: '#f0b429',
                          fontFamily: 'inherit', flexShrink: 0,
                        }}>
                          ↵ Enter
                        </kbd>
                      )}
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>

        {/* FOOTER */}
        <div style={{
          padding: '10px 16px',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          display: 'flex', alignItems: 'center', gap: '16px',
        }}>
          {[
            { key: '↑↓', desc: 'navigate' },
            { key: '↵', desc: 'open' },
            { key: 'esc', desc: 'close' },
          ].map(hint => (
            <div key={hint.key} style={{
              display: 'flex', alignItems: 'center', gap: '5px' }}>
              <kbd style={{
                padding: '2px 6px', borderRadius: '4px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                fontSize: '10px', color: 'var(--text-muted)',
                fontFamily: 'inherit',
              }}>
                {hint.key}
              </kbd>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {hint.desc}
              </span>
            </div>
          ))}
          <span style={{ marginLeft: 'auto', fontSize: '11px',
            color: 'var(--text-muted)' }}>
            {filtered.length} result{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </>
  )
}
