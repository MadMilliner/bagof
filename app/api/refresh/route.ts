import { NextRequest, NextResponse } from 'next/server'
import { after } from 'next/server'
import {
  getMemberByToken,
  getDMSession,
  getMemberItems,
  getPartyPool,
  getOtherMembersPublicItems,
  getSessionMembers,
  getAllSessionItems,
  getSessionById,
  touchSessionAccess,
} from '@/db/queries'
import { checkRateLimit } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/refresh?token=xxx&role=player|dm
 * Returns fresh data for dashboard polling/refresh.
 */
export async function GET(req: NextRequest) {
  const rateLimited = checkRateLimit(req, 120, 60_000) // 120 refreshes per minute
  if (rateLimited) return rateLimited

  try {
    const { searchParams } = req.nextUrl
    const token = searchParams.get('token')
    const role = searchParams.get('role') // 'player' or 'dm'

    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 })
    }

    if (role === 'dm') {
      const session = await getDMSession(token)
      if (!session) return NextResponse.json({ error: 'Invalid DM token' }, { status: 401 })

      const [items, members] = await Promise.all([
        getAllSessionItems(session.id),
        getSessionMembers(session.id),
      ])

      // Update last-accessed timestamp (survives serverless lifecycle)
      after(() => touchSessionAccess(session.id))

      return NextResponse.json({ session, items, members })
    }

    // Player refresh
    const member = await getMemberByToken(token)
    if (!member) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    const [session, myItems, partyPool, otherMembers] = await Promise.all([
      getSessionById(member.sessionId),
      getMemberItems(member.id),
      getPartyPool(member.sessionId),
      getOtherMembersPublicItems(member.sessionId, member.id),
    ])

    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

    // Update last-accessed timestamp (survives serverless lifecycle)
    after(() => touchSessionAccess(session.id))

    return NextResponse.json({
      session,
      member, // fresh gold values
      myItems,
      partyPool,
      otherMembers,
    })
  } catch (err) {
    console.error('[GET /api/refresh]', err)
    return NextResponse.json({ error: 'Failed to refresh' }, { status: 500 })
  }
}
