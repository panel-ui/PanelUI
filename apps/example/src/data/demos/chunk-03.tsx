import { useEffect, useState, type ReactNode } from "react";
import { Linking, Platform, ScrollView, View } from "react-native";
import { Badge, BellIcon, BottomSheet, Button, Combobox, Card, CardIcon, CheckIcon, ChevronRightIcon, Chip, Collapsible, type CollapsibleVariant, ColorPicker, DatePicker, DateTimePicker, type DateRange, Dialog, Direction, type DirectionValue, Feedback, Field, Frame, Input, Item, Label, Message, Progress, Questionnaire, type QuestionnaireAnswers, Rating, SearchIcon, SendIcon, ShieldCheckIcon, Separator, Shimmer, Slider, StarIcon, Surface, Switch, Text, Textarea, ToggleButton, ToggleButtonGroup, XIcon, cn, useDirection } from "panelui-native";
import { useCSSVariable } from 'uniwind';
import type { ComponentEntry } from '../component-types';

function DatePickerDemo() {
  const [day, setDay] = useState<Date>();
  const [range, setRange] = useState<DateRange>();
  const [birthday, setBirthday] = useState<Date>();

  return (
    <View className="w-full gap-6">
      <View className="gap-2">
        <Label>Date</Label>
        <DatePicker selected={day} onSelect={setDay} />
      </View>

      <View className="gap-2">
        <Label>Stay</Label>
        {/* A range waits for its second end before it closes — shutting on the
            first tap would leave half a range on screen and no way back to it. */}
        <DatePicker
          mode="range"
          selected={range}
          onSelect={setRange}
          placeholder="Check in — check out"
          minDate={new Date()}
        />
      </View>

      <View className="gap-2">
        <Label>Date of birth</Label>
        <DatePicker
          selected={birthday}
          onSelect={setBirthday}
          captionLayout="dropdown"
          maxDate={new Date()}
          placeholder="Choose a date"
        />
      </View>
    </View>
  );
}

