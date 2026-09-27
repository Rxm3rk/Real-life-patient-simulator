import * as THREE from 'three'
import type { RegionId } from '../anatomy/bodyModel'
import type { Appearance, HerniaBulge, ScarId } from '../anatomy/types'
import { REGION_ORDER } from '../anatomy/bodyModel'
import type { Anatomy } from './anatomy'

/**
 * Clinical signs drawn on the 3D patient, shared by the skin and the clothes:
 *  - bulges: smooth displacements of the surface (hernias, goitre lobes, cysts,
 *    lumps, a pulsatile mass), animated for cough impulses and swallowing
 *  - patches: coloured areas (ulcers, gangrene, bruising, spider naevi, caput
 *    medusae, erythema, pigmentation, a punctum)
 *  - scars: line segments on the skin
 *  - the nine-region grid over the abdomen, with palpated regions tinted
 * All positions are in rest-pose body space, so signs move with every pose.
 */

export const MAX_BULGES = 12
export const MAX_PATCHES = 16
export const MAX_SEGS = 28
export const MAX_RIPPLES = 6
export const MAX_VEINS = 24

export type PatchKind = 'tint' | 'ulcer' | 'gangrene' | 'bruise' | 'spider' | 'caput' | 'punctum' | 'pigment' | 'striae' | 'peau' | 'eczema' | 'glow'
const PATCH_CODE: Record<PatchKind, number> = { tint: 0, ulcer: 1, gangrene: 2, bruise: 3, spider: 4, caput: 5, punctum: 6, pigment: 7, striae: 8, peau: 9, eczema: 10, glow: 11 }

export interface Bulge {
  id: string
  at: THREE.Vector3
  /** radius of influence, decimetres */
  r: number
  /** height, decimetres (negative = a dimple) */
  h: number
  /** stretch along x / y (ellipsoidal footprint) */
  sx?: number
  sy?: number
}

export interface Patch {
  at: THREE.Vector3
  r: number
  kind: PatchKind
  color?: THREE.ColorRepresentation
  strength?: number
}

export interface Segment {
  a: THREE.Vector3
  b: THREE.Vector3
  width: number
  fresh?: boolean
}

/** A stretch of superficial vein: tortuous (a wiggle across its course) and raised when it fills. */
export interface Vein {
  a: THREE.Vector3
  b: THREE.Vector3
  /** half-width, decimetres */
  width: number
  /** outward skin normal along the stretch (the wiggle runs across the course, in the skin) */
  normal: THREE.Vector3
  /** sideways wiggle amplitude (dm) and its phase */
  wiggle: number
  phase: number
}

export function createSignUniforms() {
  return {
    uBulgeC: { value: Array.from({ length: MAX_BULGES }, () => new THREE.Vector4()) },
    uBulgeP: { value: Array.from({ length: MAX_BULGES }, () => new THREE.Vector4()) },
    uBulgeN: { value: 0 },
    uPatchC: { value: Array.from({ length: MAX_PATCHES }, () => new THREE.Vector4()) },
    uPatchK: { value: Array.from({ length: MAX_PATCHES }, () => new THREE.Vector4()) },
    uPatchN: { value: 0 },
    uSegA: { value: Array.from({ length: MAX_SEGS }, () => new THREE.Vector4()) },
    uSegB: { value: Array.from({ length: MAX_SEGS }, () => new THREE.Vector4()) },
    uSegN: { value: 0 },
    // region grid: x = on, y = mcl, z = subcostal y, w = transtubercular y
    uGrid: { value: new THREE.Vector4() },
    // x = xiphoid y, y = pubis y, z = |asis x|, w = asis y
    uGrid2: { value: new THREE.Vector4() },
    // front of the abdomen (navel z) for limiting the grid to the anterior wall
    uGridZ: { value: 0 },
    uRegion: { value: Array.from({ length: 9 }, () => 0) },
    // touch feedback: expanding rings on the skin (xyz, age in s; rgb, final radius)
    uRipA: { value: Array.from({ length: MAX_RIPPLES }, () => new THREE.Vector4()) },
    uRipB: { value: Array.from({ length: MAX_RIPPLES }, () => new THREE.Vector4()) },
    uRipN: { value: 0 },
    // varicose veins: a (xyz, half-width), b (xyz, wiggle), normal (xyz, phase); fill 0 (lying) .. 1 (standing)
    uVeinA: { value: Array.from({ length: MAX_VEINS }, () => new THREE.Vector4()) },
    uVeinB: { value: Array.from({ length: MAX_VEINS }, () => new THREE.Vector4()) },
    uVeinC: { value: Array.from({ length: MAX_VEINS }, () => new THREE.Vector4()) },
    uVeinN: { value: 0 },
    uVeinFill: { value: 1 },
  }
}
export type SignUniforms = ReturnType<typeof createSignUniforms>

/* ------------------------------------------------------------------ GLSL */

