import * as THREE from 'three'
import type { Appearance } from '../anatomy/types'
import { eyeMaterial } from './eyes'
import type { PartName } from './human'
import { createSkinMaterial, skinLook, type SkinLook } from './skin'

/** Base skin albedo by Fitzpatrick-style tone (sRGB). */
export const SKIN_TONE: Record<Appearance['skinTone'], string> = {
  1: '#f0cfbd',
  2: '#e2b597',
  3: '#c89773',
  4: '#a6714c',
  5: '#7b4c30',
  6: '#51311f',
}

export interface PatientMaterials {
  parts: Record<PartName, THREE.Material>
  eye: THREE.MeshPhysicalMaterial
  /** Live skin uniforms (jaundice, pallor, flush, ...) */
  skin: ReturnType<typeof createSkinMaterial>['uniforms']
  look: SkinLook
}

export function createMaterials(a: Appearance): PatientMaterials {
  const look = skinLook(a, SKIN_TONE[a.skinTone])
  const { material: skin, uniforms } = createSkinMaterial(look)
  const tongue = new THREE.MeshPhysicalMaterial({ name: 'tongue', color: '#c2585c', roughness: 0.38, clearcoat: 0.35, clearcoatRoughness: 0.2 })
  const teeth = new THREE.MeshPhysicalMaterial({ name: 'teeth', color: '#eee6d4', roughness: 0.28, clearcoat: 0.4 })
  const lashes = new THREE.MeshStandardMaterial({ name: 'lashes', color: '#1b1411', roughness: 0.7, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false })
  const hidden = new THREE.MeshBasicMaterial({ visible: false })
  const eye = eyeMaterial(a.eyeColor ?? 'brown', a.jaundice ?? 0)
  return { parts: { body: skin, tongue, teeth, lashes, hairCap: hidden, tights: hidden.clone(), skirt: hidden.clone() }, eye, skin: uniforms, look }
}
