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
      <p className="kv-sub" style={{ marginTop: 16 }}>
        Text-to-speech not supported. Use Chrome or Edge.
      </p>
    )
  }

  if (compact) {
    return (
      <div className="kv-row">
        <button type="button" onClick={handlePlayPause} className="kv-btn-ghost">
          {state.isPlaying ? 'Pause' : state.isPaused ? 'Resume' : 'Play'}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="kv-meta">
            {state.isPlaying || state.isPaused
              ? `${state.currentSentenceIndex + 1} / ${state.totalSentences}`
              : `~${readingTime} min`}
            <span className="num" style={{ marginLeft: 8 }}>{state.progress}%</span>
          </p>
          <div className="kv-bar" style={{ marginTop: 8 }}>
            <div style={{ width: `${state.progress}%` }} />
          </div>
        </div>
        {(state.isPlaying || state.isPaused) ? (
          <button type="button" onClick={stop} className="kv-btn-ghost">Stop</button>
        ) : null}
        <button type="button" onClick={() => router.push(`/listen/${noteId}`)} className="kv-btn-ghost">
          Full
        </button>
      </div>
    )
  }

  return (
    <div style={{ marginTop: 22 }}>
      <h1 className="kv-title" style={{ fontSize: 22 }}>{noteTitle}</h1>
      <p className="kv-meta" style={{ marginTop: 8 }}>
        ~{readingTime} min · {sentences.length} sentences
        {state.isPlaying || state.isPaused ? ` · ${state.progress}%` : ''}
        {options.qualityMode ? ' · Quality mode' : ''}
      </p>

      {state.currentSentenceText ? (
        <p className="kv-serif" style={{ marginTop: 20, color: 'var(--kv-text-primary)', maxWidth: '56ch' }}>
          {state.currentSentenceText}
        </p>
      ) : (
        <p className="kv-meta" style={{ marginTop: 20 }}>
          {state.isFinished ? 'Finished — press play to restart' : 'Press play to start listening'}
        </p>
      )}

      <div
        className="kv-bar"
        style={{ marginTop: 16, cursor: 'pointer' }}
        onClick={e => {
          const rect = e.currentTarget.getBoundingClientRect()
          const pct = (e.clientX - rect.left) / rect.width
          const idx = Math.floor(pct * sentences.length)
          jumpToSentence(Math.max(0, Math.min(idx, sentences.length - 1)))
        }}
      >
        <div style={{ width: `${state.progress}%` }} />
      </div>
      <p className="kv-meta" style={{ marginTop: 8 }}>
        Sentence {state.currentSentenceIndex + 1} · {state.progress}% · {state.totalSentences} sentences
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
        <button type="button" onClick={skipBackward} className="kv-btn-ghost">Back</button>
        <button type="button" onClick={handlePlayPause} className="kv-btn-ghost">
          {state.isPlaying ? 'Pause' : state.isFinished ? 'Replay' : 'Play'}
        </button>
        <button type="button" onClick={skipForward} className="kv-btn-ghost">Forward</button>
        <button type="button" onClick={stop} className="kv-btn-ghost">Stop</button>
      </div>

      <p className="kv-meta" style={{ marginTop: 22 }}>Speed</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
        {[0.5, 0.75, 1, 1.25, 1.5, 2].map(speed => (
          <button
            key={speed}
            type="button"
            onClick={() => updateOption('rate', speed)}
            className={options.rate === speed ? 'kv-btn-ghost on' : 'kv-btn-ghost'}
          >
            {speed}x
          </button>
        ))}
        <button type="button" onClick={() => setShowSettings(s => !s)} className="kv-btn-ghost">
          Settings
        </button>
        <button type="button" onClick={exportAudio} disabled={state.isExporting} className="kv-btn-ghost">
          {state.isExporting ? 'Exporting…' : 'Export'}
        </button>
      </div>
      <p className="kv-sub" style={{ marginTop: 12, fontSize: 13 }}>
        Export uses browser audio capture when available. If your browser blocks
        synthesized audio recording, Kyvex downloads the spoken script instead.
      </p>

      {showSettings ? (
        <div style={{ marginTop: 20 }}>
          <div className="kv-row">
            <div>
              <div className="kv-row-title">Quality mode</div>
              <p className="kv-sub" style={{ marginTop: 4, fontSize: 13 }}>Uses best available premium voice</p>
            </div>
            <button
              type="button"
              className={options.qualityMode ? 'kv-btn-ghost on' : 'kv-btn-ghost'}
              onClick={() => updateOption('qualityMode', !options.qualityMode)}
            >
              {options.qualityMode ? 'On' : 'Off'}
            </button>
          </div>
          <p className="kv-meta" style={{ marginTop: 16 }}>Voice</p>
          <select
            className="kv-field"
            value={options.voiceIndex}
            onChange={e => updateOption('voiceIndex', parseInt(e.target.value, 10))}
            style={{ marginTop: 8 }}
          >
            {state.voices.map((v, i) => (
              <option key={i} value={i}>
                {v.name} ({v.lang})
              </option>
            ))}
          </select>
          <p className="kv-meta" style={{ marginTop: 16 }}>Volume {Math.round(options.volume * 100)}%</p>
          <input
            type="range" min="0" max="1" step="0.1"
            value={options.volume}
            onChange={e => updateOption('volume', parseFloat(e.target.value))}
            style={{ width: '100%', marginTop: 8 }}
          />
          <p className="kv-meta" style={{ marginTop: 16 }}>Pitch {options.pitch.toFixed(1)}</p>
          <input
            type="range" min="0.8" max="1.2" step="0.1"
            value={options.pitch}
            onChange={e => updateOption('pitch', parseFloat(e.target.value))}
            style={{ width: '100%', marginTop: 8 }}
          />
        </div>
      ) : null}

      <p className="kv-meta" style={{ marginTop: 28 }}>Note content</p>
      <p className="kv-sub" style={{ marginTop: 8, fontSize: 13 }}>Click any sentence to jump to it</p>
      <div style={{ marginTop: 12, lineHeight: 2, fontSize: 14 }}>
        {sentences.map((sentence, i) => (
          <span
            key={i}
            onClick={() => jumpToSentence(i)}
            style={{
              cursor: 'pointer',
              color: i === state.currentSentenceIndex && state.isPlaying
                ? 'var(--kv-text-primary)'
                : i < state.currentSentenceIndex
                  ? 'var(--kv-text-tertiary)'
                  : 'var(--kv-text-secondary)',
              boxShadow: i === state.currentSentenceIndex && state.isPlaying
                ? 'inset 0 -2px 0 var(--kv-accent)'
                : undefined,
            }}
          >
            {sentence}{' '}
          </span>
        ))}
      </div>
    </div>
  )
}
