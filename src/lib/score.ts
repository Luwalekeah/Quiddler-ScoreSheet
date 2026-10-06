/**
 * Quiddler scoring engine. Pure functions, no React and no network.
 *
 * Rules encoded here come from the official PlayMonster instruction sheet:
 *  - The game ends after the 8th round. Round 1 deals 3 cards, +1 each round,
 *    so the last round deals 10.
 *  - Round score is words minus unused cards, floored at zero.
 *  - Bonuses are 10 points each: most words, and longest word by LETTERS.
 *    A tie awards nobody. One player can take both. With two players only
 *    one bonus is used, chosen before the game starts.
 *  - A score can only go negative by losing a challenge, so the challenge
 *    adjustment is applied after the zero floor.
 */

import { CardCode, cardLetters, cardPoints, isCardCode, isDoubleCard } from './cards'

export const TOTAL_ROUNDS = 8
export const BONUS_POINTS = 10

/** Cards dealt in a given round. Round 1 deals 3, round 8 deals 10. */
export function cardsDealtInRound(round: number): number {
  return round + 2
}

// ---------------------------------------------------------------------------
// Tokenizing a typed word into cards
// ---------------------------------------------------------------------------

export function normalizeWord(input: string): string {
  return input.toUpperCase().replace(/[^A-Z]/g, '')
}

/**
 * Every valid way to split a word into cards.
 *
 * "THIN" is genuinely ambiguous: TH+IN is 16 points over 2 cards, T+H+I+N is
 * 17 over 4. Only the player knows which cards they actually held, so this
 * returns all readings rather than guessing. Doubles are tried first at each
 * position, so `result[0]` is the greedy longest match used as the UI default.
 *
 * `limit` guards against pathological input. Real words top out well under it.
 */
export function allTokenizations(word: string, limit = 64): CardCode[][] {
  const w = normalizeWord(word)
  if (w.length === 0) return []

  const results: CardCode[][] = []
  const acc: CardCode[] = []

  const walk = (i: number): void => {
    if (results.length >= limit) return
    if (i === w.length) {
      results.push([...acc])
      return
    }
    const pair = w.slice(i, i + 2)
    if (pair.length === 2 && isDoubleCard(pair)) {
      acc.push(pair)
      walk(i + 2)
      acc.pop()
    }
    const single = w[i]
    if (isCardCode(single)) {
      acc.push(single)
      walk(i + 1)
      acc.pop()
    }
  }

  walk(0)
  return results
}

/** The default split shown in the UI: prefer double-letter cards. */
export function defaultTokenization(word: string): CardCode[] {
  return allTokenizations(word, 1)[0] ?? []
}

export interface TokenScore {
  points: number
  /** Number of cards used. A double card is one card. */
  cards: number
  /** Number of letters spelled. A double card is two letters. */
  letters: number
}

export function scoreTokens(tokens: CardCode[]): TokenScore {
  return tokens.reduce<TokenScore>(
    (acc, t) => ({
      points: acc.points + cardPoints(t),
      cards: acc.cards + 1,
      letters: acc.letters + cardLetters(t),
    }),
    { points: 0, cards: 0, letters: 0 },
  )
}

// ---------------------------------------------------------------------------
// Round scoring
// ---------------------------------------------------------------------------

export interface PlayedWord {
  /** What the player typed, kept for display and history. */
  word: string
  /** The chosen card split. Editable in the UI. */
  tokens: CardCode[]
}

export interface PlayerRoundEntry {
  /** Words laid down this round. */
  words: PlayedWord[]
  /** Cards left in hand, which count against the player. */
  unused: CardCode[]
  /**
   * Challenge adjustment. Negative when this player lost a challenge, which is
   * the only way a round can end below zero.
   */
  challengeDelta?: number
  /** Set to bypass word entry and record a hand-tallied number instead. */
  manualScore?: number | null
}

export type BonusMode = 'both' | 'mostWords' | 'longestWord'

/** With two players the rules use only one bonus, decided before the game. */
export function defaultBonusMode(playerCount: number): BonusMode {
  return playerCount <= 2 ? 'longestWord' : 'both'
}

