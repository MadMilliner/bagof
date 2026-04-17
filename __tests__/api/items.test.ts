import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock DB queries
const mockGetDMSession = vi.fn()
const mockGetMemberByToken = vi.fn()
const mockGetItemById = vi.fn()
const mockAddItem = vi.fn()
const mockClaimItem = vi.fn()
const mockOfferItem = vi.fn()
const mockOfferItemSplit = vi.fn()
const mockUpdateItem = vi.fn()
const mockDeleteItem = vi.fn()
const mockLogActivity = vi.fn()

vi.mock('@/db/queries', () => ({
  getDMSession: (...args: any[]) => mockGetDMSession(...args),
  getMemberByToken: (...args: any[]) => mockGetMemberByToken(...args),
  getItemById: (...args: any[]) => mockGetItemById(...args),
  addItem: (...args: any[]) => mockAddItem(...args),
  claimItem: (...args: any[]) => mockClaimItem(...args),
  offerItem: (...args: any[]) => mockOfferItem(...args),
  offerItemSplit: (...args: any[]) => mockOfferItemSplit(...args),
  updateItem: (...args: any[]) => mockUpdateItem(...args),
  deleteItem: (...args: any[]) => mockDeleteItem(...args),
  logActivity: (...args: any[]) => mockLogActivity(...args),
  MAX_ITEM_QUANTITY: 100,
}))

vi.mock('@/lib/rateLimit', () => ({
  checkRateLimit: () => null,
  rateLimit: () => ({ success: true, remaining: 60 }),
  getClientKey: () => 'test',
}))

import { POST, PATCH } from '@/app/api/items/route'

const mockSession = {
  id: 'session-1',
  dmToken: 'dm-token',
  name: 'Test Campaign',
  currencyType: 'dnd' as const,
  dmRole: 'Dungeon Master',
  partyGold: 0,
  createdAt: '2024-01-01',
  lastAccessedAt: null,
}

const mockMember = {
  id: 'member-1',
  sessionId: 'session-1',
  name: 'Aldric',
  token: 'member-token',
  publicGold: 500,
  privateGold: 100,
  createdAt: '2024-01-01',
}

function makePatchRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/items', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as any
}

function makePostRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as any
}