/** In a sheet instead, for a form with the keyboard already up. */
function DatePickerSheetDemo() {
  const [day, setDay] = useState<Date>();
  return (
    <View className="w-full gap-4">
      <DatePicker
        selected={day}
        onSelect={setDay}
        presentation="bottom-sheet"
        placeholder="Pick a date in a sheet"
      />
      <Text size="sm" muted>
        The anchored panel is the default: a month grid is a fixed size and fits
        beside its trigger. A sheet earns its place when the screen is busy.
      </Text>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* DateTimePicker                                                             */
/* -------------------------------------------------------------------------- */

/** Both halves in one panel, and one Done that finishes them together. */
function DateTimePickerDemo() {
  const [when, setWhen] = useState<Date>();

  return (
    <View className="w-full gap-4">
      <DateTimePicker value={when} onValueChange={setWhen} />
      <Text size="sm" muted>
        {when
          ? when.toLocaleString(undefined, {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              hour: 'numeric',
              minute: '2-digit',
            })
          : 'One value, filled in from either end — the day first or the time first.'}
      </Text>
    </View>
  );
}

/** In a sheet, which is where a panel this tall usually belongs on a phone. */
function DateTimePickerSheetDemo() {
  const [when, setWhen] = useState<Date>();

  return (
    <View className="w-full gap-4">
      <DateTimePicker
        value={when}
        onValueChange={setWhen}
        presentation="bottom-sheet"
        placeholder="Pick a moment in a sheet"
      />
      <Text size="sm" muted>
        A calendar and a scale stacked is a tall panel, and a sheet has the
        height to give it without the popover having to leave the screen.
      </Text>
    </View>
  );
}

/** The wheel face instead of the ruler, for a time down to the minute. */
function DateTimePickerWheelDemo() {
  const [when, setWhen] = useState<Date>();

  return (
    <View className="w-full gap-4">
      <DateTimePicker
        value={when}
        onValueChange={setWhen}
        layout="wheel"
        hourCycle={24}
        minuteStep={5}
        presentation="dialog"
        placeholder="Pick to the minute"
      />
      <Text size="sm" muted>
        The ruler is the default because it fits under a month grid. Where the
        exact minute matters more than the height, the wheel is a prop away.
      </Text>
    </View>
  );
}

/** A slot inside opening hours, on a day inside the booking window. */
function DateTimePickerSlotDemo() {
  const [when, setWhen] = useState<Date>();

  const today = new Date();
  const window = new Date(today);
  window.setDate(window.getDate() + 21);

  return (
    <View className="w-full gap-3">
      <Frame className="w-full">
        <Frame.Header>
          <Frame.Title>Book a fitting</Frame.Title>
          <Frame.Action>30 minutes</Frame.Action>
        </Frame.Header>
        <Frame.Panel>
          <View className="p-3">
            {/* Bounded on both axes: three weeks of days, and only the hours
                the shop is open. A picker that offers a slot nobody can be
                given is a picker that has to reject it later. */}
            <DateTimePicker
              presentation="inline"
              value={when}
              onValueChange={setWhen}
              minDate={today}
              maxDate={window}
              minTime={{ hour: 9, minute: 0 }}
              maxTime={{ hour: 17, minute: 30 }}
              minuteStep={30}
            />
          </View>
        </Frame.Panel>
      </Frame>
      <Text size="sm" muted className="text-center">
        {when
          ? when.toLocaleString(undefined, {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              hour: 'numeric',
              minute: '2-digit',
            })
          : 'Next three weeks, 9:00 to 17:30'}
      </Text>
    </View>
  );
}

/** A filter bar: any chip can be a filter, its `selected` state doing the work. */
function ChipFilterDemo() {
  const [tags, setTags] = useState<string[]>(['design']);

  const toggle = (id: string) =>
    setTags((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );

  return (
    <View className="w-full flex-row flex-wrap justify-center gap-2">
      {['design', 'code', 'research', 'ops'].map((id) => (
        <Chip
          key={id}
          selected={tags.includes(id)}
          onPress={() => toggle(id)}
          haptics
        >
          {id}
        </Chip>
      ))}
    </View>
  );
}

/** Removable tokens: the ✕ is its own hit target, so it never fires `onPress`. */
function ChipRemovableDemo() {
  const [people, setPeople] = useState(['Ada', 'Grace', 'Alan', 'Katherine']);

  return (
    <View className="w-full flex-row flex-wrap justify-center gap-2">
      {people.map((name) => (
        <Chip
          key={name}
          variant="outline"
          onClose={() => setPeople((p) => p.filter((n) => n !== name))}
        >
          {name}
        </Chip>
      ))}
      {people.length === 0 ? (
        <Text size="sm" muted>
          Everyone removed — reopen the screen to reset.
        </Text>
      ) : null}
    </View>
  );
}

/** Enough of a list that typing beats scrolling, and short enough to read. */
const FRAMEWORKS = [
  { value: 'expo', label: 'Expo' },
  { value: 'react-native', label: 'React Native' },
  { value: 'next', label: 'Next.js' },
  { value: 'remix', label: 'Remix' },
  { value: 'astro', label: 'Astro' },
  { value: 'nuxt', label: 'Nuxt' },
  { value: 'svelte-kit', label: 'SvelteKit' },
  { value: 'solid-start', label: 'SolidStart' },
  { value: 'qwik', label: 'Qwik City' },
];

function ComboboxDemo() {
  const [framework, setFramework] = useState<string>();

  return (
    <View className="w-full gap-1.5">
      <Label>Framework</Label>
      <Combobox
        value={framework}
        onValueChange={setFramework}
        placeholder="Search frameworks"
        clearable
      >
        {FRAMEWORKS.map((item) => (
          <Combobox.Item key={item.value} value={item.value} label={item.label} />
        ))}
      </Combobox>
    </View>
  );
}

/** Headings make a long list scannable before the query narrows it. */
function ComboboxGroupedDemo() {
  const [framework, setFramework] = useState<string>();

  return (
    <View className="w-full gap-1.5">
      <Label>Framework</Label>
      <Combobox
        value={framework}
        onValueChange={setFramework}
        placeholder="Search frameworks"
        openOnFocus
      >
        <Combobox.Group label="Native">
          <Combobox.Item value="expo" label="Expo" />
          <Combobox.Item value="react-native" label="React Native" />
        </Combobox.Group>
        <Combobox.Group label="Web">
          <Combobox.Item value="next" label="Next.js" />
          <Combobox.Item value="remix" label="Remix" />
          <Combobox.Item value="astro" label="Astro" />
        </Combobox.Group>
      </Combobox>
    </View>
  );
}

function ComboboxMultipleDemo() {
  const [picked, setPicked] = useState<string[]>(['expo']);

  return (
    <View className="w-full gap-1.5">
      <Label>Stack</Label>
      <Combobox
        mode="multiple"
        value={picked}
        onValueChange={setPicked}
        placeholder="Add a framework"
        clearable
      >
        {FRAMEWORKS.map((item) => (
          <Combobox.Item key={item.value} value={item.value} label={item.label} />
        ))}
      </Combobox>
      <Text size="sm" muted>
        Each pick becomes a chip. Backspace on the empty field takes the last one
        back.
      </Text>
    </View>
  );
}

/** A tag field: the list suggests, it does not decide. */
function ComboboxTagsDemo() {
  const [tags, setTags] = useState<string[]>(['design']);

  return (
    <View className="w-full gap-1.5">
      <Label>Tags</Label>
      <Combobox
        mode="multiple"
        value={tags}
        onValueChange={setTags}
        allowCustomValue
        placeholder="Add a tag"
        emptyMessage="No tag by that name yet"
      >
        <Combobox.Item value="design" label="design" />
        <Combobox.Item value="engineering" label="engineering" />
        <Combobox.Item value="research" label="research" />
      </Combobox>
      <Text size="sm" muted>
        Type something that is not on the list and press return to keep it.
      </Text>
    </View>
  );
}

/**
 * Options fetched for the query. `filter={false}` because the matching already
 * happened somewhere else — filtering again here would only drop correct
 * answers the field cannot see the reasoning behind.
 */
function ComboboxAsyncDemo() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ value: string; label: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [city, setCity] = useState<string>();

  useEffect(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      setResults([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    // Stands in for a request. The timer is cleared on the next keystroke, so
    // a fast typist makes one "call" rather than one per character.
    const timer = setTimeout(() => {
      setResults(
        TIMEZONES.filter((tz) => tz.label.toLowerCase().includes(needle)).slice(0, 6)
      );
      setLoading(false);
    }, 450);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <View className="w-full gap-1.5">
      <Label>City</Label>
      <Combobox
        value={city}
        onValueChange={setCity}
        inputValue={query}
        onInputValueChange={setQuery}
        filter={false}
        loading={loading}
        loadingMessage="Looking up cities"
        emptyMessage="No city by that name"
        placeholder="Search cities"
        clearable
      >
        {results.map((item) => (
          <Combobox.Item key={item.value} value={item.value} label={item.label} />
        ))}
      </Combobox>
    </View>
  );
}

function ComboboxInlineDemo() {
  const [framework, setFramework] = useState<string>();

  return (
    <View className="w-full gap-4">
      <View className="w-full gap-1.5">
        <Label>Framework</Label>
        <Combobox
          presentation="inline"
          value={framework}
          onValueChange={setFramework}
          placeholder="Search frameworks"
        >
          {FRAMEWORKS.map((item) => (
            <Combobox.Item key={item.value} value={item.value} label={item.label} />
          ))}
        </Combobox>
      </View>
      <Text size="sm" muted>
        The list expands in layout flow, so this paragraph is pushed down by its
        height instead of being covered by it.
      </Text>
    </View>
  );
}

/** Long enough that scrolling it is not a way of finding anything. */
const TIMEZONES = [
  { value: 'utc', label: 'UTC' },
  { value: 'europe/london', label: 'London' },
  { value: 'europe/paris', label: 'Paris' },
  { value: 'europe/berlin', label: 'Berlin' },
  { value: 'europe/madrid', label: 'Madrid' },
  { value: 'europe/istanbul', label: 'Istanbul' },
  { value: 'africa/cairo', label: 'Cairo' },
  { value: 'africa/lagos', label: 'Lagos' },
  { value: 'africa/nairobi', label: 'Nairobi' },
  { value: 'asia/dubai', label: 'Dubai' },
  { value: 'asia/karachi', label: 'Karachi' },
  { value: 'asia/kolkata', label: 'Kolkata' },
  { value: 'asia/singapore', label: 'Singapore' },
  { value: 'asia/tokyo', label: 'Tokyo' },
  { value: 'australia/sydney', label: 'Sydney' },
  { value: 'america/sao_paulo', label: 'São Paulo' },
  { value: 'america/new_york', label: 'New York' },
  { value: 'america/chicago', label: 'Chicago' },
  { value: 'america/denver', label: 'Denver' },
  { value: 'america/los_angeles', label: 'Los Angeles' },
];

function ColorPickerDemo() {
  const [color, setColor] = useState('#22c55e');

  return (
    <View className="w-full gap-4">
      <ColorPicker value={color} onValueChange={setColor}>
        <ColorPicker.Area />
        <ColorPicker.Hue />
        <ColorPicker.Preview showValue />
      </ColorPicker>
      {/* The picked colour, applied to something — a swatch on its own says
          nothing about whether the value is usable. */}
      <Button className="w-full" style={{ backgroundColor: color }}>
        Save theme
      </Button>
    </View>
  );
}

function ColorPickerCardVersion() {
  const [accent, setAccent] = useState('#3b82f6');
  const [surface, setSurface] = useState('#0f172a');

  return (
    <View className="w-full gap-3 p-4">
      <Text size="sm" muted>
        Press a row to open its picker.
      </Text>

      {/* Each row reads out the colour it would let you change, and is the
          thing you press to change it. The controls arrive over the row rather
          than under it, so two of them cost two rows of the screen instead of
          two panels. */}
      <ColorPicker value={accent} onValueChange={setAccent} presentation="popover">
        <ColorPicker.Trigger>
          <ColorPicker.Field label="Accent" />
        </ColorPicker.Trigger>
        <ColorPicker.Content>
          <ColorPicker.Area height={220} />
          <ColorPicker.Channel channel="hue" />
          <ColorPicker.Hue />
        </ColorPicker.Content>
      </ColorPicker>

      <ColorPicker value={surface} onValueChange={setSurface} presentation="popover">
        <ColorPicker.Trigger>
          <ColorPicker.Field label="Surface" />
        </ColorPicker.Trigger>
        <ColorPicker.Content>
          <ColorPicker.Area height={220} />
          <ColorPicker.Channel channel="hue" />
          <ColorPicker.Hue />
        </ColorPicker.Content>
      </ColorPicker>
    </View>
  );
}

function ColorPickerInlineVersion() {
  const [color, setColor] = useState('#3b82f6');

  return (
    <View className="w-full gap-3 p-4">
      {/* The strip names what is being picked and prints what it currently is;
          the readout under the square names the track below it. Together they
          turn a set of controls into a labelled panel. */}
      <ColorPicker value={color} onValueChange={setColor}>
        <ColorPicker.Field label="Accent" />
        <Surface variant="secondary" padding="sm" className="gap-3 rounded-2xl">
          <ColorPicker.Area height={280} />
          <ColorPicker.Channel channel="hue" />
          <ColorPicker.Hue />
        </Surface>
      </ColorPicker>
    </View>
  );
}

function ColorPickerSheetVersion() {
  const [color, setColor] = useState('#22c55e');

  return (
    <View className="w-full gap-3 p-4">
      <Text size="sm" muted>
        The same picker, brought up from the bottom edge instead.
      </Text>
      <ColorPicker value={color} onValueChange={setColor} presentation="bottom-sheet">
        <ColorPicker.Trigger>
          <ColorPicker.Field label="Highlight" />
        </ColorPicker.Trigger>
        <ColorPicker.Content>
          <ColorPicker.Area height={240} />
          <ColorPicker.Channel channel="hue" />
          <ColorPicker.Hue />
          <ColorPicker.Channel channel="alpha" />
          <ColorPicker.Alpha />
        </ColorPicker.Content>
      </ColorPicker>
    </View>
  );
}

function ColorPickerWheelVersion() {
  const [color, setColor] = useState('#f97316');

  return (
    <View className="w-full gap-3 p-4">
      <Text size="sm" muted>
        Press the row to open its picker.
      </Text>

      {/* Hue runs around and saturation runs out, so brightness has nowhere
          left to go on the disc and takes a track of its own. Behind a row, the
          way the square is: the disc is a way of picking a colour, not a
          different kind of control that has to live in the page. */}
      <ColorPicker value={color} onValueChange={setColor} presentation="popover">
        <ColorPicker.Trigger>
          <ColorPicker.Field label="Brand" />
        </ColorPicker.Trigger>
        <ColorPicker.Content>
          <View className="items-center py-2">
            <ColorPicker.Wheel />
          </View>
          <ColorPicker.Channel channel="brightness" />
          <ColorPicker.Brightness />
          <ColorPicker.Channel channel="alpha" />
          <ColorPicker.Alpha />
        </ColorPicker.Content>
      </ColorPicker>
    </View>
  );
}

function ColorPickerAlphaDemo() {
  const [color, setColor] = useState('rgba(59, 130, 246, 0.6)');

  return (
    <View className="w-full gap-4">
      <ColorPicker value={color} onValueChange={setColor} format="rgb">
        <ColorPicker.Area height={150} />
        <ColorPicker.Hue />
        <ColorPicker.Alpha />
        <ColorPicker.Preview showValue />
      </ColorPicker>
      <Card className="w-full">
        <Card.Content className="gap-2 p-4">
          <Text size="sm" muted>
            Overlay
          </Text>
          <View className="h-16 w-full rounded-lg" style={{ backgroundColor: color }} />
        </Card.Content>
      </Card>
    </View>
  );
}

function ColorPickerSwatchesDemo() {
  const [color, setColor] = useState('#f97316');

  return (
    <ColorPicker value={color} onValueCommit={setColor} size="sm">
      <ColorPicker.Swatches
        colors={[
          '#ef4444',
          '#f97316',
          '#eab308',
          '#22c55e',
          '#06b6d4',
          '#3b82f6',
          '#8b5cf6',
          '#ec4899',
          '#0f172a',
        ]}
      />
      <ColorPicker.Area height={120} />
      <ColorPicker.Hue />
      <ColorPicker.Preview showValue />
    </ColorPicker>
  );
}

/* -------------------------------------------------------------------------- */
/* Direction                                                                  */
/* -------------------------------------------------------------------------- */

/** Rows with a leading icon and a trailing chevron — the thing RTL mirrors. */
function DirectionRows() {
  return (
    <Item.Group>
      <Item>
        <Item.Media variant="icon">
          <BellIcon size={16} />
        </Item.Media>
        <Item.Content>
          <Item.Title>Notifications</Item.Title>
          <Item.Description>Badges, sounds, banners</Item.Description>
        </Item.Content>
        <Item.Actions>
          <ChevronRightIcon size={16} />
        </Item.Actions>
      </Item>
      <Item.Separator />
      <Item>
        <Item.Media variant="icon">
          <ShieldCheckIcon size={16} />
        </Item.Media>
        <Item.Content>
          <Item.Title>Privacy</Item.Title>
          <Item.Description>Two-factor is on</Item.Description>
        </Item.Content>
        <Item.Actions>
          <ChevronRightIcon size={16} />
        </Item.Actions>
      </Item>
      <Item.Separator />
      <Item>
        <Item.Media variant="icon">
          <CardIcon size={16} />
        </Item.Media>
        <Item.Content>
          <Item.Title>Payment</Item.Title>
          <Item.Description>Visa ending 4242</Item.Description>
        </Item.Content>
        <Item.Actions>
          <ChevronRightIcon size={16} />
        </Item.Actions>
      </Item>
      <Item.Separator />
      {/* The send glyph is a direction too, and mirrors with the chevrons —
          toggle back and forth and both have to follow every time, not once. */}
      <Item>
        <Item.Media variant="icon">
          <SendIcon size={16} />
        </Item.Media>
        <Item.Content>
          <Item.Title>Send feedback</Item.Title>
          <Item.Description>Goes to the team</Item.Description>
        </Item.Content>
        <Item.Actions>
          <ChevronRightIcon size={16} />
        </Item.Actions>
      </Item>
    </Item.Group>
  );
}

function DirectionFlipDemo() {
  const [dir, setDir] = useState<string[]>(['rtl']);
  const value = dir[0] === 'rtl' ? 'rtl' : 'ltr';

  return (
    <View className="w-full gap-4">
      <ToggleButtonGroup selectionMode="single" value={dir} onValueChange={setDir}>
        <ToggleButton id="ltr">ltr</ToggleButton>
        <ToggleButton id="rtl">rtl</ToggleButton>
      </ToggleButtonGroup>
      {/* It takes no layout of its own, so it is as tall as the rows in it. */}
      <Direction dir={value} className="w-full">
        <DirectionRows />
      </Direction>
    </View>
  );
}

/** Reads the value back out, which is what a component flipping its own maths does. */
function DirectionReadout() {
  const dir = useDirection();

  return (
    <View className="flex-row items-center justify-between gap-3 px-4 py-3">
      <Text size="sm" muted>
        useDirection()
      </Text>
      <Badge variant="secondary">{dir}</Badge>
    </View>
  );
}

function DirectionNestedDemo() {
  return (
    <Direction dir="rtl" className="w-full gap-3">
      <Surface variant="secondary" className="w-full p-4">
        <Text weight="medium">حساب المستخدم</Text>
        <Text size="sm" muted>
          The card, its padding and its rows all mirror.
        </Text>
      </Surface>
      <Surface variant="secondary" className="w-full">
        <DirectionReadout />
        {/* An island that must not flip: an identifier reads the same way in
            every locale, and mirroring it makes it wrong rather than localised. */}
        <Direction dir="ltr" className="border-t border-border">
          <View className="px-4 pt-3">
            <Text size="sm">+1 (555) 010-4477</Text>
          </View>
          <DirectionReadout />
        </Direction>
      </Surface>
    </Direction>
  );
}

/**
 * A whole screen run through both directions.
 *
 * The point is the things Yoga cannot flip on its own: a slider's drag, a
 * switch's thumb, a shimmer's sweep, a chevron's glyph and a paragraph's
 * alignment are all pixel maths or text metrics rather than layout, and each
 * one had to be taught to read the direction. Side by side is the only way to
 * see whether they actually did.
 */
function DirectionScreenVersion() {
  const [selection, setSelection] = useState<string[]>(['rtl']);
  const dir: DirectionValue = selection[0] === 'ltr' ? 'ltr' : 'rtl';
  const [volume, setVolume] = useState(65);
  const [sync, setSync] = useState(true);

  return (
    <View className="flex-1">
      <View className="items-center p-4">
        <ToggleButtonGroup
          selectionMode="single"
          value={selection}
          onValueChange={setSelection}
        >
          <ToggleButton id="ltr">ltr</ToggleButton>
          <ToggleButton id="rtl">rtl</ToggleButton>
        </ToggleButtonGroup>
      </View>

      <Direction dir={dir} className="flex-1">
        <ScrollView contentContainerClassName="gap-4 p-4 pb-10">
          <View className="gap-1">
            <Text size="lg" weight="semibold">
              {dir === 'rtl' ? 'الإعدادات' : 'Settings'}
            </Text>
            <Text size="sm" muted>
              {dir === 'rtl'
                ? 'تتبع المحاذاة اتجاه القراءة، وليس إعداد الجهاز.'
                : 'Alignment follows the reading direction, not the device setting.'}
            </Text>
          </View>

          <Surface variant="secondary">
            <Item>
              <Item.Media>
                <BellIcon size={18} />
              </Item.Media>
              <Item.Content>
                <Item.Title>{dir === 'rtl' ? 'الإشعارات' : 'Notifications'}</Item.Title>
                <Item.Description>
                  {dir === 'rtl' ? 'يتبع الشيفرون الاتجاه' : 'The chevron follows the direction'}
                </Item.Description>
              </Item.Content>
              <Item.Actions>
                <ChevronRightIcon size={16} />
              </Item.Actions>
            </Item>
            <Separator />
            <Item>
              <Item.Content>
                <Item.Title>{dir === 'rtl' ? 'المزامنة' : 'Sync'}</Item.Title>
                <Item.Description>
                  {dir === 'rtl' ? 'يتحرك المفتاح للجهة الصحيحة' : 'The thumb travels the right way'}
                </Item.Description>
              </Item.Content>
              <Item.Actions>
                <Switch value={sync} onValueChange={setSync} />
              </Item.Actions>
            </Item>
          </Surface>

          <Card>
            <Card.Header>
              <Card.Title>{dir === 'rtl' ? 'مستوى الصوت' : 'Volume'}</Card.Title>
              <Card.Description>
                {dir === 'rtl'
                  ? 'اسحب: يتبع الإبهام إصبعك في كلا الاتجاهين.'
                  : 'Drag it — the thumb follows your finger in both directions.'}
              </Card.Description>
            </Card.Header>
            <Card.Content className="gap-4">
              <Slider value={volume} onValueChange={setVolume} min={0} max={100} />
              <Progress value={volume} />
              <Shimmer>
                <Text size="sm" muted>
                  {dir === 'rtl' ? 'يمسح مع النص' : 'The sweep runs with the script'}
                </Text>
              </Shimmer>
            </Card.Content>
          </Card>

          <Message align="start">
            <Message.Bubble>
              {dir === 'rtl' ? 'يشير الركن المربع إلى المرسل.' : 'The squared corner points back at its sender.'}
            </Message.Bubble>
          </Message>
        </ScrollView>
      </Direction>
    </View>
  );
}

/** Funnel stages are counts of people, and a count reads with its separators. */
const people = (value: number) => value.toLocaleString();

/* -------------------------------------------------------------------------- */
/* Questionnaire                                                              */
/* -------------------------------------------------------------------------- */

const PROTOTYPE_QUESTIONS = [
  { name: 'direction', required: true },
  { name: 'detail' },
] as const;

/** One answer to each of two questions, the second of which can be skipped. */
function QuestionnaireDemo() {
  const [answers, setAnswers] = useState<QuestionnaireAnswers>({});

  return (
    <View className="w-full gap-4">
      <Questionnaire
        items={PROTOTYPE_QUESTIONS}
        onAnswersChange={setAnswers}
        onSubmit={(final) => setAnswers(final)}
      >
        <Questionnaire.Title>Prototype</Questionnaire.Title>
        <Questionnaire.Progress />
        <Questionnaire.Item name="direction" required>
          <Questionnaire.Question>What should we build next?</Questionnaire.Question>
          <Questionnaire.Description>
            Choose the direction you want to see first.
          </Questionnaire.Description>
          <Questionnaire.Choices>
            <Questionnaire.Choice
              value="delegation"
              label="Delegation"
              description="Show how work moves to a specialist."
            />
            <Questionnaire.Choice
              value="prompts"
              label="Question prompts"
              description="Show choices while the interface waits."
            />
            <Questionnaire.Choice value="both" label="Both together" />
          </Questionnaire.Choices>
          <Questionnaire.Error />
        </Questionnaire.Item>
        <Questionnaire.Item name="detail">
          <Questionnaire.Question>How much detail?</Questionnaire.Question>
          <Questionnaire.Description>
            Skip this one if you have not decided.
          </Questionnaire.Description>
          <Questionnaire.Choices>
            <Questionnaire.Choice value="focused" label="Focused" />
            <Questionnaire.Choice value="complete" label="The complete flow" />
          </Questionnaire.Choices>
        </Questionnaire.Item>
        <Questionnaire.Footer>
          <Questionnaire.Back />
          <Questionnaire.Spacer />
          <Questionnaire.Skip />
          <Questionnaire.Next />
          <Questionnaire.Submit />
        </Questionnaire.Footer>
      </Questionnaire>
      <Text size="sm" muted>
        {Object.keys(answers).length > 0
          ? JSON.stringify(answers)
          : 'Every answer arrives under the question’s own name.'}
      </Text>
    </View>
  );
}

/** A question that takes as many answers as apply, so its answer is a list. */
function QuestionnaireMultipleDemo() {
  const [answers, setAnswers] = useState<QuestionnaireAnswers>({});

  return (
    <View className="w-full gap-4">
      <Questionnaire onAnswersChange={setAnswers}>
        <Questionnaire.Progress />
        <Questionnaire.Item name="signals" required multiple>
          <Questionnaire.Question>What should every update include?</Questionnaire.Question>
          <Questionnaire.Description>Select all that apply.</Questionnaire.Description>
          <Questionnaire.Choices>
            <Questionnaire.Choice value="progress" label="Progress" />
            <Questionnaire.Choice value="decisions" label="Decisions" />
            <Questionnaire.Choice value="risks" label="Risks" />
          </Questionnaire.Choices>
          <Questionnaire.Error />
        </Questionnaire.Item>
        <Questionnaire.Footer>
          <Questionnaire.Spacer />
          <Questionnaire.Submit />
        </Questionnaire.Footer>
      </Questionnaire>
      <Text size="sm" muted>
        {Array.isArray(answers.signals) && answers.signals.length > 0
          ? answers.signals.join(', ')
          : 'A question that takes several answers stores them as a list.'}
      </Text>
    </View>
  );
}

/** The text field holds whatever answer the fixed choices do not offer. */
function QuestionnaireFreeformDemo() {
  const [answers, setAnswers] = useState<QuestionnaireAnswers>({});

  return (
    <View className="w-full gap-4">
      <Questionnaire onAnswersChange={setAnswers}>
        <Questionnaire.Progress />
        <Questionnaire.Item name="tool" required>
          <Questionnaire.Question>Where do you keep your notes?</Questionnaire.Question>
          <Questionnaire.Choices>
            <Questionnaire.Choice value="files" label="Plain files" />
            <Questionnaire.Choice value="issues" label="Issue tracker" />
            <Questionnaire.Input placeholder="Somewhere else…" />
          </Questionnaire.Choices>
          <Questionnaire.Error />
        </Questionnaire.Item>
        <Questionnaire.Footer>
          <Questionnaire.Spacer />
          <Questionnaire.Submit />
        </Questionnaire.Footer>
      </Questionnaire>
      <Text size="sm" muted>
        Picking a choice empties the field, and typing clears the choice — one
        answer to one question either way.
      </Text>
    </View>
  );
}

/** A letter beside every answer, counting only the ones that can be picked. */
function QuestionnaireShortcutsDemo() {
  return (
    <View className="w-full gap-4">
      <Questionnaire shortcuts="letters">
        <Questionnaire.Progress />
        <Questionnaire.Item name="review" required>
          <Questionnaire.Question>What should be reviewed first?</Questionnaire.Question>
          <Questionnaire.Choices>
            <Questionnaire.Choice value="api" label="The public API" />
            <Questionnaire.Choice value="tests" label="Test coverage" />
            <Questionnaire.Choice value="perf" label="Performance" disabled />
            <Questionnaire.Choice value="docs" label="The documentation" />
          </Questionnaire.Choices>
        </Questionnaire.Item>
        <Questionnaire.Footer>
          <Questionnaire.Spacer />
          <Questionnaire.Submit />
        </Questionnaire.Footer>
      </Questionnaire>
      <Text size="sm" muted>
        Performance is disabled, so it takes no letter with it and the
        documentation is C.
      </Text>
    </View>
  );
}

/** Numbers instead of pips, for a flow the reader gets sent back through. */
function QuestionnaireNumbersDemo() {
  return (
    <View className="w-full gap-4">
      <Questionnaire items={PROTOTYPE_QUESTIONS}>
        <Questionnaire.Title>Prototype</Questionnaire.Title>
        <Questionnaire.Progress variant="numbers" />
        <Questionnaire.Item name="direction" required>
          <Questionnaire.Question>What should we build next?</Questionnaire.Question>
          <Questionnaire.Choices>
            <Questionnaire.Choice value="delegation" label="Delegation" />
            <Questionnaire.Choice value="prompts" label="Question prompts" />
          </Questionnaire.Choices>
          <Questionnaire.Error />
        </Questionnaire.Item>
        <Questionnaire.Item name="detail">
          <Questionnaire.Question>How much detail?</Questionnaire.Question>
          <Questionnaire.Choices>
            <Questionnaire.Choice value="focused" label="Focused" />
            <Questionnaire.Choice value="complete" label="The complete flow" />
          </Questionnaire.Choices>
        </Questionnaire.Item>
        <Questionnaire.Footer>
          <Questionnaire.Back />
          <Questionnaire.Spacer />
          <Questionnaire.Skip />
          <Questionnaire.Next />
          <Questionnaire.Submit />
        </Questionnaire.Footer>
      </Questionnaire>
      <Text size="sm" muted>
        A number says which question this is, which an arc cannot — worth it
        where somebody is going to be sent back to one of them.
      </Text>
    </View>
  );
}

/** No frame, for a questionnaire in something that draws its own boundary. */
function QuestionnaireBareDemo() {
  return (
    <View className="w-full">
      <Card>
        {/*
          `pt-6`, because Card.Content is `p-6 pt-0` — it expects a Card.Header
          above it, and without one the questionnaire's progress row starts
          flush against the card's top edge.
        */}
        <Card.Content className="pt-6">
          <Questionnaire frame={false}>
            <Questionnaire.Title>Timing</Questionnaire.Title>
            <Questionnaire.Progress />
            <Questionnaire.Item name="timing" required>
              <Questionnaire.Question>When should this ship?</Questionnaire.Question>
              <Questionnaire.Choices>
                <Questionnaire.Choice value="week" label="This week" />
                <Questionnaire.Choice value="cycle" label="Next cycle" />
              </Questionnaire.Choices>
            </Questionnaire.Item>
            <Questionnaire.Footer>
              <Questionnaire.Spacer />
              <Questionnaire.Submit />
            </Questionnaire.Footer>
          </Questionnaire>
        </Card.Content>
      </Card>
    </View>
  );
}

/* --- Versions ------------------------------------------------------------- */

const ONBOARDING_QUESTIONS = [
  { name: 'role', required: true },
  { name: 'size', required: true },
  { name: 'stack', multiple: true },
  { name: 'timeline' },
  { name: 'contact', required: true },
] as const;

const ONBOARDING_LABELS: Record<string, string> = {
  role: 'Role',
  size: 'Team size',
  stack: 'Stack',
  timeline: 'Timeline',
  contact: 'Best way to reach you',
};

/** Five questions and the summary they add up to. */
function QuestionnaireOnboardingVersion() {
  const [done, setDone] = useState<QuestionnaireAnswers | null>(null);

  if (done) {
    return (
      <ScrollView contentContainerClassName="gap-4 p-4">
        <Text size="xl" weight="semibold">
          That is everything
        </Text>
        <Frame>
          <Frame.Header>
            <Frame.Title>Your answers</Frame.Title>
          </Frame.Header>
          <Frame.Panel>
            {Object.entries(done).map(([name, value]) => (
              <Frame.Row key={name}>
                <Frame.Content>
                  <Frame.Title>{ONBOARDING_LABELS[name] ?? name}</Frame.Title>
                  <Frame.Description>
                    {Array.isArray(value) ? value.join(', ') : value}
                  </Frame.Description>
                </Frame.Content>
              </Frame.Row>
            ))}
          </Frame.Panel>
        </Frame>
        <Button variant="outline" onPress={() => setDone(null)}>
          Start over
        </Button>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerClassName="gap-4 p-4">
      <Questionnaire items={ONBOARDING_QUESTIONS} onSubmit={setDone}>
        <Questionnaire.Title>Getting set up</Questionnaire.Title>
        <Questionnaire.Progress />

        <Questionnaire.Item name="role" required>
          <Questionnaire.Question>What do you do?</Questionnaire.Question>
          <Questionnaire.Choices>
            <Questionnaire.Choice value="engineer" label="Engineering" />
            <Questionnaire.Choice value="design" label="Design" />
            <Questionnaire.Choice value="product" label="Product" />
            <Questionnaire.Input placeholder="Something else…" />
          </Questionnaire.Choices>
          <Questionnaire.Error />
        </Questionnaire.Item>

        <Questionnaire.Item name="size" required>
          <Questionnaire.Question>How big is the team?</Questionnaire.Question>
          <Questionnaire.Choices>
            <Questionnaire.Choice value="solo" label="Just me" />
            <Questionnaire.Choice value="small" label="Two to ten" />
            <Questionnaire.Choice value="large" label="More than ten" />
          </Questionnaire.Choices>
          <Questionnaire.Error />
        </Questionnaire.Item>

        <Questionnaire.Item name="stack" multiple>
          <Questionnaire.Question>What are you building with?</Questionnaire.Question>
          <Questionnaire.Description>Select all that apply.</Questionnaire.Description>
          <Questionnaire.Choices>
            <Questionnaire.Choice value="expo" label="Expo" />
            <Questionnaire.Choice value="next" label="Next.js" />
            <Questionnaire.Choice value="native" label="Bare React Native" />
          </Questionnaire.Choices>
        </Questionnaire.Item>

        <Questionnaire.Item name="timeline">
          <Questionnaire.Question>When are you shipping?</Questionnaire.Question>
          <Questionnaire.Description>
            Skip this if it is not decided.
          </Questionnaire.Description>
          <Questionnaire.Choices>
            <Questionnaire.Choice value="month" label="Within a month" />
            <Questionnaire.Choice value="quarter" label="This quarter" />
          </Questionnaire.Choices>
        </Questionnaire.Item>

        <Questionnaire.Item name="contact" required>
          <Questionnaire.Question>Best way to reach you?</Questionnaire.Question>
          <Questionnaire.Choices>
            <Questionnaire.Choice value="email" label="Email" />
            <Questionnaire.Choice value="none" label="Do not contact me" />
          </Questionnaire.Choices>
          <Questionnaire.Error />
        </Questionnaire.Item>

        <Questionnaire.Footer>
          <Questionnaire.Back />
          <Questionnaire.Spacer />
          <Questionnaire.Skip />
          <Questionnaire.Next />
          <Questionnaire.Submit>Finish</Questionnaire.Submit>
        </Questionnaire.Footer>
      </Questionnaire>

      <Text size="sm" muted>
        Swipe across the questions, or use the buttons. The first, second and
        last are required; the stack takes several answers and the timeline can
        be skipped.
      </Text>
    </ScrollView>
  );
}

/** In a sheet, which is where a phone usually asks a question like this. */
function QuestionnaireSheetVersion() {
  const [open, setOpen] = useState(false);
  const [answers, setAnswers] = useState<QuestionnaireAnswers | null>(null);

  return (
    <View className="flex-1 justify-center gap-4 p-4">
      <Button onPress={() => setOpen(true)}>Ask me two questions</Button>
      {answers ? (
        <Text size="sm" muted className="text-center">
          {JSON.stringify(answers)}
        </Text>
      ) : (
        <Text size="sm" muted className="text-center">
          The sheet owns being dismissed; the questionnaire owns the questions.
        </Text>
      )}

      {/*
        The sheet already draws the boundary and the padding, so the
        questionnaire goes in bare.

        `showClose={false}` matters: the sheet's close button is absolutely
        placed in its top-right corner, which is exactly where the progress
        sits. Two things in one corner is one of them unreachable — and a
        questionnaire that already has Back, Skip and Send does not need a
        third way out. The sheet still dismisses by drag and by backdrop.

        Pips rather than the ring for the same reason the frame is off: the
        sheet is short, its corner is contested, and a row of marks lies flat
        along the strip where a ring stands up off it.
      */}
      <BottomSheet open={open} onOpenChange={setOpen}>
        <BottomSheet.Content showClose={false}>
          <Questionnaire
            frame={false}
            onSubmit={(final) => {
              setAnswers(final);
              setOpen(false);
            }}
          >
            <Questionnaire.Title>Feedback</Questionnaire.Title>
            <Questionnaire.Progress variant="pips" />
            <Questionnaire.Item name="mood" required>
              <Questionnaire.Question>How did that go?</Questionnaire.Question>
              <Questionnaire.Choices>
                <Questionnaire.Choice value="good" label="Better than expected" />
                <Questionnaire.Choice value="fine" label="About right" />
                <Questionnaire.Choice value="bad" label="Not well" />
              </Questionnaire.Choices>
              <Questionnaire.Error />
            </Questionnaire.Item>
            <Questionnaire.Item name="why">
              <Questionnaire.Question>Anything to add?</Questionnaire.Question>
              <Questionnaire.Choices>
                <Questionnaire.Input placeholder="In your own words…" />
              </Questionnaire.Choices>
            </Questionnaire.Item>
            <Questionnaire.Footer>
              <Questionnaire.Back />
              <Questionnaire.Spacer />
              <Questionnaire.Skip />
              <Questionnaire.Next />
              <Questionnaire.Submit>Send</Questionnaire.Submit>
            </Questionnaire.Footer>
          </Questionnaire>
        </BottomSheet.Content>
      </BottomSheet>
    </View>
  );
}


function CollapsibleDemo({ variant }: { variant: CollapsibleVariant }) {
  return (
    <Collapsible variant={variant} defaultOpen className="w-full">
      <Collapsible.Trigger>
        <Collapsible.Title>What is included</Collapsible.Title>
        <Collapsible.Indicator />
      </Collapsible.Trigger>
      <Collapsible.Content>
        <Text size="sm" muted>
          Unlimited projects, 100GB of storage, and email support.
        </Text>
      </Collapsible.Content>
    </Collapsible>
  );
}

function CollapsibleControlledDemo() {
  const [open, setOpen] = useState(false);

  return (
    <View className="w-full gap-3">
      <Button variant="outline" onPress={() => setOpen((current) => !current)}>
        {open ? 'Close it from out here' : 'Open it from out here'}
      </Button>

      <Collapsible variant="surface" open={open} onOpenChange={setOpen} className="w-full">
        <Collapsible.Trigger>
          <Collapsible.Title>Billing details</Collapsible.Title>
          <Collapsible.Indicator />
        </Collapsible.Trigger>
        <Collapsible.Content>
          <Text size="sm" muted>
            Billed monthly, cancel any time.
          </Text>
        </Collapsible.Content>
      </Collapsible>
    </View>
  );
}

function CollapsibleStateDemo() {
  // The body stays mounted, so the field is untouched by the section closing.
  return (
    <View className="w-full gap-3">
      <Collapsible variant="surface" className="w-full">
        <Collapsible.Trigger>
          <Collapsible.Title>Delivery note</Collapsible.Title>
          <Collapsible.Indicator />
        </Collapsible.Trigger>
        <Collapsible.Content>
          <Textarea placeholder="Leave it with a neighbour…" />
        </Collapsible.Content>
      </Collapsible>

      <Text size="xs" muted>
        Type into the field, close the section, then open it again.
      </Text>
    </View>
  );
}

function CollapsibleDisabledDemo() {
  return (
    <Collapsible variant="surface" isDisabled className="w-full">
      <Collapsible.Trigger>
        <Collapsible.Title>Enterprise billing</Collapsible.Title>
        <Collapsible.Indicator />
      </Collapsible.Trigger>
      <Collapsible.Content>
        <Text size="sm" muted>
          Contact sales.
        </Text>
      </Collapsible.Content>
    </Collapsible>
  );
}

/* -------------------------------------------------------------------------- */
/* Feedback                                                             */
/* -------------------------------------------------------------------------- */

/** The shape the component is for: a question, a well to answer it in, and two
 *  things to do about the answer. */
function FeedbackDemo() {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState<string | null>(null);

  return (
    <View className="items-center gap-4">
      <Feedback open={open} onOpenChange={setOpen}>
        <Feedback.Trigger>
          <Button variant="outline">Give feedback</Button>
        </Feedback.Trigger>
        <Feedback.Content>
          <Feedback.Panel>
            <Feedback.Title>What should we fix first?</Feedback.Title>
            <Feedback.Close />
            <Feedback.Field placeholder="Tell us what got in your way" />
          </Feedback.Panel>
          <Feedback.Footer>
            <Feedback.Cancel />
            <Feedback.Submit
              onSubmit={(message) => {
                setSent(message);
                setOpen(false);
              }}
            />
          </Feedback.Footer>
        </Feedback.Content>
      </Feedback>

      {sent ? (
        <Text size="sm" muted numberOfLines={2} className="text-center">
          Sent: {sent}
        </Text>
      ) : null}
    </View>
  );
}

/** A draft the caller holds, so it survives the dialog being closed. */
function FeedbackDraftDemo() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(
    'Exporting takes two or three goes before it picks the right folder.'
  );

  return (
    <View className="items-center gap-4">
      <Feedback
        open={open}
        onOpenChange={setOpen}
        value={draft}
        onValueChange={setDraft}
      >
        <Feedback.Trigger>
          <Button variant="outline">Open the draft</Button>
        </Feedback.Trigger>
        <Feedback.Content blur>
          <Feedback.Panel>
            <Feedback.Title>Anything else?</Feedback.Title>
            <Feedback.Close />
            <Feedback.Field />
          </Feedback.Panel>
          <Feedback.Footer>
            <Feedback.Cancel />
            <Feedback.Submit onSubmit={() => setOpen(false)} />
          </Feedback.Footer>
        </Feedback.Content>
      </Feedback>

      <Text size="sm" muted numberOfLines={3} className="text-center">
        {draft.length ? draft : 'The draft is empty.'}
      </Text>
    </View>
  );
}

/**
 * A whole-well answer: a mark, a line, and what to do about it.
 *
 * Shared by the two versions that replace the field rather than annotate it,
 * because the point of both is that the shell holds still while the thing
 * inside it changes — and two blocks of different heights would move it.
 */
function DialogOutcome({
  tone,
  icon,
  title,
  children,
}: {
  tone: 'success' | 'destructive';
  icon: ReactNode;
  title: string;
  children: string;
}) {
  return (
    <View className="items-center justify-center gap-3 px-2" style={{ minHeight: 200 }}>
      <View
        className={cn(
          'h-14 w-14 items-center justify-center rounded-full',
          tone === 'success' ? 'bg-success' : 'bg-destructive'
        )}
      >
        {icon}
      </View>
      <Text size="lg" weight="semibold">
        {title}
      </Text>
      <Text size="sm" muted className="text-center">
        {children}
      </Text>
    </View>
  );
}

/**
 * There has to be something on the other side of the press.
 *
 * `Submit` hands the message back rather than closing, and this is what that
 * buys: the well swaps for a confirmation while the shell holds still, so the
 * dialog is visibly the same object answering rather than a second one
 * arriving.
 */
function FeedbackThanksDemo() {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  // The ink that reads on a solid status fill, rather than a hardcoded white.
  const token = useCSSVariable('--color-success-solid-foreground');
  const onSolid = typeof token === 'string' ? token : undefined;

  return (
    <View className="items-center gap-4">
      <Feedback
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          // Opening again starts a new note, not the tail of the last one.
          if (next) setSent(false);
        }}
      >
        <Feedback.Trigger>
          <Button variant="outline">Send a note</Button>
        </Feedback.Trigger>
        <Feedback.Content>
          <Feedback.Panel>
            {sent ? (
              <DialogOutcome
                tone="success"
                title="Got it"
                icon={<CheckIcon size={24} color={onSolid} />}
              >
                This goes to the people who can fix it. We only write back when
                there is something to say.
              </DialogOutcome>
            ) : (
              <>
                <Feedback.Title>What should we fix first?</Feedback.Title>
                <Feedback.Close />
                <Feedback.Field placeholder="Tell us what got in your way" />
              </>
            )}
          </Feedback.Panel>
          <Feedback.Footer>
            {sent ? (
              /* One action, so it takes the whole row and the filled tone —
                 there is nothing left to choose between. */
              <Feedback.Submit disabled={false} onPress={() => setOpen(false)}>
                Done
              </Feedback.Submit>
            ) : (
              <>
                <Feedback.Cancel />
                <Feedback.Submit onSubmit={() => setSent(true)} />
              </>
            )}
          </Feedback.Footer>
        </Feedback.Content>
      </Feedback>
    </View>
  );
}

/**
 * The failure the API is shaped around.
 *
 * `Submit` does not close the dialog, so a send that fails still has somewhere
 * to say so — and the message is still there to try again with. A dialog that
 * closed on the press would have taken both with it.
 *
 * The failure takes the well, in the place the confirmation takes on the way
 * through. A line pinned under the field would be an annotation on the writing;
 * this is not about the writing, it is what happened to it, and it is the whole
 * state of the dialog until somebody answers it. The message is held in the
 * caller's state, so Try again puts it straight back.
 *
 * The first attempt fails on purpose; the second goes through — and lands on a
 * confirmation rather than closing, so the send that had to be retried says so.
 */
function FeedbackRetryDemo() {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<'idle' | 'sending' | 'failed' | 'sent'>(
    'idle'
  );
  const [attempts, setAttempts] = useState(0);
  const [draft, setDraft] = useState('');
  const failedToken = useCSSVariable('--color-destructive-solid-foreground');
  const onFailed = typeof failedToken === 'string' ? failedToken : undefined;
  const sentToken = useCSSVariable('--color-success-solid-foreground');
  const onSent = typeof sentToken === 'string' ? sentToken : undefined;

  useEffect(() => {
    if (state !== 'sending') return;
    const timer = setTimeout(() => {
      if (attempts === 0) {
        setAttempts(1);
        setState('failed');
        return;
      }
      // The send that worked takes the well the failure took, so the dialog
      // answers instead of disappearing.
      setState('sent');
      setAttempts(0);
      setDraft('');
    }, 1200);
    return () => clearTimeout(timer);
  }, [state, attempts]);

  return (
    <View className="items-center gap-4">
      <Feedback
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (next) {
            setState('idle');
            setAttempts(0);
          }
        }}
        value={draft}
        onValueChange={setDraft}
      >
        <Feedback.Trigger>
          <Button variant="outline">Report a problem</Button>
        </Feedback.Trigger>
        <Feedback.Content dismissible={state !== 'sending'}>
          <Feedback.Panel>
            {/* Gone on the way out: a ✕ next to a single Done is two ways off
                the same screen. */}
            {state === 'sent' ? null : <Feedback.Close />}
            {state === 'sent' ? (
              <DialogOutcome
                tone="success"
                title="Sent"
                icon={<CheckIcon size={24} color={onSent} />}
              >
                It went through on the second try. Nothing left to do here.
              </DialogOutcome>
            ) : state === 'failed' ? (
              <DialogOutcome
                tone="destructive"
                title="Could not send"
                icon={<XIcon size={22} color={onFailed} />}
              >
                Your note is still here. Try again when you have a signal.
              </DialogOutcome>
            ) : (
              <>
                <Feedback.Title>What went wrong?</Feedback.Title>
                <Feedback.Field
                  editable={state !== 'sending'}
                  placeholder="What were you doing when it happened"
                />
              </>
            )}
          </Feedback.Panel>

          <Feedback.Footer>
            {state === 'sent' ? (
              <Feedback.Submit disabled={false} onPress={() => setOpen(false)}>
                Done
              </Feedback.Submit>
            ) : (
              <>
                {/* Back to the message rather than out of the dialog: the note
                    is the reason somebody is still here. */}
                <Feedback.Cancel
                  onPress={
                    state === 'failed' ? () => setState('idle') : undefined
                  }
                >
                  {state === 'failed' ? 'Back' : 'Cancel'}
                </Feedback.Cancel>
                <Feedback.Submit
                  disabled={state === 'sending' || draft.trim().length === 0}
                  onPress={() => setState('sending')}
                >
                  {state === 'sending'
                    ? 'Sending…'
                    : state === 'failed'
                      ? 'Try again'
                      : 'Submit'}
                </Feedback.Submit>
              </>
            )}
          </Feedback.Footer>
        </Feedback.Content>
      </Feedback>
    </View>
  );
}

