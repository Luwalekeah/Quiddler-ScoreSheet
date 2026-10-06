'use client'

import { CARDS, cardPoints, type CardCode } from '@/lib/cards'
import { cardsDealtInRound } from '@/lib/score'

export interface UnusedPickerProps {
  unused: CardCode[]
  roundNumber: number
  onChange: (next: CardCode[]) => void
  disabled?: boolean
}

const ALL_CODES = Object.keys(CARDS) as CardCode[]

/** Grid of all 31 card codes. Tap adds one to the unused pile; tapping a tally chip removes one. */
export default function UnusedPicker({ unused, roundNumber, onChange, disabled }: UnusedPickerProps) {
  const dealt = cardsDealtInRound(roundNumber)
  const counts = new Map<CardCode, number>()
  for (const code of unused) counts.set(code, (counts.get(code) ?? 0) + 1)

  function add(code: CardCode) {
    if (disabled) return
    onChange([...unused, code])
  }

  function removeOne(code: CardCode) {
    if (disabled) return
    const index = unused.indexOf(code)
    if (index === -1) return
    onChange([...unused.slice(0, index), ...unused.slice(index + 1)])
  }

  return (
    <div aria-disabled={disabled} className={disabled ? 'opacity-50' : undefined}>
      <p className="text-sm text-muted">
        You have {unused.length} {unused.length === 1 ? 'card' : 'cards'}. Round {roundNumber} deals {dealt}.
      </p>

      {counts.size > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-2">
          {[...counts.entries()].map(([code, count]) => (
            <li key={code}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => removeOne(code)}
                aria-label={`Remove one ${code} card from unused, currently ${count}`}
                className="min-h-touch flex items-center gap-1 rounded-full border border-chip-border bg-chip px-3 text-sm font-medium"
              >
                <span>{code}</span>
                <span className="text-muted">&times;{count}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-3 grid grid-cols-6 gap-1.5 sm:grid-cols-8">
        {ALL_CODES.map((code) => (
          <button
            key={code}
            type="button"
            disabled={disabled}
            onClick={() => add(code)}
            aria-label={`Add one ${code} card to unused, ${cardPoints(code)} points`}
            className="min-h-touch min-w-touch flex flex-col items-center justify-center rounded-lg border border-control bg-surface"
          >
            <span className="text-sm font-semibold leading-none">{code}</span>
            <span className="text-[0.65rem] leading-none text-muted">{cardPoints(code)}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
