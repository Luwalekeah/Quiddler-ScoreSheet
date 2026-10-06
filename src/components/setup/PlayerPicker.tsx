'use client'

import { useEffect, useState } from 'react'
import { getSupabaseBrowserClient } from '@/lib/db/supabase'

export interface SetupPlayer {
  key: string
  displayName: string
  userId: string | null
}

export interface PlayerPickerProps {
  players: SetupPlayer[]
  onChange: (players: SetupPlayer[]) => void
}

interface Account {
  user_id: string
  display_name: string
}

/**
 * Accounts plus guests, seat order. Up and down buttons are the accessible
 * primary control for reordering; there is no drag-only path (WCAG 2.2 SC
 * 2.5.7).
 */
export default function PlayerPicker({ players, onChange }: PlayerPickerProps) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [guestName, setGuestName] = useState('')

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    if (!supabase) return
    supabase
      .from('profiles')
      .select('user_id, display_name')
      .then((result: { data: Account[] | null }) => {
        if (result.data) setAccounts(result.data)
      })
  }, [])

  const seatedUserIds = new Set(players.map((p) => p.userId).filter((id): id is string => id !== null))

  function addAccount(account: Account) {
    if (players.length >= 8 || seatedUserIds.has(account.user_id)) return
    onChange([...players, { key: crypto.randomUUID(), displayName: account.display_name, userId: account.user_id }])
  }

  function addGuest() {
    const name = guestName.trim()
    if (!name || players.length >= 8) return
    onChange([...players, { key: crypto.randomUUID(), displayName: name, userId: null }])
    setGuestName('')
  }

  function remove(key: string) {
    onChange(players.filter((p) => p.key !== key))
  }

  function move(index: number, delta: number) {
    const target = index + delta
    if (target < 0 || target >= players.length) return
    const next = [...players]
    const [item] = next.splice(index, 1)
    next.splice(target, 0, item)
    onChange(next)
  }

  return (
    <div className="flex flex-col gap-4">
      {accounts.length > 0 ? (
        <div>
          <p className="mb-2 text-sm font-medium">Known accounts</p>
          <div className="flex flex-wrap gap-2">
            {accounts.map((a) => (
              <button
                key={a.user_id}
                type="button"
                disabled={seatedUserIds.has(a.user_id) || players.length >= 8}
                onClick={() => addAccount(a)}
                className="min-h-touch rounded-full border border-chip-border bg-chip px-4 text-sm font-medium disabled:opacity-50"
              >
                {a.display_name}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div>
        <p className="mb-2 text-sm font-medium">Add a guest</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addGuest()
              }
            }}
            placeholder="Guest name"
            className="min-h-touch flex-1 rounded-lg border border-control bg-surface px-4"
          />
          <button
            type="button"
            onClick={addGuest}
            disabled={players.length >= 8}
            className="min-h-touch min-w-touch rounded-lg bg-accent px-4 font-medium text-accent-contrast disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">Seat order ({players.length} of 8)</p>
        {players.length === 0 ? (
          <p className="text-sm text-muted">Add at least two players.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {players.map((p, i) => (
              <li
                key={p.key}
                className="flex items-center gap-2 rounded-lg border border-control bg-surface px-3 py-2"
              >
                <span className="flex-1 truncate font-medium">{p.displayName}</span>
                {p.userId === null ? (
                  <span className="rounded-full bg-chip px-2 py-0.5 text-xs text-muted">Guest</span>
                ) : null}
                <button
                  type="button"
                  aria-label={`Move ${p.displayName} up`}
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                  className="min-h-touch min-w-touch disabled:opacity-30"
                >
                  <span aria-hidden>&uarr;</span>
                </button>
                <button
                  type="button"
                  aria-label={`Move ${p.displayName} down`}
                  disabled={i === players.length - 1}
                  onClick={() => move(i, 1)}
                  className="min-h-touch min-w-touch disabled:opacity-30"
                >
                  <span aria-hidden>&darr;</span>
                </button>
                <button
                  type="button"
                  aria-label={`Remove ${p.displayName}`}
                  onClick={() => remove(p.key)}
                  className="min-h-touch min-w-touch text-danger"
                >
                  <span aria-hidden>&times;</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
