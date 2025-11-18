// src/components/ProtectedRoute.tsx
"use client"
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { isAuthenticated, checkUserProfile, redirectToLoginExpired } from '@/utils/auth'

// Higher-Order Component for route protection
export function withProtectedRoute<T extends object>(
    WrappedComponent: React.ComponentType<T>
) {
    return function ProtectedComponent(props: T) {
        const router = useRouter()
        const [isLoading, setIsLoading] = useState(true)
        const [isAuthorized, setIsAuthorized] = useState(false)

        useEffect(() => {
            const checkAccess = async () => {
                // Check if user is authenticated
                if (!isAuthenticated()) {
                    redirectToLoginExpired()
                    return
                }

                // Check if user has profile
                const { exists } = await checkUserProfile()
                if (!exists) {
                    // User doesn't have profile, redirect to create profile
                    router.push('/profile/create')
                    return
                }

                // User is authenticated and has profile
                setIsAuthorized(true)
                setIsLoading(false)
            }

            checkAccess()
        }, [router])

        if (isLoading) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-[#FFFBF2]">
                    <div className="text-center">
                        <div className="w-8 h-8 border-4 border-[#714B90] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading...</p>
                    </div>
                </div>
            )
        }

        if (!isAuthorized) {
            return null // Will redirect, so don't render anything
        }

        return <WrappedComponent {...props} />
    }
}
