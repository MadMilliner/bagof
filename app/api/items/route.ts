import { NextRequest, NextResponse } from 'next/server'
import {
  getMemberByToken,
  getDMSession,
  getItemById,
  addItem,
  claimItem,
  offerItem,
  updateItem,
  deleteItem,
  offerItemSplit,
  logActivity,
  MAX_ITEM_QUANTITY
} from '@/db/queries'
import { checkRateLimit } from '@/lib/rateLimit'

export async function POST(req: NextRequest) {
  const rateLimited = checkRateLimit(req, 30, 60_000)
  if (rateLimited) return rateLimited

  try {
    const { token, isDM, dmToken, item } = await req.json()

    let sessionId: string
    let ownerId: string | null = null
    let actorName = 'DM' // default for DM actions

    if (isDM && dmToken) {
      const session = await getDMSession(dmToken)
      if (!session) return NextResponse.json({ error: 'Invalid DM token' }, { status: 401 })
      sessionId = session.id
      actorName = session.dmRole
    } else if (token) {
      const member = await getMemberByToken(token)
      if (!member) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
      sessionId = member.sessionId
      ownerId = member.id
      actorName = member.name
    } else {
      return NextResponse.json({ error: 'No auth token' }, { status: 401 })
    }

    const qty: number = Math.min(Math.max(1, Math.floor(item.quantity ?? 1)), MAX_ITEM_QUANTITY)
    const isPool = !ownerId // DM adding always goes to pool as separate items

    // If adding to party pool with qty > 1, create N individual records
    if (isPool && qty > 1) {
      const created = []
      for (let i = 0; i < qty; i++) {
        const single = await addItem({
          sessionId,
          ownerId: null,
          name: item.name,
          description: item.description ?? '',
          type: item.type ?? 'Other',
          private: false,
          quantity: 1,
        })
        created.push(single)
      }
      await logActivity(sessionId, null, actorName, 'item_add', `${item.name} ×${qty}`)
      return NextResponse.json({ items: created, item: created[0] })
    }

    // Personal inventory: keep quantity as-is (player manages their own stack)
    const created = await addItem({
      sessionId,
      ownerId,
      name: item.name,
      description: item.description ?? '',
      type: item.type ?? 'Other',
      private: item.private ?? false,
      quantity: qty,
    })

    await logActivity(sessionId, ownerId, actorName, 'item_add', created.name)

    return NextResponse.json({ item: created })
  } catch (err) {
    console.error('[POST /api/items]', err)
    return NextResponse.json({ error: 'Failed to add item' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const rateLimited = checkRateLimit(req, 60, 60_000)
  if (rateLimited) return rateLimited

  try {
    const { token, dmToken, itemId, action, updates } = await req.json()
    const isDM = !!dmToken

    let memberId: string | null = null
    let sessionId: string | null = null
    let actorName = 'DM'

    if (isDM) {
      const session = await getDMSession(dmToken)
      if (!session) return NextResponse.json({ error: 'Invalid DM token' }, { status: 401 })
      sessionId = session.id
      actorName = session.dmRole
    } else {
      const member = await getMemberByToken(token)
      if (!member) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
      memberId = member.id
      sessionId = member.sessionId
      actorName = member.name
    }

    if (action === 'claim') {
      if (!memberId) return NextResponse.json({ error: 'Only members can claim' }, { status: 403 })
      const ok = await claimItem(itemId, memberId, sessionId!)
      if (!ok) return NextResponse.json({ error: 'Item unavailable' }, { status: 409 })
      const claimedItem = await getItemById(itemId)
      await logActivity(sessionId!, memberId, actorName, 'item_claim', claimedItem?.name ?? 'item')
      return NextResponse.json({ success: true })
    }

    if (action === 'offer') {
      if (!memberId) return NextResponse.json({ error: 'Only members can offer' }, { status: 403 })
      const items = await offerItemSplit(itemId, memberId)
      if (!items) return NextResponse.json({ error: 'Item not found' }, { status: 404 })
      await logActivity(sessionId!, memberId, actorName, 'item_offer', items.map(i => i.name).join(', '))
      return NextResponse.json({ success: true, items })
    }

    if (action === 'update') {
      await updateItem(
        itemId,
        updates,
        isDM ? undefined : memberId!,
        isDM ? sessionId! : undefined
      )
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err) {
    console.error('[PATCH /api/items]', err)
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const rateLimited = checkRateLimit(req, 30, 60_000)
  if (rateLimited) return rateLimited

  try {
    const { token, dmToken, itemId } = await req.json()

    if (dmToken) {
      const session = await getDMSession(dmToken)
      if (!session) return NextResponse.json({ error: 'Invalid DM token' }, { status: 401 })
      const itemToDelete = await getItemById(itemId)
      await deleteItem(itemId, undefined, session.id)
      await logActivity(session.id, null, session.dmRole, 'item_delete', itemToDelete?.name ?? 'item')
    } else {
      const member = await getMemberByToken(token)
      if (!member) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
      const itemToDelete = await getItemById(itemId)
      await deleteItem(itemId, member.id)
      await logActivity(member.sessionId, member.id, member.name, 'item_delete', itemToDelete?.name ?? 'item')
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[DELETE /api/items]', err)
    return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 })
  }
}
