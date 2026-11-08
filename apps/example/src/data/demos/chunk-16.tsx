import { useRef, useState, type ReactNode } from "react";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScrollView, View, Image } from "react-native";
import { AIInput, Avatar, AvatarCropper, type AvatarCropperHandle, type AvatarCropperShape, type AvatarCropperSource, pickAvatarImage, CameraIcon, ImageIcon, Badge, Button, Card, Compare, Countdown, OtpInput, Frame, Leaderboard, type LeaderboardEntry, Tabs, Message, MessageScroller, Rating, Response, SankeyChart, type SankeyLink, type SankeyNode, Support, Text, BugIcon, CardIcon, ChevronLeftIcon, HeadsetIcon, LockIcon, MailIcon, MessageCircleIcon, PaperclipIcon, SparklesIcon, FileUpload, Input, SendIcon, useFileUpload, type FileUploadFile, type FileUploadHandler, WeekStrip, type WeekStripMarks, WeekHoursGrid, type WeekHoursRow } from "panelui-native";
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
 * A month off a current account, which is the shape `collapse` exists for: two
 * things paying in, one balance, and a tail of categories that runs from rent
 * down to eleven pounds of stationery. Drawn whole, the bottom nine are
 * hairlines — present in the data and impossible to tell apart on a phone.
 */
const SPEND_NODES: SankeyNode[] = [
  { id: 'salary', label: 'Salary' },
  { id: 'freelance', label: 'Freelance' },
  { id: 'account', label: 'Current account' },
  { id: 'rent', label: 'Rent' },
  { id: 'groceries', label: 'Groceries' },
  { id: 'transport', label: 'Transport' },
  { id: 'utilities', label: 'Utilities' },
  { id: 'eating-out', label: 'Eating out' },
  { id: 'subscriptions', label: 'Subscriptions' },
  { id: 'insurance', label: 'Insurance' },
  { id: 'phone', label: 'Phone' },
  { id: 'gym', label: 'Gym' },
  { id: 'books', label: 'Books' },
  { id: 'haircuts', label: 'Haircuts' },
  { id: 'charity', label: 'Charity' },
  { id: 'pharmacy', label: 'Pharmacy' },
  { id: 'stationery', label: 'Stationery' },
  { id: 'saved', label: 'Saved' },
];

