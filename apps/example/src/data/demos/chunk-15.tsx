import { useState } from "react";
import { FlatList, Image, ScrollView, SectionList, View } from "react-native";
import Animated, { interpolate, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { Avatar, Badge, BellIcon, BookmarkIcon, Button, ButtonGroup, CalendarIcon, ChevronLeftIcon, ChevronRightIcon, Chip, EllipsisIcon, GlobeIcon, Item, LinkIcon, PencilIcon, PlusIcon, ScrollHeader, SearchBar, SearchIcon, ShareNodesIcon, Tabs, Text } from "panelui-native";
import { useCSSVariable } from "uniwind";
import type { ComponentEntry } from '../component-types';

/*
 * The ScrollHeader versions.
 *
 * Each one is a different screen, and — this is the part that took a second
 * pass — a different *header*. A gallery where six versions share one bar and
 * one block demonstrates nothing except that the prop under test can be typed:
 * the only thing changing is the one thing the eye cannot pick out. So every
 * version below differs in what its bar carries, what its block holds, or what
 * it is drawn on, and the prop it exists for is the thing that difference is
 * built out of.
 *
 * They are also all long enough to scroll. A demo of a header that collapses
 * has to have somewhere to collapse to, and a screen of six rows never reaches
 * it — which is why `crossing` used to report a crossing that never happened.
 */

/** A tile colour per row, mixed from the theme so it moves with the palette. */
function useSeriesRamp() {
  const one = useCSSVariable('--color-chart-1');
  const two = useCSSVariable('--color-chart-2');
  const three = useCSSVariable('--color-chart-3');
  const four = useCSSVariable('--color-chart-4');
  const five = useCSSVariable('--color-chart-5');
  return [one, two, three, four, five].map((value) =>
    typeof value === 'string' ? value : '#6366f1'
  );
}

/**
 * A hand-written seed carried out to `count` rows.
 *
 * The demos need enough content to scroll well past the collapse, and writing
 * forty literal rows per version would be two thousand lines of fixture around
 * twelve lines of component. So each seed holds enough distinct entries to
 * read as real data and this repeats it, handing `build` the pass so the
 * fields that would give the repeat away — a date, a count, a price — can be
 * moved on.
 */
function repeat<T, U>(
  seed: readonly T[],
  count: number,
  build: (row: T, index: number, pass: number) => U
): U[] {
  return Array.from({ length: count }, (_, index) =>
    build(seed[index % seed.length], index, Math.floor(index / seed.length))
  );
}

/**
 * A stable scatter over `[0, span)`.
 *
 * Derived fields have to look like data rather than like a formula, and
 * `(index * k) % span` cannot: it is an arithmetic progression whatever `k`
 * is, so a column of prices comes out climbing in even steps. This mixes the
 * bits instead. It is a pure function of the index, so a fixture never changes
 * between renders and a screenshot taken twice is the same screenshot.
 */
function scatter(index: number, span: number) {
  let h = Math.imul(index + 1, 2654435761);
  h ^= h >>> 15;
  h = Math.imul(h, 2246822519);
  h ^= h >>> 13;
  return Math.abs(h) % span;
}

const TRACK_SEED = [
  { name: 'Weightless Halls', artist: 'Vela Sound', time: '4:12' },
  { name: 'Paper Harbour', artist: 'June Mould', time: '3:38' },
  { name: 'Long Wave', artist: 'Atlas Rooms', time: '5:04' },
  { name: 'Ninth Street', artist: 'Marisol Vane', time: '2:57' },
  { name: 'Slow Ascent', artist: 'Vela Sound', time: '6:21' },
  { name: 'Northerly', artist: 'Halden Pike', time: '3:11' },
  { name: 'Blue Hour', artist: 'June Mould', time: '4:45' },
  { name: 'Quiet Signal', artist: 'Atlas Rooms', time: '3:52' },
  { name: 'Copper Field', artist: 'Halden Pike', time: '5:30' },
  { name: 'Tideline', artist: 'Marisol Vane', time: '4:03' },
];

const TRACKS = repeat(TRACK_SEED, 40, (row, index, pass) => ({
  ...row,
  id: `t${index}`,
  name: pass === 0 ? row.name : `${row.name} (${['Live', 'Reprise', 'Demo'][pass - 1]})`,
  time: `${2 + scatter(index, 5)}:${String(scatter(index + 11, 60)).padStart(2, '0')}`,
}));

/**
 * The baseline: a large title, a count under it, one action on the bar. Every
 * default left alone, so the other eleven have something to differ from.
 */
function ScrollHeaderPlainVersion() {
  const ramp = useSeriesRamp();

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
        <ScrollHeader.Description>{TRACKS.length} songs · 2 hours 41 minutes</ScrollHeader.Description>
      </ScrollHeader.Large>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="gap-1 px-4 pb-16 pt-3">
          {TRACKS.map((track, index) => (
            <Item key={track.id} size="sm">
              <Item.Media variant="image" className="h-11 w-11">
                <View
                  className="h-full w-full"
                  style={{ backgroundColor: ramp[index % ramp.length] }}
                />
              </Item.Media>
              <Item.Content>
                <Item.Title numberOfLines={1}>{track.name}</Item.Title>
                <Item.Description>{track.artist}</Item.Description>
              </Item.Content>
              <Text size="sm" muted>
                {track.time}
              </Text>
            </Item>
          ))}
        </View>
      </ScrollView>
    </ScrollHeader>
  );
}

