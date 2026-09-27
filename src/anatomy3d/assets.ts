import type { Appearance } from '../anatomy/types'
import baseMeta from '../assets/human/base.json'
import baseUrl from '../assets/human/base.bin?url'
import { bodyDistance, bodyKey } from './macro'

/**
 * Loading the baked MakeHuman data (see scripts/human/bake.mjs). Everything is
 * deflate-compressed; inlined data: URLs (single-file builds) are decoded
 * without fetch() so they also work where a host blocks data: requests.
 */

export type BaseMeta = typeof baseMeta
type LayoutEntry = { offset: number; length: number; type: string }

const BODY_URLS = import.meta.glob('../assets/human/bodies/*.bin', { query: '?url', import: 'default' }) as Record<string, () => Promise<string>>
const urlForKey = (key: string) => BODY_URLS[`../assets/human/bodies/${key}.bin`]

async function blobOf(url: string): Promise<Blob> {
  if (url.startsWith('data:')) {
    const bin = atob(url.slice(url.indexOf(',') + 1))
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    return new Blob([bytes])
  }
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Could not load ${url} (${res.status})`)
  return res.blob()
}

async function inflate(url: string): Promise<ArrayBuffer> {
  const blob = await blobOf(url)
  return new Response(blob.stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer()
}

function typed(buf: ArrayBuffer, e: LayoutEntry) {
  switch (e.type) {
    case 'Uint8Array':
      return new Uint8Array(buf, e.offset, e.length)
    case 'Uint16Array':
      return new Uint16Array(buf, e.offset, e.length)
    case 'Int16Array':
      return new Int16Array(buf, e.offset, e.length)
    case 'Float32Array':
      return new Float32Array(buf, e.offset, e.length)
    default:
      throw new Error(`unknown array type ${e.type}`)
  }
}

export interface HumanBase {
  meta: BaseMeta
  neutral: Int16Array
  renderToCompact: Uint16Array
  uv: Uint16Array
  index: Uint16Array
  skinIndex: Uint8Array
  skinWeight: Uint8Array
  /** Per compact vertex, 0..255: local occlusion, flush, eyelids, body-hair density */
  ao: Uint8Array
  flush: Uint8Array
  lids: Uint8Array
  bodyHair: Uint8Array
  /** Scalp field (128 = hairline, 255 = 4 cm inside it) and azimuth (0 forehead, 255 nape) */
  scalp: Uint8Array
  scalpAz: Uint8Array
  morphs: Map<string, { index: Uint16Array; delta: Int16Array }>
}

let basePromise: Promise<HumanBase> | null = null

export function loadBase(): Promise<HumanBase> {
  basePromise ??= inflate(baseUrl).then((buf) => {
    const L = baseMeta.layout as Record<string, LayoutEntry>
    const morphs = new Map<string, { index: Uint16Array; delta: Int16Array }>()
    for (const name of baseMeta.morphs) morphs.set(name, { index: typed(buf, L[`morph:${name}:index`]) as Uint16Array, delta: typed(buf, L[`morph:${name}:delta`]) as Int16Array })
    return {
      meta: baseMeta,
      neutral: typed(buf, L.neutral) as Int16Array,
      renderToCompact: typed(buf, L.renderToCompact) as Uint16Array,
      uv: typed(buf, L.uv) as Uint16Array,
      index: typed(buf, L.index) as Uint16Array,
      skinIndex: typed(buf, L.skinIndex) as Uint8Array,
      skinWeight: typed(buf, L.skinWeight) as Uint8Array,
      ao: typed(buf, L.ao) as Uint8Array,
      flush: typed(buf, L.flush) as Uint8Array,
      lids: typed(buf, L.lids) as Uint8Array,
      bodyHair: typed(buf, L.bodyHair) as Uint8Array,
      scalp: typed(buf, L.scalp) as Uint8Array,
      scalpAz: typed(buf, L.scalpAz) as Uint8Array,
      morphs,
    }
  })
  basePromise.catch(() => (basePromise = null))
  return basePromise
}

export interface HumanBody {
  key: string
  /** Compact vertex positions in decimetres, standing on y = 0 */
  positions: Float32Array
  /** Per bone: head xyz, tail xyz (rest pose, decimetres) */
  joints: Float32Array
  /** Left then right eye: centre xyz, radius */
  eyePivots: Float32Array
}

/** The baked body for an appearance, or the nearest one when this exact body wasn't baked. */
export function resolveBodyKey(a: Appearance): string {
  const key = bodyKey(a)
  if (urlForKey(key)) return key
  let best = key
  let bestD = Infinity
  for (const [k, b] of Object.entries(baseMeta.bodies as Record<string, Appearance>)) {
    const d = bodyDistance(a, b)
    if (d < bestD && urlForKey(k)) {
      bestD = d
      best = k
    }
  }
  return best
}

const bodyCache = new Map<string, Promise<HumanBody>>()

export function loadBody(a: Appearance): Promise<HumanBody> {
  const key = resolveBodyKey(a)
  let p = bodyCache.get(key)
  if (!p) {
    p = Promise.all([loadBase(), urlForKey(key)().then(inflate)]).then(([base, buf]) => {
      const n = base.meta.compactCount * 3
      const bytes = new Uint8Array(buf)
      const positions = new Float32Array(n)
      const s = base.meta.positionScale
      for (let i = 0; i < n; i++) {
        const lo = bytes[i]
        const hi = bytes[n + i]
        const delta = ((hi << 8) | lo) << 16 >> 16
        positions[i] = (base.neutral[i] + delta) * s
      }
      const bones = base.meta.bones.length
      let off = n * 2
      const joints = new Float32Array(buf.slice(off, off + bones * 24))
      off += bones * 24
      const eyePivots = new Float32Array(buf.slice(off, off + 32))
      return { key, positions, joints, eyePivots }
    })
    p.catch(() => bodyCache.delete(key))
    bodyCache.set(key, p)
  }
  return p
}