export const SIGN_VERT_HEADER = /* glsl */ `
uniform vec4 uBulgeC[${MAX_BULGES}];
uniform vec4 uBulgeP[${MAX_BULGES}];
uniform int uBulgeN;
float sg_bump( vec3 p ) {
  float h = 0.0;
  for ( int i = 0; i < ${MAX_BULGES}; i++ ) {
    if ( i >= uBulgeN ) break;
    vec3 d = p - uBulgeC[i].xyz;
    d.x /= max( uBulgeP[i].y, 0.05 );
    d.y /= max( uBulgeP[i].z, 0.05 );
    float r = uBulgeC[i].w;
    float q = dot( d, d ) / ( r * r );
    // a smooth dome: flat-topped for big swellings, still smooth at the base
    h += uBulgeP[i].x * exp( -q * 1.6 ) * ( 1.0 + 0.25 * exp( -q * 6.0 ) );
  }
  return h;
}
`

/** Perturb the rest normal by the bump's slope (before skinning). */
export const SIGN_NORMAL = /* glsl */ `
  if ( uBulgeN > 0 ) {
    vec3 sgN = normalize( objectNormal );
    vec3 sgT = normalize( abs( sgN.y ) < 0.9 ? cross( sgN, vec3( 0.0, 1.0, 0.0 ) ) : cross( sgN, vec3( 1.0, 0.0, 0.0 ) ) );
    vec3 sgB = cross( sgN, sgT );
    float e = 0.02;
    float h0 = sg_bump( position );
    float hT = sg_bump( position + sgT * e );
    float hB = sg_bump( position + sgB * e );
    objectNormal = normalize( sgN - sgT * ( hT - h0 ) / e - sgB * ( hB - h0 ) / e );
  }
`

export const SIGN_DISPLACE = /* glsl */ `
  if ( uBulgeN > 0 ) transformed += normalize( normal ) * sg_bump( position );
`

export const SIGN_FRAG_HEADER = /* glsl */ `
uniform vec4 uBulgeC[${MAX_BULGES}];
uniform vec4 uBulgeP[${MAX_BULGES}];
uniform int uBulgeN;
uniform vec4 uPatchC[${MAX_PATCHES}];
uniform vec4 uPatchK[${MAX_PATCHES}];
uniform int uPatchN;
uniform vec4 uSegA[${MAX_SEGS}];
uniform vec4 uSegB[${MAX_SEGS}];
uniform int uSegN;
uniform vec4 uGrid;
uniform vec4 uGrid2;
uniform float uGridZ;
uniform float uRegion[9];
uniform vec4 uRipA[${MAX_RIPPLES}];
uniform vec4 uRipB[${MAX_RIPPLES}];
uniform int uRipN;
uniform vec4 uVeinA[${MAX_VEINS}];
uniform vec4 uVeinB[${MAX_VEINS}];
uniform vec4 uVeinC[${MAX_VEINS}];
uniform int uVeinN;
uniform float uVeinFill;
float sg_segDist( vec3 p, vec3 a, vec3 b ) {
  vec3 ab = b - a;
  float t = clamp( dot( p - a, ab ) / max( dot( ab, ab ), 1e-6 ), 0.0, 1.0 );
  return length( p - a - ab * t );
}
float sg_h( vec3 p ) { p = fract( p * 0.3183 + 0.1 ); p *= 17.0; return fract( p.x * p.y * p.z * ( p.x + p.y + p.z ) ); }
float sg_n( vec3 x ) {
  vec3 i = floor( x ); vec3 f = fract( x ); f = f * f * ( 3.0 - 2.0 * f );
  return mix( mix( mix( sg_h( i ), sg_h( i + vec3( 1, 0, 0 ) ), f.x ), mix( sg_h( i + vec3( 0, 1, 0 ) ), sg_h( i + vec3( 1, 1, 0 ) ), f.x ), f.y ),
              mix( mix( sg_h( i + vec3( 0, 0, 1 ) ), sg_h( i + vec3( 1, 0, 1 ) ), f.x ), mix( sg_h( i + vec3( 0, 1, 1 ) ), sg_h( i + vec3( 1, 1, 1 ) ), f.x ), f.y ), f.z );
}
`

