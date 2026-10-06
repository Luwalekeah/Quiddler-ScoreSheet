import { describe, expect, it } from 'vitest'
import { CARDS, DECK_SIZE, SINGLE_LETTERS, DOUBLE_CARDS, CardCode } from './cards'
import {
  BONUS_POINTS,
  TOTAL_ROUNDS,
  allTokenizations,
  cardsDealtInRound,
  computeRound,
  computeStandings,
  defaultBonusMode,
  defaultTokenization,
  normalizeWord,
  scoreTokens,
  winnersOf,
} from './score'

describe('deck integrity', () => {
  it('contains exactly 118 cards', () => {
    const total = Object.values(CARDS).reduce((sum, c) => sum + c.copies, 0)
    expect(total).toBe(DECK_SIZE)
  })

  it('defines every single letter and every double card', () => {
    expect(Object.keys(CARDS)).toHaveLength(
      SINGLE_LETTERS.length + DOUBLE_CARDS.length,
    )
    for (const code of [...SINGLE_LETTERS, ...DOUBLE_CARDS]) {
      expect(CARDS[code].points).toBeGreaterThan(0)
    }
  })

  // These five were wrong in the previous Streamlit app. E had its card count
  // (12) in the points column, which is how the bug went unnoticed.
  it('uses the corrected values for E, C, N, R and U', () => {
    expect(CARDS.E.points).toBe(2)
    expect(CARDS.C.points).toBe(8)
    expect(CARDS.N.points).toBe(5)
    expect(CARDS.R.points).toBe(5)
    expect(CARDS.U.points).toBe(4)
  })
})

describe('round structure', () => {
  it('runs 8 rounds dealing 3 up to 10 cards', () => {
    expect(TOTAL_ROUNDS).toBe(8)
    expect(cardsDealtInRound(1)).toBe(3)
    expect(cardsDealtInRound(TOTAL_ROUNDS)).toBe(10)
  })
})

describe('tokenizing typed words', () => {
  it('strips punctuation and case', () => {
    expect(normalizeWord(' c-a-t ')).toBe('CAT')
  })

  it('scores an unambiguous word', () => {
    const tokens = defaultTokenization('CAT')
    expect(tokens).toEqual(['C', 'A', 'T'])
    expect(scoreTokens(tokens)).toEqual({ points: 13, cards: 3, letters: 3 })
  })

  it('finds every reading of an ambiguous word', () => {
    const readings = allTokenizations('THIN').map((t) => t.join('+'))
    expect(readings).toEqual(
      expect.arrayContaining(['TH+IN', 'TH+I+N', 'T+H+IN', 'T+H+I+N']),
    )
    expect(readings).toHaveLength(4)
  })

  it('defaults to the double-card reading', () => {
    expect(defaultTokenization('THIN')).toEqual(['TH', 'IN'])
    expect(scoreTokens(defaultTokenization('THIN')).points).toBe(16)
    // Splitting the doubles is worth more, which is why the player must choose.
    expect(scoreTokens(['T', 'H', 'I', 'N']).points).toBe(17)
  })

  it('handles QU, where splitting changes the score a lot', () => {
    expect(defaultTokenization('QUIET')).toEqual(['QU', 'I', 'E', 'T'])
    expect(scoreTokens(['QU', 'I', 'E', 'T']).points).toBe(16)
    expect(scoreTokens(['Q', 'U', 'I', 'E', 'T']).points).toBe(26)
  })

  it('counts a double card as one card but two letters', () => {
    expect(scoreTokens(['TH', 'IN'])).toEqual({
      points: 16,
      cards: 2,
      letters: 4,
    })
  })

  it('returns nothing for empty input', () => {
    expect(allTokenizations('')).toEqual([])
    expect(defaultTokenization('!!')).toEqual([])
  })
})

