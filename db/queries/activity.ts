import { randomUUID } from 'crypto'
import type { ActivityEntry } from '@/types'
import { sql } from '../index'
import { mapActivity } from './mappers'

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
