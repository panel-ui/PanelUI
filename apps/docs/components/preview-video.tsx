'use client';

import { useEffect, useRef, useState } from 'react';
import { PreviewFrame } from './preview-frame';

export interface PreviewVideoProps {
  /** Path under `public/`, e.g. `/previews/shimmer.mp4`. */
  src: string;
  /** Still shown before playback, e.g. `/previews/shimmer-poster.jpg`. */
  poster?: string;
  /** What the recording shows. Not decorative — it is the only description. */
  alt: string;
  /** Intrinsic pixel dimensions of the file, for the aspect ratio. */
  width: number;
  height: number;
  /** Optional line under the frame. */
  caption?: string;
}

/**
 * A framed screen recording, for a component whose whole point is that it
 * moves. A still of a sweep is a still of nothing.
 *
 * It plays silently on a loop with no controls, because it is illustration
 * rather than media — a play button on a two-second loop is a control nobody
 * wants to press.
 *
 * Unless motion has been turned down. A silent video looping forever in the
 * corner of your eye is the exact thing `prefers-reduced-motion` exists to
 * stop, so there it stays on its poster frame and gets its controls back:
 * still watchable, but only on purpose. That check is why this is a client
 * component while `Preview` is not.
 */
export function PreviewVideo({
  src,
  poster,
  alt,
  width,
  height,
  caption,
}: PreviewVideoProps) {
  const video = useRef<HTMLVideoElement>(null);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');

    const apply = () => {
      setReduced(query.matches);
      const element = video.current;
      if (!element) return;

      if (query.matches) {
        element.pause();
        element.currentTime = 0;
      } else {
        // Muted playback may be started programmatically; a rejection here
        // just means the browser would rather the user asked for it.
        void element.play().catch(() => {});
      }
    };

    apply();
    query.addEventListener('change', apply);
    return () => query.removeEventListener('change', apply);
  }, []);

  // A phone recording is far taller than it is wide, and at the image frame's
  // width it would be a page-long block. Cap portrait media to phone width.
  const portrait = height > width;

  return (
    <PreviewFrame caption={caption}>
      <video
        ref={video}
        src={src}
        poster={poster}
        width={width}
        height={height}
        aria-label={alt}
        muted
        loop
        playsInline
        preload="metadata"
        controls={reduced}
        className={`mx-auto h-auto w-full rounded-lg ${portrait ? 'max-w-[280px]' : 'max-w-md'}`}
      />
    </PreviewFrame>
  );
}