describe('round scoring', () => {
  const words = (...specs: CardCode[][]) =>
    specs.map((tokens) => ({ word: tokens.join(''), tokens }))

  it('subtracts unused cards', () => {
    const result = computeRound({
      solo: { words: words(['C', 'A', 'T']), unused: ['D'] },
    })
    expect(result.solo.wordPoints).toBe(13)
    expect(result.solo.unusedPoints).toBe(5)
    expect(result.solo.total).toBe(8 + BONUS_POINTS * 2)
  })

  it('floors a losing round at zero rather than going negative', () => {
    const result = computeRound({
      a: { words: words(['A', 'T']), unused: ['Q', 'Z'] },
      b: { words: words(['C', 'A', 'T'], ['O', 'N']), unused: [] },
    })
    // 5 points of words against 29 of unused cards, floored at 0.
    expect(result.a.wordPoints).toBe(5)
    expect(result.a.unusedPoints).toBe(29)
    expect(result.a.base).toBe(0)
    expect(result.a.total).toBe(0)
  })

  it('allows a negative round only through a lost challenge', () => {
    const result = computeRound({
      a: { words: [], unused: [], challengeDelta: -13 },
      b: { words: words(['C', 'A', 'T']), unused: [] },
    })
    expect(result.a.base).toBe(0)
    expect(result.a.total).toBe(-13)
  })

  it('records a real zero round as played, not as missing', () => {
    const result = computeRound({ solo: { words: [], unused: [] } })
    expect(result.solo.total).toBe(0)
    expect(result.solo.manual).toBe(false)
  })

  it('honours a manual score override', () => {
    const result = computeRound({
      solo: { words: words(['C', 'A', 'T']), unused: [], manualScore: 42 },
    })
    expect(result.solo.manual).toBe(true)
    expect(result.solo.total).toBe(42)
  })
})

describe('bonuses', () => {
  const words = (...specs: CardCode[][]) =>
    specs.map((tokens) => ({ word: tokens.join(''), tokens }))

  it('awards the longest-word bonus by letters, not by cards', () => {
    // THIN is 2 cards but 4 letters. CATS is 4 cards but 4 letters.
    // OPEN is 4 letters too, so use a clear winner: THIN(4) vs CAT(3).
    const result = computeRound(
      {
        a: { words: words(['TH', 'IN']), unused: [] },
        b: { words: words(['C', 'A', 'T']), unused: [] },
      },
      'both',
    )
    expect(result.a.wonLongestWord).toBe(true)
    expect(result.b.wonLongestWord).toBe(false)
    // Both played one word, so the most-words bonus is a tie and goes nowhere.
    expect(result.a.wonMostWords).toBe(false)
    expect(result.b.wonMostWords).toBe(false)
    expect(result.a.total).toBe(16 + BONUS_POINTS)
    expect(result.b.total).toBe(13)
  })

  it('awards nobody when the top is tied', () => {
    const result = computeRound({
      a: { words: words(['C', 'A', 'T']), unused: [] },
      b: { words: words(['O', 'A', 'R']), unused: [] },
    })
    expect(result.a.wonMostWords).toBe(false)
    expect(result.b.wonMostWords).toBe(false)
    expect(result.a.wonLongestWord).toBe(false)
    expect(result.b.wonLongestWord).toBe(false)
  })

  it('lets one player take both bonuses', () => {
    const result = computeRound({
      a: { words: words(['C', 'A', 'T', 'S'], ['O', 'N']), unused: [] },
      b: { words: words(['A', 'T']), unused: [] },
    })
    expect(result.a.wonMostWords).toBe(true)
    expect(result.a.wonLongestWord).toBe(true)
    expect(result.a.bonusPoints).toBe(BONUS_POINTS * 2)
  })

  it('uses only one bonus in a two-player game', () => {
    expect(defaultBonusMode(2)).toBe('longestWord')
    expect(defaultBonusMode(3)).toBe('both')

    const result = computeRound(
      {
        a: { words: words(['C', 'A', 'T', 'S'], ['O', 'N']), unused: [] },
        b: { words: words(['A', 'T']), unused: [] },
      },
      'longestWord',
    )
    expect(result.a.wonLongestWord).toBe(true)
    expect(result.a.wonMostWords).toBe(false)
    expect(result.a.bonusPoints).toBe(BONUS_POINTS)
  })

  it('awards no bonus when nobody played a word', () => {
    const result = computeRound({
      a: { words: [], unused: ['Q'] },
      b: { words: [], unused: ['Z'] },
    })
    expect(result.a.bonusPoints).toBe(0)
    expect(result.b.bonusPoints).toBe(0)
  })
})

describe('standings', () => {
  const round = (a: number, b: number, c: number) =>
    computeRound({
      a: { words: [], unused: [], manualScore: a },
      b: { words: [], unused: [], manualScore: b },
      c: { words: [], unused: [], manualScore: c },
    })

  it('ranks players high to low and names the winner', () => {
    const standings = computeStandings([round(10, 5, 1), round(10, 5, 1)], [
      'a',
      'b',
      'c',
    ])
    expect(standings.map((s) => s.playerId)).toEqual(['a', 'b', 'c'])
    expect(standings[0].total).toBe(20)
    expect(winnersOf(standings)).toEqual(['a'])
  })

  it('reports a shared first place as a tie', () => {
    const standings = computeStandings([round(10, 10, 1)], ['a', 'b', 'c'])
    expect(winnersOf(standings)).toHaveLength(2)
    expect(standings[2].rank).toBe(3)
  })
})
