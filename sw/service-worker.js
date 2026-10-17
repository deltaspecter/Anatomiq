/* Anatomiq – Service Worker
 *
 * Wird beim Build (vite.config.ts → serviceWorkerPlugin) nach dist/sw.js geschrieben;
 * Platzhalter für Version und Dateiliste werden dabei ersetzt.
 *
 * Caches:
 *   anatomiq-shell-<VERSION>  App-Hülle, Schrift, Icons und die Standard-Ebenen des Modells (vorab gespeichert)
 *   anatomiq-models           Bei Bedarf geladene Modell-Ebenen (z. B. Muskeln), nach dem ersten Laden offline verfügbar
 *
 * Strategien:
 *   Seitenaufrufe                  Netz zuerst (max. 4 s), sonst gespeicherte App-Hülle
 *   Modelldateien (/models/*.glb)  Speicher zuerst; die URL trägt einen Inhalts-Hash (?v=…), daher nie veraltet
 *   Übrige eigene Dateien          Speicher zuerst (Dateinamen mit Hash), sonst Netz
 *
 * Updates: Ein neuer Service Worker wartet, bis die App „Aktualisieren“ meldet (SKIP_WAITING).
 * Alte Versionen der App-Hülle werden beim Aktivieren gelöscht.
 */
const VERSION = '__VERSION__'
const PRECACHE = __PRECACHE__
const SHELL = `anatomiq-shell-${VERSION}`
const MODELS = 'anatomiq-models'
const NETWORK_TIMEOUT_MS = 4000

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL).then((cache) => cache.addAll(PRECACHE)))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.filter((k) => k.startsWith('anatomiq-shell-') && k !== SHELL).map((k) => caches.delete(k)))
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting()
  if (event.data === 'VERSION') event.source?.postMessage({ type: 'VERSION', version: VERSION })
})

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      },
    )
  })
}

async function networkFirst(request, fallbackUrl) {
  const shell = await caches.open(SHELL)
  try {
    const response = await withTimeout(fetch(request, { cache: 'no-cache' }), NETWORK_TIMEOUT_MS)
    if (response.ok) return response
    throw new Error(`HTTP ${response.status}`)
  } catch {
    const cached = (await shell.match(fallbackUrl ?? request, { ignoreVary: true })) ?? (await caches.match(fallbackUrl ?? request, { ignoreVary: true }))
    return cached ?? Response.error()
  }
}

/** Modelle: Vorab-Cache (ohne Query) oder Laufzeit-Cache (mit Hash-Query); alte Fassungen derselben Datei werden ersetzt */
async function modelFirst(request) {
  const url = new URL(request.url)
  const shell = await caches.open(SHELL)
  const runtime = await caches.open(MODELS)
  const exact = (await runtime.match(request)) ?? null
  if (exact) return exact
  // Vorab gespeicherte Datei gehört zu dieser App-Version und damit zum selben Hash
  const pre = await shell.match(url.pathname)
  if (pre) return pre
  const response = await fetch(request)
  if (response.ok) {
    for (const key of await runtime.keys()) if (new URL(key.url).pathname === url.pathname) await runtime.delete(key)
    await runtime.put(request, response.clone())
  }
  return response
}

async function cacheFirst(request) {
  const cached = await caches.match(request, { ignoreVary: true })
  if (cached) return cached
  return fetch(request)
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname === '/sw.js') return

  if (request.mode === 'navigate') event.respondWith(networkFirst(request, '/index.html'))
  else if (url.pathname.startsWith('/models/')) event.respondWith(modelFirst(request))
  else event.respondWith(cacheFirst(request))
})
