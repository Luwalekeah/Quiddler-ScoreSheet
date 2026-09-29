/**
 * Hydrate, pull, merge, and flush. The local-first sync engine.
 *
 * The one rule this file exists to serve: every user action writes to
 * IndexedDB and updates React state before any network call is attempted.
 * The network is a background replication detail. See .pipeline/spec.md
 * section 3.
 */

import {
  computeRound,
  computeStandings,
  winnersOf,
  type BonusMode,
  type PlayerRoundEntry,
  type PlayerRoundResult,
} from '../score'
import { cardsDealtInRound, TOTAL_ROUNDS } from '../score'
import { getSupabaseBrowserClient } from '../db/supabase'
import { playerRoundEntryToUpsertPayload, entryRowToPlayerRoundEntry } from '../db/rows'
import type { GamePlayerRow, GameRow, RoundEntryRow, RoundRow } from '../db/rows'
import {
  entryKey,
  getClientId,
  loadGame,
  saveGame,
  type LocalEntry,
  type LocalGame,
} from '../local/idb'
import {
  deadLetterCount,
  enqueue,
  fail,
  moveToDeadLetter,
  peekAll,
  pendingCount as outboxPendingCount,
  remove,
  requeueDeadLetter,
  type Op,
} from '../local/outbox'

// ---------------------------------------------------------------------------
// Hydrate and pull
// ---------------------------------------------------------------------------

/** Local snapshot only. Never touches the network. Resolves fast. */
export async function hydrate(gameId: string): Promise<LocalGame | undefined> {
  return loadGame(gameId)
}

/**
 * Unit of conflict is one round_entries row. Resolution is last-write-wins
 * on updatedAt, with clientId as a deterministic tiebreak. Identical rules
 * run inside quiddler.upsert_round_entry.
 */
export function mergeEntry(local: LocalEntry | undefined, remote: LocalEntry): LocalEntry {
  if (!local) return remote
  if (remote.updatedAt > local.updatedAt) return remote
  if (remote.updatedAt < local.updatedAt) return local
  return remote.clientId > local.clientId ? remote : local
}

/** Fetches from Postgres, merges into local, persists, returns the merged result. */
export async function pull(gameId: string): Promise<LocalGame> {
  const local = await loadGame(gameId)
  const supabase = getSupabaseBrowserClient()

  if (!supabase) {
    if (local) return local
    throw new Error('offline: no local copy and no backend configured')
  }

  const [gameRes, playersRes, roundsRes, entriesRes] = await Promise.all([
    supabase.from('games').select('*').eq('id', gameId).maybeSingle(),
    supabase.from('game_players').select('*').eq('game_id', gameId),
    supabase.from('rounds').select('*').eq('game_id', gameId),
    supabase.from('round_entries').select('*').eq('game_id', gameId),
  ])

  const firstError = gameRes.error ?? playersRes.error ?? roundsRes.error ?? entriesRes.error
  if (firstError || !gameRes.data) {
    if (local) return local
    throw firstError ?? new Error('pull failed: game not found')
  }

  const rounds = (roundsRes.data ?? []) as RoundRow[]
  const roundNumberById = new Map(rounds.map((r) => [r.id, r.round_number]))

  const mergedEntries: Record<string, LocalEntry> = { ...(local?.entries ?? {}) }
  for (const row of (entriesRes.data ?? []) as RoundEntryRow[]) {
    const roundNumber = roundNumberById.get(row.round_id)
    if (roundNumber === undefined) continue
    const remote: LocalEntry = {
      ...entryRowToPlayerRoundEntry(row),
      gamePlayerId: row.game_player_id,
      roundNumber,
      updatedAt: row.updated_at,
      clientId: row.client_id,
    }
    const key = entryKey(roundNumber, row.game_player_id)
    mergedEntries[key] = mergeEntry(mergedEntries[key], remote)
  }

  const merged: LocalGame = {
    game: gameRes.data as GameRow,
    players: (playersRes.data ?? []) as GamePlayerRow[],
    rounds,
    entries: mergedEntries,
    serverSyncedAt: new Date().toISOString(),
  }

  await saveGame(merged)
  checkClockSkew()
  return merged
}

// ---------------------------------------------------------------------------
// Clock skew warning (best effort, non-blocking)
// ---------------------------------------------------------------------------

let clockSkewWarning = false

function checkClockSkew(): void {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url || typeof fetch === 'undefined') return
  fetch(url, { method: 'HEAD', cache: 'no-store' })
    .then((res) => {
      const dateHeader = res.headers.get('date')
      if (!dateHeader) return
      const skewMs = Math.abs(new Date(dateHeader).getTime() - Date.now())
      clockSkewWarning = skewMs > 120_000
    })
    .catch(() => {
      // Best effort. Skew detection is a UX nicety, not correctness.
    })
}