/** A landscape, so the cover has something worth stretching. */
const SCROLL_HEADER_COVER =
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1200&q=70';

const ALBUM_SEED = [
  'photo-1470071459604-3b5ec3a7fe05',
  'photo-1554080353-a576cf803bda',
  'photo-1441974231531-c6227db76b6e',
  'photo-1501854140801-50d01698950b',
  'photo-1426604966848-d7adac402bff',
  'photo-1472214103451-9374bd1c798e',
  'photo-1433086966358-54859d0ed716',
  'photo-1444927714506-8492d94b4e3d',
  'photo-1418065460487-3e41a6c84dc5',
  'photo-1470770841072-f978cf4d019e',
  'photo-1469474968028-56623f02e42e',
  'photo-1447752875215-b2761acb3c5d',
];

const ALBUM_FRAMES = repeat(ALBUM_SEED, 36, (frame, index) => ({ id: `f${index}`, frame }));

/**
 * A photograph in the band, and the bar drawn on nothing so it stays visible.
 * The cover has no height of its own, so pulling the grid down stretches the
 * picture rather than opening a gap above it.
 */
function ScrollHeaderCoverVersion() {
  return (
    <ScrollHeader className="flex-1 bg-background">
      <ScrollHeader.Cover source={{ uri: SCROLL_HEADER_COVER }} />

      {/* Over a photograph the glyphs need the title's colour too — a token
          foreground is near-black, which is invisible on a dark cover. */}
      <ScrollHeader.Bar surface="none" divider={false}>
        <Button variant="ghost" size="icon" accessibilityLabel="Back">
          <ChevronLeftIcon size={20} color="#fff" />
        </Button>
        <ScrollHeader.Title className="text-white">Sierra Nevada</ScrollHeader.Title>
        <ScrollHeader.Actions>
          <Button variant="ghost" size="icon" accessibilityLabel="Share">
            <ShareNodesIcon size={18} color="#fff" />
          </Button>
        </ScrollHeader.Actions>
      </ScrollHeader.Bar>

      {/* Tall enough to be a cover. The block's height is the band's, so this
          is where a photograph is given room rather than a prop on the cover. */}
      <ScrollHeader.Large className="h-56 justify-end pb-5">
        <ScrollHeader.Title className="text-white">Sierra Nevada</ScrollHeader.Title>
        <ScrollHeader.Description className="text-white/80">
          {ALBUM_FRAMES.length} photographs · September
        </ScrollHeader.Description>
      </ScrollHeader.Large>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* A grid, not rows — a screen of pictures should not look like a
            screen of text with pictures attached. */}
        <View className="flex-row flex-wrap gap-1 p-1 pb-16">
          {ALBUM_FRAMES.map((tile) => (
            <View
              key={tile.id}
              className="aspect-square flex-1 basis-[31%] overflow-hidden rounded-md bg-muted"
            >
              <Image
                source={{
                  uri: `https://images.unsplash.com/${tile.frame}?auto=format&fit=crop&w=400&q=60`,
                }}
                resizeMode="cover"
                className="h-full w-full"
              />
            </View>
          ))}
        </View>
      </ScrollView>
    </ScrollHeader>
  );
}

const MESSAGE_SEED = [
  { from: 'Ada Whitfield', initials: 'AW', subject: 'Re: quarterly figures' },
  { from: 'Tobias Lund', initials: 'TL', subject: 'Draft for Thursday' },
  { from: 'Priya Raman', initials: 'PR', subject: 'Studio visit next week?' },
  { from: 'Marcus Feld', initials: 'MF', subject: 'Invoice 2261' },
  { from: 'Ines Carvalho', initials: 'IC', subject: 'Photos from the coast' },
  { from: 'Jonas Kerr', initials: 'JK', subject: 'Rescheduling' },
  { from: 'Greta Lindqvist', initials: 'GL', subject: 'The east stair drawing' },
  { from: 'Hugo Bellamy', initials: 'HB', subject: 'Signed and returned' },
  { from: 'Nadia Haddad', initials: 'NH', subject: 'One more thing' },
  { from: 'Soren Dahl', initials: 'SD', subject: 'Tender pack, revised' },
];

const WHEN = ['09:41', '08:02', 'Yesterday', 'Tuesday', 'Monday', '28 Aug', '21 Aug', '14 Aug'];

const MESSAGES = repeat(MESSAGE_SEED, 40, (row, index, pass) => ({
  ...row,
  id: `m${index}`,
  subject: pass === 0 ? row.subject : `Re: ${row.subject}`,
  time: WHEN[Math.min(WHEN.length - 1, Math.floor(index / 5))],
}));

/**
 * A control inside the block, which is what makes the block tall. `threshold`
 * finishes the crossing at 60% of that height, so the bar has taken over
 * before the field is scrolled out from under the finger.
 */
