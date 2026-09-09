import { useEffect, useRef, useState } from "react";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image, ScrollView, View, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Avatar, Badge, BookmarkIcon, BellIcon, Button, CalendarIcon, Card, ChevronLeftIcon, ChevronRightIcon, EllipsisIcon, Frame, IconColorProvider, LinkIcon, GlobeIcon, Item, PageHeader, PencilIcon, PlusIcon, ScrollHeader, SearchBar, SearchIcon, SectionProgress, type SectionProgressColor, type SectionProgressPlacement, ShareNodesIcon, Skeleton, SplitView, Splitter, Switch, Text, Tooltip, Tour, Typography, useThemeMode, WaterfallChart, type WaterfallDatum, waterfallSteps, useScrollSections, Spinner } from "panelui-native";
import { CircleButton } from "../../components/screen-header";
import { PanelsideActionsBlock, PanelsideAssistantBlock, PanelsideChatBlock, PanelsideCurveBlock, PanelsideDockedBlock, PanelsideNativeBlock, PanelsideNavigateBlock, PanelsideOverlayBlock } from "../../components/panelside-blocks";
import { useCSSVariable } from "uniwind";
import type { ComponentEntry } from '../component-types';

/** Two series side by side, which is what a bar chart is for. */
/** Padding the header needs to line up inside a `Frame.Panel`, which has none. */
const CHART_HEADER = 'px-4 pt-3.5';

const PROGRESS_SECTIONS: { id: string; label: string; color?: SectionProgressColor; body: string }[] = [
  {
    id: 'intro',
    label: 'Introduction',
    color: 'primary',
    body: 'Scroll on, and the pill appears at the bottom of the screen carrying two readings: how far down the page you are, and which part of it you are reading.',
  },
  {
    id: 'install',
    label: 'Installation',
    color: 'info',
    body: 'The ring is filled from the scroll position and the label is the section you are in. Press the pill to open the list and jump anywhere in it.',
  },
  {
    id: 'theming',
    label: 'Theming',
    color: 'success',
    body: 'Each section here declares a colour, so the ring, the label and the wash across the pill change as you cross into it.',
  },
  {
    id: 'motion',
    label: 'Motion',
    color: 'warning',
    body: 'The ring eases towards each new position rather than snapping to it, so a scroll reads as a glide instead of a series of steps.',
  },
  {
    id: 'native',
    label: 'Native controls',
    color: 'danger',
    body: 'The label changes when a heading passes a reading line a little way down the screen, so the section you have just scrolled past still counts as the one you are in.',
  },
  {
    id: 'faq',
    label: 'Frequently asked',
    body: 'The last section is a special case: its top may never reach the reading line because the page runs out first, so reaching the bottom counts as being in it.',
  },
];

/**
 * Shared body for the scrolling demos — only the pill's placement and whether
 * the sections carry colours differ.
 *
 * One hook owns the scroll: it picks the section *and* publishes the position
 * the ring is filled from, so the two readings cannot disagree about where the
 * page is.
 *
 * Full-bleed, and it has to be: the pill anchors itself to the screen's own
 * edges and clears the safe area from there. Inside a screen with a header
 * above it, "the top" is wherever that header ended and the inset is counted
 * twice — which puts a top-anchored pill somewhere down the middle. So this
 * takes the whole screen and draws its own way back.
 */
