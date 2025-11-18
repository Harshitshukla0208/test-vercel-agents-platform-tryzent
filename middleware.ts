// middleware.ts (in your root directory)
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Helper function to check profile on server side
async function checkUserProfile(token: string): Promise<boolean> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/get-user-profile`, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })
    
    if (!response.ok) return false
    
    const data = await response.json()
    return !!(data.data?.profile?.first_name && data.data?.profile?.profile_id)
  } catch (error) {
    console.error('Error checking profile in middleware:', error)
    return false
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Define protected routes
  const protectedRoutes = ['/dashboard', '/profile/create']
  
  // Check if current path is protected
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route)
  )
  
  // Get access token from cookies
  const token = request.cookies.get('access_token')?.value
  
  // If no token or token is undefined/empty, redirect to login for protected routes
  if (isProtectedRoute && (!token || token === 'undefined' || token.trim() === '')) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }
  
  // If user is authenticated and trying to access login page, check profile and redirect accordingly
  if (pathname === '/login' && token && token !== 'undefined' && token.trim() !== '') {
    const profileExists = await checkUserProfile(token)
    
    if (profileExists) {
      const dashboardUrl = new URL('/dashboard', request.url)
      return NextResponse.redirect(dashboardUrl)
    } else {
      const profileUrl = new URL('/profile/create', request.url)
      return NextResponse.redirect(profileUrl)
    }
  }
  
  // If user is authenticated and trying to access /profile/create but profile exists, redirect to dashboard
  if (pathname.startsWith('/profile/create') && token && token !== 'undefined' && token.trim() !== '') {
    const profileExists = await checkUserProfile(token)
    
    if (profileExists) {
      const dashboardUrl = new URL('/dashboard', request.url)
      return NextResponse.redirect(dashboardUrl)
    }
  }
  
  // If user is authenticated and trying to access /dashboard but profile doesn't exist, redirect to create profile
  if (pathname.startsWith('/dashboard') && token && token !== 'undefined' && token.trim() !== '') {
    const profileExists = await checkUserProfile(token)
    
    if (!profileExists) {
      const profileUrl = new URL('/profile/create', request.url)
      return NextResponse.redirect(profileUrl)
    }
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/profile/create/:path*',
    '/login'
  ]
}