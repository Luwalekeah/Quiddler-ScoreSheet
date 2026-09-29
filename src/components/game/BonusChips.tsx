import type { PlayerRoundResult } from '@/lib/score'

export interface BonusChipsProps {
  result: Pick<PlayerRoundResult, 'wonMostWords' | 'wonLongestWord'>
}

/** Never colour-only: both bonus chips carry text, and a tie shows neither, which is correct. */
export default function BonusChips({ result }: BonusChipsProps) {
  if (!result.wonMostWords && !result.wonLongestWord) return null

  return (
    <div className="flex flex-wrap gap-1.5">
      {result.wonMostWords ? (
        <span className="rounded-full bg-chip-double border border-chip-double-border px-2 py-0.5 text-xs font-medium">
          Most words +10
        </span>
      ) : null}
      {result.wonLongestWord ? (
        <span className="rounded-full bg-chip-double border border-chip-double-border px-2 py-0.5 text-xs font-medium">
          Longest word +10
        </span>
      ) : null}
    </div>
  )
}
