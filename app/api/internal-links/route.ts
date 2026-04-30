import { NextRequest, NextResponse } from 'next/server'
import { deleteMemberById, deleteSessionById } from '@/db/queries'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json()
    const type = body?.type as 'session' | 'member' | undefined
    const id = body?.id as string | undefined
    const requiredPassword = process.env.INTERNAL_PW
    const accessCookie = req.cookies.get('internal_links_pw')?.value

    if (!type || !id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (requiredPassword && accessCookie !== requiredPassword) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const ok = type === 'session'
      ? await deleteSessionById(id)
      : await deleteMemberById(id)

    if (!ok) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/internal-links]', err)
    return NextResponse.json({ error: 'Failed to delete link' }, { status: 500 })
  }
}
