import type { Metadata } from 'next'
import { Suspense } from 'react'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { getSessionsWithMembersPage } from '../../db/queries'
import { LinkActions } from './LinkActions'
import { BagOfLogo } from '@/components/BagOfLogo'
import { InternalLinksPagination } from './internal-links-pagination'
import { SessionListSkeleton } from './session-list-skeleton'

export const metadata: Metadata = {
  title: 'Internal Links',
  robots: {
    index: false,
    follow: false,
  },
}

function formatCreatedAt(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default async function InternalLinksPage({
  searchParams,
}: {
  searchParams: Promise<{ key?: string; page?: string }>
}) {
  const params = await searchParams
  const requiredKey = process.env.INTERNAL_LINKS_KEY

  // Optional gate: set INTERNAL_LINKS_KEY in env and visit /_links?key=YOUR_KEY (&page=2 for pagination)
  if (requiredKey && params.key !== requiredKey) {
    notFound()
  }

  const rawPage = parseInt(params.page ?? '1', 10)
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1

  return (
    <main className="mx-auto w-full max-w-5xl p-4 sm:p-6 space-y-6">
      <header className="space-y-2">
        <BagOfLogo />
        <h1 className="font-press-start text-sm sm:text-base">Internal Session Links</h1>
        <p className="font-press-start text-8bit-sm text-muted-foreground">
          Hidden utility page listing all current DM and player links.
        </p>
      </header>

      <Suspense fallback={<SessionListSkeleton rows={3} />}>
        <SessionsBody accessKey={params.key} page={page} />
      </Suspense>
    </main>
  )
}

async function SessionsBody({ accessKey, page }: { accessKey?: string; page: number }) {
  const [h, { rows: sessions, total, page: effectivePage, pageSize }] = await Promise.all([
    headers(),
    getSessionsWithMembersPage(page),
  ])
  const host = h.get('host')
  const proto = h.get('x-forwarded-proto') ?? 'https'
  const origin = host ? `${proto}://${host}` : ''

  if (total === 0) {
    return <p className="font-press-start text-8bit-sm text-muted-foreground">No sessions found.</p>
  }

  return (
    <div className="space-y-4">
      {sessions.map(({ session, members }) => (
        <section
          key={session.id}
          className="border-2 border-black dark:border-white p-3 sm:p-4 bg-card space-y-3"
        >
          <div className="space-y-2">
            <h2 className="font-press-start text-8bit-sm text-foreground break-words">{session.name}</h2>
            <p className="font-press-start text-8bit-xs text-muted-foreground">
              Created: {formatCreatedAt(session.createdAt)}
            </p>
            <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3">
              <p className="font-press-start text-8bit-xs text-muted-foreground break-all flex-1 min-w-0">
                {origin}/dm/{session.dmToken}
              </p>
              <LinkActions
                url={`${origin}/dm/${session.dmToken}`}
                type="session"
                id={session.id}
                accessKey={accessKey}
              />
            </div>
          </div>

          <div className="space-y-2">
            <p className="font-press-start text-8bit-xs text-muted-foreground">
              Player Links ({members.length})
            </p>
            {members.length === 0 ? (
              <p className="font-press-start text-8bit-xs text-muted-foreground">No players in this session.</p>
            ) : (
              <ul className="space-y-1">
                {members.map((member) => (
                  <li
                    key={member.id}
                    className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3 font-press-start text-8bit-xs"
                  >
                    <p className="break-all flex-1 min-w-0">
                      {member.name}: {origin}/p/{member.token}
                    </p>
                    <LinkActions
                      url={`${origin}/p/${member.token}`}
                      type="member"
                      id={member.id}
                      accessKey={accessKey}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      ))}

      <InternalLinksPagination
        page={effectivePage}
        total={total}
        pageSize={pageSize}
        accessKey={accessKey}
      />
    </div>
  )
}
