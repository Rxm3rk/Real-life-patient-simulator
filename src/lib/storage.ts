import { createJSONStorage, type StateStorage } from 'zustand/middleware'

/**
 * localStorage can be missing or throw (private mode, blocked site data,
 * sandboxed previews). Every access is guarded and falls back to memory so the
 * app always works — it just won't remember things in that case.
 */
const memory = new Map<string, string>()

export const safeStorage: StateStorage = {
  getItem(name) {
    try {
      const v = window.localStorage.getItem(name)
      return v ?? memory.get(name) ?? null
    } catch {
      return memory.get(name) ?? null
    }
  },
  setItem(name, value) {
    memory.set(name, value)
    try {
      window.localStorage.setItem(name, value)
    } catch {
      /* quota or access error — memory copy is kept */
    }
  },
  removeItem(name) {
    memory.delete(name)
    try {
      window.localStorage.removeItem(name)
    } catch {
      /* ignore */
    }
  },
}

export const jsonStorage = createJSONStorage(() => safeStorage)
