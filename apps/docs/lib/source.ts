import { createElement } from 'react';
import Image from 'next/image';
import { docs } from 'collections/server';
import { loader } from 'fumadocs-core/source';
import * as icons from 'lucide-react';

/**
 * `icon` in a meta.json or in frontmatter is a string; something has to turn it
 * into a node. Two forms are accepted:
 *
 * - a path starting with `/` — rendered as an image out of `public/`
 * - anything else — a Lucide icon name
 *
 * Without a resolver every `icon` in the tree is silently dropped, which is a
 * confusing way to fail: the JSON looks right and nothing appears.
 */
function resolveIcon(icon?: string) {
  if (!icon) return undefined;

  if (icon.startsWith('/')) {
    return createElement(Image, {
      src: icon,
      alt: '',
      width: 20,
      height: 20,
      className: 'rounded-[5px]',
    });
  }

  if (icon in icons) {
    return createElement(icons[icon as keyof typeof icons] as never);
  }

  return undefined;
}

export const source = loader({
  baseUrl: '/docs',
  source: docs.toFumadocsSource(),
  icon: resolveIcon,
});
