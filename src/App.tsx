import { MotionConfig } from 'motion/react'
import { lazy, Suspense, type ReactNode } from 'react'
import { AppShell } from './components/layout/AppShell'
import { Toaster } from './components/ui/Toast'
import { matchRoute, useLocation } from './lib/router'
import { useApplyTheme } from './store/settings'

const AnatomyLab = lazy(() => import('./features/lab/AnatomyLab'))

interface RouteDef {
  pattern: string
  render: (params: Record<string, string>) => ReactNode
  /** Full-screen routes hide the navigation chrome */
  bare?: boolean
}

const routes: RouteDef[] = [
  { pattern: '/', render: () => <div className="p-10 text-ink">Bedside</div> },
  { pattern: '/lab/anatomy', render: () => <AnatomyLab />, bare: true },
]

function Fallback() {
  return (
    <div className="grid min-h-dvh place-items-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-r-transparent" />
    </div>
  )
}

export default function App() {
  useApplyTheme()
  const { path } = useLocation()

  let content: ReactNode = null
  let bare = false
  for (const r of routes) {
    const params = matchRoute(r.pattern, path)
    if (params) {
      content = r.render(params)
      bare = !!r.bare
      break
    }
  }
  if (!content) content = <div className="p-10 text-ink">Not found</div>

  return (
    <MotionConfig reducedMotion="user">
      <Suspense fallback={<Fallback />}>{bare ? content : <AppShell>{content}</AppShell>}</Suspense>
      <Toaster />
    </MotionConfig>
  )
}
