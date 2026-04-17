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
import type { Item } from '@/types'

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
      // Validate updates: only allow known fields with sane bounds
      if (!updates || typeof updates !== 'object')
        return NextResponse.json({ error: 'updates object required' }, { status: 400 })
      const sanitized: Partial<{ name: string; description: string; type: Item['type']; private: boolean; quantity: number }> = {}
      if (updates.name !== undefined) {
        if (typeof updates.name !== 'string' || !updates.name.trim())
          return NextResponse.json({ error: 'name must be a non-empty string' }, { status: 400 })
        sanitized.name = updates.name.trim().slice(0, 200)
      }
      if (updates.description !== undefined) {
        if (typeof updates.description !== 'string')
          return NextResponse.json({ error: 'description must be a string' }, { status: 400 })
        sanitized.description = updates.description.slice(0, 2000)
      }
      if (updates.type !== undefined) {
        const validTypes: Item['type'][] = ['Weapon', 'Armor', 'Consumable', 'Other']
        if (!validTypes.includes(updates.type))
          return NextResponse.json({ error: 'invalid type' }, { status: 400 })
        sanitized.type = updates.type
      }
      if (updates.private !== undefined) {
        if (typeof updates.private !== 'boolean')
          return NextResponse.json({ error: 'private must be a boolean' }, { status: 400 })
        sanitized.private = updates.private
      }
      if (updates.quantity !== undefined) {
        const qty = Math.floor(updates.quantity)
        if (!Number.isFinite(qty) || qty < 1 || qty > MAX_ITEM_QUANTITY)
          return NextResponse.json({ error: `quantity must be 1–${MAX_ITEM_QUANTITY}` }, { status: 400 })
        sanitized.quantity = qty
      }
      if (Object.keys(sanitized).length === 0)
        return NextResponse.json({ error: 'no valid fields to update' }, { status: 400 })

      await updateItem(
        itemId,
        sanitized,
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
