'use client'
import { useTextToSpeech } from '~/hooks/useTextToSpeech'
import { estimateReadingTime } from '~/lib/textToSpeech'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface AudioPlayerProps {
  noteId: string
  noteTitle: string
  noteContent: string
  compact?: boolean
  onFinish?: () => void
}

export default function AudioPlayer({
  noteId, noteTitle, noteContent, compact = false, onFinish,
}: AudioPlayerProps) {
  const router = useRouter()
  const {
    state, options,
    play, pause, resume, stop,
    skipForward, skipBackward, jumpToSentence,
    updateOption, exportAudio, sentences,
  } = useTextToSpeech(noteContent)

  const [showSettings, setShowSettings] = useState(false)
  const readingTime = estimateReadingTime(noteContent)
  const hasNotifiedFinishRef = useRef(false)

  // Fire onFinish callback when playback ends
  useEffect(() => {
    if (state.isFinished && !hasNotifiedFinishRef.current && onFinish) {
      hasNotifiedFinishRef.current = true
      onFinish()
    }

    if (!state.isFinished) {
      hasNotifiedFinishRef.current = false
    }
  }, [state.isFinished, onFinish])

  const handlePlayPause = () => {
    if (state.isPlaying) pause()
    else if (state.isPaused) resume()
    else play(0)
  }

  if (!state.isSupported) {
    return (
      <div style={{
        padding: '12px 16px',
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-default)',
        borderRadius: '12px',
        fontSize: '13px',
        color: 'var(--text-muted)',
      }}>
        🔇 Text-to-speech not supported. Use Chrome or Edge.
      </div>
    )
  }

  // ============================================================
  // COMPACT — mini inline player on /my-notes
  // ============================================================
  if (compact) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '10px 14px',
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-default)',
        borderRadius: '12px',
      }}>
        {/* Play/Pause */}
        <button onClick={handlePlayPause} style={{
          width: 34, height: 34, borderRadius: '50%',
          background: state.isPlaying
            ? 'var(--accent-purple)'
            : 'var(--accent-blue)',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: '13px',
          color: 'white', flexShrink: 0,
          transition: 'background 0.2s ease',
        }}>
          {state.isPlaying ? '⏸' : state.isPaused ? '▶' : '🎧'}
        </button>

        {/* Progress */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            fontSize: '11px', color: 'var(--text-muted)',
            marginBottom: '4px',
          }}>
            <span>
              {state.isPlaying || state.isPaused
                ? `${state.currentSentenceIndex + 1} / ${state.totalSentences} sentences`
                : `~${readingTime} min`}
            </span>
            <span>{state.progress}%</span>
          </div>
          <div
            style={{
              height: '3px', background: 'var(--border-default)',
              borderRadius: '2px', cursor: 'pointer',
            }}
            onClick={e => {
              const rect = e.currentTarget.getBoundingClientRect()
              const pct = (e.clientX - rect.left) / rect.width
              const idx = Math.floor(pct * sentences.length)
              jumpToSentence(Math.max(0, Math.min(idx, sentences.length - 1)))
            }}
          >
            <div style={{
              height: '100%', borderRadius: '2px',
              background: 'linear-gradient(90deg, var(--accent-blue), var(--accent-purple))',
              width: `${state.progress}%`,
              transition: 'width 0.4s ease',
            }} />
          </div>
        </div>

        {/* Stop */}
        {(state.isPlaying || state.isPaused) && (
          <button onClick={stop} style={{
            background: 'none', border: 'none',
            cursor: 'pointer', color: 'var(--text-muted)',
            fontSize: '14px', padding: '4px', flexShrink: 0,
          }}>⏹</button>
        )}

        {/* Open full player */}
        <button
          onClick={() => router.push(`/listen/${noteId}`)}
          style={{
            background: 'none', border: 'none',
            cursor: 'pointer', color: 'var(--text-muted)',
            fontSize: '12px', padding: '4px',
            flexShrink: 0, whiteSpace: 'nowrap',
          }}
        >
          ⛶ Full
        </button>
      </div>
    )
  }

  // ============================================================
  // FULL PLAYER — used on /listen/[noteId]
  // ============================================================
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{
          fontSize: '24px', fontWeight: 800,
          color: 'var(--text-primary)', letterSpacing: '-0.02em',
          marginBottom: '6px',
        }}>
          🎧 {noteTitle}
        </h1>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            ~{readingTime} min listen
          </span>
          <span style={{ color: 'var(--text-muted)' }}>•</span>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            {sentences.length} sentences
          </span>
          {options.qualityMode && (
            <span className="badge badge-purple">✨ Quality mode</span>
          )}
        </div>
      </div>

      {/* Main player card */}
      <div className="card" style={{ padding: '28px', marginBottom: '20px' }}>

        {/* Now playing sentence */}
        <div style={{
          minHeight: '60px',
          padding: '16px',
          background: 'var(--bg-elevated)',
          borderRadius: '10px',
          marginBottom: '24px',
          border: `1px solid ${state.isPlaying ? 'var(--accent-blue)' : 'var(--border-default)'}`,
          transition: 'border-color 0.2s ease',
        }}>
          {state.currentSentenceText ? (
            <p style={{
              fontSize: '15px', color: 'var(--text-primary)',
              lineHeight: 1.7, fontStyle: 'italic',
            }}>
              &ldquo;{state.currentSentenceText}&rdquo;
            </p>
          ) : (
            <p style={{
              fontSize: '14px', color: 'var(--text-muted)',
              textAlign: 'center', paddingTop: '8px',
            }}>
              {state.isFinished
                ? '✅ Finished — press play to restart'
                : 'Press play to start listening'}
            </p>
          )}
        </div>

        {/* Progress bar — clickable */}
        <div style={{ marginBottom: '20px' }}>
          <div
            style={{
              height: '6px', background: 'var(--border-default)',
              borderRadius: '3px', cursor: 'pointer',
              position: 'relative',
            }}
            onClick={e => {
              const rect = e.currentTarget.getBoundingClientRect()
              const pct = (e.clientX - rect.left) / rect.width
              const idx = Math.floor(pct * sentences.length)
              jumpToSentence(Math.max(0, Math.min(idx, sentences.length - 1)))
            }}
          >
            <div style={{
              height: '100%', borderRadius: '3px',
              background: 'linear-gradient(90deg, var(--accent-blue), var(--accent-purple))',
              width: `${state.progress}%`,
              transition: 'width 0.4s ease',
            }} />
            {/* Scrubber dot */}
            <div style={{
              position: 'absolute', top: '50%',
              left: `${state.progress}%`,
              transform: 'translate(-50%, -50%)',
              width: '14px', height: '14px', borderRadius: '50%',
              background: 'var(--accent-blue)',
              boxShadow: '0 0 0 3px rgba(79,110,247,0.3)',
              transition: 'left 0.4s ease',
            }} />
          </div>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px',
          }}>
            <span>Sentence {state.currentSentenceIndex + 1}</span>
            <span>{state.progress}% complete</span>
            <span>{state.totalSentences} sentences</span>
          </div>
        </div>

        {/* Controls */}
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: '16px', marginBottom: '24px',
        }}>
          {/* Skip back 5 */}
          <button
            onClick={skipBackward}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-secondary)', fontSize: '20px',
              padding: '8px', transition: 'color 0.15s ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
          >
            ⏮
          </button>

          {/* Main play button */}
          <button
            onClick={handlePlayPause}
            style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '24px',
              color: 'white',
              boxShadow: '0 4px 20px rgba(79,110,247,0.4)',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'scale(1.05)'
              e.currentTarget.style.boxShadow = '0 6px 28px rgba(79,110,247,0.5)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'scale(1)'
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(79,110,247,0.4)'
            }}
          >
            {state.isPlaying ? '⏸' : state.isFinished ? '🔄' : '▶'}
          </button>

          {/* Skip forward 5 */}
          <button
            onClick={skipForward}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-secondary)', fontSize: '20px',
              padding: '8px', transition: 'color 0.15s ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
          >
            ⏭
          </button>

          {/* Stop */}
          <button
            onClick={stop}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-secondary)', fontSize: '20px',
              padding: '8px', transition: 'color 0.15s ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent-red, #ef4444)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
          >
            ⏹
          </button>
        </div>

        {/* Speed + Settings row */}
        <div style={{
          display: 'flex', alignItems: 'center',
          gap: '12px', flexWrap: 'wrap',
        }}>
          {/* Speed buttons */}
          <div style={{ display: 'flex', gap: '4px' }}>
            {[0.5, 0.75, 1, 1.25, 1.5, 2].map(speed => (
              <button
                key={speed}
                onClick={() => updateOption('rate', speed)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '20px',
                  border: `1px solid ${options.rate === speed
                    ? 'var(--accent-blue)'
                    : 'var(--border-default)'}`,
                  background: options.rate === speed
                    ? 'var(--accent-blue)'
                    : 'var(--bg-elevated)',
                  color: options.rate === speed
                    ? 'white'
                    : 'var(--text-muted)',
                  fontSize: '12px', fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {speed}x
              </button>
            ))}
          </div>

          {/* Settings toggle */}
          <button
            onClick={() => setShowSettings(s => !s)}
            className="btn btn-ghost btn-sm"
            style={{ marginLeft: 'auto' }}
          >
            ⚙ Settings
          </button>

          {/* Export button */}
          <button
            onClick={exportAudio}
            disabled={state.isExporting}
            className="btn btn-ghost btn-sm"
          >
            {state.isExporting ? '⏳ Exporting...' : '⬇ Export'}
          </button>
        </div>

        <p style={{
          marginTop: '10px',
          fontSize: '12px',
          color: 'var(--text-muted)',
          lineHeight: 1.5,
        }}>
          Export uses browser audio capture when available. If your browser blocks
          synthesized audio recording, Kyvex downloads the spoken script instead.
        </p>

        {/* Settings panel */}
        {showSettings && (
          <div style={{
            marginTop: '20px', padding: '16px',
            background: 'var(--bg-elevated)',
            borderRadius: '10px',
            border: '1px solid var(--border-default)',
            display: 'flex', flexDirection: 'column', gap: '16px',
          }}>

            {/* Quality mode toggle */}
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div>
                <p style={{
                  fontSize: '13px', fontWeight: 600,
                  color: 'var(--text-primary)',
                }}>
                  ✨ Quality Mode
                </p>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Uses best available premium voice
                </p>
              </div>
              <button
                onClick={() => updateOption('qualityMode', !options.qualityMode)}
                style={{
                  width: 40, height: 22, borderRadius: '11px',
                  background: options.qualityMode
                    ? 'var(--accent-blue)'
                    : 'var(--border-strong)',
                  border: 'none', cursor: 'pointer',
                  position: 'relative', transition: 'background 0.2s ease',
                  flexShrink: 0,
                }}
              >
                <div style={{
                  position: 'absolute', top: 3,
                  left: options.qualityMode ? 21 : 3,
                  width: 16, height: 16, borderRadius: '50%',
                  background: 'white',
                  transition: 'left 0.2s ease',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                }} />
              </button>
            </div>

            {/* Voice selector */}
            <div>
              <label style={{
                fontSize: '12px', fontWeight: 600,
                color: 'var(--text-muted)', display: 'block',
                marginBottom: '6px', textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                Voice
              </label>
              <select
                className="input"
                value={options.voiceIndex}
                onChange={e => updateOption('voiceIndex', parseInt(e.target.value))}
                style={{ width: '100%' }}
              >
                {state.voices.map((v, i) => (
                  <option key={i} value={i}>
                    {v.name} ({v.lang})
                    {v.name.includes('Neural') || v.name.includes('Premium')
                      ? ' ✨' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Volume slider */}
            <div>
              <label style={{
                fontSize: '12px', fontWeight: 600,
                color: 'var(--text-muted)', display: 'block',
                marginBottom: '6px', textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                Volume: {Math.round(options.volume * 100)}%
              </label>
              <input
                type="range" min="0" max="1" step="0.1"
                value={options.volume}
                onChange={e => updateOption('volume', parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent-blue)' }}
              />
            </div>

            {/* Pitch slider */}
            <div>
              <label style={{
                fontSize: '12px', fontWeight: 600,
                color: 'var(--text-muted)', display: 'block',
                marginBottom: '6px', textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                Pitch: {options.pitch.toFixed(1)}
              </label>
              <input
                type="range" min="0.8" max="1.2" step="0.1"
                value={options.pitch}
                onChange={e => updateOption('pitch', parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent-blue)' }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Text display with highlighting */}
      <div className="card" style={{ padding: '24px' }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', marginBottom: '16px',
        }}>
          <h3 style={{
            fontSize: '14px', fontWeight: 700,
            color: 'var(--text-primary)',
          }}>
            📄 Note Content
          </h3>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Click any sentence to jump to it
          </span>
        </div>
        <div style={{ lineHeight: 2, fontSize: '14px' }}>
          {sentences.map((sentence, i) => (
            <span
              key={i}
              onClick={() => jumpToSentence(i)}
              style={{
                padding: '2px 4px',
                borderRadius: '4px',
                cursor: 'pointer',
                background: i === state.currentSentenceIndex && state.isPlaying
                  ? 'rgba(79,110,247,0.2)'
                  : 'transparent',
                color: i === state.currentSentenceIndex && state.isPlaying
                  ? 'var(--text-primary)'
                  : i < state.currentSentenceIndex
                  ? 'var(--text-muted)'
                  : 'var(--text-secondary)',
                borderBottom: i === state.currentSentenceIndex && state.isPlaying
                  ? '2px solid var(--accent-blue)'
                  : '2px solid transparent',
                transition: 'all 0.2s ease',
              }}
            >
              {sentence}{' '}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
