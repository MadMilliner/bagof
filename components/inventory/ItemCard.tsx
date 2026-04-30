'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/8bit/card'
import { Badge } from '@/components/ui/8bit/badge'
import { Button } from '@/components/ui/8bit/button'
import { Textarea } from '@/components/ui/8bit/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/8bit/select'
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
import { GiAxeSword } from "react-icons/gi";
import { FaShieldHalved } from "react-icons/fa6";
import { GiStandingPotion } from "react-icons/gi";
import { GiRopeCoil } from "react-icons/gi";
import { FaDiceD20 } from 'react-icons/fa6'
import { LuCopy } from 'react-icons/lu'
import { LuLock } from 'react-icons/lu'

const URL_REGEX = /(https?:\/\/[^\s]+)/
const DICE_REGEX = /\b(\d+d\d+(?:[+-]\d+)?)\b/i

export function formatDescription(text: string, onDiceClick: (notation: string) => void)
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
  onDuplicate?: (item: Item) => void
  dmRole?: string
}

export function ItemCard({
  item,
  viewerIsOwner,
  viewerIsDM,
  onClaim,
  onOffer,
  onTogglePrivate,
  onDelete,
  onUpdate,
  onDuplicate,
  dmRole = 'Dungeon Master'
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
      <Card id={`item-card-${item.id}`} className={`item-card item-card-${item.id} w-full`}>
        <CardContent className="item-card-content p-2 sm:p-3 overflow-x-hidden min-w-0">
          <div className="item-card-main flex items-start gap-2 sm:gap-3 min-w-0">
            <span className="item-card-icon text-lg sm:text-xl mt-0.5 shrink-0">{TYPE_ICONS[item.type]}</span>

            <div className="item-card-body flex-1 min-w-0">
              <div className="item-card-name-row flex flex-wrap items-center gap-2 mb-1">
                <span className="item-card-name font-press-start text-xs text-foreground leading-tight break-words min-w-0">
                  {item.name}
                  {item.quantity > 1 && (
                    <span className="item-card-quantity text-muted-foreground"> ×{item.quantity}</span>
                  )}
                </span>
              </div>

              <div className="item-card-badges flex flex-wrap gap-1 mb-2">
                <Badge id={`item-card-type-badge-${item.id}`} variant={TYPE_VARIANT[item.type]}>{item.type}</Badge>
                {item.private && (
                  <Badge id={`item-card-private-badge-${item.id}`} variant="outline">
                    <span className="inline-flex items-center gap-1">
                      <LuLock className="h-3 w-3" aria-hidden="true" />
                      Private
                    </span>
                  </Badge>
                )}
                {isInPool && <Badge id={`item-card-pool-badge-${item.id}`} variant="secondary">Party Bag</Badge>}
              </div>

              {!isEditing ? (
                item.description && (
                  <div id={`item-card-description-${item.id}`} className="item-card-description font-press-start text-8bit-sm text-muted-foreground leading-relaxed mb-2 break-words">
                    {formatDescription(item.description, setDiceNotation)}
                  </div>
                )
              ) : (
                <div id={`item-edit-form-${item.id}`} className="item-edit-form mb-2 space-y-2 pt-2">
                  <Select
                    id={`item-type-select-${item.id}`}
                    value={draftType}
                    onValueChange={value => setDraftType(value as Item['type'])}
                  >
                    <SelectTrigger className="item-type-select w-full text-8bit-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Weapon">Weapon</SelectItem>
                      <SelectItem value="Armor">Armor</SelectItem>
                      <SelectItem value="Consumable">Consumable</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <Textarea
                    id={`item-description-textarea-${item.id}`}
                    placeholder="Description (e.g., '1d8+2 damage')"
                    value={draftDesc}
                    onChange={e => setDraftDesc(e.target.value)}
                    className="item-description-textarea min-h-[80px] text-8bit-sm font-press-start"
                  />
                  <p className="item-dice-tip font-press-start text-8bit-xs text-muted-foreground mt-1">
                    Tip: Use '1d20+5' to make rolls clickable. <FaDiceD20 className="inline-block text-lg" />
                  </p>
                  <div id={`item-edit-actions-${item.id}`} className="item-edit-actions flex gap-2">
                    <Button id={`item-save-edit-btn-${item.id}`} className={`item-save-btn item-save-btn-${item.id}`} size="sm" onClick={handleSave} disabled={saving}>Save</Button>
                    <Button id={`item-cancel-edit-btn-${item.id}`} className={`item-cancel-btn item-cancel-btn-${item.id}`} size="sm" variant="outline" onClick={handleCancel} disabled={saving}>Cancel</Button>
                  </div>
                </div>
              )}

              <div id={`item-actions-${item.id}`} className="item-actions flex flex-wrap gap-2">
                {isInPool && onClaim && (
                  <Button id={`item-claim-btn-${item.id}`} className={`item-claim-btn item-claim-btn-${item.id}`} size="sm" onClick={() => onClaim(item)}>
                    Claim
                  </Button>
                )}

                {viewerIsOwner && (
                  <>
                    {onOffer && !isInPool && (
                      <Button id={`item-offer-btn-${item.id}`} className={`item-offer-btn item-offer-btn-${item.id}`} size="sm" variant="secondary" onClick={() => onOffer(item)}>
                        Offer to Party
                      </Button>
                    )}
                    {onTogglePrivate && (
                      <Button id={`item-toggle-private-btn-${item.id}`} className={`item-toggle-private-btn item-toggle-private-btn-${item.id}`} size="sm" variant="outline" onClick={() => onTogglePrivate(item)}>
                        {item.private ? 'Make Public' : 'Make Private'}
                      </Button>
                    )}
                    {onDuplicate && !isEditing && (
                      <Button id={`item-duplicate-btn-${item.id}`} className={`item-duplicate-btn item-duplicate-btn-${item.id}`} size="sm" variant="outline" onClick={() => onDuplicate(item)}>
                        <LuCopy className="h-3 w-3 mr-1" />
                        Duplicate
                      </Button>
                    )}
                    {onUpdate && !isEditing && (
                      <Button id={`item-edit-notes-btn-${item.id}`} className={`item-edit-notes-btn item-edit-notes-btn-${item.id}`} size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                        Edit Notes
                      </Button>
                    )}
                    {onDelete && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button id={`item-drop-btn-${item.id}`} className={`item-drop-btn item-drop-btn-${item.id}`} size="sm" variant="destructive">
                            Drop
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle id={`item-drop-dialog-title-${item.id}`}>Discard {item.name}?</AlertDialogTitle>
                            <AlertDialogDescription id={`item-drop-dialog-description-${item.id}`}>
                              Are you sure you want to drop this item? It will be removed from your inventory permanently.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction id={`item-drop-confirm-btn-${item.id}`} onClick={() => onDelete(item)}>
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
                    {onDuplicate && !isEditing && (
                      <Button id={`item-dm-duplicate-btn-${item.id}`} className={`item-dm-duplicate-btn item-dm-duplicate-btn-${item.id}`} size="sm" variant="outline" onClick={() => onDuplicate(item)}>
                        <LuCopy className="h-3 w-3 mr-1" />
                        Duplicate
                      </Button>
                    )}
                    {onUpdate && !isEditing && (
                      <Button id={`item-dm-edit-notes-btn-${item.id}`} className={`item-dm-edit-notes-btn item-dm-edit-notes-btn-${item.id}`} size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                        Edit Notes
                      </Button>
                    )}
                    {onDelete && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button id={`item-dm-remove-btn-${item.id}`} className={`item-dm-remove-btn item-dm-remove-btn-${item.id}`} size="sm" variant="destructive">
                            Remove
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle id={`item-remove-dialog-title-${item.id}`}>Remove {item.name}?</AlertDialogTitle>
                            <AlertDialogDescription id={`item-remove-dialog-description-${item.id}`}>
                              {dmRole}, are you sure you want to delete this item from the session?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction id={`item-remove-confirm-btn-${item.id}`} onClick={() => onDelete(item)}>
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
