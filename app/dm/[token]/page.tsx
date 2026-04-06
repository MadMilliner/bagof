import { notFound } from 'next/navigation'
import { getDMSession, getAllSessionItems, getSessionMembers } from '@/db/queries'
import { DMDashboard } from '@/components/DMDashboard'

export default async function DMPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const session = await getDMSession(token)
  if (!session) notFound()

  const [items, members] = await Promise.all([
    getAllSessionItems(session.id),
    getSessionMembers(session.id),
  ])

  return (
    <DMDashboard
      session={session}
      dmToken={token}
      initialItems={items}
      initialMembers={members}
    />
  )
}
