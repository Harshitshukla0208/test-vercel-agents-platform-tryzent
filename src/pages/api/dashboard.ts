import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

const API_URL = `${process.env.API_BASE_URL2}/agents/get-all-agents`;

export async function fetchAgents(params?: {
    page?: number;
    page_size?: number;
    name?: string;
    category?: string;
}) {
    try {
        const searchParams = new URLSearchParams();

        if (params?.page) searchParams.append('page', params.page.toString());
        if (params?.page_size) searchParams.append('page_size', params.page_size.toString());
        if (params?.name) searchParams.append('name', params.name);
        if (params?.category) searchParams.append('category', params.category);

        const url = `${API_URL}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;

        const response = await axios.get(url, {
            headers: {
                'Accept': 'application/json',
            },
            timeout: 5000,
            validateStatus: (status) => status === 200,
        });
        return response;
    } catch (error) {
        console.error('Error in fetchAgents:', {
            message: axios.isAxiosError(error) ? error.message : 'Unknown error',
            status: axios.isAxiosError(error) ? error.response?.status : undefined,
            data: axios.isAxiosError(error) ? error.response?.data : undefined,
        });
        throw error;
    }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        if (req.method !== 'GET') {
            return res.status(405).json({ error: 'Method not allowed' });
        }

        const { page, page_size, name, category } = req.query;

        const params = {
            page: page ? parseInt(page as string) : undefined,
            page_size: page_size ? parseInt(page_size as string) : undefined,
            name: name as string,
            category: category as string,
        };

        const { data } = await fetchAgents(params);

        if (!data || !Array.isArray(data.data)) {
            console.error('Invalid response format:', data);
            return res.status(500).json({ error: 'Invalid response format from agents API' });
        }

        return res.status(200).json(data);
    } catch (error) {
        console.error('API handler error:', error);
        if (axios.isAxiosError(error)) {
            const statusCode = error.response?.status || 500;
            const errorMessage = error.response?.data?.error || 'Failed to fetch agents';

            return res.status(statusCode).json({
                error: errorMessage,
                details: error.message
            });
        }
        return res.status(500).json({
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}