/** Colour: patches, scars, and the region grid (applied after the skin albedo). */
export const SIGN_ALBEDO = /* glsl */ `
  float sgGloss = 0.0;
  vec3 sgGlow = vec3( 0.0 );
  // raised relief (scars, veins), turned into a normal perturbation later
  float sgRelief = 0.0;
  // swellings: a soft shadow where the dome meets the skin, a touch of sheen over the top (it's how a lump reads)
  for ( int i = 0; i < ${MAX_BULGES}; i++ ) {
    if ( i >= uBulgeN ) break;
    float hgt = uBulgeP[i].x;
    if ( hgt <= 0.0 ) continue;
    vec3 d = vObj - uBulgeC[i].xyz;
    d.x /= max( uBulgeP[i].y, 0.05 );
    d.y /= max( uBulgeP[i].z, 0.05 );
    float rr = sqrt( dot( d, d ) ) / uBulgeC[i].w;
    float k = clamp( hgt / 0.08, 0.0, 1.0 );
    skin *= 1.0 - 0.2 * k * exp( -pow( ( rr - 1.2 ) / 0.32, 2.0 ) );
    sgGloss = max( sgGloss, 0.25 * k * exp( -rr * rr * 3.0 ) );
  }
  // screen-space footprint of a pixel, taken outside any branch (derivatives need uniform control flow)
  float sgPx = max( length( fwidth( vObj ) ), 1e-4 );
  for ( int i = 0; i < ${MAX_PATCHES}; i++ ) {
    if ( i >= uPatchN ) break;
    vec3 c = uPatchC[i].xyz;
    float r = uPatchC[i].w;
    vec3 col = uPatchK[i].rgb;
    float kind = floor( uPatchK[i].a );
    float str = fract( uPatchK[i].a ) * 1.25;
    float d = length( vObj - c ) / r;
    if ( d > 1.6 ) continue;
    float wob = ( sg_n( vObj * 22.0 + float( i ) ) - 0.5 ) * 0.35;
    if ( kind < 0.5 ) {                 // soft tint (erythema, pallor, rubor)
      skin = mix( skin, skin * col, smoothstep( 1.0, 0.3, d + wob * 0.5 ) * str );
    } else if ( kind < 1.5 ) {          // ulcer: sloughy base, rolled pink edge, surrounding pigmentation
      float e = d + wob;
      vec3 base = mix( vec3( 0.55, 0.08, 0.07 ), vec3( 0.78, 0.66, 0.28 ), smoothstep( 0.35, 0.8, sg_n( vObj * 60.0 ) ) * 0.7 );
      skin = mix( skin, skin * vec3( 0.72, 0.52, 0.42 ), smoothstep( 1.55, 1.0, e ) * 0.6 );
      skin = mix( skin, vec3( 0.78, 0.42, 0.40 ), smoothstep( 1.02, 0.9, e ) * smoothstep( 0.72, 0.86, e ) );
      skin = mix( skin, base, smoothstep( 0.86, 0.74, e ) );
      sgGloss = max( sgGloss, smoothstep( 0.86, 0.6, e ) );
    } else if ( kind < 2.5 ) {          // dry gangrene: black, leathery, with a red demarcation line
      float e = d + wob * 0.6;
      skin = mix( skin, vec3( 0.55, 0.12, 0.1 ), smoothstep( 1.15, 1.0, e ) * smoothstep( 0.8, 0.95, e ) );
      skin = mix( skin, vec3( 0.05, 0.035, 0.03 ) * ( 0.8 + 0.4 * sg_n( vObj * 80.0 ) ), smoothstep( 0.95, 0.85, e ) );
    } else if ( kind < 3.5 ) {          // bruising: blue-purple centre, green-yellow edge
      float e = d + wob;
      skin = mix( skin, skin * vec3( 0.86, 0.9, 0.62 ), smoothstep( 1.2, 0.7, e ) * 0.5 * str );
      skin = mix( skin, skin * vec3( 0.62, 0.48, 0.7 ), smoothstep( 0.85, 0.2, e ) * 0.85 * str );
    } else if ( kind < 4.5 ) {          // spider naevus: a red arteriole with radiating legs
      vec3 v = vObj - c;
      float ang = atan( v.y, v.x );
      float legs = pow( abs( sin( ang * 3.5 + sg_h( c ) * 6.0 ) ), 40.0 ) * smoothstep( 1.0, 0.2, d );
      float dot_ = smoothstep( 0.22, 0.1, d );
      skin = mix( skin, vec3( 0.72, 0.1, 0.1 ), max( dot_, legs * 0.7 ) );
    } else if ( kind < 5.5 ) {          // caput medusae: tortuous veins radiating from the umbilicus
      vec3 v = vObj - c;
      float ang = atan( v.y, v.x ) + sin( length( v.xy ) * 18.0 ) * 0.25;
      float vein = pow( abs( sin( ang * 3.0 ) ), 28.0 ) * smoothstep( 1.0, 0.25, d ) * smoothstep( 0.12, 0.3, d );
      skin = mix( skin, skin * vec3( 0.55, 0.6, 0.85 ), vein * 0.8 );
    } else if ( kind < 6.5 ) {          // punctum over an epidermoid cyst
      skin = mix( skin, vec3( 0.12, 0.09, 0.08 ), smoothstep( 0.5, 0.2, d ) );
    } else if ( kind < 7.5 ) {          // pigmentation (haemosiderin), mottled
      float m = smoothstep( 0.35, 0.65, sg_n( vObj * 14.0 ) );
      skin = mix( skin, skin * col, smoothstep( 1.1, 0.4, d + wob * 0.6 ) * ( 0.55 + 0.45 * m ) * str );
    } else if ( kind < 8.5 ) {          // striae: pale-purple streaks
      vec3 v = vObj - c;
      float s = pow( abs( sin( ( v.y * 0.35 + v.x ) * 36.0 + sg_n( vObj * 6.0 ) * 3.0 ) ), 12.0 );
      skin = mix( skin, skin * vec3( 0.95, 0.82, 0.92 ), s * smoothstep( 1.0, 0.4, d ) * 0.7 );
    } else if ( kind < 9.5 ) {          // peau d'orange: oedematous skin pitted at the hair follicles
      float m = smoothstep( 1.0, 0.45, d + wob * 0.4 ) * str;
      float pits = smoothstep( 0.58, 0.82, sg_n( vObj * 70.0 ) );
      skin = mix( skin, skin * vec3( 1.05, 0.88, 0.8 ), m * 0.5 );
      skin = mix( skin, skin * 0.7, pits * m * 0.65 );
      sgRelief = max( sgRelief, ( 1.0 - pits ) * m * 0.5 );
    } else if ( kind < 10.5 ) {         // venous eczema: red-brown, rough and scaly
      float m = smoothstep( 1.05, 0.35, d + wob ) * str;
      float scale = smoothstep( 0.55, 0.75, sg_n( vObj * 70.0 ) );
      skin = mix( skin, skin * vec3( 1.02, 0.7, 0.62 ), m * ( 0.55 + 0.25 * sg_n( vObj * 18.0 ) ) );
      skin = mix( skin, mix( skin, vec3( 0.93, 0.86, 0.8 ), 0.5 ), scale * m * 0.5 );
    } else {                            // light passing through (a transilluminating lump)
      float m = smoothstep( 1.0, 0.1, d ) * str;
      sgGlow += col * m * m * 1.4;
      skin = mix( skin, col, m * 0.35 );
    }
  }
  for ( int i = 0; i < ${MAX_SEGS}; i++ ) {
    if ( i >= uSegN ) break;
    float w = uSegA[i].w;
    float sd = sg_segDist( vObj, uSegA[i].xyz, uSegB[i].xyz );
    if ( sd > w * 3.0 ) continue;
    // healed scars are pale, faintly pink and shiny in fair skin; lighter (or darker) than the skin around them in dark skin
    vec3 healed = mix( mix( skin * vec3( 1.12, 0.94, 0.94 ), vec3( 0.95, 0.74, 0.72 ), 0.6 ), skin * vec3( 1.45, 1.3, 1.25 ), uDark );
    vec3 scar = uSegB[i].w > 0.5 ? vec3( 0.72, 0.3, 0.32 ) : healed;
    float core = smoothstep( w, w * 0.35, sd );
    skin = mix( skin, scar, core );
    // a fine darker margin where the scar meets normal skin
    skin = mix( skin, skin * 0.9, smoothstep( w * 1.8, w * 1.1, sd ) * ( 1.0 - core ) * 0.6 );
    sgRelief = max( sgRelief, smoothstep( w * 1.1, w * 0.1, sd ) * 0.6 );
    // suture marks either side of a fresh wound
    if ( uSegB[i].w > 0.5 ) skin = mix( skin, skin * 0.8, smoothstep( w * 2.2, w * 1.6, sd ) * step( 0.7, fract( dot( vObj, uSegB[i].xyz - uSegA[i].xyz ) * 40.0 ) ) );
    sgGloss = max( sgGloss, smoothstep( w, w * 0.3, sd ) * 0.5 );
  }
  // the nine-region grid over the anterior abdominal wall
  if ( uGrid.x > 0.5 && vObj.z > uGridZ - 0.75 ) {
    float mcl = uGrid.y;
    float asisX = uGrid2.z;
    float lig = uGrid2.y + ( uGrid2.w - uGrid2.y ) * clamp( abs( vObj.x ) / asisX, 0.0, 1.0 );
    bool inAbdo = vObj.y < uGrid2.x - abs( vObj.x ) * 0.55 + 0.15 && vObj.y > lig - 0.05;
    if ( inAbdo ) {
      int col = vObj.x < -mcl ? 0 : ( vObj.x > mcl ? 2 : 1 );
      int row = vObj.y > uGrid.z ? 0 : ( vObj.y > uGrid.w ? 1 : 2 );
      float st = uRegion[row * 3 + col];
      if ( st > 0.5 ) {
        // palpated regions: a gentle colour cast that keeps the skin's own shading and tone
        vec3 tint = st > 1.5 ? vec3( 0.78, 1.12, 1.05 ) : vec3( 0.84, 0.95, 1.22 );
        skin *= mix( vec3( 1.0 ), tint, 0.55 );
        sgGlow += ( tint - 0.75 ) * 0.012;
      }
      // dashed lines a few millimetres wide, anti-aliased at any zoom
      float w = max( 0.014, sgPx * 1.2 );
      float dash = smoothstep( 0.4, 0.46, fract( ( vObj.x + vObj.y ) * 4.0 ) );
      float line = max( max( smoothstep( w, w * 0.4, abs( abs( vObj.x ) - mcl ) ), smoothstep( w, w * 0.4, abs( vObj.y - uGrid.z ) ) ), smoothstep( w, w * 0.4, abs( vObj.y - uGrid.w ) ) );
      skin = mix( skin, vec3( 1.0 ), line * dash * 0.55 );
      sgGlow += vec3( 0.22 ) * line * dash;
    }
  }
  // varicose veins: tortuous blue cords that fill on standing
  float sgVeinH = 0.0;
  for ( int i = 0; i < ${MAX_VEINS}; i++ ) {
    if ( i >= uVeinN ) break;
    vec3 a = uVeinA[i].xyz;
    vec3 ab = uVeinB[i].xyz - a;
    float len2 = max( dot( ab, ab ), 1e-6 );
    float t = clamp( dot( vObj - a, ab ) / len2, 0.0, 1.0 );
    vec3 v = vObj - a - ab * t;
    vec3 across = normalize( cross( ab, uVeinC[i].xyz ) );
    float along = t * sqrt( len2 );
    float wig = uVeinB[i].w * ( sin( along * 26.0 + uVeinC[i].w ) + 0.45 * sin( along * 61.0 + uVeinC[i].w * 2.3 ) );
    float dist = length( v - across * wig );
    float w = uVeinA[i].w * ( 0.55 + 0.45 * uVeinFill );
    sgVeinH = max( sgVeinH, smoothstep( w, w * 0.2, dist ) );
  }
  sgVeinH *= 0.35 + 0.65 * uVeinFill;
  skin = mix( skin, skin * vec3( 0.52, 0.64, 1.02 ), sgVeinH * 0.72 );
  sgRelief = max( sgRelief, sgVeinH );

  // touch feedback rings
  for ( int i = 0; i < ${MAX_RIPPLES}; i++ ) {
    if ( i >= uRipN ) break;
    float age = uRipA[i].w;
    float k = age / 0.75;
    if ( k < 0.0 || k > 1.0 ) continue;
    float R = uRipB[i].w * ( 0.2 + 0.8 * ( 1.0 - pow( 1.0 - k, 3.0 ) ) );
    float d = length( vObj - uRipA[i].xyz );
    float ring = smoothstep( max( 0.02, sgPx * 1.5 ), 0.0, abs( d - R ) ) * ( 1.0 - k );
    skin = mix( skin, uRipB[i].rgb, ring * 0.7 );
    sgGlow += uRipB[i].rgb * ring * 0.6;
  }
`

