'use client'

import { useEffect, useRef } from 'react'
import type { CardCode } from '@/lib/cards'
import type { PlayedWord, PlayerRoundEntry } from '@/lib/score'
import ChallengeControl from '../entry/ChallengeControl'
import ManualScoreToggle from '../entry/ManualScoreToggle'
import UnusedPicker from '../entry/UnusedPicker'
import WordInput from '../entry/WordInput'
import WordRow from '../entry/WordRow'

export interface EntrySheetProps {
  playerName: string
  roundNumber: number
  entry: PlayerRoundEntry
  onChange: (patch: PlayerRoundEntry) => void
}

/**
 * The expanded entry surface for one player. Focus order follows the order
 * of play: heading, word input, Add, each word row (chips then remove),
 * unused tally, unused grid, challenge, manual toggle.
 */
export default function EntrySheet({ playerName, roundNumber, entry, onChange }: EntrySheetProps) {
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  const manual = entry.manualScore !== undefined && entry.manualScore !== null

  function addWord(word: PlayedWord) {
    onChange({ ...entry, words: [...entry.words, word] })
  }

  function updateWordTokens(index: number, tokens: CardCode[]) {
    onChange({ ...entry, words: entry.words.map((w, i) => (i === index ? { ...w, tokens } : w)) })
  }

  function removeWord(index: number) {
    onChange({ ...entry, words: entry.words.filter((_, i) => i !== index) })
  }

  return (
    <div className="border-b border-border bg-surface-sunken px-4 py-4">
      <h2 ref={headingRef} tabIndex={-1} className="text-lg font-semibold outline-none">
        {playerName}
      </h2>

      <div className="mt-3">
        <WordInput onCommit={addWord} disabled={manual} />
      </div>

      {entry.words.length === 0 ? (
        <p className="mt-3 text-sm text-muted">No words yet.</p>
      ) : (
        // Turning the manual toggle back off restores these words exactly:
        // they are dimmed and inert, never unmounted or cleared.
        <ul
          inert={manual || undefined}
          className={`mt-2 divide-y divide-border ${manual ? 'opacity-50' : ''}`}
        >
          {entry.words.map((w, i) => (
            <WordRow
              key={i}
              word={w}
              onChangeTokens={(tokens) => updateWordTokens(i, tokens)}
              onRemove={() => removeWord(i)}
            />
          ))}
        </ul>
      )}

      <div className="mt-4">
        <UnusedPicker
          unused={entry.unused}
          roundNumber={roundNumber}
          disabled={manual}
          onChange={(unused) => onChange({ ...entry, unused })}
        />
      </div>

      <div className="mt-4">
        <ChallengeControl
          value={entry.challengeDelta ?? 0}
          onChange={(challengeDelta) => onChange({ ...entry, challengeDelta })}
        />
      </div>

      <div className="mt-4">
        <ManualScoreToggle
          value={entry.manualScore}
          onChange={(manualScore) => onChange({ ...entry, manualScore })}
        />
      </div>
    </div>
  )
}
