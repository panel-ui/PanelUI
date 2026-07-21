/**
 * The component catalogue — the single source of truth for the showcase.
 *
 * Both the list screen and the detail screen read from here, and the home
 * screen derives its counts from it, so adding a component means adding one
 * entry and nothing else.
 */
import { useEffect, useState, type ReactNode } from 'react';
import Animated, {
  useAnimatedKeyboard,
  useAnimatedStyle,
} from 'react-native-reanimated';
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
  Dialog,
  EmptyState,
  FacebookIcon,
  Frame,
  GoogleIcon,
  InfoIcon,
  InlineSelect,
  Input,
  InputGroup,
  Item,
  Label,
  LineChart,
  Marker,
  Message,
  MessageScroller,
  PackageIcon,
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
  ScrollFade,
  Separator,
  Shimmer,
  Skeleton,
  Spinner,
  Steps,
  Surface,
  Switch,
  Tabs,
  Text,
  Timeline,
  Toast,
  Typography,
  hasNativeUI,
  useToast,
} from 'panelui-native';

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

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'];

const VISITS = MONTHS.map((month, index) => ({
  month,
  visits: [1840, 2210, 2050, 2640, 3120, 2980, 3640, 4120, 4480][index]!,
  signups: [210, 260, 240, 330, 380, 350, 470, 520, 610][index]!,
}));

const QUIET = MONTHS.map((month, index) => ({
  month,
  visits: [2400, 2380, 2450, 2410, 2500, 2470, 2520, 2490, 2560][index]!,
  signups: [300, 295, 310, 305, 320, 315, 325, 318, 330][index]!,
}));

/**
 * The chart card: a Frame carrying the title and the readout, with the chart
 * bled to the panel's edges.
 *
 * The readout lives in the header because that is where a number is actually
 * readable — a floating label over the plot covers the line it is describing.
 * The header is outside the chart, so the active point comes up through
 * `onActiveIndexChange` rather than through a hook.
 */
function ChartCard({
  title,
  data,
  status,
  children,
  footer,
}: {
  title: string;
  data: typeof VISITS;
  status?: 'loading' | 'ready';
  children: ReactNode;
  footer?: string;
}) {
  const [active, setActive] = useState<(typeof VISITS)[number] | null>(null);

  return (
    <Frame className="w-full">
      <Frame.Header className="flex-col items-start gap-0.5">
        <Frame.Title>{title}</Frame.Title>
        <Text size="sm" muted>
          {active
            ? `${active.month} · ${active.visits.toLocaleString()} visits`
            : 'Drag across the chart'}
        </Text>
      </Frame.Header>
      <Frame.Panel className="p-0">
        <LineChart
          data={data}
          xDataKey="month"
          status={status}
          aspectRatio={1.9}
          onActiveIndexChange={(index) => setActive(index >= 0 ? (data[index] ?? null) : null)}
        >
          {children}
        </LineChart>
      </Frame.Panel>
      {footer ? <Frame.Footer>{footer}</Frame.Footer> : null}
    </Frame>
  );
}

/** Toggles the data so the y-domain tween is visible without a refresh. */
function LineChartDataDemo() {
  const [busy, setBusy] = useState(false);

  return (
    <View className="w-full gap-4">
      <ChartCard
        title="Visits"
        data={busy ? VISITS : QUIET}
        footer="Switching the data tweens the axis — the reveal does not replay."
      >
        <LineChart.Grid />
        <LineChart.Area dataKey="visits" />
        <LineChart.Line dataKey="visits" />
        <LineChart.XAxis />
        <LineChart.Tooltip />
      </ChartCard>

      <Button variant="outline" onPress={() => setBusy((current) => !current)}>
        {busy ? 'Show a flat quarter' : 'Show a growing quarter'}
      </Button>
    </View>
  );
}

/** Loading → ready, so the skeleton morphing into the series is visible. */
function LineChartLoadingDemo() {
  const [status, setStatus] = useState<'loading' | 'ready'>('loading');

  return (
    <View className="w-full gap-4">
      <ChartCard
        title="Visits"
        data={VISITS}
        status={status}
        footer="One component throughout — no spinner swapped for a chart."
      >
        <LineChart.Grid />
        <LineChart.Skeleton />
        <LineChart.Area dataKey="visits" />
        <LineChart.Line dataKey="visits" />
        <LineChart.XAxis />
        <LineChart.Tooltip />
      </ChartCard>

      <Button
        variant="outline"
        onPress={() => setStatus((current) => (current === 'loading' ? 'ready' : 'loading'))}
      >
        {status === 'loading' ? 'Resolve the data' : 'Back to loading'}
      </Button>
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
    <View className="w-full items-center py-4">
      <Popover open={open} onOpenChange={setOpen}>
        <Popover.Trigger>
          <Button variant="outline">Rename board</Button>
        </Popover.Trigger>
        {/* `width="trigger"` locks the panel to the trigger's width, so the
            two read as one control rather than as a panel over a button. */}
        <Popover.Content width="trigger" align="start" className="gap-3">
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
    <View className="w-full gap-3">
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
      {children}
    </View>
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
        <BottomSheet.Content>
          <View className="gap-3 p-5">
            <Text size="lg" weight="semibold">
              Platform chrome, your content
            </Text>
            <Text size="sm" muted>
              The container, corner radius, grabber and dismiss gesture belong
              to the platform. Everything in here is still themed.
            </Text>
            <Button onPress={() => setOpen(false)}>Close</Button>
          </View>
        </BottomSheet.Content>
      </BottomSheet>
    </NativeDemo>
  );
}

