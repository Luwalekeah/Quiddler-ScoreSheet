'use client'

import { useRouter } from 'next/navigation'
import SyncBadge from './SyncBadge'
import type { SyncStatus } from '@/lib/sync/engine'

export interface AppHeaderProps {
  title: string
  showBack?: boolean
  syncStatus?: SyncStatus
  pendingCount?: number
}

export default function AppHeader({ title, showBack, syncStatus, pendingCount }: AppHeaderProps) {
  const router = useRouter()

  return (
    <header className="sticky top-0 z-10 flex min-h-touch items-center gap-2 border-b border-border bg-surface px-3 py-2">
      {showBack ? (
        <button
          type="button"
          aria-label="Back"
          onClick={() => router.back()}
          className="min-h-touch min-w-touch flex items-center justify-center rounded-lg"
        >
          <span aria-hidden>&larr;</span>
        </button>
      ) : null}

      <h1 className="flex-1 truncate text-lg font-semibold">{title}</h1>

      {syncStatus ? <SyncBadge status={syncStatus} pending={pendingCount ?? 0} /> : null}
    </header>
  )
}
