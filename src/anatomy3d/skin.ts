import * as THREE from 'three'
import type { Appearance } from '../anatomy/types'
import regionsAUrl from '../assets/human/regionsA.png?url'
import regionsBUrl from '../assets/human/regionsB.png?url'
import { SIGN_ALBEDO, SIGN_DISPLACE, SIGN_EMISSIVE, SIGN_FRAG_HEADER, SIGN_NORMAL, SIGN_NORMALS, SIGN_VERT_HEADER, type SignUniforms } from './signs'
import { invalidateStages } from './stage'

/**
 * Skin: MeshPhysicalMaterial extended with
 *  - wrapped, reddened diffuse past the terminator (a cheap subsurface look)
 *  - albedo built from anatomy: lips, areolae, nail beds, palms/soles, flushed
 *    cheeks/ears/nose/hands, darker eyelids, brows, stubble/beard and body hair
 *  - pore-scale bump, baked crease occlusion and region-dependent roughness
 *  - live clinical tints: jaundice, pallor, flushing, cyanosis, sweat
 * Region maps and per-vertex attributes come from scripts/human/regions.mjs.
 */

export interface SkinLook {
  tone: string
  hair: string
  /** 0 none, ~0.35 stubble, 1 full beard */
  beard: number
  /** eyebrow density 0..1 */
  brows: number
  /** 0..1 */
  bodyHair: number
  /** body hair on the legs (0 = the shiny hairless shins of arterial disease) */
  legHair: number
  jaundice: number
  pallor: number
  flush: number
  cyanosis: number
  sweat: number
  /** 0 = warm, 1 = cold and mottled (peripheral shutdown) — applied below the knee by the vascular scenes */
  mottle: number
}

let regionTextures: [THREE.Texture, THREE.Texture] | null = null
let white: THREE.DataTexture | null = null
function regions(): [THREE.Texture, THREE.Texture] {
  if (!regionTextures) {
    const load = (url: string) => {
      const t = new THREE.TextureLoader().load(url, invalidateStages)
      // never upload with UNPACK_FLIP_Y (it trips WebGL when a 3D target is allocated later); the shader flips v
      t.flipY = false
      t.colorSpace = THREE.NoColorSpace
      t.anisotropy = 4
      return t
    }
    regionTextures = [load(regionsAUrl), load(regionsBUrl)]
  }
  return regionTextures
}

const HAIR_RGB: Record<Appearance['hairColor'], string> = {
  black: '#1b1512',
  darkbrown: '#2f2019',
  brown: '#4a3222',
  auburn: '#6a2f1a',
  blonde: '#a07d4f',
  grey: '#8c8884',
  white: '#c9c6c1',
}

export function skinLook(a: Appearance, tone: string): SkinLook {
  // clean-shaven men still have a faint shadow over the beard area
  const beard = a.sex === 'male' ? ({ none: 0.24, stubble: 0.45, beard: 1, moustache: 0.55 } as const)[a.facialHair ?? 'none'] : 0
  const browHair = a.hairColor === 'blonde' ? '#6b5236' : a.hairColor === 'white' || a.hairColor === 'grey' ? '#6e6964' : HAIR_RGB[a.hairColor]
  return {
    tone,
    hair: browHair,
    beard,
    brows: a.age > 70 ? 0.7 : 0.92,
    bodyHair: a.sex === 'male' ? (a.age < 17 ? 0.25 : 0.75) : 0.06,
    legHair: 1,
    jaundice: a.jaundice ?? 0,
    pallor: a.pallor ?? 0,
    flush: a.flushed ?? 0,
    cyanosis: a.cyanosis ?? 0,
    sweat: a.sweaty ? 1 : 0,
    mottle: 0,
  }
}

