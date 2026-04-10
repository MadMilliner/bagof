'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/8bit/tabs'
import { Badge } from '@/components/ui/8bit/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/8bit/card'
import { ItemCard } from '@/components/inventory/ItemCard'
import { AddItemForm } from '@/components/inventory/AddItemForm'
import { GoldPanel, CurrencyInput, formatCurrency } from '@/components/gold/GoldPanel'
import { ThemeToggle } from '@/components/ThemeProvider'
import type { Item, Member, Session, ItemType } from '@/types'

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
  const [gold, setGold] = useState({ public: member.publicGold, private: member.privateGold, party: session.partyGold })
  const [memberName, setMemberName] = useState(member.name)
  const [isEditingName, setIsEditingName] = useState(false)
  // gold values are in copper pieces (cp)
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() =>
  {
    setMounted(true)
  }, [])

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
    } finally {
      setLoading(false)
    }
  }

  const claimItem = async (item: Item) =>
  {
    const res = await fetch('/api/items', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: memberToken, itemId: item.id, action: 'claim' }),
    })
    if (!res.ok) return
    setPartyPool(prev => prev.filter(i => i.id !== item.id))
    setMyItems(prev => [{ ...item, ownerId: member.id }, ...prev])
  }

  // Offer to party: if qty > 1, creates N separate items server-side
  const offerItem = async (item: Item) =>
  {
    const res = await fetch('/api/items', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: memberToken, itemId: item.id, action: 'offer' }),
    })
    const data = await res.json()
    if (!res.ok) return
    setMyItems(prev => prev.filter(i => i.id !== item.id))
    setPartyPool(prev => [...data.items, ...prev])
  }

  const togglePrivate = async (item: Item) =>
  {
    const res = await fetch('/api/items', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: memberToken,
        itemId: item.id,
        action: 'update',
        updates: { private: !item.private },
      }),
    })
    if (!res.ok) return
    setMyItems(prev => prev.map(i => i.id === item.id ? { ...i, private: !i.private } : i))
  }

  const updateItemAction = async (item: Item, updates: Partial<Item>) =>
  {
    const res = await fetch('/api/items', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: memberToken, itemId: item.id, action: 'update', updates }),
    })
    if (!res.ok) return
    setMyItems(prev => prev.map(i => i.id === item.id ? { ...i, ...updates } : i))
  }

  const deleteItem = async (item: Item) =>
  {
    const res = await fetch('/api/items', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: memberToken, itemId: item.id }),
    })
    if (!res.ok) return
    setMyItems(prev => prev.filter(i => i.id !== item.id))
  }

  const adjustGold = async (deltaCp: number, field: 'publicGold' | 'privateGold') =>
  {
    const res = await fetch('/api/gold', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: memberToken, action: 'adjust', deltaCp, field }),
    })
    if (!res.ok) return
    const key = field === 'publicGold' ? 'public' : 'private'
    setGold(prev => ({ ...prev, [key]: Math.max(0, prev[key] + deltaCp) }))
  }

  const adjustPartyGold = async (deltaCp: number) =>
  {
    const res = await fetch('/api/gold', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: memberToken, action: 'party_adjust', deltaCp }),
    })
    if (!res.ok) return
    setGold(prev => ({ ...prev, party: Math.max(0, prev.party + deltaCp) }))
  }

  const transferToPool = async (amount: number) =>
  {
    if (amount <= 0 || amount > gold.public) return
    await adjustGold(-amount, 'publicGold')
    await adjustPartyGold(amount)
  }

  const transferFromPool = async (amount: number) =>
  {
    if (amount <= 0 || amount > gold.party) return
    await adjustPartyGold(-amount)
    await adjustGold(amount, 'publicGold')
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

  const totalOtherItems = initialOtherMembers.reduce((s, o) => s + o.items.length, 0)

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background p-4 max-w-2xl mx-auto">
      <header className="mb-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="font-press-start text-2xl"></span>
            <div>
              <p className="font-press-start text-[10px] text-muted-foreground">Bag of</p>
              {isEditingName ? (
                <div className="flex items-center gap-2 mt-1">
                  <input
                    autoFocus
                    className="font-press-start text-xs border-2 border-black dark:border-white bg-background px-1 py-0.5 w-full outline-none"
                    value={memberName}
                    onChange={e => setMemberName(e.target.value)}
                    onBlur={updateName}
                    onKeyDown={e => e.key === 'Enter' && updateName()}
                  />
                </div>
              ) : (
                <h1
                  className="font-press-start text-lg leading-tight mt-1 cursor-pointer hover:text-muted-foreground transition-colors flex items-center gap-2"
                  onClick={() => setIsEditingName(true)}
                >
                  {memberName}
                  <span className="text-[10px] text-muted-foreground opacity-50">edit</span>
                </h1>
              )}
              <p className="font-press-start text-[10px] text-muted-foreground mt-1">{session.name}</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <Tabs defaultValue="inventory">
        <TabsList>
          <TabsTrigger className="grow" value="inventory">My Inventory</TabsTrigger>
          <TabsTrigger className="grow" value="pool">
            Party Bag {partyPool.length > 0 && `(${partyPool.length})`}
          </TabsTrigger>
          <TabsTrigger className="grow" value="others">
            Other Members {totalOtherItems > 0 && `(${totalOtherItems})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inventory">
          <GoldPanel
            publicGold={gold.public}
            privateGold={gold.private}
            showPrivate
            currencyType={session.currencyType}
            onAdjustPublic={deltaCp => adjustGold(deltaCp, 'publicGold')}
            onAdjustPrivate={deltaCp => adjustGold(deltaCp, 'privateGold')}
          />
          <AddItemForm onAdd={addItem} isLoading={loading} showPrivateToggle />
          <div className="space-y-2">
            {myItems.length === 0 ? (
              <p className="font-press-start text-[10px] text-muted-foreground text-center py-8">
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
                />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="pool">
          <GoldPanel
            publicGold={gold.party}
            currencyType={session.currencyType}
            titleOverride={session.currencyType === 'wealth' ? "Party Bag Wealth" : "Party Bag Gold"}
          />
          <div className="border-2 border-black dark:border-white p-3 space-y-4 bg-card mt-4 mb-4">
            <p className="font-press-start text-[10px] text-muted-foreground border-b-2 border-black dark:border-white pb-2">
              Transfer Currency
            </p>
            <CurrencyInput
              label="Donate to Party Bag"
              onAdjust={transferToPool}
              loading={loading}
              currencyType={session.currencyType}
            />
            <div className="border-t-2 border-black dark:border-white pt-2">
              <CurrencyInput
                label="Take from Party Bag"
                onAdjust={transferFromPool}
                loading={loading}
                currencyType={session.currencyType}
              />
            </div>
          </div>
          <div className="space-y-2">
            {partyPool.length === 0 ? (
              <p className="font-press-start text-[10px] text-muted-foreground text-center py-8">
                The bag is empty. Nothing to loot!
              </p>
            ) : (
              partyPool.map(item => (
                <ItemCard
                  key={item.id}
                  item={item}
                  onClaim={claimItem}
                />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="others">
          <div className="space-y-4">
            {initialOtherMembers.length === 0 ? (
              <p className="font-press-start text-[10px] text-muted-foreground text-center py-8">
                No other party members.
              </p>
            ) : (
              initialOtherMembers.map(({ member: m, items }) => (
                <Card key={m.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs flex items-center justify-between">
                      <span>⚔️ {m.name}</span>
                      <span className="text-yellow-600 dark:text-yellow-400">
                        {formatCurrency(m.publicGold, session.currencyType)}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {items.length === 0 ? (
                      <p className="font-press-start text-[10px] text-muted-foreground pt-1 pb-2">
                        No public items.
                      </p>
                    ) : (
                      items.map(item => (
                        <ItemCard key={item.id} item={item} />
                      ))
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
