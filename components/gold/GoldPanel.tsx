'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/8bit/card'
import { Button } from '@/components/ui/8bit/button'
import { Input } from '@/components/ui/8bit/input'
import { GiTwoCoins } from "react-icons/gi";


// ── Currency helpers ──────────────────────────────────────────
// All gold stored internally as copper pieces (cp)
// 1 gp = 100 cp, 1 sp = 10 cp

export function toCp(gp: number, sp: number, cp: number): number {
  return Math.round(gp * 100 + sp * 10 + cp)
}

export function fromCp(totalCp: number): { gp: number; sp: number; cp: number } {
  const gp = Math.floor(totalCp / 100)
  const sp = Math.floor((totalCp % 100) / 10)
  const cp = totalCp % 10
  return { gp, sp, cp }
}

export function formatCurrency(totalCp: number, type: 'dnd' | 'wealth' = 'dnd'): string {
  if (type === 'wealth') return `${totalCp} Wealth`
  if (totalCp === 0) return '0 cp'
  const { gp, sp, cp } = fromCp(totalCp)
  const parts = []
  if (gp > 0) parts.push(`${gp} gp`)
  if (sp > 0) parts.push(`${sp} sp`)
  if (cp > 0) parts.push(`${cp} cp`)
  return parts.join(' ')
}

// ── Currency input sub-component ─────────────────────────────

export function CurrencyInput({
  label,
  onAdjust,
  loading,
  currencyType = 'dnd'
}: {
  label: string
  onAdjust: (deltaCp: number) => Promise<void>
  loading: boolean
  currencyType?: 'dnd' | 'wealth'
}) {
  const [gp, setGp] = useState('')
  const [sp, setSp] = useState('')
  const [cp, setCp] = useState('')

  const deltaCp = currencyType === 'wealth'
    ? (parseFloat(cp) || 0)
    : toCp(parseFloat(gp) || 0, parseFloat(sp) || 0, parseFloat(cp) || 0)
  
  const hasValue = currencyType === 'wealth' ? cp !== '' : (gp !== '' || sp !== '' || cp !== '')

  const handle = async (sign: 1 | -1) => {
    if (!hasValue || deltaCp === 0) return
    await onAdjust(sign * deltaCp)
    setGp(''); setSp(''); setCp('')
  }

  return (
    <div className="space-y-2">
      <p className="font-press-start text-[10px] text-muted-foreground">{label}</p>
      {currencyType === 'wealth' ? (
        <div className="flex gap-1 items-center">
          <Input
            type="number"
            min={0}
            placeholder="0"
            value={cp}
            onChange={e => setCp(e.target.value)}
            className="w-20 text-center"
          />
          <span className="font-press-start text-[10px] text-muted-foreground">Wealth</span>
        </div>
      ) : (
        <div className="flex gap-1 items-center flex-wrap">
          <div className="flex items-center gap-1">
            <Input
              type="number"
              min={0}
              placeholder="0"
              value={gp}
              onChange={e => setGp(e.target.value)}
              className="w-20 text-center"
            />
            <span className="font-press-start text-[10px] text-yellow-600 dark:text-yellow-400">gp</span>
          </div>
          <div className="flex items-center gap-1">
            <Input
              type="number"
              min={0}
              placeholder="0"
              value={sp}
              onChange={e => setSp(e.target.value)}
              className="w-20 text-center"
            />
            <span className="font-press-start text-[10px] text-slate-400">sp</span>
          </div>
          <div className="flex items-center gap-1">
            <Input
              type="number"
              min={0}
              placeholder="0"
              value={cp}
              onChange={e => setCp(e.target.value)}
              className="w-20 text-center"
            />
            <span className="font-press-start text-[10px] text-orange-600 dark:text-orange-400">cp</span>
          </div>
        </div>
      )}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="secondary"
          disabled={!hasValue || deltaCp === 0 || loading}
          onClick={() => handle(1)}
        >
          + Add
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={!hasValue || deltaCp === 0 || loading}
          onClick={() => handle(-1)}
        >
          − Subtract
        </Button>
        {deltaCp > 0 && (
          <span className="font-press-start text-[10px] text-muted-foreground self-center">
            = {formatCurrency(deltaCp, currencyType)}
          </span>
        )}
      </div>
    </div>
  )
}

// ── Main GoldPanel ────────────────────────────────────────────

interface GoldPanelProps {
  publicGold: number      // in copper pieces
  privateGold?: number    // in copper pieces
  showPrivate?: boolean
  isDM?: boolean
  memberCount?: number
  currencyType?: 'dnd' | 'wealth'
  titleOverride?: string
  hideHeader?: boolean
  onAdjustPublic?: (deltaCp: number) => Promise<void>
  onAdjustPrivate?: (deltaCp: number) => Promise<void>
  onSplitGold?: (amountCp: number) => Promise<void>
}

