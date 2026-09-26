import { useSyncExternalStore, type AnchorHTMLAttributes, type MouseEvent } from 'react'

/**
 * A tiny hash router. Hash routing keeps deep links working on static hosts
 * (GitHub Pages, a single shared HTML file, claude.ai artifacts) without any
 * server rewrites.
 */

function readHash(): string {
  const raw = typeof window === 'undefined' ? '' : window.location.hash.replace(/^#/, '')
  return raw || '/'
}

function subscribe(onChange: () => void) {
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}

export interface Location {
  /** Path without the query string, always starting with "/" */
  path: string
  query: URLSearchParams
  href: string
}

export function useLocation(): Location {
  const href = useSyncExternalStore(subscribe, readHash, () => '/')
  const [path, qs = ''] = href.split('?')
  return { path: path.startsWith('/') ? path : `/${path}`, query: new URLSearchParams(qs), href }
}

export function navigate(to: string, opts: { replace?: boolean } = {}) {
  const target = `#${to.startsWith('/') ? to : `/${to}`}`
  if (opts.replace) {
    const url = new URL(window.location.href)
    url.hash = target
    window.history.replaceState(null, '', url)
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  } else {
    window.location.hash = target
  }
}

export function goBack(fallback = '/') {
  if (window.history.length > 1) window.history.back()
  else navigate(fallback, { replace: true })
}

/** Match "/case/:id" against "/case/appendicitis" → { id: "appendicitis" } */
export function matchRoute(pattern: string, path: string): Record<string, string> | null {
  const p = pattern.split('/').filter(Boolean)
  const s = path.split('/').filter(Boolean)
  if (p.length !== s.length) return null
  const params: Record<string, string> = {}
  for (let i = 0; i < p.length; i++) {
    if (p[i].startsWith(':')) params[p[i].slice(1)] = decodeURIComponent(s[i])
    else if (p[i] !== s[i]) return null
  }
  return params
}

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & { to: string; replace?: boolean }

export function Link({ to, replace, onClick, ...rest }: LinkProps) {
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e)
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
    e.preventDefault()
    navigate(to, { replace })
  }
  return <a href={`#${to}`} onClick={handle} {...rest} />
}
