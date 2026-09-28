/**
 * The Panelside blocks — seven whole screens, one per full-page demo.
 *
 * Panelside owns the screen by definition: it wraps the app content in order
 * to push it, so there is nothing to render inline in a section between two
 * dividers. Every demo here is the full thing, and each draws its own way back
 * because the route gives it no header — and, on iOS, no back-swipe either,
 * since the system claims the same screen edge the panel opens from.
 *
 * All seven share one panel. What changes is the props on the root and what the
 * scene holds, which is the point worth showing: the anatomy does not change
 * when the behaviour does.
 */
import { useRef, useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import {
  AIInput,
  Avatar,
  BottomSheet,
  Button,
  Glass,
  Item,
  Marker,
  Menu,
  Message,
  MessageScroller,
  Panelside,
  Text,
  useIconColor,
  usePanelside,
  type PanelsideProps,
  type PanelsideSceneProps,
} from 'panelui-native';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react-native';
// Deep imports, not the barrel. The barrel is one module that re-exports
// every icon in the set, and Metro follows all of them — six thousand
// modules and seven megabytes of source, for the handful used here.
import BubbleChatIcon from '@hugeicons/core-free-icons/BubbleChatIcon';
import Cancel01Icon from '@hugeicons/core-free-icons/Cancel01Icon';
import Delete02Icon from '@hugeicons/core-free-icons/Delete02Icon';
import Image01Icon from '@hugeicons/core-free-icons/Image01Icon';
import Menu01Icon from '@hugeicons/core-free-icons/Menu01Icon';
import Mic01Icon from '@hugeicons/core-free-icons/Mic01Icon';
import Package01Icon from '@hugeicons/core-free-icons/Package01Icon';
import PencilEdit02Icon from '@hugeicons/core-free-icons/PencilEdit02Icon';
import PlusSignIcon from '@hugeicons/core-free-icons/PlusSignIcon';
import Share01Icon from '@hugeicons/core-free-icons/Share01Icon';
import SourceCodeIcon from '@hugeicons/core-free-icons/SourceCodeIcon';
import StarIcon from '@hugeicons/core-free-icons/StarIcon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCSSVariable } from 'uniwind';

/**
 * One glyph, drawn at the weight the panel's own chrome uses.
 *
 * Panelside tints whatever goes in an icon slot by providing a colour around
 * it, so the wrapper reads that and hands it down — the drawing component
 * underneath takes a colour and knows nothing about inheriting one.
 */
function Glyph({ icon, size = 20 }: { icon: IconSvgElement; size?: number }) {
  const color = useIconColor();
  return <HugeiconsIcon icon={icon} size={size} color={color ?? '#737373'} strokeWidth={1.8} />;
}

const NAV = [
  { id: 'chats', label: 'Chats', icon: <Glyph icon={BubbleChatIcon} /> },
  { id: 'projects', label: 'Projects', icon: <Glyph icon={Package01Icon} />, badge: 4 },
  { id: 'artifacts', label: 'Artifacts', icon: <Glyph icon={Image01Icon} /> },
  { id: 'code', label: 'Code', icon: <Glyph icon={SourceCodeIcon} /> },
];

const STARRED = [
  'Launch announcement thread',
  'Pricing page rewrite',
  'Onboarding email sequence',
];

const RECENTS = [
  'Migrating the design tokens',
  'Why is the bundle 4 MB',
  'Draft: quarterly retro notes',
  'Refactor the settings screen',
  'Copy for the empty states',
  'Comparing chart libraries',
  'Accessibility pass on forms',
  'Weekly standup summary',
];

/**
 * The panel, shared by every demo.
 *
 * `native` only reaches the controls that have a platform equivalent. There is
 * no native list row and no native search field, so the rest stays ours —
 * which is the honest answer rather than a half-native panel that matches
 * neither.
 *
 * Everything below that is not native is `outline`: a ring and no fill, so the
 * compose pill is the only filled thing in the panel and reads as the one
 * control the footer is for.
 */
function AssistantPanel({
  native = false,
  activeId,
  onSelect,
  routed = false,
  actions,
  starred = STARRED,
  recents = RECENTS,
  onSearch,
  onAccount,
}: {
  native?: boolean;
  /** The conversation currently open in the scene, if the demo tracks one. */
  activeId?: string;
  /** Given, every history row becomes a destination. */
  onSelect?: (title: string) => void;
  /** Given, the rows navigate through the panel's own route instead. */
  routed?: boolean;
  /** Given, every history row carries an overflow menu built from it. */
  actions?: (title: string) => ReactNode;
  starred?: readonly string[];
  recents?: readonly string[];
  /** Where the header's search button goes. */
  onSearch?: () => void;
  /** Where the footer's avatar goes. */
  onAccount?: () => void;
}) {
  const { setOpen } = usePanelside();

  // Selecting a destination closes the panel. Leaving it open would mean the
  // thing you just navigated to is behind the thing you navigated from. The
  // routed demo does not need this — `to` closes the panel itself.
  const select = onSelect
    ? (title: string) => {
        onSelect(title);
        setOpen(false);
      }
    : undefined;

  const control = native ? undefined : ('outline' as const);

  return (
    <Panelside.Panel>
      {/* The search button goes in the header's trailing slot. It draws the
          control and calls `onPress`; what opens is the app's to decide, so
          these demos leave it unwired. */}
      <Panelside.Header
        title="Assistant"
        action={
          <Panelside.SearchTrigger
            native={native}
            glass={native}
            variant={control}
            onPress={onSearch}
          />
        }
      />

      <Panelside.Content>
        <Panelside.Group>
          {NAV.map((item, index) => (
            <Panelside.Item
              key={item.id}
              icon={item.icon}
              label={item.label}
              badge={item.badge}
              active={index === 0}
            />
          ))}
        </Panelside.Group>

        {starred.length > 0 && (
          <Panelside.Group>
            <Panelside.GroupLabel>Starred</Panelside.GroupLabel>
            {/* No star glyph on the rows. The group label says Starred, and
                repeating it on every row underneath it spends the leading slot
                — the one place a row could carry something a reader does not
                already know — on saying the heading again. */}
            {starred.map((title) => (
              <Panelside.Item
                key={title}
                label={title}
                to={routed ? title : undefined}
                active={routed ? undefined : title === activeId}
                onPress={select && (() => select(title))}
              >
                {actions?.(title)}
              </Panelside.Item>
            ))}
          </Panelside.Group>
        )}

        {recents.length > 0 && (
          <Panelside.Group>
            <Panelside.GroupLabel>Recents</Panelside.GroupLabel>
            {recents.map((title) => (
              <Panelside.Item
                key={title}
                label={title}
                to={routed ? title : undefined}
                active={routed ? undefined : title === activeId}
                onPress={select && (() => select(title))}
              >
                {actions?.(title)}
              </Panelside.Item>
            ))}
          </Panelside.Group>
        )}

      </Panelside.Content>

      {/* Transparent: the history runs under the two controls rather than
          being cut off above a band, which is what makes the panel read as one
          surface with things floating on it. */}
      <Panelside.Footer>
        {/* The compose pill leads, and the account button is pushed to the
            trailing end by the spacer between them. No label on the account:
            the avatar is the account, and a name beside it is one more thing
            between the compose button and the edge of the panel.

            A size up under `native`. The platform's own metrics land the two
            controls a step smaller than ours do, which reads as the footer of
            a different panel than the one every other version has. */}
        <Panelside.Cta
          className="shrink-0"
          icon={<Glyph icon={PlusSignIcon} size={18} />}
          label="New chat"
          size={native ? 'xl' : 'default'}
          native={native}
          glass={native}
        />
        <View className="flex-1" />
        {native ? (
          /*
            The initial as a plain string, not an `Avatar` hosted inside the
            button.
            
            A string is the platform's own text: it needs no `RNHostView`, no
            measurement chain and no frame with room to spare, and the platform
            draws its glass around it the way it draws it around any other
            label. Hosting a React Native circle in there to get the same
            letter is the expensive way to arrive at what the platform already
            does — and it is the shape that has cost two crashes.
          */
          <Button
            native
            glass
            size="xl"
            variant="ghost"
            accessibilityLabel="Account"
            onPress={onAccount}
          >
            K
          </Button>
        ) : (
          /* The avatar itself, pressable. An avatar inside a button is two
             rings and two surfaces drawn around one face — the avatar already
             is the shape, and putting a control around it only says so twice.
             `shrink-0` because it has a fixed square to be, and the compose
             pill beside it is the thing that gives way. */
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Account"
            className="shrink-0"
            onPress={onAccount}
          >
            <Avatar size="md" fallback="K" />
          </Pressable>
        )}
      </Panelside.Footer>
    </Panelside.Panel>
  );
}

/**
 * The scene's top bar.
 *
 * Both controls are real `Button`s rather than bare glyphs — they sit on the
 * app's own surface with nothing around them, so they need a shape to be
 * findable at all. `Panelside.Trigger` takes the button as its child and
 * chains the toggle onto its own `onPress`, native or not.
 *
 * Ours are `outline`: a ring and no fill, which is enough to say "control"
 * without putting a second filled surface on a screen that already has the
 * panel's. A filled button here also competes with whatever the app itself
 * draws in its bar, which is the one thing a demo of a navigation frame should
 * not do.
 *
 * Under `native` the platform draws them and the variant has to change with
 * it. `ghost` maps onto the platform's *text* style, which is chromeless by
 * design and is what the Liquid Glass material wants to sit in — the material
 * is the chrome, and a border under it is a second edge.
 *
 * The colour is passed in by hand on both paths. A native button never reaches
 * the themed content colour a styled one applies around its child, and the
 * glyphs here are drawn by a component that takes a colour rather than
 * inheriting one — so neither half can be left to work it out.
 */
function SceneBar({ title, native = false }: { title: string; native?: boolean }) {
  const insets = useSafeAreaInsets();
  const { docked } = usePanelside();
  const tint = useCSSVariable('--color-foreground');
  const glyph = typeof tint === 'string' ? tint : undefined;

  const shape = native ? undefined : 'h-10 w-10 rounded-full';
  const variant = native ? 'ghost' : 'outline';

  return (
    <View
      style={{ paddingTop: insets.top + 8 }}
      className="flex-row items-center gap-2 px-3 pb-3"
    >
      <Panelside.Trigger>
        <Button
          native={native}
          glass={native}
          size="icon"
          variant={variant}
          className={shape}
          accessibilityLabel="Open navigation panel"
        >
          <HugeiconsIcon icon={Menu01Icon} size={20} color={glyph ?? '#737373'} strokeWidth={1.8} />
        </Button>
      </Panelside.Trigger>

      <Text
        size="lg"
        weight="semibold"
        numberOfLines={1}
        className={docked ? 'flex-1' : 'flex-1 text-center'}
      >
        {title}
      </Text>

      {/* The route hands a full-bleed demo the whole screen and turns the
          native back-swipe off with it, so the way out is this bar's to draw. */}
      <Button
        native={native}
        glass={native}
        size="icon"
        variant={variant}
        className={shape}
        accessibilityLabel="Close demo"
        onPress={() => router.back()}
      >
        <HugeiconsIcon icon={Cancel01Icon} size={18} color={glyph ?? '#737373'} strokeWidth={1.8} />
      </Button>
    </View>
  );
}

interface Turn {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

const THREAD: Turn[] = [
  { id: 't1', role: 'user', text: 'Where should the semantic colours live once the primitives move?' },
  {
    id: 't2',
    role: 'assistant',
    text: 'Keep the primitives in one file and derive every semantic name from them in a second. Nothing outside the theme should reference a primitive directly.',
  },
  { id: 't3', role: 'user', text: 'And the dark values?' },
  {
    id: 't4',
    role: 'assistant',
    text: 'Same names, resolved per theme. A component asks for the semantic token and never learns which theme answered.',
  },
  { id: 't5', role: 'user', text: 'What breaks if someone reaches past it?' },
  {
    id: 't6',
    role: 'assistant',
    text: 'Nothing visible, at first. Then a theme lands where that primitive means something else, and the component is the only thing on the screen still wearing last season.',
  },
];

/** One turn. Shared by the transcript demos. */
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

/** A short static transcript — enough scene to see the push against. */
function Transcript() {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 gap-3 px-4" style={{ paddingBottom: insets.bottom + 12 }}>
      {THREAD.slice(0, 4).map((turn) => (
        <Turn key={turn.id} turn={turn} />
      ))}
    </View>
  );
}

function AssistantDemo({
  sceneProps,
  scene,
  native = false,
  title = 'Migrating the design tokens',
  activeId,
  onSelect,
  routed,
  actions,
  starred,
  recents,
  ...props
}: Partial<PanelsideProps> & {
  sceneProps?: Partial<PanelsideSceneProps>;
  scene?: React.ReactNode;
  native?: boolean;
  title?: string;
  activeId?: string;
  onSelect?: (title: string) => void;
  routed?: boolean;
  actions?: (title: string) => ReactNode;
  starred?: readonly string[];
  recents?: readonly string[];
}) {
  return (
    // On in every demo: the swipe is the way this component is opened, and a
    // tick where it commits is what tells your thumb it took.
    <Panelside haptics {...props}>
      <AssistantPanel
        native={native}
        activeId={activeId}
        onSelect={onSelect}
        routed={routed}
        actions={actions}
        starred={starred}
        recents={recents}
      />
      <Panelside.Scene {...sceneProps}>
        <SceneBar title={title} native={native} />
        {scene ?? <Transcript />}
      </Panelside.Scene>
    </Panelside>
  );
}

/** The default shape: swipe from the edge, the screen slides and curves away. */
export function PanelsideAssistantBlock() {
  return <AssistantDemo title="Migrating the design tokens" />;
}

/** The same panel, sliding over a screen that stays exactly where it is. */
export function PanelsideOverlayBlock() {
  return <AssistantDemo mode="overlay" title="Why is the bundle 4 MB" />;
}

/**
 * Docking is a tablet layout, not a phone one: below about 700 points there is
 * no width that gives both a usable sidebar and a usable app. So this demo
 * says which side of the threshold the device is on, and rotating a phone is
 * enough to cross it.
 */
function DockedScene() {
  const { docked } = usePanelside();
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 gap-3 px-4" style={{ paddingBottom: insets.bottom + 12 }}>
      <View className="rounded-xl bg-secondary p-4">
        <Text weight="semibold">{docked ? 'Docked' : 'Not docked yet'}</Text>
        <Text size="sm" muted className="mt-1">
          {docked
            ? 'The panel is a column of this layout. It has no trigger, no gesture and no scrim, because there is nothing to open.'
            : 'Rotate the device. Past 700 points the panel stops being an overlay and takes a column of its own.'}
        </Text>
      </View>
      {THREAD.slice(0, 2).map((turn) => (
        <Turn key={turn.id} turn={turn} />
      ))}
    </View>
  );
}

