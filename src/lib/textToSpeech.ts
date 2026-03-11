// Strip markdown formatting for clean speech output
export function prepareTextForSpeech(markdown: string): string {
  return markdown
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/^[\s]*[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .replace(/```[\s\S]*?```/g, 'code block omitted')
    .replace(/`(.+?)`/g, '$1')
    .replace(/^---+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// Split into speakable sentences
export function splitIntoSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 0)
}

// Get English voices, premium ones first
export function getEnglishVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined') return []
  return window.speechSynthesis.getVoices()
    .filter(v => v.lang.startsWith('en'))
    .sort((a, b) => {
      const premium = (v: SpeechSynthesisVoice) =>
        v.name.includes('Neural') ||
        v.name.includes('Premium') ||
        v.name.includes('Natural') ||
        v.name.includes('Enhanced') ? 1 : 0
      return premium(b) - premium(a)
    })
}

// Estimate audio duration in minutes
export function estimateReadingTime(text: string): number {
  const words = text.split(/\s+/).length
  return Math.ceil(words / 150)
}
