'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/8bit/card'
import { Button } from '@/components/ui/8bit/button'
import { Input } from '@/components/ui/8bit/input'
import { Badge } from '@/components/ui/8bit/badge'
import { ThemeToggle } from '@/components/ThemeProvider'
import type { CreateSessionResponse } from '@/types'

type Step = 'form' | 'links'

export function CreateSessionForm() {
  const [step, setStep] = useState<Step>('form')
  const [sessionName, setSessionName] = useState('')
  const [currencyType, setCurrencyType] = useState<'dnd' | 'wealth'>('dnd')
  const [memberNames, setMemberNames] = useState(['', ''])
  const [result, setResult] = useState<CreateSessionResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  const updateMember = (i: number, val: string) =>
    setMemberNames(prev => prev.map((n, idx) => (idx === i ? val : n)))

  const removeMember = (i: number) =>
    setMemberNames(prev => prev.filter((_, idx) => idx !== i))

  const addMember = () => setMemberNames(prev => [...prev, ''])

  const handleCreate = async () => {
    setError('')
    const cleaned = memberNames.map(n => n.trim()).filter(Boolean)
    if (!sessionName.trim()) { setError('Campaign name is required.'); return }
    if (cleaned.length === 0) { setError('Add at least one party member.'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionName: sessionName.trim(), currencyType, memberNames: cleaned }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResult(data)
      setStep('links')
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const copyAll = (r: CreateSessionResponse) => {
    const lines = [
      `Bag of — ${r.session.name}`,
      '',
      `DM Link`,
      r.dmUrl,
      '',
      ...r.memberLinks.flatMap(link => [`⚔️ ${link.name}`, link.url, '']),
      '⚠ Save these links — no accounts means no recovery.',
    ]
    copy(lines.join('\n'), 'all')
  }

  if (step === 'links' && result) {
    return (
      <div className="w-full max-w-lg space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h1 className="font-press-start text-lg"><span className="text-2xl">🎒</span> Session Ready!</h1>
            <p className="font-press-start text-[10px] text-muted-foreground leading-relaxed">
              Share each link. These never expire.
            </p>
          </div>
          <ThemeToggle />
        </div>

        {/* Copy all button */}
        <Button
          variant="secondary"
          className="w-full"
          onClick={() => copyAll(result)}
        >
          {copied === 'all' ? '✓ Copied All!' : '📋 Copy All Links'}
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-xs flex items-center gap-2">
              DM Link
              <Badge variant="destructive">Full Access</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="font-mono text-[10px] text-muted-foreground break-all">{result.dmUrl}</p>
            <Button size="sm" variant="outline" onClick={() => copy(result.dmUrl, 'dm')}>
              {copied === 'dm' ? '✓ Copied!' : 'Copy DM Link'}
            </Button>
          </CardContent>
        </Card>

        {result.memberLinks.map((link, i) => (
          <Card key={i}>
            <CardHeader>
              <CardTitle className="text-xs">⚔️ {link.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="font-mono text-[10px] text-muted-foreground break-all">{link.url}</p>
              <Button size="sm" variant="outline" onClick={() => copy(link.url, `m-${i}`)}>
                {copied === `m-${i}` ? '✓ Copied!' : 'Copy Link'}
              </Button>
            </CardContent>
          </Card>
        ))}

        <Card>
          <CardContent className="pt-4">
            <p className="font-press-start text-[10px] text-yellow-600 dark:text-yellow-400 leading-relaxed">
              ⚠ Save these links now. No accounts means no recovery.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="flex items-start justify-between">
        <div className="text-center flex-1">
          <h1 className="font-press-start text-xl mb-2">Bag of</h1>
          <p className="font-press-start text-[10px] text-muted-foreground leading-relaxed">
            Party loot manager. No accounts.
          </p>
        </div>
        <ThemeToggle />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New Session</CardTitle>
          <CardDescription>Name your campaign and add your party.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="font-press-start text-[10px]">Campaign Name</label>
            <Input
              placeholder="The Dragon's Hoard Campaign..."
              value={sessionName}
              onChange={e => setSessionName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="font-press-start text-[10px]">Currency System</label>
            <select
              className="font-press-start text-[10px] w-full border-2 border-black dark:border-white bg-background px-2 py-2"
              value={currencyType}
              onChange={e => setCurrencyType(e.target.value as 'dnd' | 'wealth')}
            >
              <option value="dnd">Traditional (GP / SP / CP)</option>
              <option value="wealth">Abstract Wealth (Single Number)</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="font-press-start text-[10px]">Party Members</label>
            <div className="space-y-2">
              {memberNames.map((name, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    placeholder={`Player ${i + 1}...`}
                    value={name}
                    onChange={e => updateMember(i, e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleCreate()}
                    className="flex-1"
                  />
                  {memberNames.length > 1 && (
                    <Button size="icon" variant="destructive" onClick={() => removeMember(i)}>
                      ✕
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={addMember} className="w-full">
              + Add Member
            </Button>
          </div>

          {error && (
            <p className="font-press-start text-[10px] text-destructive">{error}</p>
          )}

          <Button className="w-full" onClick={handleCreate} disabled={loading}>
            {loading ? 'Creating...' : 'Create Session'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
