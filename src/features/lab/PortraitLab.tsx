import { useEffect, useRef, useState } from 'react'
import { PatientScene } from '../../anatomy3d/patientScene'
import { shotFor } from '../../anatomy3d/shots'
import { CASES } from '../../content/cases'
import { useLocation } from '../../lib/router'

/**
 * Renders one case's 3D portrait (head and shoulders, transparent background)
 * for scripts/human/portraits.mjs to capture: /lab/portrait?case=<id>&size=256
 */
export default function PortraitLab() {
  const { query } = useLocation()
  const ref = useRef<HTMLCanvasElement>(null)
  const [status, setStatus] = useState('Loading…')
  const id = query.get('case') ?? CASES[0].id
  const size = +(query.get('size') ?? 256)

  // a transparent page, so the capture has an alpha channel
  useEffect(() => {
    const els = [document.documentElement, document.body]
    const prev = els.map((e) => e.style.background)
    els.forEach((e) => (e.style.background = 'transparent'))
    return () => els.forEach((e, i) => (e.style.background = prev[i]))
  }, [])

  useEffect(() => {
    ;(window as unknown as { __caseIds: string[] }).__caseIds = CASES.map((c) => c.id)
    const canvas = ref.current
    const meta = CASES.find((c) => c.id === id)
    if (!canvas || !meta) return
    let scene: PatientScene | null = null
    let alive = true
    meta.load().then((c) => {
      if (!alive) return
      scene = new PatientScene(canvas, { appearance: c.patient.appearance, set: 'standing', background: null, dark: true, bare: true, controls: false, maxDpr: 1 })
      const s = scene
      s.ready.then(() => {
        if (!alive) return
        s.setPose({ posture: 'stand', arms: 'sides' }, true)
        s.setClothing({ gownTop: true, briefs: true })
        s.setExpression({ pain: Math.min(0.6, (c.vitals.pain ?? 0) / 12), lookAt: 'camera' })
        s.holdBlink()
        s.shot(shotFor(s, 'portrait'), true)
        // let the expression settle before the capture
        window.setTimeout(() => alive && setStatus(`ready:${id}`), 1200)
      })
    })
    return () => {
      alive = false
      scene?.dispose()
    }
  }, [id])

  return (
    <div className="grid h-dvh w-full place-items-center bg-transparent">
      <canvas ref={ref} data-portrait style={{ width: size, height: size }} />
      <div className="pointer-events-none absolute top-2 left-2 font-mono text-[11px] text-muted" data-status={status}>
        {status}
      </div>
    </div>
  )
}