function SectionProgressVersion({
  placement,
  tinted,
  haptics,
}: {
  placement?: SectionProgressPlacement;
  tinted?: boolean;
  haptics?: boolean;
}) {
  const sections = useScrollSections({ ids: PROGRESS_SECTIONS.map((section) => section.id) });
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View className="flex-1">
      <ScrollView
        ref={sections.ref}
        {...sections.scrollProps}
        // Room at both ends for the pill, which floats over the content, and
        // for the way back.
        contentContainerStyle={{ paddingTop: insets.top + 44, paddingBottom: 140 }}
      >
        {PROGRESS_SECTIONS.map((section) => (
          <View
            key={section.id}
            onLayout={sections.measure(section.id)}
            className="gap-3 px-6 py-10"
          >
            <Text size="2xl" weight="semibold">
              {section.label}
            </Text>
            <Text size="sm" muted>
              {section.body}
            </Text>
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </View>
        ))}
      </ScrollView>

      <SectionProgress
        placement={placement}
        haptics={haptics}
        scroll={sections.scroll}
        value={sections.active}
        onValueChange={sections.scrollTo}
      >
        {PROGRESS_SECTIONS.map((section) => (
          <SectionProgress.Item
            key={section.id}
            value={section.id}
            color={tinted ? section.color : undefined}
          >
            {section.label}
          </SectionProgress.Item>
        ))}
      </SectionProgress>

      {/* The way out. A full-bleed demo has no header and no back-swipe —
          iOS claims that edge for popping the stack and wins — so the exit is
          this block's to draw. The app's own circular control, not a bare
          glyph: this sits over moving content, and an icon with nothing under
          it is invisible against half of what scrolls past. At the start edge,
          clear of a centred pill. */}
      <VersionBack />
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Catalogue                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * A miniature screen for the tour to walk through.
 *
 * The point of a tour is that it points at things that are already there, so
 * the demo needs a screen with things on it rather than three buttons in a row.
 * This is the smallest one that still has a header, a body and an action —
 * enough for the spotlight to travel a real distance between steps.
 */
function TourDemo() {
  const [running, setRunning] = useState(false);

  return (
    <View className="w-full gap-4">
      <Tour open={running} onOpenChange={setRunning}>
        <View className="flex-row items-center justify-between">
          <Text weight="semibold">Inbox</Text>
          <Tour.Step
            order={1}
            title="Filter what you see"
            description="Unread, flagged, or everything at once."
            shape="circle"
          >
            <Button variant="ghost" size="icon" accessibilityLabel="Filter">
              <SearchIcon size={20} />
            </Button>
          </Tour.Step>
        </View>

        <Tour.Step
          order={0}
          title="Your conversations"
          description="Everything waiting for a reply lands in this list."
          radius={16}
        >
          <Card>
            {/* `p-4` rather than the default: Card.Content is `p-6 pt-0`,
                which assumes a Card.Header above it, and there is none here —
                so without this the three rows sit against the top border. */}
            <Card.Content className="gap-2 p-4">
              {[
                { name: 'Ana Ruiz', initials: 'AR' },
                { name: 'Deploy bot', initials: 'DB' },
                { name: 'Marta Silva', initials: 'MS' },
              ].map((person) => (
                <View key={person.name} className="flex-row items-center gap-3">
                  <Avatar size="sm" fallback={person.initials} />
                  <Text size="sm">{person.name}</Text>
                </View>
              ))}
            </Card.Content>
          </Card>
        </Tour.Step>

        <Tour.Step
          order={2}
          title="Start something new"
          description="A message to anyone, from anywhere in the app."
        >
          <Button onPress={() => {}}>New message</Button>
        </Tour.Step>
      </Tour>

      <Button variant="outline" onPress={() => setRunning(true)}>
        Start the tour
      </Button>
    </View>
  );
}

/** `shape="circle"` for the controls that are round to begin with. */
function TourCircleDemo() {
  const [running, setRunning] = useState(false);

  return (
    <View className="w-full gap-4">
      <Tour open={running} onOpenChange={setRunning} shape="circle" padding={10}>
        <View className="flex-row items-center justify-center gap-6">
          <Tour.Step order={0} title="You" description="Your profile, and everything under it.">
            <Avatar fallback="KA" />
          </Tour.Step>
          <Tour.Step
            order={1}
            title="What you saved"
            description="Anything you bookmark shows up here."
          >
            <Button variant="secondary" size="icon" accessibilityLabel="Saved">
              <BookmarkIcon size={20} />
            </Button>
          </Tour.Step>
          <Tour.Step order={2} title="Alerts" description="What the app is allowed to interrupt you for.">
            <Button variant="secondary" size="icon" accessibilityLabel="Alerts">
              <BellIcon size={20} />
            </Button>
          </Tour.Step>
        </View>
      </Tour>

      <Button variant="outline" onPress={() => setRunning(true)}>
        Start the tour
      </Button>
    </View>
  );
}

/**
 * `interactive` leaves the spotlit control pressable, so the walkthrough can
 * ask you to use it rather than read about it. Advancing is the app's call:
 * the target's own `onPress` moves the tour on.
 */
function TourInteractiveDemo() {
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(0);
  const [count, setCount] = useState(0);

  return (
    <View className="w-full gap-4">
      <Tour
        open={running}
        onOpenChange={setRunning}
        step={step}
        onStepChange={setStep}
        interactive
        showSkip={false}
      >
        <View className="items-center gap-4">
          <Tour.Step
            order={0}
            title="Press it"
            description="Go on — the button still works under the dim."
            shape="circle"
          >
            <Button
              variant="primary"
              size="icon"
              accessibilityLabel="Add one"
              onPress={() => {
                setCount((current) => current + 1);
                if (running && step === 0) setStep(1);
              }}
            >
              <PlusIcon size={20} />
            </Button>
          </Tour.Step>

          <Tour.Step order={1} title="And there it is" description="The count went up by one.">
            <Text size="lg" weight="semibold">
              {count}
            </Text>
          </Tour.Step>
        </View>
      </Tour>

      <Button
        variant="outline"
        onPress={() => {
          setStep(0);
          setRunning(true);
        }}
      >
        Start the tour
      </Button>
    </View>
  );
}

/**
 * A walkthrough of a screen taller than the screen.
 *
 * The one case a tour cannot handle by itself: a target that has scrolled out
 * of view has no rect worth measuring, so the step has to bring it back first.
 * `onStepChange` fires with the step about to be shown, which is the moment to
 * do it — every step records where it sits during layout, and the handler
 * scrolls there before the spotlight goes looking.
 *
 * The scroll is deliberately not animated. The overlay measures its target a
 * frame after the step changes, which is early enough to catch a jump and far
 * too early to catch a three-hundred-millisecond glide — the hole would settle
 * over wherever the content was passing through at the time. Under a dimmed
 * screen the jump is not what the eye is following anyway; the spotlight
 * travelling to the new target is.
 */
function TourScrollingDemo() {
  const [running, setRunning] = useState(false);
  const scroller = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();

  // Where each step sits down the content, filled in as the rows lay out. A
  // ref rather than state: nothing renders from it, and a set-state per row
  // during layout is a re-render per row for no visible difference.
  const offsets = useRef<Record<number, number>>({});
  const remember = (order: number) => (event: LayoutChangeEvent) => {
    offsets.current[order] = event.nativeEvent.layout.y;
  };

  return (
    <View className="flex-1">
      <Tour
        open={running}
        onOpenChange={setRunning}
        onStepChange={(order) => {
          const y = offsets.current[order];
          if (y === undefined) return;
          // Short of the target rather than flush with it, so the step lands
          // with some of the screen it belongs to still around it.
          scroller.current?.scrollTo({ y: Math.max(0, y - 96), animated: false });
        }}
      >
        <ScrollView
          ref={scroller}
          contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 120, gap: 16 }}
          showsVerticalScrollIndicator={false}
        >
          <Text size="xl" weight="bold">
            Workspace
          </Text>

          {/* The steps are direct children of the scroller, so the `y` each one
              reports at layout is its offset down the content — which is
              exactly what scrollTo takes. Nested a level deeper it would be an
              offset within whatever it was nested in. */}
          <Tour.Step
            order={0}
            onLayout={remember(0)}
            title="Everyone in here"
            description="Who has access, and what they can reach."
            radius={16}
          >
            <Card>
              <Card.Content className="gap-3 p-4">
                {[
                  { name: 'Ana Ruiz', role: 'Admin', initials: 'AR' },
                  { name: 'Marta Silva', role: 'Editor', initials: 'MS' },
                  { name: 'Tom Byrne', role: 'Viewer', initials: 'TB' },
                ].map((person) => (
                  <View key={person.name} className="flex-row items-center gap-3">
                    <Avatar size="sm" fallback={person.initials} />
                    <Text size="sm" className="flex-1">
                      {person.name}
                    </Text>
                    <Badge variant="secondary">{person.role}</Badge>
                  </View>
                ))}
              </Card.Content>
            </Card>
          </Tour.Step>

          <Filler lines={7} />

          <Tour.Step
            order={1}
            onLayout={remember(1)}
            title="What gets sent"
            description="Turn off anything you would rather not hear about."
            radius={16}
          >
            <Card>
              <Card.Content className="gap-4 p-4">
                <Text weight="semibold">Notifications</Text>
                <NotificationRow label="Mentions" initial />
                <NotificationRow label="Weekly digest" />
              </Card.Content>
            </Card>
          </Tour.Step>

          <Filler lines={9} />

          <Tour.Step
            order={2}
            onLayout={remember(2)}
            title="The one that cannot be undone"
            description="Right at the bottom, where it belongs."
          >
            <Button variant="destructive" onPress={() => {}}>
              Delete workspace
            </Button>
          </Tour.Step>
        </ScrollView>
      </Tour>

      {/* Pinned, so the walkthrough can be restarted from wherever the last
          one left the scroll. */}
      <View
        pointerEvents="box-none"
        className="absolute inset-x-0 bottom-0 px-5"
        style={{ paddingBottom: insets.bottom + 20 }}
      >
        <Button onPress={() => setRunning(true)}>Start the walkthrough</Button>
      </View>
    </View>
  );
}

/** One switch row, holding its own state — Switch is controlled. */
function NotificationRow({ label, initial = false }: { label: string; initial?: boolean }) {
  const [on, setOn] = useState(initial);
  return (
    <View className="flex-row items-center justify-between gap-4">
      <Text size="sm" className="flex-1">
        {label}
      </Text>
      <Switch value={on} onValueChange={setOn} />
    </View>
  );
}

