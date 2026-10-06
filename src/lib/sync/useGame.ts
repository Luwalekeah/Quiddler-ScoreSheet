'use client'

/**
 * The only hook the UI touches for a single game's data. Hydrates from
 * IndexedDB immediately, pulls from Postgres in the background, and keeps
 * a realtime channel open for the lifetime of the screen. See
 * .pipeline/spec.md section 3, "Read and hydrate path".
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { PlayerRoundEntry } from '../score'
import { loadGame, type LocalGame } from '../local/idb'
import {
  addPlayerLocal,
  finishGameLocal,
  hydrate,
  pull,
  reopenGameLocal,
  subscribeStatus,
  upsertEntryLocal,
  type SyncStatus,
} from './engine'
import { subscribeGame } from './realtime'

export interface UseGameResult {
  game: LocalGame | undefined
  loading: boolean
  /** True only when this device has never opened this game and is offline. */
  unavailableOffline: boolean
  syncStatus: SyncStatus
  pendingCount: number
  upsertEntry: (
    roundNumber: number,
    gamePlayerId: string,
    patch: PlayerRoundEntry,
  ) => Promise<void>
  addPlayer: (displayName: string, userId: string | null) => Promise<void>
  finishGame: () => Promise<void>
  reopenGame: () => Promise<void>
  refresh: () => Promise<void>
}

export function useGame(gameId: string | undefined): UseGameResult {
  const [game, setGame] = useState<LocalGame | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [unavailableOffline, setUnavailableOffline] = useState(false)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced')
  const [pendingCount, setPendingCount] = useState(0)
  const roundIdByNumber = useRef<Map<number, string>>(new Map())

  // First paint never waits on the network: hydrate, render, then pull.
  useEffect(() => {
    if (!gameId) return
    let cancelled = false

    void (async () => {
      const local = await hydrate(gameId)
      if (cancelled) return
      setGame(local)
      setLoading(false)

      try {
        const merged = await pull(gameId)
        if (!cancelled) {
          setGame(merged)
          setUnavailableOffline(false)
        }
      } catch {
        if (!cancelled && !local) setUnavailableOffline(true)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [gameId])

  useEffect(() => {
    if (!gameId) return
    return subscribeGame(gameId, () => {
      void loadGame(gameId).then((refreshed) => {
        if (refreshed) setGame(refreshed)
      })
    })
  }, [gameId])

  useEffect(
    () =>
      subscribeStatus((s, pending) => {
        setSyncStatus(s)
        setPendingCount(pending)
      }),
    [],
  )

  useEffect(() => {
    roundIdByNumber.current = new Map((game?.rounds ?? []).map((r) => [r.round_number, r.id]))
  }, [game?.rounds])

  const upsertEntry = useCallback(
    async (roundNumber: number, gamePlayerId: string, patch: PlayerRoundEntry) => {
      if (!gameId) return
      const roundId = roundIdByNumber.current.get(roundNumber)
      if (!roundId) return
      const updated = await upsertEntryLocal(gameId, roundId, roundNumber, gamePlayerId, patch)
      setGame(updated)
    },
    [gameId],
  )

  const addPlayer = useCallback(
    async (displayName: string, userId: string | null) => {
      if (!gameId) return
      const updated = await addPlayerLocal(gameId, displayName, userId)
      setGame(updated)
    },
    [gameId],
  )

  const finishGame = useCallback(async () => {
    if (!gameId) return
    const updated = await finishGameLocal(gameId)
    setGame(updated)
  }, [gameId])

  const reopenGame = useCallback(async () => {
    if (!gameId) return
    const updated = await reopenGameLocal(gameId)
    setGame(updated)
  }, [gameId])

  const refresh = useCallback(async () => {
    if (!gameId) return
    try {
      const merged = await pull(gameId)
      setGame(merged)
    } catch {
      // Local copy stays authoritative.
    }
  }, [gameId])

  return {
    game,
    loading,
    unavailableOffline,
    syncStatus,
    pendingCount,
    upsertEntry,
    addPlayer,
    finishGame,
    reopenGame,
    refresh,
  }
}
