import { NextRequest, NextResponse } from 'next/server'
import {
  getDMSession,
  getSessionMembers,
  addItem,
  addMember,
  adjustPartyGold,
  adjustMemberGold,
  logActivity,
} from '@/db/queries'
import { checkRateLimit } from '@/lib/rateLimit'
import type { ItemType } from '@/types'

interface ImportItem {
  name: string
  description: string
  type: ItemType
  private: boolean
  quantity: number
  ownerName: string | null
}

interface ImportMember {
  name: string
  publicGold: number
  privateGold: number
}

export async function POST(req: NextRequest) {
  const rateLimited = checkRateLimit(req, 10, 60_000) // Limit imports to prevent abuse
  if (rateLimited) return rateLimited

  try {
    const formData = await req.formData()
    const dmToken = formData.get('dmToken') as string
    const file = formData.get('file') as File

    if (!dmToken) {
      return NextResponse.json({ error: 'DM token required' }, { status: 401 })
    }

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // File size limit (5MB)
    if (file.size > 5_000_000) {
      return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 })
    }

    const session = await getDMSession(dmToken)
    if (!session) {
      return NextResponse.json({ error: 'Invalid DM token' }, { status: 401 })
    }

    // Parse the uploaded file
    const text = await file.text()
    let data: any
    try {
      data = JSON.parse(text)
    } catch {
      return NextResponse.json({ error: 'Invalid JSON file' }, { status: 400 })
    }

    // Validate structure
    if (!data.version || !data.session || !data.items) {
      return NextResponse.json({ error: 'Invalid export file format' }, { status: 400 })
    }

    const currentMembers = await getSessionMembers(session.id)
    const memberNameToId = new Map(currentMembers.map(m => [m.name.toLowerCase(), m.id]))

    let itemsImported = 0
    let membersCreated = 0
    let goldAdjusted = 0

    // Import items
    for (const item of data.items as ImportItem[]) {
      if (!item.name?.trim()) continue

      let ownerId: string | null = null

      // Resolve owner by name
      if (item.ownerName) {
        const existingId = memberNameToId.get(item.ownerName.toLowerCase())
        if (existingId) {
          ownerId = existingId
        } else {
          // Create a new member for this owner
          const newMember = await addMember(session.id, item.ownerName)
          memberNameToId.set(item.ownerName.toLowerCase(), newMember.id)
          ownerId = newMember.id
          membersCreated++
        }
      }

      // Import item (quantity times if > 1)
      const qty = Math.min(Math.max(1, Math.floor(item.quantity ?? 1)), 100)
      for (let i = 0; i < qty; i++) {
        await addItem({
          sessionId: session.id,
          ownerId,
          name: item.name.trim().slice(0, 200),
          description: (item.description ?? '').slice(0, 2000),
          type: ['Weapon', 'Armor', 'Consumable', 'Other'].includes(item.type) ? item.type : 'Other',
          private: item.private ?? false,
          quantity: 1,
        })
        itemsImported++
      }
    }

    // Import members (gold only for existing members)
    for (const member of data.members as ImportMember[]) {
      if (!member.name?.trim()) continue

      const existingId = memberNameToId.get(member.name.toLowerCase())
      if (existingId) {
        // Adjust gold for existing member
        const deltaPublic = (member.publicGold ?? 0) - (currentMembers.find(m => m.id === existingId)?.publicGold ?? 0)
        if (deltaPublic !== 0) {
          await adjustMemberGold(existingId, 'publicGold', deltaPublic, session.id)
          goldAdjusted++
        }
      } else {
        // Create new member with imported gold
        const newMember = await addMember(session.id, member.name)
        memberNameToId.set(member.name.toLowerCase(), newMember.id)
        membersCreated++

        if (member.publicGold > 0) {
          await adjustMemberGold(newMember.id, 'publicGold', member.publicGold, session.id)
          goldAdjusted++
        }
        if (member.privateGold > 0) {
          await adjustMemberGold(newMember.id, 'privateGold', member.privateGold, session.id)
          goldAdjusted++
        }
      }
    }

    // Import party gold
    if (typeof data.session.partyGold === 'number' && data.session.partyGold > 0) {
      const currentPartyGold = session.partyGold
      const delta = data.session.partyGold - currentPartyGold
      if (delta !== 0) {
        await adjustPartyGold(session.id, delta)
        goldAdjusted++
      }
    }

    await logActivity(
      session.id,
      null,
      session.dmRole,
      'session_import',
      `Imported: ${itemsImported} items, ${membersCreated} members, ${goldAdjusted} gold adjustments`
    )

    return NextResponse.json({
      success: true,
      itemsImported,
      membersCreated,
      goldAdjusted,
    })
  } catch (err) {
    console.error('[POST /api/import]', err)
    return NextResponse.json({ error: 'Failed to import session' }, { status: 500 })
  }
}