'use client'

import { useState, useEffect, useCallback } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/8bit/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/8bit/card'
import { ItemCard } from '@/components/inventory/ItemCard'
import { AddItemForm } from '@/components/inventory/AddItemForm'
import { ItemFilter, filterItems } from '@/components/inventory/ItemFilter'
import { GoldPanel, CurrencyInput, formatCurrency } from '@/components/gold/GoldPanel'
import { ActivityLog } from '@/components/ActivityLog'
import { ThemeToggle } from '@/components/ThemeProvider'
import { Button } from '@/components/ui/8bit/button'
import type { Item, Member, Session, ItemType } from '@/types'
import { savePlayerLink } from '@/lib/savedSessions'
import { BagOfLogo } from '@/components/BagOfLogo'

interface OtherMember
{
  member: Member
  items: Item[]
}

interface PlayerDashboardProps
{
  session: Session
  member: Member
  memberToken: string
  initialMyItems: Item[]
  initialPartyPool: Item[]
  initialOtherMembers: OtherMember[]
}

export function PlayerDashboard({
  session,
  member,
  memberToken,
  initialMyItems,
  initialPartyPool,
  initialOtherMembers,
}: PlayerDashboardProps)
{
  const [myItems, setMyItems] = useState<Item[]>(initialMyItems)
  const [partyPool, setPartyPool] = useState<Item[]>(initialPartyPool)
  const [otherMembers, setOtherMembers] = useState<OtherMember[]>(initialOtherMembers)
  const [gold, setGold] = useState({ public: member.publicGold, private: member.privateGold, party: session.partyGold })
  const [memberName, setMemberName] = useState(member.name)
  const [isEditingName, setIsEditingName] = useState(false)
  // gold values are in copper pieces (cp)
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [poolSearch, setPoolSearch] = useState('')
  const [poolTypeFilter, setPoolTypeFilter] = useState<ItemType | 'All'>('All')

  useEffect(() =>
  {
    setMounted(true)
    // Auto-save player link to localStorage (updates name if changed)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- props are stable server-rendered values
    savePlayerLink({
      memberId: member.id,
      sessionId: session.id,
      sessionName: session.name,
      memberName: member.name,
      memberToken: memberToken,
      dmRole: session.dmRole,
      savedAt: new Date().toISOString(),
    })
  }, [])

  // ── Polling: auto-refresh every 30s to stay in sync with DM/other players ──
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
      const res = await fetch(`/api/refresh?token=${memberToken}&role=player`)
      if (!res.ok) return
      const data = await res.json()
      setMyItems(data.myItems)
      setPartyPool(data.partyPool)
      setOtherMembers(data.otherMembers)
      setGold({ public: data.member.publicGold, private: data.member.privateGold, party: data.session.partyGold })
    } catch {
      // Silently fail — polling is best-effort
    } finally {
      setRefreshing(false)
    }
  }, [memberToken])

  if (!mounted) return null

  // ── Actions ───────────────────────────────────────────────

  const addItem = async (itemData: {
    name: string; description: string; type: ItemType; quantity: number; private: boolean
  }) =>
  {
    setLoading(true)
    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: memberToken, item: itemData }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMyItems(prev => [data.item, ...prev])
    } catch {
      // No optimistic update to roll back — item wasn't added to state yet
    } finally {
      setLoading(false)
    }
  }

  const claimItem = async (item: Item) =>
  {
    // Optimistic update
    setPartyPool(prev => prev.filter(i => i.id !== item.id))
    setMyItems(prev => [{ ...item, ownerId: member.id }, ...prev])

    const res = await fetch('/api/items', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: memberToken, itemId: item.id, action: 'claim' }),
    })
    if (!res.ok) {
      // Roll back
      setPartyPool(prev => [...prev, item])
      setMyItems(prev => prev.filter(i => i.id !== item.id))
    }
  }

  // Offer to party: if qty > 1, creates N separate items server-side
  const offerItem = async (item: Item) =>
  {
    // Optimistic update: remove from inventory, add to party pool
    const optimisticPoolItem = { ...item, ownerId: null, offeredToParty: true, private: false }
    setMyItems(prev => prev.filter(i => i.id !== item.id))
    setPartyPool(prev => item.quantity > 1
      ? [...Array(item.quantity).fill(null).map((_, i) => ({ ...optimisticPoolItem, id: `__opt_${item.id}_${i}` })), ...prev]
      : [optimisticPoolItem, ...prev]
    )

    const res = await fetch('/api/items', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: memberToken, itemId: item.id, action: 'offer' }),
    })
    const data = await res.json()
    if (!res.ok) {
      // Roll back both
      setMyItems(prev => [item, ...prev])
      setPartyPool(prev => prev.filter(i => !i.id.startsWith('__opt_')))
      return
    }
    // Replace optimistic items with real server data
    setPartyPool(prev => [...data.items, ...prev.filter(i => !i.id.startsWith('__opt_'))])
  }

  const togglePrivate = async (item: Item) =>
  {
    // Optimistic update
    const newPrivate = !item.private
    setMyItems(prev => prev.map(i => i.id === item.id ? { ...i, private: newPrivate } : i))

    const res = await fetch('/api/items', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: memberToken,
        itemId: item.id,
        action: 'update',
        updates: { private: newPrivate },
      }),
    })
    if (!res.ok) {
      // Roll back
      setMyItems(prev => prev.map(i => i.id === item.id ? { ...i, private: item.private } : i))
    }
  }

  const updateItemAction = async (item: Item, updates: Partial<Item>) =>
  {
    // Optimistic update
    setMyItems(prev => prev.map(i => i.id === item.id ? { ...i, ...updates } : i))

    const res = await fetch('/api/items', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: memberToken, itemId: item.id, action: 'update', updates }),
    })
    if (!res.ok) {
      // Roll back
      setMyItems(prev => prev.map(i => i.id === item.id ? item : i))
    }
  }

  const deleteItem = async (item: Item) =>
  {
    // Optimistic update
    setMyItems(prev => prev.filter(i => i.id !== item.id))

    const res = await fetch('/api/items', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: memberToken, itemId: item.id }),
    })
    if (!res.ok) {
      // Roll back
      setMyItems(prev => [item, ...prev])
    }
  }

  const adjustGold = async (deltaCp: number, field: 'publicGold' | 'privateGold') =>
  {
    // Optimistic update
    const key = field === 'publicGold' ? 'public' : 'private'
    setGold(prev => ({ ...prev, [key]: Math.max(0, prev[key] + deltaCp) }))

    const res = await fetch('/api/gold', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: memberToken, action: 'adjust', deltaCp, field }),
    })
    if (!res.ok) {
      // Roll back
      setGold(prev => ({ ...prev, [key]: Math.max(0, prev[key] - deltaCp) }))
    }
  }

  const transferToPool = async (amountCp: number) => {
    if (amountCp < 1) return
    // Optimistic update
    setGold(prev => ({ ...prev, public: Math.max(0, prev.public - amountCp), party: prev.party + amountCp }))

    const res = await fetch('/api/gold', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: memberToken, action: 'transfer_to_pool', amountCp }),
    })
    if (!res.ok) {
      // Roll back
      setGold(prev => ({ ...prev, public: prev.public + amountCp, party: Math.max(0, prev.party - amountCp) }))
    }
  }

  const transferFromPool = async (amountCp: number) => {
    if (amountCp < 1) return
    // Optimistic update
    setGold(prev => ({ ...prev, party: Math.max(0, prev.party - amountCp), public: prev.public + amountCp }))

    const res = await fetch('/api/gold', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: memberToken, action: 'transfer_from_pool', amountCp }),
    })
    if (!res.ok) {
      // Roll back
      setGold(prev => ({ ...prev, party: prev.party + amountCp, public: Math.max(0, prev.public - amountCp) }))
    }
  }

  const updateName = async () =>
  {
    if (!memberName.trim() || memberName === member.name) {
      setIsEditingName(false)
      setMemberName(member.name)
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/members', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: memberToken, name: memberName.trim() }),
      })
      if (!res.ok) throw new Error('Failed to update name')
      setIsEditingName(false)
    } catch (err) {
      console.error(err)
      setMemberName(member.name)
      setIsEditingName(false)
    } finally {
      setLoading(false)
    }
  }

  const totalOtherItems = otherMembers.reduce((s, o) => s + o.items.length, 0)
  const filteredPool = filterItems(partyPool, poolSearch, poolTypeFilter)

  // ── Render ────────────────────────────────────────────────

  return (
    <div id="player-dashboard" className="player-dashboard min-h-screen bg-background p-4 max-w-5xl mx-auto">
      <header id="player-header" className="player-header mb-6 pb-6">
        <div id="player-header-content" className="player-header-content flex items-start justify-between gap-6">
          <div id="player-title-section" className="player-title-section flex items-start gap-4 min-w-0 flex-1">
            <span className="font-press-start text-2xl shrink-0"></span>
            <div id="player-title-text-container" className="player-title-text-container min-w-0">
              <BagOfLogo />
              {isEditingName ? (
                <div id="player-name-edit-container" className="player-name-edit-container flex items-center gap-2 mt-2 min-w-0">
                  <input
                    autoFocus
                    id="player-name-input"
                    className="player-name-input font-press-start text-xs border-2 border-black dark:border-white bg-background px-1 py-0.5 w-full min-w-0 outline-none"
                    value={memberName}
                    onChange={e => setMemberName(e.target.value)}
                    onBlur={updateName}
                    onKeyDown={e => e.key === 'Enter' && updateName()}
                  />
                </div>
              ) : (
                <h1
                  id="player-name-heading"
                  className="player-name-heading font-press-start text-lg leading-tight mt-2 cursor-pointer hover:text-muted-foreground transition-colors flex items-center gap-2 min-w-0"
                  onClick={() => setIsEditingName(true)}
                >
                  <span id="player-character-name" className="player-character-name truncate">{memberName}</span>
                  <span id="player-edit-hint" className="player-edit-hint text-8bit-sm text-muted-foreground opacity-50 shrink-0">edit</span>
                </h1>
              )}
              <p id="player-session-name" className="player-session-name font-press-start text-8bit-sm text-muted-foreground mt-2 truncate">{session.name}</p>
            </div>
          </div>
          <div id="player-action-buttons" className="player-action-buttons flex items-center gap-2 shrink-0">
            <Button id="player-refresh-btn" className="player-refresh-btn refresh-data" variant="outline" size="sm" onClick={refreshData} disabled={refreshing} title="Refresh data">
              {refreshing ? '⟳' : '↻'}
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <Tabs id="player-tabs" className="player-tabs" defaultValue="inventory">
        <TabsList id="player-tabs-list" className="player-tabs-list">
          <TabsTrigger id="player-tab-inventory" className="player-tab-inventory grow" value="inventory">My Inventory</TabsTrigger>
          <TabsTrigger id="player-tab-pool" className="player-tab-pool grow" value="pool">
            Party Bag {partyPool.length > 0 && `(${partyPool.length})`}
          </TabsTrigger>
          <TabsTrigger id="player-tab-others" className="player-tab-others grow" value="others">
            Other Members {totalOtherItems > 0 && `(${totalOtherItems})`}
          </TabsTrigger>
          <TabsTrigger id="player-tab-activity" className="player-tab-activity grow" value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent id="player-tab-content-inventory" className="player-tab-content-inventory" value="inventory">
          <GoldPanel
            id="player-my-gold"
            className="player-my-gold"
            publicGold={gold.public}
            privateGold={gold.private}
            showPrivate
            currencyType={session.currencyType}
            onAdjustPublic={deltaCp => adjustGold(deltaCp, 'publicGold')}
            onAdjustPrivate={deltaCp => adjustGold(deltaCp, 'privateGold')}
          />
          <AddItemForm id="player-add-item-form" className="player-add-item-form" onAdd={addItem} isLoading={loading} showPrivateToggle />
          <div id="player-inventory-list" className="player-inventory-list space-y-2">
            {myItems.length === 0 ? (
              <p id="player-empty-inventory-message" className="player-empty-inventory-message font-press-start text-8bit-sm text-muted-foreground text-center py-8">
                Your pack is empty...
              </p>
            ) : (
              myItems.map(item => (
                <ItemCard
                  key={item.id}
                  item={item}
                  viewerIsOwner
                  onOffer={offerItem}
                  onTogglePrivate={togglePrivate}
                  onDelete={deleteItem}
                  onUpdate={updateItemAction}
                  dmRole={session.dmRole}
                />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent id="player-tab-content-pool" className="player-tab-content-pool" value="pool">
          <GoldPanel
            id="player-party-bag-gold"
            className="player-party-bag-gold"
            publicGold={gold.party}
            currencyType={session.currencyType}
            titleOverride={session.currencyType === 'wealth' ? "Party Bag Wealth" : "Party Bag Gold"}
          />
          <div id="player-transfer-section" className="player-transfer-section border-2 border-black dark:border-white p-3 space-y-4 bg-card mt-4 mb-4">
            <p id="player-transfer-label" className="player-transfer-label font-press-start text-8bit-sm text-muted-foreground border-b-2 border-black dark:border-white pb-2">
              Transfer Currency
            </p>
            <CurrencyInput
              idPrefix="transfer-to-pool"
              label="Donate to Party Bag"
              onAdjust={transferToPool}
              loading={loading}
              currencyType={session.currencyType}
            />
            <div id="player-transfer-from-pool-container" className="player-transfer-from-pool-container border-t-2 border-black dark:border-white pt-2">
              <CurrencyInput
                idPrefix="transfer-from-pool"
                label="Take from Party Bag"
                onAdjust={transferFromPool}
                loading={loading}
                currencyType={session.currencyType}
              />
            </div>
          </div>
          <ItemFilter
            id="player-pool-filter"
            className="player-pool-filter"
            search={poolSearch}
            onSearchChange={setPoolSearch}
            typeFilter={poolTypeFilter}
            onTypeFilterChange={setPoolTypeFilter}
            resultCount={filteredPool.length}
            totalCount={partyPool.length}
          />
          <div id="player-pool-items-list" className="player-pool-items-list space-y-2">
            {partyPool.length === 0 ? (
              <p id="player-empty-pool-message" className="player-empty-pool-message font-press-start text-8bit-sm text-muted-foreground text-center py-8">
                The bag is empty. Nothing to loot!
              </p>
            ) : (
              filteredPool.map(item => (
                <ItemCard
                  key={item.id}
                  item={item}
                  onClaim={claimItem}
                  dmRole={session.dmRole}
                />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent id="player-tab-content-others" className="player-tab-content-others" value="others">
          <div id="player-others-list" className="player-others-list space-y-4">
            {otherMembers.length === 0 ? (
              <p className="font-press-start text-8bit-sm text-muted-foreground text-center py-8">
                No other party members.
              </p>
            ) : (
              otherMembers.map(({ member: m, items }) => (
                <Card key={m.id} id={`player-other-member-card-${m.id}`} className="player-other-member-card">
                  <CardHeader className="pb-2">
                    <CardTitle id={`player-other-member-title-${m.id}`} className="player-other-member-title text-xs flex items-center justify-between">
                      <span>⚔️ {m.name}</span>
                      <span className="text-yellow-600 dark:text-yellow-400">
                        {formatCurrency(m.publicGold, session.currencyType)}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent id={`player-other-member-items-${m.id}`} className="player-other-member-items space-y-2">
                    {items.length === 0 ? (
                      <p className="font-press-start text-8bit-sm text-muted-foreground pt-1 pb-2">
                        No public items.
                      </p>
                    ) : (
                      items.map(item => (
                        <ItemCard key={item.id} item={item} dmRole={session.dmRole} />
                      ))
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent id="player-tab-content-activity" className="player-tab-content-activity" value="activity">
          <ActivityLog token={memberToken} role="player" />
        </TabsContent>
      </Tabs>
    </div>
  )
}
