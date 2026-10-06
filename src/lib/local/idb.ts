/**
 * Typed IndexedDB wrappers, all through idb-keyval in a store named
 * `quiddler`. This is the offline data layer: every screen reads from here
 * first and the network is a background replication detail. See
 * .pipeline/spec.md section 3.
 */

import { createStore, del, get, keys, set } from 'idb-keyval'
import type { PlayerRoundEntry } from '../score'
import type { GamePlayerRow, GameRow, RoundRow } from '../db/rows'

const store = createStore('quiddler', 'quiddler')

/**
 * A PlayerRoundEntry plus the metadata sync needs. Superset by design so it
 * can be handed straight to computeRound with no unwrapping.
 */
export interface LocalEntry extends PlayerRoundEntry {
  gamePlayerId: string
  roundNumber: number
  /** ISO string from the editing device's clock. Drives last-write-wins. */
  updatedAt: string
  clientId: string
}

export interface LocalGame {
  game: GameRow
  players: GamePlayerRow[]
  rounds: RoundRow[]
  /** Key is `${roundNumber}:${gamePlayerId}`. */
  entries: Record<string, LocalEntry>
  /** ISO time of the last successful pull, or null if never synced. */
  serverSyncedAt: string | null
}

export const entryKey = (round: number, gamePlayerId: string): string =>
  `${round}:${gamePlayerId}`

const gameKey = (gameId: string): string => `game:${gameId}`
const GAME_INDEX_KEY = 'gameIndex'
const CLIENT_ID_KEY = 'clientId'

export async function loadGame(gameId: string): Promise<LocalGame | undefined> {
  return get<LocalGame>(gameKey(gameId), store)
}

async function readIndex(): Promise<string[]> {
  return (await get<string[]>(GAME_INDEX_KEY, store)) ?? []
}

async function writeIndex(ids: string[]): Promise<void> {
  await set(GAME_INDEX_KEY, ids, store)
}

export async function saveGame(g: LocalGame): Promise<void> {
  await set(gameKey(g.game.id), g, store)
  const index = await readIndex()
  const withoutThis = index.filter((id) => id !== g.game.id)
  await writeIndex([g.game.id, ...withoutThis])
}

export async function listGames(): Promise<LocalGame[]> {
  const index = await readIndex()
  const games = await Promise.all(index.map((id) => loadGame(id)))
  return games.filter((g): g is LocalGame => g !== undefined)
}

export async function deleteGame(gameId: string): Promise<void> {
  await del(gameKey(gameId), store)
  const index = await readIndex()
  await writeIndex(index.filter((id) => id !== gameId))
}

/** Stable per-device id. Generated once with crypto.randomUUID and persisted. */
export async function getClientId(): Promise<string> {
  const existing = await get<string>(CLIENT_ID_KEY, store)
  if (existing) return existing
  const id = crypto.randomUUID()
  await set(CLIENT_ID_KEY, id, store)
  return id
}

/** Exposed for the outbox and sync engine, which manage their own keys in the same store. */
export function quiddlerStore() {
  return store
}

/** Debug helper. Not called from any screen. */
export async function allKeys(): Promise<IDBValidKey[]> {
  return keys(store)
}