/** Raised veins and scars: tilt the normal by the slope of their relief. */
export const SIGN_NORMALS = /* glsl */ `
  if ( uVeinN > 0 || uSegN > 0 || uPatchN > 0 ) normal = sh_perturb( - vViewPosition, normal, vec2( dFdx( sgRelief ), dFdy( sgRelief ) ) * 0.05, faceDirection );
`

/** Glow from the grid and touch rings (after the emissive map, so it reads in shadow too). */
export const SIGN_EMISSIVE = /* glsl */ `
  totalEmissiveRadiance += sgGlow;
`

/* -------------------------------------------------------------- building */

const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)

/** Scar courses as polylines over the rest-pose body (patient's right = −x). */
export function scarPaths(id: ScarId, A: Anatomy): THREE.Vector3[][] {
  const { xiphoid: X, navel: N, pubis: P, asisR, asisL, sternalNotch: S } = A
  const mcb = N.clone().lerp(asisR, 2 / 3) // McBurney's point
  const z = N.z + 0.4
  const line = (a: THREE.Vector3, b: THREE.Vector3, n = 6) => Array.from({ length: n + 1 }, (_, i) => a.clone().lerp(b, i / n))
  const curve = (pts: THREE.Vector3[], n = 12) => new THREE.CatmullRomCurve3(pts).getPoints(n)
  const around = (from: THREE.Vector3, to: THREE.Vector3) => curve([from, v3(0.16, N.y + 0.2, z), v3(0.2, N.y, z), v3(0.16, N.y - 0.2, z), to], 10) // skirting the umbilicus
  const subcostal = (s: 1 | -1) => curve([v3(0.25 * s, X.y - 0.3, z), v3(0.9 * s, X.y - 0.6, z), v3(1.55 * s, X.y - 1.05, z - 0.3)], 10)
  switch (id) {
    case 'lanz':
      return [line(mcb.clone().add(v3(0.3, -0.12, 0)), mcb.clone().add(v3(-0.25, 0.02, 0)))]
    case 'gridiron': {
      const along = asisR.clone().sub(N).normalize()
      const perp = v3(-along.y, along.x, 0)
      return [line(mcb.clone().addScaledVector(perp, 0.32), mcb.clone().addScaledVector(perp, -0.32))]
    }
    case 'kocher':
      return [subcostal(-1)]
    case 'midline':
      return [[...line(v3(0, X.y - 0.1, z), v3(0, N.y + 0.3, z), 4), ...around(v3(0, N.y + 0.3, z), v3(0, N.y - 0.3, z)), ...line(v3(0, N.y - 0.3, z), v3(0, P.y + 0.25, z), 4)]]
    case 'upper-midline':
      return [[...line(v3(0, X.y - 0.1, z), v3(0, N.y + 0.3, z), 4), ...around(v3(0, N.y + 0.3, z), v3(0, N.y - 0.05, z))]]
    case 'lower-midline':
      return [[...around(v3(0, N.y + 0.05, z), v3(0, N.y - 0.3, z)), ...line(v3(0, N.y - 0.3, z), v3(0, P.y + 0.25, z), 4)]]
    case 'pfannenstiel':
      return [curve([v3(-0.62, P.y + 0.42, z), v3(-0.3, P.y + 0.26, z), v3(0, P.y + 0.22, z), v3(0.3, P.y + 0.26, z), v3(0.62, P.y + 0.42, z)], 10)]
    case 'lap-chole':
      return [
        line(v3(-0.06, N.y - 0.18, z), v3(0.06, N.y - 0.2, z), 1),
        line(v3(-0.18, X.y - 0.35, z), v3(-0.05, X.y - 0.38, z), 1),
        line(v3(-A.mcl - 0.03, X.y - 0.7, z), v3(-A.mcl + 0.03, X.y - 0.72, z), 1),
        line(v3(-A.mcl - 0.75, X.y - 1.1, z), v3(-A.mcl - 0.7, X.y - 1.13, z), 1),
      ]
    case 'lap-appendix':
      return [line(v3(-0.06, N.y - 0.18, z), v3(0.06, N.y - 0.2, z), 1), line(v3(-0.04, P.y + 0.35, z), v3(0.04, P.y + 0.35, z), 1), line(asisL.clone().lerp(N, 0.45), asisL.clone().lerp(N, 0.45).add(v3(0.06, -0.02, 0)), 1)]
    case 'rooftop':
      return [subcostal(-1), subcostal(1), line(v3(-0.25, X.y - 0.3, z), v3(0.25, X.y - 0.3, z), 2)]
    case 'mercedes':
      return [subcostal(-1), subcostal(1), line(v3(-0.25, X.y - 0.3, z), v3(0.25, X.y - 0.3, z), 2), line(v3(0, X.y - 0.3, z), v3(0, S.y - 0.4, z + 0.2), 5)]
    case 'right-paramedian':
      return [line(v3(-0.3, X.y - 0.35, z), v3(-0.3, N.y - 0.6, z), 8)]
    case 'right-inguinal':
    case 'left-inguinal': {
      const s = id === 'left-inguinal' ? 1 : -1
      const tub = s === 1 ? A.pubicTubercleL : A.pubicTubercleR
      const asis = s === 1 ? asisL : asisR
      return [line(tub.clone().lerp(asis, 0.2).add(v3(0, 0.22, 0.1)), tub.clone().lerp(asis, 0.72).add(v3(0, 0.22, 0.1)), 6)]
    }
    case 'rutherford-morison-right':
      return [curve([asisR.clone().add(v3(-0.1, 0.55, -0.2)), asisR.clone().add(v3(0.15, 0.05, 0.1)), A.pubicTubercleR.clone().add(v3(-0.25, 0.3, 0.1))], 10)]
    case 'left-loin':
      return [curve([v3(1.35, X.y - 1.1, N.z - 1.5), v3(1.6, X.y - 1.45, N.z - 0.9), v3(1.55, X.y - 1.7, N.z - 0.3)], 8)]
    case 'umbilical':
      return [curve([v3(-0.18, N.y - 0.08, z), v3(0, N.y - 0.2, z), v3(0.18, N.y - 0.08, z)], 6)]
    case 'thyroid-collar':
      return [curve([v3(-0.42, S.y + 0.36, S.z + 0.2), v3(0, S.y + 0.26, S.z + 0.35), v3(0.42, S.y + 0.36, S.z + 0.2)], 8)]
    case 'sternotomy':
      return [line(v3(0, S.y - 0.15, z), v3(0, X.y + 0.1, z), 8)]
  }
}

