import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { code } = req.body;

        if (!code) {
            console.error('No authorization code provided');
            return res.status(400).json({
                status: false,
                message: 'Authorization code is required',
            });
        }

        // Call your backend API
        const backendUrl = `${process.env.API_BASE_URL}/auth/google?code=${encodeURIComponent(code)}`;

        const response = await axios.post(backendUrl, '', {
            headers: {
                'accept': 'application/json',
                'Content-Type': 'application/json',
            },
            timeout: 15000,
        });

        // Check if response has the expected structure
        if (response.data?.status && response.data?.data?.access_token) {
            console.log('Successful authentication, sending response');
            return res.status(200).json({
                status: true,
                message: 'Google authentication successful',
                access_token: response.data.data.access_token,
                id_token: response.data.data.id_token,
                refresh_token: response.data.data.refresh_token,
                user: response.data.data.user,
            });
        } else {
            console.error('Backend auth failed:', response.data);
            return res.status(400).json({
                status: false,
                message: response.data?.message || 'Google authentication failed',
                debug: response.data
            });
        }
    } catch (error) {
        console.error('Google OAuth API error:', error);

        if (axios.isAxiosError(error)) {
            console.error('Backend error details:', {
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                url: error.config?.url
            });

            return res.status(error.response?.status || 500).json({
                status: false,
                message: error.response?.data?.message || 'Google authentication failed',
                error: error.response?.data,
            });
        }

        return res.status(500).json({
            status: false,
            message: 'Internal server error during Google authentication',
            error: error instanceof Error ? error.message : String(error)
        });
    }
}