/**
 * Docked past 700 points — the first width where a sidebar and an app both
 * have room. The trigger removes itself, since there is nothing to toggle.
 */
export function PanelsideDockedBlock() {
  return <AssistantDemo dock={700} title="Weekly standup summary" scene={<DockedScene />} />;
}

/**
 * The three scene numbers turned well past their defaults, so what they do is
 * unmistakable rather than a matter of opinion.
 */
export function PanelsideCurveBlock() {
  return (
    <AssistantDemo
      title="Copy for the empty states"
      sceneProps={{ scale: 0.72, radius: 44, dim: 0.7 }}
    />
  );
}

const REPLY =
  'Looking at it now. The token file resolves every semantic name per theme, so a component asking for the muted foreground gets the right value in all six without knowing any of them exist. The only rule is that nothing outside the theme reads a primitive.';

/** A full chat: streaming reply, scroll anchoring, and the panel over it all. */
function ChatScene() {
  const [turns, setTurns] = useState<Turn[]>(THREAD.slice(0, 4));
  const [streaming, setStreaming] = useState(false);
  const insets = useSafeAreaInsets();

  const send = () => {
    if (streaming) return;
    const askId = `ask-${Date.now()}`;
    const replyId = `reply-${Date.now()}`;
    setTurns((current) => [
      ...current,
      { id: askId, role: 'user', text: 'Show me how a theme resolves one token.' },
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
    }, 70);
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
                <Marker.Content shimmer>Thinking…</Marker.Content>
              </Marker>
            ) : null}
          </MessageScroller.Content>
        </MessageScroller.Viewport>
        <MessageScroller.Button />
      </MessageScroller>

      <View
        className="border-t border-border px-4 pt-3"
        style={{ paddingBottom: Math.max(insets.bottom, 12) }}
      >
        <Button onPress={send} loading={streaming} fullWidth>
          {streaming ? 'Streaming' : 'Send a message'}
        </Button>
      </View>
    </View>
  );
}

