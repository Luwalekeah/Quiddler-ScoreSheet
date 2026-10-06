'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '@/components/AppHeader'
import PlayerPicker, { type SetupPlayer } from '@/components/setup/PlayerPicker'
import BonusModePicker from '@/components/setup/BonusModePicker'
import { defaultBonusMode, type BonusMode } from '@/lib/score'
import { createGameLocal } from '@/lib/sync/engine'
import { getSupabaseBrowserClient } from '@/lib/db/supabase'
import { getClientId } from '@/lib/local/idb'

export default function NewGamePage() {
  const router = useRouter()
  const [players, setPlayers] = useState<SetupPlayer[]>([])
  const [bonusMode, setBonusMode] = useState<BonusMode>(defaultBonusMode(0))
  const [creating, setCreating] = useState(false)

  const [prevAtOrBelowTwo, setPrevAtOrBelowTwo] = useState(true)
  const atOrBelowTwo = players.length <= 2

  // Re-defaults whenever the player count crosses the two-player boundary.
  // Adjusted during render, not in an effect, per React's guidance for
  // resetting derived state when it depends on other state.
  if (atOrBelowTwo !== prevAtOrBelowTwo) {
    setPrevAtOrBelowTwo(atOrBelowTwo)
    setBonusMode(defaultBonusMode(players.length))
  }

  const canCreate = players.length >= 2 && players.length <= 8 && !creating

  async function handleCreate() {
    if (!canCreate) return
    setCreating(true)

    const supabase = getSupabaseBrowserClient()
    let createdBy: string
    if (supabase) {
      const { data } = await supabase.auth.getUser()
      createdBy = data.user?.id ?? (await getClientId())
    } else {
      createdBy = await getClientId()
    }

    const local = await createGameLocal({
      createdBy,
      bonusMode,
      players: players.map((p) => ({ displayName: p.displayName, userId: p.userId })),
    })

    // Local write is already durable. Navigate immediately; sync continues
    // in the background.
    router.push(`/games/${local.game.id}`)
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <AppHeader title="New game" showBack />

      <main className="flex flex-1 flex-col gap-6 px-4 py-4">
        <PlayerPicker players={players} onChange={setPlayers} />
        <BonusModePicker playerCount={players.length} value={bonusMode} onChange={setBonusMode} />
      </main>

      <div className="bottom-bar sticky bottom-0 border-t border-border bg-surface px-4 py-3">
        {players.length === 1 ? (
          <p className="mb-2 text-sm text-muted">Add at least one more player.</p>
        ) : null}
        <button
          type="button"
          onClick={handleCreate}
          disabled={!canCreate}
          className="min-h-touch w-full rounded-lg bg-accent font-medium text-accent-contrast disabled:opacity-50"
        >
          {creating ? 'Starting...' : 'Start game'}
        </button>
      </div>
    </div>
  )
}