/** Filler paragraphs, so the steps are genuinely a scroll apart. */
function Filler({ lines }: { lines: number }) {
  return (
    <View className="gap-2">
      {Array.from({ length: lines }, (_, index) => (
        <View
          key={index}
          className="h-3 rounded-full bg-muted"
          style={{ width: `${68 + ((index * 37) % 30)}%` }}
        />
      ))}
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* WaterfallChart                                                             */
/* -------------------------------------------------------------------------- */

/**
 * A quarter's revenue bridge: where it opened, what moved it, where it closed.
 *
 * Both ends are marked `total`, which is what anchors them to the baseline and
 * makes the run a bridge between two readings rather than a row of changes.
 * The closing entry carries `value: 0` — it reads the balance as it stands
 * rather than adding to it.
 */
const REVENUE_BRIDGE: WaterfallDatum[] = [
  { label: 'Q3', value: 482000, total: true },
  { label: 'New', value: 96400 },
  { label: 'Expansion', value: 41200 },
  { label: 'Churn', value: -58700 },
  { label: 'Downgrade', value: -19300 },
  { label: 'Q4', value: 0, total: true },
];

/** Where a month's cash went, with no opening balance to bridge from. */
const CASH_FLOW: WaterfallDatum[] = [
  { label: 'Opening', value: 128000, total: true },
  { label: 'Receipts', value: 74500 },
  { label: 'Payroll', value: -61200 },
  { label: 'Hosting', value: -14800 },
  { label: 'Marketing', value: -22400 },
  { label: 'Tax', value: -18600 },
  { label: 'Closing', value: 0, total: true },
];

/** Money reads with its separators, and with the sign outside the symbol. */
const dollars = (value: number) =>
  `${value < 0 ? '−' : ''}$${Math.abs(Math.round(value)).toLocaleString()}`;

/** The plain bridge: two totals, four changes, and the connectors between. */
function WaterfallBasicVersion() {
  return (
    <View className="flex-1 justify-center p-4">
      <Frame className="w-full">
        <Frame.Header>
          <Frame.Title>Revenue</Frame.Title>
          <Frame.Action>Q3 to Q4</Frame.Action>
        </Frame.Header>
        <Frame.Panel>
          <WaterfallChart data={REVENUE_BRIDGE} className="px-2 pb-4">
            <WaterfallChart.Header
              className={CHART_HEADER}
              title="Closing"
              value={dollars(541600)}
              caption="Up $59,600 on the quarter"
              legend
            />
            <WaterfallChart.Grid />
            <WaterfallChart.Connectors />
            <WaterfallChart.Bars />
            <WaterfallChart.XAxis />
            <WaterfallChart.Tooltip />
          </WaterfallChart>
        </Frame.Panel>
      </Frame>
    </View>
  );
}

/**
 * The same run with every change written at the end of its bar, and the value
 * axis down the side to read the balances against.
 */
function WaterfallValuesVersion() {
  return (
    <View className="flex-1 justify-center p-4">
      <Frame className="w-full">
        <Frame.Header>
          <Frame.Title>Revenue</Frame.Title>
          <Frame.Action>Labelled</Frame.Action>
        </Frame.Header>
        <Frame.Panel>
          <WaterfallChart data={REVENUE_BRIDGE} aspectRatio={1.5} className="px-2 pb-4">
            <WaterfallChart.Header
              className={CHART_HEADER}
              title="Q4 revenue"
              value={dollars(541600)}
              caption="Each bar is what that line moved"
            />
            <WaterfallChart.Grid />
            <WaterfallChart.YAxis />
            <WaterfallChart.Connectors />
            <WaterfallChart.Bars />
            <WaterfallChart.Values />
            <WaterfallChart.XAxis />
            <WaterfallChart.Tooltip />
          </WaterfallChart>
        </Frame.Panel>
      </Frame>
    </View>
  );
}

/**
 * Seven steps, laid down the side.
 *
 * The reason to turn it is the names. Upright, seven columns across a phone is
 * about forty points each, and "Marketing" does not fit under one. Sideways
 * every name gets a full line to itself and the run reads top to bottom.
 */
function WaterfallSidewaysVersion() {
  return (
    <View className="flex-1 justify-center p-4">
      <Frame className="w-full">
        <Frame.Header>
          <Frame.Title>Cash</Frame.Title>
          <Frame.Action>March</Frame.Action>
        </Frame.Header>
        <Frame.Panel>
          <WaterfallChart
            data={CASH_FLOW}
            orientation="horizontal"
            aspectRatio={0.95}
            className="px-2 pb-4"
          >
            <WaterfallChart.Header
              className={CHART_HEADER}
              title="Closing balance"
              value={dollars(85500)}
              caption="Down $42,500 on the month"
              legend
            />
            <WaterfallChart.Grid />
            <WaterfallChart.Connectors />
            <WaterfallChart.Bars />
            <WaterfallChart.YAxis />
            <WaterfallChart.Tooltip />
          </WaterfallChart>
        </Frame.Panel>
      </Frame>
    </View>
  );
}

/**
 * The header following the finger: the step's own change while one is held,
 * and the closing balance when nothing is.
 */
function WaterfallReadoutVersion() {
  const [active, setActive] = useState(-1);
  const step = active >= 0 ? waterfallSteps(CASH_FLOW)[active] : null;

  return (
    <View className="flex-1 justify-center p-4">
      <Frame className="w-full">
        <Frame.Header>
          <Frame.Title>Cash</Frame.Title>
          <Frame.Action>Drag the chart</Frame.Action>
        </Frame.Header>
        <Frame.Panel>
          <WaterfallChart
            data={CASH_FLOW}
            aspectRatio={1.6}
            onActiveIndexChange={setActive}
            className="px-2 pb-4"
          >
            <WaterfallChart.Header
              className={CHART_HEADER}
              title={step ? step.label : 'Closing balance'}
              value={dollars(step ? step.value : 85500)}
              caption={
                step
                  ? step.kind === 'total'
                    ? 'A reading, not a change'
                    : `Balance after: ${dollars(step.end)}`
                  : 'Seven lines, opening to closing'
              }
            />
            <WaterfallChart.Grid />
            <WaterfallChart.Connectors />
            <WaterfallChart.Bars />
            <WaterfallChart.XAxis ticks={4} />
            <WaterfallChart.Tooltip />
          </WaterfallChart>
        </Frame.Panel>
      </Frame>
    </View>
  );
}

/** The waiting state, and the run growing out of it when the data lands. */
function WaterfallLoadingVersion() {
  const [status, setStatus] = useState<'loading' | 'ready'>('loading');

  // Guarded on `status` and armed by it: "Load again" puts the chart back into
  // loading, and that is what has to start the next timer. Keyed to mount, the
  // button set a state nothing would ever move off again.
  useEffect(() => {
    if (status !== 'loading') return;
    const timer = setTimeout(() => setStatus('ready'), 500);
    return () => clearTimeout(timer);
  }, [status]);

  return (
    <View className="flex-1 justify-center gap-4 p-4">
      <Frame className="w-full">
        <Frame.Header>
          <Frame.Title>Revenue</Frame.Title>
          <Frame.Action>{status === 'loading' ? 'Loading' : 'Q3 to Q4'}</Frame.Action>
        </Frame.Header>
        <Frame.Panel>
          <WaterfallChart data={REVENUE_BRIDGE} status={status} className="px-2 pb-4">
            <WaterfallChart.Header
              className={CHART_HEADER}
              title="Closing"
              value={status === 'loading' ? '—' : dollars(541600)}
              caption={status === 'loading' ? 'Fetching' : 'Up $59,600 on the quarter'}
            />
            <WaterfallChart.Grid />
            <WaterfallChart.Skeleton />
            <WaterfallChart.Connectors />
            <WaterfallChart.Bars />
            <WaterfallChart.XAxis />
            <WaterfallChart.Tooltip />
          </WaterfallChart>
        </Frame.Panel>
      </Frame>

      <Button variant="secondary" onPress={() => setStatus('loading')}>
        Load again
      </Button>
    </View>
  );
}

/** Filler for a splitter pane, so the demos show where the seam actually lands. */
function Pane({ title, body, className }: { title: string; body: string; className?: string }) {
  return (
    <View className={`h-full gap-1 p-4 ${className ?? ''}`}>
      <Text weight="medium">{title}</Text>
      <Text size="sm" muted>
        {body}
      </Text>
    </View>
  );
}

/**
 * The sidebar case, which is the one `collapsible` exists for: a pane dragged
 * past its minimum shuts instead of stopping, and the readout says which of the
 * two it did so the behaviour is legible without a screen reader.
 */
function SplitterCollapsibleDemo() {
  const [layout, setLayout] = useState([32, 68]);
  const shut = (layout[0] ?? 0) < 1;

  return (
    <View className="w-full gap-3">
      <Splitter
        className="h-56 overflow-hidden rounded-2xl border border-border"
        defaultLayout={[32, 68]}
        onLayoutChange={setLayout}
      >
        <Splitter.Panel minSize={22} collapsible className="bg-surface-secondary">
          <Pane title="Folders" body="Drag the seam left to shut this." />
        </Splitter.Panel>
        <Splitter.Handle />
        <Splitter.Panel minSize={40}>
          <Pane title="Messages" body="Double-tap the seam to put it back." />
        </Splitter.Panel>
      </Splitter>
      <Text size="sm" muted>
        {shut
          ? 'Sidebar shut — double-tap the seam to bring it back.'
          : `Sidebar ${Math.round(layout[0] ?? 0)}%, messages ${Math.round(layout[1] ?? 0)}%.`}
      </Text>
    </View>
  );
}

/** Controlled, so a button can put the layout back where the panes started. */
function SplitterControlledDemo() {
  const [layout, setLayout] = useState([50, 50]);

  return (
    <View className="w-full gap-3">
      <Splitter
        className="h-48 overflow-hidden rounded-2xl border border-border"
        layout={layout}
        onLayoutChange={setLayout}
      >
        <Splitter.Panel minSize={20}>
          <Pane title="Before" body={`${Math.round(layout[0] ?? 0)}%`} />
        </Splitter.Panel>
        <Splitter.Handle />
        <Splitter.Panel minSize={20} className="bg-surface-secondary">
          <Pane title="After" body={`${Math.round(layout[1] ?? 0)}%`} />
        </Splitter.Panel>
      </Splitter>
      <Button variant="outline" onPress={() => setLayout([50, 50])}>
        Even split
      </Button>
    </View>
  );
}

/** Filler for a split-view pane, so the demos show where the seam lands. */
function Half({ title, body, className }: { title: string; body: string; className?: string }) {
  return (
    <View className={`flex-1 justify-center gap-1 p-4 ${className ?? ''}`}>
      <Text weight="medium">{title}</Text>
      <Text size="sm" muted>
        {body}
      </Text>
    </View>
  );
}

const NOTES = [
  'The pane clips what does not fit.',
  'So anything longer than the shortest snap point brings its own scroller.',
  'A ScrollView here behaves like any other scroller in a box whose height changes.',
  'Drag the seam down and this list gets more of the room.',
  'Drag it up and the list keeps scrolling in what is left.',
  'Nothing about the scroll position changes when the pane does.',
];

/** Controlled, so a button can put the seam somewhere the reader did not drag it. */
function SplitViewControlledDemo() {
  const [index, setIndex] = useState(1);

  return (
    <View className="w-full gap-3">
      <SplitView
        className="h-80 overflow-hidden rounded-2xl border border-border"
        snapIndex={index}
        onSnapIndexChange={setIndex}
      >
        <SplitView.Top>
          <Half title="Preview" body={`Snap ${index + 1} of 3.`} className="bg-surface-secondary" />
        </SplitView.Top>
        <SplitView.DragArea>
          <SplitView.Handle />
        </SplitView.DragArea>
        <SplitView.Bottom>
          <Half title="Source" body="What you are writing." />
        </SplitView.Bottom>
      </SplitView>
      <Button variant="outline" onPress={() => setIndex(0)}>
        Collapse the preview
      </Button>
    </View>
  );
}

/** The maintainer's own face, so the demo profile is somebody real. */
const PROFILE_FACE = 'https://avatars.githubusercontent.com/u/127331761?v=4';

/**
 * A ramp per version. `PageHeader.Cover` draws the default pair when it is
 * given none — which the profile version keeps — and `colors` takes anything
 * else, so no two headers in the gallery open on the same banner.
 */
const COVER_RAMPS = {
  centred: ['#22d3ee', '#3b82f6'],
  hero: ['#f472b6', '#8b5cf6', '#312e81'],
  brand: ['#fbbf24', '#f97316', '#db2777'],
  leading: ['#34d399', '#0ea5e9'],
} as const;

/** How far the screen has to be pulled before letting go starts a refresh. */
const PULL_THRESHOLD = 90;

/** What a request would have cost, so the spinner is on screen long enough to see. */
const REFRESH_DURATION = 1400;

/** How long the indicator takes to fade in once the refresh has started, and out after. */
const INDICATOR_FADE = 180;

/**
 * A profile screen and the pull that reloads it.
 *
 * The indicator is drawn here rather than handed to `RefreshControl`, because
 * the platform's own one does not appear on these screens: it reserves its
 * height, pushes the content down and never draws the spinner into the gap it
 * made — a pull that opens a space, waits, and closes again with nothing in
 * it, which is indistinguishable from the screen being inert.
 *
 * So the bounce is read instead of intercepted. iOS already stretches the
 * scroll past its top; how far past is the pull, and the indicator is bound to
 * it. Nothing takes the touch away from the scroll view, which is what keeps
 * the flick and the drag feeling exactly as they did.
 *
 * It floats over the cover rather than opening a gap above it. A gap has to be
 * held open for as long as the refresh runs, and holding one open means
 * fighting the content inset the safe area is already using.
 */
function ProfileScroll({
  contentContainerStyle,
  children,
}: {
  contentContainerStyle?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const pull = useSharedValue(0);
  const busy = useSharedValue(0);

  useEffect(() => {
    busy.value = withTiming(refreshing ? 1 : 0, { duration: INDICATOR_FADE });
  }, [refreshing, busy]);

  useEffect(() => {
    if (!refreshing) return;
    const timer = setTimeout(() => setRefreshing(false), REFRESH_DURATION);
    return () => clearTimeout(timer);
  }, [refreshing]);

  const onScroll = useAnimatedScrollHandler((event) => {
    const over = -event.contentOffset.y;
    pull.value = over > 0 ? over : 0;
  });

  /*
   * The release is read on the JavaScript thread rather than in the scroll
   * worklet: starting a refresh is a state change either way, so a worklet
   * would only add a hop back across to make it.
   */
  const onScrollEndDrag = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (refreshing) return;
    if (-event.nativeEvent.contentOffset.y >= PULL_THRESHOLD) setRefreshing(true);
  };

  const indicatorStyle = useAnimatedStyle(() => {
    // Whichever is further along: the finger while it is pulling, the refresh
    // once it has started. Without the max the indicator blinks out at the
    // moment of release, which is the moment it is meant to take over.
    const drawn = Math.min(pull.value / PULL_THRESHOLD, 1);
    const shown = drawn > busy.value ? drawn : busy.value;
    return {
      opacity: shown,
      transform: [{ scale: 0.7 + shown * 0.3 }, { translateY: (shown - 1) * 10 }],
    };
  });

  return (
    <>
      <Animated.ScrollView
        onScroll={onScroll}
        onScrollEndDrag={onScrollEndDrag}
        scrollEventThrottle={16}
        contentContainerStyle={contentContainerStyle}
      >
        {children}
      </Animated.ScrollView>
      <Animated.View
        pointerEvents="none"
        /*
         * Announced only once the refresh is actually running. While the
         * finger is still pulling this is a shape following it, and a screen
         * reader has no finger to follow — it would be told something is
         * loading before anything is.
         */
        accessibilityElementsHidden={!refreshing}
        importantForAccessibility={refreshing ? 'yes' : 'no-hide-descendants'}
        // Level with the back button, which sits at the same offset. Two round
        // controls on one line read as a pair; four points apart they read as a
        // mistake.
        style={[{ position: 'absolute', top: insets.top + 4, alignSelf: 'center' }, indicatorStyle]}
        className="h-11 w-11 items-center justify-center rounded-full border border-border bg-surface"
      >
        <Spinner size="sm" label={refreshing ? 'Refreshing' : undefined} />
      </Animated.View>
    </>
  );
}

/**
 * The way out of a full-bleed version. Over the cover at the start edge, in
 * the circle the rest of the app uses — the demo owns the whole screen, so
 * nothing else is drawing one.
 */
function VersionBack() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  // The chevron is tinted, not left to its default. An icon with no colour
  // falls back to a fixed grey, which reads as disabled on a dark screen.
  const foreground = useCSSVariable('--color-foreground');
  return (
    <View className="absolute z-10 start-4" style={{ top: insets.top + 4 }}>
      <CircleButton onPress={() => router.back()} label="Go back">
        <ChevronLeftIcon
          size={20}
          color={typeof foreground === 'string' ? foreground : undefined}
        />
      </CircleButton>
    </View>
  );
}

/**
 * The story button in the avatar's corner. The glyph is resolved against the
 * page rather than left to inherit: the circle is filled in the foreground
 * colour, so an icon that took the foreground colour too would be a dark mark
 * on a dark disc in a light theme and invisible.
 */
function StoryBadge() {
  const background = useCSSVariable('--color-background');
  return (
    <View className="h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-foreground">
      <IconColorProvider color={typeof background === 'string' ? background : undefined}>
        <PlusIcon size={13} />
      </IconColorProvider>
    </View>
  );
}

/**
 * The screen header: a gradient to the edges, the face at the leading edge,
 * and everything about the account under it.
 */
function PageHeaderProfileVersion() {
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1 bg-background">
      <VersionBack />
      <ProfileScroll
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      >
        <PageHeader variant="page" align="start">
          <PageHeader.Cover height={insets.top + 120} />
          <PageHeader.Avatar source={{ uri: PROFILE_FACE }} fallback="KA" verified />
          <PageHeader.Content>
            <PageHeader.Title>Khalid Abdi</PageHeader.Title>
            <PageHeader.Description>@Khalidabdi1</PageHeader.Description>
            <Text className="pt-2">
              Building high-performance React Native components for Expo. Open source,
              shipping in public.
            </Text>
            <View className="flex-row flex-wrap gap-x-4 pt-2">
              <PageHeader.Meta icon={<LinkIcon size={14} />}>panelui.dev</PageHeader.Meta>
              <PageHeader.Meta icon={<CalendarIcon size={14} />}>
                Joined February 2022
              </PageHeader.Meta>
            </View>
            <PageHeader.Stats layout="inline" className="pt-2">
              <PageHeader.Stat value="188" label="Following" onPress={() => {}} />
              <PageHeader.Stat value="533" label="Followers" onPress={() => {}} />
            </PageHeader.Stats>
          </PageHeader.Content>
          <PageHeader.Actions>
            <Button variant="secondary" className="flex-1">
              Share profile
            </Button>
            <Button className="flex-1">Edit profile</Button>
          </PageHeader.Actions>
        </PageHeader>
      </ProfileScroll>
    </View>
  );
}

