'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/8bit/button'

interface LinkActionsProps {
  url: string
  type: 'session' | 'member'
  id: string
}

export function LinkActions({ url, type, id }: LinkActionsProps) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }

  const remove = async () => {
    const confirmText = type === 'session'
      ? 'Delete this entire session and all player links?'
      : 'Delete this player link/member?'
    if (!window.confirm(confirmText)) return

    setBusy(true)
    try {
      const res = await fetch('/api/internal-links', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, id }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Delete failed')
      }
      router.refresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center gap-2 shrink-0">
      <Button size="sm" variant="outline" onClick={copy} disabled={busy}>
        {copied ? 'Copied' : 'Copy'}
      </Button>
      <Button size="sm" variant="destructive" onClick={remove} disabled={busy}>
        Delete
      </Button>
    </div>
  )
}
