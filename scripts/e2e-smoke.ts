/**
 * Rauchtest der gebauten App im echten Browser (Chromium über playwright-core, WebGL per SwiftShader).
 *   npm run build && node scripts/e2e-smoke.ts [--shots <ordner>]
 *
 * Prüft die Abnahmekriterien der ersten Version, soweit sie sich automatisch prüfen lassen:
 * Start direkt in der 3D-Ansicht, keine Suche, Drehen/Zoomen verändert die Ansicht, Antippen wählt die
 * richtige Struktur, Panel zeigt deren Daten, Schließen erhält die Kamera, Fokus, Ebenen, Isolation,
 * schmale Bildschirme, defekte Modelldatei ohne Absturz, keine Konsolenfehler, gültiges Manifest,
 * Service Worker und Offline-Start.
 */
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { chromium, type Page } from 'playwright-core'
import { PerspectiveCamera, Vector3 } from 'three'

const PORT = 4174
const BASE = `http://localhost:${PORT}`
const shotsIdx = process.argv.indexOf('--shots')
const SHOTS = shotsIdx > 0 ? process.argv[shotsIdx + 1] : null
if (SHOTS && !existsSync(SHOTS)) mkdirSync(SHOTS, { recursive: true })
const fallback = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const executablePath = process.env.CHROMIUM_PATH ?? (existsSync(fallback) ? fallback : undefined)
const manifest = JSON.parse(readFileSync(new URL('../src/data/generated/model-manifest.json', import.meta.url), 'utf8')) as {
  structures: { id: string; center: [number, number, number] }[]
}

type Snapshot = {
  selectedId: string | null
  panel: string
  layers: Record<string, string>
  load: Record<string, string>
  isolated: string[] | null
  loaded: number
  camera: { target: number[]; position: number[]; distance: number } | null
}

const server = spawn(process.execPath, ['scripts/serve-dist.ts', '--port', String(PORT)], { stdio: 'pipe' })
await new Promise<void>((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('Vorschau-Server startet nicht')), 15000)
  server.stdout.on('data', (d) => {
    if (String(d).includes(String(PORT))) {
      clearTimeout(timer)
      resolve()
    }
  })
})

let failures = 0
const check = (ok: boolean, label: string) => {
  console.log(`${ok ? '✓' : '✖'} ${label}`)
  if (!ok) failures++
}

const snapshot = (p: Page) => p.evaluate(() => (window as unknown as { __anatomiq: { snapshot: () => unknown } }).__anatomiq.snapshot()) as Promise<Snapshot>
const waitFor = async (p: Page, predicate: (s: Snapshot) => boolean, timeout = 20000) => {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    const s = await snapshot(p).catch(() => null)
    if (s && predicate(s)) return s
    await p.waitForTimeout(150)
  }
  return snapshot(p)
}
/** Bildschirmposition des Mittelpunkts einer Struktur bei der aktuellen Kamera (Panel geschlossen) */
async function screenPos(p: Page, id: string): Promise<[number, number]> {
  const s = await snapshot(p)
  const vp = p.viewportSize()!
  const cam = new PerspectiveCamera(35, vp.width / vp.height, 0.01, 30)
  cam.position.fromArray(s.camera!.position)
  cam.lookAt(new Vector3().fromArray(s.camera!.target))
  cam.updateMatrixWorld()
  const v = new Vector3(...manifest.structures.find((m) => m.id === id)!.center).project(cam)
  return [((v.x + 1) / 2) * vp.width, ((1 - v.y) / 2) * vp.height]
}
/** Warten, bis die Kamera zur Ruhe gekommen ist (Animationen laufen mit SwiftShader langsamer) */
async function settle(p: Page) {
  let last = ''
  let stable = 0
  for (let i = 0; i < 120 && stable < 8; i++) {
    await p.waitForTimeout(250)
    const cam = (await snapshot(p)).camera
    const now = JSON.stringify(cam?.position.map((v) => v.toFixed(4)))
    stable = now === last ? stable + 1 : 0
    last = now
  }
}
const shot = async (p: Page, name: string) => SHOTS && p.screenshot({ path: `${SHOTS}/${name}.png` })