/** Hernias as bulges at their anatomical sites, sized by the case. */
export function herniaBulges(hs: HerniaBulge[], A: Anatomy): (Bulge & { visible: HerniaBulge['visible']; hernia: HerniaBulge })[] {
  const size = { small: 0.75, medium: 1, large: 1.45 }
  return hs.map((h, i) => {
    const s = h.side === 'left' ? 1 : -1
    const k = size[h.size]
    let at: THREE.Vector3
    let r = 0.36 * k
    let sx = 1
    let sy = 1
    switch (h.kind) {
      case 'inguinal-indirect':
        // along the canal from the deep ring towards the superficial ring (and scrotum when large)
        at = (s === 1 ? A.deepRingL : A.deepRingR).clone().lerp(s === 1 ? A.superficialRingL : A.superficialRingR, h.size === 'large' ? 0.85 : 0.6)
        sx = 1.35
        break
      case 'inguinal-direct':
        // a more rounded, medial bulge through Hesselbach's triangle
        at = (s === 1 ? A.superficialRingL : A.superficialRingR).clone().add(v3(0.08 * s, 0.12, 0.05))
        r *= 1.1
        break
      case 'femoral':
        at = (s === 1 ? A.femoralCanalL : A.femoralCanalR).clone()
        r *= 0.85
        break
      case 'umbilical':
      case 'paraumbilical':
        at = A.navel.clone().add(v3(0, h.kind === 'paraumbilical' ? 0.22 : 0, 0.05))
        r *= 0.9
        break
      case 'epigastric':
        at = A.xiphoid.clone().lerp(A.navel, 0.45)
        r *= 0.7
        break
      case 'incisional':
        at = A.navel.clone().add(v3(0, -0.35, 0.05))
        r *= 1.4
        sy = 1.3
        break
    }
    return { id: `hernia${i}`, at: A.onFront(at.x, at.y), r, h: 0.3 * k * (h.tense ? 1.15 : 1), sx, sy, visible: h.visible, hernia: h }
  })
}