const SPEND_LINKS: SankeyLink[] = [
  { source: 'salary', target: 'account', value: 2400 },
  { source: 'freelance', target: 'account', value: 380 },
  { source: 'account', target: 'rent', value: 1450 },
  { source: 'account', target: 'groceries', value: 520 },
  { source: 'account', target: 'transport', value: 190 },
  { source: 'account', target: 'utilities', value: 165 },
  { source: 'account', target: 'eating-out', value: 148 },
  { source: 'account', target: 'subscriptions', value: 62 },
  { source: 'account', target: 'insurance', value: 58 },
  { source: 'account', target: 'phone', value: 34 },
  { source: 'account', target: 'gym', value: 32 },
  { source: 'account', target: 'books', value: 26 },
  { source: 'account', target: 'haircuts', value: 24 },
  { source: 'account', target: 'charity', value: 20 },
  { source: 'account', target: 'pharmacy', value: 16 },
  { source: 'account', target: 'stationery', value: 11 },
  { source: 'account', target: 'saved', value: 24 },
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

function SankeyVerticalVersion() {
  return (
    <ScrollView contentContainerClassName="grow justify-center p-4 pb-10">
      <Frame className="w-full">
        <Frame.Header>
          <Frame.Title>Down the screen</Frame.Title>
          <Frame.Action>£m</Frame.Action>
        </Frame.Header>
        <Frame.Panel>
          <SankeyChart
            nodes={BUDGET_NODES}
            links={BUDGET_LINKS}
            orientation="vertical"
            className="px-3 pb-4 pt-3"
          >
            <SankeyChart.Header title="Budget" value="£1.06bn" caption="Income through to spend" />
            <SankeyChart.Links />
            <SankeyChart.Nodes />
            <SankeyChart.Labels />
            <SankeyChart.Legend />
            <SankeyChart.Breakdown />
          </SankeyChart>
        </Frame.Panel>
      </Frame>
    </ScrollView>
  );
}

function SankeyCollapseVersion() {
  const [folded, setFolded] = useState(true);

  return (
    <ScrollView contentContainerClassName="grow justify-center p-4 pb-10">
      <Frame className="w-full">
        <Frame.Header>
          <Frame.Title>Seventeen into six</Frame.Title>
          <Frame.Action>{folded ? '6 of 17' : 'all 17'}</Frame.Action>
        </Frame.Header>
        <Frame.Panel>
          <SankeyChart
            nodes={SPEND_NODES}
            links={SPEND_LINKS}
            orientation="vertical"
            collapse={folded ? { maxPerColumn: 6 } : undefined}
            className="px-3 pb-4 pt-3"
          >
            <SankeyChart.Header
              title="March"
              value="£2,780"
              caption={folded ? 'Smallest folded into Other' : 'Every category, as it arrived'}
            />
            <SankeyChart.Links />
            <SankeyChart.Nodes />
            <SankeyChart.Labels />
            <SankeyChart.Legend />
            <SankeyChart.Breakdown maxRows={5} />
          </SankeyChart>
          <View className="px-3 pb-3">
            <Button size="sm" variant="secondary" onPress={() => setFolded((on) => !on)}>
              {folded ? 'Show every category' : 'Fold the tail'}
            </Button>
          </View>
        </Frame.Panel>
      </Frame>
    </ScrollView>
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

/**
 * Where the seam starts in the readout version: off centre, so the knob is not
 * sitting behind the panel in the middle before anybody has touched it.
 */
const READOUT_START = 0.38;

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
        <Frame.Panel>
          <Compare height={280} className="rounded-none">
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
        <Frame.Panel>
          <Compare height={260} value={split} onValueChange={setSplit} className="rounded-none">
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

/**
 * What this much of the grade is called.
 *
 * A percentage on its own is a number nobody has a feel for. The word beside
 * it says what that much of a grade looks like, and it is the word changing —
 * not the digits ticking — that the reader catches out of the corner of an eye
 * while dragging.
 */
function gradeStage(percent: number): string {
  if (percent <= 0) return 'Straight off the sensor';
  if (percent < 34) return 'A first pass';
  if (percent < 67) return 'Half graded';
  if (percent < 100) return 'Nearly the full grade';
  return 'The full grade';
}

/**
 * The seam with a readout centred over it.
 *
 * The readout is an ordinary child of `Compare`, so it lands on the top layer
 * with the handle and stays put while the seam travels under it. That is what
 * lets it be text: a caption inside either side would be clipped by the seam
 * and smear into the one behind it, and a caption that moves with the seam is
 * unreadable exactly when it is being read.
 *
 * `onValueChange` is what feeds it, and it reports a whole percent at a time
 * rather than every frame — which is all a number anybody can read needs, and
 * why the scene behind it is not re-laid-out sixty times a second.
 */
function CompareReadoutVersion() {
  const [box, setBox] = useState(0);
  const [split, setSplit] = useState(READOUT_START);

  // The window opens over the graded frame, so the share of the grade left on
  // screen is what the seam has *not* covered.
  const percent = Math.round((1 - split) * 100);

  return (
    <View
      className="flex-1"
      onLayout={(event) => {
        const next = Math.round(event.nativeEvent.layout.height);
        if (next !== box) setBox(next);
      }}
    >
      {box > 0 ? (
        <Compare
          height={box}
          defaultValue={READOUT_START}
          onValueChange={setSplit}
          className="rounded-none"
        >
          <Compare.After>
            <CompareScene grade="after" />
          </Compare.After>
          <Compare.Before>
            <CompareScene grade="before" />
          </Compare.Before>
          {/*
           * Written before the handle, so the seam is drawn over the panel
           * rather than under it. The other way round the seam vanishes behind
           * the readout half way along its travel, which is exactly where a
           * reader reaches for it.
           */}
          <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
            <View className="items-center gap-1 rounded-2xl bg-foreground/80 px-6 py-4">
              <Text size="3xl" weight="semibold" className="text-background">
                {`${percent}%`}
              </Text>
              <Text size="sm" weight="medium" className="text-background/70">
                {gradeStage(percent)}
              </Text>
            </View>
          </View>
          {/*
           * A slim grip rather than the default knob. A 36-point circle
           * crossing the panel covers a digit of the number for the middle
           * third of the travel; a bar the width of the line reads as the seam
           * thickening where the finger is.
           */}
          <Compare.Handle>
            <View className="h-12 w-1.5 rounded-full bg-background" />
          </Compare.Handle>
        </Compare>
      ) : null}
    </View>
  );
}

function CompareVerticalDemo() {
  return (
    <Card className="w-full overflow-hidden">
      <Card.Content className="p-0">
        <Compare height={180} orientation="vertical" className="rounded-none">
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
    <Card className="w-full overflow-hidden">
      <Card.Content className="p-0">
        <Compare height={180} defaultValue={0.15} className="rounded-none">
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
    <Card className="w-full overflow-hidden">
      <Card.Content className="p-0">
        <Compare height={160} defaultValue={0.5} disabled className="rounded-none">
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
        <Text size="xs" muted className="px-4 pb-4 pt-3">
          `disabled` freezes the seam and takes it out of the accessibility tree.
        </Text>
      </Card.Content>
    </Card>
  );
}

function SankeyLegendDemo() {
  return (
    <View className="w-full gap-3">
      <Card>
        <Card.Content className="p-0">
          <SankeyChart
            nodes={SPEND_NODES}
            links={SPEND_LINKS}
            height={260}
            className="px-3 pb-4 pt-3"
          >
            <SankeyChart.Links />
            <SankeyChart.Nodes />
            <SankeyChart.Labels />
            <SankeyChart.Legend limit={9} />
          </SankeyChart>
        </Card.Content>
      </Card>
      <Text size="xs" muted className="px-1">
        The bottom categories are too thin to carry a name. The legend is where they get one, and
        pressing it selects the same node the bar would.
      </Text>
    </View>
  );
}

/** The people who answer, as photos — overlapping initials hide each other's second letter. */
const TEAM = [
  { name: 'Khalid Abdi', uri: 'https://github.com/Khalidabdi1.png', initials: 'KA' },
  { name: 'Kofi Boateng', uri: 'https://i.pravatar.cc/150?img=12', initials: 'KB' },
  { name: 'Jess Ruiz', uri: 'https://i.pravatar.cc/150?img=32', initials: 'JR' },
];

function TeamFaces() {
  return (
    <Avatar.Group size="sm" max={3}>
      {TEAM.map((person) => (
        <Avatar key={person.name} source={{ uri: person.uri }} fallback={person.initials} />
      ))}
    </Avatar.Group>
  );
}

function Face({ person }: { person: (typeof TEAM)[number] | 'assistant' }) {
  if (person === 'assistant') {
    return (
      <Avatar size="sm" fallback="AI">
        <Avatar.Badge>
          <SparklesIcon size={10} />
        </Avatar.Badge>
      </Avatar>
    );
  }
  return <Avatar size="sm" source={{ uri: person.uri }} fallback={person.initials} />;
}

/**
 * The way back out of a full-bleed demo, which has no screen header of its own.
 * `onPress` lets a step inside the journey go back one step instead of leaving.
 */
function DemoBack({ onPress }: { onPress?: () => void }) {
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      size="sm"
      onPress={onPress ?? (() => router.back())}
      accessibilityLabel="Go back"
      className="-ms-2 shrink-0"
    >
      <ChevronLeftIcon />
    </Button>
  );
}

function SupportHomeScreen({
  onAssistant,
  onTeam,
}: {
  onAssistant?: () => void;
  onTeam?: () => void;
}) {
  return (
    <Support availability="online">
      <Support.Header title="Support" description="We answer most things the same day">
        <TeamFaces />
      </Support.Header>

      <Support.Status replyTime="Typically replies in under an hour" />

      <Support.Channels title="Get in touch">
        <Support.Channel
          icon={<SparklesIcon />}
          label="Ask the assistant"
          description="Answers most questions straight away"
          onPress={onAssistant}
        />
        <Support.Channel
          icon={<MessageCircleIcon />}
          label="Message the team"
          description="We pick these up through the day"
          detail="~1h"
          onPress={onTeam}
        />
        <Support.Channel
          icon={<MailIcon />}
          label="Email us"
          description="support@panelui.dev"
          detail="1 day"
        />
      </Support.Channels>

      <Support.Conversations title="Your requests">
        <Support.Conversation
          title="Refund for order #4821"
          preview="We've issued the refund — it should land in 3–5 days."
          status="solved"
          reference="#4821"
          timestamp="2h"
          unread
        />
        <Support.Conversation
          title="Can't add a second device"
          preview="Could you tell us which OS version it is running?"
          status="pending"
          reference="#4810"
          timestamp="Yesterday"
          updated
        />
      </Support.Conversations>
    </Support>
  );
}

function SupportTopicScreen({
  topic,
  onTopicChange,
  onContinue,
}: {
  topic: string | null;
  onTopicChange: (value: string) => void;
  onContinue?: () => void;
}) {
  return (
    <Support>
      <Support.Header
        title="What is it about?"
        description="Picking one gets you to the right team first time"
      />
      <Support.Topics value={topic} onValueChange={onTopicChange}>
        <Support.Topic
          value="billing"
          icon={<CardIcon />}
          label="Billing"
          description="Invoices, refunds and plans"
        />
        <Support.Topic
          value="account"
          icon={<LockIcon />}
          label="Account and sign-in"
          description="Passwords, devices and two-factor"
        />
        <Support.Topic
          value="bug"
          icon={<BugIcon />}
          label="Something is broken"
          description="Send us what you were doing at the time"
        />
      </Support.Topics>
      <Button disabled={!topic} onPress={onContinue}>
        Continue
      </Button>
    </Support>
  );
}

/** One turn of the thread, so the conversation demos say the same thing. */
type Turn = { id: string; from: 'them' | 'me'; body: string; at: string };

const THREAD: Turn[] = [
  {
    id: '1',
    from: 'them',
    at: '09:12',
    body: 'Thanks for getting in touch. I can see order #4821 — it was delivered on the 14th. What went wrong with it?',
  },
  { id: '2', from: 'me', at: '09:14', body: 'Two of the four cups arrived cracked.' },
  {
    id: '3',
    from: 'them',
    at: '09:15',
    body: "Sorry about that. I've refunded those two to your card — £24.50. It usually shows in three to five days.",
  },
];

/**
 * A support thread filling the screen: who is answering and which request this
 * is at the top, the transcript in the middle, the wait and the composer at the
 * bottom. Full-bleed, so the notch and the home indicator are its to clear —
 * and the composer is told how far above the bottom edge it already sits, or
 * it lifts by the whole keyboard on top of that and leaves a gap.
 */
function SupportThreadScreen({
  agent,
  role,
  ticket,
  note,
  placeholder,
  onBack,
  children,
}: {
  agent: (typeof TEAM)[number] | 'assistant';
  role: string;
  ticket?: boolean;
  note: string;
  placeholder: string;
  onBack?: () => void;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState('');
  const below = insets.bottom + 8;

  return (
    <View className="flex-1">
      <View
        className="gap-3 border-b border-border px-4 pb-3"
        style={{ paddingTop: insets.top + 8 }}
      >
        <View className="flex-row items-center gap-1">
          <DemoBack onPress={onBack} />
          <View className="shrink grow">
            <Support availability="online">
              <Support.Agent
                name={agent === 'assistant' ? 'Assistant' : agent.name}
                role={role}
                avatar={<Face person={agent} />}
              />
            </Support>
          </View>
        </View>
        {ticket ? (
          <Support.Ticket subject="Refund for order #4821" reference="#4821" status="open" />
        ) : null}
      </View>

      <MessageScroller autoScroll className="flex-1">
        <MessageScroller.Viewport>
          <MessageScroller.Content className="gap-3 px-4 py-4">{children}</MessageScroller.Content>
        </MessageScroller.Viewport>
      </MessageScroller>

      <View className="gap-2 px-4 pt-2" style={{ paddingBottom: below }}>
        <Support.Note>{note}</Support.Note>
        <AIInput
          value={draft}
          onValueChange={setDraft}
          onSubmit={() => setDraft('')}
          keyboardBottomInset={below}
        >
          <AIInput.Field placeholder={placeholder} />
          <AIInput.Toolbar>
            <AIInput.Action label="Attach" icon={<PaperclipIcon />} />
            <AIInput.Spacer />
            <AIInput.Submit />
          </AIInput.Toolbar>
        </AIInput>
      </View>
    </View>
  );
}

function HumanTurns() {
  const khalid = TEAM[0]!;
  return (
    <>
      <Support.Handoff icon={<HeadsetIcon />}>
        You were passed to Khalid, who can see everything you told the assistant.
      </Support.Handoff>
      {THREAD.map((turn) => (
        <Message key={turn.id} align={turn.from === 'me' ? 'end' : 'start'}>
          {turn.from === 'them' ? (
            <Message.Avatar>
              <Face person={khalid} />
            </Message.Avatar>
          ) : null}
          <Message.Content>
            <Message.Bubble>
              <Message.BubbleContent>{turn.body}</Message.BubbleContent>
            </Message.Bubble>
            <Message.Footer>{turn.at}</Message.Footer>
          </Message.Content>
        </Message>
      ))}
      <Support.Resolution>
        <Rating defaultValue={0} max={5} />
      </Support.Resolution>
    </>
  );
}

function SupportHomeVersion() {
  return (
    <ScrollView contentContainerClassName="p-4 pb-10">
      <SupportHomeScreen />
    </ScrollView>
  );
}

function SupportTopicsVersion() {
  const [topic, setTopic] = useState<string | null>('billing');
  return (
    <ScrollView contentContainerClassName="p-4 pb-10">
      <SupportTopicScreen topic={topic} onTopicChange={setTopic} />
    </ScrollView>
  );
}

function SupportThreadVersion() {
  return (
    <SupportThreadScreen
      agent={TEAM[0]!}
      role="Support"
      ticket
      note="Khalid typically replies in under an hour"
      placeholder="Write a reply"
    >
      <HumanTurns />
    </SupportThreadScreen>
  );
}

/** The whole way through: the help screen, a topic, the assistant, then a person. */
function SupportJourneyVersion() {
  const [step, setStep] = useState<'home' | 'topic' | 'assistant' | 'human'>('home');
  const [topic, setTopic] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  if (step === 'home' || step === 'topic') {
    return (
      <ScrollView
        contentContainerClassName="gap-4 px-4"
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }}
      >
        <View className="flex-row items-center gap-1">
          <DemoBack onPress={step === 'topic' ? () => setStep('home') : undefined} />
          <Text size="xs" muted>
            {step === 'home' ? 'Step 1 of 4' : 'Step 2 of 4'}
          </Text>
        </View>
        {step === 'home' ? (
          <SupportHomeScreen onAssistant={() => setStep('topic')} onTeam={() => setStep('human')} />
        ) : (
          <SupportTopicScreen
            topic={topic}
            onTopicChange={setTopic}
            onContinue={() => setStep('assistant')}
          />
        )}
      </ScrollView>
    );
  }

  if (step === 'assistant') {
    return (
      <SupportThreadScreen
        agent="assistant"
        role="Step 3 of 4"
        note="The assistant answers straight away"
        placeholder="Ask something else"
        onBack={() => setStep('topic')}
      >
        <Message align="end">
          <Message.Content>
            <Message.Bubble>
              <Message.BubbleContent>
                Two of the cups in order #4821 arrived cracked.
              </Message.BubbleContent>
            </Message.Bubble>
          </Message.Content>
        </Message>
        <Message>
          <Message.Avatar>
            <Face person="assistant" />
          </Message.Avatar>
          <Message.Content>
            <Message.Bubble>
              <Response>
                {"Sorry about those. Damaged items are refunded rather than replaced, and you don't need to send them back.\n\nI can't issue the refund myself — a person has to approve it."}
              </Response>
            </Message.Bubble>
          </Message.Content>
        </Message>
        <Support.Replies>
          <Support.Reply label="Talk to a person" onPress={() => setStep('human')} />
          <Support.Reply label="That's all, thanks" onPress={() => setStep('home')} />
        </Support.Replies>
      </SupportThreadScreen>
    );
  }

  return (
    <SupportThreadScreen
      agent={TEAM[0]!}
      role="Step 4 of 4"
      ticket
      note="Khalid typically replies in under an hour"
      placeholder="Write a reply"
      onBack={() => setStep('assistant')}
    >
      <HumanTurns />
    </SupportThreadScreen>
  );
}

function SupportAwayDemo() {
  return (
    <View className="w-full gap-3">
      <Support availability="away">
        <Support.Status replyTime="Back tomorrow morning — leave a message and we'll reply first thing" />
      </Support>
      <Support availability="offline">
        <Support.Status />
      </Support>
      <Text size="xs" muted className="px-1">
        `availability` colours the dot and supplies the wording when `replyTime` says nothing.
      </Text>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Leaderboard                                                                */
/* -------------------------------------------------------------------------- */

const face = (n: number) => `https://i.pravatar.cc/150?img=${n}`;

const WALKERS_THIS_WEEK: LeaderboardEntry[] = [
  { id: 'maya', name: 'Maya Chen', value: 84210, change: 2, avatar: face(47) },
  { id: 'omar', name: 'Omar Haddad', value: 79655, change: -1, avatar: face(12) },
  { id: 'lena', name: 'Lena Brandt', value: 71038, change: 1, avatar: face(44) },
  { id: 'sam', name: 'Sam Okafor', value: 66402, change: 3, avatar: face(53) },
  { id: 'ines', name: 'Inès Moreau', value: 61987, change: -2, avatar: face(32) },
  { id: 'jonas', name: 'Jonas Lindqvist', value: 58340, change: 0 },
  { id: 'priya', name: 'Priya Nair', value: 55126, change: 4, avatar: face(25) },
  { id: 'kofi', name: 'Kofi Mensah', value: 49870, change: -1, avatar: face(59) },
  { id: 'hana', name: 'Hana Suzuki', value: 47213, change: 0 },
  { id: 'diego', name: 'Diego Alvarez', value: 41958, change: -3, avatar: face(60) },
  { id: 'zara', name: 'Zara Ahmed', value: 38604, change: 1 },
  { id: 'tom', name: 'Tom Whitfield', value: 33117, change: -1, avatar: face(14) },
  { id: 'elif', name: 'Elif Yılmaz', value: 29482, change: 2 },
  { id: 'noah', name: 'Noah Berger', value: 21735, change: -2, avatar: face(68) },
];

const WALKERS_LAST_WEEK: LeaderboardEntry[] = [
  { id: 'omar', name: 'Omar Haddad', value: 91402, change: 0, avatar: face(12) },
  { id: 'maya', name: 'Maya Chen', value: 76318, change: 1, avatar: face(47) },
  { id: 'ines', name: 'Inès Moreau', value: 74890, change: 2, avatar: face(32) },
  { id: 'lena', name: 'Lena Brandt', value: 69215, change: -2, avatar: face(44) },
  { id: 'jonas', name: 'Jonas Lindqvist', value: 60177, change: 1 },
  { id: 'kofi', name: 'Kofi Mensah', value: 57731, change: 3, avatar: face(59) },
  { id: 'diego', name: 'Diego Alvarez', value: 54062, change: -1, avatar: face(60) },
  { id: 'sam', name: 'Sam Okafor', value: 48829, change: -4, avatar: face(53) },
  { id: 'hana', name: 'Hana Suzuki', value: 45990, change: 0 },
  { id: 'tom', name: 'Tom Whitfield', value: 39408, change: 2, avatar: face(14) },
  { id: 'priya', name: 'Priya Nair', value: 36251, change: -1, avatar: face(25) },
  { id: 'zara', name: 'Zara Ahmed', value: 31874, change: 0 },
  { id: 'noah', name: 'Noah Berger', value: 27106, change: 1, avatar: face(68) },
  { id: 'elif', name: 'Elif Yılmaz', value: 19943, change: -1 },
];

function LeaderboardScreen({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 20 }}
    >
      {children}
    </ScrollView>
  );
}

function LeaderboardStepsVersion() {
  const [week, setWeek] = useState('this');
  return (
    <LeaderboardScreen>
      <View className="gap-1">
        <Text size="2xl" weight="bold">
          Step challenge
        </Text>
        <Text size="sm" muted>
          {week === 'this' ? 'Sep 29 – Oct 5 · ends in 3 days' : 'Sep 22 – Sep 28 · final'}
        </Text>
      </View>
      <Tabs value={week} defaultValue={week} onValueChange={setWeek}>
        <Tabs.List>
          <Tabs.Trigger value="this">This week</Tabs.Trigger>
          <Tabs.Trigger value="last">Last week</Tabs.Trigger>
        </Tabs.List>
      </Tabs>
      <Leaderboard
        data={week === 'this' ? WALKERS_THIS_WEEK : WALKERS_LAST_WEEK}
        unit="steps"
        podiumHeight={140}
      />
    </LeaderboardScreen>
  );
}

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const REPS: LeaderboardEntry[] = [
  { id: 'r1', name: 'Rachel Kim', subtitle: 'Seattle', value: 412800, change: 1 },
  { id: 'r2', name: 'Marcus Bell', subtitle: 'Denver', value: 387450, change: -1 },
  { id: 'r3', name: 'Ana Sousa', subtitle: 'Austin', value: 341920, change: 2 },
  { id: 'r4', name: 'Victor Hale', subtitle: 'Portland', value: 298300, change: 0 },
  { id: 'r5', name: 'Grace Liu', subtitle: 'San Diego', value: 276140, change: 3 },
  { id: 'r6', name: 'Ben Carter', subtitle: 'Phoenix', value: 251775, change: -2 },
  { id: 'r7', name: 'Nadia Rahman', subtitle: 'Seattle', value: 219060, change: 0 },
  { id: 'r8', name: 'Leo Fischer', subtitle: 'Boise', value: 184395, change: -1 },
  { id: 'r9', name: 'Chloe Martin', subtitle: 'Denver', value: 152880, change: 1 },
  { id: 'r10', name: 'Ivan Petrov', subtitle: 'Salt Lake City', value: 97410, change: -3 },
];

function LeaderboardSalesVersion() {
  const total = REPS.reduce((sum, rep) => sum + rep.value, 0);
  return (
    <LeaderboardScreen>
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 gap-1">
          <Text size="sm" muted>
            Closed revenue, Q3
          </Text>
          <Text size="3xl" weight="bold" className="tabular-nums">
            {currency.format(total)}
          </Text>
        </View>
        <Badge variant="outline">Team West</Badge>
      </View>
      <Leaderboard
        data={REPS}
        podium="cards"
        formatValue={(value) => currency.format(value)}
        unit="in closed deals"
      />
    </LeaderboardScreen>
  );
}

const LEAGUE: LeaderboardEntry[] = [
  ['Nightjar', 18420], ['quietstorm', 17985], ['Pip', 17302], ['mossbyte', 16110],
  ['Ferro', 15874], ['luna.exe', 15233], ['Basalt', 14907], ['kitekat', 14412],
  ['Orrin', 13958], ['saffron', 13640], ['DuneRunner', 13105], ['wren', 12877],
  ['Calyx', 12354], ['tidepool', 12019], ['Juno', 11782], ['Halcyon', 11240],
  ['brightside', 10968], ['Rook', 10511], ['ember', 10230], ['Vesper', 9876],
  ['paper.plane', 9502], ['Ostara', 9318], ['glimmer', 8995], ['Talon', 8642],
  ['marigold', 8407], ['Quill', 8113], ['you', 7820], ['Sable', 7469],
  ['driftwood', 7095], ['Ivo', 6830], ['hollow', 6372], ['Cobalt', 6018],
  ['nimbus', 5741], ['Arden', 5266], ['fable', 4930], ['Mica', 4402],
  ['lowtide', 3985], ['Bram', 3361], ['sprout', 2870], ['Echo', 1945],
].map(([name, value], index) => ({
  id: name === 'you' ? 'you' : `p${index}`,
  name: name === 'you' ? 'You' : (name as string),
  value: value as number,
  subtitle: name === 'you' ? '1,180 XP behind #26' : undefined,
}));

function LeaderboardLeagueVersion() {
  return (
    <LeaderboardScreen>
      <Card>
        <Card.Header>
          <Card.Title>Gold league</Card.Title>
          <Card.Description>Top 10 move up to Sapphire. Resets Sunday.</Card.Description>
        </Card.Header>
      </Card>
      <Leaderboard data={LEAGUE} limit={10} highlightId="you" unit="XP" podiumScale="rank" />
    </LeaderboardScreen>
  );
}

const lap = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${(seconds % 60).toFixed(3).padStart(6, '0')}`;

const LAPS: LeaderboardEntry[] = [
  { id: 'd1', name: 'Rio Castellan', subtitle: 'Halvorsen', value: 80.912, change: 1 },
  { id: 'd2', name: 'Theo Marchetti', subtitle: 'Arcadia', value: 81.047, change: -1 },
  { id: 'd3', name: 'Kaito Mori', subtitle: 'Halvorsen', value: 81.047, change: 2 },
  { id: 'd4', name: 'Elsa Varga', subtitle: 'Brightline', value: 81.203, change: 0 },
  { id: 'd5', name: 'Hugo Delacroix', subtitle: 'Arcadia', value: 81.388, change: -2 },
  { id: 'd6', name: 'Amara Osei', subtitle: 'Northwind', value: 81.455, change: 1 },
  { id: 'd7', name: 'Finn Doyle', subtitle: 'Brightline', value: 81.716, change: 0 },
  { id: 'd8', name: 'Sofia Lindgren', subtitle: 'Vantor', value: 81.802, change: 3 },
  { id: 'd9', name: 'Mateo Rossi', subtitle: 'Northwind', value: 82.034, change: -1 },
  { id: 'd10', name: 'Yara Haddad', subtitle: 'Vantor', value: 82.517, change: -3 },
];

function LeaderboardLapsVersion() {
  return (
    <LeaderboardScreen>
      <View className="gap-1">
        <Text size="xs" weight="semibold" muted className="uppercase tracking-widest">
          Qualifying · Q3
        </Text>
        <Text size="2xl" weight="bold">
          Fastest laps
        </Text>
        <Text size="sm" muted>
          Two drivers tied on 1:21.047 share second.
        </Text>
      </View>
      <Leaderboard data={LAPS} order="asc" podium="none" formatValue={lap} />
    </LeaderboardScreen>
  );
}

function LeaderboardShortDemo() {
  return (
    <Leaderboard
      podium="none"
      data={[
        { id: 'a', name: 'Priya Nair', value: 412, change: 3, subtitle: 'Design' },
        { id: 'b', name: 'Tomás Ruiz', value: 398, change: 0, subtitle: 'Platform' },
        { id: 'c', name: 'Aiko Tanaka', value: 377, change: -2, subtitle: 'Growth' },
      ]}
      unit="points"
    />
  );
}

function LeaderboardEmptyDemo() {
  return <Leaderboard data={[]} emptyText="Nobody has logged a run this week" />;
}

/* -------------------------------------------------------------------------- */
/* Countdown                                                                  */
/* -------------------------------------------------------------------------- */

/** A target fixed at mount, so leaving and coming back starts it fresh. */
function useTarget(seconds: number) {
  const [target, setTarget] = useState(() => Date.now() + seconds * 1000);
  return [target, () => setTarget(Date.now() + seconds * 1000)] as const;
}

function CountdownLaunchVersion() {
  const [target] = useTarget(2 * 86400 + 14 * 3600 + 3 * 60 + 41);
  const [notify, setNotify] = useState(false);
  return (
    <View className="flex-1 items-center justify-center gap-8 bg-background px-6">
      <View className="items-center gap-3">
        <Badge variant="outline" className="self-center">
          Launching Thursday
        </Badge>
        <Text size="3xl" weight="bold" className="text-center">
          Panel 2
        </Text>
        <Text muted className="text-center">
          A new editor, offline sync, and a public API.
        </Text>
      </View>
      <Countdown to={target} size="lg" />
      <Button variant={notify ? 'outline' : 'primary'} onPress={() => setNotify((on) => !on)}>
        {notify ? 'We will email you' : 'Notify me'}
      </Button>
    </View>
  );
}

function CountdownSaleVersion() {
  const [target, restart] = useTarget(5 * 60 + 8);
  const [over, setOver] = useState(false);
  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ padding: 16, gap: 16 }}>
      <Card>
        <Card.Header>
          <View className="flex-row items-center justify-between gap-3">
            <Badge>Flash sale</Badge>
            {over ? (
              <Text size="sm" weight="semibold" muted>
                Ended
              </Text>
            ) : (
              <View className="flex-row items-baseline gap-1.5">
                <Text size="sm" muted>
                  Ends in
                </Text>
                <Countdown
                  to={target}
                  variant="inline"
                  size="sm"
                  units={['minutes', 'seconds']}
                  urgentBelow={300}
                  onComplete={() => setOver(true)}
                />
              </View>
            )}
          </View>
          <Card.Title>40% off every annual plan</Card.Title>
          <Card.Description>
            The digits turn red in the last five minutes. It starts eight seconds above that line.
          </Card.Description>
        </Card.Header>
        <Card.Footer>
          <Button
            className="flex-1"
            onPress={() => {
              setOver(false);
              restart();
            }}
          >
            {over ? 'Run it again' : 'Upgrade for $86/yr'}
          </Button>
        </Card.Footer>
      </Card>
    </ScrollView>
  );
}

function CountdownResendVersion() {
  const [target, restart] = useTarget(30);
  const [ready, setReady] = useState(false);
  return (
    <View className="flex-1 gap-6 bg-background px-6 pt-10">
      <View className="gap-2">
        <Text size="2xl" weight="bold">
          Check your messages
        </Text>
        <Text muted>We sent a six-digit code to +44 7700 900 418.</Text>
      </View>
      <OtpInput length={6} groupEvery={3} />
      {ready ? (
        <Button
          variant="outline"
          onPress={() => {
            setReady(false);
            restart();
          }}
        >
          Resend code
        </Button>
      ) : (
        <View className="flex-row items-baseline justify-center gap-1.5">
          <Text size="sm" muted>
            Resend a code in
          </Text>
          <Countdown
            to={target}
            variant="inline"
            size="sm"
            units={['minutes', 'seconds']}
            onComplete={() => setReady(true)}
          />
        </View>
      )}
    </View>
  );
}

function CountdownSizesDemo() {
  const [target] = useTarget(3 * 3600 + 25 * 60 + 9);
  return (
    <View className="items-center gap-5">
      <Countdown to={target} size="sm" />
      <Countdown to={target} size="md" />
      <Countdown to={target} size="lg" units={['hours', 'minutes']} />
    </View>
  );
}

function CountdownLabelsDemo() {
  const [target] = useTarget(9 * 86400 + 6 * 3600 + 12 * 60);
  return (
    <Countdown
      to={target}
      labels={{ days: 'Jours', hours: 'Heures', minutes: 'Min', seconds: 'Sec' }}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* AvatarCropper                                                              */
/* -------------------------------------------------------------------------- */

/** The maintainer's own GitHub picture, at the largest size GitHub serves. */
const PORTRAIT: AvatarCropperSource = {
  uri: 'https://avatars.githubusercontent.com/u/127331761?v=4&s=1024',
};

function CropperControls() {
  return (
    <View className="flex-row items-center justify-between px-3 py-2">
      <AvatarCropper.Reset />
      <AvatarCropper.Rotate />
    </View>
  );
}

function AvatarCropperBasicDemo() {
  return (
    <View className="h-96 w-full overflow-hidden rounded-2xl border border-border">
      <AvatarCropper source={PORTRAIT}>
        <AvatarCropper.Canvas />
        <CropperControls />
      </AvatarCropper>
    </View>
  );
}

function AvatarCropperShapesDemo() {
  const [shape, setShape] = useState<AvatarCropperShape>('squircle');
  return (
    <View className="w-full gap-3">
      <Tabs value={shape} defaultValue={shape} onValueChange={(value) => setShape(value as AvatarCropperShape)}>
        <Tabs.List>
          <Tabs.Trigger value="circle">Circle</Tabs.Trigger>
          <Tabs.Trigger value="squircle">Squircle</Tabs.Trigger>
          <Tabs.Trigger value="square">Square</Tabs.Trigger>
        </Tabs.List>
      </Tabs>
      <View className="h-80 w-full overflow-hidden rounded-2xl border border-border">
        <AvatarCropper source={PORTRAIT} shape={shape} />
      </View>
    </View>
  );
}

const FILLS = { theme: undefined, white: '#ffffff', black: '#000000' } as const;

/**
 * Zooming out past the outline, with what fills the gap chosen above it and
 * the written image beside the button, so the two can be compared.
 */
function AvatarCropperZoomOutDemo() {
  const cropper = useRef<AvatarCropperHandle>(null);
  const [fill, setFill] = useState<keyof typeof FILLS>('theme');
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const crop = async () => {
    setError(null);
    try {
      const written = await cropper.current?.crop({ size: 512 });
      if (written) setResult(written.uri);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    }
  };

  return (
    <View className="w-full gap-3">
      <Tabs value={fill} defaultValue={fill} onValueChange={(value) => setFill(value as keyof typeof FILLS)}>
        <Tabs.List>
          <Tabs.Trigger value="theme">Theme</Tabs.Trigger>
          <Tabs.Trigger value="white">White</Tabs.Trigger>
          <Tabs.Trigger value="black">Black</Tabs.Trigger>
        </Tabs.List>
      </Tabs>
      <View className="h-80 w-full overflow-hidden rounded-2xl border border-border">
        <AvatarCropper ref={cropper} source={PORTRAIT} cover={false} background={FILLS[fill]}>
          <AvatarCropper.Canvas />
          <CropperControls />
        </AvatarCropper>
      </View>
      <View className="flex-row items-center gap-3">
        <Button variant="secondary" onPress={crop}>
          Crop
        </Button>
        <Avatar size="lg" source={result ? { uri: result } : undefined} fallback="KA" />
        {error ? (
          <Text size="sm" className="flex-1 text-destructive">
            {error}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

/**
 * The flow the cropper exists for: a profile with a photo, the two ways to
 * replace it, and the cropper taking over the screen in between.
 */
function AvatarCropperProfileVersion() {
  const insets = useSafeAreaInsets();
  const cropper = useRef<AvatarCropperHandle>(null);
  const [photo, setPhoto] = useState<AvatarCropperSource | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = async (from: 'library' | 'camera') => {
    setError(null);
    try {
      const picked = await pickAvatarImage({ from });
      if (picked) setPhoto(picked);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    }
  };

  const done = async () => {
    setSaving(true);
    try {
      const result = await cropper.current?.crop({ size: 512 });
      if (result) setAvatar(result.uri);
      setPhoto(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setSaving(false);
    }
  };

  if (photo) {
    return (
      <View className="flex-1 bg-background">
        <View className="flex-row items-center justify-between px-2 pb-2">
          <Button variant="ghost" size="sm" onPress={() => setPhoto(null)}>
            Cancel
          </Button>
          <Text weight="semibold">Move and scale</Text>
          <Button size="sm" loading={saving} onPress={done}>
            Done
          </Button>
        </View>
        <AvatarCropper ref={cropper} source={photo}>
          <AvatarCropper.Canvas />
          <View
            className="flex-row items-center justify-between px-4 pt-2"
            style={{ paddingBottom: insets.bottom + 8 }}
          >
            <AvatarCropper.Reset />
            <AvatarCropper.Rotate />
          </View>
        </AvatarCropper>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background px-6" style={{ paddingBottom: insets.bottom + 8 }}>
      <View className="flex-1 items-center justify-center gap-6">
        <Avatar size="xl" source={avatar ? { uri: avatar } : undefined} fallback="KA" />
        <View className="items-center gap-1">
          <Text size="lg" weight="semibold">Khalid Abdi</Text>
          <Text size="sm" muted className="text-center">
            {avatar ? 'Looking good.' : 'Add a photo so your team knows who you are.'}
          </Text>
        </View>
        <View className="w-full gap-2">
          <Button variant="secondary" onPress={() => pick('library')}>
            <ImageIcon size={18} />
            Choose photo
          </Button>
          <Button variant="secondary" onPress={() => pick('camera')}>
            <CameraIcon size={18} />
            Take photo
          </Button>
          <Button variant="ghost" onPress={() => setPhoto(PORTRAIT)}>
            Try it with a sample photo
          </Button>
        </View>
        {error ? (
          <Text size="sm" className="text-center text-destructive">
            {error}
          </Text>
        ) : null}
      </View>
    </View>
  );
}


/* -------------------------------------------------------------------------- */
/* FileUpload                                                                 */
/* -------------------------------------------------------------------------- */

const MB = 1024 * 1024;

const photo = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=70`;

/** A small string hash, so each file gets its own pace without arithmetic steps. */
function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Files that have already failed once, so the retry goes through. */
const failedOnce = new Set<string>();

/** Opening a version again shows the dropped connection again. */
function useFreshFailures() {
  useState(() => failedOnce.clear());
}

/** Seeded files that drop their connection on the first attempt, so retry can be tried. */
const FLAKY = new Set(['claim-frame', 'listing-lenses']);

/**
 * Stands in for a real upload. Each file moves at its own uneven pace, spends a
 * moment "processing" at the end, and the files in `FLAKY` drop their
 * connection part of the way through on the first attempt.
 */
const fakeUpload: FileUploadHandler = (file, { signal, onProgress, setProcessing }) =>
  new Promise((resolve, reject) => {
    const seed = hash(file.name);
    const duration = 3600 + (seed % 3200);
    const failAt = FLAKY.has(file.id) && !failedOnce.has(file.id) ? 0.58 + (seed % 20) / 100 : null;
    let elapsed = 0;
    let tick = 0;
    const timer = setInterval(() => {
      tick += 1;
      // Uneven steps: a network sends in bursts, not a straight line.
      elapsed += 60 + (hash(`${file.id}:${tick}`) % 140);
      const progress = Math.min(1, elapsed / duration);
      onProgress(progress);
      if (failAt !== null && progress >= failAt) {
        clearInterval(timer);
        failedOnce.add(file.id);
        reject(new Error('Connection lost. Tap retry.'));
      } else if (progress >= 1) {
        clearInterval(timer);
        setProcessing();
        setTimeout(() => resolve({ url: `https://files.example.com/${file.id}` }), 700);
      }
    }, 120);
    signal.addEventListener('abort', () => {
      clearInterval(timer);
      reject(new Error('Canceled'));
    });
  });

const seeded = (file: Omit<FileUploadFile, 'kind'> & { kind?: FileUploadFile['kind'] }): FileUploadFile => ({
  kind: 'document',
  ...file,
});

// ---- Claim documents -------------------------------------------------------

const CLAIM_FILES: FileUploadFile[] = [
  seeded({
    id: 'claim-police',
    uri: 'file:///claim/police-report-0412.pdf',
    name: 'police-report-0412.pdf',
    size: 1.8 * MB,
    mimeType: 'application/pdf',
    status: 'done',
    progress: 1,
  }),
  seeded({
    id: 'claim-receipt',
    uri: 'file:///claim/receipt-velo-workshop.pdf',
    name: 'receipt-velo-workshop.pdf',
    size: 642 * 1024,
    mimeType: 'application/pdf',
    status: 'queued',
  }),
  seeded({
    id: 'claim-bike',
    uri: photo('photo-1485965120184-e220f721d03e'),
    name: 'bike-side-view.jpg',
    size: 3.4 * MB,
    mimeType: 'image/jpeg',
    kind: 'image',
    width: 900,
    height: 900,
    status: 'queued',
  }),
  seeded({
    id: 'claim-frame',
    uri: 'file:///claim/frame-registration.pdf',
    name: 'frame-registration.pdf',
    size: 1.1 * MB,
    mimeType: 'application/pdf',
    status: 'queued',
  }),
];

function ClaimFooter() {
  const { files } = useFileUpload();
  const done = files.filter((file) => file.status === 'done').length;
  const busy = files.some((file) => file.status !== 'done');
  return (
    <View className="gap-2 pt-2">
      <Text size="sm" muted className="text-center">
        {files.length === 0
          ? 'Add at least one document to submit.'
          : busy
            ? `${done} of ${files.length} uploaded`
            : `All ${files.length} files uploaded`}
      </Text>
      <Button disabled={files.length === 0 || busy}>Submit claim</Button>
    </View>
  );
}

function FileUploadClaimVersion() {
  useFreshFailures();
  const insets = useSafeAreaInsets();
  const [files, setFiles] = useState<FileUploadFile[]>(CLAIM_FILES);
  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="gap-5 px-5 pt-2"
      contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
    >
      <View className="gap-1.5">
        <Badge variant="secondary" className="self-start">
          Claim BK-20417
        </Badge>
        <Text size="2xl" weight="bold">
          Stolen bicycle
        </Text>
        <Text size="sm" muted>
          Send the police report, proof of purchase and any photos of the bike. Each file starts
          uploading as soon as it is added.
        </Text>
      </View>
      <FileUpload
        value={files}
        onValueChange={setFiles}
        sources={['camera', 'library', 'files']}
        accept={['application/pdf', 'image/*']}
        multiple
        maxFiles={6}
        maxSize={10 * MB}
        upload={fakeUpload}
        concurrency={2}
      >
        <View className="gap-3">
          <Text size="sm" weight="semibold">
            Supporting documents
          </Text>
          <FileUpload.Dropzone title="Add documents or photos" />
          <FileUpload.List />
        </View>
        <ClaimFooter />
      </FileUpload>
    </ScrollView>
  );
}

