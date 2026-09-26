import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { Face } from '../../anatomy/Face'
import type { Appearance } from '../../anatomy/types'
import { cn } from '../../lib/utils'

/**
 * The patient's face — always visible while you examine, because the most
 * important sign during palpation is the patient's expression. `winceKey`
 * changes trigger a wince of the given strength which decays naturally.
 */
export function FaceCam({
  a,
  pain,
  wince,
  winceKey,
  says,
  className,
  size = 'md',
  label,
  speaking,
}: {
  a: Appearance
  pain: number
  wince: number
  winceKey: number
  says?: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
  label?: string
  speaking?: boolean
}) {
  const [w, setW] = useState(0)
  const [bubble, setBubble] = useState<string | undefined>()
  const raf = useRef(0)
  const [mouth, setMouth] = useState(0)

  useEffect(() => {
    if (!winceKey) return
    const peak = wince
    if (peak <= 0) return
    const start = performance.now()
    cancelAnimationFrame(raf.current)
    const tick = (now: number) => {
      const t = (now - start) / 1000
      const v = t < 0.12 ? peak * (t / 0.12) : peak * Math.exp(-(t - 0.12) * 1.3)
      setW(v)
      if (v > 0.02) raf.current = requestAnimationFrame(tick)
      else setW(0)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [winceKey, wince])

  useEffect(() => {
    if (!says) return
    setBubble(says)
    const id = window.setTimeout(() => setBubble(undefined), 3800)
    return () => window.clearTimeout(id)
  }, [says, winceKey])

  useEffect(() => {
    if (!speaking && !bubble) {
      setMouth(0)
      return
    }
    let alive = true
    let n = 0
    const id = window.setInterval(() => {
      if (!alive) return
      n++
      setMouth(n > 14 ? 0 : Math.random() * 0.55)
    }, 110)
    return () => {
      alive = false
      window.clearInterval(id)
    }
  }, [speaking, bubble])

  const dims = size === 'sm' ? 'h-16 w-16' : size === 'lg' ? 'h-40 w-40' : 'h-24 w-24'
  return (
    <div className={cn('relative', className)}>
      <div className={cn('relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#dfe7ee] to-[#c6d2dc] shadow-(--shadow-lift) ring-1 ring-black/10 dark:from-[#233147] dark:to-[#141d2c] dark:ring-white/10', dims)}>
        <svg viewBox="-62 -22 124 140" className="h-full w-full">
          <rect x="-80" y="-40" width="160" height="200" fill="none" />
          <g transform="translate(0 4)">
            <Face a={a} pose={{ pain, wince: w, mouthOpen: mouth, lookAt: 'examiner' }} id={`facecam-${size}`} bust />
          </g>
        </svg>
        {label && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-2 pb-1 pt-4 text-[10px] font-medium text-white">
            {label}
          </div>
        )}
      </div>
      <AnimatePresence>
        {bubble && (
          <motion.div
            key={bubble}
            initial={{ opacity: 0, y: 4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ type: 'spring', stiffness: 500, damping: 32 }}
            className="absolute top-1 right-[calc(100%+8px)] z-10 w-max max-w-[200px] rounded-2xl rounded-tr-sm bg-white px-3 py-2 text-[12.5px] leading-snug text-slate-800 shadow-(--shadow-lift)"
          >
            “{bubble}”
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
