// ====================================================================
// CLIENTLOOP SUPABASE CLIENT
// Configured with Vite environment variables & fallback resilience
// ====================================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js'

const getEnvVar = (key: string): string => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && typeof import.meta.env[key] === 'string') {
      return import.meta.env[key]
    }
  } catch {
    // import.meta.env may throw in some Node.js module contexts
  }
  const proc = (globalThis as unknown as { process?: { env?: Record<string, string> } }).process
  if (proc?.env && typeof proc.env[key] === 'string') {
    return proc.env[key]
  }
  return ''
}

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL').trim()
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY').trim()

export const isSupabaseConfigured = (): boolean => {
  return (
    Boolean(supabaseUrl) &&
    Boolean(supabaseAnonKey) &&
    !supabaseUrl.includes('your-project-ref') &&
    !supabaseAnonKey.includes('your-anon-key')
  )
}

export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null
