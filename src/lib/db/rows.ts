/**
 * Postgres row shapes for the `quiddler` schema, plus mappers to and from
 * the pure shapes in score.ts. See .pipeline/spec.md section 1 for the DDL
 * these types mirror.
 *
 * Tri-state contract: `manual_score` is SQL NULL when a round is scored from
 * words, and an integer (including legally 0) when it is hand-typed. Never
 * write `manual_score = 0` to mean "off". `computeRound` in score.ts treats
 * any non-null `manualScore` as manual, so the mappers below preserve
 * `null` versus `undefined` versus a real zero exactly as given.
 */

import type { BonusMode, PlayedWord, PlayerRoundEntry } from '../score'
import type { CardCode } from '../cards'

export type GameStatus = 'active' | 'finished' | 'abandoned'

export interface GameRow {
  id: string
  created_by: string
  status: GameStatus
  bonus_mode: BonusMode
  total_rounds: number
  created_at: string
  updated_at: string
  finished_at: string | null
}

export interface GamePlayerRow {
  id: string
  game_id: string
  /** null means a guest with no account. */
  user_id: string | null
  display_name: string
  seat: number
  final_total: number | null
  final_rank: number | null
  is_winner: boolean
}

export interface RoundRow {
  id: string
  game_id: string
  round_number: number
  cards_dealt: number
  completed_at: string | null
}

export interface RoundEntryRow {
  id: string
  round_id: string
  game_id: string
  game_player_id: string
  words: PlayedWord[]
  unused: CardCode[]
  challenge_delta: number
  /** SQL NULL means "not manual". Never 0-for-off, 0 is a legal manual total. */
  manual_score: number | null
  updated_at: string
  client_id: string
}

/** Reconstitutes a `PlayerRoundEntry` from a DB row. Round-trip is exact. */
export function entryRowToPlayerRoundEntry(row: RoundEntryRow): PlayerRoundEntry {
  return {
    words: row.words,
    unused: row.unused,
    challengeDelta: row.challenge_delta,
    manualScore: row.manual_score,
  }
}

/**
 * Builds the payload for `quiddler.upsert_round_entry`. `manualScore` stays
 * tri-state: `undefined` and `null` both become SQL NULL, a real number
 * (including 0) is passed through untouched.
 */
export function playerRoundEntryToUpsertPayload(
  entry: PlayerRoundEntry,
  meta: {
    roundId: string
    gameId: string
    gamePlayerId: string
    updatedAt: string
    clientId: string
  },
): {
  p_round_id: string
  p_game_id: string
  p_game_player_id: string
  p_words: PlayedWord[]
  p_unused: CardCode[]
  p_challenge_delta: number
  p_manual_score: number | null
  p_updated_at: string
  p_client_id: string
} {
  return {
    p_round_id: meta.roundId,
    p_game_id: meta.gameId,
    p_game_player_id: meta.gamePlayerId,
    p_words: entry.words,
    p_unused: entry.unused,
    p_challenge_delta: entry.challengeDelta ?? 0,
    p_manual_score: entry.manualScore ?? null,
    p_updated_at: meta.updatedAt,
    p_client_id: meta.clientId,
  }
}