export function getClockSkewWarning(): boolean {
  return clockSkewWarning
}

// ---------------------------------------------------------------------------
// Local mutations. Local write always happens before enqueue, per the one rule.
// ---------------------------------------------------------------------------

export interface CreateGameInput {
  createdBy: string
  bonusMode: BonusMode
  players: { displayName: string; userId: string | null }[]
}

/** Builds a brand new game locally with client-generated UUIDs and queues it for sync. */
export async function createGameLocal(input: CreateGameInput): Promise<LocalGame> {
  const now = new Date().toISOString()
  const gameId = crypto.randomUUID()

  const game: GameRow = {
    id: gameId,
    created_by: input.createdBy,
    status: 'active',
    bonus_mode: input.bonusMode,
    total_rounds: TOTAL_ROUNDS,
    created_at: now,
    updated_at: now,
    finished_at: null,
  }

  const players: GamePlayerRow[] = input.players.map((p, seat) => ({
    id: crypto.randomUUID(),
    game_id: gameId,
    user_id: p.userId,
    display_name: p.displayName,
    seat,
    final_total: null,
    final_rank: null,
    is_winner: false,
  }))

  const rounds: RoundRow[] = Array.from({ length: TOTAL_ROUNDS }, (_, i) => ({
    id: crypto.randomUUID(),
    game_id: gameId,
    round_number: i + 1,
    cards_dealt: cardsDealtInRound(i + 1),
    completed_at: null,
  }))

  const local: LocalGame = { game, players, rounds, entries: {}, serverSyncedAt: null }
  await saveGame(local)
  await enqueue({ kind: 'createGame', game, players, rounds })
  kickFlush()
  return local
}

/** Adds a player to an existing game, locally first. */
export async function addPlayerLocal(
  gameId: string,
  displayName: string,
  userId: string | null,
): Promise<LocalGame> {
  const local = await loadGame(gameId)
  if (!local) throw new Error(`addPlayerLocal: game ${gameId} is not on this device`)

  const seat = local.players.length
  const player: GamePlayerRow = {
    id: crypto.randomUUID(),
    game_id: gameId,
    user_id: userId,
    display_name: displayName,
    seat,
    final_total: null,
    final_rank: null,
    is_winner: false,
  }

  const updated: LocalGame = { ...local, players: [...local.players, player] }
  await saveGame(updated)
  await enqueue({ kind: 'addPlayer', gameId, player })
  kickFlush()
  return updated
}

/** Writes one player's round entry, locally first. */
export async function upsertEntryLocal(
  gameId: string,
  roundId: string,
  roundNumber: number,
  gamePlayerId: string,
  patch: PlayerRoundEntry,
): Promise<LocalGame> {
  const local = await loadGame(gameId)
  if (!local) throw new Error(`upsertEntryLocal: game ${gameId} is not on this device`)

  const entry: LocalEntry = {
    ...patch,
    gamePlayerId,
    roundNumber,
    updatedAt: new Date().toISOString(),
    clientId: await getClientId(),
  }

  const key = entryKey(roundNumber, gamePlayerId)
  const updated: LocalGame = { ...local, entries: { ...local.entries, [key]: entry } }
  await saveGame(updated)
  await enqueue({ kind: 'upsertEntry', gameId, roundId, entry })
  kickFlush()
  return updated
}

/** Computes standings, writes them onto the players, and marks the game finished. */
export async function finishGameLocal(gameId: string): Promise<LocalGame> {
  const local = await loadGame(gameId)
  if (!local) throw new Error(`finishGameLocal: game ${gameId} is not on this device`)

  const roundResults: Record<string, PlayerRoundResult>[] = local.rounds
    .sort((a, b) => a.round_number - b.round_number)
    .map((round) => {
      const entries: Record<string, PlayerRoundEntry> = {}
      for (const player of local.players) {
        entries[player.id] = local.entries[entryKey(round.round_number, player.id)] ?? {
          words: [],
          unused: [],
        }
      }
      return computeRound(entries, local.game.bonus_mode)
    })

  const standings = computeStandings(
    roundResults,
    local.players.map((p) => p.id),
  )
  const winners = new Set(winnersOf(standings))
  const finishedAt = new Date().toISOString()

  const players = local.players.map((p) => {
    const standing = standings.find((s) => s.playerId === p.id)
    return {
      ...p,
      final_total: standing?.total ?? 0,
      final_rank: standing?.rank ?? local.players.length,
      is_winner: winners.has(p.id),
    }
  })

  const game: GameRow = {
    ...local.game,
    status: 'finished',
    finished_at: finishedAt,
    updated_at: finishedAt,
  }

  const updated: LocalGame = { ...local, game, players }
  await saveGame(updated)
  await enqueue({ kind: 'finishGame', gameId, finishedAt, standings })
  kickFlush()
  return updated
}