export function PanelsideChatBlock() {
  return <AssistantDemo scene={<ChatScene />} title="Theme tokens" />;
}

/**
 * The native version.
 *
 * Panelside itself has no `native` prop, and cannot: the platform toolkits
 * ship a switch, a picker, a sheet and a button, and none of them is a pushing
 * navigation panel. What goes native is what is inside it — the attachment
 * sheet is a real platform sheet, and the panel's compose button is a real
 * platform button.
 *
 * The transcript and the rows stay ours, because there is no platform control
 * for either. A screen that went half-native would match neither.
 *
 * The composer is `AIInput`, which is the component for this and hands its own
 * controls to the platform under `native`. It used to be a bare `TextInput` in
 * a rounded card with three buttons laid out beside it by hand — which is what
 * `AIInput` is, written out again badly: no growth to five lines, no voice
 * state on the submit button, and a placeholder colour read from a token here
 * because a raw field has none.
 */
function NativeChatScene() {
  const [turns, setTurns] = useState<Turn[]>(THREAD.slice(0, 2));
  const [draft, setDraft] = useState('');
  const [attaching, setAttaching] = useState(false);
  const insets = useSafeAreaInsets();
  const nextId = useRef(0);

  const send = (value: string) => {
    const text = value.trim();
    if (!text) return;
    nextId.current += 1;
    const id = nextId.current;
    // The composer does not clear itself — the app owns the value, and a
    // submit that failed should not have thrown the text away.
    setDraft('');
    setTurns((current) => [...current, { id: `u${id}`, role: 'user', text }]);
    setTimeout(() => {
      setTurns((current) => [
        ...current,
        {
          id: `a${id}`,
          role: 'assistant',
          text: 'Noted. Anything that reads a primitive directly is the thing to change first.',
        },
      ]);
    }, 700);
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
          </MessageScroller.Content>
        </MessageScroller.Viewport>
        <MessageScroller.Button />
      </MessageScroller>

      {/*
        The composer is `AIInput` under `native`, which hands the field's
        controls to the platform the same way the picker and the sheet above it
        are handed over.

        Written the way the composer's own chat version is written, down to the
        keyboard numbers: the composer owns lifting itself, and is told how far
        it already sits above the bottom so it does not travel that distance
        twice. Deviating from that shape is what broke it the first time.
      */}
      <View className="px-3 pt-2" style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
        <AIInput
          native
          value={draft}
          onValueChange={setDraft}
          onSubmit={send}
          keyboardBottomInset={Math.max(insets.bottom, 12)}
          keyboardGap={12}
        >
          <AIInput.Field placeholder="Message the assistant" />
          <AIInput.Toolbar>
            <AIInput.Action
              label="Attach"
              icon={<Glyph icon={PlusSignIcon} size={17} />}
              onPress={() => setAttaching(true)}
            />
            <AIInput.Spacer />
            <AIInput.Action label="Dictate" icon={<Glyph icon={Mic01Icon} size={15} />} />
            <AIInput.Submit />
          </AIInput.Toolbar>
        </AIInput>
      </View>

      {/* A real platform sheet, resting at half height. */}
      <BottomSheet native open={attaching} onOpenChange={setAttaching} snapPoints={['half']}>
        <BottomSheet.Content>
          <BottomSheet.Header title="Attach" description="Anything the assistant should read." />
          <BottomSheet.Body>
            {['Photo library', 'Files', 'Camera'].map((label) => (
              <Item key={label}>
                <Item.Content>
                  <Item.Title>{label}</Item.Title>
                </Item.Content>
              </Item>
            ))}
          </BottomSheet.Body>
        </BottomSheet.Content>
      </BottomSheet>
    </View>
  );
}

