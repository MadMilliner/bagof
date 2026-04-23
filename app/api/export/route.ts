import { NextRequest, NextResponse } from 'next/server'
import {
  getDMSession,
  getAllSessionItems,
  getSessionMembers,
  logActivity,
} from '@/db/queries'
import { checkRateLimit } from '@/lib/rateLimit'

export async function GET(req: NextRequest) {
  const rateLimited = checkRateLimit(req, 30, 60_000)
  if (rateLimited) return rateLimited

  try {
    const { searchParams } = new URL(req.url)
    const dmToken = searchParams.get('token')

    if (!dmToken) {
      return NextResponse.json({ error: 'DM token required' }, { status: 401 })
    }

    const session = await getDMSession(dmToken)
    if (!session) {
      return NextResponse.json({ error: 'Invalid DM token' }, { status: 401 })
    }

    // Fetch all session data
    const [items, members] = await Promise.all([
      getAllSessionItems(session.id),
      getSessionMembers(session.id),
    ])

    // Build export payload
    const exportData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      session: {
        name: session.name,
        currencyType: session.currencyType,
        dmRole: session.dmRole,
        partyGold: session.partyGold,
      },
      members: members.map(m => ({
        name: m.name,
        publicGold: m.publicGold,
        privateGold: m.privateGold,
      })),
      items: items.map(i => ({
        name: i.name,
        description: i.description,
        type: i.type,
        private: i.private,
        offeredToParty: i.offeredToParty,
        quantity: i.quantity,
        ownerName: i.ownerId ? members.find(m => m.id === i.ownerId)?.name ?? null : null,
      })),
    }

    await logActivity(session.id, null, session.dmRole, 'session_export', `Exported session data`)

    return NextResponse.json(exportData)
  } catch (err) {
    console.error('[GET /api/export]', err)
    return NextResponse.json({ error: 'Failed to export session' }, { status: 500 })
  }
}