describe('PATCH /api/items', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetDMSession.mockResolvedValue(mockSession)
    mockGetMemberByToken.mockResolvedValue(mockMember)
    mockUpdateItem.mockResolvedValue(true)
    mockClaimItem.mockResolvedValue(true)
    mockOfferItemSplit.mockResolvedValue([{ id: 'item-1', name: 'Sword' }])
    mockGetItemById.mockResolvedValue({ id: 'item-1', name: 'Sword' })
    mockLogActivity.mockResolvedValue(undefined)
  })

  // ── Update validation ─────────────────────────────────────

  describe('action: update — field validation', () => {
    it('accepts valid updates', async () => {
      const res = await PATCH(makePatchRequest({
        token: 'member-token',
        itemId: 'item-1',
        action: 'update',
        updates: { name: 'New Name', description: 'New desc', type: 'Weapon' },
      }))
      expect(res.status).toBe(200)
    })

    it('rejects empty updates object', async () => {
      const res = await PATCH(makePatchRequest({
        token: 'member-token',
        itemId: 'item-1',
        action: 'update',
        updates: {},
      }))
      expect(res.status).toBe(400)
    })

    it('rejects missing updates object', async () => {
      const res = await PATCH(makePatchRequest({
        token: 'member-token',
        itemId: 'item-1',
        action: 'update',
      }))
      expect(res.status).toBe(400)
    })

    it('rejects non-string name', async () => {
      const res = await PATCH(makePatchRequest({
        token: 'member-token',
        itemId: 'item-1',
        action: 'update',
        updates: { name: 123 },
      }))
      expect(res.status).toBe(400)
    })

    it('rejects empty/whitespace-only name', async () => {
      const res = await PATCH(makePatchRequest({
        token: 'member-token',
        itemId: 'item-1',
        action: 'update',
        updates: { name: '   ' },
      }))
      expect(res.status).toBe(400)
    })

    it('rejects non-string description', async () => {
      const res = await PATCH(makePatchRequest({
        token: 'member-token',
        itemId: 'item-1',
        action: 'update',
        updates: { description: 42 },
      }))
      expect(res.status).toBe(400)
    })

    it('rejects invalid type', async () => {
      const res = await PATCH(makePatchRequest({
        token: 'member-token',
        itemId: 'item-1',
        action: 'update',
        updates: { type: 'InvalidType' },
      }))
      expect(res.status).toBe(400)
    })

    it('accepts all valid types', async () => {
      for (const type of ['Weapon', 'Armor', 'Consumable', 'Other']) {
        vi.clearAllMocks()
        mockGetMemberByToken.mockResolvedValue(mockMember)
        mockUpdateItem.mockResolvedValue(true)
        mockLogActivity.mockResolvedValue(undefined)

        const res = await PATCH(makePatchRequest({
          token: 'member-token',
          itemId: 'item-1',
          action: 'update',
          updates: { type },
        }))
        expect(res.status).toBe(200)
      }
    })

    it('rejects non-boolean private', async () => {
      const res = await PATCH(makePatchRequest({
        token: 'member-token',
        itemId: 'item-1',
        action: 'update',
        updates: { private: 'yes' },
      }))
      expect(res.status).toBe(400)
    })

    it('rejects quantity below 1', async () => {
      const res = await PATCH(makePatchRequest({
        token: 'member-token',
        itemId: 'item-1',
        action: 'update',
        updates: { quantity: 0 },
      }))
      expect(res.status).toBe(400)
    })

    it('rejects quantity above MAX_ITEM_QUANTITY (100)', async () => {
      const res = await PATCH(makePatchRequest({
        token: 'member-token',
        itemId: 'item-1',
        action: 'update',
        updates: { quantity: 101 },
      }))
      expect(res.status).toBe(400)
    })

    it('accepts quantity at boundary (1 and 100)', async () => {
      for (const quantity of [1, 100]) {
        vi.clearAllMocks()
        mockGetMemberByToken.mockResolvedValue(mockMember)
        mockUpdateItem.mockResolvedValue(true)
        mockLogActivity.mockResolvedValue(undefined)

        const res = await PATCH(makePatchRequest({
          token: 'member-token',
          itemId: 'item-1',
          action: 'update',
          updates: { quantity },
        }))
        expect(res.status).toBe(200)
      }
    })

    it('rejects non-finite quantity', async () => {
      const res = await PATCH(makePatchRequest({
        token: 'member-token',
        itemId: 'item-1',
        action: 'update',
        updates: { quantity: Infinity },
      }))
      expect(res.status).toBe(400)
    })

    it('truncates name to 200 chars', async () => {
      const longName = 'A'.repeat(250)
      const res = await PATCH(makePatchRequest({
        token: 'member-token',
        itemId: 'item-1',
        action: 'update',
        updates: { name: longName },
      }))
      expect(res.status).toBe(200)
      // Verify the sanitized name was trimmed
      const call = mockUpdateItem.mock.calls[0]
      expect(call[1].name.length).toBeLessThanOrEqual(200)
    })

    it('truncates description to 2000 chars', async () => {
      const longDesc = 'X'.repeat(2500)
      const res = await PATCH(makePatchRequest({
        token: 'member-token',
        itemId: 'item-1',
        action: 'update',
        updates: { description: longDesc },
      }))
      expect(res.status).toBe(200)
      const call = mockUpdateItem.mock.calls[0]
      expect(call[1].description.length).toBeLessThanOrEqual(2000)
    })

    it('accepts boolean private', async () => {
      const res = await PATCH(makePatchRequest({
        token: 'member-token',
        itemId: 'item-1',
        action: 'update',
        updates: { private: true },
      }))
      expect(res.status).toBe(200)
    })
  })

  // ── Auth ──────────────────────────────────────────────────

  describe('Auth', () => {
    it('rejects invalid DM token', async () => {
      mockGetDMSession.mockResolvedValue(null)
      const res = await PATCH(makePatchRequest({
        dmToken: 'bad-token',
        itemId: 'item-1',
        action: 'update',
        updates: { name: 'Test' },
      }))
      expect(res.status).toBe(401)
    })

    it('rejects invalid player token', async () => {
      mockGetMemberByToken.mockResolvedValue(null)
      const res = await PATCH(makePatchRequest({
        token: 'bad-token',
        itemId: 'item-1',
        action: 'update',
        updates: { name: 'Test' },
      }))
      expect(res.status).toBe(401)
    })

    it('rejects unknown action', async () => {
      const res = await PATCH(makePatchRequest({
        token: 'member-token',
        itemId: 'item-1',
        action: 'steal',
      }))
      expect(res.status).toBe(400)
    })

    it('rejects claim from DM (no memberId)', async () => {
      const res = await PATCH(makePatchRequest({
        dmToken: 'dm-token',
        itemId: 'item-1',
        action: 'claim',
      }))
      expect(res.status).toBe(403)
    })

    it('rejects offer from DM (no memberId)', async () => {
      const res = await PATCH(makePatchRequest({
        dmToken: 'dm-token',
        itemId: 'item-1',
        action: 'offer',
      }))
      expect(res.status).toBe(403)
    })
  })
})

