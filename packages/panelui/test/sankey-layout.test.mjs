import assert from 'node:assert/strict';
import test from 'node:test';
import { sankeyLayout } from '../src/components/sankey-chart/sankey-layout.ts';

const OPTIONS = {
  width: 300,
  height: 200,
  nodeWidth: 12,
  nodePadding: 10,
  align: 'justify',
  iterations: 6,
};

const lay = (nodes, links, overrides) =>
  sankeyLayout(nodes, links, { ...OPTIONS, ...overrides });

const ids = (nodes) => nodes.map((node) => node.id);
const byId = (layout, id) => layout.nodes.find((node) => node.id === id);

test('a node is worth the larger of what reaches it and what leaves it', () => {
  const layout = lay(
    [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
    [
      { source: 'a', target: 'b', value: 10 },
      { source: 'a', target: 'c', value: 5 },
    ]
  );

  assert.equal(byId(layout, 'a').value, 15);
  assert.equal(byId(layout, 'b').value, 10);
  assert.equal(byId(layout, 'c').value, 5);
});

test('an explicit value pins a node whose links do not account for all of it', () => {
  // Twenty arrive and twelve leave: the eight that went nowhere are still part
  // of the stage, and only the caller knows that.
  const layout = lay(
    [{ id: 'a' }, { id: 'b', value: 20 }, { id: 'c' }],
    [
      { source: 'a', target: 'b', value: 20 },
      { source: 'b', target: 'c', value: 12 },
    ]
  );

  assert.equal(byId(layout, 'b').value, 20);
});

test('flow decides the columns, and every node lands in exactly one', () => {
  const layout = lay(
    [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
    [
      { source: 'a', target: 'b', value: 4 },
      { source: 'b', target: 'c', value: 4 },
    ]
  );

  assert.equal(layout.columns, 3);
  assert.equal(byId(layout, 'a').layer, 0);
  assert.equal(byId(layout, 'b').layer, 1);
  assert.equal(byId(layout, 'c').layer, 2);

  // The first column starts at the left edge and the last ends at the right,
  // so the diagram fills the width it was given rather than floating in it.
  assert.equal(byId(layout, 'a').x0, 0);
  assert.equal(byId(layout, 'c').x1, OPTIONS.width);
  for (const node of layout.nodes) {
    assert.equal(node.x1 - node.x0, OPTIONS.nodeWidth);
  }
});

test('justify pushes everything that feeds nothing into the last column', () => {
  // `b` could sit in column 1 by its own depth; it ends nowhere, so it is
  // drawn against the same edge as the other destination.
  const layout = lay(
    [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }],
    [
      { source: 'a', target: 'b', value: 3 },
      { source: 'a', target: 'c', value: 3 },
      { source: 'c', target: 'd', value: 3 },
    ]
  );

  assert.equal(layout.columns, 3);
  assert.equal(byId(layout, 'b').layer, 2);
  assert.equal(byId(layout, 'd').layer, 2);

  // `left` reads the same flow from where things start instead.
  const left = lay(
    [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }],
    [
      { source: 'a', target: 'b', value: 3 },
      { source: 'a', target: 'c', value: 3 },
      { source: 'c', target: 'd', value: 3 },
    ],
    { align: 'left' }
  );
  assert.equal(byId(left, 'b').layer, 1);
});

