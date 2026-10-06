import type { GamePlayerRow } from '@/lib/db/rows'

export interface StandingsTableProps {
  players: GamePlayerRow[]
}

/** Rank, name, total, winner marker. Winner is a text badge, never colour-only. */
export default function StandingsTable({ players }: StandingsTableProps) {
  const sorted = [...players].sort((a, b) => (a.final_rank ?? 0) - (b.final_rank ?? 0))

  return (
    <table className="w-full border-collapse text-sm">
      <caption className="sr-only">Final standings</caption>
      <thead>
        <tr>
          <th scope="col" className="border-b border-border px-2 py-2 text-left">
            Rank
          </th>
          <th scope="col" className="border-b border-border px-2 py-2 text-left">
            Player
          </th>
          <th scope="col" className="border-b border-border px-2 py-2 text-right">
            Total
          </th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((p) => (
          <tr key={p.id}>
            <th scope="row" className="border-b border-border px-2 py-2 text-left font-medium">
              {p.final_rank}
            </th>
            <td className="border-b border-border px-2 py-2">
              {p.display_name}
              {p.is_winner ? (
                <span className="ml-2 rounded-full border border-chip-double-border bg-chip-double px-2 py-0.5 text-xs font-medium">
                  Winner
                </span>
              ) : null}
            </td>
            <td className="tabular border-b border-border px-2 py-2 text-right font-semibold">
              {p.final_total}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
