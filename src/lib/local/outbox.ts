/**
 * Durable operation queue. Every mutation is written here after it lands in
 * IndexedDB and before any network call is attempted, so a killed tab or a
 * dropped connection never loses an edit. See .pipeline/spec.md section 3.
 */

import { get, set } from 'idb-keyval'
import type { GameStanding } from '../score'
import type { GamePlayerRow, GameRow, RoundRow } from '../db/rows'
import type { LocalEntry } from './idb'
import { quiddlerStore } from './idb'

export type Op =
  | { kind: 'createGame'; game: GameRow; players: GamePlayerRow[]; rounds: RoundRow[] }
  | { kind: 'addPlayer'; gameId: string; player: GamePlayerRow }
  | { kind: 'upsertEntry'; gameId: string; roundId: string; entry: LocalEntry }
  | { kind: 'finishGame'; gameId: string; finishedAt: string; standings: GameStanding[] }
  | { kind: 'reopenGame'; gameId: string }

export interface OutboxItem {
  id: string
  op: Op
  queuedAt: string
  attempts: number
  lastError?: string
}

const OUTBOX_KEY = 'outbox'
const DEAD_LETTER_KEY = 'deadLetter'

async function readOutbox(): Promise<OutboxItem[]> {
  return (await get<OutboxItem[]>(OUTBOX_KEY, quiddlerStore())) ?? []
}

async function writeOutbox(items: OutboxItem[]): Promise<void> {
  await set(OUTBOX_KEY, items, quiddlerStore())
}

function coalesceKey(gameId: string, roundId: string, gamePlayerId: string): string {
  return `${gameId}:${roundId}:${gamePlayerId}`
}

/**
 * Queues an operation. `upsertEntry` ops coalesce: any queued upsertEntry
 * for the same (gameId, roundId, entry.gamePlayerId) is dropped before the
 * new one is appended, so typing a five-letter word does not queue five
 * round trips. `createGame`, `addPlayer`, and `finishGame` never coalesce.
 */
export async function enqueue(op: Op): Promise<void> {
  const items = await readOutbox()

  let next = items
  if (op.kind === 'upsertEntry') {
    const key = coalesceKey(op.gameId, op.roundId, op.entry.gamePlayerId)
    next = items.filter(
      (item) =>
        !(
          item.op.kind === 'upsertEntry' &&
          coalesceKey(item.op.gameId, item.op.roundId, item.op.entry.gamePlayerId) === key
        ),
    )
  }

  const item: OutboxItem = {
    id: crypto.randomUUID(),
    op,
    queuedAt: new Date().toISOString(),
    attempts: 0,
  }

  await writeOutbox([...next, item])
}

export async function peekAll(): Promise<OutboxItem[]> {
  return readOutbox()
}

export async function remove(id: string): Promise<void> {
  const items = await readOutbox()
  await writeOutbox(items.filter((item) => item.id !== id))
}

export async function fail(id: string, error: string): Promise<void> {
  const items = await readOutbox()
  await writeOutbox(
    items.map((item) =>
      item.id === id ? { ...item, attempts: item.attempts + 1, lastError: error } : item,
    ),
  )
}

export async function pendingCount(): Promise<number> {
  return (await readOutbox()).length
}

// Dead letter queue -----------------------------------------------------
// Permanent failures (401 after refresh, 403, 409, 422) land here after 3
// attempts. They are removed from the outbox so they stop blocking it.
// Local data stays intact and correct; only replication has stopped.

async function readDeadLetter(): Promise<OutboxItem[]> {
  return (await get<OutboxItem[]>(DEAD_LETTER_KEY, quiddlerStore())) ?? []
}

async function writeDeadLetter(items: OutboxItem[]): Promise<void> {
  await set(DEAD_LETTER_KEY, items, quiddlerStore())
}

export async function moveToDeadLetter(item: OutboxItem): Promise<void> {
  await remove(item.id)
  const dead = await readDeadLetter()
  await writeDeadLetter([...dead, item])
}

export async function peekDeadLetter(): Promise<OutboxItem[]> {
  return readDeadLetter()
}

export async function deadLetterCount(): Promise<number> {
  return (await readDeadLetter()).length
}

/** Retry action from the sync sheet: moves every dead-lettered item back onto the outbox. */
export async function requeueDeadLetter(): Promise<void> {
  const dead = await readDeadLetter()
  if (dead.length === 0) return
  const items = await readOutbox()
  await writeOutbox([...items, ...dead.map((item) => ({ ...item, attempts: 0, lastError: undefined }))])
  await writeDeadLetter([])
}
