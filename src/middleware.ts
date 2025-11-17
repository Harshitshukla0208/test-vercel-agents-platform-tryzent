import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname

    // Protect frontend ai-playground routes
    if (path.startsWith('/dashboard')) {
        const accessToken = request.cookies.get('access_token')?.value
        if (!accessToken) {
            // Redirect to home page if not authenticated
            return NextResponse.redirect(new URL('/', request.url))
        }
    }

    // Handle auth pages (login and signup)
    if (path === '/signup') {
        const accessToken = request.cookies.get('access_token')?.value
        if (accessToken) {
            // Redirect to home if already logged in
            return NextResponse.redirect(new URL('/', request.url))
        }
    }

    // Login page is now accessible even when logged in
    // No redirection for /login

    return NextResponse.next()
}

export const config = {
    matcher: [
        '/dashboard',
        '/ai-playground/:path*',
        '/login',
        '/auth',
        '/signup'
    ],
}
