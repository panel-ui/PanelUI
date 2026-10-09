/**
 * Wallet — a person's cards and money on one screen: the total, a deck of
 * cards to flick through, what the card on top has been spending, and the
 * recent activity across all of them.
 *
 * The cards are a stack rather than a list because only one is in use at a
 * time, and the stack says which: the one in front is shown whole and drives
 * the actions under it and the chart below, while the others stay as strips
 * above it, each showing its name and last four digits. Tapping a strip
 * brings that card forward. It is a tap rather than a swipe so the card
 * moves at the pace of a spring, not of a flick. Each card has its own tone
 * from the theme, so three cards read as three things in every theme.
 *
 * The total rolls digit by digit when it changes, so topping up or sending
 * money shows the amount moving rather than a number being swapped. Rows in
 * the activity list swipe open to split a payment in two or hide it.
 *
 * The sample data is the constants below. Replace them with your own, or
 * lift them into props.
 */
import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Animated, { LinearTransition, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCSSVariable } from 'uniwind';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react-native';
// Deep imports: the icon package's barrel re-exports thousands of glyphs, and
// a bundler that cannot tree-shake follows every one of them.
import BankIcon from '@hugeicons/core-free-icons/BankIcon';
import Book02Icon from '@hugeicons/core-free-icons/Book02Icon';
import Coffee02Icon from '@hugeicons/core-free-icons/Coffee02Icon';
import MoneyReceive01Icon from '@hugeicons/core-free-icons/MoneyReceive01Icon';
import MoneySend01Icon from '@hugeicons/core-free-icons/MoneySend01Icon';
import NfcIcon from '@hugeicons/core-free-icons/NfcIcon';
import Restaurant01Icon from '@hugeicons/core-free-icons/Restaurant01Icon';
import Shirt01Icon from '@hugeicons/core-free-icons/Shirt01Icon';
import ShoppingBasket01Icon from '@hugeicons/core-free-icons/ShoppingBasket01Icon';
import SnowIcon from '@hugeicons/core-free-icons/SnowIcon';
import Train01Icon from '@hugeicons/core-free-icons/Train01Icon';
import { AreaChart, type AreaChartDatum } from '../src/components/area-chart';
import { Avatar } from '../src/components/avatar';
import { Button } from '../src/components/button';
import { Frame } from '../src/components/frame';
import { Item } from '../src/components/item';
import { Swipe } from '../src/components/swipe';
import { Tabs } from '../src/components/tabs';
import { TextAnimation } from '../src/components/text-animation';
import { ChevronLeftIcon, ReceiptIcon, XIcon, useIconColor } from '../src/icons';
import { Text } from '../src/primitives/text';
import { cn } from '../src/utils/cn';

/* -------------------------------------------------------------------------- */
/* Sample data                                                                */
/* -------------------------------------------------------------------------- */

const HOLDER = { name: 'Maya Lindqvist', initials: 'ML' };

type CardTone = 'primary' | 'raised' | 'outline';

interface PaymentCard {
  id: string;
  name: string;
  last4: string;
  expiry: string;
  balance: number;
  tone: CardTone;
  /** Typical spend per day, which the chart's figures are built around. */
  dailySpend: number;
}

const CARDS: PaymentCard[] = [
  {
    id: 'everyday',
    name: 'Everyday',
    last4: '4821',
    expiry: '09/29',
    balance: 3240.18,
    tone: 'primary',
    dailySpend: 46,
  },
  {
    id: 'travel',
    name: 'Travel',
    last4: '7713',
    expiry: '03/28',
    balance: 1186.4,
    tone: 'raised',
    dailySpend: 21,
  },
  {
    id: 'savings',
    name: 'Savings',
    last4: '0094',
    expiry: '11/30',
    balance: 8053.78,
    tone: 'outline',
    dailySpend: 4,
  },
];

