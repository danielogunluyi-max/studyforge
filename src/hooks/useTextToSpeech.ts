'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import {
  prepareTextForSpeech,
  splitIntoSentences,
  getEnglishVoices,
} from '~/lib/textToSpeech'

export interface TTSOptions {
  rate: number        // 0.5 to 2.0
  pitch: number       // 0.8 to 1.2
  volume: number      // 0 to 1
  voiceIndex: number
  qualityMode: boolean
}

export interface TTSState {
  isPlaying: boolean
  isPaused: boolean
  currentSentenceIndex: number
  totalSentences: number
  progress: number
  currentSentenceText: string
  voices: SpeechSynthesisVoice[]
  isSupported: boolean
  isExporting: boolean
  isFinished: boolean
}

export function useTextToSpeech(rawText: string) {
  const [state, setState] = useState<TTSState>({
    isPlaying: false,
    isPaused: false,
    currentSentenceIndex: 0,
    totalSentences: 0,
    progress: 0,
    currentSentenceText: '',
    voices: [],
    isSupported: false,
    isExporting: false,
    isFinished: false,
  })

  const [options, setOptions] = useState<TTSOptions>({
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0,
    voiceIndex: 0,
    qualityMode: false,
  })

  const sentencesRef = useRef<string[]>([])
  const currentIndexRef = useRef(0)
  const isPlayingRef = useRef(false)
  const optionsRef = useRef(options)
  const voicesRef = useRef<SpeechSynthesisVoice[]>([])

  const getPreferredVoice = useCallback((voiceIndex: number, qualityMode: boolean) => {
    if (qualityMode) {
      return voicesRef.current.find((voice) =>
        voice.name.includes('Neural') ||
        voice.name.includes('Premium') ||
        voice.name.includes('Natural') ||
        voice.name.includes('Enhanced'),
      )
    }

    return voicesRef.current[voiceIndex]
  }, [])

  // Keep optionsRef in sync
  useEffect(() => { optionsRef.current = options }, [options])

  // Load voices
  useEffect(() => {
    if (typeof window === 'undefined') return
    const supported = 'speechSynthesis' in window
    const load = () => {
      const v = getEnglishVoices()
      voicesRef.current = v
      setState(s => ({ ...s, voices: v, isSupported: supported }))
    }
    load()
    window.speechSynthesis.onvoiceschanged = load
    return () => { window.speechSynthesis.onvoiceschanged = null }
  }, [])

  // Parse sentences on text change
  useEffect(() => {
    const cleaned = prepareTextForSpeech(rawText)
    const sentences = splitIntoSentences(cleaned)
    sentencesRef.current = sentences
    setState(s => ({ ...s, totalSentences: sentences.length }))
  }, [rawText])

  const speakFrom = useCallback((index: number) => {
    if (index >= sentencesRef.current.length) {
      isPlayingRef.current = false
      currentIndexRef.current = 0
      setState(s => ({
        ...s, isPlaying: false, isPaused: false,
        isFinished: true, progress: 100,
        currentSentenceIndex: 0, currentSentenceText: '',
      }))
      return
    }

    const sentence = sentencesRef.current[index]!
    const utt = new SpeechSynthesisUtterance(sentence)
    const opts = optionsRef.current
    utt.rate = opts.rate
    utt.pitch = opts.pitch
    utt.volume = opts.volume

    const voice = getPreferredVoice(opts.voiceIndex, opts.qualityMode)
    if (voice) utt.voice = voice

    utt.onstart = () => {
      currentIndexRef.current = index
      setState(s => ({
        ...s,
        isPlaying: true,
        isPaused: false,
        isFinished: false,
        currentSentenceIndex: index,
        currentSentenceText: sentence,
        progress: Math.round((index / sentencesRef.current.length) * 100),
      }))
    }

    utt.onend = () => {
      if (isPlayingRef.current) speakFrom(index + 1)
    }

    utt.onerror = (e) => {
      if (e.error !== 'interrupted') console.error('TTS:', e.error)
    }

    window.speechSynthesis.speak(utt)
  }, [getPreferredVoice])

  const play = useCallback((fromIndex = 0) => {
    window.speechSynthesis.cancel()
    isPlayingRef.current = true
    setState(s => ({ ...s, isFinished: false }))
    setTimeout(() => speakFrom(fromIndex), 50)
  }, [speakFrom])

  const pause = useCallback(() => {
    window.speechSynthesis.pause()
    isPlayingRef.current = false
    setState(s => ({ ...s, isPlaying: false, isPaused: true }))
  }, [])

  const resume = useCallback(() => {
    window.speechSynthesis.resume()
    isPlayingRef.current = true
    setState(s => ({ ...s, isPlaying: true, isPaused: false }))
  }, [])

  const stop = useCallback(() => {
    window.speechSynthesis.cancel()
    isPlayingRef.current = false
    currentIndexRef.current = 0
    setState(s => ({
      ...s, isPlaying: false, isPaused: false,
      isFinished: false, progress: 0,
      currentSentenceIndex: 0, currentSentenceText: '',
    }))
  }, [])

  const skipForward = useCallback(() => {
    const next = Math.min(
      currentIndexRef.current + 5,
      sentencesRef.current.length - 1,
    )
    window.speechSynthesis.cancel()
    if (isPlayingRef.current) speakFrom(next)
    else {
      currentIndexRef.current = next
      setState(s => ({ ...s, currentSentenceIndex: next }))
    }
  }, [speakFrom])

  const skipBackward = useCallback(() => {
    const prev = Math.max(currentIndexRef.current - 5, 0)
    window.speechSynthesis.cancel()
    if (isPlayingRef.current) speakFrom(prev)
    else {
      currentIndexRef.current = prev
      setState(s => ({ ...s, currentSentenceIndex: prev }))
    }
  }, [speakFrom])

  const jumpToSentence = useCallback((index: number) => {
    window.speechSynthesis.cancel()
    if (isPlayingRef.current) speakFrom(index)
    else {
      currentIndexRef.current = index
      setState(s => ({ ...s, currentSentenceIndex: index }))
    }
  }, [speakFrom])

  const updateOption = useCallback(<K extends keyof TTSOptions>(
    key: K, value: TTSOptions[K],
  ) => {
    setOptions(prev => {
      const next = { ...prev, [key]: value }
      optionsRef.current = next
      return next
    })
    if (isPlayingRef.current) {
      window.speechSynthesis.cancel()
      setTimeout(() => speakFrom(currentIndexRef.current), 100)
    }
  }, [speakFrom])

  const exportAudio = useCallback(async () => {
    setState(s => ({ ...s, isExporting: true }))
    try {
      // Use MediaRecorder to capture system audio
      // Falls back to text file if AudioContext capture unsupported
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        .catch(() => null)

      if (stream) {
        const recorder = new MediaRecorder(stream)
        const chunks: Blob[] = []
        recorder.ondataavailable = e => chunks.push(e.data)
        recorder.onstop = () => {
          stream.getTracks().forEach(t => t.stop())
          const blob = new Blob(chunks, { type: 'audio/webm' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `kyvex-notes-${Date.now()}.webm`
          a.click()
          URL.revokeObjectURL(url)
          setState(s => ({ ...s, isExporting: false }))
        }
        recorder.start()

        const allText = sentencesRef.current.join(' ')
        const utt = new SpeechSynthesisUtterance(allText)
        utt.rate = optionsRef.current.rate
        utt.pitch = optionsRef.current.pitch
        const voice = getPreferredVoice(
          optionsRef.current.voiceIndex,
          optionsRef.current.qualityMode,
        )
        if (voice) utt.voice = voice
        utt.onend = () => setTimeout(() => recorder.stop(), 500)
        window.speechSynthesis.cancel()
        window.speechSynthesis.speak(utt)
      } else {
        // Fallback: download as text
        const blob = new Blob(
          [sentencesRef.current.join(' ')],
          { type: 'text/plain' },
        )
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `kyvex-notes-${Date.now()}.txt`
        a.click()
        setState(s => ({ ...s, isExporting: false }))
      }
    } catch (err) {
      console.error('Export error:', err)
      setState(s => ({ ...s, isExporting: false }))
    }
  }, [getPreferredVoice])

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel()
      isPlayingRef.current = false
    }
  }, [])

  return {
    state, options,
    play, pause, resume, stop,
    skipForward, skipBackward, jumpToSentence,
    updateOption, exportAudio,
    sentences: sentencesRef.current,
  }
}
