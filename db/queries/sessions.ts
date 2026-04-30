import { randomUUID } from 'crypto'
import type { Item, Member, Session } from '@/types'
import { sql } from '../index'
import { mapItem, mapMember, mapSession } from './mappers'

export async function updateSessionName(sessionId: string, name: string): Promise<boolean> {
  const { rowCount } = await sql`
    UPDATE sessions SET name = ${name} WHERE id = ${sessionId}
  `
  return (rowCount ?? 0) > 0
}

export async function touchSessionAccess(sessionId: string): Promise<void> {
  await sql`
    UPDATE sessions SET last_accessed_at = NOW() WHERE id = ${sessionId}
  `
}

export async function cleanupExpiredSessions(): Promise<number> {
  const { rowCount } = await sql`
    DELETE FROM sessions
    WHERE id IN (
      SELECT s.id FROM sessions s
      WHERE
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
        (
          COALESCE(s.last_accessed_at, s.created_at) < NOW() - INTERVAL '366 days'
        )
    )
  `
  return rowCount ?? 0
}

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
