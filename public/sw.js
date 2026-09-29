// Quiddler ScoreSheet service worker.
// Hand-written on purpose: the caching this app needs is under 40 lines.
// Bump CACHE_VERSION on every deploy that changes the app shell.

const CACHE_VERSION = 'quiddler-v1'
const PRECACHE_URLS = [
  '/',
  '/games',
  '/offline',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/maskable-192.png',
  '/icons/maskable-512.png',
]

/**
 * Cache a response and hand the original back.
 *
 * The clone must happen synchronously, before the response is returned. Doing
 * it inside the caches.open() callback clones a body the browser has already
 * started consuming, which throws "Response body is already used" and rejects
 * unobserved. Caching then fails silently, which matters most in the case this
 * app exists for: a weak signal at the table.
 */
function cachePut(request, response) {
  const copy = response.clone()
  caches
    .open(CACHE_VERSION)
    .then((cache) => cache.put(request, copy))
    .catch(() => {
      // A full or evicted cache must never break the response.
    })
  return response
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(names.filter((name) => name !== CACHE_VERSION).map((name) => caches.delete(name))),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  // Critical rule: never intercept or cache a cross-origin request.
  // Supabase must never be served from this cache. IndexedDB is the
  // offline data layer; a cached API response would serve stale scores
  // that silently disagree with local state.
  if (new URL(request.url).origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(
      Promise.race([
        fetch(request),
        new Promise((_, reject) => setTimeout(reject, 3000)),
      ])
        .then((response) => {
          return cachePut(request, response)
        })
        .catch(
          () =>
            caches.match(request).then((cached) => cached || caches.match('/offline')),
        ),
    )
    return
  }

  const isStaticAsset =
    request.url.includes('/_next/static/') || request.url.includes('/icons/')

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            return cachePut(request, response)
          }),
      ),
    )
    return
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        return cachePut(request, response)
      })
      .catch(() => caches.match(request)),
  )
})
