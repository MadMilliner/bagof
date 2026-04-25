import { BagOfLogo } from '@/components/BagOfLogo'
import { Spinner } from '@/components/ui/8bit/spinner'
import { SessionListSkeleton } from './session-list-skeleton'

export default function InternalLinksLoading() {
  return (
    <main className="mx-auto w-full max-w-5xl p-4 sm:p-6 space-y-6">
      <header className="space-y-2">
        <BagOfLogo />
        <div className="h-5 w-56 max-w-full rounded-sm bg-muted motion-safe:animate-pulse" />
        <div className="h-4 w-full max-w-md rounded-sm bg-muted/70 motion-safe:animate-pulse" />
      </header>

      <div className="flex items-center gap-2 text-muted-foreground" role="status">
        <Spinner variant="diamond" className="size-6 shrink-0" />
        <span className="font-press-start text-8bit-xs">Loading sessions…</span>
      </div>

      <SessionListSkeleton rows={3} />
    </main>
  )
}
