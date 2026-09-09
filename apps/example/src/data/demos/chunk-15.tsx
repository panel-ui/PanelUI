import { useState } from "react";
import { FlatList, Image, ScrollView, SectionList, View } from "react-native";
import Animated, { interpolate, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { Avatar, Badge, BellIcon, BookmarkIcon, Button, CalendarIcon, ChevronRightIcon, EllipsisIcon, GlobeIcon, Item, LinkIcon, PencilIcon, PlusIcon, ScrollHeader, SearchBar, SearchIcon, ShareNodesIcon, Tabs, Text } from "panelui-native";
import { useCSSVariable } from "uniwind";
import type { ComponentEntry } from '../component-types';

/*
 * The ScrollHeader versions.
 *
 * Each one is a different screen, not the same list under a different prop.
 * A gallery where every version shows the same rows demonstrates nothing: the
 * prop under test is the only thing that changes and it is the one thing the
 * eye cannot pick out. So the subject, the fixtures and the row shape all
 * differ, and the header is what the versions have in common.
 */

/** A tile colour per row, mixed from the theme so it moves with the palette. */
function useSeriesRamp() {
  const one = useCSSVariable('--color-chart-1');
  const two = useCSSVariable('--color-chart-2');
  const three = useCSSVariable('--color-chart-3');
  const four = useCSSVariable('--color-chart-4');
  return [one, two, three, four].map((value) =>
    typeof value === 'string' ? value : '#6366f1'
  );
}

const TRACKS = [
  { id: 't1', name: 'Weightless Halls', artist: 'Vela Sound', time: '4:12' },
  { id: 't2', name: 'Paper Harbour', artist: 'June Mould', time: '3:38' },
  { id: 't3', name: 'Long Wave', artist: 'Atlas Rooms', time: '5:04' },
  { id: 't4', name: 'Ninth Street', artist: 'Marisol Vane', time: '2:57' },
  { id: 't5', name: 'Slow Ascent', artist: 'Vela Sound', time: '6:21' },
  { id: 't6', name: 'Northerly', artist: 'Halden Pike', time: '3:11' },
  { id: 't7', name: 'Blue Hour', artist: 'June Mould', time: '4:45' },
  { id: 't8', name: 'Quiet Signal', artist: 'Atlas Rooms', time: '3:52' },
];

/** A large title over a list, which is what most screens want. */
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
        <ScrollHeader.Description>{TRACKS.length} songs · 34 minutes</ScrollHeader.Description>
      </ScrollHeader.Large>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="gap-1 px-4 pb-10 pt-3">
          {TRACKS.map((track, index) => (
            <Item key={track.id} size="sm">
              <Item.Media variant="image" className="h-11 w-11">
                <View
                  className="h-full w-full"
                  style={{ backgroundColor: ramp[index % ramp.length] }}
                />
              </Item.Media>
              <Item.Content>
                <Item.Title>{track.name}</Item.Title>
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

const ALBUM_FRAMES = [
  'photo-1470071459604-3b5ec3a7fe05',
  'photo-1554080353-a576cf803bda',
  'photo-1441974231531-c6227db76b6e',
  'photo-1501854140801-50d01698950b',
  'photo-1426604966848-d7adac402bff',
  'photo-1472214103451-9374bd1c798e',
  'photo-1433086966358-54859d0ed716',
  'photo-1444927714506-8492d94b4e3d',
  'photo-1418065460487-3e41a6c84dc5',
];

/** A picture in the band: pulling down stretches it rather than opening a gap. */
function ScrollHeaderCoverVersion() {
  return (
    <ScrollHeader className="flex-1 bg-background">
      <ScrollHeader.Cover source={{ uri: SCROLL_HEADER_COVER }} />

      <ScrollHeader.Bar surface="none" divider={false}>
        <ScrollHeader.Title className="text-white">Sierra Nevada</ScrollHeader.Title>
        <ScrollHeader.Actions>
          <Button variant="ghost" size="icon" accessibilityLabel="Share">
            <ShareNodesIcon size={18} />
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
        <View className="flex-row flex-wrap gap-1 p-1 pb-10">
          {ALBUM_FRAMES.map((frame) => (
            <View
              key={frame}
              className="aspect-square flex-1 basis-[31%] overflow-hidden rounded-md bg-muted"
            >
              <Image
                source={{ uri: `https://images.unsplash.com/${frame}?auto=format&fit=crop&w=400&q=60` }}
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

const MESSAGES = [
  { id: 'm1', from: 'Ada Whitfield', initials: 'AW', subject: 'Re: quarterly figures', time: '09:41' },
  { id: 'm2', from: 'Tobias Lund', initials: 'TL', subject: 'Draft for Thursday', time: '08:02' },
  { id: 'm3', from: 'Priya Raman', initials: 'PR', subject: 'Studio visit next week?', time: 'Yesterday' },
  { id: 'm4', from: 'Marcus Feld', initials: 'MF', subject: 'Invoice 2261', time: 'Yesterday' },
  { id: 'm5', from: 'Ines Carvalho', initials: 'IC', subject: 'Photos from the coast', time: 'Tuesday' },
  { id: 'm6', from: 'Ada Whitfield', initials: 'AW', subject: 'One more thing', time: 'Tuesday' },
  { id: 'm7', from: 'Jonas Kerr', initials: 'JK', subject: 'Rescheduling', time: 'Monday' },
  { id: 'm8', from: 'Priya Raman', initials: 'PR', subject: 'Contract, signed', time: 'Monday' },
];

/** A field in the block, and a crossing that finishes before it empties. */
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
        <View className="gap-1 px-4 pb-10 pt-3">
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

const HOLDINGS = [
  { id: 'h1', ticker: 'ARLO', name: 'Arlo Materials', price: '148.22', change: '+1.8%', up: true },
  { id: 'h2', ticker: 'NVEC', name: 'Novec Systems', price: '92.10', change: '+4.4%', up: true },
  { id: 'h3', ticker: 'KLDR', name: 'Kelder Group', price: '61.75', change: '-0.9%', up: false },
  { id: 'h4', ticker: 'BRWN', name: 'Brunwick Rail', price: '210.40', change: '+2.1%', up: true },
  { id: 'h5', ticker: 'SOLT', name: 'Soltera Energy', price: '33.08', change: '-2.7%', up: false },
  { id: 'h6', ticker: 'MRDN', name: 'Meridian Foods', price: '77.96', change: '+0.4%', up: true },
];

/** The crossing, used for something: a reading that only belongs on the bar. */
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
        <View className="gap-1 px-4 pb-10 pt-3">
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

const SETTINGS_ROWS = [
  { id: 's1', label: 'Notifications', value: 'On', icon: <BellIcon size={16} /> },
  { id: 's2', label: 'Appearance', value: 'Dark', icon: <GlobeIcon size={16} /> },
  { id: 's3', label: 'Calendar', value: '3 accounts', icon: <CalendarIcon size={16} /> },
  { id: 's4', label: 'Saved items', value: '128', icon: <BookmarkIcon size={16} /> },
  { id: 's5', label: 'Linked apps', value: '6', icon: <LinkIcon size={16} /> },
  { id: 's6', label: 'Signature', value: 'Edited', icon: <PencilIcon size={16} /> },
];

function SettingsRows() {
  return (
    <View className="gap-1 px-4 pb-10 pt-3">
      {SETTINGS_ROWS.map((row) => (
        <Item key={row.id} size="sm" variant="muted">
          <Item.Media variant="icon" className="h-8 w-8 items-center justify-center">
            {row.icon}
          </Item.Media>
          <Item.Content>
            <Item.Title>{row.label}</Item.Title>
          </Item.Content>
          <Text size="sm" muted>
            {row.value}
          </Text>
          <ChevronRightIcon size={16} />
        </Item>
      ))}
    </View>
  );
}

/** No large block, so the bar's title is simply there from the first frame. */
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
        <SettingsRows />
        <SettingsRows />
      </ScrollView>
    </ScrollHeader>
  );
}

const POSTS = [
  { id: 'p1', title: 'The bridge reopened after eleven years', group: 'r/infrastructure', votes: '4.2k', comments: 318 },
  { id: 'p2', title: 'A field guide to reading a tide table', group: 'r/sailing', votes: '1.8k', comments: 94 },
  { id: 'p3', title: 'What happened to the third terminal?', group: 'r/aviation', votes: '902', comments: 211 },
  { id: 'p4', title: 'Sourdough at 2,400 metres', group: 'r/baking', votes: '3.1k', comments: 156 },
  { id: 'p5', title: 'The quietest carriage on the network', group: 'r/trains', votes: '677', comments: 48 },
  { id: 'p6', title: 'Mapping every public staircase in the city', group: 'r/urbanism', votes: '2.6k', comments: 130 },
];

/**
 * A bar with two rows in it: the identity and its actions, and the navigation
 * under them. Both survive the collapse, because everything in the bar is
 * pinned — `barHeight` is what makes room for the second row.
 */
function ScrollHeaderTabsVersion() {
  const [tab, setTab] = useState('posts');
  const rows = tab === 'posts' ? POSTS : POSTS.slice(0, 3);

  return (
    <ScrollHeader className="flex-1 bg-background" barHeight={94}>
      <ScrollHeader.Bar className="flex-col items-stretch gap-0 px-0">
        <View className="h-12 flex-row items-center gap-3 px-4">
          <ScrollHeader.Title>u/economist</ScrollHeader.Title>
          {/* Grouped on one surface rather than spaced across the bar: four
              glyphs in a row read as one control, not four decisions. */}
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
        <View className="gap-2 px-4 pb-10 pt-3">
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

const CONTACT_NAMES = [
  'Ada Whitfield', 'Bruno Sasaki', 'Camille Duforest', 'Dmitri Volkov', 'Elena Marsh',
  'Farid Nazari', 'Greta Lindqvist', 'Hugo Bellamy', 'Imani Osei', 'Jonas Kerr',
  'Kiara Ndlovu', 'Lars Petersen', 'Marisol Vane', 'Nadia Haddad', 'Otto Brenner',
  'Priya Raman', 'Quentin Roche', 'Rosa Iglesias', 'Soren Dahl', 'Tabitha Cole',
  'Ulises Marin', 'Vera Kaminski', 'Wren Ashby', 'Xiulan Chen', 'Yusuf Demir',
  'Zofia Nowak', 'Anders Holm', 'Beatriz Rocha', 'Callum Findlay', 'Delphine Roux',
];

/** The same names four times over, so recycling has something to recycle. */
const CONTACTS = Array.from({ length: 4 }).flatMap((_, pass) =>
  CONTACT_NAMES.map((name) => ({
    id: `${pass}-${name}`,
    name,
    initials: name.split(' ').map((part) => part[0]).join(''),
    handle: `@${name.split(' ')[0].toLowerCase()}`,
  }))
);

/** A virtualised list: the child is cloned whatever kind of scroller it is. */
function ScrollHeaderListVersion() {
  return (
    <ScrollHeader className="flex-1 bg-background">
      <ScrollHeader.Bar>
        <ScrollHeader.Title>Contacts</ScrollHeader.Title>
        <ScrollHeader.Actions>
          <Button variant="ghost" size="icon" accessibilityLabel="Add contact">
            <PlusIcon size={18} />
          </Button>
        </ScrollHeader.Actions>
      </ScrollHeader.Bar>

      <ScrollHeader.Large>
        <ScrollHeader.Title>Contacts</ScrollHeader.Title>
        <ScrollHeader.Description>{CONTACTS.length} people</ScrollHeader.Description>
      </ScrollHeader.Large>

      <FlatList
        data={CONTACTS}
        keyExtractor={(row) => row.id}
        showsVerticalScrollIndicator={false}
        // Top padding of our own is added to the header's inset rather than
        // replacing it, so this is the gap under the band and nothing else.
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40 }}
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

const SETTINGS_SECTIONS = [
  {
    title: 'Account',
    data: [
      { id: 'g1', label: 'Profile', value: 'Public', icon: <GlobeIcon size={16} /> },
      { id: 'g2', label: 'Notifications', value: 'On', icon: <BellIcon size={16} /> },
    ],
  },
  {
    title: 'Content',
    data: [
      { id: 'g3', label: 'Saved', value: '128', icon: <BookmarkIcon size={16} /> },
      { id: 'g4', label: 'Drafts', value: '4', icon: <PencilIcon size={16} /> },
      { id: 'g5', label: 'Calendar', value: '3 accounts', icon: <CalendarIcon size={16} /> },
    ],
  },
  {
    title: 'Connections',
    data: [
      { id: 'g6', label: 'Linked apps', value: '6', icon: <LinkIcon size={16} /> },
      { id: 'g7', label: 'Shared with', value: '12 people', icon: <ShareNodesIcon size={16} /> },
    ],
  },
];

/** A grouped list, under a bar drawn on the card token rather than the page. */
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
        // A sticky section header pins to the top of the scroller, which is
        // behind the band — so these travel with the rows instead.
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
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

const DRAFTS = [
  { id: 'd1', subject: 'Re: studio visit', preview: 'Thursday works, though I would need to leave by four…', time: '11:20' },
  { id: 'd2', subject: 'Notes from the site walk', preview: 'The east stair is narrower than the drawing says.', time: '09:02' },
  { id: 'd3', subject: 'Invoice query', preview: 'Attaching the revised schedule of rates.', time: 'Yesterday' },
  { id: 'd4', subject: '(no subject)', preview: 'Just checking you got the', time: 'Yesterday' },
  { id: 'd5', subject: 'Coast photographs', preview: 'Picked fourteen of them. The light on the second morning…', time: 'Tuesday' },
  { id: 'd6', subject: 'Re: quarterly figures', preview: 'The variance is in the third column, not the second.', time: 'Monday' },
];

/** The collapse, mirrored out of the header and spent on something else. */
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
        <ScrollHeader.Bar>
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
        Outside the header entirely, and driven by both of the header's
        signals, which is the difference between them: `progress` is the
        per-frame value the pill moves and fades on, and `onCollapsedChange`
        is the crossing that says it has arrived.

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

const PLAYLISTS = [
  { id: 'l1', name: 'Morning, slowly', count: 42 },
  { id: 'l2', name: 'Long drives', count: 118 },
  { id: 'l3', name: 'Rain on glass', count: 27 },
  { id: 'l4', name: 'Kitchen radio', count: 64 },
  { id: 'l5', name: 'Late desk', count: 91 },
  { id: 'l6', name: 'Anything but this', count: 15 },
];

/** A gradient where a picture would go, mixed from the theme's own tokens. */
function ScrollHeaderGradientVersion() {
  const ramp = useSeriesRamp();
  const cover: [string, string] = [ramp[2], ramp[3]];

  return (
    <ScrollHeader className="flex-1 bg-background">
      <ScrollHeader.Cover colors={cover} scrim={false} />

      <ScrollHeader.Bar surface="none" divider={false}>
        <ScrollHeader.Title className="text-white">Playlists</ScrollHeader.Title>
        <ScrollHeader.Actions>
          <Button variant="ghost" size="icon" accessibilityLabel="More">
            <EllipsisIcon size={18} />
          </Button>
        </ScrollHeader.Actions>
      </ScrollHeader.Bar>

      <ScrollHeader.Large className="h-40 justify-end pb-5">
        <ScrollHeader.Title className="text-white">Playlists</ScrollHeader.Title>
        <ScrollHeader.Description className="text-white/80">Made for you</ScrollHeader.Description>
      </ScrollHeader.Large>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="gap-1 px-4 pb-10 pt-3">
          {PLAYLISTS.map((playlist, index) => (
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

const ARCHIVE = [
  { id: 'a1', label: 'Site survey, east elevation', date: '12 Aug' },
  { id: 'a2', label: 'Planning correspondence', date: '04 Aug' },
  { id: 'a3', label: 'Structural calculations v4', date: '29 Jul' },
  { id: 'a4', label: 'Tender returns', date: '21 Jul' },
  { id: 'a5', label: 'Soil report', date: '14 Jul' },
  { id: 'a6', label: 'Access statement', date: '02 Jul' },
  { id: 'a7', label: 'Drainage strategy', date: '28 Jun' },
  { id: 'a8', label: 'Party wall notices', date: '19 Jun' },
  { id: 'a9', label: 'Contractor prequalification', date: '11 Jun' },
  { id: 'a10', label: 'Insurance certificates', date: '03 Jun' },
];

/** Nothing settles the band: it is left exactly where the finger let go. */
function ScrollHeaderLooseVersion() {
  return (
    <ScrollHeader className="flex-1 bg-background" snap={false}>
      <ScrollHeader.Bar>
        <ScrollHeader.Title>Archive</ScrollHeader.Title>
        <ScrollHeader.Actions>
          <Button variant="ghost" size="icon" accessibilityLabel="Filter">
            <EllipsisIcon size={18} />
          </Button>
        </ScrollHeader.Actions>
      </ScrollHeader.Bar>

      <ScrollHeader.Large>
        <ScrollHeader.Title>Archive</ScrollHeader.Title>
        <ScrollHeader.Description>{ARCHIVE.length} documents</ScrollHeader.Description>
      </ScrollHeader.Large>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="px-4 pb-10 pt-2">
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
          'A music library. The title is large at rest and the same title is on the pinned bar once the list is moving.',
        render: () => <ScrollHeaderPlainVersion />,
      },
      {
        label: 'A cover behind the title',
        id: 'cover',
        fullPage: true,
        fullBleed: true,
        backSwipe: true,
        description:
          'A photo album. The cover fills the band, so pulling the grid down stretches it instead of opening a gap.',
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
          'A portfolio. The crossing is reported to React once each way, so the day\'s change can appear with the bar.',
        render: () => <ScrollHeaderCrossingVersion />,
      },
      {
        label: 'A bar on its own',
        id: 'bar',
        fullPage: true,
        fullBleed: true,
        backSwipe: true,
        description:
          'A settings screen with no block to cross. The bar is the only title it has, so the title is there from the first frame.',
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
        label: 'A list that recycles',
        id: 'list',
        fullPage: true,
        fullBleed: true,
        backSwipe: true,
        description:
          'A contact list of 120 rows in a `FlatList`. The child is cloned whatever kind it is, and this is where the snap is worth watching.',
        render: () => <ScrollHeaderListVersion />,
      },
      {
        label: 'A grouped list',
        id: 'grouped',
        fullPage: true,
        fullBleed: true,
        backSwipe: true,
        description:
          'Grouped preferences in a `SectionList`, under a bar drawn on the card token. Section headers travel with the rows — a sticky one would pin behind the band.',
        render: () => <ScrollHeaderGroupedVersion />,
      },
      {
        label: 'The collapse, borrowed',
        id: 'borrowed',
        fullPage: true,
        fullBleed: true,
        backSwipe: true,
        description:
          'A drafts list whose compose button lives outside the header. `progress` mirrors the transition into a shared value, so it arrives at the pace the title leaves at.',
        render: () => <ScrollHeaderBorrowedVersion />,
      },
      {
        label: 'A gradient instead of a picture',
        id: 'gradient',
        fullPage: true,
        fullBleed: true,
        backSwipe: true,
        description:
          'Playlists under a cover with no image: the ramp is mixed from the theme\'s own series tokens, so it moves with the palette.',
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
