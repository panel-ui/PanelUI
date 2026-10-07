import { useState, type ReactNode } from "react";
import Animated, { useAnimatedKeyboard, useAnimatedStyle } from "react-native-reanimated";
import { Image, View } from "react-native";
import { useCSSVariable } from "uniwind";
import { Alert, AppleIcon, Badge, BookmarkIcon, BottomSheet, Breadcrumb, Button, ButtonGroup, Calendar, CopyIcon, CrosshairIcon, Card, Carousel, Checkbox, ChevronDownIcon, ChevronRightIcon, type DateRange, DownloadIcon, EyeIcon, FacebookIcon, FileIcon, GoogleIcon, Input, ImageIcon, Item, Label, MaximizeIcon, MinusIcon, PencilIcon, PlusIcon, Popover, RadioGroup, RotateCcwIcon, RotateCwIcon, SearchIcon, SendIcon, ShareNodesIcon, Separator, Slider, StarIcon, Switch, Tabs, Text, TrashIcon, hasNativeUI, useToast } from "panelui-native";
import type { ComponentEntry } from '../component-types';

const PHOTO = 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&q=60';

/* -------------------------------------------------------------------------- */
/* Calendar and DatePicker                                                    */
/* -------------------------------------------------------------------------- */

const addDemoDays = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};

function CalendarSingleDemo() {
  const [day, setDay] = useState<Date | undefined>(new Date());
  return (
    <View className="w-full gap-4">
      <Calendar selected={day} onSelect={setDay} />
      <Text size="sm" muted className="text-center">
        {day ? day.toDateString() : 'Nothing picked — tap the same day again to clear it.'}
      </Text>
    </View>
  );
}

function CalendarRangeDemo() {
  const [range, setRange] = useState<DateRange | undefined>({
    from: new Date(),
    to: addDemoDays(9),
  });
  return (
    <View className="w-full gap-4">
      <Calendar mode="range" selected={range} onSelect={setRange} />
      <Text size="sm" muted className="text-center">
        {range?.to
          ? `${range.from.toDateString()} → ${range.to.toDateString()}`
          : 'Pick the other end.'}
      </Text>
    </View>
  );
}

function CalendarMultipleDemo() {
  const [days, setDays] = useState<Date[]>([new Date(), addDemoDays(3), addDemoDays(4)]);
  return (
    <View className="w-full gap-4">
      <Calendar mode="multiple" selected={days} onSelect={setDays} />
      <Text size="sm" muted className="text-center">
        {days.length} {days.length === 1 ? 'date' : 'dates'} picked
      </Text>
    </View>
  );
}

/** Weekends and the past ruled out, which is what a booking screen needs. */
function CalendarDisabledDemo() {
  const [day, setDay] = useState<Date>();
  return (
    <View className="w-full gap-4">
      <Calendar
        selected={day}
        onSelect={setDay}
        minDate={new Date()}
        maxDate={addDemoDays(60)}
        disabled={(date) => date.getDay() === 0 || date.getDay() === 6}
      />
      <Text size="sm" muted className="text-center">
        Weekdays only, and nothing before today or more than two months out.
      </Text>
    </View>
  );
}

/** The caption as month and year pickers — four taps to a birthday. */
function CalendarDropdownDemo() {
  const [day, setDay] = useState<Date>();
  return (
    <View className="w-full gap-4">
      {/* A century of years on offer, and nothing after today selectable —
          the two bounds are separate questions. */}
      <Calendar
        selected={day}
        onSelect={setDay}
        captionLayout="dropdown"
        maxDate={new Date()}
        startMonth={new Date(1925, 0, 1)}
        endMonth={new Date()}
        defaultMonth={new Date(1996, 5, 1)}
      />
      <Text size="sm" muted className="text-center">
        Tap the month or the year to jump rather than paging.
      </Text>
    </View>
  );
}

/**
 * The cells at the ends of the grid belong to the months either side.
 *
 * They are drawn so the grid keeps its six rows and the columns stay under
 * their headings, but a tap on one is far more often a misfire than a real
 * attempt to reach into next month — so by default they do not answer.
 */
function CalendarOutsideDaysDemo() {
  const [day, setDay] = useState<Date | undefined>(new Date());
  const [reachable, setReachable] = useState(false);

  return (
    <View className="w-full gap-4">
      <Calendar
        selected={day}
        onSelect={setDay}
        selectOutsideDays={reachable}
      />
      <View className="flex-row items-center justify-between gap-3">
        <Text size="sm" muted className="flex-1">
          {reachable
            ? 'The greyed days at either end answer a tap.'
            : 'The greyed days at either end ignore a tap. Page to the month instead.'}
        </Text>
        <Switch value={reachable} onValueChange={setReachable} />
      </View>
    </View>
  );
}

