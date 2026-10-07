export const MOBILE_MEDIA = '(max-width: 768px)'

export function isMobileViewport(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia(MOBILE_MEDIA).matches
}

function splitPath(fullPath: string): { path: string; rest: string } {
  const query = fullPath.indexOf('?')
  const hash = fullPath.indexOf('#')
  const cuts = [query, hash].filter((index) => index >= 0)
  const cut = cuts.length ? Math.min(...cuts) : fullPath.length
  return { path: fullPath.slice(0, cut), rest: fullPath.slice(cut) }
}

export function toMobileLocation(fullPath: string): string {
  const { path, rest } = splitPath(fullPath)
  if (path === '/m' || path.startsWith('/m/')) return fullPath
  if (path === '/login') return `/m/login${rest}`
  if (path === '/admin' || path.startsWith('/admin/')) return `/m${rest}`
  if (path === '/') return `/m${rest}`
  return `/m${path}${rest}`
}

export function toDesktopLocation(fullPath: string): string {
  const { path, rest } = splitPath(fullPath)
  if (path !== '/m' && !path.startsWith('/m/')) return fullPath
  if (path === '/m') return `/${rest}`
  if (path === '/m/login') return `/login${rest}`
  return `${path.slice(2)}${rest}`
}
