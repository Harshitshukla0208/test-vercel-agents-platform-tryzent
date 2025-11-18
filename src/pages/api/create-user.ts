// src/pages/api/profile/create.ts
import type { NextApiRequest, NextApiResponse } from 'next'

interface CreateProfileData {
    firstName: string
    lastName: string
    userType: string
    board: string
    grade: string
    studentName?: string
    phoneNo?: string
    gender?: string
    dateOfBirth?: string
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        // Get authorization token from cookies or headers
        const token = req.cookies.access_token || req.headers.authorization?.replace('Bearer ', '')

        if (!token) {
            return res.status(401).json({ error: 'No authorization token provided' })
        }

        const profileData: CreateProfileData = req.body

        // Validate required fields
        if (!profileData.firstName || !profileData.lastName || !profileData.userType ||
            !profileData.board || !profileData.grade) {
            return res.status(400).json({ error: 'Missing required fields' })
        }

        // If user type is Parent, studentName is required
        if (profileData.userType === 'Parent' && !profileData.studentName) {
            return res.status(400).json({ error: 'Student name is required for Parent user type' })
        }

        // Prepare the query parameters for your API
        const searchParams = new URLSearchParams({
            first_name: profileData.firstName,
            last_name: profileData.lastName,
            user_type: profileData.userType,
            board: profileData.board,
            grade: profileData.grade,
            student_name: profileData.studentName || ""
        })

        // Optional fields
        if (profileData.phoneNo) {
            searchParams.set('phone_no', profileData.phoneNo)
        }
        if (profileData.gender) {
            searchParams.set('gender', profileData.gender)
        }
        if (profileData.dateOfBirth) {
            searchParams.set('date_of_birth', profileData.dateOfBirth)
        }

        const params = searchParams.toString()

        // Make request to your backend API
        const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/profile/create-profile?${params}`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
                // No body needed
            }
        )

        const data = await response.json()

        if (!response.ok) {
            return res.status(response.status).json(data)
        }

        return res.status(200).json(data)
    } catch (error) {
        console.error('Create Profile API Error:', error)
        return res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to create user profile'
        })
    }
}
