import { defineConfig, defineDocs, frontmatterSchema } from 'fumadocs-mdx/config';
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
    }),
  },
});

export default defineConfig();
