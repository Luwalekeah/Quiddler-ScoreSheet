'use client'

import { cardsDealtInRound, TOTAL_ROUNDS } from '@/lib/score'

export interface RoundNavProps {
  currentRound: number
  onSelect: (round: number) => void
}

/** Round N of 8, "Deal N cards", and a strip of round buttons to jump between them. */
export default function RoundNav({ currentRound, onSelect }: RoundNavProps) {
  return (
    <div className="border-b border-border bg-surface px-3 py-2">
      <div className="flex items-baseline justify-between">
        <p className="font-medium">
          Round {currentRound} of {TOTAL_ROUNDS}
        </p>
        <p className="text-sm text-muted">Deal {cardsDealtInRound(currentRound)} cards</p>
      </div>

      <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
        {Array.from({ length: TOTAL_ROUNDS }, (_, i) => i + 1).map((round) => (
          <button
            key={round}
            type="button"
            aria-current={round === currentRound ? 'true' : undefined}
            onClick={() => onSelect(round)}
            className={`min-h-touch min-w-touch shrink-0 rounded-lg border px-3 text-sm font-medium ${
              round === currentRound
                ? 'border-accent bg-accent text-accent-contrast'
                : 'border-control bg-surface'
            }`}
          >
            {round}
          </button>
        ))}
      </div>
    </div>
  )
}
