'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/8bit/button'
import { Input } from '@/components/ui/8bit/input'
import { Textarea } from '@/components/ui/8bit/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/8bit/select'
import type { ItemType } from '@/types'
import { FaDiceD20 } from 'react-icons/fa6'

const ITEM_TYPES: ItemType[] = ['Weapon', 'Armor', 'Consumable', 'Other']

interface AddItemFormProps
{
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
}

export function AddItemForm({
  onAdd,
  isLoading,
  showPrivateToggle = true,
  defaultPrivate = false,
  placeholder = 'Item name...',
}: AddItemFormProps)
{
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<ItemType>('Other')
  const [quantity, setQuantity] = useState(1)
  const [isPrivate, setIsPrivate] = useState(defaultPrivate)
  const [expanded, setExpanded] = useState(false)

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
    <div id="add-item-form" className="space-y-3 mb-4">
      <div className="flex gap-2">
        <Input
          id="item-name-input"
          placeholder={placeholder}
          value={name}
          onChange={e => setName(e.target.value)}
          onFocus={() => setExpanded(true)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          className="flex-1"
        />
        <Button id="add-item-btn" onClick={handleAdd} disabled={!name.trim() || isLoading}>
          {isLoading ? '...' : 'Add'}
        </Button>
      </div>

      {expanded && (
        <div className="border-2 border-black dark:border-white p-3 space-y-3 [box-shadow:4px_4px_0px_0px_rgba(0,0,0,1)] dark:[box-shadow:4px_4px_0px_0px_rgba(255,255,255,1)]">
          <Textarea
            placeholder="Description (e.g., 'Deals 2d6+3 fire damage')"
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={2}
          />
          <p className="font-press-start text-8bit-xs text-muted-foreground mt-1">
            Tip: Use '1d20+5' to make rolls clickable. <FaDiceD20 className="inline-block text-lg" />
          </p>

          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2">
              <span className="font-press-start text-8bit-sm">Type</span>
              <Select value={type} onValueChange={v => setType(v as ItemType)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ITEM_TYPES.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-press-start text-8bit-sm">Qty</span>
              <Input
                type="number"
                min={1}
                value={quantity}
                onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-16"
              />
            </div>

            {showPrivateToggle && (
              <label className="flex items-center gap-2 cursor-pointer font-press-start text-8bit-sm">
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={e => setIsPrivate(e.target.checked)}
                  className="w-4 h-4 border-2 border-black dark:border-white"
                />
                Private
              </label>
            )}
          </div>

          <Button id="collapse-item-form-btn" variant="ghost" size="sm" onClick={() => setExpanded(false)}>
            Collapse
          </Button>
        </div>
      )}
    </div>
  )
}
