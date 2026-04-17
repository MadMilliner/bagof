'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/8bit/card'
import { Button } from '@/components/ui/8bit/button'
import type { ActivityEntry } from '@/types'

// ── Action icons and labels ────────────────────────────────────

const ACTION_META: Record<string, { icon: string; label: string; color: string }> = {
  session_create:    { icon: '✨', label: 'Session Created', color: 'text-purple-600 dark:text-purple-400' },
  item_add:          { icon: '📦', label: 'Added Item', color: 'text-green-600 dark:text-green-400' },
  item_claim:        { icon: '🖐️', label: 'Claimed Item', color: 'text-blue-600 dark:text-blue-400' },
  item_offer:        { icon: '🎁', label: 'Offered to Party', color: 'text-yellow-600 dark:text-yellow-400' },
  item_delete:       { icon: '🗑️', label: 'Removed Item', color: 'text-red-600 dark:text-red-400' },
  gold_split:        { icon: '💰', label: 'Split Currency', color: 'text-yellow-600 dark:text-yellow-400' },
  gold_give:         { icon: '🪙', label: 'Gave Currency', color: 'text-yellow-600 dark:text-yellow-400' },
  gold_adjust:       { icon: '💱', label: 'Adjusted Currency', color: 'text-yellow-600 dark:text-yellow-400' },
  gold_party_adjust: { icon: '🏦', label: 'Adjusted Party Pool', color: 'text-yellow-600 dark:text-yellow-400' },
  gold_transfer_to_pool:   { icon: '➡️', label: 'Donated to Pool', color: 'text-yellow-600 dark:text-yellow-400' },
  gold_transfer_from_pool: { icon: '⬅️', label: 'Took from Pool', color: 'text-yellow-600 dark:text-yellow-400' },
  member_add:        { icon: '👤', label: 'Member Joined', color: 'text-blue-600 dark:text-blue-400' },
  member_rename:     { icon: '✏️', label: 'Renamed', color: 'text-slate-600 dark:text-slate-400' },
}

function getMeta(action: string) {
  return ACTION_META[action] ?? { icon: '📋', label: action, color: 'text-muted-foreground' }
}

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then

  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

// ── Main component ─────────────────────────────────────────────

interface ActivityLogProps {
  token: string
  role: 'player' | 'dm'
}

export function ActivityLog({ token, role }: ActivityLogProps) {
  const [entries, setEntries] = useState<ActivityEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const fetchActivity = useCallback(async () => {
    try {
      const res = await fetch(`/api/activity?token=${token}&role=${role}`)
      if (!res.ok) return
      const data = await res.json()
      setEntries(data.activity ?? [])
    } catch {
      // Silent fail
    }
  }, [token, role])

  // Initial fetch
  useEffect(() => {
    setLoading(true)
    fetchActivity().finally(() => setLoading(false))
  }, [fetchActivity])

  // Poll every 30s to pick up new actions (skip when tab not visible)
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') fetchActivity()
    }, 30_000)
    return () => clearInterval(interval)
  }, [fetchActivity])

  // Show only the latest 5 unless expanded
  const visible = expanded ? entries : entries.slice(0, 5)

  if (loading && entries.length === 0) {
    return (
      <Card>
        <CardContent className="pt-4 pb-4">
          <p className="font-press-start text-8bit-sm text-muted-foreground text-center">
            Loading activity...
          </p>
        </CardContent>
      </Card>
    )
  }

  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="pt-4 pb-4">
          <p className="font-press-start text-8bit-sm text-muted-foreground text-center">
            No activity yet. Actions will appear here.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-2">
      {visible.map(entry => {
        const meta = getMeta(entry.action)
        return (
          <div
            key={entry.id}
            className="flex items-start gap-3 py-2 border-b-2 border-black/10 dark:border-white/10 last:border-0"
          >
            <span className="text-lg mt-0.5 shrink-0">{meta.icon}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className={`font-press-start text-8bit-sm font-bold ${meta.color}`}>
                  {meta.label}
                </span>
                <span className="font-press-start text-8bit-xs text-muted-foreground">
                  {timeAgo(entry.createdAt)}
                </span>
              </div>
              <p className="font-press-start text-8bit-sm text-muted-foreground leading-relaxed">
                <span className="text-foreground">{entry.actorName}</span>
                {entry.details && (
                  <> — {entry.details}</>
                )}
              </p>
            </div>
          </div>
        )
      })}

      {entries.length > 5 && (
        <div className="text-center pt-1">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setExpanded(prev => !prev)}
          >
            {expanded ? 'Show Less' : `Show All (${entries.length})`}
          </Button>
        </div>
      )}
    </div>
  )
}
