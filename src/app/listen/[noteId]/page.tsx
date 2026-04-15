import { getAuthSession } from '~/server/auth/session'
import { db } from '~/server/db'
import { notFound, redirect } from 'next/navigation'
import ListenClient from './ListenClient'

export const metadata = {
  title: 'Listen',
}

export default async function ListenPage({
  params,
}: {
  params: Promise<{ noteId: string }>
}) {
  const session = await getAuthSession()
  if (!session?.user?.id) redirect('/login')

  const { noteId } = await params

  const note = await db.note.findFirst({
    where: { id: noteId, userId: session.user.id },
    select: {
      id: true,
      title: true,
      content: true,
      format: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  if (!note) notFound()

  return <ListenClient note={note} />
}
