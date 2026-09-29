/**
 * Per-chip split and merge helpers for the word entry UI.
 *
 * Pure, UI-only helpers. No scoring logic lives here, that stays in
 * score.ts. `defaultTokenization` already picks the greedy double-first
 * reading; these functions let a player correct one chip at a time without
 * cycling through `allTokenizations`, which is available for a future
 * "show every reading" affordance and is not needed here.
 */

import { CardCode, isDoubleCard } from './cards'

/** True when the token at `i` is a double card and can be split into two singles. */
export function canSplitAt(tokens: CardCode[], i: number): boolean {
  if (i < 0 || i >= tokens.length) return false
  return isDoubleCard(tokens[i])
}

/** Replaces the double card at `i` with its two single-letter cards. */
export function splitAt(tokens: CardCode[], i: number): CardCode[] {
  if (!canSplitAt(tokens, i)) return [...tokens]
  const [a, b] = tokens[i].split('') as CardCode[]
  return [...tokens.slice(0, i), a, b, ...tokens.slice(i + 1)]
}

/**
 * True when `tokens[i]` and `tokens[i+1]` are both single-letter cards whose
 * concatenation is a real double card, for example T followed by H.
 */
export function canMergeAt(tokens: CardCode[], i: number): boolean {
  if (i < 0 || i + 1 >= tokens.length) return false
  const a = tokens[i]
  const b = tokens[i + 1]
  if (a.length !== 1 || b.length !== 1) return false
  return isDoubleCard(a + b)
}

/** Combines `tokens[i]` and `tokens[i+1]` into the double card they spell. */
export function mergeAt(tokens: CardCode[], i: number): CardCode[] {
  if (!canMergeAt(tokens, i)) return [...tokens]
  const merged = (tokens[i] + tokens[i + 1]) as CardCode
  return [...tokens.slice(0, i), merged, ...tokens.slice(i + 2)]
}