// ---- Listing photos --------------------------------------------------------

const LISTING_FILES: FileUploadFile[] = [
  seeded({
    id: 'listing-rollei',
    uri: photo('photo-1495121553079-4c61bcce1894'),
    name: 'twin-lens.jpg',
    kind: 'image',
    mimeType: 'image/jpeg',
    width: 900,
    height: 900,
    status: 'done',
    progress: 1,
  }),
  seeded({
    id: 'listing-instant',
    uri: photo('photo-1526170375885-4d8ecf77b99f'),
    name: 'instant.jpg',
    kind: 'image',
    mimeType: 'image/jpeg',
    width: 900,
    height: 900,
    status: 'done',
    progress: 1,
  }),
  seeded({
    id: 'listing-rangefinder',
    uri: photo('photo-1510127034890-ba27508e9f1c'),
    name: 'rangefinder.jpg',
    kind: 'image',
    mimeType: 'image/jpeg',
    width: 900,
    height: 900,
    status: 'queued',
  }),
  seeded({
    id: 'listing-lenses',
    uri: photo('photo-1516035069371-29a1b244cc32'),
    name: 'lenses.jpg',
    kind: 'image',
    mimeType: 'image/jpeg',
    width: 900,
    height: 900,
    status: 'queued',
  }),
];

