import { notFound } from 'next/navigation'
import { after } from 'next/server'
import {
  getMemberByToken,
  getMemberItems,
  getPartyPool,
  getSessionById,
  getOtherMembersPublicItems,
  touchSessionAccess,
} from '@/db/queries'
import { PlayerDashboard } from '@/components/PlayerDashboard'
import { Metadata } from 'next'

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params
  const member = await getMemberByToken(token)
  if (!member) return { title: 'Not Found' }
  const session = await getSessionById(member.sessionId)
  if (!session) return { title: 'Not Found' }
  return { title: `${member.name} | ${session.name}` }
}

export default async function PlayerPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const member = await getMemberByToken(token)
  if (!member) notFound()

  const [session, myItems, partyPool, otherMembers] = await Promise.all([
    getSessionById(member.sessionId),
    getMemberItems(member.id),
    getPartyPool(member.sessionId),
    getOtherMembersPublicItems(member.sessionId, member.id),
  ])

  // Update last-accessed timestamp (survives serverless lifecycle)
  after(() => touchSessionAccess(member.sessionId))

  if (!session) notFound()

  return (
    <PlayerDashboard
      session={session}
      member={member}
      memberToken={token}
      initialMyItems={myItems}
      initialPartyPool={partyPool}
      initialOtherMembers={otherMembers}
    />
  )
}
