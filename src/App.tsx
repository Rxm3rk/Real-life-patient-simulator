import { MotionConfig } from 'motion/react'
import { lazy, Suspense, useEffect, useRef, type ReactNode } from 'react'
import { AppShell } from './components/layout/AppShell'
import { Toaster } from './components/ui/Toast'
import { matchRoute, navigate, useLocation } from './lib/router'
import { useApplyTheme } from './store/settings'

const Home = lazy(() => import('./features/home/Home'))
const Ward = lazy(() => import('./features/ward/Ward'))
const Ask = lazy(() => import('./features/ask/Ask'))
const TopicPage = lazy(() => import('./features/curriculum/TopicPage'))
const CaseBriefing = lazy(() => import('./features/briefing/CaseBriefing'))
const SimScreen = lazy(() => import('./features/sim/SimScreen'))
const Debrief = lazy(() => import('./features/debrief/Debrief'))
const Learn = lazy(() => import('./features/learn/Learn'))
const Osce = lazy(() => import('./features/osce/Osce'))
const Progress = lazy(() => import('./features/progress/Progress'))
const Settings = lazy(() => import('./features/settings/Settings'))
const AnatomyLab = lazy(() => import('./features/lab/AnatomyLab'))
const Human3DLab = lazy(() => import('./features/lab/Human3DLab'))
const PortraitLab = lazy(() => import('./features/lab/PortraitLab'))

interface RouteDef {
  pattern: string
  render: (params: Record<string, string>) => ReactNode
  /** Full-screen routes hide the navigation chrome */
  bare?: boolean
}

const routes: RouteDef[] = [
  { pattern: '/', render: () => <Home /> },
  { pattern: '/ask', render: () => <Ask /> },
  { pattern: '/topic/:id', render: (p) => <TopicPage id={p.id} key={p.id} /> },
  { pattern: '/topic/:id/case/:caseId', render: (p) => <TopicPage id={p.id} caseId={p.caseId} key={p.id} /> },
  { pattern: '/ward', render: () => <Ward /> },
  { pattern: '/case/:id', render: (p) => <CaseBriefing id={p.id} key={p.id} /> },
  { pattern: '/sim', render: () => <SimScreen />, bare: true },
  { pattern: '/debrief/:id', render: (p) => <Debrief attemptId={p.id} key={p.id} /> },
  { pattern: '/learn', render: () => <Learn /> },
  { pattern: '/learn/:section', render: (p) => <Learn section={p.section} /> },
  { pattern: '/learn/:section/:item', render: (p) => <Learn section={p.section} item={p.item} /> },
  { pattern: '/osce', render: () => <Osce /> },
  { pattern: '/osce/:section', render: (p) => <Osce section={p.section} /> },
  { pattern: '/osce/:section/:item', render: (p) => <Osce section={p.section} item={p.item} key={p.item} /> },
  { pattern: '/progress', render: () => <Progress /> },
  { pattern: '/settings', render: () => <Settings /> },
  { pattern: '/lab/anatomy', render: () => <AnatomyLab />, bare: true },
  { pattern: '/lab/3d', render: () => <Human3DLab />, bare: true },
  { pattern: '/lab/portrait', render: () => <PortraitLab />, bare: true },
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
  const prev = useRef(path)

  useEffect(() => {
    // a case card opening over its topic page keeps the reader's place
    const topic = (p: string) => p.match(/^\/topic\/[^/]+/)?.[0]
    if (!topic(path) || topic(path) !== topic(prev.current)) window.scrollTo({ top: 0 })
    prev.current = path
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

  useEffect(() => {
    if (bare) return
    // "/" jumps to Ask from anywhere, as in most search-first apps
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return
      const t = e.target as HTMLElement | null
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return
      e.preventDefault()
      if (path === '/ask') document.querySelector<HTMLInputElement>('input[type="search"]')?.focus()
      else navigate('/ask')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [bare, path])

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
