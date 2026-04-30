import { NextRequest, NextResponse } from 'next/server'
import {
  getDMSession,
  getMemberByToken,
  getSessionActivity,
} from '@/db/queries'
import { checkRateLimit } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/activity?token=xxx&role=player|dm
 * Returns the session's activity log (most recent 50 entries).
 */
export async function GET(req: NextRequest) {
  // Allow production builds to complete even when DB is unreachable.
  // Next may attempt to collect API route data during build.
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return NextResponse.json({ activity: [] })
  }

  const rateLimited = checkRateLimit(req, 120, 60_000)
  if (rateLimited) return rateLimited

  try {
    const { searchParams } = req.nextUrl
    const token = searchParams.get('token')
    const role = searchParams.get('role')

    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 })
    }

    let sessionId: string | null = null

    if (role === 'dm') {
      const session = await getDMSession(token)
      if (!session) return NextResponse.json({ error: 'Invalid DM token' }, { status: 401 })
      sessionId = session.id
    } else {
      const member = await getMemberByToken(token)
      if (!member) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
      sessionId = member.sessionId
    }

    const activity = await getSessionActivity(sessionId)
    return NextResponse.json({ activity })
  } catch (err) {
    console.error('[GET /api/activity]', err)
    return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 })
  }
}
