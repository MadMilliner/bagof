import { NextRequest, NextResponse } from 'next/server'
import { getMemberByToken, updateMemberName, getDMSession, addMember, logActivity } from '@/db/queries'
import { checkRateLimit } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(req: NextRequest) {
  const rateLimited = checkRateLimit(req, 20, 60_000)
  if (rateLimited) return rateLimited

  try {
    const { dmToken, name } = await req.json()

    if (!dmToken || !name) {
      return NextResponse.json({ error: 'dmToken and name are required' }, { status: 400 })
    }

    const session = await getDMSession(dmToken)
    if (!session) {
      return NextResponse.json({ error: 'Invalid DM token' }, { status: 401 })
    }

    const member = await addMember(session.id, name)
    await logActivity(session.id, null, session.dmRole, 'member_add', name)
    return NextResponse.json({ member })
  } catch (err) {
    console.error('[POST /api/members]', err)
    return NextResponse.json({ error: 'Failed to add member' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const rateLimited = checkRateLimit(req, 30, 60_000)
  if (rateLimited) return rateLimited

  try {
    const { token, name } = await req.json()

    if (!token || !name) {
      return NextResponse.json({ error: 'Token and name are required' }, { status: 400 })
    }

    const member = await getMemberByToken(token)
    if (!member) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const success = await updateMemberName(member.id, name)
    if (!success) {
      return NextResponse.json({ error: 'Failed to update name' }, { status: 500 })
    }
    await logActivity(member.sessionId, member.id, member.name, 'member_rename', name)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[PATCH /api/members]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
