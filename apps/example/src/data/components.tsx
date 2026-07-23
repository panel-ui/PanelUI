/**
 * The component catalogue — the single source of truth for the showcase.
 *
 * Both the list screen and the detail screen read from here, and the home
 * screen derives its counts from it, so adding a component means adding one
 * entry and nothing else.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedKeyboard,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Image,
  Pressable,
  ScrollView,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  Accordion,
  Alert,
  AppleIcon,
  Attachment,
  Avatar,
  Badge,
  BellIcon,
  BottomSheet,
  Button,
  Card,
  CardIcon,
  CheckIcon,
  Checkbox,
  ChevronRightIcon,
  Chip,
  Dialog,
  Direction,
  EmptyState,
  FacebookIcon,
  FileIcon,
  Frame,
  GoogleIcon,
  HeatmapChart,
  type HeatmapCell,
  buildHeatmapCalendar,
  InfoIcon,
  Input,
  InputGroup,
  ImageIcon,
  Item,
  KeyboardAvoider,
  Label,
  LineChart,
  type LineChartHandle,
  Marker,
  Message,
  MessageScroller,
  MicIcon,
  PackageIcon,
  PauseIcon,
  PlayIcon,
  PlusSquareIcon,
  Popover,
  Progress,
  RadioGroup,
  ReceiptIcon,
  SearchIcon,
  SendIcon,
  ShareNodesIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  Select,
  ScrollCanvas,
  ScrollFade,
  ScrollProgress,
  ScrollText,
  SectionRail,
  Separator,
  Shimmer,
  Skeleton,
  Slider,
  Soundwave,
  Spinner,
  Steps,
  Surface,
  Switch,
  Tabs,
  Text,
  ThinkingOrb,
  XIcon,
  Timeline,
  Toast,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  hasNativeUI,
  useDirection,
  useIconColor,
  useScrollSections,
  useToast,
} from 'panelui-native';
import { useCSSVariable } from 'uniwind';
import {
  formatClock,
  useVoiceRecorder,
  VoiceControls,
} from '../components/voice';

const PHOTO = 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&q=60';

/** Stable remote portraits for the Avatar demos. */
const AVATARS = [
  'https://i.pravatar.cc/150?img=12',
  'https://i.pravatar.cc/150?img=32',
  'https://i.pravatar.cc/150?img=47',
];

export interface Demo {
  /** Label shown in the variant picker. */
  label: string;
  render: () => ReactNode;
  /**
   * Render on a screen of its own instead of inline, reached through a row on
   * the component's page. For anything whose behaviour only shows at full
   * height — a transcript, a scroller, an editor. Requires `id`.
   */
  fullPage?: boolean;
  /** URL segment for a `fullPage` demo: `/components/<slug>/<id>`. */
  id?: string;
  /** One line under the label on the row that opens a `fullPage` demo. */
  description?: string;
}

export interface ComponentEntry {
  slug: string;
  name: string;
  /** One-line summary, shown under the name in the list. */
  summary: string;
  demos: Demo[];
}

/* -------------------------------------------------------------------------- */
/* Stateful demo wrappers                                                     */
/* -------------------------------------------------------------------------- */