export function GoldPanel({
  publicGold,
  privateGold = 0,
  showPrivate = false,
  isDM = false,
  memberCount = 1,
  currencyType = 'dnd',
  titleOverride,
  hideHeader = false,
  onAdjustPublic,
  onAdjustPrivate,
  onSplitGold,
}: GoldPanelProps) {
  const [loading, setLoading] = useState(false)
  const [splitGp, setSplitGp] = useState('')
  const [splitSp, setSplitSp] = useState('')
  const [splitCp, setSplitCp] = useState('')

  const splitTotalCp = currencyType === 'wealth'
    ? (parseFloat(splitCp) || 0)
    : toCp(parseFloat(splitGp) || 0, parseFloat(splitSp) || 0, parseFloat(splitCp) || 0)
    
  const perMemberCp = splitTotalCp > 0 ? Math.floor(splitTotalCp / memberCount) : 0

  const wrap = async (fn: () => Promise<void>) => {
    setLoading(true)
    try { await fn() } finally { setLoading(false) }
  }

  const handleSplit = async () => {
    if (splitTotalCp < 1 || !onSplitGold) return
    await wrap(() => onSplitGold(splitTotalCp))
    setSplitGp(''); setSplitSp(''); setSplitCp('')
  }

  return (
    <Card className="mb-4">
      {!hideHeader && (
        <CardHeader className="pb-2">
          <CardTitle className="text-xs"><GiTwoCoins size={20}/> {titleOverride || 'Coin Purse'}</CardTitle>
        </CardHeader>
      )}
      <CardContent className={hideHeader ? 'pt-4 space-y-4' : 'space-y-4'}>

        {/* ── Balances ── */}
        <div className="flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[120px]">
            <p className="font-press-start text-[10px] text-muted-foreground mb-1">
              {titleOverride ? titleOverride : (isDM ? (currencyType === 'wealth' ? 'Total Party Wealth' : 'Total Party Gold') : (currencyType === 'wealth' ? 'Public Wealth' : 'Public Gold'))}
            </p>
            <p className="font-press-start text-base text-yellow-600 dark:text-yellow-400 leading-tight">
              {formatCurrency(publicGold, currencyType)}
            </p>
          </div>
          {showPrivate && (
            <div className="flex-1 min-w-[120px]">
              <p className="font-press-start text-[10px] text-muted-foreground mb-1">🔒 {currencyType === 'wealth' ? 'Private Wealth' : 'Private Gold'}</p>
              <p className="font-press-start text-base leading-tight">
                {formatCurrency(privateGold, currencyType)}
              </p>
            </div>
          )}
        </div>

        {/* ── Player: adjust public gold ── */}
        {!isDM && onAdjustPublic && (
          <div className="border-t-2 border-black dark:border-white pt-3">
            <CurrencyInput
              label={titleOverride ? `Adjust ${titleOverride}` : (currencyType === 'wealth' ? "Adjust Public Wealth" : "Adjust Public Gold")}
              onAdjust={deltaCp => wrap(() => onAdjustPublic(deltaCp))}
              loading={loading}
              currencyType={currencyType}
            />
          </div>
        )}

        {/* ── Player: adjust private gold ── */}
        {!isDM && showPrivate && onAdjustPrivate && (
          <div className="border-t-2 border-black dark:border-white pt-3">
            <CurrencyInput
              label={currencyType === 'wealth' ? "Adjust Private Wealth" : "Adjust Private Gold"}
              onAdjust={deltaCp => wrap(() => onAdjustPrivate(deltaCp))}
              loading={loading}
              currencyType={currencyType}
            />
          </div>
        )}

        {/* ── DM: split gold ── */}
        {isDM && onSplitGold && (
          <div className="border-t-2 border-black dark:border-white pt-3 space-y-2">
            <p className="font-press-start text-[10px] text-muted-foreground">Split {currencyType === 'wealth' ? 'Wealth' : 'Gold'} Evenly</p>
            {currencyType === 'wealth' ? (
              <div className="flex gap-1 items-center">
                <Input type="number" min={0} placeholder="0" value={splitCp}
                  onChange={e => setSplitCp(e.target.value)} className="w-20 text-center" />
                <span className="font-press-start text-[10px] text-muted-foreground">Wealth</span>
              </div>
            ) : (
              <div className="flex gap-1 items-center flex-wrap">
                <div className="flex items-center gap-1">
                  <Input type="number" min={0} placeholder="0" value={splitGp}
                    onChange={e => setSplitGp(e.target.value)} className="w-20 text-center" />
                  <span className="font-press-start text-[10px] text-yellow-600 dark:text-yellow-400">gp</span>
                </div>
                <div className="flex items-center gap-1">
                  <Input type="number" min={0} placeholder="0" value={splitSp}
                    onChange={e => setSplitSp(e.target.value)} className="w-20 text-center" />
                  <span className="font-press-start text-[10px] text-slate-400">sp</span>
                </div>
                <div className="flex items-center gap-1">
                  <Input type="number" min={0} placeholder="0" value={splitCp}
                    onChange={e => setSplitCp(e.target.value)} className="w-20 text-center" />
                  <span className="font-press-start text-[10px] text-orange-600 dark:text-orange-400">cp</span>
                </div>
              </div>
            )}
            {perMemberCp > 0 && (
              <p className="font-press-start text-[10px] text-muted-foreground">
                = {formatCurrency(perMemberCp, currencyType)} each ({memberCount} members)
              </p>
            )}
            <Button
              size="sm"
              variant="secondary"
              onClick={handleSplit}
              disabled={loading || splitTotalCp < 1}
            >
              Split
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