const REASONS = ['Too slow', 'Confusing', 'Wrong result', 'Crashed'];

/**
 * Tags over the field, because nobody triages free text.
 *
 * The chips sort the report and the sentence explains it, so either one is
 * enough to send — which is the point of gating `Submit` on both rather than
 * on the field alone.
 *
 * Sending swaps the well for the confirmation rather than closing, so the
 * report ends somewhere instead of the dialog just going away.
 */
function FeedbackTagsDemo() {
  const [open, setOpen] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [sent, setSent] = useState(false);
  const token = useCSSVariable('--color-success-solid-foreground');
  const onSolid = typeof token === 'string' ? token : undefined;

  const toggle = (reason: string) =>
    setTags((current) =>
      current.includes(reason)
        ? current.filter((item) => item !== reason)
        : [...current, reason]
    );

  return (
    <View className="items-center gap-4">
      <Feedback
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (next) {
            setTags([]);
            setSent(false);
          }
        }}
        value={draft}
        onValueChange={setDraft}
      >
        <Feedback.Trigger>
          <Button variant="outline">Rate this answer</Button>
        </Feedback.Trigger>
        <Feedback.Content>
          <Feedback.Panel>
            {sent ? (
              <DialogOutcome
                tone="success"
                title="Filed"
                icon={<CheckIcon size={24} color={onSolid} />}
              >
                We sort these by what you picked, so it lands with the people
                who own that part.
              </DialogOutcome>
            ) : (
              <>
                <Feedback.Title>What went wrong?</Feedback.Title>
                <Feedback.Close />
                <View className="flex-row flex-wrap gap-2">
                  {REASONS.map((reason) => (
                    <Chip
                      key={reason}
                      size="sm"
                      selected={tags.includes(reason)}
                      onPress={() => toggle(reason)}
                    >
                      {reason}
                    </Chip>
                  ))}
                </View>
                {/* Shorter, because the chips have already taken the top of
                    the well and a field that kept its full height would push
                    the actions off a small screen. */}
                <Feedback.Field
                  minHeight={120}
                  placeholder="Anything else we should know"
                />
              </>
            )}
          </Feedback.Panel>
          <Feedback.Footer>
            {sent ? (
              <Feedback.Submit disabled={false} onPress={() => setOpen(false)}>
                Done
              </Feedback.Submit>
            ) : (
              <>
                <Feedback.Cancel />
                <Feedback.Submit
                  disabled={tags.length === 0 && draft.trim().length === 0}
                  onSubmit={() => {
                    setDraft('');
                    setSent(true);
                  }}
                />
              </>
            )}
          </Feedback.Footer>
        </Feedback.Content>
      </Feedback>
    </View>
  );
}