const HEADER = /* glsl */ `
uniform sampler2D uRegA;
uniform sampler2D uRegB;
uniform vec3 uTone;
uniform vec3 uHair;
uniform float uBeard;
uniform float uBrows;
uniform float uBodyHair;
uniform vec2 uLegHair;
uniform vec2 uShiny;
uniform vec4 uLegTintR;
uniform vec4 uLegTintL;
uniform vec2 uLegY;
uniform float uJaundice;
uniform float uPallor;
uniform float uFlush;
uniform float uCyanosis;
uniform float uSweat;
uniform float uMottle;
uniform float uDark;
uniform vec3 uCoverOn;
varying vec3 vCover;
varying float vAO;
varying float vFlush;
varying float vLids;
varying float vHair;
varying vec3 vObj;

float sh_hash( vec3 p ) {
  p = fract( p * 0.3183099 + 0.1 );
  p *= 17.0;
  return fract( p.x * p.y * p.z * ( p.x + p.y + p.z ) );
}
float sh_noise( vec3 x ) {
  vec3 i = floor( x );
  vec3 f = fract( x );
  f = f * f * ( 3.0 - 2.0 * f );
  return mix( mix( mix( sh_hash( i + vec3( 0, 0, 0 ) ), sh_hash( i + vec3( 1, 0, 0 ) ), f.x ),
                   mix( sh_hash( i + vec3( 0, 1, 0 ) ), sh_hash( i + vec3( 1, 1, 0 ) ), f.x ), f.y ),
              mix( mix( sh_hash( i + vec3( 0, 0, 1 ) ), sh_hash( i + vec3( 1, 0, 1 ) ), f.x ),
                   mix( sh_hash( i + vec3( 0, 1, 1 ) ), sh_hash( i + vec3( 1, 1, 1 ) ), f.x ), f.y ), f.z );
}
// Hair follicles: one dot per ~0.8 mm cell, faded to its average density when the
// cells get smaller than a pixel (no shimmer at a distance).
float sh_follicles( vec3 p, float density, float cell ) {
  vec3 q = p / cell;
  vec3 c = floor( q );
  vec3 f = fract( q ) - 0.5;
  float r = sh_hash( c );
  float d = length( f.xy + ( vec2( sh_hash( c + 7.1 ), sh_hash( c + 3.3 ) ) - 0.5 ) * 0.5 );
  float dot_ = step( r, density ) * smoothstep( 0.32, 0.18, d );
  float px = length( fwidth( q ) );
  return mix( dot_, density * 0.28, smoothstep( 0.25, 0.9, px ) );
}
vec3 sh_perturb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
  vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
  vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
  vec3 vN = surf_norm;
  vec3 R1 = cross( vSigmaY, vN );
  vec3 R2 = cross( vN, vSigmaX );
  float fDet = dot( vSigmaX, R1 ) * faceDirection;
  vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
  return normalize( abs( fDet ) * surf_norm - vGrad );
}
`

