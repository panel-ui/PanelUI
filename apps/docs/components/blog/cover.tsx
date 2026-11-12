import Image from 'next/image';
import { COVERS } from '@/lib/blog-covers';
import { cn } from '@/lib/utils';

/** A post's cover image, at 16:9. The key comes from the post's frontmatter. */
export function BlogCover({
  cover,
  className,
  priority = false,
  sizes = '(min-width: 768px) 768px, 100vw',
}: {
  cover: string;
  className?: string;
  /** Load it straight away, for the cover at the top of a page. */
  priority?: boolean;
  /** How wide it is drawn, so the browser fetches no more than it needs. */
  sizes?: string;
}) {
  const image = COVERS[cover];
  if (!image) throw new Error(`Unknown blog cover "${cover}". Add it to lib/blog-covers.ts.`);
  return (
    <Image
      src={image.src}
      alt={image.alt}
      width={image.width}
      height={image.height}
      sizes={sizes}
      priority={priority}
      className={cn('aspect-video h-auto w-full bg-muted object-cover', className)}
    />
  );
}
