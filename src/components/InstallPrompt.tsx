'use client'

import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/** Offers to add the app to the home screen. Dismissible, never blocks anything underneath it. */
export default function InstallPrompt() {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setEvent(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (!event || dismissed) return null

  return (
    <div className="flex items-center gap-3 border-b border-border bg-surface-sunken px-3 py-2 text-sm">
      <p className="flex-1">Add Quiddler ScoreSheet to your home screen for quick access.</p>
      <button
        type="button"
        className="min-h-touch rounded-lg bg-accent px-3 font-medium text-accent-contrast"
        onClick={async () => {
          await event.prompt()
          await event.userChoice
          setEvent(null)
        }}
      >
        Install
      </button>
      <button
        type="button"
        aria-label="Dismiss install prompt"
        className="min-h-touch min-w-touch"
        onClick={() => setDismissed(true)}
      >
        <span aria-hidden>&times;</span>
      </button>
    </div>
  )
}