function ScrollHeaderSearchVersion() {
  const [query, setQuery] = useState('');
  const rows = MESSAGES.filter((message) =>
    `${message.from} ${message.subject}`.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <ScrollHeader className="flex-1 bg-background" threshold={0.6}>
      <ScrollHeader.Bar>
        <ScrollHeader.Title>Inbox</ScrollHeader.Title>
      </ScrollHeader.Bar>

      <ScrollHeader.Large className="pb-4">
        <ScrollHeader.Title>Inbox</ScrollHeader.Title>
        <ScrollHeader.Description>{rows.length} of {MESSAGES.length}</ScrollHeader.Description>
        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder="Search mail"
          className="mt-2"
        />
      </ScrollHeader.Large>

      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View className="gap-1 px-4 pb-16 pt-3">
          {rows.map((message) => (
            <Item key={message.id} size="sm">
              <Item.Media>
                <Avatar size="sm" fallback={message.initials} />
              </Item.Media>
              <Item.Content>
                <Item.Title>{message.from}</Item.Title>
                <Item.Description numberOfLines={1}>{message.subject}</Item.Description>
              </Item.Content>
              <Text size="xs" muted>
                {message.time}
              </Text>
            </Item>
          ))}
        </View>
      </ScrollView>
    </ScrollHeader>
  );
}

const HOLDING_SEED = [
  { ticker: 'ARLO', name: 'Arlo Materials' },
  { ticker: 'NVEC', name: 'Novec Systems' },
  { ticker: 'KLDR', name: 'Kelder Group' },
  { ticker: 'BRWN', name: 'Brunwick Rail' },
  { ticker: 'SOLT', name: 'Soltera Energy' },
  { ticker: 'MRDN', name: 'Meridian Foods' },
  { ticker: 'HALV', name: 'Halvorsen Marine' },
  { ticker: 'PTRA', name: 'Petra Instruments' },
  { ticker: 'CYGN', name: 'Cygnet Media' },
  { ticker: 'ODRA', name: 'Odra Chemical' },
];

const HOLDINGS = repeat(HOLDING_SEED, 40, (row, index, pass) => {
  const move = (scatter(index + 7, 90) - 45) / 10;
  return {
    ...row,
    id: `h${index}`,
    ticker: pass === 0 ? row.ticker : `${row.ticker}.${['L', 'DE', 'PA'][pass - 1]}`,
    price: (40 + scatter(index, 1800) / 10).toFixed(2),
    change: `${move >= 0 ? '+' : ''}${move.toFixed(1)}%`,
    up: move >= 0,
  };
});

/**
 * A screen whose title is a figure rather than a name, and a bar that gains
 * something at the crossing. `onCollapsedChange` fires once each way, so the
 * day's change can appear beside the small title without a per-frame render.
 */
function ScrollHeaderCrossingVersion() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <ScrollHeader className="flex-1 bg-background" onCollapsedChange={setCollapsed}>
      <ScrollHeader.Bar>
        <ScrollHeader.Title>Portfolio</ScrollHeader.Title>
        <ScrollHeader.Actions>
          {collapsed ? <Badge variant="success">+2.4%</Badge> : null}
        </ScrollHeader.Actions>
      </ScrollHeader.Bar>

      <ScrollHeader.Large>
        <ScrollHeader.Title>$48,210.55</ScrollHeader.Title>
        <ScrollHeader.Description>Portfolio · +2.4% today</ScrollHeader.Description>
      </ScrollHeader.Large>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="gap-1 px-4 pb-16 pt-3">
          {HOLDINGS.map((holding) => (
            <Item key={holding.id} size="sm">
              <Item.Content>
                <Item.Title>{holding.ticker}</Item.Title>
                <Item.Description>{holding.name}</Item.Description>
              </Item.Content>
              <View className="items-end gap-0.5">
                <Text size="sm" weight="medium">
                  {holding.price}
                </Text>
                <Text size="xs" className={holding.up ? 'text-success' : 'text-destructive'}>
                  {holding.change}
                </Text>
              </View>
            </Item>
          ))}
        </View>
      </ScrollView>
    </ScrollHeader>
  );
}

const SETTINGS_SEED = [
  { label: 'Notifications', value: 'On', icon: <BellIcon size={16} /> },
  { label: 'Appearance', value: 'Dark', icon: <GlobeIcon size={16} /> },
  { label: 'Calendar', value: '3 accounts', icon: <CalendarIcon size={16} /> },
  { label: 'Saved items', value: '128', icon: <BookmarkIcon size={16} /> },
  { label: 'Linked apps', value: '6', icon: <LinkIcon size={16} /> },
  { label: 'Signature', value: 'Edited', icon: <PencilIcon size={16} /> },
  { label: 'Downloads', value: 'Wi-Fi only', icon: <BookmarkIcon size={16} /> },
  { label: 'Language', value: 'English (UK)', icon: <GlobeIcon size={16} /> },
];

const SECTION_NAMES = ['General', 'Content', 'Privacy', 'Sync', 'Advanced'];

const SETTINGS_ROWS = repeat(SETTINGS_SEED, 40, (row, index, pass) => ({
  ...row,
  id: `s${index}`,
  label: pass === 0 ? row.label : `${row.label} · ${SECTION_NAMES[pass]}`,
}));

/**
 * No block at all, so there is no handover to make: the bar is the only title
 * the screen has and it is there from the first frame. The scroller is an
 * `Animated.ScrollView` the demo animated itself, which is used as it stands
 * rather than wrapped a second time.
 */
