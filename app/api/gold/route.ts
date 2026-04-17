import { NextRequest, NextResponse } from 'next/server'
import {
  getDMSession,
  getMemberByToken,
  getMemberById,
  splitGold,
  adjustMemberGold,
  adjustPartyGold,
  transferToPartyPool,
  transferFromPartyPool,
  logActivity,
} from '@/db/queries'
import { checkRateLimit } from '@/lib/rateLimit'

// All gold stored as copper pieces (cp)
// 1 gp = 100 cp, 1 sp = 10 cp

export async function PATCH(req: NextRequest) {
  const rateLimited = checkRateLimit(req, 60, 60_000)
  if (rateLimited) return rateLimited

  try {
    const body = await req.json()
    const { dmToken, token, action } = body

    if (dmToken) {
      const session = await getDMSession(dmToken)
      if (!session) return NextResponse.json({ error: 'Invalid DM token' }, { status: 401 })

      if (action === 'split') {
        // amount is in copper pieces
        const { amountCp } = body
        if (!Number.isFinite(amountCp) || amountCp < 1)
          return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
        await splitGold(session.id, amountCp)
        await logActivity(session.id, null, session.dmRole, 'gold_split', `${amountCp} cp among all members`)
        return NextResponse.json({ success: true })
      }

      if (action === 'give') {
        // Give to a specific member, delta in copper pieces
        const { memberId, deltaCp, field } = body
        if (!memberId || !Number.isFinite(deltaCp))
          return NextResponse.json({ error: 'memberId and deltaCp required' }, { status: 400 })
        const ok = await adjustMemberGold(memberId, field === 'privateGold' ? 'privateGold' : 'publicGold', deltaCp, session.id)
        if (!ok) return NextResponse.json({ error: 'Member not found in this session' }, { status: 403 })
        const target = await getMemberById(memberId)
        await logActivity(session.id, null, session.dmRole, 'gold_give', `${deltaCp > 0 ? '+' : ''}${deltaCp} cp to ${target?.name ?? 'member'} (${field === 'privateGold' ? 'private' : 'public'})`)
        return NextResponse.json({ success: true })
      }

      if (action === 'party_adjust') {
        const { deltaCp } = body
        if (!Number.isFinite(deltaCp)) return NextResponse.json({ error: 'deltaCp required' }, { status: 400 })
        await adjustPartyGold(session.id, deltaCp)
        await logActivity(session.id, null, session.dmRole, 'gold_party_adjust', `${deltaCp > 0 ? '+' : ''}${deltaCp} cp to party pool`)
        return NextResponse.json({ success: true })
      }
    }

    if (token) {
      const member = await getMemberByToken(token)
      if (!member) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

      if (action === 'adjust') {
        // Player adjusting their own gold (public or private), delta in copper
        const { deltaCp, field } = body
        if (!Number.isFinite(deltaCp))
          return NextResponse.json({ error: 'deltaCp required' }, { status: 400 })
        const goldField = field === 'privateGold' ? 'privateGold' : 'publicGold'
        const ok = await adjustMemberGold(member.id, goldField, deltaCp, member.sessionId)
        if (!ok) return NextResponse.json({ error: 'Member not found in this session' }, { status: 403 })
        await logActivity(member.sessionId, member.id, member.name, 'gold_adjust', `${deltaCp > 0 ? '+' : ''}${deltaCp} cp ${goldField === 'privateGold' ? '(private)' : '(public)'}`)
        return NextResponse.json({ success: true })
      }

      // NOTE: 'party_adjust' is intentionally DM-only.
      // Players must use 'transfer_to_pool' or 'transfer_from_pool' which
      // deduct from their own balance, preventing infinite gold minting.

      if (action === 'transfer_to_pool') {
        const { amountCp } = body
        if (!Number.isFinite(amountCp) || amountCp < 1)
          return NextResponse.json({ error: 'amountCp required' }, { status: 400 })
        const ok = await transferToPartyPool(member.id, member.sessionId, amountCp)
        if (!ok) return NextResponse.json({ error: 'Insufficient gold' }, { status: 400 })
        await logActivity(member.sessionId, member.id, member.name, 'gold_transfer_to_pool', `${amountCp} cp to party pool`)
        return NextResponse.json({ success: true })
      }

      if (action === 'transfer_from_pool') {
        const { amountCp } = body
        if (!Number.isFinite(amountCp) || amountCp < 1)
          return NextResponse.json({ error: 'amountCp required' }, { status: 400 })
        const ok = await transferFromPartyPool(member.id, member.sessionId, amountCp)
        if (!ok) return NextResponse.json({ error: 'Insufficient party gold' }, { status: 400 })
        await logActivity(member.sessionId, member.id, member.name, 'gold_transfer_from_pool', `${amountCp} cp from party pool`)
        return NextResponse.json({ success: true })
      }
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err) {
    console.error('[PATCH /api/gold]', err)
    return NextResponse.json({ error: 'Failed to update gold' }, { status: 500 })
  }
}