export function PanelsideNativeBlock() {
  return (
    <AssistantDemo native scene={<NativeChatScene />} title="Refactor the settings screen" />
  );
}

/**
 * One conversation, built from its own title so that opening a different row
 * visibly lands somewhere different. A transcript that is the same eight turns
 * whichever row you pressed proves the panel closed, and nothing about whether
 * anything was navigated to.
 */
function conversation(title: string): Turn[] {
  return [
    { id: `${title}-1`, role: 'user', text: `${title} — where did we leave this?` },
    {
      id: `${title}-2`,
      role: 'assistant',
      text: `Two things outstanding on “${title}”. The first is a decision, the second is only work.`,
    },
    { id: `${title}-3`, role: 'user', text: 'Which is the decision?' },
    {
      id: `${title}-4`,
      role: 'assistant',
      text: 'Whether it ships behind a flag. Everything after that follows from the answer, so it is the one worth spending the meeting on.',
    },
  ];
}

/** The scene for the navigable demo: whichever conversation is selected. */
function ConversationScene({ title }: { title: string }) {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 gap-3 px-4" style={{ paddingBottom: insets.bottom + 12 }}>
      {conversation(title).map((turn) => (
        <Turn key={turn.id} turn={turn} />
      ))}
    </View>
  );
}

const CONVERSATIONS = [...STARRED, ...RECENTS];

