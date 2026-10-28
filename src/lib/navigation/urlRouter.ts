// ====================================================================
// CLIENTLOOP URL & DEEP-LINK ROUTER
// Parses and synchronizes URL tokens for customer questionnaires
// Supports query params (?token=xyz), pathnames (/f/xyz), and hash routes (#/f/xyz)
// ====================================================================

export type AppView = 'landing' | 'staff_portal' | 'questionnaire'

export interface RouteState {
  view: AppView
  token?: string
}

/**
 * Extracts route and token information from a URL string or window.location object.
 */
export function parseRoute(rawUrl?: string | Location): RouteState {
  let pathname = '/'
  let search = ''
  let hash = ''

  if (typeof window !== 'undefined' && !rawUrl) {
    pathname = window.location.pathname
    search = window.location.search
    hash = window.location.hash
  } else if (rawUrl) {
    try {
      const parsed = typeof rawUrl === 'string' ? new URL(rawUrl, 'http://localhost:5173') : rawUrl
      pathname = parsed.pathname || '/'
      search = parsed.search || ''
      hash = parsed.hash || ''
    } catch {
      // Fallback if malformed
      pathname = '/'
    }
  }

  // 1. Check Query Parameters: ?token=xyz or ?f=xyz or ?q=xyz
  const searchParams = new URLSearchParams(search)
  const tokenFromQuery = searchParams.get('token') || searchParams.get('f') || searchParams.get('q')
  if (tokenFromQuery && tokenFromQuery.trim()) {
    return {
      view: 'questionnaire',
      token: tokenFromQuery.trim()
    }
  }

  // 2. Check Hash Route: #/f/xyz or #/q/xyz or #token=xyz
  if (hash) {
    const cleanHash = hash.startsWith('#') ? hash.slice(1) : hash
    const hashParams = new URLSearchParams(cleanHash.includes('?') ? cleanHash.split('?')[1] : cleanHash)
    const tokenFromHashParam = hashParams.get('token') || hashParams.get('f') || hashParams.get('q')
    if (tokenFromHashParam && tokenFromHashParam.trim()) {
      return {
        view: 'questionnaire',
        token: tokenFromHashParam.trim()
      }
    }

    const hashMatch = cleanHash.match(/^\/?(?:f|q)\/([a-zA-Z0-9_-]+)/)
    if (hashMatch && hashMatch[1]) {
      return {
        view: 'questionnaire',
        token: hashMatch[1].trim()
      }
    }

    if (cleanHash === '/portal' || cleanHash === 'portal' || cleanHash === '/dashboard' || cleanHash === 'dashboard') {
      return { view: 'staff_portal' }
    }
  }

  // 3. Check Pathname: /f/:token or /q/:token
  const pathMatch = pathname.match(/^\/(?:f|q)\/([a-zA-Z0-9_-]+)/)
  if (pathMatch && pathMatch[1]) {
    return {
      view: 'questionnaire',
      token: pathMatch[1].trim()
    }
  }

  // 4. Check Portal / Dashboard in path or query
  const viewQuery = searchParams.get('view')
  if (viewQuery === 'portal' || viewQuery === 'staff' || viewQuery === 'dashboard') {
    return { view: 'staff_portal' }
  }

  if (pathname === '/portal' || pathname === '/dashboard') {
    return { view: 'staff_portal' }
  }

  // 5. Default Landing
  return { view: 'landing' }
}

/**
 * Generates the canonical customer questionnaire URL for sharing or embedding.
 */
export function buildQuestionnaireUrl(tokenHash: string, origin?: string): string {
  const configuredEnvUrl = typeof import.meta !== 'undefined' && (import.meta.env?.VITE_APP_URL || import.meta.env?.VITE_APP_BASE_URL)
    ? String(import.meta.env.VITE_APP_URL || import.meta.env.VITE_APP_BASE_URL).replace(/\/$/, '')
    : ''
  const baseOrigin = origin 
    || configuredEnvUrl
    || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173')
  return `${baseOrigin}/f/${encodeURIComponent(tokenHash)}`
}

/**
 * Updates the browser's URL bar without a page reload (via HTML5 History API).
 */
export function updateBrowserUrl(view: AppView, token?: string): void {
  if (typeof window === 'undefined') return

  let targetUrl = '/'
  if (view === 'questionnaire' && token) {
    targetUrl = `/f/${token}`
  } else if (view === 'staff_portal') {
    targetUrl = '/portal'
  }

  if (window.location.pathname !== targetUrl && window.location.search !== `?token=${token}`) {
    window.history.pushState({ view, token }, '', targetUrl)
  }
}
