import { NextRequest, NextResponse } from 'next/server'
import { createSession, updateSessionName, getDMSession, logActivity } from '@/db/queries'
import { checkRateLimit } from '@/lib/rateLimit'
import type { CreateSessionResponse } from '@/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function PATCH(req: NextRequest) {
  const rateLimited = checkRateLimit(req, 20, 60_000) // 20 renames per minute
  if (rateLimited) return rateLimited

  try {
    const { dmToken, name } = await req.json()

    if (!dmToken)
      return NextResponse.json({ error: 'DM token required' }, { status: 401 })

    if (!name?.trim())
      return NextResponse.json({ error: 'Campaign name required' }, { status: 400 })

    const trimmedName = name.trim().slice(0, 200)
    if (trimmedName.length > 200)
      return NextResponse.json({ error: 'Campaign name too long (max 200 chars)' }, { status: 400 })

    const session = await getDMSession(dmToken)
    if (!session)
      return NextResponse.json({ error: 'Invalid DM token' }, { status: 401 })

    const updated = await updateSessionName(session.id, trimmedName)
    if (!updated)
      return NextResponse.json({ error: 'Failed to rename session' }, { status: 500 })

    await logActivity(session.id, null, session.dmRole, 'session_rename', `${session.name} → ${trimmedName}`)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[PATCH /api/session]', err)
    return NextResponse.json({ error: 'Failed to rename session' }, { status: 500 })
  }
}

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
