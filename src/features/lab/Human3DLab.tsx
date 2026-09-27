import { useEffect, useRef, useState } from 'react'
import type { HerniaPhase } from '../../anatomy/Body'
import type { Appearance } from '../../anatomy/types'
import { PatientScene, type BlanketFrom } from '../../anatomy3d/patientScene'
import type { Arms, Posture } from '../../anatomy3d/poses'
import type { SetKind } from '../../anatomy3d/sets'
import { shotFor, type ShotName } from '../../anatomy3d/shots'
import * as THREE from 'three'
import { breastSigns, lumpPlace, lumpSigns, neckSigns } from '../../anatomy3d/stationSigns'
import baseMeta from '../../assets/human/base.json'
import { useLocation } from '../../lib/router'

/**
 * Development view of the 3D patients:
 * /lab/3d?body=<key>&set=bed|couch|standing&pose=supine|recline45|stand|sitEdge&arms=…&wear=briefs,gownTop&blanket=0.55&shot=abdomen
 *   &grid=1 (regions, with RIF/EPI tinted) &phase=cough|standing|reduced|ring-cough
 *   &touch=light|deep|percuss|press|pit|listen (what a tap does)
 *   &dir=x,y,z &dist=n (camera direction and distance for the shot)
 *   &goitre=1|2|3 &gkind=diffuse|multinodular|nodule &tg=1 (thyroglossal cyst) &swallow=1 (swallow every 2.5 s)
 *   &breast=1 (a left breast cancer: lump, tethering, retracted nipple, axillary node)
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
        scene.setClothing({
          briefs: wear.has('briefs'),
          drape: wear.has('drape'),
          gownTop: wear.has('gownTop'),
          chestBand: wear.has('chestBand'),
          gownSkirt: wear.has('gownSkirt'),
          blanketFrom: !blanket ? null : isNaN(+blanket) ? (blanket as BlanketFrom) : +blanket,
        })
        scene.setExpression({ pain: +(query.get('pain') ?? 0), lookAt: 'camera' })
        const shot = shotFor(scene, (query.get('shot') ?? 'overview') as ShotName)
        const dir = query.get('dir')?.split(',').map(Number)
        if (dir?.length === 3) shot.dir.set(dir[0], dir[1], dir[2])
        if (query.get('dist')) shot.dist = +query.get('dist')!
        scene.shot(shot, true)
        if (query.get('grid')) scene.setGrid(true, { RIF: 'deep', EPI: 'light', UMB: 'light' })
        const goitre = query.get('goitre')
        if (goitre)
          scene.setExtraSigns(
            neckSigns({ goitre: { kind: (query.get('gkind') as 'diffuse') ?? 'diffuse', size: +goitre as 2 }, thyroglossal: query.get('tg') ? { sizeCm: 2 } : undefined }, scene.anatomy!, scene.human!, {
              swallow: () => scene.swallowNow,
              tongue: () => scene.tongueNow,
            }),
          )
        if (query.get('swallow')) window.setInterval(() => scene.swallow(), 2500)
        const lump = query.get('lump')
        if (lump) {
          const l = { site: lump as 'forearm', side: 'right' as const, w: 4.5, h: 3.5, kind: 'lipoma' as const, lobulated: true, domed: 0.42 }
          const place = lumpPlace(l, scene.anatomy!, scene.human!, (rest) => scene.surfaceAt(rest).normal.y)
          scene.setExtraSigns(lumpSigns(l, place, !!query.get('torch')))
          const s = scene.surfaceAt(place.at)
          if (!query.get('dir')) scene.shot({ target: s.point, dir: s.normal.clone().add(new THREE.Vector3(0, 0.45, 0)).normalize(), dist: 6, fov: 30 }, true)
          ;(window as unknown as { __lump: unknown }).__lump = { place, point: s.point, normal: s.normal }
        }
        if (query.get('breast'))
          scene.setExtraSigns(
            breastSigns({ lump: { side: 'left', clock: 2, distCm: 3.5, sizeCm: 3, visible: true, tethered: true }, nipple: { side: 'left', change: 'retracted' }, nodes: 'left' }, scene.anatomy!, scene.human!),
          )
        const phase = query.get('phase') as HerniaPhase | null
        if (phase) scene.setHerniaPhase(phase)
        const touch = query.get('touch')
        if (touch)
          canvas.addEventListener('pointerdown', (e) => {
            const r = canvas.getBoundingClientRect()
            const hit = scene.pick(e.clientX - r.left, e.clientY - r.top)
            if (!hit) return
            if (touch === 'listen') scene.listen(hit.rest)
            else scene.touchAt(hit.rest, touch as 'light')
            scene.signs.ripple(hit.rest)
          })
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
