import * as THREE from 'three'
import type { EyeColor } from '../anatomy/types'

/** Iris colours: [near the pupil, at the limbus] (sRGB). */
const IRIS: Record<EyeColor, [string, string]> = {
  brown: ['#7a4a22', '#3b220f'],
  hazel: ['#9a7433', '#4f5d2c'],
  blue: ['#9cc0e0', '#35577d'],
  green: ['#86a35d', '#3b5a33'],
  grey: ['#aeb7bd', '#58626b'],
}

const hex = (c: string) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]
const mix = (a: number[], b: number[], t: number) => a.map((x, i) => x + (b[i] - x) * t)
const smooth = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)))
  return t * t * (3 - 2 * t)
}
// deterministic hash noise so every eye of a colour looks the same between sessions
const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return s - Math.floor(s)
}
const noise1 = (x: number) => {
  const i = Math.floor(x)
  const f = x - i
  return hash(i) + (hash(i + 1) - hash(i)) * f * f * (3 - 2 * f)
}

const PUPIL = 0.17 // radians from the front pole (~2 mm on a 12 mm eye)
const IRIS_EDGE = 0.54 // ~6 mm

const cache = new Map<string, THREE.CanvasTexture>()

/**
 * An equirectangular eyeball texture: canvas row 0 is the front pole (pupil),
 * the iris fills the first ~30°, then sclera with a few fine vessels.
 */
export function eyeTexture(color: EyeColor = 'brown', jaundice = 0): THREE.Texture {
  const key = `${color}:${jaundice.toFixed(2)}`
  const hit = cache.get(key)
  if (hit) return hit
  const W = 512
  const H = 256
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  const img = ctx.createImageData(W, H)
  const [inner, outer] = IRIS[color].map(hex)
  const sclera = mix(hex('#f2eee8'), hex('#e3c65a'), jaundice * 0.85)
  const scleraBack = mix(hex('#e7dcd6'), hex('#d8b64f'), jaundice * 0.8)
  const pupil = hex('#07080a')
  for (let y = 0; y < H; y++) {
    const th = (y / (H - 1)) * Math.PI
    for (let x = 0; x < W; x++) {
      const ph = (x / W) * Math.PI * 2
      let c: number[]
      if (th < IRIS_EDGE + 0.02) {
        const r = (th - PUPIL) / (IRIS_EDGE - PUPIL) // 0 at pupil edge, 1 at limbus
        const fibres = noise1(ph * 48) * 0.55 + noise1(ph * 131 + r * 3) * 0.3 + noise1(ph * 17 + 40) * 0.15
        const collarette = Math.exp(-(((r - 0.32) / 0.08) ** 2)) * 0.28
        const crypt = noise1(ph * 9 + 7) > 0.78 && r > 0.35 && r < 0.75 ? 0.25 : 0
        c = mix(inner, outer, smooth(0.05, 1, r))
        const k = 0.72 + fibres * 0.5 + collarette - crypt
        c = c.map((v) => v * k)
        c = mix(c, [18, 14, 12], smooth(0.8, 1.02, r) * 0.75) // limbal ring
        c = mix(c, pupil, 1 - smooth(-0.05, 0.02, r)) // pupil with a soft edge
        c = mix(c, sclera, smooth(IRIS_EDGE, IRIS_EDGE + 0.02, th))
      } else {
        const back = smooth(0.9, 2.4, th)
        c = mix(sclera, scleraBack, back)
        // fine vessels creeping forward from the fornices
        const vessel = Math.max(0, noise1(ph * 22 + Math.sin(th * 9) * 0.6) - 0.86) * 5 * smooth(IRIS_EDGE + 0.25, 1.4, th)
        c = mix(c, [182, 72, 70], Math.min(0.35, vessel))
      }
      const i = ((H - 1 - y) * W + x) * 4 // stored upside down: uploaded without UNPACK_FLIP_Y
      img.data[i] = c[0]
      img.data[i + 1] = c[1]
      img.data[i + 2] = c[2]
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  const tex = new THREE.CanvasTexture(canvas)
  tex.flipY = false
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  cache.set(key, tex)
  return tex
}

/** Unit eyeball with the front pole on +z, so it can be scaled to the patient's eye. */
let sphere: THREE.SphereGeometry | null = null
export function eyeGeometry() {
  if (!sphere) {
    sphere = new THREE.SphereGeometry(1, 48, 32)
    sphere.rotateX(Math.PI / 2)
  }
  return sphere
}

export function eyeMaterial(color: EyeColor = 'brown', jaundice = 0) {
  return new THREE.MeshPhysicalMaterial({ name: 'eye', map: eyeTexture(color, jaundice), roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.03 })
}
