import { MotionConfig } from 'motion/react'
import { lazy, Suspense, useEffect, type ReactNode } from 'react'
import { AppShell } from './components/layout/AppShell'
import { Toaster } from './components/ui/Toast'
import { matchRoute, useLocation } from './lib/router'
import { useApplyTheme } from './store/settings'

const Home = lazy(() => import('./features/home/Home'))
const Ward = lazy(() => import('./features/ward/Ward'))
const CaseBriefing = lazy(() => import('./features/briefing/CaseBriefing'))
const SimScreen = lazy(() => import('./features/sim/SimScreen'))
const Debrief = lazy(() => import('./features/debrief/Debrief'))
const Learn = lazy(() => import('./features/learn/Learn'))
const Osce = lazy(() => import('./features/osce/Osce'))
const Progress = lazy(() => import('./features/progress/Progress'))
const Settings = lazy(() => import('./features/settings/Settings'))
const AnatomyLab = lazy(() => import('./features/lab/AnatomyLab'))

interface RouteDef {
  pattern: string
  render: (params: Record<string, string>) => ReactNode
  /** Full-screen routes hide the navigation chrome */
  bare?: boolean
}

const routes: RouteDef[] = [
  { pattern: '/', render: () => <Home /> },
  { pattern: '/ward', render: () => <Ward /> },
  { pattern: '/case/:id', render: (p) => <CaseBriefing id={p.id} key={p.id} /> },
  { pattern: '/sim', render: () => <SimScreen />, bare: true },
  { pattern: '/debrief/:id', render: (p) => <Debrief attemptId={p.id} key={p.id} /> },
  { pattern: '/learn', render: () => <Learn /> },
  { pattern: '/learn/:section', render: (p) => <Learn section={p.section} /> },
  { pattern: '/learn/:section/:item', render: (p) => <Learn section={p.section} item={p.item} /> },
  { pattern: '/osce', render: () => <Osce /> },
  { pattern: '/progress', render: () => <Progress /> },
  { pattern: '/settings', render: () => <Settings /> },
  { pattern: '/lab/anatomy', render: () => <AnatomyLab />, bare: true },
]

function Fallback() {
  return (
    <div className="grid min-h-[60dvh] place-items-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-r-transparent" />
    </div>
  )
}

export default function App() {
  useApplyTheme()
  const { path } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [path])

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
  if (!content) content = <div className="p-10 text-ink">Page not found.</div>

  return (
    <MotionConfig reducedMotion="user">
      {bare ? (
        <Suspense fallback={<Fallback />}>{content}</Suspense>
      ) : (
        <AppShell>
          <Suspense fallback={<Fallback />}>{content}</Suspense>
        </AppShell>
      )}
      <Toaster />
    </MotionConfig>
  )
}
