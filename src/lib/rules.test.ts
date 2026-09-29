import { describe, expect, it } from 'vitest'
import { DECK_SIZE } from './cards'
import { doubleCardReference, lettersByValue, roundSchedule } from './rules'

describe('reference tables derive from the card data', () => {
  it('lists all 26 letters exactly once, grouped by value', () => {
    const groups = lettersByValue()
    const codes = groups.flatMap((g) => g.cards.map((c) => c.code))
    expect(codes).toHaveLength(26)
    expect(new Set(codes).size).toBe(26)
    expect(groups.map((g) => g.points)).toEqual(
      [...groups.map((g) => g.points)].sort((a, b) => a - b),
    )
  })

  // The old app's reference text put E in the 12-point group and C in the
  // 15-point group. Deriving from CARDS makes that impossible, and this asserts it.
  it('groups E at 2 points and C at 8 points', () => {
    const groups = lettersByValue()
    const groupOf = (code: string) =>
      groups.find((g) => g.cards.some((c) => c.code === code))?.points
    expect(groupOf('E')).toBe(2)
    expect(groupOf('C')).toBe(8)
    expect(groupOf('N')).toBe(5)
    expect(groupOf('R')).toBe(5)
    expect(groupOf('U')).toBe(4)
  })

  it('accounts for all 118 cards across both reference tables', () => {
    const singles = lettersByValue().reduce(
      (sum, g) => sum + g.cards.reduce((s, c) => s + c.copies, 0),
      0,
    )
    const doubles = doubleCardReference().reduce((sum, d) => sum + d.copies, 0)
    expect(singles + doubles).toBe(DECK_SIZE)
  })

  it('schedules 8 rounds dealing 3 up to 10', () => {
    const schedule = roundSchedule()
    expect(schedule).toHaveLength(8)
    expect(schedule[0]).toEqual({ round: 1, cards: 3 })
    expect(schedule[7]).toEqual({ round: 8, cards: 10 })
  })
})
