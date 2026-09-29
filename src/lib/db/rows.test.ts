import { describe, expect, it } from 'vitest'
import { computeRound } from '@/lib/score'
import { entryRowToPlayerRoundEntry, playerRoundEntryToUpsertPayload } from './rows'

const meta = {
  roundId: 'r1',
  gameId: 'g1',
  gamePlayerId: 'p1',
  updatedAt: '2026-09-01T00:00:00.000Z',
  clientId: 'device-a',
}

/**
 * `manualScore` is tri-state and the whole contract hinges on `??` rather than
 * `||`. A zero manual score is a legal total, so collapsing it to null would
 * silently switch a round back to computed scoring and change the result. This
 * is the kind of change a refactor makes without noticing.
 */
describe('manualScore tri-state survives the mapper', () => {
  it('keeps a manual score of 0 as 0, not null', () => {
    const payload = playerRoundEntryToUpsertPayload(
      { words: [], unused: [], manualScore: 0 },
      meta,
    )
    expect(payload.p_manual_score).toBe(0)
    expect(payload.p_manual_score).not.toBeNull()
  })

  it('maps undefined and null alike to SQL NULL', () => {
    expect(
      playerRoundEntryToUpsertPayload({ words: [], unused: [] }, meta).p_manual_score,
    ).toBeNull()
    expect(
      playerRoundEntryToUpsertPayload(
        { words: [], unused: [], manualScore: null },
        meta,
      ).p_manual_score,
    ).toBeNull()
  })

  it('passes a real manual score through untouched', () => {
    expect(
      playerRoundEntryToUpsertPayload(
        { words: [], unused: [], manualScore: 42 },
        meta,
      ).p_manual_score,
    ).toBe(42)
  })

  it('reads a 0 back from the database as manual, not as computed', () => {
    const entry = entryRowToPlayerRoundEntry({
      id: 'e1',
      round_id: 'r1',
      game_id: 'g1',
      game_player_id: 'p1',
      words: [{ word: 'CAT', tokens: ['C', 'A', 'T'] }],
      unused: [],
      challenge_delta: 0,
      manual_score: 0,
      updated_at: meta.updatedAt,
      client_id: 'device-a',
    })

    // The words would score 13, but a manual 0 must win.
    expect(computeRound({ p1: entry }).p1.manual).toBe(true)
    expect(computeRound({ p1: entry }).p1.total).toBe(0)
  })
})

describe('challengeDelta normalises across the NOT NULL boundary', () => {
  it('sends 0 when the entry omits it', () => {
    expect(
      playerRoundEntryToUpsertPayload({ words: [], unused: [] }, meta)
        .p_challenge_delta,
    ).toBe(0)
  })

  it('preserves a negative, which is the only route to a negative round', () => {
    expect(
      playerRoundEntryToUpsertPayload(
        { words: [], unused: [], challengeDelta: -13 },
        meta,
      ).p_challenge_delta,
    ).toBe(-13)
  })
})