function FileUploadListingVersion() {
  useFreshFailures();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="gap-6 px-5 pt-2"
      contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
    >
      <View className="gap-1">
        <Text size="xs" weight="semibold" muted className="uppercase tracking-wider">
          Step 1 of 3
        </Text>
        <Text size="2xl" weight="bold">
          Photos
        </Text>
        <Text size="sm" muted>
          Listings with five or more photos sell faster. The first one is the cover.
        </Text>
      </View>
      <FileUpload
        defaultValue={LISTING_FILES}
        sources={['camera', 'library']}
        accept={['image/*']}
        multiple
        maxFiles={8}
        image={{ maxWidth: 1600, quality: 0.85 }}
        upload={fakeUpload}
        concurrency={2}
      >
        <FileUpload.Grid columns={3} cover placeholders />
      </FileUpload>
      <View className="gap-4">
        <Input label="Title" defaultValue="Camera clear-out, three bodies" />
        <Input label="Price" defaultValue="420" keyboardType="number-pad" startContent={<Text muted>£</Text>} />
      </View>
      <Button>Continue</Button>
    </ScrollView>
  );
}

// ---- Profile photo ---------------------------------------------------------

const PROFILE_FILES: FileUploadFile[] = [
  seeded({
    id: 'profile-current',
    uri: 'https://avatars.githubusercontent.com/u/127331761?v=4&s=512',
    name: 'profile.jpg',
    kind: 'image',
    mimeType: 'image/jpeg',
    width: 512,
    height: 512,
    // Arrives mid-upload, as if it had just been chosen.
    status: 'queued',
  }),
];

