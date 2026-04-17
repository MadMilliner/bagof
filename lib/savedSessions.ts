export interface SavedSession {
  sessionId: string
  sessionName: string
  dmRole: string
  dmToken: string
  savedAt: string
}

export interface SavedPlayerLink {
  memberId: string
  sessionId: string
  sessionName: string
  memberName: string
  memberToken: string
  dmRole: string
  savedAt: string
}

const STORAGE_KEY = 'bag-of-saved-sessions'
const PLAYER_STORAGE_KEY = 'bag-of-saved-players'

export function getSavedSessions(): SavedSession[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
  } catch {
    return []
  }
}

export function saveSession(session: SavedSession): void {
  const existing = getSavedSessions()
  // Deduplicate by sessionId — update entry if it already exists
  const filtered = existing.filter(s => s.sessionId !== session.sessionId)
  const updated = [session, ...filtered]
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
}

export function removeSession(sessionId: string): void {
  const existing = getSavedSessions()
  const updated = existing.filter(s => s.sessionId !== sessionId)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
}

// ── Player links ─────────────────────────────────────────────

export function getSavedPlayerLinks(): SavedPlayerLink[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(PLAYER_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
  } catch {
    return []
  }
}

export function savePlayerLink(link: SavedPlayerLink): void {
  const existing = getSavedPlayerLinks()
  // Deduplicate by memberId — update entry if it already exists
  const filtered = existing.filter(l => l.memberId !== link.memberId)
  const updated = [link, ...filtered]
  localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(updated))
}

export function removePlayerLink(memberId: string): void {
  const existing = getSavedPlayerLinks()
  const updated = existing.filter(l => l.memberId !== memberId)
  localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(updated))
}
