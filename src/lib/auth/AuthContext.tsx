// ====================================================================
// CLIENTLOOP AUTHENTICATION CONTEXT & SESSION PROVIDER
// Backed by Supabase Auth with persistent session and offline resiliency
// ====================================================================

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '../supabase/client'
import { store } from '../services/store'
import { Business, WorkspaceRole } from '../types/database'

export interface AuthContextType {
  user: User | null
  session: Session | null
  activeBusiness: Business | null
  userRole: WorkspaceRole
  isLoading: boolean
  isAuthenticated: boolean
  hasCompletedOnboarding: boolean
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signUp: (email: string, password: string, fullName?: string) => Promise<{ success: boolean; error?: string; requiresVerification?: boolean }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>
  refreshActiveBusiness: () => Promise<void>
  setActiveBusinessId: (businessId: string) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const LOCAL_USER_STORAGE_KEY = 'clientloop_auth_user'
const LOCAL_ACTIVE_BIZ_KEY = 'clientloop_active_biz_id'

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [activeBusiness, setActiveBusiness] = useState<Business | null>(null)
  const [userRole, setUserRole] = useState<WorkspaceRole>('owner')
  const [isLoading, setIsLoading] = useState(true)

  // 1. Initialize session on mount
  useEffect(() => {
    let mounted = true

    const initAuth = async () => {
      try {
        if (supabase && isSupabaseConfigured()) {
          const { data, error } = await supabase.auth.getSession()
          if (!error && data?.session?.user && mounted) {
            setSession(data.session)
            setUser(data.session.user)
            await resolveUserBusiness(data.session.user.id)
            setIsLoading(false)
            return
          }
        }

        // Offline / Local storage fallback
        const savedLocalUser = localStorage.getItem(LOCAL_USER_STORAGE_KEY)
        if (savedLocalUser && mounted) {
          try {
            const parsed = JSON.parse(savedLocalUser)
            setUser(parsed)
            await resolveUserBusiness(parsed.id)
          } catch {
            localStorage.removeItem(LOCAL_USER_STORAGE_KEY)
          }
        }
      } catch (err) {
        console.warn('Auth initialization fallback:', err)
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    initAuth()

    // Supabase Auth State Change Listener
    let authSubscription: { unsubscribe: () => void } | null = null
    if (supabase && isSupabaseConfigured()) {
      const { data } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
        if (!mounted) return
        setSession(newSession)
        setUser(newSession?.user ?? null)
        if (newSession?.user) {
          await resolveUserBusiness(newSession.user.id)
        } else {
          setActiveBusiness(null)
        }
      })
      authSubscription = data.subscription
    }

    return () => {
      mounted = false
      if (authSubscription) {
        authSubscription.unsubscribe()
      }
    }
  }, [])