/** A scar's course on the skin, as polylines (front scars placed as seen from the front; a loin incision wraps round the flank). */
export function scarOnSkin(id: ScarId, A: Anatomy): THREE.Vector3[][] {
  const onBody = (p: THREE.Vector3) => (id === 'left-loin' ? A.onSkin(p) : A.onFront(p.x, p.y))
  return scarPaths(id, A).map((path) => path.map(onBody))
}

/** Scars as skin segments. */
export function scarSegments(ids: ScarId[], A: Anatomy): Segment[] {
  const segments: Segment[] = []
  for (const id of ids)
    for (const pts of scarOnSkin(id, A)) for (let i = 0; i < pts.length - 1; i++) segments.push({ a: pts[i], b: pts[i + 1], width: id.startsWith('lap') ? 0.034 : 0.027 })
  return segments
}

/** A point in the middle of a scar (for a marker or to aim the camera at it). */
export function scarAnchor(id: ScarId, A: Anatomy): THREE.Vector3 {
  const paths = scarOnSkin(id, A)
  const longest = paths.reduce((a, b) => (b.length > a.length ? b : a))
  return longest[Math.floor(longest.length / 2)].clone()
}

/** The static signs of an abdominal patient's appearance. */
export function appearanceSigns(a: Appearance, A: Anatomy): { patches: Patch[]; segments: Segment[] } {
  const patches: Patch[] = []
  const segments: Segment[] = scarSegments(a.scars ?? [], A)
  if (a.spiderNaevi) {
    const spots = [v3(0.55, 0, 0), v3(-0.7, 0.25, 0), v3(0.9, 0.5, 0), v3(-0.3, 0.7, 0), v3(0.2, 0.95, 0), v3(-1.0, 0.95, 0), v3(1.2, 0.2, 0)]
    for (const o of spots.slice(0, Math.max(2, a.spiderNaevi))) patches.push({ at: A.onFront(o.x, A.sternalNotch.y - 1.4 + o.y), r: 0.07, kind: 'spider' })
  }
  if (a.caputMedusae) patches.push({ at: A.navel.clone(), r: 1.0, kind: 'caput' })
  if (a.cullens) patches.push({ at: A.navel.clone(), r: 0.45, kind: 'bruise', strength: 0.75 })
  if (a.greyTurners) for (const s of [1, -1]) patches.push({ at: A.onSkin(v3(1.65 * s, A.navel.y + 0.2, A.navel.z - 1.2)), r: 0.7, kind: 'bruise', strength: 0.7 })
  if (a.striae) for (const s of [1, -1]) patches.push({ at: A.onFront(1.1 * s, A.navel.y - 0.35), r: 0.75, kind: 'striae' })
  // a tense (strangulating) hernia is red and angry over the lump
  for (const b of herniaBulges(a.hernias ?? [], A)) if (b.hernia.tense) patches.push({ at: b.at, r: b.r * 1.1, kind: 'tint', color: '#ff9a8a', strength: 0.7 })
  return { patches, segments }
}

