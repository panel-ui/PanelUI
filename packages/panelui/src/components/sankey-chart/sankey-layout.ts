/**
 * Where a flow diagram's nodes and ribbons go.
 *
 * Kept apart from the component for the same reason the splitter's maths is:
 * it is the part with answers that can be checked, and a test that has to
 * mount a chart to check them is a test nobody writes twice.
 *
 * ## The problem the layout is solving
 *
 * A node's column is decided by the flow, not by the caller — a stage that
 * receives from another has to be drawn after it or the ribbon runs backwards.
 * Its height is its value. Neither of those is a choice. What is left over is
 * the *order within a column*, and that is the whole difficulty: the same graph
 * drawn in two orders is the same numbers with a different number of crossings,
 * and crossings are the only thing that makes one of these unreadable.
 *
 * There is no cheap exact answer — minimising crossings is the kind of problem
 * that is only solved by trying — so the order is settled by relaxation. Every
 * node is pulled towards the average height of what it connects to, the pull
 * weakens each round, and nodes that end up overlapping are pushed apart. Six
 * rounds is where the picture stops visibly improving.
 *
 * ## Why it never throws
 *
 * A flow that loops back on itself has no left-to-right reading at all, and the
 * textbook answer is to refuse the graph. A chart cannot refuse: the data is
 * usually arriving from somewhere nobody in the room controls, and a screen
 * that crashes on a bad row is worse than one that draws the rows it can. So a
 * link that closes a loop is dropped, counted, and reported on the layout —
 * the caller can say so, and the rest of the diagram is still true.
 */

/** Which column a node is pushed into when the flow leaves a choice. */
export type SankeyAlign = 'justify' | 'left' | 'right' | 'center';

export interface SankeyLayoutNodeInput {
  /** Stable key the links name. */
  id: string;
  /**
   * Pins the node's total, for a stage whose links do not account for all of
   * it — a step that also loses some of what it received to nowhere.
   */
  value?: number;
}

export interface SankeyLayoutLinkInput {
  source: string;
  target: string;
  value: number;
}

/** Which nodes get folded into one, and what the result is called. */
export interface SankeyCollapse {
  /**
   * Keep at most this many nodes in a column, bucket included. A column with
   * more folds its smallest until it fits.
   */
  maxPerColumn?: number;
  /**
   * Fold any node worth less than this share of its own column, `0` to `1`.
   */
  minShare?: number;
  /** What the bucket is called. Defaults to `Other`. */
  label?: string;
}

export interface SankeyLayoutOptions {
  width: number;
  height: number;
  /** How thick a node's bar is drawn, in points. */
  nodeWidth: number;
  /** The gap asked for between two nodes in a column, in points. */
  nodePadding: number;
  align: SankeyAlign;
  /** Relaxation rounds. More is steadier and slower; six is the useful knee. */
  iterations: number;
  /**
   * Folds a column's smallest nodes into one bucket before laying it out.
   *
   * A ribbon carries its value in its thickness, so a column of thirty is
   * thirty hairlines — present in the data and unreadable on the screen. This
   * is the only option here that reduces what is drawn rather than rearranging
   * it.
   */
  collapse?: SankeyCollapse;
}

