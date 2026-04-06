'use client'

import { useState } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/8bit/tabs'
import { Badge } from '@/components/ui/8bit/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/8bit/card'
import { ItemCard } from '@/components/inventory/ItemCard'
import { AddItemForm } from '@/components/inventory/AddItemForm'
import { GoldPanel } from '@/components/gold/GoldPanel'
import { ThemeToggle } from '@/components/ThemeProvider'
import type { Item, Member, Session, ItemType } from '@/types'

interface OtherMember {
  member: Member
  items: Item[]
}

interface PlayerDashboardProps {
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
}: PlayerDashboardProps) {
  const [myItems, setMyItems] = useState<Item[]>(initialMyItems)
  const [partyPool, setPartyPool] = useState<Item[]>(initialPartyPool)
  const [gold, setGold] = useState({ public: member.publicGold, private: member.privateGold })
  // gold values are in copper pieces (cp)
  const [loading, setLoading] = useState(false)

  // ── Actions ───────────────────────────────────────────────

  const addItem = async (itemData: {
    name: string; description: string; type: ItemType; quantity: number; private: boolean
  }) => {
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

  const claimItem = async (item: Item) => {
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
  const offerItem = async (item: Item) => {
    const res = await fetch('/api/items', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: memberToken, itemId: item.id, action: 'offer' }),
    })
    if (!res.ok) return
    setMyItems(prev => prev.filter(i => i.id !== item.id))
    // Server splits into individual items; we optimistically show one per qty
    const singles = Array.from({ length: item.quantity }, (_, idx) => ({
      ...item,
      id: `${item.id}-opt-${idx}`,
      ownerId: null,
      private: false,
      quantity: 1,
    }))
    setPartyPool(prev => [...singles, ...prev])
  }

  const togglePrivate = async (item: Item) => {
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

  const deleteItem = async (item: Item) => {
    const res = await fetch('/api/items', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: memberToken, itemId: item.id }),
    })
    if (!res.ok) return
    setMyItems(prev => prev.filter(i => i.id !== item.id))
  }

  const adjustGold = async (deltaCp: number, field: 'publicGold' | 'privateGold') => {
    const res = await fetch('/api/gold', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: memberToken, action: 'adjust', deltaCp, field }),
    })
    if (!res.ok) return
    const key = field === 'publicGold' ? 'public' : 'private'
    setGold(prev => ({ ...prev, [key]: Math.max(0, prev[key] + deltaCp) }))
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
              <h1 className="font-press-start text-lg leading-tight mt-1">{member.name}</h1>
              <p className="font-press-start text-[10px] text-muted-foreground mt-1">{session.name}</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <GoldPanel
        publicGold={gold.public}
        privateGold={gold.private}
        showPrivate
        onAdjustPublic={deltaCp => adjustGold(deltaCp, 'publicGold')}
        onAdjustPrivate={deltaCp => adjustGold(deltaCp, 'privateGold')}
      />

      <Tabs defaultValue="inventory">
        <TabsList>
          <TabsTrigger value="inventory">My Inventory</TabsTrigger>
          <TabsTrigger value="pool">
            Party Bag {partyPool.length > 0 && `(${partyPool.length})`}
          </TabsTrigger>
          <TabsTrigger value="others">
            Other Members {totalOtherItems > 0 && `(${totalOtherItems})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inventory">
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
                />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="pool">
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
            ) : initialOtherMembers.every(o => o.items.length === 0) ? (
              <p className="font-press-start text-[10px] text-muted-foreground text-center py-8">
                No public items from other members yet.
              </p>
            ) : (
              initialOtherMembers.map(({ member: m, items }) => (
                items.length > 0 && (
                  <Card key={m.id}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs">⚔️ {m.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {items.map(item => (
                        <ItemCard key={item.id} item={item} />
                      ))}
                    </CardContent>
                  </Card>
                )
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