/**
 * The counts beside the face rather than under the name. No banner, so the
 * avatar has nothing to overlap and does not lift.
 */
function PageHeaderStatsVersion() {
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1 bg-background">
      <VersionBack />
      <ProfileScroll
        contentContainerStyle={{
          paddingTop: insets.top + 52,
          paddingBottom: insets.bottom + 24,
        }}
      >
        <PageHeader variant="page" align="start">
          <PageHeader.Row>
            <PageHeader.Avatar
              size="lg"
              source={{ uri: PROFILE_FACE }}
              fallback="KA"
              badge={<StoryBadge />}
            />
            <PageHeader.Stats className="flex-1">
              <PageHeader.Stat value="3" label="Posts" />
              <PageHeader.Stat value="788" label="Followers" onPress={() => {}} />
              <PageHeader.Stat value="1,882" label="Following" onPress={() => {}} />
            </PageHeader.Stats>
          </PageHeader.Row>
          <PageHeader.Content>
            <PageHeader.Title>Khalid Abdi</PageHeader.Title>
            <PageHeader.Description>Science &amp; Technology</PageHeader.Description>
            <Text size="sm" className="pt-1">
              Components, clips and the odd screen recording. Live well, sleep well.
            </Text>
            <PageHeader.Meta icon={<LinkIcon size={14} />} className="pt-1">
              panelui.dev
            </PageHeader.Meta>
          </PageHeader.Content>
          <PageHeader.Actions>
            <Button variant="secondary" className="flex-1">
              Edit profile
            </Button>
            <Button variant="secondary" className="flex-1">
              Share profile
            </Button>
            <Button variant="secondary" size="icon">
              <EllipsisIcon size={18} />
            </Button>
          </PageHeader.Actions>
        </PageHeader>
      </ProfileScroll>
    </View>
  );
}

