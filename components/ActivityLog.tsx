'use client'

import { useState, useEffect, useCallback } from 'react'
import type { IconType } from 'react-icons'
import {
  LuArrowDownToLine,
  LuArrowUpFromLine,
  LuArrowLeft,
  LuArrowRight,
  LuCoins,
  LuFileText,
  LuGift,
  LuHand,
  LuPackage,
  LuPencil,
  LuSparkles,
  LuTrash2,
  LuUserRound,
  LuVault,
  LuWallet,
} from 'react-icons/lu'
import { Card, CardContent } from '@/components/ui/8bit/card'
import { Button } from '@/components/ui/8bit/button'
import { formatCurrency } from '@/components/gold/GoldPanel'
import type { ActivityEntry } from '@/types'

// ── Action icons and labels ────────────────────────────────────

const ACTION_META: Record<string, { icon: IconType; label: string; color: string }> = {
  session_create:    { icon: LuSparkles, label: 'Session Created', color: 'text-purple-600 dark:text-purple-400' },
  item_add:          { icon: LuPackage, label: 'Added Item', color: 'text-green-600 dark:text-green-400' },
  item_claim:        { icon: LuArrowDownToLine, label: 'Claimed Item', color: 'text-blue-600 dark:text-blue-400' },
  item_offer:        { icon: LuArrowUpFromLine, label: 'Offered to Party', color: 'text-yellow-600 dark:text-yellow-400' },
  item_delete:       { icon: LuTrash2, label: 'Removed Item', color: 'text-red-600 dark:text-red-400' },
  gold_split:        { icon: LuCoins, label: 'Split Currency', color: 'text-yellow-600 dark:text-yellow-400' },
  gold_give:         { icon: LuCoins, label: 'Gave Currency', color: 'text-yellow-600 dark:text-yellow-400' },
  gold_adjust:       { icon: LuWallet, label: 'Adjusted Currency', color: 'text-yellow-600 dark:text-yellow-400' },
  gold_party_adjust: { icon: LuVault, label: 'Adjusted Party Pool', color: 'text-yellow-600 dark:text-yellow-400' },
  gold_transfer_to_pool:   { icon: LuArrowRight, label: 'Donated to Pool', color: 'text-yellow-600 dark:text-yellow-400' },
  gold_transfer_from_pool: { icon: LuArrowLeft, label: 'Took from Pool', color: 'text-yellow-600 dark:text-yellow-400' },
  member_add:        { icon: LuUserRound, label: 'Member Joined', color: 'text-blue-600 dark:text-blue-400' },
  member_rename:     { icon: LuPencil, label: 'Renamed', color: 'text-slate-600 dark:text-slate-400' },
}

function getMeta(action: string) {
  return ACTION_META[action] ?? { icon: LuFileText, label: action, color: 'text-muted-foreground' }
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
  currencyType?: 'dnd' | 'wealth'
}

function formatSignedCurrency(amountCp: number, explicitPlus: boolean, currencyType: 'dnd' | 'wealth'): string {
  const sign = amountCp < 0 ? '-' : explicitPlus ? '+' : ''
  return `${sign}${formatCurrency(Math.abs(amountCp), currencyType)}`
}

function formatActivityDetails(details: string, currencyType: 'dnd' | 'wealth'): string {
  return details.replace(/([+-]?)(\d+)\s*cp\b/gi, (_, sign: string, digits: string) => {
    const cpValue = Number.parseInt(digits, 10)
    if (Number.isNaN(cpValue)) return `${sign}${digits} cp`
    const signedValue = sign === '-' ? -cpValue : cpValue
    return formatSignedCurrency(signedValue, sign === '+', currencyType)
  })
}

export function ActivityLog({ token, role, currencyType = 'dnd' }: ActivityLogProps) {
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
    <div id="activity-log" className="activity-log space-y-2">
      <div id="activity-log-entries" className="activity-log-entries">
        {visible.map(entry => {
          const meta = getMeta(entry.action)
          const Icon = meta.icon
          return (
            <div
              id={`activity-entry-${entry.id}`}
              key={entry.id}
              className="activity-entry flex items-start gap-3 py-2 border-b-2 border-black/10 dark:border-white/10 last:border-0"
            >
              <span id={`activity-entry-icon-${entry.id}`} className="activity-entry-icon mt-0.5 shrink-0">
                <Icon className={`size-5 ${meta.color}`} aria-hidden="true" />
              </span>
              <div id={`activity-entry-content-${entry.id}`} className="activity-entry-content min-w-0 flex-1">
                <div className="activity-entry-header flex items-baseline gap-2 flex-wrap">
                  <span id={`activity-entry-label-${entry.id}`} className={`activity-entry-label font-press-start text-8bit-sm font-bold ${meta.color}`}>
                    {meta.label}
                  </span>
                  <span id={`activity-entry-time-${entry.id}`} className="activity-entry-time font-press-start text-8bit-xs text-muted-foreground">
                    {timeAgo(entry.createdAt)}
                  </span>
                </div>
                <p id={`activity-entry-details-${entry.id}`} className="activity-entry-details font-press-start text-8bit-sm text-muted-foreground leading-relaxed">
                  <span className="activity-entry-actor text-foreground">{entry.actorName}</span>
                  {entry.details && (
                    <span className="activity-entry-details-text"> — {formatActivityDetails(entry.details, currencyType)}</span>
                  )}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {entries.length > 5 && (
        <div id="activity-log-show-more" className="activity-log-show-more text-center pt-1">
          <Button
            id="activity-show-all-btn"
            className="activity-show-all-btn"
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