function ScrollHeaderBarOnlyVersion() {
  return (
    <ScrollHeader className="flex-1 bg-background">
      <ScrollHeader.Bar surface="muted">
        <Button variant="ghost" size="icon" accessibilityLabel="Back">
          <ChevronLeftIcon size={20} />
        </Button>
        <ScrollHeader.Title>Settings</ScrollHeader.Title>
        <ScrollHeader.Actions>
          <Button variant="ghost" size="icon" accessibilityLabel="More">
            <EllipsisIcon size={18} />
          </Button>
        </ScrollHeader.Actions>
      </ScrollHeader.Bar>

      <Animated.ScrollView showsVerticalScrollIndicator={false}>
        <View className="gap-1 px-4 pb-16 pt-3">
          {SETTINGS_ROWS.map((row) => (
            <Item key={row.id} size="sm" variant="muted">
              <Item.Media variant="icon" className="h-8 w-8 items-center justify-center">
                {row.icon}
              </Item.Media>
              <Item.Content>
                <Item.Title numberOfLines={1}>{row.label}</Item.Title>
              </Item.Content>
              <Text size="sm" muted>
                {row.value}
              </Text>
              <ChevronRightIcon size={16} />
            </Item>
          ))}
        </View>
      </Animated.ScrollView>
    </ScrollHeader>
  );
}

const POST_SEED = [
  { title: 'The bridge reopened after eleven years', group: 'r/infrastructure' },
  { title: 'A field guide to reading a tide table', group: 'r/sailing' },
  { title: 'What happened to the third terminal?', group: 'r/aviation' },
  { title: 'Sourdough at 2,400 metres', group: 'r/baking' },
  { title: 'The quietest carriage on the network', group: 'r/trains' },
  { title: 'Mapping every public staircase in the city', group: 'r/urbanism' },
  { title: 'Why the harbour clock is four minutes fast', group: 'r/horology' },
  { title: 'Twelve years of rainfall, one chart', group: 'r/dataisbeautiful' },
];

const POSTS = repeat(POST_SEED, 24, (row, index) => ({
  ...row,
  id: `p${index}`,
  votes: `${(0.4 + scatter(index, 52) / 10).toFixed(1)}k`,
  comments: 18 + scatter(index + 3, 420),
}));

/**
 * A bar with two rows in it: the identity and its actions, and the navigation
 * under them. Both survive the collapse, because everything in the bar is
 * pinned — `barHeight` is what makes room for the second row.
 */
