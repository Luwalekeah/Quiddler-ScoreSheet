'use client'

import { useState } from 'react'
import { getClockSkewWarning, retryDeadLetter, type SyncStatus } from '@/lib/sync/engine'

const LABELS: Record<SyncStatus, string> = {
  synced: 'Saved',
  pending: 'Saving',
  offline: 'Saved on this phone',
  error: 'Sync problem',
}

const DOT_CLASS: Record<SyncStatus, string> = {
  synced: 'bg-sync-synced',
  pending: 'bg-sync-pending',
  offline: 'bg-sync-offline',
  error: 'bg-sync-error',
}

export interface SyncBadgeProps {
  status: SyncStatus
  pending: number
}

export default function SyncBadge({ status, pending }: SyncBadgeProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        type="button"
        aria-live="polite"
        aria-label={`Sync status: ${LABELS[status]}`}
        onClick={() => setOpen((v) => !v)}
        className="min-h-touch inline-flex items-center gap-2 rounded-full border border-control bg-surface px-3 text-sm font-medium"
      >
        <span aria-hidden className={`h-2.5 w-2.5 rounded-full ${DOT_CLASS[status]}`} />
        <span>
          {LABELS[status]}
          {status === 'pending' && pending > 0 ? ` (${pending})` : ''}
        </span>
      </button>

      {open ? <SyncDetails status={status} onClose={() => setOpen(false)} /> : null}
    </div>
  )
}

function SyncDetails({ status, onClose }: { status: SyncStatus; onClose: () => void }) {
  const [retrying, setRetrying] = useState(false)
  const skew = getClockSkewWarning()

  async function handleRetry() {
    setRetrying(true)
    await retryDeadLetter()
    setRetrying(false)
    onClose()
  }

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Sync details"
      className="absolute right-0 top-[calc(100%+0.5rem)] z-20 w-72 max-w-[85vw] rounded-xl border border-control bg-surface p-4 shadow-lg"
    >
      <p className="font-medium">{LABELS[status]}</p>

      {status === 'offline' ? (
        <p className="mt-2 text-sm text-muted">
          Your scores are saved on this phone. They will sync when you are back online.
        </p>
      ) : null}

      {status === 'error' ? (
        <>
          <p className="mt-2 text-sm text-muted">
            Some scores could not sync. They are still saved on this phone.
          </p>
          <button
            type="button"
            onClick={handleRetry}
            disabled={retrying}
            className="min-h-touch mt-3 w-full rounded-lg bg-accent font-medium text-accent-contrast disabled:opacity-60"
          >
            {retrying ? 'Retrying...' : 'Retry'}
          </button>
        </>
      ) : null}

      {skew ? (
        <p className="mt-2 text-sm text-warning">
          This phone&apos;s clock looks off. Scores from it may sync out of order.
        </p>
      ) : null}

      <button
        type="button"
        onClick={onClose}
        className="min-h-touch mt-3 w-full rounded-lg border border-control font-medium"
      >
        Close
      </button>
    </div>
  )
}
