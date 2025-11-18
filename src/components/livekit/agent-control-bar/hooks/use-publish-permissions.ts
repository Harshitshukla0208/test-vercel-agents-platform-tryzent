import { Track } from 'livekit-client';
import { useLocalParticipantPermissions } from '@livekit/components-react';

// Map Track.Source to the protocol numeric enum without importing protocol package
function trackSourceToProtocol(source: Track.Source): number | undefined {
  switch (source) {
    case Track.Source.Camera:
      return 1;
    case Track.Source.Microphone:
      return 2;
    case Track.Source.ScreenShare:
      return 3;
    default:
      return undefined;
  }
}

export interface PublishPermissions {
  camera: boolean;
  microphone: boolean;
  screenShare: boolean;
  data: boolean;
}

export function usePublishPermissions(): PublishPermissions {
  const localPermissions = useLocalParticipantPermissions();

  const canPublishSource = (source: Track.Source) => {
    const proto = trackSourceToProtocol(source);
    return (
      !!localPermissions?.canPublish &&
      (localPermissions.canPublishSources.length === 0 ||
        (proto !== undefined && localPermissions.canPublishSources.includes(proto)))
    );
  };

  return {
    camera: canPublishSource(Track.Source.Camera),
    microphone: canPublishSource(Track.Source.Microphone),
    screenShare: canPublishSource(Track.Source.ScreenShare),
    data: localPermissions?.canPublishData ?? false,
  };
}