test('ribbon thickness is the value, on one scale for the whole diagram', () => {
  const layout = lay(
    [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
    [
      { source: 'a', target: 'b', value: 10 },
      { source: 'a', target: 'c', value: 5 },
    ]
  );

  const [wide, narrow] = layout.links;
  assert.ok(Math.abs(wide.width / narrow.width - 2) < 1e-9);

  // And a node is as tall as the ribbons it carries.
  const a = byId(layout, 'a');
  assert.ok(Math.abs(a.y1 - a.y0 - (wide.width + narrow.width)) < 1e-6);
});

test('a ribbon meets its node inside that node, at its own centre', () => {
  const layout = lay(
    [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
    [
      { source: 'a', target: 'b', value: 10 },
      { source: 'a', target: 'c', value: 5 },
    ]
  );

  for (const link of layout.links) {
    const source = layout.nodes[link.source];
    const target = layout.nodes[link.target];
    const half = link.width / 2;
    // The whole thickness lands on the node's edge, not just the centre line.
    assert.ok(link.y0 - half >= source.y0 - 1e-6);
    assert.ok(link.y0 + half <= source.y1 + 1e-6);
    assert.ok(link.y1 - half >= target.y0 - 1e-6);
    assert.ok(link.y1 + half <= target.y1 + 1e-6);
  }
});

test('nodes in a column never overlap, and nothing leaves the box', () => {
  const nodes = Array.from({ length: 6 }, (_, i) => ({ id: `n${i}` }));
  const links = [
    { source: 'n0', target: 'n3', value: 9 },
    { source: 'n0', target: 'n4', value: 4 },
    { source: 'n1', target: 'n4', value: 6 },
    { source: 'n1', target: 'n5', value: 2 },
    { source: 'n2', target: 'n5', value: 7 },
    { source: 'n2', target: 'n3', value: 3 },
  ];
  const layout = lay(nodes, links);

  const columns = new Map();
  for (const node of layout.nodes) {
    assert.ok(node.y0 >= -1e-6, `${node.id} above the box`);
    assert.ok(node.y1 <= OPTIONS.height + 1e-6, `${node.id} below the box`);
    const column = columns.get(node.layer) ?? [];
    column.push(node);
    columns.set(node.layer, column);
  }

  for (const column of columns.values()) {
    const sorted = [...column].sort((a, b) => a.y0 - b.y0);
    for (let i = 1; i < sorted.length; i += 1) {
      assert.ok(
        sorted[i].y0 >= sorted[i - 1].y1 - 1e-6,
        `${sorted[i].id} overlaps ${sorted[i - 1].id}`
      );
    }
  }
});

test('a crowded column gives up its padding rather than its bars', () => {
  // Twelve nodes at the requested padding would be more gap than chart, so the
  // gap is what gives — and every bar still has a height worth reading.
  const nodes = [{ id: 'root' }, ...Array.from({ length: 12 }, (_, i) => ({ id: `leaf${i}` }))];
  const links = nodes.slice(1).map((node) => ({ source: 'root', target: node.id, value: 5 }));
  const layout = lay(nodes, links, { height: 120, nodePadding: 20 });

  for (const node of layout.nodes) {
    assert.ok(node.y1 - node.y0 > 0, `${node.id} has no height`);
    assert.ok(node.y1 <= 120 + 1e-6);
    assert.ok(node.y0 >= -1e-6);
  }
});

test('a link that closes a loop is dropped, and the rest is still drawn', () => {
  const layout = lay(
    [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
    [
      { source: 'a', target: 'b', value: 5 },
      { source: 'b', target: 'c', value: 5 },
      { source: 'c', target: 'a', value: 5 },
    ]
  );

  assert.equal(layout.dropped, 1);
  assert.equal(layout.links.length, 2);
  assert.deepEqual(ids(layout.nodes), ['a', 'b', 'c']);
  // The two survivors are the run, in order.
  assert.equal(layout.nodes[layout.links[0].source].id, 'a');
  assert.equal(layout.nodes[layout.links[1].target].id, 'c');
});

test('a node that points at itself is not a flow', () => {
  const layout = lay(
    [{ id: 'a' }, { id: 'b' }],
    [
      { source: 'a', target: 'a', value: 5 },
      { source: 'a', target: 'b', value: 5 },
    ]
  );

  assert.equal(layout.dropped, 1);
  assert.equal(layout.links.length, 1);
});

test('rows that name nothing or carry nothing are counted out, not drawn', () => {
  const layout = lay(
    [{ id: 'a' }, { id: 'b' }],
    [
      { source: 'a', target: 'ghost', value: 5 },
      { source: 'a', target: 'b', value: 0 },
      { source: 'a', target: 'b', value: -3 },
      { source: 'a', target: 'b', value: Number.NaN },
      { source: 'a', target: 'b', value: 4 },
    ]
  );

  assert.equal(layout.dropped, 4);
  assert.equal(layout.links.length, 1);
  assert.equal(layout.links[0].value, 4);
});

test('a dropped row does not shift the rows after it off their data', () => {
  const layout = lay(
    [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
    [
      { source: 'a', target: 'ghost', value: 5 },
      { source: 'a', target: 'b', value: 6 },
      { source: 'a', target: 'c', value: 2 },
    ]
  );

  // `input` still points at the caller's row, so a colour or a label read from
  // it belongs to the ribbon it is drawn on.
  assert.deepEqual(
    layout.links.map((link) => link.input),
    [1, 2]
  );
  assert.deepEqual(
    layout.links.map((link) => link.index),
    [0, 1]
  );
});

test('a repeated id is one node, and the links still find it', () => {
  const layout = lay(
    [{ id: 'a' }, { id: 'a' }, { id: 'b' }],
    [{ source: 'a', target: 'b', value: 5 }]
  );

  assert.equal(layout.nodes.length, 2);
  assert.equal(layout.links.length, 1);
  assert.equal(layout.nodes[layout.links[0].source].id, 'a');
});

test('nothing to draw comes back empty rather than as a diagram of zeroes', () => {
  assert.deepEqual(lay([], []), { nodes: [], links: [], columns: 0, dropped: 0 });
  assert.deepEqual(lay([{ id: 'a' }], [], { width: 0 }).nodes, []);
  assert.deepEqual(lay([{ id: 'a' }], [], { height: 0 }).nodes, []);

  // One node carrying nothing has no scale to be drawn against.
  const flat = lay([{ id: 'a' }, { id: 'b' }], []);
  assert.deepEqual(flat.nodes, []);
  assert.equal(flat.columns, 1);
});

test('a single column sits at the left edge instead of dividing by no gap', () => {
  const layout = lay([{ id: 'a', value: 5 }], []);

  assert.equal(layout.columns, 1);
  assert.equal(layout.nodes[0].x0, 0);
  assert.equal(layout.nodes[0].x1, OPTIONS.nodeWidth);
  assert.ok(Number.isFinite(layout.nodes[0].y1));
});

test('the layout is settled: the same data twice gives the same picture', () => {
  const nodes = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];
  const links = [
    { source: 'a', target: 'c', value: 8 },
    { source: 'a', target: 'd', value: 3 },
    { source: 'b', target: 'c', value: 2 },
    { source: 'b', target: 'd', value: 6 },
  ];

  assert.deepEqual(lay(nodes, links), lay(nodes, links));
});

test('no relaxation rounds still produces a drawable diagram', () => {
  const layout = lay(
    [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
    [
      { source: 'a', target: 'b', value: 4 },
      { source: 'a', target: 'c', value: 4 },
    ],
    { iterations: 0 }
  );

  for (const node of layout.nodes) {
    assert.ok(Number.isFinite(node.y0) && Number.isFinite(node.y1));
    assert.ok(node.y1 > node.y0);
  }
});

test('the caller is never handed a number a renderer cannot use', () => {
  const nodes = Array.from({ length: 8 }, (_, i) => ({ id: `n${i}` }));
  const links = [
    { source: 'n0', target: 'n1', value: 1e-6 },
    { source: 'n0', target: 'n2', value: 1e6 },
    { source: 'n1', target: 'n3', value: 1e-6 },
    { source: 'n2', target: 'n4', value: 999999 },
    { source: 'n4', target: 'n5', value: 500000 },
    { source: 'n4', target: 'n6', value: 499999 },
    { source: 'n5', target: 'n7', value: 250000 },
  ];
  const layout = lay(nodes, links);

  for (const node of layout.nodes) {
    for (const key of ['x0', 'x1', 'y0', 'y1', 'value']) {
      assert.ok(Number.isFinite(node[key]), `${node.id}.${key} is ${node[key]}`);
    }
  }
  for (const link of layout.links) {
    for (const key of ['y0', 'y1', 'width']) {
      assert.ok(Number.isFinite(link[key]), `link ${link.index}.${key} is ${link[key]}`);
    }
    assert.ok(link.width >= 0);
  }
});
