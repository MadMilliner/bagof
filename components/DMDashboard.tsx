'use client'

import { useState } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/8bit/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/8bit/card'
import { Badge } from '@/components/ui/8bit/badge'
import { Button } from '@/components/ui/8bit/button'
import { Input } from '@/components/ui/8bit/input'
import { ItemCard } from '@/components/inventory/ItemCard'
import { AddItemForm } from '@/components/inventory/AddItemForm'
import { GoldPanel } from '@/components/gold/GoldPanel'
import { ThemeToggle } from '@/components/ThemeProvider'
import type { Item, Member, Session, ItemType } from '@/types'

interface DMDashboardProps {
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
}: DMDashboardProps) {
  const [allItems, setAllItems] = useState<Item[]>(initialItems)
  const [members, setMembers] = useState<Member[]>(initialMembers)
  const [loading, setLoading] = useState(false)

  const partyPool = allItems.filter(i => !i.ownerId)
  const memberItems = (id: string) => allItems.filter(i => i.ownerId === id)
  const totalGold = members.reduce((s, m) => s + m.publicGold, 0)

  // ── Actions ───────────────────────────────────────────────

  const addToPool = async (itemData: {
    name: string; description: string; type: ItemType; quantity: number; private: boolean
  }) => {
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

  const deleteItem = async (item: Item) => {
    const res = await fetch('/api/items', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dmToken, itemId: item.id }),
    })
    if (!res.ok) return
    setAllItems(prev => prev.filter(i => i.id !== item.id))
  }

  const splitGold = async (amountCp: number) => {
    const res = await fetch('/api/gold', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dmToken, action: 'split', amountCp }),
    })
    if (!res.ok) return
    const share = Math.floor(amountCp / members.length)
    setMembers(prev => prev.map(m => ({ ...m, publicGold: m.publicGold + share })))
  }

  const giveGold = async (memberId: string, deltaCp: number, field: 'publicGold' | 'privateGold') => {
    const res = await fetch('/api/gold', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dmToken, action: 'give', memberId, deltaCp, field }),
    })
    if (!res.ok) return
    setMembers(prev => prev.map(m =>
      m.id === memberId ? { ...m, [field]: Math.max(0, m[field] + deltaCp) } : m
    ))
  }

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background p-4 max-w-2xl mx-auto">
      <header className="mb-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="font-press-start text-2xl"></span>
            <div>
              <p className="font-press-start text-[10px] text-muted-foreground">Bag of</p>
              <h1 className="font-press-start text-lg leading-tight mt-1">Dungeon Master</h1>
              <p className="font-press-start text-[10px] text-muted-foreground mt-1">{session.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="destructive">DM</Badge>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <Tabs defaultValue="pool">
        <TabsList>
          <TabsTrigger value="pool">
            Party Bag {partyPool.length > 0 && `(${partyPool.length})`}
          </TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="gold">Gold</TabsTrigger>
        </TabsList>

        {/* ── Party Pool ── */}
        <TabsContent value="pool">
          <AddItemForm
            onAdd={addToPool}
            isLoading={loading}
            showPrivateToggle={false}
            placeholder="Add loot to party pool..."
          />
          <div className="space-y-2">
            {partyPool.length === 0 ? (
              <p className="font-press-start text-[10px] text-muted-foreground text-center py-8">
                Party Bag is empty. Drop some loot!
              </p>
            ) : (
              partyPool.map(item => (
                <ItemCard key={item.id} item={item} viewerIsDM onDelete={deleteItem} />
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
                    <span className="text-yellow-600 dark:text-yellow-400">
                      {m.publicGold} gp
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {memberItems(m.id).length === 0 ? (
                      <p className="font-press-start text-[10px] text-muted-foreground">
                        No items.
                      </p>
                    ) : (
                      memberItems(m.id).map(item => (
                        <ItemCard
                          key={item.id}
                          item={item}
                          viewerIsDM
                          onDelete={deleteItem}
                        />
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ── Gold ── */}
        <TabsContent value="gold">
          <GoldPanel
            publicGold={totalGold}
            isDM
            memberCount={members.length}
            onSplitGold={splitGold}
          />

          <div className="space-y-3">
            <p className="font-press-start text-xs mb-3">Give Gold Directly</p>
            {members.map(m => (
              <GiveMemberGold key={m.id} member={m} onGive={giveGold} />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ── Give gold sub-component ───────────────────────────────

function GiveMemberGold({
  member,
  onGive,
}: {
  member: Member
  onGive: (id: string, deltaCp: number, field: 'publicGold' | 'privateGold') => Promise<void>
}) {
  const [gp, setGp] = useState('')
  const [sp, setSp] = useState('')
  const [cp, setCp] = useState('')
  const [field, setField] = useState<'publicGold' | 'privateGold'>('publicGold')
  const [loading, setLoading] = useState(false)

  const deltaCp = Math.round((parseFloat(gp) || 0) * 100 + (parseFloat(sp) || 0) * 10 + (parseFloat(cp) || 0))
  const hasValue = gp !== '' || sp !== '' || cp !== ''

  const handle = async (sign: 1 | -1) => {
    if (!hasValue || deltaCp === 0) return
    setLoading(true)
    await onGive(member.id, sign * deltaCp, field)
    setGp(''); setSp(''); setCp('')
    setLoading(false)
  }

  const publicDisplay = (() => {
    const g = Math.floor(member.publicGold / 100)
    const s = Math.floor((member.publicGold % 100) / 10)
    const c = member.publicGold % 10
    return [g > 0 && `${g}gp`, s > 0 && `${s}sp`, c > 0 && `${c}cp`].filter(Boolean).join(' ') || '0cp'
  })()

  return (
    <Card>
      <CardContent className="pt-3 pb-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-press-start text-[10px] font-bold">{member.name}</span>
          <span className="font-press-start text-[10px] text-yellow-600 dark:text-yellow-400">{publicDisplay}</span>
        </div>
        <div className="flex gap-1 items-center flex-wrap">
          <div className="flex items-center gap-1">
            <Input type="number" min={0} placeholder="0" value={gp}
              onChange={e => setGp(e.target.value)} className="w-12 text-center" />
            <span className="font-press-start text-[10px] text-yellow-600 dark:text-yellow-400">gp</span>
          </div>
          <div className="flex items-center gap-1">
            <Input type="number" min={0} placeholder="0" value={sp}
              onChange={e => setSp(e.target.value)} className="w-12 text-center" />
            <span className="font-press-start text-[10px] text-slate-400">sp</span>
          </div>
          <div className="flex items-center gap-1">
            <Input type="number" min={0} placeholder="0" value={cp}
              onChange={e => setCp(e.target.value)} className="w-12 text-center" />
            <span className="font-press-start text-[10px] text-orange-600 dark:text-orange-400">cp</span>
          </div>
          <select
            className="font-press-start text-[10px] border-2 border-black dark:border-white bg-background px-1 py-1 h-9"
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
