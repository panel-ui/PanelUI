import { useState } from "react";
import { View } from "react-native";
import { Button, Card, Compare, Frame, SankeyChart, type SankeyLink, type SankeyNode, Text } from "panelui-native";
import type { ComponentEntry } from '../component-types';

/* -------------------------------------------------------------------------- */
/* SankeyChart                                                                */
/* -------------------------------------------------------------------------- */

const TRAFFIC_NODES: SankeyNode[] = [
  { id: 'search', label: 'Search' },
  { id: 'social', label: 'Social' },
  { id: 'direct', label: 'Direct' },
  { id: 'signup', label: 'Signed up' },
  { id: 'browse', label: 'Browsed' },
  { id: 'left', label: 'Left' },
];

const TRAFFIC_LINKS: SankeyLink[] = [
  { source: 'search', target: 'signup', value: 5200 },
  { source: 'search', target: 'browse', value: 12400 },
  { source: 'social', target: 'browse', value: 8100 },
  { source: 'social', target: 'left', value: 9600 },
  { source: 'direct', target: 'signup', value: 3100 },
  { source: 'direct', target: 'left', value: 2800 },
];

const BUDGET_NODES: SankeyNode[] = [
  { id: 'revenue', label: 'Revenue' },
  { id: 'grants', label: 'Grants' },
  { id: 'product', label: 'Product' },
  { id: 'sales', label: 'Sales' },
  { id: 'ops', label: 'Ops' },
  { id: 'salaries', label: 'Salaries' },
  { id: 'tooling', label: 'Tooling' },
  { id: 'travel', label: 'Travel' },
];

const BUDGET_LINKS: SankeyLink[] = [
  { source: 'revenue', target: 'product', value: 480 },
  { source: 'revenue', target: 'sales', value: 260 },
  { source: 'revenue', target: 'ops', value: 140 },
  { source: 'grants', target: 'product', value: 120 },
  { source: 'grants', target: 'ops', value: 60 },
  { source: 'product', target: 'salaries', value: 430 },
  { source: 'product', target: 'tooling', value: 170 },
  { source: 'sales', target: 'salaries', value: 180 },
  { source: 'sales', target: 'travel', value: 80 },
  { source: 'ops', target: 'salaries', value: 130 },
  { source: 'ops', target: 'tooling', value: 70 },
];

/*
 * A flow with one stage that genuinely stops early: `reserve` takes money out
 * of revenue and sends it nowhere. It is the only node `align` can move, and
 * without one in the data the two settings draw the same picture — which is a
 * demonstration of nothing.
 */
const ALIGN_NODES: SankeyNode[] = [
  { id: 'revenue', label: 'Revenue' },
  { id: 'grants', label: 'Grants' },
  { id: 'reserve', label: 'Reserve' },
  { id: 'product', label: 'Product' },
  { id: 'ops', label: 'Ops' },
  { id: 'salaries', label: 'Salaries' },
  { id: 'tooling', label: 'Tooling' },
];

const ALIGN_LINKS: SankeyLink[] = [
  { source: 'revenue', target: 'reserve', value: 180 },
  { source: 'revenue', target: 'product', value: 420 },
  { source: 'revenue', target: 'ops', value: 160 },
  { source: 'grants', target: 'product', value: 120 },
  { source: 'grants', target: 'ops', value: 70 },
  { source: 'product', target: 'salaries', value: 390 },
  { source: 'product', target: 'tooling', value: 150 },
  { source: 'ops', target: 'salaries', value: 150 },
  { source: 'ops', target: 'tooling', value: 80 },
];

function SankeyBasicVersion() {
  return (
    <View className="flex-1 justify-center p-4">
      <Frame className="w-full">
        <Frame.Header>
          <Frame.Title>Where sessions went</Frame.Title>
          <Frame.Action>Tap a name</Frame.Action>
        </Frame.Header>
        <Frame.Panel>
          <SankeyChart
            nodes={TRAFFIC_NODES}
            links={TRAFFIC_LINKS}
            height={280}
            className="px-3 pb-4 pt-3"
          >
            <SankeyChart.Header title="Sessions" value="41,200" caption="Last 7 days" />
            <SankeyChart.Links />
            <SankeyChart.Nodes />
            <SankeyChart.Labels />
            <SankeyChart.Tooltip />
          </SankeyChart>
        </Frame.Panel>
      </Frame>
    </View>
  );
}

