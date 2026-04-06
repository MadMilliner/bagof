import { notFound } from 'next/navigation'
import {
  getMemberByToken,
  getMemberItems,
  getPartyPool,
  getSessionById,
  getOtherMembersPublicItems,
} from '@/db/queries'
import { PlayerDashboard } from '@/components/PlayerDashboard'

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
