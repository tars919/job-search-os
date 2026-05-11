'use client'

import { useState } from 'react'
import { getSupabase } from '@/lib/supabase/client'

type Mode = 'signin' | 'signup' | 'reset'

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' } | null>(null)

  const supabase = getSupabase()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) {
          setMessage({ text: error.message, type: 'error' })
        } else {
          window.location.href = '/'
        }
      } else if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) {
          setMessage({ text: error.message, type: 'error' })
        } else {
          setMessage({ text: 'Check your email for a confirmation link.', type: 'success' })
        }
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/callback`,
        })
        if (error) {
          setMessage({ text: error.message, type: 'error' })
        } else {
          setMessage({ text: 'Password reset email sent. Check your inbox.', type: 'success' })
        }
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-blue-600 mb-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <rect x="2" y="7" width="20" height="14" rx="2" />
              <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-zinc-900">Job Search OS</h1>
          <p className="mt-1 text-sm text-zinc-400">Your personal job search dashboard</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-6">
          {/* Mode tabs */}
          {mode !== 'reset' && (
            <div className="flex rounded-lg border border-zinc-200 p-0.5 mb-5">
              {(['signin', 'signup'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setMessage(null) }}
                  className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    mode === m
                      ? 'bg-blue-600 text-white'
                      : 'text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  {m === 'signin' ? 'Sign In' : 'Sign Up'}
                </button>
              ))}
            </div>
          )}

          {mode === 'reset' && (
            <div className="mb-5">
              <h2 className="text-sm font-semibold text-zinc-900">Reset your password</h2>
              <p className="mt-0.5 text-xs text-zinc-400">We&apos;ll send a reset link to your email.</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {mode !== 'reset' && (
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={6}
                  className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}

            {message && (
              <p
                className={`text-xs rounded-lg px-3 py-2 ${
                  message.type === 'error'
                    ? 'bg-red-50 text-red-600'
                    : 'bg-emerald-50 text-emerald-700'
                }`}
              >
                {message.text}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors disabled:opacity-60"
            >
              {loading
                ? 'Please wait…'
                : mode === 'signin'
                ? 'Sign In'
                : mode === 'signup'
                ? 'Create Account'
                : 'Send Reset Email'}
            </button>
          </form>

          {/* Footer links */}
          <div className="mt-4 text-center">
            {mode === 'reset' ? (
              <button
                onClick={() => { setMode('signin'); setMessage(null) }}
                className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
              >
                Back to sign in
              </button>
            ) : (
              <button
                onClick={() => { setMode('reset'); setMessage(null) }}
                className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                Forgot password?
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
