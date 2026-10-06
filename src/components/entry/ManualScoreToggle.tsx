'use client'

export interface ManualScoreToggleProps {
  value: number | null | undefined
  onChange: (next: number | null) => void
}

/**
 * Off: manualScore is null, words and unused cards drive the score. On:
 * manualScore holds the typed number. Turning the toggle back off must not
 * discard the word list; the caller keeps entry.words untouched either way.
 */
export default function ManualScoreToggle({ value, onChange }: ManualScoreToggleProps) {
  const manual = value !== undefined && value !== null

  return (
    <div>
      <label className="flex min-h-touch items-center gap-3">
        <input
          type="checkbox"
          checked={manual}
          onChange={(e) => onChange(e.target.checked ? 0 : null)}
          className="h-5 w-5"
        />
        <span className="font-medium">Enter a total instead</span>
      </label>

      {manual ? (
        <input
          type="number"
          inputMode="numeric"
          aria-label="Typed round total"
          value={value ?? 0}
          onChange={(e) => {
            const n = Number(e.target.value)
            onChange(Number.isFinite(n) ? n : 0)
          }}
          className="tabular min-h-touch mt-2 w-28 rounded-lg border border-control bg-surface px-3"
        />
      ) : null}
    </div>
  )
}
