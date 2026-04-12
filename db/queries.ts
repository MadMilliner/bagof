import { sql, migrate } from './index'
import { randomUUID } from 'crypto'
import type { Item, Member, Session } from '@/types'

// Run migrations on first import (creates tables if they don't exist)
await migrate()

// ── Mappers ───────────────────────────────────────────────────

function mapSession(row: Record<string, any>): Session {
  return {
    id: row.id,
    dmToken: row.dm_token,
    name: row.name,
    currencyType: row.currency_type,
    dmRole: row.dm_role,
    partyGold: row.party_gold,
    createdAt: row.created_at,
  }
}

function mapMember(row: Record<string, any>): Member {
  return {
    id: row.id,
    sessionId: row.session_id,
    name: row.name,
    token: row.token,
    publicGold: row.public_gold,
    privateGold: row.private_gold,
    createdAt: row.created_at,
  }
}

function mapItem(row: Record<string, any>): Item {
  return {
    id: row.id,
    sessionId: row.session_id,
    ownerId: row.owner_id,
    name: row.name,
    description: row.description,
    type: row.type as Item['type'],
    private: Boolean(row.private),
    offeredToParty: Boolean(row.offered_to_party),
    quantity: row.quantity,
    createdAt: row.created_at,
  }
}

// ── Token resolution ──────────────────────────────────────────

export async function getMemberByToken(token: string): Promise<Member | null> {
  const { rows } = await sql`
    SELECT * FROM members WHERE token = ${token} LIMIT 1
  `
  return rows[0] ? mapMember(rows[0]) : null
}

export async function getDMSession(dmToken: string): Promise<Session | null> {
  const { rows } = await sql`
    SELECT * FROM sessions WHERE dm_token = ${dmToken} LIMIT 1
  `
  return rows[0] ? mapSession(rows[0]) : null
}

export async function getSessionById(id: string): Promise<Session | null> {
  const { rows } = await sql`
    SELECT * FROM sessions WHERE id = ${id} LIMIT 1
  `
  return rows[0] ? mapSession(rows[0]) : null
}

export async function getSessionMembers(sessionId: string): Promise<Member[]> {
  const { rows } = await sql`
    SELECT * FROM members WHERE session_id = ${sessionId} ORDER BY created_at ASC
  `
  return rows.map(mapMember)
}

// ── Session creation ──────────────────────────────────────────

export async function createSession(
  name: string,
  currencyType: 'dnd' | 'wealth',
  dmRole: string,
  memberNames: string[]
): Promise<{ session: Session; members: Member[] }> {
  const sessionId = randomUUID()
  const dmToken = randomUUID()

  const { rows: sessionRows } = await sql`
    INSERT INTO sessions (id, dm_token, name, currency_type, dm_role)
    VALUES (${sessionId}, ${dmToken}, ${name}, ${currencyType}, ${dmRole})
    RETURNING *
  `

  const createdMembers: Member[] = []
  for (const memberName of memberNames) {
    const memberId = randomUUID()
    const token = randomUUID()
    const { rows: memberRows } = await sql`
      INSERT INTO members (id, session_id, name, token)
      VALUES (${memberId}, ${sessionId}, ${memberName}, ${token})
      RETURNING *
    `
    createdMembers.push(mapMember(memberRows[0]))
  }

  return { session: mapSession(sessionRows[0]), members: createdMembers }
}

// ── Items ─────────────────────────────────────────────────────

export async function getPartyPool(sessionId: string): Promise<Item[]> {
  const { rows } = await sql`
    SELECT * FROM items
    WHERE session_id = ${sessionId}
      AND owner_id IS NULL
      AND private = FALSE
    ORDER BY created_at DESC
  `
  return rows.map(mapItem)
}

export async function getMemberItems(memberId: string): Promise<Item[]> {
  const { rows } = await sql`
    SELECT * FROM items WHERE owner_id = ${memberId} ORDER BY created_at DESC
  `
  return rows.map(mapItem)
}

export async function getAllSessionItems(sessionId: string): Promise<Item[]> {
  const { rows } = await sql`
    SELECT * FROM items WHERE session_id = ${sessionId} ORDER BY created_at DESC
  `
  return rows.map(mapItem)
}

export async function addItem(data: {
  sessionId: string
  ownerId: string | null
  name: string
  description: string
  type: Item['type']
  private: boolean
  quantity: number
}): Promise<Item> {
  const id = randomUUID()
  const { rows } = await sql`
    INSERT INTO items (id, session_id, owner_id, name, description, type, private, offered_to_party, quantity)
    VALUES (${id}, ${data.sessionId}, ${data.ownerId}, ${data.name}, ${data.description}, ${data.type}, ${data.private}, FALSE, ${data.quantity})
    RETURNING *
  `
  return mapItem(rows[0])
}

export async function claimItem(itemId: string, memberId: string): Promise<boolean> {
  const { rowCount } = await sql`
    UPDATE items
    SET owner_id = ${memberId}, offered_to_party = FALSE
    WHERE id = ${itemId} AND owner_id IS NULL
  `
  return (rowCount ?? 0) > 0
}

export async function offerItem(itemId: string, memberId: string): Promise<boolean> {
  const { rowCount } = await sql`
    UPDATE items
    SET owner_id = NULL, offered_to_party = TRUE, private = FALSE
    WHERE id = ${itemId} AND owner_id = ${memberId}
  `
  return (rowCount ?? 0) > 0
}

