'use client'

import { Input } from '@/components/ui/8bit/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/8bit/select'
import type { ItemType } from '@/types'

interface ItemFilterProps {
  id?: string
  className?: string
  search: string
  onSearchChange: (value: string) => void
  typeFilter: ItemType | 'All'
  onTypeFilterChange: (value: ItemType | 'All') => void
  resultCount: number
  totalCount: number
}

const TYPES: (ItemType | 'All')[] = ['All', 'Weapon', 'Armor', 'Consumable', 'Other']

export function ItemFilter({
  id,
  className,
  search,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  resultCount,
  totalCount,
}: ItemFilterProps) {
  return (
    <div id={id || 'item-filter'} className={`item-filter ${className || ''} space-y-2 mb-3`.trim()}>
      <div className="flex gap-2 items-center flex-wrap">
        <Input
          id="item-search-input"
          type="text"
          placeholder="Search items..."
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          className="flex-1 min-w-0 text-8bit-sm h-9"
        />
        <Select
          value={typeFilter}
          onValueChange={value => onTypeFilterChange(value as ItemType | 'All')}
        >
          <SelectTrigger className="h-9 w-[130px] text-8bit-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TYPES.map(t => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {(search || typeFilter !== 'All') && (
        <p className="font-press-start text-8bit-xs text-muted-foreground">
          Showing {resultCount} of {totalCount} items
        </p>
      )}
    </div>
  )
}

/** Filter items by search text and type. */
export function filterItems<T extends { name: string; description: string; type: ItemType }>(
  items: T[],
  search: string,
  typeFilter: ItemType | 'All'
): T[] {
  let result = items
  if (typeFilter !== 'All') {
    result = result.filter(i => i.type === typeFilter)
  }
  if (search.trim()) {
    const q = search.toLowerCase().trim()
    result = result.filter(i =>
      i.name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q)
    )
  }
  return result
}
