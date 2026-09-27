import { useEffect, useRef, useState } from 'react'
import { PatientScene } from '../../../anatomy3d/patientScene'
import { shotFor } from '../../../anatomy3d/shots'
import type { CaseDef } from '../../../engine/types'
import { cn } from '../../../lib/utils'
import { portraitUrl } from '../../../lib/portraits'

/**
 * The patient you're talking to, in 3D: sitting up, looking at you, breathing
 * and blinking, their face showing their pain, their lips moving while they
 * answer. Shown from the chest up, like a consultation over video.
 */
export default function PatientTalk3D({ c, pain, speaking, className, onUnavailable }: { c: CaseDef; pain: number; speaking: boolean; className?: string; onUnavailable?: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<PatientScene | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    let scene: PatientScene
    try {
      scene = new PatientScene(canvas, { appearance: c.patient.appearance, set: 'chair', background: null, dark: true, bare: true, controls: false, maxDpr: 1.5 })
    } catch {
      onUnavailable?.()
      return
    }
    sceneRef.current = scene
    let alive = true
    scene.setVitals({ hr: c.vitals.hr, rr: c.vitals.rr })
    scene.ready
      .then(() => {
        if (!alive) return
        scene.setPose({ posture: 'sitChair', arms: 'sides' }, true)
        scene.setClothing({ gownTop: true, gownSkirt: true, briefs: true })
        scene.shot(shotFor(scene, 'talk'), true)
        setReady(true)
      })
      .catch(() => onUnavailable?.())
    return () => {
      alive = false
      sceneRef.current = null
      scene.dispose()
    }
    // one scene per patient
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c.id])

  useEffect(() => {
    if (ready) sceneRef.current?.setExpression({ pain, speaking, lookAt: 'camera' })
  }, [pain, speaking, ready])

  const poster = portraitUrl(c.id)
  return (
    <div className={cn('relative overflow-hidden', className)}>
      {!ready && poster && <img src={poster} alt="" className="absolute inset-0 h-full w-full scale-[0.72] object-contain opacity-80" />}
      <canvas ref={ref} className={cn('block h-full w-full transition-opacity duration-500', ready ? 'opacity-100' : 'opacity-0')} role="img" aria-label={`${c.patient.name}, sitting up and talking to you`} />
    </div>
  )
}
