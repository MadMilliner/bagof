import { NextRequest, NextResponse } from 'next/server'
import {
  getMemberByToken,
  getDMSession,
  addItem,
  claimItem,
  offerItem,
  updateItem,
  deleteItem,
  offerItemSplit
} from '@/db/queries'
import { randomUUID } from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const { token, isDM, dmToken, item } = await req.json()

    let sessionId: string
    let ownerId: string | null = null

    if (isDM && dmToken) {
      const session = await getDMSession(dmToken)
      if (!session) return NextResponse.json({ error: 'Invalid DM token' }, { status: 401 })
      sessionId = session.id
    } else if (token) {
      const member = await getMemberByToken(token)
      if (!member) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
      sessionId = member.sessionId
      ownerId = member.id
    } else {
      return NextResponse.json({ error: 'No auth token' }, { status: 401 })
    }

    const qty: number = item.quantity ?? 1
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

    return NextResponse.json({ item: created })
  } catch (err) {
    console.error('[POST /api/items]', err)
    return NextResponse.json({ error: 'Failed to add item' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { token, dmToken, itemId, action, updates } = await req.json()
    const isDM = !!dmToken

    let memberId: string | null = null
    let sessionId: string | null = null

    if (isDM) {
      const session = await getDMSession(dmToken)
      if (!session) return NextResponse.json({ error: 'Invalid DM token' }, { status: 401 })
      sessionId = session.id
    } else {
      const member = await getMemberByToken(token)
      if (!member) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
      memberId = member.id
      sessionId = member.sessionId
    }

    if (action === 'claim') {
      if (!memberId) return NextResponse.json({ error: 'Only members can claim' }, { status: 403 })
      const ok = await claimItem(itemId, memberId)
      if (!ok) return NextResponse.json({ error: 'Item unavailable' }, { status: 409 })
      return NextResponse.json({ success: true })
    }

    if (action === 'offer') {
      if (!memberId) return NextResponse.json({ error: 'Only members can offer' }, { status: 403 })
      const items = await offerItemSplit(itemId, memberId)
      if (!items) return NextResponse.json({ error: 'Item not found' }, { status: 404 })
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
  try {
    const { token, dmToken, itemId } = await req.json()

    if (dmToken) {
      const session = await getDMSession(dmToken)
      if (!session) return NextResponse.json({ error: 'Invalid DM token' }, { status: 401 })
      await deleteItem(itemId, undefined, session.id)
    } else {
      const member = await getMemberByToken(token)
      if (!member) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
      await deleteItem(itemId, member.id)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[DELETE /api/items]', err)
    return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 })
  }
}