/** Reopens a finished game by accident-proofing the Finish action. */
export async function reopenGameLocal(gameId: string): Promise<LocalGame> {
  const local = await loadGame(gameId)
  if (!local) throw new Error(`reopenGameLocal: game ${gameId} is not on this device`)

  const game: GameRow = {
    ...local.game,
    status: 'active',
    finished_at: null,
    updated_at: new Date().toISOString(),
  }

  const updated: LocalGame = { ...local, game }
  await saveGame(updated)
  await enqueue({ kind: 'reopenGame', gameId })
  kickFlush()
  return updated
}

// ---------------------------------------------------------------------------
// Sync status
// ---------------------------------------------------------------------------

export type SyncStatus = 'synced' | 'pending' | 'offline' | 'error'

const statusListeners = new Set<(s: SyncStatus, pending: number) => void>()
let lastStatus: SyncStatus = 'synced'
let lastPullFailed = false

async function computeStatus(): Promise<{ status: SyncStatus; pending: number }> {
  const pending = await outboxPendingCount()
  const dead = await deadLetterCount()

  if (!getSupabaseBrowserClient()) {
    // No backend deployed yet. There is nothing to flush to, so a queued
    // item is honestly "offline", not "pending": pending implies syncing
    // is imminent, which would be a false promise here.
    return { status: pending > 0 ? 'offline' : 'synced', pending }
  }

  if (dead > 0) return { status: 'error', pending }
  if (pending > 0) return { status: 'pending', pending }
  if (typeof navigator !== 'undefined' && !navigator.onLine) return { status: 'offline', pending }
  if (lastPullFailed) return { status: 'offline', pending }
  return { status: 'synced', pending }
}

async function notifyStatus(): Promise<void> {
  const { status, pending } = await computeStatus()
  lastStatus = status
  for (const fn of statusListeners) fn(status, pending)
}

export function subscribeStatus(fn: (s: SyncStatus, pending: number) => void): () => void {
  statusListeners.add(fn)
  notifyStatus()
  return () => {
    statusListeners.delete(fn)
  }
}

export function getLastStatus(): SyncStatus {
  return lastStatus
}

/** Retries whatever reached the dead letter queue by requeueing it onto the outbox. */
export async function retryDeadLetter(): Promise<void> {
  await requeueDeadLetter()
  kickFlush()
}

// ---------------------------------------------------------------------------
// Flush
// ---------------------------------------------------------------------------

type FailureClass = 'transient' | 'permanent'

function classifyStatus(status: number | undefined): FailureClass {
  if (status === 401 || status === 403 || status === 409 || status === 422) return 'permanent'
  return 'transient'
}

async function sendOp(
  supabase: NonNullable<ReturnType<typeof getSupabaseBrowserClient>>,
  op: Op,
): Promise<void> {
  switch (op.kind) {
    case 'createGame': {
      const gameRes = await supabase.from('games').upsert(op.game, { onConflict: 'id' })
      if (gameRes.error) throw Object.assign(new Error(gameRes.error.message), { status: gameRes.status })
      if (op.players.length > 0) {
        const playersRes = await supabase
          .from('game_players')
          .upsert(op.players, { onConflict: 'id' })
        if (playersRes.error) {
          throw Object.assign(new Error(playersRes.error.message), { status: playersRes.status })
        }
      }
      const roundsRes = await supabase.from('rounds').upsert(op.rounds, { onConflict: 'id' })
      if (roundsRes.error) {
        throw Object.assign(new Error(roundsRes.error.message), { status: roundsRes.status })
      }
      return
    }
    case 'addPlayer': {
      const res = await supabase.from('game_players').upsert(op.player, { onConflict: 'id' })
      if (res.error) throw Object.assign(new Error(res.error.message), { status: res.status })
      return
    }
    case 'upsertEntry': {
      const payload = playerRoundEntryToUpsertPayload(op.entry, {
        roundId: op.roundId,
        gameId: op.gameId,
        gamePlayerId: op.entry.gamePlayerId,
        updatedAt: op.entry.updatedAt,
        clientId: op.entry.clientId,
      })
      const res = await supabase.rpc('upsert_round_entry', payload)
      if (res.error) throw Object.assign(new Error(res.error.message), { status: res.status })

      // Reconcile the local copy downward if this write lost the LWW race.
      const row = res.data as RoundEntryRow | null
      if (row) {
        const local = await loadGame(op.gameId)
        if (local) {
          const key = entryKey(op.entry.roundNumber, row.game_player_id)
          const authoritative: LocalEntry = {
            ...entryRowToPlayerRoundEntry(row),
            gamePlayerId: row.game_player_id,
            roundNumber: op.entry.roundNumber,
            updatedAt: row.updated_at,
            clientId: row.client_id,
          }
          const resolved = mergeEntry(local.entries[key], authoritative)
          await saveGame({ ...local, entries: { ...local.entries, [key]: resolved } })
        }
      }
      return
    }
    case 'finishGame': {
      const gameRes = await supabase
        .from('games')
        .update({ status: 'finished', finished_at: op.finishedAt, updated_at: op.finishedAt })
        .eq('id', op.gameId)
      if (gameRes.error) throw Object.assign(new Error(gameRes.error.message), { status: gameRes.status })

      const winners = new Set(winnersOf(op.standings))
      for (const standing of op.standings) {
        const res = await supabase
          .from('game_players')
          .update({
            final_total: standing.total,
            final_rank: standing.rank,
            is_winner: winners.has(standing.playerId),
          })
          .eq('id', standing.playerId)
        if (res.error) throw Object.assign(new Error(res.error.message), { status: res.status })
      }
      return
    }
    case 'reopenGame': {
      const res = await supabase
        .from('games')
        .update({ status: 'active', finished_at: null, updated_at: new Date().toISOString() })
        .eq('id', op.gameId)
      if (res.error) throw Object.assign(new Error(res.error.message), { status: res.status })
      return
    }
  }
}

