import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './debug/testHook'
import { registerServiceWorker } from './pwa/registerServiceWorker'
import './styles/index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

registerServiceWorker()

// iOS-Safari ignoriert user-scalable=no: Pinch soll das Modell zoomen, nicht die Seite
document.addEventListener('gesturestart', (e) => e.preventDefault())