export interface SankeyLayoutNode {
  id: string;
  /**
   * Position in the input array, so a caller can find its own datum again.
   * `-1` on a node the layout made up rather than was given — see `collapsed`.
   */
  index: number;
  /**
   * The ids folded into this node, on the bucket `collapse` produced. Absent
   * on every node that came from the caller's array, which is how the two are
   * told apart without comparing ids against the input.
   */
  collapsed?: string[];
  /** Which column it landed in, counting from the left. */
  layer: number;
  /** What flows through it: the larger of what arrives and what leaves. */
  value: number;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

export interface SankeyLayoutLink {
  index: number;
  /**
   * Position in the caller's link array. Not the same as `index`: links that
   * name nothing or close a loop are dropped, so the drawn order closes up
   * behind them while this still points at the row it came from.
   */
  input: number;
  /** Index into the laid-out nodes, not into the caller's array. */
  source: number;
  target: number;
  value: number;
  /** How thick the ribbon is, in points. */
  width: number;
  /**
   * The ribbon's centre where it leaves the source, across the flow — points
   * from the top of an upright layout, and from the left of a transposed one.
   */
  y0: number;
  /** And where it meets the target. */
  y1: number;
}

export interface SankeyLayout {
  nodes: SankeyLayoutNode[];
  links: SankeyLayoutLink[];
  /** How many columns the flow turned out to need. */
  columns: number;
  /** Links dropped for closing a loop, naming nothing, or carrying nothing. */
  dropped: number;
}

interface Node {
  id: string;
  index: number;
  /**
   * Position in the laid-out array, which is not `index` — a repeated id is
   * skipped, so the two drift apart the moment the data has one.
   */
  slot: number;
  fixedValue: number | undefined;
  value: number;
  /** Longest run of links from a node nothing feeds. */
  depth: number;
  /** Longest run of links to a node that feeds nothing. */
  toSink: number;
  layer: number;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  sourceLinks: Link[];
  targetLinks: Link[];
}

interface Link {
  index: number;
  input: number;
  source: Node;
  target: Node;
  value: number;
  width: number;
  y0: number;
  y1: number;
}

const EMPTY: SankeyLayout = { nodes: [], links: [], columns: 0, dropped: 0 };

/** The most of the height the gaps in one column may take between them. */
const MAX_PADDING_SHARE = 0.5;

function ascendingBreadth(a: Node, b: Node): number {
  return a.y0 - b.y0;
}

function ascendingSourceBreadth(a: Link, b: Link): number {
  return ascendingBreadth(a.source, b.source) || a.index - b.index;
}

function ascendingTargetBreadth(a: Link, b: Link): number {
  return ascendingBreadth(a.target, b.target) || a.index - b.index;
}

function sumValues(links: Link[]): number {
  let total = 0;
  for (const link of links) total += link.value;
  return total;
}

/**
 * The links worth drawing, with the ones that close a loop taken out.
 *
 * Depth-first, colouring a node grey while it is on the stack: a link to a grey
 * node is a link back into the run currently being walked, which is the
 * definition of a loop. Dropping that one link is the smallest cut that breaks
 * it, and it keeps every other link in the cycle — so a diagram of mostly-good
 * data loses one ribbon rather than a whole branch.
 *
 * Iterative rather than recursive: a deep chain of stages is ordinary data, and
 * a blown call stack is not an acceptable failure for one.
 */
function withoutCycles(nodes: Node[], links: Link[]): { kept: Link[]; dropped: number } {
  const WHITE = 0;
  const GREY = 1;
  const BLACK = 2;
  const state = new Uint8Array(nodes.length);
  const back = new Set<number>();

  for (const root of nodes) {
    if (state[root.slot] !== WHITE) continue;
    // Each frame is a node and how far through its outgoing links we are.
    const stack: { node: Node; cursor: number }[] = [{ node: root, cursor: 0 }];
    state[root.slot] = GREY;

    while (stack.length) {
      const frame = stack[stack.length - 1]!;
      const outgoing = frame.node.sourceLinks;

      if (frame.cursor >= outgoing.length) {
        state[frame.node.slot] = BLACK;
        stack.pop();
        continue;
      }

      const link = outgoing[frame.cursor]!;
      frame.cursor += 1;
      if (back.has(link.index)) continue;

      const next = link.target;
      if (state[next.slot] === GREY) {
        back.add(link.index);
      } else if (state[next.slot] === WHITE) {
        state[next.slot] = GREY;
        stack.push({ node: next, cursor: 0 });
      }
    }
  }

  if (!back.size) return { kept: links, dropped: 0 };
  return { kept: links.filter((link) => !back.has(link.index)), dropped: back.size };
}

/** How far a node is from the start of the flow, the long way round. */
function computeDepths(nodes: Node[]): void {
  let current = new Set(nodes);
  let next = new Set<Node>();
  let x = 0;

  while (current.size) {
    for (const node of current) {
      node.depth = x;
      for (const link of node.sourceLinks) next.add(link.target);
    }
    // The graph is acyclic by here, so this cannot run away — the guard is for
    // the case where it is not, which is a bug rather than bad data.
    if (++x > nodes.length) break;
    current = next;
    next = new Set();
  }
}

/** And how far it is from the end of it. */
function computeToSink(nodes: Node[]): void {
  let current = new Set(nodes);
  let next = new Set<Node>();
  let x = 0;

  while (current.size) {
    for (const node of current) {
      node.toSink = x;
      for (const link of node.targetLinks) next.add(link.source);
    }
    if (++x > nodes.length) break;
    current = next;
    next = new Set();
  }
}

/**
 * Which column a node belongs in.
 *
 * `left` reads the flow from where things start, `right` from where they end,
 * and the two disagree about everything in between. `justify` is the default
 * because it does the one thing a reader expects of the edges: every node that
 * feeds nothing is pushed to the last column, so the diagram ends in a straight
 * line of destinations rather than a ragged one.
 */
function layerOf(node: Node, columns: number, align: SankeyAlign): number {
  switch (align) {
    case 'left':
      return node.depth;
    case 'right':
      return columns - 1 - node.toSink;
    case 'center': {
      if (node.targetLinks.length) return node.depth;
      if (!node.sourceLinks.length) return 0;
      let least = Infinity;
      for (const link of node.sourceLinks) least = Math.min(least, link.target.depth);
      return least - 1;
    }
    default:
      return node.sourceLinks.length ? node.depth : columns - 1;
  }
}

/**
 * The height a target would sit at for its ribbon from `source` to run flat.
 *
 * Every link leaving a node is stacked against its neighbours, so "flat" is not
 * the node's own height — it is that height plus whatever is stacked above this
 * particular ribbon at one end, minus what is stacked above it at the other.
 */
function targetTop(source: Node, target: Node, padding: number): number {
  let y = source.y0 - ((source.sourceLinks.length - 1) * padding) / 2;
  for (const link of source.sourceLinks) {
    if (link.target === target) break;
    y += link.width + padding;
  }
  for (const link of target.targetLinks) {
    if (link.source === source) break;
    y -= link.width;
  }
  return y;
}

/** The same reading, taken from the target's end. */
function sourceTop(source: Node, target: Node, padding: number): number {
  let y = target.y0 - ((target.targetLinks.length - 1) * padding) / 2;
  for (const link of target.targetLinks) {
    if (link.source === source) break;
    y += link.width + padding;
  }
  for (const link of source.sourceLinks) {
    if (link.target === target) break;
    y -= link.width;
  }
  return y;
}

function reorderNodeLinks(node: Node): void {
  for (const link of node.targetLinks) {
    link.source.sourceLinks.sort(ascendingTargetBreadth);
  }
  for (const link of node.sourceLinks) {
    link.target.targetLinks.sort(ascendingSourceBreadth);
  }
}

/** Push nodes down until none of them overlaps the one above it. */
function resolveDown(column: Node[], y: number, from: number, alpha: number, padding: number): void {
  let edge = y;
  for (let i = from; i < column.length; i += 1) {
    const node = column[i]!;
    const shift = (edge - node.y0) * alpha;
    if (shift > 1e-6) {
      node.y0 += shift;
      node.y1 += shift;
    }
    edge = node.y1 + padding;
  }
}

/** And up, for the ones that have run off the bottom. */
function resolveUp(column: Node[], y: number, from: number, alpha: number, padding: number): void {
  let edge = y;
  for (let i = from; i >= 0; i -= 1) {
    const node = column[i]!;
    const shift = (node.y1 - edge) * alpha;
    if (shift > 1e-6) {
      node.y0 -= shift;
      node.y1 -= shift;
    }
    edge = node.y0 - padding;
  }
}

/**
 * Four passes, pivoting on the middle node of the column.
 *
 * Starting from the middle rather than the top is what keeps a column centred:
 * resolving downwards from the top pushes the whole column towards the bottom
 * every round, and after six rounds everything is piled against the floor. The
 * last two passes are the ones that catch a column that has been pushed past
 * an edge, and they run outside-in for the same reason.
 */
function resolveCollisions(column: Node[], alpha: number, padding: number, height: number): void {
  const middle = column.length >> 1;
  const pivot = column[middle];
  if (!pivot) return;
  resolveUp(column, pivot.y0 - padding, middle - 1, alpha, padding);
  resolveDown(column, pivot.y1 + padding, middle + 1, alpha, padding);
  resolveUp(column, height, column.length - 1, alpha, padding);
  resolveDown(column, 0, 0, alpha, padding);
}

/**
 * Lays out a flow diagram.
 *
 * Returns positions in points inside a `width` by `height` box. An input that
 * cannot be drawn — no nodes, no room, nothing carrying a value — comes back
 * empty rather than as a diagram of zeroes.
 */
/**
 * A bucket's id, chosen so it cannot be one the caller already used.
 *
 * Suffixed rather than prefixed with something unlikely: the id is what the
 * chart falls back to for the name, so a readable one means a bucket reads as
 * "Other" without anybody registering a label for it.
 */
function bucketId(label: string, taken: Set<string>, layer: number): string {
  if (!taken.has(label)) return label;
  let candidate = `${label} (${layer + 1})`;
  let n = 2;
  while (taken.has(candidate)) {
    candidate = `${label} (${layer + 1}.${n})`;
    n += 1;
  }
  return candidate;
}

interface CollapsePlan {
  nodes: SankeyLayoutNodeInput[];
  links: SankeyLayoutLinkInput[];
  /** Bucket id -> the caller ids folded into it. */
  buckets: Map<string, string[]>;
  /** New node id -> the caller's index, or `-1` for a bucket. */
  origin: Map<string, number>;
  /** New link position -> the caller's row, or `-1` where rows were merged. */
  linkOrigin: number[];
}

/**
 * Which nodes to fold, and the graph that results.
 *
 * Worked out from a finished layout rather than from the raw rows, because
 * "smallest in its column" needs the columns, and the columns come from the
 * links. So the flow is solved once to find out where everything landed, the
 * tail is folded, and it is solved again — twice through a few hundred
 * microseconds of arithmetic, against a diagram nobody can read.
 *
 * Returns `null` when there is nothing worth folding. One node in a bucket is
 * not a bucket, it is a rename, so a column only collapses where at least two
 * of its nodes go in.
 */
function planCollapse(
  layout: SankeyLayout,
  nodeInput: readonly SankeyLayoutNodeInput[],
  linkInput: readonly SankeyLayoutLinkInput[],
  collapse: SankeyCollapse
): CollapsePlan | null {
  const label = collapse.label ?? 'Other';
  const maxPerColumn =
    typeof collapse.maxPerColumn === 'number' && collapse.maxPerColumn >= 1
      ? Math.floor(collapse.maxPerColumn)
      : Infinity;
  const minShare =
    typeof collapse.minShare === 'number' && collapse.minShare > 0 ? collapse.minShare : 0;
  if (maxPerColumn === Infinity && minShare === 0) return null;

  const byLayer = new Map<number, SankeyLayoutNode[]>();
  for (const node of layout.nodes) {
    const column = byLayer.get(node.layer);
    if (column) column.push(node);
    else byLayer.set(node.layer, [node]);
  }

  /** Caller id -> the bucket it was folded into. */
  const folded = new Map<string, string>();
  const buckets = new Map<string, string[]>();
  const taken = new Set(layout.nodes.map((node) => node.id));

  for (const [layer, column] of byLayer) {
    if (column.length < 2) continue;
    let total = 0;
    for (const node of column) total += node.value;
    if (!(total > 0)) continue;

    // Largest first, so "the ones that go" is always a tail of the list and
    // the two rules can be applied to the same ordering.
    const ranked = [...column].sort((a, b) => b.value - a.value || a.id.localeCompare(b.id));
    const doomed = new Set<string>();
    if (minShare > 0) {
      for (const node of ranked) {
        if (node.value / total < minShare) doomed.add(node.id);
      }
    }
    if (ranked.length > maxPerColumn) {
      // The bucket takes one of the places, so only `maxPerColumn - 1` survive.
      for (const node of ranked.slice(Math.max(0, maxPerColumn - 1))) doomed.add(node.id);
    }
    if (doomed.size < 2) continue;

    const id = bucketId(label, taken, layer);
    taken.add(id);
    const members = ranked.filter((node) => doomed.has(node.id)).map((node) => node.id);
    buckets.set(id, members);
    for (const member of members) folded.set(member, id);
  }

  if (!buckets.size) return null;

  const origin = new Map<string, number>();
  const nodes: SankeyLayoutNodeInput[] = [];
  const emitted = new Set<string>();
  for (const [index, input] of nodeInput.entries()) {
    const bucket = folded.get(input.id);
    if (bucket === undefined) {
      if (emitted.has(input.id)) continue;
      emitted.add(input.id);
      nodes.push(input);
      origin.set(input.id, index);
      continue;
    }
    // The bucket takes the place of the first of its members, so a column's
    // order is still the order the caller wrote.
    if (emitted.has(bucket)) continue;
    emitted.add(bucket);
    // No pinned value: a bucket is worth what its links carry, and summing
    // pins would state a total none of the rows support.
    nodes.push({ id: bucket });
    origin.set(bucket, -1);
  }

  /*
   * The rows, with folded endpoints renamed to their bucket.
   *
   * Two rows that now name the same pair are added together — that is the
   * whole point of a bucket, and leaving them separate would stack a dozen
   * hairlines between the same two bars instead of one ribbon. A row whose
   * ends both landed in one bucket described a flow inside it and has nowhere
   * left to go, so it is taken out here rather than being failed by the second
   * pass and counted a second time.
   *
   * Rows that were already undrawable pass through untouched, so the second
   * pass fails them for the reason the first one did.
   */
  const rename = (id: string) => folded.get(id) ?? id;
  const links: SankeyLayoutLinkInput[] = [];
  const linkOrigin: number[] = [];
  const mergedAt = new Map<string, number>();
  for (const [index, row] of linkInput.entries()) {
    const source = rename(row.source);
    const target = rename(row.target);
    const usable =
      origin.has(source) &&
      origin.has(target) &&
      source !== target &&
      typeof row.value === 'number' &&
      Number.isFinite(row.value) &&
      row.value > 0;

    if (!usable) {
      if (folded.has(row.source) && folded.has(row.target) && source === target) continue;
      links.push(row);
      linkOrigin.push(index);
      continue;
    }

    const key = `${source}\u0000${target}`;
    const at = mergedAt.get(key);
    if (at === undefined) {
      mergedAt.set(key, links.length);
      links.push({ source, target, value: row.value });
      linkOrigin.push(index);
      continue;
    }
    links[at] = { source, target, value: links[at]!.value + row.value };
    // Merged: no single row of the caller's describes it any more.
    linkOrigin[at] = -1;
  }

  return { nodes, links, buckets, origin, linkOrigin };
}

/**
 * The same arrangement, read down the screen instead of across it.
 *
 * A flow diagram has one axis carrying the order of the stages and another
 * carrying the values, and which of them is horizontal is a question about the
 * screen rather than about the data. So the layout is solved once, upright,
 * and turned afterwards — the alternative is a second copy of the relaxation
 * with every comparison reversed, which is the same maths maintained twice.
 *
 * Reflecting about the diagonal, so it is its own inverse: transposing twice
 * returns the layout unchanged. Call `sankeyLayout` with `width` and `height`
 * swapped and then pass the result through here, or the diagram comes back
 * fitted to the wrong box.
 */
export function transposeLayout(layout: SankeyLayout): SankeyLayout {
  return {
    ...layout,
    nodes: layout.nodes.map((node) => ({
      ...node,
      x0: node.y0,
      x1: node.y1,
      y0: node.x0,
      y1: node.x1,
    })),
    // A link's `y0`/`y1` are already across the flow rather than along it, so
    // the axis they name changes while the numbers do not.
    links: layout.links.map((link) => ({ ...link })),
  };
}

export function sankeyLayout(
  nodeInput: readonly SankeyLayoutNodeInput[],
  linkInput: readonly SankeyLayoutLinkInput[],
  options: SankeyLayoutOptions
): SankeyLayout {
  const { width, height, align, iterations } = options;
  const nodeWidth = Math.max(0, options.nodeWidth);
  const requestedPadding = Math.max(0, options.nodePadding);

  if (!nodeInput.length || !(width > 0) || !(height > 0)) return EMPTY;

  /*
   * Folding the tail needs the columns, and the columns come out of the links,
   * so the only way to know what to fold is to lay it out once and look. The
   * second pass runs with `collapse` cleared, which is what stops this
   * recurring.
   */
  if (options.collapse) {
    const bare = { ...options, collapse: undefined };
    const first = sankeyLayout(nodeInput, linkInput, bare);
    const plan = planCollapse(first, nodeInput, linkInput, options.collapse);
    if (plan) {
      const second = sankeyLayout(plan.nodes, plan.links, bare);
      return {
        ...second,
        nodes: second.nodes.map((node) => {
          const members = plan.buckets.get(node.id);
          return {
            ...node,
            index: plan.origin.get(node.id) ?? -1,
            ...(members ? { collapsed: members } : {}),
          };
        }),
        links: second.links.map((link) => ({
          ...link,
          input: plan.linkOrigin[link.input] ?? -1,
        })),
        /*
         * Counted from the pass that saw the caller's own rows. The second
         * pass reads a graph this function invented, and how many of those
         * failed is not something anybody asked about.
         */
        dropped: first.dropped,
      };
    }
  }

  const nodes: Node[] = [];
  const byId = new Map<string, Node>();
  for (const [index, input] of nodeInput.entries()) {
    // A repeated id would give the links two nodes to mean; the first wins, so
    // the diagram is the one the earlier row described rather than a mix.
    if (byId.has(input.id)) continue;
    const node: Node = {
      id: input.id,
      index,
      slot: nodes.length,
      fixedValue:
        typeof input.value === 'number' && Number.isFinite(input.value) && input.value >= 0
          ? input.value
          : undefined,
      value: 0,
      depth: 0,
      toSink: 0,
      layer: 0,
      x0: 0,
      x1: 0,
      y0: 0,
      y1: 0,
      sourceLinks: [],
      targetLinks: [],
    };
    nodes.push(node);
    byId.set(input.id, node);
  }

  let dropped = 0;
  const links: Link[] = [];
  for (const [inputIndex, input] of linkInput.entries()) {
    const source = byId.get(input.source);
    const target = byId.get(input.target);
    const value = input.value;
    // A link to nowhere, a link to itself, and a link carrying nothing are all
    // undrawable for different reasons and all silently skipped.
    if (!source || !target || source === target) {
      dropped += 1;
      continue;
    }
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
      dropped += 1;
      continue;
    }
    links.push({
      index: links.length,
      input: inputIndex,
      source,
      target,
      value,
      width: 0,
      y0: 0,
      y1: 0,
    });
  }

