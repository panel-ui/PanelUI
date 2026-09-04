import { Fragment, useState, type ReactNode } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScrollView, View } from "react-native";
import { Avatar, Badge, BellIcon, Button, ButtonGroup, Card, CardIcon, Checkbox, ChevronRightIcon, Chip, Direction, DownloadIcon, Drawer, EmptyState, Fab, Field, Flow, type FlowConnection, Form, Frame, HeatmapChart, type HeatmapCell, type HeatmapColumn, buildHeatmapCalendar, Input, ImageIcon, Item, Label, MicIcon, PackageIcon, PaperclipIcon, PencilIcon, PlusIcon, Rating, SearchIcon, SendIcon, ShareNodesIcon, ShieldCheckIcon, Separator, Slider, StarIcon, Surface, Switch, Text, ToggleButton, ToggleButtonGroup, Tooltip, TrashIcon, useForm, useToast } from "panelui-native";
import { useCSSVariable } from "uniwind";
import type { ComponentEntry } from '../component-types';

/* Flow */

/** The node shape the canvas is built around: a Frame with a status row. */
function ServiceNode({
  title,
  subtitle,
  icon,
  status,
  volume,
}: {
  title: string;
  subtitle?: string;
  icon: ReactNode;
  status: string;
  volume?: string;
}) {
  return (
    <Frame className="w-56">
      <Frame.Header className="flex-row items-center gap-3 pb-2 pt-3">
        <Frame.Media>{icon}</Frame.Media>
        <Frame.Content>
          <Text weight="semibold" numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text size="xs" muted numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </Frame.Content>
      </Frame.Header>
      <Frame.Panel>
        <Frame.Row>
          <Frame.Media>
            <View className="h-4 w-4 items-center justify-center rounded-full border border-success">
              <View className="h-1.5 w-1.5 rounded-full bg-success" />
            </View>
          </Frame.Media>
          <Frame.Content>
            <Text size="sm" muted>
              {status}
            </Text>
          </Frame.Content>
        </Frame.Row>
        {volume ? (
          <Frame.Row>
            <Frame.Media>
              <PackageIcon size={16} />
            </Frame.Media>
            <Frame.Content>
              <Text size="sm" muted numberOfLines={1}>
                {volume}
              </Text>
            </Frame.Content>
          </Frame.Row>
        ) : null}
      </Frame.Panel>
    </Frame>
  );
}

/**
 * The canvas in a fixed box rather than a whole screen. It fills whatever it
 * is given, so a bounded parent is all it takes — the graph still pans and
 * zooms inside it.
 */
function FlowInlineDemo() {
  return (
    <View className="h-64 w-full overflow-hidden rounded-2xl border border-border">
      <Flow defaultViewport={{ x: 10, y: 16, zoom: 0.78 }}>
        <Flow.Background variant="dots" gap={20} />
        <Flow.Node id="queue" position={{ x: 10, y: 10 }}>
          <View className="rounded-xl border border-border bg-card px-3 py-2">
            <Text size="sm" weight="medium">
              queue
            </Text>
          </View>
        </Flow.Node>
        <Flow.Node id="worker" position={{ x: 190, y: 110 }}>
          <View className="rounded-xl border border-border bg-card px-3 py-2">
            <Text size="sm" weight="medium">
              worker
            </Text>
          </View>
        </Flow.Node>
        <Flow.Node id="store" position={{ x: 30, y: 210 }}>
          <View className="rounded-xl border border-border bg-card px-3 py-2">
            <Text size="sm" weight="medium">
              store
            </Text>
          </View>
        </Flow.Node>
        <Flow.Edge from="queue" to="worker" animated arrow />
        <Flow.Edge from="worker" to="store" dashed animated arrow />
      </Flow>
    </View>
  );
}

/** The four routings, on the same pair of nodes. */
function FlowEdgeShapesDemo() {
  const [variant, setVariant] = useState('bezier');

  return (
    <View className="w-full gap-3">
      <View className="h-56 overflow-hidden rounded-2xl border border-border">
        <Flow defaultViewport={{ x: 20, y: 20, zoom: 0.9 }} panOnDrag={false}>
          <Flow.Background variant="dots" gap={20} />
          <Flow.Node id="a" position={{ x: 10, y: 10 }}>
            <View className="rounded-xl border border-border bg-card px-3 py-2">
              <Text size="sm">source</Text>
            </View>
          </Flow.Node>
          <Flow.Node id="b" position={{ x: 190, y: 150 }}>
            <View className="rounded-xl border border-border bg-card px-3 py-2">
              <Text size="sm">target</Text>
            </View>
          </Flow.Node>
          <Flow.Edge
            from="a"
            to="b"
            variant={variant as 'bezier' | 'smoothstep' | 'step' | 'straight'}
            arrow
            animated
          />
        </Flow>
      </View>
      <ToggleButtonGroup
        selectionMode="single"
        value={[variant]}
        onValueChange={(next) => setVariant(next[0] ?? 'bezier')}
      >
        <ToggleButton id="bezier">Bezier</ToggleButton>
        <ToggleButton id="smoothstep">Smooth</ToggleButton>
        <ToggleButton id="step">Step</ToggleButton>
        <ToggleButton id="straight">Line</ToggleButton>
      </ToggleButtonGroup>
    </View>
  );
}

/**
 * Frames bound together — three service cards and the dependencies between
 * them. Drag any of them and the edges re-route as they move.
 */
function FlowInfrastructureVersion() {
  return (
    // `fitViewOnMount` rather than a hand-tuned viewport: three stacked
    // frames are taller than a phone, and a guessed zoom leaves one off screen.
    <Flow fitViewOnMount minZoom={0.35}>
      <Flow.Background variant="dots" gap={22} />

      <Flow.Node id="db" position={{ x: 10, y: 20 }}>
        <ServiceNode icon={<PackageIcon size={20} />} title="blog-db" status="Online" />
      </Flow.Node>

      <Flow.Node id="ghost" position={{ x: 96, y: 250 }}>
        <ServiceNode
          icon={<ShareNodesIcon size={20} />}
          title="ghost-image"
          subtitle="blog.temetro.com"
          status="Online"
          volume="ghost-content"
        />
      </Flow.Node>

      <Flow.Node id="redis" position={{ x: 0, y: 470 }}>
        <ServiceNode icon={<SendIcon size={20} />} title="redis" status="Online" />
      </Flow.Node>

      {/* Named nodes rather than handles, so the faces are chosen from where
          the frames currently are — drag one and the edge picks a different
          side to leave from. */}
      <Flow.Edge from="ghost" to="db" variant="smoothstep" dashed animated arrow />
      <Flow.Edge from="ghost" to="redis" variant="smoothstep" arrow />

      <Flow.Controls />
    </Flow>
  );
}

/** A pipeline running top to bottom, with the live stage's edges marching. */
function FlowPipelineVersion() {
  const [stage, setStage] = useState(1);

  const stages = [
    { id: 'source', title: 'Source', detail: 'main@6d63e13' },
    { id: 'build', title: 'Build', detail: 'bob · 76 files' },
    { id: 'test', title: 'Test', detail: '412 assertions' },
    { id: 'publish', title: 'Publish', detail: 'npm · panelui-native' },
  ];

  return (
    <View className="flex-1">
      <Flow defaultViewport={{ x: 60, y: 24, zoom: 0.9 }} fitViewOnMount>
        <Flow.Background variant="lines" gap={28} />

        {stages.map((entry, index) => (
          <Flow.Node key={entry.id} id={entry.id} position={{ x: 40, y: index * 150 }}>
            <Frame className="w-52">
              <Frame.Header>
                <Frame.Title>{`Stage ${index + 1}`}</Frame.Title>
                <Frame.Action>
                  <Chip
                    size="sm"
                    variant={
                      index < stage ? 'success' : index === stage ? 'info' : 'outline'
                    }
                  >
                    {index < stage ? 'Done' : index === stage ? 'Running' : 'Queued'}
                  </Chip>
                </Frame.Action>
              </Frame.Header>
              <Frame.Panel>
                <Frame.Row>
                  <Frame.Content>
                    <Frame.Title>{entry.title}</Frame.Title>
                    <Frame.Description>{entry.detail}</Frame.Description>
                  </Frame.Content>
                </Frame.Row>
              </Frame.Panel>
            </Frame>
          </Flow.Node>
        ))}

        {stages.slice(0, -1).map((entry, index) => (
          <Flow.Edge
            key={`edge-${entry.id}`}
            from={entry.id}
            to={stages[index + 1]!.id}
            variant="smoothstep"
            arrow
            // Only the edge into the stage that is running moves. An animation
            // on every edge says nothing about which one is live.
            animated={index === stage - 1}
            dashed={index === stage - 1}
          />
        ))}

        <Flow.Controls />
      </Flow>

      <View className="flex-row gap-2 border-t border-border px-5 py-4">
        <Button
          variant="outline"
          className="flex-1"
          disabled={stage === 0}
          onPress={() => setStage((current) => current - 1)}
        >
          Back a stage
        </Button>
        <Button
          className="flex-1"
          disabled={stage === stages.length}
          onPress={() => setStage((current) => current + 1)}
        >
          Advance
        </Button>
      </View>
    </View>
  );
}

