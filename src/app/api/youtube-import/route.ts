import { auth } from "~/server/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from 'next/server'
import Groq from 'groq-sdk'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

// YouTube transcript fetch via youtube-transcript npm package
// Since we can't install new packages easily, use a free transcript API
async function getYouTubeTranscript(url: string): Promise<string> {
  // Extract video ID
  const match = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  const videoId = match?.[1]
  if (!videoId) throw new Error('Invalid YouTube URL')

  // Use youtubetranscript.com free API
  const res = await fetch(
    `https://api.kome.ai/api/tools/youtube-transcripts?video_id=${videoId}&format=true`,
    { headers: { 'Content-Type': 'application/json' } }
  )
  if (!res.ok) throw new Error('Could not fetch transcript')
  const data = await res.json()
  return data.transcript || ''
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { youtubeUrl } = await req.json()
  if (!youtubeUrl) return NextResponse.json({ error: 'URL required' }, { status: 400 })

  let transcript = ''
  let title = 'YouTube Video'

  try {
    transcript = await getYouTubeTranscript(youtubeUrl)
  } catch {
    return NextResponse.json({ error: 'Could not fetch transcript. Make sure the video has captions.' }, { status: 400 })
  }

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{
      role: 'user',
      content: `You are a study assistant. Based on this YouTube video transcript, generate:
1. Comprehensive study notes with headers and bullet points
2. 8 flashcard question/answer pairs

Transcript: ${transcript.slice(0, 8000)}

Respond ONLY in this JSON:
{
  "title": "Video title/topic",
  "notes": "Full markdown notes here...",
  "flashcards": [
    { "question": "...", "answer": "..." }
  ]
}`
    }],
    max_tokens: 2000,
  })

  const raw = completion.choices[0]?.message?.content || '{}'
  try {
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim())
    title = parsed.title || title

    const saved = await prisma.youTubeImport.create({
      data: {
        userId: session.user.id,
        youtubeUrl,
        title,
        transcript: transcript.slice(0, 10000),
        notes: parsed.notes || '',
        flashcards: parsed.flashcards || [],
      }
    })

    return NextResponse.json({ ...parsed, id: saved.id })
  } catch {
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }
}

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const imports = await prisma.youTubeImport.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: { id: true, title: true, youtubeUrl: true, createdAt: true }
  })
  return NextResponse.json({ imports })
}