  for (const link of links) {
    link.source.sourceLinks.push(link);
    link.target.targetLinks.push(link);
  }

  const cut = withoutCycles(nodes, links);
  if (cut.dropped) {
    dropped += cut.dropped;
    for (const node of nodes) {
      node.sourceLinks = [];
      node.targetLinks = [];
    }
    cut.kept.forEach((link, index) => {
      link.index = index;
      link.source.sourceLinks.push(link);
      link.target.targetLinks.push(link);
    });
  }
  const kept = cut.kept;

  for (const node of nodes) {
    node.value =
      node.fixedValue ??
      Math.max(sumValues(node.sourceLinks), sumValues(node.targetLinks));
  }

  computeDepths(nodes);
  computeToSink(nodes);

  let columnCount = 0;
  for (const node of nodes) columnCount = Math.max(columnCount, node.depth);
  columnCount += 1;

  const columns: Node[][] = Array.from({ length: columnCount }, () => []);
  // One column has nowhere to spread to, so its node sits at the left edge
  // rather than dividing by a gap that does not exist.
  const kx = columnCount > 1 ? (width - nodeWidth) / (columnCount - 1) : 0;
  for (const node of nodes) {
    const layer = Math.max(0, Math.min(columnCount - 1, Math.floor(layerOf(node, columnCount, align))));
    node.layer = layer;
    node.x0 = layer * kx;
    node.x1 = node.x0 + nodeWidth;
    columns[layer]!.push(node);
  }