/**
 * The same grid counted two ways.
 *
 * The calendar system is what the months and the day numbers are counted in,
 * and it moves the grid rather than only its labels — a Hijri month starts on
 * a different day and runs 29 or 30. The value picked is a plain `Date` either
 * way, so the choice is a presentation one and nothing downstream has to know.
 */
function CalendarSystemDemo() {
  const [system, setSystem] = useState<'gregory' | 'islamic'>('gregory');
  const [day, setDay] = useState<Date>();

  return (
    <View className="w-full gap-4">
      <Tabs
        defaultValue="gregory"
        value={system}
        onValueChange={(next) => setSystem(next as typeof system)}
      >
        <Tabs.List>
          <Tabs.Trigger value="gregory">Gregorian</Tabs.Trigger>
          <Tabs.Trigger value="islamic">Hijri</Tabs.Trigger>
        </Tabs.List>
      </Tabs>

      <Calendar selected={day} onSelect={setDay} calendar={system} />

      <Text size="sm" muted className="text-center">
        {day ? day.toDateString() : 'The value is a plain Date whichever is on screen.'}
      </Text>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Carousel                                                                   */
/* -------------------------------------------------------------------------- */

const SCENES = [
  { title: 'Desert dunes', uri: 'photo-1509316785289-025f5b846b35' },
  { title: 'Northern lights', uri: 'photo-1483347756197-71ef80e95f73' },
  { title: 'Still harbour', uri: 'photo-1502082553048-f009c37129b9' },
  { title: 'Canyon road', uri: 'photo-1469854523086-cc02fe5d8800' },
  { title: 'Alpine lake', uri: 'photo-1454391304352-2bf4678b1a7a' },
  { title: 'City at dusk', uri: 'photo-1493246507139-91e8fad9978e' },
].map((scene) => ({
  ...scene,
  uri: `https://images.unsplash.com/${scene.uri}?auto=format&fit=crop&w=600&q=70`,
}));

/** A full-width run of cards — the layout for content that is read. */
function CarouselTrackDemo() {
  return (
    <View className="w-full gap-4">
      <Carousel loop>
        <Carousel.Content className="h-56">
          {SCENES.map((scene) => (
            <Carousel.Item key={scene.title} className="px-2">
              <View className="h-full w-full overflow-hidden rounded-2xl">
                <Image source={{ uri: scene.uri }} className="h-full w-full" />
              </View>
            </Carousel.Item>
          ))}
        </Carousel.Content>
        <Carousel.Controls className="mt-4" />
      </Carousel>
    </View>
  );
}

/** The fan. It opens wider while a finger is down, and settles when it lifts. */
function CarouselInteractiveDemo() {
  return (
    <View className="w-full gap-4">
      <Carousel variant="interactive" itemSize={160} defaultIndex={2}>
        <Carousel.Content className="h-56">
          {SCENES.map((scene) => (
            <Carousel.Item key={scene.title} className="items-center gap-2">
              <Carousel.Caption>{scene.title}</Carousel.Caption>
              <Image
                source={{ uri: scene.uri }}
                className="h-28 w-28 rounded-xl"
              />
            </Carousel.Item>
          ))}
        </Carousel.Content>
        <Carousel.Controls className="mt-2" />
      </Carousel>
    </View>
  );
}

/**
 * The same fan with nothing under it.
 *
 * No arrows and no dots — the run is dragged and nothing else, which is the
 * right shape when the pictures are the whole point and a control bar would be
 * the only chrome on the screen.
 */
function CarouselBareDemo() {
  return (
    <View className="w-full gap-4">
      <Carousel variant="interactive" itemSize={160} defaultIndex={2}>
        <Carousel.Content className="h-56">
          {SCENES.map((scene) => (
            <Carousel.Item key={scene.title} className="items-center gap-2">
              <Carousel.Caption>{scene.title}</Carousel.Caption>
              <Image source={{ uri: scene.uri }} className="h-28 w-28 rounded-xl" />
            </Carousel.Item>
          ))}
        </Carousel.Content>
      </Carousel>
      <Text size="sm" muted className="text-center">
        Drag it. There is nothing else to press.
      </Text>
    </View>
  );
}

/** Neighbours turned away in perspective — the layout art wants. */
function CarouselCoverflowDemo() {
  return (
    <View className="w-full gap-4">
      <Carousel variant="coverflow" itemSize={150} defaultIndex={2}>
        <Carousel.Content className="h-48">
          {SCENES.map((scene) => (
            <Carousel.Item key={scene.title}>
              <Image
                source={{ uri: scene.uri }}
                className="h-32 w-24 rounded-xl"
              />
            </Carousel.Item>
          ))}
        </Carousel.Content>
        <Carousel.Controls className="mt-4" />
      </Carousel>
    </View>
  );
}

const ROLES = [
  { title: 'Prompt Engineer', rate: '$120/hr', company: 'Northwind', field: 'AI Research' },
  { title: 'Design Engineer', rate: '$95/hr', company: 'Beacon', field: 'Product' },
  { title: 'Systems Architect', rate: '$140/hr', company: 'Halcyon', field: 'Infrastructure' },
  { title: 'Motion Designer', rate: '$88/hr', company: 'Fieldnote', field: 'Brand' },
];

/**
 * A deck. Dragging the top card takes it away and reveals the next.
 *
 * The pile is the point, so the cards are sized rather than full-width — a card
 * as wide as the screen has nothing to stack behind it.
 */
function CarouselStackDemo() {
  return (
    <View className="w-full items-center gap-6">
      <Carousel variant="stack" itemSize={260}>
        <Carousel.Content className="h-72">
          {ROLES.map((role) => (
            <Carousel.Item key={role.title}>
              <Card className="w-64 gap-0 overflow-hidden">
                <Card.Content className="gap-6 pb-4 pt-4">
                  <View className="flex-row items-start justify-between">
                    <Text size="sm" muted>
                      {role.rate}
                    </Text>
                    <BookmarkIcon size={16} />
                  </View>

                  <View className="flex-row items-end justify-between gap-3">
                    <Text size="2xl" weight="bold" className="flex-1">
                      {role.title}
                    </Text>
                    {/* The rail down the card's edge, standing in for a
                        scrollbar: the deck's own position, on the deck. */}
                    <Carousel.Dots orientation="vertical" className="pb-1" />
                  </View>
                </Card.Content>

                <Separator />

                <Card.Content className="flex-row items-center justify-between gap-3 py-3">
                  <View className="flex-1">
                    <Text size="sm" weight="semibold" numberOfLines={1}>
                      {role.company}
                    </Text>
                    <Text size="xs" muted numberOfLines={1}>
                      {role.field}
                    </Text>
                  </View>
                  <Button size="sm" className="rounded-full">
                    View
                  </Button>
                </Card.Content>
              </Card>
            </Carousel.Item>
          ))}
        </Carousel.Content>
      </Carousel>

      <Text size="sm" muted className="text-center">
        Drag the top card away to deal the next one.
      </Text>
    </View>
  );
}

/** Advancing on its own — until a finger lands, after which it stays put. */
function CarouselAutoplayDemo() {
  return (
    <View className="w-full gap-4">
      <Carousel loop autoplay autoplayInterval={2200}>
        <Carousel.Content className="h-40">
          {SCENES.map((scene) => (
            <Carousel.Item key={scene.title} className="px-2">
              <View className="h-full w-full overflow-hidden rounded-2xl">
                <Image source={{ uri: scene.uri }} className="h-full w-full" />
              </View>
            </Carousel.Item>
          ))}
        </Carousel.Content>
        <Carousel.Dots className="mt-4 self-center" />
      </Carousel>
      <Text size="sm" muted className="text-center">
        It stops for good once you take hold of it, rather than starting again a
        moment later.
      </Text>
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

/**
 * A parent checkbox that governs a group. It is `indeterminate` when the
 * children are partly on, and pressing it turns them all on or all off.
 */
function CheckboxSelectAllDemo() {
  const items = ['Email', 'Push', 'SMS'];
  const [on, setOn] = useState<string[]>(['Email']);

  const all = on.length === items.length;
  const some = on.length > 0 && !all;

  const toggle = (id: string) =>
    setOn((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );

  return (
    <View className="w-full gap-4">
      <Checkbox
        checked={all}
        indeterminate={some}
        onCheckedChange={(next) => setOn(next ? [...items] : [])}
        label={all ? 'Deselect all' : 'Select all'}
      />
      <View className="gap-3 pl-7">
        {items.map((id) => (
          <Checkbox
            key={id}
            checked={on.includes(id)}
            onCheckedChange={() => toggle(id)}
            label={id}
          />
        ))}
      </View>
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
      <BottomSheet.Content detached>
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

/** Frosted backdrop rather than a dim — the screen behind recedes but stays. */
function BlurredSheetDemo() {
  return (
    <BottomSheet>
      <BottomSheet.Trigger>
        <Button variant="outline">Open over a frosted screen</Button>
      </BottomSheet.Trigger>
      <BottomSheet.Content detached blur>
        <Text size="lg" weight="semibold" className="mb-1">
          Move to trash
        </Text>
        <Text size="sm" muted className="mb-4">
          The file stays recoverable for 30 days.
        </Text>
        <View className="flex-row gap-2 pb-2">
          <Button variant="outline" className="flex-1">
            Cancel
          </Button>
          <Button variant="destructive" className="flex-1">
            Move to trash
          </Button>
        </View>
      </BottomSheet.Content>
    </BottomSheet>
  );
}

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Most relevant' },
  { value: 'recent', label: 'Newest first' },
  { value: 'price-low', label: 'Price: low to high' },
  { value: 'price-high', label: 'Price: high to low' },
];

const BRANDS = [
  { id: 'aurora', name: 'Aurora', count: 128 },
  { id: 'basin', name: 'Basin', count: 94 },
  { id: 'cadence', name: 'Cadence', count: 61 },
  { id: 'dovetail', name: 'Dovetail', count: 47 },
  { id: 'ember', name: 'Ember', count: 33 },
  { id: 'fathom', name: 'Fathom', count: 21 },
];

/**
 * A full-height sheet, which is a shape rather than just a size: a heading
 * that stays put, a body that scrolls under it, and the action pinned where
 * it can always be reached. Filters are the honest example — there is more of
 * them than fits, and the thing you came to press is the last thing you want
 * to have to scroll to.
 */
function FullHeightSheetDemo() {
  const [sort, setSort] = useState('relevance');
  const [budget, setBudget] = useState(240);
  const [inStock, setInStock] = useState(true);
  const [freeReturns, setFreeReturns] = useState(false);
  const [brands, setBrands] = useState<string[]>(['aurora']);

  const toggleBrand = (id: string) =>
    setBrands((was) =>
      was.includes(id) ? was.filter((b) => b !== id) : [...was, id]
    );

  const active = brands.length + (inStock ? 1 : 0) + (freeReturns ? 1 : 0);

  return (
    <BottomSheet>
      <BottomSheet.Trigger>
        <Button variant="outline">Open filters</Button>
      </BottomSheet.Trigger>

      <BottomSheet.Content size="full">
        <BottomSheet.Header
          title="Filters"
          description={`${active} applied · 384 results`}
        />

        <BottomSheet.Body contentContainerClassName="gap-6 pb-6">
          <View className="gap-2">
            <Label>Sort by</Label>
            <RadioGroup value={sort} onValueChange={setSort}>
              {SORT_OPTIONS.map((option) => (
                <RadioGroup.Item
                  key={option.value}
                  value={option.value}
                  label={option.label}
                />
              ))}
            </RadioGroup>
          </View>

          <Separator />

          <View className="gap-3">
            <View className="flex-row items-center justify-between">
              <Label>Budget</Label>
              <Text size="sm" muted>
                Up to ${budget}
              </Text>
            </View>
            <Slider
              value={budget}
              onValueChange={setBudget}
              min={20}
              max={500}
              step={10}
            />
          </View>

          <Separator />

          <View className="gap-2">
            <Label>Brand</Label>
            {BRANDS.map((brand) => (
              <Item key={brand.id} onPress={() => toggleBrand(brand.id)}>
                <Item.Content>
                  <Item.Title>{brand.name}</Item.Title>
                  <Item.Description>{brand.count} items</Item.Description>
                </Item.Content>
                <Item.Actions>
                  <Checkbox checked={brands.includes(brand.id)} />
                </Item.Actions>
              </Item>
            ))}
          </View>

          <Separator />

          <View className="gap-2">
            <Label>Availability</Label>
            <Item>
              <Item.Content>
                <Item.Title>In stock only</Item.Title>
                <Item.Description>Hide anything on backorder</Item.Description>
              </Item.Content>
              <Item.Actions>
                <Switch value={inStock} onValueChange={setInStock} />
              </Item.Actions>
            </Item>
            <Item>
              <Item.Content>
                <Item.Title>Free returns</Item.Title>
                <Item.Description>Within 30 days of delivery</Item.Description>
              </Item.Content>
              <Item.Actions>
                <Switch value={freeReturns} onValueChange={setFreeReturns} />
              </Item.Actions>
            </Item>
          </View>
        </BottomSheet.Body>

        <BottomSheet.Footer className="flex-row">
          <Button
            variant="outline"
            className="flex-1"
            onPress={() => {
              setSort('relevance');
              setBudget(240);
              setInStock(true);
              setFreeReturns(false);
              setBrands([]);
            }}
          >
            Reset
          </Button>
          <Button className="flex-[2]">Show 384 results</Button>
        </BottomSheet.Footer>
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
        {/* The heading names the behaviour, not just the task. Every version
            of this sheet looks much the same from the outside, so a sheet that
            only said "Choose a country" left nothing on screen to say which
            one you had opened. */}
        <BottomSheet.Header
          title="Choose a country"
          description="The list scrolls under the fixed heading. The sheet itself still drags."
        />
        <BottomSheet.Body contentContainerClassName="pb-4">
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
        </BottomSheet.Body>
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

/**
 * `glass` is the one native look with a floor under it: the material only
 * exists from iOS 26, so on anything earlier the modifier is inert and the
 * button keeps its ordinary platform style. That is indistinguishable from the
 * prop not working, which is exactly the confusion this demo exists to end —
 * it puts a glass button next to its non-glass twin, so "no glass" and "no
 * difference" are the same observation and both point at the OS.
 */
function GlassButtonDemo() {
  return (
    <NativeDemo>
      <View className="w-full gap-2">
        <Text size="sm" muted>
          Glass — needs iOS 26
        </Text>
        <View className="w-full flex-row items-center gap-3">
          <Button native glass onPress={() => {}}>
            Prominent
          </Button>
          <Button native glass variant="ghost" onPress={() => {}}>
            Plain
          </Button>
          <Button native glass size="icon" variant="ghost" onPress={() => {}}>
            <SearchIcon size={18} />
          </Button>
        </View>
      </View>

      <View className="w-full gap-2">
        <Text size="sm" muted>
          The same buttons without it
        </Text>
        <View className="w-full flex-row items-center gap-3">
          <Button native onPress={() => {}}>
            Prominent
          </Button>
          <Button native variant="ghost" onPress={() => {}}>
            Plain
          </Button>
          <Button native size="icon" variant="ghost" onPress={() => {}}>
            <SearchIcon size={18} />
          </Button>
        </View>
      </View>
    </NativeDemo>
  );
}

// The two sit next to each other on purpose. A material is only legible
// against something that is not one, and on a device below iOS 16.4 the pair
// looks identical — which is the difference between the prop being inert and
// the prop being broken.
function NativeBottomSheetDemo({ solid = false }: { solid?: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <NativeDemo>
      <BottomSheet
        native
        nativeBackground={solid}
        snapPoints={['half']}
        open={open}
        onOpenChange={setOpen}
      >
        <BottomSheet.Trigger>
          <Button variant="outline" fullWidth>
            {solid ? 'Open the solid sheet' : 'Open the platform sheet'}
          </Button>
        </BottomSheet.Trigger>
        <BottomSheet.Content className="gap-3">
          <Text size="lg" weight="semibold">
            {solid ? 'The theme’s surface' : 'Platform chrome, your content'}
          </Text>
          <Text size="sm" muted>
            {solid
              ? 'Painted with the theme’s popover surface instead of the material the platform draws it in, so what is behind the sheet stops showing through it.'
              : 'The container, corner radius, grabber and dismiss gesture belong to the platform. Everything in here is still themed — and it starts at the top of the sheet rather than floating in the middle of it.'}
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
                <Item.Title>Surface</Item.Title>
                <Item.Description>
                  {solid ? 'Solid, from the theme.' : 'The platform’s own material.'}
                </Item.Description>
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

/**
 * A spinner in a colour of its own, rather than the label's.
 *
 * The two buttons reach the same spinner two ways: a resolved colour for the
 * arc, and theme classes for the arc and its track together.
 */
function SpinnerColorButtonDemo() {
  const [uploading, setUploading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const token = useCSSVariable('--color-info');
  const info = typeof token === 'string' ? token : undefined;

  return (
    <View className="w-full gap-2">
      <Button
        fullWidth
        variant="outline"
        loading={uploading}
        spinnerProps={{ color: info }}
        onPress={() => {
          setUploading(true);
          setTimeout(() => setUploading(false), 1800);
        }}
      >
        {uploading ? 'Uploading…' : 'Upload photo'}
      </Button>
      <Button
        fullWidth
        variant="secondary"
        loading={syncing}
        spinnerProps={{ className: 'border-success/24 border-t-success' }}
        onPress={() => {
          setSyncing(true);
          setTimeout(() => setSyncing(false), 1800);
        }}
      >
        {syncing ? 'Syncing…' : 'Sync now'}
      </Button>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* ButtonGroup                                                                */
/* -------------------------------------------------------------------------- */

const LIBRARY_VIEWS = [
  { value: 'files', label: 'Files', icon: FileIcon },
  { value: 'media', label: 'Media', icon: ImageIcon },
  { value: 'saved', label: 'Saved', icon: BookmarkIcon },
] as const;

/**
 * A run of segments where one of them is the current one.
 *
 * The group has no idea which — it joins buttons and passes down a variant.
 * The selected segment says `secondary` for itself and wins, which is all
 * "selected" needs to be when the surrounding shape is already drawn.
 */
function ButtonGroupViewsDemo() {
  const [view, setView] = useState<string>('media');

  return (
    <ButtonGroup size="sm">
      {LIBRARY_VIEWS.map(({ value, label, icon: Icon }) => (
        <Button
          key={value}
          variant={view === value ? 'secondary' : 'ghost'}
          startContent={<Icon size={15} />}
          labelClassName={view === value ? 'font-semibold' : undefined}
          onPress={() => setView(value)}
        >
          {label}
        </Button>
      ))}
    </ButtonGroup>
  );
}

/** Text alone, sharing the row equally — the shape a plan picker wants. */
function ButtonGroupPlanDemo() {
  const [plan, setPlan] = useState('year');

  return (
    <ButtonGroup fullWidth>
      {[
        { value: 'month', label: 'Monthly' },
        { value: 'year', label: 'Annual' },
        { value: 'forever', label: 'One-off' },
      ].map(({ value, label }) => (
        <Button
          key={value}
          variant={plan === value ? 'secondary' : 'ghost'}
          onPress={() => setPlan(value)}
        >
          {label}
        </Button>
      ))}
    </ButtonGroup>
  );
}

/**
 * A split action: the thing itself, and the other ways to do it.
 *
 * The chevron segment is a Button inside a `Popover.Trigger`, which is the
 * case a group built out of a list of items cannot express — and the reason
 * the group passes its variant and size down through context rather than by
 * cloning its children.
 */
function ButtonGroupSplitDemo() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const pick = (what: string) => {
    setOpen(false);
    toast.show({ variant: 'success', label: what, duration: 2000 });
  };

  return (
    <ButtonGroup variant="outline">
      <Button
        startContent={<SendIcon size={16} />}
        onPress={() => pick('Publishing now')}
      >
        Publish
      </Button>
      <Popover open={open} onOpenChange={setOpen}>
        <Popover.Trigger>
          <Button size="icon" accessibilityLabel="More ways to publish">
            <ChevronDownIcon size={16} />
          </Button>
        </Popover.Trigger>
        <Popover.Content align="end" className="w-56 p-1.5">
          <Button variant="ghost" fullWidth className="justify-start" onPress={() => pick('Scheduled for tonight')}>
            Schedule for later
          </Button>
          <Button variant="ghost" fullWidth className="justify-start" onPress={() => pick('Saved as a draft')}>
            Save as draft
          </Button>
        </Popover.Content>
      </Popover>
    </ButtonGroup>
  );
}

/** Segments that are not all available, and one that is busy. */
function ButtonGroupStatesDemo() {
  const [saving, setSaving] = useState(false);

  const save = () => {
    setSaving(true);
    setTimeout(() => setSaving(false), 1600);
  };

  return (
    <View className="w-full items-center gap-4">
      <ButtonGroup variant="outline">
        <Button startContent={<PencilIcon size={16} />}>Rename</Button>
        <Button startContent={<CopyIcon size={16} />}>Duplicate</Button>
        {/* Disabled fades the segment without taking it out of the run —
            a shape with a hole in it is harder to read than a dim segment. */}
        <Button startContent={<TrashIcon size={16} />} disabled>
          Remove
        </Button>
      </ButtonGroup>

      <ButtonGroup variant="outline">
        <Button loading={saving} onPress={save}>
          {saving ? 'Saving' : 'Save layout'}
        </Button>
        <Button size="icon" accessibilityLabel="Revert">
          <RotateCcwIcon size={16} />
        </Button>
      </ButtonGroup>
    </View>
  );
}

/** A count carried inside a segment, beside the action it counts. */
function ButtonGroupCountDemo() {
  const [watching, setWatching] = useState(false);
  const [stars, setStars] = useState(148);

  return (
    <View className="w-full items-center gap-4">
      <ButtonGroup variant="outline">
        <Button
          startContent={<EyeIcon size={16} />}
          endContent={<Badge variant="secondary" count={watching ? 25 : 24} />}
          onPress={() => setWatching((on) => !on)}
        >
          {watching ? 'Watching' : 'Watch'}
        </Button>
        <Button size="icon" accessibilityLabel="Watch options">
          <ChevronDownIcon size={16} />
        </Button>
      </ButtonGroup>

      <ButtonGroup variant="outline">
        <Button
          startContent={<StarIcon size={16} />}
          endContent={<Badge variant="warning" count={stars} />}
          onPress={() => setStars((n) => n + 1)}
        >
          Star
        </Button>
        <Button size="icon" accessibilityLabel="Star options">
          <ChevronDownIcon size={16} />
        </Button>
      </ButtonGroup>
    </View>
  );
}

/** The toolbar down the side of a canvas. */
function ButtonGroupVerticalDemo() {
  return (
    <View className="w-full flex-row items-start justify-center gap-6">
      <ButtonGroup orientation="vertical" variant="outline" size="icon">
        <Button accessibilityLabel="Zoom in">
          <PlusIcon size={16} />
        </Button>
        <Button accessibilityLabel="Zoom out">
          <MinusIcon size={16} />
        </Button>
        <Button accessibilityLabel="Fit to screen">
          <MaximizeIcon size={16} />
        </Button>
        <Button accessibilityLabel="Recentre">
          <CrosshairIcon size={16} />
        </Button>
      </ButtonGroup>

      <ButtonGroup orientation="vertical" variant="outline" size="icon">
        <Button accessibilityLabel="Undo">
          <RotateCcwIcon size={16} />
        </Button>
        <Button accessibilityLabel="Redo">
          <RotateCwIcon size={16} />
        </Button>
      </ButtonGroup>
    </View>
  );
}

export const ENTRIES: ComponentEntry[] = [
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
      { label: 'Frosted backdrop', render: () => <BlurredSheetDemo /> },
      {
        label: 'Full height',
        id: 'full-height',
        fullPage: true,
        description:
          'A heading that stays put, a body that scrolls under it, and the action pinned within reach.',
        render: () => (
          <View className="flex-1 items-center justify-center p-5">
            <FullHeightSheetDemo />
          </View>
        ),
      },
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
      { label: 'Native, solid', render: () => <NativeBottomSheetDemo solid /> },
    ],
  },
{
    slug: 'breadcrumb',
    name: 'Breadcrumb',
    summary: 'The trail back up to the current page',
    demos: [
      {
        label: 'A trail',
        render: () => (
          <Breadcrumb>
            <Breadcrumb.List>
              <Breadcrumb.Item>
                <Breadcrumb.Link onPress={() => {}}>Home</Breadcrumb.Link>
              </Breadcrumb.Item>
              <Breadcrumb.Item>
                <Breadcrumb.Link onPress={() => {}}>Components</Breadcrumb.Link>
              </Breadcrumb.Item>
              <Breadcrumb.Item>
                <Breadcrumb.Page>Breadcrumb</Breadcrumb.Page>
              </Breadcrumb.Item>
            </Breadcrumb.List>
          </Breadcrumb>
        ),
      },
      {
        label: 'Custom separator',
        render: () => (
          // The chevron is the default; `separator` swaps it for any node
          // across every gap at once.
          <Breadcrumb separator={<Text size="sm" muted>/</Text>}>
            <Breadcrumb.List>
              <Breadcrumb.Item>
                <Breadcrumb.Link onPress={() => {}}>Docs</Breadcrumb.Link>
              </Breadcrumb.Item>
              <Breadcrumb.Item>
                <Breadcrumb.Link onPress={() => {}}>Guides</Breadcrumb.Link>
              </Breadcrumb.Item>
              <Breadcrumb.Item>
                <Breadcrumb.Page>Theming</Breadcrumb.Page>
              </Breadcrumb.Item>
            </Breadcrumb.List>
          </Breadcrumb>
        ),
      },
      {
        label: 'Collapsed',
        render: () => (
          // maxItems folds the middle into an ellipsis, keeping the first and
          // last crumbs. onEllipsisPress makes it a handle for a hidden-steps menu.
          <Breadcrumb>
            <Breadcrumb.List maxItems={3} onEllipsisPress={() => {}}>
              <Breadcrumb.Item>
                <Breadcrumb.Link onPress={() => {}}>Home</Breadcrumb.Link>
              </Breadcrumb.Item>
              <Breadcrumb.Item>
                <Breadcrumb.Link onPress={() => {}}>Library</Breadcrumb.Link>
              </Breadcrumb.Item>
              <Breadcrumb.Item>
                <Breadcrumb.Link onPress={() => {}}>Components</Breadcrumb.Link>
              </Breadcrumb.Item>
              <Breadcrumb.Item>
                <Breadcrumb.Page>Breadcrumb</Breadcrumb.Page>
              </Breadcrumb.Item>
            </Breadcrumb.List>
          </Breadcrumb>
        ),
      },
      {
        label: 'Dense header',
        render: () => (
          <Breadcrumb size="sm">
            <Breadcrumb.List>
              <Breadcrumb.Item>
                <Breadcrumb.Link onPress={() => {}}>Settings</Breadcrumb.Link>
              </Breadcrumb.Item>
              <Breadcrumb.Item>
                <Breadcrumb.Page>Billing</Breadcrumb.Page>
              </Breadcrumb.Item>
            </Breadcrumb.List>
          </Breadcrumb>
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
      { label: 'Spinner colour', render: () => <SpinnerColorButtonDemo /> },
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
      {
        label: 'Liquid Glass',
        render: () => <GlassButtonDemo />,
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
        label: 'Actions on their own surface',
        render: () => (
          /*
           * `variant="panel"` puts the buttons on a band of their own, so what
           * the card asks for is separated from what it says. It is the shape
           * that suits a card whose body is a form: without it the buttons read
           * as one more field.
           */
          <Card className="w-full">
            <Card.Header>
              <Card.Title>Login to your account</Card.Title>
              <Card.Description>
                Enter your email below to login to your account.
              </Card.Description>
            </Card.Header>
            <Card.Content className="gap-4">
              <Input label="Email" placeholder="m@example.com" />
              <Input label="Password" placeholder="••••••••" secureTextEntry />
            </Card.Content>
            <Card.Footer variant="panel" className="flex-col gap-2">
              <Button fullWidth>Login</Button>
              <Button fullWidth variant="outline">
                Login with Google
              </Button>
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
    slug: 'button-group',
    name: 'ButtonGroup',
    summary: 'Several buttons drawn as one control',
    demos: [
      { label: 'A view switcher', render: () => <ButtonGroupViewsDemo /> },
      { label: 'Sharing the row', render: () => <ButtonGroupPlanDemo /> },
      { label: 'A split action', render: () => <ButtonGroupSplitDemo /> },
      { label: 'Counts in a segment', render: () => <ButtonGroupCountDemo /> },
      { label: 'Busy and unavailable', render: () => <ButtonGroupStatesDemo /> },
      { label: 'Down the side', render: () => <ButtonGroupVerticalDemo /> },
      {
        label: 'Not joined',
        render: () => (
          <View className="w-full items-center gap-4">
            {/* Same shared variant and size, no shared shape — a toolbar
                rather than a segmented control. */}
            <ButtonGroup attached={false} variant="outline" size="sm">
              <Button startContent={<SearchIcon size={15} />}>Find</Button>
              <Button startContent={<DownloadIcon size={15} />}>Export</Button>
              <Button startContent={<ShareNodesIcon size={15} />}>Share</Button>
            </ButtonGroup>
            <Text size="xs" muted>
              attached={'{false}'}
            </Text>
          </View>
        ),
      },
      {
        label: 'Sizes',
        render: () => (
          <View className="w-full items-center gap-4">
            {(['sm', 'md', 'lg'] as const).map((size) => (
              <ButtonGroup key={size} size={size} variant="outline">
                <Button>Left</Button>
                <Button>Middle</Button>
                <Button>Right</Button>
              </ButtonGroup>
            ))}
          </View>
        ),
      },
    ],
  },
{
    slug: 'calendar',
    name: 'Calendar',
    summary: 'A month of days, for picking one, several, or a range',
    demos: [
      { label: 'A single day', render: () => <CalendarSingleDemo /> },
      { label: 'A range', render: () => <CalendarRangeDemo /> },
      { label: 'Several days', render: () => <CalendarMultipleDemo /> },
      { label: 'Days ruled out', render: () => <CalendarDisabledDemo /> },
      { label: 'The months either side', render: () => <CalendarOutsideDaysDemo /> },
      { label: 'Month and year pickers', render: () => <CalendarDropdownDemo /> },
      { label: 'Hijri or Gregorian', render: () => <CalendarSystemDemo /> },
    ],
  },
{
    slug: 'carousel',
    name: 'Carousel',
    summary: 'A run of slides, one at a time, dragged with a finger',
    demos: [
      { label: 'A track', render: () => <CarouselTrackDemo /> },
      { label: 'Interactive', render: () => <CarouselInteractiveDemo /> },
      { label: 'Interactive, bare', render: () => <CarouselBareDemo /> },
      { label: 'Coverflow', render: () => <CarouselCoverflowDemo /> },
      { label: 'A deck of cards', render: () => <CarouselStackDemo /> },
      { label: 'Autoplay, looping', render: () => <CarouselAutoplayDemo /> },
    ],
  },
{
    slug: 'checkbox',
    name: 'Checkbox',
    summary: 'Multi-select control with label',
    demos: [
      { label: 'With descriptions', render: () => <CheckboxDemo /> },
      { label: 'Select all', render: () => <CheckboxSelectAllDemo /> },
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
  }
];
export const ENTRIES_BY_SLUG = Object.fromEntries(ENTRIES.map((entry) => [entry.slug, entry]));
