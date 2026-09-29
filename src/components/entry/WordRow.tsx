'use client'

import { cardPoints, type CardCode } from '@/lib/cards'
import { scoreTokens, type PlayedWord } from '@/lib/score'
import { canMergeAt, canSplitAt, mergeAt, splitAt } from '@/lib/tokens'
import CardChip from './CardChip'

export interface WordRowProps {
  word: PlayedWord
  onChangeTokens: (tokens: CardCode[]) => void
  onRemove: () => void
}

/** One committed word: its chips, its points and letters, and a remove control. */
export default function WordRow({ word, onChangeTokens, onRemove }: WordRowProps) {
  const { points, letters } = scoreTokens(word.tokens)

  return (
    <li className="flex items-center gap-2 py-2">
      <div className="flex flex-1 flex-wrap items-center gap-0.5">
        {word.tokens.map((token, i) => {
          const next = word.tokens[i + 1]
          const mergeable = canMergeAt(word.tokens, i)
          return (
            <span key={i} className="flex items-center">
              <CardChip
                code={token}
                onSplit={canSplitAt(word.tokens, i) ? () => onChangeTokens(splitAt(word.tokens, i)) : undefined}
              />
              {mergeable ? (
                <button
                  type="button"
                  aria-label={`Combine ${token} and ${next} into the ${token} ${next} card, ${cardPoints(
                    (token + next) as CardCode,
                  )} points`}
                  onClick={() => onChangeTokens(mergeAt(word.tokens, i))}
                  className="min-h-touch min-w-touch flex items-center justify-center"
                >
                  <span
                    aria-hidden
                    className="flex h-5 w-5 items-center justify-center rounded-full border border-control bg-surface text-xs"
                  >
                    +
                  </span>
                </button>
              ) : null}
            </span>
          )
        })}
      </div>

      <div className="flex flex-col items-end text-right leading-tight">
        <span className="tabular text-lg font-semibold">{points}</span>
        <span className="text-xs text-muted">{letters} letters</span>
      </div>

      <button
        type="button"
        aria-label={`Remove ${word.word}`}
        onClick={onRemove}
        className="min-h-touch min-w-touch flex items-center justify-center text-danger"
      >
        <span aria-hidden className="text-lg">
          &times;
        </span>
      </button>
    </li>
  )
}
