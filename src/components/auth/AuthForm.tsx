'use client'
import { useEffect, useState, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import toast from 'react-hot-toast'
import Image from 'next/image'
import { Phone, Mail, Eye, EyeOff } from 'lucide-react'
import Logo from '@/assets/create-profile/LeoQuiIconBall.png'
import GoogleIcon from '@/assets/google.png'
import { redirectBasedOnProfile } from '@/utils/auth'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import PopupLoader from '@/components/PopupLoader'

const COGNITO_URL = process.env.NEXT_PUBLIC_COGNITO_URL

const setCookie = (name: string, value: string, hours: number) => {
  const expires = new Date(Date.now() + hours * 60 * 60 * 1000).toUTCString()
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`
}

class RedirectionManager {
  private static readonly KEY = 'leoquiRedirect'
  static set(path: string) {
    if (typeof window !== 'undefined') localStorage.setItem(this.KEY, path)
  }
  static pop(): string {
    if (typeof window === 'undefined') return '/profile/create'
    const v = localStorage.getItem(this.KEY)
    localStorage.removeItem(this.KEY)
    return v || '/profile/create'
  }
}

type View = 'login' | 'signup' | 'confirm' | 'resetRequest' | 'resetConfirm'

export function AuthForm() {
  const searchParams = useSearchParams();
  const initialView = (searchParams?.get('view') as View) || 'login';
  const [view, setView] = useState<View>(initialView);
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [confirmationCode, setConfirmationCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [showSignupPassword, setShowSignupPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)

  const handleSuccessfulAuth = useCallback(async (access_token: string, login_id?: string) => {
    setCookie('access_token', access_token, 1)
    if (login_id) setCookie('login_id', login_id, 1)
    toast.success('Logged in successfully')
    await redirectBasedOnProfile()
  }, [])

  const handleGoogleCallback = useCallback(async (code: string) => {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/google', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) })
      const data = await res.json()
      // Check for all error cases
      if (!res.ok || data.status === false || !(data?.access_token || data?.data?.access_token) || data?.access_token === 'undefined' || data?.data?.access_token === 'undefined') {
        const errorMsg = data?.message || data?.detail || 'Google authentication failed'
        toast.error(errorMsg)
        return
      }
      const userIdentifier = data?.user?.sub || data?.user?.email || data?.user?.username
      await handleSuccessfulAuth(data?.access_token || data?.data?.access_token, userIdentifier)
    } catch (err: unknown) {
      const error = err as Error
      toast.error(error.message || 'Google authentication failed')
    } finally {
      setLoading(false)
    }
  }, [handleSuccessfulAuth])

  useEffect(() => {
    const url = new URL(window.location.href)
    const code = url.searchParams.get('code')
    const error = url.searchParams.get('error')
    if (error) {
      toast.error('Google authentication failed')
      window.history.replaceState({}, document.title, window.location.pathname)
      return
    }
    if (code) {
      handleGoogleCallback(code)
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [handleGoogleCallback])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
      const data = await res.json()
      // Normalize and check for all error cases. The upstream API sometimes returns
      // 200 with { status: 'exists', message: '...' } or similar error shapes.
      // Treat any non-success status or missing token as an error.
      const apiStatus = data?.status
      if (!res.ok || apiStatus === false || apiStatus === 'exists' || apiStatus === 'error' || !data?.access_token || data.access_token === 'undefined') {
        const errorMsg = data?.message || data?.detail || 'Incorrect email or password'
        toast.error(errorMsg)
        return
      }
      await handleSuccessfulAuth(data.access_token, data.login_id)
    } catch (err: unknown) {
      const error = err as Error
      toast.error(error.message || 'An error occurred during login')
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/auth/sign-up', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
      const data = await res.json()
      // The backend may return HTTP 200 but indicate the email already exists via
      // a `status` field. Treat that as an error and show the message.
      const apiStatus = data?.status
      if (!res.ok) {
        throw new Error(data?.message || 'Signup failed')
      }
      if (apiStatus === 'exists' || apiStatus === false || apiStatus === 'error') {
        toast.error(data?.message || 'Signup failed')
        return
      }
      // Success path
      toast.success(data?.message || 'Verification code sent')
      setSignupPassword(password)
      setPassword('')
      setView('confirm')
    } catch (err: unknown) {
      const error = err as Error
      toast.error(error.message || 'An error occurred during signup')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/auth/confirm-sign-up', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, confirmation_code: confirmationCode, password: signupPassword }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || 'Confirmation failed')
      if (data?.access_token) {
        await handleSuccessfulAuth(data.access_token, data.login_id)
      } else {
        toast.success('Account confirmed, please login')
        setView('login')
      }
    } catch (err: unknown) {
      const error = err as Error
      toast.error(error.message || 'An error occurred during confirmation')
    } finally {
      setLoading(false)
    }
  }

  const handleResendCode = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/auth/resend-confirmation-code?username=${encodeURIComponent(email)}`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || 'Failed to resend code')
      toast.success(data?.message || 'Code resent successfully')
    } catch (err: unknown) {
      const error = err as Error
      toast.error(error.message || 'An error occurred while resending code')
    } finally {
      setLoading(false)
    }
  }

  const handleResetInit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/auth/password-reset/initiate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || 'Reset initiation failed')
      toast.success('Reset code sent to your email')
      setView('resetConfirm')
    } catch (err: unknown) {
      const error = err as Error
      toast.error(error.message || 'An error occurred during password reset')
    } finally {
      setLoading(false)
    }
  }

  const handleResetConfirm = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/auth/password-reset/confirm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, confirmation_code: confirmationCode, new_password: newPassword }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || 'Reset confirmation failed')
      toast.success('Password reset successful. Please log in.')
      setView('login')
    } catch (err: unknown) {
      const error = err as Error
      toast.error(error.message || 'An error occurred during password reset')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = () => {
    RedirectionManager.set('/profile/create')
    if (COGNITO_URL) {
      window.location.href = COGNITO_URL
    } else {
      console.error('NEXT_PUBLIC_COGNITO_URL environment variable is not set')
    }
  }

  return (
    <div className="min-h-screen w-full">
      <PopupLoader open={loading} label="Signing you in…" />
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-white/20 shadow-sm">
        <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-3">
          {/* Company Logo and Name */}
          <Link href="/">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 relative">
                <Image
                  src={Logo}
                  alt="LeoQui Logo"
                  fill
                  className="object-contain"
                />
              </div>
              <span className="text-lg font-bold text-[#714B90]">LeoQui</span>
            </div>
          </Link>


          {/* Contact Us button */}
          <div className="flex items-center gap-2">
            <Link target="_blank" href="https://calendly.com/tryzent-tech/30min">
              <button className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-700 hover:bg-white/60 transition-colors">
                <Phone size={16} className="hidden sm:inline" />
                <Mail size={16} className="sm:hidden" />
                <span className="text-xs font-medium">Contact Us</span>
              </button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="pt-20 pb-8 px-4 flex items-center justify-center min-h-screen">
        <div className="w-full sm:min-w-lg mx-auto bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6 border border-white/50">
          {/* Header with Logo */}
          <div className="space-y-3 text-center">
            <div className="flex items-center justify-center">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                Welcome to{' '}
                <span className="inline-flex items-center gap-1 align-middle">
                  <span className="w-6 h-6 relative">
                    <Image
                      src={Logo}
                      alt="LeoQui Logo"
                      fill
                      className="object-contain"
                    />
                  </span>
                  <span className="text-[#714B90]">LeoQui</span>
                </span>
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-gray-700 font-medium">Sign in or create an account to continue</p>
          </div>

          {view === 'login' && (
            <div className="space-y-5">
              <Button
                className="w-full h-12 text-sm font-medium bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 shadow-sm"
                variant="outline"
                onClick={handleGoogle}
                disabled={loading}
              >
                <div className="w-5 h-5 relative mr-3">
                  <Image
                    src={GoogleIcon}
                    alt="Google"
                    fill
                    className="object-contain"
                  />
                </div>
                Continue with Google
              </Button>
              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-gray-300"></div>
                <span className="text-sm text-gray-600 font-medium">or continue with email</span>
                <div className="flex-1 h-px bg-gray-300"></div>
              </div>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-gray-800 font-medium text-sm">Email</Label>
                  <Input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    required
                    className="h-12 text-sm bg-white/80 border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 text-gray-900 placeholder:text-gray-500"
                    placeholder="Enter your email"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-800 font-medium text-sm">Password</Label>
                  <div className="relative">
                    <Input
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      type={showLoginPassword ? 'text' : 'password'}
                      required
                      className="h-12 pr-10 text-sm bg-white/80 border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 text-gray-900 placeholder:text-gray-500"
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword((v) => !v)}
                      className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-gray-700"
                      aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                      title={showLoginPassword ? 'Hide password' : 'Show password'}
                    >
                      {showLoginPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full h-12 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white"
                  disabled={loading}
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
              <div className="text-center">
                <button
                  className="text-indigo-600 hover:text-indigo-800 font-medium text-sm transition-colors"
                  onClick={() => setView('resetRequest')}
                >
                  Forgot Password?
                </button>
              </div>
              <div className="text-center text-sm text-gray-700">
                Don&apos;t have an account? {' '}
                <button
                  className="text-indigo-600 hover:text-indigo-800 font-medium text-sm transition-colors"
                  onClick={() => setView('signup')}
                >
                  Sign Up
                </button>
              </div>
            </div>
          )}

          {view === 'signup' && (
            <div className="space-y-5">
              <Button
                className="w-full h-12 text-sm font-medium bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 shadow-sm"
                variant="outline"
                onClick={handleGoogle}
                disabled={loading}
              >
                <div className="w-5 h-5 relative mr-3">
                  <Image
                    src={GoogleIcon}
                    alt="Google"
                    fill
                    className="object-contain"
                  />
                </div>
                Continue with Google
              </Button>
              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-gray-300"></div>
                <span className="text-xs text-gray-600 font-medium">or sign up with email</span>
                <div className="flex-1 h-px bg-gray-300"></div>
              </div>
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-gray-800 font-medium text-sm">Email</Label>
                  <Input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    required
                    className="h-12 text-sm bg-white/80 border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 text-gray-900 placeholder:text-gray-500"
                    placeholder="Enter your email"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-800 font-medium text-sm">Password</Label>
                  <div className="relative">
                    <Input
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      type={showSignupPassword ? 'text' : 'password'}
                      required
                      className="h-12 pr-10 text-sm bg-white/80 border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 text-gray-900 placeholder:text-gray-500"
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignupPassword((v) => !v)}
                      className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-gray-700"
                      aria-label={showSignupPassword ? 'Hide password' : 'Show password'}
                      title={showSignupPassword ? 'Hide password' : 'Show password'}
                    >
                      {showSignupPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full h-12 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white"
                  disabled={loading}
                >
                  {loading ? 'Signing up...' : 'Sign Up'}
                </Button>
              </form>
              <div className="text-center text-sm text-gray-700">
                Already have an account? {' '}
                <button
                  className="text-indigo-600 hover:text-indigo-800 font-medium text-sm transition-colors"
                  onClick={() => setView('login')}
                >
                  Login
                </button>
              </div>
            </div>
          )}

          {view === 'confirm' && (
            <form onSubmit={handleConfirmSignUp} className="space-y-5">
              <div className="text-xs text-gray-700 bg-blue-50 p-4 rounded-lg border border-blue-200">
                We&apos;ve sent a verification code to <span className="font-semibold text-gray-900">{email}</span>.
              </div>
              <div className="space-y-2">
                <Label className="text-gray-800 font-medium text-sm">Verification Code</Label>
                <Input
                  value={confirmationCode}
                  onChange={(e) => setConfirmationCode(e.target.value)}
                  maxLength={6}
                  required
                  className="h-12 text-sm bg-white/80 border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 text-gray-900 text-center tracking-widest font-mono"
                  placeholder="Enter 6-digit code"
                />
              </div>
              <Button
                type="submit"
                className="w-full h-12 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white"
                disabled={loading}
              >
                {loading ? 'Verifying...' : 'Verify & Continue'}
              </Button>
              <Button
                type="button"
                variant="link"
                onClick={handleResendCode}
                disabled={loading}
                className="w-full text-indigo-600 hover:text-indigo-800 font-medium text-sm"
              >
                Resend Code
              </Button>
            </form>
          )}

          {view === 'resetRequest' && (
            <form onSubmit={handleResetInit} className="space-y-5">
              <div className="text-xs text-gray-700 bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                Enter your email address and we&apos;ll send you a code to reset your password.
              </div>
              <div className="space-y-2">
                <Label className="text-gray-800 font-medium text-sm">Email</Label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  required
                  className="h-12 text-sm bg-white/80 border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 text-gray-900 placeholder:text-gray-500"
                  placeholder="Enter your email"
                />
              </div>
              <Button
                type="submit"
                className="w-full h-12 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white"
                disabled={loading}
              >
                {loading ? 'Sending...' : 'Send Reset Code'}
              </Button>
              <div className="text-center text-xs text-gray-700">
                Remember password? {' '}
                <button
                  className="text-indigo-600 hover:text-indigo-800 font-medium text-xs transition-colors"
                  onClick={() => setView('login')}
                >
                  Login
                </button>
              </div>
            </form>
          )}

          {view === 'resetConfirm' && (
            <form onSubmit={handleResetConfirm} className="space-y-5">
              <div className="text-sm text-gray-700 bg-blue-50 p-4 rounded-lg border border-blue-200">
                Enter the code we sent to your email and your new password.
              </div>
              <div className="space-y-2">
                <Label className="text-gray-800 font-medium text-sm">Confirmation Code</Label>
                <Input
                  value={confirmationCode}
                  onChange={(e) => setConfirmationCode(e.target.value)}
                  required
                  className="h-12 text-sm bg-white/80 border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 text-gray-900 placeholder:text-gray-500"
                  placeholder="Enter confirmation code"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-800 font-medium text-sm">New Password</Label>
                <div className="relative">
                  <Input
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    className="h-12 pr-10 text-sm bg-white/80 border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 text-gray-900 placeholder:text-gray-500"
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-gray-700"
                    aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                    title={showNewPassword ? 'Hide password' : 'Show password'}
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <Button
                type="submit"
                className="w-full h-12 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white"
                disabled={loading}
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