/** Write the veins into the shared uniforms. */
export function applyVeins(u: SignUniforms, veins: Vein[]) {
  veins.slice(0, MAX_VEINS).forEach((v, i) => {
    u.uVeinA.value[i].set(v.a.x, v.a.y, v.a.z, v.width)
    u.uVeinB.value[i].set(v.b.x, v.b.y, v.b.z, v.wiggle)
    u.uVeinC.value[i].set(v.normal.x, v.normal.y, v.normal.z, v.phase)
  })
  u.uVeinN.value = Math.min(MAX_VEINS, veins.length)
}

/** Write signs into the shared uniforms. */
export function applySigns(u: SignUniforms, s: { bulges: Bulge[]; patches: Patch[]; segments: Segment[] }) {
  s.bulges.slice(0, MAX_BULGES).forEach((b, i) => {
    u.uBulgeC.value[i].set(b.at.x, b.at.y, b.at.z, b.r)
    u.uBulgeP.value[i].set(b.h, b.sx ?? 1, b.sy ?? 1, 0)
  })
  u.uBulgeN.value = Math.min(MAX_BULGES, s.bulges.length)
  s.patches.slice(0, MAX_PATCHES).forEach((p, i) => {
    const c = new THREE.Color(p.color ?? '#ffffff')
    u.uPatchC.value[i].set(p.at.x, p.at.y, p.at.z, p.r)
    u.uPatchK.value[i].set(c.r, c.g, c.b, PATCH_CODE[p.kind] + Math.min(0.79, (p.strength ?? 0.8) * 0.8))
  })
  u.uPatchN.value = Math.min(MAX_PATCHES, s.patches.length)
  s.segments.slice(0, MAX_SEGS).forEach((g, i) => {
    u.uSegA.value[i].set(g.a.x, g.a.y, g.a.z, g.width)
    u.uSegB.value[i].set(g.b.x, g.b.y, g.b.z, g.fresh ? 1 : 0)
  })
  u.uSegN.value = Math.min(MAX_SEGS, s.segments.length)
}

export function applyGrid(u: SignUniforms, A: Anatomy, show: boolean, state: Partial<Record<RegionId, 'light' | 'deep'>> = {}) {
  u.uGrid.value.set(show ? 1 : 0, A.mcl, A.subcostalY, A.transtubercularY)
  u.uGrid2.value.set(A.xiphoid.y, A.pubis.y, Math.abs(A.asisL.x), A.asisL.y)
  u.uGridZ.value = A.navel.z
  u.uRegion.value = REGION_ORDER.map((r) => (state[r] === 'deep' ? 2 : state[r] === 'light' ? 1 : 0))
}

/* ------------------------------------------------------------ live layer */

export interface LiveBulge extends Bulge {
  /** current size (0 = flat, 1 = as specified, >1 = larger, e.g. with a cough impulse) */
  k?: number
  /** size it eases towards */
  target?: number
  /** per-frame driver for pulsation, peristalsis or swallowing (moves `at`, sets `k`) */
  drive?: (b: LiveBulge, t: number) => void
}

interface Press {
  at: THREE.Vector3
  r: number
  depth: number
  age: number
  hold: number
  release: number
}

interface Ripple {
  at: THREE.Vector3
  color: THREE.Color
  r: number
  age: number
}

/**
 * Owns the sign uniforms shared by the skin and clothes, and animates what
 * changes: bulges easing in and out (a cough impulse, a hernia reducing), the
 * dimple under the examiner's fingers (slow to refill when oedema pits), and
 * the rings that acknowledge each touch.
 */
