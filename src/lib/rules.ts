/**
 * Game reference content, ported from the previous Streamlit app's expander.py.
 *
 * Point values are DERIVED from `CARDS` rather than restated. The old app kept
 * a second hand-written copy of the values in its reference text, and that copy
 * drifted: five values were wrong, including E, which had its card count in the
 * points column. Deriving the display removes the possibility.
 */

import { CARDS, CardCode, DOUBLE_CARDS, SINGLE_LETTERS } from './cards'
import { TOTAL_ROUNDS, cardsDealtInRound } from './score'

export interface ValueGroup {
  points: number
  cards: { code: CardCode; copies: number }[]
}

/** Single letters grouped by point value, ascending. For the reference table. */
export function lettersByValue(): ValueGroup[] {
  const groups = new Map<number, ValueGroup>()

  for (const code of SINGLE_LETTERS) {
    const { points, copies } = CARDS[code]
    if (!groups.has(points)) groups.set(points, { points, cards: [] })
    groups.get(points)!.cards.push({ code, copies })
  }

  return [...groups.values()].sort((a, b) => a.points - b.points)
}

/** The five two-letter cards, ascending by value. */
export function doubleCardReference(): { code: CardCode; points: number; copies: number }[] {
  return DOUBLE_CARDS.map((code) => ({
    code,
    points: CARDS[code].points,
    copies: CARDS[code].copies,
  })).sort((a, b) => a.points - b.points)
}

/** Cards dealt per round, for the round header. Round 1 deals 3, round 8 deals 10. */
export function roundSchedule(): { round: number; cards: number }[] {
  return Array.from({ length: TOTAL_ROUNDS }, (_, i) => ({
    round: i + 1,
    cards: cardsDealtInRound(i + 1),
  }))
}

export interface RulesSection {
  id: string
  title: string
  body: string[]
}

/**
 * Rules text from the official PlayMonster instruction sheet.
 *
 * Two corrections against the old app: the game is 8 rounds, not 10, and a
 * round can go negative after a lost challenge.
 */
export const RULES: RulesSection[] = [
  {
    id: 'overview',
    title: 'Game overview',
    body: [
      'Players: 1 to 8. Ages 8 to adult.',
      'Make your whole hand into one or more words. Highest score after the last round wins.',
      `The game runs ${TOTAL_ROUNDS} rounds. Round 1 deals 3 cards and each round deals one more, so the last round deals ${cardsDealtInRound(TOTAL_ROUNDS)}.`,
      'The deck is 118 cards: A to Z plus the double-letter cards CL, ER, IN, QU and TH.',
    ],
  },
  {
    id: 'play',
    title: 'How to play',
    body: [
      'On your turn, draw one card from the draw pile or take the top of the discard pile. Then discard one card.',
      'To go out, lay your whole hand down as allowable words and discard your last card. You need one card left to discard.',
      'Once a player goes out, everyone else gets one more turn.',
      'Words need at least two cards. No proper nouns, prefixes, suffixes, abbreviations or hyphenated words.',
      'Agree on your dictionary before the game starts.',
    ],
  },
  {
    id: 'scoring',
    title: 'Scoring',
    body: [
      'Add up the points for every word you laid down.',
      'Subtract the value of any cards left in your hand, down to zero. A bad round is worth 0, not a negative.',
      'A round only goes negative if you lose a challenge.',
      'The app does this arithmetic for you. Type the words you played and it scores them.',
    ],
  },
  {
    id: 'bonuses',
    title: 'Bonuses',
    body: [
      'Two bonuses each round, worth 10 points each.',
      'Most words: the player who laid down the most words.',
      'Longest word: the word using the most letters, not the most cards. A double card like TH counts as two letters.',
      'If two or more players tie for a bonus, nobody gets it.',
      'One player can take both bonuses.',
      'With two players use only one bonus. Decide which before you start.',
    ],
  },
  {
    id: 'challenges',
    title: 'Challenges',
    body: [
      'Challenge a word immediately after it is played if you think it is not allowable.',
      'The value of the challenged word is subtracted from whoever loses the challenge.',
      'You cannot rearrange the cards in a challenged word.',
      'If the challenged player went out first, play continues as if they went out even if they lose.',
    ],
  },
]