function ProfileSlot() {
  const { files, remove } = useFileUpload();
  const current = files[0];
  const uploading = current && current.status !== 'done' && current.status !== 'error';
  const percent = Math.round((current?.progress ?? 0) * 100);

  return (
    <View className="items-center gap-6">
      <View className="h-36 w-36">
        <View className="h-36 w-36 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
          {current ? (
            <Image source={{ uri: current.uri }} className="h-full w-full" resizeMode="cover" />
          ) : (
            <Text size="3xl" weight="semibold" muted>
              KA
            </Text>
          )}
          {uploading ? (
            <View className="absolute inset-0 items-center justify-center bg-black/45">
              <Text weight="semibold" className="text-white">
                {current.status === 'processing' ? 'Saving' : `${percent}%`}
              </Text>
            </View>
          ) : null}
        </View>
        <View className="absolute bottom-0 right-0">
          <FileUpload.Trigger>
            <Button
              size="sm"
              accessibilityLabel="Change photo"
              className="rounded-full border-2 border-background"
            >
              <CameraIcon size={16} />
            </Button>
          </FileUpload.Trigger>
        </View>
      </View>
      <View className="items-center gap-1">
        <Text size="xl" weight="semibold">
          Khalid Abdi
        </Text>
        <Text size="sm" muted className="text-center">
          {current?.status === 'error'
            ? current.error
            : uploading
              ? 'Uploading your new photo…'
              : current
                ? 'Shown on your profile and next to your comments.'
                : 'Add a photo so people recognise you.'}
        </Text>
      </View>
      <View className="w-full gap-2">
        <FileUpload.Trigger>
          <Button variant="secondary">{current ? 'Change photo' : 'Add photo'}</Button>
        </FileUpload.Trigger>
        {current ? (
          <Button variant="ghost" onPress={() => remove(current.id)}>
            Remove photo
          </Button>
        ) : null}
      </View>
    </View>
  );
}

