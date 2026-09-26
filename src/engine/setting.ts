import type { CaseDef } from './types'

/** Outpatient settings: no cardiac monitor, ID wristband or bedside obs chart. */
export const isClinic = (setting: CaseDef['setting']) => setting === 'Outpatient clinic' || setting === 'GP surgery'
