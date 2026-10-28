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

const DEFAULT_SUPABASE_URL = 'https://mlurzchdudvgfeeatkdd.supabase.co'
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sdXJ6Y2hkdWR2Z2ZlZWF0a2RkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3NjA1NzksImV4cCI6MjEwODMzNjU3OX0.TZdwzTwER6Z_gq6rMY19XD6RiGErAdavounB00Ubpno'

const rawUrl = getEnvVar('VITE_SUPABASE_URL').trim()
const rawKey = getEnvVar('VITE_SUPABASE_ANON_KEY').trim()

const supabaseUrl = rawUrl || DEFAULT_SUPABASE_URL
const supabaseAnonKey = rawKey || DEFAULT_SUPABASE_ANON_KEY

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