/**
 * The panel used as navigation rather than as a display: press a conversation
 * and the scene becomes that conversation, with the panel closing itself on
 * the way.
 *
 * The panel holds the route, so a row is a `to` and nothing else — no state
 * threaded through the list, no `active` computed per row, no closing written
 * out. The selected row stays marked from the same prop: a history list where
 * nothing is active tells you what you could open and never what you have
 * open, which is the question anyone opening the panel a second time is
 * asking.
 *
 * Each conversation is a `Panelside.Page`. The first press mounts one; every
 * press after that is a style change, so going back to a conversation you have
 * already read does not rebuild it.
 */
export function PanelsideNavigateBlock() {
  const [route, setRoute] = useState(CONVERSATIONS[0] as string);

  return (
    <AssistantDemo
      routed
      route={route}
      onRouteChange={setRoute}
      title={route}
      // A page for the compose pill to land on, too — the route it sets has
      // to be one of these or the scene shows nothing.
      scene={
        <Panelside.Pages>
          {['New chat', ...CONVERSATIONS].map((title) => (
            <Panelside.Page key={title} value={title}>
              <ConversationScene title={title} />
            </Panelside.Page>
          ))}
        </Panelside.Pages>
      }
    />
  );
}

/**
 * Every conversation carries a "…". The menu it opens renames, stars, shares
 * or deletes the row it belongs to, and the list changes underneath — a menu
 * whose rows only close it proves nothing about where the actions go.
 */
