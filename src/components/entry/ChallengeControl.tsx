'use client'

import { useState } from 'react'

export interface ChallengeControlProps {
  value: number
  onChange: (next: number) => void
  disabled?: boolean
}

/**
 * Challenge adjustment. Losing a challenge is the only way a round ends below
 * zero, so entering a negative has to actually work.
 *
 * Two things this has to get right, both learned the hard way:
 *
 * 1. A controlled `type="number"` input reports an empty string while the user
 *    has typed only "-". Parsing that to 0 and writing it back wipes the minus
 *    before the digits arrive, so "-13" silently became 13. The sign flipped and
 *    the player was awarded points for a challenge they lost. Hence `type="text"`
 *    plus a draft string, so partial input survives until it parses.
 *
 * 2. `inputMode="numeric"` gives iOS a keypad with no minus key. Typing a
 *    negative is impossible on the target device, so the sign is a button.
 */
export default function ChallengeControl({ value, onChange, disabled }: ChallengeControlProps) {
  const [draft, setDraft] = useState<string | null>(null)
  const [lastValue, setLastValue] = useState(value)

  // Drop the draft when the value changes from elsewhere, such as the steppers,
  // the sign toggle, or a sync from another phone. Adjusted during render
  // rather than in an effect, so there is no discarded intermediate paint.
  if (value !== lastValue) {
    setLastValue(value)
    setDraft(null)
  }

  const shown = draft ?? String(value)
  const negative = value < 0

  function commitDraft(raw: string) {
    setDraft(raw)
    // "" and "-" are legitimate mid-typing states. Hold them in the draft and
    // do not propagate, rather than coercing them to 0.
    if (raw === '' || raw === '-') return
    const n = Number(raw)
    if (Number.isInteger(n)) onChange(n)
  }

  function blur() {
    if (draft === '' || draft === '-') onChange(0)
    setDraft(null)
  }

  return (
    <div aria-disabled={disabled} className={disabled ? 'opacity-50' : undefined}>
      <label htmlFor="challenge-adjustment" className="text-sm font-medium">
        Challenge adjustment
      </label>
      <p className="mt-1 text-sm text-muted">
        Subtract the value of the challenged word from whoever lost the challenge.
      </p>
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          aria-label="Decrease challenge adjustment"
          disabled={disabled}
          onClick={() => onChange(value - 1)}
          className="min-h-touch min-w-touch rounded-lg border border-control text-lg font-semibold"
        >
          &minus;
        </button>
        <input
          id="challenge-adjustment"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          disabled={disabled}
          value={shown}
          onChange={(e) => commitDraft(e.target.value.replace(/[^0-9-]/g, ''))}
          onBlur={blur}
          className="tabular min-h-touch w-20 rounded-lg border border-control bg-surface px-2 text-center"
        />
        <button
          type="button"
          aria-label="Increase challenge adjustment"
          disabled={disabled}
          onClick={() => onChange(value + 1)}
          className="min-h-touch min-w-touch rounded-lg border border-control text-lg font-semibold"
        >
          +
        </button>
        <button
          type="button"
          aria-pressed={negative}
          disabled={disabled || value === 0}
          onClick={() => onChange(-value)}
          className={`min-h-touch rounded-lg border px-3 text-sm font-medium ${
            negative
              ? 'border-danger bg-chip-double text-danger'
              : 'border-control bg-surface'
          }`}
        >
          {negative ? 'Lost challenge' : 'Won challenge'}
        </button>
      </div>
    </div>
  )
}
