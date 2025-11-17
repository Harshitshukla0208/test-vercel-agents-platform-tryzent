import { NextApiRequest, NextApiResponse } from 'next';

interface UpdateAgentResponseBody {
    agent_id: string;
    execution_id: string;
    response: any;
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { agent_id, execution_id, response } = req.body as UpdateAgentResponseBody;

        // Get authorization header from the request
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({ error: 'Authorization header missing' });
        }

        // Validate required fields
        if (!agent_id || !execution_id || !response) {
            return res.status(400).json({
                error: 'Missing required fields: agent_id, execution_id, or response'
            });
        }

        // Prepare the request body for the external API
        const requestBody = {
            agent_id,
            execution_id,
            response
        };

        // Make the API call to your external service
        const apiUrl = `${process.env.API_BASE_URL2}/agents/update-agent-response/${execution_id}`;

        const apiResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'Authorization': authHeader,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!apiResponse.ok) {
            const errorText = await apiResponse.text();
            return res.status(apiResponse.status).json({
                error: `External API error: ${errorText}`
            });
        }

        const result = await apiResponse.json();

        // Check if the external API indicates failure
        if (result && result.hasOwnProperty('status') && !result.status) {
            return res.status(400).json({
                error: result.message || 'Failed to update agent response'
            });
        }

        return res.status(200).json(result);

    } catch (error) {
        console.error('Error updating agent response:', error);
        return res.status(500).json({
            error: 'Internal server error'
        });
    }
}