/**
 * The tall hero: a photograph most of the way down the screen, the name under
 * it, and a strip of ruled counts.
 */
function PageHeaderHeroVersion() {
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1 bg-background">
      <VersionBack />
      <ProfileScroll
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      >
        <PageHeader variant="page" align="start">
          {/* A ramp of its own rather than the default pair, which is what
              `colors` is for — two real colour strings, because a gradient is
              painted rather than classed. */}
          <PageHeader.Cover
            height={insets.top + 300}
            colors={COVER_RAMPS.hero}
          />
          {/* No avatar. The banner is the account, so a face over it would be
              a second subject on the same screen. */}
          <PageHeader.Content className="pt-4">
            <View className="flex-row items-center gap-3">
              <PageHeader.Title className="flex-1">Coastline Weekly</PageHeader.Title>
              <Button variant="secondary" size="sm">
                Edit
              </Button>
            </View>
            <PageHeader.Description>u/coastlineweekly · 0 followers</PageHeader.Description>
          </PageHeader.Content>
          <PageHeader.Stats divided className="px-4 pt-4">
            <PageHeader.Stat value="73" label="Karma" />
            <PageHeader.Stat value="33" label="Posts" onPress={() => {}} />
            <PageHeader.Stat value="2mo" label="Age" />
          </PageHeader.Stats>
          <PageHeader.Actions>
            <Button className="flex-1">Follow</Button>
            <Button variant="secondary" size="icon">
              <ShareNodesIcon size={18} />
            </Button>
          </PageHeader.Actions>
        </PageHeader>
      </ProfileScroll>
    </View>
  );
}

/**
 * Everything on the centre line, over a gradient that runs to the screen's
 * edges — the profile that opens a screen rather than sitting on one.
 */
function PageHeaderCenteredVersion() {
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1 bg-background">
      <VersionBack />
      <ProfileScroll
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      >
        <PageHeader variant="page">
          <PageHeader.Cover height={insets.top + 140} colors={COVER_RAMPS.centred} />
          <PageHeader.Avatar source={{ uri: PROFILE_FACE }} fallback="KA" verified />
          <PageHeader.Content>
            <PageHeader.Title>Khalid Abdi</PageHeader.Title>
            <PageHeader.Description>khalid@panelui.dev</PageHeader.Description>
            <PageHeader.Meta icon={<GlobeIcon size={14} />} className="pt-1">
              Remote · GMT+3
            </PageHeader.Meta>
            <PageHeader.Stats className="pt-3">
              <PageHeader.Stat value="127" label="Components" />
              <PageHeader.Stat value="533" label="Followers" onPress={() => {}} />
              <PageHeader.Stat value="0.92" label="Version" />
            </PageHeader.Stats>
          </PageHeader.Content>
          <PageHeader.Actions>
            <Button variant="secondary" className="flex-1">
              Message
            </Button>
            <Button className="flex-1">Follow</Button>
          </PageHeader.Actions>
        </PageHeader>
      </ProfileScroll>
    </View>
  );
}

/**
 * An organisation rather than a person. The mark goes in the avatar slot, held
 * clear of the circle's edge by `contain` rather than filling it — a logo
 * cropped to a circle is a logo with its corners cut off.
 */
function PageHeaderBrandVersion() {
  const insets = useSafeAreaInsets();
  const { mode } = useThemeMode();
  return (
    <View className="flex-1 bg-background">
      <VersionBack />
      <ProfileScroll
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      >
        <PageHeader variant="page" align="start">
          <PageHeader.Cover height={insets.top + 120} colors={COVER_RAMPS.brand} />
          {/* The mark goes in the ring itself rather than through the face,
              which crops to fill. A logo cropped to a circle is a logo with
              its corners cut off, so it is contained and padded instead. */}
          <PageHeader.Avatar>
            <View className="h-full w-full items-center justify-center bg-card">
              <Image
                source={
                  mode === 'dark'
                    ? require('../../../assets/logo-dark.png')
                    : require('../../../assets/logo-light.png')
                }
                style={{ width: 46, height: 46 }}
                resizeMode="contain"
                accessibilityLabel="PanelUI"
              />
            </View>
          </PageHeader.Avatar>
          <PageHeader.Content>
            <View className="flex-row items-center gap-2">
              <PageHeader.Title>PanelUI</PageHeader.Title>
              <Badge variant="secondary">Open source</Badge>
            </View>
            <PageHeader.Description>
              High-performance React Native components for Expo
            </PageHeader.Description>
            <View className="flex-row flex-wrap gap-x-4 pt-2">
              <PageHeader.Meta icon={<LinkIcon size={14} />}>panelui.dev</PageHeader.Meta>
              <PageHeader.Meta icon={<CalendarIcon size={14} />}>Since 2025</PageHeader.Meta>
            </View>
            <PageHeader.Stats layout="inline" divided className="pt-3">
              <PageHeader.Stat value="127" label="Components" />
              <PageHeader.Stat value="6" label="Themes" />
            </PageHeader.Stats>
          </PageHeader.Content>
          <PageHeader.Actions>
            <Button className="flex-1">Install</Button>
            <Button variant="secondary" size="icon">
              <PencilIcon size={18} />
            </Button>
          </PageHeader.Actions>
        </PageHeader>
      </ProfileScroll>
    </View>
  );
}

/* ------------------------------------------------------------------ *
 * ScrollHeader
 * ------------------------------------------------------------------ */

/** Enough rows that the header has somewhere to collapse to. */
const LIBRARY_ROWS = [
  { id: 'button', name: 'Button', summary: 'Pressable action with variants and loading' },
  { id: 'card', name: 'Card', summary: 'Grouped content surface' },
  { id: 'dialog', name: 'Dialog', summary: 'Modal dialog with a backdrop' },
  { id: 'drawer', name: 'Drawer', summary: 'A panel in from the edge of the screen' },
  { id: 'field', name: 'Field', summary: 'Layout and validation state for a control' },
  { id: 'input', name: 'Input', summary: 'Text field with label and error' },
  { id: 'item', name: 'Item', summary: 'Row of media, text and actions' },
  { id: 'menu', name: 'Menu', summary: 'The list of things you can do' },
  { id: 'popover', name: 'Popover', summary: 'Panel anchored to what opened it' },
  { id: 'select', name: 'Select', summary: 'Picker shown in a bottom sheet' },
  { id: 'slider', name: 'Slider', summary: 'Pick a value by dragging a thumb' },
  { id: 'switch', name: 'Switch', summary: 'Animated on/off toggle' },
  { id: 'table', name: 'Table', summary: 'Rows and columns that stay lined up' },
  { id: 'tabs', name: 'Tabs', summary: 'Segmented navigation with an indicator' },
  { id: 'toast', name: 'Toast', summary: 'Transient notification queue' },
  { id: 'tooltip', name: 'Tooltip', summary: 'A label for the control under your finger' },
];

