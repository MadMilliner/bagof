import type { Item, Member } from '@/types'
import { sql } from '../index'
import { mapItem, mapMember } from './mappers'

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