const browser = await chromium.launch({ executablePath, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
try {
  // ── Desktop ───────────────────────────────────────────────────
  const context = await browser.newContext({ viewport: { width: 1280, height: 860 }, serviceWorkers: 'allow' })
  const page = await context.newPage()
  const errors: string[] = []
  page.on('console', (msg) => msg.type() === 'error' && errors.push(msg.text()))
  page.on('pageerror', (err) => errors.push(String(err)))

  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  check((await page.locator('canvas').count()) === 1, 'Start direkt in der 3D-Ansicht (Canvas vorhanden, keine Startseite)')
  let s = await waitFor(page, (x) => ['skin', 'skeleton', 'organs', 'vessels', 'nervous'].every((l) => x.load[l] === 'ready'))
  check(s.loaded > 150, `Standard-Ebenen geladen (${s.loaded} Strukturen), Muskeln noch nicht (${s.load.muscles})`)
  check(s.load.muscles === 'idle', 'Muskelebene wird erst bei Bedarf geladen')
  check((await page.locator('input').count()) === 0 && (await page.getByText(/suche/i).count()) === 0, 'Keine Suchleiste, kein Eingabefeld')
  await page.getByText('Verstanden').click()
  await settle(page)
  await shot(page, 'desktop-start')

  // Drehen und Zoomen
  const before = (await snapshot(page)).camera!
  await page.mouse.move(640, 430)
  await page.mouse.down()
  await page.mouse.move(760, 440, { steps: 8 })
  await page.mouse.up()
  await settle(page)
  const rotated = (await snapshot(page)).camera!
  check(Math.abs(rotated.position[0] - before.position[0]) > 0.2, 'Ziehen dreht die Kamera um den Körper')
  await page.mouse.wheel(0, -400)
  await settle(page)
  const zoomed = (await snapshot(page)).camera!
  check(zoomed.distance < rotated.distance - 0.2, `Mausrad zoomt (${rotated.distance.toFixed(2)} → ${zoomed.distance.toFixed(2)} m)`)
  s = await snapshot(page)
  check(s.selectedId === null, 'Drehen löst keine Auswahl aus')
  await page.keyboard.press('ArrowLeft')
  await settle(page)
  const keyed = (await snapshot(page)).camera!
  check(Math.hypot(...keyed.position.map((v, i) => v - zoomed.position[i])) > 0.05, 'Pfeiltaste dreht die Kamera (Tastatur am iPad/Desktop)')

  // Ausgangsansicht, dann Leber antippen
  await page.getByRole('button', { name: /Ausgangsansicht/ }).click()
  if (process.env.DEBUG) for (let i = 0; i < 5; i++) { await page.waitForTimeout(500); console.log('nach Reset', JSON.stringify((await snapshot(page)).camera)) }
  await settle(page)
  let [x, y] = await screenPos(page, 'liver')
  if (process.env.DEBUG) console.log('liver at', x, y, JSON.stringify((await snapshot(page)).camera))
  await page.mouse.click(x, y)
  s = await waitFor(page, (v) => v.selectedId !== null)
  check(s.selectedId === 'liver', `Antippen wählt die getroffene Struktur (${s.selectedId})`)
  check((await page.locator('#panel-title').textContent())?.trim() === 'Leber' && (await page.getByText('Hepar').count()) > 0, 'Panel zeigt Name und lateinischen Namen der Struktur')
  check((await page.getByText('Pfortader (V. portae').count()) > 0, 'Panel zeigt die Detailabschnitte (Blutversorgung)')
  await shot(page, 'desktop-leber')

  // Schließen erhält die Kamera
  await settle(page)
  const camOpen = (await snapshot(page)).camera!
  await page.getByRole('button', { name: 'Informationen schließen' }).click()
  await settle(page)
  const camClosed = (await snapshot(page)).camera!
  s = await snapshot(page)
  check(s.selectedId === null && (await page.locator('#panel-title').count()) === 0, 'Panel schließt, Auswahl aufgehoben')
  check(camOpen.position.every((v, i) => Math.abs(v - camClosed.position[i]) < 1e-3), 'Schließen des Panels erhält die Kameraposition')

  // Skelett transparent → Herz antippbar; Doppelklick fokussiert
  await page.getByRole('button', { name: 'Ebenen anzeigen' }).click()
  await page.getByRole('button', { name: /^Skelett:/ }).click()
  s = await snapshot(page)
  check(s.layers.skeleton === 'ghost', 'Ebenenschalter: Skelett transparent')
  await page.getByRole('button', { name: /Ausgangsansicht/ }).click()
  await settle(page)
  // Das Herz liegt teilweise hinter den Lungen; getippt wird dort, wo es sichtbar ist (wie ein Nutzer es täte)
  // Nach jedem Fehlversuch Auswahl schließen und Ausgangsansicht herstellen, denn die Kamera folgt der Auswahl
  for (const [dx, dy] of [[0, 0], [8, 10], [-8, 10], [12, 18], [0, 22], [-12, 18], [16, 4], [4, 30]]) {
    ;[x, y] = await screenPos(page, 'heart')
    await page.mouse.click(x + dx, y + dy)
    s = await waitFor(page, (v) => v.selectedId !== null, 3000)
    if (s.selectedId === 'heart') break
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: /Ausgangsansicht/ }).click()
    await settle(page)
  }
  check(s.selectedId === 'heart', `Bei transparentem Skelett lässt sich das Herz antippen (${s.selectedId})`)
  await settle(page)
  const camHeart = (await snapshot(page)).camera!
  check(Math.hypot(...camHeart.target.map((v, i) => v - manifest.structures.find((m) => m.id === 'heart')!.center[i])) < 0.02, 'Kamera richtet sich auf die ausgewählte Struktur aus')
  await page.getByRole('button', { name: 'Nur diese Struktur zeigen' }).click()
  s = await snapshot(page)
  check(JSON.stringify(s.isolated) === '["heart"]', 'Isolieren zeigt nur die ausgewählte Struktur')
  await shot(page, 'desktop-herz-isoliert')
  await page.getByRole('button', { name: 'Isolation aufheben' }).first().click()
  await page.getByRole('button', { name: /^Muskeln:/ }).click()
  s = await waitFor(page, (v) => v.load.muscles === 'ready')
  check(s.load.muscles === 'ready', 'Muskelebene wird beim Einschalten nachgeladen')
  await page.getByRole('button', { name: /Darstellung zurücksetzen/ }).click()
  s = await snapshot(page)
  check(s.layers.skeleton === 'visible' && s.layers.muscles === 'hidden' && s.isolated === null, 'Darstellung zurücksetzen stellt den Ausgangszustand wieder her')

  // Lernmodus: Quiz-Aufgabe erscheint
  await page.getByRole('button', { name: /Lernen/ }).click()
  await page.getByText('Finde die Struktur').first().click()
  check((await page.getByRole('status').filter({ hasText: 'Finde die Struktur' }).count()) > 0, 'Quiz startet mit einer Aufgabe')
  await page.getByRole('button', { name: 'Lernmodus beenden' }).click()

  check(errors.length === 0, `Keine Fehler in der Browserkonsole${errors.length ? `: ${errors.join(' | ')}` : ''}`)

  // Manifest, Header, Service Worker
  const manifestRes = await page.request.get(`${BASE}/manifest.webmanifest`)
  const webmanifest = (await manifestRes.json()) as { display: string; start_url: string; icons: { src: string; sizes: string }[] }
  const iconsOk = await Promise.all(webmanifest.icons.map(async (i) => (await page.request.get(`${BASE}${i.src}`)).ok()))
  check(webmanifest.display === 'standalone' && webmanifest.start_url === '/' && iconsOk.every(Boolean) && webmanifest.icons.some((i) => i.sizes === '512x512'), 'Web-App-Manifest gültig, Icons vorhanden')
  check((await page.request.get(`${BASE}/icons/apple-touch-icon.png`)).ok(), 'Apple-Touch-Icon vorhanden')
  const html = await page.request.get(`${BASE}/`)
  check((html.headers()['content-security-policy'] ?? '').includes("script-src 'self' 'wasm-unsafe-eval'"), 'Content-Security-Policy gesetzt')
  const swReady = await page.evaluate(async () => !!(await Promise.race([navigator.serviceWorker.ready, new Promise((r) => setTimeout(() => r(null), 8000))])))
  check(swReady, 'Service Worker aktiv')
  if (swReady) {
    await context.setOffline(true)
    await page.reload({ waitUntil: 'domcontentloaded' })
    s = await waitFor(page, (v) => ['skeleton', 'organs'].every((l) => v.load[l] === 'ready'))
    check(s.load.skeleton === 'ready' && s.load.organs === 'ready', 'Offline: App und Standard-Ebenen starten ohne Netz')
    await context.setOffline(false)
  }
  await context.close()

  // ── Defekte Modelldatei ───────────────────────────────────────
  const broken = await browser.newContext({ viewport: { width: 1000, height: 700 }, serviceWorkers: 'block' })
  const bp = await broken.newPage()
  const brokenErrors: string[] = []
  bp.on('pageerror', (err) => brokenErrors.push(String(err)))
  await bp.route('**/models/organs.glb*', (route) => route.fulfill({ status: 200, contentType: 'model/gltf-binary', body: Buffer.from('kaputt') }))
  await bp.goto(BASE, { waitUntil: 'domcontentloaded' })
  s = await waitFor(bp, (v) => v.load.organs === 'error' && v.load.skeleton === 'ready')
  check(s.load.organs === 'error' && s.load.skeleton === 'ready', 'Defekte Modelldatei: nur diese Ebene fällt aus, der Rest lädt')
  check((await bp.getByRole('alert').filter({ hasText: 'Organe' }).count()) > 0 && brokenErrors.length === 0, 'Verständliche Fehlermeldung statt Absturz')
  await broken.close()

  // ── iPhone-Format ─────────────────────────────────────────────
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, serviceWorkers: 'block' })
  const mp = await mobile.newPage()
  const mobileErrors: string[] = []
  mp.on('console', (msg) => msg.type() === 'error' && mobileErrors.push(msg.text()))
  mp.on('pageerror', (err) => mobileErrors.push(String(err)))
  await mp.goto(BASE, { waitUntil: 'domcontentloaded' })
  await waitFor(mp, (v) => v.load.organs === 'ready' && v.load.skeleton === 'ready')
  await mp.getByText('Verstanden').tap()
  await settle(mp)
  ;[x, y] = await screenPos(mp, 'liver')
  await mp.touchscreen.tap(x, y)
  s = await waitFor(mp, (v) => v.selectedId !== null)
  check(s.selectedId === 'liver', `Touch: Antippen wählt die Leber (${s.selectedId})`)
  const sheet = await mp.locator('section[aria-labelledby="panel-title"]').boundingBox()
  check(!!sheet && sheet.y > 844 * 0.4, 'Bottom-Sheet lässt den oberen Teil des Modells frei')
  await shot(mp, 'mobil-leber')
  await mp.getByText('Mehr erfahren').tap()
  await settle(mp)
  await shot(mp, 'mobil-panel')
  const overflow = await mp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  check(overflow <= 1, `Kein horizontales Überlaufen auf dem Smartphone (${overflow}px)`)
  check(mobileErrors.length === 0, `Mobil: keine Konsolenfehler${mobileErrors.length ? `: ${mobileErrors.join(' | ')}` : ''}`)
  await mobile.close()

  // ── iPad (Hochformat, Querformat, Split View) ─────────────────
  for (const [label, width, height] of [['iPad hoch', 820, 1180], ['iPad quer', 1180, 820]] as const) {
    const tablet = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, serviceWorkers: 'block' })
    const tp = await tablet.newPage()
    const tabletErrors: string[] = []
    tp.on('console', (msg) => msg.type() === 'error' && tabletErrors.push(msg.text()))
    tp.on('pageerror', (err) => tabletErrors.push(String(err)))
    await tp.goto(BASE, { waitUntil: 'domcontentloaded' })
    await waitFor(tp, (v) => v.load.organs === 'ready' && v.load.skeleton === 'ready')
    await tp.getByText('Verstanden').tap()
    await settle(tp)
    ;[x, y] = await screenPos(tp, 'liver')
    await tp.touchscreen.tap(x, y)
    s = await waitFor(tp, (v) => v.selectedId !== null)
    check(s.selectedId === 'liver', `${label}: Antippen wählt die Leber (${s.selectedId})`)
    const side = await tp.locator('aside[aria-labelledby="panel-title"]').boundingBox()
    check(!!side && side.x > width * 0.5 && side.width >= 320, `${label}: Informationen im Seitenpanel, Modell bleibt links frei`)
    check((await tp.getByText('Pfortader (V. portae').count()) > 0, `${label}: Seitenpanel zeigt alle Abschnitte ohne Ausklappen`)
    await shot(tp, `ipad-${width}x${height}`)
    if (width < height) {
      // Split View / Stage Manager: Fenster wird schmaler → Bottom-Sheet, mittig und begrenzt breit
      await tp.setViewportSize({ width: 694, height: 1024 })
      await tp.waitForTimeout(400)
      check((await tp.locator('aside[aria-labelledby="panel-title"]').count()) === 1, 'Split View 2/3: Seitenpanel bleibt')
      await tp.setViewportSize({ width: 375, height: 1024 })
      await tp.waitForTimeout(400)
      const narrowSheet = await tp.locator('section[aria-labelledby="panel-title"]').boundingBox()
      check(!!narrowSheet && narrowSheet.width <= 375 && narrowSheet.y > 1024 * 0.4, 'Split View 1/3: Bottom-Sheet statt Seitenpanel')
      await tp.setViewportSize({ width: 1000, height: 700 })
      await tp.waitForTimeout(400)
      s = await snapshot(tp)
      check(s.selectedId === 'liver' && (await tp.locator('aside[aria-labelledby="panel-title"]').count()) === 1, 'Fenstergröße ändern behält die Auswahl')
    }
    const tOverflow = await tp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    check(tOverflow <= 1 && tabletErrors.length === 0, `${label}: kein Überlaufen, keine Konsolenfehler${tabletErrors.length ? `: ${tabletErrors.join(' | ')}` : ''}`)
    await tablet.close()
  }
} finally {
  await browser.close()
  server.kill()
}

console.log(failures ? `\n✖ ${failures} Prüfungen fehlgeschlagen` : '\n✓ Alle Prüfungen bestanden')
process.exit(failures ? 1 : 0)