function SankeyStagesVersion() {
  return (
    <View className="flex-1 justify-center p-4">
      <Frame className="w-full">
        <Frame.Header>
          <Frame.Title>Three columns</Frame.Title>
          <Frame.Action>£m</Frame.Action>
        </Frame.Header>
        <Frame.Panel>
          <SankeyChart
            nodes={BUDGET_NODES}
            links={BUDGET_LINKS}
            height={340}
            className="px-3 pb-4 pt-3"
          >
            <SankeyChart.Header title="Budget" value="£1.06bn" caption="Income through to spend" />
            <SankeyChart.Links />
            <SankeyChart.Nodes />
            <SankeyChart.Labels />
            <SankeyChart.Tooltip />
          </SankeyChart>
        </Frame.Panel>
      </Frame>
    </View>
  );
}

function SankeyAlignVersion() {
  const [align, setAlign] = useState<'justify' | 'left'>('justify');

  return (
    <View className="flex-1 justify-center gap-3 p-4">
      <Frame className="w-full">
        <Frame.Header>
          <Frame.Title>Where the endings sit</Frame.Title>
          <Frame.Action>{align}</Frame.Action>
        </Frame.Header>
        <Frame.Panel>
          <SankeyChart
            nodes={ALIGN_NODES}
            links={ALIGN_LINKS}
            align={align}
            height={320}
            className="px-3 pb-4 pt-3"
          >
            <SankeyChart.Links />
            <SankeyChart.Nodes />
            <SankeyChart.Labels />
          </SankeyChart>
        </Frame.Panel>
      </Frame>
      <View className="flex-row gap-2">
        <Button
          variant={align === 'justify' ? 'primary' : 'outline'}
          onPress={() => setAlign('justify')}
          className="flex-1"
        >
          justify
        </Button>
        <Button
          variant={align === 'left' ? 'primary' : 'outline'}
          onPress={() => setAlign('left')}
          className="flex-1"
        >
          left
        </Button>
      </View>
      <Text size="xs" muted>
        `justify` pushes everything that feeds nothing into the last column, so `Reserve` is drawn
        against the far edge as though it had gone the distance. `left` leaves it in the column it
        actually stopped in.
      </Text>
    </View>
  );
}

function SankeyLoadingVersion() {
  const [loaded, setLoaded] = useState(false);

  return (
    <View className="flex-1 justify-center gap-3 p-4">
      <Frame className="w-full">
        <Frame.Header>
          <Frame.Title>Waiting for the rows</Frame.Title>
        </Frame.Header>
        <Frame.Panel>
          <SankeyChart
            nodes={loaded ? TRAFFIC_NODES : []}
            links={loaded ? TRAFFIC_LINKS : []}
            status={loaded ? 'ready' : 'loading'}
            height={280}
            className="px-3 pb-4 pt-3"
          >
            <SankeyChart.Skeleton />
            <SankeyChart.Links />
            <SankeyChart.Nodes />
            <SankeyChart.Labels />
          </SankeyChart>
        </Frame.Panel>
      </Frame>
      <Button variant="outline" onPress={() => setLoaded((value) => !value)}>
        {loaded ? 'Back to loading' : 'Land the data'}
      </Button>
    </View>
  );
}

function SankeyDroppedDemo() {
  const [dropped, setDropped] = useState(0);

  // Three rows that cannot be drawn: one names a node that is not there, one
  // carries nothing, and one closes a loop.
  const messy: SankeyLink[] = [
    ...TRAFFIC_LINKS,
    { source: 'search', target: 'ghost', value: 400 },
    { source: 'social', target: 'signup', value: 0 },
    { source: 'browse', target: 'search', value: 900 },
  ];

  return (
    <Card className="w-full">
      <Card.Content className="gap-3 p-4">
        <SankeyChart nodes={TRAFFIC_NODES} links={messy} height={220} onDropLinks={setDropped}>
          <SankeyChart.Links />
          <SankeyChart.Nodes />
          <SankeyChart.Labels />
        </SankeyChart>
        <Text size="xs" muted>
          {dropped > 0
            ? `${dropped} rows could not be drawn — the rest is still true.`
            : 'Every row was drawn.'}
        </Text>
      </Card.Content>
    </Card>
  );
}

