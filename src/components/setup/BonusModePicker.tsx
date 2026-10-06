'use client'

import type { BonusMode } from '@/lib/score'

export interface BonusModePickerProps {
  playerCount: number
  value: BonusMode
  onChange: (mode: BonusMode) => void
}

/**
 * Defaults from defaultBonusMode(playerCount). With two players the rules
 * use only one bonus, decided before the game, so the picker narrows to a
 * choice between the two single bonuses. With more players both are always
 * in play.
 */
export default function BonusModePicker({ playerCount, value, onChange }: BonusModePickerProps) {
  if (playerCount === 2) {
    return (
      <div>
        <p className="mb-1 text-sm font-medium">Bonus for this game</p>
        <p className="mb-2 text-sm text-muted">With two players the rules use one bonus only.</p>
        <div className="flex gap-2">
          <button
            type="button"
            aria-pressed={value === 'mostWords'}
            onClick={() => onChange('mostWords')}
            className={`min-h-touch flex-1 rounded-lg border px-3 font-medium ${
              value === 'mostWords'
                ? 'border-accent bg-accent text-accent-contrast'
                : 'border-control bg-surface'
            }`}
          >
            Most words
          </button>
          <button
            type="button"
            aria-pressed={value === 'longestWord'}
            onClick={() => onChange('longestWord')}
            className={`min-h-touch flex-1 rounded-lg border px-3 font-medium ${
              value === 'longestWord'
                ? 'border-accent bg-accent text-accent-contrast'
                : 'border-control bg-surface'
            }`}
          >
            Longest word
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <p className="mb-1 text-sm font-medium">Bonuses for this game</p>
      <p className="text-sm text-muted">
        Both bonuses are in play: most words and longest word, 10 points each.
      </p>
    </div>
  )
}
