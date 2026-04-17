import { describe, it, expect, vi } from 'vitest'
import { formatDescription } from '@/components/inventory/ItemCard'
import React from 'react'

// formatDescription returns React elements — we test the structure by inspecting
// the output. Since it uses JSX, we need to render or inspect the raw output.
// For unit testing, we'll check the key structural properties.

describe('formatDescription', () => {
  const noop = () => {}

  it('renders plain text as-is', () => {
    const result = formatDescription('A simple description', noop)
    const flat = flatten(result)
    expect(flat).toContain('A simple description')
  })

  it('creates links for URLs', () => {
    const result = formatDescription('Visit https://example.com for info', noop)
    // Find <a> elements in the output
    const links = findElements(result, 'a')
    expect(links).toHaveLength(1)
    expect(links[0].props.href).toBe('https://example.com')
  })

  it('creates buttons for dice notation', () => {
    const result = formatDescription('Deals 2d6+3 damage', noop)
    const buttons = findElements(result, 'button')
    expect(buttons.length).toBeGreaterThanOrEqual(1)
    // The button text should contain the notation
    const buttonText = flatten(buttons[0].props.children)
    expect(buttonText).toContain('2d6+3')
  })

  it('handles both URLs and dice in the same text', () => {
    const result = formatDescription('See https://example.com — deals 1d8 damage', noop)
    const links = findElements(result, 'a')
    const buttons = findElements(result, 'button')
    expect(links).toHaveLength(1)
    expect(buttons.length).toBeGreaterThanOrEqual(1)
  })

  it('calls onDiceClick when dice button is clicked', () => {
    const spy = vi.fn()
    const result = formatDescription('Roll 1d20+5', spy)
    const buttons = findElements(result, 'button')
    expect(buttons.length).toBeGreaterThanOrEqual(1)
    // Simulate click
    buttons[0].props.onClick()
    expect(spy).toHaveBeenCalledWith('1d20+5')
  })

  it('handles multiple dice notations', () => {
    const result = formatDescription('1d8 slashing + 2d6 fire', noop)
    const buttons = findElements(result, 'button')
    expect(buttons.length).toBeGreaterThanOrEqual(2)
  })

  it('handles empty string', () => {
    const result = formatDescription('', noop)
    // Should not throw, returns empty-ish output
    expect(result).toBeDefined()
  })

  it('does not create dice button for plain numbers', () => {
    const result = formatDescription('Costs 50 gold pieces', noop)
    const buttons = findElements(result, 'button')
    expect(buttons).toHaveLength(0)
  })

  it('does not create link for URL-like text with spaces', () => {
    const result = formatDescription('see https://not a url here', noop)
    // The regex matches up to the space: "https://not" is the URL
    // and "a url here" is plain text — no single link spanning the space
    const links = findElements(result, 'a')
    expect(links).toHaveLength(1)
    expect(links[0].props.href).toBe('https://not')
  })
})

// ── Helpers ──────────────────────────────────────────────────

/** Flatten nested React elements/arrays/strings into a single string. */
function flatten(node: React.ReactNode): string {
  if (typeof node === 'string') return node
  if (typeof node === 'number') return String(node)
  if (!node) return ''
  if (Array.isArray(node)) return node.map(flatten).join('')
  if (typeof node === 'object' && 'props' in node) {
    return flatten((node as React.ReactElement).props.children)
  }
  return ''
}

/** Recursively find all React elements of a given type in the tree. */
function findElements(node: React.ReactNode, type: string): React.ReactElement[] {
  const results: React.ReactElement[] = []
  function walk(n: React.ReactNode) {
    if (!n || typeof n === 'string' || typeof n === 'number') return
    if (Array.isArray(n)) { n.forEach(walk); return }
    if (typeof n === 'object' && 'type' in n) {
      const el = n as React.ReactElement
      if (el.type === type) results.push(el)
      if (el.props?.children) walk(el.props.children)
    }
  }
  walk(node)
  return results
}
