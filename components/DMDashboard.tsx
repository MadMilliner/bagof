'use client'

import React, { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/8bit/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/8bit/card'
import { Badge } from '@/components/ui/8bit/badge'
import { Button } from '@/components/ui/8bit/button'
import { Input } from '@/components/ui/8bit/input'
import { ItemCard } from '@/components/inventory/ItemCard'
import { AddItemForm } from '@/components/inventory/AddItemForm'
import { ItemFilter, filterItems } from '@/components/inventory/ItemFilter'
import { GoldPanel } from '@/components/gold/GoldPanel'
import { ThemeSelect, ThemeToggle } from '@/components/ThemeProvider'
import
{
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/8bit/sheet'
import { LuLink } from "react-icons/lu"
import { LuPencil } from "react-icons/lu"
import { LuDownload } from "react-icons/lu"
import { LuUpload } from "react-icons/lu"
import { LuCheck } from "react-icons/lu"
import { LuRefreshCw } from "react-icons/lu"
import { LuSwords } from "react-icons/lu"
import type { Item, Member, Session, ItemType } from '@/types'
import { useEffect } from 'react'
import { saveSession } from '@/lib/savedSessions'
import { BagOfLogo } from '@/components/BagOfLogo'

const LoadingSpinner = dynamic(() => import('@/app/loading_spinner'))
const ActivityLog = dynamic(
  () => import('@/components/ActivityLog').then(mod => mod.ActivityLog),
  { loading: () => <LoadingSpinner /> }
)

interface DMDashboardProps
{
  session: Session
  dmToken: string
  initialItems: Item[]
  initialMembers: Member[]
}

export function DMDashboard({
  session,
  dmToken,
  initialItems,
  initialMembers,
}: DMDashboardProps)
{
  const [allItems, setAllItems] = useState<Item[]>(initialItems)
  const [members, setMembers] = useState<Member[]>(initialMembers)
  const [partyGold, setPartyGold] = useState(session.partyGold)
  const [loading, setLoading] = useState(false)
  const [origin, setOrigin] = useState('')
  const [newMemberName, setNewMemberName] = useState('')
  const [mounted, setMounted] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [poolSearch, setPoolSearch] = useState('')
  const [poolTypeFilter, setPoolTypeFilter] = useState<ItemType | 'All'>('All')
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ items: number; members: number; gold: number } | null>(null)
  const [showImportBanner, setShowImportBanner] = useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [sessionName, setSessionName] = useState(session.name)
  const [isEditingName, setIsEditingName] = useState(false)

  useEffect(() =>
  {
    setOrigin(window.location.origin)
    setMounted(true)
    // Auto-save DM link to localStorage (updates name/role if changed)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- props are stable server-rendered values
    saveSession({
      sessionId: session.id,
      sessionName: session.name,
      dmRole: session.dmRole,
      dmToken: dmToken,
      savedAt: new Date().toISOString(),
    })
  }, [])

  // ── Polling: auto-refresh every 30s ──
  // Skip polls while an action is in-flight to avoid overwriting optimistic updates
  useEffect(() => {
    if (!mounted) return
    const interval = setInterval(() => {
      if (!loading && document.visibilityState === 'visible') refreshData()
    }, 30_000)
    return () => clearInterval(interval)
  }, [mounted, loading])

  const refreshData = useCallback(async () => {
    setRefreshing(true)
    try {
      const res = await fetch(`/api/refresh?token=${dmToken}&role=dm`)
      if (!res.ok) return
      const data = await res.json()
      setAllItems(data.items)
      setMembers(data.members)
      setPartyGold(data.session.partyGold)
    } catch {
      // Silently fail — polling is best-effort
    } finally {
      setRefreshing(false)
    }
  }, [dmToken])

  if (!mounted) return null

  const partyPool = allItems.filter(i => !i.ownerId)
  const filteredPool = filterItems(partyPool, poolSearch, poolTypeFilter)
  const memberItems = (id: string) => allItems.filter(i => i.ownerId === id)
  const totalGold = members.reduce((s, m) => s + m.publicGold, 0)

  // ── Actions ───────────────────────────────────────────────

  const duplicateItem = async (item: Item) => {
    setLoading(true)
    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isDM: true,
          dmToken,
          item: {
            name: item.name,
            description: item.description,
            type: item.type,
            quantity: 1,
            private: false,
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const newItems = data.items ?? [data.item]
      setAllItems(prev => [...newItems, ...prev])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const addToPool = async (itemData: {
    name: string; description: string; type: ItemType; quantity: number; private: boolean
  }) =>
  {
    setLoading(true)
    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDM: true, dmToken, item: { ...itemData, private: false } }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const newItems = data.items ?? [data.item]
      setAllItems(prev => [...newItems, ...prev])
    } finally {
      setLoading(false)
    }
  }

  const deleteItem = async (item: Item) =>
  {
    // Optimistic update
    setAllItems(prev => prev.filter(i => i.id !== item.id))

    const res = await fetch('/api/items', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dmToken, itemId: item.id }),
    })
    if (!res.ok) {
      // Roll back
      setAllItems(prev => [...prev, item])
    }
  }

  const splitGold = async (amountCp: number) =>
  {
    // Optimistic update
    const share = Math.floor(amountCp / members.length)
    setMembers(prev => prev.map(m => ({ ...m, publicGold: m.publicGold + share })))

    const res = await fetch('/api/gold', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dmToken, action: 'split', amountCp }),
    })
    if (!res.ok) {
      // Roll back
      setMembers(prev => prev.map(m => ({ ...m, publicGold: m.publicGold - share })))
    }
  }

  const giveGold = async (memberId: string, deltaCp: number, field: 'publicGold' | 'privateGold') =>
  {
    // Optimistic update
    setMembers(prev => prev.map(m =>
      m.id === memberId ? { ...m, [field]: Math.max(0, m[field] + deltaCp) } : m
    ))

    const res = await fetch('/api/gold', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dmToken, action: 'give', memberId, deltaCp, field }),
    })
    if (!res.ok) {
      // Roll back
      setMembers(prev => prev.map(m =>
        m.id === memberId ? { ...m, [field]: Math.max(0, m[field] - deltaCp) } : m
      ))
    }
  }

  const updateItemAction = async (item: Item, updates: Partial<Item>) =>
  {
    // Optimistic update
    setAllItems(prev => prev.map(i => i.id === item.id ? { ...i, ...updates } : i))

    const res = await fetch('/api/items', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dmToken, itemId: item.id, action: 'update', updates }),
    })
    if (!res.ok) {
      // Roll back
      setAllItems(prev => prev.map(i => i.id === item.id ? item : i))
    }
  }

  const adjustPartyGold = async (deltaCp: number) =>
  {
    // Optimistic update
    setPartyGold(prev => Math.max(0, prev + deltaCp))

    const res = await fetch('/api/gold', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dmToken, action: 'party_adjust', deltaCp }),
    })
    if (!res.ok) {
      // Roll back
      setPartyGold(prev => Math.max(0, prev - deltaCp))
    }
  }

  const handleExport = async () => {
    try {
      const res = await fetch(`/api/export?token=${dmToken}`)
      if (!res.ok) throw new Error('Export failed')
      const data = await res.json()
      
      // Create and download JSON file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `bagof-${session.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      alert('Failed to export session')
    }
  }

  const handleImportClick = () => {
    fileInputRef?.current?.click()
  }

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)
    setImportResult(null)

    try {
      const formData = new FormData()
      formData.append('dmToken', dmToken)
      formData.append('file', file)

      const res = await fetch('/api/import', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Import failed')

      setImportResult({ items: data.itemsImported, members: data.membersCreated, gold: data.goldAdjusted })
      setShowImportBanner(true)
      // Refresh data after import
      await refreshData()
    } catch (err: any) {
      alert(err.message || 'Failed to import session')
    } finally {
      setImporting(false)
      // Reset file input
      if (fileInputRef?.current) fileInputRef.current.value = ''
    }
  }

  const handleRename = async () => {
    if (!sessionName.trim() || sessionName === session.name) {
      setIsEditingName(false)
      setSessionName(session.name)
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/session', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dmToken, name: sessionName.trim() }),
      })
      if (!res.ok) throw new Error('Failed to rename')
      setSessionName(sessionName.trim())
      setIsEditingName(false)
    } catch (err) {
      console.error(err)
      setSessionName(session.name)
      setIsEditingName(false)
    } finally {
      setLoading(false)
    }
  }

  const handleAddMember = async () =>
  {
    if (!newMemberName.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dmToken, name: newMemberName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMembers(prev => [...prev, data.member])
      setNewMemberName('')
    } finally {
      setLoading(false)
    }
  }

  // ── Render ────────────────────────────────────────────────

  return (
    <div id="dm-dashboard" className="dm-dashboard flex-1 bg-background p-3 sm:p-4 max-w-5xl mx-auto overflow-x-hidden">
      <header id="dm-header" className="dm-header mb-4 sm:mb-6 pb-4 sm:pb-6">
        <div id="dm-header-content" className="dm-header-content flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-6">
          <div id="dm-title-section" className="dm-title-section flex items-start gap-3 sm:gap-4 min-w-0 flex-1">
            <span className="font-press-start text-2xl shrink-0"></span>
            <div id="dm-title-text-container" className="dm-title-text-container min-w-0">
              <BagOfLogo />
              <h1 id="dm-role-heading" className="dm-role-heading font-press-start text-8bit-lg leading-tight mt-1 sm:mt-2">{session.dmRole}</h1>
              <p id="dm-session-name" className="dm-session-name font-press-start text-8bit-sm text-muted-foreground mt-1 sm:mt-2 truncate">
                  {isEditingName ? (
                    <div id="dm-name-edit-container" className="dm-name-edit-container flex items-center gap-2">
                      <input
                        autoFocus
                        id="dm-session-name-input"
                        className="dm-session-name-input font-press-start text-8bit-sm border-2 border-black dark:border-white bg-background px-1 py-0.5 w-full min-w-0 outline-none"
                        value={sessionName}
                        onChange={e => setSessionName(e.target.value)}
                        onBlur={handleRename}
                        onKeyDown={e => e.key === 'Enter' && handleRename()}
                      />
                    </div>
                  ) : (
                    <span className="cursor-pointer hover:text-foreground transition-colors flex items-center gap-2" onClick={() => setIsEditingName(true)}>
                      <span className="truncate">{session.name}</span>
                      <LuPencil className="h-3 w-3 shrink-0 opacity-50" />
                    </span>
                  )}
                </p>
            </div>
          </div>
            <div id="dm-action-buttons" className="dm-action-buttons flex flex-col gap-2 shrink-0">
              <div id="dm-primary-actions" className="dm-primary-actions flex items-center gap-1.5 sm:gap-2">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button id="dm-manage-players-btn" className="dm-manage-players-btn" variant="outline" size="sm" title="Share player links">
                    <LuLink className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Manage Players</span>
                  </Button>
                </SheetTrigger>
                <SheetContent>
                <SheetHeader>
                  <SheetTitle id="player-links-dialog-title">Player Access Links</SheetTitle>
                  <SheetDescription id="player-links-dialog-description">
                    Share these unique links with your players so they can manage their inventories.
                  </SheetDescription>
                </SheetHeader>

                {/* Import result message */}
                {showImportBanner && importResult && (
                  <div id="import-result-banner" className="import-result-banner mt-4 p-3 bg-green-100 dark:bg-green-900 border-2 border-green-600 dark:border-green-400 rounded text-center relative">
                    <button
                      onClick={() => setShowImportBanner(false)}
                      className="absolute top-1 right-2 text-green-700 dark:text-green-300 hover:text-green-900 dark:hover:text-green-100 text-lg font-bold"
                      aria-label="Dismiss"
                    >
                      ×
                    </button>
                    <p className="font-press-start text-8bit-sm text-green-800 dark:text-green-200 inline-flex items-center gap-1">
                      <LuCheck className="h-4 w-4" aria-hidden="true" />
                      Imported!
                    </p>
                    <p className="font-press-start text-8bit-xs text-green-700 dark:text-green-300 mt-1">
                      {importResult.items} items, {importResult.members} members, {importResult.gold} gold changes
                    </p>
                  </div>
                )}

                <div id="add-member-section" className="add-member-section mt-6 border-b-2 border-black dark:border-white pb-6">
                  <p id="add-member-label" className="add-member-label font-press-start text-8bit-sm font-bold mb-3">Add New Member</p>
                  <div className="flex gap-2">
                    <Input
                      id="dm-new-member-input"
                      className="dm-new-member-input text-8bit-sm h-9"
                      placeholder="Player Name"
                      value={newMemberName}
                      onChange={e => setNewMemberName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddMember()}
                    />
                    <Button
                      id="dm-add-member-btn"
                      className="dm-add-member-btn"
                      size="sm"
                      onClick={handleAddMember}
                      disabled={!newMemberName.trim() || loading}
                    >
                      {loading ? '...' : 'Add'}
                    </Button>
                  </div>
                </div>

                <div id="members-list-section" className="members-list-section mt-6 space-y-6 overflow-y-auto max-h-[70vh] pr-2 pb-4">
                  {members.map(m => (
                    <div key={m.id} id={`dm-member-${m.id}`} className="dm-member space-y-2 min-h-0">
                      <p className="font-press-start text-8bit-sm font-bold text-foreground inline-flex items-center gap-1.5">
                        <LuSwords className="h-4 w-4" aria-hidden="true" />
                        {m.name}
                      </p>
                        <Input
                          readOnly
                          value={origin ? `${origin}/p/${m.token}` : `/p/${m.token}`}
                          className="dm-player-link-input text-8bit-sm h-8"
                        />
                      <div className="flex gap-2">
                        <Button
                          asChild
                          id={`dm-open-player-link-btn-${m.id}`}
                          className={`dm-open-player-link-btn dm-open-player-link-btn-${m.id} h-8 text-8bit-sm flex-1`}
                          size="sm"
                          variant="secondary"
                        >
                          <a
                            href={`/p/${m.token}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Open
                          </a>
                        </Button>
                        <Button
                          id={`dm-copy-player-link-btn-${m.id}`}
                          className={`dm-copy-player-link-btn dm-copy-player-link-btn-${m.id} h-8 text-8bit-sm flex-1`}
                          size="sm"
                          variant="outline"
                          onClick={() =>
                          {
                            const url = origin ? `${origin}/p/${m.token}` : `${window.location.origin}/p/${m.token}`
                            navigator.clipboard.writeText(url)
                          }}
                        >
                          Copy
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </SheetContent>
                </Sheet>
                <Badge id="dm-role-badge" variant="destructive" className="dm-role-badge text-8bit-xs hidden sm:inline-flex">{session.dmRole}</Badge>
                <ThemeSelect />
                <ThemeToggle />
              </div>
              {/* Hidden file input for import */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportFile}
                className="hidden"
              />
              <div id="dm-secondary-actions" className="dm-secondary-actions flex items-center gap-1.5 sm:gap-2">
                <Button id="dm-refresh-btn" className='dm-refresh-btn refresh-data' variant="outline" size="sm" onClick={refreshData} disabled={refreshing} title="Refresh data">
                  <LuRefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
                </Button>
                <Button id="dm-export-btn" className="dm-export-btn" variant="outline" size="sm" onClick={handleExport} title="Export session data">
                  <LuDownload className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Export</span>
                </Button>
                <Button id="dm-import-btn" className="dm-import-btn" variant="outline" size="sm" onClick={handleImportClick} disabled={importing} title="Import session data">
                  <LuUpload className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">{importing ? 'Importing...' : 'Import'}</span>
                </Button>
              </div>
            </div>
        </div>
      </header>

      <Tabs id="dm-tabs" className="dm-tabs" defaultValue="pool">
        <TabsList id="dm-tabs-list" className="dm-tabs-list">
          <TabsTrigger id="dm-tab-pool" className='dm-tab-pool grow' value="pool">
            Party Bag {partyPool.length > 0 && `(${partyPool.length})`}
          </TabsTrigger>
          <TabsTrigger id="dm-tab-members" className='dm-tab-members grow' value="members">Members</TabsTrigger>
          <TabsTrigger id="dm-tab-gold" className='dm-tab-gold grow' value="gold">
            {session.currencyType === 'wealth' ? 'Wealth' : 'Gold'}
          </TabsTrigger>
          <TabsTrigger id="dm-tab-activity" className='dm-tab-activity grow' value="activity">Activity</TabsTrigger>
        </TabsList>

        {/* ── Party Pool ── */}
        <TabsContent id="dm-tab-content-pool" className="dm-tab-content-pool" value="pool">
          <GoldPanel
            id="dm-party-bag-gold"
            className="dm-party-bag-gold"
            publicGold={partyGold}
            isDM
            currencyType={session.currencyType}
            titleOverride={session.currencyType === 'wealth' ? "Party Bag Wealth" : "Party Bag Gold"}
            onAdjustPublic={adjustPartyGold}
          />
          <AddItemForm
            id="dm-add-item-form"
            className="dm-add-item-form"
            onAdd={addToPool}
            isLoading={loading}
            showPrivateToggle={false}
            placeholder="Add loot to party pool..."
          />
          <ItemFilter
            id="dm-item-filter"
            className="dm-item-filter"
            search={poolSearch}
            onSearchChange={setPoolSearch}
            typeFilter={poolTypeFilter}
            onTypeFilterChange={setPoolTypeFilter}
            resultCount={filteredPool.length}
            totalCount={partyPool.length}
          />
          <div id="dm-pool-items-list" className="dm-pool-items-list space-y-2">
            {partyPool.length === 0 ? (
              <p id="dm-empty-pool-message" className="dm-empty-pool-message font-press-start text-8bit-sm text-muted-foreground text-center py-8">
                Party Bag is empty. Drop some loot!
              </p>
            ) : (
              filteredPool.map(item => (
                <ItemCard key={item.id} item={item} viewerIsDM onDelete={deleteItem} onUpdate={updateItemAction} onDuplicate={duplicateItem} dmRole={session.dmRole} />
              ))
            )}
          </div>
        </TabsContent>

        {/* ── Members ── */}
        <TabsContent id="dm-tab-content-members" className="dm-tab-content-members" value="members">
          <div id="dm-members-list" className="dm-members-list space-y-4">
            {members.map(m => (
              <Card key={m.id} id={`dm-member-card-${m.id}`} className="dm-member-card">
                <CardHeader className="pb-2">
                  <CardTitle id={`dm-member-title-${m.id}`} className="dm-member-title text-xs flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5">
                      <LuSwords className="h-4 w-4" aria-hidden="true" />
                      {m.name}
                    </span>
                    <span className={session.currencyType === 'wealth' ? "text-muted-foreground" : "text-yellow-600 dark:text-yellow-400"}>
                      {session.currencyType === 'wealth' ? `${m.publicGold} W` : `${Math.floor(m.publicGold / 100)}gp`}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div id={`dm-member-items-${m.id}`} className="dm-member-items space-y-2">
                    {memberItems(m.id).length === 0 ? (
                      <p className="font-press-start text-8bit-sm text-muted-foreground">
                        No items.
                      </p>
                    ) : (
                      memberItems(m.id).map(item => (
                        <ItemCard
                          key={item.id}
                          item={item}
                          viewerIsDM
                          onDelete={deleteItem}
                          onUpdate={updateItemAction}
                          onDuplicate={duplicateItem}
                          dmRole={session.dmRole}
                        />
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ── Currency ── */}
        <TabsContent id="dm-tab-content-gold" className="dm-tab-content-gold" value="gold">
          <GoldPanel
            id="dm-total-gold"
            className="dm-total-gold"
            publicGold={totalGold}
            isDM
            memberCount={members.length}
            currencyType={session.currencyType}
            titleOverride={session.currencyType === 'wealth' ? "Total Distributed Wealth" : "Total Distributed Gold"}
            onSplitGold={splitGold}
          />

          <div id="dm-give-gold-section" className="dm-give-gold-section space-y-3">
            <p id="dm-give-gold-label" className="dm-give-gold-label font-press-start text-xs mb-3">Give {session.currencyType === 'wealth' ? 'Wealth' : 'Currency'} Directly</p>
            {members.map(m => (
              <GiveMemberGold key={m.id} member={m} onGive={giveGold} currencyType={session.currencyType} />
            ))}
          </div>
        </TabsContent>

        {/* ── Activity Log ── */}
        <TabsContent id="dm-tab-content-activity" className="dm-tab-content-activity" value="activity">
          <ActivityLog token={dmToken} role="dm" />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ── Give gold sub-component ───────────────────────────────

function GiveMemberGold({
  member,
  onGive,
  currencyType
}: {
  member: Member
  onGive: (id: string, deltaCp: number, field: 'publicGold' | 'privateGold') => Promise<void>
  currencyType: 'dnd' | 'wealth'
})
{
  const [gp, setGp] = useState('')
  const [sp, setSp] = useState('')
  const [cp, setCp] = useState('')
  const [field, setField] = useState<'publicGold' | 'privateGold'>('publicGold')
  const [loading, setLoading] = useState(false)

  const deltaCp = currencyType === 'wealth'
    ? (parseFloat(cp) || 0)
    : Math.round((parseFloat(gp) || 0) * 100 + (parseFloat(sp) || 0) * 10 + (parseFloat(cp) || 0))

  const hasValue = currencyType === 'wealth' ? cp !== '' : (gp !== '' || sp !== '' || cp !== '')

  const handle = async (sign: 1 | -1) =>
  {
    if (!hasValue || deltaCp === 0) return
    setLoading(true)
    await onGive(member.id, sign * deltaCp, field)
    setGp(''); setSp(''); setCp('')
    setLoading(false)
  }

  const publicDisplay = (() =>
  {
    if (currencyType === 'wealth') return `${member.publicGold} W`
    const g = Math.floor(member.publicGold / 100)
    const s = Math.floor((member.publicGold % 100) / 10)
    const c = member.publicGold % 10
    return [g > 0 && `${g}gp`, s > 0 && `${s}sp`, c > 0 && `${c}cp`].filter(Boolean).join(' ') || '0cp'
  })()

  return (
    <Card id={`give-gold-card-${member.id}`} className="give-gold-card">
      <CardContent className="p-2 sm:p-3 space-y-2">
        <div id={`give-gold-header-${member.id}`} className="give-gold-header flex items-center justify-between">
          <span className="give-gold-member-name font-press-start text-8bit-sm font-bold">{member.name}</span>
          <span className="give-gold-member-balance font-press-start text-8bit-sm text-yellow-600 dark:text-yellow-400">{publicDisplay}</span>
        </div>

        {currencyType === 'wealth' ? (
          <div className="give-gold-wealth-input flex gap-1 items-center">
            <Input type="number" min={0} placeholder="0" value={cp}
              onChange={e => setCp(e.target.value)} className="give-gold-wealth-field w-full max-w-24 sm:w-20 text-center" />
            <span className="font-press-start text-8bit-sm text-muted-foreground shrink-0">Wealth</span>
          </div>
        ) : (
          <div className="give-gold-currency-inputs grid grid-cols-3 gap-1 items-center min-w-0">
            <div className="give-gold-gp-container flex items-center gap-0.5 min-w-0">
              <Input type="number" min={0} placeholder="0" value={gp}
                onChange={e => setGp(e.target.value)} className="give-gold-gp-input flex-1 min-w-0 text-center" />
              <span className="font-press-start text-8bit-sm text-yellow-600 dark:text-yellow-400 shrink-0">gp</span>
            </div>
            <div className="give-gold-sp-container flex items-center gap-0.5 min-w-0">
              <Input type="number" min={0} placeholder="0" value={sp}
                onChange={e => setSp(e.target.value)} className="give-gold-sp-input flex-1 min-w-0 text-center" />
              <span className="font-press-start text-8bit-sm text-slate-400 shrink-0">sp</span>
            </div>
            <div className="give-gold-cp-container flex items-center gap-0.5 min-w-0">
              <Input type="number" min={0} placeholder="0" value={cp}
                onChange={e => setCp(e.target.value)} className="give-gold-cp-input flex-1 min-w-0 text-center" />
              <span className="font-press-start text-8bit-sm text-orange-600 dark:text-orange-400 shrink-0">cp</span>
            </div>
          </div>
        )}

        <div id={`give-gold-actions-${member.id}`} className="give-gold-actions flex gap-2 items-center mb-2">
          <select
            id={`give-gold-field-select-${member.id}`}
            className="give-gold-field-select font-press-start text-8bit-sm border-2 border-black dark:border-white bg-background px-1 py-1 h-9 flex-1 sm:flex-none"
            value={field}
            onChange={e => setField(e.target.value as 'publicGold' | 'privateGold')}
          >
            <option value="publicGold">Public</option>
            <option value="privateGold">Private</option>
          </select>
          <Button id={`dm-give-gold-btn-${member.id}`} className={`dm-give-gold-btn dm-give-gold-btn-${member.id}`} size="sm" variant="secondary" disabled={!hasValue || deltaCp === 0 || loading} onClick={() => handle(1)}>Give</Button>
          <Button id={`dm-take-gold-btn-${member.id}`} className={`dm-take-gold-btn dm-take-gold-btn-${member.id}`} size="sm" variant="outline" disabled={!hasValue || deltaCp === 0 || loading} onClick={() => handle(-1)}>Take</Button>
        </div>
      </CardContent>
    </Card>
  )
}
