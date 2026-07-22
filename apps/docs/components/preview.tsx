import Image from 'next/image';
import { PreviewFrame } from './preview-frame';

export interface PreviewProps {
  /** Path under `public/`, e.g. `/previews/item.jpg`. */
  src: string;
  /** What the screenshot shows. Not decorative — it is the only description. */
  alt: string;
  /** Intrinsic pixel dimensions of the file, for the aspect ratio. */
  width: number;
  height: number;
  /** Optional line under the frame. */
  caption?: string;
}

/**
 * A framed screenshot of a component running on a device.
 *
 * These are React Native components on a Next.js site, so a live preview would
 * mean shipping `react-native-web` and a whole render pipeline. A screenshot is
 * honest about what it is, and it shows the component on the platform it
 * actually targets rather than an approximation of it in a browser.
 */
export function Preview({ src, alt, width, height, caption }: PreviewProps) {
  return (
    <PreviewFrame caption={caption}>
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        className="mx-auto h-auto w-full max-w-md rounded-lg"
        sizes="(min-width: 768px) 28rem, 100vw"
      />
    </PreviewFrame>
  );
}
