import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'POST') {
        const { email, confirmation_code, new_password } = req.body;

        try {
            // Replace this URL with your external API endpoint
            const response = await axios.post(`${process.env.API_BASE_URL}/auth/password-reset/confirm`, {
                email,
                confirmation_code,
                new_password,
            });

            res.status(200).json({ message: 'Password reset successfully.' });
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const statusCode = error.response?.status || 500;
                const message = error.response?.data?.detail || error.response?.data?.message || 'An error occurred while resetting the password.';
                return res.status(statusCode).json({ message });
            }
            res.status(500).json({ message: 'An unexpected error occurred while resetting the password.' });
        }
    } else {
        res.status(405).json({ message: 'Method not allowed' });
    }
}
