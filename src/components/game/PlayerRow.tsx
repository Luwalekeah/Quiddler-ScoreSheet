'use client'

import { forwardRef } from 'react'
import type { PlayerRoundResult } from '@/lib/score'
import BonusChips from './BonusChips'

export interface PlayerRowProps {
  name: string
  result: PlayerRoundResult | undefined
  runningTotal: number
  expanded: boolean
  onToggle: () => void
}

/** Name, running total, round total, and the accordion expander. */
const PlayerRow = forwardRef<HTMLButtonElement, PlayerRowProps>(function PlayerRow(
  { name, result, runningTotal, expanded, onToggle },
  ref,
) {
  const total = result?.total ?? 0
  const hasEntries = Boolean(result) && (result!.wordPoints > 0 || result!.unusedPoints > 0 || result!.manual)

  return (
    <button
      ref={ref}
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      className="flex min-h-touch w-full items-center gap-3 border-b border-border bg-surface px-4 py-3 text-left"
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{name}</span>
        {!hasEntries ? (
          <span className="text-sm text-muted">Add words</span>
        ) : (
          <>
            <BonusChips result={result!} />
            {result?.manual ? (
              <span className="mt-1 inline-block rounded bg-chip px-1.5 py-0.5 text-xs">Typed</span>
            ) : null}
          </>
        )}
      </span>

      <span aria-live="polite" aria-atomic="true" className="tabular text-xl font-semibold">
        {total}
      </span>
      <span className="tabular text-sm text-muted">{runningTotal}</span>
      <span aria-hidden className="text-muted">
        {expanded ? '▲' : '▼'}
      </span>
    </button>
  )
})

export default PlayerRow