/** Drag from one port to another to wire the graph up. */
function FlowConnectVersion() {
  const [edges, setEdges] = useState<FlowConnection[]>([]);

  const nodes = [
    { id: 'webhook', title: 'Webhook', detail: 'POST /orders', x: 20, y: 40 },
    { id: 'enrich', title: 'Enrich', detail: 'Look up the customer', x: 40, y: 220 },
    { id: 'notify', title: 'Notify', detail: 'Send to Slack', x: 60, y: 400 },
  ];

  return (
    <View className="flex-1">
      <Flow
        defaultViewport={{ x: 24, y: 20, zoom: 0.95 }}
        onConnect={(connection) => {
          setEdges((current) =>
            // The canvas never adds the edge itself, so refusing a duplicate is
            // this screen's decision to make.
            current.some(
              (edge) => edge.source === connection.source && edge.target === connection.target
            )
              ? current
              : [...current, connection]
          );
        }}
        isValidConnection={(connection) => connection.source !== connection.target}
      >
        <Flow.Background variant="dots" />

        {nodes.map((node) => (
          <Flow.Node key={node.id} id={node.id} position={{ x: node.x, y: node.y }}>
            <Frame className="w-48">
              <Frame.Header>
                <Frame.Title>{node.title}</Frame.Title>
              </Frame.Header>
              <Frame.Panel>
                <Frame.Row>
                  <Frame.Content>
                    <Frame.Description>{node.detail}</Frame.Description>
                  </Frame.Content>
                </Frame.Row>
              </Frame.Panel>
            </Frame>
            <Flow.Handle id="in" position="top" type="target" />
            <Flow.Handle id="out" position="bottom" type="source" />
          </Flow.Node>
        ))}

        {edges.map((edge) => (
          <Flow.Edge
            key={`${edge.source}-${edge.target}`}
            from={edge.source}
            to={edge.target}
            variant="smoothstep"
            arrow
            animated
          />
        ))}

        <Flow.Controls />
      </Flow>

      <View className="border-t border-border px-5 py-4">
        <Text size="sm" muted>
          {edges.length === 0
            ? 'Drag from a node’s bottom port to another node’s top port.'
            : `${edges.length} connection${edges.length === 1 ? '' : 's'} — drag a node and the edges follow.`}
        </Text>
      </View>
    </View>
  );
}

/** Curved edges radiating from a centre, and a tap that reframes the graph. */
function FlowMindMapVersion() {
  const branches = [
    { id: 'tokens', label: 'Tokens', x: -180, y: -140 },
    { id: 'motion', label: 'Motion', x: 200, y: -160 },
    { id: 'a11y', label: 'Accessibility', x: -200, y: 140 },
    { id: 'docs', label: 'Documentation', x: 210, y: 150 },
  ];

  return (
    <Flow defaultViewport={{ x: 180, y: 300, zoom: 0.9 }} minZoom={0.4} maxZoom={2}>
      <Flow.Background variant="cross" gap={32} />

      <Flow.Node id="core" position={{ x: -60, y: -20 }}>
        <View className="rounded-2xl border border-border bg-card px-5 py-4">
          <Text weight="semibold">Design system</Text>
        </View>
      </Flow.Node>

      {branches.map((branch) => (
        <Flow.Node key={branch.id} id={branch.id} position={{ x: branch.x, y: branch.y }}>
          <View className="rounded-2xl border border-border bg-surface px-4 py-3">
            <Text size="sm">{branch.label}</Text>
          </View>
        </Flow.Node>
      ))}

      {branches.map((branch) => (
        <Flow.Edge key={`edge-${branch.id}`} from="core" to={branch.id} variant="bezier" />
      ))}

      <Flow.Controls zoom={false} />
    </Flow>
  );
}

/** A small service node, sized to sit inside a group without crowding it. */
function GroupedNode({ icon, title, detail }: { icon: ReactNode; title: string; detail: string }) {
  return (
    <View className="w-40 flex-row items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5">
      <View className="shrink-0">{icon}</View>
      <View className="min-w-0 flex-1">
        <Text size="sm" weight="medium" numberOfLines={1}>
          {title}
        </Text>
        <Text size="xs" muted numberOfLines={1}>
          {detail}
        </Text>
      </View>
    </View>
  );
}

/**
 * Nodes added at runtime — one button that drops a frame in, another that
 * drops one in already wired to the last.
 *
 * The canvas holds no list of its own: the screen owns the frames and the
 * links, and adding either is adding to an array.
 */
function FlowBuilderVersion() {
  const [nodes, setNodes] = useState([{ id: 'n1', x: 40, y: 40 }]);
  const [links, setLinks] = useState<{ from: string; to: string }[]>([]);

  const add = (linked: boolean) => {
    const previous = nodes[nodes.length - 1];
    const index = nodes.length;
    const id = `n${index + 1}`;
    // Wrapped into short columns rather than one long march downward. Each
    // frame offset from the last walks the graph off the canvas after a dozen
    // presses, and never shows you the first frames alongside the newest.
    const next = {
      id,
      x: 40 + Math.floor(index / 4) * 230,
      y: 40 + (index % 4) * 150,
    };
    setNodes((current) => [...current, next]);
    if (linked && previous) {
      setLinks((current) => [...current, { from: previous.id, to: id }]);
    }
  };

  return (
    <View className="flex-1">
      <Flow minZoom={0.35}>
        <Flow.Background variant="dots" />

        {nodes.map((node) => (
          <Flow.Node key={node.id} id={node.id} position={{ x: node.x, y: node.y }}>
            <Frame className="w-44">
              <Frame.Header>
                <Frame.Title>{node.id}</Frame.Title>
                <Frame.Action>
                  <Badge variant="secondary">node</Badge>
                </Frame.Action>
              </Frame.Header>
              <Frame.Panel>
                <Frame.Row>
                  <Frame.Content>
                    <Frame.Description>Drag me anywhere</Frame.Description>
                  </Frame.Content>
                </Frame.Row>
              </Frame.Panel>
            </Frame>
          </Flow.Node>
        ))}

        {links.map((link) => (
          <Flow.Edge
            key={`${link.from}-${link.to}`}
            from={link.from}
            to={link.to}
            variant="smoothstep"
            arrow
          />
        ))}

        <Flow.Controls />
      </Flow>

      <View className="gap-2 border-t border-border px-5 py-4">
        <View className="flex-row gap-2">
          <Button variant="outline" className="flex-1" onPress={() => add(false)}>
            Add a frame
          </Button>
          <Button className="flex-1" onPress={() => add(true)}>
            Add and link
          </Button>
        </View>
        <Text size="xs" muted>
          {nodes.length} frame{nodes.length === 1 ? '' : 's'}, {links.length} link
          {links.length === 1 ? '' : 's'} — drag any of them and the edges re-route.
        </Text>
      </View>
    </View>
  );
}

/**
 * Edges pinned to named ports rather than routed automatically.
 *
 * Both are worth having: automatic routing keeps a graph readable while it is
 * being rearranged, but a diagram where the sides *mean* something — accepted
 * out of one port, rejected out of another — has to be able to say so.
 */
function FlowPortsVersion() {
  return (
    <Flow fitViewOnMount minZoom={0.35}>
      <Flow.Background variant="cross" gap={26} />

      <Flow.Node id="ingest" position={{ x: 0, y: 0 }}>
        <Frame className="w-44">
          <Frame.Header>
            <Frame.Title>ingest</Frame.Title>
          </Frame.Header>
          <Frame.Panel>
            <Frame.Row>
              <Frame.Content>
                <Frame.Description>Two named outputs</Frame.Description>
              </Frame.Content>
            </Frame.Row>
          </Frame.Panel>
        </Frame>
        {/* Two ports on one face, kept apart by their offsets. */}
        <Flow.Handle id="ok" position="right" type="source" offset={0.34} />
        <Flow.Handle id="fail" position="right" type="source" offset={0.78} />
      </Flow.Node>

      <Flow.Node id="index" position={{ x: 250, y: -70 }}>
        <Frame className="w-40">
          <Frame.Header>
            <Frame.Title>index</Frame.Title>
          </Frame.Header>
          <Frame.Panel>
            <Frame.Row>
              <Frame.Content>
                <Frame.Description>Accepted</Frame.Description>
              </Frame.Content>
            </Frame.Row>
          </Frame.Panel>
        </Frame>
        <Flow.Handle id="in" position="left" type="target" />
        <Flow.Handle id="out" position="right" type="source" />
      </Flow.Node>

      <Flow.Node id="deadletter" position={{ x: 250, y: 150 }}>
        <Frame className="w-40">
          <Frame.Header>
            <Frame.Title>dead-letter</Frame.Title>
          </Frame.Header>
          <Frame.Panel>
            <Frame.Row>
              <Frame.Content>
                <Frame.Description>Rejected</Frame.Description>
              </Frame.Content>
            </Frame.Row>
          </Frame.Panel>
        </Frame>
        <Flow.Handle id="in" position="left" type="target" />
        <Flow.Handle id="out" position="right" type="source" />
      </Flow.Node>

      {/* A frame with a port on every face. Four ports is where naming them
          starts to pay: `router.retry` says which one an edge means, and the
          two that nothing is wired to yet still read as somewhere to wire. */}
      <Flow.Node id="router" position={{ x: 520, y: 30 }}>
        <Frame className="w-44">
          <Frame.Header>
            <Frame.Title>router</Frame.Title>
            <Frame.Action>
              <Badge variant="secondary">4 ports</Badge>
            </Frame.Action>
          </Frame.Header>
          <Frame.Panel>
            <Frame.Row>
              <Frame.Content>
                <Frame.Title>in · retry</Frame.Title>
                <Frame.Description>Left face, two offsets</Frame.Description>
              </Frame.Content>
            </Frame.Row>
            <Frame.Row>
              <Frame.Content>
                <Frame.Title>metrics · logs</Frame.Title>
                <Frame.Description>Top and bottom, unwired</Frame.Description>
              </Frame.Content>
            </Frame.Row>
          </Frame.Panel>
        </Frame>
        <Flow.Handle id="in" position="left" type="target" offset={0.3} />
        <Flow.Handle id="retry" position="left" type="target" offset={0.78} />
        <Flow.Handle id="metrics" position="top" type="source" />
        <Flow.Handle id="logs" position="bottom" type="source" />
      </Flow.Node>

      {/* `nodeId.handleId` pins each end to a port, so the faces stay put
          however the frames are dragged. */}
      <Flow.Edge from="ingest.ok" to="index.in" variant="smoothstep" arrow />
      <Flow.Edge
        from="ingest.fail"
        to="deadletter.in"
        variant="smoothstep"
        dashed
        arrow
      />
      <Flow.Edge from="index.out" to="router.in" variant="smoothstep" arrow />
      <Flow.Edge
        from="deadletter.out"
        to="router.retry"
        variant="smoothstep"
        dashed
        arrow
      />

      <Flow.Controls />
    </Flow>
  );
}