export async function offerItemSplit(itemId: string, memberId: string): Promise<Item[] | null> {
  const { rows } = await sql`
    SELECT * FROM items WHERE id = ${itemId} AND owner_id = ${memberId}
  `
  if (!rows[0]) return null

  const existing = rows[0]
  const qty = existing.quantity as number
  const newItems: Item[] = []

  if (qty > 1) {
    await sql`DELETE FROM items WHERE id = ${itemId}`
    for (let i = 0; i < qty; i++) {
      const newId = randomUUID()
      const { rows: inserted } = await sql`
        INSERT INTO items (id, session_id, owner_id, name, description, type, private, offered_to_party, quantity)
        VALUES (${newId}, ${existing.session_id}, NULL, ${existing.name}, ${existing.description}, ${existing.type}, FALSE, TRUE, 1)
        RETURNING *
      `
      newItems.push(mapItem(inserted[0]))
    }
  } else {
    await offerItem(itemId, memberId)
    const { rows: updated } = await sql`SELECT * FROM items WHERE id = ${itemId}`
    newItems.push(mapItem(updated[0]))
  }

  return newItems
}

export async function updateItem(
  itemId: string,
  updates: Partial<{ name: string; description: string; type: Item['type']; private: boolean; quantity: number }>,
  ownerId?: string,
  sessionId?: string
): Promise<boolean> {
  if (!ownerId && !sessionId) return false

  // Build SET clause manually since template literals don't support dynamic fields
  // We do this safely by only accepting known field names
  const setClauses: string[] = []
  const values: any[] = []

  if (updates.name !== undefined) { setClauses.push(`name = $${values.length + 1}`); values.push(updates.name) }
  if (updates.description !== undefined) { setClauses.push(`description = $${values.length + 1}`); values.push(updates.description) }
  if (updates.type !== undefined) { setClauses.push(`type = $${values.length + 1}`); values.push(updates.type) }
  if (updates.private !== undefined) { setClauses.push(`private = $${values.length + 1}`); values.push(updates.private) }
  if (updates.quantity !== undefined) { setClauses.push(`quantity = $${values.length + 1}`); values.push(updates.quantity) }

  if (setClauses.length === 0) return false

  const whereField = ownerId ? 'owner_id' : 'session_id'
  const whereValue = (ownerId ?? sessionId)!
  values.push(itemId, whereValue)

  const setStr = setClauses.join(', ')
  const idParam = `$${values.length - 1}`
  const whereParam = `$${values.length}`

  const { rowCount } = await sql.query(
    `UPDATE items SET ${setStr} WHERE id = ${idParam} AND ${whereField} = ${whereParam}`,
    values
  )
  return (rowCount ?? 0) > 0
}

export async function deleteItem(
  itemId: string,
  ownerId?: string,
  sessionId?: string
): Promise<boolean> {
  if (!ownerId && !sessionId) return false
  const whereField = ownerId ? 'owner_id' : 'session_id'
  const whereValue = (ownerId ?? sessionId)!
  const { rowCount } = await sql.query(
    `DELETE FROM items WHERE id = $1 AND ${whereField} = $2`,
    [itemId, whereValue]
  )
  return (rowCount ?? 0) > 0
}

// ── Gold ──────────────────────────────────────────────────────

// All gold values stored as copper pieces (cp). 1 gp = 100 cp, 1 sp = 10 cp.

export async function splitGold(sessionId: string, amountCp: number): Promise<void> {
  const members = await getSessionMembers(sessionId)
  if (members.length === 0) return
  const share = Math.floor(amountCp / members.length)
  for (const m of members) {
    await sql`
      UPDATE members SET public_gold = public_gold + ${share} WHERE id = ${m.id}
    `
  }
}

// Adjust (increment/decrement) a member's gold by deltaCp copper pieces.
// Pass a negative deltaCp to subtract. Will not go below 0.
export async function adjustMemberGold(
  memberId: string,
  field: 'publicGold' | 'privateGold',
  deltaCp: number
): Promise<void> {
  const col = field === 'publicGold' ? 'public_gold' : 'private_gold'
  await sql.query(
    `UPDATE members SET ${col} = GREATEST(0, ${col} + $1) WHERE id = $2`,
    [deltaCp, memberId]
  )
}

export async function adjustPartyGold(sessionId: string, deltaCp: number): Promise<void> {
  await sql.query(
    `UPDATE sessions SET party_gold = GREATEST(0, party_gold + $1) WHERE id = $2`,
    [deltaCp, sessionId]
  )
}

// ── Member updates ────────────────────────────────────────────

export async function addMember(sessionId: string, name: string): Promise<Member> {
  const memberId = randomUUID()
  const token = randomUUID()
  const { rows } = await sql`
    INSERT INTO members (id, session_id, name, token)
    VALUES (${memberId}, ${sessionId}, ${name}, ${token})
    RETURNING *
  `
  return mapMember(rows[0])
}

export async function updateMemberName(memberId: string, name: string): Promise<boolean> {
  const { rowCount } = await sql`
    UPDATE members SET name = ${name} WHERE id = ${memberId}
  `
  return (rowCount ?? 0) > 0
}

// ── Other members' public items ───────────────────────────────

export async function getOtherMembersPublicItems(
  sessionId: string,
  excludeMemberId: string
): Promise<{ member: Member; items: Item[] }[]> {
  const allMembers = await getSessionMembers(sessionId)
  const others = allMembers.filter(m => m.id !== excludeMemberId)

  const result: { member: Member; items: Item[] }[] = []
  for (const m of others) {
    const { rows } = await sql`
      SELECT * FROM items
      WHERE owner_id = ${m.id} AND private = FALSE
      ORDER BY created_at DESC
    `
    result.push({ member: m, items: rows.map(mapItem) })
  }
  return result
}
