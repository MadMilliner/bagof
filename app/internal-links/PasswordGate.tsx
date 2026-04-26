'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/8bit/button'
import { Input } from '@/components/ui/8bit/input'

export function InternalLinksPasswordGate() {
  const router = useRouter()
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const res = await fetch('/api/internal-links/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pw }),
      })
      if (!res.ok) {
        setError('Incorrect password')
        return
      }
      router.refresh()
    } catch {
      setError('Unable to verify password')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 border-2 border-black dark:border-white bg-card p-4">
      <label htmlFor="internal-links-password" className="font-press-start text-8bit-xs text-muted-foreground">
        Password
      </label>
      <Input
        id="internal-links-password"
        type="password"
        autoComplete="current-password"
        value={pw}
        onChange={(e) => setPw(e.target.value)}
      />
      {error ? <p className="font-press-start text-8bit-xs text-destructive">{error}</p> : null}
      <Button type="submit" size="sm" disabled={busy || !pw}>
        {busy ? 'Checking...' : 'Unlock'}
      </Button>
    </form>
  )
}
