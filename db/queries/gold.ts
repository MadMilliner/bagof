import { sql, connect } from '../index'

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

    if (share > 0) {
      await client.sql`
        UPDATE members SET public_gold = public_gold + ${share} WHERE session_id = ${sessionId}
      `
    }

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
