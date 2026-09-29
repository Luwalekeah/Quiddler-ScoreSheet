'use client'

import { useState } from 'react'
import type { LocalGame } from '@/lib/local/idb'
import RoundGrid from './RoundGrid'
import StandingsTable from './StandingsTable'

export interface GameDetailProps {
  game: LocalGame
  onReopen: () => Promise<void>
}

/**
 * Read-only standings plus the round grid, for a finished or abandoned
 * game. Reopen is offered to any participant locally; quiddler.games'
 * update policy (owner only) is the real gate once synced.
 */
export default function GameDetail({ game, onReopen }: GameDetailProps) {
  const [reopening, setReopening] = useState(false)

  async function handleReopen() {
    if (reopening) return
    const confirmed = window.confirm('Reopen this game? It will go back to active scoring.')
    if (!confirmed) return
    setReopening(true)
    await onReopen()
  }

  return (
    <main className="flex flex-1 flex-col gap-6 px-4 py-4">
      <section>
        <h2 className="mb-2 text-lg font-semibold">Final standings</h2>
        <StandingsTable players={game.players} />
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold">Round by round</h2>
        <RoundGrid
          rounds={game.rounds}
          players={game.players}
          entries={game.entries}
          bonusMode={game.game.bonus_mode}
        />
      </section>

      {game.game.status === 'finished' ? (
        <button
          type="button"
          onClick={handleReopen}
          disabled={reopening}
          className="min-h-touch rounded-lg border border-control font-medium disabled:opacity-50"
        >
          {reopening ? 'Reopening...' : 'Reopen game'}
        </button>
      ) : null}
    </main>
  )
}
