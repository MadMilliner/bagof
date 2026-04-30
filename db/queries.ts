import { sql, connect, migrate } from './index'
import { randomUUID } from 'crypto'
import type { Item, Member, Session, ActivityEntry } from '@/types'

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
    lastAccessedAt: row.last_accessed_at ?? null,
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

// ── Single-record lookups (for activity logging) ──────────────

export async function getItemById(itemId: string): Promise<Item | null> {
  const { rows } = await sql`
    SELECT * FROM items WHERE id = ${itemId} LIMIT 1
  `
  return rows[0] ? mapItem(rows[0]) : null
}

export async function getMemberById(memberId: string): Promise<Member | null> {
  const { rows } = await sql`
    SELECT * FROM members WHERE id = ${memberId} LIMIT 1
  `
  return rows[0] ? mapMember(rows[0]) : null
}

// ── Session updates ────────────────────────────────────────

export async function updateSessionName(sessionId: string, name: string): Promise<boolean> {
  const { rowCount } = await sql`
    UPDATE sessions SET name = ${name} WHERE id = ${sessionId}
  `
  return (rowCount ?? 0) > 0
}

// ── Session access tracking (for cleanup) ────────────────────

export async function touchSessionAccess(sessionId: string): Promise<void> {
  await sql`
    UPDATE sessions SET last_accessed_at = NOW() WHERE id = ${sessionId}
  `
}