// ── POST /api/items ──────────────────────────────────────────

describe('POST /api/items', () => {
  const mockItem = {
    id: 'item-new',
    sessionId: 'session-1',
    ownerId: null as string | null,
    name: 'Sword',
    description: 'A sharp blade',
    type: 'Weapon',
    private: false,
    offeredToParty: false,
    quantity: 1,
    createdAt: '2024-01-01',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetDMSession.mockResolvedValue(mockSession)
    mockGetMemberByToken.mockResolvedValue(mockMember)
    mockAddItem.mockResolvedValue({ ...mockItem })
    mockLogActivity.mockResolvedValue(undefined)
  })

  it('adds a single item as DM to pool', async () => {
    const res = await POST(makePostRequest({
      isDM: true,
      dmToken: 'dm-token',
      item: { name: 'Sword', description: 'A sharp blade', type: 'Weapon', quantity: 1 },
    }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.item).toBeDefined()
  })

  it('adds item as player to personal inventory', async () => {
    const res = await POST(makePostRequest({
      token: 'member-token',
      item: { name: 'Potion', description: 'Heals 2d4+2', type: 'Consumable', quantity: 1, private: false },
    }))
    expect(res.status).toBe(200)
    expect(mockAddItem).toHaveBeenCalledWith(
      expect.objectContaining({ ownerId: 'member-1', name: 'Potion' })
    )
  })

  it('clamps quantity to MAX_ITEM_QUANTITY (100)', async () => {
    const res = await POST(makePostRequest({
      isDM: true,
      dmToken: 'dm-token',
      item: { name: 'Arrows', description: '', type: 'Other', quantity: 200 },
    }))
    expect(res.status).toBe(200)
    // DM pool with qty > 1 creates individual records
    // Should have been clamped to 100, so addItem called 100 times
    expect(mockAddItem).toHaveBeenCalledTimes(100)
  })

  it('defaults quantity to 1 when not provided', async () => {
    const res = await POST(makePostRequest({
      token: 'member-token',
      item: { name: 'Gem', description: '', type: 'Other' },
    }))
    expect(res.status).toBe(200)
    expect(mockAddItem).toHaveBeenCalledWith(
      expect.objectContaining({ quantity: 1 })
    )
  })

  it('defaults type to Other when not provided', async () => {
    const res = await POST(makePostRequest({
      token: 'member-token',
      item: { name: 'Gem', description: '', quantity: 1 },
    }))
    expect(res.status).toBe(200)
    expect(mockAddItem).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'Other' })
    )
  })

  it('splits pool items with qty > 1 into individual records', async () => {
    const res = await POST(makePostRequest({
      isDM: true,
      dmToken: 'dm-token',
      item: { name: 'Arrow', description: '', type: 'Other', quantity: 3 },
    }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.items).toHaveLength(3)
    expect(mockAddItem).toHaveBeenCalledTimes(3)
    // Each should have quantity 1
    for (const call of mockAddItem.mock.calls) {
      expect(call[0].quantity).toBe(1)
    }
  })

  it('keeps player stack quantity intact (no splitting)', async () => {
    const res = await POST(makePostRequest({
      token: 'member-token',
      item: { name: 'Arrows', description: '', type: 'Other', quantity: 20, private: false },
    }))
    expect(res.status).toBe(200)
    // Player items are NOT split — quantity is preserved as a stack
    expect(mockAddItem).toHaveBeenCalledTimes(1)
    expect(mockAddItem).toHaveBeenCalledWith(
      expect.objectContaining({ quantity: 20, ownerId: 'member-1' })
    )
  })

  it('rejects request with no auth token', async () => {
    const res = await POST(makePostRequest({
      item: { name: 'Sword', description: '', type: 'Weapon', quantity: 1 },
    }))
    expect(res.status).toBe(401)
  })

  it('rejects invalid DM token', async () => {
    mockGetDMSession.mockResolvedValue(null)
    const res = await POST(makePostRequest({
      isDM: true,
      dmToken: 'bad-token',
      item: { name: 'Sword', description: '', type: 'Weapon', quantity: 1 },
    }))
    expect(res.status).toBe(401)
  })

  it('rejects invalid player token', async () => {
    mockGetMemberByToken.mockResolvedValue(null)
    const res = await POST(makePostRequest({
      token: 'bad-token',
      item: { name: 'Sword', description: '', type: 'Weapon', quantity: 1 },
    }))
    expect(res.status).toBe(401)
  })
})
