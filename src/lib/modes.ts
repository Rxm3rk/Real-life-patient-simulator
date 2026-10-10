import { GraduationCap, Dumbbell, Timer, type LucideIcon } from 'lucide-react'
import type { Mode } from '../engine/types'

/** How each way of seeing a patient is named and explained, everywhere it appears. */
export const MODES: Record<Mode, { label: string; icon: LucideIcon; blurb: string; points: string[] }> = {
  learn: {
    label: 'Guided',
    icon: GraduationCap,
    blurb: 'The checklist sits beside you and every finding is explained. Best for a first go at a patient.',
    points: ['Macleod’s checklist on screen', 'Every finding explained', 'Nudges when you go out of order'],
  },
  practice: {
    label: 'Practice',
    icon: Dumbbell,
    blurb: 'You lead; hints only if you ask. Full feedback at the end.',
    points: ['No checklist on screen', 'Reveal what a finding means if stuck', 'Full marked feedback'],
  },
  osce: {
    label: 'OSCE',
    icon: Timer,
    blurb: 'Exam conditions: a station timer, raw findings and no hints, then the examiner’s viva.',
    points: ['Station timer', 'No hints, raw findings only', 'Examiner viva and a global grade'],
  },
}

export const MODE_ORDER: Mode[] = ['learn', 'practice', 'osce']
