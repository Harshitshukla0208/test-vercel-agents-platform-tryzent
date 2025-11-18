// src/pages/api/utilities/dropdown-values.ts
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        const { board, grade, subject } = req.query

        // Build query parameters
        const params = new URLSearchParams()
        if (board) params.append('board', board as string)
        if (grade) params.append('grade', grade as string)
        if (subject) params.append('subject', subject as string)

        const queryString = params.toString()
        const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/utilities/Get-dropdown-values${queryString ? `?${queryString}` : ''}`

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'accept': 'application/json'
            }
        })

        const data = await response.json()

        if (!response.ok) {
            return res.status(response.status).json(data)
        }

        return res.status(200).json(data)
    } catch (error) {
        console.error('Dropdown Values API Error:', error)
        return res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to fetch dropdown values'
        })
    }
}
