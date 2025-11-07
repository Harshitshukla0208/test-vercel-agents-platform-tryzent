import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Toaster } from '@/components/ui/toaster'
import { useToast } from '@/hooks/use-toast'

const SessionExpiredToast = () => {
    const { toast } = useToast()
    const router = useRouter()
    const searchParams = useSearchParams()

    useEffect(() => {
        if (searchParams && searchParams.get('sessionExpired')) {
            toast({
                title: "Session Expired",
                description: "Your session has expired. Please log in again to continue.",
                variant: "destructive",
                duration: 5000,
                className: "top-0 right-0 flex fixed md:max-w-[420px] md:top-4 md:right-4",
            })
            // Remove the query parameter after displaying the toast
            const pathname = window.location.pathname
            router.push(pathname)
        }
    }, [searchParams, router, toast])

    return <Toaster />
}

export default SessionExpiredToast