  let tallest = 0;
  for (const column of columns) tallest = Math.max(tallest, column.length);

  /*
   * The gap asked for is a maximum, not a promise. A column of twelve nodes at
   * a padding of twelve is 132 points of gap, which on a phone is most of the
   * chart — so a crowded column gives up its spacing rather than its bars,
   * because a bar is the reading and the gap is only the separation.
   *
   * Hence the share as well as the count. Dividing the whole height by the gaps
   * is the obvious cap and it is the wrong one: at twelve nodes in 120 points it
   * hands every point to the gaps and leaves the bars exactly nothing, so the
   * chart goes blank at precisely the crowding this is meant to survive. Half
   * the height is the most the gaps may ever take between them.
   */
  const padding =
    tallest > 1
      ? Math.min(requestedPadding, (height * MAX_PADDING_SHARE) / (tallest - 1))
      : requestedPadding;

  /*
   * One scale for every column, taken from whichever column it fits worst.
   * A scale per column would draw two nodes of the same value at two different
   * heights, which is the one thing this chart cannot do and still be read.
   */
  let ky = Infinity;
  for (const column of columns) {
    if (!column.length) continue;
    let total = 0;
    for (const node of column) total += node.value;
    if (total <= 0) continue;
    ky = Math.min(ky, (height - (column.length - 1) * padding) / total);
  }
  if (!Number.isFinite(ky) || ky <= 0) return { ...EMPTY, columns: columnCount, dropped };

