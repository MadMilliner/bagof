export interface SavedSession {
  sessionId: string
  sessionName: string
  dmRole: string
  dmToken: string
  savedAt: string
}

const STORAGE_KEY = 'bag-of-saved-sessions'

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
