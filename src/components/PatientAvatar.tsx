import { memo } from 'react'
import { Face } from '../anatomy/Face'
import type { Appearance } from '../anatomy/types'
import { portraitUrl } from '../lib/portraits'
import { cn } from '../lib/utils'

/** A patient's face: their 3D portrait when one has been rendered, else the illustrated face. */
export const PatientAvatar = memo(function PatientAvatar({ a, caseId, pain = 0.2, className, id }: { a?: Appearance; caseId?: string; pain?: number; className?: string; id: string }) {
  const src = portraitUrl(caseId)
  return (
    <div className={cn('overflow-hidden rounded-2xl bg-gradient-to-b from-[#dfe7ee] to-[#c6d2dc] ring-1 ring-line dark:from-[#233147] dark:to-[#141d2c]', className)}>
      {src ? (
        <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" draggable={false} />
      ) : a ? (
        <svg viewBox="-62 -22 124 140" className="h-full w-full">
          <Face a={a} pose={{ pain }} id={`av-${id}`} bust noLines />
        </svg>
      ) : (
        <div className="h-full w-full animate-pulse bg-surface-3" />
      )}
    </div>
  )
})
