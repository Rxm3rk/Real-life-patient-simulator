import { useEffect } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { jsonStorage } from '../lib/storage'

export type ThemePref = 'system' | 'dark' | 'light'

export interface SettingsState {
  theme: ThemePref
  sound: boolean
  volume: number
  patientVoice: boolean
  haptics: boolean
  studentName: string
  /** Show the 9-region grid over the abdomen in practice mode */
  showRegions: boolean
  /** Seconds per OSCE station */
  osceStationSeconds: number
  onboarded: boolean
  set: (patch: Partial<Omit<SettingsState, 'set'>>) => void
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      sound: true,
      volume: 0.8,
      patientVoice: false,
      haptics: true,
      studentName: '',
      showRegions: true,
      osceStationSeconds: 10 * 60,
      onboarded: false,
      set: (patch) => set(patch),
    }),
    { name: 'bedside.settings', storage: jsonStorage, version: 1 },
  ),
)

function resolveDark(pref: ThemePref) {
  if (pref === 'dark') return true
  if (pref === 'light') return false
  return typeof window === 'undefined' || !window.matchMedia
    ? true
    : window.matchMedia('(prefers-color-scheme: dark)').matches
}

/** Keeps <html data-theme> and the browser theme-color in sync with settings. */
export function useApplyTheme() {
  const theme = useSettings((s) => s.theme)
  useEffect(() => {
    const apply = () => {
      const dark = resolveDark(theme)
      document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
      const meta = document.querySelector('meta[name="theme-color"]')
      meta?.setAttribute('content', dark ? '#070B14' : '#F4F6F9')
    }
    apply()
    if (theme !== 'system' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [theme])
}

export function useIsDark() {
  const theme = useSettings((s) => s.theme)
  return resolveDark(theme)
}
