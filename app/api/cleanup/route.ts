import { NextRequest, NextResponse } from 'next/server'
import { cleanupExpiredSessions } from '@/db/queries'

/**
 * GET /api/cleanup
 * Deletes never-used sessions (>31 days old with no data) OR long-dormant sessions (not accessed in 366+ days).
 * Protected by Vercel Cron signature header — rejects requests not from Vercel's cron system.
 */
export async function GET(req: NextRequest) {
  // Vercel Cron sends this header automatically on cron invocations
  // https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error('[cleanup] CRON_SECRET not configured — rejecting request')
    return NextResponse.json({ error: 'Not configured' }, { status: 403 })
  }
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const deleted = await cleanupExpiredSessions()
    console.log(`[cleanup] Deleted ${deleted} expired session(s)`)
    return NextResponse.json({ deleted })
  } catch (err) {
    console.error('[GET /api/cleanup]', err)
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 })
  }
}
