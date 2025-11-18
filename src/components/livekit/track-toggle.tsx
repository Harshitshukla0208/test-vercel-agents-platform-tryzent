'use client';

import * as React from 'react';
import { useTrackToggle } from '@livekit/components-react';

type TrackToggleProps = React.ComponentProps<'button'> & {
  source: Parameters<typeof useTrackToggle>[0]['source'];
  pressed?: boolean;
};

export function TrackToggle({ source, pressed, className, children, ...props }: TrackToggleProps) {
  return (
    <button
      aria-pressed={pressed}
      aria-label={`Toggle ${source}`}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm ${className ?? ''}`}
      {...props}
    >
      {children}
    </button>
  );
}


