/**
 * What this device can do with the 3D patients: nothing (no WebGL 2), draw
 * them in software (SwiftShader, llvmpipe — far too slow to be pleasant, so
 * the illustrated patients are the default), or draw them on a GPU.
 */
export type GlTier = 'none' | 'software' | 'hardware'

let cached: GlTier | null = null

export function webglTier(): GlTier {
  if (cached) return cached
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2')
    if (!gl) cached = 'none'
    else {
      const info = gl.getExtension('WEBGL_debug_renderer_info')
      const renderer = String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER))
      cached = /swiftshader|llvmpipe|softpipe|software|basic render/i.test(renderer) ? 'software' : 'hardware'
      ;(gl.getExtension('WEBGL_lose_context') as { loseContext(): void } | null)?.loseContext()
    }
  } catch {
    cached = 'none'
  }
  // developer override for testing the 3D patients on a machine without a GPU
  try {
    if (cached === 'software' && localStorage.getItem('bedside.force3d') === '1') cached = 'hardware'
  } catch {
    /* storage blocked */
  }
  return cached
}

/** Whether this browser can draw the 3D patients at all (WebGL 2). */
export function webgl2Supported(): boolean {
  return webglTier() !== 'none'
}

/** Whether to show 3D patients: the user's choice, else on when a GPU draws them. */
export function use3dPatients(pref: boolean | null): boolean {
  const tier = webglTier()
  return tier !== 'none' && (pref ?? tier === 'hardware')
}
