import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Room } from "livekit-client"
import type { ReceivedChatMessage, TextStreamData } from "@livekit/components-react"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function transcriptionToChatMessage(
  textStream: TextStreamData,
  room: Room
): ReceivedChatMessage {
  // LiveKit Components provides text, streamInfo (id,timestamp) and participantInfo
  // Some environments report local speech with participantInfo.isLocal rather than matching identity; prefer isLocal when available.
  const info = (textStream as { participantInfo?: { isLocal?: boolean; identity?: string } | { identity: string } }).participantInfo ?? textStream.participantInfo;
  const isLocalSpeech = (typeof info === 'object' && 'isLocal' in info && info.isLocal === true) || info?.identity === room.localParticipant.identity;

  // Prefer to attribute to LOCAL unless we can confidently match a remote participant
  // Only consider a remote match when identity is present AND different from local
  const identity = info?.identity as string | undefined;
  const remoteMatch = identity && identity !== room.localParticipant.identity
    ? Array.from(room.remoteParticipants.values()).find((p) => p.identity === identity)
    : undefined;
  const confidentRemote = !isLocalSpeech && !!remoteMatch;

  const fromParticipant = confidentRemote ? remoteMatch : room.localParticipant;
  return {
    id: textStream.streamInfo.id,
    timestamp: textStream.streamInfo.timestamp,
    message: textStream.text,
    from: fromParticipant,
  } as ReceivedChatMessage;
}
