import Link from 'next/link'
import { Button } from '@/components/ui/8bit/button'

const BASE_PATH = '/_links'

function buildHref(page: number) {
  const sp = new URLSearchParams()
  if (page > 1) sp.set('page', String(page))
  const q = sp.toString()
  return q ? `${BASE_PATH}?${q}` : BASE_PATH
}

export function InternalLinksPagination({
  page,
  total,
  pageSize,
}: {
  page: number
  total: number
  pageSize: number
}) {
  if (total === 0) return null

  const totalPages = Math.ceil(total / pageSize)
  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return (
    <nav
      className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-2 border-black dark:border-white bg-card p-3 sm:p-4"
      aria-label="Campaign pagination"
    >
      <p className="font-press-start text-8bit-xs text-muted-foreground">
        Campaigns {from}–{to} of {total}
        <span className="text-foreground/80"> · </span>
        Page {page} of {totalPages}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} asChild={page > 1}>
          {page > 1 ? (
            <Link href={buildHref(page - 1)} prefetch={false}>
              Previous
            </Link>
          ) : (
            <span>Previous</span>
          )}
        </Button>
        <Button variant="outline" size="sm" disabled={page >= totalPages} asChild={page < totalPages}>
          {page < totalPages ? (
            <Link href={buildHref(page + 1)} prefetch={false}>
              Next
            </Link>
          ) : (
            <span>Next</span>
          )}
        </Button>
      </div>
    </nav>
  )
}
