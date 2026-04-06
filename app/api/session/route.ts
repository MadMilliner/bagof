import { NextRequest, NextResponse } from 'next/server'
import { createSession } from '@/db/queries'
import type { CreateSessionResponse } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const { sessionName, memberNames } = await req.json()

    if (!sessionName?.trim())
      return NextResponse.json({ error: 'Campaign name required' }, { status: 400 })

    const cleaned: string[] = (memberNames ?? [])
      .map((n: string) => n.trim())
      .filter(Boolean)

    if (cleaned.length === 0)
      return NextResponse.json({ error: 'At least one member required' }, { status: 400 })

    const { session, members } = await createSession(sessionName.trim(), cleaned)
    const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'

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
