import { darken, lighten, mix } from './color'
import type { Appearance, EyeColor, HairColor, SkinTone } from './types'

export interface SkinPalette {
  base: string
  shadow: string
  deep: string
  highlight: string
  blush: string
  lip: string
  nipple: string
  vein: string
  nail: string
  palm: string
  sclera: string
  conjunctiva: string
}

const TONES: Record<SkinTone, { base: string; shadow: string; highlight: string; lip: string; palm: string }> = {
  1: { base: '#f2d1bd', shadow: '#d9a58c', highlight: '#fbe6d9', lip: '#d98a86', palm: '#f3cdbb' },
  2: { base: '#e8bb9b', shadow: '#c68d6c', highlight: '#f5d6c1', lip: '#c9796f', palm: '#eec3a9' },
  3: { base: '#d39c76', shadow: '#ad724e', highlight: '#e6ba98', lip: '#b8695c', palm: '#e2b598' },
  4: { base: '#b98160', shadow: '#8e5b3e', highlight: '#cf9c7c', lip: '#9c5a4b', palm: '#dcae92' },
  5: { base: '#946044', shadow: '#6c422c', highlight: '#ae7a5b', lip: '#7d4638', palm: '#c99479' },
  6: { base: '#664031', shadow: '#46291d', highlight: '#835442', lip: '#5c3329', palm: '#b88470' },
}

export const HAIR: Record<HairColor, string> = {
  black: '#1b1613',
  darkbrown: '#3a281d',
  brown: '#68472f',
  auburn: '#7c3b22',
  blonde: '#c8a266',
  grey: '#9a9894',
  white: '#dcd8d1',
}

export const IRIS: Record<EyeColor, string> = {
  brown: '#5a3920',
  hazel: '#7b5a2c',
  blue: '#4b78a3',
  green: '#5c7d4b',
  grey: '#76838e',
}

/**
 * Skin palette with clinical colour changes applied. Note how jaundice and
 * pallor are far easier to see in the sclera, conjunctiva and palms of darker
 * skin — the renderer reflects that on purpose.
 */
export function skinPalette(a: Appearance): SkinPalette {
  const t = TONES[a.skinTone]
  const toneFactor = (7 - a.skinTone) / 6 // fair skin shows colour change more
  let base = t.base
  let shadow = t.shadow
  let highlight = t.highlight
  let lip = t.lip
  let palm = t.palm
  let sclera = '#f4f1ea'
  let conjunctiva = '#e0757a'

  if (a.pallor) {
    const p = a.pallor * (0.35 + 0.35 * toneFactor)
    base = mix(base, '#ece4dc', p)
    shadow = mix(shadow, '#c9bdb3', p)
    highlight = mix(highlight, '#f6f1ec', p)
    lip = mix(lip, '#d7b3ad', a.pallor * 0.7)
    palm = mix(palm, '#efe4dc', a.pallor * 0.6)
    conjunctiva = mix(conjunctiva, '#f0d8d4', a.pallor * 0.85)
  }
  if (a.jaundice) {
    const j = a.jaundice * (0.25 + 0.3 * toneFactor)
    base = mix(base, '#e3c04e', j)
    shadow = mix(shadow, '#b58f2c', j * 0.9)
    highlight = mix(highlight, '#f2dc86', j)
    palm = mix(palm, '#e6c95a', a.jaundice * 0.45)
    sclera = mix(sclera, '#e8cf52', Math.min(1, a.jaundice * 0.95))
  }
  if (a.cyanosis) {
    lip = mix(lip, '#6b6f9e', a.cyanosis * 0.75)
  }
  if (a.flushed) {
    base = mix(base, '#e48b77', a.flushed * 0.12 * toneFactor)
  }

  return {
    base,
    shadow,
    deep: darken(shadow, 0.28),
    highlight,
    blush: mix(base, '#d8645c', 0.22 + (a.flushed ?? 0) * 0.25),
    lip,
    nipple: mix(darken(base, 0.35), '#8a4a40', 0.3),
    vein: mix(base, '#4d6fa3', 0.35),
    nail: mix(lighten(base, 0.35), '#f2c4c0', 0.45 - (a.pallor ?? 0) * 0.3),
    palm,
    sclera,
    conjunctiva,
  }
}

export function hairColor(a: Appearance): string {
  if (a.age >= 72 && a.hairColor !== 'white') return HAIR.grey
  return HAIR[a.hairColor]
}