export interface PlayerRoundResult {
  wordPoints: number
  unusedPoints: number
  /** Words minus unused, floored at zero. */
  base: number
  wonMostWords: boolean
  wonLongestWord: boolean
  bonusPoints: number
  challengeDelta: number
  total: number
  /** True when `manualScore` was used instead of the computed value. */
  manual: boolean
}

const EMPTY_ENTRY: PlayerRoundEntry = { words: [], unused: [] }

/**
 * Score one round for every player at once.
 *
 * Bonuses need the whole table, not one player, so this cannot be done per
 * player. Keys of the returned record match the keys passed in.
 */
export function computeRound(
  entries: Record<string, PlayerRoundEntry>,
  bonusMode: BonusMode = 'both',
): Record<string, PlayerRoundResult> {
  const ids = Object.keys(entries)

  const wordCount: Record<string, number> = {}
  const longestWord: Record<string, number> = {}

  for (const id of ids) {
    const entry = entries[id] ?? EMPTY_ENTRY
    wordCount[id] = entry.words.length
    longestWord[id] = entry.words.reduce(
      (max, w) => Math.max(max, scoreTokens(w.tokens).letters),
      0,
    )
  }

  const mostWordsWinner =
    bonusMode === 'longestWord' ? null : soleMaximum(wordCount)
  const longestWordWinner =
    bonusMode === 'mostWords' ? null : soleMaximum(longestWord)

  const results: Record<string, PlayerRoundResult> = {}

  for (const id of ids) {
    const entry = entries[id] ?? EMPTY_ENTRY
    const wordPoints = entry.words.reduce(
      (sum, w) => sum + scoreTokens(w.tokens).points,
      0,
    )
    const unusedPoints = entry.unused.reduce((sum, c) => sum + cardPoints(c), 0)
    const base = Math.max(0, wordPoints - unusedPoints)

    const wonMostWords = mostWordsWinner === id
    const wonLongestWord = longestWordWinner === id
    const bonusPoints =
      (wonMostWords ? BONUS_POINTS : 0) + (wonLongestWord ? BONUS_POINTS : 0)

    const challengeDelta = entry.challengeDelta ?? 0
    const manual = entry.manualScore !== undefined && entry.manualScore !== null

    results[id] = {
      wordPoints,
      unusedPoints,
      base,
      wonMostWords,
      wonLongestWord,
      bonusPoints,
      challengeDelta,
      // Challenge is applied after the floor, so a lost challenge can go negative.
      total: manual
        ? (entry.manualScore as number)
        : base + bonusPoints + challengeDelta,
      manual,
    }
  }

  return results
}

/**
 * The single highest scorer, or null if nobody scored or the top is tied.
 * A tied bonus is awarded to nobody, per the rules.
 */
function soleMaximum(values: Record<string, number>): string | null {
  let best = 0
  let winner: string | null = null
  let tied = false

  for (const [id, value] of Object.entries(values)) {
    if (value > best) {
      best = value
      winner = id
      tied = false
    } else if (value === best && value > 0) {
      tied = true
    }
  }

  return tied ? null : winner
}

// ---------------------------------------------------------------------------
// Game totals
// ---------------------------------------------------------------------------

export interface GameStanding {
  playerId: string
  total: number
  rank: number
}

/** Running totals across rounds, ranked high to low. Ties share a rank. */
export function computeStandings(
  rounds: Record<string, PlayerRoundResult>[],
  playerIds: string[],
): GameStanding[] {
  const totals = playerIds.map((playerId) => ({
    playerId,
    total: rounds.reduce((sum, r) => sum + (r[playerId]?.total ?? 0), 0),
  }))

  totals.sort((a, b) => b.total - a.total)

  let rank = 0
  let previous: number | null = null
  return totals.map((entry, index) => {
    if (previous === null || entry.total !== previous) rank = index + 1
    previous = entry.total
    return { ...entry, rank }
  })
}

/** Winners of a finished game. More than one entry means a tie at the top. */
export function winnersOf(standings: GameStanding[]): string[] {
  return standings.filter((s) => s.rank === 1).map((s) => s.playerId)
}
