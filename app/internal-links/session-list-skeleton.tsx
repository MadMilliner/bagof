export function SessionListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading sessions">
      {Array.from({ length: rows }, (_, i) => (
        <section
          key={i}
          className="border-2 border-black dark:border-white p-3 sm:p-4 bg-card space-y-3"
        >
          <div className="h-4 w-44 max-w-[70%] rounded-sm bg-muted motion-safe:animate-pulse" />
          <div className="space-y-2 pt-1">
            <div className="h-3 w-full rounded-sm bg-muted/80 motion-safe:animate-pulse" />
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
              <div className="h-3 min-h-[2.5rem] flex-1 rounded-sm bg-muted/60 motion-safe:animate-pulse" />
              <div className="flex shrink-0 gap-2 sm:pt-0.5">
                <div className="h-8 w-[4.5rem] rounded-sm bg-muted/60 motion-safe:animate-pulse" />
                <div className="h-8 w-[4.5rem] rounded-sm bg-muted/60 motion-safe:animate-pulse" />
              </div>
            </div>
          </div>
          <div className="space-y-2 border-t-2 border-dashed border-muted-foreground/25 pt-3">
            <div className="h-3 w-36 rounded-sm bg-muted/70 motion-safe:animate-pulse" />
            <div className="h-3 w-full rounded-sm bg-muted/70 motion-safe:animate-pulse" />
            <div className="h-3 max-w-[90%] rounded-sm bg-muted/70 motion-safe:animate-pulse" />
          </div>
        </section>
      ))}
    </div>
  )
}
