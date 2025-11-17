"use client"

import { useState, useEffect } from "react"
import axios from "axios"

interface CreditsResponse {
    "Remaining Tokens": number
}

export function useCreditsCheck() {
    const [credits, setCredits] = useState<number | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchCredits = async () => {
        try {
            setIsLoading(true)
            setError(null)
            const { data } = await axios.get<CreditsResponse>("/api/credits")
            setCredits(data["Remaining Tokens"])
            return data["Remaining Tokens"]
        } catch (error) {
            console.error("Error fetching credits:", error)
            if (axios.isAxiosError(error)) {
                setError(error.response?.data?.error || error.message)
            } else {
                setError("Failed to fetch credits")
            }
            return null
        } finally {
            setIsLoading(false)
        }
    }

    const checkCreditsBeforeExecution = async (): Promise<boolean> => {
        const currentCredits = await fetchCredits()
        return currentCredits !== null && currentCredits > 0
    }

    useEffect(() => {
        fetchCredits()
    }, [])

    return {
        credits,
        isLoading,
        error,
        fetchCredits,
        checkCreditsBeforeExecution,
        hasCredits: credits !== null && credits > 0,
    }
}