const ALBEDO = /* glsl */ `
  if ( dot( step( 0.999, vCover ), uCoverOn ) > 0.5 ) discard; // under the briefs or gown
  vec2 regUv = vec2( vMapUv.x, 1.0 - vMapUv.y );
  vec4 regA = texture2D( uRegA, regUv );
  vec4 regB = texture2D( uRegB, regUv );
  vec3 skin = uTone;
  // broad mottling and a hint of freckling/vessel variation
  float n1 = sh_noise( vObj * 3.1 );
  float n2 = sh_noise( vObj * 17.0 );
  skin *= 0.94 + 0.08 * n1 + 0.04 * n2;
  // flush: cheeks, nose, ears, hands, knees (less visible on darker skin)
  float flushAmt = clamp( vFlush * ( 0.45 + uFlush * 0.7 ) * ( 1.0 - uPallor * 0.8 ), 0.0, 1.0 );
  skin = mix( skin, skin * vec3( 1.1, 0.82, 0.8 ), flushAmt * ( 1.0 - uDark * 0.6 ) );
  // eyelids a touch darker and cooler
  skin = mix( skin, skin * vec3( 0.84, 0.78, 0.82 ), vLids * 0.5 );
  // palms and soles: a touch pinker in fair skin, much lighter (a warm pinkish brown) in dark skin
  vec3 palmCol = mix( skin * vec3( 1.03, 0.93, 0.9 ), vec3( 0.55, 0.3, 0.2 ), uDark * 0.85 );
  skin = mix( skin, palmCol, regB.a * ( 0.4 + uDark * 0.6 ) );
  // areolae, lips and nail beds
  skin = mix( skin, skin * vec3( 0.66, 0.5, 0.46 ), regB.g * 0.85 );
  vec3 lip = mix( skin * vec3( 0.86, 0.52, 0.52 ), skin * vec3( 0.78, 0.6, 0.64 ), uDark );
  lip = mix( lip, vec3( 0.2, 0.2, 0.34 ) * ( 0.6 + 0.4 * ( 1.0 - uDark ) ), uCyanosis * 0.75 );
  skin = mix( skin, lip, regB.r * 0.9 );
  vec3 nail = mix( vec3( 0.83, 0.62, 0.6 ), vec3( 0.55, 0.55, 0.7 ), uCyanosis * 0.7 );
  skin = mix( skin, nail * ( 1.0 - uPallor * 0.1 ), regB.b * 0.85 );
  // pallor: blood drains from the skin, most from lips, nail beds and cheeks
  float lum = dot( skin, vec3( 0.299, 0.587, 0.114 ) );
  skin = mix( skin, vec3( lum ) * vec3( 1.05, 1.02, 0.98 ) * 1.06, uPallor * ( 0.35 + 0.35 * ( regB.r + regB.b ) ) );
  // jaundice
  skin = mix( skin, skin * vec3( 1.04, 0.93, 0.42 ) + vec3( 0.03, 0.02, 0.0 ), uJaundice * 0.7 * ( 1.0 - uDark * 0.5 ) );
  // cold, mottled peripheries (livedo)
  float livedo = smoothstep( 0.45, 0.62, sh_noise( vObj * 9.0 ) ) * smoothstep( 0.35, 0.5, sh_noise( vObj * 4.0 + 3.0 ) );
  skin = mix( skin, skin * vec3( 0.78, 0.7, 0.86 ), uMottle * livedo * 0.8 * smoothstep( 5.0, 3.6, vObj.y ) );
  // hair: brows, stubble/beard, body hair (not on the scalp: that's the hair model)
  vec3 hairCol = uHair;
  skin = mix( skin, hairCol, clamp( regA.r * 1.25, 0.0, 1.0 ) * uBrows * 0.92 );
  float beard = regA.g * uBeard;
  float stubble = sh_follicles( vObj, clamp( beard * 1.3, 0.0, 0.95 ), 0.0075 );
  skin = mix( skin, hairCol * 0.55 + skin * 0.1, stubble * 0.8 );
  skin = mix( skin, skin * 0.86, beard * 0.25 ); // follicles under the skin read as a blue-grey shadow
  // each leg on its own below the knee: hair loss, and pallor / rubor / cyanosis strongest at the foot
  bool rightSide = vObj.x < 0.0;
  float legHair = rightSide ? uLegHair.x : uLegHair.y;
  vec4 legTint = rightSide ? uLegTintR : uLegTintL;
  float distal = smoothstep( uLegY.x + 0.4, uLegY.y - 0.2, vObj.y );
  skin = mix( skin, skin * legTint.rgb, clamp( legTint.a * ( 0.25 + 0.75 * distal ), 0.0, 1.0 ) * step( vObj.y, uLegY.x + 0.6 ) );
  float bodyHair = vHair * uBodyHair * ( vObj.y < 8.0 ? legHair : 1.0 );
  float hairs = sh_follicles( vObj * vec3( 1.0, 0.35, 1.0 ), bodyHair * 0.55, 0.012 );
  skin = mix( skin, hairCol * 0.7, hairs * 0.55 );
  diffuseColor.rgb = skin;
`

const ROUGH = /* glsl */ `
  float roughnessFactor = roughness;
  roughnessFactor = mix( roughnessFactor, 0.34, regB.r );          // lips
  roughnessFactor = mix( roughnessFactor, 0.24, regB.b );          // nails
  roughnessFactor = mix( roughnessFactor, roughnessFactor * 0.82, vFlush * 0.4 ); // oilier nose/cheeks
  roughnessFactor = mix( roughnessFactor, 0.36, uSweat * 0.6 );
  roughnessFactor = mix( roughnessFactor, 0.32, ( vObj.x < 0.0 ? uShiny.x : uShiny.y ) * step( vObj.y, 5.5 ) * vHair ); // shiny, thin skin over the shins
  roughnessFactor = mix( roughnessFactor, 0.3, sgGloss );          // moist ulcer beds, shiny scars
`

const PORES = /* glsl */ `
  {
    float h = sh_noise( vObj * 190.0 ) * 0.6 + sh_noise( vObj * 57.0 ) * 0.4;
    vec2 dH = vec2( dFdx( h ), dFdy( h ) ) * 0.0045 * ( 1.0 - regB.r * 0.6 - regB.b );
    normal = sh_perturb( - vViewPosition, normal, dH, faceDirection );
  }
`