/**
 * Two containers, the line between them, and a minimap.
 *
 * The containers are stacked rather than placed side by side: two 208-wide
 * boxes next to each other need 500 points of graph to breathe, and a phone
 * zoomed out far enough to show 500 points renders the labels too small to
 * read. Down the screen, each container gets the full width.
 *
 * The tiers are what is connected here, not the frames inside them. A
 * dependency between two tiers is a fact about the tiers — drawing it between
 * two of their contents says something narrower, and moves when the contents
 * are rearranged.
 */
function FlowGroupedVersion() {
  return (
    <Flow defaultViewport={{ x: 24, y: 24, zoom: 1 }} minZoom={0.4}>
      <Flow.Background variant="dots" gap={24} />

      <Flow.Group
        id="edge-tier"
        label="Edge"
        position={{ x: 0, y: 0 }}
        size={{ width: 196, height: 178 }}
      >
        {/* `pinned`: the tiers are what you rearrange, and what is in a tier is
            a fact about it rather than something to drag out of it. */}
        <Flow.Node id="cdn" pinned position={{ x: 14, y: 34 }}>
          <GroupedNode icon={<ShareNodesIcon size={16} />} title="cdn" detail="142 locations" />
        </Flow.Node>
        <Flow.Node id="waf" pinned position={{ x: 14, y: 110 }}>
          <GroupedNode icon={<ShieldCheckIcon size={16} />} title="waf" detail="Blocking 0.4%" />
        </Flow.Node>
      </Flow.Group>

      <Flow.Group
        id="core-tier"
        label="Core"
        position={{ x: 0, y: 248 }}
        size={{ width: 196, height: 178 }}
      >
        <Flow.Node id="api" pinned position={{ x: 14, y: 282 }}>
          <GroupedNode icon={<SendIcon size={16} />} title="api" detail="p95 84ms" />
        </Flow.Node>
        {/* `confine` instead: this one you can move, but not out of its tier. */}
        <Flow.Node id="pg" confine position={{ x: 14, y: 358 }}>
          <GroupedNode icon={<PackageIcon size={16} />} title="postgres" detail="2 replicas" />
        </Flow.Node>
      </Flow.Group>

      {/* Container to container. An edge names a group the same way it names a
          node, and stands off the border rather than landing under it. */}
      <Flow.Edge from="edge-tier" to="core-tier" variant="smoothstep" animated arrow />

      <Flow.MiniMap />
      <Flow.Controls />
    </Flow>
  );
}

/* -------------------------------------------------------------------------- */
/* HeatmapChart                                                               */
/* -------------------------------------------------------------------------- */

/**
 * A year of plausible daily counts, seeded so the pattern is the same on every
 * render — a heatmap redrawn from `Math.random()` on each pass has no shape to
 * look at, and the reveal animation replays against different data every time.
 */
function heatmapYear(days = 371, seed = 7) {
  let state = seed;
  const random = () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };

  const end = new Date(2026, 6, 23);
  const entries: { date: Date; count: number }[] = [];

  for (let offset = days - 1; offset >= 0; offset--) {
    const date = new Date(end);
    date.setDate(date.getDate() - offset);
    const weekend = date.getDay() === 0 || date.getDay() === 6;
    const roll = random();
    // Quiet weekends, the odd blank weekday, and a long tail — the shape real
    // activity has, rather than an even scatter.
    const count = weekend
      ? roll > 0.75
        ? Math.floor(roll * 6)
        : 0
      : roll > 0.12
        ? Math.floor(roll * 18)
        : 0;
    entries.push({ date, count });
  }

  return entries;
}

const HEATMAP_YEAR = buildHeatmapCalendar(heatmapYear(), { weekStartDay: 1 });

const HEATMAP_QUARTER = HEATMAP_YEAR.slice(-13);

const HEATMAP_TOTAL = HEATMAP_YEAR.reduce(
  (running, column) => running + column.bins.reduce((sum, cell) => sum + cell.count, 0),
  0
);

/** A full year, scrolled sideways — 53 weeks do not fit on a phone. */
function HeatmapContributionVersion() {
  const [active, setActive] = useState<HeatmapCell | null>(null);

  return (
    <View className="flex-1 justify-center p-4">
      <Frame className="w-full">
        <Frame.Header>
          <Frame.Title>Contributions</Frame.Title>
          <Frame.Action>Hold to read</Frame.Action>
        </Frame.Header>
        <Frame.Panel>
          {/* The header is outside the horizontal scroller on purpose: it and
              its ramp belong at the frame's width, not the grid's, or they
              scroll away with the cells. */}
          <HeatmapChart data={[]} className={CHART_HEADER}>
            <HeatmapChart.Header
              value={
                active
                  ? `${active.count}`
                  : HEATMAP_TOTAL.toLocaleString()
              }
              caption={
                active
                  ? (active.date?.toDateString() ?? '—')
                  : 'Contributions in the last year'
              }
              legend
            />
          </HeatmapChart>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="px-4 pb-4"
          >
            <HeatmapChart
              data={HEATMAP_YEAR}
              weekStartDay={1}
              binSize={13}
              onActiveCellChange={setActive}
            >
              <HeatmapChart.XAxis />
              <HeatmapChart.YAxis />
              <HeatmapChart.Cells />
              <HeatmapChart.Tooltip />
            </HeatmapChart>
          </ScrollView>
        </Frame.Panel>
      </Frame>
    </View>
  );
}

/** A quarter, with the cells sized to the width they are given. */
function HeatmapFillVersion() {
  return (
    <View className="flex-1 justify-center p-4">
      <Frame className="w-full">
        <Frame.Header>
          <Frame.Title>Last 13 weeks</Frame.Title>
          <Frame.Action>layout=&quot;fill&quot;</Frame.Action>
        </Frame.Header>
        <Frame.Panel>
          <View className="p-4">
            {/* No chart header here: the frame's own already says what this
                is, and a second title under the first says it twice. */}
            <HeatmapChart data={HEATMAP_QUARTER} layout="fill" weekStartDay={1} gap={4}>
              <HeatmapChart.XAxis />
              <HeatmapChart.YAxis />
              <HeatmapChart.Cells cornerRadius={3} />
              <HeatmapChart.Tooltip />
              <HeatmapChart.Legend />
            </HeatmapChart>
          </View>
        </Frame.Panel>
      </Frame>
    </View>
  );
}

/** Quarter rules, and the whole chart on one accent colour. */
function HeatmapQuartersVersion() {
  const success = useCSSVariable('--color-success');

  return (
    <View className="flex-1 justify-center p-4">
      <Frame className="w-full">
        <Frame.Header>
          <Frame.Title>Deploys by quarter</Frame.Title>
          <Frame.Action>Rules every 13</Frame.Action>
        </Frame.Header>
        <Frame.Panel>
          <HeatmapChart data={[]} className={CHART_HEADER}>
            <HeatmapChart.Header
              title="Deploys"
              caption="A ramp off one colour rather than the chart token"
            />
          </HeatmapChart>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="px-4 pb-4"
          >
            <HeatmapChart
              data={HEATMAP_YEAR}
              weekStartDay={1}
              binSize={11}
              color={typeof success === 'string' ? success : undefined}
            >
              <HeatmapChart.XAxis />
              <HeatmapChart.YAxis tickFilter="all" labelFormat="initial" width={16} />
              <HeatmapChart.Separator every="quarter" dashArray="2,3" />
              <HeatmapChart.Cells />
              <HeatmapChart.Tooltip />
            </HeatmapChart>
          </ScrollView>
        </Frame.Panel>
      </Frame>
    </View>
  );
}

/*
 * Six-hour bins. `fill` sizes a cell off the width, so with seven columns the
 * cells are wide and every row costs that much height — four rows is a grid
 * that stands shorter than the calendars it is paged beside, where eight
 * three-hour ones stood half as tall again.
 */
const HOURS = ['00', '06', '12', '18'];

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * A week by time of day rather than a year by date — seven columns of four
 * six-hour bins, seeded the same way the year is so the shape holds still.
 */