  for (const column of columns) {
    let y = 0;
    for (const node of column) {
      node.y0 = y;
      node.y1 = y + node.value * ky;
      y = node.y1 + padding;
      for (const link of node.sourceLinks) link.width = link.value * ky;
    }
    // Whatever the column did not use is shared out as extra space between its
    // nodes, which centres a short column instead of hanging it from the top.
    const slack = (height - y + padding) / (column.length + 1);
    column.forEach((node, i) => {
      node.y0 += slack * (i + 1);
      node.y1 += slack * (i + 1);
    });
    for (const node of column) {
      node.sourceLinks.sort(ascendingTargetBreadth);
      node.targetLinks.sort(ascendingSourceBreadth);
    }
  }

  const rounds = Math.max(0, Math.floor(iterations));
  for (let i = 0; i < rounds; i += 1) {
    /*
     * The pull weakens and the shove strengthens as the rounds go by. Early on
     * the nodes are still finding their neighbourhood and a firm pull is what
     * gets them there; by the end the arrangement is settled and the only thing
     * left worth doing is making sure nothing overlaps.
     */
    const alpha = 0.99 ** i;
    const beta = Math.max(1 - alpha, (i + 1) / rounds);

    for (let c = columnCount - 2; c >= 0; c -= 1) {
      const column = columns[c]!;
      for (const node of column) {
        let weighted = 0;
        let weight = 0;
        for (const link of node.sourceLinks) {
          // A ribbon that spans three columns is three times as expensive to
          // bend as one that spans a single column, so it pulls three times
          // as hard on where its ends sit.
          const span = link.value * (link.target.layer - node.layer);
          weighted += sourceTop(node, link.target, padding) * span;
          weight += span;
        }
        if (!(weight > 0)) continue;
        const shift = (weighted / weight - node.y0) * alpha;
        node.y0 += shift;
        node.y1 += shift;
        reorderNodeLinks(node);
      }
      column.sort(ascendingBreadth);
      resolveCollisions(column, beta, padding, height);
    }

    for (let c = 1; c < columnCount; c += 1) {
      const column = columns[c]!;
      for (const node of column) {
        let weighted = 0;
        let weight = 0;
        for (const link of node.targetLinks) {
          const span = link.value * (node.layer - link.source.layer);
          weighted += targetTop(link.source, node, padding) * span;
          weight += span;
        }
        if (!(weight > 0)) continue;
        const shift = (weighted / weight - node.y0) * alpha;
        node.y0 += shift;
        node.y1 += shift;
        reorderNodeLinks(node);
      }
      column.sort(ascendingBreadth);
      resolveCollisions(column, beta, padding, height);
    }
  }

  /*
   * The ribbons are stacked against each node's edge in the order they were
   * sorted into, and each one is recorded by its centre — which is where a
   * stroked or filled ribbon of that thickness wants to be anchored.
   */
  for (const node of nodes) {
    let out = node.y0;
    for (const link of node.sourceLinks) {
      link.y0 = out + link.width / 2;
      out += link.width;
    }
    let into = node.y0;
    for (const link of node.targetLinks) {
      link.y1 = into + link.width / 2;
      into += link.width;
    }
  }

  const order = new Map(nodes.map((node, i) => [node, i]));

  return {
    columns: columnCount,
    dropped,
    nodes: nodes.map((node) => ({
      id: node.id,
      index: node.index,
      layer: node.layer,
      value: node.value,
      x0: node.x0,
      x1: node.x1,
      y0: node.y0,
      y1: node.y1,
    })),
    links: kept.map((link, index) => ({
      index,
      input: link.input,
      source: order.get(link.source)!,
      target: order.get(link.target)!,
      value: link.value,
      width: link.width,
      y0: link.y0,
      y1: link.y1,
    })),
  };
}
