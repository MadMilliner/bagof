import { describe, it, expect, vi } from 'vitest'
import { rollDice } from '@/components/DiceRoller'

describe('rollDice', () => {
  it('parses basic NdN notation', () => {
    const result = rollDice('1d20')
    expect(result).not.toBeNull()
    expect(result!.count).toBe(1)
    expect(result!.sides).toBe(20)
    expect(result!.modifier).toBe(0)
    expect(result!.rolls).toHaveLength(1)
    expect(result!.rolls[0]).toBeGreaterThanOrEqual(1)
    expect(result!.rolls[0]).toBeLessThanOrEqual(20)
  })

  it('parses multi-dice notation', () => {
    const result = rollDice('4d6')
    expect(result).not.toBeNull()
    expect(result!.count).toBe(4)
    expect(result!.sides).toBe(6)
    expect(result!.rolls).toHaveLength(4)
    for (const r of result!.rolls) {
      expect(r).toBeGreaterThanOrEqual(1)
      expect(r).toBeLessThanOrEqual(6)
    }
    expect(result!.sum).toBeGreaterThanOrEqual(4)
    expect(result!.sum).toBeLessThanOrEqual(24)
  })

  it('parses positive modifier', () => {
    const result = rollDice('1d20+5')
    expect(result).not.toBeNull()
    expect(result!.count).toBe(1)
    expect(result!.sides).toBe(20)
    expect(result!.sign).toBe('+')
    expect(result!.modifier).toBe(5)
  })

  it('parses negative modifier', () => {
    const result = rollDice('2d8-3')
    expect(result).not.toBeNull()
    expect(result!.count).toBe(2)
    expect(result!.sides).toBe(8)
    expect(result!.sign).toBe('-')
    expect(result!.modifier).toBe(3)
  })

  it('is case-insensitive', () => {
    const result = rollDice('1D20')
    expect(result).not.toBeNull()
    expect(result!.count).toBe(1)
    expect(result!.sides).toBe(20)
  })

  it('returns null for invalid notation', () => {
    expect(rollDice('')).toBeNull()
    expect(rollDice('hello')).toBeNull()
    expect(rollDice('d20')).toBeNull()
    expect(rollDice('1d')).toBeNull()
    expect(rollDice('1d20+')).toBeNull()
    expect(rollDice('abc1d20')).toBeNull()
    expect(rollDice('1d20def')).toBeNull()
  })

  it('returns null for sanity-exceeding counts', () => {
    expect(rollDice('101d6')).toBeNull()
  })

  it('returns null for sanity-exceeding sides', () => {
    expect(rollDice('1d1001')).toBeNull()
  })

  it('computes sum correctly with modifier', () => {
    // Mock Math.random to return predictable values
    const mockRandom = vi.spyOn(Math, 'random')
    // For 2d6+3: make both rolls = 3 (random returns 0.5 → floor(0.5*6)+1 = 4... let me use exact values)
    // Math.floor(Math.random() * 6) + 1 → if random returns 0.333, floor(0.333*6)=1, +1=2
    // if random returns 0.5, floor(0.5*6)=3, +1=4
    // For 1d20+5: if random returns 0, floor(0*20)=0, +1=1, sum=1+5=6
    mockRandom.mockReturnValue(0)
    const result = rollDice('1d20+5')
    expect(result).not.toBeNull()
    expect(result!.rolls[0]).toBe(1)
    expect(result!.sum).toBe(6) // 1 + 5
    mockRandom.mockRestore()
  })

  it('computes sum correctly with negative modifier', () => {
    const mockRandom = vi.spyOn(Math, 'random')
    mockRandom.mockReturnValue(0)
    const result = rollDice('1d20-3')
    expect(result).not.toBeNull()
    expect(result!.rolls[0]).toBe(1)
    expect(result!.sum).toBe(-2) // 1 - 3
    mockRandom.mockRestore()
  })

  it('sum equals sum of rolls when no modifier', () => {
    const result = rollDice('3d6')
    expect(result).not.toBeNull()
    expect(result!.sum).toBe(result!.rolls.reduce((a, b) => a + b, 0))
    expect(result!.sign).toBeUndefined()
    expect(result!.modifier).toBe(0)
  })
})