function punchcardWeek(): HeatmapColumn[] {
  let state = 19;
  const random = () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };

  return WEEKDAYS.map((_, day) => ({
    bin: day,
    bins: HOURS.map((_hour, slot) => {
      const roll = random();
      const weekend = day >= 5;
      // Office hours on weekdays, a quiet evening bump at the weekend, and
      // nothing much overnight either way.
      const working = slot === 1 || slot === 2;
      const peak = weekend ? (slot === 2 ? 0.45 : 0.1) : working ? 1 : 0.18;
      return { bin: slot, count: Math.floor(roll * 20 * peak) };
    }),
  }));
}

const HEATMAP_PUNCHCARD = punchcardWeek();

/**
 * The grid with something other than a calendar in it — rows are times of day,
 * columns are weekdays. "When is this busy" is a question the year grid cannot
 * answer, because it has already spent its rows on the days of the week.
 */
function HeatmapPunchcardVersion() {
  const [active, setActive] = useState<HeatmapCell | null>(null);

  return (
    <View className="flex-1 justify-center p-4">
      <Frame className="w-full">
        <Frame.Header>
          <Frame.Title>Support load</Frame.Title>
          <Frame.Action>By hour</Frame.Action>
        </Frame.Header>
        <Frame.Panel>
          <View className="p-4">
            <HeatmapChart
              data={HEATMAP_PUNCHCARD}
              layout="fill"
              rows={HOURS.length}
              gap={4}
              onActiveCellChange={setActive}
            >
              <HeatmapChart.Header
                title="Tickets opened"
                value={active ? `${active.count}` : '06:00 – 18:00'}
                caption={
                  active
                    ? `${WEEKDAYS[active.column] ?? ''} at ${HOURS[active.row] ?? ''}:00`
                    : 'Where the week actually lands'
                }
                legend
              />
              <HeatmapChart.XAxis labels={WEEKDAYS} />
              <HeatmapChart.YAxis labels={HOURS} tickFilter="all" width={24} />
              <HeatmapChart.Cells cornerRadius={3} />
              {/* The default label names contributions on a date, and this
                  grid has neither — so it says what this one is counting. */}
              <HeatmapChart.Tooltip
                formatLabel={(cell) =>
                  `${cell.count} · ${WEEKDAYS[cell.column] ?? ''} ${HOURS[cell.row] ?? ''}:00`
                }
              />
            </HeatmapChart>
          </View>
        </Frame.Panel>
      </Frame>
    </View>
  );
}

