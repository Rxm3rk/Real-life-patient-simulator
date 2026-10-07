import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { checkExam3dCrash } from './lib/exam3d'
import './index.css'

// Offline support: register the service worker in production builds (never blocks start-up)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  import('virtual:pwa-register')
    .then(({ registerSW }) => registerSW({ immediate: true }))
    .catch(() => {
      /* offline support unavailable — the app works without it */
    })
}

// if the 3D examination took the page down last time, don't load it again
checkExam3dCrash()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
