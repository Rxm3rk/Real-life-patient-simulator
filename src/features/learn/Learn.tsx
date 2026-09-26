import { lazy } from 'react'

const LearnHome = lazy(() => import('./LearnHome'))
const Routine = lazy(() => import('./Routine'))
const Drill = lazy(() => import('./Drill'))
const SignsAtlas = lazy(() => import('./SignsAtlas'))
const ScarAtlas = lazy(() => import('./ScarAtlas'))
const VivaCards = lazy(() => import('./VivaCards'))

export default function Learn({ section, item }: { section?: string; item?: string }) {
  switch (section) {
    case 'routine':
      return <Routine kind={item} />
    case 'drill':
      return <Drill kind={item} />
    case 'signs':
      return <SignsAtlas id={item} />
    case 'scars':
      return <ScarAtlas />
    case 'viva':
      return <VivaCards />
    default:
      return <LearnHome />
  }
}