/** A card's height, and how much of each card behind the front one shows. */
const CARD_HEIGHT = 208;
const STRIP_HEIGHT = 56;

/** Money that came in this month, for the line under the total. */
const IN_THIS_MONTH = 842.1;

/** Who the Send button pays. */
const PAYEE = { name: 'Ines Moreau', initials: 'IM' };
const SEND_AMOUNT = 25;
const TOP_UP_AMOUNT = 100;

interface Transaction {
  id: string;
  title: string;
  detail: string;
  when: string;
  amount: number;
  icon?: IconSvgElement;
  /** A person rather than a merchant: drawn as their initials. */
  initials?: string;
  split?: boolean;
}

const TRANSACTIONS: Transaction[] = [
  {
    id: 't1',
    title: 'Mercearia Luz',
    detail: 'Groceries',
    when: 'Today, 12:40',
    amount: -38.6,
    icon: ShoppingBasket01Icon,
  },
  {
    id: 't2',
    title: 'Tomás Ferreira',
    detail: 'Paid you back',
    when: 'Today, 09:12',
    amount: 120,
    initials: 'TF',
  },
  {
    id: 't3',
    title: 'Café Gaivota',
    detail: 'Coffee',
    when: 'Yesterday, 08:05',
    amount: -4.2,
    icon: Coffee02Icon,
  },
  {
    id: 't4',
    title: 'Metro card',
    detail: 'Transport',
    when: 'Yesterday, 07:58',
    amount: -20,
    icon: Train01Icon,
  },
  {
    id: 't5',
    title: 'Livraria Sá',
    detail: 'Books',
    when: 'Mon, 18:31',
    amount: -27.9,
    icon: Book02Icon,
  },
  {
    id: 't6',
    title: 'Taberna do Largo',
    detail: 'Dinner',
    when: 'Sun, 21:14',
    amount: -64.5,
    icon: Restaurant01Icon,
  },
  {
    id: 't7',
    title: 'Studio Norte',
    detail: 'Salary',
    when: 'Fri, 06:00',
    amount: 2850,
    icon: BankIcon,
  },
  {
    id: 't8',
    title: 'Ines Moreau',
    detail: 'Her half of dinner',
    when: 'Thu, 22:47',
    amount: 21.5,
    initials: 'IM',
  },
  {
    id: 't9',
    title: 'Atelier Linho',
    detail: 'Clothing',
    when: 'Wed, 16:20',
    amount: -89,
    icon: Shirt01Icon,
  },
];

type Range = 'week' | 'month' | 'year';

const RANGES: { id: Range; label: string; spent: string; by: string }[] = [
  { id: 'week', label: 'Week', spent: 'Spent this week', by: 'By' },
  { id: 'month', label: 'Month', spent: 'Spent this month', by: 'By day' },
  { id: 'year', label: 'Year', spent: 'Spent this year', by: 'By the end of' },
];

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/** `-1234.5` as `−€1,234.50`. */
function money(value: number, signed = false) {
  const sign = value < 0 ? '−' : signed && value > 0 ? '+' : '';
  const [whole = '0', cents = '00'] = Math.abs(value).toFixed(2).split('.');
  return `${sign}€${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${cents}`;
}

/**
 * A stable number between 0 and 1 for a key.
 *
 * The chart needs figures that look measured, and a real random would redraw
 * them on every render. A mixed hash of the key gives the same figure for the
 * same day every time, without the even steps a counter would leave.
 */
function noise(key: string) {
  let hash = 2166136261;
  for (let i = 0; i < key.length; i += 1) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 0x5bd1e995);
  hash ^= hash >>> 15;
  return (hash >>> 0) / 4294967295;
}

/**
 * What one card has spent so far in the range, as a running total.
 *
 * A running total rather than each day's figure: day-to-day spending is
 * spiky enough that a month of it reads as noise, while the question the
 * chart answers — how much has gone this month, and when — is the slope.
 */
