import { describe, expect, it } from 'vitest'
import { mergeEntry } from './engine'
import type { LocalEntry } from '../local/idb'

function entry(overrides: Partial<LocalEntry>): LocalEntry {
  return {
    words: [],
    unused: [],
    gamePlayerId: 'player-1',
    roundNumber: 1,
    updatedAt: '2026-01-01T00:00:00.000Z',
    clientId: 'device-a',
    ...overrides,
  }
}

describe('mergeEntry', () => {
  it('takes remote when there is no local entry', () => {
    const remote = entry({ clientId: 'device-b' })
    expect(mergeEntry(undefined, remote)).toBe(remote)
  })

  it('takes remote when remote.updatedAt is newer', () => {
    const local = entry({ updatedAt: '2026-01-01T00:00:00.000Z' })
    const remote = entry({ updatedAt: '2026-01-01T00:00:01.000Z' })
    expect(mergeEntry(local, remote)).toBe(remote)
  })

  it('keeps local when remote.updatedAt is older', () => {
    const local = entry({ updatedAt: '2026-01-01T00:00:01.000Z' })
    const remote = entry({ updatedAt: '2026-01-01T00:00:00.000Z' })
    expect(mergeEntry(local, remote)).toBe(local)
  })

  it('on equal timestamps, takes the lexicographically greater clientId', () => {
    const ts = '2026-01-01T00:00:00.000Z'
    const local = entry({ updatedAt: ts, clientId: 'aaa' })
    const remote = entry({ updatedAt: ts, clientId: 'zzz' })
    expect(mergeEntry(local, remote)).toBe(remote)
  })

  it('on equal timestamps, keeps local when local clientId is lexicographically greater', () => {
    const ts = '2026-01-01T00:00:00.000Z'
    const local = entry({ updatedAt: ts, clientId: 'zzz' })
    const remote = entry({ updatedAt: ts, clientId: 'aaa' })
    expect(mergeEntry(local, remote)).toBe(local)
  })

  it('on equal timestamps and equal clientId, keeps local (neither is strictly greater)', () => {
    const ts = '2026-01-01T00:00:00.000Z'
    const local = entry({ updatedAt: ts, clientId: 'device-a' })
    const remote = entry({ updatedAt: ts, clientId: 'device-a' })
    expect(mergeEntry(local, remote)).toBe(local)
  })
})