/**
 * Where the app's own listing lives.
 *
 * Replace both before shipping: the iOS one is the App Store product URL with
 * `?action=write-review` on it, which opens straight on the review sheet; the
 * Android one is the Play listing for the package name.
 */
const APP_STORE_URL = 'https://apps.apple.com/app/id000000000?action=write-review';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.example.app';

/**
 * Which store this device has, and what to call it.
 *
 * Resolved once at module scope — the platform does not change under a running
 * app, and neither does the answer.
 */
const STORE = Platform.select({
  ios: { label: 'App Store', url: APP_STORE_URL },
  android: { label: 'Google Play', url: PLAY_STORE_URL },
  default: { label: 'Rate the app', url: APP_STORE_URL },
});

/**
 * A score, then the words for it, then the store.
 *
 * Asking for both at once gets the score and an empty box. Asking for the
 * score first costs one tap and gives the sentence something to be about — and
 * the footer is a slot, so Cancel becomes Back for the second half.
 *
 * Sending lands on a third step rather than closing. Somebody who has just
 * rated the app is the one person who will rate it on the store, and that is
 * the moment to ask; the heading turns on the score so a low one is not
 * congratulated.
 */
function FeedbackStepsDemo() {
  const [open, setOpen] = useState(false);
  const [score, setScore] = useState(0);
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [draft, setDraft] = useState('');
  const liked = score >= 4;
  const token = useCSSVariable('--color-success-solid-foreground');
  const onSolid = typeof token === 'string' ? token : undefined;

  return (
    <View className="items-center gap-4">
      <Feedback
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (next) {
            setStep(0);
            setScore(0);
            setDraft('');
          }
        }}
        value={draft}
        onValueChange={setDraft}
      >
        <Feedback.Trigger>
          <Button variant="outline">Rate the app</Button>
        </Feedback.Trigger>
        <Feedback.Content>
          <Feedback.Panel>
            {/* Outside the two asking steps, so there is always a way out of
                the dialog — the ✕ is not the back button and must not come and
                go with it. It goes on the last step, where Done is already the
                way out and a ✕ beside it would be a second one. */}
            {step === 2 ? null : <Feedback.Close />}
            {step === 0 ? (
              <View className="items-center justify-center gap-4" style={{ minHeight: 200 }}>
                {/* `ps-9` mirrors the clearance the title already keeps on
                    the end for the ✕. Centred text in a box inset on one side
                    only is centred off the panel's actual middle. */}
                <Feedback.Title className="ps-9 text-center">
                  How are you finding the app?
                </Feedback.Title>
                <Rating size="lg" value={score} onValueChange={setScore} />
                <Text size="sm" muted>
                  {score === 0 ? 'Tap a star' : SCORE_WORDS[score - 1]}
                </Text>
              </View>
            ) : step === 1 ? (
              <>
                <Feedback.Title>
                  {liked ? 'What do you like most?' : 'What would have helped?'}
                </Feedback.Title>
                <Feedback.Field placeholder="In your own words" />
              </>
            ) : (
              <DialogOutcome
                tone="success"
                title={liked ? 'Glad you like it' : "Thanks — we'll fix it"}
                icon={
                  liked ? (
                    <StarIcon size={24} color={onSolid} />
                  ) : (
                    <CheckIcon size={24} color={onSolid} />
                  )
                }
              >
                {liked
                  ? 'A rating on the store is how other people find it. It takes a moment.'
                  : 'This goes straight to the team. A rating still helps, if you have one in you.'}
              </DialogOutcome>
            )}
          </Feedback.Panel>
          <Feedback.Footer>
            {step === 0 ? (
              <>
                <Feedback.Cancel />
                <Feedback.Submit
                  disabled={score === 0}
                  onPress={() => setStep(1)}
                >
                  Next
                </Feedback.Submit>
              </>
            ) : step === 1 ? (
              <>
                <Feedback.Cancel onPress={() => setStep(0)}>
                  Back
                </Feedback.Cancel>
                <Feedback.Submit
                  onSubmit={() => {
                    setDraft('');
                    setStep(2);
                  }}
                />
              </>
            ) : (
              <>
                {/* Done first: the store is the ask, and an ask needs a way
                    past it that is not the ✕. */}
                <Feedback.Cancel>Done</Feedback.Cancel>
                <Feedback.Submit
                  disabled={false}
                  onPress={() => {
                    void Linking.openURL(STORE.url).catch(() => {});
                  }}
                >
                  {STORE.label}
                </Feedback.Submit>
              </>
            )}
          </Feedback.Footer>
        </Feedback.Content>
      </Feedback>
    </View>
  );
}

