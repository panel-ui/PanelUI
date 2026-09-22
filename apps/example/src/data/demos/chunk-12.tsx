import { useEffect, useMemo, useState, type ReactNode } from "react";
import { FlatList, ScrollView, View } from "react-native";
import { Alert, Avatar, BumpChart, type BumpChartDatum, MirrorAreaChart, type MirrorAreaChartDatum, Badge, BookmarkIcon, BellIcon, Button, CalendarIcon, Card, CheckIcon, Direction, FileIcon, Frame, Input, Item, MessageCircleIcon, PackageIcon, Pagination, ScrollFade, Separator, Slider, Spinner, Steps, Swipe, Switch, Table, Tabs, Text, ToggleButton, ToggleButtonGroup, TrashIcon, Typography, hasNativeUI } from "panelui-native";
import type { ComponentEntry } from '../component-types';

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

function HapticSwitchDemo() {
  const [wifi, setWifi] = useState(true);
  const [bluetooth, setBluetooth] = useState(false);

  return (
    <Card className="w-full">
      <Card.Content className="gap-5 p-4">
        <Text size="sm" muted>
          Each flip fires a light tick — install expo-haptics to feel it on a device.
        </Text>
        <View className="flex-row items-center justify-between gap-4">
          <Text weight="medium">Wi-Fi</Text>
          <Switch haptics value={wifi} onValueChange={setWifi} />
        </View>
        <View className="flex-row items-center justify-between gap-4">
          <Text weight="medium">Bluetooth</Text>
          <Switch haptics value={bluetooth} onValueChange={setBluetooth} />
        </View>
      </Card.Content>
    </Card>
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

function RangeSliderDemo() {
  const [price, setPrice] = useState<[number, number]>([220, 680]);

  return (
    <View className="w-full gap-6">
      {/* Controlled through `range` + `onRangeChange`. The single-value props
          are untouched, so nothing here has to narrow a union to read a
          number. */}
      <Slider
        label="Price"
        showValue
        formatValue={(v) => `$${Math.round(v)}`}
        range={price}
        onRangeChange={setPrice}
        min={0}
        max={1000}
        step={20}
        color="success"
      />
      {/* `minStepsBetweenThumbs` keeps a gap the span can never close, which is
          what a filter wants: an empty range matches nothing and looks like a
          bug rather than a choice. */}
      <Slider
        label="Nights"
        showValue
        defaultRange={[2, 6]}
        min={1}
        max={14}
        step={1}
        minStepsBetweenThumbs={1}
      />
      <Slider label="Locked" showValue defaultRange={[30, 60]} disabled />
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

function SwipeableTabsDemo() {
  const days = [
    { value: 'mon', label: 'Mon', body: 'Two runs and a swim. 14km total.' },
    { value: 'tue', label: 'Tue', body: 'Rest day. Nothing logged.' },
    { value: 'wed', label: 'Wed', body: 'One long ride, 62km, out to the coast.' },
    { value: 'thu', label: 'Thu', body: 'Intervals — 8 × 400m on the track.' },
  ];

  return (
    // Drag sideways on a card to move to the next day. The indicator follows,
    // and the row scrolls the tab into view when it lands off the end.
    <Tabs swipeable defaultValue="mon" className="w-full">
      <Tabs.List scrollable>
        {days.map((day) => (
          <Tabs.Trigger key={day.value} value={day.value}>
            {day.label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
      {days.map((day) => (
        <Tabs.Content key={day.value} value={day.value}>
          <Card>
            <Card.Content className="gap-2 p-4">
              <Text weight="medium">{day.label}</Text>
              <Text size="sm" muted>
                {day.body}
              </Text>
              <Text size="xs" muted className="mt-2">
                Swipe left or right on this card.
              </Text>
            </Card.Content>
          </Card>
        </Tabs.Content>
      ))}
    </Tabs>
  );
}

/** Rows for the kept-panel demo. Long enough that building them is visible. */
const KEPT_PANEL_ROWS = Array.from({ length: 400 }, (_, index) => ({
  id: String(index),
  title: `Rule ${index + 1}`,
  detail: `${['Allow', 'Deny', 'Redirect'][index % 3]} · priority ${index + 1}`,
}));

/**
 * The two settings of `keepMounted` that differ, side by side.
 *
 * `true` hides an inactive panel with `display: none`, which lays it out at zero
 * size — so a virtualised list inside one renders no rows, and its whole first
 * render lands on the frame the tab is switched to. `'measured'` keeps the panel
 * at full size while hidden, so the list is already built by then.
 *
 * The lists here are deliberately long: the difference is a stall on switching,
 * and a panel of four cards is built too fast to feel either way.
 */
function KeptPanelTabsDemo() {
  const [measured, setMeasured] = useState(true);
  const panels = ['users', 'domains', 'routing'];

  return (
    <View className="flex-1 gap-3 px-4 pt-3">
      <ToggleButtonGroup
        value={measured ? ['measured'] : []}
        onValueChange={(value) => setMeasured(value.includes('measured'))}
        size="sm"
      >
        <ToggleButton id="measured">keepMounted=&quot;measured&quot;</ToggleButton>
      </ToggleButtonGroup>

      <Text size="xs" muted>
        {measured
          ? 'Panels stay laid out while hidden — each list is already built, so switching is immediate.'
          : 'Panels are hidden with display: none — each list builds on the frame you switch to it.'}
      </Text>

      {/*
        Remounted when the setting changes, so a panel built under one setting
        is never measured under the other — otherwise the lists left over from
        `measured` would make `true` look just as fast.
      */}
      <Tabs
        key={measured ? 'measured' : 'true'}
        defaultValue="users"
        keepMounted={measured ? 'measured' : true}
        swipeable
        className="flex-1"
      >
        <Tabs.List>
          {panels.map((panel) => (
            <Tabs.Trigger key={panel} value={panel} className="capitalize">
              {panel}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        {panels.map((panel) => (
          <Tabs.Content key={panel} value={panel} className="flex-1">
            <FlatList
              data={KEPT_PANEL_ROWS}
              keyExtractor={(row) => `${panel}-${row.id}`}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <Item>
                  <Item.Content>
                    <Item.Title>{item.title}</Item.Title>
                    <Item.Description>{item.detail}</Item.Description>
                  </Item.Content>
                </Item>
              )}
            />
          </Tabs.Content>
        ))}
      </Tabs>
    </View>
  );
}

/** The four destinations of the expanding row, and what each one shows. */
const EXPANDING_TABS = [
  {
    value: 'home',
    label: 'Home',
    icon: <PackageIcon size={18} />,
    body: 'Everything that changed since you were last here.',
  },
  {
    value: 'chats',
    label: 'Chats',
    icon: <MessageCircleIcon size={18} />,
    body: 'Four threads, two of them waiting on you.',
  },
  {
    value: 'calendar',
    label: 'Calendar',
    icon: <CalendarIcon size={18} />,
    body: 'Nothing until Thursday, and then rather a lot.',
  },
  {
    value: 'inbox',
    label: 'Inbox',
    icon: <BellIcon size={18} />,
    body: 'Three notifications, none of them urgent.',
  },
];

/**
 * Icon-only until you pick one.
 *
 * Four labels written out take the whole row to say four words nobody rereads
 * after the first time. Closed, they take an icon each; open, the one you are
 * looking at says what it is.
 */
function ExpandingTabsDemo() {
  return (
    // `swipeable` as well, so the panel under the row arrives the way it does
    // when it is dragged: pressing a pill throws the incoming panel in from the
    // side it belongs on rather than cross-fading it in place.
    <Tabs swipeable variant="expanding" defaultValue="chats" className="w-full">
      <Tabs.List className="justify-center">
        {EXPANDING_TABS.map((tab) => (
          <Tabs.Trigger key={tab.value} value={tab.value} icon={tab.icon}>
            {tab.label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
      {EXPANDING_TABS.map((tab) => (
        <Tabs.Content key={tab.value} value={tab.value}>
          <Card>
            <Card.Content className="gap-2 p-4">
              <Text weight="medium">{tab.label}</Text>
              <Text size="sm" muted>
                {tab.body}
              </Text>
            </Card.Content>
          </Card>
        </Tabs.Content>
      ))}
    </Tabs>
  );
}

const INVOICES = [
  { id: 'INV-001', status: 'Paid', method: 'Card', amount: 250 },
  { id: 'INV-002', status: 'Pending', method: 'Transfer', amount: 150 },
  { id: 'INV-003', status: 'Unpaid', method: 'Card', amount: 350 },
  { id: 'INV-004', status: 'Paid', method: 'Card', amount: 450 },
  { id: 'INV-005', status: 'Paid', method: 'Transfer', amount: 550 },
];

const invoiceAmount = (value: number) => `$${value.toFixed(2)}`;

/**
 * The same three columns as the basic demo, sized once at the top instead of on
 * all eighteen heads and cells. Module scope, not inline: a fresh array every
 * frame renumbers every cell in the table.
 */
const INVOICE_COLUMNS = [{ flex: 2 }, {}, { align: 'end' as const }];

/** One column model on the root; the rows below are just their contents. */
function ColumnsTableDemo() {
  return (
    <Table variant="outline" columns={INVOICE_COLUMNS} className="w-full">
      <Table.Header>
        <Table.Row>
          <Table.Head>Invoice</Table.Head>
          <Table.Head>Method</Table.Head>
          <Table.Head>Amount</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {INVOICES.map((invoice) => (
          <Table.Row key={invoice.id}>
            <Table.Cell>{invoice.id}</Table.Cell>
            <Table.Cell>{invoice.method}</Table.Cell>
            <Table.Cell>{invoiceAmount(invoice.amount)}</Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );
}

/**
 * A table that pages. The component reports the page; slicing the rows stays
 * here, which is the whole division of labour it is built around.
 */
function PaginatedTableDemo() {
  const [page, setPage] = useState(1);
  const pageSize = 2;
  const rows = INVOICES.slice((page - 1) * pageSize, page * pageSize);

  return (
    <View className="w-full gap-3">
      <Table variant="outline" columns={INVOICE_COLUMNS} className="w-full">
        <Table.Header>
          <Table.Row>
            <Table.Head>Invoice</Table.Head>
            <Table.Head>Method</Table.Head>
            <Table.Head>Amount</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {rows.map((invoice) => (
            <Table.Row key={invoice.id}>
              <Table.Cell>{invoice.id}</Table.Cell>
              <Table.Cell>{invoice.method}</Table.Cell>
              <Table.Cell>{invoiceAmount(invoice.amount)}</Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>

      <Pagination
        count={Math.ceil(INVOICES.length / pageSize)}
        page={page}
        onPageChange={setPage}
        variant="compact"
        size="sm"
      >
        <Pagination.Status pageSize={pageSize} total={INVOICES.length} />
      </Pagination>
    </View>
  );
}

/** Every presentation driven from one page number, so the three stay in step. */
function PaginationDemo({
  count = 12,
  ...props
}: Partial<React.ComponentProps<typeof Pagination>>) {
  const [page, setPage] = useState(1);

  return <Pagination count={count} page={page} onPageChange={setPage} {...props} />;
}

function TableDemo({
  variant,
  striped,
  caption,
}: {
  variant?: 'default' | 'outline';
  striped?: boolean;
  caption?: string;
}) {
  return (
    <Table variant={variant} striped={striped} className="w-full">
      <Table.Header>
        <Table.Row>
          <Table.Head flex={2}>Invoice</Table.Head>
          <Table.Head>Method</Table.Head>
          <Table.Head align="end">Amount</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {INVOICES.map((invoice) => (
          <Table.Row key={invoice.id}>
            <Table.Cell flex={2}>{invoice.id}</Table.Cell>
            <Table.Cell>{invoice.method}</Table.Cell>
            <Table.Cell align="end">{invoiceAmount(invoice.amount)}</Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
      <Table.Footer>
        <Table.Row>
          <Table.Cell flex={2} labelClassName="font-medium">
            Total
          </Table.Cell>
          <Table.Cell />
          <Table.Cell align="end" labelClassName="font-medium">
            {invoiceAmount(INVOICES.reduce((sum, i) => sum + i.amount, 0))}
          </Table.Cell>
        </Table.Row>
      </Table.Footer>
      {caption ? (
        <Table.Caption className="px-4 py-3">{caption}</Table.Caption>
      ) : null}
    </Table>
  );
}

/** Headings on the tray, rows in the card — `Table.Frame` does the lift. */
function FramedTableDemo() {
  return (
    // One caption line, not two. On the tray a title and a description are the
    // same muted `text-sm`, so stacking them reads as one sentence broken in
    // half and costs the frame a row of height for nothing.
    <Table.Frame
      className="w-full"
      title="Five most recent invoices"
      action={<Badge variant="outline">Q3</Badge>}
    >
      <Table.Header>
        <Table.Row>
          <Table.Head flex={2}>Invoice</Table.Head>
          <Table.Head>Method</Table.Head>
          <Table.Head align="end">Amount</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {INVOICES.map((invoice) => (
          <Table.Row key={invoice.id}>
            <Table.Cell flex={2}>{invoice.id}</Table.Cell>
            <Table.Cell>{invoice.method}</Table.Cell>
            <Table.Cell align="end">{invoiceAmount(invoice.amount)}</Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
      <Table.Footer>
        <Table.Row>
          <Table.Cell flex={2} labelClassName="font-medium">
            Total
          </Table.Cell>
          <Table.Cell />
          <Table.Cell align="end" labelClassName="font-medium">
            {invoiceAmount(INVOICES.reduce((sum, i) => sum + i.amount, 0))}
          </Table.Cell>
        </Table.Row>
      </Table.Footer>
    </Table.Frame>
  );
}

/** A column header is the handle for sorting by it; the arrow turns over. */
function SortableTableDemo() {
  const [column, setColumn] = useState<'id' | 'amount'>('amount');
  const [direction, setDirection] = useState<'asc' | 'desc'>('desc');

  const sortBy = (next: 'id' | 'amount') => {
    if (next === column) {
      setDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setColumn(next);
    setDirection('asc');
  };

  const rows = useMemo(() => {
    const sign = direction === 'asc' ? 1 : -1;
    return [...INVOICES].sort((a, b) =>
      column === 'amount'
        ? (a.amount - b.amount) * sign
        : a.id.localeCompare(b.id) * sign
    );
  }, [column, direction]);

  return (
    <Table variant="outline">
      <Table.Header>
        <Table.Row>
          <Table.Head
            flex={2}
            sortDirection={column === 'id' ? direction : undefined}
            sortable
            onPress={() => sortBy('id')}
          >
            Invoice
          </Table.Head>
          <Table.Head
            align="end"
            sortDirection={column === 'amount' ? direction : undefined}
            sortable
            onPress={() => sortBy('amount')}
          >
            Amount
          </Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {rows.map((invoice) => (
          <Table.Row key={invoice.id}>
            <Table.Cell flex={2}>{invoice.id}</Table.Cell>
            <Table.Cell align="end">{invoiceAmount(invoice.amount)}</Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );
}

/** Rows given an `onPress` become buttons, and the chosen one stays lit. */
function SelectableTableDemo() {
  const [picked, setPicked] = useState('INV-002');

  return (
    <View className="w-full gap-3">
      <Table variant="outline">
        <Table.Header>
          <Table.Row>
            <Table.Head flex={2}>Invoice</Table.Head>
            <Table.Head>Status</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {INVOICES.map((invoice) => (
            <Table.Row
              key={invoice.id}
              selected={picked === invoice.id}
              onPress={() => setPicked(invoice.id)}
            >
              <Table.Cell flex={2}>{invoice.id}</Table.Cell>
              <Table.Cell>
                <Badge
                  variant={
                    invoice.status === 'Paid'
                      ? 'success'
                      : invoice.status === 'Pending'
                        ? 'warning'
                        : 'destructive'
                  }
                >
                  {invoice.status}
                </Badge>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
      <Text size="sm" muted>
        Selected {picked}
      </Text>
    </View>
  );
}

/**
 * More columns than a phone is wide. The table keeps a `minWidth` and scrolls
 * sideways rather than crushing the columns; the fade says there is more.
 *
 * `w-full` on the `ScrollFade` is what makes that true. Without it the wrapper
 * shrink-wraps to the scroller's content and the table runs off the screen
 * instead of clipping — a scroll view only scrolls once something has decided
 * how wide its window is.
 */
function WideTableDemo() {
  return (
    <ScrollFade size={24} className="w-full self-start">
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Table variant="outline" size="sm" striped style={{ minWidth: 440 }}>
          <Table.Header>
            <Table.Row>
              <Table.Head width={86}>Invoice</Table.Head>
              <Table.Head width={100}>Customer</Table.Head>
              <Table.Head width={82}>Status</Table.Head>
              <Table.Head width={92} align="end">
                Amount
              </Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {INVOICES.slice(0, 4).map((invoice, index) => (
              <Table.Row key={invoice.id}>
                <Table.Cell width={86}>{invoice.id}</Table.Cell>
                <Table.Cell width={100}>
                  {['Acme', 'Globex', 'Initech', 'Umbrella'][index]}
                </Table.Cell>
                <Table.Cell width={82}>{invoice.status}</Table.Cell>
                <Table.Cell width={92} align="end">
                  {invoiceAmount(invoice.amount)}
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </ScrollView>
    </ScrollFade>
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

const price = (value: number) => `$${value.toFixed(2)}`;

/**
 * A short list where every row deletes itself. The rows are state so the full
 * swipe has something real to do — an action that only logs proves nothing
 * about whether the row got out of the way afterwards.
 */
function SwipeDeleteDemo() {
  const [rows, setRows] = useState([
    { name: 'Invoice.pdf', meta: '2.4 MB' },
    { name: 'Contract.docx', meta: '812 KB' },
    { name: 'Notes.md', meta: '4 KB' },
  ]);

  if (rows.length === 0) {
    return (
      <View className="w-full gap-3">
        <Text size="sm" muted>
          Every row deleted.
        </Text>
        <Button
          variant="outline"
          size="sm"
          onPress={() =>
            setRows([
              { name: 'Invoice.pdf', meta: '2.4 MB' },
              { name: 'Contract.docx', meta: '812 KB' },
              { name: 'Notes.md', meta: '4 KB' },
            ])
          }
        >
          Put them back
        </Button>
      </View>
    );
  }

  return (
    <View className="w-full overflow-hidden rounded-xl border border-border">
      {rows.map((row, index) => (
        <View key={row.name}>
          <Swipe haptics>
            <Swipe.End>
              <Swipe.Action
                icon={<TrashIcon />}
                label="Delete"
                color="destructive"
                onPress={() =>
                  setRows((current) => current.filter((r) => r.name !== row.name))
                }
              />
            </Swipe.End>
            <Item>
              <Item.Media variant="icon">
                <FileIcon />
              </Item.Media>
              <Item.Content>
                <Item.Title>{row.name}</Item.Title>
                <Item.Description>{row.meta}</Item.Description>
              </Item.Content>
            </Item>
          </Swipe>
          {index < rows.length - 1 ? <Item.Separator /> : null}
        </View>
      ))}
    </View>
  );
}

const SWIPE_MAIL = [
  { id: 'm1', from: 'Nadia Rahman', subject: 'Re: the Q3 numbers' },
  { id: 'm2', from: 'Build bot', subject: 'main is green again' },
  { id: 'm3', from: 'Tomas Lind', subject: 'Lunch Thursday?' },
  { id: 'm4', from: 'Registry', subject: 'Your domain renews in 14 days' },
];

/**
 * The point of a group is the row you are *not* touching. Open one, then open
 * another: the first puts itself away. Without the group all four stand open
 * at once, which is the state every real inbox goes out of its way to avoid.
 *
 * The rows sit inside an `Item.Group` and come out of a `map`, neither of
 * which the group can see — it works because each row registers itself rather
 * than being counted as a child.
 */
function SwipeGroupDemo() {
  const [log, setLog] = useState<string | null>(null);

  return (
    <View className="w-full gap-3">
      <Swipe.Group className="overflow-hidden rounded-xl border border-border">
        <Item.Group>
          {SWIPE_MAIL.map((message, index) => (
            <View key={message.id}>
              <Swipe haptics>
                <Swipe.End>
                  <Swipe.Action
                    icon={<BookmarkIcon />}
                    label="Archive"
                    color="info"
                    onPress={() => setLog(`Archived ${message.from}.`)}
                  />
                  <Swipe.Action
                    icon={<TrashIcon />}
                    label="Delete"
                    color="destructive"
                    onPress={() => setLog(`Deleted ${message.from}.`)}
                  />
                </Swipe.End>
                <Item>
                  <Item.Content>
                    <Item.Title>{message.from}</Item.Title>
                    <Item.Description>{message.subject}</Item.Description>
                  </Item.Content>
                </Item>
              </Swipe>
              {index < SWIPE_MAIL.length - 1 ? <Item.Separator /> : null}
            </View>
          ))}
        </Item.Group>
      </Swipe.Group>
      <Text size="sm" muted>
        {log ?? 'Open one row, then another — the first closes itself.'}
      </Text>
    </View>
  );
}

/**
 * A panel on each side, and more than one tile on the end — which is where the
 * rule about the outermost action earns its keep: Delete is the far tile, so it
 * is the one a full swipe reaches.
 */
function SwipeBothSidesDemo() {
  const [status, setStatus] = useState('Drag the row either way.');

  return (
    <View className="w-full gap-3">
      <View className="overflow-hidden rounded-xl border border-border">
        <Swipe haptics onOpenChange={(side) => side && setStatus(`Open on the ${side}.`)}>
          <Swipe.Start>
            <Swipe.Action
              icon={<CheckIcon />}
              label="Done"
              color="success"
              onPress={() => setStatus('Marked done.')}
            />
          </Swipe.Start>
          <Swipe.End>
            <Swipe.Action
              icon={<BellIcon />}
              label="Snooze"
              color="warning"
              onPress={() => setStatus('Snoozed until tomorrow.')}
            />
            <Swipe.Action
              icon={<TrashIcon />}
              label="Delete"
              color="destructive"
              onPress={() => setStatus('Deleted.')}
            />
          </Swipe.End>
          <Item>
            <Item.Content>
              <Item.Title>Renew the domain</Item.Title>
              <Item.Description>Due Friday</Item.Description>
            </Item.Content>
          </Item>
        </Swipe>
      </View>
      <Text size="sm" muted>
        {status}
      </Text>
    </View>
  );
}

/**
 * The two halves of the full-swipe decision, side by side. The top row fires
 * its action on a long drag; the bottom one opens and waits to be tapped.
 */
function SwipeFullSwipeDemo() {
  const [log, setLog] = useState('Nothing fired yet.');

  return (
    <View className="w-full gap-4">
      <View className="gap-2">
        <Text size="sm" weight="medium">
          fullSwipe (default)
        </Text>
        <View className="overflow-hidden rounded-xl border border-border">
          <Swipe haptics>
            <Swipe.End>
              <Swipe.Action
                icon={<TrashIcon />}
                label="Delete"
                color="destructive"
                onPress={() => setLog('Fired by the swipe.')}
              />
            </Swipe.End>
            <Item>
              <Item.Content>
                <Item.Title>Draft note</Item.Title>
                <Item.Description>Carry the drag all the way</Item.Description>
              </Item.Content>
            </Item>
          </Swipe>
        </View>
      </View>

      <View className="gap-2">
        <Text size="sm" weight="medium">
          fullSwipe={'{false}'}
        </Text>
        <View className="overflow-hidden rounded-xl border border-border">
          <Swipe fullSwipe={false}>
            <Swipe.End>
              <Swipe.Action
                icon={<TrashIcon />}
                label="Delete"
                color="destructive"
                onPress={() => setLog('Fired by the tile.')}
              />
            </Swipe.End>
            <Item>
              <Item.Content>
                <Item.Title>Production database</Item.Title>
                <Item.Description>The tile has to be tapped</Item.Description>
              </Item.Content>
            </Item>
          </Swipe>
        </View>
      </View>

      <Text size="sm" muted>
        {log}
      </Text>
    </View>
  );
}

/** `keepOpen` for an action that toggles rather than finishes. */
function SwipeKeepOpenDemo() {
  const [saved, setSaved] = useState(false);

  return (
    <View className="w-full overflow-hidden rounded-xl border border-border">
      <Swipe>
        <Swipe.Start>
          <Swipe.Action
            icon={<BookmarkIcon />}
            label={saved ? 'Saved' : 'Save'}
            color={saved ? 'success' : 'primary'}
            keepOpen
            onPress={() => setSaved((current) => !current)}
          />
        </Swipe.Start>
        <Item>
          <Item.Content>
            <Item.Title>Weekly digest</Item.Title>
            <Item.Description>{saved ? 'Saved for later' : 'Not saved'}</Item.Description>
          </Item.Content>
        </Item>
      </Swipe>
    </View>
  );
}

/**
 * The same row in a right-to-left subtree. `Swipe.End` still means the edge
 * text runs toward, so the panel is on the left and the row opens rightward —
 * without a word of the markup changing.
 */
function SwipeRtlDemo() {
  return (
    <Direction dir="rtl" className="w-full">
      <View className="overflow-hidden rounded-xl border border-border">
        <Swipe>
          <Swipe.End>
            <Swipe.Action icon={<TrashIcon />} label="حذف" color="destructive" />
          </Swipe.End>
          <Item>
            <Item.Content>
              <Item.Title>فاتورة يوليو</Item.Title>
              <Item.Description>٢٫٤ ميغابايت</Item.Description>
            </Item.Content>
          </Item>
        </Swipe>
      </View>
    </Direction>
  );
}


/* -------------------------------------------------------------------------- */
/* BumpChart                                                                  */
/* -------------------------------------------------------------------------- */

const CHART_HEADER = 'px-4 pt-3.5';

/** A five-club league table, week by week, as places. */
const LEAGUE: BumpChartDatum[] = [
  { week: 'w32', harbour: 3, northside: 2, kestrel: 1, oldMill: 4, riverside: 5 },
  { week: 'w33', harbour: 3, northside: 2, kestrel: 1, oldMill: 5, riverside: 4 },
  { week: 'w34', harbour: 2, northside: 3, kestrel: 1, oldMill: 4, riverside: 5 },
  { week: 'w35', harbour: 2, northside: 1, kestrel: 3, oldMill: 4, riverside: 5 },
  { week: 'w36', harbour: 1, northside: 3, kestrel: 2, oldMill: 4, riverside: 5 },
  { week: 'w37', harbour: 1, northside: 2, kestrel: 3, oldMill: 5, riverside: 4 },
  { week: 'Now', harbour: 1, northside: 2, kestrel: 3, oldMill: 4, riverside: 5 },
];

const CLUBS = [
  { key: 'harbour', label: 'Harbour' },
  { key: 'northside', label: 'Northside' },
  { key: 'kestrel', label: 'Kestrel' },
  { key: 'oldMill', label: 'Old Mill' },
  { key: 'riverside', label: 'Riverside' },
] as const;

/** Weekly takings per shop, as money — the chart does the ranking. */
const SHOP_TAKINGS: BumpChartDatum[] = [
  { month: 'Jan', quay: 18420, market: 21760, station: 15230, college: 12980 },
  { month: 'Feb', quay: 19870, market: 20110, station: 16940, college: 13420 },
  { month: 'Mar', quay: 22650, market: 19480, station: 17310, college: 18050 },
  { month: 'Apr', quay: 21390, market: 18920, station: 19760, college: 20330 },
  { month: 'May', quay: 23810, market: 17640, station: 22480, college: 19160 },
  { month: 'Jun', quay: 24560, market: 19930, station: 21870, college: 16240 },
];

/** The same league a season earlier, for the data-change demo. */
const LAST_SEASON: BumpChartDatum[] = [
  { week: 'w32', harbour: 5, northside: 1, kestrel: 2, oldMill: 3, riverside: 4 },
  { week: 'w33', harbour: 4, northside: 1, kestrel: 3, oldMill: 2, riverside: 5 },
  { week: 'w34', harbour: 4, northside: 2, kestrel: 3, oldMill: 1, riverside: 5 },
  { week: 'w35', harbour: 3, northside: 2, kestrel: 4, oldMill: 1, riverside: 5 },
  { week: 'w36', harbour: 3, northside: 1, kestrel: 5, oldMill: 2, riverside: 4 },
  { week: 'w37', harbour: 2, northside: 1, kestrel: 5, oldMill: 3, riverside: 4 },
  { week: 'Now', harbour: 2, northside: 1, kestrel: 4, oldMill: 3, riverside: 5 },
];

function LeagueLines() {
  return (
    <>
      {CLUBS.map((club) => (
        <BumpChart.Line
          key={club.key}
          dataKey={club.key}
          label={club.label}
          colorIndex={club.key === 'harbour' ? 3 : 1}
        />
      ))}
    </>
  );
}

/** One club picked out against the rest of the table. */
function BumpBasicVersion() {
  return (
    <View className="flex-1 justify-center p-4">
      <Frame className="w-full">
        <Frame.Header>
          <Frame.Title>League table</Frame.Title>
          <Frame.Action>Tap a name</Frame.Action>
        </Frame.Header>
        <Frame.Panel>
          <BumpChart data={LEAGUE} xDataKey="week" defaultHighlight="harbour" className="px-2 pb-4 pt-3">
            <BumpChart.Grid />
            <BumpChart.Line dataKey="harbour" label="Harbour" colorIndex={3} />
            <BumpChart.Line dataKey="northside" label="Northside" />
            <BumpChart.Line dataKey="kestrel" label="Kestrel" />
            <BumpChart.Line dataKey="oldMill" label="Old Mill" />
            <BumpChart.Line dataKey="riverside" label="Riverside" />
            <BumpChart.YAxis />
            <BumpChart.XAxis />
            <BumpChart.Labels />
            <BumpChart.Tooltip />
          </BumpChart>
        </Frame.Panel>
      </Frame>
    </View>
  );
}

/** Scores in, places out: every month ranked highest first, one colour per shop. */
function BumpScoresVersion() {
  return (
    <View className="flex-1 justify-center p-4">
      <Frame className="w-full">
        <Frame.Header>
          <Frame.Title>Takings</Frame.Title>
          <Frame.Action>Jan to Jun</Frame.Action>
        </Frame.Header>
        <Frame.Panel>
          <BumpChart data={SHOP_TAKINGS} xDataKey="month" values="score" aspectRatio={1.8} className="px-2 pb-4">
            <BumpChart.Header
              className={CHART_HEADER}
              title="Top shop in June"
              value="Quay"
              caption="Ranked by takings each month"
            />
            <BumpChart.Grid />
            <BumpChart.Line dataKey="quay" label="Quay" colorIndex={1} strokeWidth={2} />
            <BumpChart.Line dataKey="market" label="Market" colorIndex={2} strokeWidth={2} />
            <BumpChart.Line dataKey="station" label="Station" colorIndex={3} strokeWidth={2} />
            <BumpChart.Line dataKey="college" label="College" colorIndex={4} strokeWidth={2} />
            <BumpChart.YAxis />
            <BumpChart.XAxis ticks={6} />
            <BumpChart.Labels pressable={false} />
            <BumpChart.Tooltip />
          </BumpChart>
        </Frame.Panel>
      </Frame>
    </View>
  );
}

/** The header reads whichever club is picked out, and follows a tap on the names. */
function BumpPickedVersion() {
  const [picked, setPicked] = useState<string | null>('kestrel');
  const club = CLUBS.find((entry) => entry.key === picked);
  const places = picked ? LEAGUE.map((row) => row[picked] as number) : [];
  const best = places.length ? Math.min(...places) : null;

  return (
    <View className="flex-1 justify-center p-4">
      <Frame className="w-full">
        <Frame.Header>
          <Frame.Title>League table</Frame.Title>
          <Frame.Action>{picked ? 'Tap again to clear' : 'Tap a name'}</Frame.Action>
        </Frame.Header>
        <Frame.Panel>
          <BumpChart
            data={LEAGUE}
            xDataKey="week"
            highlight={picked}
            onHighlightChange={setPicked}
            className="px-2 pb-4"
          >
            <BumpChart.Header
              className={CHART_HEADER}
              title={club ? club.label : 'No club picked'}
              value={club ? `#${places[places.length - 1]}` : '—'}
              caption={club ? `Best this run: #${best}` : 'Every line in its own colour'}
            />
            <BumpChart.Grid />
            {CLUBS.map((entry, index) => (
              <BumpChart.Line
                key={entry.key}
                dataKey={entry.key}
                label={entry.label}
                colorIndex={(index + 1) as 1 | 2 | 3 | 4 | 5}
              />
            ))}
            <BumpChart.YAxis />
            <BumpChart.XAxis />
            <BumpChart.Labels />
          </BumpChart>
        </Frame.Panel>
      </Frame>
    </View>
  );
}

/** Switching seasons moves every line to its new places rather than redrawing. */
function BumpSeasonsVersion() {
  const [season, setSeason] = useState<'this' | 'last'>('this');

  return (
    <View className="flex-1 justify-center gap-4 p-4">
      <Frame className="w-full">
        <Frame.Header>
          <Frame.Title>League table</Frame.Title>
          <Frame.Action>{season === 'this' ? 'This season' : 'Last season'}</Frame.Action>
        </Frame.Header>
        <Frame.Panel>
          <BumpChart
            data={season === 'this' ? LEAGUE : LAST_SEASON}
            xDataKey="week"
            defaultHighlight="harbour"
            className="px-2 pb-4 pt-3"
          >
            <BumpChart.Grid />
            <LeagueLines />
            <BumpChart.YAxis />
            <BumpChart.XAxis />
            <BumpChart.Labels />
            <BumpChart.Tooltip />
          </BumpChart>
        </Frame.Panel>
      </Frame>
      <Button variant="secondary" onPress={() => setSeason(season === 'this' ? 'last' : 'this')}>
        {season === 'this' ? 'Show last season' : 'Show this season'}
      </Button>
    </View>
  );
}

/** The waiting state: a bar on every row, and the lines drawn in when the data lands. */
function BumpLoadingVersion() {
  const [status, setStatus] = useState<'loading' | 'ready'>('loading');

  useEffect(() => {
    if (status !== 'loading') return;
    const timer = setTimeout(() => setStatus('ready'), 900);
    return () => clearTimeout(timer);
  }, [status]);

  return (
    <View className="flex-1 justify-center gap-4 p-4">
      <Frame className="w-full">
        <Frame.Header>
          <Frame.Title>League table</Frame.Title>
          <Frame.Action>{status === 'loading' ? 'Loading' : 'This season'}</Frame.Action>
        </Frame.Header>
        <Frame.Panel>
          <BumpChart
            data={LEAGUE}
            xDataKey="week"
            status={status}
            defaultHighlight="harbour"
            className="px-2 pb-4 pt-3"
          >
            <BumpChart.Grid />
            <BumpChart.Skeleton />
            <LeagueLines />
            <BumpChart.YAxis />
            <BumpChart.XAxis />
            <BumpChart.Labels />
            <BumpChart.Tooltip />
          </BumpChart>
        </Frame.Panel>
      </Frame>
      <Button variant="secondary" onPress={() => setStatus('loading')}>
        Load again
      </Button>
    </View>
  );
}


/* -------------------------------------------------------------------------- */
/* MirrorAreaChart                                                            */
/* -------------------------------------------------------------------------- */

/**
 * A working day of a job queue: everything queued above the line, the
 * high-priority part of it inside that, and the high-priority share below.
 */
const QUEUE_LOAD: MirrorAreaChartDatum[] = [
  { time: '08:00', jobs: 312, high: 106, share: 34 },
  { time: '08:30', jobs: 338, high: 105, share: 31 },
  { time: '09:00', jobs: 361, high: 105, share: 29 },
  { time: '09:30', jobs: 405, high: 134, share: 33 },
  { time: '10:00', jobs: 472, high: 194, share: 41 },
  { time: '10:30', jobs: 449, high: 171, share: 38 },
  { time: '11:00', jobs: 433, high: 156, share: 36 },
  { time: '11:30', jobs: 468, high: 164, share: 35 },
  { time: '12:00', jobs: 531, high: 207, share: 39 },
  { time: '12:30', jobs: 604, high: 278, share: 46 },
  { time: '13:00', jobs: 688, high: 358, share: 52 },
  { time: '13:30', jobs: 801, high: 465, share: 58 },
  { time: '14:00', jobs: 947, high: 653, share: 69 },
  { time: '14:30', jobs: 1120, high: 874, share: 78 },
  { time: '15:00', jobs: 982, high: 697, share: 71 },
  { time: '15:30', jobs: 806, high: 484, share: 60 },
  { time: '16:00', jobs: 655, high: 321, share: 49 },
  { time: '16:30', jobs: 548, high: 225, share: 41 },
  { time: '17:00', jobs: 497, high: 184, share: 37 },
  { time: '17:30', jobs: 471, high: 165, share: 35 },
  { time: '18:00', jobs: 452, high: 149, share: 33 },
  { time: '18:30', jobs: 438, high: 149, share: 34 },
  { time: '19:00', jobs: 420, high: 134, share: 32 },
  { time: '19:30', jobs: 446, high: 161, share: 36 },
  { time: '20:00', jobs: 431, high: 142, share: 33 },
];

/** An API's day: requests per hour above, failed requests below. */
const API_TRAFFIC: MirrorAreaChartDatum[] = [
  { hour: '00', requests: 18400, errors: 42 },
  { hour: '01', requests: 14100, errors: 31 },
  { hour: '02', requests: 11800, errors: 27 },
  { hour: '03', requests: 10200, errors: 88 },
  { hour: '04', requests: 9900, errors: 214 },
  { hour: '05', requests: 12600, errors: 96 },
  { hour: '06', requests: 19800, errors: 38 },
  { hour: '07', requests: 31500, errors: 51 },
  { hour: '08', requests: 44200, errors: 63 },
  { hour: '09', requests: 52700, errors: 70 },
  { hour: '10', requests: 55100, errors: 58 },
  { hour: '11', requests: 53900, errors: 61 },
  { hour: '12', requests: 49800, errors: 55 },
  { hour: '13', requests: 51600, errors: 67 },
  { hour: '14', requests: 54300, errors: 72 },
  { hour: '15', requests: 52200, errors: 140 },
  { hour: '16', requests: 48900, errors: 118 },
  { hour: '17', requests: 43100, errors: 64 },
  { hour: '18', requests: 37800, errors: 49 },
  { hour: '19', requests: 34600, errors: 44 },
  { hour: '20', requests: 32900, errors: 40 },
  { hour: '21', requests: 29700, errors: 36 },
  { hour: '22', requests: 25200, errors: 33 },
  { hour: '23', requests: 21300, errors: 30 },
];

const queueSummary = (datum: MirrorAreaChartDatum) =>
  `${Number(datum.jobs).toLocaleString()} jobs · ${datum.share}% high`;

/** The queue and its high-priority share, read together under the finger. */
function MirrorBasicVersion() {
  return (
    <View className="flex-1 justify-center p-4">
      <Frame className="w-full">
        <Frame.Header>
          <Frame.Title>Queue load</Frame.Title>
          <Frame.Action>Drag the chart</Frame.Action>
        </Frame.Header>
        <Frame.Panel>
          <MirrorAreaChart data={QUEUE_LOAD} xDataKey="time" className="px-2 pb-4 pt-3">
            <MirrorAreaChart.Grid />
            <MirrorAreaChart.Area dataKey="jobs" label="jobs" muted />
            <MirrorAreaChart.Area dataKey="high" label="high priority" colorIndex={3} />
            <MirrorAreaChart.Area dataKey="share" label="% high" side="bottom" colorIndex={3} fillOpacity={0.7} />
            <MirrorAreaChart.Baseline />
            <MirrorAreaChart.XAxis />
            <MirrorAreaChart.Tooltip
              formatX={(datum) => (datum.time === '14:30' ? '14:30 · peak' : String(datum.time))}
              formatSummary={queueSummary}
            />
          </MirrorAreaChart>
        </Frame.Panel>
      </Frame>
    </View>
  );
}

/** Both scales labelled, and a row per series in the readout. */
function MirrorScalesVersion() {
  return (
    <View className="flex-1 justify-center p-4">
      <Frame className="w-full">
        <Frame.Header>
          <Frame.Title>Queue load</Frame.Title>
          <Frame.Action>Today</Frame.Action>
        </Frame.Header>
        <Frame.Panel>
          <MirrorAreaChart data={QUEUE_LOAD} xDataKey="time" className="px-2 pb-4">
            <MirrorAreaChart.Header
              className={CHART_HEADER}
              title="Peak"
              value="1,120 jobs"
              caption="78% of them high priority, at 14:30"
              legend
            />
            <MirrorAreaChart.Grid />
            <MirrorAreaChart.Area dataKey="jobs" label="Jobs" muted />
            <MirrorAreaChart.Area dataKey="high" label="High" colorIndex={3} />
            <MirrorAreaChart.Area dataKey="share" label="% high" side="bottom" colorIndex={2} fillOpacity={0.6} />
            <MirrorAreaChart.Baseline />
            <MirrorAreaChart.YAxis formatBottom={(value) => `${Math.round(value)}%`} />
            <MirrorAreaChart.XAxis />
            <MirrorAreaChart.Tooltip
              formatValue={(value, key) => (key === 'share' ? `${value}%` : value.toLocaleString())}
            />
          </MirrorAreaChart>
        </Frame.Panel>
      </Frame>
    </View>
  );
}

/** Errors under traffic, given the smaller share of the height and ruled lines. */
function MirrorErrorsVersion() {
  const [active, setActive] = useState(-1);
  const row = active >= 0 ? API_TRAFFIC[active] : null;

  return (
    <View className="flex-1 justify-center p-4">
      <Frame className="w-full">
        <Frame.Header>
          <Frame.Title>API</Frame.Title>
          <Frame.Action>Last 24 hours</Frame.Action>
        </Frame.Header>
        <Frame.Panel>
          <MirrorAreaChart
            data={API_TRAFFIC}
            xDataKey="hour"
            split={0.7}
            onActiveIndexChange={setActive}
            className="px-2 pb-4"
          >
            <MirrorAreaChart.Header
              className={CHART_HEADER}
              title={row ? `${row.hour}:00` : 'Requests today'}
              value={row ? Number(row.requests).toLocaleString() : '873,500'}
              caption={row ? `${row.errors} failed` : '1,808 failed, 0.21%'}
            />
            <MirrorAreaChart.Grid variant="lines" />
            <MirrorAreaChart.Area dataKey="requests" label="requests" colorIndex={2} gradientToOpacity={0.04} />
            <MirrorAreaChart.Area dataKey="errors" label="failed" side="bottom" colorIndex={5} fillOpacity={0.55} />
            <MirrorAreaChart.Baseline />
            <MirrorAreaChart.XAxis ticks={3} format={(datum) => `${datum.hour}:00`} />
            <MirrorAreaChart.Tooltip formatX={(datum) => `${datum.hour}:00`} />
          </MirrorAreaChart>
        </Frame.Panel>
      </Frame>
    </View>
  );
}

/** The waiting state, and the bands growing out of the baseline when it lands. */
function MirrorLoadingVersion() {
  const [status, setStatus] = useState<'loading' | 'ready'>('loading');

  useEffect(() => {
    if (status !== 'loading') return;
    const timer = setTimeout(() => setStatus('ready'), 900);
    return () => clearTimeout(timer);
  }, [status]);

  return (
    <View className="flex-1 justify-center gap-4 p-4">
      <Frame className="w-full">
        <Frame.Header>
          <Frame.Title>Queue load</Frame.Title>
          <Frame.Action>{status === 'loading' ? 'Loading' : 'Today'}</Frame.Action>
        </Frame.Header>
        <Frame.Panel>
          <MirrorAreaChart data={QUEUE_LOAD} xDataKey="time" status={status} className="px-2 pb-4 pt-3">
            <MirrorAreaChart.Grid />
            <MirrorAreaChart.Skeleton />
            <MirrorAreaChart.Area dataKey="jobs" label="jobs" muted />
            <MirrorAreaChart.Area dataKey="high" label="high priority" colorIndex={3} />
            <MirrorAreaChart.Area dataKey="share" label="% high" side="bottom" colorIndex={3} fillOpacity={0.7} />
            <MirrorAreaChart.Baseline />
            <MirrorAreaChart.XAxis />
            <MirrorAreaChart.Tooltip formatSummary={queueSummary} />
          </MirrorAreaChart>
        </Frame.Panel>
      </Frame>
      <Button variant="secondary" onPress={() => setStatus('loading')}>
        Load again
      </Button>
    </View>
  );
}

export const ENTRIES: ComponentEntry[] = [
{
    slug: 'mirror-area-chart',
    name: 'MirrorAreaChart',
    summary: 'Two readings of one timeline, one above a baseline and one below it',
    layout: 'pager',
    demos: [
      {
        label: 'Basic',
        id: 'basic',
        fullPage: true,
        description: 'Queued jobs above the line, the high-priority share below it.',
        render: () => <MirrorBasicVersion />,
      },
      {
        label: 'Two scales',
        id: 'scales',
        fullPage: true,
        description: 'Both scales labelled, and every series in the readout.',
        render: () => <MirrorScalesVersion />,
      },
      {
        label: 'Errors under traffic',
        id: 'errors',
        fullPage: true,
        description: 'A smaller bottom half, ruled lines, and a header that follows the finger.',
        render: () => <MirrorErrorsVersion />,
      },
      {
        label: 'Loading',
        id: 'loading',
        fullPage: true,
        description: 'A band along the baseline while the data loads.',
        render: () => <MirrorLoadingVersion />,
      },
    ],
  },

{
    slug: 'bump-chart',
    name: 'BumpChart',
    summary: 'How a set of things ranked against each other over time',
    layout: 'pager',
    demos: [
      {
        label: 'Basic',
        id: 'basic',
        fullPage: true,
        description: 'Five clubs over seven weeks, with one picked out against the rest.',
        render: () => <BumpBasicVersion />,
      },
      {
        label: 'Ranked from scores',
        id: 'scores',
        fullPage: true,
        description: 'Monthly takings passed as money; the chart ranks each month itself.',
        render: () => <BumpScoresVersion />,
      },
      {
        label: 'Picking a line',
        id: 'picked',
        fullPage: true,
        description: 'Tap a name to pick it out; the header reads the club you picked.',
        render: () => <BumpPickedVersion />,
      },
      {
        label: 'Changing data',
        id: 'seasons',
        fullPage: true,
        description: 'Switch seasons and every line moves to its new places.',
        render: () => <BumpSeasonsVersion />,
      },
      {
        label: 'Loading',
        id: 'loading',
        fullPage: true,
        description: 'A bar on every row while the table loads.',
        render: () => <BumpLoadingVersion />,
      },
    ],
  },

{
    slug: 'slider',
    name: 'Slider',
    summary: 'Pick a value by dragging a thumb along a track',
    demos: [
      { label: 'Interactive', render: () => <SliderDemo /> },
      { label: 'Range', render: () => <RangeSliderDemo /> },
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
        label: 'In another colour',
        render: () => (
          <View className="w-full flex-row items-center justify-center gap-4">
            <Spinner color="#E11D48" />
            {/* A surface the theme did not choose, which is when the prop is needed. */}
            <View className="rounded-xl p-4" style={{ backgroundColor: '#2563EB' }}>
              <Spinner color="#FFFFFF" trackColor="rgba(255,255,255,0.25)" />
            </View>
            <View className="rounded-xl bg-muted p-4">
              <Spinner size="lg" color="#16A34A" />
            </View>
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
              </Steps.Item>
            ))}
          </Steps>
        ),
      },
    ],
  },
{
    slug: 'swipe',
    name: 'Swipe',
    summary: 'A row that slides aside to reveal its actions',
    demos: [
      { label: 'Swipe to delete', render: () => <SwipeDeleteDemo /> },
      { label: 'Both sides', render: () => <SwipeBothSidesDemo /> },
      { label: 'One row open at a time', render: () => <SwipeGroupDemo /> },
      { label: 'Full swipe', render: () => <SwipeFullSwipeDemo /> },
      { label: 'Keeping the row open', render: () => <SwipeKeepOpenDemo /> },
      { label: 'Right to left', render: () => <SwipeRtlDemo /> },
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
      { label: 'Haptics', render: () => <HapticSwitchDemo /> },
      { label: 'Native', render: () => <NativeSwitchDemo /> },
    ],
  },
{
    slug: 'table',
    name: 'Table',
    summary: 'Rows and columns that stay lined up',
    demos: [
      { label: 'Basic', render: () => <TableDemo /> },
      { label: 'Outline', render: () => <TableDemo variant="outline" /> },
      { label: 'Striped', render: () => <TableDemo variant="outline" striped /> },
      { label: 'Declared columns', render: () => <ColumnsTableDemo /> },
      { label: 'Paged', render: () => <PaginatedTableDemo /> },
      { label: 'In a frame', render: () => <FramedTableDemo /> },
      { label: 'Sortable columns', render: () => <SortableTableDemo /> },
      { label: 'Selectable rows', render: () => <SelectableTableDemo /> },
      { label: 'Wider than the screen', render: () => <WideTableDemo /> },
      {
        label: 'Empty',
        render: () => (
          <Table variant="outline">
            <Table.Header>
              <Table.Row>
                <Table.Head flex={2}>Invoice</Table.Head>
                <Table.Head align="end">Amount</Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Empty>No invoices yet</Table.Empty>
          </Table>
        ),
      },
      {
        label: 'With a caption',
        render: () => (
          <TableDemo variant="outline" caption="Five most recent invoices." />
        ),
      },
    ],
  },
{
    slug: 'pagination',
    name: 'Pagination',
    summary: 'Moving through a result set one page at a time',
    demos: [
      { label: 'Basic', render: () => <PaginationDemo /> },
      { label: 'Compact', render: () => <PaginationDemo variant="compact" /> },
      { label: 'Simple', render: () => <PaginationDemo variant="simple" /> },
      { label: 'Small', render: () => <PaginationDemo size="sm" /> },
      {
        label: 'A long set',
        render: () => <PaginationDemo count={240} />,
      },
      {
        // Nine targets is as wide as a run gets on a phone. Two boundaries and
        // two arriving arrows put it past the screen, and a centred row that
        // does not fit hangs off both ends — so this trades the arrows for the
        // numbers, which is what a wider run was for.
        label: 'Wider run',
        render: () => (
          <PaginationDemo count={240} siblings={2} boundaries={1} size="sm" controls={false} />
        ),
      },
      {
        label: 'Numbers only',
        render: () => <PaginationDemo controls={false} />,
      },
      {
        label: 'With a status line',
        render: () => (
          <PaginationDemo count={12} variant="compact">
            <Pagination.Status pageSize={20} total={240} />
          </PaginationDemo>
        ),
      },
      { label: 'Beside a table', render: () => <PaginatedTableDemo /> },
      {
        label: 'Disabled',
        render: () => <PaginationDemo disabled />,
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
      {
        label: 'Swiping between panels',
        render: () => <SwipeableTabsDemo />,
      },
      {
        label: 'Icons that open',
        render: () => <ExpandingTabsDemo />,
      },
      {
        label: 'Panels that keep their size',
        id: 'kept-panels',
        fullPage: true,
        description:
          'Long lists in every panel, switched with keepMounted at "measured" and at true.',
        render: () => <KeptPanelTabsDemo />,
      },
    ],
  }
];
export const ENTRIES_BY_SLUG = Object.fromEntries(ENTRIES.map((entry) => [entry.slug, entry]));
