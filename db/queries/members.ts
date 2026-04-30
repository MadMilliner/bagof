import { randomUUID } from 'crypto'
import type { Member } from '@/types'
import { sql } from '../index'
import { mapMember } from './mappers'

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
