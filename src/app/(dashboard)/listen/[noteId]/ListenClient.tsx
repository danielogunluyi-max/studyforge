'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

import AudioPlayer from '~/app/_components/AudioPlayer'
import { trackNovaEvent } from '@/lib/novaClient'

type ListenNote = {
  id: string
  title: string
  content: string
  format: string
  createdAt: Date
  updatedAt: Date
}

export default function ListenClient({ note }: { note: ListenNote }) {
  const [completedPlayCount, setCompletedPlayCount] = useState(0)

  useEffect(() => {
    if (completedPlayCount < 1) return
    trackNovaEvent('NOTE_GENERATED')
  }, [completedPlayCount])

  return (
    <main className="kv-page" style={{ padding: '24px 16px 100px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div className="kv-crumb">Kyvex / <b>Listen to Notes</b></div>
        <Link href="/listen" className="kv-btn-ghost" style={{ marginTop: 14, display: 'inline-flex', textDecoration: 'none' }}>
          Back
        </Link>
        <AudioPlayer
          noteId={note.id}
          noteTitle={note.title}
          noteContent={note.content}
          compact={false}
          onFinish={() => setCompletedPlayCount((count) => count + 1)}
        />
      </div>
    </main>
  )
}
