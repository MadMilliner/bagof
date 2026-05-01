/**
 * Matches db/index.ts: outside Vercel with a local Postgres URL, queries use local DB.
 * We use the same signal so server-rendered absolute URLs (e.g. internal-links) stay on localhost.
 */
export function isLocalDatabaseRuntime(): boolean {
  return process.env.VERCEL !== '1' && !!(process.env.LOCAL_POSTGRES_URL || process.env.POSTGRES_URL_LOCAL)
}

function isLikelyLocalHost(host: string): boolean {
  const h = host.split(':')[0].toLowerCase()
  return h === 'localhost' || h === '[::1]' || /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(h)
}

function normalizeOrigin(raw: string): string {
  const trimmed = raw.trim().replace(/\/$/, '')
  if (!trimmed) return ''
  try {
    const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed)
    const hostPart = trimmed.split('/')[0] ?? trimmed
    const withScheme = hasScheme
      ? trimmed
      : isLikelyLocalHost(hostPart)
        ? `http://${trimmed}`
        : `https://${trimmed}`
    const u = new URL(withScheme)
    return `${u.protocol}//${u.host}`
  } catch {
    return trimmed
  }
}

/**
 * Base URL (protocol + host, no path) for absolute links built on the server.
 * - Local DB runtime: prefers LOCAL_APP_URL / APP_URL_LOCAL, else request Host (http on localhost).
 * - Otherwise: prefers PUBLIC_APP_URL / NEXT_PUBLIC_BASE_URL, else request Host.
 */
export function resolvePublicAppOrigin(host: string | null, forwardedProto: string | null): string {
  if (isLocalDatabaseRuntime()) {
    const localApp = (process.env.LOCAL_APP_URL || process.env.APP_URL_LOCAL || '').trim()
    if (localApp) return normalizeOrigin(localApp)
    if (host) {
      const proto = forwardedProto ?? (isLikelyLocalHost(host) ? 'http' : 'https')
      return `${proto}://${host}`
    }
    return ''
  }

  const explicit = (process.env.PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || '').trim()
  if (explicit) return normalizeOrigin(explicit)

  if (!host) return ''
  const proto = forwardedProto ?? (isLikelyLocalHost(host) ? 'http' : 'https')
  return `${proto}://${host}`
}
