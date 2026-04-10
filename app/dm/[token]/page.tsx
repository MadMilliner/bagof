import { notFound } from 'next/navigation'
import { getDMSession, getAllSessionItems, getSessionMembers } from '@/db/queries'
import { DMDashboard } from '@/components/DMDashboard'
import { Metadata } from 'next'

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params
  const session = await getDMSession(token)
  if (!session) return { title: 'Not Found' }
  return { title: `DM: ${session.name}` }
}

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
