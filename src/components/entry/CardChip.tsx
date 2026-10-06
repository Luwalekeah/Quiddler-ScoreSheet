'use client'

import { cardPoints, isDoubleCard, type CardCode } from '@/lib/cards'

export interface CardChipProps {
  code: CardCode
  /** Split affordance. Omit to render a plain, non-interactive chip. */
  onSplit?: () => void
}

/**
 * One card. Doubles are tappable to split, with a dashed divider showing
 * the affordance before the tap. Minimum 44x44 CSS px, achieved with
 * padding around a compact glyph, never by shrinking the hit area.
 */
export default function CardChip({ code, onSplit }: CardChipProps) {
  const points = cardPoints(code)
  const double = isDoubleCard(code)

  const content = (
    <>
      <span className="text-base font-semibold leading-none">{code}</span>
      <span className="text-[0.65rem] leading-none text-muted">{points}</span>
      {double ? (
        <span
          aria-hidden
          className="absolute left-1/2 top-1 bottom-1 w-px -translate-x-1/2 border-l border-dashed border-chip-double-border"
        />
      ) : null}
    </>
  )

  const baseClass = `relative min-h-touch min-w-touch flex flex-col items-center justify-center gap-0.5 rounded-lg border px-2 ${
    double ? 'bg-chip-double border-chip-double-border' : 'bg-chip border-chip-border'
  }`

  if (!double || !onSplit) {
    return <span className={baseClass}>{content}</span>
  }

  return (
    <button
      type="button"
      onClick={onSplit}
      aria-label={`Split the ${code.split('').join(' ')} card, ${points} points, into ${code[0]} and ${code[1]}`}
      className={baseClass}
    >
      {content}
    </button>
  )
}
