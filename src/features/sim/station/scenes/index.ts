import type { SceneCtx, SceneSpec } from '../types'
import { breastScene } from './breast'
import { groinScene } from './groin'
import { lumpScene } from './lump'
import { perianalScene } from './perianal'
import { scrotalScene } from './scrotal'
import { thyroidScene } from './thyroid'
import { arterialScene, venousScene } from './vascular'

export function sceneFor(x: SceneCtx): SceneSpec {
  switch (x.c.exam) {
    case 'groin':
      return groinScene(x)
    case 'arterial':
      return arterialScene(x)
    case 'venous':
      return venousScene(x)
    case 'thyroid':
      return thyroidScene(x)
    case 'breast':
      return breastScene(x)
    case 'lump':
      return lumpScene(x)
    case 'perianal':
      return perianalScene(x)
    case 'scrotal':
    default:
      return scrotalScene(x)
  }
}
