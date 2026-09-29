'use client'

import { useRef, useState } from 'react'
import { defaultTokenization, normalizeWord } from '@/lib/score'
import type { PlayedWord } from '@/lib/score'

export interface WordInputProps {
  onCommit: (word: PlayedWord) => void
  disabled?: boolean
}

/** A single text field plus Add. Committing returns focus to the field, a loop that never needs a second hand. */
export default function WordInput({ onCommit, disabled }: WordInputProps) {
  const [raw, setRaw] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function commit() {
    const word = normalizeWord(raw)
    if (word.length === 0) {
      setRaw('')
      return
    }
    onCommit({ word, tokens: defaultTokenization(word) })
    setRaw('')
    inputRef.current?.focus()
  }

  return (
    <div className="flex gap-2">
      <input
        ref={inputRef}
        type="text"
        inputMode="text"
        autoCapitalize="characters"
        autoCorrect="off"
        autoComplete="off"
        spellCheck={false}
        enterKeyHint="done"
        disabled={disabled}
        aria-disabled={disabled}
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            commit()
          }
        }}
        placeholder="Type a word"
        className="min-h-touch flex-1 rounded-lg border border-control bg-surface px-4 disabled:opacity-50"
      />
      <button
        type="button"
        onClick={commit}
        disabled={disabled}
        className="min-h-touch min-w-touch rounded-lg bg-accent px-4 font-medium text-accent-contrast disabled:opacity-50"
      >
        Add
      </button>
    </div>
  )
}
