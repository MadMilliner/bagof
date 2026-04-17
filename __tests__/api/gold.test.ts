import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock DB queries
const mockGetDMSession = vi.fn()
const mockGetMemberByToken = vi.fn()
const mockSplitGold = vi.fn()
const mockAdjustMemberGold = vi.fn()
const mockAdjustPartyGold = vi.fn()
const mockTransferToPartyPool = vi.fn()
const mockTransferFromPartyPool = vi.fn()
const mockGetMemberById = vi.fn()
const mockLogActivity = vi.fn()

vi.mock('@/db/queries', () => ({
  getDMSession: (...args: any[]) => mockGetDMSession(...args),
  getMemberByToken: (...args: any[]) => mockGetMemberByToken(...args),
  splitGold: (...args: any[]) => mockSplitGold(...args),
  adjustMemberGold: (...args: any[]) => mockAdjustMemberGold(...args),
  adjustPartyGold: (...args: any[]) => mockAdjustPartyGold(...args),
  transferToPartyPool: (...args: any[]) => mockTransferToPartyPool(...args),
  transferFromPartyPool: (...args: any[]) => mockTransferFromPartyPool(...args),
  getMemberById: (...args: any[]) => mockGetMemberById(...args),
  logActivity: (...args: any[]) => mockLogActivity(...args),
}))

vi.mock('@/lib/rateLimit', () => ({
  checkRateLimit: () => null,
  rateLimit: () => ({ success: true, remaining: 60 }),
  getClientKey: () => 'test',
}))

import { PATCH } from '@/app/api/gold/route'

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

function makeRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/gold', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as any
}