export function PanelsideActionsBlock() {
  const [starred, setStarred] = useState<readonly string[]>(STARRED);
  const [recents, setRecents] = useState<readonly string[]>(RECENTS);
  const [active, setActive] = useState(STARRED[0] as string);

  const rename = (title: string) => {
    const next = `${title} (renamed)`;
    const swap = (list: readonly string[]) =>
      list.map((entry) => (entry === title ? next : entry));
    setStarred(swap);
    setRecents(swap);
    setActive((current) => (current === title ? next : current));
  };

  const star = (title: string) => {
    if (starred.includes(title)) return;
    setStarred((list) => [...list, title]);
    setRecents((list) => list.filter((entry) => entry !== title));
  };

  const remove = (title: string) => {
    const drop = (list: readonly string[]) => list.filter((entry) => entry !== title);
    setStarred(drop);
    setRecents(drop);
  };

  return (
    <AssistantDemo
      title={active}
      activeId={active}
      onSelect={setActive}
      starred={starred}
      recents={recents}
      scene={<ConversationScene title={active} />}
      actions={(title) => (
        <Panelside.ItemActions>
          <Menu.Item icon={<Glyph icon={PencilEdit02Icon} size={17} />} onSelect={() => rename(title)}>
            Rename
          </Menu.Item>
          <Menu.Item icon={<Glyph icon={StarIcon} size={17} />} onSelect={() => star(title)}>
            Star
          </Menu.Item>
          <Menu.Item icon={<Glyph icon={Share01Icon} size={17} />}>Share</Menu.Item>
          <Menu.Separator />
          <Menu.Item
            variant="destructive"
            icon={<Glyph icon={Delete02Icon} size={17} />}
            onSelect={() => remove(title)}
          >
            Delete
          </Menu.Item>
        </Panelside.ItemActions>
      )}
    />
  );
}