function InlineSelectDemo({
  overlay,
  overlayWidth,
}: {
  overlay?: boolean;
  overlayWidth?: 'trigger' | 'content' | number;
}) {
  const [region, setRegion] = useState<string>();

  return (
    <View className="w-full gap-1.5">
      <Label>Region</Label>
      <InlineSelect
        value={region}
        onValueChange={setRegion}
        placeholder="Select a region"
        overlay={overlay}
        overlayWidth={overlayWidth}
      >
        <InlineSelect.Item value="us" label="United States" />
        <InlineSelect.Item value="eu" label="Europe" />
        <InlineSelect.Item value="apac" label="Asia Pacific" />
      </InlineSelect>
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
      <Progress value={uploaded} />
      <Progress value={uploaded} color="success" size="sm" />
      <Progress value={70} color="warning" size="lg" />
      <Progress indeterminate color="info" />
    </View>
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
            <Button native variant="ghost" onPress={() => {}}>
              Text
            </Button>
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
    ],
  },
  {
    slug: 'frame',
    name: 'Frame',
    summary: 'Widget shell with a titled header and an inset panel',
    demos: [
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
              ].map(([label, value, pct], index) => (
                <Frame.Row key={label as string} divided={index > 0}>
                  <Meter percent={pct as number} />
                  <Text className="flex-1">{label}</Text>
                  <Text weight="medium">{value}</Text>
                </Frame.Row>
              ))}
            </Frame.Panel>
            <Frame.Footer>Updated 2 minutes ago</Frame.Footer>
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
              ].map(([initials, name, email, role], index) => (
                <Frame.Row key={email} divided={index > 0}>
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
            <Frame.Footer>3 members with access</Frame.Footer>
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
              ].map(([label, value], index) => (
                <Frame.Row key={label} divided={index > 0}>
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
    ],
  },
  {
    slug: 'inline-select',
    name: 'InlineSelect',
    summary: 'Picker that expands in place',
    demos: [
      { label: 'Inline (default)', render: () => <InlineSelectDemo /> },
      {
        label: 'Overlay — nothing below moves',
        render: () => (
          <View className="w-full gap-4">
            <InlineSelectDemo overlay />
            <Text size="sm" muted>
              This paragraph stays exactly where it is when the list above
              opens. Without `overlay` it would be pushed down by the height of
              the list.
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
            <InlineSelectDemo overlay overlayWidth="content" />
            <InlineSelectDemo overlay overlayWidth={220} />
          </View>
        ),
      },
      {
        label: 'In a form',
        render: () => (
          <Card className="w-full">
            <Card.Content className="gap-4 p-4">
              <Input label="Company" placeholder="Acme Inc." />
              <InlineSelectDemo overlay />
            </Card.Content>
          </Card>
        ),
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
        label: 'In a form',
        render: () => (
          <Card className="w-full">
            <Card.Header>
              <Card.Title>Sign in</Card.Title>
              <Card.Description>Welcome back.</Card.Description>
            </Card.Header>
            <Card.Content className="gap-4">
              <Input label="Email" placeholder="you@example.com" />
              <Input label="Password" secureTextEntry placeholder="••••••••" />
            </Card.Content>
            <Card.Footer>
              <Button fullWidth>Continue</Button>
            </Card.Footer>
          </Card>
        ),
      },
      {
        label: 'Avoiding the keyboard',
        render: () => (
          <View className="w-full gap-4">
            <Text size="sm" muted>
              Focus the field below. It sits low enough that the keyboard would
              cover it, so it lifts by exactly the overlap — no more.
            </Text>
            <View className="h-72 justify-end">
              <Input
                avoidKeyboard
                label="Comment"
                placeholder="Say something…"
                description="Lifts on focus, settles back on blur."
              />
            </View>
            <Text size="sm" muted>
              This one is already clear of the keyboard, so it never moves.
            </Text>
            <Input avoidKeyboard label="Subject" placeholder="Stays put" />
          </View>
        ),
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
        label: 'A chart card',
        render: () => (
          <ChartCard title="Visits" data={VISITS} footer="Last nine months">
            <LineChart.Grid />
            <LineChart.Area dataKey="visits" />
            <LineChart.Line dataKey="visits" showMarkers />
            <LineChart.XAxis />
            <LineChart.Tooltip />
          </ChartCard>
        ),
      },
      {
        label: 'Two series',
        render: () => (
          <ChartCard title="Visits and signups" data={VISITS}>
            <LineChart.Grid />
            <LineChart.Area dataKey="visits" />
            <LineChart.Line dataKey="visits" />
            {/* The second series takes the next token and a dash, so the two
                are told apart by shape as well as by colour. */}
            <LineChart.Line dataKey="signups" colorIndex={2} dashArray="6,4" />
            <LineChart.XAxis />
            <LineChart.Legend labels={{ visits: 'Visits', signups: 'Signups' }} />
            <LineChart.Tooltip />
          </ChartCard>
        ),
      },
      {
        label: 'Changing data',
        render: () => <LineChartDataDemo />,
      },
      {
        label: 'Loading',
        render: () => <LineChartLoadingDemo />,
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
    slug: 'select',
    name: 'Select',
    summary: 'Picker that opens in a bottom sheet',
    demos: [
      { label: 'Basic', render: () => <SelectDemo /> },
      {
        label: 'In a form',
        render: () => (
          <Card className="w-full">
            <Card.Content className="gap-4 p-4">
              <Input label="Full name" placeholder="Khalid Abdi" />
              <SelectDemo />
            </Card.Content>
          </Card>
        ),
      },
      { label: 'Native', render: () => <NativeSelectDemo /> },
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
