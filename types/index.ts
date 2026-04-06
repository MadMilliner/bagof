export type ItemType = 'Weapon' | 'Armor' | 'Consumable' | 'Other'

export interface Item {
  id: string
  sessionId: string
  ownerId: string | null
  name: string
  description: string
  type: ItemType
  private: boolean
  offeredToParty: boolean
  quantity: number
  createdAt: string
}

export interface Member {
  id: string
  sessionId: string
  name: string
  token: string
  publicGold: number
  privateGold: number
  createdAt: string
}

export interface Session {
  id: string
  dmToken: string
  name: string
  createdAt: string
}

export interface CreateSessionPayload {
  sessionName: string
  memberNames: string[]
}

export interface CreateSessionResponse {
  session: Session
  dmUrl: string
  memberLinks: { name: string; token: string; url: string }[]
}
