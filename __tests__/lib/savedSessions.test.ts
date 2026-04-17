import { describe, it, expect, beforeEach } from 'vitest'
import { saveSession, getSavedSessions, removeSession, type SavedSession } from '@/lib/savedSessions'

// Mock localStorage
const store: Record<string, string> = {}
const localStorageMock = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value },
  removeItem: (key: string) => { delete store[key] },
  clear: () => Object.keys(store).forEach(k => delete store[k]),
  get length() { return Object.keys(store).length },
  key: (i: number) => Object.keys(store)[i] ?? null,
}

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock })

describe('savedSessions', () => {
  beforeEach(() => {
    localStorageMock.clear()
  })

  const mockSession: SavedSession = {
    sessionId: 'test-session-1',
    sessionName: 'Test Campaign',
    dmRole: 'Dungeon Master',
    dmToken: 'dm-token-123',
    savedAt: '2024-01-01T00:00:00.000Z',
  }

  it('saves and retrieves sessions', () => {
    saveSession(mockSession)
    const sessions = getSavedSessions()
    expect(sessions).toHaveLength(1)
    expect(sessions[0].sessionId).toBe('test-session-1')
    expect(sessions[0].sessionName).toBe('Test Campaign')
  })

  it('prepends new sessions (most recent first)', () => {
    saveSession(mockSession)
    const second: SavedSession = {
      sessionId: 'test-session-2',
      sessionName: 'Another Campaign',
      dmRole: 'Referee',
      dmToken: 'dm-token-456',
      savedAt: '2024-01-02T00:00:00.000Z',
    }
    saveSession(second)
    const sessions = getSavedSessions()
    expect(sessions).toHaveLength(2)
    expect(sessions[0].sessionId).toBe('test-session-2')
  })

  it('deduplicates by sessionId', () => {
    saveSession(mockSession)
    const updated: SavedSession = {
      ...mockSession,
      sessionName: 'Updated Name',
      savedAt: '2024-01-03T00:00:00.000Z',
    }
    saveSession(updated)
    const sessions = getSavedSessions()
    expect(sessions).toHaveLength(1)
    expect(sessions[0].sessionName).toBe('Updated Name')
  })

  it('removes a session by ID', () => {
    saveSession(mockSession)
    removeSession('test-session-1')
    const sessions = getSavedSessions()
    expect(sessions).toHaveLength(0)
  })

  it('returns empty array when no sessions saved', () => {
    const sessions = getSavedSessions()
    expect(sessions).toEqual([])
  })
})
