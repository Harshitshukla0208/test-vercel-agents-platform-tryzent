"use client"

import type React from "react"
import { useEffect, useState } from "react"
import axios from "axios"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Mail, Lock, Eye, EyeOff, Sparkles, Shield, Zap } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import ErrorAlert from "@/components/AuthErrors"

// Helper function for cookie management
const setCookie = (name: string, value: string, hours: number) => {
  const expires = new Date(Date.now() + hours * 60 * 60 * 1000).toUTCString()
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`
}

// Enhanced and robust redirection manager (adapted from main auth file)
class RedirectionManager {
  private static readonly REDIRECT_KEY = 'redirectAfterLogin';
  private static readonly AGENT_SOURCE_KEY = 'authFromAgent';
  private static readonly FROM_HOME_KEY = 'authFromHome';
  private static readonly GOOGLE_AUTH_STATE_KEY = 'googleAuthRedirectState';

  // Store the intended destination with multiple fallbacks
  static setRedirectDestination(path: string, fromAgent: boolean = false, fromHome: boolean = false): void {
    if (typeof window !== 'undefined') {
      const redirectData = {
        path,
        fromAgent,
        fromHome,
        timestamp: Date.now(),
        source: fromAgent ? 'agent' : fromHome ? 'home' : 'direct'
      };

      // Store in sessionStorage (primary)
      sessionStorage.setItem(this.REDIRECT_KEY, path);
      if (fromAgent) {
        sessionStorage.setItem(this.AGENT_SOURCE_KEY, 'true');
      }
      if (fromHome) {
        sessionStorage.setItem(this.FROM_HOME_KEY, 'true');
      }

      // Store in localStorage as fallback for Google OAuth (persists across redirects)
      localStorage.setItem(this.GOOGLE_AUTH_STATE_KEY, JSON.stringify(redirectData));

      console.log('🔍 Stored redirect destination:', redirectData);
    }
  }

  // Get redirect destination with robust fallback logic
  static getAndClearRedirectDestination(): string {
    if (typeof window !== 'undefined') {
      console.log('🔍 Getting redirect destination...');

      // Method 1: Try sessionStorage first (normal flow)
      const savedDestination = sessionStorage.getItem(this.REDIRECT_KEY);
      const fromAgent = sessionStorage.getItem(this.AGENT_SOURCE_KEY) === 'true';
      const fromHome = sessionStorage.getItem(this.FROM_HOME_KEY) === 'true';

      console.log('📱 SessionStorage data:', { savedDestination, fromAgent, fromHome });

      // Method 2: Fallback to localStorage (Google OAuth flow)
      let googleAuthState = null;
      try {
        const storedState = localStorage.getItem(this.GOOGLE_AUTH_STATE_KEY);
        if (storedState) {
          googleAuthState = JSON.parse(storedState);
          console.log('💾 Google auth state from localStorage:', googleAuthState);
        }
      } catch (error) {
        console.error('Error parsing Google auth state:', error);
      }

      // Clean up storage
      sessionStorage.removeItem(this.REDIRECT_KEY);
      sessionStorage.removeItem(this.AGENT_SOURCE_KEY);
      sessionStorage.removeItem(this.FROM_HOME_KEY);
      localStorage.removeItem(this.GOOGLE_AUTH_STATE_KEY);

      // Priority 1: Agent redirection from sessionStorage
      if (savedDestination && fromAgent) {
        console.log('✅ Redirecting to agent from sessionStorage:', savedDestination);
        return savedDestination;
      }

      // Priority 2: Agent redirection from localStorage (Google OAuth fallback)
      if (googleAuthState?.fromAgent && googleAuthState?.path) {
        console.log('✅ Redirecting to agent from Google auth state:', googleAuthState.path);
        return googleAuthState.path;
      }

      // Priority 3: Any saved destination from sessionStorage
      if (savedDestination) {
        console.log('✅ Redirecting to saved destination:', savedDestination);
        return savedDestination;
      }

      // Priority 4: Any saved destination from localStorage
      if (googleAuthState?.path && !googleAuthState.fromHome) {
        console.log('✅ Redirecting to Google auth state path:', googleAuthState.path);
        return googleAuthState.path;
      }

      // Priority 5: Home page redirect
      if (fromHome || googleAuthState?.fromHome) {
        console.log('🏠 Redirecting to browse (from home)');
        return '/browse';
      }

      // Default fallback
      console.log('🔄 Using default redirect to browse');
      return '/browse';
    }

    return '/browse';
  }

  // Check if coming from agent (with localStorage fallback)
  static isFromAgent(): boolean {
    if (typeof window !== 'undefined') {
      // Check sessionStorage first
      const sessionFromAgent = sessionStorage.getItem(this.AGENT_SOURCE_KEY) === 'true';
      if (sessionFromAgent) return true;

      // Fallback to localStorage
      try {
        const storedState = localStorage.getItem(this.GOOGLE_AUTH_STATE_KEY);
        if (storedState) {
          const googleAuthState = JSON.parse(storedState);
          return googleAuthState?.fromAgent === true;
        }
      } catch (error) {
        console.error('Error checking agent state:', error);
      }
    }
    return false;
  }

  // Debug method to check current state
  static debugCurrentState(): void {
    if (typeof window !== 'undefined') {
      console.log('🛠 Current redirect state:', {
        sessionStorage: {
          redirectAfterLogin: sessionStorage.getItem(this.REDIRECT_KEY),
          authFromAgent: sessionStorage.getItem(this.AGENT_SOURCE_KEY),
          authFromHome: sessionStorage.getItem(this.FROM_HOME_KEY),
        },
        localStorage: {
          googleAuthState: localStorage.getItem(this.GOOGLE_AUTH_STATE_KEY),
        }
      });
    }
  }
}

// Google OAuth configuration with account selection (from main auth file)
const getGoogleOAuthURL = (): string => {
  const authUrl = process.env.NEXT_PUBLIC_COGNITO_DOMAIN;
  if (!authUrl) {
    throw new Error('Google OAuth URL not configured');
  }

  // Generate a unique state parameter for OAuth security
  const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  
  // Store the state in sessionStorage for validation with 10-minute timeout
  if (typeof window !== 'undefined') {
    const timestamp = Date.now();
    sessionStorage.setItem('oauth_state', state);
    sessionStorage.setItem('oauth_timestamp', timestamp.toString());
    
    // Clean up old OAuth states
    const oldStates = Object.keys(sessionStorage).filter(key => 
      key.startsWith('oauth_') && key !== 'oauth_state' && key !== 'oauth_timestamp'
    );
    oldStates.forEach(key => sessionStorage.removeItem(key));
  }

  // Add prompt=select_account to force account selection and state for security
  const separator = authUrl.includes('?') ? '&' : '?';
  return `${authUrl}${separator}prompt=select_account&state=${state}`;
};

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  agentName: string
  agentId?: string // Add agentId prop for proper redirection
}

export default function AuthModal({ isOpen, onClose, onSuccess, agentName, agentId }: AuthModalProps) {
  const [view, setView] = useState<"login" | "signup" | "confirm" | "resetRequest" | "resetConfirm">("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [signupPassword, setSignupPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [confirmationCode, setConfirmationCode] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [error, setError] = useState<string | { message: string; code?: string; details?: string[] } | null>(null)
  const [loading, setLoading] = useState(false)
  const [isRedirecting, setIsRedirecting] = useState(false)

  useEffect(() => {
    // Reset form when modal opens/closes
    if (!isOpen) {
      setView("login")
      setEmail("")
      setPassword("")
      setSignupPassword("")
      setConfirmationCode("")
      setNewPassword("")
      setShowPassword(false)
      setShowNewPassword(false)
      setAcceptTerms(false)
      setError(null)
      setLoading(false)
      setIsRedirecting(false)
      
      // Clean up OAuth state when modal closes
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('oauth_state');
        sessionStorage.removeItem('oauth_timestamp');
      }
    }
  }, [isOpen])

  // Set up redirect destination when modal opens
  useEffect(() => {
    if (isOpen && agentId) {
      console.log('🤖 Setting agent redirect for modal:', agentId);
      RedirectionManager.setRedirectDestination(`/agent/${agentId}`, true, false);
      RedirectionManager.debugCurrentState();
    }
    
    // Clean up OAuth state on component unmount
    return () => {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('oauth_state');
        sessionStorage.removeItem('oauth_timestamp');
      }
    };
  }, [isOpen, agentId])

  // Clear signup password when leaving confirm view
  useEffect(() => {
    if (view !== "confirm" && signupPassword) {
      setSignupPassword("")
    }
  }, [view, signupPassword])

  // Enhanced Google OAuth callback handler (from main auth file)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');
    const state = urlParams.get('state');

    // Validate state to prevent CSRF attacks
    const storedState = sessionStorage.getItem('oauth_state');
    const timestamp = sessionStorage.getItem('oauth_timestamp');
    const currentTimestamp = Date.now();
    const oauthTimeout = 10 * 60 * 1000; // 10 minutes timeout

    if (error) {
      console.error('❌ Google OAuth error:', error);
      setError('Google authentication was cancelled or failed.');
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (code && state && storedState && timestamp && state === storedState && (currentTimestamp - parseInt(timestamp)) < oauthTimeout) {
      console.log('🔑 Google OAuth code received, processing...');
      // Clean up URL first
      window.history.replaceState({}, document.title, window.location.pathname);
      handleGoogleCallback(code);
    } else if (code && state && storedState && timestamp && state === storedState && (currentTimestamp - parseInt(timestamp)) >= oauthTimeout) {
      console.error('⚠️ Google OAuth state expired. Please try again.');
      setError('Google authentication failed due to state expiration. Please try again.');
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (code && !state) {
      console.error('⚠️ Google OAuth missing state parameter.');
      setError('Google authentication failed due to missing state parameter. Please try again.');
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (code && !storedState) {
      console.error('⚠️ Google OAuth missing state in sessionStorage.');
      setError('Google authentication failed due to missing state in sessionStorage. Please try again.');
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (code && state !== storedState) {
      console.error('⚠️ Google OAuth state mismatch. Please try again.');
      setError('Google authentication failed due to state mismatch. Please try again.');
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Enhanced success handler with better logging (from main auth file)
  const handleSuccessfulAuth = async (access_token: string, login_id?: string): Promise<void> => {
    try {
      console.log('🎉 Starting authentication success flow...');
      setIsRedirecting(true);

      // Set cookies
      setCookie('access_token', access_token, 1);
      if (login_id) {
        setCookie('login_id', login_id, 1);
      }

      // Set email cookie
      const emailForCookie = login_id || email;
      if (emailForCookie) {
        setCookie('userEmail', emailForCookie, 24 * 7);
      }

      // Debug state before getting redirect destination
      RedirectionManager.debugCurrentState();

      // Get the intended destination
      const redirectDestination = RedirectionManager.getAndClearRedirectDestination();
      console.log('🎯 Final redirect destination:', redirectDestination);

      // Close modal first
      onClose();

      // Small delay to ensure cookies are set and modal closes
      await new Promise(resolve => setTimeout(resolve, 100));

      // Use window.location for reliable redirection
      console.log('🚀 Redirecting to:', redirectDestination);
      window.location.href = redirectDestination;

      // Call onSuccess callback if provided
      onSuccess?.();

    } catch (error) {
      console.error('❌ Authentication success handler error:', error);
      // Fallback redirect
      window.location.href = agentId ? `/agent/${agentId}` : '/browse';
    }
  };

  // Simplified Google Sign-In (redirect-based) - adapted from main auth file
  const handleGoogleSignIn = (): void => {
    try {
      setError(null);
      setLoading(true);

      console.log('🚀 Initiating Google Sign-In...');
      
      // Ensure redirect destination is stored before redirecting to Google OAuth
      // This is critical because Google OAuth redirects to a different page
      if (agentId) {
        const redirectPath = `/agent/${agentId}`;
        RedirectionManager.setRedirectDestination(redirectPath, true, false);
      }
      
      RedirectionManager.debugCurrentState();

      const googleUrl = getGoogleOAuthURL();
      console.log('🔗 Redirecting to Google OAuth:', googleUrl);

      // Redirect to Google OAuth
      window.location.href = googleUrl;

    } catch (error) {
      console.error('❌ Google sign-in error:', error);
      setLoading(false);
      setError('Failed to initiate Google sign-in. Please try again later.');
    }
  };

  // Enhanced Google OAuth callback handler (from main auth file)
  const handleGoogleCallback = async (code: string): Promise<void> => {
    try {
      setLoading(true);
      console.log('🔄 Processing Google OAuth callback...');
      RedirectionManager.debugCurrentState();

      const response = await axios.post('/api/auth/google', { code }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 15000
      });

      if (response.data?.status && response.data?.access_token) {
        const userIdentifier = response.data?.user?.sub ||
          response.data?.user?.email ||
          response.data?.user?.username ||
          'google_user';

        console.log('✅ Google OAuth successful, proceeding with auth...');
        await handleSuccessfulAuth(response.data.access_token, userIdentifier);
      } else {
        console.error('❌ Authentication failed - invalid response:', response.data);
        setError({ message: 'Google authentication failed. Please try again.' });
      }
    } catch (error) {
      console.error('❌ Google OAuth callback error:', error);

      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.message ||
          error.response?.data?.detail ||
          'Google authentication failed. Please try again.';
        setError({
          message: errorMessage,
          code: error.response?.data?.code
        });
      } else {
        setError({ message: 'Google authentication failed. Please try again.' });
      }
    } finally {
      setLoading(false);
    }
  };

  // Regular login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const response = await axios.post("/api/auth/login", { email, password }, { timeout: 15000 })
      await handleSuccessfulAuth(response.data.access_token, response.data.login_id)
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError({
          message: err.response?.data?.message || "An error occurred during login",
          code: err.response?.data?.code,
          details: err.response?.data?.details,
        })
      } else {
        setError({ message: "An unexpected error occurred" })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    if (!email || !password) {
      setError("Email and password are required")
      setLoading(false)
      return
    }
    if (!acceptTerms) {
      setError("You must accept the Terms and Conditions to create an account")
      setLoading(false)
      return
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address")
      setLoading(false)
      return
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters long")
      setLoading(false)
      return
    }

    try {
      const response = await axios.post("/api/auth/sign-up", { email, password }, { timeout: 15000 })

      if (response.data?.data?.status === "exists") {
        setError({
          message:
            response.data.data.message || "This email is already registered. Please sign in or reset your password.",
          code: "USER_EXISTS",
        })
        setLoading(false)
        return
      }

      setSignupPassword(password)
      setPassword("")
      setView("confirm")
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const errorData = err.response?.data
        if (errorData?.data?.status === "exists") {
          setError({
            message:
              errorData.data.message || "This email is already registered. Please sign in or reset your password.",
            code: "USER_EXISTS",
          })
        } else if (
          errorData?.code === "UsernameExistsException" ||
          errorData?.message?.includes("already registered")
        ) {
          setError({
            message: "This email is already registered. Please sign in or reset your password.",
            code: errorData?.code || "USER_EXISTS",
          })
        } else {
          setError({
            message: errorData?.message || "An error occurred during signup",
            code: errorData?.code,
            details: errorData?.details,
          })
        }
      } else {
        setError({ message: "An unexpected error occurred" })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmSignUp = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const response = await axios.post(
        "/api/auth/confirm-sign-up",
        { email, confirmation_code: confirmationCode, password: signupPassword },
        { timeout: 15000 },
      )

      if (response.data.access_token) {
        setSignupPassword("")
        await handleSuccessfulAuth(response.data.access_token, response.data.login_id)
      } else {
        setSignupPassword("")
        setView("login")
        setError({ message: "Account confirmed successfully. Please log in." })
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError({
          message: err.response?.data?.message || "An error occurred during confirmation",
          code: err.response?.data?.code,
          details: err.response?.data?.details,
        })
      } else {
        setError({ message: "An unexpected error occurred" })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleResendConfirmationCode = async () => {
    setError("")
    setLoading(true)
    try {
      await axios.post(`/api/auth/resend-confirmation-code?username=${encodeURIComponent(email)}`)
      setError({ message: "Confirmation code resent. Please check your email." })
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError({
          message: err.response?.data?.message || "An error occurred while resending confirmation code",
          code: err.response?.data?.code,
          details: err.response?.data?.details,
        })
      } else {
        setError({ message: "An unexpected error occurred" })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleResetPasswordRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      await axios.post("/api/auth/password-reset/initiate", { email })
      setView("resetConfirm")
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError({
          message: err.response?.data?.message || "An error occurred during password reset request",
          code: err.response?.data?.code,
          details: err.response?.data?.details,
        })
      } else {
        setError({ message: "An unexpected error occurred" })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleResetPasswordConfirm = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      await axios.post("/api/auth/password-reset/confirm", {
        email,
        confirmation_code: confirmationCode,
        new_password: newPassword,
      })
      setView("login")
      setError({ message: "Password reset successful. Please log in with your new password." })
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError({
          message: err.response?.data?.message || "An error occurred during password reset confirmation",
          code: err.response?.data?.code,
          details: err.response?.data?.details,
        })
      } else {
        setError({ message: "An unexpected error occurred" })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleViewChange = (newView: typeof view) => {
    if (newView !== "confirm") setSignupPassword("")
    if (newView === "login") {
      setPassword("")
      setConfirmationCode("")
      setNewPassword("")
    }
    setError(null)
    setView(newView)
  }

  const buttonVariants = {
    hover: { scale: 1.02 },
    tap: { scale: 0.98 },
  }

  // Google Sign-In Button Component (simplified, using redirect method)
  const GoogleSignInButton = () => (
    <motion.button
      type="button"
      onClick={handleGoogleSignIn}
      disabled={loading || isRedirecting}
      className="w-full flex items-center justify-center px-4 py-3 border border-gray-200 rounded-xl shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-md"
      variants={buttonVariants}
      whileHover={!loading && !isRedirecting ? "hover" : {}}
      whileTap={!loading && !isRedirecting ? "tap" : {}}
      aria-label="Continue with Google"
    >
      {loading || isRedirecting ? (
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-700"></div>
          <span>{isRedirecting ? "Redirecting..." : "Signing in..."}</span>
        </div>
      ) : (
        <div className="flex items-center space-x-3">
          <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          <span>Continue with Google</span>
        </div>
      )}
    </motion.button>
  )

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.95, y: 20 },
  }

  const contentVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  }

  // Show redirecting overlay when redirecting
  if (isRedirecting) {
    return (
      <Dialog open={true} onOpenChange={() => { }}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden border-0 bg-white shadow-2xl">
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
              <p className="text-lg font-medium text-gray-900">Redirecting...</p>
              <p className="text-sm text-gray-500">Taking you to {agentName}...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  const renderForm = () => {
    switch (view) {
      case "login":
        return (
          <motion.div
            className="space-y-6"
            variants={contentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.25 }}
          >
            <GoogleSignInButton />
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500 font-medium">Or sign in with email</span>
              </div>
            </div>
            <form onSubmit={handleLogin} className="space-y-5" aria-label="Login form">
              <div className="space-y-2">
                <Label htmlFor="login-email" className="text-sm font-medium text-gray-700">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" aria-hidden="true" />
                  <Input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="pl-10 h-12 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-indigo-500 transition-colors"
                    required
                    disabled={isRedirecting}
                    autoComplete="email"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password" className="text-sm font-medium text-gray-700">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" aria-hidden="true" />
                  <Input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="pl-10 pr-12 h-12 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-indigo-500 transition-colors"
                    required
                    disabled={isRedirecting}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 transition-colors"
                    disabled={isRedirecting}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <motion.button
                type="submit"
                className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading || isRedirecting}
                variants={buttonVariants}
                whileHover={!loading && !isRedirecting ? "hover" : {}}
                whileTap={!loading && !isRedirecting ? "tap" : {}}
              >
                {loading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Signing in...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <Zap className="h-4 w-4" />
                    <span>Sign In</span>
                  </div>
                )}
              </motion.button>
            </form>
          </motion.div>
        )
      case "signup":
        return (
          <motion.div
            className="space-y-6"
            variants={contentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.25 }}
          >
            <GoogleSignInButton />
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500 font-medium">Or create account with email</span>
              </div>
            </div>
            <form onSubmit={handleSignUp} className="space-y-5" aria-label="Sign up form">
              <div className="space-y-2">
                <Label htmlFor="signup-email" className="text-sm font-medium text-gray-700">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" aria-hidden="true" />
                  <Input
                    id="signup-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="pl-10 h-12 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-indigo-500 transition-colors"
                    required
                    disabled={isRedirecting}
                    autoComplete="email"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password" className="text-sm font-medium text-gray-700">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" aria-hidden="true" />
                  <Input
                    id="signup-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a strong password"
                    className="pl-10 pr-12 h-12 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-indigo-500 transition-colors"
                    required
                    disabled={isRedirecting}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 transition-colors"
                    disabled={isRedirecting}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <p className="text-xs text-gray-500">Must be at least 8 characters long</p>
              </div>

              <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center h-5">
                  <input
                    id="terms"
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500 focus:ring-2"
                    disabled={isRedirecting}
                  />
                </div>
                <div className="text-sm">
                  <label htmlFor="terms" className="text-gray-600">
                    I agree to the{" "}
                    <Link
                      href="/terms-and-conditions"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-800 hover:underline font-medium"
                    >
                      Terms and Conditions
                    </Link>{" "}
                    and{" "}
                    <Link
                      href="/privacy-policy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-800 hover:underline font-medium"
                    >
                      Privacy Policy
                    </Link>
                  </label>
                </div>
              </div>

              <motion.button
                type="submit"
                className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading || isRedirecting}
                variants={buttonVariants}
                whileHover={!loading && !isRedirecting ? "hover" : {}}
                whileTap={!loading && !isRedirecting ? "tap" : {}}
              >
                {loading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Creating account...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <Sparkles className="h-4 w-4" />
                    <span>Create Account</span>
                  </div>
                )}
              </motion.button>
            </form>
          </motion.div>
        )
      case "confirm":
        return (
          <motion.div
            className="space-y-6"
            variants={contentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.25 }}
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="h-8 w-8 text-indigo-600" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Check Your Email</h3>
              <p className="text-sm text-gray-600 mb-6">
                We&apos;ve sent a verification code to <strong>{email}</strong>. Please enter the code below.
              </p>
            </div>
            <form onSubmit={handleConfirmSignUp} className="space-y-5" aria-label="Confirm email form">
              <div className="space-y-2">
                <Label htmlFor="confirmation-code" className="text-sm font-medium text-gray-700">
                  Verification Code
                </Label>
                <Input
                  id="confirmation-code"
                  type="text"
                  value={confirmationCode}
                  onChange={(e) => setConfirmationCode(e.target.value)}
                  placeholder="Enter 6-digit code"
                  className="h-12 text-center text-lg font-mono border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-indigo-500 transition-colors"
                  maxLength={6}
                  required
                />
              </div>
              <motion.button
                type="submit"
                className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
                variants={buttonVariants}
                whileHover={!loading ? "hover" : {}}
                whileTap={!loading ? "tap" : {}}
              >
                {loading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Verifying...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <Shield className="h-4 w-4" />
                    <span>Verify & Continue</span>
                  </div>
                )}
              </motion.button>
              <motion.button
                type="button"
                onClick={handleResendConfirmationCode}
                className="w-full text-sm text-indigo-600 hover:text-indigo-800 hover:underline font-medium"
                disabled={loading}
                variants={buttonVariants}
                whileHover={!loading ? "hover" : {}}
                whileTap={!loading ? "tap" : {}}
              >
                Didn&apos;t receive the code? Resend
              </motion.button>
            </form>
          </motion.div>
        )
      case "resetRequest":
        return (
          <motion.div
            className="space-y-6"
            variants={contentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.25 }}
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="h-8 w-8 text-indigo-600" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Reset Your Password</h3>
              <p className="text-sm text-gray-600 mb-6">Enter your email and we&apos;ll send you a reset code.</p>
            </div>
            <form onSubmit={handleResetPasswordRequest} className="space-y-5" aria-label="Password reset request form">
              <div className="space-y-2">
                <Label htmlFor="reset-email" className="text-sm font-medium text-gray-700">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" aria-hidden="true" />
                  <Input
                    id="reset-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="pl-10 h-12 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-indigo-500 transition-colors"
                    required
                  />
                </div>
              </div>
              <motion.button
                type="submit"
                className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
                variants={buttonVariants}
                whileHover={!loading ? "hover" : {}}
                whileTap={!loading ? "tap" : {}}
              >
                {loading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Sending...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <Mail className="h-4 w-4" />
                    <span>Send Reset Code</span>
                  </div>
                )}
              </motion.button>
            </form>
          </motion.div>
        )
      case "resetConfirm":
        return (
          <motion.div
            className="space-y-6"
            variants={contentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.25 }}
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-indigo-600" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Create New Password</h3>
              <p className="text-sm text-gray-600 mb-6">Enter the code we sent and your new password.</p>
            </div>
            <form onSubmit={handleResetPasswordConfirm} className="space-y-5" aria-label="Password reset confirm form">
              <div className="space-y-2">
                <Label htmlFor="reset-code" className="text-sm font-medium text-gray-700">
                  Confirmation Code
                </Label>
                <Input
                  id="reset-code"
                  type="text"
                  value={confirmationCode}
                  onChange={(e) => setConfirmationCode(e.target.value)}
                  placeholder="Enter confirmation code"
                  className="h-12 text-center font-mono border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-indigo-500 transition-colors"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password" className="text-sm font-medium text-gray-700">
                  New Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" aria-hidden="true" />
                  <Input
                    id="new-password"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Create a new password"
                    className="pl-10 pr-12 h-12 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-indigo-500 transition-colors"
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label={showNewPassword ? "Hide password" : "Show password"}
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <motion.button
                type="submit"
                className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
                variants={buttonVariants}
                whileHover={!loading ? "hover" : {}}
                whileTap={!loading ? "tap" : {}}
              >
                {loading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Resetting...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <Shield className="h-4 w-4" />
                    <span>Reset Password</span>
                  </div>
                )}
              </motion.button>
            </form>
          </motion.div>
        )
    }
  }

  const getWelcomeMessage = () => {
    switch (view) {
      case "login":
        return { title: "Welcome back!", subtitle: `Sign in to continue using ${agentName}` }
      case "signup":
        return { title: "Create your account", subtitle: `Get instant access to ${agentName}` }
      case "resetRequest":
        return { title: "Reset Password", subtitle: "We'll help you get back into your account" }
      case "resetConfirm":
        return { title: "Almost there", subtitle: "Enter the code and your new password" }
      case "confirm":
        return { title: "Verify Your Email", subtitle: "Check your email for the verification code" }
      default:
        return { title: "Welcome", subtitle: "Access your account" }
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent className="sm:max-w-md p-0 overflow-hidden border-0 bg-white shadow-2xl">
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <DialogHeader className="p-6 pb-4 bg-indigo-600 text-white relative overflow-hidden">
                <div className="absolute inset-0 opacity-20">
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundImage:
                        "radial-gradient(circle at 25% 25%, white 1px, transparent 1px), radial-gradient(circle at 75% 75%, white 1px, transparent 1px)",
                      backgroundSize: "20px 20px",
                    }}
                  />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center justify-center mb-4">
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ duration: 0.5, delay: 0.1 }}
                      className="relative"
                    >
                      <div className="absolute inset-0 bg-white/20 rounded-full blur-xl" />
                      <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center relative z-10">
                        <Sparkles className="h-6 w-6 text-white" />
                      </div>
                    </motion.div>
                  </div>
                  <DialogTitle className="text-center text-xl font-bold">{getWelcomeMessage().title}</DialogTitle>
                  <p className="text-center text-indigo-100 text-sm mt-2">{getWelcomeMessage().subtitle}</p>
                </div>
              </DialogHeader>

              <div className="p-6">
                <ErrorAlert error={error} onDismiss={() => setError(null)} />
                <AnimatePresence mode="wait">{renderForm()}</AnimatePresence>
                <div className="mt-6 text-center space-y-3">
                  {view === "login" && (
                    <>
                      <p className="text-sm text-gray-600">
                        Don&apos;t have an account?{" "}
                        <motion.button
                          className="text-indigo-600 hover:text-indigo-800 font-medium hover:underline"
                          onClick={() => handleViewChange("signup")}
                          variants={buttonVariants}
                          whileHover="hover"
                          whileTap="tap"
                        >
                          Sign Up
                        </motion.button>
                      </p>
                      <p className="text-sm text-gray-600">
                        <motion.button
                          className="text-indigo-600 hover:text-indigo-800 font-medium hover:underline"
                          onClick={() => handleViewChange("resetRequest")}
                          variants={buttonVariants}
                          whileHover="hover"
                          whileTap="tap"
                        >
                          Forgot Password?
                        </motion.button>
                      </p>
                    </>
                  )}
                  {view === "signup" && (
                    <p className="text-sm text-gray-600">
                      Already have an account?{" "}
                      <motion.button
                        className="text-indigo-600 hover:text-indigo-800 font-medium hover:underline"
                        onClick={() => handleViewChange("login")}
                        variants={buttonVariants}
                        whileHover="hover"
                        whileTap="tap"
                      >
                        Sign In
                      </motion.button>
                    </p>
                  )}
                  {(view === "resetRequest" || view === "resetConfirm") && (
                    <p className="text-sm text-gray-600">
                      Remember your password?{" "}
                      <motion.button
                        className="text-indigo-600 hover:text-indigo-800 font-medium hover:underline"
                        onClick={() => handleViewChange("login")}
                        variants={buttonVariants}
                        whileHover="hover"
                        whileTap="tap"
                      >
                        Sign In
                      </motion.button>
                    </p>
                  )}
                  {view === "confirm" && (
                    <p className="text-sm text-gray-600">
                      Want to use a different email?{" "}
                      <motion.button
                        className="text-indigo-600 hover:text-indigo-800 font-medium hover:underline"
                        onClick={() => handleViewChange("signup")}
                        variants={buttonVariants}
                        whileHover="hover"
                        whileTap="tap"
                      >
                        Go Back
                      </motion.button>
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  )
}
