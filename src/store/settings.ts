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

/** A theme the hosting page stamped on <html> before the app started (see index.html). */
function hostTheme(): 'dark' | 'light' | null {
  const t = typeof window === 'undefined' ? null : (window as { __bedsideHostTheme?: string | null }).__bedsideHostTheme
  return t === 'dark' || t === 'light' ? t : null
}

function resolveDark(pref: ThemePref) {
  if (pref !== 'system') return pref === 'dark'
  const host = document.documentElement.getAttribute('data-theme') ?? hostTheme()
  if (host === 'dark' || host === 'light') return host === 'dark'
  return !window.matchMedia || window.matchMedia('(prefers-color-scheme: dark)').matches
}

/**
 * Keeps <html data-theme> and the browser theme-color in sync with settings.
 * "System" leaves the attribute to the OS (via CSS) or to the page hosting the app.
 */
export function useApplyTheme() {
  const theme = useSettings((s) => s.theme)
  useEffect(() => {
    const root = document.documentElement
    if (theme !== 'system') root.setAttribute('data-theme', theme)
    else {
      const host = hostTheme()
      if (host) root.setAttribute('data-theme', host)
      else root.removeAttribute('data-theme')
    }
    const paint = () => document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolveDark(theme) ? '#070B14' : '#F4F6F9')
    paint()
    if (theme !== 'system' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', paint)
    return () => mq.removeEventListener('change', paint)
  }, [theme])
}
