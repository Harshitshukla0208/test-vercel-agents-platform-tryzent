// src/pages/api/profile/get-user-profile.ts
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        // Get authorization token from cookies or headers
        const token = req.cookies.access_token || req.headers.authorization?.replace('Bearer ', '')

        if (!token) {
            return res.status(401).json({ error: 'No authorization token provided' })
        }

        const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/profile/get-user-profile`,
            {
                method: 'GET',
                headers: {
                    'accept': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            }
        )

        const data = await response.json()

        if (!response.ok) {
            return res.status(response.status).json(data)
        }

        return res.status(200).json(data)
    } catch (error) {
        console.error('Profile API Error:', error)
        return res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to fetch user profile'
        })
    }
}
