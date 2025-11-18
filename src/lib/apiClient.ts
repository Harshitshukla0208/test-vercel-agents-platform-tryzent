// Client-side auth-aware fetch wrapper
import { getAccessToken, isJwtExpired, redirectToLoginExpired } from '@/utils/auth'

type FetchWithAuth = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

export const fetchWithAuth: FetchWithAuth = async (input, init = {}) => {
    // 1) Check token presence and expiry before request
    const token = getAccessToken()
    if (!token || isJwtExpired(token)) {
        redirectToLoginExpired()
        // Return a never-resolving promise to stop caller logic after redirect
        return new Promise<Response>(() => {})
    }

    const headers = new Headers(init.headers || {})
    if (!headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`)
    }

    // Default content-type for JSON bodies if not provided
    if (init.body && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json')
    }

    const response = await fetch(input, { ...init, headers })

    // 2) On 401, treat as expired/missing and redirect
    if (response.status === 401) {
        redirectToLoginExpired()
        return new Promise<Response>(() => {})
    }

    return response
}





