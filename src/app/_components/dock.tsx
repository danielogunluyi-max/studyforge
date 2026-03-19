'use client'
import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'

export default function Dock() {
  const { data: session } = useSession()

  // POMODORO STATE
  const [pomSeconds, setPomSeconds] = useState(25 * 60)
  const [pomRunning, setPomRunning] = useState(false)
  const [pomSession, setPomSession] = useState(1)
  const [pomMode, setPomMode] = useState<'work' | 'break'>('work')
  const pomRef = useRef<NodeJS.Timeout | null>(null)

  // AMBIENT STATE
  const [ambientPlaying, setAmbientPlaying] = useState(false)
  const [ambientTrack, setAmbientTrack] = useState('lofi')
  const [ambientVolume, setAmbientVolume] = useState(0.4)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const noiseRef = useRef<AudioBufferSourceNode | null>(null)
  const gainRef = useRef<GainNode | null>(null)

  // EXAM WIDGET STATE
  const [exams, setExams] = useState<Array<{ id: string; subject: string; examDate: string }>>([])
  const [nextExam, setNextExam] = useState<{ id: string; subject: string; examDate: string } | null>(null)

  // FOCUS MODE STATE
  const [focusActive, setFocusActive] = useState(false)

  // EXPANDED PANELS
  const [expanded, setExpanded] = useState<string | null>(null)

  // DOCK VISIBILITY
  const [visible, setVisible] = useState(true)
  const [dockSettings, setDockSettings] = useState({
    showPomodoro: true,
    showAmbient: true,
    showExams: true,
    showFocus: true,
  })

  // Load dock settings from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('kyvex-dock-settings')
      if (saved) setDockSettings(JSON.parse(saved) as typeof dockSettings)
    } catch { /* ignore */ }
  }, [])

  // Load exams
  useEffect(() => {
    if (!session?.user) return
    fetch('/api/exams')
      .then(r => r.json())
      .then((data: { exams?: Array<{ id: string; subject: string; examDate: string }> }) => {
        const upcoming = (data.exams ?? [])
          .filter((e) => new Date(e.examDate).getTime() > Date.now())
          .sort((a, b) =>
            new Date(a.examDate).getTime() - new Date(b.examDate).getTime()
          )
        setExams(upcoming)
        setNextExam(upcoming[0] ?? null)
      })
      .catch(() => { /* ignore */ })
  }, [session])

  // Pomodoro timer
  useEffect(() => {
    if (pomRunning) {
      pomRef.current = setInterval(() => {
        setPomSeconds(s => {
          if (s <= 1) {
            setPomRunning(false)
            if (pomMode === 'work') {
              setPomMode('break')
              setPomSession(n => n + 1)
              return 5 * 60
            } else {
              setPomMode('work')
              return 25 * 60
            }
          }
          return s - 1
        })
      }, 1000)
    } else {
      if (pomRef.current) clearInterval(pomRef.current)
    }
    return () => { if (pomRef.current) clearInterval(pomRef.current) }
  }, [pomRunning, pomMode])

  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

  const pomProgress = pomMode === 'work'
    ? 1 - pomSeconds / (25 * 60)
    : 1 - pomSeconds / (5 * 60)

  const resetPom = () => {
    setPomRunning(false)
    setPomSeconds(25 * 60)
    setPomMode('work')
    setPomSession(1)
  }

  // Ambient audio (Web Audio API)
  const stopAmbient = () => {
    noiseRef.current?.stop()
    noiseRef.current?.disconnect()
    noiseRef.current = null
    setAmbientPlaying(false)
  }

  const playAmbientRef = useRef<() => void>(() => { /* noop */ })

  playAmbientRef.current = () => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext()
      }
      const ctx = audioCtxRef.current
      const bufferSize = ctx.sampleRate * 3
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
      const data = buffer.getChannelData(0)

      const tracks: Record<string, () => void> = {
        lofi: () => { for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.3 },
        rain: () => {
          for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() > 0.98 ? (Math.random() - 0.5) * 2 : (data[i - 1] ?? 0) * 0.9
          }
        },
        forest: () => {
          for (let i = 0; i < bufferSize; i++) data[i] = Math.sin(i * 0.01) * 0.1 + (Math.random() - 0.5) * 0.05
        },
        cafe: () => {
          for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.15
        },
        white: () => {
          for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.5
        },
      }

      ;(tracks[ambientTrack] ?? tracks.lofi!)()

      const source = ctx.createBufferSource()
      source.buffer = buffer
      source.loop = true

      const gain = ctx.createGain()
      gain.gain.value = ambientVolume
      gainRef.current = gain

      source.connect(gain)
      gain.connect(ctx.destination)
      source.start()
      noiseRef.current = source
      setAmbientPlaying(true)
    } catch { /* ignore */ }
  }

  const playAmbient = () => playAmbientRef.current()

  const toggleAmbient = () => {
    if (ambientPlaying) stopAmbient()
    else playAmbient()
  }

  // Days until next exam
  const daysUntil = nextExam
    ? Math.ceil((new Date(nextExam.examDate).getTime() - Date.now()) / 86400000)
    : null

  if (!session?.user) return null

  const RADIUS = 16
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS

  return (
    <>
      <style>{`
        @keyframes dock-in {
          from { opacity: 0; transform: translate(-50%, 20px); }
          to   { opacity: 1; transform: translate(-50%, 0); }
        }
        @keyframes panel-in {
          from { opacity: 0; transform: translateY(8px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes pulse-dot {
          0%,100% { opacity: 1; } 50% { opacity: 0.4; }
        }
        .dock-btn {
          display: flex; flex-direction: column;
          align-items: center; gap: 4px;
          padding: 8px 14px; border-radius: 12px;
          border: none; background: transparent;
          cursor: pointer; font-family: inherit;
          transition: all 0.15s ease;
          position: relative;
          min-width: 64px;
        }
        .dock-btn:hover {
          background: rgba(255,255,255,0.06);
        }
        .dock-btn.active {
          background: rgba(240,180,41,0.1);
        }
        .dock-btn-label {
          font-size: 10px; font-weight: 600;
          color: #3d4a6b; letter-spacing: 0.02em;
          white-space: nowrap;
        }
        .dock-btn:hover .dock-btn-label { color: #8892b0; }
        .dock-btn.active .dock-btn-label { color: #f0b429; }
        .dock-panel {
          position: absolute; bottom: 70px;
          background: rgba(8,13,26,0.97);
          border: 1px solid rgba(240,180,41,0.15);
          border-radius: 20px;
          padding: 20px;
          box-shadow: 0 -8px 40px rgba(0,0,0,0.5);
          backdrop-filter: blur(20px);
          animation: panel-in 0.2s ease both;
          z-index: 1000;
          min-width: 220px;
        }
        .track-btn {
          padding: 6px 12px; border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.03);
          color: #8892b0; font-size: 11px;
          font-weight: 600; cursor: pointer;
          font-family: inherit;
          transition: all 0.15s ease;
        }
        .track-btn.selected {
          background: rgba(240,180,41,0.12);
          border-color: rgba(240,180,41,0.3);
          color: #f0b429;
        }
        .slider-input {
          width: 100%; height: 4px;
          border-radius: 2px; appearance: none;
          background: linear-gradient(to right,
            #f0b429 0%, #f0b429 var(--val),
            rgba(255,255,255,0.1) var(--val));
          cursor: pointer; outline: none; border: none;
        }
        .slider-input::-webkit-slider-thumb {
          appearance: none; width: 14px; height: 14px;
          border-radius: 50%; background: #f0b429;
          box-shadow: 0 0 6px rgba(240,180,41,0.5);
        }
        .focus-overlay {
          position: fixed; inset: 0; z-index: 150;
          background: rgba(5,8,16,0.92);
          backdrop-filter: blur(4px);
          display: flex; align-items: center;
          justify-content: center;
          flex-direction: column; gap: 24px;
        }
      `}</style>

      {/* FOCUS OVERLAY */}
      {focusActive && (
        <div className="focus-overlay">
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '11px', fontWeight: 700,
              color: '#f0b429', letterSpacing: '0.1em',
              textTransform: 'uppercase', marginBottom: '16px' }}>
              Focus Mode Active
            </p>
            <div style={{ fontSize: '72px', fontWeight: 900,
              color: '#e8eaf6', letterSpacing: '-0.04em',
              fontVariantNumeric: 'tabular-nums' }}>
              {formatTime(pomSeconds)}
            </div>
            <p style={{ fontSize: '14px', color: '#8892b0', marginTop: '8px' }}>
              {pomMode === 'work' ? '🎯 Deep work' : '☕ Break time'}
              {' · Session '}{pomSession}
            </p>
            <div style={{ display: 'flex', gap: '12px',
              justifyContent: 'center', marginTop: '32px' }}>
              <button
                onClick={() => setPomRunning(r => !r)}
                style={{
                  padding: '12px 32px', borderRadius: '12px',
                  background: 'linear-gradient(135deg, #f0b429, #2dd4bf)',
                  color: '#050810', fontWeight: 800, fontSize: '15px',
                  border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                }}>
                {pomRunning ? '⏸ Pause' : '▶ Resume'}
              </button>
              <button
                onClick={() => setFocusActive(false)}
                style={{
                  padding: '12px 24px', borderRadius: '12px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#8892b0', fontWeight: 600, fontSize: '15px',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>
                Exit Focus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DOCK */}
      {visible && !focusActive && (
        <div style={{
          position: 'fixed', bottom: '20px', left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 200,
          animation: 'dock-in 0.3s ease both',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center',
            gap: '4px',
            background: 'rgba(8,13,26,0.95)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '20px',
            padding: '6px 10px',
            boxShadow: '0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(240,180,41,0.06)',
            backdropFilter: 'blur(20px)',
          }}>

            {/* POMODORO */}
            {dockSettings.showPomodoro && (
              <div style={{ position: 'relative' }}>
                <button
                  className={`dock-btn ${expanded === 'pom' ? 'active' : ''}`}
                  onClick={() => setExpanded(e => e === 'pom' ? null : 'pom')}
                >
                  {/* Circular progress */}
                  <svg width="36" height="36" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="18" cy="18" r={RADIUS}
                      fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2.5" />
                    <circle cx="18" cy="18" r={RADIUS}
                      fill="none"
                      stroke={pomMode === 'work' ? '#f0b429' : '#2dd4bf'}
                      strokeWidth="2.5"
                      strokeDasharray={CIRCUMFERENCE}
                      strokeDashoffset={CIRCUMFERENCE * (1 - pomProgress)}
                      strokeLinecap="round"
                      style={{ transition: 'stroke-dashoffset 1s linear' }}
                    />
                    <text
                      x="18" y="18"
                      textAnchor="middle" dominantBaseline="central"
                      style={{ transform: 'rotate(90deg)', transformOrigin: '18px 18px' }}
                      fontSize="7" fontWeight="700" fill="#e8eaf6"
                    >
                      {formatTime(pomSeconds)}
                    </text>
                  </svg>
                  <span className="dock-btn-label">
                    {pomRunning ? '⏸ Pause' : '▶ Focus'}
                  </span>
                  {pomRunning && (
                    <span style={{
                      position: 'absolute', top: '6px', right: '10px',
                      width: '6px', height: '6px', borderRadius: '50%',
                      background: '#f0b429',
                      animation: 'pulse-dot 1s ease-in-out infinite',
                    }} />
                  )}
                </button>

                {expanded === 'pom' && (
                  <div className="dock-panel" style={{ left: '50%', transform: 'translateX(-50%)' }}>
                    <p style={{ fontSize: '11px', fontWeight: 800,
                      color: '#3d4a6b', textTransform: 'uppercase',
                      letterSpacing: '0.08em', marginBottom: '16px' }}>
                      Pomodoro Timer
                    </p>
                    <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                      <p style={{ fontSize: '40px', fontWeight: 900,
                        color: '#e8eaf6', letterSpacing: '-0.04em',
                        fontVariantNumeric: 'tabular-nums', margin: 0 }}>
                        {formatTime(pomSeconds)}
                      </p>
                      <p style={{ fontSize: '12px', color: pomMode === 'work' ? '#f0b429' : '#2dd4bf',
                        fontWeight: 600, marginTop: '4px' }}>
                        {pomMode === 'work' ? '🎯 Work' : '☕ Break'} · Session {pomSession}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                      <button
                        onClick={() => setPomRunning(r => !r)}
                        style={{
                          flex: 1, padding: '10px', borderRadius: '10px',
                          background: pomRunning
                            ? 'rgba(239,68,68,0.15)'
                            : 'linear-gradient(135deg,#f0b429,#2dd4bf)',
                          border: 'none',
                          color: pomRunning ? '#ef4444' : '#050810',
                          fontWeight: 700, fontSize: '13px',
                          cursor: 'pointer', fontFamily: 'inherit',
                        }}>
                        {pomRunning ? '⏸ Pause' : '▶ Start'}
                      </button>
                      <button
                        onClick={resetPom}
                        style={{
                          padding: '10px 14px', borderRadius: '10px',
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          color: '#8892b0', cursor: 'pointer',
                          fontFamily: 'inherit', fontSize: '13px',
                        }}>
                        ↺
                      </button>
                    </div>
                    <button
                      onClick={() => { setExpanded(null); setFocusActive(true) }}
                      style={{
                        width: '100%', padding: '9px', borderRadius: '10px',
                        background: 'rgba(240,180,41,0.08)',
                        border: '1px solid rgba(240,180,41,0.2)',
                        color: '#f0b429', fontWeight: 600, fontSize: '12px',
                        cursor: 'pointer', fontFamily: 'inherit',
                      }}>
                      Enter Focus Mode →
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* DIVIDER */}
            {dockSettings.showPomodoro && dockSettings.showAmbient && (
              <div style={{ width: '1px', height: '36px',
                background: 'rgba(255,255,255,0.06)', margin: '0 4px' }} />
            )}

            {/* AMBIENT */}
            {dockSettings.showAmbient && (
              <div style={{ position: 'relative' }}>
                <button
                  className={`dock-btn ${ambientPlaying || expanded === 'ambient' ? 'active' : ''}`}
                  onClick={() => setExpanded(e => e === 'ambient' ? null : 'ambient')}
                >
                  <span style={{ fontSize: '22px' }}>
                    🎵
                  </span>
                  <span className="dock-btn-label">
                    {ambientPlaying ? 'Playing' : 'Ambient'}
                  </span>
                  {ambientPlaying && (
                    <span style={{
                      position: 'absolute', top: '6px', right: '10px',
                      width: '6px', height: '6px', borderRadius: '50%',
                      background: '#2dd4bf',
                      animation: 'pulse-dot 1.5s ease-in-out infinite',
                    }} />
                  )}
                </button>

                {expanded === 'ambient' && (
                  <div className="dock-panel" style={{ left: '50%', transform: 'translateX(-50%)' }}>
                    <p style={{ fontSize: '11px', fontWeight: 800,
                      color: '#3d4a6b', textTransform: 'uppercase',
                      letterSpacing: '0.08em', marginBottom: '16px' }}>
                      Ambient Sounds
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr',
                      gap: '6px', marginBottom: '16px' }}>
                      {[
                        { key: 'lofi', label: '🎹 Lo-Fi' },
                        { key: 'rain', label: '🌧 Rain' },
                        { key: 'forest', label: '🌲 Forest' },
                        { key: 'cafe', label: '☕ Café' },
                        { key: 'white', label: '🌊 White' },
                      ].map(t => (
                        <button
                          key={t.key}
                          className={`track-btn ${ambientTrack === t.key ? 'selected' : ''}`}
                          onClick={() => {
                            setAmbientTrack(t.key)
                            if (ambientPlaying) { stopAmbient(); setTimeout(() => playAmbientRef.current(), 100) }
                          }}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                    <p style={{ fontSize: '11px', color: '#3d4a6b',
                      marginBottom: '8px', fontWeight: 600 }}>
                      Volume
                    </p>
                    <input
                      type="range" min="0" max="1" step="0.05"
                      value={ambientVolume}
                      className="slider-input"
                      style={{ '--val': `${ambientVolume * 100}%` } as React.CSSProperties}
                      onChange={e => {
                        const v = parseFloat(e.target.value)
                        setAmbientVolume(v)
                        if (gainRef.current) gainRef.current.gain.value = v
                      }}
                    />
                    <button
                      onClick={toggleAmbient}
                      style={{
                        width: '100%', marginTop: '14px',
                        padding: '10px', borderRadius: '10px',
                        background: ambientPlaying
                          ? 'rgba(239,68,68,0.1)'
                          : 'linear-gradient(135deg,#f0b429,#2dd4bf)',
                        border: ambientPlaying
                          ? '1px solid rgba(239,68,68,0.2)'
                          : 'none',
                        color: ambientPlaying ? '#ef4444' : '#050810',
                        fontWeight: 700, fontSize: '13px',
                        cursor: 'pointer', fontFamily: 'inherit',
                      }}>
                      {ambientPlaying ? '⏹ Stop' : '▶ Play'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* DIVIDER */}
            {dockSettings.showAmbient && dockSettings.showExams && (
              <div style={{ width: '1px', height: '36px',
                background: 'rgba(255,255,255,0.06)', margin: '0 4px' }} />
            )}

            {/* EXAMS */}
            {dockSettings.showExams && (
              <div style={{ position: 'relative' }}>
                <button
                  className={`dock-btn ${expanded === 'exams' ? 'active' : ''}`}
                  onClick={() => setExpanded(e => e === 'exams' ? null : 'exams')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '20px' }}>📋</span>
                    {nextExam && daysUntil !== null && daysUntil <= 7 && (
                      <span style={{
                        padding: '2px 7px', borderRadius: '999px',
                        background: daysUntil <= 2
                          ? 'rgba(239,68,68,0.2)'
                          : 'rgba(240,180,41,0.15)',
                        color: daysUntil <= 2 ? '#ef4444' : '#f0b429',
                        fontSize: '11px', fontWeight: 800,
                      }}>
                        {daysUntil}d
                      </span>
                    )}
                  </div>
                  <span className="dock-btn-label">
                    {exams.length > 0 ? `${exams.length} Exam${exams.length > 1 ? 's' : ''}` : 'Exams'}
                  </span>
                </button>

                {expanded === 'exams' && (
                  <div className="dock-panel" style={{ right: 0 }}>
                    <p style={{ fontSize: '11px', fontWeight: 800,
                      color: '#3d4a6b', textTransform: 'uppercase',
                      letterSpacing: '0.08em', marginBottom: '14px' }}>
                      Upcoming Exams
                    </p>
                    {exams.length === 0 ? (
                      <p style={{ fontSize: '13px', color: '#3d4a6b',
                        textAlign: 'center', padding: '12px 0' }}>
                        No upcoming exams 🎉
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {exams.slice(0, 4).map(exam => {
                          const days = Math.ceil(
                            (new Date(exam.examDate).getTime() - Date.now()) / 86400000
                          )
                          return (
                            <div key={exam.id} style={{
                              padding: '10px 12px', borderRadius: '10px',
                              background: 'rgba(255,255,255,0.03)',
                              border: '1px solid rgba(255,255,255,0.06)',
                            }}>
                              <p style={{ fontSize: '13px', fontWeight: 700,
                                color: '#e8eaf6', marginBottom: '3px', margin: 0 }}>
                                {exam.subject}
                              </p>
                              <p style={{ fontSize: '11px',
                                color: days <= 2 ? '#ef4444' : days <= 5 ? '#f0b429' : '#8892b0',
                                fontWeight: 600, margin: 0 }}>
                                {days === 0 ? 'Today!' : days === 1 ? 'Tomorrow!' : `In ${days} days`}
                              </p>
                            </div>
                          )
                        })}
                      </div>
                    )}
                    <a href="/calendar" style={{
                      display: 'block', textAlign: 'center',
                      marginTop: '12px', fontSize: '12px',
                      color: '#f0b429', textDecoration: 'none',
                      fontWeight: 600,
                    }}>
                      Open Calendar →
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* DIVIDER */}
            {dockSettings.showExams && dockSettings.showFocus && (
              <div style={{ width: '1px', height: '36px',
                background: 'rgba(255,255,255,0.06)', margin: '0 4px' }} />
            )}

            {/* FOCUS MODE */}
            {dockSettings.showFocus && (
              <button
                className={`dock-btn ${focusActive ? 'active' : ''}`}
                onClick={() => setFocusActive(true)}
              >
                <span style={{ fontSize: '22px' }}>🎯</span>
                <span className="dock-btn-label">Focus</span>
              </button>
            )}

            {/* DIVIDER */}
            <div style={{ width: '1px', height: '36px',
              background: 'rgba(255,255,255,0.06)', margin: '0 4px' }} />

            {/* HIDE DOCK */}
            <button
              className="dock-btn"
              onClick={() => setVisible(false)}
              title="Hide dock (press D to show again)"
            >
              <span style={{ fontSize: '16px', color: '#3d4a6b' }}>—</span>
              <span className="dock-btn-label">Hide</span>
            </button>
          </div>
        </div>
      )}

      {/* SHOW DOCK BUTTON (when hidden) */}
      {!visible && !focusActive && (
        <button
          onClick={() => setVisible(true)}
          style={{
            position: 'fixed', bottom: '20px', left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 200,
            padding: '8px 20px', borderRadius: '999px',
            background: 'rgba(8,13,26,0.9)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#3d4a6b', fontSize: '12px', fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
            backdropFilter: 'blur(12px)',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.color = '#f0b429'
            e.currentTarget.style.borderColor = 'rgba(240,180,41,0.2)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = '#3d4a6b'
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
          }}
        >
          Show dock
        </button>
      )}
    </>
  )
}
