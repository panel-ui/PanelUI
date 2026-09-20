import { useState } from "react";
import { View } from "react-native";
import { Button, Card, Frame, SankeyChart, type SankeyLink, type SankeyNode, Text } from "panelui-native";
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
            nodes={BUDGET_NODES}
            links={BUDGET_LINKS}
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
        `justify` pushes everything that feeds nothing into the last column. `left` lets a node
        that stops early be drawn where it stopped.
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
];
export const ENTRIES_BY_SLUG = Object.fromEntries(ENTRIES.map((entry) => [entry.slug, entry]));
