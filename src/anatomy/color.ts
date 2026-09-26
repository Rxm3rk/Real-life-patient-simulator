export type RGB = [number, number, number]

export function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function rgbToHex([r, g, b]: RGB): string {
  const c = (v: number) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')
  return `#${c(r)}${c(g)}${c(b)}`
}

/** Linear mix of two hex colours: t=0 → a, t=1 → b. */
export function mix(a: string, b: string, t: number): string {
  const A = hexToRgb(a)
  const B = hexToRgb(b)
  return rgbToHex([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t])
}

export const darken = (hex: string, t: number) => mix(hex, '#000000', t)
export const lighten = (hex: string, t: number) => mix(hex, '#ffffff', t)

/** Multiply blend — good for shading skin without greying it out. */
export function multiply(hex: string, by: string, t = 1): string {
  const A = hexToRgb(hex)
  const B = hexToRgb(by)
  const m: RGB = [(A[0] * B[0]) / 255, (A[1] * B[1]) / 255, (A[2] * B[2]) / 255]
  return mix(hex, rgbToHex(m), t)
}

export function withAlpha(hex: string, a: number): string {
  const [r, g, b] = hexToRgb(hex)
  return `rgba(${r},${g},${b},${a})`
}
