import type { NextApiRequest, NextApiResponse } from 'next';
import { AccessToken, RoomServiceClient, type AccessTokenOptions, type VideoGrant } from 'livekit-server-sdk';

export type ConnectionDetails = {
  serverUrl: string;
  roomName: string;
  participantName: string;
  participantToken: string;
  regionsToken?: string;
  regionsUrl?: string;
  grade?: string;
  subject?: string;
  chapter?: string;
};

const API_KEY = process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_URL = process.env.LIVEKIT_URL;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end('Method Not Allowed');
  }

  try {
    if (!LIVEKIT_URL) throw new Error('LIVEKIT_URL is not defined');
    if (!API_KEY) throw new Error('LIVEKIT_API_KEY is not defined');
    if (!API_SECRET) throw new Error('LIVEKIT_API_SECRET is not defined');

    const _agentName: string | undefined = req.body?.room_config?.agents?.[0]?.agent_name;

    const participantName = 'user';
    const participantIdentity = `voice_assistant_user_${Math.floor(Math.random() * 10_000)}`;
    const roomName = `voice_assistant_room_${Math.floor(Math.random() * 10_000)}`;

    await ensureRoomExistsWithMetadata(LIVEKIT_URL, API_KEY, API_SECRET, roomName);

    const participantToken = await createParticipantToken(
      { identity: participantIdentity, name: participantName },
      roomName,
      _agentName
    );

    const data: ConnectionDetails = {
      serverUrl: LIVEKIT_URL,
      roomName,
      participantToken,
      participantName,
    };
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('connection-details error', error);
    return res.status(500).send(message);
  }
}

function createParticipantToken(
  userInfo: AccessTokenOptions,
  roomName: string,
  agentName?: string
): Promise<string> {
  const at = new AccessToken(API_KEY!, API_SECRET!, {
    ...userInfo,
    ttl: '15m',
  });
  const grant: VideoGrant = {
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canPublishData: true,
    canSubscribe: true,
  };
  at.addGrant(grant);

  if (agentName) {
    // at.roomConfig = {
    //   agents: [
    //     {
    //       agentName,
    //       metadata: agentMetadata && typeof agentMetadata === 'object' ? JSON.stringify(agentMetadata) : undefined,
    //     },
    //   ],
    // } as Record<string, unknown>;
    // Room configuration is not needed for token creation and not supported here.
  }

  return at.toJwt();
}

async function ensureRoomExistsWithMetadata(
  livekitUrl: string,
  apiKey: string,
  apiSecret: string,
  roomName: string
) {
  try {
    const restUrl = livekitUrl.replace(/^wss:\/\//, 'https://').replace(/^ws:\/\//, 'http://');
    const client = new RoomServiceClient(restUrl, apiKey, apiSecret);
    await client.createRoom({
      name: roomName,
    });
  } catch (e) {
    if (!(e && typeof e === 'object' && 'message' in e && String(e.message).includes('already exists'))) {
      console.warn('ensureRoomExistsWithMetadata error', e);
    }
  }
}


