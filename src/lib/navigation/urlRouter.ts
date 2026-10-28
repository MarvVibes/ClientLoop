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

export interface QuestionnaireLinkContext {
  businessId?: string
  businessName?: string
  customerName?: string
  service?: string
  googleReviewUrl?: string | null
}

/**
 * URL-safe encoding of portable questionnaire context for instant multi-device resolution
 */
export function encodeLinkContext(ctx: QuestionnaireLinkContext): string {
  try {
    const payload = JSON.stringify({
      b: ctx.businessId,
      n: ctx.businessName,
      c: ctx.customerName,
      s: ctx.service,
      r: ctx.googleReviewUrl
    })
    if (typeof window !== 'undefined' && typeof window.btoa === 'function') {
      const bytes = new TextEncoder().encode(payload)
      let binStr = ''
      bytes.forEach(byte => (binStr += String.fromCharCode(byte)))
      return btoa(binStr).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    }
    const proc = (globalThis as unknown as { Buffer?: { from: (s: string) => { toString: (e: string) => string } } })
    if (proc?.Buffer) {
      return proc.Buffer.from(payload).toString('base64url')
    }
    return ''
  } catch {
    return ''
  }
}

/**
 * Decodes portable questionnaire context safely
 */
export function decodeLinkContext(encoded: string): QuestionnaireLinkContext | null {
  try {
    let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
    while (base64.length % 4) {
      base64 += '='
    }
    let jsonStr = ''
    if (typeof window !== 'undefined' && typeof window.atob === 'function') {
      const binStr = atob(base64)
      const bytes = new Uint8Array(binStr.length)
      for (let i = 0; i < binStr.length; i++) {
        bytes[i] = binStr.charCodeAt(i)
      }
      jsonStr = new TextDecoder().decode(bytes)
    } else {
      const proc = (globalThis as unknown as { Buffer?: { from: (s: string, e: string) => { toString: (e: string) => string } } })
      if (proc?.Buffer) {
        jsonStr = proc.Buffer.from(base64, 'base64').toString('utf8')
      }
    }
    if (!jsonStr) return null
    const parsed = JSON.parse(jsonStr)
    return {
      businessId: parsed.b,
      businessName: parsed.n,
      customerName: parsed.c,
      service: parsed.s,
      googleReviewUrl: parsed.r
    }
  } catch {
    return null
  }
}

/**
 * Generates the canonical customer questionnaire URL for sharing or embedding.
 */
export function buildQuestionnaireUrl(
  tokenHash: string,
  origin?: string,
  context?: QuestionnaireLinkContext
): string {
  const configuredEnvUrl = typeof import.meta !== 'undefined' && (import.meta.env?.VITE_APP_URL || import.meta.env?.VITE_APP_BASE_URL)
    ? String(import.meta.env.VITE_APP_URL || import.meta.env.VITE_APP_BASE_URL).replace(/\/$/, '')
    : ''
  const baseOrigin = origin 
    || configuredEnvUrl
    || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173')

  let url = `${baseOrigin}/f/${encodeURIComponent(tokenHash)}`
  if (context && context.businessName) {
    const encoded = encodeLinkContext(context)
    if (encoded) {
      url += `?d=${encoded}`
    }
  }
  return url
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
