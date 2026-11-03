import { createMDX } from 'fumadocs-mdx/next';

/*
 * Anything under `public/` is served `max-age=0, must-revalidate` unless it is
 * told otherwise, so a reader moving through five pages re-requests the logo
 * and every preview on each one — a 304 costs the same as a hit. A day of
 * freshness makes that one request per asset per day, and a re-recorded
 * preview keeps its filename, so a day is also the longest anyone waits to
 * see a corrected one.
 */
const STATIC_CACHE = 'public, max-age=86400';

const cached = (source) => ({
  source,
  headers: [{ key: 'Cache-Control', value: STATIC_CACHE }],
});

/*
 * Where an agent should look, advertised in the response rather than only in a
 * page it would have to be told to read (RFC 8288).
 *
 * Four things, and all of them already existed — the catalogue of the APIs
 * this site has, the OpenAPI description of them, the whole site as markdown,
 * and the MCP server card. The header is what makes them findable from a
 * single request to any page.
 */
const AGENT_LINKS = [
  '</.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json"',
  '</openapi.json>; rel="service-desc"; type="application/openapi+json"',
  '</llms.txt>; rel="service-doc"; type="text/plain"',
  '</llms.md>; rel="alternate"; type="text/markdown"',
  '</.well-known/mcp/server.json>; rel="mcp-server"; type="application/json"',
  '</.well-known/agent-card.json>; rel="describedby"; type="application/json"',
  '</.well-known/agent-skills/index.json>; rel="describedby"; type="application/json"',
  // RFC 9728's own rel, so a client that got an unexpected 401 from anywhere
  // on this domain can find out immediately that nothing here issues tokens.
  '</.well-known/oauth-protected-resource>; rel="oauth-protected-resource"; type="application/json"',
].join(', ');

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  /*
   * Memory, because Vercel's build machine has 8 GB and a cold build of this
   * site came to 7.6 GB there and was killed. Measured locally from cold:
   *
   * - Production builds compile with webpack (`next build --webpack` in
   *   package.json). Turbopack held 6.7 GB in one process while compiling the
   *   MDX of every page; webpack holds 3.2 GB for the same work.
   * - Static pages render in three workers. Each holds about 650 MB, and the
   *   default is one per CPU less one, which on a large machine is the peak.
   * - The dev server stays on Turbopack, with its loaders in worker threads
   *   rather than a child process each.
   */
  experimental: {
    cpus: 3,
    turbopackPluginRuntimeStrategy: 'workerThreads',
  },
  async headers() {
    return [
      {
        // Every HTML route. The excluded paths are the ones that are
        // themselves the answer, and would be pointing at themselves.
        source: '/((?!_next|previews|diagrams|r/|api/|llms).*)',
        headers: [{ key: 'Link', value: AGENT_LINKS }],
      },
      cached('/previews/:path*'),
      cached('/diagrams/:path*'),
      cached('/logo-light.png'),
      cached('/logo-dark.png'),
      cached('/logo-glow-light.png'),
      cached('/logo-glow-dark.png'),
      cached('/icon-512.png'),
      cached('/neon.svg'),
    ];
  },
  /*
   * A docs URL follows the folder its page is filed in, so regrouping a
   * component moves it. Anything that has been published — the README, the
   * landing page, other people's links — has to keep working, which is what
   * these are for.
   */
  async redirects() {
    return [
      // Moved into the Skills section when Apparatus joined it.
      {
        source: '/docs/integrations/logo-maker',
        destination: '/docs/integrations/skills/logo-maker',
        permanent: true,
      },
      // Renamed after 0.88.0 shipped it as FeedbackDialog. The old page is
      // live and linked, so it keeps a way through to the new one.
      {
        source: '/docs/components/feedback-dialog',
        destination: '/docs/components/feedback',
        permanent: true,
      },
      {
        source: '/docs/components/shimmer',
        destination: '/docs/ai-components/shimmer',
        permanent: true,
      },
      // The landing page's grid links every component under /components, so an
      // AI one needs a way back to the folder it actually lives in.
      {
        source: '/docs/components/soundwave',
        destination: '/docs/ai-components/soundwave',
        permanent: true,
      },
      {
        source: '/docs/components/panelside',
        destination: '/docs/ai-components/panelside',
        permanent: true,
      },
      {
        source: '/docs/components/ai-input',
        destination: '/docs/ai-components/ai-input',
        permanent: true,
      },
      // Field moved out of Form: it is a layout kit every control composes
      // into, not a piece of form state.
      {
        source: '/docs/form/field',
        destination: '/docs/components/field',
        permanent: true,
      },
      // Theming gained neighbours — Colors, Fonts and Styling — and moved into
      // the section they share. It is the most linked-to page in the docs.
      {
        source: '/docs/theming',
        destination: '/docs/customization/theming',
        permanent: true,
      },
      // KpiChart became Kpi. It was never a chart — the sparkline on it is a
      // footnote to the number, and half its versions have no chart at all.
      {
        source: '/docs/components/kpi-chart',
        destination: '/docs/components/kpi',
        permanent: true,
      },
      // The charts moved into a section of their own. There are eight of them
      // now, and a run of eight in the middle of an alphabetical list of
      // eighty is where a reader stops finding anything.
      {
        source: '/docs/components/:slug(area-chart|bar-chart|heatmap-chart|line-chart|pie-chart|radar-chart|ring-chart|scatter-chart)',
        destination: '/docs/charts/:slug',
        permanent: true,
      },
    ];
  },
};

const withMDX = createMDX();

export default withMDX(config);
