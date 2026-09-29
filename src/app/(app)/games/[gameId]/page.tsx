'use client'

import { useParams } from 'next/navigation'
import AppHeader from '@/components/AppHeader'
import ActiveGame from '@/components/game/ActiveGame'
import GameDetail from '@/components/game/GameDetail'
import { useGame } from '@/lib/sync/useGame'

/** Status branch: active games get the scoring surface, finished or abandoned games get the read-only summary. */
export default function GamePage() {
  const params = useParams<{ gameId: string }>()
  const gameId = params.gameId

  const {
    game,
    loading,
    unavailableOffline,
    syncStatus,
    pendingCount,
    upsertEntry,
    finishGame,
    reopenGame,
  } = useGame(gameId)

  if (unavailableOffline) {
    return (
      <div className="flex min-h-full flex-1 flex-col">
        <AppHeader title="Game" showBack />
        <main className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
          <p className="font-medium">This game is not saved on this device and you are offline.</p>
          <p className="text-sm text-muted">Reconnect to load it.</p>
        </main>
      </div>
    )
  }

  if (loading || !game) {
    return (
      <div className="flex min-h-full flex-1 flex-col">
        <AppHeader title="Game" showBack />
        <main aria-busy="true" className="flex-1" />
      </div>
    )
  }

  const title = game.game.status === 'active' ? 'Scoring' : 'Final standings'

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <AppHeader title={title} showBack syncStatus={syncStatus} pendingCount={pendingCount} />
      {game.game.status === 'active' ? (
        <ActiveGame game={game} onUpsertEntry={upsertEntry} onFinish={finishGame} />
      ) : (
        <GameDetail game={game} onReopen={reopenGame} />
      )}
    </div>
  )
}
