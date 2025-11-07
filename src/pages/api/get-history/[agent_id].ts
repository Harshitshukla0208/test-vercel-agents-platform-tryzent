import type { NextApiRequest, NextApiResponse } from 'next'
import axios from 'axios'

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    const { agent_id } = req.query
    const accessToken = req.cookies.access_token

    if (!accessToken) {
        return res.status(401).json({ error: 'No access token found' })
    }

    const url = `${process.env.API_BASE_URL2}/agents/get-agent-use-history?agent_id=${agent_id}`
    const config = {
        headers: {
            'accept': 'application/json',
            Authorization: `Bearer ${accessToken}`,
        },
    }

    try {
        const response = await axios.get(url, config)
        res.status(200).json(response.data)
    } catch (error) {
        console.error('Error fetching assistant:', error)
        res.status(500).json({ error: 'Error fetching assistant' })
    }
}
