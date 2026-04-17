import { describe, it, expect } from 'vitest'
import { filterItems } from '@/components/inventory/ItemFilter'
import type { Item, ItemType } from '@/types'

const makeItem = (overrides: Partial<Item> & { name: string; type: ItemType }): Item => ({
  id: Math.random().toString(36),
  sessionId: 'session-1',
  ownerId: null,
  description: '',
  private: false,
  offeredToParty: false,
  quantity: 1,
  createdAt: new Date().toISOString(),
  ...overrides,
})

describe('filterItems', () => {
  const items: Item[] = [
    makeItem({ name: 'Longsword', type: 'Weapon', description: '1d8 slashing' }),
    makeItem({ name: 'Chain Mail', type: 'Armor', description: 'AC 16' }),
    makeItem({ name: 'Health Potion', type: 'Consumable', description: 'Restores 2d4+2 HP' }),
    makeItem({ name: 'Rope', type: 'Other', description: '50 feet of hempen rope' }),
    makeItem({ name: 'Shortsword', type: 'Weapon', description: '1d6 piercing' }),
  ]

  it('returns all items when no filters applied', () => {
    expect(filterItems(items, '', 'All')).toHaveLength(5)
  })

  it('filters by type', () => {
    expect(filterItems(items, '', 'Weapon')).toHaveLength(2)
    expect(filterItems(items, '', 'Armor')).toHaveLength(1)
    expect(filterItems(items, '', 'Consumable')).toHaveLength(1)
    expect(filterItems(items, '', 'Other')).toHaveLength(1)
  })

  it('filters by search text (name match)', () => {
    const result = filterItems(items, 'sword', 'All')
    expect(result).toHaveLength(2)
    expect(result.every(i => i.name.toLowerCase().includes('sword'))).toBe(true)
  })

  it('filters by search text (description match)', () => {
    const result = filterItems(items, '1d8', 'All')
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Longsword')
  })

  it('combines type filter and search', () => {
    const result = filterItems(items, 'sword', 'Weapon')
    expect(result).toHaveLength(2)
  })

  it('returns empty when no matches', () => {
    expect(filterItems(items, 'platemail', 'All')).toHaveLength(0)
  })

  it('is case-insensitive', () => {
    expect(filterItems(items, 'LONGSWORD', 'All')).toHaveLength(1)
    expect(filterItems(items, 'longsword', 'All')).toHaveLength(1)
  })

  it('trims search text', () => {
    expect(filterItems(items, '  rope  ', 'All')).toHaveLength(1)
  })
})