export function createSkinMaterial(look: SkinLook, signs: SignUniforms) {
  const [regA, regB] = regions()
  const tone = new THREE.Color(look.tone)
  const lum = 0.299 * tone.r + 0.587 * tone.g + 0.114 * tone.b
  const uniforms = {
    uRegA: { value: regA },
    uRegB: { value: regB },
    uTone: { value: tone },
    uHair: { value: new THREE.Color(look.hair) },
    uBeard: { value: look.beard },
    uBrows: { value: look.brows },
    uBodyHair: { value: look.bodyHair },
    uLegHair: { value: new THREE.Vector2(look.legHair, look.legHair) },
    uShiny: { value: new THREE.Vector2(0, 0) },
    /** per leg: colour multiplier (rgb) and strength (a), strongest at the foot */
    uLegTintR: { value: new THREE.Vector4(1, 1, 1, 0) },
    uLegTintL: { value: new THREE.Vector4(1, 1, 1, 0) },
    /** knee and ankle heights (rest pose) */
    uLegY: { value: new THREE.Vector2(5, 0.8) },
    uJaundice: { value: look.jaundice },
    uPallor: { value: look.pallor },
    uFlush: { value: look.flush },
    uCyanosis: { value: look.cyanosis },
    uSweat: { value: look.sweat },
    uMottle: { value: look.mottle },
    uDark: { value: THREE.MathUtils.clamp((0.62 - lum) / 0.45, 0, 1) },
    /** (briefs, gown top, lifted gown) worn: hide the skin well inside them */
    uCoverOn: { value: new THREE.Vector3() },
  }
  // a 1×1 white map switches on the UV varyings; the shader below replaces its sampling
  white ??= Object.assign(new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1), { needsUpdate: true })
  const m = new THREE.MeshPhysicalMaterial({
    name: 'skin',
    map: white,
    roughness: 0.52,
    metalness: 0,
    sheen: 0.3,
    sheenRoughness: 0.5,
    sheenColor: new THREE.Color('#ffb9a6'),
    // sweat: a fine sheen rather than a wet look
    clearcoat: 0.04 + look.sweat * 0.14,
    clearcoatRoughness: 0.4 - look.sweat * 0.12,
    specularIntensity: 0.55,
  })
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms, signs)
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
attribute float aAO;
attribute float aFlush;
attribute float aLids;
attribute float aHair;
attribute vec3 aCover;
varying float vAO;
varying float vFlush;
varying float vLids;
varying float vHair;
varying vec3 vCover;
varying vec3 vObj;
${SIGN_VERT_HEADER}`,
      )
      .replace('#include <morphnormal_vertex>', `#include <morphnormal_vertex>\n${SIGN_NORMAL}`)
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
vAO = aAO; vFlush = aFlush; vLids = aLids; vHair = aHair; vCover = aCover; vObj = position;
${SIGN_DISPLACE}`,
      )
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${HEADER}\n${SIGN_FRAG_HEADER}`)
      .replace('#include <map_fragment>', ALBEDO.replace('diffuseColor.rgb = skin;', `${SIGN_ALBEDO}\n  diffuseColor.rgb = skin;`))
      .replace('#include <roughnessmap_fragment>', ROUGH)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>\n${PORES}\n${SIGN_NORMALS}`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\n${SIGN_EMISSIVE}`)
      .replace(
        '#include <aomap_fragment>',
        `#include <aomap_fragment>
  float occ = mix( 1.0, vAO, 0.9 );
  reflectedLight.indirectDiffuse *= occ;
  reflectedLight.indirectSpecular *= mix( 1.0, vAO, 0.7 );`,
      )
      .replace(
        '#include <lights_physical_pars_fragment>',
        THREE.ShaderChunk.lights_physical_pars_fragment.replace(
          'reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );',
          `float sssNL = dot( geometryNormal, directLight.direction );
	float sssWrap = saturate( ( sssNL + 0.42 ) / 1.42 );
	vec3 sssBleed = vec3( 0.55, 0.14, 0.08 ) * max( sssWrap - saturate( sssNL ), 0.0 );
	reflectedLight.directDiffuse += ( sssWrap + sssBleed ) * directLight.color * BRDF_Lambert( material.diffuseColor ) * mix( 1.0, vAO, 0.35 );`,
        ),
      )
  }
  m.customProgramCacheKey = () => 'bedside-skin-v7'
  return { material: m, uniforms }
}