/** A landscape, so the cover version has something worth stretching. */
const SCROLL_HEADER_COVER =
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1200&q=70';

function LibraryRows() {
  return (
    <View className="gap-2 px-4 pb-10 pt-4">
      {LIBRARY_ROWS.map((row) => (
        <Item key={row.id} variant="outline">
          <Item.Content>
            <Item.Title>{row.name}</Item.Title>
            <Item.Description>{row.summary}</Item.Description>
          </Item.Content>
          <ChevronRightIcon size={16} />
        </Item>
      ))}
    </View>
  );
}

/** The plain arrangement, and the one most screens want. */
function ScrollHeaderPlainVersion() {
  return (
    <ScrollHeader className="flex-1 bg-background">
      <ScrollHeader.Bar>
        <ScrollHeader.Title>Library</ScrollHeader.Title>
        <ScrollHeader.Actions>
          <Button variant="ghost" size="icon" accessibilityLabel="Search">
            <SearchIcon size={18} />
          </Button>
        </ScrollHeader.Actions>
      </ScrollHeader.Bar>

      <ScrollHeader.Large>
        <ScrollHeader.Title>Library</ScrollHeader.Title>
        <ScrollHeader.Description>{LIBRARY_ROWS.length} components</ScrollHeader.Description>
      </ScrollHeader.Large>

      <ScrollView showsVerticalScrollIndicator={false}>
        <LibraryRows />
      </ScrollView>
    </ScrollHeader>
  );
}

/** A picture in the band: pulling down stretches it rather than opening a gap. */
function ScrollHeaderCoverVersion() {
  return (
    <ScrollHeader className="flex-1 bg-background">
      <ScrollHeader.Cover source={{ uri: SCROLL_HEADER_COVER }} />

      <ScrollHeader.Bar surface="none" divider={false}>
        <ScrollHeader.Title className="text-white">Sierra Nevada</ScrollHeader.Title>
        <ScrollHeader.Actions>
          <CircleButton onPress={() => {}} label="Share">
            <ShareNodesIcon size={18} />
          </CircleButton>
        </ScrollHeader.Actions>
      </ScrollHeader.Bar>

      <ScrollHeader.Large className="pb-5">
        <ScrollHeader.Title className="text-white">Sierra Nevada</ScrollHeader.Title>
        <ScrollHeader.Description className="text-white/80">
          14 photographs · September
        </ScrollHeader.Description>
      </ScrollHeader.Large>

      <ScrollView showsVerticalScrollIndicator={false}>
        <LibraryRows />
      </ScrollView>
    </ScrollHeader>
  );
}

/** A block with a field in it, and a crossing that finishes before it empties. */
function ScrollHeaderSearchVersion() {
  const [query, setQuery] = useState('');
  const rows = LIBRARY_ROWS.filter((row) =>
    row.name.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <ScrollHeader className="flex-1 bg-background" threshold={0.6}>
      <ScrollHeader.Bar>
        <ScrollHeader.Title>Inbox</ScrollHeader.Title>
      </ScrollHeader.Bar>

      <ScrollHeader.Large className="pb-4">
        <ScrollHeader.Title>Inbox</ScrollHeader.Title>
        <ScrollHeader.Description>{rows.length} of {LIBRARY_ROWS.length}</ScrollHeader.Description>
        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder="Search components"
          className="mt-2"
        />
      </ScrollHeader.Large>

      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View className="gap-2 px-4 pb-10 pt-4">
          {rows.map((row) => (
            <Item key={row.id} variant="outline">
              <Item.Content>
                <Item.Title>{row.name}</Item.Title>
                <Item.Description>{row.summary}</Item.Description>
              </Item.Content>
            </Item>
          ))}
        </View>
      </ScrollView>
    </ScrollHeader>
  );
}

/** The crossing, used for something: a reading that only belongs on the bar. */
function ScrollHeaderCrossingVersion() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <ScrollHeader
      className="flex-1 bg-background"
      onCollapsedChange={setCollapsed}
    >
      <ScrollHeader.Bar>
        <ScrollHeader.Title>Portfolio</ScrollHeader.Title>
        <ScrollHeader.Actions>
          {collapsed ? <Badge variant="success">+2.4%</Badge> : null}
        </ScrollHeader.Actions>
      </ScrollHeader.Bar>

      <ScrollHeader.Large>
        <ScrollHeader.Title>Portfolio</ScrollHeader.Title>
        <ScrollHeader.Description>$48,210.55 · +2.4% today</ScrollHeader.Description>
      </ScrollHeader.Large>

      <ScrollView showsVerticalScrollIndicator={false}>
        <LibraryRows />
      </ScrollView>
    </ScrollHeader>
  );
}

/** No large block, so the bar's surface arrives on the first point of scroll. */
function ScrollHeaderBarOnlyVersion() {
  return (
    <ScrollHeader className="flex-1 bg-background">
      <ScrollHeader.Bar>
        <ScrollHeader.Title>Settings</ScrollHeader.Title>
        <ScrollHeader.Actions>
          <Button variant="ghost" size="icon" accessibilityLabel="More">
            <EllipsisIcon size={18} />
          </Button>
        </ScrollHeader.Actions>
      </ScrollHeader.Bar>

      <ScrollView showsVerticalScrollIndicator={false}>
        <LibraryRows />
      </ScrollView>
    </ScrollHeader>
  );
}