function ScrollHeaderTabsVersion() {
  const [tab, setTab] = useState('posts');
  const rows = tab === 'posts' ? POSTS : POSTS.slice(0, tab === 'comments' ? 18 : 12);

  return (
    <ScrollHeader className="flex-1 bg-background" barHeight={94}>
      <ScrollHeader.Bar className="flex-col items-stretch gap-0 px-0">
        <View className="h-12 flex-row items-center gap-3 px-4">
          <ScrollHeader.Title>u/economist</ScrollHeader.Title>
          {/* Grouped on one surface rather than spaced across the bar: three
              glyphs in a row read as one control, not three decisions. */}
          <ScrollHeader.Actions className="rounded-full bg-card px-1">
            <Button variant="ghost" size="icon" accessibilityLabel="Create">
              <PlusIcon size={18} />
            </Button>
            <Button variant="ghost" size="icon" accessibilityLabel="Search">
              <SearchIcon size={18} />
            </Button>
            <Button variant="ghost" size="icon" accessibilityLabel="Share">
              <ShareNodesIcon size={18} />
            </Button>
          </ScrollHeader.Actions>
        </View>

        <Tabs value={tab} onValueChange={setTab} defaultValue="posts" variant="underline">
          <Tabs.List className="px-4">
            <Tabs.Trigger value="posts">Posts</Tabs.Trigger>
            <Tabs.Trigger value="comments">Comments</Tabs.Trigger>
            <Tabs.Trigger value="saved">Saved</Tabs.Trigger>
          </Tabs.List>
        </Tabs>
      </ScrollHeader.Bar>

      <ScrollHeader.Large>
        <ScrollHeader.Title>Economist</ScrollHeader.Title>
        <ScrollHeader.Description>Joined 2019 · 12.4k karma</ScrollHeader.Description>
      </ScrollHeader.Large>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="gap-2 px-4 pb-16 pt-3">
          {rows.map((post) => (
            <View key={post.id} className="gap-1.5 border-b border-border pb-3">
              <Text size="xs" muted>
                {post.group}
              </Text>
              <Text weight="medium">{post.title}</Text>
              <Text size="xs" muted>
                {post.votes} upvotes · {post.comments} comments
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </ScrollHeader>
  );
}

const RELEASE_SEED = [
  { name: 'Harbour Lights', artist: 'Vela Sound', year: '2021' },
  { name: 'Cold Open', artist: 'Atlas Rooms', year: '2019' },
  { name: 'A Slower Country', artist: 'June Mould', year: '2023' },
  { name: 'Ninth Street Sessions', artist: 'Marisol Vane', year: '2018' },
  { name: 'Every Window Lit', artist: 'Halden Pike', year: '2022' },
  { name: 'Signal Hill', artist: 'Vela Sound', year: '2016' },
  { name: 'Paper Weather', artist: 'June Mould', year: '2020' },
  { name: 'The Long Room', artist: 'Atlas Rooms', year: '2024' },
];

const RELEASES = repeat(RELEASE_SEED, 40, (row, index, pass) => ({
  ...row,
  id: `r${index}`,
  name: pass === 0 ? row.name : `${row.name} — ${['Remastered', 'Deluxe', 'Live', 'Instrumental'][pass - 1]}`,
  tracks: 7 + scatter(index, 12),
}));

/**
 * The bar frosted rather than filled. Saturated artwork keeps moving under it
 * as shape and colour instead of disappearing behind a panel, which is the
 * case the material exists for.
 *
 * `expo-blur` is installed in this app, so this is the frosted path. In a
 * project without it, or with Reduce Transparency on, the same bar draws the
 * plain background token.
 */
function ScrollHeaderBlurVersion() {
  const ramp = useSeriesRamp();

  return (
    <ScrollHeader className="flex-1 bg-background">
      <ScrollHeader.Bar surface="blur" divider={false}>
        <ScrollHeader.Title>Releases</ScrollHeader.Title>
        <ScrollHeader.Actions>
          <Button variant="ghost" size="icon" accessibilityLabel="Shuffle">
            <SearchIcon size={18} />
          </Button>
        </ScrollHeader.Actions>
      </ScrollHeader.Bar>

      <ScrollHeader.Large>
        <ScrollHeader.Title>Releases</ScrollHeader.Title>
        <ScrollHeader.Description>{RELEASES.length} albums · every label</ScrollHeader.Description>
      </ScrollHeader.Large>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="gap-2 px-4 pb-16 pt-3">
          {RELEASES.map((release, index) => (
            <View key={release.id} className="flex-row items-center gap-3">
              {/* Big and fully saturated on purpose: a frost over grey rows is
                  indistinguishable from an opaque bar. */}
              <View
                className="h-16 w-16 rounded-lg"
                style={{ backgroundColor: ramp[index % ramp.length] }}
              />
              <View className="flex-1 gap-0.5">
                <Text weight="medium" numberOfLines={1}>
                  {release.name}
                </Text>
                <Text size="sm" muted>
                  {release.artist} · {release.year}
                </Text>
                <Text size="xs" muted>
                  {release.tracks} tracks
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </ScrollHeader>
  );
}

const CONTACT_NAMES = [
  'Ada Whitfield', 'Bruno Sasaki', 'Camille Duforest', 'Dmitri Volkov', 'Elena Marsh',
  'Farid Nazari', 'Greta Lindqvist', 'Hugo Bellamy', 'Imani Osei', 'Jonas Kerr',
  'Kiara Ndlovu', 'Lars Petersen', 'Marisol Vane', 'Nadia Haddad', 'Otto Brenner',
  'Priya Raman', 'Quentin Roche', 'Rosa Iglesias', 'Soren Dahl', 'Tabitha Cole',
  'Ulises Marin', 'Vera Kaminski', 'Wren Ashby', 'Xiulan Chen', 'Yusuf Demir',
  'Zofia Nowak', 'Anders Holm', 'Beatriz Rocha', 'Callum Findlay', 'Delphine Roux',
];

const CONTACT_GROUPS = ['All', 'Work', 'Family'] as const;

/** The same names four times over, so recycling has something to recycle. */
const CONTACTS = repeat(CONTACT_NAMES, 120, (name, index) => ({
  id: `c${index}`,
  name,
  group: CONTACT_GROUPS[index % CONTACT_GROUPS.length],
  initials: name.split(' ').map((part) => part[0]).join(''),
  handle: `@${name.split(' ')[0].toLowerCase()}${index > 29 ? index : ''}`,
}));

/**
 * A centred title between a leading chevron and a trailing action, over a
 * block whose second line is a row of filters rather than a count. The
 * scroller is a real `FlatList` of 120 rows, which is where the snap at the
 * end of a fling is worth watching.
 */
function ScrollHeaderListVersion() {
  const [group, setGroup] = useState<(typeof CONTACT_GROUPS)[number]>('All');
  const rows = group === 'All' ? CONTACTS : CONTACTS.filter((row) => row.group === group);

  return (
    <ScrollHeader className="flex-1 bg-background">
      <ScrollHeader.Bar>
        <Button variant="ghost" size="icon" accessibilityLabel="Back">
          <ChevronLeftIcon size={20} />
        </Button>
        {/* Centred rather than leading, which needs the two ends to balance —
            one control on each side, both the same width. */}
        <ScrollHeader.Title className="text-center">Contacts</ScrollHeader.Title>
        <ScrollHeader.Actions>
          <Button variant="ghost" size="icon" accessibilityLabel="Add contact">
            <PlusIcon size={18} />
          </Button>
        </ScrollHeader.Actions>
      </ScrollHeader.Bar>

      <ScrollHeader.Large className="pb-3">
        <ScrollHeader.Title>Contacts</ScrollHeader.Title>
        <View className="mt-1 flex-row gap-2">
          {CONTACT_GROUPS.map((name) => (
            <Chip key={name} selected={group === name} onPress={() => setGroup(name)}>
              {name}
            </Chip>
          ))}
        </View>
      </ScrollHeader.Large>

      <FlatList
        data={rows}
        keyExtractor={(row) => row.id}
        showsVerticalScrollIndicator={false}
        // Top padding of our own is added to the header's inset rather than
        // replacing it, so this is the gap under the band and nothing else.
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 64 }}
        renderItem={({ item }) => (
          <Item size="sm">
            <Item.Media>
              <Avatar size="sm" fallback={item.initials} />
            </Item.Media>
            <Item.Content>
              <Item.Title>{item.name}</Item.Title>
            </Item.Content>
            <Text size="sm" muted>
              {item.handle}
            </Text>
          </Item>
        )}
      />
    </ScrollHeader>
  );
}

const GROUP_SEED = [
  { label: 'Profile', value: 'Public', icon: <GlobeIcon size={16} /> },
  { label: 'Notifications', value: 'On', icon: <BellIcon size={16} /> },
  { label: 'Saved', value: '128', icon: <BookmarkIcon size={16} /> },
  { label: 'Drafts', value: '4', icon: <PencilIcon size={16} /> },
  { label: 'Calendar', value: '3 accounts', icon: <CalendarIcon size={16} /> },
  { label: 'Linked apps', value: '6', icon: <LinkIcon size={16} /> },
  { label: 'Shared with', value: '12 people', icon: <ShareNodesIcon size={16} /> },
];

const SETTINGS_SECTIONS = ['Account', 'Content', 'Connections', 'Privacy', 'Sync', 'Advanced'].map(
  (title, section) => ({
    title,
    data: GROUP_SEED.map((row, index) => ({
      ...row,
      id: `g${section}-${index}`,
    })),
  })
);

/**
 * The grouped-preferences look: the bar drawn on the card token with no
 * hairline, so the header and the rows read as one surface. Section headers
 * travel with the rows — a sticky one pins to the top of the scroller, which
 * is behind the band.
 */
function ScrollHeaderGroupedVersion() {
  return (
    <ScrollHeader className="flex-1 bg-background">
      <ScrollHeader.Bar surface="muted" divider={false}>
        <ScrollHeader.Title>Preferences</ScrollHeader.Title>
      </ScrollHeader.Bar>

      <ScrollHeader.Large>
        <ScrollHeader.Title>Preferences</ScrollHeader.Title>
        <ScrollHeader.Description>{SETTINGS_SECTIONS.length} groups</ScrollHeader.Description>
      </ScrollHeader.Large>

      <SectionList
        sections={SETTINGS_SECTIONS}
        keyExtractor={(row) => row.id}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 64 }}
        renderSectionHeader={({ section }) => (
          <Text size="xs" weight="semibold" muted className="pb-1 pt-4 uppercase">
            {section.title}
          </Text>
        )}
        renderItem={({ item }) => (
          <Item size="sm" variant="muted" className="mb-1">
            <Item.Media variant="icon" className="h-8 w-8 items-center justify-center">
              {item.icon}
            </Item.Media>
            <Item.Content>
              <Item.Title>{item.label}</Item.Title>
            </Item.Content>
            <Text size="sm" muted>
              {item.value}
            </Text>
          </Item>
        )}
      />
    </ScrollHeader>
  );
}

const DRAFT_SEED = [
  { subject: 'Re: studio visit', preview: 'Thursday works, though I would need to leave by four…' },
  { subject: 'Notes from the site walk', preview: 'The east stair is narrower than the drawing says.' },
  { subject: 'Invoice query', preview: 'Attaching the revised schedule of rates.' },
  { subject: '(no subject)', preview: 'Just checking you got the' },
  { subject: 'Coast photographs', preview: 'Picked fourteen of them. The light on the second morning…' },
  { subject: 'Re: quarterly figures', preview: 'The variance is in the third column, not the second.' },
  { subject: 'Handover, part two', preview: 'The keys are with the office until Friday afternoon.' },
  { subject: 'Re: drainage strategy', preview: 'They want the calculations resubmitted with the survey.' },
];

const DRAFTS = repeat(DRAFT_SEED, 36, (row, index, pass) => ({
  ...row,
  id: `d${index}`,
  subject: pass === 0 ? row.subject : `${row.subject} (${pass + 1})`,
  time: index < 4 ? `${9 + index}:${String(10 + index * 7).padStart(2, '0')}` : `${28 - index} Aug`,
}));

/**
 * A bar with nothing on it but the title, because the thing that moves is
 * outside the header. `progress` mirrors the transition into a shared value,
 * so a compose button the header knows nothing about arrives at the pace the
 * large title leaves at.
 */
function ScrollHeaderBorrowedVersion() {
  const collapse = useSharedValue(0);
  const [collapsed, setCollapsed] = useState(false);

  const pill = useAnimatedStyle(() => ({
    opacity: collapse.value,
    transform: [{ translateY: interpolate(collapse.value, [0, 1], [16, 0], 'clamp') }],
  }));

  return (
    <View className="flex-1">
      <ScrollHeader
        className="flex-1 bg-background"
        progress={collapse}
        onCollapsedChange={setCollapsed}
      >
        {/* No hairline and no actions: everything this version has to show is
            outside the header, and a bar with furniture on it would compete. */}
        <ScrollHeader.Bar divider={false}>
          <ScrollHeader.Title>Drafts</ScrollHeader.Title>
        </ScrollHeader.Bar>

        <ScrollHeader.Large>
          <ScrollHeader.Title>Drafts</ScrollHeader.Title>
          <ScrollHeader.Description>{DRAFTS.length} unsent</ScrollHeader.Description>
        </ScrollHeader.Large>

        <ScrollView showsVerticalScrollIndicator={false}>
          <View className="gap-3 px-4 pb-24 pt-3">
            {DRAFTS.map((draft) => (
              <View key={draft.id} className="gap-1 border-b border-border pb-3">
                <View className="flex-row items-baseline justify-between gap-3">
                  <Text weight="medium" numberOfLines={1} className="flex-1">
                    {draft.subject}
                  </Text>
                  <Text size="xs" muted>
                    {draft.time}
                  </Text>
                </View>
                <Text size="sm" muted numberOfLines={1}>
                  {draft.preview}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </ScrollHeader>

      {/*
        Outside the header entirely, and driven by both of its signals, which
        is the difference between them: `progress` is the per-frame value the
        pill moves and fades on, and `onCollapsedChange` is the crossing that
        says it has arrived.

        Both are needed. Opacity only decides what is drawn — a pill faded to
        nothing still takes touches and is still read out — so the arrival is
        what gates the button rather than the fade.
      */}
      <Animated.View
        pointerEvents={collapsed ? 'box-none' : 'none'}
        accessibilityElementsHidden={!collapsed}
        importantForAccessibility={collapsed ? 'auto' : 'no-hide-descendants'}
        style={pill}
        className="absolute bottom-8 end-4"
      >
        <Button size="sm" onPress={() => {}}>
          New draft
        </Button>
      </Animated.View>
    </View>
  );
}

const PLAYLIST_SEED = [
  'Morning, slowly', 'Long drives', 'Rain on glass', 'Kitchen radio', 'Late desk',
  'Anything but this', 'Two-hour commute', 'Washing up', 'Reading weather', 'Second coffee',
  'Walk to the station', 'Nothing with words',
];

const PLAYLISTS = repeat(PLAYLIST_SEED, 36, (name, index, pass) => ({
  id: `l${index}`,
  name: pass === 0 ? name : `${name} ${pass + 1}`,
  count: 14 + scatter(index, 148),
}));

const PLAYLIST_VIEWS = ['Recent', 'A–Z', 'Length'] as const;

/**
 * A gradient where a picture would go, mixed from the theme's own series
 * tokens. `stretch={false}` holds the band at its resting height, so an
 * over-scroll leaves the ramp exactly where it is — a photograph gains from
 * being pulled taller and a two-stop gradient does not.
 *
 * The bar carries a segmented control instead of a title: with the block's
 * title gone there is still something worth pinning.
 */
function ScrollHeaderGradientVersion() {
  const ramp = useSeriesRamp();
  const cover: [string, string] = [ramp[2], ramp[3]];
  const [view, setView] = useState<(typeof PLAYLIST_VIEWS)[number]>('Recent');

  const sorted =
    view === 'A–Z'
      ? [...PLAYLISTS].sort((a, b) => a.name.localeCompare(b.name))
      : view === 'Length'
        ? [...PLAYLISTS].sort((a, b) => b.count - a.count)
        : PLAYLISTS;

  return (
    <ScrollHeader className="flex-1 bg-background" stretch={false}>
      <ScrollHeader.Cover colors={cover} scrim={false} />

      <ScrollHeader.Bar surface="none" divider={false}>
        <ButtonGroup size="sm" className="mx-auto">
          {PLAYLIST_VIEWS.map((name) => (
            <Button
              key={name}
              variant={view === name ? 'secondary' : 'ghost'}
              onPress={() => setView(name)}
            >
              {name}
            </Button>
          ))}
        </ButtonGroup>
      </ScrollHeader.Bar>

      <ScrollHeader.Large className="h-40 justify-end pb-5">
        <ScrollHeader.Title className="text-white">Playlists</ScrollHeader.Title>
        <ScrollHeader.Description className="text-white/80">Made for you</ScrollHeader.Description>
      </ScrollHeader.Large>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="gap-1 px-4 pb-16 pt-3">
          {sorted.map((playlist, index) => (
            <Item key={playlist.id} size="sm">
              <Item.Media variant="image" className="h-12 w-12">
                <View
                  className="h-full w-full"
                  style={{ backgroundColor: ramp[index % ramp.length] }}
                />
              </Item.Media>
              <Item.Content>
                <Item.Title>{playlist.name}</Item.Title>
                <Item.Description>{playlist.count} songs</Item.Description>
              </Item.Content>
              <ChevronRightIcon size={16} />
            </Item>
          ))}
        </View>
      </ScrollView>
    </ScrollHeader>
  );
}

const ARCHIVE_SEED = [
  'Site survey, east elevation', 'Planning correspondence', 'Structural calculations v4',
  'Tender returns', 'Soil report', 'Access statement', 'Drainage strategy',
  'Party wall notices', 'Contractor prequalification', 'Insurance certificates',
  'Asbestos survey', 'Boundary agreement',
];

const MONTHS = ['Aug', 'Jul', 'Jun', 'May', 'Apr', 'Mar'];

const ARCHIVE = repeat(ARCHIVE_SEED, 40, (label, index, pass) => ({
  id: `a${index}`,
  label: pass === 0 ? label : `${label}, rev ${pass}`,
  date: `${String(1 + scatter(index, 28)).padStart(2, '0')} ${MONTHS[Math.floor(index / 7) % MONTHS.length]}`,
}));

/**
 * Nothing settles the band. With `snap={false}` a part-scrolled header stays
 * exactly where the finger let go instead of running to whichever end is
 * nearer, which is what a screen wants when the block is reference material
 * rather than a title.
 */
function ScrollHeaderLooseVersion() {
  return (
    <ScrollHeader className="flex-1 bg-background" snap={false}>
      <ScrollHeader.Bar>
        <ScrollHeader.Title>Archive</ScrollHeader.Title>
        <ScrollHeader.Actions>
          {/* A count rather than a control: the bar says how much is below it
              the whole way down, which is the reason to leave it part-open. */}
          <Badge variant="secondary">{ARCHIVE.length}</Badge>
          <Button variant="ghost" size="icon" accessibilityLabel="Filter">
            <EllipsisIcon size={18} />
          </Button>
        </ScrollHeader.Actions>
      </ScrollHeader.Bar>

      <ScrollHeader.Large>
        <ScrollHeader.Title>Archive</ScrollHeader.Title>
        <ScrollHeader.Description>Last synced 11 minutes ago</ScrollHeader.Description>
      </ScrollHeader.Large>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="px-4 pb-16 pt-2">
          {ARCHIVE.map((entry) => (
            <View
              key={entry.id}
              className="flex-row items-center justify-between gap-3 border-b border-border py-3"
            >
              <Text size="sm" numberOfLines={1} className="flex-1">
                {entry.label}
              </Text>
              <Text size="xs" muted>
                {entry.date}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </ScrollHeader>
  );
}

export const ENTRIES: ComponentEntry[] = [
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
          'A music library, with every default left alone. The title is large at rest and the same title is on the pinned bar once the list is moving.',
        render: () => <ScrollHeaderPlainVersion />,
      },
      {
        label: 'A cover behind the title',
        id: 'cover',
        fullPage: true,
        fullBleed: true,
        backSwipe: true,
        description:
          'A photo album. The cover fills the band and the bar is drawn on nothing, so pulling the grid down stretches the picture instead of opening a gap.',
        render: () => <ScrollHeaderCoverVersion />,
      },
      {
        label: 'A field in the block',
        id: 'search',
        fullPage: true,
        fullBleed: true,
        backSwipe: true,
        description:
          'An inbox with the search field in the block. The block is as tall as what is in it, and `threshold` finishes the crossing before it empties.',
        render: () => <ScrollHeaderSearchVersion />,
      },
      {
        label: 'Something only the bar carries',
        id: 'crossing',
        fullPage: true,
        fullBleed: true,
        backSwipe: true,
        description:
          'A portfolio whose large title is the figure itself. The crossing is reported to React once each way, so the day\'s change can appear with the bar.',
        render: () => <ScrollHeaderCrossingVersion />,
      },
      {
        label: 'A bar on its own',
        id: 'bar',
        fullPage: true,
        fullBleed: true,
        backSwipe: true,
        description:
          'A settings screen with no block to cross, over a scroller the demo animated itself. The bar is the only title it has, so the title is there from the first frame.',
        render: () => <ScrollHeaderBarOnlyVersion />,
      },
      {
        label: 'Navigation that survives the collapse',
        id: 'tabs',
        fullPage: true,
        fullBleed: true,
        backSwipe: true,
        description:
          'A profile. A taller bar holds an identity row and a tab row, and everything in the bar is pinned, so the tabs are still there once the title has gone.',
        render: () => <ScrollHeaderTabsVersion />,
      },
      {
        label: 'A bar you can see through',
        id: 'blur',
        fullPage: true,
        fullBleed: true,
        backSwipe: true,
        description:
          '`surface="blur"` frosts the bar instead of filling it, so the artwork passing underneath stays legible as shape and colour. Without `expo-blur`, or under Reduce Transparency, the same bar draws the plain background token.',
        render: () => <ScrollHeaderBlurVersion />,
      },
      {
        label: 'A list that recycles',
        id: 'list',
        fullPage: true,
        fullBleed: true,
        backSwipe: true,
        description:
          'A contact list of 120 rows in a `FlatList`, under a centred title and a row of filters. The child is cloned whatever kind it is, and this is where the snap is worth watching.',
        render: () => <ScrollHeaderListVersion />,
      },
      {
        label: 'A grouped list',
        id: 'grouped',
        fullPage: true,
        fullBleed: true,
        backSwipe: true,
        description:
          'Grouped preferences in a `SectionList`, under a bar drawn on the card token with no hairline. Section headers travel with the rows — a sticky one would pin behind the band.',
        render: () => <ScrollHeaderGroupedVersion />,
      },
      {
        label: 'The collapse, borrowed',
        id: 'borrowed',
        fullPage: true,
        fullBleed: true,
        backSwipe: true,
        description:
          'A drafts list whose bar carries nothing but the title, because the compose button lives outside the header. `progress` mirrors the transition into a shared value, so it arrives at the pace the title leaves at.',
        render: () => <ScrollHeaderBorrowedVersion />,
      },
      {
        label: 'A gradient instead of a picture',
        id: 'gradient',
        fullPage: true,
        fullBleed: true,
        backSwipe: true,
        description:
          'Playlists under a ramp mixed from the theme\'s own series tokens, with a segmented control where the bar title would be. `stretch={false}` holds the band at its resting height.',
        render: () => <ScrollHeaderGradientVersion />,
      },
      {
        label: 'Left where you let go',
        id: 'loose',
        fullPage: true,
        fullBleed: true,
        backSwipe: true,
        description:
          'A document archive. With `snap={false}` a part-scrolled band stays half-collapsed instead of settling at whichever end is nearer.',
        render: () => <ScrollHeaderLooseVersion />,
      },
    ],
  },
];
export const ENTRIES_BY_SLUG = Object.fromEntries(ENTRIES.map((entry) => [entry.slug, entry]));
