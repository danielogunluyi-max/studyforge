import { auth } from '~/server/auth'
import { db } from '~/server/db'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const metadata = {
  title: 'Listen to Notes',
}

export default async function ListenIndexPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

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
    <div style={{ padding: '32px', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{
          fontSize: '28px', fontWeight: 800,
          color: 'var(--text-primary)', letterSpacing: '-0.02em',
          marginBottom: '8px',
        }}>
          Listen to Notes 🎧
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          Turn any note into audio — study while you commute, exercise, or relax
        </p>
      </div>

      {notes.length === 0 ? (
        <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎧</div>
          <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
            No notes yet
          </p>
          <p style={{
            color: 'var(--text-muted)', fontSize: '13px',
            marginTop: '4px', marginBottom: '20px',
          }}>
            Generate some notes first, then come back to listen
          </p>
          <Link href="/generator">
            <button className="btn btn-primary">
              Generate notes →
            </button>
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {notes.map(note => {
            const wordCount = note.content.split(/\s+/).length
            const readTime = Math.ceil(wordCount / 150)
            const badgeClass =
              note.format === 'summary' ? 'badge-blue' :
              note.format === 'flashcards' ? 'badge-purple' :
              note.format === 'questions' ? 'badge-orange' : 'badge-green'

            return (
              <div key={note.id} className="card" style={{ padding: '20px' }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'flex-start', marginBottom: '12px',
                }}>
                  <div>
                    <h3 style={{
                      fontSize: '16px', fontWeight: 700,
                      color: 'var(--text-primary)', marginBottom: '4px',
                    }}>
                      {note.title}
                    </h3>
                    <div style={{
                      display: 'flex', gap: '10px',
                      fontSize: '12px', color: 'var(--text-muted)',
                      alignItems: 'center',
                    }}>
                      <span>~{readTime} min listen</span>
                      <span>•</span>
                      <span>{wordCount} words</span>
                      <span>•</span>
                      <span className={`badge ${badgeClass}`}>
                        {note.format}
                      </span>
                    </div>
                  </div>
                  <Link href={`/listen/${note.id}`}>
                    <button className="btn btn-primary btn-sm">
                      🎧 Listen
                    </button>
                  </Link>
                </div>
                <p style={{
                  fontSize: '13px', color: 'var(--text-muted)',
                  lineHeight: 1.5,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}>
                  {note.content.replace(/[#*`]/g, '').slice(0, 200)}...
                </p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
