import { defineCollections, defineConfig, defineDocs, frontmatterSchema } from 'fumadocs-mdx/config';
import { z } from 'zod';

export const docs = defineDocs({
  dir: 'content/docs',
  docs: {
    /*
     * The default schema strips anything it does not know about, so `status`
     * has to be declared here or it never reaches the page tree. It is written
     * by scripts/gen.mjs from a component's `addedIn` version — never by hand.
     */
    schema: frontmatterSchema.extend({
      status: z.string().optional(),
      /*
       * The page has App and Web versions: it shows the toggle under the
       * description, and its `<Platform only="…">` blocks follow it.
       */
      platforms: z.boolean().optional(),
      /*
       * The title a search result shows, when it should say more than the
       * heading. A heading of "Theming" sits in a sidebar that already says
       * what it is theming; a search result does not, and at position 2 it
       * drew under one click in a hundred. The heading stays as it is.
       */
      seoTitle: z.string().optional(),
    }),
  },
});

/*
 * The blog: one MDX file per post in content/blog, outside the docs tree so it
 * never appears in the sidebar. `author` is a key into lib/blog.ts, and `cover`
 * names the post's cover image in lib/blog-covers.ts.
 */
export const blog = defineCollections({
  type: 'doc',
  dir: 'content/blog',
  schema: frontmatterSchema.extend({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    author: z.string(),
    cover: z.string(),
    tags: z.array(z.string()).default([]),
  }),
});

export default defineConfig();