export const ENTRIES: ComponentEntry[] = [
{
    slug: 'section-progress',
    name: 'SectionProgress',
    summary: 'Floating pill with a scroll ring and the section being read',
    demos: [
      {
        label: 'Bottom centre',
        id: 'bottom-center',
        fullPage: true,
        fullBleed: true,
        description:
          'The default. Nothing on the first screen; scroll and it arrives, then stays. Press it for the list.',
        render: () => <SectionProgressVersion />,
      },
      {
        label: 'A colour per section',
        id: 'tinted',
        fullPage: true,
        fullBleed: true,
        description:
          'Each section brings its own colour to the ring, the label and the wash across the pill. Haptics on.',
        render: () => <SectionProgressVersion tinted haptics />,
      },
      {
        label: 'Anchored to the top',
        id: 'top-center',
        fullPage: true,
        fullBleed: true,
        description:
          'The same pill centred on the top edge, where it reads as a header rather than as something over the end of the page. The list opens downward out of it.',
        render: () => <SectionProgressVersion placement="top-center" />,
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
            <Typography.Paragraph type="lead">
              A lead paragraph: the sentence under a heading, set larger and
              quieter than the body it introduces.
            </Typography.Paragraph>
            <Typography.Paragraph>
              This is a default body paragraph. It uses the base font size and
              normal weight for comfortable reading.
            </Typography.Paragraph>
            <Typography.Paragraph type="body-sm" muted>
              A smaller paragraph, useful for captions, footnotes, or secondary
              descriptions.
            </Typography.Paragraph>
            <Typography.Paragraph type="small">
              Small: tight, medium weight, for meta lines.
            </Typography.Paragraph>
          </View>
        ),
      },
      {
        label: 'Marks',
        render: () => (
          <View className="w-full gap-3">
            <Typography underline>Terms of service</Typography>
            <Typography italic>An aside, in passing.</Typography>
            <Typography strike muted>
              £24.00
            </Typography>
            <Typography weight="bold">Bolded body, without a heading.</Typography>
            {/* Marks stack: each one is a prop, so a screen never has to know
                which utilities add up to "a struck-through italic". */}
            <Typography italic strike muted>
              Withdrawn
            </Typography>
          </View>
        ),
      },
      {
        label: 'Alignment and case',
        render: () => (
          <View className="w-full gap-3">
            <Typography align="left">Left</Typography>
            <Typography align="center">Centre</Typography>
            <Typography align="right">Right</Typography>
            <Typography type="body-xs" transform="uppercase" muted>
              Section label
            </Typography>
            <Typography transform="capitalize">a capitalised sentence</Typography>
          </View>
        ),
      },
      {
        label: 'Quotes and lists',
        render: () => (
          <View className="w-full gap-5">
            <Typography.Blockquote>
              A component library is a set of decisions you only have to make
              once.
            </Typography.Blockquote>

            <Typography.List>
              <Typography.ListItem>Runs in Expo Go</Typography.ListItem>
              <Typography.ListItem>Animates on the UI thread</Typography.ListItem>
              <Typography.ListItem>
                Wraps to as many lines as it needs, with the marker staying put
              </Typography.ListItem>
            </Typography.List>

            <Typography.List ordered>
              <Typography.ListItem>Install the package</Typography.ListItem>
              <Typography.ListItem>Import the stylesheet</Typography.ListItem>
              <Typography.ListItem>Wrap the app in the provider</Typography.ListItem>
            </Typography.List>
          </View>
        ),
      },
    ],
  },
{
    slug: 'panelside',
    name: 'Panelside',
    summary: 'Navigation panel that pushes and curves the app screen',
    // Every one of these is the whole screen. Panelside wraps the app content
    // in order to push it, so there is no version of it that fits in a section
    // between two dividers.
    demos: [
      {
        label: 'Assistant',
        id: 'assistant',
        fullPage: true,
        fullBleed: true,
        description: 'Swipe from the left edge — the screen slides, shrinks and rounds.',
        render: () => <PanelsideAssistantBlock />,
      },
      {
        label: 'Open a conversation',
        id: 'navigate',
        fullPage: true,
        fullBleed: true,
        description: 'Press a chat and the screen becomes it, with the panel closing itself.',
        render: () => <PanelsideNavigateBlock />,
      },
      {
        label: 'Row actions',
        id: 'actions',
        fullPage: true,
        fullBleed: true,
        description:
          'Every conversation carries a “…”: rename it, star it, share it or delete it without leaving the panel.',
        render: () => <PanelsideActionsBlock />,
      },
      {
        label: 'Overlay',
        id: 'overlay',
        fullPage: true,
        fullBleed: true,
        description: 'The same panel sliding over a screen that stays where it is.',
        render: () => <PanelsideOverlayBlock />,
      },
      {
        label: 'Docked',
        id: 'docked',
        fullPage: true,
        fullBleed: true,
        description: 'Past a width you pick, the panel is a column and the trigger goes.',
        render: () => <PanelsideDockedBlock />,
      },
      {
        label: 'Deeper curve',
        id: 'curve',
        fullPage: true,
        fullBleed: true,
        description: 'Scale, radius and dim turned well up — the three numbers are yours.',
        render: () => <PanelsideCurveBlock />,
      },
      {
        label: 'Full chat',
        id: 'chat',
        fullPage: true,
        fullBleed: true,
        description: 'A streaming transcript underneath, anchored and scrolling on its own.',
        render: () => <PanelsideChatBlock />,
      },
      {
        label: 'Native chat',
        id: 'native',
        fullPage: true,
        fullBleed: true,
        description: 'Platform picker, sheet and buttons inside the panel — needs @expo/ui.',
        render: () => <PanelsideNativeBlock />,
      },
    ],
  },
{
    slug: 'tour',
    name: 'Tour',
    summary: 'A walkthrough that introduces a screen one control at a time',
    demos: [
      { label: 'A walkthrough', render: () => <TourDemo /> },
      { label: 'Round targets', render: () => <TourCircleDemo /> },
      { label: 'Try it yourself', render: () => <TourInteractiveDemo /> },
      {
        label: 'Across a scroll',
        id: 'scrolling',
        fullPage: true,
        description:
          'A screen taller than the screen: each step scrolls its target back into view first.',
        render: () => <TourScrollingDemo />,
      },
    ],
  },
{
    slug: 'waterfall-chart',
    name: 'WaterfallChart',
    summary: 'How a run of changes carried one total to another',
    layout: 'pager',
    demos: [
      {
        label: 'Basic',
        id: 'basic',
        fullPage: true,
        description: 'Two totals on the baseline, four changes floating between them.',
        render: () => <WaterfallBasicVersion />,
      },
      {
        label: 'Values',
        id: 'values',
        fullPage: true,
        description: 'Every change written at the end of its bar, signed, over a value axis.',
        render: () => <WaterfallValuesVersion />,
      },
      {
        label: 'Sideways',
        id: 'sideways',
        fullPage: true,
        description: 'Seven steps down the side, because seven names do not fit across a phone.',
        render: () => <WaterfallSidewaysVersion />,
      },
      {
        label: 'Reading a step',
        id: 'readout',
        fullPage: true,
        description: 'The header follows the finger — the step held, or the closing balance.',
        render: () => <WaterfallReadoutVersion />,
      },
      {
        label: 'Loading',
        id: 'loading',
        fullPage: true,
        description: 'Equal stubs on the baseline, because invented balances cannot be unseen.',
        render: () => <WaterfallLoadingVersion />,
      },
    ],
  },
{
    slug: 'splitter',
    name: 'Splitter',
    summary: 'Panes sharing a container, with a seam you can drag',
    demos: [
      {
        label: 'Two panes',
        render: () => (
          <View className="w-full">
            <Splitter
              className="h-56 overflow-hidden rounded-2xl border border-border"
              defaultLayout={[60, 40]}
            >
              <Splitter.Panel minSize={25} className="bg-surface-secondary">
                <Pane title="Inbox" body="12 conversations" />
              </Splitter.Panel>
              <Splitter.Handle />
              <Splitter.Panel minSize={25}>
                <Pane title="Thread" body="Pick a conversation to read it." />
              </Splitter.Panel>
            </Splitter>
          </View>
        ),
      },
      { label: 'A pane that can be shut', render: () => <SplitterCollapsibleDemo /> },
      {
        label: 'Stacked panes',
        render: () => (
          <Splitter
            orientation="vertical"
            className="h-72 overflow-hidden rounded-2xl border border-border"
            defaultLayout={[45, 55]}
          >
            <Splitter.Panel minSize={20}>
              <Pane title="Preview" body="What the reader will see." />
            </Splitter.Panel>
            <Splitter.Handle />
            <Splitter.Panel minSize={20} className="bg-surface-secondary">
              <Pane title="Source" body="What you are writing." />
            </Splitter.Panel>
          </Splitter>
        ),
      },
      {
        label: 'Three panes',
        render: () => (
          <View className="w-full">
            <Splitter
              className="h-56 overflow-hidden rounded-2xl border border-border"
              defaultLayout={[25, 50, 25]}
            >
              <Splitter.Panel minSize={15} className="bg-surface-secondary">
                <Pane title="Files" body="8" />
              </Splitter.Panel>
              <Splitter.Handle />
              <Splitter.Panel minSize={30}>
                <Pane title="Editor" body="index.tsx" />
              </Splitter.Panel>
              <Splitter.Handle />
              <Splitter.Panel minSize={15} className="bg-surface-secondary">
                <Pane title="Outline" body="4 symbols" />
              </Splitter.Panel>
            </Splitter>
          </View>
        ),
      },
      { label: 'Keeping the layout', render: () => <SplitterControlledDemo /> },
      {
        label: 'Frozen',
        render: () => (
          <View className="w-full">
            <Splitter
              disabled
              className="h-40 overflow-hidden rounded-2xl border border-border"
              defaultLayout={[70, 30]}
            >
              <Splitter.Panel>
                <Pane title="Fixed" body="The seam is frozen." />
              </Splitter.Panel>
              <Splitter.Handle />
              <Splitter.Panel className="bg-surface-secondary">
                <Pane title="Also fixed" body="" />
              </Splitter.Panel>
            </Splitter>
          </View>
        ),
      },
    ],
  },
{
    slug: 'split-view',
    name: 'SplitView',
    summary: 'Two resizable stacked panes that settle on a named height',
    demos: [
      {
        label: 'A pane at three heights',
        render: () => (
          <View className="w-full">
            <SplitView className="h-96">
              <SplitView.Top>
                <Half title="Map" body="Drag the handle down for more of it." />
              </SplitView.Top>
              <SplitView.DragArea>
                <SplitView.Handle />
              </SplitView.DragArea>
              <SplitView.Bottom>
                <Half title="Results" body="8 places nearby." />
              </SplitView.Bottom>
            </SplitView>
          </View>
        ),
      },
      {
        label: 'Naming the heights',
        render: () => (
          <View className="w-full">
            <SplitView
              className="h-96"
              snapPoints={[0.3, 0.75]}
              minHeight={96}
              defaultSnapIndex={0}
            >
              <SplitView.Top>
                <Half title="Preview" body="Two heights, and a floor of 96 points." />
              </SplitView.Top>
              <SplitView.DragArea>
                <SplitView.Handle />
              </SplitView.DragArea>
              <SplitView.Bottom>
                <Half title="Editor" body="index.tsx" />
              </SplitView.Bottom>
            </SplitView>
          </View>
        ),
      },
      {
        label: 'Content that scrolls inside a pane',
        render: () => (
          <View className="w-full">
            <SplitView
              className="h-96"
              snapPoints={[0.35, 0.8]}
            >
              <SplitView.Top>
                <ScrollView contentContainerClassName="gap-2 p-4">
                  {NOTES.map((note) => (
                    <Text key={note} size="sm">
                      {note}
                    </Text>
                  ))}
                </ScrollView>
              </SplitView.Top>
              <SplitView.DragArea>
                <SplitView.Handle />
              </SplitView.DragArea>
              <SplitView.Bottom>
                <Half title="Detail" body="Takes whatever the list gave up." />
              </SplitView.Bottom>
            </SplitView>
          </View>
        ),
      },
      {
        label: 'A seam instead of two surfaces',
        render: () => (
          <View className="w-full">
            {/* Inside something that already has a surface, a second pair of
                them is a box in a box. `seam` drops the surfaces and the gap
                and leaves the grip. */}
            <Card>
              <Card.Content className="p-0">
                <SplitView variant="seam" className="h-72" snapPoints={[0.4, 0.7]}>
                  <SplitView.Top>
                    <Half title="Chart" body="No surface of its own." />
                  </SplitView.Top>
                  <SplitView.DragArea>
                    <SplitView.Handle />
                  </SplitView.DragArea>
                  <SplitView.Bottom>
                    <Half title="Legend" body="The card is the surface." />
                  </SplitView.Bottom>
                </SplitView>
              </Card.Content>
            </Card>
          </View>
        ),
      },
      { label: 'Driving it from outside', render: () => <SplitViewControlledDemo /> },
      {
        label: 'A seam that does not move',
        render: () => (
          <View className="w-full">
            <SplitView
              className="h-72"
              snapPoints={[0.5]}
              disabled
            >
              <SplitView.Top>
                <Half title="Fixed" body="The seam is frozen." />
              </SplitView.Top>
              <SplitView.DragArea>
                <SplitView.Handle />
              </SplitView.DragArea>
              <SplitView.Bottom>
                <Half title="Also fixed" body="" />
              </SplitView.Bottom>
            </SplitView>
          </View>
        ),
      },
    ],
  },
  {
    slug: 'page-header',
    name: 'PageHeader',
    summary: 'Cover, face and actions at the top of a profile',
    demos: [
      {
        label: 'Profile screen',
        id: 'profile',
        fullPage: true,
        fullBleed: true,
        backSwipe: true,
        description:
          'The gradient to the screen edges, the face at the leading edge, and the account under it.',
        render: () => <PageHeaderProfileVersion />,
      },
      {
        label: 'Counts beside the face',
        id: 'stats',
        fullPage: true,
        fullBleed: true,
        backSwipe: true,
        description:
          'No banner, so the face does not lift, and the counts sit next to it instead of under the name.',
        render: () => <PageHeaderStatsVersion />,
      },
      {
        label: 'Everything centred',
        id: 'centred',
        fullPage: true,
        fullBleed: true,
        backSwipe: true,
        description:
          'The face centred over the gradient, with the counts and the actions on the same line under it.',
        render: () => <PageHeaderCenteredVersion />,
      },
      {
        label: 'A hero, and no face',
        id: 'hero',
        fullPage: true,
        fullBleed: true,
        backSwipe: true,
        description:
          'The picture is the account, so there is no avatar over it — and the counts are ruled apart.',
        render: () => <PageHeaderHeroVersion />,
      },
      {
        label: 'An organisation',
        id: 'brand',
        fullPage: true,
        fullBleed: true,
        backSwipe: true,
        description:
          'A mark rather than a face, with the square corner a logo needs, and the counts run inline.',
        render: () => <PageHeaderBrandVersion />,
      },
      {
        label: 'Profile card',
        render: () => (
          // The cover is held off the card's edges and rounded on its top
          // corners only, so its bottom edge meets the content rather than
          // floating above it. The face lifts over that edge on its own — the
          // card can see the cover among its children.
          <PageHeader className="w-full">
            <PageHeader.Cover />
            <PageHeader.Avatar source={{ uri: PROFILE_FACE }} fallback="KA" verified />
            <PageHeader.Content>
              <PageHeader.Title>Khalid Abdi</PageHeader.Title>
              <PageHeader.Description>khalid@panelui.dev</PageHeader.Description>
            </PageHeader.Content>
            <PageHeader.Actions>
              <Button variant="secondary" className="flex-1">
                Message
              </Button>
              <Button className="flex-1">Follow</Button>
            </PageHeader.Actions>
          </PageHeader>
        ),
      },
      {
        label: 'Card, face at the leading edge',
        render: () => (
          // The same card and the same cover; `align="start"` moves the face
          // and the text to the leading edge and leaves the actions full width
          // underneath.
          <PageHeader align="start" className="w-full">
            <PageHeader.Cover colors={COVER_RAMPS.leading} />
            <PageHeader.Avatar
              size="lg"
              source={{ uri: PROFILE_FACE }}
              fallback="KA"
              verified
            />
            <PageHeader.Content>
              <PageHeader.Title>Khalid Abdi</PageHeader.Title>
              <PageHeader.Description>Building in public, Nairobi</PageHeader.Description>
              <PageHeader.Stats layout="inline" divided className="pt-2">
                <PageHeader.Stat value="127" label="Components" />
                <PageHeader.Stat value="4.2K" label="Followers" />
              </PageHeader.Stats>
            </PageHeader.Content>
            <PageHeader.Actions>
              <Button className="flex-1">Follow</Button>
              <Button variant="secondary" size="icon">
                <ShareNodesIcon size={18} />
              </Button>
            </PageHeader.Actions>
          </PageHeader>
        ),
      },
    ],
  },
  {
    slug: 'scroll-header',
    name: 'ScrollHeader',
    summary: 'A screen title that hands over to a compact bar as the page scrolls',
    demos: [
      {
        label: 'Large title over a list',
        id: 'title',
        fullPage: true,
        fullBleed: true,
        backSwipe: true,
        description:
          'The title large at rest, and the same title on the pinned bar once the list is moving.',
        render: () => <ScrollHeaderPlainVersion />,
      },
      {
        label: 'A cover behind the title',
        id: 'cover',
        fullPage: true,
        fullBleed: true,
        backSwipe: true,
        description:
          'The picture fills the band, so pulling the list down stretches it instead of opening a gap.',
        render: () => <ScrollHeaderCoverVersion />,
      },
      {
        label: 'A field in the block',
        id: 'search',
        fullPage: true,
        fullBleed: true,
        backSwipe: true,
        description:
          'The block is as tall as what is in it, and `threshold` finishes the crossing before it empties.',
        render: () => <ScrollHeaderSearchVersion />,
      },
      {
        label: 'Something only the bar carries',
        id: 'crossing',
        fullPage: true,
        fullBleed: true,
        backSwipe: true,
        description:
          'The crossing is reported to React once each way, so a reading can appear with the bar.',
        render: () => <ScrollHeaderCrossingVersion />,
      },
      {
        label: 'A bar on its own',
        id: 'bar',
        fullPage: true,
        fullBleed: true,
        backSwipe: true,
        description:
          'With no block to cross, the surface and its hairline arrive on the first point of scroll.',
        render: () => <ScrollHeaderBarOnlyVersion />,
      },
    ],
  },
];
export const ENTRIES_BY_SLUG = Object.fromEntries(ENTRIES.map((entry) => [entry.slug, entry]));
