import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock the DB query before importing the route
vi.mock('@/db/queries', () => ({
  cleanupExpiredSessions: vi.fn().mockResolvedValue(0),
}))

// We need to construct NextRequest objects and call the handler
// Import the handler via dynamic import after mock setup
import { GET } from '@/app/api/cleanup/route'

function makeRequest(headers: Record<string, string> = {}) {
  return new Request('http://localhost/api/cleanup', {
    method: 'GET',
    headers,
  }) as any // NextRequest compatible
}

describe('GET /api/cleanup', () => {
  const originalSecret = process.env.CRON_SECRET

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    // Restore original env
    process.env.CRON_SECRET = originalSecret
  })

  it('rejects requests when CRON_SECRET is not configured', async () => {
    delete process.env.CRON_SECRET
    const req = makeRequest()
    const res = await GET(req)
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toBe('Not configured')
  })

  it('rejects requests with no authorization header', async () => {
    process.env.CRON_SECRET = 'my-secret-123'
    const req = makeRequest()
    const res = await GET(req)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('rejects requests with wrong authorization header', async () => {
    process.env.CRON_SECRET = 'my-secret-123'
    const req = makeRequest({ authorization: 'Bearer wrong-secret' })
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('accepts requests with correct CRON_SECRET', async () => {
    process.env.CRON_SECRET = 'my-secret-123'
    const req = makeRequest({ authorization: 'Bearer my-secret-123' })
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('deleted')
  })

  it('does not accept Authorization without Bearer prefix', async () => {
    process.env.CRON_SECRET = 'my-secret-123'
    const req = makeRequest({ authorization: 'my-secret-123' })
    const res = await GET(req)
    expect(res.status).toBe(401)
  })
})
