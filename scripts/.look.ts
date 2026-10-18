import { chromium } from 'playwright-core'
const OUT = process.argv[2]
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const p = await (await browser.newContext({ viewport: { width: 900, height: 900 } })).newPage()
p.on('pageerror', (e) => console.log('ERR', e))
await p.goto('http://localhost:5199')
await p.waitForFunction(() => (window as any).__anatomiq?.snapshot().load.organs === 'ready', null, { timeout: 60000 })
await p.getByText('Verstanden').click()
const views: [string, string[], string, string][] = [
  ['colon', ['sigmoid-colon', 'descending-colon', 'rectum', 'cecum', 'ascending-colon', 'transverse-colon'], 'sigmoid-colon', 'front'],
  ['colon-left', ['sigmoid-colon', 'descending-colon', 'rectum', 'sacrum', 'urinary-bladder'], 'sigmoid-colon', 'left'],
]
for (const [name, ids, focus, view] of views) {
  await p.evaluate(async ([ids, focus, view]) => {
    const { useViewer } = await import('/src/state/viewer.ts')
    const v = useViewer.getState()
    v.select(null)
    v.isolate(ids as string[])
    v.camera({ kind: 'view', view: view as never })
    setTimeout(() => useViewer.getState().camera({ kind: 'focus', id: focus as string }), 900)
  }, [ids, focus, view] as const)
  await p.waitForTimeout(5000)
  await p.screenshot({ path: `${OUT}/${name}.png` })
}
await browser.close()