function SankeyCurveDemo() {
  const [straight, setStraight] = useState(false);

  return (
    <Card className="w-full">
      <Card.Content className="gap-3 p-4">
        <SankeyChart
          nodes={TRAFFIC_NODES}
          links={TRAFFIC_LINKS}
          height={220}
          curve={straight ? 0 : 0.5}
        >
          <SankeyChart.Links />
          <SankeyChart.Nodes />
          <SankeyChart.Labels />
        </SankeyChart>
        <Button variant="outline" size="sm" onPress={() => setStraight((value) => !value)}>
          {straight ? 'Curved ribbons' : 'Straight ribbons'}
        </Button>
      </Card.Content>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* Compare                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * One scene at two colour grades.
 *
 * The example app ships no image pairs, and a pair downloaded at runtime would
 * make the demo depend on the network to show anything at all — so the scene is
 * drawn from views. What matters is that both grades put every shape in exactly
 * the same place and change only its colour: that is the difference spread
 * across a whole frame that this component exists for, and it is the one a pair
 * of thumbnails side by side cannot carry.
 *
 * Nothing here is text. Two captions centred in the same box would meet at the
 * seam and overlap into a smear, which reads as the component being broken
 * rather than as two versions of a picture.
 */
const GRADES = {
  before: { sky: '#8794a3', sun: '#c9cdd2', far: '#6b7684', near: '#4a545f', field: '#39414a' },
  after: { sky: '#f2a65a', sun: '#ffe9b0', far: '#b9683f', near: '#7d3f34', field: '#43231f' },
} as const;

function CompareScene({ grade }: { grade: keyof typeof GRADES }) {
  const tone = GRADES[grade];

  /*
   * Bands that run the full width, so every edge in the picture crosses the
   * seam. Wherever the reader puts it, the same horizon lines up on both sides
   * and only the colour changes — which is what makes it read as one picture
   * graded twice rather than as two pictures side by side.
   */
  return (
    <View style={{ flex: 1, backgroundColor: tone.sky, overflow: 'hidden' }}>
      <View
        style={{
          position: 'absolute',
          top: '16%',
          left: '42%',
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: tone.sun,
        }}
      />
      <View
        style={{ position: 'absolute', left: 0, right: 0, top: '46%', bottom: '36%', backgroundColor: tone.far }}
      />
      <View
        style={{ position: 'absolute', left: 0, right: 0, top: '64%', bottom: '22%', backgroundColor: tone.near }}
      />
      <View
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '22%', backgroundColor: tone.field }}
      />
    </View>
  );
}

function CompareBasicVersion() {
  return (
    <View className="flex-1 justify-center p-4">
      <Frame className="w-full">
        <Frame.Header>
          <Frame.Title>Drag the seam</Frame.Title>
          <Frame.Action>Anywhere</Frame.Action>
        </Frame.Header>
        <Frame.Panel className="p-4">
          <Compare height={280}>
            <Compare.After>
              <CompareScene grade="after" />
            </Compare.After>
            <Compare.Before>
              <CompareScene grade="before" />
            </Compare.Before>
            <Compare.Handle />
            <Compare.Label side="start">Before</Compare.Label>
            <Compare.Label side="end">After</Compare.Label>
          </Compare>
        </Frame.Panel>
      </Frame>
    </View>
  );
}

function CompareControlledVersion() {
  const [split, setSplit] = useState(0.5);

  return (
    <View className="flex-1 justify-center gap-3 p-4">
      <Frame className="w-full">
        <Frame.Header>
          <Frame.Title>Driven from outside</Frame.Title>
          <Frame.Action>{`${Math.round(split * 100)}%`}</Frame.Action>
        </Frame.Header>
        <Frame.Panel className="p-4">
          <Compare height={260} value={split} onValueChange={setSplit}>
            <Compare.After>
              <CompareScene grade="after" />
            </Compare.After>
            <Compare.Before>
              <CompareScene grade="before" />
            </Compare.Before>
            <Compare.Handle />
          <Compare.Label side="start">Before</Compare.Label>
          <Compare.Label side="end">After</Compare.Label>
          </Compare>
        </Frame.Panel>
      </Frame>
      <View className="flex-row gap-2">
        <Button variant="outline" onPress={() => setSplit(0)} className="flex-1">
          After
        </Button>
        <Button variant="outline" onPress={() => setSplit(0.5)} className="flex-1">
          Half
        </Button>
        <Button variant="outline" onPress={() => setSplit(1)} className="flex-1">
          Before
        </Button>
      </View>
    </View>
  );
}