/** The small progress ring shown beside each row in the Frame demo. */
function FrameRing({ percent }: { percent: number }) {
  return (
    <View className="h-6 w-6 items-center justify-center rounded-full border-2 border-muted">
      <View
        className="absolute h-6 w-6 rounded-full border-2 border-transparent border-t-info"
        style={{ transform: [{ rotate: `${(percent / 100) * 360}deg` }] }}
      />
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Fab                                                                        */
/* -------------------------------------------------------------------------- */

const FAB_NOTES = [
  'Rent, split three ways',
  'Return the drill',
  'Book the ferry',
  'Reply to Nadia',
  'Renew the domain',
  'Water the fig',
  'Cancel the trial',
  'Pick a paint colour',
  'Back up the phone',
  'Find the passport',
];

/** A list with something floating over it, which is the case the component is for. */
function FabListDemo() {
  const { toast } = useToast();

  return (
    <View className="flex-1">
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 96 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-2">
          {FAB_NOTES.map((note) => (
            <Surface key={note} variant="secondary" padding="default" className="rounded-xl">
              <Text>{note}</Text>
            </Surface>
          ))}
        </View>
      </ScrollView>

      {/* The list pads its own bottom by more than the button is tall, so the
          last row can be scrolled clear of it. Nothing here can work that out
          for you. */}
      <Fab
        placement="bottom-right"
        icon={<PlusIcon size={24} />}
        accessibilityLabel="New note"
        haptics
        onPress={() => toast.show({ variant: 'success', label: 'New note', duration: 1800 })}
      />
    </View>
  );
}

/** The extended form, and the three places it can park. */
function FabPlacementsDemo() {
  const [placement, setPlacement] = useState<'bottom-left' | 'bottom-center' | 'bottom-right'>(
    'bottom-right'
  );

  return (
    <View className="flex-1">
      <View className="gap-3 p-4">
        <Text size="sm" muted>
          A lone glyph is a guess unless it is a plus, so this one spells itself out.
        </Text>
        <ButtonGroup fullWidth size="sm">
          {(['bottom-left', 'bottom-center', 'bottom-right'] as const).map((option) => (
            <Button
              key={option}
              variant={placement === option ? 'secondary' : 'ghost'}
              onPress={() => setPlacement(option)}
            >
              {option === 'bottom-left' ? 'Left' : option === 'bottom-center' ? 'Centre' : 'Right'}
            </Button>
          ))}
        </ButtonGroup>
      </View>

      <Fab extended placement={placement} icon={<PencilIcon size={20} />}>
        Write
      </Fab>
    </View>
  );
}

/** The speed dial, including the one action that removes something. */
/**
 * `glass` puts the dial in the platform's material over the list it floats on,
 * which is where the material earns its place: the rows refract through the
 * trigger as they scroll under, and the actions unfold in it too. It only
 * exists on iOS 26 with `expo-glass-effect`, so below that this is the dial
 * demo with filled buttons — a working flag and a missing floor look
 * identical, and the description says which.
 */
function FabGlassDemo({
  layout = 'dial',
  appearance = 'platform',
}: {
  layout?: 'dial' | 'menu' | 'native';
  appearance?: 'platform' | 'wells';
}) {
  const { toast } = useToast();

  const pick = (what: string, destructive = false) =>
    toast.show({
      variant: destructive ? 'destructive' : 'info',
      label: what,
      duration: 1800,
    });

  return (
    <View className="flex-1">
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 96 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-2">
          {FAB_NOTES.map((note) => (
            <Surface key={note} variant="secondary" padding="default" className="rounded-xl">
              <Text>{note}</Text>
            </Surface>
          ))}
        </View>
      </ScrollView>

      <Fab.Group
        glass
        layout={layout}
        appearance={appearance}
        icon={<PlusIcon size={24} />}
        accessibilityLabel="Add something"
        placement="bottom-right"
        haptics
        blur
      >
        <Fab.Action
          icon={<ImageIcon size={18} />}
          systemImage="photo"
          label="Photo"
          onPress={() => pick('Photo added')}
        />
        <Fab.Action
          icon={<PaperclipIcon size={18} />}
          systemImage="paperclip"
          label="Attachment"
          onPress={() => pick('Attachment added')}
        />
        <Fab.Action
          icon={<MicIcon size={18} />}
          systemImage="mic"
          label="Voice note"
          onPress={() => pick('Recording')}
        />
        <Fab.Action
          icon={<TrashIcon size={18} />}
          systemImage="trash"
          label="Empty drafts"
          destructive
          onPress={() => pick('Drafts emptied', true)}
        />
      </Fab.Group>
    </View>
  );
}

function FabDialDemo() {
  const { toast } = useToast();

  const pick = (what: string, destructive = false) =>
    toast.show({
      variant: destructive ? 'destructive' : 'info',
      label: what,
      duration: 1800,
    });

  return (
    <View className="flex-1">
      <View className="gap-2 p-4">
        <Text size="sm" muted>
          Press the button. The actions unfold one after another, and the screen behind
          them says the next tap either picks one or closes it.
        </Text>
      </View>

      <Fab.Group
        icon={<PlusIcon size={24} />}
        accessibilityLabel="Add something"
        placement="bottom-right"
        haptics
        blur
      >
        <Fab.Action
          icon={<ImageIcon size={18} />}
          label="Photo"
          onPress={() => pick('Photo added')}
        />
        <Fab.Action
          icon={<PaperclipIcon size={18} />}
          label="Attachment"
          onPress={() => pick('Attachment added')}
        />
        <Fab.Action
          icon={<MicIcon size={18} />}
          label="Voice note"
          onPress={() => pick('Recording')}
        />
        <Fab.Action
          icon={<TrashIcon size={18} />}
          label="Empty drafts"
          destructive
          onPress={() => pick('Drafts emptied', true)}
        />
      </Fab.Group>
    </View>
  );
}

/** Sizes and colours, laid out in the flow rather than pinned to a corner. */
function FabSizesDemo() {
  return (
    <View className="w-full gap-6 p-4">
      <View className="gap-2">
        <Text size="xs" muted>
          Sizes
        </Text>
        <View className="flex-row items-center gap-4">
          {(['sm', 'md', 'lg'] as const).map((size) => (
            <Fab key={size} size={size} icon={<PlusIcon size={20} />} accessibilityLabel={size} />
          ))}
        </View>
      </View>

      <View className="gap-2">
        <Text size="xs" muted>
          Variants
        </Text>
        <View className="flex-row items-center gap-4">
          <Fab icon={<PlusIcon size={20} />} accessibilityLabel="Primary" />
          <Fab variant="secondary" icon={<StarIcon size={20} />} accessibilityLabel="Secondary" />
          <Fab variant="surface" icon={<SearchIcon size={20} />} accessibilityLabel="Surface" />
          <Fab variant="destructive" icon={<TrashIcon size={20} />} accessibilityLabel="Delete" />
        </View>
      </View>

      <View className="gap-2">
        <Text size="xs" muted>
          Liquid Glass — needs iOS 26
        </Text>
        <View className="flex-row flex-wrap items-center gap-4">
          <Fab glass icon={<PlusIcon size={20} />} accessibilityLabel="Primary" />
          <Fab glass variant="secondary" icon={<StarIcon size={20} />} accessibilityLabel="Secondary" />
          <Fab glass variant="surface" icon={<SearchIcon size={20} />} accessibilityLabel="Surface" />
          <Fab glass variant="destructive" icon={<TrashIcon size={20} />} accessibilityLabel="Delete" />
          <Fab glass extended icon={<SendIcon size={18} />} size="sm" variant="surface">
            Send
          </Fab>
          <Fab glass extended icon={<PlusIcon size={18} />} size="sm" disabled>
            Add
          </Fab>
        </View>
      </View>

      <View className="gap-2">
        <Text size="xs" muted>
          Extended, and disabled
        </Text>
        <View className="flex-row flex-wrap items-center gap-3">
          <Fab extended icon={<SendIcon size={18} />} size="sm">
            Send
          </Fab>
          <Fab extended icon={<DownloadIcon size={18} />} size="sm" variant="surface">
            Export
          </Fab>
          <Fab extended icon={<PlusIcon size={18} />} size="sm" disabled>
            Add
          </Fab>
        </View>
      </View>
    </View>
  );
}

/** The layout kit on its own — a grouped set, a horizontal row, a manual error. */
function FieldDemo() {
  const [email, setEmail] = useState(true);
  const [sms, setSms] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [username, setUsername] = useState('taken-name');
  const errors = username === 'taken-name' ? ['That username is already taken.'] : [];

  return (
    <View className="w-full gap-6">
      <Field.Set>
        <Field.Legend>Notifications</Field.Legend>
        <Checkbox checked={email} onCheckedChange={setEmail} label="Email" />
        <Checkbox checked={sms} onCheckedChange={setSms} label="SMS" />
      </Field.Set>

      <Field.Separator />

      <Field orientation="horizontal">
        <Field.Content>
          <Field.Title>Advanced analytics</Field.Title>
          <Field.Description>Included with the Pro plan.</Field.Description>
        </Field.Content>
        <Switch value={analytics} onValueChange={setAnalytics} />
      </Field>

      <Field invalid={errors.length > 0}>
        <Field.Label isRequired>Username</Field.Label>
        <Input value={username} onChangeText={setUsername} />
        <Field.Error errors={errors} />
      </Field>
    </View>
  );
}

/** A two-field form, validated on blur, wired to `useForm` and `Form.Field`. */
function FormDemo() {
  const { toast } = useToast();
  const form = useForm({
    defaultValues: { email: '', password: '' },
    onSubmit: async (values) => {
      await new Promise((resolve) => setTimeout(resolve, 600));
      toast.show({ variant: 'success', label: `Signed in as ${values.email}` });
      form.reset();
    },
  });

  return (
    <Form form={form}>
      <View className="w-full gap-4">
        <Form.Field
          name="email"
          validate={(value: string) => (value.includes('@') ? undefined : 'Enter a valid email')}
        >
          {(field) => (
            <Input
              label="Email"
              placeholder="you@example.com"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              errorMessage={field.error}
            />
          )}
        </Form.Field>
        <Form.Field
          name="password"
          validate={(value: string) => (value.length >= 8 ? undefined : 'At least 8 characters')}
        >
          {(field) => (
            <Input
              label="Password"
              secureTextEntry
              placeholder="••••••••"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              errorMessage={field.error}
            />
          )}
        </Form.Field>
        <Button loading={form.isSubmitting} onPress={form.handleSubmit}>
          Sign in
        </Button>
      </View>
    </Form>
  );
}

/**
 * The fuller version: cross-field validation (`confirmPassword` against
 * `password`), a checkbox field whose control takes a differently-shaped
 * change prop, and a submit that only fires once every field passes.
 */
function SignUpFormVersion() {
  const insets = useSafeAreaInsets();
  const { toast } = useToast();
  const form = useForm({
    defaultValues: { name: '', email: '', password: '', confirmPassword: '', acceptedTerms: false },
    validate: (values) =>
      values.password !== values.confirmPassword
        ? { confirmPassword: 'Passwords must match' }
        : {},
    onSubmit: async (values) => {
      await new Promise((resolve) => setTimeout(resolve, 800));
      toast.show({ variant: 'success', label: `Welcome, ${values.name}` });
      form.reset();
    },
  });

  return (
    <ScrollView
      contentContainerClassName="gap-4 px-5 pt-4"
      contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Form form={form}>
        <Card className="w-full">
          <Card.Header>
            <Card.Title>Create an account</Card.Title>
            <Card.Description>It takes less than a minute.</Card.Description>
          </Card.Header>
          <Card.Content className="gap-4">
            <Form.Field
              name="name"
              validate={(value: string) => (value ? undefined : 'Required')}
            >
              {(field) => (
                <Input
                  label="Full name"
                  isRequired
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  errorMessage={field.error}
                />
              )}
            </Form.Field>
            <Form.Field
              name="email"
              validate={(value: string) => (value.includes('@') ? undefined : 'Enter a valid email')}
            >
              {(field) => (
                <Input
                  label="Email"
                  isRequired
                  placeholder="you@example.com"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  errorMessage={field.error}
                />
              )}
            </Form.Field>
            <Form.Field
              name="password"
              validate={(value: string) => (value.length >= 8 ? undefined : 'At least 8 characters')}
            >
              {(field) => (
                <Input
                  label="Password"
                  isRequired
                  secureTextEntry
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  errorMessage={field.error}
                />
              )}
            </Form.Field>
            <Form.Field name="confirmPassword">
              {(field) => (
                <Input
                  label="Confirm password"
                  isRequired
                  secureTextEntry
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  errorMessage={field.error}
                />
              )}
            </Form.Field>
            <Form.Field
              name="acceptedTerms"
              validate={(value: boolean) => (value ? undefined : 'Required to continue')}
            >
              {(field) => (
                <Field invalid={!!field.error}>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    label="I accept the terms"
                  />
                  <Field.Error>{field.error}</Field.Error>
                </Field>
              )}
            </Form.Field>
          </Card.Content>
          <Card.Footer>
            <Button fullWidth loading={form.isSubmitting} onPress={form.handleSubmit}>
              Create account
            </Button>
          </Card.Footer>
        </Card>
      </Form>
    </ScrollView>
  );
}

/** The layout kit without a form hook — grouping, a horizontal row, a rule. */
function PreferencesVersion() {
  const insets = useSafeAreaInsets();
  const [marketing, setMarketing] = useState(true);
  const [product, setProduct] = useState(true);
  const [thirdParty, setThirdParty] = useState(false);
  const [publicProfile, setPublicProfile] = useState(false);

  return (
    <ScrollView
      contentContainerClassName="gap-4 px-5 pt-4"
      contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      showsVerticalScrollIndicator={false}
    >
      <Card className="w-full">
        <Card.Header>
          <Card.Title>Preferences</Card.Title>
          <Card.Description>Manage what you hear from us.</Card.Description>
        </Card.Header>
        <Card.Content className="gap-5">
          <Field.Set>
            <Field.Legend>Emails</Field.Legend>
            <Field orientation="horizontal">
              <Field.Content>
                <Field.Title>Marketing</Field.Title>
                <Field.Description>Offers and announcements.</Field.Description>
              </Field.Content>
              <Switch value={marketing} onValueChange={setMarketing} />
            </Field>
            <Field orientation="horizontal">
              <Field.Content>
                <Field.Title>Product updates</Field.Title>
                <Field.Description>New features and releases.</Field.Description>
              </Field.Content>
              <Switch value={product} onValueChange={setProduct} />
            </Field>
            <Field orientation="horizontal">
              <Field.Content>
                <Field.Title>Third-party offers</Field.Title>
                <Field.Description>From partners we work with.</Field.Description>
              </Field.Content>
              <Switch value={thirdParty} onValueChange={setThirdParty} />
            </Field>
          </Field.Set>

          <Field.Separator>Profile</Field.Separator>

          <Field orientation="horizontal">
            <Field.Content>
              <Field.Title>Public profile</Field.Title>
              <Field.Description>Anyone can see your activity.</Field.Description>
            </Field.Content>
            <Switch value={publicProfile} onValueChange={setPublicProfile} />
          </Field>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

/** Two series side by side, which is what a bar chart is for. */
/** Padding the header needs to line up inside a `Frame.Panel`, which has none. */
const CHART_HEADER = 'px-4 pt-3.5';

/**
 * A navigation drawer with a destination selected, because that is the state a
 * navigation drawer is almost always in: it opens to tell you where you are,
 * not only where you could go. The group under the rule is the second tier —
 * settings that belong to the workspace rather than places inside it.
 */
function DrawerNavigationDemo() {
  const [destination, setDestination] = useState('Projects');

  const places = [
    { label: 'Projects', icon: <PackageIcon size={16} />, detail: '12 active' },
    { label: 'Members', icon: <BellIcon size={16} />, detail: '8 people' },
    { label: 'Billing', icon: <CardIcon size={16} />, detail: 'Pro plan' },
  ];

  return (
    <Drawer>
      <Drawer.Trigger>
        <Button variant="outline">Open menu</Button>
      </Drawer.Trigger>
      <Drawer.Content>
        <Drawer.Header title="Acme Studio" description="Switch project or manage members." />
        <Drawer.Body>
          <View className="gap-4 pb-4">
            <Item.Group>
              {places.map(({ label, icon, detail }, index) => (
                <Fragment key={label}>
                  {index > 0 ? <Item.Separator /> : null}
                  <Item
                    // Selected rather than merely pressable: the row you are on
                    // has to be announced as such, not only tinted.
                    variant={destination === label ? 'muted' : 'default'}
                    onPress={() => setDestination(label)}
                    accessibilityState={{ selected: destination === label }}
                  >
                    <Item.Media variant="icon">{icon}</Item.Media>
                    <Item.Content>
                      <Item.Title>{label}</Item.Title>
                      <Item.Description>{detail}</Item.Description>
                    </Item.Content>
                    <Item.Actions>
                      {destination === label ? (
                        <Badge variant="secondary">Here</Badge>
                      ) : (
                        <ChevronRightIcon size={16} />
                      )}
                    </Item.Actions>
                  </Item>
                </Fragment>
              ))}
            </Item.Group>

            <Separator />

            <Item.Group>
              <Item>
                <Item.Media variant="icon">
                  <ShieldCheckIcon size={16} />
                </Item.Media>
                <Item.Content>
                  <Item.Title>Security</Item.Title>
                  <Item.Description>Two-factor is on</Item.Description>
                </Item.Content>
                <Item.Actions>
                  <ChevronRightIcon size={16} />
                </Item.Actions>
              </Item>
              <Item.Separator />
              <Item>
                <Item.Media variant="icon">
                  <BellIcon size={16} />
                </Item.Media>
                <Item.Content>
                  <Item.Title>Notifications</Item.Title>
                  <Item.Description>Badges, sounds, banners</Item.Description>
                </Item.Content>
                <Item.Actions>
                  <ChevronRightIcon size={16} />
                </Item.Actions>
              </Item>
            </Item.Group>
          </View>
        </Drawer.Body>
        <Drawer.Footer>
          <Avatar size="sm" fallback="KA" />
          <View className="min-w-0 flex-1">
            <Text size="sm" weight="medium" numberOfLines={1}>
              Khalid Abdi
            </Text>
            <Text size="xs" muted numberOfLines={1}>
              khalid@acme.studio
            </Text>
          </View>
          <Drawer.Close>
            <Button variant="outline" size="sm">
              Sign out
            </Button>
          </Drawer.Close>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  );
}

/**
 * What each size asks for and what it is capped at. Written out because the
 * cap is the part that is invisible on a phone and the whole point on a
 * tablet — a fraction alone reads correctly on one and absurdly on the other.
 */
const DRAWER_SIZES = [
  { size: 'sm', asks: '62% of the width', capped: 'never past 280pt', use: 'A short list of destinations.' },
  { size: 'md', asks: '78% of the width', capped: 'never past 320pt', use: 'The default. Navigation, filters, a form.' },
  { size: 'lg', asks: '88% of the width', capped: 'never past 400pt', use: 'Anything with two columns of content.' },
  { size: 'full', asks: '94% of the width', capped: 'no cap', use: 'A takeover that still shows the app behind it.' },
] as const;

function DrawerSizesDemo() {
  return (
    <View className="w-full flex-row flex-wrap justify-center gap-2">
      {DRAWER_SIZES.map(({ size, asks, capped, use }) => (
        <Drawer key={size}>
          <Drawer.Trigger>
            <Button variant="outline" size="sm">
              {size}
            </Button>
          </Drawer.Trigger>
          <Drawer.Content size={size}>
            <Drawer.Header title={`size="${size}"`} description={use} />
            <Drawer.Body>
              <View className="gap-4 pb-4">
                <Item.Group>
                  <Item>
                    <Item.Content>
                      <Item.Title>Asks for</Item.Title>
                    </Item.Content>
                    <Item.Actions>
                      <Text size="sm" muted>
                        {asks}
                      </Text>
                    </Item.Actions>
                  </Item>
                  <Item.Separator />
                  <Item>
                    <Item.Content>
                      <Item.Title>Capped at</Item.Title>
                    </Item.Content>
                    <Item.Actions>
                      <Text size="sm" muted>
                        {capped}
                      </Text>
                    </Item.Actions>
                  </Item>
                </Item.Group>
                <Text size="sm" muted>
                  The cap is what a fraction cannot do on its own: 78% of a tablet is
                  a navigation list with a column of whitespace beside it.
                </Text>
                <Text size="sm" muted>
                  Drag the panel back toward its edge to dismiss it.
                </Text>
              </View>
            </Drawer.Body>
          </Drawer.Content>
        </Drawer>
      ))}
    </View>
  );
}

const DRAWER_CATEGORIES = ['Chairs', 'Desks', 'Lighting', 'Storage', 'Rugs'];

/**
 * A filter drawer on the end edge — the edge text runs toward, so it is the
 * right in a left-to-right app and the left in a right-to-left one.
 *
 * `closeSide="end"` puts the ✕ in the outer corner rather than the inner one it
 * would take by default. A filter panel is opened and closed a dozen times in a
 * session, and a target that is always under the same thumb beats one that
 * moves with the edge the panel came from.
 *
 * Everything in it drives the count in the footer, so the panel is a control
 * rather than a picture of one — a filter that changes nothing demonstrates
 * nothing about whether the drawer can hold a real form.
 */
function DrawerFiltersDemo() {
  const [categories, setCategories] = useState<string[]>(['Chairs']);
  const [budget, setBudget] = useState(320);
  const [rating, setRating] = useState(4);
  const [inStock, setInStock] = useState(true);
  const [onSale, setOnSale] = useState(false);

  const toggleCategory = (name: string) =>
    setCategories((current) =>
      current.includes(name)
        ? current.filter((item) => item !== name)
        : [...current, name]
    );

  const reset = () => {
    setCategories([]);
    setBudget(500);
    setRating(0);
    setInStock(false);
    setOnSale(false);
  };

  // Deliberately arbitrary, but monotonic in every input: the number has to
  // move the right way when a filter tightens, or the footer is a decoration.
  const results =
    240 -
    categories.length * 26 -
    Math.round((500 - budget) / 8) -
    rating * 11 -
    (inStock ? 18 : 0) -
    (onSale ? 34 : 0);
  const applied =
    categories.length + (budget < 500 ? 1 : 0) + (rating > 0 ? 1 : 0) + (inStock ? 1 : 0) + (onSale ? 1 : 0);

  return (
    <Drawer>
      <Drawer.Trigger>
        <Button variant="outline">Filters</Button>
      </Drawer.Trigger>
      <Drawer.Content side="end" closeSide="end">
        <Drawer.Header
          title="Filters"
          description={applied === 0 ? 'Nothing applied' : `${applied} applied`}
        />
        <Drawer.Body>
          <View className="gap-6 pb-6">
          <View className="gap-3">
            <Label>Category</Label>
            <View className="flex-row flex-wrap gap-2">
              {DRAWER_CATEGORIES.map((name) => (
                <Chip
                  key={name}
                  selected={categories.includes(name)}
                  onPress={() => toggleCategory(name)}
                >
                  {name}
                </Chip>
              ))}
            </View>
          </View>

          <Separator />

          <View className="gap-3">
            <View className="flex-row items-center justify-between">
              <Label>Budget</Label>
              <Text size="sm" muted>
                Up to ${budget}
              </Text>
            </View>
            <Slider value={budget} onValueChange={setBudget} min={40} max={500} step={20} />
          </View>

          <Separator />

          <View className="gap-2">
            <Label>Minimum rating</Label>
            <Rating value={rating} onValueChange={setRating} allowClear />
          </View>

          <Separator />

          <Item.Group>
            <Item>
              <Item.Content>
                <Item.Title>In stock only</Item.Title>
                <Item.Description>Hide anything on backorder</Item.Description>
              </Item.Content>
              <Item.Actions>
                <Switch value={inStock} onValueChange={setInStock} />
              </Item.Actions>
            </Item>
            <Item.Separator />
            <Item>
              <Item.Content>
                <Item.Title>On sale</Item.Title>
                <Item.Description>Reduced in the last 30 days</Item.Description>
              </Item.Content>
              <Item.Actions>
                <Switch value={onSale} onValueChange={setOnSale} />
              </Item.Actions>
            </Item>
          </Item.Group>
          </View>
        </Drawer.Body>
        <Drawer.Footer>
          <Button variant="ghost" onPress={reset}>
            Reset
          </Button>
          <Drawer.Close>
            <Button className="flex-1">Show {Math.max(results, 0)} results</Button>
          </Drawer.Close>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  );
}

export const ENTRIES: ComponentEntry[] = [
{
    slug: 'drawer',
    name: 'Drawer',
    summary: 'A panel that comes in from an edge of the screen',
    demos: [
      { label: 'Navigation drawer', render: () => <DrawerNavigationDemo /> },
      {
        label: 'From the end edge',
        render: () => <DrawerFiltersDemo />,
      },
      { label: 'Sizes', render: () => <DrawerSizesDemo /> },
      {
        label: 'From the top',
        render: () => (
          // On the vertical axis the sides mean what they say — there is no
          // reading direction to mirror.
          <Drawer>
            <Drawer.Trigger>
              <Button variant="outline">Notifications</Button>
            </Drawer.Trigger>
            <Drawer.Content side="top" size="sm">
              <Drawer.Header title="Notifications" />
              <Drawer.Body>
                <Item>
                  <Item.Content>
                    <Item.Title>Build passed</Item.Title>
                    <Item.Description>2 minutes ago</Item.Description>
                  </Item.Content>
                </Item>
                <Item>
                  <Item.Content>
                    <Item.Title>New comment</Item.Title>
                    <Item.Description>1 hour ago</Item.Description>
                  </Item.Content>
                </Item>
              </Drawer.Body>
            </Drawer.Content>
          </Drawer>
        ),
      },
      {
        label: 'Right to left',
        render: () => (
          // The same `side="start"` drawer, mirrored: it docks to the right,
          // slides in from the right, and dismisses on a swipe to the right.
          <Direction dir="rtl" className="w-full">
            <Drawer>
              <Drawer.Trigger>
                <Button variant="outline">افتح القائمة</Button>
              </Drawer.Trigger>
              <Drawer.Content side="start">
                <Drawer.Header title="مساحة العمل" />
                <Drawer.Body>
                  {['المشاريع', 'الأعضاء'].map((label) => (
                    <Item key={label}>
                      <Item.Content>
                        <Item.Title>{label}</Item.Title>
                      </Item.Content>
                    </Item>
                  ))}
                </Drawer.Body>
              </Drawer.Content>
            </Drawer>
          </Direction>
        ),
      },
    ],
  },
{
    slug: 'empty-state',
    name: 'EmptyState',
    summary: 'Placeholder for a view with no content',
    demos: [
      {
        label: 'With icon',
        render: () => (
          <EmptyState>
            <EmptyState.Header>
              <EmptyState.Media variant="icon">
                <SearchIcon size={18} />
              </EmptyState.Media>
              <EmptyState.Title>No results found</EmptyState.Title>
              <EmptyState.Description>
                Try adjusting your search or filters to find what you're looking
                for.
              </EmptyState.Description>
            </EmptyState.Header>
            <EmptyState.Content>
              <Button variant="outline" fullWidth>
                Clear filters
              </Button>
            </EmptyState.Content>
          </EmptyState>
        ),
      },
      {
        label: 'Text only',
        render: () => (
          <EmptyState>
            <EmptyState.Header>
              <EmptyState.Title>Nothing here yet</EmptyState.Title>
              <EmptyState.Description>
                Projects you create will show up on this screen.
              </EmptyState.Description>
            </EmptyState.Header>
          </EmptyState>
        ),
      },
      {
        label: 'In a card',
        render: () => (
          // The card variant is a self-contained block, for an empty state
          // that sits inside content rather than owning the screen.
          <EmptyState variant="card" size="sm" className="w-full">
            <EmptyState.Header>
              <EmptyState.Media variant="icon">
                <BellIcon size={16} />
              </EmptyState.Media>
              <EmptyState.Title>No notifications</EmptyState.Title>
              <EmptyState.Description>
                You're all caught up.
              </EmptyState.Description>
            </EmptyState.Header>
          </EmptyState>
        ),
      },
      {
        label: 'Sizes',
        render: () => (
          <View className="w-full gap-3">
            {(['sm', 'default', 'lg'] as const).map((size) => (
              <EmptyState key={size} variant="card" size={size} className="w-full">
                <EmptyState.Header>
                  <EmptyState.Title>Size {size}</EmptyState.Title>
                  <EmptyState.Description>
                    Padding and type scale together.
                  </EmptyState.Description>
                </EmptyState.Header>
              </EmptyState>
            ))}
          </View>
        ),
      },
    ],
  },
{
    slug: 'fab',
    name: 'Fab',
    summary: 'The floating action button, and the dial behind it',
    demos: [
      {
        label: 'Over a list',
        id: 'list',
        fullPage: true,
        description: 'The case it exists for — one action pinned over content that scrolls under it.',
        render: () => <FabListDemo />,
      },
      {
        label: 'A speed dial',
        id: 'dial',
        fullPage: true,
        description: 'Actions unfolding out of the button, over a screen that says the dial is modal.',
        render: () => <FabDialDemo />,
      },
      {
        label: 'Where it parks',
        id: 'placement',
        fullPage: true,
        description: 'The extended form, in each of the three corners it can take.',
        render: () => <FabPlacementsDemo />,
      },
      {
        label: 'Liquid Glass',
        id: 'glass',
        fullPage: true,
        description:
          'A dial in the platform material over the list — needs iOS 26. Anywhere else it is the filled one.',
        render: () => <FabGlassDemo />,
      },
      {
        label: 'A menu',
        id: 'menu',
        fullPage: true,
        description:
          'One panel of rows springing out of the button, in the material — the shape the platform\'s own menus take.',
        render: () => <FabGlassDemo layout="menu" />,
      },
      {
        label: 'A menu, with wells',
        id: 'menu-wells',
        fullPage: true,
        description:
          'The same menu in the wells appearance: the glyph leads in a tinted well and each row is its own pill.',
        render: () => <FabGlassDemo layout="menu" appearance="wells" />,
      },
      {
        label: 'A native menu',
        id: 'native-menu',
        fullPage: true,
        description:
          "The platform's own menu, drawn by SwiftUI or Jetpack Compose, over a page the scrim frosts.",
        render: () => <FabGlassDemo layout="native" />,
      },
      { label: 'Sizes and variants', render: () => <FabSizesDemo /> },
    ],
  },
{
    slug: 'field',
    name: 'Field',
    summary: 'Layout and validation-state kit for a form control',
    demos: [{ label: 'Anatomy', render: () => <FieldDemo /> }],
  },
{
    slug: 'form',
    name: 'Form',
    summary: 'Form state with no form library underneath',
    demos: [
      { label: 'Sign in', render: () => <FormDemo /> },
      {
        label: 'Sign up form',
        id: 'sign-up-form',
        fullPage: true,
        description:
          'Cross-field validation, a checkbox with its own change prop, and a submit that waits on every field.',
        render: () => <SignUpFormVersion />,
      },
      {
        label: 'Preferences',
        id: 'preferences',
        fullPage: true,
        description: 'The layout kit grouping switches, with no form hook involved.',
        render: () => <PreferencesVersion />,
      },
    ],
  },
{
    slug: 'flow',
    name: 'Flow',
    summary: 'Pan-and-zoom canvas of draggable nodes joined by animated edges',
    // A canvas that pans has no drag left to give a pager: a vertical swipe
    // over it is contested, and whichever wins is the one the user did not
    // mean. Stacked instead, where the only scroller is the page's own.
    layout: 'sections',
    demos: [
      { label: 'In a box', render: () => <FlowInlineDemo /> },
      { label: 'Edge shapes', render: () => <FlowEdgeShapesDemo /> },
      {
        label: 'Infrastructure map',
        id: 'infrastructure',
        fullPage: true,
        description:
          'Two services and the dependency between them. Drag a node and the edge follows it in real time.',
        render: () => <FlowInfrastructureVersion />,
      },
      {
        label: 'Build pipeline',
        id: 'pipeline',
        fullPage: true,
        description:
          'Stages running top to bottom, with only the live edge marching. Advance it and watch the animation move.',
        render: () => <FlowPipelineVersion />,
      },
      {
        label: 'Wiring it up',
        id: 'connect',
        fullPage: true,
        description:
          'Drag from one port to another to create an edge. The canvas reports the connection; the graph stays yours.',
        render: () => <FlowConnectVersion />,
      },
      {
        label: 'Mind map',
        id: 'mind-map',
        fullPage: true,
        description: 'Curved edges radiating from a centre, and no fixed sides — drag a branch across and the edge re-routes.',
        render: () => <FlowMindMapVersion />,
      },
      {
        label: 'Building a graph',
        id: 'builder',
        fullPage: true,
        description:
          'One button adds a frame, the other adds one already wired to the last. The canvas holds no list of its own.',
        render: () => <FlowBuilderVersion />,
      },
      {
        label: 'Named ports',
        id: 'ports',
        fullPage: true,
        description:
          'Edges pinned to handles instead of routed automatically, for a diagram where the sides mean something.',
        render: () => <FlowPortsVersion />,
      },
      {
        label: 'Groups and a minimap',
        id: 'grouped',
        fullPage: true,
        description:
          'Two containers joined by one edge, holding contents that travel with them, and an overview of the parts off screen.',
        render: () => <FlowGroupedVersion />,
      },
    ],
  },
{
    slug: 'frame',
    name: 'Frame',
    summary: 'Widget shell with a titled header and a flush inner card',
    layout: 'sections',
    demos: [
      {
        label: 'Agent monitor',
        render: () => (
          <Frame className="w-full">
            <Frame.Header>
              <Frame.Title>Agent monitor</Frame.Title>
              <Frame.Action>All agents under 25% token limit</Frame.Action>
            </Frame.Header>
            <Frame.Panel>
              {[
                ['GPT 5.6 Sol', 'UX research for fintech trends', 'Done', '10m7s'],
                ['Fable 5', 'Planning out the app user flow', 'Running', '15m12s'],
                ['GPT 5.6 Sol', 'Building out the UI design system', 'Running', '15m12s'],
                ['Haiku 4.5', 'On standby', 'Idle', '0s'],
              ].map(([model, task, status, elapsed]) => (
                <Frame.Row key={task}>
                  <Frame.Content>
                    <Frame.Title>{model}</Frame.Title>
                    <Frame.Description>{task}</Frame.Description>
                  </Frame.Content>
                  <Frame.Actions>
                    <Chip
                      size="sm"
                      variant={
                        status === 'Running'
                          ? 'success'
                          : status === 'Done'
                            ? 'outline'
                            : 'default'
                      }
                    >
                      {status}
                    </Chip>
                    <Text size="xs" muted>
                      {elapsed}
                    </Text>
                  </Frame.Actions>
                </Frame.Row>
              ))}
            </Frame.Panel>
          </Frame>
        ),
      },
      {
        label: 'A single row',
        render: () => (
          // The whole widget is one row of the card, with the header strip
          // above it — the compact end of the same shape.
          <Frame className="w-full">
            <Frame.Header>
              <Frame.Title>Agent monitor</Frame.Title>
              <Frame.Action>25% token limit</Frame.Action>
            </Frame.Header>
            <Frame.Panel>
              {/* `wrap` rather than a spacer: five things in one row do not fit
                  on a narrow screen, and a second line is better than a chip
                  disappearing off the edge. */}
              <Frame.Row wrap className="gap-2">
                <Chip size="sm" variant="success">
                  2 Running
                </Chip>
                <Chip size="sm">1 Idle</Chip>
                <Chip size="sm" variant="outline">
                  1 Done
                </Chip>
                <Frame.Actions className="ml-auto">
                  <Text size="xs" muted>
                    15m12s ago
                  </Text>
                </Frame.Actions>
              </Frame.Row>
            </Frame.Panel>
          </Frame>
        ),
      },
      {
        label: 'Usage summary',
        render: () => (
          <Frame className="w-full">
            <Frame.Header>
              <Frame.Title>Usage Type</Frame.Title>
              <Frame.Action>Amount</Frame.Action>
            </Frame.Header>
            <Frame.Panel>
              {[
                ['Total API Requests', '33.1K', 25],
                ['Input Tokens', '98.2M', 70],
                ['Output Tokens', '59M', 45],
                ['Total Spend', '$149.61', 85],
              ].map(([label, value, pct]) => (
                <Frame.Row key={label as string}>
                  <Frame.Media>
                    <FrameRing percent={pct as number} />
                  </Frame.Media>
                  <Frame.Content>
                    <Text numberOfLines={1}>{label}</Text>
                  </Frame.Content>
                  <Frame.Actions>
                    <Text weight="medium">{value}</Text>
                  </Frame.Actions>
                </Frame.Row>
              ))}
            </Frame.Panel>
          </Frame>
        ),
      },
      {
        label: 'Member list',
        render: () => (
          <Frame className="w-full">
            <Frame.Header>
              <Frame.Title>Team members</Frame.Title>
              <Frame.Action>
                <Badge variant="secondary">3</Badge>
              </Frame.Action>
            </Frame.Header>
            <Frame.Panel>
              {[
                ['KA', 'Khalid Abdi', 'khalid@example.com', 'Owner'],
                ['JD', 'Jamie Doe', 'jamie@example.com', 'Editor'],
                ['SM', 'Sam Miller', 'sam@example.com', 'Viewer'],
              ].map(([initials, name, email, role]) => (
                <Frame.Row key={email}>
                  <Frame.Media>
                    <Avatar size="sm" fallback={initials} />
                  </Frame.Media>
                  <Frame.Content>
                    <Frame.Title>{name}</Frame.Title>
                    <Frame.Description>{email}</Frame.Description>
                  </Frame.Content>
                  <Frame.Actions>
                    <Badge variant="outline">{role}</Badge>
                  </Frame.Actions>
                </Frame.Row>
              ))}
            </Frame.Panel>
          </Frame>
        ),
      },
      {
        label: 'Settings group',
        render: () => (
          <Frame className="w-full">
            <Frame.Header>
              <Frame.Title>Preferences</Frame.Title>
              <Frame.Action>Edit</Frame.Action>
            </Frame.Header>
            <Frame.Panel>
              {[
                ['Language', 'English'],
                ['Region', 'United States'],
                ['Time zone', 'GMT+3'],
              ].map(([label, value]) => (
                <Frame.Row key={label}>
                  <Text size="sm" className="flex-1">
                    {label}
                  </Text>
                  <Text size="sm" muted>
                    {value}
                  </Text>
                </Frame.Row>
              ))}
            </Frame.Panel>
          </Frame>
        ),
      },
      {
        label: 'A row that would not fit',
        render: () => (
          // Everything here is longer than the room it has. The slots are what
          // keep it readable: the icon and the trailing chips hold their size,
          // and the text column shrinks around them instead of pushing them
          // past the edge, where the frame would clip them away.
          <Frame className="w-full">
            <Frame.Header>
              <Frame.Title>
                Deployment history for the production environment
              </Frame.Title>
              <Frame.Action>Last 7 days</Frame.Action>
            </Frame.Header>
            <Frame.Panel>
              <Frame.Row align="start">
                <Frame.Media>
                  <Avatar size="sm" fallback="KA" />
                </Frame.Media>
                <Frame.Content>
                  <Frame.Title>
                    feat(registry): resolve relative imports through the alias table
                  </Frame.Title>
                  <Frame.Description>
                    Deployed to production from the main branch about two hours
                    ago, after the full test suite passed on every workspace.
                  </Frame.Description>
                </Frame.Content>
                <Frame.Actions>
                  <Chip size="sm" variant="success">
                    Live
                  </Chip>
                  <Chip size="sm" variant="outline">
                    2h
                  </Chip>
                </Frame.Actions>
              </Frame.Row>
              <Frame.Row align="start">
                <Frame.Media>
                  <Avatar size="sm" fallback="JD" />
                </Frame.Media>
                <Frame.Content>
                  <Frame.Title>fix(bottom-sheet): restore the bottom border</Frame.Title>
                  <Frame.Description>
                    Rolled back after an hour — the detached sheet lost its
                    bottom edge on devices without a home indicator.
                  </Frame.Description>
                </Frame.Content>
                <Frame.Actions>
                  <Chip size="sm">Rolled back</Chip>
                </Frame.Actions>
              </Frame.Row>
            </Frame.Panel>
          </Frame>
        ),
      },
      {
        label: 'Rows that lead somewhere',
        render: () => (
          <Frame className="w-full">
            <Frame.Header>
              <Frame.Title>Account</Frame.Title>
            </Frame.Header>
            <Frame.Panel>
              {/* An onPress makes the row a real pressable — press feedback and
                  a button role — and `chevron` says so before you tap it. */}
              {['Profile', 'Notifications', 'Connected apps'].map((label) => (
                <Frame.Row key={label} chevron onPress={() => {}}>
                  <Text size="sm" className="flex-1">
                    {label}
                  </Text>
                </Frame.Row>
              ))}
            </Frame.Panel>
          </Frame>
        ),
      },
      {
        label: 'Sections',
        render: () => (
          <Frame className="w-full">
            <Frame.Header>
              <Frame.Title>Workspace</Frame.Title>
              <Frame.Action>Manage</Frame.Action>
            </Frame.Header>
            <Frame.Panel>
              <Frame.Section title="General">
                <Frame.Row>
                  <Text size="sm" className="flex-1">
                    Name
                  </Text>
                  <Text size="sm" muted>
                    Acme
                  </Text>
                </Frame.Row>
                <Frame.Row>
                  <Text size="sm" className="flex-1">
                    Plan
                  </Text>
                  <Badge variant="secondary">Pro</Badge>
                </Frame.Row>
              </Frame.Section>
              <Frame.Section title="Danger zone">
                <Frame.Row chevron onPress={() => {}}>
                  <Text size="sm" className="flex-1 text-destructive">
                    Delete workspace
                  </Text>
                </Frame.Row>
              </Frame.Section>
            </Frame.Panel>
          </Frame>
        ),
      },
      {
        label: 'Plain, inside a card',
        render: () => (
          // The card already draws a border; the default shell would put a
          // second edge just inside it.
          <Card className="w-full">
            <Card.Content className="p-4">
              <Frame variant="plain">
                <Frame.Panel>
                  {[
                    ['Requests', '12.4K'],
                    ['Errors', '38'],
                  ].map(([label, value]) => (
                    <Frame.Row key={label}>
                      <Text size="sm" className="flex-1">
                        {label}
                      </Text>
                      <Text size="sm" weight="medium">
                        {value}
                      </Text>
                    </Frame.Row>
                  ))}
                </Frame.Panel>
              </Frame>
            </Card.Content>
          </Card>
        ),
      },
    ],
  },
{
    slug: 'heatmap-chart',
    name: 'HeatmapChart',
    summary: 'Contribution grid with a themed colour ramp',
    layout: 'pager',
    demos: [
      {
        label: 'Contribution grid',
        id: 'contribution',
        fullPage: true,
        description:
          'A full year, scrolled sideways. Hold to read a day — a swipe scrolls instead.',
        render: () => <HeatmapContributionVersion />,
      },
      {
        label: 'Filling the width',
        id: 'fill',
        fullPage: true,
        description: 'A quarter with the cells sized to the space they are given.',
        render: () => <HeatmapFillVersion />,
      },
      {
        label: 'Quarters',
        id: 'quarters',
        fullPage: true,
        description: 'Rules grouping the columns, and a ramp off a colour of your own.',
        render: () => <HeatmapQuartersVersion />,
      },
      {
        label: 'Punchcard',
        id: 'punchcard',
        fullPage: true,
        description: 'Rows that are hours rather than days — when the week actually lands.',
        render: () => <HeatmapPunchcardVersion />,
      },
    ],
  }
];
export const ENTRIES_BY_SLUG = Object.fromEntries(ENTRIES.map((entry) => [entry.slug, entry]));
