import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(req: NextRequest) {
  try {
    const requiredPassword = process.env.INTERNAL_PW
    if (!requiredPassword) {
      return NextResponse.json({ ok: true })
    }

    const body = await req.json()
    const password = body?.pw as string | undefined
    if (!password || password !== requiredPassword) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const res = NextResponse.json({ ok: true })
    res.cookies.set('internal_links_pw', password, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 12,
    })
    return res
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  // Delete using helper and explicit expirations for common paths.
  res.cookies.delete('internal_links_pw')
  res.cookies.set('internal_links_pw', '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: new Date(0),
    maxAge: 0,
  })
  res.cookies.set('internal_links_pw', '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/_links',
    expires: new Date(0),
    maxAge: 0,
  })
  return res
}
