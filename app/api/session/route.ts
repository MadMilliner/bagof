import { NextRequest, NextResponse } from 'next/server'
import { createSession, logActivity } from '@/db/queries'
import { checkRateLimit } from '@/lib/rateLimit'
import type { CreateSessionResponse } from '@/types'

export async function POST(req: NextRequest) {
  const rateLimited = checkRateLimit(req, 10, 60_000) // 10 session creates per minute
  if (rateLimited) return rateLimited

  try {
    const { sessionName, memberNames, currencyType, dmRole } = await req.json()

    if (!sessionName?.trim())
      return NextResponse.json({ error: 'Campaign name required' }, { status: 400 })

    const cleaned: string[] = (memberNames ?? [])
      .map((n: string) => n.trim())
      .filter(Boolean)


    const { session, members } = await createSession(sessionName.trim(), currencyType || 'dnd', dmRole || 'Dungeon Master', cleaned)
    await logActivity(session.id, null, dmRole || 'Dungeon Master', 'session_create', `${sessionName.trim()} with ${cleaned.length} members`)
    const base = req.headers.get('origin') ?? req.nextUrl.origin

    const response: CreateSessionResponse = {
      session,
      dmUrl: `${base}/dm/${session.dmToken}`,
      memberLinks: members.map(m => ({
        name: m.name,
        token: m.token,
        url: `${base}/p/${m.token}`,
      })),
    }

    return NextResponse.json(response)
  } catch (err) {
    console.error('[POST /api/session]', err)
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
  }
}
