import type { NextApiRequest, NextApiResponse } from "next"

interface DropdownApiResponse {
    status: boolean
    message: string
    data: {
        status: boolean
        message: string
        data: string[] | string[][]
    }
}

interface ApiError {
    error: string
    details?: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<DropdownApiResponse | ApiError>) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" })
    }

    try {
        const { board, grade, subject } = req.query

        // Build the API URL based on provided parameters
        let apiUrl = "https://agents-api.tryzent.com/api/utilities/Get-dropdown-values"
        const params = new URLSearchParams()

        if (board && typeof board === "string") {
            params.append("board", board)
        }
        if (grade && typeof grade === "string") {
            params.append("grade", grade)
        }
        if (subject && typeof subject === "string") {
            params.append("subject", subject)
        }

        if (params.toString()) {
            apiUrl += `?${params.toString()}`
        }

        console.log("Fetching from API:", apiUrl)

        const response = await fetch(apiUrl, {
            method: "GET",
            headers: {
                accept: "application/json",
                "Content-Type": "application/json",
            },
            // Add timeout to prevent hanging requests
            signal: AbortSignal.timeout(10000), // 10 seconds timeout
        })

        if (!response.ok) {
            throw new Error(`API request failed with status: ${response.status}`)
        }

        const data: DropdownApiResponse = await response.json()

        // Validate the response structure
        if (!data.status || !data.data || !data.data.status) {
            throw new Error("Invalid API response structure")
        }

        // Sort the data in ascending order
        let sortedData = data.data.data

        if (Array.isArray(sortedData)) {
            if (sortedData.length > 0 && Array.isArray(sortedData[0])) {
                // For chapters data (array of arrays), sort by the first element (chapter number)
                sortedData = sortedData.sort((a: any, b: any) => {
                    const aNum = Number.parseInt(a[0])
                    const bNum = Number.parseInt(b[0])
                    if (!isNaN(aNum) && !isNaN(bNum)) {
                        return aNum - bNum
                    }
                    return a[0].localeCompare(b[0])
                })
            } else {
                // For simple arrays (board, grade, subject), sort normally
                sortedData = sortedData.sort((a: any, b: any) => {
                    const aNum = Number.parseInt(a)
                    const bNum = Number.parseInt(b)
                    if (!isNaN(aNum) && !isNaN(bNum)) {
                        return aNum - bNum
                    }
                    return a.localeCompare(b)
                })
            }
        }

        // Return the sorted data
        const responseData: DropdownApiResponse = {
            ...data,
            data: {
                ...data.data,
                data: sortedData,
            },
        }

        res.status(200).json(responseData)
    } catch (error) {
        console.error("Dropdown API Error:", error)

        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"

        res.status(500).json({
            error: "Failed to fetch dropdown values",
            details: errorMessage,
        })
    }
}
