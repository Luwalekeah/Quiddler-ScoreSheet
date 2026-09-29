import { computeRound, type BonusMode, type PlayerRoundEntry } from '@/lib/score'
import type { GamePlayerRow, RoundRow } from '@/lib/db/rows'
import { entryKey, type LocalEntry } from '@/lib/local/idb'

export interface RoundGridProps {
  rounds: RoundRow[]
  players: GamePlayerRow[]
  entries: Record<string, LocalEntry>
  bonusMode: BonusMode
}

/** 8 x N table, real markup with scoped headers. Horizontal scroll on mobile, round column sticky. */
export default function RoundGrid({ rounds, players, entries, bonusMode }: RoundGridProps) {
  const sortedRounds = [...rounds].sort((a, b) => a.round_number - b.round_number)
  const sortedPlayers = [...players].sort((a, b) => a.seat - b.seat)

  return (
    <div className="scroll-under-bottom-bar overflow-x-auto">
      <table className="w-full min-w-[420px] border-collapse text-sm">
        <thead>
          <tr>
            <th
              scope="col"
              className="sticky left-0 z-10 border-b border-border bg-surface px-2 py-2 text-left"
            >
              Round
            </th>
            {sortedPlayers.map((p) => (
              <th
                key={p.id}
                scope="col"
                className="border-b border-border px-2 py-2 text-right font-medium"
              >
                {p.display_name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedRounds.map((round) => {
            const entriesForRound: Record<string, PlayerRoundEntry> = {}
            for (const p of sortedPlayers) {
              entriesForRound[p.id] = entries[entryKey(round.round_number, p.id)] ?? {
                words: [],
                unused: [],
              }
            }
            const results = computeRound(entriesForRound, bonusMode)

            return (
              <tr key={round.id}>
                <th
                  scope="row"
                  className="sticky left-0 z-10 border-b border-border bg-surface px-2 py-2 text-left font-medium"
                >
                  {round.round_number}
                </th>
                {sortedPlayers.map((p) => {
                  const r = results[p.id]
                  return (
                    <td key={p.id} className="tabular border-b border-border px-2 py-2 text-right">
                      {r.total}
                      {r.manual ? (
                        <span className="ml-1 rounded bg-chip px-1 align-middle text-[0.65rem]">Typed</span>
                      ) : null}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
