import type { NextApiRequest, NextApiResponse } from 'next';

interface RequestBody {
    agent_id: string;
    execution_id: string;
    response_rating: number;
    response_feedback?: string;
}

interface ApiResponse {
    message?: string;
    status?: boolean;
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<ApiResponse>
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { agent_id, execution_id, response_rating, response_feedback }: RequestBody = req.body;

        // Get authorization header from request
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ message: 'Authorization header missing' });
        }

        // Validate required fields
        if (!agent_id || !execution_id || !response_rating) {
            return res.status(400).json({
                message: 'Missing required fields: agent_id, execution_id, response_rating'
            });
        }

        // Make request to external API
        const apiResponse = await fetch(
            `${process.env.API_BASE_URL2}/agents/save-agent-execution-feedback/${execution_id}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': authHeader,
                    'accept': 'application/json'
                },
                body: JSON.stringify({
                    agent_id,
                    execution_id,
                    response_rating,
                    response_feedback
                })
            }
        );

        const data = await apiResponse.json();

        if (!apiResponse.ok) {
            return res.status(apiResponse.status).json({
                message: data.message || 'External API request failed',
                status: false
            });
        }

        // Return success response
        return res.status(200).json(data);

    } catch (error) {
        console.error('Rating feedback API error:', error);
        return res.status(500).json({
            message: 'Internal server error',
            status: false
        });
    }
}
