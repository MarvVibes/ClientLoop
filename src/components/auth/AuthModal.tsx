// ====================================================================
// CLIENTLOOP AUTHENTICATION MODAL (SIGN IN / SIGN UP / FORGOT PASSWORD)
// Connected to Supabase Auth with validation, error states & transitions
// ====================================================================

import React, { useState } from 'react'
import { Modal } from '../Modal'
import { useAuth } from '../../lib/auth/AuthContext'
import { 
  Mail, 
  Lock, 
  User as UserIcon, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight,
  Eye,
  EyeOff,
  ShieldCheck
} from 'lucide-react'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  initialMode?: 'signin' | 'signup' | 'forgot'
  onSuccess?: () => void
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'signin',
  onSuccess
}) => {
  const { signIn, signUp, resetPassword } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const resetForm = () => {
    setError(null)
    setSuccessMessage(null)
    setPassword('')
    setConfirmPassword('')
  }

  const handleSwitchMode = (newMode: 'signin' | 'signup' | 'forgot') => {
    resetForm()
    setMode(newMode)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMessage(null)

    if (!email.trim() || !email.includes('@')) {
      setError('Please provide a valid email address.')
      return
    }

    if (mode === 'signup') {
      if (password.length < 6) {
        setError('Password must be at least 6 characters long.')
        return
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.')
        return
      }

      setIsLoading(true)
      const res = await signUp(email, password, fullName)
      setIsLoading(false)

      if (!res.success) {
        setError(res.error || 'Failed to create account.')
        return
      }

      if (res.requiresVerification) {
        setSuccessMessage('Account created! Please check your email to verify your address before logging in.')
      } else {
        onSuccess?.()
        onClose()
      }
      return
    }

    if (mode === 'signin') {
      if (!password) {
        setError('Please enter your password.')
        return
      }

      setIsLoading(true)
      const res = await signIn(email, password)
      setIsLoading(false)

      if (!res.success) {
        setError(res.error || 'Invalid email or password.')
        return
      }

      onSuccess?.()
      onClose()
      return
    }

    if (mode === 'forgot') {
      setIsLoading(true)
      const res = await resetPassword(email)
      setIsLoading(false)

      if (!res.success) {
        setError(res.error || 'Failed to send password reset email.')
        return
      }

      setSuccessMessage('Password reset instructions sent. Please check your inbox.')
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        mode === 'signin'
          ? 'Sign in to ClientLoop'
          : mode === 'signup'
          ? 'Create your business account'
          : 'Reset your password'
      }
      subtitle={
        mode === 'signin'
          ? 'Access your customer directory, retention metrics, and visits.'
          : mode === 'signup'
          ? 'Start managing clients, WhatsApp follow-ups, and genuine reviews.'
          : 'Enter your email to receive a password reset link.'
      }
    >
      {/* Mode Switcher Tabs */}
      {mode !== 'forgot' && (
        <div className="flex border-b border-slate-200 mb-5">
          <button
            type="button"
            onClick={() => handleSwitchMode('signin')}
            className={`flex-1 py-2.5 text-xs font-semibold text-center border-b-2 transition-colors cursor-pointer ${
              mode === 'signin'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => handleSwitchMode('signup')}
            className={`flex-1 py-2.5 text-xs font-semibold text-center border-b-2 transition-colors cursor-pointer ${
              mode === 'signup'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Create Account
          </button>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
          <span>{successMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'signup' && (
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Your Full Name
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Doe"
                className="w-full text-xs sm:text-sm pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>
        )}

        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-1">
            Work Email Address
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@yourbusiness.com"
              className="w-full text-xs sm:text-sm pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
        </div>

        {mode !== 'forgot' && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">
                Password
              </label>
              {mode === 'signin' && (
                <button
                  type="button"
                  onClick={() => handleSwitchMode('forgot')}
                  className="text-[11px] text-blue-600 hover:underline font-medium cursor-pointer"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full text-xs sm:text-sm pl-9 pr-9 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}

        {mode === 'signup' && (
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full text-xs sm:text-sm pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>
        )}

        <div className="pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold text-xs sm:text-sm shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : mode === 'signin' ? (
              <>Sign In to Workspace <ArrowRight className="w-4 h-4" /></>
            ) : mode === 'signup' ? (
              <>Create Account & Set Up Business <ArrowRight className="w-4 h-4" /></>
            ) : (
              <>Send Reset Link <ArrowRight className="w-4 h-4" /></>
            )}
          </button>
        </div>

        {mode === 'forgot' && (
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => handleSwitchMode('signin')}
              className="text-xs text-blue-600 hover:underline font-semibold cursor-pointer"
            >
              ← Back to Sign In
            </button>
          </div>
        )}

        <div className="pt-3 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Strict multi-tenant Row Level Security & encrypted sessions</span>
        </div>
      </form>
    </Modal>
  )
}