// Delete sessions that are expired based on two independent criteria:
// 1. Never-used: session is >31 days old AND has no data (items, activity_log entries,
//    or members beyond the initial ones created at session creation). Catches sessions
//    that were created but never actually played.
// 2. Long-dormant: session hasn't been accessed in 366+ days.
// Returns the number of deleted sessions.
export async function cleanupExpiredSessions(): Promise<number> {
  const { rowCount } = await sql`
    DELETE FROM sessions
    WHERE id IN (
      SELECT s.id FROM sessions s
      WHERE
        -- Criterion 1: never-used session (>31 days old with no meaningful data)
        (
          s.created_at < NOW() - INTERVAL '31 days'
          AND NOT EXISTS (
            SELECT 1 FROM items i
            WHERE i.session_id = s.id
          )
          AND NOT EXISTS (
            SELECT 1 FROM activity_log a
            WHERE a.session_id = s.id
            AND a.action != 'session_create'
          )
          AND NOT EXISTS (
            SELECT 1 FROM members m
            WHERE m.session_id = s.id
            AND m.created_at > s.created_at + INTERVAL '1 second'
          )
        )
      OR
        -- Criterion 2: not accessed in 366+ days (long-dormant)
        -- COALESCE falls back to created_at for sessions predating this feature
        (
          COALESCE(s.last_accessed_at, s.created_at) < NOW() - INTERVAL '366 days'
        )
    )
  `
  return rowCount ?? 0
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

export async function getAllSessionsWithMembers(): Promise<Array<{ session: Session; members: Member[] }>> {
  const [sessionsRes, membersRes] = await Promise.all([
    sql`SELECT * FROM sessions ORDER BY created_at DESC`,
    sql`SELECT * FROM members ORDER BY created_at ASC`,
  ])

  const membersBySessionId = new Map<string, Member[]>()
  for (const row of membersRes.rows) {
    const member = mapMember(row)
    const existing = membersBySessionId.get(member.sessionId)
    if (existing) {
      existing.push(member)
    } else {
      membersBySessionId.set(member.sessionId, [member])
    }
  }

  return sessionsRes.rows.map((row) => {
    const session = mapSession(row)
    return {
      session,
      members: membersBySessionId.get(session.id) ?? [],
    }
  })
}

export const INTERNAL_LINKS_PAGE_SIZE = 10

/** Paginated sessions (newest first) with members for each session on this page only. */
export async function getSessionsWithMembersPage(
  page: number,
  pageSize: number = INTERNAL_LINKS_PAGE_SIZE
): Promise<{
  rows: Array<{ session: Session; members: Member[] }>
  total: number
  page: number
  pageSize: number
}> {
  const raw = Number.isFinite(page) ? Math.floor(page) : 1
  const requestedPage = raw >= 1 ? raw : 1

  const { rows: countRows } = await sql`SELECT COUNT(*)::int AS n FROM sessions`
  const total = countRows[0]?.n ?? 0
  const totalPages = total === 0 ? 1 : Math.ceil(total / pageSize)
  const effectivePage = Math.min(requestedPage, totalPages)
  const offset = (effectivePage - 1) * pageSize

  const { rows: pageSessionRows } = await sql`
    SELECT * FROM sessions
    ORDER BY created_at DESC
    LIMIT ${pageSize}
    OFFSET ${offset}
  `

  if (pageSessionRows.length === 0) {
    return { rows: [], total, page: effectivePage, pageSize }
  }

  const { rows: memberRows } = await sql`
    SELECT m.* FROM members m
    WHERE m.session_id IN (
      SELECT s.id FROM sessions s
      ORDER BY s.created_at DESC
      LIMIT ${pageSize}
      OFFSET ${offset}
    )
    ORDER BY m.created_at ASC
  `

  const membersBySessionId = new Map<string, Member[]>()
  for (const row of memberRows) {
    const member = mapMember(row)
    const existing = membersBySessionId.get(member.sessionId)
    if (existing) {
      existing.push(member)
    } else {
      membersBySessionId.set(member.sessionId, [member])
    }
  }

  const rows = pageSessionRows.map((row) => {
    const session = mapSession(row)
    return {
      session,
      members: membersBySessionId.get(session.id) ?? [],
    }
  })

  return { rows, total, page: effectivePage, pageSize }
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

export async function claimItem(itemId: string, memberId: string, sessionId: string): Promise<boolean> {
  const { rowCount } = await sql`
    UPDATE items
    SET owner_id = ${memberId}, offered_to_party = FALSE
    WHERE id = ${itemId} AND owner_id IS NULL AND session_id = ${sessionId}
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

export const MAX_ITEM_QUANTITY = 100

export async function offerItemSplit(itemId: string, memberId: string): Promise<Item[] | null> {
  const client = await connect()
  try {
    await client.sql`BEGIN`

    const { rows } = await client.sql`
      SELECT * FROM items WHERE id = ${itemId} AND owner_id = ${memberId} FOR UPDATE
    `
    if (!rows[0]) {
      await client.sql`ROLLBACK`
      return null
    }

    const existing = rows[0]
    const qty = Math.min(existing.quantity as number, MAX_ITEM_QUANTITY)
    const newItems: Item[] = []

    if (qty > 1) {
      // Update the original item: move to party pool
      await client.sql`
        UPDATE items
        SET owner_id = NULL, offered_to_party = TRUE, private = FALSE, quantity = 1
        WHERE id = ${itemId}
      `
      const { rows: updated } = await client.sql`SELECT * FROM items WHERE id = ${itemId}`
      newItems.push(mapItem(updated[0]))

      // Insert remaining copies
      for (let i = 1; i < qty; i++) {
        const newId = randomUUID()
        const { rows: inserted } = await client.sql`
          INSERT INTO items (id, session_id, owner_id, name, description, type, private, offered_to_party, quantity)
          VALUES (${newId}, ${existing.session_id}, NULL, ${existing.name}, ${existing.description}, ${existing.type}, FALSE, TRUE, 1)
          RETURNING *
        `
        newItems.push(mapItem(inserted[0]))
      }
    } else {
      // Single item: just move to pool (using client.sql directly, not offerItem(),
      // because offerItem() uses the global sql pool and would escape this transaction)
      await client.sql`
        UPDATE items
        SET owner_id = NULL, offered_to_party = TRUE, private = FALSE
        WHERE id = ${itemId} AND owner_id = ${memberId}
      `
      const { rows: updated } = await client.sql`SELECT * FROM items WHERE id = ${itemId}`
      newItems.push(mapItem(updated[0]))
    }

    await client.sql`COMMIT`
    return newItems
  } catch (err) {
    await client.sql`ROLLBACK`.catch(() => {})
    throw err
  } finally {
    client.release()
  }
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
  const client = await connect()
  try {
    await client.sql`BEGIN`

    const { rows } = await client.sql`
      SELECT id FROM members WHERE session_id = ${sessionId} ORDER BY created_at ASC
    `
    if (rows.length === 0) {
      await client.sql`ROLLBACK`
      return
    }

    const share = Math.floor(amountCp / rows.length)
    const remainder = amountCp % rows.length

    // Apply equal share to all members first.
    if (share > 0) {
      await client.sql`
        UPDATE members SET public_gold = public_gold + ${share} WHERE session_id = ${sessionId}
      `
    }

    // Give any leftover cp to one random member so no money is lost.
    if (remainder > 0) {
      const randomMember = rows[Math.floor(Math.random() * rows.length)]
      await client.sql`
        UPDATE members SET public_gold = public_gold + ${remainder} WHERE id = ${randomMember.id}
      `
    }

    await client.sql`COMMIT`
  } catch (err) {
    await client.sql`ROLLBACK`.catch(() => {})
    throw err
  } finally {
    client.release()
  }
}

// Adjust (increment/decrement) a member's gold by deltaCp copper pieces.
// Pass a negative deltaCp to subtract. Will not go below 0.
// If sessionId is provided, the update is scoped to that session (prevents cross-session IDOR).
// Returns true if the row was updated, false if not found (wrong session).
export async function adjustMemberGold(
  memberId: string,
  field: 'publicGold' | 'privateGold',
  deltaCp: number,
  sessionId: string
): Promise<boolean> {
  const col = field === 'publicGold' ? 'public_gold' : 'private_gold'
  const { rowCount } = await sql.query(
    `UPDATE members SET ${col} = GREATEST(0, ${col} + $1) WHERE id = $2 AND session_id = $3`,
    [deltaCp, memberId, sessionId]
  )
  return (rowCount ?? 0) > 0
}

export async function adjustPartyGold(sessionId: string, deltaCp: number): Promise<void> {
  await sql.query(
    `UPDATE sessions SET party_gold = GREATEST(0, party_gold + $1) WHERE id = $2`,
    [deltaCp, sessionId]
  )
}

// Transfer gold from a member to the party pool atomically.
// Uses public gold first. If public gold is empty, it uses private gold.
// Returns true on success.
export async function transferToPartyPool(memberId: string, sessionId: string, amountCp: number): Promise<boolean> {
  const { rowCount } = await sql`
    WITH deduct_public AS (
      UPDATE members SET public_gold = public_gold - ${amountCp}
      WHERE id = ${memberId} AND session_id = ${sessionId} AND public_gold >= ${amountCp}
      RETURNING id
    ),
    deduct_private AS (
      UPDATE members SET private_gold = private_gold - ${amountCp}
      WHERE id = ${memberId}
        AND session_id = ${sessionId}
        AND public_gold = 0
        AND private_gold >= ${amountCp}
        AND NOT EXISTS (SELECT 1 FROM deduct_public)
      RETURNING id
    ),
    moved AS (
      SELECT id FROM deduct_public
      UNION ALL
      SELECT id FROM deduct_private
    )
    UPDATE sessions SET party_gold = party_gold + ${amountCp}
    WHERE id = ${sessionId} AND EXISTS (SELECT 1 FROM moved)
  `
  return (rowCount ?? 0) > 0
}

// Transfer gold from the party pool to a member's public gold atomically.
// Only succeeds if the party pool has enough gold. Returns true on success.
export async function transferFromPartyPool(memberId: string, sessionId: string, amountCp: number): Promise<boolean> {
  const { rowCount } = await sql`
    WITH deduct AS (
      UPDATE sessions SET party_gold = party_gold - ${amountCp}
      WHERE id = ${sessionId} AND party_gold >= ${amountCp}
      RETURNING id
    )
    UPDATE members SET public_gold = public_gold + ${amountCp}
    WHERE id = ${memberId} AND session_id = ${sessionId} AND EXISTS (SELECT 1 FROM deduct)
  `
  return (rowCount ?? 0) > 0
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

export async function deleteSessionById(sessionId: string): Promise<boolean> {
  const { rowCount } = await sql`
    DELETE FROM sessions WHERE id = ${sessionId}
  `
  return (rowCount ?? 0) > 0
}

export async function deleteMemberById(memberId: string): Promise<boolean> {
  const { rowCount } = await sql`
    DELETE FROM members WHERE id = ${memberId}
  `
  return (rowCount ?? 0) > 0
}

// ── Activity log ────────────────────────────────────────────

function mapActivity(row: Record<string, any>): ActivityEntry {
  return {
    id: row.id,
    sessionId: row.session_id,
    memberId: row.member_id,
    actorName: row.actor_name,
    action: row.action,
    details: row.details,
    createdAt: row.created_at,
  }
}

export async function logActivity(
  sessionId: string,
  memberId: string | null,
  actorName: string,
  action: string,
  details: string = ''
): Promise<void> {
  const id = randomUUID()
  await sql`
    INSERT INTO activity_log (id, session_id, member_id, actor_name, action, details)
    VALUES (${id}, ${sessionId}, ${memberId}, ${actorName}, ${action}, ${details})
  `
}

export async function getSessionActivity(
  sessionId: string,
  limit: number = 50
): Promise<ActivityEntry[]> {
  const { rows } = await sql`
    SELECT * FROM activity_log
    WHERE session_id = ${sessionId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `
  return rows.map(mapActivity)
}

// ── Other members' public items ───────────────────────────────

export async function getOtherMembersPublicItems(
  sessionId: string,
  excludeMemberId: string
): Promise<{ member: Member; items: Item[] }[]> {
  const allMembers = await getSessionMembers(sessionId)
  const others = allMembers.filter(m => m.id !== excludeMemberId)
  if (others.length === 0) return []

  const { rows } = await sql`
    SELECT * FROM items
    WHERE session_id = ${sessionId}
      AND owner_id IS NOT NULL
      AND owner_id != ${excludeMemberId}
      AND private = FALSE
    ORDER BY created_at DESC
  `

  const itemsByOwner = new Map<string, Item[]>()
  for (const row of rows) {
    const item = mapItem(row)
    if (!item.ownerId) continue
    const existing = itemsByOwner.get(item.ownerId)
    if (existing) {
      existing.push(item)
    } else {
      itemsByOwner.set(item.ownerId, [item])
    }
  }

  return others.map(member => ({
    member,
    items: itemsByOwner.get(member.id) ?? [],
  }))
}
