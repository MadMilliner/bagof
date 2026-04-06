import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 text-center gap-6">
      <p className="text-4xl">🗺️</p>
      <h1 className="font-press-start text-lg leading-relaxed">Link Not Found</h1>
      <p className="font-press-start text-[10px] text-muted-foreground max-w-xs leading-relaxed">
        This link doesn't match any active session. Check that you copied it correctly,
        or ask your DM to reshare.
      </p>
      <Link
        href="/session/create"
        className="font-press-start text-[10px] underline underline-offset-4"
      >
        Start a new session
      </Link>
    </main>
  )
}
