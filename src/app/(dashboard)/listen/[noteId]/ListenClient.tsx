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
    <div style={{ padding: '32px', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <Link href="/my-notes" style={{ textDecoration: 'none' }}>
          <button className="btn btn-ghost btn-sm" style={{ marginBottom: '16px' }}>
            ← Back to Notes
          </button>
        </Link>
      </div>
      <AudioPlayer
        noteId={note.id}
        noteTitle={note.title}
        noteContent={note.content}
        compact={false}
        onFinish={() => setCompletedPlayCount((count) => count + 1)}
      />
    </div>
  )
}