describe('PATCH /api/gold', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetDMSession.mockResolvedValue(mockSession)
    mockGetMemberByToken.mockResolvedValue(mockMember)
    mockSplitGold.mockResolvedValue(undefined)
    mockAdjustMemberGold.mockResolvedValue(true)
    mockAdjustPartyGold.mockResolvedValue(undefined)
    mockTransferToPartyPool.mockResolvedValue(true)
    mockTransferFromPartyPool.mockResolvedValue(true)
    mockGetMemberById.mockResolvedValue(mockMember)
    mockLogActivity.mockResolvedValue(undefined)
  })

  // ── DM actions ────────────────────────────────────────────

  describe('DM: split gold', () => {
    it('splits gold with valid amountCp', async () => {
      const res = await PATCH(makeRequest({ dmToken: 'dm-token', action: 'split', amountCp: 1000 }))
      expect(res.status).toBe(200)
      expect(mockSplitGold).toHaveBeenCalledWith('session-1', 1000)
    })

    it('rejects non-finite amountCp', async () => {
      const res = await PATCH(makeRequest({ dmToken: 'dm-token', action: 'split', amountCp: Infinity }))
      expect(res.status).toBe(400)
    })

    it('rejects negative amountCp', async () => {
      const res = await PATCH(makeRequest({ dmToken: 'dm-token', action: 'split', amountCp: -5 }))
      expect(res.status).toBe(400)
    })

    it('rejects zero amountCp', async () => {
      const res = await PATCH(makeRequest({ dmToken: 'dm-token', action: 'split', amountCp: 0 }))
      expect(res.status).toBe(400)
    })

    it('rejects NaN amountCp', async () => {
      const res = await PATCH(makeRequest({ dmToken: 'dm-token', action: 'split', amountCp: NaN }))
      expect(res.status).toBe(400)
    })
  })

  describe('DM: party_adjust', () => {
    it('adjusts party gold with valid deltaCp', async () => {
      const res = await PATCH(makeRequest({ dmToken: 'dm-token', action: 'party_adjust', deltaCp: 500 }))
      expect(res.status).toBe(200)
      expect(mockAdjustPartyGold).toHaveBeenCalledWith('session-1', 500)
    })

    it('adjusts party gold with negative deltaCp (subtraction)', async () => {
      const res = await PATCH(makeRequest({ dmToken: 'dm-token', action: 'party_adjust', deltaCp: -200 }))
      expect(res.status).toBe(200)
      expect(mockAdjustPartyGold).toHaveBeenCalledWith('session-1', -200)
    })

    it('rejects non-finite deltaCp', async () => {
      const res = await PATCH(makeRequest({ dmToken: 'dm-token', action: 'party_adjust', deltaCp: 'abc' }))
      expect(res.status).toBe(400)
    })
  })

  // ── Player actions ────────────────────────────────────────

  describe('Player: adjust own gold', () => {
    it('adjusts player gold with valid deltaCp', async () => {
      const res = await PATCH(makeRequest({ token: 'member-token', action: 'adjust', deltaCp: 50, field: 'publicGold' }))
      expect(res.status).toBe(200)
      expect(mockAdjustMemberGold).toHaveBeenCalledWith('member-1', 'publicGold', 50, 'session-1')
    })

    it('rejects non-finite deltaCp', async () => {
      const res = await PATCH(makeRequest({ token: 'member-token', action: 'adjust', deltaCp: 'hello' }))
      expect(res.status).toBe(400)
    })
  })

  describe('Player: party_adjust is rejected', () => {
    it('rejects party_adjust from player token', async () => {
      const res = await PATCH(makeRequest({ token: 'member-token', action: 'party_adjust', deltaCp: 100 }))
      expect(res.status).toBe(400)
      expect(mockAdjustPartyGold).not.toHaveBeenCalled()
    })
  })

  describe('Player: transfer_to_pool', () => {
    it('transfers gold to pool with valid amountCp', async () => {
      const res = await PATCH(makeRequest({ token: 'member-token', action: 'transfer_to_pool', amountCp: 100 }))
      expect(res.status).toBe(200)
      expect(mockTransferToPartyPool).toHaveBeenCalledWith('member-1', 'session-1', 100)
    })

    it('rejects zero amountCp', async () => {
      const res = await PATCH(makeRequest({ token: 'member-token', action: 'transfer_to_pool', amountCp: 0 }))
      expect(res.status).toBe(400)
    })

    it('rejects negative amountCp', async () => {
      const res = await PATCH(makeRequest({ token: 'member-token', action: 'transfer_to_pool', amountCp: -10 }))
      expect(res.status).toBe(400)
    })

    it('returns 400 when insufficient gold', async () => {
      mockTransferToPartyPool.mockResolvedValue(false)
      const res = await PATCH(makeRequest({ token: 'member-token', action: 'transfer_to_pool', amountCp: 9999 }))
      expect(res.status).toBe(400)
    })
  })

  describe('Player: transfer_from_pool', () => {
    it('transfers gold from pool with valid amountCp', async () => {
      const res = await PATCH(makeRequest({ token: 'member-token', action: 'transfer_from_pool', amountCp: 50 }))
      expect(res.status).toBe(200)
      expect(mockTransferFromPartyPool).toHaveBeenCalledWith('member-1', 'session-1', 50)
    })

    it('returns 400 when insufficient party gold', async () => {
      mockTransferFromPartyPool.mockResolvedValue(false)
      const res = await PATCH(makeRequest({ token: 'member-token', action: 'transfer_from_pool', amountCp: 9999 }))
      expect(res.status).toBe(400)
    })
  })

  // ── Auth ──────────────────────────────────────────────────

  describe('Auth', () => {
    it('rejects invalid DM token', async () => {
      mockGetDMSession.mockResolvedValue(null)
      const res = await PATCH(makeRequest({ dmToken: 'bad-token', action: 'split', amountCp: 100 }))
      expect(res.status).toBe(401)
    })

    it('rejects invalid player token', async () => {
      mockGetMemberByToken.mockResolvedValue(null)
      const res = await PATCH(makeRequest({ token: 'bad-token', action: 'adjust', deltaCp: 10 }))
      expect(res.status).toBe(401)
    })

    it('rejects unknown action', async () => {
      const res = await PATCH(makeRequest({ dmToken: 'dm-token', action: 'nonexistent' }))
      expect(res.status).toBe(400)
    })
  })
})