function FileUploadProfileVersion() {
  const insets = useSafeAreaInsets();
  const [files, setFiles] = useState<FileUploadFile[]>(PROFILE_FILES);
  return (
    <View className="flex-1 justify-center bg-background px-6" style={{ paddingBottom: insets.bottom + 24 }}>
      <FileUpload
        value={files}
        onValueChange={setFiles}
        sources={['camera', 'library']}
        accept={['image/*']}
        image={{ maxWidth: 1024, quality: 0.85, crop: { aspect: [1, 1] } }}
        upload={fakeUpload}
      >
        <ProfileSlot />
      </FileUpload>
    </View>
  );
}

// ---- Message attachments ---------------------------------------------------

const CHAT_FILES: FileUploadFile[] = [
  seeded({
    id: 'chat-bike',
    uri: photo('photo-1532298229144-0ec0c57515c7'),
    name: 'rear-derailleur.jpg',
    kind: 'image',
    mimeType: 'image/jpeg',
    size: 2.7 * MB,
    width: 900,
    height: 900,
    status: 'queued',
  }),
  seeded({
    id: 'chat-history',
    uri: 'file:///chat/service-history-2025.pdf',
    name: 'service-history-2025.pdf',
    mimeType: 'application/pdf',
    size: 412 * 1024,
    status: 'queued',
  }),
];

const CHAT: Array<{ from: 'me' | 'them'; body: string; at: string }> = [
  { from: 'them', body: 'Morning! Still good to drop the bike off on Thursday?', at: '09:12' },
  { from: 'me', body: 'Yes. The gears skip on the two smallest cogs, could you look at that too?', at: '09:14' },
  { from: 'them', body: 'Sure. Send a photo of the derailleur and the last service sheet if you have it.', at: '09:15' },
];

function Composer() {
  const { files } = useFileUpload();
  return (
    <View className="gap-2 border-t border-border bg-background px-3 pt-2">
      {files.length > 0 ? <FileUpload.List horizontal size="sm" /> : null}
      <View className="flex-row items-center gap-2">
        <FileUpload.Trigger>
          <Button variant="ghost" size="sm" accessibilityLabel="Attach">
            <PaperclipIcon size={20} />
          </Button>
        </FileUpload.Trigger>
        <Input placeholder="Message" containerClassName="flex-1" />
        <Button size="sm" accessibilityLabel="Send">
          <SendIcon size={18} />
        </Button>
      </View>
    </View>
  );
}

