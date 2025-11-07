import type { NextApiRequest, NextApiResponse } from 'next'
import axios from 'axios'

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    const { agent_id } = req.query
    const accessToken = req.cookies.access_token

    if (!accessToken) {
        return res.status(401).json({ error: 'No access token found' })
    }

    if (!agent_id || typeof agent_id !== 'string') {
        return res.status(400).json({ error: 'Invalid agent_id' })
    }

    // Updated URL to match your API structure
    const url = `${process.env.API_BASE_URL2}/agents/get-agent-details/${agent_id}`

    // Validate agent_id format (should be UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(agent_id)) {
        console.error('Invalid UUID format:', agent_id)
        return res.status(400).json({
            error: 'Invalid agent_id format',
            details: 'Agent ID must be a valid UUID format',
            received: agent_id
        })
    }

    const config = {
        headers: {
            'accept': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
        },
        timeout: 30000, // 30 seconds timeout
    }

    try {
        const response = await axios.get(url, config)
        
        // Validate response structure
        if (!response.data || typeof response.data !== 'object') {
            console.error('❌ Invalid response structure')
            return res.status(500).json({
                error: 'Invalid response from API',
                details: 'Response data is not in expected format'
            })
        }

        // Return the response as-is since it matches the expected format
        res.status(200).json(response.data)

    } catch (error) {
        console.error('❌ Error fetching agent:', error)

        if (axios.isAxiosError(error)) {
            const status = error.response?.status || 500
            const message = error.response?.data?.message || error.message || 'Unknown error'
            const responseData = error.response?.data

            console.error('❌ API Error Details:', {
                status,
                message,
                responseData,
                url,
                agent_id,
                headers: error.response?.headers,
                requestConfig: {
                    url: error.config?.url,
                    method: error.config?.method,
                    headers: error.config?.headers
                }
            })

            // Handle specific error cases
            if (status === 401) {
                return res.status(401).json({
                    error: 'Authentication failed',
                    details: 'Invalid or expired access token',
                    agent_id
                })
            }

            if (status === 404) {
                return res.status(404).json({
                    error: 'Agent not found',
                    details: 'No agent found with the provided ID',
                    agent_id
                })
            }

            if (status === 400) {
                return res.status(400).json({
                    error: 'Bad request',
                    details: message,
                    agent_id,
                    apiResponse: responseData
                })
            }

            res.status(status).json({
                error: 'Error fetching agent',
                details: message,
                agent_id,
                apiResponse: responseData
            })
        } else {
            console.error('❌ Non-Axios error:', error)
            res.status(500).json({
                error: 'Internal server error',
                details: error instanceof Error ? error.message : 'Unknown error occurred'
            })
        }
    }
}
