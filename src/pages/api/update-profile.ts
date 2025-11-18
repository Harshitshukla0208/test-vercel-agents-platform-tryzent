import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  
  try {
    // Get authorization token from cookies or headers
    const token = req.cookies.access_token || req.headers.authorization?.replace('Bearer ', '')
    if (!token) {
      return res.status(401).json({ error: 'No authorization token provided' })
    }

    // Accept profile fields from body (JSON)
    const updateFields = req.body || {}

    // Build query string - only include fields that are provided
    const params = new URLSearchParams()
    
    // Add each field if it exists in the payload
    Object.keys(updateFields).forEach(key => {
      const value = updateFields[key]
      
      // Only add the field if it has a meaningful value
      if (value !== null && value !== undefined && value !== '') {
        params.append(key, String(value))
      }
    })

    // Ensure we have at least some fields to update
    if (params.toString() === '') {
      return res.status(400).json({ 
        error: 'No valid fields to update',
        message: 'At least one field must be provided for update'
      })
    }

    console.log('Updating profile with params:', params.toString())

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/profile/update-profile?${params.toString()}`,
      {
        method: 'PUT',
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    )

    const data = await response.json()
    
    if (!response.ok) {
      console.error('External API error:', data)
      return res.status(response.status).json(data)
    }

    console.log('Profile updated successfully')
    return res.status(200).json(data)
    
  } catch (error) {
    console.error('Update Profile API Error:', error)
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update user profile'
    })
  }
}