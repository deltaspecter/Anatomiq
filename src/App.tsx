/**
 * Anatomiq startet direkt in der 3D-Ansicht. Alles andere sind schwebende, zurückhaltende Ebenen darüber:
 * Kopfzeile, Ebenenleiste, Kamera-Leiste, Informationspanel, Lernkarte und Statusanzeigen.
 */
import { useState } from 'react'
import { LayerBar } from './layers/LayerBar'
import { LearnOverlay, LearnSheet } from './learn/LearnUI'
import { InfoPanel } from './panel/InfoPanel'
import { hasWebGL, Viewer } from './scene/Viewer'
import { useViewer } from './state/viewer'
import { CameraBar, TopBar, type Sheet } from './ui/Chrome'
import { FavoritesSheet } from './ui/FavoritesSheet'
import { SettingsSheet } from './ui/SettingsSheet'
import { Hints, LoadingStatus, Toast, UpdateBanner } from './ui/Status'
import { peekHeight, sidePanelWidth, useIsWide, useViewport } from './ui/useLayout'

function NoWebGL() {
  return (
    <div className="grid h-full place-items-center p-8 text-center">
      <div className="max-w-sm space-y-3">
        <h1 className="text-xl font-semibold">Anatomiq</h1>
        <p className="text-[15px] leading-relaxed text-muted">
          Dein Browser kann keine 3D-Grafik (WebGL) darstellen. Bitte aktiviere WebGL bzw. Hardwarebeschleunigung oder öffne Anatomiq in einem aktuellen Safari, Chrome oder Firefox.
        </p>
      </div>
    </div>
  )
}

export function App() {
  const [webgl] = useState(hasWebGL)
  const [sheet, setSheet] = useState<Sheet>(null)
  const wide = useIsWide()
  const { width, height } = useViewport()
  const panelOpen = useViewer((s) => s.panel !== 'closed' && !!s.selectedId)
  const panelFull = useViewer((s) => s.panel === 'full')
  const layerBarOpen = useViewer((s) => s.layerBarOpen)

  if (!webgl)
    return (
      <div className="stage">
        <NoWebGL />
      </div>
    )

  // Bedienelemente und Bildausschnitt weichen dem geöffneten Panel aus
  const sheetPeek = peekHeight(height)
  const bottomOffset = !wide && panelOpen ? sheetPeek : 0
  const rightOffset = wide && panelOpen ? sidePanelWidth(width) + 12 : 0
  const panelOffset = panelOpen ? (wide ? { x: Math.round(sidePanelWidth(width) / 2), y: 0 } : { x: 0, y: Math.round(sheetPeek / 2) }) : { x: 0, y: 0 }
  const hideControls = !wide && panelFull

  return (
    <div className="stage">
      <Viewer panelOffset={panelOffset} />
      <LoadingStatus />
      <TopBar onOpen={setSheet} active={sheet} compact={!wide} />
      {!hideControls && (
        <>
          <LayerBar bottomOffset={bottomOffset} />
          <CameraBar rightOffset={rightOffset} bottomOffset={bottomOffset + (!wide && layerBarOpen ? 100 : 0)} />
        </>
      )}
      <LearnOverlay />
      <InfoPanel />
      <Hints bottomOffset={bottomOffset} />
      <Toast bottomOffset={bottomOffset} />
      <UpdateBanner />
      {sheet === 'settings' && <SettingsSheet onClose={() => setSheet(null)} />}
      {sheet === 'favorites' && <FavoritesSheet onClose={() => setSheet(null)} />}
      {sheet === 'learn' && <LearnSheet onClose={() => setSheet(null)} />}
    </div>
  )
}
