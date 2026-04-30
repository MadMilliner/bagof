import type { ActivityEntry, Item, Member, Session } from '@/types'

export function mapSession(row: Record<string, any>): Session {
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

export function mapMember(row: Record<string, any>): Member {
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

export function mapItem(row: Record<string, any>): Item {
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

export function mapActivity(row: Record<string, any>): ActivityEntry {
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
