import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' })
    }

    try {
        const { board, grade, subject, chapter, exam_data } = req.body

        const authToken = req.cookies.access_token || req.headers.authorization?.replace('Bearer ', '')

        if (!authToken) {
            return res.status(401).json({ message: 'Unauthorized' })
        }

        // Construct the payload as a proper JSON object
        const payload = {
            board,
            grade,
            subject,
            chapter,
            exam_data,
        }

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/exam/evaluate-exam`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                accept: 'application/json',
                Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify(payload), // This sends it as proper JSON
        })

        const data = await response.json()

        if (!response.ok) {
            console.error('API Error:', data)
            return res.status(response.status).json(data)
        }

        res.status(200).json(data)
    } catch (error) {
        console.error('Error evaluating assessment:', error)
        res.status(500).json({ message: 'Failed to evaluate assessment' })
    }
}