function FileUploadChatVersion() {
  useFreshFailures();
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1 bg-background" style={{ paddingBottom: insets.bottom }}>
      <ScrollView className="flex-1" contentContainerClassName="gap-3 px-4 py-3">
        {CHAT.map((turn) => (
          <Message key={turn.at} align={turn.from === 'me' ? 'end' : 'start'}>
            <Message.Content>
              <Message.Bubble>
                <Message.BubbleContent>{turn.body}</Message.BubbleContent>
              </Message.Bubble>
              <Message.Footer>{turn.at}</Message.Footer>
            </Message.Content>
          </Message>
        ))}
      </ScrollView>
      <FileUpload
        defaultValue={CHAT_FILES}
        sources={['camera', 'library', 'files']}
        multiple
        maxFiles={10}
        maxSize={25 * MB}
        upload={fakeUpload}
        concurrency={3}
      >
        <Composer />
      </FileUpload>
    </View>
  );
}

// ---- Inline demos ----------------------------------------------------------

function FileUploadBasicDemo() {
  return (
    <FileUpload sources={['files']} multiple>
      <View className="w-full gap-3">
        <FileUpload.Trigger>
          <Button variant="outline" className="self-start">
            Select files
          </Button>
        </FileUpload.Trigger>
        <FileUpload.List
          empty={
            <Text size="sm" muted>
              No files yet.
            </Text>
          }
        />
      </View>
    </FileUpload>
  );
}

function FileUploadRulesDemo() {
  const [rejected, setRejected] = useState<string[]>([]);
  return (
    <FileUpload
      sources={['files']}
      accept={['application/pdf']}
      multiple
      maxFiles={3}
      maxSize={2 * MB}
      onReject={(rejections) => setRejected(rejections.map((entry) => entry.file.name))}
    >
      <View className="w-full gap-3">
        <FileUpload.Dropzone title="Upload invoices" />
        <FileUpload.List />
        {rejected.length > 0 ? (
          <Text size="xs" muted>
            onReject: {rejected.join(', ')}
          </Text>
        ) : null}
      </View>
    </FileUpload>
  );
}

function FileUploadStripDemo() {
  return (
    <FileUpload
      defaultValue={LISTING_FILES.slice(0, 2)}
      sources={['library']}
      accept={['image/*']}
      multiple
      maxFiles={6}
    >
      <FileUpload.Grid horizontal tileSize={84} placeholders className="w-full" />
    </FileUpload>
  );
}

function FileUploadDisabledDemo() {
  return (
    <FileUpload defaultValue={CLAIM_FILES.slice(0, 1)} disabled accept={['application/pdf']}>
      <View className="w-full gap-3">
        <FileUpload.Dropzone description="Uploads are closed for this claim." />
        <FileUpload.List />
      </View>
    </FileUpload>
  );
}


/* -------------------------------------------------------------------------- */
/* WeekStrip                                                                  */
/* -------------------------------------------------------------------------- */

const dayKey = (day: Date) => day.getDay();

/** What a studio runs on each weekday, by Sunday-first index. */
const STUDIO_WEEK: Record<number, WeekStripMarks> = {
  1: { dots: ['primary', 'success'] },
  2: { dots: ['success'] },
  3: { dots: ['primary', 'success', 'warning'] },
  4: { dots: ['success'] },
  5: { dots: ['primary'] },
  6: { dots: ['success', 'warning'] },
};

const CLASS_TIMES: Record<number, string[]> = {
  0: ['10:00 Gentle stretch'],
  1: ['07:00 Mobility · booked', '18:30 Strength'],
  2: ['12:15 Spin'],
  3: ['07:00 Mobility · booked', '17:00 Strength', '19:30 Private lesson'],
  4: ['12:15 Spin'],
  5: ['07:00 Mobility · booked'],
  6: ['09:00 Open gym', '11:00 Private lesson'],
};

function WeekStripScheduleDemo() {
  const [day, setDay] = useState(() => new Date());
  return (
    <View className="w-full gap-4">
      <WeekStrip value={day} onValueChange={setDay} weekStartsOn={1} marks={(date) => STUDIO_WEEK[dayKey(date)]} />
      <View className="gap-2">
        {(CLASS_TIMES[day.getDay()] ?? []).map((line) => (
          <Text key={line} className="text-sm text-foreground">
            {line}
          </Text>
        ))}
      </View>
    </View>
  );
}

const FREE_SPOTS: Record<number, string> = { 1: '3 free', 2: 'Full', 3: '1 free', 4: '6 free', 5: '2 free' };

/** This week's day at a Monday-first index, for a demo that needs a fixed day. */
function thisWeek(index: number) {
  const day = new Date();
  day.setHours(0, 0, 0, 0);
  day.setDate(day.getDate() - ((day.getDay() + 6) % 7) + index);
  return day;
}

function WeekStripLabelsDemo() {
  // Tuesday: the studio is closed on Sundays, so today may not be pickable.
  const [day, setDay] = useState(() => thisWeek(1));
  return (
    <WeekStrip
      value={day}
      onValueChange={setDay}
      weekStartsOn={1}
      disabled={(date) => date.getDay() === 0}
      marks={(date) => (FREE_SPOTS[dayKey(date)] ? { label: FREE_SPOTS[dayKey(date)] } : undefined)}
    />
  );
}

function WeekStripStaffDemo() {
  // Wednesday stands in for today, so the week shows past days, today and
  // days still to come whichever day the demo is opened on.
  const [today] = useState(() => thisWeek(2));
  const [day, setDay] = useState(today);
  return (
    <WeekStrip
      today={today}
      value={day}
      onValueChange={setDay}
      weekStartsOn={1}
      faded={(date) => date < today}
      disabled={(date) => date.getDay() === 0}
      marks={(date) =>
        date.getDay() === 2 || date.getDay() === 5
          ? { corner: 'warning', dots: ['primary'] }
          : date.getDay() === 4
            ? { corner: 'info' }
            : undefined
      }
    />
  );
}

