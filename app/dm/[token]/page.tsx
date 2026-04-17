import { notFound } from 'next/navigation'
import { after } from 'next/server'
import { getDMSession, getAllSessionItems, getSessionMembers, touchSessionAccess } from '@/db/queries'
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

  // Update last-accessed timestamp (survives serverless lifecycle)
  after(() => touchSessionAccess(session.id))

  return (
    <DMDashboard
      session={session}
      dmToken={token}
      initialItems={items}
      initialMembers={members}
    />
  )
}
