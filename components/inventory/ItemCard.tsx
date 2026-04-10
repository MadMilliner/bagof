'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/8bit/card'
import { Badge } from '@/components/ui/8bit/badge'
import { Button } from '@/components/ui/8bit/button'
import { Textarea } from '@/components/ui/8bit/textarea'
import
{
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
import { DiceRollerPopup } from '@/components/DiceRoller'
import type { Item } from '@/types'
import type { IconType } from 'react-icons'
import { GiAxeSword } from "react-icons/gi";
import { FaShieldHalved } from "react-icons/fa6";
import { GiStandingPotion } from "react-icons/gi";
import { GiRopeCoil } from "react-icons/gi";
import { FaDiceD20 } from 'react-icons/fa6'

const URL_REGEX = /(https?:\/\/[^\s]+)/g
const DICE_REGEX = /\b(\d+d\d+(?:[+-]\d+)?)\b/gi

function formatDescription(text: string, onDiceClick: (notation: string) => void)
{
  const urlParts = text.split(URL_REGEX)
  return urlParts.map((part, i) =>
  {
    if (URL_REGEX.test(part)) {
      return (
        <a key={`u-${i}`} href={part} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 text-blue-600 dark:text-blue-400 break-all">
          {part}
        </a>
      )
    }

    const diceParts = part.split(DICE_REGEX)
    return diceParts.map((sub, j) =>
    {
      if (/^\d+d\d+(?:[+-]\d+)?$/i.test(sub)) {
        return (
          <button
            key={`d-${i}-${j}`}
            onClick={() => onDiceClick(sub)}
            className="text-orange-600 dark:text-orange-400 underline decoration-dotted font-bold px-1 hover:bg-orange-100 dark:hover:bg-orange-900/30"
          >
            {sub}
          </button>
        )
      }
      return sub
    })
  })
}

const TYPE_ICONS: Record<Item['type'], React.ReactElement> = {
  Weapon: <GiAxeSword />,
  Armor: <FaShieldHalved />,
  Consumable: <GiStandingPotion />,
  Other: <GiRopeCoil />,
}

const TYPE_VARIANT: Record<Item['type'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
  Weapon: 'destructive',
  Armor: 'default',
  Consumable: 'secondary',
  Other: 'outline',
}

interface ItemCardProps
{
  item: Item
  viewerIsOwner?: boolean
  viewerIsDM?: boolean
  onClaim?: (item: Item) => void
  onOffer?: (item: Item) => void
  onTogglePrivate?: (item: Item) => void
  onDelete?: (item: Item) => void
  onUpdate?: (item: Item, updates: Partial<Item>) => Promise<void>
}

export function ItemCard({
  item,
  viewerIsOwner,
  viewerIsDM,
  onClaim,
  onOffer,
  onTogglePrivate,
  onDelete,
  onUpdate
}: ItemCardProps)
{
  const [isEditing, setIsEditing] = useState(false)
  const [draftDesc, setDraftDesc] = useState(item.description)
  const [draftType, setDraftType] = useState<Item['type']>(item.type)
  const [diceNotation, setDiceNotation] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const isInPool = item.ownerId === null

  const handleSave = async () =>
  {
    if (onUpdate && (draftDesc !== item.description || draftType !== item.type)) {
      setSaving(true)
      await onUpdate(item, { description: draftDesc, type: draftType })
      setSaving(false)
    }
    setIsEditing(false)
  }

  const handleCancel = () =>
  {
    setDraftDesc(item.description)
    setDraftType(item.type)
    setIsEditing(false)
  }

  return (
    <>
      {diceNotation && <DiceRollerPopup notation={diceNotation} onClose={() => setDiceNotation(null)} />}
      <Card className="w-full">
        <CardContent className="p-3">
          <div className="flex items-start gap-3">
            <span className="text-xl mt-0.5">{TYPE_ICONS[item.type]}</span>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="font-press-start text-xs text-foreground leading-tight">
                  {item.name}
                  {item.quantity > 1 && (
                    <span className="text-muted-foreground"> ×{item.quantity}</span>
                  )}
                </span>
              </div>

              <div className="flex flex-wrap gap-1 mb-2">
                <Badge variant={TYPE_VARIANT[item.type]}>{item.type}</Badge>
                {item.private && <Badge variant="outline">🔒 Private</Badge>}
                {isInPool && <Badge variant="secondary">Party Bag</Badge>}
              </div>

              {!isEditing ? (
                item.description && (
                  <div className="font-press-start text-[10px] text-muted-foreground leading-relaxed mb-2 break-words">
                    {formatDescription(item.description, setDiceNotation)}
                  </div>
                )
              ) : (
                <div className="mb-2 space-y-2 pt-2">
                  <select
                    className="font-press-start text-[10px] w-full border-2 border-black dark:border-white bg-background px-2 py-2"
                    value={draftType}
                    onChange={e => setDraftType(e.target.value as Item['type'])}
                  >
                    <option value="Weapon">Weapon</option>
                    <option value="Armor">Armor</option>
                    <option value="Consumable">Consumable</option>
                    <option value="Other">Other</option>
                  </select>
                  <Textarea
                    placeholder="Description (e.g., '1d8+2 damage')"
                    value={draftDesc}
                    onChange={e => setDraftDesc(e.target.value)}
                    className="min-h-[80px] text-[10px] font-press-start"
                  />
                  <p className="font-press-start text-[8px] text-muted-foreground mt-1">
                    Tip: Use '1d20+5' to make rolls clickable. <FaDiceD20 className="inline-block text-lg" />
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSave} disabled={saving}>Save</Button>
                    <Button size="sm" variant="outline" onClick={handleCancel} disabled={saving}>Cancel</Button>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {isInPool && onClaim && (
                  <Button size="sm" onClick={() => onClaim(item)}>
                    Claim
                  </Button>
                )}

                {viewerIsOwner && (
                  <>
                    {onOffer && !isInPool && (
                      <Button size="sm" variant="secondary" onClick={() => onOffer(item)}>
                        Offer to Party
                      </Button>
                    )}
                    {onTogglePrivate && (
                      <Button size="sm" variant="outline" onClick={() => onTogglePrivate(item)}>
                        {item.private ? 'Make Public' : 'Make Private'}
                      </Button>
                    )}
                    {onUpdate && !isEditing && (
                      <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                        Edit Notes
                      </Button>
                    )}
                    {onDelete && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="destructive">
                            Drop
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Discard {item.name}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to drop this item? It will be removed from your inventory permanently.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onDelete(item)}>
                              Drop Item
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </>
                )}

                {viewerIsDM && !viewerIsOwner && (
                  <>
                    {onUpdate && !isEditing && (
                      <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                        Edit Notes
                      </Button>
                    )}
                    {onDelete && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="destructive">
                            Remove
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove {item.name}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Dungeon Master, are you sure you want to delete this item from the session?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onDelete(item)}>
                              Remove Item
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
