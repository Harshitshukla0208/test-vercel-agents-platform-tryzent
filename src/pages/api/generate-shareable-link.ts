import type { NextApiRequest, NextApiResponse } from "next"

interface ShareableLinkResponse {
    status: boolean
    message: string
    data?: {
        uuid: string
    }
    error?: string
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<ShareableLinkResponse>
) {
    if (req.method !== "GET") {
        return res.status(405).json({
            status: false,
            message: "Method not allowed",
            error: "Only GET method is allowed",
        })
    }

    const { agent_id, execution_id } = req.query

    if (!agent_id || !execution_id) {
        return res.status(400).json({
            status: false,
            message: "Missing required parameters",
            error: "agent_id and execution_id are required",
        })
    }

    const accessToken = req.cookies.access_token

    if (!accessToken) {
        return res.status(401).json({
            status: false,
            message: "Unauthorized",
            error: "Access token is missing",
        })
    }

    try {
        const apiUrl = `https://agents-api.tryzent.com/api/agents/generate_shareable_link?agent_id=${agent_id}&execution_id=${execution_id}`

        const response = await fetch(apiUrl, {
            method: "GET",
            headers: {
                accept: "application/json",
                Authorization: `Bearer ${accessToken}`,
            },
        })

        if (!response.ok) {
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
                message: data.message || "Failed to generate shareable link",
                error: data.error,
            })
        }
    } catch (error) {
        console.error("Error generating shareable link:", error)
        return res.status(500).json({
            status: false,
            message: "Internal server error",
            error: error instanceof Error ? error.message : "Unknown error occurred",
        })
    }
}
