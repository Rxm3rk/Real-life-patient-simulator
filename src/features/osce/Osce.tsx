import { lazy } from 'react'

const OsceHome = lazy(() => import('./OsceHome'))
const Runner = lazy(() => import('./Runner'))
const Results = lazy(() => import('./Results'))
const Examiner = lazy(() => import('./Examiner'))

export default function Osce({ section, item }: { section?: string; item?: string }) {
  if (section === 'run') return <Runner />
  if (section === 'results' && item) return <Results id={item} />
  if (section === 'examiner') return <Examiner kind={item} />
  return <OsceHome />
}
