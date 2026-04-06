import { NextRequest, NextResponse } from 'next/server'
import {
  getDMSession,
  getMemberByToken,
  splitGold,
  adjustMemberGold,
} from '@/db/queries'

// All gold stored as copper pieces (cp)
// 1 gp = 100 cp, 1 sp = 10 cp

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { dmToken, token, action } = body

    if (dmToken) {
      const session = await getDMSession(dmToken)
      if (!session) return NextResponse.json({ error: 'Invalid DM token' }, { status: 401 })

      if (action === 'split') {
        // amount is in copper pieces
        const { amountCp } = body
        if (typeof amountCp !== 'number' || amountCp < 1)
          return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
        await splitGold(session.id, amountCp)
        return NextResponse.json({ success: true })
      }

      if (action === 'give') {
        // Give to a specific member, delta in copper pieces
        const { memberId, deltaCp, field } = body
        if (!memberId || typeof deltaCp !== 'number')
          return NextResponse.json({ error: 'memberId and deltaCp required' }, { status: 400 })
        await adjustMemberGold(memberId, field === 'privateGold' ? 'privateGold' : 'publicGold', deltaCp)
        return NextResponse.json({ success: true })
      }
    }

    if (token) {
      const member = await getMemberByToken(token)
      if (!member) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

      if (action === 'adjust') {
        // Player adjusting their own gold (public or private), delta in copper
        const { deltaCp, field } = body
        if (typeof deltaCp !== 'number')
          return NextResponse.json({ error: 'deltaCp required' }, { status: 400 })
        const goldField = field === 'privateGold' ? 'privateGold' : 'publicGold'
        await adjustMemberGold(member.id, goldField, deltaCp)
        return NextResponse.json({ success: true })
      }
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err) {
    console.error('[PATCH /api/gold]', err)
    return NextResponse.json({ error: 'Failed to update gold' }, { status: 500 })
  }
}
