import type { NextApiRequest, NextApiResponse } from 'next';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const API_ENDPOINT = '/api/livekit/start-session';

interface BackendRequestBody {
  grade: string;
  subject: string;
  chapter: string;
  room_name: string;
  board: string;
  participant_identity: string;
  thread: string;
  username?: string;
}

interface StartSessionRequest {
  grade?: string;
  subject?: string;
  chapter?: string;
  board?: string;
  participantIdentity?: string;
  thread?: string;
  username?: string;
}

interface StartSessionResponse {
  participantToken: string;
  regionsToken?: string;
  roomName: string;
  serverUrl: string;
  participantName: string;
}

function generateRoomName(): string {
  return `voice_assistant_room_${Math.floor(Math.random() * 10_000)}`;
}

function buildRequestBody(config: StartSessionRequest): BackendRequestBody {
  return {
    grade: config.grade || '',
    subject: config.subject || '',
    chapter: config.chapter || '',
    room_name: generateRoomName(),
    board: config.board ?? 'CBSE',
    participant_identity: config.participantIdentity ?? 'string',
    thread: config.thread ?? undefined, // Only include if present
    username: config.username,
  } as BackendRequestBody;
}

function parseParticipantToken(json: unknown): { participantToken: string; regionsToken?: string } {
  let participantToken: string;
  let regionsToken: string | undefined;

  if (typeof json === 'string') {
    participantToken = json;
  } else if (json && typeof json === 'object' && 'data' in json && json.data && typeof json.data === 'object' && 'body' in json.data) {
    participantToken = String(json.data.body);
    regionsToken = String(json.data.body);
  } else if (json && typeof json === 'object' && 'body' in json) {
    participantToken = String(json.body);
    regionsToken = String(json.body);
  } else {
    participantToken = JSON.stringify(json);
  }

  return { participantToken, regionsToken };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Extract access token from cookies using Next.js built-in cookie parsing
    const cookies = req.headers.cookie;
    let accessToken: string | undefined;

    if (cookies) {
      const cookieArray = cookies.split(';');
      const accessTokenCookie = cookieArray.find(cookie => cookie.trim().startsWith('access_token='));
      if (accessTokenCookie) {
        accessToken = accessTokenCookie.split('=')[1];
      }
    }

    if (!accessToken) {
      return res.status(401).json({ error: 'No access token found. Please log in.' });
    }

    const config: StartSessionRequest = req.body;
    const requestBody = buildRequestBody(config);
    const url = new URL(API_ENDPOINT, BACKEND_URL);

    console.log('Forwarding request to backend:', {
      url: url.toString(),
      body: requestBody,
      config
    });

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    };

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      let errorBody: string | undefined;
      try {
        errorBody = await response.text();
      } catch {
        errorBody = undefined;
      }

      console.error(
        'Backend responded with error:',
        response.status,
        response.statusText,
        errorBody
      );

      const errorMessage = errorBody
        ? `${response.status} ${response.statusText} - ${errorBody}`
        : `${response.status} ${response.statusText}`;

      return res.status(response.status).json({
        error: `Backend request failed: ${errorMessage}`
      });
    }

    const contentType = response.headers.get('content-type') || '';
    let participantToken: string;
    let regionsToken: string | undefined;

    if (contentType.includes('application/json')) {
      const json = await response.json();
      ({ participantToken, regionsToken } = parseParticipantToken(json));
    } else {
      participantToken = await response.text();
    }

    if (!process.env.LIVEKIT_URL) {
      return res.status(500).json({ error: 'Server configuration error: LIVEKIT_URL not set' });
    }

    const responseData: StartSessionResponse = {
      serverUrl: process.env.LIVEKIT_URL,
      roomName: requestBody.room_name,
      participantName: 'user',
      participantToken,
      regionsToken,
    };

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(responseData);

  } catch (error) {
    console.error('Error in start-session API:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}