const SCORE_WORDS = ['Bad', 'Poor', 'Fine', 'Good', 'Great'];

export const ENTRIES: ComponentEntry[] = [
{
    slug: 'chip',
    name: 'Chip',
    summary: 'Interactive pill — filter, tag, or token',
    demos: [
      {
        label: 'Variants',
        render: () => (
          <View className="flex-row flex-wrap items-center justify-center gap-2">
            <Chip>Default</Chip>
            <Chip variant="primary">Primary</Chip>
            <Chip variant="outline">Outline</Chip>
            <Chip variant="success">Shipped</Chip>
            <Chip variant="warning">Beta</Chip>
            <Chip variant="info">New</Chip>
            <Chip variant="destructive">Blocked</Chip>
          </View>
        ),
      },
      {
        label: 'Sizes',
        render: () => (
          <View className="flex-row flex-wrap items-center justify-center gap-2">
            <Chip size="sm">Small</Chip>
            <Chip size="md">Medium</Chip>
            <Chip size="lg">Large</Chip>
          </View>
        ),
      },
      {
        label: 'With a leading icon',
        render: () => (
          <View className="flex-row flex-wrap items-center justify-center gap-2">
            <Chip variant="success" start={<CheckIcon size={13} />}>
              <Chip.Label>Available</Chip.Label>
            </Chip>
            <Chip variant="outline" start={<SearchIcon size={13} />}>
              <Chip.Label>Search</Chip.Label>
            </Chip>
          </View>
        ),
      },
      { label: 'A filter bar', render: () => <ChipFilterDemo /> },
      { label: 'Removable tokens', render: () => <ChipRemovableDemo /> },
    ],
  },
{
    slug: 'collapsible',
    name: 'Collapsible',
    summary: 'One section, shown and hidden by its own header',
    demos: [
      { label: 'Default', render: () => <CollapsibleDemo variant="default" /> },
      { label: 'Surface', render: () => <CollapsibleDemo variant="surface" /> },
      { label: 'Ghost', render: () => <CollapsibleDemo variant="ghost" /> },
      { label: 'Controlled', render: () => <CollapsibleControlledDemo /> },
      { label: 'The body keeps its state', render: () => <CollapsibleStateDemo /> },
      { label: 'Disabled', render: () => <CollapsibleDisabledDemo /> },
    ],
  },
{
    slug: 'color-picker',
    name: 'ColorPicker',
    summary: 'A colour chosen by dragging, not by typing',
    demos: [
      {
        label: 'Accent card',
        id: 'card',
        fullPage: true,
        description:
          'Rows that read out a colour and open the picker over themselves when pressed.',
        render: () => <ColorPickerCardVersion />,
      },
      {
        label: 'In a sheet',
        id: 'sheet',
        fullPage: true,
        description: 'The same folded-away picker, brought up from the bottom edge.',
        render: () => <ColorPickerSheetVersion />,
      },
      {
        label: 'Inline panel',
        id: 'inline',
        fullPage: true,
        description:
          'A labelled strip over the square, and a readout naming the track under it.',
        render: () => <ColorPickerInlineVersion />,
      },
      {
        label: 'Wheel',
        id: 'wheel',
        fullPage: true,
        description:
          'Hue around and saturation out, with brightness on a track of its own.',
        render: () => <ColorPickerWheelVersion />,
      },
      { label: 'Interactive', render: () => <ColorPickerDemo /> },
      { label: 'With opacity', render: () => <ColorPickerAlphaDemo /> },
      { label: 'Presets first', render: () => <ColorPickerSwatchesDemo /> },
      {
        label: 'Sizes',
        render: () => (
          <View className="w-full gap-6">
            <ColorPicker defaultValue="#8b5cf6" size="sm">
              <ColorPicker.Area />
              <ColorPicker.Hue />
            </ColorPicker>
            <ColorPicker defaultValue="#f59e0b" size="lg">
              <ColorPicker.Area />
              <ColorPicker.Hue />
            </ColorPicker>
          </View>
        ),
      },
      {
        label: 'Disabled',
        render: () => (
          <ColorPicker defaultValue="#64748b" disabled>
            <ColorPicker.Area height={110} />
            <ColorPicker.Hue />
            <ColorPicker.Preview showValue />
          </ColorPicker>
        ),
      },
    ],
  },
{
    slug: 'combobox',
    name: 'Combobox',
    summary: 'A text field that filters a list as you type',
    demos: [
      { label: 'Filter as you type', render: () => <ComboboxDemo /> },
      { label: 'Grouped options', render: () => <ComboboxGroupedDemo /> },
      { label: 'Several at once', render: () => <ComboboxMultipleDemo /> },
      { label: 'Values it does not know about', render: () => <ComboboxTagsDemo /> },
      { label: 'Fetched for the query', render: () => <ComboboxAsyncDemo /> },
      { label: 'Inline — nothing is covered', render: () => <ComboboxInlineDemo /> },
    ],
  },
{
    slug: 'questionnaire',
    name: 'Questionnaire',
    summary: 'One question at a time, with progress and a way back',
    demos: [
      { label: 'One answer at a time', render: () => <QuestionnaireDemo /> },
      { label: 'Selecting more than one', render: () => <QuestionnaireMultipleDemo /> },
      { label: 'An answer that is not listed', render: () => <QuestionnaireFreeformDemo /> },
      { label: 'A letter beside every answer', render: () => <QuestionnaireShortcutsDemo /> },
      { label: 'Numbers instead of the ring', render: () => <QuestionnaireNumbersDemo /> },
      { label: 'Without the frame', render: () => <QuestionnaireBareDemo /> },
      {
        label: 'Getting set up',
        id: 'onboarding',
        fullPage: true,
        description:
          'Five questions and the summary they add up to — required, optional, multi-answer and freeform in one flow.',
        render: () => <QuestionnaireOnboardingVersion />,
      },
      {
        label: 'In a sheet',
        id: 'sheet',
        fullPage: true,
        description:
          'Two questions in a bottom sheet, where the sheet owns dismissal and the questionnaire owns the questions.',
        render: () => <QuestionnaireSheetVersion />,
      },
    ],
  },
{
    slug: 'date-picker',
    name: 'DatePicker',
    summary: 'A calendar behind a button',
    demos: [
      { label: 'Single, range and birthday', render: () => <DatePickerDemo /> },
      { label: 'In a sheet', render: () => <DatePickerSheetDemo /> },
    ],
  },
{
    slug: 'date-time-picker',
    name: 'DateTimePicker',
    summary: 'A day and a time, picked in one panel',
    demos: [
      { label: 'Both halves at once', render: () => <DateTimePickerDemo /> },
      { label: 'In a sheet', render: () => <DateTimePickerSheetDemo /> },
      { label: 'The wheel face', render: () => <DateTimePickerWheelDemo /> },
      { label: 'Booking a slot', render: () => <DateTimePickerSlotDemo /> },
    ],
  },
{
    slug: 'feedback',
    name: 'Feedback',
    summary: 'Dialog whose body is a well to write in',
    demos: [
      { label: 'Asking for a sentence', render: () => <FeedbackDemo /> },
      { label: 'Thanks, then done', render: () => <FeedbackThanksDemo /> },
      { label: 'The send that failed', render: () => <FeedbackRetryDemo /> },
      { label: 'What went wrong', render: () => <FeedbackTagsDemo /> },
      { label: 'Score first, words second', render: () => <FeedbackStepsDemo /> },
      { label: 'A draft you hold', render: () => <FeedbackDraftDemo /> },
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
        label: 'Actions on their own surface',
        render: () => (
          <Dialog>
            <Dialog.Trigger>
              <Button variant="outline">Edit profile</Button>
            </Dialog.Trigger>
            <Dialog.Content>
              <Dialog.Title>Edit profile</Dialog.Title>
              <Dialog.Description>
                Make changes to your profile here. Save when you're done.
              </Dialog.Description>
              <View className="gap-4 py-4">
                <Input label="Name" defaultValue="Pedro Duarte" />
                <Input label="Username" defaultValue="@peduarte" />
              </View>
              {/* `variant="panel"` bleeds a tinted band out to the dialog's own
                  edges, so the buttons are not read as the last field. */}
              <Dialog.Footer variant="panel">
                <Dialog.Close>
                  <Button size="sm" variant="outline">
                    Cancel
                  </Button>
                </Dialog.Close>
                <Dialog.Close>
                  <Button size="sm">Save changes</Button>
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
    slug: 'direction',
    name: 'Direction',
    summary: 'Reading direction for everything below it',
    demos: [
      {
        label: 'A whole screen, both ways',
        id: 'screen',
        fullPage: true,
        description: 'The parts Yoga cannot flip on its own — a drag, a thumb, a sweep, a glyph.',
        render: () => <DirectionScreenVersion />,
      },
      { label: 'Flip it live', render: () => <DirectionFlipDemo /> },
      { label: 'Nested, with an island', render: () => <DirectionNestedDemo /> },
      {
        label: 'Right to left',
        render: () => (
          <Direction dir="rtl" className="w-full">
            <DirectionRows />
          </Direction>
        ),
      },
    ],
  }
];
export const ENTRIES_BY_SLUG = Object.fromEntries(ENTRIES.map((entry) => [entry.slug, entry]));
