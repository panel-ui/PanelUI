/**
 * The two things a flow diagram does to fit on a phone.
 *
 * Both are arithmetic over the finished arrangement rather than anything
 * drawn, which is why they live in the layout module and are checked here
 * instead of by mounting a chart.
 *
 * Turning the diagram must not change it — a flow read down the screen is the
 * same flow read across it, and the moment the two disagree one of them is
 * lying about the data. Folding a column's tail must not change what the flow
 * carries either: a bucket stands for its members and has to be worth exactly
 * what they were worth between them, or the picture is the wrong size in a way
 * no reader can see.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  sankeyLayout,
  transposeLayout,
} from '../packages/panelui/src/components/sankey-chart/sankey-layout.ts';

const BOX = {
  width: 320,
  height: 240,
  nodeWidth: 10,
  nodePadding: 8,
  align: 'justify',
  iterations: 6,
};

/** Three sources into one middle stage into two endings. */
const NODES = [
  { id: 'search' },
  { id: 'social' },
  { id: 'direct' },
  { id: 'signup' },
  { id: 'paid' },
  { id: 'churned' },
];
const LINKS = [
  { source: 'search', target: 'signup', value: 60 },
  { source: 'social', target: 'signup', value: 30 },
  { source: 'direct', target: 'signup', value: 10 },
  { source: 'signup', target: 'paid', value: 40 },
  { source: 'signup', target: 'churned', value: 60 },
];

/** One wide column with a long tail of small nodes. */
const TAIL_NODES = [
  { id: 'total' },
  ...Array.from({ length: 10 }, (_, i) => ({ id: `part-${i}` })),
];
const TAIL_LINKS = Array.from({ length: 10 }, (_, i) => ({
  source: 'total',
  target: `part-${i}`,
  // 100, 50, 25, 12, 9, 8, 7, 6, 5, 4 — a clear head and a clear tail.
  value: [100, 50, 25, 12, 9, 8, 7, 6, 5, 4][i],
}));

test('transposing twice returns the arrangement unchanged', () => {
  const upright = sankeyLayout(NODES, LINKS, BOX);
  const there = transposeLayout(upright);
  const back = transposeLayout(there);
  assert.deepEqual(back.nodes, upright.nodes);
  assert.deepEqual(back.links, upright.links);
  assert.equal(back.columns, upright.columns);
});

test('transposing swaps the axes and nothing else', () => {
  const upright = sankeyLayout(NODES, LINKS, BOX);
  const turned = transposeLayout(upright);

  assert.ok(upright.nodes.length > 0);
  for (const [i, node] of turned.nodes.entries()) {
    const was = upright.nodes[i];
    assert.equal(node.id, was.id);
    assert.equal(node.value, was.value);
    assert.equal(node.layer, was.layer);
    // What carried the stage order now carries the value, and the other way.
    assert.equal(node.y0, was.x0);
    assert.equal(node.y1, was.x1);
    assert.equal(node.x0, was.y0);
    assert.equal(node.x1, was.y1);
  }
  // A ribbon's ends are already measured across the flow, so they are the same
  // numbers naming the other axis.
  assert.deepEqual(
    turned.links.map((link) => [link.y0, link.y1, link.width]),
    upright.links.map((link) => [link.y0, link.y1, link.width])
  );
});

test('a turned diagram fills the box it was given', () => {
  // Solved in the swapped box, then turned, which is how the component does it.
  const turned = transposeLayout(
    sankeyLayout(NODES, LINKS, { ...BOX, width: BOX.height, height: BOX.width })
  );
  for (const node of turned.nodes) {
    assert.ok(node.x0 >= -1e-6 && node.x1 <= BOX.width + 1e-6, `${node.id} ran off the width`);
    assert.ok(node.y0 >= -1e-6 && node.y1 <= BOX.height + 1e-6, `${node.id} ran off the height`);
    // The bar's thickness is along the flow, which is now the vertical.
    assert.ok(Math.abs(node.y1 - node.y0 - BOX.nodeWidth) < 1e-6);
  }
});

