import Link from 'next/link'
import { LuMapPinned } from 'react-icons/lu'

export default function NotFound() {
  return (
    <main id="not-found-page" className="min-h-screen flex flex-col items-center justify-center p-6 text-center gap-6">
      <p className="text-4xl" aria-hidden="true">
        <LuMapPinned className="h-10 w-10" />
      </p>
      <h1 className="font-press-start text-lg leading-relaxed">Link Not Found</h1>
      <p className="font-press-start text-8bit-sm text-muted-foreground max-w-xs leading-relaxed">
        This link doesn't match any active session. Check that you copied it correctly,
        or ask your DM to reshare.
      </p>
      <Link
        id="not-found-home-link"
        href="/"
        className="font-press-start text-8bit-sm underline underline-offset-4"
      >
        Start a new session
      </Link>
    </main>
  )
}
