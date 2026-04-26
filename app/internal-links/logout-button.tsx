'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/8bit/button'

export function InternalLinksLogoutButton() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  const logout = async () => {
    setBusy(true)
    try {
      await fetch('/api/internal-links/auth', { method: 'DELETE' })
      // Hard navigate to ensure server gate re-evaluates with latest cookies.
      router.replace('/_links')
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex justify-end">
      <Button size="sm" variant="outline" onClick={logout} disabled={busy}>
        {busy ? 'Logging out...' : 'Logout'}
      </Button>
    </div>
  )
}