export class SignLayer {
  readonly u = createSignUniforms()
  private bulges: LiveBulge[] = []
  private presses: Press[] = []
  private ripples: Ripple[] = []
  private dirty = true

  setStatic(s: { patches: Patch[]; segments: Segment[] }) {
    applySigns(this.u, { bulges: [], patches: s.patches, segments: s.segments })
    this.dirty = true
  }

  setBulges(list: LiveBulge[]) {
    this.bulges = list.map((b) => ({ ...b, k: b.k ?? b.target ?? 1, target: b.target ?? b.k ?? 1 }))
    this.dirty = true
  }

  bulge(id: string) {
    return this.bulges.find((b) => b.id === id)
  }

  /** Change a bulge's target size (it eases there). */
  size(id: string, target: number) {
    const b = this.bulge(id)
    if (b) {
      b.target = target
      this.dirty = true
    }
  }

  /** The skin gives under a fingertip or hand: `hold` seconds pressed, refilling over `release` seconds. */
  press(at: THREE.Vector3, opts: { r?: number; depth?: number; hold?: number; release?: number } = {}) {
    this.presses.push({ at: at.clone(), r: opts.r ?? 0.3, depth: opts.depth ?? 0.08, age: 0, hold: opts.hold ?? 0.35, release: opts.release ?? 0.35 })
    if (this.presses.length > 3) this.presses.shift()
    this.dirty = true
  }

  ripple(at: THREE.Vector3, color: THREE.ColorRepresentation = '#ffffff', r = 0.45) {
    this.ripples.push({ at: at.clone(), color: new THREE.Color(color), r, age: 0 })
    if (this.ripples.length > MAX_RIPPLES) this.ripples.shift()
    this.dirty = true
  }

  /** Advance animations and write the uniforms. Returns 'busy' while something is moving, 'idle' for continuous gentle motion. */
  update(dt: number, t: number): 'busy' | 'idle' | false {
    let busy = false
    let idle = false
    for (const b of this.bulges) {
      if (b.drive) {
        b.drive(b, t)
        idle = true
      }
      const target = b.target ?? 1
      const k = b.k ?? target
      if (Math.abs(target - k) > 1e-3) {
        // swell quickly, subside slowly
        const rate = target > k ? 12 : 3.2
        b.k = k + (target - k) * (1 - Math.exp(-dt * rate))
        busy = true
      } else b.k = target
    }
    const had = this.presses.length + this.ripples.length
    for (const p of this.presses) p.age += dt
    this.presses = this.presses.filter((p) => p.age < 0.18 + p.hold + p.release)
    for (const r of this.ripples) r.age += dt
    this.ripples = this.ripples.filter((r) => r.age < 0.75)
    if (this.presses.length || this.ripples.length) busy = true
    // the last ring or dimple just finished: clear it from the uniforms
    else if (had) this.dirty = true
    if (!busy && !idle && !this.dirty) return false
    this.dirty = false

    const u = this.u
    let n = 0
    for (const b of this.bulges) {
      const h = b.h * (b.k ?? 1)
      if (Math.abs(h) < 1e-4 || n >= MAX_BULGES) continue
      u.uBulgeC.value[n].set(b.at.x, b.at.y, b.at.z, b.r)
      u.uBulgeP.value[n].set(h, b.sx ?? 1, b.sy ?? 1, 0)
      n++
    }
    for (const p of this.presses) {
      if (n >= MAX_BULGES) break
      const inT = Math.min(1, p.age / 0.18)
      const out = p.age < 0.18 + p.hold ? 1 : 1 - (p.age - 0.18 - p.hold) / p.release
      const env = inT * inT * (3 - 2 * inT) * Math.max(0, out) ** 1.5
      u.uBulgeC.value[n].set(p.at.x, p.at.y, p.at.z, p.r)
      u.uBulgeP.value[n].set(-p.depth * env, 1, 1, 0)
      n++
    }
    u.uBulgeN.value = n
    this.ripples.forEach((r, i) => {
      u.uRipA.value[i].set(r.at.x, r.at.y, r.at.z, r.age)
      u.uRipB.value[i].set(r.color.r, r.color.g, r.color.b, r.r)
    })
    u.uRipN.value = this.ripples.length
    return busy ? 'busy' : idle ? 'idle' : false
  }
}

/** When a hernia shows, and how much it swells, in each phase of the examination (mirrors the 2D body). */
export function herniaSize(h: HerniaBulge, phase: 'rest' | 'cough' | 'standing' | 'reduced' | 'ring-cough'): number {
  const groin = h.kind === 'inguinal-indirect' || h.kind === 'inguinal-direct' || h.kind === 'femoral'
  if (h.visible === 'never') return 0
  if (phase === 'reduced' && groin) return 0
  // with the deep ring occluded an indirect hernia is controlled; direct and femoral hernias still bulge
  if (phase === 'ring-cough' && h.kind === 'inguinal-indirect') return 0
  const shown =
    h.visible === 'always' ||
    phase === 'ring-cough' ||
    (h.visible === 'cough' && (phase === 'cough' || phase === 'standing')) ||
    (h.visible === 'standing' && (phase === 'standing' || phase === 'cough'))
  if (!shown) return 0
  return phase === 'cough' || phase === 'ring-cough' ? 1.22 : 1
}
