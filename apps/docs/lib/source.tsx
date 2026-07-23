import { docs } from 'collections/server';
import { loader } from 'fumadocs-core/source';
import { statusBadgesPlugin } from 'fumadocs-core/source/status-badges';

/** The dots a `status` can resolve to. Anything else renders nothing. */
const DOTS: Record<string, { label: string; className: string }> = {
  new: { label: 'New', className: 'bg-blue-500' },
  updated: { label: 'Updated', className: 'bg-fd-muted-foreground/60' },
};

export const source = loader({
  baseUrl: '/docs',
  source: docs.toFumadocsSource(),
  plugins: [
    /*
     * A dot, not a word. The sidebar is a long list of names and the badge has
     * to survive being scanned rather than read — a coloured mark beside the
     * marked entries carries that at a glance, where a "New" pill would compete
     * with the name it is attached to.
     *
     * Two of them: blue for a component that has just arrived, grey for one
     * that changed under someone already using it. Grey and not a second hue
     * because the two are not equals — "new" is worth a look, "updated" is
     * worth a look *only if you already have it*, and a second saturated colour
     * would claim otherwise.
     *
     * The `status` frontmatter is generated from each component's `addedIn` and
     * `updatedIn` versions and disappears three minor releases later, so
     * nothing here has to be cleaned up by hand.
     */
    statusBadgesPlugin({
      renderBadge: (status) => {
        const dot = DOTS[status];
        if (!dot) return null;
        return (
          <span
            role="img"
            aria-label={dot.label}
            className={`ms-1.5 inline-block size-1.5 shrink-0 rounded-full align-middle ${dot.className}`}
          />
        );
      },
    }),
  ],
});
