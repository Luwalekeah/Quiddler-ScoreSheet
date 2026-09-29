'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import AppHeader from '@/components/AppHeader'
import { isSupabaseConfigured } from '@/lib/db/config'
import { listGames, type LocalGame } from '@/lib/local/idb'
import { pull } from '@/lib/sync/engine'

interface WinTotal {
  userId: string
  name: string
  wins: number
}

/** Win totals across all games have a real identity, so guests are excluded. */
function computeWinTotals(games: LocalGame[]): WinTotal[] {
  const totals = new Map<string, WinTotal>()
  for (const g of games) {
    if (g.game.status !== 'finished') continue
    for (const p of g.players) {
      if (!p.is_winner || !p.user_id) continue
      const existing = totals.get(p.user_id)
      totals.set(p.user_id, {
        userId: p.user_id,
        name: p.display_name,
        wins: (existing?.wins ?? 0) + 1,
      })
    }
  }
  return [...totals.values()].sort((a, b) => b.wins - a.wins)
}

export default function GamesListPage() {
  const [games, setGames] = useState<LocalGame[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false

    void (async () => {
      const local = await listGames()
      if (cancelled) return
      setGames(local)
      setLoaded(true)

      if (!isSupabaseConfigured()) return

      await Promise.all(local.map((g) => pull(g.game.id).catch(() => undefined)))
      if (cancelled) return
      const refreshed = await listGames()
      if (!cancelled) setGames(refreshed)
    })()

    return () => {
      cancelled = true
    }
  }, [])

  const winTotals = computeWinTotals(games)

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <AppHeader title="Quiddler ScoreSheet" />

      <main className="flex-1 px-4 py-4">
        {winTotals.length > 0 ? (
          <section className="mb-6">
            <h2 className="mb-2 text-sm font-medium text-muted">Wins</h2>
            <div className="flex flex-wrap gap-2">
              {winTotals.map((w) => (
                <span
                  key={w.userId}
                  className="rounded-full border border-control bg-surface px-3 py-1 text-sm"
                >
                  {w.name} <span className="tabular font-semibold">{w.wins}</span>
                </span>
              ))}
            </div>
          </section>
        ) : null}

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted">Games</h2>
            <Link
              href="/games/new"
              className="min-h-touch inline-flex items-center rounded-lg bg-accent px-4 font-medium text-accent-contrast"
            >
              New game
            </Link>
          </div>

          {!loaded ? null : games.length === 0 ? (
            <p className="text-sm text-muted">No games yet. Start one to begin scoring.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {games.map((g) => {
                const seated = [...g.players].sort((a, b) => a.seat - b.seat)
                const winners = g.players.filter((p) => p.is_winner)
                return (
                  <li key={g.game.id}>
                    <Link
                      href={`/games/${g.game.id}`}
                      className="flex min-h-touch flex-col gap-1 rounded-lg border border-control bg-surface px-4 py-3"
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="font-medium">
                          {new Date(g.game.created_at).toLocaleDateString()}
                        </span>
                        {g.game.status === 'active' ? (
                          <span className="rounded-full border border-chip-double-border bg-chip-double px-2 py-0.5 text-xs font-medium">
                            In progress
                          </span>
                        ) : null}
                      </span>
                      <span className="text-sm text-muted">
                        {seated.map((p) => p.display_name).join(', ')}
                      </span>
                      {g.game.status === 'finished' && winners.length > 0 ? (
                        <span className="text-sm">
                          Winner: {winners.map((p) => p.display_name).join(', ')}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  )
}
