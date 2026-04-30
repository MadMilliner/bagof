import { describe, it, expect } from 'vitest'
import { toCp, fromCp, formatCurrency } from '@/components/gold/GoldPanel'

describe('toCp', () => {
  it('converts gold, silver, copper to total copper', () => {
    expect(toCp(1, 0, 0)).toBe(100)
    expect(toCp(0, 1, 0)).toBe(10)
    expect(toCp(0, 0, 1)).toBe(1)
    expect(toCp(2, 3, 5)).toBe(235)
  })

  it('handles zero values', () => {
    expect(toCp(0, 0, 0)).toBe(0)
  })
})

describe('fromCp', () => {
  it('breaks down copper into gp/sp/cp', () => {
    expect(fromCp(235)).toEqual({ gp: 2, sp: 3, cp: 5 })
    expect(fromCp(100)).toEqual({ gp: 1, sp: 0, cp: 0 })
    expect(fromCp(10)).toEqual({ gp: 0, sp: 1, cp: 0 })
    expect(fromCp(1)).toEqual({ gp: 0, sp: 0, cp: 1 })
  })

  it('handles zero', () => {
    expect(fromCp(0)).toEqual({ gp: 0, sp: 0, cp: 0 })
  })
})

describe('formatCurrency', () => {
  it('formats D&D currency', () => {
    expect(formatCurrency(235, 'dnd')).toBe('2 gp 3 sp 5 cp')
    expect(formatCurrency(100, 'dnd')).toBe('1 gp')
    expect(formatCurrency(10, 'dnd')).toBe('1 sp')
    expect(formatCurrency(1, 'dnd')).toBe('1 cp')
    expect(formatCurrency(0, 'dnd')).toBe('0gp')
  })

  it('formats wealth currency', () => {
    expect(formatCurrency(42, 'wealth')).toBe('42 Wealth')
    expect(formatCurrency(0, 'wealth')).toBe('0 Wealth')
  })

  it('skips zero denominations', () => {
    expect(formatCurrency(101, 'dnd')).toBe('1 gp 1 cp')
  })
})
