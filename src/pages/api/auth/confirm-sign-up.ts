import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const response = await axios.post(
            `${process.env.API_BASE_URL}/auth/confirm-sign-up`,
            req.body,
            {
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        );
        res.status(200).json(response.data);
    } catch (error) {
        if (axios.isAxiosError(error)) {
            const statusCode = error.response?.status || 500;
            const message = error.response?.data?.detail || error.response?.data?.message || 'Something went wrong';
            return res.status(statusCode).json({ message });
        }
        res.status(500).json({ message: 'Something went wrong' });
    }
}
