'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/8bit/button'
import { Input } from '@/components/ui/8bit/input'
import { Textarea } from '@/components/ui/8bit/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/8bit/select'
import type { ItemType } from '@/types'
import { DiceRollerPopup } from '@/components/DiceRoller'
import { FaDiceD20 } from 'react-icons/fa6'

const ITEM_TYPES: ItemType[] = ['Weapon', 'Armor', 'Consumable', 'Other']

interface AddItemFormProps
{
  id?: string
  className?: string
  onAdd: (item: {
    name: string
    description: string
    type: ItemType
    quantity: number
    private: boolean
  }) => Promise<void>
  isLoading?: boolean
  showPrivateToggle?: boolean
  defaultPrivate?: boolean
  placeholder?: string
  openAsButton?: boolean
  openButtonLabel?: string
}

export function AddItemForm({
  id,
  className,
  onAdd,
  isLoading,
  showPrivateToggle = true,
  defaultPrivate = false,
  placeholder = 'Item name...',
  openAsButton = false,
  openButtonLabel = 'Add Item',
}: AddItemFormProps)
{
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<ItemType>('Other')
  const [quantity, setQuantity] = useState(1)
  const [isPrivate, setIsPrivate] = useState(defaultPrivate)
  const [expanded, setExpanded] = useState(false)
  const [diceNotation, setDiceNotation] = useState<string | null>(null)

  const handleAdd = async () =>
  {
    if (!name.trim()) return
    await onAdd({ name: name.trim(), description, type, quantity, private: isPrivate })
    setName('')
    setDescription('')
    setType('Other')
    setQuantity(1)
    setExpanded(false)
  }

  return (
    <div id={id} className={`add-item-form ${className || ''} space-y-3 mb-4`.trim()}>
      {diceNotation && <DiceRollerPopup notation={diceNotation} onClose={() => setDiceNotation(null)} />}
      <div id="add-item-form-main-row" className="add-item-form-main-row flex gap-2">
        {openAsButton ? (
          <Button
            id="open-item-form-btn"
            className="open-item-form-btn w-full"
            variant="outline"
            onClick={() => setExpanded(true)}
            disabled={expanded || isLoading}
          >
            {openButtonLabel}
          </Button>
        ) : (
          <>
            <Input
              id="item-name-input"
              className="item-name-input flex-1"
              placeholder={placeholder}
              value={name}
              onChange={e => setName(e.target.value)}
              onFocus={() => setExpanded(true)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
            />
            <Button id="add-item-btn" className="add-item-btn" onClick={handleAdd} disabled={!name.trim() || isLoading}>
              {isLoading ? '...' : 'Add'}
            </Button>
          </>
        )}
      </div>

      {expanded && (
        <div id="add-item-form-expanded" className="add-item-form-expanded border-2 border-black dark:border-white p-2 sm:p-3 space-y-3 [box-shadow:4px_4px_0px_0px_rgba(0,0,0,1)] dark:[box-shadow:4px_4px_0px_0px_rgba(255,255,255,1)] overflow-x-hidden">
          {openAsButton && (
            <Input
              id="item-name-input"
              className="item-name-input"
              placeholder={placeholder}
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
            />
          )}
          <Textarea
            id="item-description-input"
            className="item-description-input"
            placeholder="Description (e.g., 'Deals 2d6+3 fire damage')"
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={2}
          />
          <p id="add-item-form-tip" className="add-item-form-tip font-press-start text-8bit-xs text-muted-foreground mt-1">
            Tip: Use{' '}
            <button
              type="button"
              onClick={() => setDiceNotation('1d20+5')}
              className="text-orange-600 dark:text-orange-400 underline decoration-dotted font-bold px-1 hover:bg-orange-100 dark:hover:bg-orange-900/30"
            >
              1d20+5
            </button>
            {' '}to make rolls clickable. <FaDiceD20 className="inline-block text-lg" />
          </p>

          <div id="add-item-form-options-row" className="add-item-form-options-row flex flex-wrap gap-3 items-center">
            <div id="add-item-type-container" className="add-item-type-container flex items-center gap-2">
              <span id="add-item-type-label" className="add-item-type-label font-press-start text-8bit-sm">Type</span>
              <Select value={type} onValueChange={v => setType(v as ItemType)}>
                <SelectTrigger id="item-type-select" className="w-28 sm:w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ITEM_TYPES.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div id="add-item-quantity-container" className="add-item-quantity-container flex items-center gap-2">
              <span id="add-item-quantity-label" className="add-item-quantity-label font-press-start text-8bit-sm">Qty</span>
              <Input
                id="item-quantity-input"
                className="item-quantity-input w-14 sm:w-16"
                type="number"
                min={1}
                value={quantity}
                onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>

            {showPrivateToggle && (
              <label id="add-item-private-toggle" className="add-item-private-toggle flex items-center gap-2 cursor-pointer font-press-start text-8bit-sm">
                <input
                  id="item-private-checkbox"
                  type="checkbox"
                  checked={isPrivate}
                  onChange={e => setIsPrivate(e.target.checked)}
                  className="w-4 h-4 border-2 border-black dark:border-white"
                />
                Private
              </label>
            )}
          </div>

          <div className="flex items-center gap-2">
            {openAsButton && (
              <Button
                id="add-item-btn"
                className="add-item-btn"
                size="sm"
                onClick={handleAdd}
                disabled={!name.trim() || isLoading}
              >
                {isLoading ? '...' : 'Add'}
              </Button>
            )}
            <Button id="cancel-item-form-btn" className="cancel-item-form-btn" variant="outline" size="sm" onClick={() => setExpanded(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
