import { describe, it, expect, beforeEach } from 'vitest'
import { rateLimit, getClientKey } from '@/lib/rateLimit'

describe('rateLimit', () => {
  it('allows requests within the limit', () => {
    const result = rateLimit('test-key', 5, 60_000)
    expect(result.success).toBe(true)
    expect(result.remaining).toBe(4)
  })

  it('counts down remaining requests', () => {
    rateLimit('countdown', 3, 60_000)
    rateLimit('countdown', 3, 60_000)
    const result = rateLimit('countdown', 3, 60_000)
    expect(result.success).toBe(true)
    expect(result.remaining).toBe(0)
  })

  it('blocks requests that exceed the limit', () => {
    const key = 'blocked-' + Date.now()
    rateLimit(key, 2, 60_000)
    rateLimit(key, 2, 60_000)
    const result = rateLimit(key, 2, 60_000)
    expect(result.success).toBe(false)
    expect(result.remaining).toBe(0)
    expect(result.retryAfterMs).toBeGreaterThan(0)
  })

  it('resets after the window expires', async () => {
    const key = 'reset-' + Date.now()
    rateLimit(key, 1, 10) // 10ms window
    // Wait for the window to expire
    await new Promise(r => setTimeout(r, 20))
    const result = rateLimit(key, 1, 10)
    expect(result.success).toBe(true)
  })

  it('tracks different keys independently', () => {
    const result1 = rateLimit('key-a', 1, 60_000)
    const result2 = rateLimit('key-b', 1, 60_000)
    expect(result1.success).toBe(true)
    expect(result2.success).toBe(true)
    // key-a is now exhausted
    const result1b = rateLimit('key-a', 1, 60_000)
    expect(result1b.success).toBe(false)
    // key-b is still ok
    const result2b = rateLimit('key-b', 1, 60_000)
    expect(result2b.success).toBe(false)
  })
})

describe('getClientKey', () => {
  it('extracts IP from x-forwarded-for header', () => {
    const req = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
    })
    expect(getClientKey(req)).toBe('1.2.3.4')
  })

  it('falls back to x-real-ip', () => {
    const req = new Request('http://localhost', {
      headers: { 'x-real-ip': '9.8.7.6' },
    })
    expect(getClientKey(req)).toBe('9.8.7.6')
  })

  it('returns unknown when no IP headers present', () => {
    const req = new Request('http://localhost')
    expect(getClientKey(req)).toBe('unknown')
  })
})