function CompareVerticalDemo() {
  return (
    <Card className="w-full">
      <Card.Content className="p-4">
        <Compare height={180} orientation="vertical">
          <Compare.After>
            <CompareScene grade="after" />
          </Compare.After>
          <Compare.Before>
            <CompareScene grade="before" />
          </Compare.Before>
          <Compare.Handle />
          <Compare.Label side="start">Before</Compare.Label>
          <Compare.Label side="end">After</Compare.Label>
        </Compare>
      </Card.Content>
    </Card>
  );
}

function CompareStartDemo() {
  return (
    <Card className="w-full">
      <Card.Content className="p-4">
        <Compare height={180} defaultValue={0.15}>
          <Compare.After>
            <CompareScene grade="after" />
          </Compare.After>
          <Compare.Before>
            <CompareScene grade="before" />
          </Compare.Before>
          <Compare.Handle />
          <Compare.Label side="start">Before</Compare.Label>
          <Compare.Label side="end">After</Compare.Label>
        </Compare>
      </Card.Content>
    </Card>
  );
}

function CompareFrozenDemo() {
  return (
    <Card className="w-full">
      <Card.Content className="gap-3 p-4">
        <Compare height={160} defaultValue={0.5} disabled>
          <Compare.After>
            <CompareScene grade="after" />
          </Compare.After>
          <Compare.Before>
            <CompareScene grade="before" />
          </Compare.Before>
          <Compare.Handle />
          <Compare.Label side="start">Before</Compare.Label>
          <Compare.Label side="end">After</Compare.Label>
        </Compare>
        <Text size="xs" muted>
          `disabled` freezes the seam and takes it out of the accessibility tree.
        </Text>
      </Card.Content>
    </Card>
  );
}

export const ENTRIES: ComponentEntry[] = [
  {
    slug: 'sankey-chart',
    name: 'SankeyChart',
    summary: 'Where a quantity came from and where it ended up',
    layout: 'pager',
    demos: [
      {
        label: 'Basic',
        id: 'basic',
        fullPage: true,
        description:
          'Three sources and what the sessions from each of them went on to do. Tap a name to keep its ribbons and fade the rest.',
        render: () => <SankeyBasicVersion />,
      },
      {
        label: 'Through a middle column',
        id: 'stages',
        fullPage: true,
        description:
          'Income into teams into what the teams spent it on. The middle column is both a destination and a source, and its height is what passes through it.',
        render: () => <SankeyStagesVersion />,
      },
      {
        label: 'Where the endings sit',
        id: 'align',
        fullPage: true,
        description:
          'The same flow under `justify` and `left`. Only the nodes the flow leaves a choice about move.',
        render: () => <SankeyAlignVersion />,
      },
      {
        label: 'Waiting for the rows',
        id: 'loading',
        fullPage: true,
        description:
          'The placeholder dissolves under the real diagram growing across it, so the card never has a blank frame in the middle of it.',
        render: () => <SankeyLoadingVersion />,
      },
      { label: 'Rows that cannot be drawn', render: () => <SankeyDroppedDemo /> },
      { label: 'How far the ribbons bend', render: () => <SankeyCurveDemo /> },
    ],
  },
  {
    slug: 'compare',
    name: 'Compare',
    summary: 'Two versions of one picture, with a seam you drag across it',
    layout: 'pager',
    demos: [
      {
        label: 'Basic',
        id: 'basic',
        fullPage: true,
        description:
          'Drag anywhere on the frame, not just the knob. The two sides stay in place under the seam rather than scaling with it.',
        render: () => <CompareBasicVersion />,
      },
      {
        label: 'Driven from outside',
        id: 'controlled',
        fullPage: true,
        description:
          'A controlled seam. The buttons set it, dragging still moves it, and the prop stands back while a finger is down.',
        render: () => <CompareControlledVersion />,
      },
      { label: 'A seam that runs the other way', render: () => <CompareVerticalDemo /> },
      { label: 'Where the seam starts', render: () => <CompareStartDemo /> },
      { label: 'Frozen', render: () => <CompareFrozenDemo /> },
    ],
  },
];
export const ENTRIES_BY_SLUG = Object.fromEntries(ENTRIES.map((entry) => [entry.slug, entry]));
