/// <reference types="vitest/config" />
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, type Plugin } from 'vite'

/**
 * Schreibt nach dem Build dist/sw.js: die Vorlage sw/service-worker.js mit
 *  – VERSION: Hash über alle ausgelieferten Dateien (jede Änderung → neuer Service Worker)
 *  – PRECACHE: App-Hülle (HTML, Skripte, Stile, Schrift, Icons) und die Standard-Ebenen des Modells
 *  – MODELS: alle Modelldateien; Ebenen außerhalb des Precache (z. B. Muskeln) werden beim ersten Laden gespeichert
 */
function serviceWorkerPlugin(): Plugin {
  let outDir = 'dist'
  return {
    name: 'anatomiq-service-worker',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir
    },
    closeBundle() {
      const files: string[] = []
      const walk = (dir: string) => {
        for (const name of readdirSync(dir)) {
          const path = join(dir, name)
          if (statSync(path).isDirectory()) walk(path)
          else files.push(path)
        }
      }
      walk(outDir)
      const hash = createHash('sha256')
      const precache: string[] = []
      for (const file of files.sort()) {
        const url = '/' + relative(outDir, file).split(sep).join('/')
        if (url === '/sw.js') continue
        hash.update(url).update(readFileSync(file))
        if (url.endsWith('.map') || url === '/_redirects' || url === '/_headers' || url === '/robots.txt') continue
        if (url.endsWith('.woff')) continue
        if (url.endsWith('.woff2') && /(cyrillic|greek|vietnamese)/.test(url)) continue
        if (url.startsWith('/icons/') && url.endsWith('-source.svg')) continue
        // Muskelebene erst bei Bedarf (wird dann im Laufzeit-Cache gespeichert)
        if (url === '/models/muscles.glb') continue
        precache.push(url)
      }
      const template = readFileSync(fileURLToPath(new URL('./sw/service-worker.js', import.meta.url)), 'utf8')
      const sw = template.replaceAll('__VERSION__', hash.digest('hex').slice(0, 12)).replaceAll('__PRECACHE__', JSON.stringify(precache))
      writeFileSync(join(outDir, 'sw.js'), sw)
      console.log(`[anatomiq] sw.js geschrieben (${precache.length} Dateien vorab gespeichert)`)
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), serviceWorkerPlugin()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    target: 'es2022',
    sourcemap: false,
    chunkSizeWarningLimit: 1400,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three') || id.includes('node_modules/@react-three') || id.includes('three-mesh-bvh') || id.includes('camera-controls')) return 'three'
        },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
  },
})
