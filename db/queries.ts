import { client, migrate } from './index'
export { client }
import { randomUUID } from 'crypto'
import type { Item, Member, Session } from '@/types'

// Run migrations on first import
await migrate()

// ── Mappers ───────────────────────────────────────────────────

function mapSession(row: Record<string, any>): Session {
  return {
    id: row.id as string,
    dmToken: row.dm_token as string,
    name: row.name as string,
    createdAt: row.created_at as string,
  }
}

function mapMember(row: Record<string, any>): Member {
  return {
    id: row.id as string,
    sessionId: row.session_id as string,
    name: row.name as string,
    token: row.token as string,
    publicGold: row.public_gold as number,
    privateGold: row.private_gold as number,
    createdAt: row.created_at as string,
  }
}

function mapItem(row: Record<string, any>): Item {
  return {
    id: row.id as string,
    sessionId: row.session_id as string,
    ownerId: row.owner_id as string | null,
    name: row.name as string,
    description: row.description as string,
    type: row.type as Item['type'],
    private: Boolean(row.private),
    offeredToParty: Boolean(row.offered_to_party),
    quantity: row.quantity as number,
    createdAt: row.created_at as string,
  }
}

// ── Token resolution ──────────────────────────────────────────

export async function getMemberByToken(token: string): Promise<Member | null> {
  const result = await client.execute({
    sql: 'SELECT * FROM members WHERE token = ? LIMIT 1',
    args: [token],
  })
  return result.rows[0] ? mapMember(result.rows[0]) : null
}

export async function getDMSession(dmToken: string): Promise<Session | null> {
  const result = await client.execute({
    sql: 'SELECT * FROM sessions WHERE dm_token = ? LIMIT 1',
    args: [dmToken],
  })
  return result.rows[0] ? mapSession(result.rows[0]) : null
}

export async function getSessionById(id: string): Promise<Session | null> {
  const result = await client.execute({
    sql: 'SELECT * FROM sessions WHERE id = ? LIMIT 1',
    args: [id],
  })
  return result.rows[0] ? mapSession(result.rows[0]) : null
}

export async function getSessionMembers(sessionId: string): Promise<Member[]> {
  const result = await client.execute({
    sql: 'SELECT * FROM members WHERE session_id = ?',
    args: [sessionId],
  })
  return result.rows.map(mapMember)
}

// ── Session creation ──────────────────────────────────────────

export async function createSession(
  name: string,
  memberNames: string[]
): Promise<{ session: Session; members: Member[] }> {
  const sessionId = randomUUID()
  const dmToken = randomUUID()

  await client.execute({
    sql: 'INSERT INTO sessions (id, dm_token, name) VALUES (?, ?, ?)',
    args: [sessionId, dmToken, name],
  })

  const createdMembers: Member[] = []
  for (const memberName of memberNames) {
    const memberId = randomUUID()
    const token = randomUUID()
    await client.execute({
      sql: 'INSERT INTO members (id, session_id, name, token) VALUES (?, ?, ?, ?)',
      args: [memberId, sessionId, memberName, token],
    })
    createdMembers.push((await getMemberByToken(token))!)
  }

  return { session: (await getDMSession(dmToken))!, members: createdMembers }
}

// ── Items ─────────────────────────────────────────────────────

export async function getPartyPool(sessionId: string): Promise<Item[]> {
  const result = await client.execute({
    sql: 'SELECT * FROM items WHERE session_id = ? AND owner_id IS NULL AND private = 0 ORDER BY created_at DESC',
    args: [sessionId],
  })
  return result.rows.map(mapItem)
}

export async function getMemberItems(memberId: string): Promise<Item[]> {
  const result = await client.execute({
    sql: 'SELECT * FROM items WHERE owner_id = ? ORDER BY created_at DESC',
    args: [memberId],
  })
  return result.rows.map(mapItem)
}

export async function getAllSessionItems(sessionId: string): Promise<Item[]> {
  const result = await client.execute({
    sql: 'SELECT * FROM items WHERE session_id = ? ORDER BY created_at DESC',
    args: [sessionId],
  })
  return result.rows.map(mapItem)
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
  await client.execute({
    sql: `INSERT INTO items (id, session_id, owner_id, name, description, type, private, offered_to_party, quantity)
          VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`,
    args: [id, data.sessionId, data.ownerId, data.name, data.description, data.type, data.private ? 1 : 0, data.quantity],
  })
  const result = await client.execute({ sql: 'SELECT * FROM items WHERE id = ?', args: [id] })
  return mapItem(result.rows[0])
}

