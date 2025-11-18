'use client';

import { useLayoutEffect, useState } from 'react';
import { LocalAudioTrack, LocalVideoTrack } from 'livekit-client';
import { useMaybeRoomContext, useMediaDeviceSelect } from '@livekit/components-react';

type DeviceSelectProps = React.ComponentProps<'button'> & {
  kind: MediaDeviceKind;
  track?: LocalAudioTrack | LocalVideoTrack | undefined;
  requestPermissions?: boolean;
  onMediaDeviceError?: (error: Error) => void;
  size?: 'default' | 'sm';
  className?: string;
};

export function DeviceSelect({ kind, track, requestPermissions, onMediaDeviceError, size = 'default', className }: DeviceSelectProps) {
  const [open, setOpen] = useState(false);
  const [requestPermissionsState, setRequestPermissionsState] = useState(requestPermissions);
  const room = useMaybeRoomContext();
  const { devices, activeDeviceId, setActiveMediaDevice } = useMediaDeviceSelect({
    kind,
    room,
    track,
    requestPermissions: requestPermissionsState,
    onError: onMediaDeviceError,
  });

  useLayoutEffect(() => {
    if (open) setRequestPermissionsState(true);
  }, [open]);

  return (
    <div className={className}>
      <select
        value={activeDeviceId}
        onChange={(e) => setActiveMediaDevice(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className={`rounded-full border px-2 py-1 text-sm ${size === 'sm' ? 'w-auto' : 'w-[180px]'}`}
      >
        {devices
          .filter((d) => d.deviceId !== '')
          .map((device) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label}
            </option>
          ))}
      </select>
    </div>
  );
}


