import { docs } from 'collections/server';
import { loader } from 'fumadocs-core/source';
import { statusBadgesPlugin } from 'fumadocs-core/source/status-badges';

export const source = loader({
  baseUrl: '/docs',
  source: docs.toFumadocsSource(),
  plugins: [
    /*
     * A dot, not a word. The sidebar is a long list of names and the badge has
     * to survive being scanned rather than read — a coloured mark beside the
     * new entries carries that at a glance, where a "New" pill would compete
     * with the name it is attached to.
     *
     * The `status` frontmatter is generated from each component's `addedIn`
     * version and disappears three minor releases later, so nothing here has
     * to be cleaned up by hand.
     */
    statusBadgesPlugin({
      renderBadge: (status) =>
        status === 'new' ? (
          <span
            role="img"
            aria-label="New"
            className="ms-1.5 inline-block size-1.5 shrink-0 rounded-full bg-blue-500 align-middle"
          />
        ) : null,
    }),
  ],
});