function SwitchDemo() {
  const [enabled, setEnabled] = useState(true);
  const [push, setPush] = useState(false);

  return (
    <Card className="w-full">
      <Card.Content className="gap-5 p-4">
        <View className="flex-row items-center justify-between gap-4">
          <View className="flex-1">
            <Text weight="medium">Email notifications</Text>
            <Text size="sm" muted>
              Receive updates and newsletters
            </Text>
          </View>
          <Switch value={enabled} onValueChange={setEnabled} />
        </View>
        <View className="flex-row items-center justify-between gap-4">
          <View className="flex-1">
            <Text weight="medium">Push notifications</Text>
            <Text size="sm" muted>
              Get instant alerts on your device
            </Text>
          </View>
          <Switch value={push} onValueChange={setPush} />
        </View>
      </Card.Content>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* LineChart                                                                  */
/* -------------------------------------------------------------------------- */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Monthly revenue, a rising series with some wobble. */
const REVENUE = MONTHS.map((month, index) => ({
  month,
  revenue: [4200, 5800, 4900, 7100, 6100, 8300, 7800, 9500, 8900, 10400, 9900, 11600][index]!,
  target: [4400, 5100, 5800, 6500, 7200, 7900, 8300, 8800, 9200, 9700, 10100, 10600][index]!,
}));

/** Four traffic sources, orders of magnitude apart, sharing one axis. */
const TRAFFIC = MONTHS.map((month, index) => ({
  month,
  organic: [2100, 3400, 5200, 6100, 7300, 9800, 8900, 12400, 11800, 14200, 15600, 15100][index]!,
  paid: [1200, 2400, 3100, 4200, 4800, 5600, 6100, 7200, 7800, 8900, 9600, 9500][index]!,
  referral: [800, 1400, 1900, 2600, 3100, 3400, 3900, 4200, 4600, 4900, 5100, 5100][index]!,
  social: [600, 1100, 1500, 2100, 2400, 2600, 2900, 3200, 3400, 3700, 3900, 3800][index]!,
}));

/** Two sources for the basic linear example. */
const SESSIONS = MONTHS.map((month, index) => ({
  month,
  organic: [2000, 15000, 8000, 14000, 8000, 18000, 18000, 20000, 17000, 21000, 18000, 15000][index]!,
  paid: [1000, 10000, 8000, 15000, 8000, 12000, 11500, 5000, 15000, 10000, 18000, 9000][index]!,
}));

const RANGES: Record<string, { balance: number; delta: number; data: { t: string; v: number }[] }> = {
  '1D': { balance: 24801, delta: 1.2, data: spark([120, 118, 124, 121, 128, 126, 132, 130, 138]) },
  '1W': { balance: 24801, delta: 3.4, data: spark([90, 95, 92, 101, 108, 104, 118, 124, 132]) },
  '1M': { balance: 24801, delta: 5.32, data: spark([60, 66, 62, 78, 84, 80, 96, 104, 138]) },
  '1Y': { balance: 24801, delta: 42.8, data: spark([20, 34, 41, 55, 61, 78, 92, 110, 138]) },
};

function spark(values: number[]): { t: string; v: number }[] {
  return values.map((v, index) => ({ t: String(index), v }));
}

/** Centers a version's chart card in the screen, matching the reference shots. */
function ChartScreen({ children }: { children: ReactNode }) {
  return <View className="flex-1 justify-center px-4">{children}</View>;
}

/** A KPI stat card: number and delta on the left, a sparkline on the right. */
function KpiCard({
  label,
  value,
  delta,
  data,
  colorIndex,
}: {
  label: string;
  value: string;
  delta: string;
  data: { t: string; v: number }[];
  colorIndex: 1 | 2 | 3;
}) {
  const up = !delta.startsWith('-');
  return (
    <Surface variant="secondary" padding="lg" className="w-full flex-row items-center gap-4">
      <View className="flex-1">
        <Text size="sm" muted>
          {label}
        </Text>
        <Text size="2xl" weight="bold" className="mt-1">
          {value}
        </Text>
        <Text size="sm" className={up ? 'mt-1 text-success' : 'mt-1 text-destructive'}>
          {delta}
        </Text>
      </View>
      <View className="h-14 w-32">
        <LineChart data={data} xDataKey="t" compact aspectRatio={2.3}>
          <LineChart.Line dataKey="v" colorIndex={colorIndex} strokeWidth={2} />
        </LineChart>
      </View>
    </Surface>
  );
}

/* --- Versions ------------------------------------------------------------- */

function ChartBasicVersion() {
  return (
    <ChartScreen>
      <Frame className="w-full">
        <Frame.Header>
          <Frame.Title>Traffic Source</Frame.Title>
          <Frame.Action>Last 12 months</Frame.Action>
        </Frame.Header>
        <Frame.Panel>
          <ChartStat value="292,000" caption="Sessions">
            <LegendDot colorIndex={1} label="Organic" />
            <LegendDot colorIndex={2} label="Paid Ads" />
          </ChartStat>
          <LineChart data={SESSIONS} xDataKey="month" curve="linear" aspectRatio={1.7}>
            <LineChart.Grid />
            <LineChart.Line dataKey="organic" colorIndex={1} />
            <LineChart.Line dataKey="paid" colorIndex={2} />
            <LineChart.XAxis ticks={5} />
            <LineChart.Tooltip
              formatValue={(v) => v.toLocaleString()}
              formatX={(d) => String(d.month)}
            />
          </LineChart>
        </Frame.Panel>
      </Frame>
    </ChartScreen>
  );
}

function ChartDotsVersion() {
  return (
    <ChartScreen>
      <Frame className="w-full">
        <Frame.Header>
          <Frame.Title>Monthly Revenue</Frame.Title>
        </Frame.Header>
        <Frame.Panel>
          <LineChart data={REVENUE} xDataKey="month" aspectRatio={1.7}>
            <LineChart.Grid />
            <LineChart.Line dataKey="revenue" showMarkers />
            <LineChart.XAxis ticks={5} />
            <LineChart.Tooltip formatValue={(v) => `$${(v / 1000).toFixed(1)}k`} />
          </LineChart>
        </Frame.Panel>
      </Frame>
    </ChartScreen>
  );
}

function ChartCrosshairVersion() {
  return (
    <ChartScreen>
      <Frame className="w-full">
        <Frame.Header>
          <Frame.Title>Monthly Revenue</Frame.Title>
          <Frame.Action>Drag to inspect</Frame.Action>
        </Frame.Header>
        <Frame.Panel>
          <ChartStat value="$317,904" caption="Last 12 months" />
          <LineChart data={REVENUE} xDataKey="month" aspectRatio={1.7}>
            <LineChart.Grid />
            <LineChart.Area dataKey="revenue" />
            <LineChart.Line dataKey="revenue" />
            <LineChart.XAxis ticks={5} />
            <LineChart.Tooltip formatValue={(v) => `$${v.toLocaleString()}`} />
          </LineChart>
        </Frame.Panel>
      </Frame>
    </ChartScreen>
  );
}

function ChartAnimatedVersion() {
  const chart = useRef<LineChartHandle>(null);

  return (
    <ChartScreen>
      <Frame className="w-full">
        <Frame.Header>
          <Frame.Title>Monthly Revenue</Frame.Title>
          <Frame.Action>
            <Button variant="ghost" size="sm" onPress={() => chart.current?.replay()}>
              Replay
            </Button>
          </Frame.Action>
        </Frame.Header>
        <Frame.Panel>
          <LineChart ref={chart} data={REVENUE} xDataKey="month" aspectRatio={1.7}>
            <LineChart.Grid />
            <LineChart.Area dataKey="revenue" />
            <LineChart.Line dataKey="revenue" />
            <LineChart.XAxis ticks={5} />
            <LineChart.Tooltip formatValue={(v) => `$${v.toLocaleString()}`} />
          </LineChart>
        </Frame.Panel>
      </Frame>
    </ChartScreen>
  );
}

function ChartFinanceVersion() {
  const [range, setRange] = useState('1M');
  const current = RANGES[range]!;
  const up = current.delta >= 0;

  return (
    <ChartScreen>
      <Frame className="w-full">
        <Frame.Header>
          <Frame.Title>Total balance</Frame.Title>
          <Frame.Action>{range}</Frame.Action>
        </Frame.Header>
        <Frame.Panel>
          {/* The delta rides beside the number rather than under it — three
              stacked lines is what made this header a wall of text. */}
          <ChartStat value={`$${current.balance.toLocaleString()}.32`}>
            <Text size="sm" className={up ? 'text-success' : 'text-destructive'}>
              {up ? '+' : ''}
              {current.delta}% this {range === '1D' ? 'day' : range === '1W' ? 'week' : 'period'}
            </Text>
          </ChartStat>
          <View className="gap-3 px-3 pb-3">
            <LineChart data={current.data} xDataKey="t" aspectRatio={1.9}>
              <LineChart.Grid rows={3} dashArray="" opacity={0.4} />
              <LineChart.Area dataKey="v" />
              <LineChart.Line dataKey="v" />
            </LineChart>
            <Tabs value={range} defaultValue={range} onValueChange={setRange}>
              <Tabs.List>
                {Object.keys(RANGES).map((key) => (
                  <Tabs.Trigger key={key} value={key}>
                    {key}
                  </Tabs.Trigger>
                ))}
              </Tabs.List>
            </Tabs>
          </View>
        </Frame.Panel>
      </Frame>
    </ChartScreen>
  );
}

function ChartDashedVersion() {
  return (
    <ChartScreen>
      <Frame className="w-full">
        <Frame.Header>
          <Frame.Title>Actual vs Target</Frame.Title>
          <Frame.Action>2026</Frame.Action>
        </Frame.Header>
        <Frame.Panel>
          <ChartLegendRow>
            <LegendDot colorIndex={1} label="Actual" />
            <View className="flex-row items-center gap-1.5">
              <View className="h-0.5 w-4 rounded-full bg-muted-foreground" />
              <Text size="xs" muted>
                Target
              </Text>
            </View>
          </ChartLegendRow>
          <LineChart data={REVENUE} xDataKey="month" aspectRatio={1.7}>
            <LineChart.Grid />
            <LineChart.Line dataKey="revenue" colorIndex={1} />
            <LineChart.Line dataKey="target" colorIndex={2} dashArray="6,5" />
            <LineChart.XAxis ticks={5} />
            <LineChart.Tooltip formatValue={(v) => `$${(v / 1000).toFixed(1)}k`} />
          </LineChart>
        </Frame.Panel>
      </Frame>
    </ChartScreen>
  );
}

function ChartMultiVersion() {
  return (
    <ChartScreen>
      <Frame className="w-full">
        <Frame.Header>
          <Frame.Title>Traffic Sources</Frame.Title>
          <Frame.Action>Last 12 months</Frame.Action>
        </Frame.Header>
        <Frame.Panel>
          {/* Four keys wrap onto two rows on a narrow phone. In the header
              strip that pushed the chart down the card; in the panel it is
              simply part of the content. */}
          <ChartLegendRow>
            <LegendDot colorIndex={1} label="Organic" />
            <LegendDot colorIndex={2} label="Paid Ads" />
            <LegendDot colorIndex={3} label="Referral" />
            <LegendDot colorIndex={4} label="Social" />
          </ChartLegendRow>
          <LineChart data={TRAFFIC} xDataKey="month" aspectRatio={1.7}>
            <LineChart.Grid />
            <LineChart.Line dataKey="organic" colorIndex={1} />
            <LineChart.Line dataKey="paid" colorIndex={2} />
            <LineChart.Line dataKey="referral" colorIndex={3} />
            <LineChart.Line dataKey="social" colorIndex={4} />
            <LineChart.XAxis ticks={5} />
            <LineChart.Tooltip formatValue={(v) => `${(v / 1000).toFixed(1)}k`} />
          </LineChart>
        </Frame.Panel>
      </Frame>
    </ChartScreen>
  );
}

function ChartKpiVersion() {
  return (
    <ChartScreen>
      <View className="w-full gap-3">
        <KpiCard
          label="Total Revenue"
          value="$317,904"
          delta="+7.8% last 30d"
          colorIndex={1}
          data={spark([36, 39, 47, 44, 55, 63, 61, 76, 88])}
        />
        <KpiCard
          label="Bounce Rate"
          value="37.6%"
          delta="-8.4% vs last 7d"
          colorIndex={3}
          data={spark([88, 85, 73, 76, 64, 59, 61, 48, 39])}
        />
        <KpiCard
          label="New Customers"
          value="2,867"
          delta="+4.2% this week"
          colorIndex={2}
          data={spark([27, 35, 33, 46, 59, 55, 64, 79, 91])}
        />
      </View>
    </ChartScreen>
  );
}

/**
 * The band above a chart, inside the panel: the headline reading on the left,
 * the legend on the right.
 *
 * It sits in the card rather than in `Frame.Header` because the header is a
 * caption on the tray the card sits in — one muted line. A title, a legend, a
 * 2xl number and a subtitle all crammed into that strip is four levels of
 * hierarchy in a space that has room for one, and the number, which is the
 * thing the card is actually about, ends up the hardest part to find.
 */
function ChartStat({
  value,
  caption,
  children,
}: {
  value: string;
  caption?: string;
  children?: ReactNode;
}) {
  return (
    <View className="flex-row items-start justify-between gap-3 px-4 pb-2 pt-3.5">
      <View className="gap-0.5">
        <Text size="2xl" weight="bold">
          {value}
        </Text>
        {caption ? (
          <Text size="sm" muted>
            {caption}
          </Text>
        ) : null}
      </View>
      {children ? (
        <View className="flex-row flex-wrap items-center justify-end gap-x-3 gap-y-1 pt-1.5">
          {children}
        </View>
      ) : null}
    </View>
  );
}

/** The legend on its own, for a chart with no headline number above it. */
function ChartLegendRow({ children }: { children: ReactNode }) {
  return (
    <View className="flex-row flex-wrap items-center gap-x-3 gap-y-1 px-4 pb-1 pt-3">
      {children}
    </View>
  );
}

/** A coloured dot and a label, reading its colour from the chart token ramp. */
function LegendDot({
  colorIndex,
  label,
}: {
  colorIndex: 1 | 2 | 3 | 4;
  label: string;
}) {
  const color = useCSSVariable(`--color-chart-${colorIndex}`);
  return (
    <View className="flex-row items-center gap-1.5">
      <View
        style={{ backgroundColor: typeof color === 'string' ? color : undefined }}
        className="h-2.5 w-2.5 rounded-full"
      />
      <Text size="xs" muted>
        {label}
      </Text>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* MessageScroller — full-screen demos                                        */
/* -------------------------------------------------------------------------- */

interface Turn {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

const THREAD: Turn[] = [
  { id: 't1', role: 'user', text: 'Can you summarise last quarter?' },
  { id: 't2', role: 'assistant', text: 'Revenue was up 14% on the quarter before, driven mostly by renewals.' },
  { id: 't3', role: 'user', text: 'Which plan grew fastest?' },
  { id: 't4', role: 'assistant', text: 'Team. It roughly doubled its seat count, while Pro stayed flat.' },
  { id: 't5', role: 'user', text: 'And churn?' },
  { id: 't6', role: 'assistant', text: 'Down to 2.1% monthly, the lowest it has been all year.' },
  { id: 't7', role: 'user', text: 'What should I look at next?' },
  { id: 't8', role: 'assistant', text: 'Expansion revenue. It is the line that explains most of the growth, and it is the one nobody is tracking weekly.' },
];

/** One turn, rendered as a Message. Shared by all three scroller demos. */
function Turn({ turn }: { turn: Turn }) {
  return turn.role === 'user' ? (
    <Message align="end">
      <Message.Content>
        <Message.Bubble>
          <Message.BubbleContent>{turn.text}</Message.BubbleContent>
        </Message.Bubble>
      </Message.Content>
    </Message>
  ) : (
    <Message>
      <Message.Avatar>
        <Avatar size="sm" fallback="AI" />
      </Message.Avatar>
      <Message.Content>
        <Message.Bubble>
          <Message.BubbleContent>{turn.text}</Message.BubbleContent>
        </Message.Bubble>
      </Message.Content>
    </Message>
  );
}

const REPLY =
  'Looking at the numbers now. Expansion revenue came to $412k for the quarter, up from $290k. Most of it is seat growth inside accounts that were already on Team, which is the healthiest kind — nobody had to be sold anything twice.';

/**
 * Follow-output: the transcript pins to the bottom while the reply streams,
 * but only while the reader is already there. Scroll up mid-stream and it
 * stops chasing until the button is pressed.
 */
function StreamingTranscriptDemo() {
  const [turns, setTurns] = useState<Turn[]>(THREAD.slice(0, 4));
  const [streaming, setStreaming] = useState(false);
  const insets = useSafeAreaInsets();

  const send = () => {
    if (streaming) return;
    const askId = `ask-${Date.now()}`;
    const replyId = `reply-${Date.now()}`;
    setTurns((current) => [
      ...current,
      { id: askId, role: 'user', text: 'Break down expansion revenue.' },
      { id: replyId, role: 'assistant', text: '' },
    ]);
    setStreaming(true);

    const words = REPLY.split(' ');
    let index = 0;
    const timer = setInterval(() => {
      index += 1;
      setTurns((current) =>
        current.map((turn) =>
          turn.id === replyId ? { ...turn, text: words.slice(0, index).join(' ') } : turn
        )
      );
      if (index >= words.length) {
        clearInterval(timer);
        setStreaming(false);
      }
    }, 90);
  };

  return (
    <View className="flex-1">
      <MessageScroller autoScroll className="flex-1">
        <MessageScroller.Viewport>
          <MessageScroller.Content>
            {turns.map((turn) => (
              <MessageScroller.Item
                key={turn.id}
                messageId={turn.id}
                scrollAnchor={turn.role === 'user'}
              >
                <Turn turn={turn} />
              </MessageScroller.Item>
            ))}
            {streaming ? (
              <Marker>
                <Marker.Content shimmer>Generating…</Marker.Content>
              </Marker>
            ) : null}
          </MessageScroller.Content>
        </MessageScroller.Viewport>
        <MessageScroller.Button />
      </MessageScroller>

      {/* The full-page host reaches the screen edge, so the composer lifts
          itself clear of the home indicator. */}
      <View
        className="border-t border-border px-5 pt-3"
        style={{ paddingBottom: Math.max(insets.bottom, 12) }}
      >
        <Button onPress={send} loading={streaming} fullWidth>
          {streaming ? 'Streaming' : 'Send a message'}
        </Button>
      </View>
    </View>
  );
}

/**
 * Older turns are added above the reader. Without the correction this jumps a
 * screen backwards every time; with it the message they were reading does not
 * move at all.
 */
function HistoryTranscriptDemo() {
  const [turns, setTurns] = useState<Turn[]>(THREAD.slice(4));
  const [page, setPage] = useState(0);

  const loadOlder = () => {
    const older: Turn[] = Array.from({ length: 4 }, (_, index) => ({
      id: `old-${page}-${index}`,
      role: index % 2 === 0 ? 'user' : 'assistant',
      text:
        index % 2 === 0
          ? `An older question, ${page * 4 + index + 1} turns back.`
          : 'And the answer that went with it, long enough to take a couple of lines on a phone.',
    }));
    setTurns((current) => [...older, ...current]);
    setPage((current) => current + 1);
  };

  return (
    <MessageScroller className="flex-1" defaultScrollPosition="end">
      <MessageScroller.Viewport>
        <MessageScroller.Content>
          <View className="items-center pb-1">
            <Button variant="ghost" size="sm" onPress={loadOlder}>
              Load older messages
            </Button>
          </View>
          {turns.map((turn) => (
            <MessageScroller.Item
              key={turn.id}
              messageId={turn.id}
              scrollAnchor={turn.role === 'user'}
            >
              <Turn turn={turn} />
            </MessageScroller.Item>
          ))}
        </MessageScroller.Content>
      </MessageScroller.Viewport>
      <MessageScroller.Button />
    </MessageScroller>
  );
}

/**
 * A saved thread opens on the last turn that started something, not at the
 * bottom of whatever the reply happened to be.
 */
function SavedThreadDemo() {
  return (
    <MessageScroller className="flex-1" defaultScrollPosition="last-anchor">
      <MessageScroller.Viewport>
        <MessageScroller.Content>
          <Marker variant="separator">
            <Marker.Content>Yesterday</Marker.Content>
          </Marker>
          {THREAD.map((turn) => (
            <MessageScroller.Item
              key={turn.id}
              messageId={turn.id}
              scrollAnchor={turn.role === 'user'}
            >
              <Turn turn={turn} />
            </MessageScroller.Item>
          ))}
        </MessageScroller.Content>
      </MessageScroller.Viewport>
      <MessageScroller.Button target="start" />
    </MessageScroller>
  );
}

function AttachmentStatesDemo() {
  const states = [
    { state: 'uploading' as const, desc: 'Uploading…' },
    { state: 'processing' as const, desc: 'Processing…' },
    { state: 'error' as const, desc: 'Upload failed — tap to retry' },
    { state: 'done' as const, desc: 'PDF · 2.4 MB' },
  ];

  return (
    <View className="w-full gap-3">
      {states.map(({ state, desc }) => (
        <Attachment key={state} state={state}>
          <Attachment.Media>
            <FileIcon size={18} />
          </Attachment.Media>
          <Attachment.Content>
            <Attachment.Title>report.pdf</Attachment.Title>
            <Attachment.Description>{desc}</Attachment.Description>
          </Attachment.Content>
          <Attachment.Actions>
            <Attachment.Action accessibilityLabel={`Remove report.pdf (${state})`}>
              <XIcon size={16} />
            </Attachment.Action>
          </Attachment.Actions>
        </Attachment>
      ))}
    </View>
  );
}

function AttachmentUploadDemo() {
  const [progress, setProgress] = useState(0);
  const [running, setRunning] = useState(false);

  const start = () => {
    if (running) return;
    setRunning(true);
    setProgress(0);
    const timer = setInterval(() => {
      setProgress((current) => {
        const next = current + 0.08;
        if (next >= 1) {
          clearInterval(timer);
          setRunning(false);
          return 1;
        }
        return next;
      });
    }, 160);
  };

  const state = running ? 'uploading' : progress >= 1 ? 'done' : 'idle';

  return (
    <View className="w-full gap-3">
      <Attachment state={state} progress={progress}>
        <Attachment.Media>
          <ImageIcon size={18} />
        </Attachment.Media>
        <Attachment.Content>
          <Attachment.Title>screenshot.png</Attachment.Title>
          <Attachment.Description>
            {running
              ? `Uploading — ${Math.round(progress * 100)}%`
              : progress >= 1
                ? 'PNG · 1.1 MB'
                : 'Ready to upload'}
          </Attachment.Description>
        </Attachment.Content>
      </Attachment>

      <Button variant="outline" onPress={start} loading={running}>
        {progress >= 1 ? 'Upload again' : 'Start upload'}
      </Button>
    </View>
  );
}

function MessageLongPressDemo() {
  const [open, setOpen] = useState(false);

  return (
    <View className="w-full gap-3">
      <Text size="sm" muted className="text-center">
        Press and hold the bubble.
      </Text>

      <Message align="end" onLongPress={() => setOpen(true)}>
        <Message.Content>
          <Message.Bubble>
            <Message.BubbleContent>
              Ship it — long-press me for actions.
            </Message.BubbleContent>
          </Message.Bubble>
        </Message.Content>
      </Message>

      {/* The component only exposes the gesture; the menu is wired here. */}
      <BottomSheet open={open} onOpenChange={setOpen}>
        <BottomSheet.Content>
          <Text size="lg" weight="semibold" className="mb-3">
            Message
          </Text>
          <View className="gap-1 pb-2">
            {[
              { label: 'Copy', icon: <PlusSquareIcon size={16} /> },
              { label: 'Reply', icon: <SendIcon size={16} /> },
              { label: 'Forward', icon: <ShareNodesIcon size={16} /> },
            ].map((action) => (
              <Pressable
                key={action.label}
                accessibilityRole="menuitem"
                onPress={() => setOpen(false)}
                className="flex-row items-center gap-3 rounded-xl px-3 py-3 active:bg-accent"
              >
                {action.icon}
                <Text>{action.label}</Text>
              </Pressable>
            ))}
            <Pressable
              accessibilityRole="menuitem"
              onPress={() => setOpen(false)}
              className="flex-row items-center gap-3 rounded-xl px-3 py-3 active:bg-accent"
            >
              <XIcon size={16} />
              <Text className="text-destructive">Delete</Text>
            </Pressable>
          </View>
        </BottomSheet.Content>
      </BottomSheet>
    </View>
  );
}

function PlacementPopover({
  placement,
}: {
  placement: 'top' | 'bottom' | 'left' | 'right';
}) {
  return (
    <Popover>
      <Popover.Trigger>
        <Button variant="secondary" size="sm">
          {placement}
        </Button>
      </Popover.Trigger>
      <Popover.Content placement={placement} className="w-40">
        <Popover.Arrow />
        <Popover.Description>Opens {placement} of the trigger.</Popover.Description>
      </Popover.Content>
    </Popover>
  );
}

function PopoverFormDemo() {
  const [name, setName] = useState('Untitled board');
  const [open, setOpen] = useState(false);

  return (
    <View className="w-full py-4">
      <Popover open={open} onOpenChange={setOpen}>
        <Popover.Trigger>
          {/* A full-width trigger, because `width="trigger"` is only worth
              having when the trigger is wide enough to hold the content. */}
          <Button variant="outline" fullWidth>
            Rename board
          </Button>
        </Popover.Trigger>
        {/* The panel takes the trigger's width, so the two read as one control
            rather than as a panel floating over a button. `minWidth` is the
            floor for the day the trigger turns out narrower than the form. */}
        <Popover.Content width="trigger" minWidth={260} align="start" className="gap-3">
          <Popover.Title>Rename</Popover.Title>
          <Input
            value={name}
            onChangeText={setName}
            placeholder="Board name"
            accessibilityLabel="Board name"
            autoCorrect={false}
          />
          <View className="flex-row justify-end gap-2">
            <Popover.Close>
              <Button variant="ghost" size="sm">
                Cancel
              </Button>
            </Popover.Close>
            <Popover.Close>
              <Button size="sm">Save</Button>
            </Popover.Close>
          </View>
        </Popover.Content>
      </Popover>
    </View>
  );
}

function CheckboxDemo() {
  const [marketing, setMarketing] = useState(true);
  const [updates, setUpdates] = useState(false);

  return (
    <View className="w-full gap-5">
      <Checkbox
        checked={marketing}
        onCheckedChange={setMarketing}
        label="Marketing & promotions"
        description="Special offers and exclusive deals"
      />
      <Checkbox
        checked={updates}
        onCheckedChange={setUpdates}
        label="Product updates"
        description="News about features and releases"
      />
    </View>
  );
}

/** A filter bar: any chip can be a filter, its `selected` state doing the work. */
function ChipFilterDemo() {
  const [tags, setTags] = useState<string[]>(['design']);

  const toggle = (id: string) =>
    setTags((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );

  return (
    <View className="w-full flex-row flex-wrap justify-center gap-2">
      {['design', 'code', 'research', 'ops'].map((id) => (
        <Chip
          key={id}
          selected={tags.includes(id)}
          onPress={() => toggle(id)}
          haptics
        >
          {id}
        </Chip>
      ))}
    </View>
  );
}

/** Removable tokens: the ✕ is its own hit target, so it never fires `onPress`. */
function ChipRemovableDemo() {
  const [people, setPeople] = useState(['Ada', 'Grace', 'Alan', 'Katherine']);

  return (
    <View className="w-full flex-row flex-wrap justify-center gap-2">
      {people.map((name) => (
        <Chip
          key={name}
          variant="outline"
          onClose={() => setPeople((p) => p.filter((n) => n !== name))}
        >
          {name}
        </Chip>
      ))}
      {people.length === 0 ? (
        <Text size="sm" muted>
          Everyone removed — reopen the screen to reset.
        </Text>
      ) : null}
    </View>
  );
}

/** Floating sheet inset from every edge, rather than docked to the bottom. */
function DetachedSheetDemo() {
  return (
    <BottomSheet>
      <BottomSheet.Trigger>
        <Button variant="outline">Open detached</Button>
      </BottomSheet.Trigger>
      <BottomSheet.Content className="mx-4 mb-6 rounded-3xl border-b">
        <Text size="lg" weight="semibold" className="mb-1">
          Rate your order
        </Text>
        <Text size="sm" muted className="mb-4">
          How was the delivery?
        </Text>
        <View className="flex-row gap-2 pb-2">
          <Button variant="outline" className="flex-1">
            Bad
          </Button>
          <Button variant="outline" className="flex-1">
            Fine
          </Button>
          <Button className="flex-1">Great</Button>
        </View>
      </BottomSheet.Content>
    </BottomSheet>
  );
}

/** Near-full-screen sheet, for content that needs the room. */
function FullHeightSheetDemo() {
  const { height } = useWindowDimensions();

  return (
    <BottomSheet>
      <BottomSheet.Trigger>
        <Button variant="outline">Open full height</Button>
      </BottomSheet.Trigger>
      <BottomSheet.Content style={{ height: height * 0.9 }}>
        <Text size="lg" weight="semibold" className="mb-1">
          Terms of service
        </Text>
        <ScrollView showsVerticalScrollIndicator={false} className="mt-2">
          <View className="gap-4 pb-8">
            {Array.from({ length: 12 }, (_, index) => (
              <Text key={index} size="sm" muted>
                {index + 1}. This paragraph exists so the sheet has enough
                content to scroll, which is the point of a full-height sheet.
              </Text>
            ))}
          </View>
        </ScrollView>
      </BottomSheet.Content>
    </BottomSheet>
  );
}

/** Inputs inside a sheet, lifted clear of the keyboard. */
function FormSheetDemo() {
  const keyboard = useAnimatedKeyboard();
  const style = useAnimatedStyle(() => ({
    paddingBottom: keyboard.height.value,
  }));

  return (
    <BottomSheet>
      <BottomSheet.Trigger>
        <Button variant="outline">Open form</Button>
      </BottomSheet.Trigger>
      <BottomSheet.Content>
        <Animated.View style={style}>
          <Text size="lg" weight="semibold" className="mb-1">
            Invite a teammate
          </Text>
          <Text size="sm" muted className="mb-4">
            They will get an email with a join link.
          </Text>
          <View className="gap-3 pb-2">
            <Input label="Email" placeholder="teammate@example.com" />
            <Input label="Message" placeholder="Optional note" />
            <Button fullWidth>Send invite</Button>
          </View>
        </Animated.View>
      </BottomSheet.Content>
    </BottomSheet>
  );
}

/** A long list inside a sheet, scrolling independently of the drag gesture. */
function ScrollableSheetDemo() {
  return (
    <BottomSheet>
      <BottomSheet.Trigger>
        <Button variant="outline">Open list</Button>
      </BottomSheet.Trigger>
      <BottomSheet.Content style={{ maxHeight: 420 }}>
        <Text size="lg" weight="semibold" className="mb-3">
          Choose a country
        </Text>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View className="pb-4">
            {COUNTRIES.map((country, index) => (
              <View
                key={country}
                className={
                  index > 0
                    ? 'flex-row items-center border-t border-border py-3.5'
                    : 'flex-row items-center py-3.5'
                }
              >
                <Text className="flex-1">{country}</Text>
                <ChevronRightIcon size={16} />
              </View>
            ))}
          </View>
        </ScrollView>
      </BottomSheet.Content>
    </BottomSheet>
  );
}

const COUNTRIES = [
  'Somalia', 'Kenya', 'Ethiopia', 'Djibouti', 'Uganda', 'Tanzania',
  'Rwanda', 'Egypt', 'Morocco', 'Nigeria', 'Ghana', 'South Africa',
];

function CheckboxCardDemo() {
  const [picked, setPicked] = useState<string[]>(['pro']);
  const toggle = (id: string) =>
    setPicked((current) =>
      current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]
    );

  return (
    <View className="w-full gap-3">
      {[
        ['starter', 'Starter', 'Everything you need to begin.'],
        ['pro', 'Pro', 'Advanced analytics and priority support.'],
        ['team', 'Team', 'Shared workspaces and audit logs.'],
      ].map(([id, label, description]) => (
        <Checkbox
          key={id}
          variant="card"
          checked={picked.includes(id!)}
          onCheckedChange={() => toggle(id!)}
          label={label}
          description={description}
        />
      ))}
    </View>
  );
}

function RadioGroupDemo() {
  const [plan, setPlan] = useState('pro');

  return (
    <RadioGroup value={plan} onValueChange={setPlan} className="w-full">
      <RadioGroup.Item value="free" label="Free — $0/month" />
      <RadioGroup.Item value="pro" label="Pro — $12/month" />
      <RadioGroup.Item value="team" label="Team — $36/month" />
    </RadioGroup>
  );
}

function RadioGroupRowDemo() {
  const [size, setSize] = useState('m');
  const [billing, setBilling] = useState('monthly');

  return (
    <View className="w-full gap-6">
      <View className="gap-2">
        <Label>Size</Label>
        {/* Short labels stacked one per line read as a longer list than they
            are. A wrapping row uses the width the choices actually need. */}
        <RadioGroup
          orientation="horizontal"
          value={size}
          onValueChange={setSize}
          className="w-full"
        >
          <RadioGroup.Item value="s" label="Small" />
          <RadioGroup.Item value="m" label="Medium" />
          <RadioGroup.Item value="l" label="Large" />
          <RadioGroup.Item value="xl" label="X-Large" />
        </RadioGroup>
      </View>

      <View className="gap-2">
        <Label>Billing</Label>
        {/* Cards share the row rather than filling it. */}
        <RadioGroup
          orientation="horizontal"
          variant="card"
          value={billing}
          onValueChange={setBilling}
          className="w-full"
        >
          <RadioGroup.Item value="monthly" label="Monthly" description="$12/mo" />
          <RadioGroup.Item value="yearly" label="Yearly" description="$120/yr" />
        </RadioGroup>
      </View>
    </View>
  );
}

function RadioGroupCardDemo() {
  const [plan, setPlan] = useState('pro');

  return (
    <RadioGroup value={plan} onValueChange={setPlan} variant="card" className="w-full">
      <RadioGroup.Item
        value="starter"
        label="Starter"
        description="For a side project — one seat, community support."
      />
      <RadioGroup.Item
        value="pro"
        label="Pro"
        description="For growing teams — five seats, priority support."
      />
      <RadioGroup.Item
        value="max"
        label="Max"
        description="Everything, uncapped — unlimited seats and SSO."
      />
    </RadioGroup>
  );
}

function SelectDemo() {
  const [fruit, setFruit] = useState<string>();

  return (
    <View className="w-full gap-1.5">
      <Label>Favorite fruit</Label>
      <Select
        value={fruit}
        onValueChange={setFruit}
        placeholder="Select a fruit"
        title="Favorite fruit"
      >
        <Select.Item value="apple" label="Apple" />
        <Select.Item value="banana" label="Banana" />
        <Select.Item value="cherry" label="Cherry" />
        <Select.Item value="mango" label="Mango" />
      </Select>
    </View>
  );
}

/**
 * Wraps a native-mode demo with a note about what is actually on screen —
 * without @expo/ui installed the `native` prop is a silent no-op, which is
 * otherwise indistinguishable from it not working.
 */
function NativeDemo({ children }: { children: ReactNode }) {
  return (
    <View className="w-full gap-5">
      <Alert variant={hasNativeUI() ? 'info' : 'warning'}>
        <Alert.Content>
          <Alert.Title>
            {hasNativeUI()
              ? 'Rendering the platform control'
              : '@expo/ui not available'}
          </Alert.Title>
          <Alert.Description>
            {hasNativeUI()
              ? 'Theme tokens do not apply here — the platform draws this.'
              : 'The `native` prop is a no-op, so the styled component renders instead.'}
          </Alert.Description>
        </Alert.Content>
      </Alert>
      {/* A rule between the note and the control, so a platform button
          sitting right under the alert does not read as part of it. */}
      <Separator />
      <View className="w-full gap-4">{children}</View>
    </View>
  );
}

function NativeSliderDemo() {
  const [level, setLevel] = useState(40);

  return (
    <NativeDemo>
      <Slider
        native
        label="Brightness"
        showValue
        formatValue={(v) => `${Math.round(v)}%`}
        value={level}
        onValueChange={setLevel}
      />
      {/* The caption row is ours either way — only the control below it is
          handed to the platform. */}
      <Slider
        label="For comparison, the styled one"
        showValue
        formatValue={(v) => `${Math.round(v)}%`}
        value={level}
        onValueChange={setLevel}
      />
    </NativeDemo>
  );
}

function NativeWheelPickerDemo() {
  const [size, setSize] = useState('m');

  return (
    <NativeDemo>
      {/* `wheel` is the always-visible rotor on iOS; elsewhere it falls back
          to the compact menu. */}
      <Select native nativeAppearance="wheel" value={size} onValueChange={setSize}>
        <Select.Item value="s" label="Small" />
        <Select.Item value="m" label="Medium" />
        <Select.Item value="l" label="Large" />
        <Select.Item value="xl" label="X-Large" />
      </Select>
      <Text size="sm" muted>
        Selected: {size}
      </Text>
    </NativeDemo>
  );
}

function NativeSwitchDemo() {
  const [enabled, setEnabled] = useState(true);

  return (
    <NativeDemo>
      <Switch
        native
        label="Notifications"
        value={enabled}
        onValueChange={setEnabled}
      />
    </NativeDemo>
  );
}

function NativeSelectDemo() {
  const [fruit, setFruit] = useState('apple');

  return (
    <NativeDemo>
      <Select native value={fruit} onValueChange={setFruit}>
        <Select.Item value="apple" label="Apple" />
        <Select.Item value="banana" label="Banana" />
        <Select.Item value="cherry" label="Cherry" />
      </Select>
      <Text size="sm" muted>
        Selected: {fruit}
      </Text>
    </NativeDemo>
  );
}

function NativeBottomSheetDemo() {
  const [open, setOpen] = useState(false);

  return (
    <NativeDemo>
      <BottomSheet native snapPoints={['half']} open={open} onOpenChange={setOpen}>
        <BottomSheet.Trigger>
          <Button variant="outline" fullWidth>
            Open the platform sheet
          </Button>
        </BottomSheet.Trigger>
        <BottomSheet.Content className="gap-3">
          <Text size="lg" weight="semibold">
            Platform chrome, your content
          </Text>
          <Text size="sm" muted>
            The container, corner radius, grabber and dismiss gesture belong to
            the platform. Everything in here is still themed — and it starts at
            the top of the sheet rather than floating in the middle of it.
          </Text>
          <Item.Group className="mt-1">
            <Item size="sm">
              <Item.Content>
                <Item.Title>Detent</Item.Title>
                <Item.Description>Half height, set by snapPoints.</Item.Description>
              </Item.Content>
            </Item>
            <Item.Separator />
            <Item size="sm">
              <Item.Content>
                <Item.Title>Dismiss</Item.Title>
                <Item.Description>Swipe down, or the button below.</Item.Description>
              </Item.Content>
            </Item>
          </Item.Group>
          <Button fullWidth onPress={() => setOpen(false)}>
            Close
          </Button>
        </BottomSheet.Content>
      </BottomSheet>
    </NativeDemo>
  );
}

function RegionSelectDemo({
  presentation,
  contentWidth,
}: {
  presentation?: 'sheet' | 'inline' | 'overlay';
  contentWidth?: 'trigger' | 'content' | number;
}) {
  const [region, setRegion] = useState<string>();

  return (
    <View className="w-full gap-1.5">
      <Label>Region</Label>
      <Select
        value={region}
        onValueChange={setRegion}
        placeholder="Select a region"
        presentation={presentation}
        contentWidth={contentWidth}
      >
        <Select.Item value="us" label="United States" />
        <Select.Item value="eu" label="Europe" />
        <Select.Item value="apac" label="Asia Pacific" />
      </Select>
    </View>
  );
}

function LoadingButtonDemo() {
  const [saving, setSaving] = useState(false);

  return (
    <Button
      fullWidth
      loading={saving}
      onPress={() => {
        setSaving(true);
        setTimeout(() => setSaving(false), 1800);
      }}
    >
      {saving ? 'Saving…' : 'Save changes'}
    </Button>
  );
}

function ProgressDemo() {
  const [uploaded, setUploaded] = useState(20);

  useEffect(() => {
    const id = setInterval(() => {
      setUploaded((current) => (current >= 100 ? 0 : current + 20));
    }, 1200);
    return () => clearInterval(id);
  }, []);

  return (
    <View className="w-full gap-4">
      <Progress value={uploaded} label="Uploading" showValueLabel />
      <Progress value={uploaded} color="success" size="sm" />
      <Progress value={70} color="warning" size="lg" />
      <Progress indeterminate color="info" />
    </View>
  );
}

function SliderDemo() {
  const [volume, setVolume] = useState(40);

  return (
    <View className="w-full gap-6">
      {/* `label` + `showValue` draw the caption row, so a controlled slider
          does not have to hand-build one to display what it is set to. */}
      <Slider
        label="Volume"
        showValue
        formatValue={(v) => `${Math.round(v)}%`}
        value={volume}
        onValueChange={setVolume}
      />
      <Slider defaultValue={70} color="success" size="sm" />
      <Slider defaultValue={5} min={0} max={10} step={1} color="warning" size="lg" />
      <Slider label="Locked" showValue defaultValue={30} disabled />
    </View>
  );
}

const RAIL_SECTIONS = [
  { id: 'intro', label: 'Introduction', level: 0 },
  { id: 'install', label: 'Installation', level: 0 },
  { id: 'expo', label: 'Expo', level: 1 },
  { id: 'bare', label: 'Bare React Native', level: 1 },
  { id: 'theming', label: 'Theming', level: 0 },
  { id: 'tokens', label: 'Design tokens', level: 1 },
  { id: 'dark', label: 'Dark mode', level: 1 },
  { id: 'faq', label: 'Frequently asked', level: 0 },
];

/** Shared body for the scrolling rail demos — only the rail's corner differs. */
function SectionRailVersion({
  placement = 'right',
  align = 'center',
  haptics,
}: {
  placement?: 'left' | 'right';
  align?: 'center' | 'top' | 'bottom';
  haptics?: boolean;
}) {
  // The hook owns the offsets, the reading line and the scroll-back — and the
  // end case, where the last section's top never reaches the reading line
  // because the page runs out first.
  const sections = useScrollSections({
    ids: RAIL_SECTIONS.map((section) => section.id),
  });

  return (
    <View className="flex-1">
      <ScrollView
        ref={sections.ref}
        {...sections.scrollProps}
        contentContainerStyle={{ paddingBottom: 160 }}
      >
        {RAIL_SECTIONS.map((section) => (
          <View
            key={section.id}
            onLayout={sections.measure(section.id)}
            className="gap-3 px-6 py-10"
          >
            <Text size={section.level ? 'lg' : '2xl'} weight="semibold">
              {section.label}
            </Text>
            <Text size="sm" muted>
              Scroll and the bar for this section widens and brightens. Touch
              the rail to open the list and jump anywhere.
            </Text>
            <Skeleton className="h-24 w-full rounded-xl" />
          </View>
        ))}
      </ScrollView>

      <SectionRail
        placement={placement}
        align={align}
        haptics={haptics}
        value={sections.active}
        onValueChange={sections.scrollTo}
      >
        <SectionRail.Trigger>
          {RAIL_SECTIONS.map((section) => (
            <SectionRail.Bar key={section.id} value={section.id} level={section.level} />
          ))}
        </SectionRail.Trigger>
        <SectionRail.Content>
          {RAIL_SECTIONS.map((section) => (
            <SectionRail.Item key={section.id} value={section.id} level={section.level}>
              {section.label}
            </SectionRail.Item>
          ))}
        </SectionRail.Content>
      </SectionRail>
    </View>
  );
}

const PAGER_SECTIONS = [
  { id: 'welcome', label: 'Welcome', body: 'Swipe up to move through the deck.' },
  { id: 'tokens', label: 'Tokens', body: 'Every colour and radius comes from the theme.' },
  { id: 'motion', label: 'Motion', body: 'Animations run on the UI thread, never on JS.' },
  { id: 'native', label: 'Native', body: 'Some controls hand off to the platform entirely.' },
  { id: 'ship', label: 'Ship it', body: 'No native modules, so it runs in Expo Go.' },
];

/**
 * One section per screen. A pager needs no reading line — the active page is
 * the scroll offset over the viewport height — so this drives the rail
 * directly rather than through useScrollSections.
 */
function SectionRailPagerVersion() {
  const [page, setPage] = useState(0);
  const scroller = useRef<ScrollView>(null);

  /*
   * The page height is the scroll view's own, measured — not the window's.
   * Anything above the pager (a header, a caption) makes the viewport shorter
   * than the screen, and window-height pages then sit a little further out of
   * alignment with each snap position than the last, until one of them lands
   * entirely between two and never shows.
   */
  const [pageHeight, setPageHeight] = useState(0);

  return (
    <View className="flex-1">
      <ScrollView
        ref={scroller}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onLayout={(event) => setPageHeight(event.nativeEvent.layout.height)}
        onScroll={(event) => {
          const { contentOffset, layoutMeasurement } = event.nativeEvent;
          if (!layoutMeasurement.height) return;
          const next = Math.round(contentOffset.y / layoutMeasurement.height);
          if (next !== page) setPage(next);
        }}
      >
        {PAGER_SECTIONS.map((section, index) => (
          <View
            key={section.id}
            // Nothing to lay out until the viewport has been measured; a page
            // of the wrong height would scroll to the wrong place first.
            style={{ height: pageHeight || undefined }}
            className="justify-center gap-4 px-8"
          >
            <Text size="sm" muted>
              {index + 1} of {PAGER_SECTIONS.length}
            </Text>
            <Text size="3xl" weight="semibold">
              {section.label}
            </Text>
            <Text size="base" muted>
              {section.body}
            </Text>
          </View>
        ))}
      </ScrollView>

      <SectionRail
        placement="left"
        align="bottom"
        haptics
        value={PAGER_SECTIONS[page]?.id}
        onValueChange={(next) => {
          const index = PAGER_SECTIONS.findIndex((section) => section.id === next);
          if (index < 0 || !pageHeight) return;
          setPage(index);
          scroller.current?.scrollTo({ y: index * pageHeight, animated: true });
        }}
      >
        <SectionRail.Trigger>
          {PAGER_SECTIONS.map((section) => (
            <SectionRail.Bar key={section.id} value={section.id} />
          ))}
        </SectionRail.Trigger>
        <SectionRail.Content>
          {PAGER_SECTIONS.map((section) => (
            <SectionRail.Item key={section.id} value={section.id}>
              {section.label}
            </SectionRail.Item>
          ))}
        </SectionRail.Content>
      </SectionRail>
    </View>
  );
}

function ToggleButtonDemo() {
  const [liked, setLiked] = useState(false);

  return (
    <View className="w-full gap-3">
      {/* Uncontrolled — it holds its own state. */}
      <ToggleButton defaultSelected>Follow</ToggleButton>

      {/* Controlled, with an icon beside a label. ToggleButton.Label reads the
          selected state itself, so nothing has to be threaded through. */}
      <ToggleButton selected={liked} onSelectedChange={setLiked}>
        <BellIcon size={16} />
        <ToggleButton.Label>{liked ? 'Subscribed' : 'Subscribe'}</ToggleButton.Label>
      </ToggleButton>

      <ToggleButton variant="ghost" iconOnly accessibilityLabel="Save">
        <PlusSquareIcon size={18} />
      </ToggleButton>
    </View>
  );
}

function ToggleButtonToolbarDemo() {
  const [marks, setMarks] = useState<string[]>(['shield']);

  return (
    <View className="w-full gap-3">
      {/* `multiple`: independent marks, any number on at once. */}
      <ToggleButtonGroup
        selectionMode="multiple"
        variant="ghost"
        value={marks}
        onValueChange={setMarks}
      >
        <ToggleButton id="shield" iconOnly accessibilityLabel="Protected">
          <ShieldCheckIcon size={18} />
        </ToggleButton>
        <ToggleButton id="bell" iconOnly accessibilityLabel="Notify">
          <BellIcon size={18} />
        </ToggleButton>
        <ToggleButton id="share" iconOnly accessibilityLabel="Shared">
          <ShareNodesIcon size={18} />
        </ToggleButton>
      </ToggleButtonGroup>
      <Text size="sm" muted>
        On: {marks.length ? marks.join(', ') : 'nothing'}
      </Text>
    </View>
  );
}

function ToggleButtonSingleDemo() {
  const [view, setView] = useState<string[]>(['day']);

  return (
    <View className="w-full gap-3">
      {/* `single`: picking one clears the last, and pressing the selected one
          again clears it — a filter you cannot turn off is a trap. */}
      <ToggleButtonGroup selectionMode="single" value={view} onValueChange={setView}>
        <ToggleButton id="day">Day</ToggleButton>
        <ToggleButton id="week">Week</ToggleButton>
        <ToggleButton id="month">Month</ToggleButton>
      </ToggleButtonGroup>
      <Text size="sm" muted>
        Showing: {view[0] ?? 'nothing'}
      </Text>
    </View>
  );
}

const TAB_SECTIONS = [
  'Overview',
  'Activity',
  'Members',
  'Billing',
  'Integrations',
  'Security',
  'Audit log',
];

function ScrollableTabsDemo() {
  return (
    // More tabs than fit. A fixed row answers that by crushing every label to
    // an unreadable width; `scrollable` gives each one its natural width and
    // scrolls the active tab into view instead.
    <Tabs variant="underline" defaultValue="Overview" className="w-full">
      <Tabs.List scrollable>
        {TAB_SECTIONS.map((section) => (
          <Tabs.Trigger key={section} value={section}>
            {section}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
      {TAB_SECTIONS.map((section) => (
        <Tabs.Content key={section} value={section}>
          <Text size="sm" muted className="py-4">
            {section}
          </Text>
        </Tabs.Content>
      ))}
    </Tabs>
  );
}

function KeepMountedTabsDemo() {
  return (
    // Type into the field, switch away, come back: the text is still there.
    // Without `keepMounted` the panel is unmounted and the value goes with it.
    <Tabs keepMounted defaultValue="draft" className="w-full">
      <Tabs.List>
        <Tabs.Trigger value="draft">Draft</Tabs.Trigger>
        <Tabs.Trigger value="settings">Settings</Tabs.Trigger>
      </Tabs.List>
      <Tabs.Content value="draft">
        <Card>
          <Card.Content className="gap-3 p-4">
            <Input label="Title" placeholder="Type something, then switch tab" />
            <Text size="xs" muted>
              This panel stays mounted, so what you type survives the switch.
            </Text>
          </Card.Content>
        </Card>
      </Tabs.Content>
      <Tabs.Content value="settings">
        <Card>
          <Card.Content className="p-4">
            <Text size="sm" muted>
              Switch back to Draft — the title you typed is still in the field.
            </Text>
          </Card.Content>
        </Card>
      </Tabs.Content>
    </Tabs>
  );
}

function PasswordInputDemo() {
  const [visible, setVisible] = useState(false);

  return (
    <View className="w-full gap-1.5">
      <Label isRequired>Password</Label>
      <InputGroup>
        <InputGroup.Input placeholder="Enter your password" secureTextEntry={!visible} />
        <InputGroup.Suffix>
          <Button variant="ghost" size="sm" onPress={() => setVisible((v) => !v)}>
            {visible ? 'Hide' : 'Show'}
          </Button>
        </InputGroup.Suffix>
      </InputGroup>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* ScrollText and ScrollCanvas                                                */
/* -------------------------------------------------------------------------- */

const SCROLL_LINES = [
  'Every control ships with its accessibility wiring already done.',
  'Animations run on the UI thread, so a busy list never drops them.',
  'Semantic tokens mean a theme swap moves every component at once.',
  'Overlays mount lazily and unmount once they have finished leaving.',
];

/** Spacers, so each block gets a screen of scroll to resolve across. */
function ScrollGap({ label }: { label?: string }) {
  return (
    <View className="h-72 items-center justify-center">
      {label ? (
        <Text size="xs" muted className="uppercase tracking-wider">
          {label}
        </Text>
      ) : null}
    </View>
  );
}

function ScrollTextVersion({ effect }: { effect: 'color' | 'fade' | 'rise' | 'highlight' }) {
  return (
    <ScrollProgress className="flex-1">
      <ScrollView showsVerticalScrollIndicator={false}>
        <ScrollGap label={`scroll down — ${effect}`} />
        {SCROLL_LINES.map((line) => (
          <View key={line} className="px-6">
            <ScrollText effect={effect} size="2xl" weight="semibold">
              {line}
            </ScrollText>
            <ScrollGap />
          </View>
        ))}
        <ScrollGap label="that is all of them" />
      </ScrollView>
    </ScrollProgress>
  );
}

/** Character-by-character, which reads as typing rather than as reading. */
function ScrollTextCharactersVersion() {
  return (
    <ScrollProgress className="flex-1">
      <ScrollView showsVerticalScrollIndicator={false}>
        <ScrollGap label="scroll down" />
        <View className="px-6">
          <ScrollText by="character" stagger={0.12} size="3xl" weight="bold">
            One character at a time.
          </ScrollText>
        </View>
        <ScrollGap />
        <View className="px-6">
          {/* A wide stagger brightens the whole line together instead of
              running an edge along it. */}
          <ScrollText stagger={0.9} size="3xl" weight="bold">
            And one where the whole line arrives at once.
          </ScrollText>
        </View>
        <ScrollGap label="that is all of them" />
      </ScrollView>
    </ScrollProgress>
  );
}

const CANVAS_PHOTOS = [
  'https://images.unsplash.com/photo-1554080353-a576cf803bda?w=900&q=60',
  'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=900&q=60',
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=900&q=60',
  'https://images.unsplash.com/photo-1439853949127-fa647821eba0?w=900&q=60',
];

function ScrollCanvasVersion({
  effect,
}: {
  effect: 'parallax' | 'zoom' | 'reveal';
}) {
  return (
    <ScrollProgress className="flex-1">
      <ScrollView showsVerticalScrollIndicator={false}>
        <ScrollGap label={`scroll down — ${effect}`} />
        {CANVAS_PHOTOS.map((uri) => (
          <View key={uri} className="px-6">
            <ScrollCanvas source={{ uri }} effect={effect} />
            <ScrollGap />
          </View>
        ))}
        <ScrollGap label="that is all of them" />
      </ScrollView>
    </ScrollProgress>
  );
}

/** The scroll position picks the frame — the thumb scrubs the animation. */
function ScrollCanvasSequenceVersion() {
  const sources = useMemo(() => CANVAS_PHOTOS.map((uri) => ({ uri })), []);

  return (
    <ScrollProgress className="flex-1">
      <ScrollView showsVerticalScrollIndicator={false}>
        <ScrollGap label="scroll slowly" />
        <View className="px-6">
          <ScrollCanvas effect="sequence" sources={sources} start={0.95} end={0.1} />
          <Text size="sm" muted className="pt-3">
            Four frames across one screen of scroll. Every frame stays mounted,
            so scrubbing back up never waits on a decode.
          </Text>
        </View>
        <ScrollGap label="that is all of it" />
      </ScrollView>
    </ScrollProgress>
  );
}

/* -------------------------------------------------------------------------- */
/* ThinkingOrb                                                                */
/* -------------------------------------------------------------------------- */

const ORB_STATES = [
  ['working', 'Running a task'],
  ['searching', 'Looking something up'],
  ['solving', 'Working a problem out'],
  ['listening', 'Taking input'],
  ['composing', 'Writing a reply'],
  ['shaping', 'Forming a structure'],
] as const;

function ThinkingOrbStatesVersion() {
  return (
    <ScrollView
      contentContainerClassName="px-5 py-4"
      showsVerticalScrollIndicator={false}
    >
      <Item.Group>
        {ORB_STATES.map(([state, caption], index) => (
          <View key={state}>
            {index > 0 ? <Item.Separator /> : null}
            <Item>
              <Item.Media>
                <ThinkingOrb state={state} size={56} />
              </Item.Media>
              <Item.Content>
                <Item.Title>{state}</Item.Title>
                <Item.Description>{caption}</Item.Description>
              </Item.Content>
            </Item>
          </View>
        ))}
      </Item.Group>
    </ScrollView>
  );
}

/** The 20px tuning is a separate design, not the 64px one scaled down. */
function ThinkingOrbInlineVersion() {
  return (
    <ScrollView contentContainerClassName="gap-4 px-5 py-4">
      <Message>
        <Message.Avatar>
          <Avatar size="sm" fallback="AI" />
        </Message.Avatar>
        <Message.Content>
          <Message.Bubble>
            <View className="flex-row items-center gap-2">
              <ThinkingOrb state="searching" size={20} />
              <Shimmer>Searching the docs…</Shimmer>
            </View>
          </Message.Bubble>
        </Message.Content>
      </Message>

      {ORB_STATES.map(([state]) => (
        <View key={state} className="flex-row items-center gap-2">
          <ThinkingOrb state={state} size={20} />
          <Text size="sm" muted>
            {state}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

function ThinkingOrbControlsVersion() {
  const [speed, setSpeed] = useState(1);
  const [paused, setPaused] = useState(false);

  return (
    <View className="flex-1 justify-center gap-8 px-5">
      <View className="items-center">
        <ThinkingOrb state="working" size={140} speed={speed} paused={paused} />
      </View>
      <Slider
        label="Speed"
        showValue
        formatValue={(value) => `${value.toFixed(1)}×`}
        min={0.2}
        max={3}
        step={0.1}
        value={speed}
        onValueChange={setSpeed}
      />
      <View className="flex-row items-center justify-between">
        <Text>Paused</Text>
        {/* Pausing holds the current frame rather than clearing it — a still
            orb is not an empty one. */}
        <Switch value={paused} onValueChange={setPaused} />
      </View>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Soundwave                                                                  */
/* -------------------------------------------------------------------------- */

const WAVE_STATES = ['idle', 'listening', 'thinking', 'speaking'] as const;

/** The capsules over a microphone button — a voice-mode screen. */
function SoundwavePillsVersion() {
  const voice = useVoiceRecorder();
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-1 justify-between pt-6"
      style={{ paddingBottom: insets.bottom + 24 }}
    >
      <View className="flex-1 items-center justify-center gap-8">
        <Soundwave
          variant="pills"
          state={voice.recording ? 'listening' : 'idle'}
          level={voice.recording ? voice.level : undefined}
          height={120}
          barWidth={34}
          barGap={12}
        />
        <Text muted>{voice.recording ? 'Listening' : 'Press record to start'}</Text>
      </View>

      <VoiceControls voice={voice} />
    </View>
  );
}

/** The metering strip, in both modes, at the size it is actually used. */
function SoundwaveBarsVersion() {
  const voice = useVoiceRecorder();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      contentContainerClassName="gap-6 py-6"
      contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
    >
      <View className="gap-3 px-5">
        <Text size="sm" muted>
          static — every bar is a band of the current level
        </Text>
        <Card>
          <Card.Content className="p-4">
            <Soundwave
              variant="bars"
              mode="static"
              state={voice.recording ? 'listening' : 'idle'}
              level={voice.recording ? voice.level : undefined}
              height={64}
            />
          </Card.Content>
        </Card>
      </View>

      <View className="gap-3 px-5">
        <Text size="sm" muted>
          scrolling — history slides left, newest on the right
        </Text>
        <Card>
          <Card.Content className="p-4">
            <Soundwave
              variant="bars"
              mode="scrolling"
              state={voice.recording ? 'listening' : 'idle'}
              level={voice.recording ? voice.level : undefined}
              height={64}
            />
          </Card.Content>
        </Card>
      </View>

      <View className="gap-3 px-5">
        <Text size="sm" muted>
          not centered, and thicker — a recording row
        </Text>
        <Card>
          <Card.Content className="flex-row items-center gap-3 p-4">
            <MicIcon size={18} />
            <View className="flex-1">
              <Soundwave
                variant="bars"
                mode="scrolling"
                centered={false}
                bars={28}
                barWidth={5}
                height={40}
                state={voice.recording ? 'listening' : 'idle'}
                level={voice.recording ? voice.level : undefined}
              />
            </View>
            <Text size="sm" muted>
              {formatClock(voice.seconds)}
            </Text>
          </Card.Content>
        </Card>
      </View>

      <VoiceControls voice={voice} compact />
    </ScrollView>
  );
}

/** The travelling wave, and what each state does to it with no level supplied. */
function SoundwaveLineVersion() {
  const [state, setState] = useState<string[]>(['speaking']);
  const voice = useVoiceRecorder();
  const insets = useSafeAreaInsets();
  const picked = WAVE_STATES.find((name) => name === state[0]) ?? 'speaking';
  // Recording wins over the picker: pressing the button is the demo, and a
  // wave that ignored it would be the wrong lesson.
  const current = voice.recording ? 'listening' : picked;

  return (
    <ScrollView
      contentContainerClassName="gap-6 py-6"
      contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
    >
      <View className="px-5">
        <Card>
          <Card.Content className="p-4">
            <Soundwave
              variant="line"
              state={current}
              level={voice.recording ? voice.level : undefined}
              height={96}
            />
          </Card.Content>
        </Card>
      </View>

      <View className="gap-3 px-5">
        <Text size="sm" muted>
          state — what it animates with no level supplied
        </Text>
        <ToggleButtonGroup selectionMode="single" value={state} onValueChange={setState}>
          {WAVE_STATES.map((name) => (
            <ToggleButton key={name} id={name}>
              {name}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </View>

      <View className="gap-3 px-5">
        <Text size="sm" muted>
          Under a reply, at the size it would sit there
        </Text>
        <Message>
          <Message.Avatar>
            <Avatar size="sm" fallback="AI" />
          </Message.Avatar>
          <Message.Content>
            <Message.Bubble>
              <View className="w-full gap-2">
                <Text size="sm">Here is what I found in the changelog.</Text>
                <Soundwave variant="line" state="speaking" height={36} barWidth={2} />
              </View>
            </Message.Bubble>
          </Message.Content>
        </Message>
      </View>

      <VoiceControls voice={voice} compact />
    </ScrollView>
  );
}

/** The glow that takes the whole screen, behind a microphone button. */
function SoundwaveAmbientVersion() {
  const voice = useVoiceRecorder();
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1">
      {/* Absolutely positioned and non-interactive, so it goes behind the
          screen's own content rather than wrapping it. */}
      <Soundwave
        variant="ambient"
        state={voice.recording ? 'listening' : 'idle'}
        level={voice.recording ? voice.level : undefined}
        radius={40}
      />

      <View className="flex-1 items-center justify-center gap-3">
        <Text size="xl" weight="medium">
          {voice.recording ? 'Listening' : 'Start chatting anytime'}
        </Text>
        <Text size="sm" muted>
          The room is lit by the level, not by a spinner.
        </Text>
      </View>

      <View style={{ paddingBottom: insets.bottom + 24 }}>
        <VoiceControls voice={voice} />
      </View>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Soundwave in a conversation                                                */
/* -------------------------------------------------------------------------- */

interface VoiceNote {
  id: string;
  align: 'start' | 'end';
  /** The stored shape of the recording — 40 numbers, not the audio. */
  levels: number[];
  seconds: number;
  time: string;
  /** Empty for the seeded notes: there is no file, only a waveform. */
  uri: string;
}

/** A plausible waveform, seeded so a note looks the same on every render. */
function seedWaveform(seed: number, bars = 40): number[] {
  let state = seed;
  const random = () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
  return Array.from({ length: bars }, (_unused, index) => {
    // Syllables, not noise: a slow envelope with quick peaks riding it, which
    // is what speech looks like once it is metered.
    const envelope = 0.45 + 0.55 * Math.sin((index / bars) * Math.PI * 2.2 + seed);
    return Math.max(0.08, Math.min(1, envelope * (0.5 + 0.7 * random())));
  });
}

const SEED_NOTES: VoiceNote[] = [
  { id: 'n1', align: 'start', levels: seedWaveform(3), seconds: 8, time: '09:41', uri: '' },
  { id: 'n2', align: 'end', levels: seedWaveform(11), seconds: 4, time: '09:42', uri: '' },
  { id: 'n3', align: 'start', levels: seedWaveform(27), seconds: 12, time: '09:44', uri: '' },
];

/**
 * One voice note: play, the waveform, the duration.
 *
 * The waveform is `levels` — the shape captured while recording — and the
 * playhead is `progress`, so the bars behind it fill as it plays. A recorded
 * note plays for real; the seeded ones have no file, so their playhead is
 * animated at the same rate rather than pretending there is audio behind it.
 */
/**
 * The play button, drawn in whatever colour reads against the bubble it is in.
 *
 * It has to be a component of its own: the colour comes from the context
 * `Message.Bubble` provides, so it can only be read from inside one.
 */
function NoteButton({ playing, onPress }: { playing: boolean; onPress: () => void }) {
  const ink = useIconColor();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={playing ? 'Pause' : 'Play'}
      onPress={onPress}
      className="size-9 items-center justify-center rounded-full"
      // A hairline in the bubble's own foreground, so the button has an edge on
      // both the sent and the received side without a colour of its own.
      style={{ borderWidth: 1, borderColor: ink ?? undefined, opacity: 0.9 }}
    >
      {playing ? <PauseIcon size={16} /> : <PlayIcon size={16} />}
    </Pressable>
  );
}

function VoiceNoteBubble({ note }: { note: VoiceNote }) {
  const player = useAudioPlayer(note.uri || null);
  const status = useAudioPlayerStatus(player);
  const progress = useSharedValue(0);
  const [playingSeed, setPlayingSeed] = useState(false);

  useEffect(() => {
    if (!note.uri) return;
    progress.value = status.duration
      ? Math.min(1, status.currentTime / status.duration)
      : 0;
  }, [note.uri, status.currentTime, status.duration, progress]);

  const playing = note.uri ? status.playing : playingSeed;

  const toggle = () => {
    if (note.uri) {
      if (status.playing) player.pause();
      else {
        if (status.didJustFinish || status.currentTime >= status.duration) player.seekTo(0);
        player.play();
      }
      return;
    }

    if (playingSeed) {
      cancelAnimation(progress);
      setPlayingSeed(false);
      return;
    }
    setPlayingSeed(true);
    progress.value = 0;
    progress.value = withTiming(
      1,
      { duration: note.seconds * 1000, easing: Easing.linear },
      (finished) => {
        if (finished) runOnJS(setPlayingSeed)(false);
      }
    );
  };

  return (
    <Message align={note.align}>
      <Message.Content>
        <Message.Bubble className="px-3 py-2.5">
          <View className="w-64 flex-row items-center gap-3">
            <NoteButton playing={playing} onPress={toggle} />

            <View className="flex-1">
              {/* `levels` freezes the wave into the recorded shape, so nothing
                  animates until the playhead moves. */}
              <Soundwave
                variant="bars"
                levels={note.levels}
                progress={progress}
                bars={40}
                barWidth={2}
                height={28}
              />
            </View>

            <Text size="xs" muted>
              {formatClock(note.seconds)}
            </Text>
          </View>
        </Message.Bubble>
        <Message.Footer>{note.time}</Message.Footer>
      </Message.Content>
    </Message>
  );
}

/** Voice notes in a transcript — record one and it joins the thread. */
function SoundwaveNotesVersion() {
  const voice = useVoiceRecorder();
  const insets = useSafeAreaInsets();
  const [notes, setNotes] = useState<VoiceNote[]>(SEED_NOTES);

  useEffect(() => {
    if (!voice.note) return;
    setNotes((current) => [
      ...current,
      {
        id: `rec-${current.length}`,
        align: 'end',
        levels: voice.note!.levels,
        seconds: voice.note!.seconds,
        time: 'now',
        uri: voice.note!.uri,
      },
    ]);
    voice.clearNote();
  }, [voice]);

  return (
    <View className="flex-1">
      <ScrollView contentContainerClassName="gap-3 px-4 py-4">
        {notes.map((note) => (
          <VoiceNoteBubble key={note.id} note={note} />
        ))}
      </ScrollView>

      <View className="border-t border-border pt-5" style={{ paddingBottom: insets.bottom + 20 }}>
        <VoiceControls voice={voice} compact />
      </View>
    </View>
  );
}

/** The composer that turns into a recorder, over a live transcript. */
function SoundwaveComposerVersion() {
  const voice = useVoiceRecorder();
  const insets = useSafeAreaInsets();
  const [notes, setNotes] = useState<VoiceNote[]>(SEED_NOTES.slice(0, 2));

  useEffect(() => {
    if (!voice.note) return;
    setNotes((current) => [
      ...current,
      {
        id: `rec-${current.length}`,
        align: 'end',
        levels: voice.note!.levels,
        seconds: voice.note!.seconds,
        time: 'now',
        uri: voice.note!.uri,
      },
    ]);
    voice.clearNote();
  }, [voice]);

  return (
    <View className="flex-1">
      {voice.meter}

      <MessageScroller autoScroll className="flex-1">
        <MessageScroller.Viewport>
          <MessageScroller.Content className="gap-3 px-4 py-4">
            {notes.map((note) => (
              <MessageScroller.Item key={note.id} messageId={note.id}>
                <VoiceNoteBubble note={note} />
              </MessageScroller.Item>
            ))}
          </MessageScroller.Content>
        </MessageScroller.Viewport>
        <MessageScroller.Button />
      </MessageScroller>

      {/* The version screen renders edge to edge, so the composer is what has
          to clear the home indicator. */}
      <View
        className="border-t border-border p-3"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        {voice.recording ? (
          <View className="flex-row items-center gap-3">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel recording"
              onPress={voice.cancel}
              className="size-10 items-center justify-center rounded-full"
            >
              <XIcon size={18} />
            </Pressable>

            <View className="flex-1">
              {/* Scrolling, because a composer is showing what was just said
                  rather than a level: the last few seconds slide past. */}
              <Soundwave
                variant="bars"
                mode="scrolling"
                level={voice.level}
                bars={32}
                barWidth={3}
                height={36}
              />
            </View>

            <Text size="sm" muted>
              {formatClock(voice.seconds)}
            </Text>

            <Button size="icon" className="size-10 rounded-full" onPress={voice.toggle}>
              <SendIcon size={16} />
            </Button>
          </View>
        ) : (
          <View className="flex-row items-center gap-3">
            <View className="flex-1 rounded-full bg-muted px-4 py-2.5">
              <Text size="sm" muted>
                Hold the mic, or press it
              </Text>
            </View>
            <Button size="icon" className="size-10 rounded-full" onPress={voice.toggle}>
              <MicIcon size={18} />
            </Button>
          </View>
        )}

        {voice.reason ? (
          <Text size="xs" muted className="pt-3 text-center">
            {voice.reason}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Direction                                                                  */
/* -------------------------------------------------------------------------- */

/** Rows with a leading icon and a trailing chevron — the thing RTL mirrors. */
function DirectionRows() {
  return (
    <Item.Group>
      <Item>
        <Item.Media variant="icon">
          <BellIcon size={16} />
        </Item.Media>
        <Item.Content>
          <Item.Title>Notifications</Item.Title>
          <Item.Description>Badges, sounds, banners</Item.Description>
        </Item.Content>
        <ChevronRightIcon size={16} />
      </Item>
      <Item.Separator />
      <Item>
        <Item.Media variant="icon">
          <ShieldCheckIcon size={16} />
        </Item.Media>
        <Item.Content>
          <Item.Title>Privacy</Item.Title>
          <Item.Description>Two-factor is on</Item.Description>
        </Item.Content>
        <ChevronRightIcon size={16} />
      </Item>
      <Item.Separator />
      <Item>
        <Item.Media variant="icon">
          <CardIcon size={16} />
        </Item.Media>
        <Item.Content>
          <Item.Title>Payment</Item.Title>
          <Item.Description>Visa ending 4242</Item.Description>
        </Item.Content>
        <ChevronRightIcon size={16} />
      </Item>
    </Item.Group>
  );
}

function DirectionFlipDemo() {
  const [dir, setDir] = useState<string[]>(['rtl']);
  const value = dir[0] === 'rtl' ? 'rtl' : 'ltr';

  return (
    <View className="w-full gap-4">
      <ToggleButtonGroup selectionMode="single" value={dir} onValueChange={setDir}>
        <ToggleButton id="ltr">ltr</ToggleButton>
        <ToggleButton id="rtl">rtl</ToggleButton>
      </ToggleButtonGroup>
      {/* `flex-none` because the default fills its parent — that default is for
          wrapping an app, not for sitting in a section. */}
      <Direction dir={value} className="w-full flex-none">
        <DirectionRows />
      </Direction>
    </View>
  );
}

/** Reads the value back out, which is what a component flipping its own maths does. */
function DirectionReadout() {
  const dir = useDirection();

  return (
    <View className="flex-row items-center justify-between gap-3 px-4 py-3">
      <Text size="sm" muted>
        useDirection()
      </Text>
      <Badge variant="secondary">{dir}</Badge>
    </View>
  );
}

function DirectionNestedDemo() {
  return (
    <Direction dir="rtl" className="w-full flex-none gap-3">
      <Surface variant="secondary" className="w-full p-4">
        <Text weight="medium">حساب المستخدم</Text>
        <Text size="sm" muted>
          The card, its padding and its rows all mirror.
        </Text>
      </Surface>
      <Surface variant="secondary" className="w-full">
        <DirectionReadout />
        {/* An island that must not flip: an identifier reads the same way in
            every locale, and mirroring it makes it wrong rather than localised. */}
        <Direction dir="ltr" className="flex-none border-t border-border">
          <View className="px-4 pt-3">
            <Text size="sm">+1 (555) 010-4477</Text>
          </View>
          <DirectionReadout />
        </Direction>
      </Surface>
    </Direction>
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

/** A full year, scrolled sideways — 53 weeks do not fit on a phone. */
function HeatmapContributionVersion() {
  const [active, setActive] = useState<HeatmapCell | null>(null);

  return (
    <View className="flex-1 justify-center px-5">
      <Card>
        <Card.Header>
          <Card.Title>Contributions</Card.Title>
          <Card.Description>
            {active
              ? `${active.count} on ${active.date?.toDateString() ?? '—'}`
              : 'Press and hold, then drag, to read a day.'}
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
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
          <HeatmapLegendRow />
        </Card.Content>
      </Card>
    </View>
  );
}

/**
 * The legend belongs under the chart at the *card's* width, not the scrolled
 * grid's, so it is its own one-cell chart rather than a child of the big one.
 */
function HeatmapLegendRow() {
  return (
    <HeatmapChart data={[]} className="pt-1">
      <HeatmapChart.Legend swatchSize={12} />
    </HeatmapChart>
  );
}

/** A quarter, with the cells sized to the width they are given. */
function HeatmapFillVersion() {
  return (
    <View className="flex-1 justify-center px-5">
      <Card>
        <Card.Header>
          <Card.Title>Last 13 weeks</Card.Title>
          <Card.Description>
            `layout="fill"` divides the width between the columns instead of
            drawing them at a fixed size.
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <HeatmapChart data={HEATMAP_QUARTER} layout="fill" weekStartDay={1} gap={4}>
            <HeatmapChart.XAxis />
            <HeatmapChart.YAxis />
            <HeatmapChart.Cells cornerRadius={3} />
            <HeatmapChart.Tooltip />
            <HeatmapChart.Legend />
          </HeatmapChart>
        </Card.Content>
      </Card>
    </View>
  );
}

/** Quarter rules, and the whole chart on one accent colour. */
function HeatmapQuartersVersion() {
  const success = useCSSVariable('--color-success');

  return (
    <View className="flex-1 justify-center px-5">
      <Card>
        <Card.Header>
          <Card.Title>Deploys by quarter</Card.Title>
          <Card.Description>
            A rule every thirteen columns, and a ramp off one colour rather than
            the chart token.
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
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
        </Card.Content>
      </Card>
    </View>
  );
}

/** One row per column: the same grid, used as an uptime strip. */
function HeatmapUptimeVersion() {
  const data = useMemo(
    () =>
      HEATMAP_YEAR.slice(-45).map((column, index) => ({
        bin: index,
        bins: [{ bin: 0, count: column.bins[3]?.count ?? 0, date: column.bins[3]?.date }],
      })),
    []
  );

  return (
    <View className="flex-1 justify-center px-5">
      <Card>
        <Card.Header>
          <Card.Title>Uptime</Card.Title>
          <Card.Description>
            `rows={1}` turns the calendar into a band. Nothing else changes.
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <HeatmapChart data={data} rows={1} layout="fill" gap={3} cornerRadius={2}>
            <HeatmapChart.Cells />
            {/* Nothing scrolls here, so the readout can claim the touch
                straight away instead of waiting for a hold. */}
            <HeatmapChart.Tooltip
              activateAfterLongPress={0}
              formatLabel={(cell) => `${cell.count} incidents`}
            />
          </HeatmapChart>
        </Card.Content>
      </Card>
    </View>
  );
}

/**
 * A field that has to get out of the keyboard's way inside a scroll view —
 * the case a fixed-height box cannot show.
 *
 * Focus "Comment", then scroll the form. The field holds its place between
 * "Subject" and "Signature": its lift decays to nothing as it scrolls clear of
 * the keyboard, and comes back as it scrolls under it again.
 */
function KeyboardLiftDemo() {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      contentContainerClassName="gap-4 px-5 pt-4"
      contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Plain fields first, to make the point that only the focused avoiding
          field moves. Tapping one of these leaves the screen exactly as it is. */}
      <Input label="From" placeholder="you@example.com" />
      <Input label="To" placeholder="them@example.com" />
      <Input label="Subject" placeholder="An ordinary field" />
      <Input
        avoidKeyboard
        label="Comment"
        placeholder="Say something…"
        description="Lifts on focus, follows the scroll, settles back on blur."
        multiline
      />
      <Input label="Signature" placeholder="Sent from my phone" />
      <Input label="Reply-to" placeholder="Optional" />
      <Input label="Tags" placeholder="Comma separated" />
    </ScrollView>
  );
}

/**
 * The other half of the job: a bar already pinned to the bottom edge, which
 * should ride the keyboard rather than measure anything. `dock` moves it by the
 * keyboard height less the inset it is already sitting above.
 */
function KeyboardDockDemo() {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState('');

  return (
    <View className="flex-1">
      <ScrollView
        contentContainerClassName="gap-3 px-5 pt-4"
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {[
          'Every control ships with its accessibility role wired up.',
          'Animations run on the UI thread, so a busy list never drops them.',
          'Tokens are semantic — a theme swap moves every component at once.',
          'The composer below stays put while this list scrolls.',
          'Open the keyboard and it travels with it, frame for frame.',
        ].map((line) => (
          <Card key={line}>
            <Card.Content className="p-4">
              <Text size="sm">{line}</Text>
            </Card.Content>
          </Card>
        ))}
      </ScrollView>

      <KeyboardAvoider
        mode="dock"
        bottomInset={insets.bottom}
        pointerEvents="box-none"
        className="absolute left-0 right-0 px-5"
        style={{ bottom: insets.bottom + 16 }}
      >
        <View className="flex-row items-center gap-2 rounded-full border border-border bg-surface px-4 shadow-lg">
          <Input
            value={draft}
            onChangeText={setDraft}
            placeholder="Message"
            className="flex-1 border-0 bg-transparent px-0"
            containerClassName="flex-1"
            accessibilityLabel="Message"
          />
          <SendIcon size={18} />
        </View>
      </KeyboardAvoider>
    </View>
  );
}

/** The small progress ring shown beside each row in the Frame demo. */
function Meter({ percent }: { percent: number }) {
  return (
    <View className="h-6 w-6 items-center justify-center rounded-full border-2 border-muted">
      <View
        className="absolute h-6 w-6 rounded-full border-2 border-transparent border-t-info"
        style={{ transform: [{ rotate: `${(percent / 100) * 360}deg` }] }}
      />
    </View>
  );
}

const DEPLOY_LOG = [
  {
    time: '09:12',
    title: 'Migration drafted',
    badge: 'Assigned',
    tone: 'default' as const,
    Icon: PlusSquareIcon,
    body: 'Schema change written for the reporting cluster.',
  },
  {
    time: '09:34',
    title: 'Shadow traffic enabled',
    badge: 'Shadow',
    tone: 'info' as const,
    Icon: ShareNodesIcon,
    body: 'Mirroring 5% of reads with query timing captured.',
  },
  {
    time: '09:51',
    title: 'Replica lag alarm',
    badge: 'Holding',
    tone: 'warning' as const,
    Icon: ShieldAlertIcon,
    body: 'Lag passed 400ms in eu-west-2; the cutover is paused.',
  },
  {
    time: '10:05',
    title: 'Runbook circulated',
    badge: 'Docs',
    tone: 'default' as const,
    Icon: BellIcon,
    body: 'On-call has the rollback steps and the owner list.',
  },
  {
    time: '10:42',
    title: 'Cutover approved',
    badge: 'Ready',
    tone: 'success' as const,
    Icon: ShieldCheckIcon,
    body: 'Lag recovered and every pre-flight check is green.',
  },
];

/** Leading time column, outlined icon nodes, a chip beside each title. */
function DeployLogDemo() {
  return (
    <View className="w-full gap-4">
      <View>
        <Text size="sm" muted>
          Migration audit
        </Text>
        <Text size="xl" weight="semibold">
          Reporting cluster
        </Text>
      </View>
      <Timeline variant="icon" value={DEPLOY_LOG.length - 1} className="w-full">
        {DEPLOY_LOG.map((entry, index) => (
          <Timeline.Item
            key={entry.title}
            step={index}
            tone={entry.tone}
            last={index === DEPLOY_LOG.length - 1}
          >
            <Timeline.Aside className="w-12">
              <Timeline.Date>{entry.time}</Timeline.Date>
            </Timeline.Aside>
            <Timeline.Indicator>
              <entry.Icon size={15} />
            </Timeline.Indicator>
            <Timeline.Content>
              <Timeline.Header>
                <Timeline.Title>{entry.title}</Timeline.Title>
                <Badge variant="secondary">{entry.badge}</Badge>
              </Timeline.Header>
              <Timeline.Description>{entry.body}</Timeline.Description>
            </Timeline.Content>
          </Timeline.Item>
        ))}
      </Timeline>
    </View>
  );
}

/** Solid dots, timestamps trailing the title, one entry carrying media. */
function StudioFeedDemo() {
  return (
    <Timeline variant="dot" value={3} className="w-full">
      <Timeline.Item step={0} tone="info">
        <Timeline.Indicator />
        <Timeline.Content>
          <Timeline.Header>
            <Timeline.Title>Cover art uploaded</Timeline.Title>
            <Badge variant="info">Review</Badge>
            <Timeline.Trailing>10:18</Timeline.Trailing>
          </Timeline.Header>
          <View className="mt-2 overflow-hidden rounded-xl border border-border">
            <Image
              source={{ uri: PHOTO }}
              style={{ width: '100%', height: 140 }}
              resizeMode="cover"
            />
            <View className="gap-2 p-3">
              <Text size="sm" muted>
                Final crop is ready for retouch, with the detail shot and the
                thumbnail queued behind it.
              </Text>
              <View className="flex-row gap-2">
                <Badge variant="secondary">Hero</Badge>
                <Badge variant="secondary">4 crops</Badge>
              </View>
            </View>
          </View>
        </Timeline.Content>
      </Timeline.Item>
      <Timeline.Item step={1} tone="warning">
        <Timeline.Indicator />
        <Timeline.Content>
          <Timeline.Header>
            <Timeline.Title>Lighting pass reviewed</Timeline.Title>
            <Timeline.Trailing>10:27</Timeline.Trailing>
          </Timeline.Header>
          <Timeline.Description>
            The side profile reads clearly; keep the shadow soft.
          </Timeline.Description>
        </Timeline.Content>
      </Timeline.Item>
      <Timeline.Item step={2} tone="success">
        <Timeline.Indicator />
        <Timeline.Content>
          <Timeline.Header>
            <Timeline.Title>Copy note resolved</Timeline.Title>
            <Timeline.Trailing>10:43</Timeline.Trailing>
          </Timeline.Header>
          <Timeline.Description>
            Launch tile copy now matches the campaign language.
          </Timeline.Description>
        </Timeline.Content>
      </Timeline.Item>
      <Timeline.Item step={3} tone="info" last>
        <Timeline.Indicator />
        <Timeline.Content>
          <Timeline.Header>
            <Timeline.Title>Package exported</Timeline.Title>
            <Timeline.Trailing>11:06</Timeline.Trailing>
          </Timeline.Header>
          <Timeline.Description>
            Square crop, product view and thumbnail are out.
          </Timeline.Description>
        </Timeline.Content>
      </Timeline.Item>
    </Timeline>
  );
}

const LEDGER = [
  { title: 'Dispute opened', time: 'Mar 6, 10:34', tone: 'warning' as const, Icon: ShieldAlertIcon, body: 'The customer disputed a renewal; finance has seven days.' },
  { title: 'Payment captured', time: 'Mar 6, 10:21', tone: 'success' as const, Icon: CardIcon },
  { title: 'Payment authorised', time: 'Mar 6, 10:21', tone: 'default' as const, Icon: ShieldCheckIcon },
  { title: 'Invoice generated', time: 'Mar 6, 10:20', tone: 'default' as const, Icon: ReceiptIcon },
];

/** Dense rows for an audit trail — small nodes, timestamps trailing. */
function LedgerDemo() {
  return (
    <Timeline variant="compact" value={0} className="w-full">
      {LEDGER.map((entry, index) => (
        <Timeline.Item
          key={entry.title}
          step={index}
          tone={entry.tone}
          last={index === LEDGER.length - 1}
        >
          <Timeline.Indicator>
            <entry.Icon size={13} />
          </Timeline.Indicator>
          <Timeline.Content>
            <Timeline.Header>
              <Timeline.Title>{entry.title}</Timeline.Title>
              <Timeline.Trailing>{entry.time}</Timeline.Trailing>
            </Timeline.Header>
            {entry.body ? (
              <Timeline.Description>{entry.body}</Timeline.Description>
            ) : null}
          </Timeline.Content>
        </Timeline.Item>
      ))}
    </Timeline>
  );
}

const HANDOFF = [
  {
    time: '09:15', team: 'Design', person: 'Nina Park', tone: 'default' as const,
    Icon: SendIcon, title: 'Checkout copy approved',
    stats: [['Screens', '18'], ['Open notes', '2']],
    body: 'Invoice copy, empty states and seat-change messages passed.',
  },
  {
    time: '12:05', team: 'Data', person: 'Maya Hart', tone: 'info' as const,
    Icon: ShareNodesIcon, title: 'Metrics pipeline connected',
    stats: [['Events', '12'], ['Lag', '42 s']],
    body: 'Billing telemetry is flowing into the release dashboard.',
  },
  {
    time: '15:00', team: 'Launch', person: 'Eli Wong', tone: 'success' as const,
    Icon: ShieldCheckIcon, title: 'Checklist signed off',
    stats: [['Checks', '9/9'], ['Window', '15 min']],
    body: 'Rollback owner, dashboard links and launch channel are pinned.',
  },
];

/** Meta column on the left, a stats strip under each title. */
function HandoffDemo() {
  return (
    <View className="w-full gap-4">
      <View className="items-center">
        <Text size="sm" muted>
          Launch review
        </Text>
        <Text size="xl" weight="semibold">
          Billing rollout
        </Text>
      </View>
      <Timeline variant="icon" value={HANDOFF.length - 1} className="w-full">
        {HANDOFF.map((entry, index) => (
          <Timeline.Item
            key={entry.title}
            step={index}
            tone={entry.tone}
            last={index === HANDOFF.length - 1}
          >
            <Timeline.Aside>
              <Timeline.Date>{entry.time}</Timeline.Date>
              <Timeline.Label>{entry.team}</Timeline.Label>
              <Timeline.Meta>{entry.person}</Timeline.Meta>
            </Timeline.Aside>
            <Timeline.Indicator>
              <entry.Icon size={15} />
            </Timeline.Indicator>
            <Timeline.Content>
              <Timeline.Title>{entry.title}</Timeline.Title>
              <Timeline.Stats>
                {entry.stats.map(([label, value]) => (
                  <Timeline.Stat key={label} label={label!} value={value!} />
                ))}
              </Timeline.Stats>
              <Timeline.Description>{entry.body}</Timeline.Description>
            </Timeline.Content>
          </Timeline.Item>
        ))}
      </Timeline>
    </View>
  );
}

const TIMELINE_DATA = [
  { date: 'Mar 12', title: 'Order placed', body: 'We received your order.' },
  { date: 'Mar 13', title: 'Packed', body: 'Your items left the warehouse.' },
  { date: 'Mar 15', title: 'In transit', body: 'Out with the courier.' },
  { date: 'Mar 17', title: 'Delivered', body: 'Left at the front door.' },
];

/** Renders the shared timeline data in whichever variant is asked for. */
function TimelineDemo({
  variant,
  value = 2,
}: {
  variant: 'dot' | 'icon' | 'numbered' | 'card';
  value?: number;
}) {
  return (
    <Timeline variant={variant} value={value} className="w-full">
      {TIMELINE_DATA.map((entry, index) => (
        <Timeline.Item
          key={entry.title}
          step={index}
          last={index === TIMELINE_DATA.length - 1}
        >
          <Timeline.Indicator>
            <CheckIcon size={14} />
          </Timeline.Indicator>
          <Timeline.Content>
            <Timeline.Header>
              <Timeline.Date>{entry.date}</Timeline.Date>
              <Timeline.Title>{entry.title}</Timeline.Title>
            </Timeline.Header>
            <Timeline.Description>{entry.body}</Timeline.Description>
          </Timeline.Content>
        </Timeline.Item>
      ))}
    </Timeline>
  );
}

const FAQ_DATA = [
  {
    value: 'shipping',
    question: 'How long does shipping take?',
    answer: 'Standard delivery arrives in three to five working days.',
  },
  {
    value: 'returns',
    question: 'What is your returns policy?',
    answer: 'Send anything back within 30 days for a full refund.',
  },
  {
    value: 'support',
    question: 'How do I contact support?',
    answer: 'Reply to your order email and a person will answer.',
  },
];

/** Renders the shared FAQ data in whichever accordion variant is asked for. */
function AccordionDemo({
  variant,
  selectionMode = 'single',
}: {
  variant: 'default' | 'surface' | 'separated' | 'bordered' | 'ghost';
  selectionMode?: 'single' | 'multiple';
}) {
  return (
    <Accordion
      variant={variant}
      selectionMode={selectionMode}
      defaultValue={selectionMode === 'multiple' ? ['shipping', 'returns'] : 'shipping'}
      className="w-full"
    >
      {FAQ_DATA.map((entry) => (
        <Accordion.Item key={entry.value} value={entry.value}>
          <Accordion.Trigger>
            <Accordion.Title>{entry.question}</Accordion.Title>
            <Accordion.Indicator />
          </Accordion.Trigger>
          <Accordion.Content>{entry.answer}</Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion>
  );
}

const STEP_DATA = [
  { title: 'Account', description: 'Create your login' },
  { title: 'Profile', description: 'Tell us about you' },
  { title: 'Billing', description: 'Add a payment method' },
];

function StepsDemo() {
  const [step, setStep] = useState(1);

  return (
    <View className="w-full gap-6">
      <Steps value={step} onValueChange={setStep}>
        {STEP_DATA.map((item, index) => (
          <Steps.Item
            key={item.title}
            step={index}
            className={index < STEP_DATA.length - 1 ? 'flex-1' : undefined}
          >
            <Steps.Trigger>
              <Steps.Indicator />
            </Steps.Trigger>
            {index < STEP_DATA.length - 1 ? <Steps.Separator /> : null}
          </Steps.Item>
        ))}
      </Steps>
      <View className="items-center gap-1">
        <Text weight="medium">{STEP_DATA[step]?.title}</Text>
        <Text size="sm" muted>
          {STEP_DATA[step]?.description}
        </Text>
      </View>
      <View className="flex-row gap-2">
        <Button
          variant="outline"
          className="flex-1"
          disabled={step === 0}
          onPress={() => setStep((current) => Math.max(0, current - 1))}
        >
          Back
        </Button>
        <Button
          className="flex-1"
          disabled={step === STEP_DATA.length - 1}
          onPress={() =>
            setStep((current) => Math.min(STEP_DATA.length - 1, current + 1))
          }
        >
          Next
        </Button>
      </View>
    </View>
  );
}

function ToastDemo() {
  const { toast } = useToast();

  return (
    <View className="w-full gap-3">
      <Button variant="outline" onPress={() => toast.show('Link copied to clipboard')}>
        Simple string
      </Button>
      <Button
        variant="outline"
        onPress={() =>
          toast.show({
            variant: 'success',
            label: 'Deployment complete',
            description: 'panelui.dev is live on production.',
            actionLabel: 'View',
          })
        }
      >
        With action
      </Button>
      <Button
        variant="outline"
        onPress={() =>
          toast.show({
            variant: 'destructive',
            label: 'Upload failed',
            description: 'The file exceeds the 25 MB limit.',
            placement: 'top',
          })
        }
      >
        Destructive, top
      </Button>
      <Button
        variant="outline"
        onPress={() => {
          // Fire several at once to show the deck: newest in front, the rest
          // peeking out behind it.
          (['default', 'info', 'success', 'warning'] as const).forEach(
            (variant, index) =>
              setTimeout(
                () =>
                  toast.show({
                    variant,
                    label: `Notification ${index + 1}`,
                    description: 'Swipe down to dismiss the front one.',
                    duration: 8000,
                  }),
                index * 220
              )
          );
        }}
      >
        Stack four
      </Button>
      <Button variant="ghost" onPress={() => toast.hideAll()}>
        Hide all
      </Button>
      <Button
        variant="outline"
        onPress={() =>
          toast.show({
            duration: 6000,
            component: ({ hide }) => (
              <Toast variant="info" onHide={hide}>
                <Toast.Indicator />
                <Toast.Content>
                  <Toast.Title>Custom component</Toast.Title>
                  <Toast.Description>
                    Rendered entirely by the caller.
                  </Toast.Description>
                </Toast.Content>
                <Toast.Close />
              </Toast>
            ),
          })
        }
      >
        Custom component
      </Button>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Catalogue                                                                  */
/* -------------------------------------------------------------------------- */

export const COMPONENTS: ComponentEntry[] = [
  {
    slug: 'accordion',
    name: 'Accordion',
    summary: 'Collapsible sections, single or multiple',
    demos: [
      { label: 'Default', render: () => <AccordionDemo variant="default" /> },
      { label: 'Surface', render: () => <AccordionDemo variant="surface" /> },
      { label: 'Separated', render: () => <AccordionDemo variant="separated" /> },
      { label: 'Bordered', render: () => <AccordionDemo variant="bordered" /> },
      { label: 'Ghost', render: () => <AccordionDemo variant="ghost" /> },
      {
        label: 'Multiple open',
        render: () => <AccordionDemo variant="surface" selectionMode="multiple" />,
      },
    ],
  },
  {
    slug: 'alert',
    name: 'Alert',
    summary: 'Status message with an icon',
    demos: [
      {
        label: 'Variants',
        render: () => (
          <View className="w-full gap-3">
            {(['info', 'success', 'warning', 'destructive'] as const).map((variant) => (
              <Alert key={variant} variant={variant}>
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Title>
                    {variant === 'info'
                      ? 'Heads up'
                      : variant === 'success'
                        ? 'Payment received'
                        : variant === 'warning'
                          ? 'Storage almost full'
                          : 'Something went wrong'}
                  </Alert.Title>
                  <Alert.Description>
                    {variant === 'info'
                      ? 'A new version of PanelUI is available.'
                      : variant === 'success'
                        ? 'Your invoice has been paid.'
                        : variant === 'warning'
                          ? "You've used 92% of your quota."
                          : 'Your session has expired.'}
                  </Alert.Description>
                </Alert.Content>
              </Alert>
            ))}
          </View>
        ),
      },
      {
        label: 'Title only',
        render: () => (
          <Alert variant="success">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Changes saved</Alert.Title>
            </Alert.Content>
          </Alert>
        ),
      },
      {
        label: 'No icon',
        render: () => (
          <Alert>
            <Alert.Content>
              <Alert.Title>Plain alert</Alert.Title>
              <Alert.Description>
                Omit Alert.Indicator for a text-only alert.
              </Alert.Description>
            </Alert.Content>
          </Alert>
        ),
      },
    ],
  },
  {
    slug: 'avatar',
    name: 'Avatar',
    summary: 'User image with initials fallback',
    demos: [
      {
        label: 'Sizes',
        render: () => (
          <View className="flex-row items-end gap-3">
            <Avatar size="sm" fallback="KA" />
            <Avatar fallback="KA" />
            <Avatar size="lg" fallback="PU" />
            <Avatar size="xl" fallback="P" />
          </View>
        ),
      },
      {
        label: 'With image',
        render: () => (
          <View className="flex-row items-end gap-3">
            <Avatar size="sm" source={{ uri: AVATARS[0] }} fallback="AB" />
            <Avatar source={{ uri: AVATARS[1] }} fallback="CD" />
            <Avatar size="lg" source={{ uri: AVATARS[2] }} fallback="EF" />
          </View>
        ),
      },
      {
        label: 'With notification badge',
        render: () => (
          <View className="flex-row items-center gap-6">
            <Avatar size="lg" source={{ uri: AVATARS[0] }} fallback="AB">
              <Avatar.Badge>
                <Badge variant="destructive" count={5} />
              </Avatar.Badge>
            </Avatar>
            <Avatar size="lg" source={{ uri: AVATARS[1] }} fallback="CD">
              <Avatar.Badge>
                <Badge variant="destructive" count={128} />
              </Avatar.Badge>
            </Avatar>
            <Avatar size="lg" fallback="EF">
              <Avatar.Badge>
                <Badge variant="success" shape="dot" />
              </Avatar.Badge>
            </Avatar>
          </View>
        ),
      },
      {
        label: 'Stacked group',
        render: () => (
          <View className="flex-row">
            {AVATARS.map((uri, index) => (
              <View key={uri} style={{ marginLeft: index === 0 ? 0 : -14 }}>
                <Avatar
                  source={{ uri }}
                  fallback={String.fromCharCode(65 + index)}
                  className="border-2 border-background"
                />
              </View>
            ))}
            <View style={{ marginLeft: -14 }}>
              <Avatar fallback="+5" className="border-2 border-background" />
            </View>
          </View>
        ),
      },
    ],
  },
  {
    slug: 'attachment',
    name: 'Attachment',
    summary: 'File row with upload states, built on Item',
    demos: [
      {
        label: 'Done',
        render: () => (
          <Attachment className="w-full">
            <Attachment.Media>
              <FileIcon size={18} />
            </Attachment.Media>
            <Attachment.Content>
              <Attachment.Title>sales-dashboard.pdf</Attachment.Title>
              <Attachment.Description>PDF · 2.4 MB</Attachment.Description>
            </Attachment.Content>
            <Attachment.Actions>
              <Attachment.Action accessibilityLabel="Remove sales-dashboard.pdf">
                <XIcon size={16} />
              </Attachment.Action>
            </Attachment.Actions>
          </Attachment>
        ),
      },
      { label: 'Upload states', render: () => <AttachmentStatesDemo /> },
      { label: 'A live upload', render: () => <AttachmentUploadDemo /> },
      {
        label: 'A group of thumbnails',
        render: () => (
          <Attachment.Group orientation="horizontal" className="w-full">
            {['cover.png', 'hero.jpg', 'logo.svg'].map((name) => (
              <Attachment key={name} orientation="vertical" className="w-32">
                <Attachment.Media variant="icon">
                  <ImageIcon size={18} />
                </Attachment.Media>
                <Attachment.Content>
                  <Attachment.Title className="text-sm">{name}</Attachment.Title>
                  <Attachment.Description>Image</Attachment.Description>
                </Attachment.Content>
              </Attachment>
            ))}
          </Attachment.Group>
        ),
      },
    ],
  },
  {
    slug: 'badge',
    name: 'Badge',
    summary: 'Compact status label',
    demos: [
      {
        label: 'Variants',
        render: () => (
          <View className="flex-row flex-wrap items-center justify-center gap-2">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="destructive">Error</Badge>
            <Badge variant="info">Info</Badge>
          </View>
        ),
      },
      {
        label: 'With status dot',
        render: () => (
          <View className="gap-2">
            {([
              ['success', '#10b981', 'Operational'],
              ['warning', '#f59e0b', 'Degraded'],
              ['destructive', '#ef4444', 'Outage'],
            ] as const).map(([variant, dot, text]) => (
              <Badge key={variant} variant={variant}>
                <View
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: dot }}
                />
                <Text size="xs" weight="medium">
                  {text}
                </Text>
              </Badge>
            ))}
          </View>
        ),
      },
    ],
  },
  {
    slug: 'bottom-sheet',
    name: 'BottomSheet',
    summary: 'Draggable sheet anchored to the bottom',
    demos: [
      {
        label: 'Basic',
        render: () => (
          <BottomSheet>
            <BottomSheet.Trigger>
              <Button variant="outline">Open sheet</Button>
            </BottomSheet.Trigger>
            <BottomSheet.Content>
              <Text size="lg" weight="semibold" className="mb-1">
                Share project
              </Text>
              <Text size="sm" muted className="mb-4">
                Anyone with the link can view this project.
              </Text>
              <View className="gap-3 pb-2">
                <Input placeholder="https://panelui.dev/p/xK2f9" />
                <Button>Copy link</Button>
              </View>
            </BottomSheet.Content>
          </BottomSheet>
        ),
      },
      {
        label: 'Without the close button',
        render: () => (
          // The corner X is on by default; drop it with showClose={false} when
          // the sheet is dismissible by drag or backdrop alone.
          <BottomSheet>
            <BottomSheet.Trigger>
              <Button variant="outline">Open, no X</Button>
            </BottomSheet.Trigger>
            <BottomSheet.Content showClose={false}>
              <Text size="lg" weight="semibold" className="mb-1">
                Drag to dismiss
              </Text>
              <Text size="sm" muted className="mb-4 pb-2">
                Pull the sheet down, or tap the backdrop.
              </Text>
            </BottomSheet.Content>
          </BottomSheet>
        ),
      },
      { label: 'Detached', render: () => <DetachedSheetDemo /> },
      { label: 'Full height', render: () => <FullHeightSheetDemo /> },
      { label: 'Form', render: () => <FormSheetDemo /> },
      { label: 'Scrollable list', render: () => <ScrollableSheetDemo /> },
      {
        label: 'Action list',
        render: () => (
          <BottomSheet>
            <BottomSheet.Trigger>
              <Button variant="outline">Open actions</Button>
            </BottomSheet.Trigger>
            <BottomSheet.Content>
              <Text size="lg" weight="semibold" className="mb-3">
                Project
              </Text>
              <View className="gap-2 pb-2">
                <Button variant="ghost" fullWidth>Rename</Button>
                <Button variant="ghost" fullWidth>Duplicate</Button>
                <Button variant="ghost" fullWidth>Archive</Button>
                <Button variant="destructive" fullWidth>Delete</Button>
              </View>
            </BottomSheet.Content>
          </BottomSheet>
        ),
      },
      { label: 'Native', render: () => <NativeBottomSheetDemo /> },
    ],
  },
  {
    slug: 'button',
    name: 'Button',
    summary: 'Pressable action with variants and loading',
    demos: [
      {
        label: 'Variants',
        render: () => (
          <View className="w-full gap-2">
            <Button fullWidth>Primary</Button>
            <Button fullWidth variant="secondary">
              Secondary
            </Button>
            <Button fullWidth variant="outline">
              Outline
            </Button>
            <Button fullWidth variant="ghost">
              Ghost
            </Button>
            <Button fullWidth variant="destructive">
              Delete
            </Button>
          </View>
        ),
      },
      {
        label: 'Sizes',
        render: () => (
          <View className="items-center gap-3">
            <Button size="sm" variant="outline">
              Small
            </Button>
            <Button>Medium</Button>
            <Button size="lg">Large</Button>
            <Button disabled>Disabled</Button>
          </View>
        ),
      },
      { label: 'Loading', render: () => <LoadingButtonDemo /> },
      {
        label: 'Social login',
        render: () => (
          <View className="w-full gap-3">
            <Button variant="social" fullWidth startContent={<GoogleIcon size={18} />}>
              Continue with Google
            </Button>
            <Button variant="social" fullWidth startContent={<FacebookIcon size={18} />}>
              Continue with Facebook
            </Button>
            <Button variant="social" fullWidth startContent={<AppleIcon size={18} />}>
              Continue with Apple
            </Button>
          </View>
        ),
      },
      {
        label: 'With icons',
        render: () => (
          <View className="w-full gap-2">
            <Button fullWidth startContent={<SearchIcon size={16} />}>
              Search
            </Button>
            <Button
              fullWidth
              variant="outline"
              endContent={<ChevronRightIcon size={16} />}
            >
              Continue
            </Button>
            <Button size="icon" variant="outline">
              <SearchIcon size={18} />
            </Button>
          </View>
        ),
      },
      {
        label: 'Native',
        render: () => (
          <NativeDemo>
            <Button native onPress={() => {}}>
              Filled
            </Button>
            <Button native variant="outline" onPress={() => {}}>
              Outlined
            </Button>
            {/* Native buttons size to their labels, so a row of them reads as
                a row of buttons rather than as two halves of the screen. */}
            <View className="w-full flex-row items-center gap-3">
              <Button native variant="ghost" onPress={() => {}}>
                Text
              </Button>
              <Button native size="sm" onPress={() => {}}>
                Small
              </Button>
            </View>
          </NativeDemo>
        ),
      },
    ],
  },
  {
    slug: 'card',
    name: 'Card',
    summary: 'Grouped content surface',
    demos: [
      {
        label: 'Basic card',
        render: () => (
          <Card className="w-full">
            <Card.Header>
              <Card.Title>Living room Sofa</Card.Title>
              <Card.Description>
                This sofa is perfect for modern tropical spaces, baroque
                inspired spaces.
              </Card.Description>
            </Card.Header>
            <Card.Footer className="gap-2">
              <Button fullWidth>Buy now</Button>
            </Card.Footer>
          </Card>
        ),
      },
      {
        label: 'With form',
        render: () => (
          <Card className="w-full">
            <Card.Header>
              <Card.Title>Project settings</Card.Title>
              <Card.Description>
                Manage how your project appears to others.
              </Card.Description>
            </Card.Header>
            <Card.Content className="gap-4">
              <Input label="Project name" placeholder="PanelUI" />
              <Input
                label="Description"
                placeholder="A short description"
                description="Shown on your public profile."
              />
            </Card.Content>
            <Card.Footer>
              <Button size="sm">Save</Button>
              <Button size="sm" variant="ghost">
                Cancel
              </Button>
            </Card.Footer>
          </Card>
        ),
      },
      {
        label: 'With image',
        render: () => (
          <Card className="w-full overflow-hidden">
            <Image
              source={{ uri: PHOTO }}
              style={{ width: '100%', height: 180 }}
              resizeMode="cover"
            />
            <Card.Header>
              <Text size="sm" weight="medium" className="text-info-foreground">
                $450
              </Text>
              <Card.Title>Living room Sofa</Card.Title>
              <Card.Description>
                Perfect for modern tropical spaces and baroque inspired rooms.
              </Card.Description>
            </Card.Header>
            <Card.Footer>
              <Button fullWidth>Buy now</Button>
            </Card.Footer>
          </Card>
        ),
      },
      {
        label: 'Horizontal',
        render: () => (
          <Card className="w-full overflow-hidden">
            <Card.Content className="flex-row items-center gap-4 p-3">
              <Image
                source={{ uri: PHOTO }}
                style={{ width: 72, height: 72, borderRadius: 12 }}
                resizeMode="cover"
              />
              <View className="flex-1 gap-0.5">
                <Text weight="semibold">Accent chair</Text>
                <Text size="sm" muted>
                  Walnut and boucle
                </Text>
                <Badge variant="success">In stock</Badge>
              </View>
            </Card.Content>
          </Card>
        ),
      },
    ],
  },
  {
    slug: 'checkbox',
    name: 'Checkbox',
    summary: 'Multi-select control with label',
    demos: [
      { label: 'With descriptions', render: () => <CheckboxDemo /> },
      { label: 'Card', render: () => <CheckboxCardDemo /> },
      {
        label: 'States',
        render: () => (
          <View className="gap-4">
            <Checkbox checked onCheckedChange={() => {}} label="Checked" />
            <Checkbox checked={false} onCheckedChange={() => {}} label="Unchecked" />
            <Checkbox checked disabled onCheckedChange={() => {}} label="Disabled" />
          </View>
        ),
      },
    ],
  },
  {
    slug: 'chip',
    name: 'Chip',
    summary: 'Interactive pill — filter, tag, or token',
    demos: [
      {
        label: 'Variants',
        render: () => (
          <View className="flex-row flex-wrap items-center justify-center gap-2">
            <Chip>Default</Chip>
            <Chip variant="primary">Primary</Chip>
            <Chip variant="outline">Outline</Chip>
            <Chip variant="success">Shipped</Chip>
            <Chip variant="warning">Beta</Chip>
            <Chip variant="info">New</Chip>
            <Chip variant="destructive">Blocked</Chip>
          </View>
        ),
      },
      {
        label: 'Sizes',
        render: () => (
          <View className="flex-row flex-wrap items-center justify-center gap-2">
            <Chip size="sm">Small</Chip>
            <Chip size="md">Medium</Chip>
            <Chip size="lg">Large</Chip>
          </View>
        ),
      },
      {
        label: 'With a leading icon',
        render: () => (
          <View className="flex-row flex-wrap items-center justify-center gap-2">
            <Chip variant="success" start={<CheckIcon size={13} />}>
              <Chip.Label>Available</Chip.Label>
            </Chip>
            <Chip variant="outline" start={<SearchIcon size={13} />}>
              <Chip.Label>Search</Chip.Label>
            </Chip>
          </View>
        ),
      },
      { label: 'A filter bar', render: () => <ChipFilterDemo /> },
      { label: 'Removable tokens', render: () => <ChipRemovableDemo /> },
    ],
  },
  {
    slug: 'dialog',
    name: 'Dialog',
    summary: 'Modal confirmation overlay',
    demos: [
      {
        label: 'Confirmation',
        render: () => (
          <Dialog>
            <Dialog.Trigger>
              <Button variant="outline">Open dialog</Button>
            </Dialog.Trigger>
            <Dialog.Content>
              <Dialog.Title>Delete project?</Dialog.Title>
              <Dialog.Description>
                This action cannot be undone. The project and all of its data
                will be permanently removed.
              </Dialog.Description>
              <Dialog.Footer>
                <Dialog.Close>
                  <Button size="sm" variant="ghost">
                    Cancel
                  </Button>
                </Dialog.Close>
                <Dialog.Close>
                  <Button size="sm" variant="destructive">
                    Delete
                  </Button>
                </Dialog.Close>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog>
        ),
      },
      {
        label: 'Informational',
        render: () => (
          <Dialog>
            <Dialog.Trigger>
              <Button variant="outline">What's new</Button>
            </Dialog.Trigger>
            <Dialog.Content>
              <Dialog.Title>PanelUI 0.4</Dialog.Title>
              <Dialog.Description>
                Themes now change corner radius as well as colour, and there is
                a new Steps component for multi-step flows.
              </Dialog.Description>
              <Dialog.Footer>
                <Dialog.Close>
                  <Button size="sm">Got it</Button>
                </Dialog.Close>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog>
        ),
      },
      {
        label: 'Blurred background',
        render: () => (
          <Dialog>
            <Dialog.Trigger>
              <Button variant="outline">Open, blurred</Button>
            </Dialog.Trigger>
            {/* `blur` frosts the screen instead of dimming it — and falls back
                to the dim when expo-blur is not installed. */}
            <Dialog.Content blur>
              <Dialog.Title>Leave without saving?</Dialog.Title>
              <Dialog.Description>
                Your changes will be lost. The screen behind is blurred so the
                choice is the only thing in focus.
              </Dialog.Description>
              <Dialog.Footer>
                <Dialog.Close>
                  <Button size="sm" variant="ghost">
                    Keep editing
                  </Button>
                </Dialog.Close>
                <Dialog.Close>
                  <Button size="sm" variant="destructive">
                    Discard
                  </Button>
                </Dialog.Close>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog>
        ),
      },
    ],
  },
  {
    slug: 'direction',
    name: 'Direction',
    summary: 'Reading direction for everything below it',
    demos: [
      { label: 'Flip it live', render: () => <DirectionFlipDemo /> },
      { label: 'Nested, with an island', render: () => <DirectionNestedDemo /> },
      {
        label: 'Right to left',
        render: () => (
          <Direction dir="rtl" className="w-full flex-none">
            <DirectionRows />
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
    slug: 'frame',
    name: 'Frame',
    summary: 'Widget shell with a titled header and a flush inner card',
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
                  <View className="w-24">
                    <Text size="sm" weight="medium" numberOfLines={1}>
                      {model}
                    </Text>
                  </View>
                  <Text size="sm" className="flex-1" numberOfLines={1}>
                    {task}
                  </Text>
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
              <Frame.Row className="gap-2">
                <Chip size="sm" variant="success">
                  2 Running
                </Chip>
                <Chip size="sm">1 Idle</Chip>
                <Chip size="sm" variant="outline">
                  1 Done
                </Chip>
                <View className="flex-1" />
                <Text size="xs" muted>
                  15m12s ago
                </Text>
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
                  <Meter percent={pct as number} />
                  <Text className="flex-1">{label}</Text>
                  <Text weight="medium">{value}</Text>
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
                  <Avatar size="sm" fallback={initials} />
                  <View className="flex-1">
                    <Text size="sm" weight="medium">
                      {name}
                    </Text>
                    <Text size="xs" muted>
                      {email}
                    </Text>
                  </View>
                  <Badge variant="outline">{role}</Badge>
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
        label: 'Uptime strip',
        id: 'uptime',
        fullPage: true,
        description: 'One row per column — the same grid used as a band.',
        render: () => <HeatmapUptimeVersion />,
      },
    ],
  },
  {
    slug: 'input',
    name: 'Input',
    summary: 'Text field with label and validation',
    demos: [
      {
        label: 'States',
        render: () => (
          <View className="w-full gap-4">
            <Input label="Name" placeholder="Khalid Abdi" />
            <Input
              label="Description"
              placeholder="A short description"
              description="Shown on your public profile."
            />
            <Input
              label="Email"
              placeholder="you@example.com"
              errorMessage="This email is already taken."
            />
            <Input label="Plan" value="Premium" disabled />
          </View>
        ),
      },
      {
        label: 'Sizes',
        render: () => (
          <View className="w-full gap-4">
            <Input size="sm" label="Small" placeholder="40 tall" />
            <Input size="md" label="Medium" placeholder="48 tall" />
            <Input size="lg" label="Large" placeholder="56 tall" />
          </View>
        ),
      },
      {
        label: 'Filled',
        render: () => (
          // `filled` inside a card: a second border beside the card's own
          // reads as a seam, so the field carries a background instead.
          <Card className="w-full">
            <Card.Content className="gap-4 p-4">
              <Input variant="filled" label="Workspace" placeholder="Acme" isRequired />
              <Input
                variant="filled"
                label="Notes"
                placeholder="Anything we should know?"
                multiline
              />
            </Card.Content>
          </Card>
        ),
      },
      {
        label: 'In a form',
        render: () => (
          <Card className="w-full">
            <Card.Header>
              <Card.Title>Sign in</Card.Title>
              <Card.Description>Welcome back.</Card.Description>
            </Card.Header>
            <Card.Content className="gap-4">
              <Input label="Email" placeholder="you@example.com" isRequired />
              <Input label="Password" secureTextEntry placeholder="••••••••" isRequired />
            </Card.Content>
            <Card.Footer>
              <Button fullWidth>Continue</Button>
            </Card.Footer>
          </Card>
        ),
      },
      {
        label: 'Lifting in a scroll view',
        id: 'in-a-scroll-view',
        fullPage: true,
        description:
          'A field that lifts by its overlap with the keyboard, and keeps its place in the form as you scroll.',
        render: () => <KeyboardLiftDemo />,
      },
      {
        label: 'Docked composer',
        id: 'docked-composer',
        fullPage: true,
        description:
          'A bar pinned to the bottom edge that rides the keyboard up and back down.',
        render: () => <KeyboardDockDemo />,
      },
    ],
  },
  {
    slug: 'input-group',
    name: 'InputGroup',
    summary: 'Input with prefix and suffix decorators',
    demos: [
      {
        label: 'With prefix',
        render: () => (
          <InputGroup className="w-full">
            <InputGroup.Prefix isDecorative>
              <SearchIcon size={16} />
            </InputGroup.Prefix>
            <InputGroup.Input placeholder="Search products…" />
          </InputGroup>
        ),
      },
      { label: 'Interactive suffix', render: () => <PasswordInputDemo /> },
      {
        label: 'Disabled',
        render: () => (
          <InputGroup isDisabled className="w-full">
            <InputGroup.Prefix isDecorative>
              <SearchIcon size={16} />
            </InputGroup.Prefix>
            <InputGroup.Input placeholder="Disabled input" />
          </InputGroup>
        ),
      },
    ],
  },
  {
    slug: 'item',
    name: 'Item',
    summary: 'Row of media, text and actions',
    demos: [
      {
        label: 'Variants',
        render: () => (
          <View className="w-full gap-3">
            {(['default', 'outline', 'muted'] as const).map((variant) => (
              <Item key={variant} variant={variant}>
                <Item.Media variant="icon">
                  <PackageIcon size={18} />
                </Item.Media>
                <Item.Content>
                  <Item.Title>{variant}</Item.Title>
                  <Item.Description>
                    The {variant} surface treatment.
                  </Item.Description>
                </Item.Content>
                <Item.Actions>
                  <Badge variant="secondary">New</Badge>
                </Item.Actions>
              </Item>
            ))}
          </View>
        ),
      },
      {
        label: 'Sizes',
        render: () => (
          <View className="w-full gap-3">
            {(['default', 'sm', 'xs'] as const).map((size) => (
              <Item key={size} variant="outline" size={size}>
                <Item.Media variant="icon">
                  <ReceiptIcon size={size === 'xs' ? 12 : 16} />
                </Item.Media>
                <Item.Content>
                  <Item.Title>Size {size}</Item.Title>
                  <Item.Description>
                    Media, title and description all follow it.
                  </Item.Description>
                </Item.Content>
              </Item>
            ))}
          </View>
        ),
      },
      {
        label: 'Media types',
        render: () => (
          <View className="w-full gap-3">
            <Item variant="outline">
              <Item.Media variant="icon">
                <BellIcon size={18} />
              </Item.Media>
              <Item.Content>
                <Item.Title>Icon tile</Item.Title>
                <Item.Description>variant=&quot;icon&quot;</Item.Description>
              </Item.Content>
            </Item>

            <Item variant="outline">
              <Item.Media variant="image">
                <Image source={{ uri: PHOTO }} className="h-full w-full" />
              </Item.Media>
              <Item.Content>
                <Item.Title>Thumbnail</Item.Title>
                <Item.Description>variant=&quot;image&quot;</Item.Description>
              </Item.Content>
            </Item>

            <Item variant="outline">
              <Item.Media>
                <Avatar size="md" source={{ uri: AVATARS[0] }} fallback="KA" />
              </Item.Media>
              <Item.Content>
                <Item.Title>Avatar passed through</Item.Title>
                <Item.Description>
                  The default media variant adds no box.
                </Item.Description>
              </Item.Content>
            </Item>
          </View>
        ),
      },
      {
        label: 'A settings group',
        render: () => (
          <Card className="w-full overflow-hidden">
            <Item.Group>
              {[
                ['Notifications', 'Push, email and in-app'],
                ['Privacy', 'Who can see your activity'],
                ['Appearance', 'Theme and text size'],
              ].map(([title, description], index) => (
                <View key={title}>
                  {index > 0 ? <Item.Separator /> : null}
                  <Item size="sm" onPress={() => {}}>
                    <Item.Content>
                      <Item.Title>{title}</Item.Title>
                      <Item.Description>{description}</Item.Description>
                    </Item.Content>
                    <Item.Actions>
                      <ChevronRightIcon size={16} />
                    </Item.Actions>
                  </Item>
                </View>
              ))}
            </Item.Group>
          </Card>
        ),
      },
      {
        label: 'Horizontal group of cards',
        render: () => (
          <View className="w-full gap-4">
            <Text size="sm" muted>
              Two independent axes. `orientation` on the group runs the items
              across instead of down; `orientation` on each item stacks its own
              parts into a card. A carousel wants both.
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <Item.Group orientation="horizontal">
                {[
                  ['Starter', '$0', 'One project'],
                  ['Pro', '$12', 'Unlimited projects'],
                  ['Team', '$40', 'Shared workspaces'],
                ].map(([name, price, summary]) => (
                  <Item
                    key={name}
                    orientation="vertical"
                    variant="outline"
                    className="w-48"
                  >
                    <Item.Media variant="icon">
                      <PackageIcon size={18} />
                    </Item.Media>
                    <Item.Content>
                      <Item.Title>{name}</Item.Title>
                      <Item.Description>{summary}</Item.Description>
                    </Item.Content>
                    <Item.Footer>
                      <Text weight="semibold">{price}</Text>
                      <Text size="xs" muted>
                        per month
                      </Text>
                    </Item.Footer>
                  </Item>
                ))}
              </Item.Group>
            </ScrollView>
          </View>
        ),
      },
      {
        label: 'A vertical item',
        render: () => (
          // orientation="vertical" is also what Header and Footer need — both
          // are full-width strips, so they only make sense once it stacks.
          <Item orientation="vertical" variant="outline">
            <Item.Header>
              <Badge variant="secondary">Draft</Badge>
              <Text size="xs" muted>
                Updated 2h ago
              </Text>
            </Item.Header>
            <Item.Content>
              <Item.Title>Quarterly report</Item.Title>
              <Item.Description>
                Revenue, retention and headcount for Q3.
              </Item.Description>
            </Item.Content>
            <Item.Footer>
              <Button size="sm" variant="outline">
                Preview
              </Button>
              <Button size="sm">Publish</Button>
            </Item.Footer>
          </Item>
        ),
      },
    ],
  },
  {
    slug: 'label',
    name: 'Label',
    summary: 'Form field label with required and invalid states',
    demos: [
      {
        label: 'States',
        render: () => (
          <View className="w-full gap-5">
            <View className="gap-1.5">
              <Label>Username</Label>
              <Input placeholder="Choose a username" />
            </View>
            <View className="gap-1.5">
              <Label isRequired>Password</Label>
              <Input placeholder="Create a password" secureTextEntry />
            </View>
            <View className="gap-1.5">
              <Label isInvalid>Confirm password</Label>
              <Input value="different" errorMessage="Passwords do not match" />
            </View>
            <View className="gap-1.5">
              <Label isDisabled>Subscription plan</Label>
              <Input value="Premium" disabled />
            </View>
          </View>
        ),
      },
      {
        label: 'Custom layout',
        render: () => (
          <View className="w-full gap-1.5">
            <Label isRequired>
              <Label.Text className="text-base font-semibold">
                API key
              </Label.Text>
            </Label>
            <Input placeholder="sk-…" />
          </View>
        ),
      },
    ],
  },
  {
    slug: 'line-chart',
    name: 'LineChart',
    summary: 'Animated time series, drawn on the UI thread',
    demos: [
      {
        label: 'Basic',
        id: 'basic',
        fullPage: true,
        description: 'Two straight-line series sharing one axis, with a legend.',
        render: () => <ChartBasicVersion />,
      },
      {
        label: 'With dots',
        id: 'dots',
        fullPage: true,
        description: 'A dot at every point, for a short series where each reading matters.',
        render: () => <ChartDotsVersion />,
      },
      {
        label: 'Crosshair',
        id: 'crosshair',
        fullPage: true,
        description: 'Drag across the chart and a label rides the crosshair with the value.',
        render: () => <ChartCrosshairVersion />,
      },
      {
        label: 'Animated line',
        id: 'animated',
        fullPage: true,
        description: 'A Replay button re-runs the reveal through the chart ref.',
        render: () => <ChartAnimatedVersion />,
      },
      {
        label: 'Finance',
        id: 'finance',
        fullPage: true,
        description: 'A balance, a delta, and a range selector that tweens the axis on change.',
        render: () => <ChartFinanceVersion />,
      },
      {
        label: 'Dashed comparison',
        id: 'dashed',
        fullPage: true,
        description: 'A solid actual against a dashed target — told apart by shape, not just colour.',
        render: () => <ChartDashedVersion />,
      },
      {
        label: 'Multi-line',
        id: 'multi',
        fullPage: true,
        description: 'Four series in the chart-token ramp.',
        render: () => <ChartMultiVersion />,
      },
      {
        label: 'KPI sparklines',
        id: 'kpi',
        fullPage: true,
        description: 'Compact lines beside a headline number — no grid, no axis.',
        render: () => <ChartKpiVersion />,
      },
    ],
  },
  {
    slug: 'marker',
    name: 'Marker',
    summary: 'Inline note between conversation turns',
    demos: [
      {
        label: 'Status rows',
        render: () => (
          <View className="w-full">
            <Marker>
              <Marker.Icon>
                <SearchIcon size={14} />
              </Marker.Icon>
              <Marker.Content>Explored 4 files</Marker.Content>
            </Marker>
            <Marker>
              <Marker.Icon>
                <CheckIcon size={14} />
              </Marker.Icon>
              <Marker.Content>Applied 2 edits to invoice.ts</Marker.Content>
            </Marker>
            <Marker>
              <Marker.Icon>
                <ShieldCheckIcon size={14} />
              </Marker.Icon>
              <Marker.Content>Type check passed</Marker.Content>
            </Marker>
          </View>
        ),
      },
      {
        label: 'A step still running',
        render: () => (
          <View className="w-full">
            <Marker>
              <Marker.Icon>
                <CheckIcon size={14} />
              </Marker.Icon>
              <Marker.Content>Read 12 files</Marker.Content>
            </Marker>
            {/* Shimmer marks the row in flight — dropped once it finishes. */}
            <Marker>
              <Marker.Icon>
                <SearchIcon size={14} />
              </Marker.Icon>
              <Marker.Content shimmer>Searching the codebase…</Marker.Content>
            </Marker>
          </View>
        ),
      },
      {
        label: 'Variants',
        render: () => (
          <View className="w-full gap-2">
            <Marker>
              <Marker.Icon>
                <InfoIcon size={14} />
              </Marker.Icon>
              <Marker.Content>default — the plain status row</Marker.Content>
            </Marker>
            <Marker variant="border">
              <Marker.Icon>
                <InfoIcon size={14} />
              </Marker.Icon>
              <Marker.Content>border — closed by a hairline</Marker.Content>
            </Marker>
            <Marker variant="separator">
              <Marker.Content>Yesterday</Marker.Content>
            </Marker>
          </View>
        ),
      },
      {
        label: 'In a transcript',
        render: () => (
          <View className="w-full gap-3">
            <Marker variant="separator">
              <Marker.Content>Today</Marker.Content>
            </Marker>

            <Message align="end">
              <Message.Content>
                <Message.Bubble>
                  <Message.BubbleContent>
                    Where is the invoice total calculated?
                  </Message.BubbleContent>
                </Message.Bubble>
              </Message.Content>
            </Message>

            <Marker onPress={() => {}}>
              <Marker.Icon>
                <SearchIcon size={14} />
              </Marker.Icon>
              <Marker.Content>Searched 128 files</Marker.Content>
            </Marker>

            <Message>
              <Message.Avatar>
                <Avatar size="sm" fallback="AI" />
              </Message.Avatar>
              <Message.Content>
                <Message.Bubble>
                  <Message.BubbleContent>
                    In `billing/total.ts` — it sums the line items, then applies
                    tax.
                  </Message.BubbleContent>
                </Message.Bubble>
              </Message.Content>
            </Message>
          </View>
        ),
      },
    ],
  },
  {
    slug: 'message-scroller',
    name: 'MessageScroller',
    summary: 'Scroll behaviour a chat transcript needs',
    demos: [
      {
        label: 'Following a streamed reply',
        id: 'streaming',
        fullPage: true,
        description:
          'Pins to the bottom while a reply streams — but only while you are already there. Scroll up mid-stream and it stops chasing.',
        render: () => <StreamingTranscriptDemo />,
      },
      {
        label: 'Loading history',
        id: 'history',
        fullPage: true,
        description:
          'Older turns are added above you. The message you are reading does not move.',
        render: () => <HistoryTranscriptDemo />,
      },
      {
        label: 'Opening a saved thread',
        id: 'saved',
        fullPage: true,
        description:
          'Opens on the last turn that started something, rather than at the bottom of the reply to it.',
        render: () => <SavedThreadDemo />,
      },
    ],
  },
  {
    slug: 'message',
    name: 'Message',
    summary: 'Chat turn with avatar, bubble and metadata',
    demos: [
      {
        label: 'Both sides',
        render: () => (
          <View className="w-full gap-3">
            <Message>
              <Message.Avatar>
                <Avatar size="sm" source={{ uri: AVATARS[1] }} fallback="OL" />
              </Message.Avatar>
              <Message.Content>
                <Message.Bubble>
                  <Message.BubbleContent>
                    How can I help you today?
                  </Message.BubbleContent>
                </Message.Bubble>
              </Message.Content>
            </Message>

            <Message align="end">
              <Message.Content>
                <Message.Bubble>
                  <Message.BubbleContent>
                    Set a reminder for 9am tomorrow.
                  </Message.BubbleContent>
                </Message.Bubble>
                <Message.Footer>Read</Message.Footer>
              </Message.Content>
            </Message>
          </View>
        ),
      },
      {
        label: 'Header and footer',
        render: () => (
          <View className="w-full gap-3">
            <Message>
              <Message.Avatar>
                <Avatar size="sm" source={{ uri: AVATARS[2] }} fallback="OL" />
              </Message.Avatar>
              <Message.Content>
                <Message.Header>Olivia</Message.Header>
                <Message.Bubble>
                  <Message.BubbleContent>
                    I pushed the fix — can you take another look?
                  </Message.BubbleContent>
                </Message.Bubble>
                <Message.Footer>Yesterday at 18:04</Message.Footer>
              </Message.Content>
            </Message>
          </View>
        ),
      },
      {
        label: 'Grouped turns',
        render: () => (
          // Only the first message keeps its avatar; the rest reserve the slot
          // so the bubbles stay in one column.
          <Message.Group align="start" className="w-full">
            {[
              'Looking that up…',
              'Found three matching invoices.',
              'Want me to export them?',
            ].map((body) => (
              <Message key={body}>
                <Message.Avatar>
                  <Avatar size="sm" fallback="AI" />
                </Message.Avatar>
                <Message.Content>
                  <Message.Bubble>
                    <Message.BubbleContent>{body}</Message.BubbleContent>
                  </Message.Bubble>
                </Message.Content>
              </Message>
            ))}
          </Message.Group>
        ),
      },
      {
        label: 'Streaming and actions',
        render: () => (
          <View className="w-full gap-3">
            <Message>
              <Message.Avatar>
                <Avatar size="sm" fallback="AI" />
              </Message.Avatar>
              <Message.Content>
                <Message.Bubble>
                  <Shimmer textClassName="text-base">Thinking…</Shimmer>
                </Message.Bubble>
              </Message.Content>
            </Message>

            <Message>
              <Message.Avatar>
                <Avatar size="sm" fallback="AI" />
              </Message.Avatar>
              <Message.Content>
                <Message.Bubble>
                  <Message.BubbleContent>
                    Your reminder is set for 9:00 tomorrow.
                  </Message.BubbleContent>
                </Message.Bubble>
                <Message.Actions>
                  <Button size="sm" variant="ghost">
                    Copy
                  </Button>
                  <Button size="sm" variant="ghost">
                    Retry
                  </Button>
                </Message.Actions>
              </Message.Content>
            </Message>
          </View>
        ),
      },
      { label: 'Long-press for actions', render: () => <MessageLongPressDemo /> },
    ],
  },
  {
    slug: 'popover',
    name: 'Popover',
    summary: 'Panel anchored to the thing that opened it',
    demos: [
      {
        label: 'Menu of actions',
        render: () => (
          <Popover>
            <Popover.Trigger>
              <Button variant="outline">Options</Button>
            </Popover.Trigger>
            <Popover.Content align="start" className="w-52 gap-0 p-1.5">
              {[
                { label: 'Share', icon: <ShareNodesIcon size={16} /> },
                { label: 'Add to list', icon: <PlusSquareIcon size={16} /> },
                { label: 'Download', icon: <PackageIcon size={16} /> },
              ].map((action) => (
                <Popover.Close key={action.label}>
                  <Pressable
                    accessibilityRole="menuitem"
                    onPress={() => {}}
                    className="flex-row items-center gap-3 rounded-xl px-3 py-2.5 active:bg-accent"
                  >
                    {action.icon}
                    <Text size="sm">{action.label}</Text>
                  </Pressable>
                </Popover.Close>
              ))}
            </Popover.Content>
          </Popover>
        ),
      },
      {
        label: 'Placement',
        render: () => (
          // Each trigger is pinned to the side that leaves room for the panel
          // to open the way its label says — so left and right are actually
          // distinct rather than both flipping inward.
          <View className="h-72 w-full justify-between py-4">
            <View className="flex-row justify-center">
              <PlacementPopover placement="bottom" />
            </View>
            <View className="flex-row items-center justify-between">
              <PlacementPopover placement="right" />
              <PlacementPopover placement="left" />
            </View>
            <View className="flex-row justify-center">
              <PlacementPopover placement="top" />
            </View>
          </View>
        ),
      },
      {
        label: 'With an arrow',
        render: () => (
          <View className="w-full items-center py-4">
            <Popover>
              <Popover.Trigger>
                <Button variant="ghost" size="icon" accessibilityLabel="What is this?">
                  <InfoIcon size={18} />
                </Button>
              </Popover.Trigger>
              {/* Default bottom placement: the arrow sits centred on the
                  panel's top edge, pointing up at the trigger. */}
              <Popover.Content className="w-60">
                <Popover.Arrow />
                <Popover.Title>Monthly active users</Popover.Title>
                <Popover.Description>
                  Anyone who opened the app at least once in the last 30 days.
                </Popover.Description>
              </Popover.Content>
            </Popover>
          </View>
        ),
      },
      {
        label: 'A form, matching the trigger width',
        render: () => <PopoverFormDemo />,
      },
      {
        label: 'Blurred background',
        render: () => (
          <View className="w-full items-center py-4">
            <Popover>
              <Popover.Trigger>
                <Button variant="outline">Frost the screen</Button>
              </Popover.Trigger>
              {/* `blur` frosts what is behind, falling back to a dim when
                  expo-blur is not installed. */}
              <Popover.Content blur align="start" className="w-64">
                <Popover.Arrow />
                <Popover.Title>Focus here</Popover.Title>
                <Popover.Description>
                  The list behind is blurred so this panel reads as the only
                  thing to deal with.
                </Popover.Description>
              </Popover.Content>
            </Popover>
          </View>
        ),
      },
      {
        label: 'As a bottom sheet',
        render: () => (
          <View className="w-full items-center py-4">
            {/* Same API, presented as a draggable sheet — better for a form on
                a small screen than a panel floating over the trigger. */}
            <Popover presentation="bottom-sheet">
              <Popover.Trigger>
                <Button variant="outline">Open as a sheet</Button>
              </Popover.Trigger>
              <Popover.Content>
                <Popover.Title>Sort by</Popover.Title>
                <Popover.Description className="mb-2">
                  The same content, presented from the bottom.
                </Popover.Description>
                {['Newest', 'Oldest', 'Most active'].map((option) => (
                  <Popover.Close key={option}>
                    <Pressable
                      accessibilityRole="menuitem"
                      onPress={() => {}}
                      className="rounded-xl px-3 py-3 active:bg-accent"
                    >
                      <Text>{option}</Text>
                    </Pressable>
                  </Popover.Close>
                ))}
              </Popover.Content>
            </Popover>
          </View>
        ),
      },
    ],
  },
  {
    slug: 'progress',
    name: 'Progress',
    summary: 'Determinate and indeterminate progress bar',
    demos: [
      { label: 'Animated', render: () => <ProgressDemo /> },
      {
        label: 'Labelled',
        render: () => (
          <View className="w-full gap-4">
            <Progress value={64} label="Downloading" showValueLabel />
            <Progress
              value={40}
              color="success"
              label="Storage"
              showValueLabel
              formatOptions={{ style: 'currency', currency: 'USD' }}
              valueLabel="8.2 GB of 20 GB"
            />
            <Progress value={90} color="warning" showValueLabel />
          </View>
        ),
      },
      {
        label: 'Colors',
        render: () => (
          <View className="w-full gap-4">
            <Progress value={35} />
            <Progress value={55} color="success" />
            <Progress value={75} color="warning" />
            <Progress value={90} color="destructive" />
          </View>
        ),
      },
      {
        label: 'Sizes',
        render: () => (
          <View className="w-full gap-4">
            <Progress value={60} size="sm" />
            <Progress value={60} />
            <Progress value={60} size="lg" />
          </View>
        ),
      },
    ],
  },
  {
    slug: 'radio-group',
    name: 'RadioGroup',
    summary: 'Single-select list of options',
    demos: [
      { label: 'Plans', render: () => <RadioGroupDemo /> },
      { label: 'Horizontal', render: () => <RadioGroupRowDemo /> },
      { label: 'Cards', render: () => <RadioGroupCardDemo /> },
      {
        label: 'In a card',
        render: () => (
          <Card className="w-full">
            <Card.Header>
              <Card.Title>Delivery speed</Card.Title>
              <Card.Description>Choose how fast you need it.</Card.Description>
            </Card.Header>
            <Card.Content>
              <RadioGroupDemo />
            </Card.Content>
          </Card>
        ),
      },
    ],
  },
  {
    slug: 'section-rail',
    name: 'SectionRail',
    summary: 'Floating section navigator for a long screen',
    demos: [
      {
        label: 'Bottom right',
        id: 'bottom-right',
        fullPage: true,
        description:
          'Out of the corner, clear of the text, with the panel opening upward. Haptics on.',
        render: () => <SectionRailVersion align="bottom" haptics />,
      },
      {
        label: 'Bottom left',
        id: 'bottom-left',
        fullPage: true,
        description: 'The same corner treatment against the other edge.',
        render: () => <SectionRailVersion placement="left" align="bottom" haptics />,
      },
      {
        label: 'Pager',
        id: 'pager',
        fullPage: true,
        description:
          'One section per screen. Swipe up and the rail in the bottom-left tracks the page.',
        render: () => <SectionRailPagerVersion />,
      },
      {
        label: 'Centred on the edge',
        id: 'side',
        fullPage: true,
        description:
          'The original placement — halfway down the right edge, over the content it indexes.',
        render: () => <SectionRailVersion />,
      },
    ],
  },
  {
    slug: 'select',
    name: 'Select',
    summary: 'Picker shown in a sheet, in place, or floating over the page',
    demos: [
      { label: 'Sheet (default)', render: () => <SelectDemo /> },
      {
        label: 'Inline — the row grows',
        render: () => (
          <View className="w-full gap-4">
            <RegionSelectDemo presentation="inline" />
            <Text size="sm" muted>
              The list expands in layout flow, so this paragraph is pushed down
              by its height. Right inside a settings list, where that reads as
              the row growing.
            </Text>
          </View>
        ),
      },
      {
        label: 'Overlay — nothing below moves',
        render: () => (
          <View className="w-full gap-4">
            <RegionSelectDemo presentation="overlay" />
            <Text size="sm" muted>
              This paragraph stays exactly where it is when the list above
              opens. With `inline` it would be pushed down by the height of the
              list.
            </Text>
            <Button variant="outline" fullWidth>
              And so does this button
            </Button>
          </View>
        ),
      },
      {
        label: 'Overlay width',
        render: () => (
          <View className="w-full gap-4">
            <RegionSelectDemo presentation="overlay" contentWidth="content" />
            <RegionSelectDemo presentation="overlay" contentWidth={220} />
          </View>
        ),
      },
      {
        label: 'In a form',
        render: () => (
          <Card className="w-full">
            <Card.Content className="gap-4 p-4">
              <Input label="Full name" placeholder="Khalid Abdi" />
              <SelectDemo />
              <RegionSelectDemo presentation="overlay" />
            </Card.Content>
          </Card>
        ),
      },
      { label: 'Native — menu', render: () => <NativeSelectDemo /> },
      { label: 'Native — wheel', render: () => <NativeWheelPickerDemo /> },
    ],
  },
  {
    slug: 'surface',
    name: 'Surface',
    summary: 'Elevated container with a variant ladder',
    demos: [
      {
        label: 'Nested hierarchy',
        render: () => (
          <Surface className="w-full">
            <Text weight="medium">Account</Text>
            <Surface variant="secondary" className="mt-3">
              <Text size="sm" muted>
                Signed in as khalid@example.com
              </Text>
              <Surface variant="tertiary" className="mt-3">
                <Text size="xs" muted>
                  Session expires in 12 days
                </Text>
              </Surface>
            </Surface>
          </Surface>
        ),
      },
      {
        label: 'Variants',
        render: () => (
          <View className="w-full gap-3">
            {(['default', 'secondary', 'tertiary', 'transparent'] as const).map(
              (variant) => (
                <Surface key={variant} variant={variant}>
                  <Text size="sm">{variant}</Text>
                </Surface>
              )
            )}
          </View>
        ),
      },
      {
        label: 'Bordered and elevated',
        render: () => (
          <View className="w-full gap-3">
            {/* A hairline for a surface the same colour as the page. */}
            <Surface bordered>
              <Text size="sm">bordered — reads against a same-colour page</Text>
            </Surface>
            {/* A soft shadow lifts it off the page. */}
            <Surface elevated>
              <Text size="sm">elevated — a soft shadow</Text>
            </Surface>
            <Surface bordered elevated>
              <Text size="sm">both</Text>
            </Surface>
          </View>
        ),
      },
      {
        label: 'Padding scale',
        render: () => (
          <View className="w-full gap-3">
            {(['none', 'sm', 'default', 'lg'] as const).map((padding) => (
              <Surface key={padding} variant="secondary" padding={padding} bordered>
                <View className="rounded-lg bg-primary/10 px-2 py-1">
                  <Text size="xs" muted>
                    padding={padding}
                  </Text>
                </View>
              </Surface>
            ))}
          </View>
        ),
      },
      {
        label: 'As a stat card',
        render: () => (
          <View className="w-full flex-row gap-3">
            {[
              { label: 'Revenue', value: '$24.8k' },
              { label: 'Active', value: '1,204' },
            ].map((stat) => (
              <Surface key={stat.label} bordered padding="lg" className="flex-1">
                <Text size="xs" muted className="uppercase tracking-wider">
                  {stat.label}
                </Text>
                <Text size="xl" weight="semibold" className="mt-1">
                  {stat.value}
                </Text>
              </Surface>
            ))}
          </View>
        ),
      },
    ],
  },
  {
    slug: 'shimmer',
    name: 'Shimmer',
    summary: 'Animated highlight sweeping across content',
    demos: [
      {
        label: 'Thinking text',
        render: () => (
          <View className="w-full gap-4">
            <Shimmer>Generating response…</Shimmer>
            <Shimmer duration={1400} textClassName="text-lg font-medium">
              Thinking…
            </Shimmer>
            <Shimmer duration={2400} textClassName="text-2xl font-semibold">
              Searching the web
            </Shimmer>
          </View>
        ),
      },
      {
        label: 'Modes',
        render: () => (
          <View className="w-full gap-4">
            <Shimmer mode="ping-pong" duration={1600}>
              Ping-pong sweep
            </Shimmer>
            <Shimmer reverse>Right to left</Shimmer>
            <Shimmer spread={4} duration={2600}>
              A wider, slower band
            </Shimmer>
            <Shimmer enabled={false}>Disabled — renders statically</Shimmer>
          </View>
        ),
      },
      {
        label: 'Custom colours',
        render: () => (
          <View className="w-full gap-4">
            <Shimmer baseColor="#3f3f46" shimmerColor="#fafafa">
              Neutral on dark
            </Shimmer>
            <Shimmer
              baseColor="#1e3a8a"
              shimmerColor="#93c5fd"
              textClassName="text-lg font-semibold"
            >
              Tinted blue
            </Shimmer>
          </View>
        ),
      },
      {
        label: 'Masking a subtree',
        render: () => (
          <Shimmer as="view" className="w-full rounded-xl">
            <View className="gap-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-1/2" />
            </View>
          </Shimmer>
        ),
      },
    ],
  },
  {
    slug: 'scroll-text',
    name: 'ScrollText',
    summary: 'Text that resolves word by word as you scroll',
    demos: [
      {
        label: 'Colour',
        id: 'color',
        fullPage: true,
        description: 'Each word crossfades from muted to foreground as the line passes.',
        render: () => <ScrollTextVersion effect="color" />,
      },
      {
        label: 'Fade',
        id: 'fade',
        fullPage: true,
        description: 'Words come up from nearly transparent, without reflowing the line.',
        render: () => <ScrollTextVersion effect="fade" />,
      },
      {
        label: 'Rise',
        id: 'rise',
        fullPage: true,
        description: 'Words lift into place — a wrapping row, since nested text cannot transform.',
        render: () => <ScrollTextVersion effect="rise" />,
      },
      {
        label: 'Highlight',
        id: 'highlight',
        fullPage: true,
        description: 'A background sweeps behind the line as it resolves.',
        render: () => <ScrollTextVersion effect="highlight" />,
      },
      {
        label: 'Splitting and stagger',
        id: 'splitting',
        fullPage: true,
        description: 'By character, and with a stagger wide enough to arrive all at once.',
        render: () => <ScrollTextCharactersVersion />,
      },
    ],
  },
  {
    slug: 'scroll-canvas',
    name: 'ScrollCanvas',
    summary: 'Image frame whose contents move as you scroll',
    demos: [
      {
        label: 'Parallax',
        id: 'parallax',
        fullPage: true,
        description: 'The image drifts against the scroll inside a frame that stays put.',
        render: () => <ScrollCanvasVersion effect="parallax" />,
      },
      {
        label: 'Zoom',
        id: 'zoom',
        fullPage: true,
        description: 'It settles from slightly oversized to its natural size.',
        render: () => <ScrollCanvasVersion effect="zoom" />,
      },
      {
        label: 'Reveal',
        id: 'reveal',
        fullPage: true,
        description: 'A wipe uncovers it from the bottom edge up.',
        render: () => <ScrollCanvasVersion effect="reveal" />,
      },
      {
        label: 'Sequence',
        id: 'sequence',
        fullPage: true,
        description: 'The scroll position picks a frame, so the thumb scrubs the animation.',
        render: () => <ScrollCanvasSequenceVersion />,
      },
    ],
  },
  {
    slug: 'thinking-orb',
    name: 'ThinkingOrb',
    summary: 'Dotted orb saying which kind of busy an agent is',
    demos: [
      {
        label: 'The six states',
        id: 'states',
        fullPage: true,
        description: 'Each one side by side, at the large tuning.',
        render: () => <ThinkingOrbStatesVersion />,
      },
      {
        label: 'Inline in a reply',
        id: 'inline',
        fullPage: true,
        description: 'The small tuning, sitting in a line of chat text.',
        render: () => <ThinkingOrbInlineVersion />,
      },
      {
        label: 'Speed and pause',
        id: 'controls',
        fullPage: true,
        description: 'What `speed` and `paused` do to a running orb.',
        render: () => <ThinkingOrbControlsVersion />,
      },
    ],
  },
  {
    slug: 'soundwave',
    name: 'Soundwave',
    summary: 'What a voice looks like while an app listens',
    demos: [
      {
        label: 'Capsules',
        id: 'pills',
        fullPage: true,
        description: 'The few big capsules over a microphone button.',
        render: () => <SoundwavePillsVersion />,
      },
      {
        label: 'Metering bars',
        id: 'bars',
        fullPage: true,
        description: 'Static bands and a scrolling history, in a transcript.',
        render: () => <SoundwaveBarsVersion />,
      },
      {
        label: 'Travelling wave',
        id: 'line',
        fullPage: true,
        description: 'One ribbon, and what each state does to it.',
        render: () => <SoundwaveLineVersion />,
      },
      {
        label: 'Ambient glow',
        id: 'ambient',
        fullPage: true,
        description: 'A bloom off the bottom edge and a rim around the screen.',
        render: () => <SoundwaveAmbientVersion />,
      },
      {
        label: 'Voice notes',
        id: 'notes',
        fullPage: true,
        description: 'Recorded waveforms in bubbles, filling as they play.',
        render: () => <SoundwaveNotesVersion />,
      },
      {
        label: 'Recording composer',
        id: 'composer',
        fullPage: true,
        description: 'A composer that turns into a recorder over a transcript.',
        render: () => <SoundwaveComposerVersion />,
      },
    ],
  },
  {
    slug: 'scroll-fade',
    name: 'ScrollFade',
    summary: 'Fades the edges of a scroll container',
    demos: [
      {
        label: 'Horizontal cards',
        render: () => (
          // A horizontal group of vertical Items: each entry is a card, and
          // the fade shows there is more of them past the edge.
          <ScrollFade size={40} className="w-full">
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <Item.Group orientation="horizontal">
                {[
                  ['Overlays', 'Dialog, sheet, toast'],
                  ['Forms', 'Input, select, switch'],
                  ['Feedback', 'Alert, progress, spinner'],
                  ['Layout', 'Card, frame, surface'],
                  ['Motion', 'Shimmer, scroll fade'],
                  ['Theming', 'Six themes, three families'],
                ].map(([title, description]) => (
                  <Item
                    key={title}
                    orientation="vertical"
                    variant="outline"
                    size="sm"
                    className="w-44"
                  >
                    <Item.Media variant="icon">
                      <PackageIcon size={16} />
                    </Item.Media>
                    <Item.Content>
                      <Item.Title>{title}</Item.Title>
                      <Item.Description>{description}</Item.Description>
                    </Item.Content>
                  </Item>
                ))}
              </Item.Group>
            </ScrollView>
          </ScrollFade>
        ),
      },
      {
        label: 'Vertical list',
        render: () => (
          // Orientation is read from the child: no `horizontal` prop, so the
          // fades land on the top and bottom edges instead.
          <ScrollFade size={44} className="h-72 w-full">
            <ScrollView showsVerticalScrollIndicator={false}>
              <Item.Group>
                {[
                  ['Deployed to production', '2 minutes ago'],
                  ['Migration applied', '18 minutes ago'],
                  ['Build passed', '24 minutes ago'],
                  ['Pull request merged', '1 hour ago'],
                  ['Review requested', '2 hours ago'],
                  ['Branch pushed', '3 hours ago'],
                  ['Issue closed', '5 hours ago'],
                  ['Release tagged', 'Yesterday'],
                ].map(([title, when], index) => (
                  <View key={title}>
                    {index > 0 ? <Item.Separator /> : null}
                    <Item size="sm">
                      <Item.Media variant="icon">
                        <CheckIcon size={14} />
                      </Item.Media>
                      <Item.Content>
                        <Item.Title>{title}</Item.Title>
                        <Item.Description>{when}</Item.Description>
                      </Item.Content>
                    </Item>
                  </View>
                ))}
              </Item.Group>
            </ScrollView>
          </ScrollFade>
        ),
      },
      {
        label: 'One edge',
        render: () => (
          <ScrollFade size={56} edges="end" className="w-full">
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <Item.Group orientation="horizontal">
                {['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven'].map((n) => (
                  <Item key={n} variant="muted" size="sm" className="w-32">
                    <Item.Content>
                      <Item.Title>{n}</Item.Title>
                    </Item.Content>
                  </Item>
                ))}
              </Item.Group>
            </ScrollView>
          </ScrollFade>
        ),
      },
      {
        label: 'Content that fits',
        render: () => (
          // Nothing scrolls past either edge, so neither fade ever shows.
          <ScrollFade size={40} className="w-full">
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <Item.Group orientation="horizontal">
                {['One', 'Two'].map((n) => (
                  <Item key={n} variant="outline" size="sm" className="w-32">
                    <Item.Content>
                      <Item.Title>{n}</Item.Title>
                    </Item.Content>
                  </Item>
                ))}
              </Item.Group>
            </ScrollView>
          </ScrollFade>
        ),
      },
      {
        label: 'Tuning the ramp',
        render: () => (
          <View className="w-full gap-4">
            {/* A long ramp fades in gradually over the first 120px of travel. */}
            <ScrollFade size={48} fadeInDistance={120} className="w-full">
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerClassName="gap-2"
              >
                {['Slow', 'Ramp', 'Over', 'A', 'Long', 'Distance', 'Of', 'Travel'].map(
                  (n) => (
                    <Badge key={n} variant="secondary">
                      {n}
                    </Badge>
                  )
                )}
              </ScrollView>
            </ScrollFade>

            {/* Snaps to full opacity almost immediately. */}
            <ScrollFade size={48} fadeInDistance={4} className="w-full">
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerClassName="gap-2"
              >
                {['Instant', 'Ramp', 'On', 'The', 'First', 'Few', 'Pixels'].map((n) => (
                  <Badge key={n}>{n}</Badge>
                ))}
              </ScrollView>
            </ScrollFade>
          </View>
        ),
      },
    ],
  },
  {
    slug: 'separator',
    name: 'Separator',
    summary: 'Horizontal or vertical rule between content',
    demos: [
      {
        label: 'Between sections',
        render: () => (
          <Surface variant="secondary" className="w-full px-6 py-7">
            <Text weight="medium">PanelUI</Text>
            <Text size="sm" muted>
              A React Native component library.
            </Text>
            <Separator className="my-4" />
            <View className="h-5 flex-row items-center">
              <Text size="sm">Components</Text>
              <Separator orientation="vertical" className="mx-3" />
              <Text size="sm">Themes</Text>
              <Separator orientation="vertical" className="mx-3" />
              <Text size="sm">Examples</Text>
            </View>
          </Surface>
        ),
      },
      {
        label: 'Variants',
        render: () => (
          <View className="w-full gap-5">
            <View className="gap-2">
              <Text size="sm" muted>
                thin
              </Text>
              <Separator />
            </View>
            <View className="gap-2">
              <Text size="sm" muted>
                thick
              </Text>
              <Separator variant="thick" />
            </View>
          </View>
        ),
      },
      {
        label: 'Custom thickness',
        render: () => (
          <View className="w-full gap-5">
            {[1, 3, 6].map((thickness) => (
              <View key={thickness} className="gap-2">
                <Text size="sm" muted>
                  thickness={thickness}
                </Text>
                <Separator thickness={thickness} />
              </View>
            ))}
          </View>
        ),
      },
      {
        label: 'Vertical, stretched by the row',
        render: () => (
          // `items-stretch` gives the separators their length — a vertical
          // separator with no height from the parent measures zero.
          <View className="w-full flex-row items-stretch gap-4 py-2">
            {['Today', 'Week', 'Month'].map((label, index) => (
              <View key={label} className="flex-1 flex-row items-stretch gap-4">
                {index > 0 ? <Separator orientation="vertical" /> : null}
                <View className="flex-1 gap-1">
                  <Text size="xs" muted className="uppercase tracking-wider">
                    {label}
                  </Text>
                  <Text size="lg" weight="semibold">
                    {[128, 904, 3_612][index]?.toLocaleString()}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ),
      },
    ],
  },
  {
    slug: 'skeleton',
    name: 'Skeleton',
    summary: 'Shimmer placeholder for loading content',
    demos: [
      {
        label: 'List row',
        render: () => (
          <View className="w-full gap-4">
            <View className="flex-row items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <View className="flex-1 gap-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </View>
            </View>
            <Skeleton className="h-32 w-full rounded-xl" />
          </View>
        ),
      },
      {
        label: 'Card placeholder',
        render: () => (
          <Card className="w-full">
            <Card.Content className="gap-3 p-4">
              <Skeleton className="h-40 w-full rounded-xl" />
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </Card.Content>
          </Card>
        ),
      },
    ],
  },
  {
    slug: 'slider',
    name: 'Slider',
    summary: 'Pick a value by dragging a thumb along a track',
    demos: [
      { label: 'Interactive', render: () => <SliderDemo /> },
      { label: 'Native', render: () => <NativeSliderDemo /> },
      {
        label: 'Colors',
        render: () => (
          <View className="w-full gap-5">
            <Slider defaultValue={40} color="primary" />
            <Slider defaultValue={55} color="success" />
            <Slider defaultValue={70} color="warning" />
            <Slider defaultValue={85} color="destructive" />
          </View>
        ),
      },
      {
        label: 'Sizes',
        render: () => (
          <View className="w-full gap-5">
            <Slider defaultValue={40} size="sm" />
            <Slider defaultValue={40} size="md" />
            <Slider defaultValue={40} size="lg" />
          </View>
        ),
      },
      {
        label: 'Stepped',
        render: () => (
          <View className="w-full gap-5">
            <Slider defaultValue={2} min={0} max={5} step={1} />
            <Slider defaultValue={30} disabled />
          </View>
        ),
      },
      {
        label: 'Labelled',
        render: () => (
          <View className="w-full gap-6">
            <Slider label="Brightness" showValue defaultValue={62} />
            {/* formatValue owns the units, so the caption reads the way the
                value is actually spoken rather than as a bare number. */}
            <Slider
              label="Budget"
              showValue
              formatValue={(v) => `$${Math.round(v)}`}
              defaultValue={340}
              min={0}
              max={1000}
              step={20}
              color="success"
            />
          </View>
        ),
      },
    ],
  },
  {
    slug: 'spinner',
    name: 'Spinner',
    summary: 'Indeterminate loading indicator',
    demos: [
      {
        label: 'Sizes',
        render: () => (
          <View className="flex-row items-center gap-6">
            <Spinner size="sm" />
            <Spinner />
            <Spinner size="lg" />
          </View>
        ),
      },
      {
        label: 'In context',
        render: () => (
          <Card className="w-full">
            <Card.Content className="items-center gap-3 p-8">
              <Spinner size="lg" />
              <Text size="sm" muted>
                Loading your projects…
              </Text>
            </Card.Content>
          </Card>
        ),
      },
    ],
  },
  {
    slug: 'steps',
    name: 'Steps',
    summary: 'Stepper for multi-step flows',
    demos: [
      { label: 'Horizontal', render: () => <StepsDemo /> },
      {
        label: 'Vertical',
        render: () => (
          <Steps defaultValue={1} orientation="vertical" className="w-full">
            {STEP_DATA.map((step, index) => (
              <Steps.Item key={step.title} step={index}>
                <Steps.Trigger>
                  <Steps.Indicator />
                  <View className="flex-1">
                    <Steps.Title>{step.title}</Steps.Title>
                    <Steps.Description>{step.description}</Steps.Description>
                  </View>
                </Steps.Trigger>
                {index < STEP_DATA.length - 1 ? <Steps.Separator /> : null}
              </Steps.Item>
            ))}
          </Steps>
        ),
      },
      {
        label: 'Loading',
        render: () => (
          <Steps value={1} orientation="vertical" className="w-full">
            {STEP_DATA.map((step, index) => (
              <Steps.Item key={step.title} step={index} loading={index === 1}>
                <Steps.Trigger>
                  <Steps.Indicator />
                  <View className="flex-1">
                    <Steps.Title>{step.title}</Steps.Title>
                  </View>
                </Steps.Trigger>
                {index < STEP_DATA.length - 1 ? <Steps.Separator /> : null}
              </Steps.Item>
            ))}
          </Steps>
        ),
      },
    ],
  },
  {
    slug: 'switch',
    name: 'Switch',
    summary: 'On/off toggle',
    demos: [
      { label: 'Settings rows', render: () => <SwitchDemo /> },
      {
        label: 'States',
        render: () => (
          <View className="gap-5">
            <View className="flex-row items-center gap-3">
              <Switch value onValueChange={() => {}} />
              <Text size="sm" muted>On</Text>
            </View>
            <View className="flex-row items-center gap-3">
              <Switch value={false} onValueChange={() => {}} />
              <Text size="sm" muted>Off</Text>
            </View>
            <View className="flex-row items-center gap-3">
              <Switch value disabled onValueChange={() => {}} />
              <Text size="sm" muted>Disabled</Text>
            </View>
          </View>
        ),
      },
      { label: 'Native', render: () => <NativeSwitchDemo /> },
    ],
  },
  {
    slug: 'tabs',
    name: 'Tabs',
    summary: 'Segmented navigation between panels',
    demos: [
      {
        label: 'Basic',
        render: () => (
          <Tabs defaultValue="account" className="w-full">
            <Tabs.List>
              <Tabs.Trigger value="account">Account</Tabs.Trigger>
              <Tabs.Trigger value="password">Password</Tabs.Trigger>
              <Tabs.Trigger value="team">Team</Tabs.Trigger>
            </Tabs.List>
            <Tabs.Content value="account">
              <Card>
                <Card.Content className="gap-4 p-4">
                  <Input label="Name" placeholder="Khalid Abdi" />
                  <Input label="Username" placeholder="@khalid" />
                </Card.Content>
              </Card>
            </Tabs.Content>
            <Tabs.Content value="password">
              <Card>
                <Card.Content className="gap-4 p-4">
                  <Input label="Current password" secureTextEntry />
                  <Input label="New password" secureTextEntry />
                </Card.Content>
              </Card>
            </Tabs.Content>
            <Tabs.Content value="team">
              <Card>
                <Card.Content className="flex-row items-center gap-3 p-4">
                  <Avatar fallback="KA" />
                  <View className="flex-1">
                    <Text weight="medium">Khalid Abdi</Text>
                    <Text size="sm" muted>
                      Owner
                    </Text>
                  </View>
                  <Badge variant="secondary">Admin</Badge>
                </Card.Content>
              </Card>
            </Tabs.Content>
          </Tabs>
        ),
      },
      {
        label: 'Two panels',
        render: () => (
          <Tabs defaultValue="preview" className="w-full">
            <Tabs.List>
              <Tabs.Trigger value="preview">Preview</Tabs.Trigger>
              <Tabs.Trigger value="code">Code</Tabs.Trigger>
            </Tabs.List>
            <Tabs.Content value="preview">
              <Card>
                <Card.Content className="items-center p-8">
                  <Button>Click me</Button>
                </Card.Content>
              </Card>
            </Tabs.Content>
            <Tabs.Content value="code">
              <Card>
                <Card.Content className="p-4">
                  <Typography.Code>{'<Button>Click me</Button>'}</Typography.Code>
                </Card.Content>
              </Card>
            </Tabs.Content>
          </Tabs>
        ),
      },
      {
        label: 'Underline',
        render: () => (
          <Tabs variant="underline" defaultValue="overview" className="w-full">
            <Tabs.List>
              <Tabs.Trigger value="overview">Overview</Tabs.Trigger>
              <Tabs.Trigger value="activity" badge={<Badge variant="secondary">4</Badge>}>
                Activity
              </Tabs.Trigger>
              <Tabs.Trigger value="archived" disabled>
                Archived
              </Tabs.Trigger>
            </Tabs.List>
            <Tabs.Content value="overview">
              <Text size="sm" muted className="py-4">
                A rule under the active tab, on a row that has no track of its
                own — for a page-level switch rather than a control.
              </Text>
            </Tabs.Content>
            <Tabs.Content value="activity">
              <Text size="sm" muted className="py-4">
                Four things happened while you were away.
              </Text>
            </Tabs.Content>
            <Tabs.Content value="archived">
              <Text size="sm" muted className="py-4">
                Unreachable — the trigger is disabled.
              </Text>
            </Tabs.Content>
          </Tabs>
        ),
      },
      {
        label: 'Pill',
        render: () => (
          <Tabs variant="pill" defaultValue="all" className="w-full">
            <Tabs.List>
              <Tabs.Trigger value="all">All</Tabs.Trigger>
              <Tabs.Trigger value="unread">Unread</Tabs.Trigger>
              <Tabs.Trigger value="flagged">Flagged</Tabs.Trigger>
            </Tabs.List>
            <Tabs.Content value="all">
              <Text size="sm" muted className="py-4">
                A filled chip on the page, with the active label inverted
                against it.
              </Text>
            </Tabs.Content>
            <Tabs.Content value="unread">
              <Text size="sm" muted className="py-4">
                Nothing unread.
              </Text>
            </Tabs.Content>
            <Tabs.Content value="flagged">
              <Text size="sm" muted className="py-4">
                Nothing flagged.
              </Text>
            </Tabs.Content>
          </Tabs>
        ),
      },
      {
        label: 'Scrollable',
        render: () => <ScrollableTabsDemo />,
      },
      {
        label: 'Keeping panels mounted',
        render: () => <KeepMountedTabsDemo />,
      },
    ],
  },
  {
    slug: 'toggle-button',
    name: 'ToggleButton',
    summary: 'A button that stays down',
    demos: [
      { label: 'On its own', render: () => <ToggleButtonDemo /> },
      { label: 'A toolbar of marks', render: () => <ToggleButtonToolbarDemo /> },
      { label: 'An either-or choice', render: () => <ToggleButtonSingleDemo /> },
      {
        label: 'Sizes',
        render: () => (
          <View className="w-full gap-3">
            <ToggleButtonGroup defaultValue={['s']} size="sm">
              <ToggleButton id="s">Small</ToggleButton>
              <ToggleButton id="s2">Small</ToggleButton>
            </ToggleButtonGroup>
            <ToggleButtonGroup defaultValue={['m']}>
              <ToggleButton id="m">Medium</ToggleButton>
              <ToggleButton id="m2">Medium</ToggleButton>
            </ToggleButtonGroup>
            <ToggleButtonGroup defaultValue={['l']} size="lg">
              <ToggleButton id="l">Large</ToggleButton>
              <ToggleButton id="l2">Large</ToggleButton>
            </ToggleButtonGroup>
            <ToggleButton disabled defaultSelected>
              Disabled
            </ToggleButton>
          </View>
        ),
      },
    ],
  },
  {
    slug: 'timeline',
    name: 'Timeline',
    summary: 'Vertical sequence of events',
    demos: [
      { label: 'Dot', render: () => <TimelineDemo variant="dot" /> },
      { label: 'Icon', render: () => <TimelineDemo variant="icon" /> },
      { label: 'Numbered', render: () => <TimelineDemo variant="numbered" /> },
      { label: 'Card', render: () => <TimelineDemo variant="card" /> },
      { label: 'Deploy log', render: () => <DeployLogDemo /> },
      { label: 'Studio feed', render: () => <StudioFeedDemo /> },
      { label: 'Ledger', render: () => <LedgerDemo /> },
      { label: 'Handoff', render: () => <HandoffDemo /> },
    ],
  },
  {
    slug: 'toast',
    name: 'Toast',
    summary: 'Transient notification with swipe to dismiss',
    demos: [
      { label: 'Usage patterns', render: () => <ToastDemo /> },
      {
        label: 'Anatomy',
        render: () => (
          <View className="w-full gap-3">
            <Toast variant="success">
              <Toast.Indicator />
              <Toast.Content>
                <Toast.Title>Changes saved</Toast.Title>
                <Toast.Description>Your profile is up to date.</Toast.Description>
              </Toast.Content>
              <Toast.Close />
            </Toast>
            <Toast variant="warning">
              <Toast.Indicator />
              <Toast.Content>
                <Toast.Title>Storage almost full</Toast.Title>
              </Toast.Content>
              <Toast.Action>Upgrade</Toast.Action>
            </Toast>
          </View>
        ),
      },
    ],
  },
  {
    slug: 'typography',
    name: 'Typography',
    summary: 'Semantic text presets',
    demos: [
      {
        label: 'Types',
        render: () => (
          <View className="w-full gap-3">
            <Typography type="h1">Heading 1</Typography>
            <Typography type="h2">Heading 2</Typography>
            <Typography type="h3">Heading 3</Typography>
            <Typography type="h4">Heading 4</Typography>
            <Typography type="body">Body text</Typography>
            <Typography type="body-sm" muted>
              Small body text
            </Typography>
            <Typography.Code>npm i panelui-native</Typography.Code>
          </View>
        ),
      },
      {
        label: 'Paragraphs',
        render: () => (
          <View className="w-full gap-3">
            <Typography.Paragraph>
              This is a default body paragraph. It uses the base font size and
              normal weight for comfortable reading.
            </Typography.Paragraph>
            <Typography.Paragraph type="body-sm" muted>
              A smaller paragraph, useful for captions, footnotes, or secondary
              descriptions.
            </Typography.Paragraph>
          </View>
        ),
      },
    ],
  },
];

/** Catalogue keyed by slug, for the detail route. */
export const COMPONENTS_BY_SLUG: Record<string, ComponentEntry> = Object.fromEntries(
  COMPONENTS.map((entry) => [entry.slug, entry])
);
