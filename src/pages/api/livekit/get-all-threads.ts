import type { NextApiRequest, NextApiResponse } from 'next';

const EXTERNAL_URL = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/livekit/get-all-threads`;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extract token from cookies or headers
    const token = req.cookies.access_token || req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No authorization token provided' });
    }

    // Extract query params - chapter is now required
    const { board, subject, grade, chapter } = req.query;
    
    if (!board || !subject || !grade || !chapter) {
      return res.status(400).json({ 
        error: 'Missing required query parameters: board, subject, grade, chapter' 
      });
    }

    // Build URL with chapter parameter
    const url = `${EXTERNAL_URL}?board=${encodeURIComponent(String(board))}&subject=${encodeURIComponent(String(subject))}&grade=${encodeURIComponent(String(grade))}&chapter=${encodeURIComponent(String(chapter))}`;

    // Proxy request
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    console.error('get-all-threads API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      message: 'Failed to fetch threads' 
    });
  }
}