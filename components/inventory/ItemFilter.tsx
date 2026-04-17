'use client'

import { Input } from '@/components/ui/8bit/input'
import type { ItemType } from '@/types'

interface ItemFilterProps {
  search: string
  onSearchChange: (value: string) => void
  typeFilter: ItemType | 'All'
  onTypeFilterChange: (value: ItemType | 'All') => void
  resultCount: number
  totalCount: number
}

const TYPES: (ItemType | 'All')[] = ['All', 'Weapon', 'Armor', 'Consumable', 'Other']

export function ItemFilter({
  search,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  resultCount,
  totalCount,
}: ItemFilterProps) {
  return (
    <div id="item-filter" className="space-y-2 mb-3">
      <div className="flex gap-2 items-center flex-wrap">
        <Input
          id="item-search-input"
          type="text"
          placeholder="Search items..."
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          className="flex-1 min-w-[120px] text-8bit-sm h-9"
        />
        <select
          className="font-press-start text-8bit-sm border-2 border-black dark:border-white bg-background px-2 py-1 h-9"
          value={typeFilter}
          onChange={e => onTypeFilterChange(e.target.value as ItemType | 'All')}
        >
          {TYPES.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
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
