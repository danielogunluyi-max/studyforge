import { getAuthSession } from '~/server/auth/session'
import { db } from '~/server/db'
import { redirect } from 'next/navigation'
import { loginUrlFor } from '~/lib/auth-redirect'
import Link from 'next/link'

export const metadata = {
  title: 'Listen to Notes',
}

export default async function ListenIndexPage() {
  const session = await getAuthSession()
  if (!session?.user?.id) redirect(loginUrlFor('/listen'))

  const notes = await db.note.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      title: true,
      content: true,
      createdAt: true,
      format: true,
    },
  })

  return (
    <main className="kv-page" style={{ padding: '24px 16px 100px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div className="kv-crumb">Kyvex / <b>Listen to Notes</b></div>
        <h1 className="kv-title" style={{ marginTop: 14 }}>Listen to Notes</h1>
        <p className="kv-sub" style={{ marginTop: 10 }}>
          Turn any note into audio — study while you commute, exercise, or relax
        </p>

        {notes.length === 0 ? (
          <div>
            <p className="kv-sub" style={{ marginTop: 28 }}>No notes yet. Generate some notes first, then come back to listen.</p>
            <Link href="/generator" className="kv-btn" style={{ marginTop: 16, display: 'inline-flex', textDecoration: 'none' }}>
              Generate notes
            </Link>
          </div>
        ) : (
          <div style={{ marginTop: 8 }}>
            {notes.map((note) => {
              const wordCount = note.content.split(/\s+/).length
              const readTime = Math.ceil(wordCount / 150)
              return (
                <Link key={note.id} href={`/listen/${note.id}`} className="kv-row">
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="kv-row-title">{note.title}</div>
                    <div className="kv-row-sub">
                      <span className="kv-chip num">~{readTime} min</span>
                      <span className="kv-chip num">{wordCount} words</span>
                      <span className="kv-chip">{note.format}</span>
                    </div>
                  </div>
                  <span className="kv-row-side">Listen</span>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
