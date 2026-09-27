import { useEffect, useRef, useState } from 'react'
import type { Appearance } from '../../anatomy/types'
import { PatientScene } from '../../anatomy3d/patientScene'
import type { Arms, Posture } from '../../anatomy3d/poses'
import type { SetKind } from '../../anatomy3d/sets'
import { shotFor, type ShotName } from '../../anatomy3d/shots'
import baseMeta from '../../assets/human/base.json'
import { useLocation } from '../../lib/router'

/**
 * Development view of the 3D patients:
 * /lab/3d?body=<key>&set=bed|couch|standing&pose=supine|recline45|stand|sitEdge&arms=…&wear=briefs,gownTop&blanket=0.55&shot=abdomen
 */
export default function Human3DLab() {
  const { query } = useLocation()
  const ref = useRef<HTMLCanvasElement>(null)
  const [status, setStatus] = useState('Loading…')
  const bodies = baseMeta.bodies as Record<string, Appearance>
  const key = query.get('body') ?? 'm-38-average-t5'
  const qs = query.toString()

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const a = bodies[key] ?? Object.values(bodies)[0]
    const posture = (query.get('pose') ?? 'supine') as Posture
    const set = (query.get('set') ?? (posture === 'stand' ? 'standing' : 'bed')) as SetKind
    const scene = new PatientScene(canvas, { appearance: a, set, background: '#101826', dark: true })
    let alive = true
    scene.ready
      .then(() => {
        if (!alive) return
        scene.setPose({ posture, arms: (query.get('arms') ?? undefined) as Arms | undefined, turned: query.get('turned') === '1' }, true)
        const wear = new Set((query.get('wear') ?? '').split(',').filter(Boolean))
        const blanket = query.get('blanket')
        scene.setClothing({ briefs: wear.has('briefs'), gownTop: wear.has('gownTop'), chestBand: wear.has('chestBand'), gownSkirt: wear.has('gownSkirt'), blanketFrom: blanket ? +blanket : null })
        scene.setExpression({ pain: +(query.get('pain') ?? 0), lookAt: 'camera' })
        scene.shot(shotFor(scene, (query.get('shot') ?? 'overview') as ShotName), true)
        setStatus(`${key}`)
        ;(window as unknown as { __lab: unknown }).__lab = { scene, stage: scene.stage, human: scene.human }
      })
      .catch((e) => setStatus(`Failed: ${e}`))
    return () => {
      alive = false
      scene.dispose()
    }
  }, [key, qs]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative h-dvh w-full bg-[#101826]">
      <canvas ref={ref} className="block h-full w-full touch-none" />
      <div className="pointer-events-none absolute top-3 left-3 rounded-lg bg-black/50 px-3 py-1.5 font-mono text-[12px] text-white" data-status={status}>
        {status}
      </div>
    </div>
  )
}
