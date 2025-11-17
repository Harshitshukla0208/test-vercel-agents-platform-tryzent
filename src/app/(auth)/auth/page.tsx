'use client'
import React, { useState, useLayoutEffect, useEffect } from 'react';
import axios from 'axios';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import animation from '../../../assets/Animation - 1751668631265.json';
import Image from 'next/image';
import { motion } from 'framer-motion';
import logo from '../../../assets/logo.jpeg';
import ErrorAlert from '@/components/AuthErrors';
import SessionExpiredToast from '@/components/SessionExpiredToast';
import { Eye, EyeOff } from 'lucide-react';
import BgImage from '@/assets/216772b72be47c45b2b975cc6d2ca591798cd09a.png'
import Link from 'next/link';

// Load Lottie only on the client to avoid SSR issues (document is not defined)
const Lottie = dynamic(() => import('lottie-react'), { ssr: false });

// Helper function for cookie management
const setCookie = (name: string, value: string, hours: number) => {
    const expires = new Date(Date.now() + hours * 60 * 60 * 1000).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
};

// Enhanced and robust redirection manager
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
            
            console.log('📍 Stored redirect destination:', redirectData);
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

    // Check if coming from home (with localStorage fallback)
    static isFromHome(): boolean {
        if (typeof window !== 'undefined') {
            // Check sessionStorage first
            const sessionFromHome = sessionStorage.getItem(this.FROM_HOME_KEY) === 'true';
            if (sessionFromHome) return true;

            // Fallback to localStorage
            try {
                const storedState = localStorage.getItem(this.GOOGLE_AUTH_STATE_KEY);
                if (storedState) {
                    const googleAuthState = JSON.parse(storedState);
                    return googleAuthState?.fromHome === true;
                }
            } catch (error) {
                console.error('Error checking home state:', error);
            }
        }
        return false;
    }

    // Debug method to check current state
    static debugCurrentState(): void {
        if (typeof window !== 'undefined') {
            console.log('🐛 Current redirect state:', {
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

// Google OAuth configuration with account selection
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

const AuthForm: React.FC = () => {
    const searchParams = useSearchParams();
    const router = useRouter();

    const initialView = searchParams?.get('view') as 'login' | 'signup' | 'confirm' | 'resetRequest' | 'resetConfirm' || 'login';

    const [view, setView] = useState<'login' | 'signup' | 'confirm' | 'resetRequest' | 'resetConfirm'>(initialView);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [signupPassword, setSignupPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [confirmationCode, setConfirmationCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [acceptTerms, setAcceptTerms] = useState(false);
    const [error, setError] = useState<string | { message: string; code?: string; details?: string[] } | null>(null);
    const [loading, setLoading] = useState(false);
    const [isLargeScreen, setIsLargeScreen] = useState(false);
    const [contentLoaded, setContentLoaded] = useState(false);
    const [isRedirecting, setIsRedirecting] = useState(false);

    useLayoutEffect(() => {
        const checkScreenSize = () => {
            setIsLargeScreen(window.innerWidth >= 1024);
        };

        checkScreenSize();
        window.addEventListener('resize', checkScreenSize);

        return () => window.removeEventListener('resize', checkScreenSize);
    }, []);

    useEffect(() => {
        setContentLoaded(true);
        // Debug current state on component mount
        RedirectionManager.debugCurrentState();
    }, []);

    // Reset loading states when user returns via back navigation or page becomes visible
    useEffect(() => {
        const resetLoadingStates = () => {
            setLoading(false);
            setIsRedirecting(false);
            setError(null);
        };

        // Fired when a page is shown from bfcache or normal load
        const handlePageShow = () => resetLoadingStates();

        // Fired on browser back/forward navigation within the SPA
        const handlePopState = () => resetLoadingStates();

        // When tab becomes visible again
        const handleVisibilityChange = () => {
            if (!document.hidden) {
                resetLoadingStates();
            }
        };

        // When window regains focus
        const handleFocus = () => resetLoadingStates();

        window.addEventListener('pageshow', handlePageShow);
        window.addEventListener('popstate', handlePopState);
        window.addEventListener('focus', handleFocus);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            window.removeEventListener('pageshow', handlePageShow);
            window.removeEventListener('popstate', handlePopState);
            window.removeEventListener('focus', handleFocus);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    useEffect(() => {
        const viewParam = searchParams?.get('view');
        if (viewParam && ['login', 'signup', 'confirm', 'resetRequest', 'resetConfirm'].includes(viewParam)) {
            setView(viewParam as typeof view);
        }
    }, [searchParams]);

    // Handle URL parameters for redirect destination with improved logic
    useEffect(() => {
        const fromParam = searchParams?.get('from');
        const agentId = searchParams?.get('agent_id');
        const currentPath = window.location.pathname;

        console.log('🔗 URL parameters:', { fromParam, agentId, currentPath });

        if (fromParam === 'agent' && agentId) {
            // Coming from agent "Try Now" button
            console.log('🤖 Setting agent redirect for agent:', agentId);
            RedirectionManager.setRedirectDestination(`/agent/${agentId}`, true, false);
        } else if (fromParam === 'home' || currentPath === '/') {
            // Coming from home page
            console.log('🏠 Setting home redirect');
            RedirectionManager.setRedirectDestination('/browse', false, true);
        } else if (!fromParam && !agentId) {
            // Check if there's already stored redirect data (don't override it)
            if (!RedirectionManager.isFromAgent() && !RedirectionManager.isFromHome()) {
                console.log('🔄 Setting default redirect');
                RedirectionManager.setRedirectDestination('/browse', false, true);
            }
        }
    }, [searchParams]);

    // Clear signup password when leaving confirm view
    useEffect(() => {
        if (view !== 'confirm' && signupPassword) {
            setSignupPassword('');
        }
    }, [view]);

    // Enhanced Google OAuth callback handler
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

    // Enhanced success handler with better logging
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

            // Small delay to ensure cookies are set
            await new Promise(resolve => setTimeout(resolve, 100));

            // Use window.location for reliable redirection
            console.log('🚀 Redirecting to:', redirectDestination);
            window.location.href = redirectDestination;

        } catch (error) {
            console.error('❌ Authentication success handler error:', error);
            // Fallback redirect
            window.location.href = '/browse';
        }
    };

    // Simplified Google Sign-In (redirect-based)
    const handleGoogleSignIn = (): void => {
        try {
            setError(null);
            setLoading(true);

            console.log('🚀 Initiating Google Sign-In...');
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

    // Enhanced Google OAuth callback handler
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
    const handleLogin = async (e: React.FormEvent): Promise<void> => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await axios.post('/api/auth/login', { email, password }, {
                timeout: 15000
            });

            await handleSuccessfulAuth(response.data.access_token, response.data.login_id);
        } catch (error) {
            if (axios.isAxiosError(error)) {
                setError({
                    message: error.response?.data?.message || 'An error occurred during login',
                    code: error.response?.data?.code,
                    details: error.response?.data?.details
                });
            } else {
                setError({ message: 'An unexpected error occurred' });
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        // Basic client-side validation
        if (!email || !password) {
            setError('Email and password are required');
            setLoading(false);
            return;
        }

        // Terms and conditions validation
        if (!acceptTerms) {
            setError('You must accept the Terms and Conditions to create an account');
            setLoading(false);
            return;
        }

        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError('Please enter a valid email address');
            setLoading(false);
            return;
        }

        // Password strength validation
        if (password.length < 8) {
            setError('Password must be at least 8 characters long');
            setLoading(false);
            return;
        }

        try {
            const response = await axios.post('/api/auth/sign-up', { email, password }, {
                timeout: 15000
            });

            // Check if the response indicates user already exists
            if (response.data?.data?.status === 'exists') {
                setError({
                    message: response.data.data.message || 'This email is already registered. Please sign in or reset your password.',
                    code: 'USER_EXISTS'
                });
                setLoading(false);
                return;
            }

            // Standard signup success flow
            setSignupPassword(password);
            setPassword('');
            setView('confirm');
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const errorData = error.response?.data;

                if (errorData?.data?.status === 'exists') {
                    setError({
                        message: errorData.data.message || 'This email is already registered. Please sign in or reset your password.',
                        code: 'USER_EXISTS'
                    });
                } else if (errorData?.code === 'UsernameExistsException' ||
                    errorData?.message?.includes('already registered')) {
                    setError({
                        message: 'This email is already registered. Please sign in or reset your password.',
                        code: errorData?.code || 'USER_EXISTS'
                    });
                } else {
                    setError({
                        message: errorData?.message || 'An error occurred during signup',
                        code: errorData?.code,
                        details: errorData?.details
                    });
                }
            } else {
                setError({ message: 'An unexpected error occurred' });
            }
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmSignUp = async (e: React.FormEvent): Promise<void> => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await axios.post('/api/auth/confirm-sign-up', {
                email,
                confirmation_code: confirmationCode,
                password: signupPassword
            }, {
                timeout: 15000
            });

            if (response.data.access_token) {
                setSignupPassword('');
                await handleSuccessfulAuth(response.data.access_token, response.data.login_id);
            } else {
                setSignupPassword('');
                setView('login');
                setError({ message: 'Account confirmed successfully. Please log in.' });
            }
        } catch (error) {
            if (axios.isAxiosError(error)) {
                setError({
                    message: error.response?.data?.message || 'An error occurred during confirmation',
                    code: error.response?.data?.code,
                    details: error.response?.data?.details
                });
            } else {
                setError({ message: 'An unexpected error occurred' });
            }
        } finally {
            setLoading(false);
        }
    };

    const handleResendConfirmationCode = async () => {
        setError('');
        setLoading(true);

        try {
            await axios.post(`/api/auth/resend-confirmation-code?username=${encodeURIComponent(email)}`);
            setError({ message: 'Confirmation code resent. Please check your email.' });
        } catch (error) {
            if (axios.isAxiosError(error)) {
                setError({
                    message: error.response?.data?.message || 'An error occurred while resending confirmation code',
                    code: error.response?.data?.code,
                    details: error.response?.data?.details
                });
            } else {
                setError({ message: 'An unexpected error occurred' });
            }
        } finally {
            setLoading(false);
        }
    };

    const handleResetPasswordRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await axios.post('/api/auth/password-reset/initiate', { email });
            setView('resetConfirm');
        } catch (error) {
            if (axios.isAxiosError(error)) {
                setError({
                    message: error.response?.data?.message || 'An error occurred during password reset request',
                    code: error.response?.data?.code,
                    details: error.response?.data?.details
                });
            } else {
                setError({ message: 'An unexpected error occurred' });
            }
        } finally {
            setLoading(false);
        }
    };

    const handleResetPasswordConfirm = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await axios.post('/api/auth/password-reset/confirm', {
                email,
                confirmation_code: confirmationCode,
                new_password: newPassword
            });
            setView('login');
            setError({ message: 'Password reset successful. Please log in with your new password.' });
        } catch (error) {
            if (axios.isAxiosError(error)) {
                setError({
                    message: error.response?.data?.message || 'An error occurred during password reset confirmation',
                    code: error.response?.data?.code,
                    details: error.response?.data?.details
                });
            } else {
                setError({ message: 'An unexpected error occurred' });
            }
        } finally {
            setLoading(false);
        }
    };

    // Handle view changes with proper cleanup
    const handleViewChange = (newView: typeof view) => {
        if (newView !== 'confirm') {
            setSignupPassword('');
        }
        if (newView === 'login') {
            setPassword('');
            setConfirmationCode('');
            setNewPassword('');
        }
        setError(null);
        setView(newView);
    };

    const buttonVariants = {
        hover: { scale: 1.05 },
        tap: { scale: 0.95 },
    };

    // Google Sign-In Button Component (simplified)
    const GoogleSignInButton = () => (
        <motion.button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading || isRedirecting}
            className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            variants={buttonVariants}
            whileHover={!loading && !isRedirecting ? "hover" : {}}
            whileTap={!loading && !isRedirecting ? "tap" : {}}
        >
            {loading || isRedirecting ? (
                <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-700"></div>
                    <span>{isRedirecting ? 'Redirecting...' : 'Signing in...'}</span>
                </div>
            ) : (
                <div className="flex items-center space-x-3">
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    <span>Continue with Google</span>
                </div>
            )}
        </motion.button>
    );

    // Show redirecting overlay when redirecting
    if (isRedirecting) {
        return (
            <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
                    <p className="text-lg font-medium text-gray-900">Redirecting...</p>
                    <p className="text-sm text-gray-500">Taking you to your destination...</p>
                </div>
            </div>
        );
    }

    const renderForm = () => {
        switch (view) {
            case 'login':
                return (
                    <div className="space-y-4">
                        <GoogleSignInButton />
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-300" />
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-white text-gray-500">Or continue with</span>
                            </div>
                        </div>
                        <form onSubmit={handleLogin} className="space-y-4">
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Email"
                                className="w-full px-4 py-2 text-sm border rounded-md"
                                required
                                disabled={isRedirecting}
                            />
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Password"
                                    className="w-full px-4 py-2 text-sm border rounded-md"
                                    required
                                    disabled={isRedirecting}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                    disabled={isRedirecting}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            <motion.button
                                type="submit"
                                style={{
                                    background: 'linear-gradient(90deg, #635EFD 0%, #A863F6 100%)',
                                }}
                                className="w-full text-sm text-white py-2 rounded-md transition duration-300"
                                disabled={loading || isRedirecting}
                                variants={buttonVariants}
                                whileHover="hover"
                                whileTap="tap"
                            >
                                {loading ? 'Logging in...' : isRedirecting ? 'Redirecting...' : 'Login'}
                            </motion.button>
                        </form>
                    </div>
                );
            case 'signup':
                return (
                    <div className="space-y-4">
                        <GoogleSignInButton />
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-300" />
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-white text-gray-500">Or sign up with</span>
                            </div>
                        </div>
                        <form onSubmit={handleSignUp} className="space-y-4">
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Email"
                                className="w-full px-4 py-2 text-sm border rounded-md"
                                required
                                disabled={isRedirecting}
                            />
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Password"
                                    className="w-full px-4 py-2 text-sm border rounded-md"
                                    required
                                    disabled={isRedirecting}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                    disabled={isRedirecting}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>

                            <div className="flex items-start space-x-3">
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
                                <div className="text-xs lg:text-sm">
                                    <label htmlFor="terms" className="text-gray-600">
                                        I agree to the{' '}
                                        <a
                                            href="/terms-and-conditions"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-indigo-600 hover:text-indigo-800 hover:underline font-medium"
                                        >
                                            Terms and Conditions
                                        </a>
                                        {' '}and{' '}
                                        <a
                                            href="/privacy-policy"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-indigo-600 hover:text-indigo-800 hover:underline font-medium"
                                        >
                                            Privacy Policy
                                        </a>
                                    </label>
                                </div>
                            </div>

                            <motion.button
                                type="submit"
                                style={{
                                    background: 'linear-gradient(90deg, #635EFD 0%, #A863F6 100%)',
                                }}
                                className="w-full text-sm text-white py-2 rounded-md transition duration-300"
                                disabled={loading || isRedirecting}
                                variants={buttonVariants}
                                whileHover="hover"
                                whileTap="tap"
                            >
                                {loading ? 'Signing up...' : 'Sign Up'}
                            </motion.button>
                        </form>
                    </div>
                );
            case 'confirm':
                return (
                    <div className="space-y-4">
                        <div className="text-center text-sm text-gray-600 mb-4">
                            We've sent a verification code to <strong>{email}</strong>.
                            Please enter the code below to complete your registration.
                        </div>
                        <form onSubmit={handleConfirmSignUp} className="space-y-4">
                            <input
                                type="text"
                                value={confirmationCode}
                                onChange={(e) => setConfirmationCode(e.target.value)}
                                placeholder="Enter 6-digit verification code"
                                className="w-full px-4 py-2 text-sm border rounded-md text-center"
                                maxLength={6}
                                required
                            />
                            <motion.button
                                type="submit"
                                style={{
                                    background: 'linear-gradient(90deg, #635EFD 0%, #A863F6 100%)',
                                }}
                                className="w-full text-sm text-white py-2 rounded-md transition duration-300"
                                disabled={loading}
                                variants={buttonVariants}
                                whileHover="hover"
                                whileTap="tap"
                            >
                                {loading ? 'Verifying...' : 'Verify & Continue'}
                            </motion.button>
                            <motion.button
                                type="button"
                                onClick={handleResendConfirmationCode}
                                className="w-full text-sm text-indigo-600 hover:underline"
                                disabled={loading}
                                variants={buttonVariants}
                                whileHover="hover"
                                whileTap="tap"
                            >
                                Resend Verification Code
                            </motion.button>
                        </form>
                    </div>
                );
            case 'resetRequest':
                return (
                    <form onSubmit={handleResetPasswordRequest} className="space-y-4">
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Email"
                            className="w-full px-4 py-2 text-sm border rounded-md"
                            required
                        />
                        <motion.button
                            type="submit"
                            style={{
                                background: 'linear-gradient(90deg, #635EFD 0%, #A863F6 100%)',
                            }}
                            className="w-full text-sm text-white py-2 rounded-md transition duration-300"
                            disabled={loading}
                            variants={buttonVariants}
                            whileHover="hover"
                            whileTap="tap"
                        >
                            {loading ? 'Sending...' : 'Send Reset Code'}
                        </motion.button>
                    </form>
                );
            case 'resetConfirm':
                return (
                    <form onSubmit={handleResetPasswordConfirm} className="space-y-4">
                        <input
                            type="text"
                            value={confirmationCode}
                            onChange={(e) => setConfirmationCode(e.target.value)}
                            placeholder="Confirmation Code"
                            className="w-full px-4 py-2 text-sm border rounded-md"
                            required
                        />
                        <div className="relative">
                            <input
                                type={showNewPassword ? "text" : "password"}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="New Password"
                                className="w-full px-4 py-2 text-sm border rounded-md"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                            >
                                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        <motion.button
                            type="submit"
                            style={{
                                background: 'linear-gradient(90deg, #635EFD 0%, #A863F6 100%)',
                            }}
                            className="w-full text-sm text-white py-2 rounded-md transition duration-300"
                            disabled={loading}
                            variants={buttonVariants}
                            whileHover="hover"
                            whileTap="tap"
                        >
                            {loading ? 'Resetting...' : 'Reset Password'}
                        </motion.button>
                    </form>
                );
        }
    };

    const getWelcomeMessage = () => {
        switch (view) {
            case 'login':
                return {
                    title: "Welcome back",
                    subtitle: "Sign in to your account to continue"
                };
            case 'signup':
                return {
                    title: "Welcome to AgentHub",
                    subtitle: "Create your account to get started"
                };
            case 'resetRequest':
                return {
                    title: "Reset Password",
                    subtitle: "Enter your email to reset your password"
                };
            case 'resetConfirm':
                return {
                    title: "Almost there",
                    subtitle: "Enter the code and your new password"
                };
            case 'confirm':
                return {
                    title: "Verify Your Email",
                    subtitle: "Check your email for the verification code"
                };
            default:
                return {
                    title: "Welcome",
                    subtitle: "Access your account"
                };
        }
    };

    return (
        <div
            className="grid min-h-screen bg-white transition-opacity duration-300 relative"
            style={{
                opacity: contentLoaded ? 1 : 0,
                gridTemplateColumns: isLargeScreen ? '1fr 1fr' : '1fr'
            }}
        >
            {/* Back Button - Mobile */}
            <div className="lg:hidden absolute top-4 left-4 z-10">
                <motion.button
                    className="flex items-center justify-center w-10 h-10 bg-gray-100 shadow-lg rounded-full text-gray-700 hover:bg-gray-200 transition-colors border border-gray-200"
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                    onClick={() => window.history.back()}
                >
                    <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 19l-7-7 7-7"
                        />
                    </svg>
                </motion.button>
            </div>

            {isLargeScreen && (
                <div className="hidden lg:flex lg:flex-col lg:justify-center lg:items-start lg:p-12 lg:pb-0 relative overflow-hidden" style={{ backgroundColor: '#1F1726' }}>
                    {/* Background Pattern */}
                    <div
                        className="absolute inset-0 opacity-10"
                        style={{
                            backgroundImage: `url(${BgImage})`,
                            backgroundRepeat: 'repeat',
                            backgroundSize: '400px 600px'
                        }}
                    />

                    {/* Brand Logo - Top Left */}
                    <div className="absolute top-6 left-6 z-10">
                        <motion.div
                            className="cursor-pointer"
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <div className="flex items-center space-x-3 mb-1">
                                <Image src={logo} alt='logo' className='h-7 w-7 sm:h-8 sm:w-8 lg:h-10 lg:w-10 rounded-md' />
                                <div className="flex flex-col">
                                    <Link href='/'>
                                        <span className="text-lg sm:text-xl lg:text-2xl font-bold text-white">AgentHub</span>
                                    </Link>
                                    <span className="text-xs sm:text-sm text-white leading-none">
                                        by{' '}
                                        <a
                                            href="https://tryzent.com"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-white hover:white transition-colors duration-200"
                                        >
                                            Tryzent
                                        </a>
                                    </span>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    <SessionExpiredToast />

                    {/* Main Content */}
                    <div className="space-y-8 max-w-4xl relative z-10 mt-9">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                        >
                            <motion.h2
                                className="text-4xl font-bold text-white mb-4"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 1, delay: 0.6 }}
                            >
                                Welcome {view === 'login' ? 'back to the' : 'to the'} future of AI automation
                            </motion.h2>
                            <motion.p
                                className="text-gray-300 text-lg mb-8"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 1, delay: 0.8 }}
                            >
                                {view === 'login'
                                    ? 'Access your personalized dashboard and continue building with our intelligent AI agents.'
                                    : 'Create your account and start building with our intelligent AI agents.'
                                }
                            </motion.p>
                        </motion.div>

                        {/* Lottie Animation */}
                        <motion.div
                            className="flex justify-center mb-8"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.8, delay: 0.7 }}
                        >
                            <div className="w-64 h-64">
                                {/* Replace this with your actual Lottie component */}
                                <Lottie
                                    animationData={animation}
                                    loop={true}
                                    autoplay={true}
                                    className="w-auto h-auto"
                                />
                            </div>
                        </motion.div>

                        {/* Feature Cards - Row Layout */}
                        <motion.div
                            className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.1 }}
                        >
                            <motion.div
                                className="transition-all duration-300 group"
                                whileHover={{ y: -5, scale: 1.02 }}
                                transition={{ duration: 0.3 }}
                            >
                                <div className="flex flex-col items-center text-center space-y-4">
                                    <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center group-hover:bg-blue-500/30 transition-all duration-300">
                                        <motion.svg
                                            className="w-6 h-6 text-blue-400"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                            whileHover={{ rotate: 15 }}
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </motion.svg>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-white mb-2">Ready-to-Use Agents</h3>
                                    </div>
                                </div>
                            </motion.div>

                            <motion.div
                                className="transition-all duration-300 group"
                                whileHover={{ y: -5, scale: 1.02 }}
                                transition={{ duration: 0.3 }}
                            >
                                <div className="flex flex-col items-center text-center space-y-4">
                                    <div className="w-12 h-12 bg-indigo-500/20 rounded-full flex items-center justify-center group-hover:bg-indigo-500/30 transition-all duration-300">
                                        <motion.svg
                                            className="w-6 h-6 text-indigo-400"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                            whileHover={{ scale: 1.1 }}
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </motion.svg>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-white mb-2">Expert Collaboration</h3>
                                    </div>
                                </div>
                            </motion.div>

                            <motion.div
                                className="transition-all duration-300 group"
                                whileHover={{ y: -5, scale: 1.02 }}
                                transition={{ duration: 0.3 }}
                            >
                                <div className="flex flex-col items-center text-center space-y-4">
                                    <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center group-hover:bg-green-500/30 transition-all duration-300">
                                        <motion.svg
                                            className="w-6 h-6 text-green-400"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                            whileHover={{ rotate: -15 }}
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                        </motion.svg>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-white mb-2">Enterprise Grade</h3>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    </div>
                </div>
            )}

            <div className="flex justify-center items-center bg-white p-4 lg:p-8">
                <SessionExpiredToast />
                <div className="max-w-md w-full space-y-6 lg:space-y-6">
                    <div className="text-center mb-8">
                        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
                            {getWelcomeMessage().title}
                        </h1>
                        <p className="text-gray-600 text-sm lg:text-base">
                            {getWelcomeMessage().subtitle}
                        </p>
                    </div>
                    <ErrorAlert
                        error={error}
                        onDismiss={() => setError(null)}
                    />
                    {renderForm()}
                    <div className="text-center space-y-2">
                        {view === 'login' && (
                            <>
                                <p className="text-xs lg:text-sm">
                                    Don't have an account?{' '}
                                    <motion.button
                                        className="text-indigo-600 hover:underline"
                                        onClick={() => handleViewChange('signup')}
                                        variants={buttonVariants}
                                        whileHover="hover"
                                        whileTap="tap"
                                    >
                                        Sign Up
                                    </motion.button>
                                </p>
                                <p className="text-xs lg:text-sm">
                                    <motion.button
                                        className="text-indigo-600 hover:underline"
                                        onClick={() => handleViewChange('resetRequest')}
                                        variants={buttonVariants}
                                        whileHover="hover"
                                        whileTap="tap"
                                    >
                                        Forgot Password?
                                    </motion.button>
                                </p>
                            </>
                        )}
                        {view === 'signup' && (
                            <p className="text-xs lg:text-sm">
                                Already have an account?{' '}
                                <motion.button
                                    className="text-indigo-600 hover:underline"
                                    onClick={() => handleViewChange('login')}
                                    variants={buttonVariants}
                                    whileHover="hover"
                                    whileTap="tap"
                                >
                                    Login
                                </motion.button>
                            </p>
                        )}
                        {(view === 'resetRequest' || view === 'resetConfirm') && (
                            <p className="text-xs lg:text-sm">
                                Already have an account?{' '}
                                <motion.button
                                    className="text-indigo-600 hover:underline"
                                    onClick={() => handleViewChange('login')}
                                    variants={buttonVariants}
                                    whileHover="hover"
                                    whileTap="tap"
                                >
                                    Login
                                </motion.button>
                            </p>
                        )}
                        {view === 'confirm' && (
                            <p className="text-xs lg:text-sm">
                                Want to use a different email?{' '}
                                <motion.button
                                    className="text-indigo-600 hover:underline"
                                    onClick={() => handleViewChange('signup')}
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
            </div>
        </div>
    );
};

export default AuthForm;