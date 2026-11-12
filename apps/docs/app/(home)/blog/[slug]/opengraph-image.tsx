import fs from 'node:fs';
import path from 'node:path';
import { ImageResponse } from 'next/og';
import { authorOf, formatDate, getPost, getPosts, slugOf } from '@/lib/blog';
import { COVERS } from '@/lib/blog-covers';
import { OG_SIZE, OgCard } from '@/lib/og-card';
import { site } from '@/lib/site';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = `${site.name} blog`;

export function generateStaticParams() {
  return getPosts().map((post) => ({ slug: slugOf(post) }));
}

/** Cut at a word, with an ellipsis, so the description keeps to two lines beside the cover. */
const clamp = (text: string, length: number) => {
  if (text.length <= length) return text;
  const cut = text.slice(0, length);
  return `${cut.slice(0, cut.lastIndexOf(' '))}…`;
};

/**
 * The cover's card-sized JPEG as a data URI. The renderer has no network, so
 * an image given by URL draws as nothing; the bytes go in the card instead.
 */
const coverData = (file: string) =>
  `data:image/jpeg;base64,${fs.readFileSync(path.join(process.cwd(), 'public', file)).toString('base64')}`;

/** The post's card: the site's own card, with the post's cover beside its title. */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost(slug);
  const image = post ? COVERS[post.cover] : undefined;

  const cover = image ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={coverData(image.card)} width={400} height={225} alt="" style={{ borderRadius: 16 }} />
  ) : undefined;

  return new ImageResponse(
    (
      <OgCard
        eyebrow={post?.tags[0] ? `Blog · ${post.tags[0]}` : 'Blog'}
        title={post?.title ?? site.name}
        description={clamp(post?.description ?? site.tagline, 84)}
        footer={post ? `${authorOf(post).name} · ${formatDate(post.date)}` : site.url}
        art={cover}
      />
    ),
    size
  );
}
