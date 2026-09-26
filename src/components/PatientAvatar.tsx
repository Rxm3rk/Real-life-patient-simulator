import { memo } from 'react'
import { Face } from '../anatomy/Face'
import type { Appearance } from '../anatomy/types'
import { cn } from '../lib/utils'

export const PatientAvatar = memo(function PatientAvatar({ a, pain = 0.2, className, id }: { a?: Appearance; pain?: number; className?: string; id: string }) {
  return (
    <div className={cn('overflow-hidden rounded-2xl bg-gradient-to-b from-[#dfe7ee] to-[#c6d2dc] ring-1 ring-line dark:from-[#233147] dark:to-[#141d2c]', className)}>
      {a ? (
        <svg viewBox="-62 -22 124 140" className="h-full w-full">
          <Face a={a} pose={{ pain }} id={`av-${id}`} bust noLines />
        </svg>
      ) : (
        <div className="h-full w-full animate-pulse bg-surface-3" />
      )}
    </div>
  )
})
