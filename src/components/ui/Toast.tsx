import { AlertTriangle, CheckCircle2, Info, Lightbulb, XCircle } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import type { ReactNode } from 'react'
import { create } from 'zustand'
import { cn, uid } from '../../lib/utils'

export type ToastTone = 'info' | 'success' | 'warning' | 'danger' | 'tip'

interface ToastItem {
  id: string
  tone: ToastTone
  title: string
  body?: ReactNode
  duration: number
}

interface ToastStore {
  toasts: ToastItem[]
  push: (t: Omit<ToastItem, 'id' | 'duration'> & { duration?: number }) => string
  dismiss: (id: string) => void
  clear: () => void
}

export const useToasts = create<ToastStore>((set, get) => ({
  toasts: [],
  push: (t) => {
    const id = uid('t')
    const item: ToastItem = { duration: 4200, ...t, id }
    set({ toasts: [...get().toasts.slice(-2), item] })
    if (item.duration > 0) window.setTimeout(() => get().dismiss(id), item.duration)
    return id
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((x) => x.id !== id) }),
  clear: () => set({ toasts: [] }),
}))

export const toast = (t: Omit<ToastItem, 'id' | 'duration'> & { duration?: number }) => useToasts.getState().push(t)

const icons: Record<ToastTone, ReactNode> = {
  info: <Info size={18} />,
  success: <CheckCircle2 size={18} />,
  warning: <AlertTriangle size={18} />,
  danger: <XCircle size={18} />,
  tip: <Lightbulb size={18} />,
}

const toneColor: Record<ToastTone, string> = {
  info: 'text-info',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
  tip: 'text-violet',
}

export function Toaster() {
  const toasts = useToasts((s) => s.toasts)
  const dismiss = useToasts((s) => s.dismiss)
  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[90] flex flex-col items-center gap-2 px-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] md:items-end md:px-5"
      aria-live="polite"
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: -16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.97, transition: { duration: 0.15 } }}
            transition={{ type: 'spring', stiffness: 480, damping: 36 }}
            onClick={() => dismiss(t.id)}
            className="pointer-events-auto flex w-full max-w-sm cursor-pointer items-start gap-3 rounded-2xl px-4 py-3 shadow-(--shadow-float) ring-1 ring-line glass"
          >
            <span className={cn('mt-0.5 shrink-0', toneColor[t.tone])}>{icons[t.tone]}</span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-ink">{t.title}</div>
              {t.body && <div className="mt-0.5 text-[13px] leading-snug text-muted">{t.body}</div>}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
