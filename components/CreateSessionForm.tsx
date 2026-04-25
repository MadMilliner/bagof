'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/8bit/card'
import { Button } from '@/components/ui/8bit/button'
import { Input } from '@/components/ui/8bit/input'
import { Badge } from '@/components/ui/8bit/badge'
import { ThemeSelect, ThemeToggle } from '@/components/ThemeProvider'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/8bit/alert-dialog'
import type { CreateSessionResponse } from '@/types'
import { BagOfLogo } from '@/components/BagOfLogo'
import { saveSession, getSavedSessions, removeSession, type SavedSession, savePlayerLink, getSavedPlayerLinks, removePlayerLink, type SavedPlayerLink } from '@/lib/savedSessions'
import { SavedPlayerLinks } from '@/components/SavedPlayerLinks'
import { SavedCampaigns } from '@/components/SavedCampaigns'
import { LuBackpack, LuCheck, LuClipboardCopy, LuSwords, LuTriangleAlert, LuX } from 'react-icons/lu'

type Step = 'form' | 'links'

export function CreateSessionForm()
{
  const router = useRouter()
  const [step, setStep] = useState<Step>('form')
  const [sessionName, setSessionName] = useState('')
  const [currencyType, setCurrencyType] = useState<'dnd' | 'wealth'>('dnd')
  const [dmRole, setDmRole] = useState('Dungeon Master')
  const [memberNames, setMemberNames] = useState<string[]>([])
  const [result, setResult] = useState<CreateSessionResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState<string | null>(null)
  const [sessions, setSessions] = useState<SavedSession[]>([])
  const [playerLinks, setPlayerLinks] = useState<SavedPlayerLink[]>([])
  const [copiedSessionId, setCopiedSessionId] = useState<string | null>(null)
  const [copiedPlayerId, setCopiedPlayerId] = useState<string | null>(null)

  useEffect(() => {
    setSessions(getSavedSessions())
    setPlayerLinks(getSavedPlayerLinks())
  }, [])

  useEffect(() => {
    if (sessions.length === 0 && playerLinks.length === 0) return

    const paths = new Set<string>()
    sessions.forEach(session => paths.add(`/dm/${session.dmToken}`))
    playerLinks.forEach(link => paths.add(`/p/${link.memberToken}`))
    // Keep home responsive: prefetch only a few recent links.
    const queue = Array.from(paths).slice(0, 4)
    let cancelled = false
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    const schedule = () => {
      if (cancelled || queue.length === 0) return
      const nextPath = queue.shift()
      if (!nextPath) return

      // Prefetch links gradually to avoid flooding route/data requests.
      router.prefetch(nextPath)
      timeoutId = setTimeout(schedule, 300)
    }

    if ('requestIdleCallback' in window) {
      (window as Window & { requestIdleCallback: (cb: IdleRequestCallback) => number })
        .requestIdleCallback(() => {
          timeoutId = setTimeout(schedule, 750)
        })
    } else {
      timeoutId = setTimeout(schedule, 750)
    }

    return () => {
      cancelled = true
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [sessions, playerLinks, router])

  const updateMember = (i: number, val: string) =>
    setMemberNames(prev => prev.map((n, idx) => (idx === i ? val : n)))

  const removeMember = (i: number) =>
    setMemberNames(prev => prev.filter((_, idx) => idx !== i))

  const addMember = () => setMemberNames(prev => [...prev, ''])

  const handleCreate = async () =>
  {
    setError('')
    const cleaned = memberNames.map(n => n.trim()).filter(Boolean)
    if (!sessionName.trim()) { setError('Campaign name is required.'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionName: sessionName.trim(), currencyType, dmRole, memberNames: cleaned }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResult(data)
      setStep('links')
      // Save DM link to localStorage for easy access
      const newSession: SavedSession = {
        sessionId: data.session.id,
        sessionName: data.session.name,
        dmRole: data.session.dmRole,
        dmToken: data.session.dmToken,
        savedAt: new Date().toISOString(),
      }
      saveSession(newSession)
      setSessions(prev => [newSession, ...prev])
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveSession = (sessionId: string) => {
    removeSession(sessionId)
    setSessions(prev => prev.filter(s => s.sessionId !== sessionId))
  }

  const handleRemovePlayerLink = (memberId: string) => {
    removePlayerLink(memberId)
    setPlayerLinks(prev => prev.filter(l => l.memberId !== memberId))
  }

  const handleCopySessionLink = (dmToken: string, sessionId: string) => {
    const url = `${window.location.origin}/dm/${dmToken}`
    navigator.clipboard.writeText(url)
    setCopiedSessionId(sessionId)
    setTimeout(() => setCopiedSessionId(null), 2000)
  }

  const handleCopyPlayerLink = (memberToken: string, memberId: string) => {
    const url = `${window.location.origin}/p/${memberToken}`
    navigator.clipboard.writeText(url)
    setCopiedPlayerId(memberId)
    setTimeout(() => setCopiedPlayerId(null), 2000)
  }

  const copy = (text: string, key: string) =>
  {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const copyAll = (r: CreateSessionResponse) => {
    const lines = [
      `Bag of — ${r.session.name}`,
      '',
      `${r.session.dmRole} Link`,
      r.dmUrl,
      '',
      ...r.memberLinks.flatMap(link => [`${link.name}`, link.url, '']),
      'Warning: Save these links - no accounts means no recovery.',
    ]
    copy(lines.join('\n'), 'all')
  }

  // ── Saved links section (shown in both steps) ──────────

  const savedLinksSection = (sessions.length > 0 || playerLinks.length > 0) && (
    <div id="saved-links-section" className="w-full border-2 border-black dark:border-white [box-shadow:4px_4px_0px_0px_rgba(0,0,0,1)] dark:[box-shadow:4px_4px_0px_0px_rgba(255,255,255,1)] px-4 py-4">
        <div id="saved-links-container" className="flex flex-col gap-4">
          {/* ── Campaigns (DM links) ── */}
          <SavedCampaigns
            sessions={sessions}
            onCopy={handleCopySessionLink}
            onRemove={handleRemoveSession}
            copiedSessionId={copiedSessionId}
          />

          {/* ── Characters (Player links) ── */}
          <SavedPlayerLinks
            playerLinks={playerLinks}
            onCopy={handleCopyPlayerLink}
            onRemove={handleRemovePlayerLink}
            copiedPlayerId={copiedPlayerId}
          />
        </div>
    </div>
  )

  // ── Links step ────────────────────────────────────────────

  if (step === 'links' && result) {
    return (
      <div id="session-links-step" className="w-full max-w-2xl mx-auto space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 min-w-0">
            <h1 className="font-press-start text-lg inline-flex items-center gap-2">
              <LuBackpack className="h-6 w-6" aria-hidden="true" />
              Session Ready!
            </h1>
            <p className="font-press-start text-8bit-sm text-muted-foreground leading-relaxed">
              Share each link. These never expire.
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <ThemeSelect />
            <ThemeToggle />
          </div>
        </div>

        {/* Copy all button */}
        <Button
          id="copy-all-links-btn"
          variant="secondary"
          className="w-full"
          onClick={() => copyAll(result)}
        >
          {copied === 'all' ? (
            <span className="inline-flex items-center gap-1">
              <LuCheck className="h-4 w-4" aria-hidden="true" />
              Copied All!
            </span>
          ) : (
            <span className="inline-flex items-center gap-1">
              <LuClipboardCopy className="h-4 w-4" aria-hidden="true" />
              Copy All Links
            </span>
          )}
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-xs flex items-center gap-2">
              {result.session.dmRole} Link
              <Badge variant="destructive">Full Access</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="font-mono text-[10px] text-muted-foreground break-all">{result.dmUrl}</p>
            <Button size="sm" variant="outline" onClick={() => copy(result.dmUrl, 'dm')}>
              {copied === 'dm' ? (
                <span className="inline-flex items-center gap-1">
                  <LuCheck className="h-4 w-4" aria-hidden="true" />
                  Copied!
                </span>
              ) : (
                `Copy ${result.session.dmRole} Link`
              )}
            </Button>
          </CardContent>
        </Card>

        {result.memberLinks.map((link, i) => (
          <Card key={i}>
            <CardHeader>
              <CardTitle className="text-xs inline-flex items-center gap-1.5">
                <LuSwords className="h-4 w-4" aria-hidden="true" />
                {link.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="font-mono text-[10px] text-muted-foreground break-all">{link.url}</p>
              <Button size="sm" variant="outline" onClick={() => copy(link.url, `m-${i}`)}>
                {copied === `m-${i}` ? (
                  <span className="inline-flex items-center gap-1">
                    <LuCheck className="h-4 w-4" aria-hidden="true" />
                    Copied!
                  </span>
                ) : (
                  'Copy Link'
                )}
              </Button>
            </CardContent>
          </Card>
        ))}

        <Card>
          <CardContent className="pt-4">
            <p className="font-press-start text-8bit-sm text-yellow-600 dark:text-yellow-400 leading-relaxed">
              Your {result.session.dmRole} link is saved on this device. Player links can be copied again from the {result.session.dmRole === 'Referee' ? "Referee's" : result.session.dmRole + "'s"} dashboard — but save them somewhere safe too, just in case.
            </p>
            <p className="font-press-start text-8bit-sm text-yellow-500 dark:text-yellow-500 leading-relaxed pt-5">
              Links visited will be visible on the home page but it's still best to have them backed up somewhere too.
            </p>
          </CardContent>
        </Card>

        {savedLinksSection}
      </div>
    )
  }

  // ── Form step ─────────────────────────────────────────────

  return (
    <div id="create-session-form" className="w-full max-w-2xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-2">
        <div className="text-center flex-1 min-w-0">
          <BagOfLogo variant="large" />
          <p className="font-press-start text-[10px] text-muted-foreground leading-relaxed">
            Party loot manager. No accounts.
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <ThemeSelect />
          <ThemeToggle />
        </div>
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
              id="campaign-name-input"
              placeholder="The Dragon's Hoard Campaign..."
              value={sessionName}
              onChange={e => setSessionName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="font-press-start text-[10px]">Currency System</label>
            <select
              id="currency-system-select"
              className="font-press-start text-[10px] w-full border-2 border-black dark:border-white bg-background px-2 py-2"
              value={currencyType}
              onChange={e => setCurrencyType(e.target.value as 'dnd' | 'wealth')}
            >
              <option value="dnd">Traditional (GP / SP / CP)</option>
              <option value="wealth">Abstract Wealth (Single Number)</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="font-press-start text-[10px]">What do you prefer to be called?</label>
            <select
              id="dm-role-select"
              className="font-press-start text-[10px] w-full border-2 border-black dark:border-white bg-background px-2 py-2"
              value={dmRole}
              onChange={e => setDmRole(e.target.value)}
            >
              <option value="Dungeon Master">Dungeon Master</option>
              <option value="Game Master">Game Master</option>
              <option value="Storyteller">Storyteller</option>
              <option value="Director">Director</option>
              <option value="Referee">Referee</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="font-press-start text-[10px]">Party Members</label>
            <div className="space-y-2">
              {memberNames.map((name, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    id={`member-name-input-${i}`}
                    placeholder={`Player ${i + 1}...`}
                    value={name}
                    onChange={e => updateMember(i, e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleCreate()}
                    className="flex-1"
                  />
                  <Button id={`remove-member-btn-${i}`} size="icon" variant="destructive" onClick={() => removeMember(i)} aria-label={`Remove member ${i + 1}`}>
                    <LuX className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              ))}
            </div>
            <Button id="add-member-btn" variant="outline" size="sm" onClick={addMember} className="w-full">
              + Add Member
            </Button>
          </div>

          {error && (
            <p className="font-press-start text-[10px] text-destructive inline-flex items-center gap-1">
              <LuTriangleAlert className="h-3.5 w-3.5" aria-hidden="true" />
              {error}
            </p>
          )}

          <Button id="create-session-btn" className="w-full" onClick={handleCreate} disabled={loading}>
            {loading ? 'Creating...' : 'Create Session'}
          </Button>
        </CardContent>
      </Card>

      {savedLinksSection}
    </div>
  )
}