test('collapse holds a column to maxPerColumn', () => {
  const plain = sankeyLayout(TAIL_NODES, TAIL_LINKS, BOX);
  const folded = sankeyLayout(TAIL_NODES, TAIL_LINKS, {
    ...BOX,
    collapse: { maxPerColumn: 4 },
  });

  const countByLayer = (layout) => {
    const counts = new Map();
    for (const node of layout.nodes) counts.set(node.layer, (counts.get(node.layer) ?? 0) + 1);
    return counts;
  };

  assert.equal(countByLayer(plain).get(1), 10);
  assert.equal(countByLayer(folded).get(1), 4);
});

test('a bucket is worth exactly what it stands for', () => {
  const plain = sankeyLayout(TAIL_NODES, TAIL_LINKS, BOX);
  const folded = sankeyLayout(TAIL_NODES, TAIL_LINKS, {
    ...BOX,
    collapse: { maxPerColumn: 4 },
  });

  const total = (layout) => layout.links.reduce((sum, link) => sum + link.value, 0);
  assert.equal(total(folded), total(plain));

  const bucket = folded.nodes.find((node) => node.collapsed);
  assert.ok(bucket, 'expected a bucket');
  assert.equal(bucket.id, 'Other');
  assert.equal(bucket.index, -1);
  // Four per column with the bucket taking one of the places leaves three of
  // the originals, so the other seven go in and it is worth their sum.
  assert.deepEqual(
    [...bucket.collapsed].sort(),
    ['part-3', 'part-4', 'part-5', 'part-6', 'part-7', 'part-8', 'part-9']
  );
  assert.equal(bucket.value, 12 + 9 + 8 + 7 + 6 + 5 + 4);
});

test('collapse folds by share as well as by count', () => {
  const folded = sankeyLayout(TAIL_NODES, TAIL_LINKS, {
    ...BOX,
    collapse: { minShare: 0.05 },
  });
  const bucket = folded.nodes.find((node) => node.collapsed);
  assert.ok(bucket);
  // The column totals 226; 5% of it is 11.3, so 12 survives and 9 and below go.
  assert.deepEqual(
    [...bucket.collapsed].sort(),
    ['part-4', 'part-5', 'part-6', 'part-7', 'part-8', 'part-9']
  );
});

test('a column with nothing worth folding is left alone', () => {
  const plain = sankeyLayout(NODES, LINKS, BOX);
  const folded = sankeyLayout(NODES, LINKS, { ...BOX, collapse: { maxPerColumn: 8 } });
  assert.deepEqual(folded.nodes, plain.nodes);
  assert.ok(!folded.nodes.some((node) => node.collapsed));
});

test('one node is a rename, not a bucket', () => {
  // maxPerColumn 3 over a column of 3 leaves nothing to do; 2 of 3 would fold
  // a single node, which is a node called "Other" and no clearer than before.
  const three = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];
  const links = [
    { source: 'a', target: 'b', value: 10 },
    { source: 'a', target: 'c', value: 5 },
    { source: 'a', target: 'd', value: 1 },
  ];
  const folded = sankeyLayout(three, links, { ...BOX, collapse: { maxPerColumn: 3 } });
  assert.ok(!folded.nodes.some((node) => node.collapsed));
});

test('collapse still reports the rows the caller got wrong', () => {
  const messy = [
    ...TAIL_LINKS,
    { source: 'total', target: 'nowhere', value: 5 },
    { source: 'total', target: 'part-0', value: 0 },
  ];
  const folded = sankeyLayout(TAIL_NODES, messy, {
    ...BOX,
    collapse: { maxPerColumn: 4 },
  });
  assert.equal(folded.dropped, 2);
});

test('a kept node still points back at the caller', () => {
  const folded = sankeyLayout(TAIL_NODES, TAIL_LINKS, {
    ...BOX,
    collapse: { maxPerColumn: 4 },
  });
  for (const node of folded.nodes) {
    if (node.collapsed) continue;
    assert.equal(TAIL_NODES[node.index].id, node.id);
  }
});
