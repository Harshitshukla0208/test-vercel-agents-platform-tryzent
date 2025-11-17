import type { NextApiRequest, NextApiResponse } from "next"

interface SharedDataResponse {
    status: boolean
    message: string
    data?: any
    error?: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<SharedDataResponse>) {
    if (req.method !== "GET") {
        return res.status(405).json({
            status: false,
            message: "Method not allowed",
            error: "Only GET method is allowed",
        })
    }

    const { uuid } = req.query

    if (!uuid || typeof uuid !== "string") {
        return res.status(400).json({
            status: false,
            message: "Missing or invalid UUID parameter",
            error: "UUID is required and must be a string",
        })
    }

    try {
        const apiUrl = `https://agents-api.tryzent.com/api/agents/get-shared-data/${uuid}`

        const response = await fetch(apiUrl, {
            method: "GET",
            headers: {
                accept: "application/json",
            },
        })

        if (!response.ok) {
            if (response.status === 404) {
                return res.status(404).json({
                    status: false,
                    message: "Shared content not found",
                    error: "The shared link may have expired or does not exist",
                })
            }
            throw new Error(`API request failed with status ${response.status}`)
        }

        const data = await response.json()

        if (data.status) {
            return res.status(200).json({
                status: true,
                message: data.message,
                data: data.data,
            })
        } else {
            return res.status(400).json({
                status: false,
                message: data.message || "Failed to retrieve shared data",
                error: data.error,
            })
        }
    } catch (error) {
        console.error("Error retrieving shared data:", error)
        return res.status(500).json({
            status: false,
            message: "Internal server error",
            error: error instanceof Error ? error.message : "Unknown error occurred",
        })
    }
}
