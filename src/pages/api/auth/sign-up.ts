import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { email, password } = req.body;

    // Basic validation
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Invalid email format' });
    }

    // Password strength validation
    if (password.length < 8) {
        return res.status(400).json({ message: 'Password must be at least 8 characters long' });
    }

    try {
        const response = await axios.post(
            `${process.env.API_BASE_URL}/auth/sign-up`,
            { 
                email, 
                password 
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                timeout: 10000
            }
        );

        // If signup is successful
        res.status(200).json({ 
            message: 'Signup successful', 
            data: response.data 
        });
    } catch (error) {
        console.error('Signup error:', error);

        if (axios.isAxiosError(error)) {
            if (error.response) {
                // Pass through the API error message if it exists
                const apiMessage = error.response.data?.detail || error.response.data?.message || 'Signup failed';
                return res.status(error.response.status).json({ 
                    message: apiMessage,
                    details: error.response.data
                });
            } else if (error.request) {
                return res.status(503).json({ 
                    message: 'No response received from server. Please try again.' 
                });
            }
        }

        // Fallback error handler
        res.status(500).json({ 
            message: 'An unexpected error occurred during signup' 
        });
    }
}