let flushing = false
let retryTimer: ReturnType<typeof setTimeout> | null = null

function backoffMs(attempts: number): number {
  return Math.min(1000 * 2 ** attempts, 60_000)
}

/** Re-entrant safe. Processes the outbox strictly in order and stops at the first failure. */
export async function flush(): Promise<{ sent: number; failed: number }> {
  const supabase = getSupabaseBrowserClient()
  if (!supabase) {
    await notifyStatus()
    return { sent: 0, failed: 0 }
  }
  if (flushing) return { sent: 0, failed: 0 }

  flushing = true
  let sent = 0
  let failed = 0

  try {
    for (;;) {
      const items = await peekAll()
      if (items.length === 0) break
      const item = items[0]

      try {
        await sendOp(supabase, item.op)
        await remove(item.id)
        sent++
      } catch (err) {
        const status = (err as { status?: number }).status
        let cls = classifyStatus(status)

        if (status === 401) {
          const refreshed = await supabase.auth.refreshSession()
          if (!refreshed.error) {
            cls = 'transient'
          }
        }

        if (cls === 'permanent') {
          const attempts = item.attempts + 1
          await fail(item.id, String(err))
          if (attempts >= 3) {
            const current = (await peekAll()).find((i) => i.id === item.id)
            if (current) await moveToDeadLetter(current)
          }
        } else {
          await fail(item.id, String(err))
          if (retryTimer) clearTimeout(retryTimer)
          retryTimer = setTimeout(() => {
            retryTimer = null
            flush()
          }, backoffMs(item.attempts + 1))
        }

        failed++
        lastPullFailed = cls === 'transient'
        break
      }
    }
  } finally {
    flushing = false
  }

  if (sent > 0) lastPullFailed = false
  await notifyStatus()
  return { sent, failed }
}

function kickFlush(): void {
  // Never await a flush inside an event handler.
  void flush()
}

// ---------------------------------------------------------------------------
// Reconnect loop
// ---------------------------------------------------------------------------

/** Called once from the app-group layout. Returns an unsubscribe. */
export function startSyncLoop(): () => void {
  if (typeof window === 'undefined') return () => {}

  const onOnline = () => kickFlush()
  const onVisibility = () => {
    if (document.visibilityState === 'visible') kickFlush()
  }

  window.addEventListener('online', onOnline)
  document.addEventListener('visibilitychange', onVisibility)

  const interval = setInterval(() => {
    if (navigator.onLine && document.visibilityState === 'visible') kickFlush()
  }, 30_000)

  const supabase = getSupabaseBrowserClient()
  let unsubscribeAuth: (() => void) | undefined
  if (supabase) {
    const { data } = supabase.auth.onAuthStateChange(
      (event: string, session: { access_token?: string } | null) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (session?.access_token) supabase.realtime.setAuth(session.access_token)
          kickFlush()
        }
      },
    )
    unsubscribeAuth = () => data.subscription.unsubscribe()
  }

  kickFlush()
  notifyStatus()

  return () => {
    window.removeEventListener('online', onOnline)
    document.removeEventListener('visibilitychange', onVisibility)
    clearInterval(interval)
    unsubscribeAuth?.()
    if (retryTimer) clearTimeout(retryTimer)
  }
}
