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
import { Image, ScrollView, useWindowDimensions, View } from 'react-native';
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
  InlineSelect,
  Input,
  InputGroup,
  Label,
  PlusSquareIcon,
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

function InlineSelectDemo() {
  const [region, setRegion] = useState<string>();

  return (
    <View className="w-full gap-1.5">
      <Label>Region</Label>
      <InlineSelect
        value={region}
        onValueChange={setRegion}
        placeholder="Select a region"
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
      { label: 'Basic', render: () => <InlineSelectDemo /> },
      {
        label: 'In a form',
        render: () => (
          <Card className="w-full">
            <Card.Content className="gap-4 p-4">
              <Input label="Company" placeholder="Acme Inc." />
              <InlineSelectDemo />
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
        label: 'Loading text',
        render: () => (
          <View className="w-full gap-4">
            <Shimmer>
              <Text muted>Generating response…</Text>
            </Shimmer>
            <Shimmer duration={1200} intensity={0.6}>
              <Text size="lg" weight="medium">
                Thinking…
              </Text>
            </Shimmer>
          </View>
        ),
      },
      {
        label: 'Over a skeleton',
        render: () => (
          <Shimmer className="w-full rounded-xl">
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
        label: 'Horizontal list',
        render: () => (
          <ScrollFade size={40} className="w-full">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="gap-2"
            >
              {[
                'Overlays', 'Forms', 'Feedback', 'Layout', 'Navigation',
                'Typography', 'Data', 'Media', 'Motion', 'Theming',
              ].map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </ScrollView>
          </ScrollFade>
        ),
      },
      {
        label: 'Vertical list',
        render: () => (
          // Orientation is read from the child: no `horizontal` prop, so the
          // fades land on the top and bottom edges instead.
          <ScrollFade size={44} className="h-56 w-full">
            <ScrollView showsVerticalScrollIndicator={false}>
              <View className="gap-3 py-2">
                {[
                  ['Deployed to production', '2 minutes ago'],
                  ['Migration applied', '18 minutes ago'],
                  ['Build passed', '24 minutes ago'],
                  ['Pull request merged', '1 hour ago'],
                  ['Review requested', '2 hours ago'],
                  ['Branch pushed', '3 hours ago'],
                  ['Issue closed', '5 hours ago'],
                  ['Release tagged', 'Yesterday'],
                ].map(([title, when]) => (
                  <View key={title} className="gap-0.5">
                    <Text size="sm" weight="medium">
                      {title}
                    </Text>
                    <Text size="xs" muted>
                      {when}
                    </Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </ScrollFade>
        ),
      },
      {
        label: 'One edge',
        render: () => (
          <ScrollFade size={56} edges="end" className="w-full">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="gap-2"
            >
              {['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven'].map((n) => (
                <Badge key={n}>{n}</Badge>
              ))}
            </ScrollView>
          </ScrollFade>
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
