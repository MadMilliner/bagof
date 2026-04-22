'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/8bit/card'
import { Button } from '@/components/ui/8bit/button'
import { Input } from '@/components/ui/8bit/input'
import { Badge } from '@/components/ui/8bit/badge'
import { ThemeToggle } from '@/components/ThemeProvider'
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/8bit/accordion'
import type { CreateSessionResponse } from '@/types'
import { BagOfLogo } from '@/components/BagOfLogo'
import { saveSession, getSavedSessions, removeSession, type SavedSession, savePlayerLink, getSavedPlayerLinks, removePlayerLink, type SavedPlayerLink } from '@/lib/savedSessions'

type Step = 'form' | 'links'

export function CreateSessionForm()
{
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
  const [mounted, setMounted] = useState(false)
  const [copiedSessionId, setCopiedSessionId] = useState<string | null>(null)
  const [copiedPlayerId, setCopiedPlayerId] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
    setSessions(getSavedSessions())
    setPlayerLinks(getSavedPlayerLinks())
  }, [])

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
      ...r.memberLinks.flatMap(link => [`⚔️ ${link.name}`, link.url, '']),
      '⚠ Save these links — no accounts means no recovery.',
    ]
    copy(lines.join('\n'), 'all')
  }

  // ── Saved links section (shown in both steps) ──────────

  const savedLinksSection = mounted && (sessions.length > 0 || playerLinks.length > 0) && (
    <div id="saved-links-section" className="w-full border-2 border-black dark:border-white [box-shadow:4px_4px_0px_0px_rgba(0,0,0,1)] dark:[box-shadow:4px_4px_0px_0px_rgba(255,255,255,1)] px-4">
      <Accordion type="multiple" className="w-full">
      {/* ── Campaigns (DM links) ── */}
      {sessions.length > 0 && (
        <AccordionItem value="campaigns">
          <AccordionTrigger id="your-campaigns-heading" className="text-muted-foreground">
            Your campaigns ({sessions.length})
          </AccordionTrigger>
          <AccordionContent className="space-y-3">
            {sessions.map(session => (
              <Card key={session.sessionId}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs flex flex-col gap-1">
                    <span className="truncate">{session.sessionName}</span>
                    <Badge variant="destructive" className="self-start">{session.dmRole}</Badge>
                  </CardTitle>
                  <CardDescription className="text-[8px]">
                    Saved {new Date(session.savedAt).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Link href={`/dm/${session.dmToken}`} className="block">
                    <Button id={`open-dm-dashboard-btn-${session.sessionId}`} size="sm" className="w-full">
                      Open {session.dmRole} Dashboard
                    </Button>
                  </Link>
                  <div className="flex gap-2">
                    <Button
                      id={`copy-dm-link-btn-${session.sessionId}`}
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleCopySessionLink(session.dmToken, session.sessionId)}
                    >
                      {copiedSessionId === session.sessionId ? '✓ Copied!' : 'Copy Link'}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="destructive">
                          ✕
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove &quot;{session.sessionName}&quot;?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This only removes the saved link from this device. The campaign still exists.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleRemoveSession(session.sessionId)}>
                            Remove
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </AccordionContent>
        </AccordionItem>
      )}

      {/* ── Characters (Player links) ── */}
      {playerLinks.length > 0 && (
        <AccordionItem value="characters">
          <AccordionTrigger id="your-characters-heading" className="text-muted-foreground">
            Your characters ({playerLinks.length})
          </AccordionTrigger>
          <AccordionContent className="space-y-3">
            {playerLinks.map(link => (
              <Card key={link.memberId}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs flex items-center justify-between">
                    <span className="truncate mr-2">⚔️ {link.memberName}</span>
                    <Badge variant="secondary">{link.sessionName}</Badge>
                  </CardTitle>
                  <CardDescription className="text-[8px]">
                    {link.dmRole} campaign · Saved {new Date(link.savedAt).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Link href={`/p/${link.memberToken}`} className="block">
                    <Button id={`open-player-dashboard-btn-${link.memberId}`} size="sm" variant="secondary" className="w-full">
                      Open Character Sheet
                    </Button>
                  </Link>
                  <div className="flex gap-2">
                    <Button
                      id={`copy-player-link-btn-${link.memberId}`}
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleCopyPlayerLink(link.memberToken, link.memberId)}
                    >
                      {copiedPlayerId === link.memberId ? '✓ Copied!' : 'Copy Link'}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="destructive">
                          ✕
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove &quot;{link.memberName}&quot;?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This only removes the saved link from this device. The character still exists.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleRemovePlayerLink(link.memberId)}>
                            Remove
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </AccordionContent>
        </AccordionItem>
      )}
      </Accordion>
    </div>
  )

  // ── Links step ────────────────────────────────────────────

  if (step === 'links' && result) {
    return (
      <div id="session-links-step" className="w-full max-w-lg space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h1 className="font-press-start text-lg"><span className="text-2xl">🎒</span> Session Ready!</h1>
            <p className="font-press-start text-8bit-sm text-muted-foreground leading-relaxed">
              Share each link. These never expire.
            </p>
          </div>
          <ThemeToggle />
        </div>

        {/* Copy all button */}
        <Button
          id="copy-all-links-btn"
          variant="secondary"
          className="w-full"
          onClick={() => copyAll(result)}
        >
          {copied === 'all' ? '✓ Copied All!' : '📋 Copy All Links'}
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
              {copied === 'dm' ? '✓ Copied!' : `Copy ${result.session.dmRole} Link`}
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
    <div id="create-session-form" className="w-full max-w-md space-y-6">
      <div className="flex items-start justify-between">
        <div className="text-center flex-1">
          <BagOfLogo variant="large" />
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
                  <Button id={`remove-member-btn-${i}`} size="icon" variant="destructive" onClick={() => removeMember(i)}>
                    ✕
                  </Button>
                </div>
              ))}
            </div>
            <Button id="add-member-btn" variant="outline" size="sm" onClick={addMember} className="w-full">
              + Add Member
            </Button>
          </div>

          {error && (
            <p className="font-press-start text-[10px] text-destructive">{error}</p>
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
