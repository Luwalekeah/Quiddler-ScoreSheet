'use client'

import { useMemo, useRef, useState } from 'react'
import { computeRound, computeStandings, TOTAL_ROUNDS, type PlayerRoundEntry } from '@/lib/score'
import type { LocalGame } from '@/lib/local/idb'
import { entryKey } from '@/lib/local/idb'
import RoundNav from './RoundNav'
import PlayerRow from './PlayerRow'
import EntrySheet from './EntrySheet'

export interface ActiveGameProps {
  game: LocalGame
  onUpsertEntry: (roundNumber: number, gamePlayerId: string, patch: PlayerRoundEntry) => Promise<void>
  onFinish: () => Promise<void>
}

const EMPTY_ENTRY: PlayerRoundEntry = { words: [], unused: [] }

/** Round navigation, player list, and the Finish action. One EntrySheet open at a time. */
export default function ActiveGame({ game, onUpsertEntry, onFinish }: ActiveGameProps) {
  const [currentRound, setCurrentRound] = useState(1)
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null)
  const [finishing, setFinishing] = useState(false)
  const rowRefs = useRef<Map<string, HTMLButtonElement | null>>(new Map())

  const players = useMemo(() => [...game.players].sort((a, b) => a.seat - b.seat), [game.players])

  const currentRoundEntries = useMemo(() => {
    const entries: Record<string, PlayerRoundEntry> = {}
    for (const p of players) {
      entries[p.id] = game.entries[entryKey(currentRound, p.id)] ?? EMPTY_ENTRY
    }
    return entries
  }, [players, game.entries, currentRound])

  const currentResults = useMemo(
    () => computeRound(currentRoundEntries, game.game.bonus_mode),
    [currentRoundEntries, game.game.bonus_mode],
  )

  const runningTotals = useMemo(() => {
    const sortedRounds = [...game.rounds].sort((a, b) => a.round_number - b.round_number)
    const perRound = sortedRounds.map((round) => {
      const entries: Record<string, PlayerRoundEntry> = {}
      for (const p of players) {
        entries[p.id] = game.entries[entryKey(round.round_number, p.id)] ?? EMPTY_ENTRY
      }
      return computeRound(entries, game.game.bonus_mode)
    })
    const standings = computeStandings(
      perRound,
      players.map((p) => p.id),
    )
    return new Map(standings.map((s) => [s.playerId, s.total]))
  }, [game.rounds, game.entries, game.game.bonus_mode, players])

  // Collapsing by tapping the same PlayerRow button again leaves focus
  // where it already is. Closing via a round change needs to send it back
  // explicitly, since the control that changed rounds is not that button.
  function closeSheet() {
    const id = expandedPlayerId
    setExpandedPlayerId(null)
    if (id) rowRefs.current.get(id)?.focus()
  }

  function toggle(playerId: string) {
    setExpandedPlayerId((current) => (current === playerId ? null : playerId))
  }

  async function handleNext() {
    if (currentRound < TOTAL_ROUNDS) {
      setCurrentRound((r) => r + 1)
      closeSheet()
      return
    }
    if (finishing) return
    const confirmed = window.confirm('Finish the game? This locks in the final standings.')
    if (!confirmed) return
    setFinishing(true)
    await onFinish()
  }

  function handlePrevious() {
    setCurrentRound((r) => Math.max(1, r - 1))
    closeSheet()
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <RoundNav
        currentRound={currentRound}
        onSelect={(round) => {
          setCurrentRound(round)
          closeSheet()
        }}
      />

      <main className="scroll-under-bottom-bar flex-1 overflow-y-auto">
        {players.map((p) => (
          <div key={p.id}>
            <PlayerRow
              ref={(el) => {
                rowRefs.current.set(p.id, el)
              }}
              name={p.display_name}
              result={currentResults[p.id]}
              runningTotal={runningTotals.get(p.id) ?? 0}
              expanded={expandedPlayerId === p.id}
              onToggle={() => toggle(p.id)}
            />
            {expandedPlayerId === p.id ? (
              <EntrySheet
                playerName={p.display_name}
                roundNumber={currentRound}
                entry={currentRoundEntries[p.id]}
                onChange={(patch) => onUpsertEntry(currentRound, p.id, patch)}
              />
            ) : null}
          </div>
        ))}
      </main>

      <div className="bottom-bar sticky bottom-0 flex gap-2 border-t border-border bg-surface px-4 py-3">
        <button
          type="button"
          onClick={handlePrevious}
          disabled={currentRound === 1}
          className="min-h-touch flex-1 rounded-lg border border-control font-medium disabled:opacity-50"
        >
          Previous round
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={finishing}
          className="min-h-touch flex-1 rounded-lg bg-accent font-medium text-accent-contrast disabled:opacity-50"
        >
          {currentRound < TOTAL_ROUNDS ? 'Next round' : finishing ? 'Finishing...' : 'Finish game'}
        </button>
      </div>
    </div>
  )
}