function WeekStripScrollDemo() {
  const [tomorrow] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return date;
  });
  const [day, setDay] = useState<Date | null>(null);
  return (
    <View className="w-full gap-3">
      <WeekStrip
        scroll
        size="sm"
        start={tomorrow}
        length={21}
        value={day}
        onValueChange={setDay}
        disabled={(date) => date.getDay() === 0}
      />
      <Text className="text-sm text-muted-foreground">
        {day ? `Lesson requested for ${day.toDateString()}` : 'Pick a day in the next three weeks'}
      </Text>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* WeekHoursGrid                                                              */
/* -------------------------------------------------------------------------- */

const TRAINER_HOURS: WeekHoursRow[] = [
  { key: 'mon', label: 'Mon', blocks: [{ start: 7, end: 12 }, { start: 16, end: 20 }] },
  { key: 'tue', label: 'Tue', blocks: [{ start: 9, end: 17.5 }] },
  { key: 'wed', label: 'Wed', blocks: [{ start: 7, end: 12 }, { start: 16, end: 20 }] },
  { key: 'thu', label: 'Thu', blocks: [{ start: 12, end: 21 }] },
  { key: 'fri', label: 'Fri', blocks: [{ start: 7, end: 13 }] },
  { key: 'sat', label: 'Sat', blocks: [{ start: 9, end: 12.5 }] },
  { key: 'sun', label: 'Sun', off: true, blocks: [] },
];

function WeekHoursWorkingDemo() {
  const [selected, setSelected] = useState('wed');
  return (
    <View className="w-full gap-3">
      <WeekHoursGrid
        from={6}
        to={22}
        ticks={[6, 10, 14, 18, 22]}
        rows={TRAINER_HOURS.map((row) => ({ ...row, selected: row.key === selected }))}
        onSelect={setSelected}
      />
      <Text className="text-sm text-muted-foreground">Editing {selected.toUpperCase()}</Text>
    </View>
  );
}

const BOOKINGS: WeekHoursRow[] = [
  { key: 'mon', label: 'Mon', blocks: [{ start: 8, end: 9 }, { start: 13, end: 15, tone: 'muted' }, { start: 18, end: 19 }] },
  { key: 'tue', label: 'Tue', blocks: [{ start: 10, end: 12, tone: 'muted' }] },
  { key: 'wed', label: 'Wed', blocks: [{ start: 7, end: 8 }, { start: 9, end: 11, tone: 'muted' }, { start: 17, end: 18.5, tone: 'muted' }] },
  { key: 'thu', label: 'Thu', blocks: [] },
  { key: 'fri', label: 'Fri', blocks: [{ start: 12, end: 13 }, { start: 15, end: 17, tone: 'muted' }] },
];

function WeekHoursBookedDemo() {
  return (
    <WeekHoursGrid
      from={6}
      to={22}
      ticks={[6, 10, 14, 18, 22]}
      rows={BOOKINGS}
      legend={[{ label: 'Your sessions' }, { label: 'Booked by others', tone: 'muted' }]}
    />
  );
}

const SHIFTS: WeekHoursRow[] = [
  { key: 'amira', label: 'Amira', blocks: [{ start: 0, end: 8, tone: 'info' }] },
  { key: 'jonas', label: 'Jonas', blocks: [{ start: 8, end: 16, tone: 'success' }] },
  { key: 'leila', label: 'Leila', blocks: [{ start: 14, end: 22, tone: 'warning' }] },
  { key: 'tomas', label: 'Tomás', blocks: [{ start: 22, end: 24, tone: 'info' }, { start: 0, end: 2, tone: 'info' }] },
];

function WeekHoursShiftsDemo() {
  return (
    <WeekHoursGrid
      rows={SHIFTS}
      ticks={['00', '06', '12', '18', '24']}
      legend={[
        { label: 'Night', tone: 'info' },
        { label: 'Day', tone: 'success' },
        { label: 'Late', tone: 'warning' },
      ]}
    />
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
        label: 'Down the screen',
        id: 'vertical',
        fullPage: true,
        description:
          'The same budget with the flow running top to bottom. The stages get the long side of the phone, and a name gets the width of its own bar instead of the gap between two columns.',
        render: () => <SankeyVerticalVersion />,
      },
      {
        label: 'Folding the long tail',
        id: 'collapse',
        fullPage: true,
        description:
          'A month of spending, seventeen categories deep. Folded, the five largest keep their own bars and the rest become Other; unfolded, the bottom nine are hairlines.',
        render: () => <SankeyCollapseVersion />,
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
      { label: 'Naming what is too thin to label', render: () => <SankeyLegendDemo /> },
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
      {
        label: 'A readout in the middle',
        id: 'readout',
        fullPage: true,
        description:
          'The seam fills the screen and a panel over the middle of it names what is on show. It changes as the seam moves, so the number and the picture are never saying different things.',
        render: () => <CompareReadoutVersion />,
      },
      { label: 'A seam that runs the other way', render: () => <CompareVerticalDemo /> },
      { label: 'Where the seam starts', render: () => <CompareStartDemo /> },
      { label: 'Frozen', render: () => <CompareFrozenDemo /> },
    ],
  },
  {
    slug: 'support',
    name: 'Support',
    summary: 'The screen a person arrives on when they need help',
    layout: 'pager',
    demos: [
      {
        label: 'The help screen',
        id: 'home',
        fullPage: true,
        description:
          'Who is there, the ways to reach them, and what happened to the last thing you asked. The unread dot takes the accent colour; the one on a thread that merely moved stays grey.',
        render: () => <SupportHomeVersion />,
      },
      {
        label: 'Picking a topic',
        id: 'topics',
        fullPage: true,
        description:
          'A single-select list, for a desk that routes to different teams. It is a radio group, so a screen reader reads it as one.',
        render: () => <SupportTopicsVersion />,
      },
      {
        label: 'Talking to somebody',
        id: 'thread',
        fullPage: true,
        fullBleed: true,
        backSwipe: true,
        description:
          'The conversation itself: who is answering, what request it belongs to, the handoff that says you are no longer talking to a machine, and the wait time where somebody is deciding whether to type.',
        render: () => <SupportThreadVersion />,
      },
      {
        label: 'The whole way through',
        id: 'journey',
        fullPage: true,
        fullBleed: true,
        backSwipe: true,
        description:
          'Four steps, driven for real: the help screen, picking a topic, the assistant answering, and the handoff to a person who can. Press through it.',
        render: () => <SupportJourneyVersion />,
      },
      { label: 'When nobody is there', render: () => <SupportAwayDemo /> },
    ],
  },
  {
    slug: 'leaderboard',
    name: 'Leaderboard',
    summary: 'Entries ranked by a value, with the top three on a podium',
    demos: [
      {
        label: 'Step challenge',
        id: 'steps',
        fullPage: true,
        description:
          'The bar podium, scaled to the values. Switch weeks and the bars regrow to the new totals.',
        render: () => <LeaderboardStepsVersion />,
      },
      {
        label: 'Sales team',
        id: 'sales',
        fullPage: true,
        description: 'Cards for the top three, with revenue written out in currency.',
        render: () => <LeaderboardSalesVersion />,
      },
      {
        label: 'Weekly league',
        id: 'league',
        fullPage: true,
        description:
          'Forty players cut to ten. You are 27th, so your row is pinned under the list with its real place.',
        render: () => <LeaderboardLeagueVersion />,
      },
      {
        label: 'Fastest laps',
        id: 'laps',
        fullPage: true,
        description: 'Lowest time first, no podium, and a tie for second.',
        render: () => <LeaderboardLapsVersion />,
      },
      { label: 'A short list', render: () => <LeaderboardShortDemo /> },
      { label: 'Nothing to rank', render: () => <LeaderboardEmptyDemo /> },
    ],
  },
  {
    slug: 'countdown',
    name: 'Countdown',
    summary: 'The time left until a moment, ticking down to it',
    demos: [
      {
        label: 'Launch page',
        id: 'launch',
        fullPage: true,
        description: 'Large segments under a headline, two and a half days out.',
        render: () => <CountdownLaunchVersion />,
      },
      {
        label: 'Flash sale',
        id: 'sale',
        fullPage: true,
        description:
          'Inline in a card header. It turns red in the last five minutes and swaps to "Ended" when it reaches zero.',
        render: () => <CountdownSaleVersion />,
      },
      {
        label: 'Resend a code',
        id: 'resend',
        fullPage: true,
        description: 'Thirty seconds, then the line becomes a button that starts it again.',
        render: () => <CountdownResendVersion />,
      },
      { label: 'Sizes and units', render: () => <CountdownSizesDemo /> },
      { label: 'Translated labels', render: () => <CountdownLabelsDemo /> },
    ],
  },
  {
    slug: 'avatar-cropper',
    name: 'AvatarCropper',
    summary: 'Frame a photo under a circle, and get that circle back as an image',
    demos: [
      {
        label: 'Change photo',
        id: 'profile',
        fullPage: true,
        description:
          'Choose a photo or take one, frame it, and see it land in the avatar. The sample photo works without a camera.',
        render: () => <AvatarCropperProfileVersion />,
      },
      { label: 'Drag, pinch and turn', render: () => <AvatarCropperBasicDemo /> },
      { label: 'Shapes', render: () => <AvatarCropperShapesDemo /> },
      { label: 'Zooming out past the outline', render: () => <AvatarCropperZoomOutDemo /> },
    ],
  },
  {
    slug: 'file-upload',
    name: 'FileUpload',
    summary: 'Pick files and photos, check them, and run their uploads',
    demos: [
      {
        label: 'Claim documents',
        id: 'claim',
        fullPage: true,
        description:
          'A dropzone over a list of rows. Two files upload at a time while the rest wait, and one drops its connection so the retry can be tried.',
        render: () => <FileUploadClaimVersion />,
      },
      {
        label: 'Listing photos',
        id: 'listing',
        fullPage: true,
        description:
          'A grid led by an add tile that counts against the limit. Tap a photo to see it full screen.',
        render: () => <FileUploadListingVersion />,
      },
      {
        label: 'Profile photo',
        id: 'profile',
        fullPage: true,
        description:
          'One photo, cropped square by the system editor. The camera badge and the button open the same choice.',
        render: () => <FileUploadProfileVersion />,
      },
      {
        label: 'Message attachments',
        id: 'chat',
        fullPage: true,
        description: 'A paperclip in a composer, with each attachment uploading in a strip above the field.',
        render: () => <FileUploadChatVersion />,
      },
      { label: 'Trigger and list', render: () => <FileUploadBasicDemo /> },
      { label: 'Rules and rejections', render: () => <FileUploadRulesDemo /> },
      { label: 'Photo strip', render: () => <FileUploadStripDemo /> },
      { label: 'Disabled', render: () => <FileUploadDisabledDemo /> },
    ],
  },
  {
    slug: 'week-strip',
    name: 'WeekStrip',
    summary: 'One row of days to pick from, with marks for what is on each',
    demos: [
      { label: 'A week of classes', render: () => <WeekStripScheduleDemo /> },
      { label: 'Labels instead of dots', render: () => <WeekStripLabelsDemo /> },
      { label: 'Past, closed and flagged days', render: () => <WeekStripStaffDemo /> },
      { label: 'Three weeks ahead', render: () => <WeekStripScrollDemo /> },
    ],
  },
  {
    slug: 'week-hours-grid',
    name: 'WeekHoursGrid',
    summary: 'A week of hours, one row per day, with the taken parts filled in',
    demos: [
      { label: 'Working hours', render: () => <WeekHoursWorkingDemo /> },
      { label: 'Yours and others', render: () => <WeekHoursBookedDemo /> },
      { label: 'A shift plan', render: () => <WeekHoursShiftsDemo /> },
    ],
  },
];
export const ENTRIES_BY_SLUG = Object.fromEntries(ENTRIES.map((entry) => [entry.slug, entry]));
