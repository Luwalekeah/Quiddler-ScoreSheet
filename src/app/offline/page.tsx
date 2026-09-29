export default function OfflinePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <h1 className="text-xl font-semibold">You are offline</h1>
      <p className="max-w-sm text-muted">
        Open a game you have already opened on this phone and keep scoring.
        Everything saves here and syncs when you are back.
      </p>
    </main>
  )
}
