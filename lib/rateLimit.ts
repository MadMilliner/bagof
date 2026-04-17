// Simple in-memory rate limiter.
// NOTE: On Vercel serverless, state resets on cold starts and is not shared
// across instances. This provides basic protection within a single instance.
// For production-grade rate limiting, use Upstash Redis or similar.

const store = new Map<string, { count: number; resetTime: number }>()

// Clean up expired entries periodically (every 60s).
// NOTE: This only helps during long-running dev server sessions.
// On Vercel serverless, each invocation gets a fresh module scope,
// so the Map resets naturally on cold starts anyway.
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of store) {
      if (now > entry.resetTime) store.delete(key)
    }
  }, 60_000)
}

export interface RateLimitResult {
  success: boolean
  remaining: number
  retryAfterMs?: number
}

/**
 * Check if a request should be rate-limited.
 * @param key   Identifier (IP, token, etc.)
 * @param limit Max requests allowed in the window
 * @param windowMs Window duration in milliseconds
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetTime) {
    store.set(key, { count: 1, resetTime: now + windowMs })
    return { success: true, remaining: limit - 1 }
  }

  if (entry.count >= limit) {
    return { success: false, remaining: 0, retryAfterMs: entry.resetTime - now }
  }

  entry.count++
  return { success: true, remaining: limit - entry.count }
}

/** Extract a client identifier from a NextRequest. */
export function getClientKey(req: Request): string {
  // x-forwarded-for is set by Vercel / most reverse proxies
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  const realIp = req.headers.get('x-real-ip')
  if (realIp) return realIp
  return 'unknown'
}

/** Convenience: check rate limit and return a 429 Response if exceeded. */
export function checkRateLimit(
  req: Request,
  limit: number = 60,
  windowMs: number = 60_000,
  keyOverride?: string
): Response | null {
  const key = keyOverride ?? getClientKey(req)
  const result = rateLimit(key, limit, windowMs)
  if (!result.success) {
    return new Response(
      JSON.stringify({ error: 'Too many requests. Slow down.' }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          ...(result.retryAfterMs ? { 'Retry-After': String(Math.ceil(result.retryAfterMs / 1000)) } : {}),
        },
      }
    )
  }
  return null // Not rate-limited
}