export async function claimItem(itemId: string, memberId: string): Promise<boolean> {
  const result = await client.execute({
    sql: 'UPDATE items SET owner_id = ?, offered_to_party = 0 WHERE id = ? AND owner_id IS NULL',
    args: [memberId, itemId],
  })
  return result.rowsAffected > 0
}

export async function offerItem(itemId: string, memberId: string): Promise<boolean> {
  const result = await client.execute({
    sql: 'UPDATE items SET owner_id = NULL, offered_to_party = 1, private = 0 WHERE id = ? AND owner_id = ?',
    args: [itemId, memberId],
  })
  return result.rowsAffected > 0
}

export async function updateItem(
  itemId: string,
  updates: Partial<{ name: string; description: string; type: Item['type']; private: boolean; quantity: number }>,
  ownerId?: string,
  sessionId?: string
): Promise<boolean> {
  const fields: string[] = []
  const args: any[] = []

  if (updates.name !== undefined) { fields.push('name = ?'); args.push(updates.name) }
  if (updates.description !== undefined) { fields.push('description = ?'); args.push(updates.description) }
  if (updates.type !== undefined) { fields.push('type = ?'); args.push(updates.type) }
  if (updates.private !== undefined) { fields.push('private = ?'); args.push(updates.private ? 1 : 0) }
  if (updates.quantity !== undefined) { fields.push('quantity = ?'); args.push(updates.quantity) }

  if (fields.length === 0) return false

  const whereClause = ownerId ? 'id = ? AND owner_id = ?' : 'id = ? AND session_id = ?'
  args.push(itemId, (ownerId ?? sessionId)!)

  const result = await client.execute({
    sql: `UPDATE items SET ${fields.join(', ')} WHERE ${whereClause}`,
    args,
  })
  return result.rowsAffected > 0
}

export async function deleteItem(
  itemId: string,
  ownerId?: string,
  sessionId?: string
): Promise<boolean> {
  const whereClause = ownerId ? 'id = ? AND owner_id = ?' : 'id = ? AND session_id = ?'
  const result = await client.execute({
    sql: `DELETE FROM items WHERE ${whereClause}`,
    args: [itemId, (ownerId ?? sessionId)!],
  })
  return result.rowsAffected > 0
}

export async function offerItemSplit(itemId: string, memberId: string): Promise<boolean> {
  const itemRes = await client.execute({
    sql: 'SELECT * FROM items WHERE id = ? AND owner_id = ?',
    args: [itemId, memberId],
  })
  if (!itemRes.rows[0]) return false

  const existing = itemRes.rows[0]
  const qty = existing.quantity as number

  if (qty > 1) {
    await client.execute({ sql: 'DELETE FROM items WHERE id = ?', args: [itemId] })
    for (let i = 0; i < qty; i++) {
      await client.execute({
        sql: `INSERT INTO items (id, session_id, owner_id, name, description, type, private, offered_to_party, quantity)
              VALUES (?, ?, NULL, ?, ?, ?, 0, 1, 1)`,
        args: [randomUUID(), existing.session_id, existing.name, existing.description, existing.type],
      })
    }
  } else {
    await offerItem(itemId, memberId)
  }

  return true
}

// ── Gold ──────────────────────────────────────────────────────

// All gold values stored as copper pieces (cp). 1 gp = 100 cp, 1 sp = 10 cp.

export async function splitGold(sessionId: string, amountCp: number): Promise<void> {
  const members = await getSessionMembers(sessionId)
  if (members.length === 0) return
  const share = Math.floor(amountCp / members.length)
  for (const m of members) {
    await client.execute({
      sql: 'UPDATE members SET public_gold = public_gold + ? WHERE id = ?',
      args: [share, m.id],
    })
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
  await client.execute({
    sql: `UPDATE members SET ${col} = MAX(0, ${col} + ?) WHERE id = ?`,
    args: [deltaCp, memberId],
  })
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
    const res = await client.execute({
      sql: 'SELECT * FROM items WHERE owner_id = ? AND private = 0 ORDER BY created_at DESC',
      args: [m.id],
    })
    result.push({ member: m, items: res.rows.map(mapItem) })
  }
  return result
}
