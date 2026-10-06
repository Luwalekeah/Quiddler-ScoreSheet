/**
 * Realtime channel lifecycle. An optimisation, not a correctness
 * requirement: if the channel never connects the app stays fully usable
 * and pull() on focus keeps phones converging. Nothing gates the UI on
 * channel state.
 */

import { getSupabaseBrowserClient } from '../db/supabase'
import { getClientId } from '../local/idb'

export type RealtimeTable = 'games' | 'game_players' | 'rounds' | 'round_entries'

export function subscribeGame(
  gameId: string,
  onChange: (table: RealtimeTable, row: unknown) => void,
): () => void {
  const supabase = getSupabaseBrowserClient()
  if (!supabase) return () => {}

  const channel = supabase.channel(`game:${gameId}`)

  let ownClientId: string | null = null
  getClientId().then((id) => {
    ownClientId = id
  })

  const forward =
    (table: RealtimeTable) =>
    (payload: { new: Record<string, unknown>; old: Record<string, unknown> }) => {
      const row = payload.new ?? payload.old
      // Ignore the echo of our own write: same device, same timestamp.
      if (
        table === 'round_entries' &&
        row &&
        typeof row === 'object' &&
        'client_id' in row &&
        (row as { client_id?: string }).client_id === ownClientId
      ) {
        return
      }
      onChange(table, row)
    }

  channel
    .on(
      'postgres_changes',
      { event: '*', schema: 'quiddler', table: 'round_entries', filter: `game_id=eq.${gameId}` },
      forward('round_entries'),
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'quiddler', table: 'rounds', filter: `game_id=eq.${gameId}` },
      forward('rounds'),
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'quiddler', table: 'game_players', filter: `game_id=eq.${gameId}` },
      forward('game_players'),
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'quiddler', table: 'games', filter: `id=eq.${gameId}` },
      forward('games'),
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
