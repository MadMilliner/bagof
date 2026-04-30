import { randomUUID } from 'crypto'
import type { Item } from '@/types'
import { connect, sql } from '../index'
import { mapItem } from './mappers'

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
      await client.sql`
        UPDATE items
        SET owner_id = NULL, offered_to_party = TRUE, private = FALSE, quantity = 1
        WHERE id = ${itemId}
      `
      const { rows: updated } = await client.sql`SELECT * FROM items WHERE id = ${itemId}`
      newItems.push(mapItem(updated[0]))

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