  // Resolve business belonging to user
  const resolveUserBusiness = async (userId: string) => {
    try {
      // 1. Sync store from Supabase first so latest businesses are available
      if (supabase && isSupabaseConfigured()) {
        try {
          await store.syncFromSupabase()
        } catch (e) {
          console.warn('Initial store sync notice:', e)
        }
      }

      // 2. Check store for businesses
      let allBusinesses = store.getBusinesses()
      const savedBizId = localStorage.getItem(LOCAL_ACTIVE_BIZ_KEY)

      if (savedBizId) {
        const found = allBusinesses.find(b => b.id === savedBizId)
        if (found) {
          setActiveBusiness(found)
          setUserRole('owner')
          return
        }
      }

      // 3. Check remote database if Supabase configured
      if (supabase && isSupabaseConfigured()) {
        const { data: memberships, error } = await supabase
          .from('business_memberships')
          .select('business_id, role, businesses(*)')
          .eq('user_id', userId)
          .eq('status', 'active')
          .limit(1)

        if (!error && memberships && memberships.length > 0) {
          const first = memberships[0]
          setUserRole((first.role as WorkspaceRole) || 'owner')
          if (first.businesses) {
            const biz = first.businesses as unknown as Business
            store.createBusiness(biz)
            setActiveBusiness(biz)
            localStorage.setItem(LOCAL_ACTIVE_BIZ_KEY, biz.id)
            return
          }
        }

        // 4. Fallback: If no explicit membership yet, find existing business created in this database
        const { data: remoteBusinesses } = await supabase
          .from('businesses')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1)

        if (remoteBusinesses && remoteBusinesses.length > 0) {
          const biz = remoteBusinesses[0] as Business
          store.createBusiness(biz)
          setActiveBusiness(biz)
          localStorage.setItem(LOCAL_ACTIVE_BIZ_KEY, biz.id)
          setUserRole('owner')

          // Auto-link active membership in background
          try {
            await supabase.from('business_memberships').upsert({
              user_id: userId,
              business_id: biz.id,
              role: 'owner',
              status: 'active'
            })
          } catch {
            // Ignore background membership link error
          }
          return
        }
      }

      // 5. Fallback: If user has created a business in local store
      allBusinesses = store.getBusinesses()
      if (allBusinesses.length > 0) {
        setActiveBusiness(allBusinesses[0])
        setUserRole('owner')
        localStorage.setItem(LOCAL_ACTIVE_BIZ_KEY, allBusinesses[0].id)
      } else {
        setActiveBusiness(null)
      }
    } catch (err) {
      console.warn('Failed to resolve user business:', err)
      const fallbackBiz = store.getBusinesses()[0]
      if (fallbackBiz) {
        setActiveBusiness(fallbackBiz)
        setUserRole('owner')
        localStorage.setItem(LOCAL_ACTIVE_BIZ_KEY, fallbackBiz.id)
      } else {
        setActiveBusiness(null)
      }
    }
  }

  const refreshActiveBusiness = async () => {
    if (user) {
      await resolveUserBusiness(user.id)
    }
  }

  const setActiveBusinessId = (businessId: string) => {
    const biz = store.getBusinessById(businessId)
    if (biz) {
      setActiveBusiness(biz)
      localStorage.setItem(LOCAL_ACTIVE_BIZ_KEY, biz.id)
    }
  }

  // Sign In
  const signIn = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true)
      if (supabase && isSupabaseConfigured()) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        })
        if (error) {
          setIsLoading(false)
          return { success: false, error: error.message }
        }
        if (data.user) {
          setUser(data.user)
          setSession(data.session)
          await resolveUserBusiness(data.user.id)
          setIsLoading(false)
          return { success: true }
        }
      }

      // Offline / Local Sandbox Sign In
      const syntheticUser = {
        id: `usr_${Math.random().toString(36).substring(2, 10)}`,
        email: email.trim(),
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString()
      } as User

      setUser(syntheticUser)
      localStorage.setItem(LOCAL_USER_STORAGE_KEY, JSON.stringify(syntheticUser))
      await resolveUserBusiness(syntheticUser.id)
      setIsLoading(false)
      return { success: true }
    } catch (err) {
      setIsLoading(false)
      const msg = err instanceof Error ? err.message : 'Sign-in failed'
      return { success: false, error: msg }
    }
  }

  // Sign Up
  const signUp = async (
    email: string,
    password: string,
    fullName?: string
  ): Promise<{ success: boolean; error?: string; requiresVerification?: boolean }> => {
    try {
      if (supabase && isSupabaseConfigured()) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { full_name: fullName || '' }
          }
        })
        if (error) {
          return { success: false, error: error.message }
        }
        if (data.session && data.user) {
          setUser(data.user)
          setSession(data.session)
          await resolveUserBusiness(data.user.id)
          return { success: true, requiresVerification: false }
        }
        if (data.user && !data.session) {
          return { success: true, requiresVerification: true }
        }
      }

      // Offline / Local Sandbox Sign Up
      const syntheticUser = {
        id: `usr_${Math.random().toString(36).substring(2, 10)}`,
        email: email.trim(),
        app_metadata: {},
        user_metadata: { full_name: fullName },
        aud: 'authenticated',
        created_at: new Date().toISOString()
      } as User

      setUser(syntheticUser)
      localStorage.setItem(LOCAL_USER_STORAGE_KEY, JSON.stringify(syntheticUser))
      setActiveBusiness(null)
      return { success: true, requiresVerification: false }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sign-up failed'
      return { success: false, error: msg }
    }
  }

  // Sign Out
  const signOut = async (): Promise<void> => {
    try {
      if (supabase && isSupabaseConfigured()) {
        await supabase.auth.signOut()
      }
    } catch {
      // Ignore network errors on signout
    } finally {
      setUser(null)
      setSession(null)
      setActiveBusiness(null)
      localStorage.removeItem(LOCAL_USER_STORAGE_KEY)
      localStorage.removeItem(LOCAL_ACTIVE_BIZ_KEY)
    }
  }

  // Reset Password
  const resetPassword = async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      if (supabase && isSupabaseConfigured()) {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/portal?action=reset_password`
        })
        if (error) {
          return { success: false, error: error.message }
        }
        return { success: true }
      }
      return { success: true }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Password reset failed'
      return { success: false, error: msg }
    }
  }

  const hasCompletedOnboarding = Boolean(activeBusiness && activeBusiness.id)

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        activeBusiness,
        userRole,
        isLoading,
        isAuthenticated: Boolean(user),
        hasCompletedOnboarding,
        signIn,
        signUp,
        signOut,
        resetPassword,
        refreshActiveBusiness,
        setActiveBusinessId
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
