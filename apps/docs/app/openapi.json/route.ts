import { absoluteUrl, site } from '@/lib/site';

/**
 * What the two public APIs on this site are, in a form a machine can read.
 *
 * The registry has always been a documented URL shape rather than a described
 * one — `panelui.dev/r/<name>.json` is in the CLI page and nowhere else. This
 * is the same thing said in the format the API catalog points at.
 */
export const dynamic = 'force-static';

export function GET(): Response {
  const spec = {
    openapi: '3.1.0',
    info: {
      title: `${site.name} registry`,
      version: '1.0.0',
      summary: 'The component registry, and the documentation search index.',
      description:
        'Both endpoints are public, unauthenticated and served as static JSON. The registry is ' +
        'what `panelui-cli add` reads: every item carries its full source, the registry items it ' +
        'depends on, and the npm packages it needs.',
      license: { name: 'MIT', identifier: 'MIT' },
    },
    servers: [{ url: site.url }],
    paths: {
      '/r/index.json': {
        get: {
          operationId: 'listRegistryItems',
          summary: 'Every item in the registry, without their file contents.',
          responses: {
            '200': {
              description: 'The index.',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/RegistryItemSummary' },
                  },
                },
              },
            },
          },
        },
      },
      '/r/{name}.json': {
        get: {
          operationId: 'getRegistryItem',
          summary: 'One item, with every file it is made of.',
          parameters: [
            {
              name: 'name',
              in: 'path',
              required: true,
              description: 'Registry name, e.g. `button` or `bottom-sheet`.',
              schema: { type: 'string' },
            },
          ],
          responses: {
            '200': {
              description: 'The item.',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/RegistryItem' } },
              },
            },
            '404': { description: 'No item by that name.' },
          },
        },
      },
      '/api/search': {
        get: {
          operationId: 'searchDocs',
          summary: 'Full-text search across the documentation.',
          parameters: [
            {
              name: 'query',
              in: 'query',
              required: true,
              description: 'What to search for.',
              schema: { type: 'string' },
            },
          ],
          responses: { '200': { description: 'Matching pages and headings.' } },
        },
      },
    },
    components: {
      schemas: {
        RegistryItemSummary: {
          type: 'object',
          required: ['name', 'type', 'description'],
          properties: {
            name: { type: 'string' },
            type: {
              type: 'string',
              enum: ['registry:ui', 'registry:lib', 'registry:hook', 'registry:theme', 'registry:block'],
            },
            description: { type: 'string' },
            registryDependencies: { type: 'array', items: { type: 'string' } },
          },
        },
        RegistryItem: {
          allOf: [
            { $ref: '#/components/schemas/RegistryItemSummary' },
            {
              type: 'object',
              properties: {
                dependencies: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'npm packages the item needs.',
                },
                optionalDependencies: {
                  type: 'array',
                  items: { type: 'string' },
                  description:
                    'Reached through a guarded import, so the item works without them.',
                },
                files: {
                  type: 'array',
                  items: {
                    type: 'object',
                    required: ['path', 'type', 'content'],
                    properties: {
                      path: { type: 'string' },
                      type: { type: 'string' },
                      content: { type: 'string' },
                    },
                  },
                },
              },
            },
          ],
        },
      },
    },
    externalDocs: { url: absoluteUrl('/docs/cli'), description: 'The CLI that reads this.' },
  };

  return new Response(JSON.stringify(spec, null, 2) + '\n', {
    headers: { 'Content-Type': 'application/openapi+json' },
  });
}
