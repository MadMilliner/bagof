'use client'

import { useState, useCallback } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/8bit/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/8bit/card'
import { Badge } from '@/components/ui/8bit/badge'
import { Button } from '@/components/ui/8bit/button'
import { Input } from '@/components/ui/8bit/input'
import { ItemCard } from '@/components/inventory/ItemCard'
import { AddItemForm } from '@/components/inventory/AddItemForm'
import { ItemFilter, filterItems } from '@/components/inventory/ItemFilter'
import { GoldPanel } from '@/components/gold/GoldPanel'
import { ActivityLog } from '@/components/ActivityLog'
import { ThemeToggle } from '@/components/ThemeProvider'
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
import type { Item, Member, Session, ItemType } from '@/types'
import { useEffect } from 'react'

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

  useEffect(() =>
  {
    setOrigin(window.location.origin)
    setMounted(true)
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
    <div className="min-h-screen bg-background p-4 max-w-2xl mx-auto">
      <header className="mb-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="font-press-start text-2xl"></span>
            <div>
              <p className="font-press-start text-8bit-sm text-muted-foreground">Bag of</p>
              <h1 className="font-press-start text-8bit-lg leading-tight mt-1">{session.dmRole}</h1>
              <p className="font-press-start text-8bit-sm text-muted-foreground mt-1">{session.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button className='refresh-data' variant="outline" size="sm" onClick={refreshData} disabled={refreshing} title="Refresh data">
              {refreshing ? '⟳' : '↻'}
            </Button>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" title="Share player links">
                  <LuLink className="h-4 w-4 mr-2" />
                  Manage Players and Links
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Player Access Links</SheetTitle>
                  <SheetDescription>
                    Share these unique links with your players so they can manage their inventories.
                  </SheetDescription>
                </SheetHeader>

                <div className="mt-6 border-b-2 border-black dark:border-white pb-6">
                  <p className="font-press-start text-8bit-sm font-bold mb-3">Add New Member</p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Player Name"
                      value={newMemberName}
                      onChange={e => setNewMemberName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddMember()}
                      className="text-8bit-sm h-9"
                    />
                    <Button
                      size="sm"
                      onClick={handleAddMember}
                      disabled={!newMemberName.trim() || loading}
                    >
                      {loading ? '...' : 'Add'}
                    </Button>
                  </div>
                </div>

                <div className="mt-6 space-y-6 overflow-y-auto max-h-[60vh] pr-2">
                  {members.map(m => (
                    <div key={m.id} className="space-y-2">                        <p className="font-press-start text-8bit-sm font-bold text-foreground">⚔️ {m.name}</p>
                      <div className="flex gap-2">
                        <Input
                          readOnly
                          value={origin ? `${origin}/p/${m.token}` : `/p/${m.token}`}
                          className="text-8bit-sm h-8"
                        />
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-8 text-8bit-sm"
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
            <Badge variant="destructive">{session.dmRole}</Badge>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <Tabs defaultValue="pool">
        <TabsList>
          <TabsTrigger className='grow' value="pool">
            Party Bag {partyPool.length > 0 && `(${partyPool.length})`}
          </TabsTrigger>
          <TabsTrigger className='grow' value="members">Members</TabsTrigger>
          <TabsTrigger className='grow' value="gold">
            {session.currencyType === 'wealth' ? 'Wealth' : 'Gold'}
          </TabsTrigger>
          <TabsTrigger className='grow' value="activity">Activity</TabsTrigger>
        </TabsList>

        {/* ── Party Pool ── */}
        <TabsContent value="pool">
          <GoldPanel
            publicGold={partyGold}
            isDM
            currencyType={session.currencyType}
            titleOverride={session.currencyType === 'wealth' ? "Party Bag Wealth" : "Party Bag Gold"}
            onAdjustPublic={adjustPartyGold}
          />
          <AddItemForm
            onAdd={addToPool}
            isLoading={loading}
            showPrivateToggle={false}
            placeholder="Add loot to party pool..."
          />
          <ItemFilter
            search={poolSearch}
            onSearchChange={setPoolSearch}
            typeFilter={poolTypeFilter}
            onTypeFilterChange={setPoolTypeFilter}
            resultCount={filteredPool.length}
            totalCount={partyPool.length}
          />
          <div className="space-y-2">
            {partyPool.length === 0 ? (
              <p className="font-press-start text-8bit-sm text-muted-foreground text-center py-8">
                Party Bag is empty. Drop some loot!
              </p>
            ) : (
              filteredPool.map(item => (
                <ItemCard key={item.id} item={item} viewerIsDM onDelete={deleteItem} onUpdate={updateItemAction} dmRole={session.dmRole} />
              ))
            )}
          </div>
        </TabsContent>

        {/* ── Members ── */}
        <TabsContent value="members">
          <div className="space-y-4">
            {members.map(m => (
              <Card key={m.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs flex items-center justify-between">
                    <span>⚔️ {m.name}</span>
                    <span className={session.currencyType === 'wealth' ? "text-muted-foreground" : "text-yellow-600 dark:text-yellow-400"}>
                      {session.currencyType === 'wealth' ? `${m.publicGold} W` : `${Math.floor(m.publicGold / 100)}gp`}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
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
        <TabsContent value="gold">
          <GoldPanel
            publicGold={totalGold}
            isDM
            memberCount={members.length}
            currencyType={session.currencyType}
            titleOverride={session.currencyType === 'wealth' ? "Total Distributed Wealth" : "Total Distributed Gold"}
            onSplitGold={splitGold}
          />

          <div className="space-y-3">
            <p className="font-press-start text-xs mb-3">Give {session.currencyType === 'wealth' ? 'Wealth' : 'Currency'} Directly</p>
            {members.map(m => (
              <GiveMemberGold key={m.id} member={m} onGive={giveGold} currencyType={session.currencyType} />
            ))}
          </div>
        </TabsContent>

        {/* ── Activity Log ── */}
        <TabsContent value="activity">
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
    <Card>
      <CardContent className="pt-3 pb-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-press-start text-8bit-sm font-bold">{member.name}</span>
          <span className="font-press-start text-8bit-sm text-yellow-600 dark:text-yellow-400">{publicDisplay}</span>
        </div>

        {currencyType === 'wealth' ? (
          <div className="flex gap-1 items-center">
            <Input type="number" min={0} placeholder="0" value={cp}
              onChange={e => setCp(e.target.value)} className="w-20 text-center" />
            <span className="font-press-start text-8bit-sm text-muted-foreground mt-1">Wealth</span>
          </div>
        ) : (
          <div className="flex gap-1 items-center flex-wrap">
            <div className="flex items-center gap-1">
              <Input type="number" min={0} placeholder="0" value={gp}
                onChange={e => setGp(e.target.value)} className="w-20 text-center" />
              <span className="font-press-start text-8bit-sm text-yellow-600 dark:text-yellow-400">gp</span>
            </div>
            <div className="flex items-center gap-1">
              <Input type="number" min={0} placeholder="0" value={sp}
                onChange={e => setSp(e.target.value)} className="w-20 text-center" />
              <span className="font-press-start text-8bit-sm text-slate-400">sp</span>
            </div>
            <div className="flex items-center gap-1">
              <Input type="number" min={0} placeholder="0" value={cp}
                onChange={e => setCp(e.target.value)} className="w-20 text-center" />
              <span className="font-press-start text-8bit-sm text-orange-600 dark:text-orange-400">cp</span>
            </div>
          </div>
        )}

        <div className="flex gap-1 items-center mb-2">
          <select
            className="font-press-start text-8bit-sm border-2 border-black dark:border-white bg-background px-1 py-1 h-9"
            value={field}
            onChange={e => setField(e.target.value as 'publicGold' | 'privateGold')}
          >
            <option value="publicGold">Public</option>
            <option value="privateGold">Private</option>
          </select>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" disabled={!hasValue || deltaCp === 0 || loading} onClick={() => handle(1)}>Give</Button>
          <Button size="sm" variant="outline" disabled={!hasValue || deltaCp === 0 || loading} onClick={() => handle(-1)}>Take</Button>
        </div>
      </CardContent>
    </Card>
  )
}
