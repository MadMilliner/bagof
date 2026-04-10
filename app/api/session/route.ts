import { NextRequest, NextResponse } from 'next/server'
import { createSession } from '@/db/queries'
import type { CreateSessionResponse } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const { sessionName, memberNames, currencyType } = await req.json()

    if (!sessionName?.trim())
      return NextResponse.json({ error: 'Campaign name required' }, { status: 400 })

    const cleaned: string[] = (memberNames ?? [])
      .map((n: string) => n.trim())
      .filter(Boolean)


    const { session, members } = await createSession(sessionName.trim(), currencyType || 'dnd', cleaned)
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