function spending(card: PaymentCard, range: Range): AreaChartDatum[] {
  const day = (key: string, weekend: boolean) =>
    card.dailySpend * (0.35 + noise(`${card.id}:${key}`) * 1.3) * (weekend ? 1.6 : 1);

  const steps =
    range === 'week'
      ? WEEKDAYS.map((label, index) => ({
          label,
          amount: day(`w${index}`, index >= 5),
        }))
      : range === 'month'
        ? Array.from({ length: 30 }, (_, index) => ({
            label: String(index + 1),
            amount: day(`m${index}`, index % 7 === 5 || index % 7 === 6),
          }))
        : MONTHS.map((label, index) => ({
            label,
            amount: card.dailySpend * 30 * (0.7 + noise(`${card.id}:y${index}`) * 0.6),
          }));

  let total = 0;
  return steps.map(({ label, amount }) => {
    total += amount;
    return { label, spent: Math.round(total * 100) / 100 };
  });
}

/** A theme token, resolved for the drawing props that cannot take a class. */
function useToken(name: string, fallback: string) {
  const value = useCSSVariable(name);
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

/** A glyph from the icon set, tinted by whatever surface it sits on. */
function Glyph({
  icon,
  size = 18,
  color,
}: {
  icon: IconSvgElement;
  size?: number;
  color?: string;
}) {
  const inherited = useIconColor();
  const fallback = useToken('--color-foreground', '#262626');
  return (
    <HugeiconsIcon
      icon={icon}
      size={size}
      color={color ?? inherited ?? fallback}
      strokeWidth={1.75}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Parts                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Each tone is a surface and the ink that reads on it, both from the theme.
 * `mark` paints in the ink and `onMark` writes on top of that — the frozen
 * pill is the card turned inside out.
 *
 * Every surface here is opaque. The cards sit on top of one another in the
 * deck, and the translucent fills (`secondary`, `muted`) would show the card
 * underneath through the one on top.
 */
const TONES: Record<CardTone, { surface: string; ink: string; mark: string; onMark: string }> = {
  primary: {
    surface: 'bg-primary',
    ink: 'text-primary-foreground',
    mark: 'bg-primary-foreground',
    onMark: 'text-primary',
  },
  raised: {
    surface: 'bg-surface-tertiary',
    ink: 'text-foreground',
    mark: 'bg-foreground',
    onMark: 'text-surface-tertiary',
  },
  outline: {
    surface: 'border border-border bg-card',
    ink: 'text-card-foreground',
    mark: 'bg-card-foreground',
    onMark: 'text-card',
  },
};

/** The same pairs as tokens, for the glyphs. */
const TONE_TOKENS: Record<CardTone, { ink: string; surface: string }> = {
  primary: { ink: '--color-primary-foreground', surface: '--color-primary' },
  raised: { ink: '--color-foreground', surface: '--color-surface-tertiary' },
  outline: { ink: '--color-card-foreground', surface: '--color-card' },
};

function CardFace({ card, frozen }: { card: PaymentCard; frozen: boolean }) {
  const tone = TONES[card.tone];
  const ink = useToken(TONE_TOKENS[card.tone].ink, '#fafafa');
  const surface = useToken(TONE_TOKENS[card.tone].surface, '#262626');

  return (
    <View
      accessible
      accessibilityLabel={`${card.name} card ending ${card.last4}, ${money(card.balance)}${frozen ? ', frozen' : ''}`}
      style={{ height: CARD_HEIGHT }}
      className={cn('w-full justify-between overflow-hidden rounded-3xl p-5', tone.surface)}
    >
      {/* Two faint rings in the corner — the card's pattern, drawn in its own ink. */}
      <View
        className={cn('absolute -right-16 -top-24 h-52 w-52 rounded-full opacity-10', tone.mark)}
      />
      <View
        className={cn('absolute -bottom-20 -left-10 h-40 w-40 rounded-full opacity-10', tone.mark)}
      />

      {/* Top row: what a strip shows when the card is behind another. */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Text weight="semibold" className={tone.ink}>
            {card.name}
          </Text>
          {frozen ? (
            <View className={cn('flex-row items-center gap-1 rounded-full px-2 py-0.5', tone.mark)}>
              <Glyph icon={SnowIcon} size={12} color={surface} />
              <Text size="xs" weight="semibold" className={tone.onMark}>
                Frozen
              </Text>
            </View>
          ) : null}
        </View>
        <Text size="sm" weight="semibold" className={cn('tracking-widest tabular-nums', tone.ink)}>
          •••• {card.last4}
        </Text>
      </View>

      <View className="gap-0.5">
        <Text size="xs" className={cn('opacity-70', tone.ink)}>
          Balance
        </Text>
        <Text size="3xl" weight="bold" className={cn('tabular-nums', tone.ink)}>
          {money(card.balance)}
        </Text>
      </View>

      <View className="flex-row items-end justify-between">
        <View className="flex-row items-center gap-3">
          <View className="rotate-90">
            <Glyph icon={NfcIcon} size={18} color={ink} />
          </View>
          <Text size="xs" className={cn('tabular-nums opacity-70', tone.ink)}>
            Expires {card.expiry}
          </Text>
        </View>
        {/* The network mark: two overlapping discs. */}
        <View className="flex-row">
          <View className={cn('h-7 w-7 rounded-full opacity-70', tone.mark)} />
          <View className={cn('-ml-3 h-7 w-7 rounded-full opacity-35', tone.mark)} />
        </View>
      </View>
    </View>
  );
}

/**
 * The cards, one in front and the rest as strips above it.
 *
 * The front card is rendered last, so it is drawn over the strips and its
 * top edge covers all but `STRIP_HEIGHT` of the card before it. Reordering
 * the children is the whole selection: each card is a layout-animated view,
 * so the one that moves to the end springs down to the front and the others
 * close up behind it. Under reduced motion the order simply changes.
 */
function CardStack({
  cards,
  selectedId,
  frozen,
  onSelect,
}: {
  cards: PaymentCard[];
  selectedId: string;
  frozen: Record<string, boolean>;
  onSelect: (id: string) => void;
}) {
  const reducedMotion = useReducedMotion();
  const layout = reducedMotion
    ? undefined
    : LinearTransition.springify().damping(20).stiffness(160);
  const ordered = [
    ...cards.filter((card) => card.id !== selectedId),
    ...cards.filter((card) => card.id === selectedId),
  ];

  return (
    <View style={{ height: CARD_HEIGHT + STRIP_HEIGHT * (cards.length - 1) }}>
      {ordered.map((card, index) => {
        const selected = card.id === selectedId;
        return (
          <Animated.View
            key={card.id}
            layout={layout}
            style={{
              height: CARD_HEIGHT,
              marginTop: index === 0 ? 0 : STRIP_HEIGHT - CARD_HEIGHT,
            }}
          >
            <Pressable
              disabled={selected}
              onPress={() => onSelect(card.id)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityHint={selected ? undefined : 'Brings this card to the front'}
            >
              <CardFace card={card} frozen={Boolean(frozen[card.id])} />
            </Pressable>
          </Animated.View>
        );
      })}
    </View>
  );
}

/** A round action with its name under it. */
function Action({
  label,
  icon,
  onPress,
  disabled,
}: {
  label: string;
  icon: IconSvgElement;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <View className="flex-1 items-center gap-2">
      <Button
        variant="secondary"
        size="icon"
        className="h-14 w-14 rounded-full"
        accessibilityLabel={label}
        onPress={onPress}
        disabled={disabled}
      >
        <Glyph icon={icon} size={22} />
      </Button>
      <Text size="xs" weight="medium" muted>
        {label}
      </Text>
    </View>
  );
}

function TransactionRow({
  transaction,
  onSplit,
  onHide,
}: {
  transaction: Transaction;
  onSplit: () => void;
  onHide: () => void;
}) {
  const incoming = transaction.amount > 0;
  const canSplit = !incoming && !transaction.split;

  return (
    <Swipe contentClassName="bg-background">
      <Swipe.End>
        {canSplit ? (
          <Swipe.Action icon={<ReceiptIcon />} label="Split" color="info" onPress={onSplit} />
        ) : null}
        <Swipe.Action icon={<XIcon />} label="Hide" color="destructive" onPress={onHide} />
      </Swipe.End>
      <Item size="sm" className="px-0">
        <Item.Media>
          {transaction.initials ? (
            <Avatar fallback={transaction.initials} />
          ) : (
            <View className="h-10 w-10 items-center justify-center rounded-full bg-muted">
              {transaction.icon ? <Glyph icon={transaction.icon} size={18} /> : null}
            </View>
          )}
        </Item.Media>
        <Item.Content>
          <Item.Title>{transaction.title}</Item.Title>
          <Item.Description>
            {transaction.split ? `${transaction.detail} · split in two` : transaction.detail} ·{' '}
            {transaction.when}
          </Item.Description>
        </Item.Content>
        <Item.Actions>
          <Text weight="semibold" className={cn('tabular-nums', incoming && 'text-success')}>
            {money(transaction.amount, true)}
          </Text>
        </Item.Actions>
      </Item>
    </Swipe>
  );
}

/* -------------------------------------------------------------------------- */
/* Block                                                                      */
/* -------------------------------------------------------------------------- */

export interface WalletBlockProps {
  /** Shows a back button in the header and is called when it is pressed. */
  onBack?: () => void;
  className?: string;
}

export function WalletBlock({ onBack, className }: WalletBlockProps) {
  const insets = useSafeAreaInsets();
  const [cards, setCards] = useState(CARDS);
  const [selectedId, setSelectedId] = useState(CARDS[0]!.id);
  const [inspected, setInspected] = useState<AreaChartDatum | null>(null);
  const [frozen, setFrozen] = useState<Record<string, boolean>>({});
  const [range, setRange] = useState<Range>('month');
  const [transactions, setTransactions] = useState(TRANSACTIONS);
  const nextId = useRef(0);

  const card = cards.find((item) => item.id === selectedId) ?? cards[0]!;
  const isFrozen = Boolean(frozen[card.id]);
  const total = cards.reduce((sum, item) => sum + item.balance, 0);

  const data = useMemo(() => spending(card, range), [card, range]);
  const spent = Number(data[data.length - 1]?.spent ?? 0);
  const shown = inspected ? Number(inspected.spent) : spent;
  const rangeLabel = RANGES.find((item) => item.id === range)!;

  const move = (amount: number, entry: Omit<Transaction, 'id' | 'amount'>) => {
    setCards((current) =>
      current.map((item) =>
        item.id === card.id ? { ...item, balance: item.balance + amount } : item
      )
    );
    nextId.current += 1;
    setTransactions((current) => [{ ...entry, id: `new-${nextId.current}`, amount }, ...current]);
  };

  return (
    <View className={cn('flex-1 bg-background', className)}>
      <View style={{ paddingTop: insets.top + 8 }} className="px-5 pb-3">
        <View className="w-full max-w-xl flex-row items-center gap-3 self-center">
          {onBack ? (
            <Button
              variant="outline"
              size="icon"
              className="rounded-full"
              accessibilityLabel="Back"
              onPress={onBack}
            >
              <ChevronLeftIcon size={18} />
            </Button>
          ) : null}
          <View className="flex-1">
            <Text size="lg" weight="semibold">
              Wallet
            </Text>
            <Text size="sm" muted>
              {cards.length} cards
            </Text>
          </View>
          <Avatar fallback={HOLDER.initials} accessibilityLabel={HOLDER.name} />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        contentContainerClassName="px-5 pt-2"
      >
        <View className="w-full max-w-xl gap-7 self-center">
          {/* The total */}
          <View accessible accessibilityLabel={`Total balance ${money(total)}`} className="gap-1">
            <Text size="sm" muted>
              Total balance
            </Text>
            <View className="flex-row items-baseline">
              <Text weight="bold" className="text-4xl">
                €
              </Text>
              <TextAnimation.Sliding
                value={total}
                decimals={2}
                thousandSeparator=","
                textClassName="text-4xl font-bold"
              />
            </View>
            <Text size="sm" weight="medium" className="text-success">
              {money(IN_THIS_MONTH, true)} in this month
            </Text>
          </View>

          {/* The card in front is the one everything below acts on. */}
          <CardStack cards={cards} selectedId={card.id} frozen={frozen} onSelect={setSelectedId} />

          <View className="flex-row">
            <Action
              label="Top up"
              icon={MoneyReceive01Icon}
              disabled={isFrozen}
              onPress={() =>
                move(TOP_UP_AMOUNT, {
                  title: 'Top-up',
                  detail: 'From your bank',
                  when: 'Just now',
                  icon: BankIcon,
                })
              }
            />
            <Action
              label="Send"
              icon={MoneySend01Icon}
              disabled={isFrozen || card.balance < SEND_AMOUNT}
              onPress={() =>
                move(-SEND_AMOUNT, {
                  title: PAYEE.name,
                  detail: 'Sent',
                  when: 'Just now',
                  initials: PAYEE.initials,
                })
              }
            />
            <Action
              label={isFrozen ? 'Unfreeze' : 'Freeze'}
              icon={SnowIcon}
              onPress={() =>
                setFrozen((current) => ({
                  ...current,
                  [card.id]: !current[card.id],
                }))
              }
            />
          </View>

          {/* What the card in front has been spending, over the range picked above it */}
          <View className="gap-3">
            <Tabs
              defaultValue="month"
              value={range}
              onValueChange={(value) => {
                setInspected(null);
                setRange(value as Range);
              }}
            >
              <Tabs.List>
                {RANGES.map((item) => (
                  <Tabs.Trigger key={item.id} value={item.id}>
                    {item.label}
                  </Tabs.Trigger>
                ))}
              </Tabs.List>
            </Tabs>
            <Frame className="w-full">
              <Frame.Header>
                <Frame.Title>Spending · {card.name}</Frame.Title>
                <Frame.Action>Drag to inspect</Frame.Action>
              </Frame.Header>
              <Frame.Panel>
                <AreaChart
                  data={data}
                  xDataKey="label"
                  aspectRatio={1.9}
                  onActiveIndexChange={(_index, datum) => setInspected(datum)}
                >
                  <AreaChart.Header
                    className="px-4 pt-3.5"
                    value={money(shown)}
                    caption={inspected ? `${rangeLabel.by} ${inspected.label}` : rangeLabel.spent}
                  />
                  <AreaChart.Grid />
                  <AreaChart.Area dataKey="spent" />
                  <AreaChart.XAxis ticks={range === 'month' ? 5 : undefined} />
                  <AreaChart.Tooltip />
                </AreaChart>
              </Frame.Panel>
            </Frame>
          </View>

          {/* Everything, newest first */}
          <View className="gap-1">
            <Text size="sm" weight="semibold" muted>
              Recent activity
            </Text>
            <Swipe.Group>
              {transactions.map((transaction) => (
                <TransactionRow
                  key={transaction.id}
                  transaction={transaction}
                  onSplit={() =>
                    setTransactions((current) =>
                      current.map((row) =>
                        row.id === transaction.id
                          ? { ...row, amount: row.amount / 2, split: true }
                          : row
                      )
                    )
                  }
                  onHide={() =>
                    setTransactions((current) => current.filter((row) => row.id !== transaction.id))
                  }
                />
              ))}
            </Swipe.Group>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
