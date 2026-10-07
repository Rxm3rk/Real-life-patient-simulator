import { toast } from '../components/ui/Toast'
import { useSettings } from '../store/settings'
import { webglTier } from './webgl'

/**
 * The 3D patient in the examination is opt-in: it asks a lot of the graphics
 * chip, and on some phones and laptops it froze or crashed the page. If it fails,
 * stalls, or the page died while it was loading, we go back to the illustrated
 * patient and remember that.
 */

const LOADING = 'bedside.exam3d.loading'

export function exam3dAvailable(): boolean {
  return webglTier() !== 'none'
}

/** Mark the start and end of loading the 3D examination (a mark left behind means the page died). */
export function markExam3dLoading(on: boolean) {
  try {
    if (on) localStorage.setItem(LOADING, String(Date.now()))
    else localStorage.removeItem(LOADING)
  } catch {
    /* storage blocked */
  }
}

/** The 3D examination failed or stalled: switch it off and say so. */
export function exam3dFailed(reason: 'lost' | 'slow' | 'error' | 'crashed') {
  markExam3dLoading(false)
  if (!useSettings.getState().exam3d) return
  useSettings.getState().set({ exam3d: false })
  const why =
    reason === 'slow'
      ? 'The 3D patient was taking too long on this device'
      : reason === 'crashed'
        ? 'The 3D patient crashed the page last time'
        : 'This device’s graphics couldn’t keep the 3D patient running'
  toast({ tone: 'warning', title: 'Switched to the illustrated patient', body: `${why}. You can turn 3D back on in Settings.` })
}

/** At start-up: a loading mark still present means the last 3D examination took the page down. */
export function checkExam3dCrash() {
  let stamp: string | null = null
  try {
    stamp = localStorage.getItem(LOADING)
  } catch {
    return
  }
  if (!stamp) return
  // let the stored settings load first
  window.setTimeout(() => exam3dFailed('crashed'), 400)
}
