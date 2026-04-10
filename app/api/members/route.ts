import { NextRequest, NextResponse } from 'next/server'
import { getMemberByToken, updateMemberName, getDMSession, addMember } from '@/db/queries'

export async function POST(req: NextRequest) {
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
    return NextResponse.json({ member })
  } catch (err) {
    console.error('[POST /api/members]', err)
    return NextResponse.json({ error: 'Failed to add member' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
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

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[PATCH /api/members]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
