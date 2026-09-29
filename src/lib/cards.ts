/**
 * Quiddler deck definition. Single source of truth for card point values.
 *
 * Verified against the official PlayMonster rules (two 59-card decks, 118 cards
 * total) and the published deck table. The previous Streamlit app had five wrong
 * values here (E, C, N, R, U), which is why `DECK_SIZE` is asserted in tests:
 * a typo in this table would otherwise mis-score every game silently.
 */

export const SINGLE_LETTERS = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
  'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
] as const

/** Two-letter cards. Each is one card but counts as two letters. */
export const DOUBLE_CARDS = ['CL', 'ER', 'IN', 'QU', 'TH'] as const

export type SingleLetter = (typeof SINGLE_LETTERS)[number]
export type DoubleCard = (typeof DOUBLE_CARDS)[number]
export type CardCode = SingleLetter | DoubleCard

export interface CardSpec {
  /** Point value printed on the card. */
  points: number
  /** How many of this card are in the 118-card deck. */
  copies: number
}

export const CARDS: Record<CardCode, CardSpec> = {
  A: { points: 2, copies: 10 },
  B: { points: 8, copies: 2 },
  C: { points: 8, copies: 2 },
  D: { points: 5, copies: 4 },
  E: { points: 2, copies: 12 },
  F: { points: 6, copies: 2 },
  G: { points: 6, copies: 4 },
  H: { points: 7, copies: 2 },
  I: { points: 2, copies: 8 },
  J: { points: 13, copies: 2 },
  K: { points: 8, copies: 2 },
  L: { points: 3, copies: 4 },
  M: { points: 5, copies: 2 },
  N: { points: 5, copies: 6 },
  O: { points: 2, copies: 8 },
  P: { points: 6, copies: 2 },
  Q: { points: 15, copies: 2 },
  R: { points: 5, copies: 6 },
  S: { points: 3, copies: 4 },
  T: { points: 3, copies: 6 },
  U: { points: 4, copies: 6 },
  V: { points: 11, copies: 2 },
  W: { points: 10, copies: 2 },
  X: { points: 12, copies: 2 },
  Y: { points: 4, copies: 4 },
  Z: { points: 14, copies: 2 },
  CL: { points: 10, copies: 2 },
  ER: { points: 7, copies: 2 },
  IN: { points: 7, copies: 2 },
  QU: { points: 9, copies: 2 },
  TH: { points: 9, copies: 2 },
}

/** Official deck size. Tests assert the table sums to this. */
export const DECK_SIZE = 118

export function cardPoints(code: CardCode): number {
  return CARDS[code].points
}

/** Letters a card contributes. Doubles count as two, which drives the longest-word bonus. */
export function cardLetters(code: CardCode): number {
  return code.length
}

export function isDoubleCard(code: string): code is DoubleCard {
  return (DOUBLE_CARDS as readonly string[]).includes(code)
}

export function isCardCode(code: string): code is CardCode {
  return code in CARDS
}
