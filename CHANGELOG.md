# Changelog

Notable changes to [`panelui-native`](https://www.npmjs.com/package/panelui-native).

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project
follows [semantic versioning](https://semver.org/spec/v2.0.0.html) — while the major version is
`0`, a minor bump is where new components, parts and tokens land, and a patch is a fix that leaves
the API alone.

Releases before 0.40.0 predate this file and are recorded only in the commit history.

## [0.91.0] — 2026-09-05

### Added

- **`Fab` and `Fab.Group` take `glass`**, drawing the button in the material iOS 26
  uses for its own floating controls, in place of the variant's fill. A control
  floating over content is what that material is for: the rows refract through it
  as they scroll under, and it lifts its own edge, so the shadow goes with the fill.

  Every variant takes the plain material rather than a tinted one. Measured on a
  device, a colour laid on the glass turns it back into a fill and a monochrome one
  only greys it, so the colour that carries meaning goes on the glyph instead — the
  destructive button is a red glyph on the plain material. Pressed, it answers the
  way the platform's own glass controls do, the material swelling and brightening
  under the finger in place of this library's press scale.

- **`Fab.Group` takes `layout`.** `menu` unfolds one panel of rows out of the
  trigger instead of a column of buttons, in either of two appearances: `platform`,
  which is the shape the system's own menus take, and `wells`, which leads with the
  glyph in a tinted well and makes each row its own pill. `iconPlacement`,
  `menuWidth`, `menuRadius`, `menuClassName` and `rowClassName` adjust either.

- **`layout="native"` hands the menu to the platform** — a SwiftUI menu on iOS, a
  Compose dropdown on Android — with the trigger passed through as the thing you
  press, so the button keeps its variant, its size and its glass.

  The two toolkits do not agree on the shape of the control, and the difference is
  stated rather than smoothed over: iOS owns the menu's open state, so `open` and
  `onOpenChange` are inert there, while Android's is controlled and honours both.
  Rows take `label` and, on iOS, the new **`Fab.Action.systemImage`** — an SF Symbol
  name, since SwiftUI names its symbols rather than taking a view for one. Without
  the optional `@expo/ui`, and on the web, it falls back to `layout="menu"`.

- **`GlassContainer`**, a container that lets the glass inside it merge. On its own
  each piece of the material is a separate object with its own lit edge; inside a
  container, pieces within `spacing` of each other flow together — which is what
  makes a button that opens into other buttons look like one thing dividing rather
  than several things arriving.

- **`Glass` takes `interactive`**, letting the material answer touch the way the
  platform's own controls do. The platform only tracks touches that land inside the
  glass view, so with it on the material is the box and the content is hosted inside
  it. Reach for it when the glass *is* the button.

- **`useGlassMaterial()`**, for a component that changes shape around the material —
  dropping a fill, a border or a shadow the glass replaces — so it makes the same
  decision `Glass` makes and never strips the fill while leaving nothing behind it.

### Fixed

- **An extended glass button is as wide as its label.** Interactive glass hosts its
  content so the platform can see the touch, and the material was pinned to its
  container's edges — a child out of the flow measures nothing, so a labelled button
  collapsed to its minimum width while its icon and text drew at full size, outside
  a button that is deliberately not clipped.

- **Closing a dial is the opening in reverse.** The actions stay mounted while the
  spring runs back down and unmount when it rests, rather than being cut the moment
  the dial closes.

- **A closed menu panel is gone rather than small.** The panel rested at a fraction
  of its size instead of at zero, leaving a box above the trigger for as long as the
  spring took to report it had finished — most of a second after the panel had
  stopped moving. Nothing was animating; a closed panel was simply visible.

- **The trigger's accessibility state survives.** A caller's `accessibilityState` is
  merged rather than replaced, so a group's trigger keeps saying whether it is
  expanded, with the disabled state kept authoritative.

- **A plain `Fab` written into a group gets its press event forwarded**, and a menu
  row reads at the base text size.

### Docs

- Previews of both menu appearances, the platform menu and the glass dial, recorded
  on a device, and a still of every size and variant together.

## [0.90.0] — 2026-09-04

### Added

- **`SectionProgress`** — a pill that floats over a long screen carrying two
  readings: a ring filled to the scroll position, and the title of the section
  being read. Pressing it opens the list of sections and jumps to any of them.
  The two answer different questions and neither is enough alone — a percentage
  says how much is left, a section name says what is being read.

  It draws nothing on the first screen and stays once it has arrived, because a
  label that came and went with the scroll direction is one the reader has to
  catch rather than read. Open, the list and the pill are a single bordered
  card: the pill's row is the end of the card rather than a control sitting
  under a panel of its own.

  An `Item` may carry a `color`, and the active section's colour is taken by
  the ring, the label and a wash across the pill, crossfading between sections
  — a second, peripheral signal for a screen whose parts already mean something
  in colour.

- **`useScrollSections` publishes the scroll position, as `scroll`.** The hook
  already received the offset, the viewport and the content height in the event
  it handles and threw all three away after picking a section out of them, so
  anything wanting to draw how far through a page the reader is had to add a
  second scroll listener to recover them. They are shared values, and they are
  written before the jump guard rather than after it: a programmatic jump is
  real travel, so the position keeps moving through it while the section stays
  where the reader put it.

### Docs

- Recordings of `SectionProgress` on the page: the default pill, a colour per
  section, and the top-anchored placement.

## [0.89.0] — 2026-09-03

### Added

- **`AnimatedBadge` takes `animateLayout`.** Off, the pill stops springing to its
  new size and position. The spring is what a badge standing on its own wants —
  growing to a longer word in one frame shoves whatever is beside it — but a
  badge set inside a line of text needs the opposite: the words around it are
  placed by the text engine and simply appear where they now belong, so a badge
  animating its position slides across a sentence that has already finished
  moving.

### Fixed

- **Two `SearchBar`s on one screen no longer take the focus off each other.** A
  blur while the keyboard was still up was read as "something inside this search
  took the focus" and answered by taking it back — right when a button in the
  panel stole it, wrong when the thief was a second field, because the keyboard
  never goes down and each bar grabs it back off the other. Both then drew
  themselves as the field being typed into. The recovery now asks who actually
  holds the focus.
- **A selected row in the `SearchBar` panel no longer runs into the row below
  it.** Stacked flush, its fill met the next row's edge and the two read as one
  block with a coloured top half; a row's rounded corners only show when there
  is background either side of them to round against.
- **`Avatar` no longer shows the photo's corners through the circle.** The root
  clips to its outer radius while the image inside sat within the border and
  kept square corners a border-width further in, so a sliver of the picture
  showed at each of the four diagonals.
- **`SelectionMode.Group` matches the surface it is drawn on.** In a sheet it
  was a `card` on a `popover`, and popover sits above card in every dark theme —
  so the group came out darker than the sheet around it and read as a hole. It
  takes a `muted` tint there, which steps up from whichever surface is behind it.
- **A `SelectionMode.Sheet`'s title is centred and its "All" reaches the
  corner.** The sheet header reserved 48 points for a close button it does not
  draw, which pushed both inwards.

### Docs

- **A sponsors page at [panelui.dev/sponsors](https://panelui.dev/sponsors)**,
  listing the companies backing the library and how to join them.
- **The GitHub link in the navigation is a plain link rather than a button**, and
  its star count sits beside the mark instead of under it.
- **`AnimatedBadge` has two new versions** showing badges set in a line of prose,
  where the figures roll in place and the words around them stay put.
- **`SelectionMode`'s palette version offers twelve swatches**, so the strip is
  worth scrolling.

## [0.88.2] — 2026-09-02

### Fixed

- **Keyboard avoidance no longer logs a Reanimated `measure()` warning when its
  element goes away with the keyboard still up.** `lift` re-measures every
  frame, and an element inside an overlay that unmounts on close — a `Feedback`
  dialog is the usual one — left that loop measuring a view that had gone,
  filling the log with *The view has some undefined, not-yet-computed or
  meaningless value of `LayoutMetrics` type*. The teardown now runs in a layout
  effect, and the loop disarms itself the first time a measurement comes back
  empty. Nothing about the lift itself changed.

- **A disabled `Feedback.Submit` drops its fill instead of dimming it.** A
  tinted accent pill is still an accent pill: at any opacity it reads as the
  thing on the dialog to press, so an inert Submit was being pressed and then
  reported as broken. It now falls back to a tint fainter than Cancel's, so the
  pair reads as one live action and one dead one.

- **A centred `Feedback.Title` sits on the panel's middle.** The title keeps its
  clearance for the ✕ on the end only, which is right for a title that starts at
  the left edge and puts a centred one about 36 points off centre. Mirror it
  with `ps-9` where you centre the title; the parts table says so now.

### Docs

- **`Feedback`'s last three versions answer instead of closing.** *The send that
  failed* and *Tags over the field* now swap the well for their own confirmation
  and collapse the footer to one Done, the way *Thanks, then done* already did —
  a retry that goes through unacknowledged, or a sorted report ending in
  nothing, is the shape the component exists to avoid.

- **`Feedback`'s *Score first, words second* asks about the app, and sending
  opens a store step.** Somebody who has just rated the app is the person most
  likely to rate it publicly, and that step is the only moment you have them.
  `APP_STORE_URL` and `PLAY_STORE_URL` are the two lines to replace, and
  `Platform.select` picks the label and the link. The heading turns on the
  score, so a low one is not congratulated.

- **Previews on the `Feedback` page**, for the component and each of its six
  versions.

## [0.88.1] — 2026-09-01

### Changed

- **`FeedbackDialog` is now `Feedback`, and the old name is gone.** The rename
  reaches the component, all nine parts, every exported type and the slug — so
  `import { FeedbackDialog }` no longer resolves, `FeedbackDialogProps` is
  `FeedbackProps`, and `panelui-cli add feedback-dialog` is
  `panelui-cli add feedback`. The documentation page moved with it and the old
  URL redirects; the registry item did not, so the old CLI name 404s rather
  than aliasing.

  This is a break under a patch number, which the versioning rule at the top of
  this file would normally put in a minor. It is here because the name it
  replaces is two hours old — it shipped in 0.88.0 earlier today and nothing
  has had time to depend on it. If you took 0.88.0 and used the component,
  change the import; if you did not, there is nothing to do.

  The "Dialog" was doing no work. Every overlay in the library is a dialog of
  some kind and none of the others carry it in their name; what distinguishes
  this one is what it is for.

### Docs

- **Four new `Feedback` versions**, each using the anatomy rather than
  describing it. *Thanks, then done* swaps the well for a confirmation and
  collapses the footer to one button — which is what `Submit` handing the
  message back instead of closing actually buys. *The send that failed* fails
  the first attempt on purpose and takes the well with the failure, keeping the
  message for Try again. *Tags over the field* puts a row of chips above the
  text, since nobody triages free text. *Score first, words second* asks for a
  rating, then a sentence about it, with Cancel becoming Back.
- The examples carry wording of their own rather than the title and sample
  message from the design the component was drawn against.

## [0.88.0] — 2026-09-01

### Added

- **`ScrollBlur`** — blurs the edges of a scroll container, where `ScrollFade` fades them. A fade
  takes content towards the colour behind the scroller, so it only works where that colour is
  known and flat; a blur takes it out of focus instead, which is true over a photograph, a
  gradient or a list of coloured cards. It is also what belongs under something laid *over* a
  scroller — a button, a header — because the content passing beneath stays legible as shape and
  colour while losing the detail that would compete with the thing on top. Neither platform has a
  per-pixel blur radius, so the band is a stack of blur views on a curve with a gradient of
  `color` washed over the top, which is what hides the seam every hard-edged layer leaves. Needs
  the optional `expo-blur`; without it, or with Reduce Transparency on, it falls back to the fade.
- **`AnimatedBadge`** — a status pill whose icon and label roll over when the status changes. A
  badge that swaps its word between one frame and the next is a badge people miss: the status is
  the smallest thing on the screen and usually not the thing being looked at, so a change with no
  movement in it registers as having always said that. One view does the roll rather than two —
  the content is swapped at the far end of the travel — because in a box this size a pair of
  mounted elements makes the badge swell around them and collapse again.
- **`FeedbackDialog`** — a dialog whose body is a well to write in, with the actions in the band
  around it. `Dialog` puts both on one surface, which is right when the body is a line of prose
  and wrong when it is a field: nothing about a flat panel says "this is where you type". The
  recess comes from `--color-inset` over the popover surface, because the surface ladder runs
  darker in a light theme and lighter in a dark one, and a well has to read the same way in both.
- **`BubbleChart.Quadrants`**, **`.SizeKey`** and **`.Trend`** — a crosshair at the mean of each
  axis with a name for each corner; three nested circles saying what a bubble's area is worth,
  which is the one quantity the chart has no axis for; and the least-squares line through the
  cloud, handing back the fit through `onFit`.
- **`BubbleChart.XAxis`** and **`.YAxis`** take a `label` for what the axis measures. The chart
  reserves the room before it lays the plot out, so adding one moves the plot rather than writing
  over it.
- **`SearchBar`** takes `tokens` and `onRemoveLastToken`, with **`SearchBar.Token`** for the chip
  and **`SearchBar.Action`** for a button in a row's `trailing` slot. Tokens put what has been
  picked inside the field, before the caret, so the query and what it has produced are one control
  rather than a control and a list somewhere above it.

### Changed

- **`BubbleChart`** draws eight gridlines each way and prints five numbers per axis, against five
  squares and three numbers before. Of eleven gridlines only four had anything beside them, so a
  reader landing on one of the others had to count their way to a value; every second line carries
  one now, and the domain is rounded to the same four steps so the numbers come out round. The
  rules are dashed, as ScatterChart's already were.
- **`SearchBar`**'s results panel is capped at about six rows and scrolls past that. The room above
  a lifted field is most of the display, and a panel that took all of it was a full-screen list
  with a search box under it. `panelMaxHeight` overrides, and is clamped to the room as well.
- **`BottomSheet.Body`** composes a caller's `onScroll` with its own and forwards a ref.

### Fixed

- **`SearchBar` could not be opened at all on iOS.** The field's stacking order was set at the
  moment the panel opened, and React Native implements `zIndex` there by reordering the parent's
  subviews — which takes the view out of the hierarchy and puts it back, and a `UITextField`
  removed from the window resigns first responder. So opening the panel blurred the field that had
  just been focused, which closed the panel, which took the style away again: the keyboard came up
  and went straight back down. It is set always now.
- **`SearchBar`**: the spacer the card keeps for the field is inert, so a tap on the search box no
  longer dismisses the keyboard; the panel keeps every tap inside it, including on padding, a
  section heading and `Status`; and a blur while the keyboard is still up is answered by handing
  the focus back rather than by ending the search.
- **`BottomSheet.Body`** used to drop a caller's `onScroll`, silently costing the sheet the
  position report its drag arrangement is built on.
- **`BubbleChart.Trend`** reported a new fit object on every render, which looped any caller who
  put it in state. It reports on the numbers now.
- **`AnimatedBadge`** drew a black ring in every theme, left an empty slot where the loading glyph
  belongs, took a caller's `icon` in the icon set's grey, and drifted into place on every screen
  that showed one.
- **Reanimated no longer warns about `LayoutMetrics`.** `use-keyboard-avoidance` and
  `use-reveal-progress` measured views the layout engine had no metrics for — every frame between
  a mount and its first layout, and every frame after an unmount the callback had not been stopped
  for. `measure` prints that warning before returning the `null` a caller could notice, so the
  check both already had was too late.
- **panelui.dev has not built since 0.87.0 was tagged.** The production chain read
  `apps/docs/scripts/api.json`, which is gitignored, without running the step that writes it — so
  it passed on a developer's machine and failed on the deploy, leaving the site on 0.86.1 with two
  documented charts missing. The deploy is the one place nobody is watching: it runs after the tag
  exists, and the workflow reports success as soon as the hook is accepted.

### Docs

- `PyramidChart` carries its recordings from the device, and its second version is four bands in a
  shorter frame — height is the chart's width over `aspectRatio` and has nothing to do with the
  number of rows, which is the knob people reach for first.

## [0.87.0] — 2026-08-31

### Added

- **`PyramidChart`** — two series mirrored about a centre line, one row per category. Both wings
  are measured on one scale derived from the larger of the two, which is the whole point of the
  shape: a bar twice as long as the one facing it means twice as much. Which side a series grows
  into comes from `side` rather than from the sign of its numbers, so a value is a distance
  outward from the centre. `labelPlacement` puts the category names over each pair of bars, in a
  gutter between the wings, or down the left.
- **`BubbleChart`** — one labelled circle per row on two measured axes, with a third quantity on
  each circle's area and its name written inside it. This is the categorical case: a handful of
  named things a reader wants to find one of. `ScatterChart.Points` keeps the series case through
  `sizeKey`, and the two pages point at each other.
- **`SearchBar` draws its results.** Give it children and it renders a panel welded to the field:
  `SearchBar.Section` for a labelled run of rows, `SearchBar.Item` with `leading` and `trailing`
  slots, and `SearchBar.Status` for the line a panel shows instead of rows — nothing typed, a
  search running, or nothing found. `avoidKeyboard` lifts the field, the Cancel button and the
  panel together while the field is focused, and `panelPlacement` opens the panel upward by
  default, into the space that is actually free. Touches inside it keep the keyboard up, so the
  first tap on a row is a row press rather than a dismissal.
- **`bubbleRadius`** joins the chart utilities, mapping a value to a circle's *area* rather than
  its radius — doubling a radius quadruples the ink, and the reader believes it.

### Changed

- **The agent skill carries the API now.** It shipped a list of component names and an instruction
  to fetch the documentation over HTTP: a round trip per component for an agent that has a network
  tool, and nothing at all for one that does not. It now generates a file per component from the
  library's own TypeScript — anatomy, every prop with its type, default and documentation, the
  variants, the parts and a worked example — plus three new pages: `setup.md` (installing it, and
  every reason `className` silently does nothing), `hooks.md` and `recipes.md`. It is installable
  in Claude Code as a plugin, which brings the MCP server with it, and stamps the release its props
  were read from.

### Fixed

- **Charts round their axes out to numbers a reader can divide in their head.** Padding the data's
  own span by a fraction ended an axis at 52.7, which is true and which nobody was looking for.
- **A bubble at the edge of the plot is no longer cropped in half.** A circle is drawn about its
  centre, so the plot holds back the largest radius at every edge — and the largest bubble is the
  one carrying the largest value.
- **A bubble's readout clears the circle it names.** Lifted by a constant it put its own top above
  the bubble's centre, so its body came back down over the circle and sat under the finger that
  summoned it.
- **A pyramid's outermost value labels stay inside the chart.** The last tick of each wing sits on
  the plot's own edge, and a label centred there hung half its width off the side.

### Docs

- Every component page for `SearchBar`, `PyramidChart` and `BubbleChart`, with the anatomy, the
  parts and worked examples for each; the example app gains a full-page demo for the search panel
  and three versions of each chart.
- The Skills page documents the plugin, and the README has a section on coding agents — it had
  never mentioned the skill at all.

## [0.86.1] — 2026-08-30

**No library changes.** `panelui-native` is identical to 0.86.0 — nothing under `src` moved. The
release exists to publish the documentation below, and there is nothing to gain by upgrading to it.

### Docs

- **`FlipCard`** has a recording of every version on its page, and one at the top. The versions
  answer different questions — what a listing card holds back, what a shop grid has no room for,
  what a ticket shows a scanner — and none of that survives a still frame of a card that has not
  been turned.
- **`FlipCard`**'s code samples match the versions beside them again. Six of the eight described
  the previous design: a coloured band over a white body, an avatar with the default border on a
  face that border cannot be seen against, and three demonstrations whose two sides were styled
  alike. A sample that disagrees with the video above it is worse than no sample.
- The drag sample no longer imports `RefreshIcon`. It is not exported — the glyph belongs to the
  example app's icon package — so anyone copying the sample got an unresolved import.

### Changed

- The example app pins `react-native` 0.86.2, `react-native-worklets` 0.10.1 and
  `react-native-reanimated` 4.5.1, measured out of the Expo Go client rather than read off a
  manifest. This affects running the gallery from a checkout; it does not reach the package.

## [0.86.0] — 2026-08-29

### Added

- **`ProgressButton`** gains **`shape`**, so a hold-to-confirm button can carry the same corner as
  the buttons beside it instead of always being the rounded one in the row.

### Fixed

- **`BottomSheet`** no longer opens to a fully opaque scrim over an empty screen. The backdrop's
  opacity is interpolated from the sheet's own `translateY`, but the entrance travel belonged to a
  layout animation — a different mechanism, which does not replay when the sheet remounts inside
  the portal. Two sheets sharing a screen was enough to leave one parked off-screen for good, with
  the scrim already dimmed. The entrance is `translateY` now, so there is only one value to be
  wrong and the scrim cannot outrun the sheet. Reduced motion still starts at rest and fades.
- **`Tabs`** stops flashing the first tab on the way to the selected one. A row long enough to
  scroll used to render at its start and then travel, which reads as the wrong tab being briefly
  active on every mount.
- **Expo Go boots the gallery.** `PanelUIProvider` mounted the keyboard controller's provider on
  the strength of a `require` succeeding, but a package being resolvable is not the same as its
  native half being present — in Expo Go every call into it throws from a proxy, at mount, outside
  the `try`. Both the provider and `useKeyboardAvoidance` ask `TurboModuleRegistry` first, and they
  ask on the first render rather than while the consuming app is still evaluating its imports.

### Docs

- **`FlipCard`**'s four versions are designed rather than dropped into a card shell — each front
  laid out to its own rhythm, each card sized to its taller face, and the grey placeholder bands
  that read as a failed image are gone.
- **Troubleshooting** carries what a version mismatch with the Expo Go client actually looks like,
  and the part that is easy to miss: the client on a device is a build with a date. A simulator
  refetches a current one; a phone keeps whichever was installed. The same project will run on one
  and close on the other with nothing to read.

## [0.85.0] — 2026-08-28

### Added

- **`FlipCard`** — two faces of one card, and a turn between them. For content that is genuinely
  two-sided: a bank card and its security code, a term and its definition, a photograph and what it
  is of. `trigger` decides what turns it — a tap, a drag that follows the finger and springs to
  whichever face is nearer on release, or nothing at all for a card driven by `flipped` from a
  control elsewhere. `direction="vertical"` turns it top over bottom, which is what a card in a
  column wants: a horizontal turn sweeps the near edge out over its neighbours. Both faces are
  hidden twice, because `backfaceVisibility` is not reliable on every Android surface and its
  failure is a card showing both faces mirrored through each other. Under reduce motion the faces
  swap with no turn at all.
- **`panelui-native/icons` and `panelui-native/primitives/text`** are now subpaths. They were the
  two things an app reached for first once it was importing by subpath, and the two whose absence
  sent it back to the root entry.

### Fixed

- **Native controls follow the app's theme.** A hosting controller resolves its colour scheme from
  the system appearance, not from the theme the app is running — so an app in a dark theme on a
  phone set to light drew a light platform control beside dark content, and a theme changed at
  runtime left the control where it was. `colorScheme` is the one theme signal the toolkit accepts
  and nothing was passing it. Button, Switch, Slider, Select, BottomSheet, Popover and `Glass` all
  do now.
- **Native controls no longer move under the press.** `matchContents` is not a measurement taken
  once on mount: the host writes the platform's measured size into the layout on every geometry
  change the platform reports, so a control that lays itself out again under a press dragged its
  box and everything below it. Button, Switch and Slider now state the height they already know and
  match only the axis that is genuinely the platform's. Select and Popover still match both, and
  that is deliberate — a picker is a compact menu or a full rotor, and only the platform knows
  which it drew.

### Changed

- **The search page in the Panelside demos is rebuilt.** The field and a Cancel are at the top, so
  the page has a way out that is not "open a panel to escape a search". Results are grouped — chats,
  messages, images, files — with the query marked inside each line, because which section a row is
  in answers "is this a file or a conversation" and a mixed list of twelve titles cannot. Before
  anything is typed it shows recent searches and what was last open. Nothing exported changed;
  `Panelside.SearchTrigger` still draws a button and reports a press, but an app that copied the
  old page's shape from the documentation will find a different one there now.

### Docs

- A **Troubleshooting** page, for the failures that happen after the install works: an app that
  closes on Android with nothing in the terminal, the `Cannot find native module 'ExpoAsset'`
  triple that means the versions do not match the SDK, `adb logcat` as the one thing that names
  either, and the optional packages whose absence looks like a prop that does not work.
- **Import through the subpaths for anything you ship.** The root entry re-exports all 120
  components and Metro does not tree-shake, so one name from it loads every one of them. On a
  desktop simulator that is invisible; on an Android device the whole library evaluates before the
  first screen paints. Installation and the package README now say so, and the example app's own
  boot path was changed to match.
- The **TreemapChart** page has its recordings — the top preview and three of its four versions.

## [0.84.0] — 2026-08-27

### Added

- **`CircularText`** — text set around a circle, turning. For a badge, a seal, a mark around a
  logo: decoration whose job is to be a shape first and a sentence second. Each character is placed
  on the curve and turned to sit square on it, so the ring closes and the text along the bottom is
  upside down, which is what makes it read as a circle rather than as a sentence bent into one.
  `spread` gives it less than a full turn, `reverse` sends it the other way, `paused` stops it where
  it is and resumes from there. Under reduce motion the ring is drawn once and held still — the
  shape carries the meaning, and the rotation is the part that setting exists to remove.
- **`Popover` can be the platform's own.** `native` hands the panel to SwiftUI, the way it already
  works for the sheet, the button and the picker: the platform draws the container, its radius, its
  shadow and its arrow, and holds the anchored shape on a phone instead of adapting to a sheet.
  iOS only, and deliberately so — Compose's nearest relative is a dropdown menu, a different control
  with different rules, so Android and web keep the styled panel and the same tree works on all
  three. Give the content a `width`: a hosted subtree has no parent for a percentage to resolve
  against, so one that does not state its width reports none and the popover sizes to nothing.

### Changed

- **`Panelside`'s search is a page rather than a sheet.** `Panelside.SearchSheet`,
  `Panelside.SearchTabs`, `Panelside.SearchTab`, `Panelside.SearchResults`,
  `Panelside.SearchResult` and `Panelside.SearchField` are **removed**, along with `searchOpen` and
  `setSearchOpen` on the root and on `usePanelside()`. `Panelside.SearchTrigger` stays, keeps its
  `variant`, `native` and `glass`, and now only reports the press.

  Searching your chats is somewhere you go and stay for a while: you read the list, filter it,
  type, read it again. A sheet over the screen you came from spends all of that covering the thing
  it is a list of, and leaves the field half a screen to put results in once the keyboard is up.
  Where search lives is a decision about the app, so the trigger reports the press and the rest is
  yours — a scene of your own, a `Panelside.Page`, a screen pushed onto the router's stack.

### Fixed

- **The direction glyphs mirror again in a right-to-left subtree.** The two side chevrons, the
  outward arrow and the send plane are all declared to mirror and none of them did: the transform
  was applied as a `style` on the drawing component, which destructures `style` out of its props
  and never puts it back, so it was discarded in silence. Every other prop on the same element
  arrived, which is why it survived a release — an RTL list row got a right-pointing chevron on its
  leading edge, pointing back at the text, and nothing in the source looked wrong. It now goes on a
  view, which cannot lose it, and that view also carries the caller's own `style`, which was being
  thrown away with it.
- **A `Marquee` with no height of its own draws its content.** Its visible copies are positioned
  inside a track that fills the row rather than measuring one, so a marquee inside a container that
  sizes to its contents had nothing to fill: the copies were clipped away and the pause control,
  which is not clipped, was all that was left. `live` — which decides whether a control is offered,
  and which a group asks its rows for — now comes from the copy count rather than from the period,
  so a row that renders nothing no longer reports itself as moving.

### Docs

- Each `Toast` variant has its own page. Six ways of raising one shared a screen, which made the
  demo a column of six outline buttons: whichever you pressed, what you were looking at was the
  other five.
- The `Marquee` note that said a horizontal marquee takes its height from its content said the
  wrong thing, and the documented snippet had no height either, so anyone copying it landed on the
  same empty strip.
- `CircularText` ships with its recordings — the page's top preview and one for each of its five
  versions.

## [0.83.0] — 2026-08-26

### Added

- **`BottomSheet` can drop the platform's material.** A `native` sheet is drawn by the platform in
  a translucent material — on iOS 26 that is Liquid Glass — and what is behind it shows through.
  That is right for a sheet laid over content worth glimpsing and wrong for one that is a surface
  of the app's own, where the ground shifting under it reads as a mistake. `nativeBackground`
  paints it solid instead: `true` takes the theme's popover surface so the sheet matches the app
  in both schemes, and a string takes that colour exactly.

  It reaches the sheet's own chrome — the grabber's strip and the safe-area inset — which a
  background on the content stops short of, so the sheet would otherwise arrive two-tone and shift
  between detents. It needs `native`, since only the platform's sheet has a material to drop, and
  on iOS below 16.4 the sheet keeps that material.

### Changed

- **`ImageGeneration`'s field moves at the rate the screen draws.** It was a flipbook: twenty-four
  pictures built when the box is measured, with the clock rounded down to one of them, so on the
  default `drift` the picture changed 5.7 times a second however fast the display refreshed. It is
  now two layers — the frame being left and the frame being arrived at — cross-fading on the
  fraction that used to be discarded, so the light moves continuously while the drawing itself is
  still handed over only when it actually changes.

  The drift path also closes now. Its two frequencies used not to divide into each other, on the
  reasoning that a path which never closes is one the eye cannot learn; it closes anyway at the end
  of the pass, so all that bought was a jump of four normal steps every four seconds.

### Fixed

- **A native `BottomSheet` opened once and then never again.** The queue that holds a present
  arriving mid-dismissal waits for the platform to report the previous sheet has gone, and the
  platform only reports the dismissals it was not asked for: one we requested leaves the value
  already where it would have written it, so the change is suppressed at the source. Waiting for a
  report that was never sent held every later present for ever. The reader's dismissal still ends
  on the report; ours ends on a window past the system's own sheet transition, and on the report
  too if one arrives.

- **panelui.dev had not built since 0.82.0 was tagged**, and the example app's export budget had
  been red for days. The icon package is declared where the docs workspace can claim it rather
  than resolved through hoisting, and the glyphs the example app uses are deep imports rather than
  the barrel, which re-exports the entire set.

### Docs

- **`ImageGeneration` has its recordings**, including one per step of `status` and per value of
  `animation` — both select behaviour rather than classes, and both are easier seen than read.
- **`SlideButton` has its recordings**, top preview included.
- **The icon page lists the filled set** and the six glyphs whose default weight is not the set's.

## [0.82.0] — 2026-08-25

### Added

- **`SlideButton` — drag across to confirm.** For an action worth a moment's deliberation, where
  a hold is the wrong shape. `ProgressButton` asks for time and shows a clock; this asks for a
  movement and shows a distance, so the reader sets the pace and still cannot arrive by tapping.
  Nothing fires until the handle clears `threshold` (nine tenths of the rail by default;
  `threshold={1}` asks it to reach the end exactly). A slide let go short but still travelling is
  honoured — the velocity is projected forward, over a window short enough that a flick from
  halfway does nothing.

  It works without a finger: the rail publishes an `activate` accessibility action, because a
  confirmation control reachable only by dragging is one some people cannot use. Name it with
  `accessibilityActionLabel`, after what happens rather than after the gesture. Right-to-left is
  handled — the handle rests at the far edge and travels the other way.

- **`ImageGeneration` — the place an image will be, while it is being made.** *(beta)* A generated
  image arrives seconds after it is asked for, at a size nobody knew in advance, so without
  something reserving the box the screen reflows under the reader's thumb. This takes the aspect
  ratio up front and fills the box with a field of dots until there is a picture.

  `status` moves the picture through the work rather than switching it, and `refining` is the step
  worth having: the field is at half strength and the image is already coming through it. An
  image that appears the instant the field vanishes has been swapped in; one that surfaces
  through it has been developed. `animation` picks how the light moves — `drift`, `pulse` or
  `scan`.

- **`Select` hands over its search query.** `useSelectSearch()` returns what was typed, so a
  caller rendering options with a virtualized list can filter their own data. `valueLabel` gives
  the trigger a label for a row that may never have been drawn.

- **`SlideButton` and `ImageGeneration` are on the components index**, under Actions and AI
  components.

### Changed

- **Every icon is drawn from one source.** The set was two families of hand-drawn SVG plus a
  Lucide dependency that `Menu` and `KPI` reached past it for — three drawings of a check in one
  library, and a required runtime dependency for seven glyphs. Every glyph now comes from
  Hugeicons, and `lucide-react-native` is gone from the package.

  The public surface is unchanged: the same 77 exported names, `IconProps`, `IconColorProvider`,
  `ToggleIconProps` and `BadgeCheckIconProps` all mean what they meant, and the 54 components
  that import from the set did not change. The wrapper keeps what a bare glyph would lose — the
  per-icon default size, the colour order, the right-to-left mirror on the four glyphs whose
  meaning is a direction, and `filled` on the six toggles a post's action row is made of.

  `strokeWidth` defaults to 2 rather than the drawings' own 1.5: the set is drawn at 24 and used
  at 14–20, where a hairline thins to nothing. **Expect the whole library's icons to look
  slightly different.** Four stay hand-drawn — the Google, Facebook and Apple marks carry their
  own palettes, and `BadgeCheckIcon` is two-tone.

- **`TextGlass` is withdrawn.** It was added after 0.81.0 and never published, so nothing depends
  on it.

### Fixed

- **A bottom sheet reopened straight after closing.** The subtree was removed from React in the
  same commit `open` flipped, while an `exiting` layout animation was still declared on it —
  Reanimated then held the detached views until that spring settled, and a reopen inside that
  window raced it. One animation owns the whole travel now, and the tree comes down from its
  completion callback rather than during it. Reopening mid-exit catches the same sheet on its way
  down.

  A `native` sheet gains the presentation queue the platform does not have: UIKit refuses to
  present while the previous sheet is dismissing and drops the request, so one arriving during a
  dismissal is held and replayed from the platform's own `onDismiss`.

- **`Portal` tore itself down on every render.** `children` is a new element each time its owner
  renders, and one effect did both the mounting and the unmounting — so every render deleted the
  key from the store and put it back, twice through a full re-render of the host, for an overlay
  that re-renders while it is open.

- **`Select` dropped children it did not recognise.** The filter kept items and groups and
  discarded everything else, so a `Select.Item` rendered by a virtualized list vanished the moment
  anybody typed, and so did a caption or a divider. It keeps what it has no opinion about now, and
  `No matches` is only shown when there were options to match.

## [0.81.0] — 2026-08-24

### Added

- **`Planner` draws a day three ways.** `variant` picks one: `default` is the date, a marker and
  small icons it had before; `tiles` gives the day over to a single large icon with the date in
  the corner and the tile tinted behind it; `calendar` names every entry in a block of its colour
  under a centred date, on an open grid ruled off by week rather than boxed per day.
- **An entry can carry its own `color`.** It wins over its category's, which is what a brand
  needs — a logo belongs to the thing rather than to the group it was filed under, and a month of
  them would otherwise need one category per row.
- **`Planner.Scroller` replaces `Planner.Grid` with the weeks of the year in one scroll.** Reach
  for it when the question is what is coming rather than what this month looks like: the week
  straddling a month boundary is then drawn once, in one piece, instead of appearing cut in half
  at the bottom of one page and again at the top of the next. The range is bounded, at `weeks`
  either side of the month it opened on, because a scroller has to know its own height to place a
  scrollbar and to reach a month without rendering its way there. The header follows the scroll
  and stays quiet while it does; the arrows and the Today pill still announce, because those are
  deliberate moves and a scroll is not.
- **`fill` stretches a planner to its container** instead of standing it at its own height, for a
  planner that owns a screen. It needs a height to fill, so give it a `flex-1` parent.

### Changed

- **A `tiles` month draws only the weeks it spans**, sharing out the height six weeks would have
  taken. A five-week month therefore leaves neither a band of empty space under the last row nor a
  panel that changes size as you page through the year — the two ways this usually goes wrong.
  Its tiles are slightly taller than a six-week month's, which is the price of both.
- **Pressing the open day closes it.** The mark was a one-way door: a planner with no `Details`
  bound has nothing to dismiss, so the day you pressed stayed marked until you pressed a different
  one, with no way back to none selected.
- **The month arrows are pinned to the right edge** by their own margin rather than by whatever
  sits beside them growing to push them there.
- Weekday headings can be narrow — a single letter — where the column is already unambiguous by
  position. `tiles` uses them.

### Fixed

- **Keyboard movement steps over cells a look leaves blank.** `tiles` draws nothing for the days
  either side of the month, and an arrow key aimed at one of those found no cell to focus and
  stopped dead. Movement now carries on in the direction asked for until it reaches a day that is
  really there, and stays where it started rather than running off the grid.

### Docs

- The Planner page carries previews recorded on a device.

## [0.80.0] — 2026-08-23

### Added

- **`QRCode` takes a shape and a colour for each of its three parts.** A code is three things
  wearing one colour: the body, which carries the data, and the three corner eyes, each a ring
  with a square inside it. `moduleShape`, `eyeFrameShape` and `eyeBallShape` on `QRCode.Canvas`
  change the geometry; `eyeFrameColor` and `eyeBallColor` join `color` and `backgroundColor` for
  the ink. `rounded` and `classy` join to their neighbours, so a run of modules is one stroke
  rather than a string of beads with a light seam through it.

  Scannability is a constraint here rather than a preference, and it is tested: every eye stays
  exactly seven modules across, which is what a reader finds a code by, and every module shape
  covers the centre of its own cell without leaving it, which is what a reader reads. What
  shaping does cost is ink — `dot` covers about two thirds of a cell and `diamond` exactly half
  — so raise `errorCorrection` with it and check a printed code rather than one on a screen.

- **`Panelside` search is a surface rather than a row.** `Panelside.SearchTrigger` goes in the
  header's action slot and opens `Panelside.SearchSheet`: a sheet the height of the screen
  holding a dismiss button, `Panelside.SearchTabs` to narrow what is searched,
  `Panelside.SearchResults`, and `Panelside.SearchField` docked to the keyboard. The open state
  lives on the root, so the button and the sheet — which are in different subtrees — need
  nothing wired between them; `usePanelside()` exposes it as `searchOpen`.

  A field in the header is the obvious way to do this and the wrong one on a phone: the panel is
  most of the screen, the field is forty points of it, and a search that returns anything has to
  push the history down a screen it already fills — from the top, which is the far end of the
  screen from the keyboard that just opened. `Panelside.Search`, the inline field, is still
  exported and is still right for a docked panel on a tablet.

- **`Panelside.Footer` and `Panelside.Header` take `surface`.** `transparent` is the new default
  and paints nothing, so the history runs under the controls and the panel reads as one surface
  with two things floating on it. `fade` is the previous behaviour — the list dissolving into the
  panel above the controls — and `solid` is a band with an edge, which `floating={false}` implies.

- **`Timeline.Masthead`**, the block above a horizontal rail: media, a small label, then the
  name. One part rather than two `Text`s at the call site, because the pair has to be typeset as
  one unit — set a step apart with an ordinary paragraph gap they read as a heading followed by a
  bigger unrelated one.

- **`Timeline` reports which column you are on.** `onColumnChange` fires as the reading edge
  crosses from one column to the next, so a masthead, a caption or a picture outside the rail can
  belong to the column being read. Without it, swiping through ten columns is swiping under one
  unchanging heading. It is one state update per column, not per frame.

### Changed

- **`Panelside.Cta` is 44pt, and `size="lg"` is 52pt.** At 40 it matched the account button
  beside it, and the two read as a pair of equals — which is not what the footer is for.

- **The band above a horizontal `Timeline`'s rail is reserved by the column**, not by whatever it
  contains, so `Timeline.Aside` is optional. It draws into the strip with a negative margin
  cancelling its own height. Reserved by the aside, as before, a column written without one put
  its tick a whole band above the rail and the rail stopped being a line.

### Fixed

- **The `Panelside` search parts threw outside the sheet.** The styled sheet mounts its content
  through a portal, under the portal host and outside the component's subtree, so a provider
  wrapped around the sheet was one the children never saw. Only the platform sheet worked,
  because it hosts its content in place.

- **The search sheet's column had no height to divide.** A hosted sheet hands its content a
  *minimum* height, and a minimum is not something `flex-1` can share out — the results list
  sized to its own rows, grew past the sheet, and pushed the field off the bottom, which is a
  search surface with no way to type into it.

### Docs

- **`/docs/components` is a gallery, and moves to the Sections group.** Every component is a card
  with its name, its description and a wireframe of the shape it makes — you recognise the row of
  chips, or the sheet coming up from the bottom, before you have read the word. A list of a
  hundred and sixteen names only works for somebody who already knows what the library calls
  things, which is the one thing a reader on that page does not. The URL is unchanged.

- **`QRCode` has its previews**, recorded on a device, on the page and beside each version.

## [0.79.1] — 2026-08-22

### Fixed

- **`Accordion.Indicator` scheduled an animation it had nowhere to travel.** The chevron's
  shared value is seeded from whether the section is open, and a mount effect then assigned
  that same value again through a timing — a 0-to-0 transition per indicator, run before the
  screen could draw. One indicator hides the cost; a list of them does not, and a bottom sheet
  holding thirteen collapsed items took a visible beat to present on Android. The effect now
  skips its first run and settles the angle outright. The chevron animates when a section
  actually opens or closes, as before.

### Docs

- **Every component page opens on the component.** The preview — the recording or screenshot of
  it running on a device — now leads the page body, with the prose underneath it. It used to sit
  below a median of four paragraphs, which meant scrolling past a wall of text, and past a
  restatement of the one-line summary already printed under the title, to reach the one thing on
  the page that answers "what is this". No page lost a word; the blocks swapped places. Alpha and
  beta warnings stay above the image.

- **`ThemeSelector` has its previews**, recorded on a device, on the page and beside each
  version.

## [0.79.0] — 2026-08-20

### Added

- **`ThemeSelector`**, for choosing light, dark or the device's own setting.
  Three miniatures of a screen with the chosen one ringed — which costs three
  times the space a row of words would, and buys `System`. That is the option
  people hesitate over, and a picture of a screen split down the middle explains
  it faster than a sentence does. Two drawings: `window` is an app screen split
  down the middle, `card` a framed card cut on the diagonal.

  It reads the live theme instead of keeping its own copy, so changing the theme
  anywhere else moves the ring. That is also the only way `System` is reportable
  at all: applied, it resolves to light or dark, and the result is
  indistinguishable from the same choice made by hand. **`useThemeSelection`**
  is the reading, public for a settings row that reports the choice without
  offering it.

- **`ProgressButton.Done`**, the drawing a completed hold lands on. A tick by
  default, over the finished fill rather than beside the label, so the button
  does not change width at the moment it succeeds. One is added unless you write
  your own.

- **`Panelside.ItemIcon`, `Panelside.ItemLabel` and `Panelside.ItemBadge`** —
  the three slots a row already had, written out. For a row that needs a
  different order, a label that is not a string, or something in a slot the prop
  had no argument for. `icon`, `label` and `badge` stay and stay the right
  answer for the ordinary row; the two forms compose.

- **`variant` on `MarkdownEditor.Toolbar`.** `pill` is a floating capsule:
  icon-only buttons grouped by hairlines, with the way out of the writing pane
  as a round button beside it. `bar` remains the default. A button whose action
  is already in effect where the caret is now draws as pressed — every one of
  them is a toggle, and a toggle that looks the same in both states is a toggle
  nobody discovers is one.

- **An `image` action and a `ref` handle on `MarkdownEditor`.** The handle
  carries the same transforms the toolbar runs, so a keyboard accessory or a
  control of your own does not have to reimplement any of them.

- **Return continues a list in `MarkdownEditor`**, at the same indent and
  counting on through a numbered one; on an item with nothing in it, it ends the
  list. Off with `continueLists={false}`.

### Changed

- **`ProgressButton` variants rest on one surface.** Three of the four were
  outlines, which made them four different buttons before anything had happened
  — and the one thing all of them do, wait to be held, was the thing the drawing
  did not say. The variant's colour is carried by the label and by the fill.

- **A lone `Marquee` draws its pause control below the content**, in flow, the
  way a `Marquee.Group` already did. Floating in the corner it was a 48pt target
  on a strip of badges half that tall: clipped by the track's own edge, and
  covering the content it exists to let you read. A marquee is now as tall as its
  content plus its control.

- **`Map` splits its children.** Layers reach the renderer; controls, and any
  chrome written at the call site, are drawn as a sibling above it where layout
  still applies. `Map`'s `onPress` also hands back the press in screen
  coordinates beside the geographic one.

### Fixed

- **`Map.Controls` no longer blanks the map on Android.** Every child was handed
  to the native map view, which is a real `FrameLayout` there and lays its own
  children out — so an ordinary view arrived with its computed frame thrown away,
  stretched over the whole surface at the top-left. The corner a control group
  asked for never applied, and the map it covered never showed. Reported by
  [@yashDahiwale](https://github.com/yashDahiwale).

- **`Map`'s `onPress` hands back a coordinate.** It read a field the renderer
  has never emitted, so the argument was always `undefined`. It type-checked
  because the props are declared by hand and the declaration carried the same
  wrong name.

- **`hasMapLibre` tells the truth in Expo Go.** The package resolving is not the
  question — a client built without the native views has the JavaScript and none
  of them. `Map` skipped the panel it draws for exactly this case and tried to
  mount a view nothing had registered.

- **`ProgressButton`'s fill travels back instead of vanishing.** The release was
  never running: a shared value animated on the UI thread does not report back to
  JavaScript, so the value read in the press handler was the one from before the
  hold began, and `cancelAnimation` wrote that stale zero back across the thread.
  Both directions are started on the thread that owns the value now, and every
  path to empty — a hold let go, an `autoReset` landing, a controlled reset —
  goes through one rewind.

- **`ProgressButton` keeps taking presses after a successful hold.** The release
  that followed one drained the fill, so the button looked untouched while it was
  in fact complete — and a complete button refuses every press. Two more
  alongside it: the effect meant to empty a controlled button's fill did the
  opposite and fired `onComplete` twice, and the prop spread sat below the press
  handlers, so a caller passing `onPressIn` replaced the gesture the control is.

- **Pausing a `Marquee` freezes it where it is.** `cancelAnimation` already froze
  the offset exactly where it had reached, and the line after it overwrote that
  with zero on every toggle. Resuming carries on from where it stopped.

- **Four caret bugs in `MarkdownEditor`.** A line action handed back the whole
  block selected, so the next keystroke replaced the list it had just made; an
  inline marker wrapped across a line break, which is emphasis in no reader at
  all; the code button read only the caret's own line, so pressing it inside a
  fence wrapped that fence in a second one; and the forced selection after an
  edit was released before it had arrived, leaving the caret at the end of the
  document.

### Docs

- Previews for **ColorPicker** and **ProgressButton**, recorded on a device.
- The **Alpha** mark comes off **AI Input**: two releases without the API moving.
- Three links in the prose pointed somewhere other than where the page lives,
  two of them hard 404s — Drawer to Panelside, and AI Input to a Glass page that
  has never existed.
- An X link in the landing page's footer.

<a id="migration-0-79-0"></a>

### Migration

Nothing here breaks and no code has to change. Two things look different on their own, which is
why they are written down rather than left to be noticed.

- **Every existing `Marquee` is taller.** Its pause control used to float in a corner of the
  track; it is drawn below the content now, in flow, the way a `Marquee.Group`'s always was. A
  marquee is therefore as tall as its content plus a 48pt control, and a container given a fixed
  height spends part of that height on it — a vertical one at `h-40` has about sixty points less
  track than it did. Pass `showPauseControl={false}` where an equivalent visible control already
  exists elsewhere, and the old height comes back with it.

- **Every `ProgressButton` variant is drawn on the same surface.** `primary`, `destructive` and
  `success` were outlines and are now solid secondary grounds with the variant's colour in the
  label. Nothing to change; the fill is unaffected, and a button that was distinguishable before
  still is.

### Fixed by report

- [#201]: `Map`'s `onPress` and `Map.Controls` on Android, reported by
  [@yashDahiwale](https://github.com/yashDahiwale).

[#201]: https://github.com/panel-ui/PanelUI/issues/201

## [0.78.0] — 2026-08-19

### Added

- **`ProgressButton`**, for the action a confirmation dialog exists to slow down.
  A dialog asks the question somewhere else and takes the answer as a tap, which
  makes it two taps — and two taps in a row is a rhythm a hand falls into. This
  has to be held, and the fill on the button says for how much longer. Nothing
  fires short of a complete fill: there is deliberately no tolerance near the
  end, because a tolerance means the button sometimes commits after you have let
  go on purpose.

- **`Marquee.Group`**, for rows that travel together. Moving content needs a way
  to stop it, so a marquee draws its own pause button — and two rows of logos
  meant two buttons, each pinned to its own bottom corner, with the upper one
  landing on top of the row beneath. A group draws one control for everything
  inside it, below the rows rather than over them, and the marquees in it stop
  drawing their own.

- **`variant` on `SplitView`.** `seam` is the old drawing, for a split inside
  something that already has a surface of its own.

- **`haptics` on `Timeline`**, off by default: a tick as the reading edge passes
  from one column to the next. Needs `snap`, since a scroll that lands anywhere
  has no detents to feel.

- **`useSkeletonHandoff`**, the hook behind the chart change below. Public
  because anyone drawing their own loading state wants the same thing.

### Changed

- **`SplitView` is drawn as two panes.** Its grip was byte-for-byte `Splitter`'s
  and its panes had no surface of their own, so the two components were
  indistinguishable on screen while doing quite different things. Each half now
  gets a rounded surface on a recessed ground, with the grip in a real gap
  between them. **This changes how every existing `SplitView` looks** — pass
  `variant="seam"` to keep the old drawing.

- **A chart hands its skeleton over instead of cutting it.** Five charts dropped
  their placeholder on the frame the data landed, while the reveal was still at
  zero — a blank panel between two states that were both meant to show
  something. `ScatterChart` already did this properly; pie, funnel, treemap,
  waterfall and line now do too.

- **`ScatterChart`'s reveal is 650ms**, down from 900ms, which is where the rest
  of the charts sit.

- **`Timeline`'s horizontal columns say which one you are reading.** A column
  already came forward as it reached the reading edge, but every word in it
  stayed the same muted grey as the columns either side — closer, and no easier
  to read. Its date, age and description now run to the foreground token as it
  arrives. Driven by scroll position rather than by a clock, so it survives
  reduced motion; the scale and the drop still do not.

- **`BottomSheet` hands the fling's velocity to the animation** instead of only
  consulting it as a threshold. The frame the touch ended used to be a visible
  seam between a fast drag and a slow slide. A quick flick now dismisses on its
  projected resting point rather than having to travel 120 points first. One
  spring for arriving, snapping back and leaving, where there were three
  slightly different ones; the backdrop is derived from the drag, so it can no
  longer stay fully dark while the sheet is halfway out.

- **`Toast` exits on the same ease-out as everything else**, rather than an
  ease-in that spent its first frames barely moving — exactly when you are
  looking at what just changed. Its stack springs when a toast in the middle is
  dismissed, instead of teleporting the cards behind it forward.

- **`BottomSheet` and `Toast` respect reduced motion**, which neither did. Both
  keep the fade and drop the travel.

- **`SectionRail` is smaller throughout** — narrower bars, tighter trigger
  padding, a smaller panel and rows. Same design, less of it.

### Fixed

- **The chart reveal now plays on Android** ([#200]). It was an animated `<Rect>`
  inside `<Defs><ClipPath>`, and react-native-svg does not push animated prop
  updates through to the native clip there, so the chart drew complete and the
  animation was simply absent. `LineChart`, `AreaChart`, `HeatmapChart` and
  `Plot` uncover their marks with a view under `overflow: 'hidden'` instead,
  which the platform itself clips. `HexChart` grows an ellipse from the centre
  of its field, which a rectangular view cannot express — it keeps the SVG clip
  and has gained the static fallback it was missing, so where the animated props
  do not arrive the reveal does not play rather than the series never appearing.

- **One tap on `SectionRail` selects one section.** Tapping a row lit up three or
  four in quick succession and fired a haptic for each. The rail had a window
  meant to cover exactly this, and it was closing before the journey started:
  `useScrollSections.scrollTo` sets the active section optimistically, so the
  rail saw its target arrive on the next render and disarmed for the whole
  animated scroll that followed. Fixed at both ends — the hook no longer reports
  positions it is driving, and the rail no longer treats the first matching value
  as arrival.

- **`TreemapChart` no longer spends its entrance looking like a wireframe.** Its
  labels were gated on the loading status alone, so every name and number sat at
  its final position at full opacity over tiles that had no size yet. Each label
  now arrives on its own tile's slice of the reveal.

- **`WaterfallChart`'s loading demo shows the chart again.** Its timer was keyed
  to mount, so pressing "Load again" put it into a state nothing would ever move
  it out of — and a loading waterfall has no bars, so it rendered as an empty
  panel.

- **Two of the same chart on one screen no longer share a gradient.**
  `TreemapChart`, `WaterfallChart` and `LineChart` gave their skeleton gradients
  fixed ids, so the second to mount won.

### Docs

- **The "Updated" mark expires a release after it lands**, and says "Updated"
  rather than "Update", which read as an instruction. It ran for the same three
  minor releases as the "New" dot, which put it on a large share of the sidebar
  at once — and a mark most rows carry is a mark nobody reads. "New" still runs
  for three: a component arriving is worth a glance from anyone, where a
  component changing only means something to a reader who already has it.

<a id="migration-0-78-0"></a>

### Migration

Nothing here breaks and no code has to change. One thing looks different on its own, which is why
it is written down rather than left to be noticed.

- **Every existing `SplitView` is drawn differently.** Each pane now has a rounded surface of its
  own on a recessed ground, with the grip in a gap between them. Pass `variant="seam"` to keep the
  old hairline-on-a-shared-background drawing — the right choice inside something that already has
  a surface, such as a card or a sheet, where a second pair of them is a box in a box.

- **A wrapper around a `SplitView` may now be doing the panes' job twice.** The demos in this repo
  were giving the split a rounded border and each half a tint, to tell the two apart; both are the
  panes' own now, and both were removed. Check anything you wrapped one in for the same overlap.

[#200]: https://github.com/panel-ui/PanelUI/issues/200

## [0.77.0] — 2026-08-19

### Added

- **`systemImage` on `Button`.** A labelled native button had no way to carry an
  icon: `startContent` is an element, an element has to be hosted inside the
  native tree, and a hosted view inside a labelled button has no width anything
  can resolve. `systemImage` names a glyph from the platform's own symbol set
  instead, so nothing is hosted and there is nothing to resolve. iOS only —
  Android has no equivalent set and a button there is its label alone.

- **`indicatorSymbol` on `AIInput.Pill`**, which is the same idea one level up:
  `indicator` is the element the drawn pill renders, `indicatorSymbol` is the
  name the handed-over one asks the platform for.

### Changed

- **A pill with a `detail` is now handed to the platform.** `detail` is text, and
  text does not need hosting, so it goes over as part of the label rather than
  keeping the whole pill drawn. Three of the composer's four pills were drawn
  before this and are platform controls now. The cost is that a handed-over pill
  is one label in one weight, so `detail` stops reading as the quieter half of
  the pair — the same trade every handed-over control already makes.

- **The composer's card carries a shadow.** Glass lifts its own edge against
  what is behind it, and over a light background there is nothing to lift
  against; the composer read as a faint rectangle on white.

- **`AIInput` is shown as `aiInput`** on its documentation page, in the sidebar
  and in the example app. The export is unchanged and still `AIInput`.

### Fixed

- **The composer's buttons no longer draw over its own text above the
  keyboard.** A native control is a SwiftUI view inside a hosting controller,
  and a hosting controller insets its content for the keyboard by default. A
  control docked above the keyboard therefore had its content moved *inside* the
  box this library gave it, over whatever was above it, while React Native's own
  layout said nothing had moved — which is why it snapped back on the next
  keystroke and why the one control in that row drawn by this library never
  moved at all. Every native host now refuses that one safe-area region.

  This affected `Button`, `Switch`, `Slider`, `Select` and `BottomSheet` alike;
  the composer is simply where a control sits close enough to the keyboard to
  show it.

### Docs

- Previews for every version of the composer, recorded on a device.

## [0.76.0] — 2026-08-19

### Added

- **`AIInput`, the composer a person types a prompt into.** The library had ten
  AI components and nothing to type into. This is the field, the row of
  controls under it, the sheet those controls open, and the voice screen the
  empty state offers. The field opens one line tall and grows to `maxRows`,
  after which it holds that height and scrolls — a composer that keeps growing
  eventually pushes its own send button off the screen.

  It never touches the microphone. The app owns the recorder and passes back a
  `level` and a `status`; a shared value keeps 30ms metering off the JS thread
  entirely, and `Soundwave` draws every meter, so the composer needs no audio
  dependency. A sheet row with `to` pushes onto the *same* sheet rather than
  opening a second one over it, and `native` hands the controls to the platform
  to be drawn in its own material. Marked alpha: the surface is broad and new.

- **`Glass`, the iOS system material with an honest fallback.** Glass could
  previously only reach a `Button`, and only by handing rendering to SwiftUI,
  which cannot dress a field or a sheet. This draws the real material on
  iOS 26 behind three gates — the optional package resolves, the runtime API
  exists, and the app was compiled for the design — and a solid token surface
  everywhere else. Nothing is faked on Android.

- **`Timeline.List`**, a virtualized path for long horizontal histories, with a
  bounded native render window. The compound API stays for short or mixed
  compositions.

- **`BottomSheet.Content` takes `showGrabber`**, so a sheet drawing its own
  surface can put the handle on that surface instead of above it.

- **`Marquee` draws a Pause/Play control**, labelled and observable through
  `pauseLabel`, `playLabel` and `onPlayingChange`. Motion that cannot be
  stopped is motion somebody is stuck with.

- **A Logo Maker agent skill**, published beside the library's own.
  `npx skills add panel-ui/PanelUI` now installs both.

- **An Integrations section in the documentation**, with a page on using Neon
  for the API routes behind a PanelUI app.

### Changed

- **`Avatar.Group` no longer reverses its layout.** Stacking order is set
  explicitly instead, so the first face is still on top and assistive
  technology reads the group in the order it was written.
- **`Plot` and `WaterfallChart` expose their data** the way the other chart
  families do.
- **`Carousel` and `useDisclosure` share one controllable-state primitive**, so
  controlled and uncontrolled behave identically across both.
- Icons gained camera, globe, chevrons-up-down, audio-lines and a plain send
  arrow.

### Fixed

- **Charts reject non-finite geometry.** A single `NaN` in a series could push
  the whole drawing to infinity.
- **`Timeline` horizontal columns keep their text opaque**, and snapping now
  follows the rendered order rather than the `step` value — a sparse or
  repeated `step` no longer lands a column on another column's snap point.
- **`Avatar` resets its fallback when the image source changes**, so a new URI
  is retried rather than showing the previous one's failure.
- **`SearchBar`'s cancel action follows `disabled`.**
- **`SplitView` keeps an accepted snap state** when a controlled change is
  rejected, and `Splitter` constrains a pair reset within its bounds.
- **`Marquee` bounds how many copies a very short child mounts.**
- **Consumer props no longer replace the semantics a component owns.** A later
  JSX spread could silently take over the role, state, disabled flag or press
  handler of `Alert`, `ButtonGroup`, `Field`, `Label`, `Plan`, `Tabs`,
  `Timeline`, `Toast`, `Tooltip`, `Typography`, the seam components and the
  tree. A test now parses the source of every compound control with that
  boundary and fails if an owned prop drifts back above the spread.
- **The CLI rejects paths that escape a project through a symbolic link.** A
  lexically contained path could still leave the project through an existing
  symlink, or through a destination that was itself one.
- **A summary containing a colon no longer breaks the documentation build.** A
  plain YAML scalar ends at the first `: `, so it failed at `next build` —
  after the drift check had passed and, at release time, after the tag exists.

### Docs

- Lifecycle matrices for the controlled components, generated rather than
  written.
- A sponsorship block in the README.
- Accessibility release checklist gains a native journey receipt, validated
  rather than trusted.

## [0.75.1] — 2026-08-18

### Fixed

- **`Drawer` threw on the first press and never opened.** The custom exit animation added in
  0.75.0 was written below the component's `if (!open) return null`, so a closed drawer ran 26
  hooks and an open one ran 27. React counts hooks by position, so opening one raised
  "Rendered more hooks than during the previous render" and the panel never appeared. The hook
  reads nothing that is only known once the drawer is open, so it now sits with the others above
  that return. If you are on 0.75.0, this is the upgrade to take.

## [0.75.0] — 2026-08-18

### Added

- **`SplitView`, two stacked panes whose seam settles on a named height.** The case `Splitter`
  does not serve: a layout with a few right answers — a map over a list, a preview over an editor
  — is better served by a seam that lands on one of them than by one that lets the reader stop
  three points short and live with it. `snapPoints` are fractions of the room the two panes share,
  so they mean the same thing on any screen; a number above `1` is points, and a negative
  `maxHeight` is measured back from the bottom, for the limit that is always written as a
  subtraction. `SplitView.DragArea` takes real layout height and that height comes out before the
  fractions are resolved, so `0.5` is half of what is actually divisible rather than half of a
  number the seam then eats into.

  A release settles on the nearest point to where the pane is plus where the throw was going, so a
  flick carries past a midpoint the finger never crossed — but never more than one point from
  where the pane actually is. Capping the distance alone is not enough: the same throw skips two
  points in a list packed close together and none in a list spread wide, so the guarantee is made
  in points. `SplitView.Top` clips what does not fit and `SplitView.Bottom` takes exactly what the
  top gave up with no second measurement, so content longer than the shortest snap point brings
  its own scroller. Dragging runs on the UI thread and `onSnap` fires from the spring's completion
  rather than on every frame. `Splitter` is still the one for any division, more than two panes,
  or a split that runs across rather than down.

### Changed

- **`Timeline`'s horizontal rail focuses the column being read.** It had one fade curve applied to
  the whole column across two column widths — a window wide enough to keep three columns near full
  strength, which is a row with nothing picked out. The column now fades, drops four points and
  scales down four percent across one column's width, and `Timeline.Content` takes a second,
  steeper curve to 30%. Several columns of prose stop reading as a wall while the dates and ticks
  either side stay legible, which is most of the reason to draw a timeline sideways. Reduce motion
  drops both curves.

- **`Steps.Trigger` takes `PressableProps`** and composes rather than replaces: a consumer
  `onPress` runs before the step changes, and the component's own `accessibilityRole`,
  `accessibilityState` and `disabled` win over spread props. `disabled` on the trigger is ORed with
  the item's.

- **`Plot.unregisterSeries` takes the colour as an optional second argument.** Several marks may
  now share one `dataKey` — an area, a line and dots for the same series register independently, so
  removing one no longer drops the survivors from the domain and the legend. Data keys are also
  ordinary strings again: one containing `|` is no longer split into columns that do not exist.

- **`Select` keeps its styled presentation when an option is disabled**, even with `native` set.
  The portable platform picker can disable the whole control but not one row, so handing it a
  disabled item made that choice selectable again. The list stays visible and unselectable instead.

- **`Toast` durations pause while the app is backgrounded** and resume from the time left, so a
  message raised on the way out is still there on the way back rather than having expired in the
  background. `ToastStore` is exported for tests.

- **`Textarea` treats `editable={false}` as disabled**, and `OtpInput` honours `editable` alongside
  `disabled` rather than letting one override the other.

- **`Rating` normalises `max`, `precision` and its value** — a fractional `max` floors, a
  non-positive `precision` falls back to whole stars, and a non-finite value reads as zero rather
  than propagating into the fill.

### Fixed

- **`Splitter` panes drew nothing inside a centred container, and a seam took one drag and then
  ignored the next.** Two faults. A horizontal splitter had no width of its own, and its panes are
  shares of one — so the width came from a share of a width that came from the panes, a circle that
  resolves to zero. It now fills the width it is given. And the seam raced its own double tap in
  the order that makes the pan wait: a two-tap gesture only fails once its window expires, half a
  second after the finger lands, so a slow first drag outlasted it and the quicker one after it did
  not. The pan goes first, the tap gives up on distance rather than on a timer, and each seam only
  answers to the axis it splits — so a splitter inside a scroller leaves the scroll alone. The seam
  is also lifted above both panes; it is written between them, and the later sibling was painting
  over the outer half of every touch target.

- **`Drawer` played its close animation twice on a swipe dismiss.** The gesture animated the panel
  off-screen and then unmounting fired the exiting preset, which starts from the view's layout
  position and applies its own transform — so the panel was drawn back at the docked edge and slid
  out again. The exit is now written rather than taken from a preset and seeds itself from the
  drag, picking the panel up wherever the finger left it. The close button and backdrop paths draw
  the same slide they always did.

- **`InputGroup` and `Input` clear measured padding when a decorator goes away.** A prefix or
  suffix rendered conditionally left its width behind as padding on an empty field.

- **`TagInput` invalidates a stale deletion mark.** A controlled list replaced between two
  backspaces could have the first one's mark authorise deleting a tag that was never armed.

- **`SearchBar` flushes a pending debounce on submit** instead of firing now and again when the old
  pause expires.

- **`Planner` refreshes today at local midnight** rather than only when the app comes back.

- **`Tour` ties a measured card height to the step that produced it**, so the next card is not
  placed using the last one's height before its own first layout.

- **`ColorPicker` and `DateTimePicker` enforce `disabled` past the touch layer.** Accessibility
  actions could still adjust a picker that announced itself as unavailable, and a controlled
  date-time picker could commit through a panel left mounted.

- **`RadioGroup` ignores a press on the option already selected**, rather than reporting a change
  that did not happen.

- **`Timeline`'s horizontal columns accept only a finite, positive `width`**, and a consumer
  `style` composes around the measured width and the fade rather than replacing them.

- **`panelui-cli` refuses cleartext for MCP registry and documentation reads.** The MCP server had
  its own `fetch` that bypassed the CLI's transport guard, and the guard now also re-checks the
  effective URL after redirects, so an HTTPS registry cannot redirect component source onto a
  cleartext connection.

### Docs

- Props tables document the value a default is rather than the name it has. A default written as a
  named constant printed the constant — `DEFAULT_MARQUEE_SPEED` in the Default column sends a
  reader to the source to find out what the table was for — and a destructuring renamed to keep a
  normalised value out of the way documented no default at all. Twenty-four pages pick up a real
  number.

- The Components link is back in the mobile menu on the home layout, where there is no page tree
  to reach it through.

- The docs middleware moved to the `proxy` convention Next 16.3 replaced it with.

## [0.74.0] — 2026-08-18

### Added

- **`Splitter`, panes that share a container.** Two or more panes with a seam between them the
  reader can drag, horizontally or stacked. Sizes are percentages of the splitter rather than
  points, so a layout dragged in portrait is still the same layout in landscape and a rotation
  costs no re-measuring. `Splitter.Panel` takes `minSize`, `maxSize`, `defaultSize` and
  `collapsible` — a drag past the minimum shuts a collapsible pane instead of stopping at it, and
  only once the drag is more than halfway there, so a finger that grazes the minimum springs back.
  A drag borrows from the pane on the other side of that seam and from nobody else, so a
  three-pane layout keeps the pane nobody touched where it was. Double-tapping a seam puts its
  pair back where it started.

  The seams are drawn over the panes rather than between them: a handle that took layout space
  would have to be measured before the panes could be sized, which puts the whole layout
  downstream of a number nobody controls. Floating it means the panes add up to exactly the
  container, and the touch target can be as wide as a finger needs without moving anything.
  Dragging runs on the UI thread, so `onLayoutChange` fires when the seam is let go rather than
  on every frame. A seam is `adjustable` to a screen reader, with increment and decrement moving
  it `step` percent at a time.

- **`Avatar.Group`.** A row of avatars, each overlapping the one after it, with the people who did
  not fit counted at the end. `max` caps the faces rather than the row — three with five people
  shows three avatars and a `+2` — and `total` counts against a population the children only
  sample, so three faces out of forty read `+37`. `size` sets the whole stack in one place and
  `overlap` closes it up or opens it out. The stack lays itself out in reverse so the first face
  is the one on top, and each gets a ring in the page background so it separates from the one
  beneath it on any surface. It replaces the hand-rolled version the docs used to recommend,
  which had no count and left the negative margin to the caller.

### Docs

- The Avatar page's stack example is now the component rather than a recipe, with a second example
  for the overflow count.

## [0.73.0] — 2026-08-17

### Added

- **`Timeline` runs sideways.** `orientation="horizontal"` lays the items out as columns on a
  rail wider than the screen, swiped through rather than scrolled down. The component used to
  rule this out on the grounds that each item would get a fifth of a phone's width — which holds
  only if the rail has to fit, and it does not. A column takes the width its contents need and an
  item carrying nothing collapses to a tick, so a quiet stretch of years compresses while a busy
  one keeps its room. `Timeline.Item` takes a `width` to override that, `snap` lands a flick on a
  column rather than between two, and both the snapping and the fade at the edges are dropped
  under reduced motion. Vertical is untouched and stays the default.

- **`Plot.Rule` draws down the plot as well as across it.** Pass `x` for a vertical rule at a row
  — the release the numbers either side are being read against — and `strokeWidth`, `dashed`,
  `opacity`, `labelPlacement` and `labelClassName` for how it looks. `color` now reaches the
  caption too, so a rule and its name cannot end up disagreeing.

- **`Plot` takes `nice`.** An axis derived from the data ends where the data ended, which is how a
  chart comes to be labelled 34,650. `nice` rounds the derived ends out to a step of 1, 2 or 5
  times a power of ten. It only widens, and a pinned end is left where it was put.

- **`Plot.Bars` takes `baseline`.** Columns grow from zero unless you move it, for a chart showing
  movement against a reference rather than size from zero.

### Changed

- **`Planner` rings today's cell.** Today was marked by colouring the day number and nothing else,
  which is a small signal on a grid of forty-two tinted tiles — and which day it is now is the
  question a month view is opened to answer. Today rings the tile and the open day fills it: two
  channels rather than two rings, so a day that is both keeps the ring over the fill. Every cell
  reserves the ring's width whether it draws one or not, so nothing shifts by a point when it is
  picked.

### Fixed

- **Charts drew nothing on Android.** `LineChart` rendered its axes and labels but never its line
  or area. The reveal is a rect inside a clip path whose width was supplied only by an animated
  prop, and animated props on an element inside `Defs` do not reach the native clip on every
  platform — leaving that rect with no width at all, an empty clip, and every mark inside it
  invisible while the axes, which sit outside it, drew normally. The width is now declared as well
  as animated, so the reveal still plays where it lands and the fallback is a chart drawn whole
  rather than a chart drawn nowhere. `Plot`, `AreaChart`, `HeatmapChart` and `HexChart` shared the
  pattern and are fixed with it. ([#148](https://github.com/panel-ui/PanelUI/issues/148))

- **`Plot`'s reference rule was close to invisible.** It drew in the muted foreground, then took a
  hardcoded half opacity on top of that, and captioned itself with muted text at the smallest
  size. A target nobody can read is a target the chart is not stating. It now draws at full
  strength, and `dashed` rather than faintness is what keeps it from being mistaken for a series.

- **`Plot.Area` sat half a slice off from the marks above it** on any plot that also carried
  columns — it ignored the x scale where the line and dots did not. **`Plot.Line` silently dropped
  `curve`** on a band scale, which is every combination chart. Both now go through the same path
  helpers.

- **Components no longer lose their own behaviour to a forwarded prop.** Ending the rendered
  element with `{...props}` meant a consumer-supplied `onPress`, `accessibilityRole` or
  `accessibilityState` replaced the component's rather than composing with it — an `onPress` on
  `Accordion.Trigger` stopped the accordion opening. Fixed across `Accordion`, `Breadcrumb`,
  `Button`, `Carousel`, `Chip`, `Collapsible`, `Fab`, `Flow`, `Frame`, `GridItem`, `Item`,
  `Marker`, `Menu`, `Pagination`, `Panelside`, `Post`, `Table`, `ToggleButton` and `Tree`. Thanks
  to [@danestves](https://github.com/danestves).

- **`Marquee` no longer wedges on a bad number.** A non-finite `speed` or `spacing` reached a
  Reanimated timing, which takes it as a frame that never resolves. Invalid input now falls back
  to the default or pauses. Thanks to [@danestves](https://github.com/danestves).

- **Workspace typechecks run against source.** The apps resolved `panelui-native` from the
  gitignored `lib/` output, so a clean checkout failed `npm run typecheck` until the library had
  been built. Thanks to [@danestves](https://github.com/danestves).

### Docs

- **The page tree moved to the right of the documentation.**

- **`Marquee` gained the two versions it was missing** — a wall of customer logos and a vertical
  feed of post cards — plus a preview recording on the page.

## [0.72.0] — 2026-08-17

### Added

- **`SearchBar`** — a search field with the two controls an ordinary field does not have. A ✕
  inside the field clears the query without dismissing the keyboard, because emptying a query is
  usually the start of the next one; a Cancel button beside it is the control that ends the
  search. `cancel="focus"` slides Cancel in while the field is being edited and folds it away
  again after, so the row is only as wide as the search when nobody is searching.

  The ✕ is drawn by the component rather than left to the platform's `clearButtonMode`, which
  exists on iOS only, cannot be labelled for a screen reader and cannot be swapped for a spinner
  while results are in flight. Its glyph is 24 points and its touch box 48, made up with slop so
  the field keeps its height.

  `debounce` holds `onDebouncedChange` until typing pauses, so a network search runs once per
  pause instead of once per letter. `onChangeText` still fires on every keystroke — a controlled
  field that lags its own input is unusable — and the return key spends the pending pause rather
  than waiting it out.

### Fixed

- **`InputGroup` pads its field on the logical side.** The prefix and suffix are inset with
  `start-0`/`end-0`, so Yoga moves them to the other edge under `Direction dir="rtl"`, but their
  measured width was applied as physical left/right padding and stayed where it was written —
  leaving the value running underneath the decorator in a right-to-left subtree.

## [0.71.0] — 2026-08-16

### Added

- **Seven new package subpaths**, so a single import no longer has to come through the root
  barrel: `panelui-native/provider`, `panelui-native/theme`, and
  `panelui-native/primitives/{animated-pressable,keyboard-avoider,scrim,scroll-progress}`. Every
  subpath is generated from the source tree and verified against a real packed tarball, so the
  published `exports` map cannot drift from what is actually in the package.

- **Roving keyboard navigation on `Planner.Grid`.** On the web one day is in the Tab order, arrow
  keys move by day and by week, and Home/End reach the ends of the rendered week; movement stops
  at the grid boundary rather than wrapping. Native and TV are unchanged — the platform focus
  engine owns directional movement there.

- **`accessibilityLabel` and `accessibilityHint` on `LiveLineChart`**, naming the chart's single
  screen-reader snapshot. The visual header value, axes, tip badge and crosshair are hidden from
  the accessibility tree, because the snapshot already carries their reading.

### Changed

- **`Button` sizes are now floors rather than fixed heights.** `sm`, `md` and `lg` keep their
  36/44/48dp boxes at the default text size, but a label scaled by Dynamic Type or Android font
  scaling now grows the button instead of being clipped by it, and wraps when its container is
  constrained. `size="icon"` stays a fixed square: it has no visible text to scale.

- **`Meter` repairs an invalid scale instead of drawing an undefined one.** Values outside the
  scale clamp to its ends, NaN reads at the floor, infinities at the corresponding end, and
  non-finite bounds fall back to the documented 0 and 100. Segment counts round down and cap at
  100. The spoken reading now comes from one contract shared with the visual, so it always
  describes the same scale the bar is drawing.

- **Overlays restore browser focus when they close.** `Dialog`, `Drawer`, `BottomSheet`,
  `Popover` and `ContextMenu` return focus to whatever had it before they opened, in
  last-opened order when they are nested. Native is unaffected.

- **`Planner` announces a month change only once it has been accepted.** A controlled parent that
  rejects the request stays silent, and mounting or changing the `month` prop directly no longer
  interrupts what somebody is already reading.

- **`Planner` bounds its per-render work on large entry sets.** The entries are indexed by day
  once and month changes inspect only the fixed 42-cell grid, so drawn nodes stay bounded by
  `42 × entryLimit`. Counts and spoken labels still include every entry.

### Fixed

- **`LiveLineChart` keeps one canonical buffer.** Non-finite readings are dropped, out-of-order
  timestamps sorted, and a duplicate timestamp replaced by the later reading; `maxPoints` applies
  after that, so a controlled replacement cannot leave a stale point selected. The frame callback
  now also stops while the app is backgrounded and resynchronises on return.

- **`Planner` keeps a controlled `month` separate from the month a parent has accepted**, so an
  unrelated parent render no longer rebuilds the grid.

### Docs

- The `FunnelChart` page now opens with a recording of the component running.

## [0.70.0] — 2026-08-16

### Added

- **`Collapsible` — one section of content, shown and hidden by its own header.** For optional
  detail, an advanced-settings group, or a row that expands into the rest of what it knows.

  It is split into `Trigger` / `Title` / `Indicator` / `Content`, the same anatomy as one
  `Accordion` section, and differs in what happens to the body when it closes. An accordion
  unmounts it; this keeps it mounted and animates its height, so state inside survives — a
  part-filled form still holds what was typed, a list is still scrolled to where it was.

  That costs a render the first time whether or not the section is ever opened, because a height
  cannot be animated from `auto` and measuring the content means rendering it. For a body heavy
  enough that this matters, a single-item `Accordion` unmounts it instead. The trade is stated on
  the page rather than left to be discovered.

  A closed body is taken out of the accessibility tree as well as hidden, so a screen reader does
  not read out a section that is not on screen. With the operating system set to reduce motion the
  panel snaps between its two states and the chevron turns without travelling.

### Fixed

- **`Accordion` now honours the operating system's reduce-motion setting.** The chevron animated
  its rotation and the section travelled to its new height regardless, which is the one thing that
  setting exists to stop — and it was the only animated disclosure in the library still doing it.

  Both now arrive rather than travel when the setting is on. The disclosure itself is unchanged:
  sections still open and close, and nothing about the API moves.

## [0.69.0] — 2026-08-15

### Added

- **`Marquee` — content that travels across its container on a loop.** For a strip of logos, a
  ticker of prices, a row of names: anything whose job is to keep moving past a boundary rather
  than to be scrolled to.

  The content is measured once and tiled enough times to cover the container twice over. One track
  holds every copy and it is the track that moves, so the cost is a single animated node however
  much content is in it, driven on the UI thread as a linear timing. The loop is exactly one
  copy-and-gap long, which is why the seam never shows: the state it ends on is the state it
  began on.

  `speed` is points per second rather than a cycle time, so longer content takes proportionally
  longer instead of travelling faster, and two marquees set to the same speed stay in step
  whatever is inside them.

  `direction="vertical"` needs a height on the container — a horizontal marquee takes its height
  from the content it measured, but a vertical one has nothing to take a height from.

  With the operating system set to reduce motion the content is rendered once and held still. Not
  a slower loop: a ticker that never stops is the thing that setting exists to turn off. Screen
  readers are given one copy rather than every tile.

### Fixed

- **`Flow.Edge`'s `animated` prop now animates.** It set a dash and nothing else, which made it a
  second spelling of `dashed` — an edge marked as carrying something live looked exactly like one
  marked as merely broken. The dashes now march from source to target.

  The edge animates its dash offset while its geometry keeps arriving by re-render, which is the
  inverse of the split the connection line uses and the reason both draw: a path in React Native
  is reliable when one property animates and the rest are plain. A dragged node reshapes an
  animated edge without interrupting the march. Reduce Motion leaves the dashes drawn but still.

## [0.68.0] — 2026-08-15

### Added

- **`Planner` — a month of days, each carrying what falls on it.** `Calendar` picks a date and
  answers with one; this shows what is already on the days, and its selection exists to open
  something rather than to be submitted. Renewals, shifts, deadlines — anything where the date is
  the question rather than the answer.

  `entries` is the whole set, in any order and across any months; the planner buckets them by day
  itself. `categories` is the key to the marker colours, taken from the `--color-chart-*` tokens in
  declaration order so they follow the theme into dark mode.

  `Planner.Details` binds a dialog to the open day and hands its children that day and what falls
  on it. The binding is the component's; what the dialog says is yours, because the contents of a
  day are your data. Leave it out and `onDayPress` still fires, for a planner that pushes a screen
  instead.

  The grid is always six weeks. A month spans five or six depending on the weekday it starts on,
  and drawn at its natural height the panel changes size as you page through the year — which makes
  the days appear to move under your thumb.

- **`createForm<TValues>()` binds a form's value shape once**, so field names, values, validators
  and render props stay typed through JSX. The unbound `Form` and `Form.Field` still work
  unchanged; the bound pair is `SignUpForm.useForm(...)` and `SignUpForm.Field`.

- **`createBreakpoints()` lets an app define its own breakpoint semantics** rather than taking the
  library's. `useBreakpoint` keeps its defaults.

- **Explicit subpath exports.** `panelui-native/components/<name>`, `panelui-native/hooks/<name>`
  and the `cn`, `color` and `time` utilities can be imported directly, for a bundler that does
  better with a narrower entry point than with the root barrel.

- **`panelui-cli doctor`** audits a project without writing anything — configuration and contained
  paths, aliases, CSS imports, the Metro wrapper, theme, ambient types, dependencies and provider
  wiring. `--json` for CI.

- **`panelui-cli update`** re-fetches tracked components and replaces only files whose digest still
  matches the copy it installed. Anything edited locally is reported as a conflict and never
  overwritten. `--check` and `--dry-run` write nothing and exit non-zero when there is work.

- **`panelui-cli list` takes `--type` and `--search`**, and the registry now carries `kind`,
  documentation `group` and `stability` alongside each item.

- **An API reference section** at `/docs/reference`, generated from the package's actual root
  exports, plus a per-page list of what each component module exports.

- **An upgrading page** listing current package versions and the releases that ask you to edit an
  existing app. The versions are checked against the manifests, so a release that moves one without
  updating the page fails its tests.

### Changed

- **Charts expose their data to screen readers.** Every chart now offers one spoken summary and one
  entry per data row, while its paths, axes and markers stay decorative. `accessibilityLabel`,
  `accessibilityLabelForDatum` and `onAccessibilityDatumPress` shape it; `accessible={false}` turns
  it off where the same data is already in an accessible table nearby.

- **`MessageScroller` has a virtualized path**, so only the visible part of a long transcript is
  mounted. `contentContainerClassName` styles the padded column.

- **`TimePicker`'s ruler mounts a window of ticks** rather than all of them, moving it once every
  forty ticks so a normal scroll never reaches the edge of what is drawn.

- **`BarChart` documents a data budget** — 500 rows and four series for an animated chart, with the
  arithmetic behind it, because frame work grows as `2 × rows × series` and stacking adds more.

### Fixed

- The library's `files` list narrowed to exactly what the build emits, so nothing can ship by
  accident, and every declared entry point is verified against the tarball before publishing.
- `Meter`'s `valueLabel` is spoken whether or not it is drawn, and only drawn when asked for.
- `Skeleton` and `Spinner` honour reduce motion, and no longer announce a wait with no name.

### Docs

- Previews for `LiveLineChart`, and its three versions — Live, Momentum and Read back — written up
  with the code you would write for them. The example app had carried them for a while and the page
  said nothing about any of them.
- Usage records are authored one file per component instead of one file for all of them.
- **panelui.dev is built when a release is published, not on every push.** Documentation that is
  not waiting on a release goes out by running the deploy workflow by hand.

## [0.67.0] — 2026-08-14

### Added

- **`Meter` — a reading on a fixed scale.** Disk used, battery left, a test score, a password's
  strength. `Progress` was answering these for want of anything else, and it is the wrong shape
  for them: a meter is a reading that sits where it sits and may go back down, and nothing about
  it is finishing.

  `thresholds` are points on the scale, each `{ from, color }`, and the highest one the reading
  has reached wins. Write them climbing for a disk filling up, falling for a battery running
  down — which direction is bad is yours to say, and the same prop says both.

  `segments` draws the scale as discrete blocks for readings that are counted rather than
  measured. Four blocks say "three out of four" where a bar says "about seventy percent", and a
  password is not seventy percent strong.

- **`Skeleton` and `Spinner` take a `label`.** Setting it announces the wait as a busy status.
  Put it on the one skeleton standing for a region, or on a spinner that is the only sign
  anything is happening.

### Fixed

- **The loading indicators honour reduce motion.** Both animated regardless of the platform
  setting. `Skeleton` now holds still at a middle opacity — the shape is what says content is
  coming, so it can stop moving without reading as stalled. `Spinner` fades in place instead of
  turning, because a spinner that holds still reads as one that has hung, which is the single
  thing a spinner exists to rule out.

- **The loading indicators stop announcing nothing.** `Skeleton` had no accessibility wiring at
  all, so a screen reader walked over an unlabelled grey box — and a loading screen is many such
  boxes. `Spinner` carried `progressbar` with no name, announcing its role and no information.
  Both are hidden from assistive technology now unless `label` is given, which is right for
  every use inside the library: `Button` already publishes `busy`, and `Combobox` and `Steps`
  caption their own.

## [0.66.1] — 2026-08-13

0.66.0 was tagged but never reached npm; this is that release, plus the fix for what stopped it.

### Fixed

- **The package check reads `npm pack`'s output in both shapes it comes in.** npm 11 and earlier
  answer with an array of manifests, npm 12 with an object keyed by package name. The publish
  workflow upgrades to `npm@latest` for trusted publishing, so the check ran under npm 12, took the
  array apart, and threw — failing the release after the tag existed. CI could not have caught it:
  it ran the same check under Node's bundled npm 10, which is not the npm that publishes. That step
  now runs last and under `npm@latest`, so it exercises the environment the release actually uses.

## [0.66.0] — 2026-08-13

### Added

- **`Signature` can offer a way to sign that is not drawing.** Tracing a path with a finger is not
  something every signer can do, and no label on a canvas changes that. `onRequestAlternative`
  opens a method of your own — a typed name, an upload, an assisted flow — and is published as a
  screen-reader action. Offer it as a visible control too.

- **`ContextMenu` opens without a long press.** The menu was reachable only by holding the target,
  which a screen reader cannot discover and a keyboard cannot perform. The trigger now publishes a
  **Show menu** action, and answers the Context Menu key, Shift+F10, Enter and Space. Opens that
  have no pointer to anchor against use the target's bounds.

- **`Flow` accepts a structured endpoint.** `from` and `to` take `{ node, handle }` as well as the
  `"node.handle"` string. The string form splits on a dot, so a node whose id contains one was
  unresolvable; the structured form has nothing to parse. `FlowEndpoint` and
  `FlowEndpointReference` are exported, and existing strings keep working.

- **`useRevealProgress` is documented.** It was exported and reachable with no page to read.

### Changed

- **Overlays respect Reduce Transparency.** `blur` on `Dialog`, `BottomSheet`, `Drawer` and
  `Popover` draws an opaque, tint-aware backdrop for anyone who has the setting on, rather than
  frosting the screen behind it. The preference is read once per launch and shared, so opening an
  overlay does not cost a round trip to the platform.

- **`SelectionMode` rows excluded from selection keep their own press.** A row marked `disabled` is
  not selectable, which is not the same as being inert — its `onPress` now runs in both states, and
  it is announced as a button rather than an unchecked checkbox it can never fill.

- **The published package declares exactly what it ships.** `files` names `lib/module` and
  `lib/typescript` rather than `lib`, and a check runs in CI and again before publish: every
  declared entry point present, nothing outside the contract, no tests, no build info.

### Fixed

- **A `Carousel` slide moved once instead of twice.** A move started its spring and then the new
  index came back through state and started it again a frame later, from a standstill — so a flick
  lost the momentum it was carrying. Every uncontrolled swipe, dot press and autoplay tick did it.

- **`Carousel` counts the slides it can actually draw.** A conditional slide left as `null` was
  still counted, so the run had a position with nothing in it and the dots showed one too many.

- **A controlled `Carousel` starts where it was told to.** It began at `defaultIndex` and jumped to
  `index` on the first frame. Autoplay also stops at the last slide of a run that does not loop,
  instead of firing into a clamp.

- **`Slider` range haptics follow the thumb under the finger.** Both thumbs shared one record of
  the last step crossed, so the stationary end suppressed ticks for the one being dragged.

- **`MessageScroller` jump buttons measure their own target.** Both buttons read the distance to the
  bottom, so the one pointing at the start appeared and disappeared on the wrong edge.

- **`Signature` no longer announces itself as complete.** The pad cannot know whether a signature is
  finished — one mark may be the whole thing or the first letter of it — and "Signature complete"
  after the first stroke told someone who cannot see the pad that they were done.

### Docs

- **`Sortable` has previews**: the page and six of its versions.
- `Sortable` drops its beta pill; the API has settled.
- The docs site's tablists and radio groups answer the arrow keys, Home and End.

## [0.65.0] — 2026-08-13

An accessibility release. Several controls were reachable but not operable — a screen reader could
find them and had no way to change them — and the fixes to that are the bulk of what is here.

### Added

- **A screen reader can now work `TimePicker`, `Flow` and `Sortable`.** All three carried the roles
  that promise adjustment without the actions that perform it. The time columns take increment and
  decrement and report their position in the range; a `Flow` node takes move, activate and — given
  the new `onDelete` — delete, moving in the same graph coordinates and group bounds as a drag, with
  `accessibilityMoveStep` setting the distance; a `Sortable` row crosses a pinned neighbour by the
  same rule a dragged one does, instead of stopping at it.
- **`Flow.Handle` takes `accessibilityLabel`.** A node lists its connections as actions built from
  the handles registered around it — "Connect output to Database, input" — so a connection can be
  made without tracing a path across the canvas. The label is what those actions say.
- **`Map.GeoJSON` and `Map.Cluster` take `accessibility`.** It reads the same inline data the layer
  draws and produces a screen-reader list beside the map, where activating an entry calls the
  layer's `onPress` with that feature. `Map.Marker` documents `accessibilityLabel`, and the new
  `MapFeatureAccessibility` type is exported.
- **`Switch` takes `accessibilityLabel`, `accessibilityHint` and `accessibilityLabelledBy`.** A
  switch inside a `Field` had no accessible name at all: the label beside it was a sibling with no
  relationship to it. `Field` now publishes the ids of its title, description and error for a
  control to point at.
- **Every solid surface has a foreground token that is legible on it.** `--color-*-solid-foreground`
  for `destructive`, `info`, `success` and `warning`. `Badge`, `Button`, `Fab` and `Swipe` use them,
  and all thirty surface/text pairs across the six themes clear the AA 4.5:1 floor.

### Changed

- **A controlled `Carousel` no longer moves without being told to.** A swipe or an arrow returned
  the run to a new slide immediately and told the owner afterwards, so a controlled carousel that
  rejected the change was already showing it. The run now returns to whatever `index` says and
  travels once that value changes.
- **The compact controls reach a 48dp target.** `Button`, `Checkbox`, `RadioGroup` and `Switch` were
  between 20 and 44 across. The controls are the size they were — the room is around them, so
  nothing in an existing layout moves.

### Fixed

- **A `NumberInput` step written in scientific notation is read correctly.** `1e-7` was measured as
  two decimals rather than seven, so a value snapped to a coarser step than it asked for. Steps
  finer than fifteen decimals keep their value instead of rounding to zero.
- **Charts and `Flow` draw the same on the server and in the client.** Gradient and clip ids came
  from `Math.random`, so the markup the server sent never matched what the client produced.
- **Android stops reading the page behind a modal.** A `Dialog`, `BottomSheet` or `Drawer` now hides
  the app from assistive technology while it is open, and a nested modal closing does not un-hide it
  early.
- **`Sortable` keeps its pinned rows where they were** for every move, not only for drags.
- **A field's validation cannot be overtaken by its own stale result.** A slow validator that
  resolved after the value changed committed an error belonging to the old one, and two submits
  fired in the same tick both ran `onSubmit`.
- **`Icon` imports no longer pull the whole icon set** into a bundle by way of `KPI` and `Menu`.

## [0.64.0] — 2026-08-13

### Added

- **`WaterfallChart` — how a run of changes carried one total to another.** Each step's bar starts
  where the previous one ended, so the gap beneath it is the balance that step acted on and its
  length is what it changed by. A `BarChart` of the same numbers compares the changes against each
  other; this compares each of them against the running total, which is what a revenue bridge, a
  cash-flow month or a budget variance is actually asking.

  Steps marked `total` are anchored to the baseline and drawn in a neutral colour — readings
  rather than changes. Their `value` is added to the running figure before the bar is drawn, so
  one rule covers both uses: an opening balance carries the figure it opens at, and a closing
  total carries `0` and reads the balance the run arrived at.

  Parts: `Header`, `Grid`, `Connectors`, `Bars`, `Values`, `XAxis`, `YAxis`, `Tooltip`, `Legend`,
  `Skeleton`. The connectors are the part worth keeping — without them the bars are a row of
  rectangles at unexplained heights, and the line from one bar's end to the next bar's start is
  the only thing in the drawing that carries the sequence.

  Three colours and no more, set by `riseColor`, `fallColor` and `totalColor`, with a `color` on a
  single datum for pulling one line out for comment. `orientation="horizontal"` lays the run down
  the side, which is what to reach for past about five steps: seven names do not fit across a
  phone. `waterfallSteps` is exported so a header or a table elsewhere on the screen can read the
  same running balances the chart drew.

  The bars cost six animated paths a frame however long the run is — one per colour, each split
  into the bar under the finger and the rest — and each grows from its own start towards its end
  rather than up from the baseline, because a step is a movement between two balances.

### Fixed

- **`BarChart`'s sideways readout follows the row it names.** Upright the bands are side by side
  and the card slid across them, which was the only case the placement was written for. Sideways
  the bands are stacked down the plot, so the same code left the card pinned to the top of the
  chart: it named the row under the finger while covering the first row, which is the one a reader
  checks it against. It now moves along whichever axis the bands run along, clamped inside the
  plot at both ends.

## [0.63.0] — 2026-08-12

### Added

- **`Plot` — a chart you compose out of its marks.** Every other chart here answers one question
  completely and decides everything else for you, which is what makes them good and also what
  makes them a wall: the chart that is not in the box is a chart you go without. `Plot` decides
  nothing. It measures a box, resolves one scale, and hands both to whatever marks are put in it,
  drawn in the order they are written.

  Parts: `Header`, `Legend`, `Grid`, `Area`, `Bars`, `Line`, `Dots`, `Rule`, `Layer`, `Overlay`,
  `XAxis`, `YAxis`, `Cursor`, `Tooltip`. The domain is derived from every mark at once, so two
  marks on one plot share an axis and stay comparable — and both of them have to be in the same
  unit, because there is no second axis and there is not going to be one.

  Where the built-in marks end, `Plot.Layer` begins: its children go into the SVG tree and
  `usePlot()` gives them the plot box, the tweening domain and the reveal. The scale functions —
  `xOf`, `xAt`, `bandOf`, `yOf`, `linePath`, `areaPath`, `barPath`, `segment`, `compactNumber` —
  are exported with it, and every one is a worklet, so a mark you write is rebuilt on the UI
  thread on the frames the built-in ones are rather than laid over them a frame late.

  `yDomain` takes `'auto'` for either end, so a baseline can be pinned at zero while the top still
  follows the data. A plot containing `Plot.Bars` gets zero in its derived domain whether the data
  reaches it or not: a bar's length is measured from zero, and an axis that skips it draws
  near-identical columns for numbers that differ by half.

  Alpha — the parts are settled, the names the geometry comes out under are not. Every chart page
  now links here for the chart it is not.

- **`--color-inset`, and a `variant` on `Card.Footer` and `Dialog.Footer`.** `variant="panel"`
  draws the footer as a band set into the component: a rule across the top, a step darker, and the
  component's own bottom corners. It separates what a card or dialog says from what you can do
  about it, which matters most when the body is a form — buttons on the same surface, directly
  under the last field, read as one more field.

  The new token is a translucent black in every theme rather than a colour of its own, because it
  has to come out darker than whatever it is drawn on and that changes. `--color-muted` cannot do
  the job: it is white in a dark theme, so the band it draws floats forward instead of sinking.

- **`horizontal` and `label` on `SelectionMode.Group`.** `horizontal` lays the items out in one
  sideways-scrolling strip, which costs a single row whatever the count — a grid claims as many
  rows as it needs and pushes whatever follows off the sheet. `label` puts a caption on the leading
  edge, and is what a screen reader announces the group by; a row of unlabelled circles had nothing.

### Changed

- **Chart entrances start when they are asked to.** The reveal ran on a hard symmetric easing that
  had drawn 7% of the chart a third of the way through its run — at 900 to 1100ms, a visible pause
  before anything happened. It now eases out, and the durations come down with it since there is no
  longer a dead third to sit through. Affects every chart; nothing about the shapes or colours
  changes.

- **`SelectionMode.Sheet` opens full-height by default.** A picker spends a header and a footer
  before it draws a single row, so at half the screen the list it was opened for got four or five.
  Pass `size="half"` for a sheet of two or three choices. Its action also lies down in a sheet's
  footer instead of standing up, and the sheet no longer draws its own close button a few points
  from the header's "All" — one of those two threw the selection away.

- **`SectionRail` bars step down either side of the active one.** One long bar in a column of
  identical short ones says which section you are in but not where it sits in the run, which took
  counting. The neighbours now keep part of the active bar's length and brightness and the rest
  drop back, so the silhouette carries the position.

### Fixed

- **`Sortable` no longer flashes the dropped row in its old slot.** The reset that clears the drag
  transforms ran in an effect, and an effect runs after the commit that moved the rows — so one
  painted frame had the row in its new slot still carrying the transform that had carried it there.

- **`SectionRail` ticks once per jump.** Tapping a section in the panel scrolls the screen, and the
  handler driving the active section reported every section passed on the way, each of which was
  felt and briefly highlighted. It now waits for the section that was actually asked for.

- **`CandlestickChart`'s Loading version comes back.** Its timer ran on an empty dependency list,
  so "Load again" put the chart into `loading` and nothing took it out. Five charts — area, bar,
  line, candlestick and radar — also armed their reveal once and never again, so a chart returned
  to `ready` appeared fully drawn on the frame the data landed.

- **Leaving `SelectionMode` is a movement.** The header used to fade while its 56 points had
  already left the flow, so the list jumped and a ghost dissolved over the gap; it now gives up its
  height, and the rows' circles do the same, taking the row's own gap with them.

### Docs

- `CandlestickChart`'s `status` prop claimed to draw placeholder candles while it waits. It never
  has, deliberately — a placeholder candle is four made-up prices — and the prop now says so.

- The theming page's paste-and-edit block carries `--color-inset`.

## [0.62.0] — 2026-08-12

### Added

- **`PolarAreaChart` — several readings on one scale, compared as wedges.** Every wedge takes an
  equal slice of the dial and its radius carries the reading, so the values need not add up to
  anything. That is the line between this and a pie, where the angles are the quantity and have to
  come to a full turn: six unrelated measurements belong here, six parts of one budget belong
  there.

  `scale` decides what the radius means, and the two answers are different charts. The default
  puts the value on the radius, so a reading can be counted off the rings — at the cost of a wedge
  worth twice another covering four times the area. `scale="area"` puts it on the square root
  instead: nothing is overstated, and the rings stop being evenly spaced. The grid is drawn
  through the same conversion either way, so a ring is always where its value falls.

  Parts: `Header`, `Grid`, `Wedges`, `Labels`, `Tooltip`, `Legend`, `Skeleton`. Labels take their
  colour from the wedge under them, and a wedge too short to hold its number is left blank and
  read through the readout instead.

- **`LiveLineChart` — a reading that keeps arriving, against a window that keeps moving.** Every
  other chart here draws a fixed dataset against an index-based x-axis, so none of them could show
  a number that is still coming in. This one places each reading at the time it carries, which
  makes the gaps between readings part of what is drawn.

  The window is tied to the wall clock rather than to the data, so the line drifts left whether or
  not anything is arriving and a stalled feed reads as a flat run reaching back from the tip. Tie
  it to arrivals instead and a stall is indistinguishable from a steady value, which are opposite
  facts. That costs a frame callback while the chart is mounted — the only thing in the library
  that animates without an interaction or a change of data. It stops on unmount, on `paused` and
  on `status="loading"`, and never starts under reduced motion.

  Parts: `Header`, `Grid`, `Area`, `Line`, `Tip`, `XAxis`, `YAxis`, `Tooltip`, `Skeleton`, with a
  pulsing tip, a gradient fill, optional momentum colours and a crosshair that is pinned to the
  moment it was put on rather than to a place on screen.

### Fixed

- **`PolarAreaChart` no longer hands two wedges the same colour.** There are five chart tokens and
  a dial is routinely asked to draw six things; taking the palette modulo its length gave the
  sixth wedge the first one's colour, which on a theme whose first token is green is two green
  wedges. Each further lap through the palette is now drawn a step along a tone run, away from
  whichever end the colour already sits near — alternating lighter and darker is the obvious
  approach and it puts the bug straight back on the dark theme, where `--color-chart-1` is
  `#fafafa`. `PieChart`, `RingChart` and `HexChart` still cycle; the shared helper is there when
  they are changed over.

## [0.61.1] — 2026-08-12

### Fixed

- **`TreemapChart` labels are readable on every theme.** They were drawn in fixed white, which is
  a colour the chart has no say in — the tiles take their hue from `--color-chart-1`, and three of
  the six themes shipped here put that somewhere pale enough to swallow a white label whole. Each
  label now takes its colour from the tile as drawn: the hue composited with what is behind the
  chart at that tile's own strength, then white or near-black. White is kept wherever it still
  holds up, so the mid-tone hues look the way they did and only the pale tiles turn over. A
  label can change colour partway down one chart's ramp, which is correct rather than a glitch —
  a tile faded towards a dark background is a dark tile.

## [0.61.0] — 2026-08-12

### Added

- **`TreemapChart` — a total, cut into the parts it is made of, sized by area.** A dial carries
  five or six slices before the small ones become slivers with nowhere to write a name. A share
  drawn as a rectangle can be read at a tenth the size and has a flat side to put the name on,
  so past about six parts this is the chart that still works. Spend by service, traffic by
  country, disk by folder.

  The layout is squarified: rows laid across whichever side of the remaining space is shorter,
  each taking another tile only while that makes its worst rectangle less elongated. Tiles are
  sorted largest first by the chart, because the row test assumes a descending run — given a
  large tile beside a small one it has no good row to make. `maxTiles` keeps the largest few and
  gathers the rest into one tile rather than dropping them, which would rescale what is left and
  leave every remaining tile claiming a larger share than it has.

  Parts: `Header`, `Tiles`, `Labels`, `Tooltip`, `Legend`, `Skeleton`. Tiles too small for a
  name are left blank and read through the readout — a name clipped to two letters is a
  different word, not a shorter one.

- **`AreaChart.Skeleton` and `BarChart.Skeleton`.** Both charts took a `status` prop and neither
  drew anything for it, so `status="loading"` rendered an empty plot — the same picture a chart
  whose values are all zero draws. They now have the placeholder LineChart has had all along,
  with the same travelling highlight: a low band on the baseline for the area, short equal stubs
  for the bars. The stubs count the rows when there are rows, and take `bars` when there are not.

### Fixed

- **Compact numbers past a million.** `compactNumber` is the default label formatter for every
  chart here and it stopped at `M`: a billion came out as `1000.0M` and a trillion as
  `1000000.0M`, which is the number the suffix exists to avoid. It also could not carry, so
  999,999 rounded to `1000.0k` instead of `1M`. Both fixed, and `B` and `T` added.

- **Axis ticks lose their trailing `.0`** — `12k` rather than `12.0k`. A decimal place that is
  always zero is precision the tick does not have, and an axis label is the one place in a chart
  with no room to spare.

### Docs

- BarChart's `status` prop no longer promises "a row of flat placeholder bars" that never
  existed. It says what it does, and points at the new `Skeleton`.

## [0.60.0] — 2026-08-11

### Added

- **`SelectionMode` — pick several things at once, on a screen or in a sheet.** Messages to
  archive, people to share with, colours to apply, files to move. On a screen it is a mode: the
  list is there to be read, and a long press turns it into one you can pick from. In a sheet it
  is a picker — `SelectionMode.Sheet` was opened in order to choose, so it is choosing from the
  moment it appears, with the actions in the sheet's footer.

  `SelectionMode.Item` wraps whatever you give it rather than replacing it, so one component
  holds a row of people, a grid of colours and a run of slides. `SelectionMode.Group` is the
  rounded card that holds them, with `columns` for a grid, and `indicator="ring"` draws the
  selection around a swatch instead of beside it. Ships **alpha**: the shape is right, but it
  has not been through enough lists to promise the props will not move.

- **`animation="disable-all"` on `Tabs`**, which stops the indicator, the panel strip and the
  expanding reveal together. For a screen already animating something more important, or a
  device that cannot afford them. The system's reduce-motion setting is honoured without it.

### Changed

- **A swipeable `Tabs` is a real pager.** The panels are laid out side by side in a strip as
  wide as all of them, behind a window one panel wide, and moving between tabs is that strip
  translating. The panels either side of the active one are therefore built and sized *before*
  you reach them.

  This is the fix for a long-running report of tab changes stalling with a virtualised list in
  each panel ([#28]). The cause was never the swipe: each panel was an independent sibling and
  only the active one was in the layout, so the arriving panel was mounted *and measured* during
  the transition and did its first render on the frame it became visible. A press paid the same
  cost — the swipe only put a movement next to it.

  Mounting is also sticky now: a panel that has been reached stays mounted for the life of the
  tab set, so a tab is slow at most once, with no flag set.

### Fixed

- **`Fab.Group` no longer draws over every screen you navigate to** ([#29]). It rendered through
  a portal, which mounts at the app root above the router and is only removed when the declaring
  component unmounts — and a stack keeps the screen you pushed from mounted. It was the only
  overlay here that portalled unconditionally, so it leaked even while closed. The scrim and the
  dial are now two absolutely positioned siblings in the group's own parent, so a group belongs
  to its screen and leaves with it. Write one in the screen's root container.

- **Anything in a `Fab.Group` action slot closes the dial when pressed**, not only `Fab.Action`.
  A plain `Fab` written as a child is a reasonable thing to reach for, and it used to run its
  action — navigating, usually — with the dial still standing open behind it. An open dial also
  takes the Android back button now.

- **`keepMounted` on `Tabs` does what it says.** `true` used to hide with `display: none`, which
  lays a panel out at zero size, so a virtualised list inside one rendered no rows and was
  mounted-but-unbuilt. `'measured'` kept the size but stretched the panel against the tab set's
  root, which only has a height if the tab set was given one — undocumented, so it measured zero
  too. Neither could do the thing they were reached for.

### Docs

- **Every component page is written as a guide rather than as an argument.** A user reported that
  the prose read like an assistant thinking out loud, and sent a rewrite of the Fab page to show
  the difference. All 101 intros now follow that shape — what it is for, the trade-off, the
  workaround, the alternatives — as separate statements rather than one argued paragraph. Around
  twenty pages also gained the cross-link they were missing, because "when should I use the other
  one" is the question an intro is for.

- **An alpha or beta component says so on its own page**, not only as a pill in the sidebar.
  Somebody arriving from a search result never sees the sidebar entry, and "this API is still
  moving" is not a thing to learn after building against it.

- **panelui.dev answers the questions an agent arrives asking.** A request for `Accept:
  text/markdown` at the site root returns markdown rather than plain text — the one thing that
  was keeping the site off Level 3 on agent-readiness checks — and the site now serves an MCP
  server card, an A2A agent card, an agent-skills index with per-artifact digests, and `auth.md`
  saying plainly that everything here is public and takes no token.

<a id="migration-0-60-0"></a>

### Migration

- **A swipeable `Tabs` needs a height to lay its strip out in** — `className="flex-1"` on the tab
  set, or a fixed height — the same as any pager. Without one the strip falls back to the height
  of its tallest panel, which is right for ordinary content and not enough for a virtualised
  list. It warns in development rather than rendering nothing.

- **`keepMounted="measured"` still works and now means the same as `true`.** Every panel in a
  strip is measured already, so the distinction it drew no longer exists.

- **Write a `Fab.Group` in the screen's root container.** That parent is what `offset` is
  measured from and what the scrim covers.

[#28]: https://github.com/panel-ui/PanelUI/issues/28
[#29]: https://github.com/panel-ui/PanelUI/issues/29

## [0.59.0] — 2026-08-11

### Changed

- **`FunnelChart` is drawn as one ribbon across the card, and reads in three places.** The stack
  of full-width blocks with a row of text laid over each had two faults, and they had the same
  root. A stage's fill and the label on it resolve to the same token family, so wherever the shape
  reached under a row the text vanished into it — and the first stage of a funnel is a hundred
  percent of itself, so it always reached. And the name, the count and the conversion shared one
  line, which makes that line as wide as all three: on a phone the name was the one that gave way,
  and a reader was left with "Checkout st…" against a number.

  So the stages now divide the width between them and the shape is a single ribbon symmetrical
  about the centre line — each band as tall as its value where it starts and the next stage's
  where it ends, sides curved so consecutive bands meet flush and the run reads as one narrowing
  channel rather than a row of separate shapes. Each band is drawn concentrically, from a wide
  faint ring to a tight near-solid core, which gives the edge a falloff and leaves a low-opacity
  band for text to sit on. Stages grow out of the centre line one after another, in the order they
  happen. The readings split three ways: the count above the band, the name below it, and the
  conversion in a filled pill on the band itself — the one reading that sits over the shape, so it
  is punched out of its own background and stays legible whatever the fill is doing underneath.

- **`FunnelChart.Legend` is a row per stage.** Names down one column, numbers down another. The
  stages are a sequence and a wrapped centred line loses that — the order is only implied by the
  order the names happen to be read in, and a long one breaks across lines that no longer align.
  `layout="inline"` keeps the old arrangement where the names are short enough for it.

### Removed

- **`FunnelChart`'s `align` and `cornerRadius`.** A ribbon has no leading edge to hang off and no
  corners to turn; `edges` chooses between curved sides and straight diagonals instead.
- **`FunnelChart`'s `orientation`.** It shipped with a vertical run for one release and the layout
  was carrying the design: down the screen a stage is a row, so its count and its name compete with
  the shape for the same width, and both the shape and the names come off worse. Across the card a
  stage is a column and each reading has that column to itself.

<a id="migration-0-59-0"></a>

### Migration

- `stageHeight` is now `stageSize`, and is optional — left unset the stages divide the card's
  width between them, which is what a run across a card almost always wants.
- `crossSize` is now `height`: how deep the ribbon tapers, the one measurement a set of counts
  cannot supply.
- Keep stage names short. A stage gets a column of the card's width, so five across a phone is
  about seventy points each.
- New: `layers` for the depth of the halo, `edges` for curved or straight sides, `staggerDelay`
  for the wait between one stage arriving and the next.

## [0.58.0] — 2026-08-11

### Added

- **`FunnelChart`** — where a population drained away, one step at a time. Each stage is a
  trapezoid running from its own width down to the next stage's, so the taper is continuous and
  the slope between two stages *is* the drop between them. `FunnelChart.Labels` lays a row across
  each stage rather than fitting text inside it, because the stages with the worst drop-off are
  the narrowest and neither text nor a fingertip fits in them; `minWidth` puts a floor under those
  stages so a rare outcome reads as rare rather than as absent. One hue fading down the run rather
  than a colour per stage — the stages are one quantity at successive moments, not five series.
  A `FunnelChart.Legend` replaces the labels on a compact card, and `status="loading"` draws a
  single undivided taper, since an invented drop-off is worse than none.

### Changed

- **Reduce motion is honoured by `Progress`.** The determinate fill lands on its value instead of
  springing to it, and the indeterminate bar fills the track and pulses in place instead of
  crossing it. Freezing it outright was the other option and it is the wrong one: a bar that stops
  moving reads as a bar that has hung, which is the single thing an indeterminate bar exists to
  rule out. The track also carries `busy` while indeterminate — with no value to announce, that is
  all that separated "working, length unknown" from "empty".

### Fixed

- **A `Progress` bar that turned determinate mid-fade kept the fade.** The two animated styles now
  each set every property either of them sets, so neither can strand the bar at the other's
  opacity.

## [0.57.0] — 2026-08-11

### Added

- **`QRCode`** — a string, drawn as something a camera can read. Composition is the API, as
  everywhere else here: a bare `QRCode.Canvas` is a QR code, a `QRCode.Frame` around it is the
  widget shell the charts are shown in, and a `QRCode.Trigger` with a `QRCode.Content` folds it
  away behind a button until it is wanted — a popover, or a sheet on a phone, the same way
  `ColorPicker` folds away.

  The encoder is vendored rather than installed. A component that needs an npm package to draw
  itself is one the CLI has to install on someone's behalf, and every project that copies the
  source in inherits it; QR encoding is a few hundred lines of arithmetic that has not changed
  since 2000, so it is cheaper to own. Byte mode, versions 1–40, all four correction levels, and
  UTF-8 — so a `value` can be a URL, a WiFi string, a vCard or Japanese.

  It was checked rather than eyeballed, which matters more here than usual: a QR code that is
  nearly right does not scan, and nothing about looking at one tells you which kind it is. The
  codewords and the Reed–Solomon check bytes were compared byte for byte against a reference
  implementation, and every code produced was decoded back to its input by a real decoder across
  versions 1 to 25 and all four levels. Two bugs came out of that — the finder pattern drew its
  own separator dark, and the alignment positions came out descending, which put a pattern over
  the top-left finder and left the bottom-right one off entirely.

  The whole matrix draws as a single `<Path>`. A version 10 code is three and a half thousand
  modules, and half of them dark as a `<Rect>` each is seventeen hundred native views for a
  picture that never changes.

  Two decisions worth knowing about. **The code is drawn dark-on-light whatever the theme is
  doing** — the one place in the library that ignores the tokens, because a QR code is not a
  surface but a thing a camera has to read, and inverted it is rejected outright by a good share
  of scanners. And **`QRCode.Logo` clears the modules it covers** rather than drawing over them,
  then raises the error-correction level if the one you asked for could not afford the loss; a
  logo on an `L` code is a logo on a code that has stopped working.

- **An MCP server**, as `npx panelui-cli@latest mcp`. Six tools over the same registry `add`
  installs from, so the source an agent quotes is the source you would get: project info first,
  then search, list, view, docs and the add command. `mcp init` writes it into `.mcp.json`,
  `.cursor/mcp.json` or `.vscode/mcp.json`, merging rather than replacing. No dependencies — the
  stdio transport is JSON-RPC over newline-delimited lines, which is about forty of them.

- **A skill for coding agents**, installable with `npx skills add panel-ui/PanelUI`. What an agent
  needs to not get this wrong: which of the two ways in a project uses, and therefore what an
  import should look like; the rules that are not negotiable, each with a wrong/right pair; the
  six themes and the radius scale a family brings with it. Its component list is generated from
  the same file the documentation is, because a skill naming a component that does not exist is
  worse than one naming none.

### Changed

- **The install story is one story.** The home page said `npx expo install panelui-native`, the
  installation page said that plus nine more packages on one line, and neither answered "I do not
  have an app yet". There are now two paths: **`npx create-panelui-app@latest`** for a new
  project — a new package, a thin front on the scaffolder `panelui-cli` already had, so
  `npm create`, `pnpm create`, `yarn create` and `bun create` all resolve it — and, for an
  existing one, the package followed by its peer dependencies as a separate step that explains
  what each of the nine is for and why `expo install` rather than a pinned range.

  Every command on the site now has npm, pnpm, yarn and bun forms, and the choice is remembered
  across every block and every page.

- **`panelui-cli` 0.3.0** — the `mcp` command, and an `exports` map so `create-panelui-app` can
  call the scaffolder directly rather than re-launching the CLI through `npx`.

- **The home page shows the components instead of listing them.** The section that was ninety-eight
  names in a grid is now previews of what they look like, over a picker for the three theme
  families. Those links moved somewhere better: **`/docs/components`**, a generated index grouping
  every component by the job it does.

- The web token set matches the native one. The elevation ladder (`--surface` and its two steps)
  and the tinted status fills (`-soft`, `-subtle`) exist on both sides now, so a preview can use
  the token its component uses instead of an approximation in greys.

### Fixed

- The sitemap said every one of its 130 URLs had changed on the day of the build, every build.
  A crawler uses that to decide what to look at again, and a signal that says "all of it, always"
  is one it learns to ignore — which is part of why 49 component pages were sitting in Search
  Console's "discovered, currently not indexed". It now comes from git, and gives 62 distinct
  dates instead of one.

### Docs

- **`/docs/skills`** documents the skill and the MCP server.
- Agent discovery: `Link` headers on every HTML route, `/.well-known/api-catalog`,
  `/openapi.json` describing the registry and the search endpoint, `/.well-known/mcp/server.json`,
  `Content-Signal` in robots.txt, and `Accept: text/markdown` returning any page as markdown at
  its own URL. All of it describes things that already existed and were only undiscoverable. The
  OAuth discovery documents the same report asked for are deliberately absent — PanelUI has no
  accounts, no tokens and no protected endpoints, and those files would describe an
  authentication system that does not exist.

## [0.56.0] — 2026-08-10

### Added

- **`HexChart`** — a whole broken into parts, counted out in cells. Every series holds a number of
  hexagons proportional to its share of the total, so a series worth a tenth *looks* like a tenth
  and can be confirmed as one by counting.

  That is the reason to reach for it over the `PieChart` beside it. A pie asks the reader to
  compare angles, which is the hardest quantity there is to judge by eye; this asks them to
  compare counts, which anyone can check by looking. What it gives up is the small end — every
  cell is a whole unit, so a series worth half a cell either rounds up or disappears. It is for
  shares of a few percent and up, not for a long tail.

  `shape` picks the arrangement. `grid` is reading order and fills every cell, which is the
  countable one: someone checking that the second series really is a quarter can count a row and
  multiply. `blob` grows the series out from the middle of the field instead — smallest in the
  centre, each larger one wrapped around it — which shows the shape of the split at a glance.
  Its ragged edge comes from a hash of each cell's own coordinates rather than a random number,
  so a re-render is not an animation and the same data draws the same honeycomb every time.

  Cell counts are apportioned by largest remainder, so the parts add up to the budget exactly.
  Rounding each share on its own does not: three equal parts of a hundred round to 33 each and
  leave one over, and a spare cell in a honeycomb is a cell of some colour that nothing in the
  data accounts for.

  `columns` is the one knob for how fine the grid is, `density` how much of the field a blob
  fills, and the parts are the ones every chart here has — `Header`, `Cells`, `Tooltip`, `Legend`
  and `Skeleton`. Colours come from the `--color-chart-*` tokens like every other chart.

### Changed

- **Releases are now published from CI.** A published GitHub release builds and publishes the
  package through npm's trusted publishing, so every version from this one on carries a
  provenance attestation naming the workflow and the commit it was built from. Nothing changes
  about how the package is consumed; it is verifiable now in a way it was not.

### Fixed

- **`Tour`'s card no longer warns about a fought-over opacity.** The card carried an entering
  animation and an inline opacity on the same view — the fade on the way in, and the gate holding
  the card invisible for the frame it is measured in — and Reanimated warned that a layout
  animation may overwrite a property the style also sets. Which of them won was never something
  to rely on. The animation and the placement now sit on an outer view and the measurement and
  the gate on an inner one.

### Docs

- **A new [Charts](https://panelui.dev/docs/customization/charts) page under Customization.** The
  five-colour series ramp was named in passing on the Colors page and shown in a theme block on
  the Theming page, and pulled together nowhere — so "put every chart in my app on brand" had no
  answer to link to. It covers the ramp and its ordering, which part of each chart takes a
  `colorIndex`, the two charts that are deliberately not a series ramp, the override block in the
  shape Uniwind actually requires, and the weight and fill props that separate series without
  spending another colour on them.

- **`Tour` gains a worked version for a screen taller than the screen** — the one case the
  component cannot handle by itself. Each step records where it sits during layout and
  `onStepChange` scrolls it back into view before the spotlight goes looking. The existing
  scroller example was writing pixel offsets down by hand, which is right until somebody adds a
  paragraph above one; it now measures them the same way.

- **The showcase app has an "All charts" screen**, reached from a row above the component list:
  one example of every chart on one screen, each rendered exactly as its own page renders it.
  Choosing a chart is a decision about shape, and a list of names is the one thing that cannot
  help with that.

## [0.55.0] — 2026-08-10

*Never published. Its changes first shipped in 0.56.0 above — `npm install panelui-native@0.55.0`
will not resolve.*

### Added

- **`Tour`** *(alpha)* — a walkthrough that introduces a screen one control at a time. Nothing in
  the library covered first-run guidance: an empty state explains a screen before there is
  anything on it, and a tour explains it once there is. It dims everything, cuts a hole around
  one control and puts a card beside it, then moves the hole to the next control.

  The hole is the reason to reach for it rather than for a sequence of tooltips. A caption on its
  own has to describe where to look, and "the button at the top right" is a sentence people read
  twice and still get wrong.

  A `Tour.Step` wraps the control it is about, so the two live together in the tree and a step
  whose target is deleted goes with it instead of pointing at empty space. `order` sequences the
  steps and is the author's numbering rather than the tree's, because a walkthrough usually
  crosses a header, a list and a tab bar in an order the layout knows nothing about.

  Targets are measured each time their step comes up and again when the window changes size, so
  rotating the device mid-tour re-places the spotlight rather than stranding it. A target that
  has scrolled out of view is the one case the component cannot fix by itself, so `onStepChange`
  fires with the step about to be shown and the measurement waits a frame for whatever it
  scrolls.

  `shape="circle"` squares the hole around a round control, `interactive` leaves the spotlit
  control pressable for the walkthrough that asks you to try the step, and `labels` replaces the
  card's words. It is marked alpha because the card's own composition is the part still likely to
  move.

### Changed

- **A stepper's connectors now come with its steps.** Every `Steps` in this repo carried the same
  line — `{index < items.length - 1 ? <Steps.Separator /> : null}` — because the connector was
  the author's to place and the last one was the author's to leave off. `Breadcrumb` settled that
  argument for its own separators long ago; `Steps` now follows it. The root counts the items it
  holds and each one draws the connector to the next.

  Existing code renders exactly as it did: an item holding its own `Steps.Separator` keeps it and
  gets no second one. The new `separators={false}` turns the automatic ones off for a stepper
  that wants none.

- **A step now says where it sits.** Counting the items is also what lets a screen reader reaching
  the middle of a wizard hear "Payment, step 2 of 3, completed" — the position and the state,
  which are what the circle and its fill convey to everyone else. It is announced as an
  accessibility value rather than a label, because a label there would replace the step's own
  title with its number.

## [0.54.0] — 2026-08-09

### Added

- **`TagInput`** — a field whose value is a list of tokens rather than a string. The tags are
  whatever gets typed, which is the whole distinction from `Combobox` in `multiple` mode: a
  Combobox picks from a set of options you supply, so it needs a list, a filter and a surface to
  float that list on. A tag field has none of those, so it carries none of that machinery and
  never opens a portal.

  A tag is committed by return, by any of `delimiters` (a comma by default — which is what makes
  a pasted `design, research, ops` land as three tags rather than one), or by `blurBehavior` when
  the field loses focus mid-word. Three rules can turn a tag away — `max`, a duplicate, or a
  `validate` that returned `false` — and each calls `onReject` with the reason. That callback
  exists because a tag that is silently dropped is indistinguishable from one that was never
  finished typing.

  `renderTag` hands the token back to the caller, `chipVariant` picks the resting colour,
  `showCount` puts the count against `max` under the field, and `readOnly` keeps the tags while
  taking the input and every ✕ away.

### Changed

- **A backspace on a field full of chips now marks the last one before it takes it.** In
  `Combobox` under `mode="multiple"`, and in the new `TagInput`, backspace on an empty field
  turns the last chip `destructive` and only a second backspace removes it. A held backspace
  repeats, and a field that deleted on the first one would empty itself in the time it takes to
  notice — the mark is the beat that lets you stop. Typing anything, or leaving the field, takes
  the mark off again.

  The chip is also now removed by position rather than by value, so a repeated label — which
  `allowCustomValue` makes possible — loses the one that was marked instead of both.

### Docs

- The component lists in both READMEs and the docs index had drifted a release behind. They now
  carry `CandlestickChart` and `TagInput`, and the counts are right again.

## [0.53.0] — 2026-08-09

### Added

- **`CandlestickChart`** — open, high, low and close for a period, drawn as one mark. The body
  spans open to close and is filled by direction, and the wick behind it spans the low to the
  high. Composed the way every chart here is, so the grid, the candles, the axes and the readout
  are separate children, and it takes the same drag, the same reveal and the same header.

  Three things had to differ from the charts it sits beside. **Its axis does not reach zero** — a
  bar compares lengths, so a bar cropped at the bottom is a length that lies, but a candle
  compares nothing to zero. What is being read is the distance between four numbers that sit
  close together and far from the origin, and forcing zero onto that axis turns every candle into
  a dash. **Colour is direction rather than identity**: there is one thing plotted, so the two
  colours are its two states, taken from the theme's success and destructive tokens instead of
  the chart palette. And it **draws in four paths, not four per candle**, so two hundred periods
  cost the same four animated props a frame as twenty.

- **`ContextMenu.Preview`** — the held content, lifted off the dimmed page while its actions are
  up. It is for a list, where otherwise the thing being acted on is one card among several behind
  a scrim with the panel floating over all of them. It draws the trigger's own children, so
  nothing is described twice, and it takes no touches — the actions are in the panel, and a
  second live copy of a pressable card would be a second place to press.

- **`Sortable`** — a `pinned` prop, the feature `disabled` had been standing in for and was never
  able to be. A pinned row cannot be picked up and nothing can take its place: the rows that do
  move reorder among the slots left over, so a step that has to come first still does. It is not
  a wall — a row can be carried across a pinned one, going around it rather than pushing it down.
  `disabled` keeps its own meaning, which is only that a row cannot be lifted.

### Changed

- **`ContextMenu`** — rows read verb first, glyph last, and are taller. `Menu` puts the glyph in
  front, where a column of them is what the eye runs down to find a row; a context menu is not
  read that way, since it arrives under the hand that opened it and what is being scanned is the
  words. A glyph is now painted to match its label, including the red of a destructive row, so an
  icon set that defaults to `currentColor` — which React Native will not draw at all — no longer
  has to be coloured by hand at every call site.

- **`Sortable`** — rows get out of the way at once. The swap used to be triggered by the carried
  row's middle reaching a neighbour's middle, and a row's middle starts a whole row away from its
  neighbour's, so the finger had to travel a full row before anything happened: the list sat still
  through the first row of every drag and then moved all at once. It is now the carried row's
  leading edge against the neighbour's middle, which halves that and is the more natural reading
  anyway. The spring the neighbours ride was also underdamped and is now critically damped.

- **`TimePicker`** — a picker given `minTime` or `maxTime` no longer offers times it will refuse.
  The ruler and the clock's list now hold only the times inside the span, so the end of the scale
  is the last time that can be picked and dragging to it picks it. Previously it drew the whole
  day, clamped whatever you chose, and sprang back without saying why.

### Fixed

- **`Popover`** — the width floor now reaches a panel sized to its own contents, which is the one
  case it was for. A panel given a width already knows how wide it is; `minWidth` was being
  dropped on exactly the panels that needed it, so a panel took its width from the only
  non-flexible thing in a row. A menu of a flexible label beside a fixed glyph came up as a narrow
  strip of icons with the words squeezed out of it entirely.

- **`Popover`** — a panel in a sheet no longer starts under the close button. The eight points the
  sheet presentation reserved were never enough: the sheet's own padding and grabber put the first
  child 24 points down and the button's lower edge is at 44, so the top of every panel was drawn
  under it.

- **`Combobox`** — options written as literal JSX are keyed when a query narrows them. The filter
  builds a plain array, which is not the path that hands out keys, so a short fixed list — the
  ordinary way to write one — arrived unkeyed and React said so.

- **`Combobox`** — the panel no longer moves under a scrolling finger. Dragging the list dismisses
  the keyboard, the keyboard's height changing re-measures the field, and a new anchor recomputed
  both the panel's top edge and its maximum height, so the thing being scrolled resized and moved
  under the finger doing it.

- **`TimePicker`** — a refused drag puts the column back. A reported row can be bounded away or
  rounded to a different one, and when it was the value did not change, so nothing told the column
  anything had happened — it was left showing one time and holding another, and no later drag
  could put it right.

- **`TimePicker`** — a flick reports once, when it stops. It used to report twice: at the offset
  the finger left, which is a row it is in the middle of flying past, and again where it actually
  stopped. The first was committed, so the picker briefly held a time nobody chose. A correction
  arriving mid-glide could also jam the list — a programmatic scroll against a running
  deceleration fights it, and the wheel stopped dead between two rows and took no further touches.

- **`Sortable`** — dragging a long list no longer costs the square of its length. Each row worked
  out its own offset by summing the heights above it, twice, in a worklet that re-runs on every
  frame of a drag. The root derives every row's offset in one pass, and only when the arrangement
  changes.

- **`TimePicker`** — the row either side of the centre stays readable. It used to drop to just
  over half opacity and shrink by an eighth, which on a settling column reads as the digits
  smearing — and those are exactly the rows being compared against while choosing.

### Docs

- **`ColorPicker`** — the accent card version drops the block that painted the two chosen colours
  over each other; both rows already print the colour they change. The wheel version now opens
  over its row like the square does, so the two versions differ in the thing that actually differs
  between them.

- **`ContextMenu`** — the bottom-sheet example holds a list row rather than a card, which is the
  case a sheet is actually for, and carries a `Label` naming what it is acting on, since a sheet
  is nowhere near the row it came from. A new example shows the placements side by side.

## [0.52.0] — 2026-08-08

### Added

- **`ContextMenu`** — the actions that belong to a piece of content, reached by holding it. A
  `Menu` hangs off a control that exists to be opened; a context menu has no such control, so the
  target is the content itself — a message, a card, a list row.

  Its rows *are* `Menu`'s rows, the same components rather than a second set styled to match, so
  the destructive colour, the press-in scale and the dismiss-on-select rule cannot drift between
  the two ways of reaching a list of verbs. The panel is `Menu`'s, so edge-flipping, safe-area
  clamping, submenus and `presentation="bottom-sheet"` all work from the first line.

  What it adds is the two things a menu opened on content needs. The panel is anchored to the
  press point rather than to the target, because a context menu's target is often most of the
  screen and the middle of a whole message is not where the finger was — `anchor="target"` opts
  into the other behaviour for something small and list-shaped. And the hold and the tap are given
  to the gesture recogniser as alternatives, so a target that already does something when tapped
  keeps doing it and a hold never also counts as a press. Pass that tap as `onPress` on the
  trigger, not on the content inside it.

  `delay` and `slop` set how long the hold is and how far a finger may drift during it; `haptics`
  ticks as the hold is accepted, which is worth setting, because a hold has no edge you can feel
  and until the panel appears nothing says it has been long enough.

- **`Popover`** — a `scrim` prop, for a dim behind the panel without a blur. A popover leaves the
  page behind it live and so does not dim by default; a menu opened on the content itself is modal
  in practice, and the dim is what says so.

- **`Popover`** — `usePopoverAnchor`, for building a trigger that opens the panel on something
  other than a press, or anchors it somewhere other than its own bounds. It is how `ContextMenu`
  borrows the placing, flipping and clamping instead of owning a second copy of them.

### Fixed

- **`Tabs`** — `keepMounted` now has a setting that helps a panel whose content sizes itself.
  Hiding a kept panel with `display: none` also takes it out of layout, so it is mounted at zero
  size: a virtualised list inside one asks its parent how tall it is, is told nothing, and renders
  no rows. Its first real render still landed on the frame the tab became visible — the stall the
  flag looks like it should have removed, and the reason switching cost the same with it on or off.

  `keepMounted="measured"` keeps a hidden panel laid out at the full size of the tab set, hiding it
  by not drawing it rather than by removing it from layout. A list inside it measures, renders and
  settles while still hidden, so becoming visible costs nothing.

  It is a third setting rather than a redefinition, and it is off by default, because the trade is
  real: every kept panel lays out and draws, so a five-tab set builds five panels of rows to show
  one. Reach for it when a panel is slow to appear *and* its content measures itself.

### Docs

- **`Tabs`** — the `swipeable` notes sent a reader with an expensive panel to `keepMounted`, which
  was the one thing that could not fix it. They now say which setting actually keeps a panel's
  content built.

## [0.51.1] — 2026-08-07

0.50.0 was tagged but never reached npm, so upgrading from 0.49.0 brings **Sortable** with it —
see the entry below this one for what it is.

### Fixed

- **`Sortable`** — a row being carried is no longer see-through. It is drawn over the rows it is
  passing, and the row itself is only a box around whatever you put inside it; anything without a
  background of its own — an outlined `Item`, a bare `View` — left the rest of the list readable
  straight through the middle of it. A lifted row now takes an opaque surface and a shadow, and
  `activeClassName` replaces them.

- **`Sortable`** — the drop is one movement rather than two. The lift used to be released only
  once the landing spring had finished, so the row arrived at full size and then shrank; it now
  comes loose and settles back on a single value driven from the gesture, which starts returning
  the moment the finger leaves.

- **`Sortable`** — a dropped row no longer slides twice. Applying the reorder moves the rows in
  the tree and drops every offset to zero on the same commit, and the spring on those offsets sent
  the row that had just landed back across the distance it had travelled, in a slot it was already
  sitting in. Offsets are only animated while a drag is in flight.

- **`Sortable`** — an interrupted landing spring used to leave the row lifted for good and never
  report the drop, so `onReorder` was silently lost. It now lands whether or not the spring
  finished, and only stands aside when the row has genuinely been picked up again.

- **`Sortable`** — the handle's activation slop was four points, the tightest pan in the library.
  A list inside a scroller could not be scrolled by a finger that happened to land on a grip. It
  is now in line with everything else.

### Changed

- **`Sortable`** — the springs are split in two: quick for the rows getting out of the way, near
  critically damped for the landing, where overshoot reads as having landed in the wrong slot. The
  lift is also a little more pronounced, because a three per cent step with no shadow under it was
  not visible enough to say the row had come loose.

### Docs

- Screens and recordings for **ButtonGroup, Fab, GridItem, Kpi, MarkdownEditor, Pagination,
  Questionnaire, Tree, PieChart, RadarChart and ScatterChart**. Nine of the eleven had no preview
  at all, and none of them had one on a single example or version.

- Ten new examples, written because a recording showed something no page had an entry for and a
  caption under the wrong picture is worse than a gap: ButtonGroup's busy and disabled segments
  and its three sizes, Fab's sizes and variants, GridItem's bento and its wall of watermarks,
  Pagination at the small size, with a wider run and with a status line, and Tree selecting more
  than one.

## [0.50.0] — 2026-08-07

### Added

- **`Sortable`** — a list whose rows can be dragged into a different order. Marked **beta**: the
  parts and their props are settled, but it has not had enough use to promise they will not move.

  Nothing in the library let a person say *this one goes above that one*. `Swipe` acts on a row,
  `Tree` opens one, `Table` sorts every row at once by a column — none of them arrange a playlist,
  a set of form fields or a run of dashboard tiles, which is an order somebody chose rather than
  one derived from the data.

  The rows are never moved in the tree. Each one stays where it was laid out and is pushed around
  with a transform: the difference between where its slot sits in the order being dragged and where
  it sits in the order that was rendered. That is one subtraction per row per frame, on the UI
  thread. Reordering the children instead would put a full reconciliation of the list on every slot
  the finger crosses, which is the one thing a drag cannot afford.

  Heights are measured rather than assumed, so a list with a two-line row in it lands in the right
  slots — a fixed row height is the number that goes wrong the moment somebody adds that row. The
  dragged row moves to the first slot whose middle it has passed, walking outwards from where it
  started rather than scanning for the nearest one, because with rows of unequal height a
  nearest-slot search can hand back a slot two places away and read on screen as a skip.

  `onReorder` fires once the row has settled, not when the finger lifts: until the spring finishes
  the row is in a slot the layout knows nothing about, and re-rendering there would relayout every
  row underneath one that is still moving. By the time the callback runs the rows are already where
  the new order puts them, so the re-render that follows changes nothing on screen.

  The component never owns the order — it reports where a row was dropped and the list stays
  yours to rearrange, because only you know what an id stands for. `reorderItems` applies the same
  move to a list of whatever those ids name.

  `activation` is `handle` by default, so a row with a button, a checkbox or a link on it keeps
  working; `longPress` gives the whole row to the drag. Pass the scroller the list sits in and a
  drag carried to the edge scrolls it, with the scrolled distance added back into the row's offset
  so the row does not slide out from under the finger. `useSortableItem` tells a row of your own
  whether it is the one in the air, as a plain boolean that changes twice in a drag rather than
  once a frame.

- **`Swipe.Group`** — several rows that agree only one of them is open at a time. A row knows when
  it opens and has no way to hear that a sibling did, so a list of swipeable rows ends up with
  three of them standing open at once — a state every list on the phone with this gesture goes out
  of its way to avoid, and one that previously had to be fixed by holding a ref to every row.

  Rows register themselves with the group rather than being found by walking children, so a row
  nested inside anything at all still belongs: wrapped in an `Item.Group`, produced by a `map`, or
  rendered by a component of your own. Nothing re-renders — the registry is a ref and closing a
  sibling writes to that row's shared value, so opening a row still costs the springs it starts and
  no React work.

  `useSwipeGroup()` returns `closeAll`, for the cases a row cannot see either: a list that scrolls,
  navigates away, or has just deleted the row that was open. `exclusive={false}` keeps the
  container and the handle while letting several rows stand open.

- **`GripVerticalIcon`** — the two columns of dots that mark a row as something to take hold of.

- **`impactKnock`** — the haptic for a thing coming loose or landing, alongside the existing
  selection tick. An impact rather than a selection because it marks a change of state rather than
  a change of value: the finger is now holding something it was not holding a moment ago.

### Docs

- The README's component count had been stale since 0.49.0 and is now 93, with the six names its
  category lists were missing: ButtonGroup, Fab, MarkdownEditor, Questionnaire, TextAnimation and
  Sortable.

## [0.49.0] — 2026-08-06

### Added

- **`ButtonGroup`** — several buttons drawn as one control: a segmented run, a split action, a
  toolbar down the side of a canvas. Nothing in the library drew a *joined* row of buttons before
  this; `ToggleButtonGroup` is a spaced run of pills that owns its own selection, and `Tabs` is
  navigation between panels.

  The buttons stay buttons. Anything a `Button` does — an icon, a badge, a loading state, a
  disabled segment, opening a `Popover` — it still does inside a group, because the group is a
  container rather than a component that takes a list of items and renders them for you. A
  list-of-items API has to grow a prop for every one of those things; this one has none of them.

  `variant` and `size` pass down through context rather than by rewriting the children, which is
  what lets a segment be a `Button` nested inside a `Popover.Trigger` — a split button — and still
  belong to the run. A segment that wants to stand out sets its own and wins, which is all
  "selected" needs to be once the shape around it is drawn. `orientation` turns the run and its
  dividers; `fullWidth` shares the row equally; `attached={false}` keeps the shared props and drops
  the shared shape.

- **`MarkdownEditor`** — a field for writing markdown, with a formatting toolbar and a rendered
  preview. Marked **beta**: the parts and their props are settled, but it has not had enough use to
  promise they will not move.

  Writing and reading are two modes rather than two panes. Side by side is a desktop layout, and it
  does not survive the trip to a phone: two columns of a phone's width are two columns too narrow
  to read, and the keyboard covers the bottom half of the screen exactly when the writer is using
  it. One pane and a switch, and the toolbar carries the switch because it is the only thing on
  screen in both modes.

  The preview is `Response` — the same reader that renders a model's answer — so markdown means one
  thing across the library and there is one parser to be right rather than two to keep in step. It
  renders through `Typography`, `CodeBlock` and `Table`, which is to say through your own type and
  colours.

  The part that matters is where the caret lands. Every toolbar action is a pure function of the
  text and the selection: pressing twice undoes it, a selection stays selected so it can be bolded
  and then italicised, and with nothing selected the caret lands between the new markers rather
  than after them. A line-level action applies to every line the selection touches and removes
  itself only when all of them already have it, because a mixed block is a block somebody is trying
  to make uniform.

- **`Fab`** — the floating action button, and the speed dial behind it. Circular or `extended`, in
  three sizes and four variants, pinned to any of three corners with `placement` and `offset`.

  `Fab.Group` with `Fab.Action` children is the dial. The actions unfold one after another rather
  than together, a few frames apart each, and every one carries its label — a column of unlabelled
  circles is a quiz. The whole dial runs off one shared value on the UI thread, so closing it
  halfway through opening runs the same value back down instead of leaving a queue of callbacks to
  fire into a closed menu. Opening drops a scrim, which is both what says the dial is modal and
  what catches the tap that closes it; the scrim and the buttons travel through the same portal, so
  the backdrop can never end up on top of the dial it is behind.

  Its documentation leads with when *not* to reach for it. A button floating over the content is a
  button covering some of it, and a corner with three buttons in it is a toolbar in the wrong
  place.

- **Nine icons** — `FolderIcon` and `FolderOpenIcon`, and `BoldIcon`, `ItalicIcon`, `HeadingIcon`,
  `ListIcon`, `ListOrderedIcon`, `QuoteIcon` and `CodeIcon` for a formatting toolbar.

- **`ColorPicker` opens from the row that reads it out.** `presentation` takes `popover` or
  `bottom-sheet` and folds the controls behind a `ColorPicker.Trigger`, drawn in a
  `ColorPicker.Content`. A picker is a page's worth of controls in service of one value that is
  looked at far more often than it is changed, so leaving the square permanently open under a
  labelled strip spends a screen on something nobody is currently using — two colours cost two
  panels. `inline` is still the default, so nothing already written changes. `ColorPicker.Field`
  gains an `onPress` and becomes a button when it has one.

- **`TimePicker` can turn its readout down.** `readout` takes `default`, `compact` or `none`. The
  `ruler` face states its time in one large centred number, which is right when the scale is the
  only thing on the panel and wrong under something that outranks it.

- **`DateTimePicker` names its time half.** `timeLabel` is the word above the face.

### Changed

- **The date now outranks the time in `DateTimePicker`.** The panel is a month grid over a time
  scale and the date is the coarse choice, but the ruler's 36pt readout stood against a month
  caption of 16 and dates of 14 — the largest text in the panel for the smaller half of the value,
  with nothing saying what the bottom half even was. The panel takes `readout="none"` and writes
  the row itself: the half's name on one edge, its current value on the other, at a size that sits
  under the date. The seam between the halves gets equal margin above and below rather than
  clinging to the calendar.

- **A folder row in `Tree` gets its own glyph.** `Tree.Icon` holds its width whether or not it has
  anything in it, which is what keeps a folder's name and a file's name starting in the same place
  — so a row that leaves it empty puts its label a whole box away from its own chevron while the
  rows around it look right. The demos and the documented snippets now fill it on every row, and
  the part's own docs say the slot is all-or-nothing.

- **`GridItem`'s watermark fits the tile.** At 112 points against a 132-point row the background
  glyph filled the tile corner to corner and competed with the number in front of it. Down to 72;
  the corner it hangs off is unchanged.

### Fixed

- **Swiping between `Tabs` no longer re-draws the whole panel every frame** ([#28]). Reported as
  jank on Android with a list in each panel, both when swiping and when pressing a trigger. Three
  causes, none of them the one in the report — `swipeable` does not mount extra panels, only
  `keepMounted` decides that.

  A panel travelling under the finger also had its opacity animated. A transform is a layer
  property and costs nothing per frame however much is inside it; an alpha that changes every frame
  is not one on Android, where the view group has no offscreen buffer, so the value is pushed down
  into the children and every visible row is re-drawn on every frame of the drag. The fade is now
  iOS-only, where the layer fades itself and it is free.

  The follow style was also applied to *every* mounted panel, so `keepMounted` ran one mapper per
  panel per frame to reposition views that are `display: none` — which meant the obvious workaround
  for a slow panel made the drag worse. It is now gated to the active one.

  And a committed swipe left the panel parked wherever the finger let go until React had mounted
  the arriving one, a stall exactly as long as the mount. The outgoing panel now carries on off the
  edge on the UI thread immediately, and the arriving one is placed relative to wherever it has got
  to, read live, so the handover stays continuous. Changing tab also no longer rebuilds the pan
  gesture, which was detaching and re-attaching the native recogniser on the busiest frame of the
  interaction.

### Docs

- The PieChart page opens with a recording of the component running, which it had neither a preview
  nor a video for before.

[#28]: https://github.com/panel-ui/PanelUI/issues/28

## [0.48.0] — 2026-08-06

### Added

- **`Tree`** — a hierarchy you can open a level at a time: a file browser, a folder of settings, a
  category picker, a table of contents. `Accordion` is the one-level version of the same idea and
  stops there, because its items cannot hold items. A tree's can, to any depth, and everything that
  follows from that is what the component owns — which node a row sits under, how far in it is
  drawn, whether it is a branch at all, and which of its ancestors are open.

  A closed branch is unmounted rather than hidden, so a tree costs what is *open* in it rather than
  what is *in* it: a folder of ten thousand files that nobody has opened costs one row. An item is
  a branch because it holds a `Tree.Group`, not because it was declared one, so there is no second
  fact to keep true — with one exception, a branch whose children have not been fetched yet, which
  has no group to be recognised by and so sets `hasChildren` to earn its chevron. The fetch itself
  hangs off `onExpandedChange`.

  Expansion and selection are separate pieces of state, because they answer separate questions —
  which parts of the hierarchy are open, and which row is the chosen one — and a tree commonly
  needs one without the other. Either can be controlled or left alone. Selection is off entirely
  until `selectionMode` is set, and hands its value back in the shape it was given, a string when
  `single` and an array when `multiple`, as `Accordion` does.

  The chevron is pressable in its own right, so it opens a branch without selecting it. That is
  what makes `expandOnPress={false}` usable: a sidebar where pressing a section navigates to it and
  only the chevron opens it. On a leaf the chevron becomes an empty box of the same size, so a
  file's name starts where a folder's name does. Parts: `Item`, `Trigger`, `Indicator`, `Icon`,
  `Label`, `Actions`, `Group`, plus `size`, `showLines` and `indent` on the root.

### Changed

- **`Accordion` — `keepMounted`, for a body worth keeping.** A closed section unmounts its body,
  which is right when the closed state should cost nothing and wrong when there is state inside it:
  a half-filled form, a list scrolled to the middle, a video part-way through. Collapsing such a
  section threw that away and reopening it started over.

  `keepMounted` hides the body from layout instead of unmounting it. That is a real distinction and
  not a cosmetic one — a hidden view takes up no room, so the item's height changes by exactly as
  much as it would have on an unmount and the same layout transition plays. The two modes are
  indistinguishable to look at, and everything inside the kept one stays alive. The hidden subtree
  is taken out of the accessibility tree too, so a screen reader does not read out a section the
  eye cannot see.

  It goes on the accordion for every section, or on a single `Accordion.Content` for the one that
  needs it; the prop on the content wins either way round. The default is unchanged.

## [0.47.0] — 2026-08-06

### Added

- **`Questionnaire`** (alpha) — one question at a time, with progress, validation and a way back.
  Where `Steps` reflects a flow the app owns, this one *owns* the flow: it holds the answers,
  decides which question is current, gates the way forward on the current one being answered, and
  hands the whole set back when it is done. For onboarding, intake, surveys, and the clarifying
  questions an agent asks before it starts work.

  Answers come back as one record keyed by question name — a string for a single-answer question,
  an array for a `multiple` one. A freeform `Questionnaire.Input` lands under the *same* name,
  because it is another answer to the same question rather than a separate field, and that is what
  makes picking a choice empty the text field and typing clear the choice without either part
  knowing the other exists.

  The root draws its own `Frame`, since a survey wants a boundary, a title strip and a footer that
  stays put while the middle changes; `frame={false}` drops it for a sheet or a card that already
  draws one. It reads its children once to sort them into that shell and to learn the full set of
  questions without mounting any of them, which is what makes a total countable and a conditional
  question skippable before it is ever reached. Pass `items` when a question is conditional — one
  that has not been reached is not mounted, so it cannot report that it exists.

  Only a **required** question blocks. `Questionnaire.Skip` therefore unblocks nothing; it
  *records* that an optional question was deliberately left out, moving its status from
  `unanswered` to `skipped` so an app can tell a skipped answer from a missing one. Demanding an
  explicit skip would trap anyone who left the button out, and a question that cannot be ignored is
  not optional. `Questionnaire.Next` and `Submit` dim while a required question is unanswered but
  stay pressable, because a disabled button says no without saying why — the look says not yet, the
  press puts the reason under the question.

  `Questionnaire.Progress` draws a bar per question by default, `variant="numbers"` counts them out
  where the reader will be sent back to a particular one, and `variant="count"` is plain text; both
  marked variants fall back to the count past eight questions, where neither is countable at a
  glance. `shortcuts` badges each answer with a letter or number, skipping disabled ones so they do
  not take a letter out of the sequence — a visual affordance only, since React Native surfaces
  hardware key events just to a focused text field.

  A horizontal drag moves between questions under the same gate as the buttons, and yields to any
  drag with vertical intent so a questionnaire inside a scroller never fights the page.

  Marked **alpha**: it is a large new compound API and the first real use will move it.

## [0.46.0] — 2026-08-05

### Added

- **`PieChart`** — one whole, divided between its parts. Composed like the rest of the family:
  `Header`, `Slices`, `Center`, `Legend` and `Skeleton`. It is the opposite claim to `RingChart`
  beside it, and the difference decides which one you want: a ring is a value against *its own*
  target and nothing has to add up, while every slice here is a share of one total, normalised
  against the sum, closing the turn.

  `innerRadius` is a share of the radius rather than a length, so `0` is a pie and anything above
  it is a donut at the same proportions whatever size it is measured at. Prefer the donut where
  there is a total worth showing, which is most of the time — the angles say roughly how the parts
  compare, and the middle says what they came to, which is the one figure a reader takes off a pie
  exactly.

  `minAngle` puts a floor under the slices too small to see. A slice worth a third of a percent is
  a hairline nobody can press, so it reads as *missing* rather than as small, and "missing" is a
  different claim from "nearly none"; the angle it borrows comes off the others in proportion.
  `padAngle` and `cornerRadius` turn the disc into separate segments, and `startAngle`/`endAngle`
  open it into a dial.

  The reveal is an unroll — one hand sweeping clockwise from the start of the dial, each slice
  drawn as far as it has reached — so the chart fills the way it would be drawn by hand. The
  loading state is one undivided band, because a placeholder split is an invented answer to the
  only question the chart is being asked, and nobody can tell an invented split from a real one
  until it changes under them.

- **`GridItem`** — bento tiles, and the grid that places them. `GridItem.Group` owns `columns`,
  `gap` and the cell shape; a tile takes `colSpan` and `rowSpan`, with `Background`, `Media`,
  `Title`, `Value`, `Description`, `Footer` and `Actions` inside it.

  The group measures itself and places its children into the first free cell each one fits in,
  scanning row by row. That is what a wrapping row of views cannot do: wrapping puts whatever did
  not fit on a *new line*, so nothing ever tucks under a tall tile and `rowSpan` would be a prop
  that quietly did nothing. The trade is that a tile's height is its cells rather than its
  content — which is the right way round for a bento, since a grid of boxes that each grew to fit
  their own text is not a grid, but it does mean the cell has to be sized from what the tallest
  tile holds.

  `GridItem.Background` is the part that separates a bento from a wall of stat cards: a sparkline,
  a wash, an oversized icon, clipped by the tile and meant to run off its edges.

- **`DateTimePicker`** — a day and a time of day, picked in one panel and carried in one `Date`.
  A date field beside a time field is two decisions the reader makes separately and then has to
  hold together, and the two halves can disagree — which is how a booking lands on the right day
  at a time that has already passed.

  It composes what already exists rather than reimplementing either half: `Calendar` above,
  `TimePicker`'s inline panel below, a hairline between them and one Done that finishes both. The
  time face is the ruler by default, because under a month grid the panel is already tall and the
  wheel is five rows of it; `layout` swaps in the other two.

  It does **not** close on the date, in any presentation including the popover — the day is half
  the value, and closing on it hides the other half at the moment it becomes relevant. A time
  picked before a day means today, since a time is not a `Date` without one and refusing to emit
  anything until both halves have been touched is a form that silently does nothing when used in
  the order it did not expect.

- **`Tabs` gains `variant="expanding"`** — a row of icon pills where only the selected one is
  open, widening to let its label out and closing again behind it. For a short row of destinations
  recognisable by their icons, where writing every label out spends the whole width on words
  nobody rereads. Give every trigger an `icon`; a closed tab has nothing else. The label is never
  unmounted, only closed over, so a screen reader still has something to read out.

- `wedgePath` and `polarPoint` join the shared chart maths: a filled slice of an annulus, closing
  on the centre for a pie and on a second arc for a donut. `arcPath` could not express it — it
  draws a line to be stroked, and a stroke is a band of even thickness with no ends of its own.

### Changed

<a id="migration-0-46-0"></a>

- **Breaking: `KpiChart` is now `Kpi`**, and every `KpiChart*Props` type is `Kpi*Props`. It was
  never a chart — the number is the message, the sparkline is a footnote drawn by `LineChart`, and
  half its versions have no chart at all. Calling it one filed it with the plots and described the
  smallest part of it.

  The docs URL keeps working through a redirect. **The registry item does not**: the CLI command
  `npx panelui-cli@latest add kpi-chart` is now `add kpi`, and a redirect does not cover a fetch of
  a file under `public/`.

- **`ScatterChart`'s reveal is no longer a wipe.** The other charts sweep a clip across the plot,
  which suits a series read along the x-axis; here it handed the reader a direction the data does
  not have, when the whole claim of a scatter plot is that a point's position is its meaning. Each
  point now grows into place on its own slice of one shared clock, a little past its size and back
  to it. The selection swell went the same way — it was a hard switch, so the point under the
  finger jumped half as big again between one frame and the next.

- **`Tabs`' swipe is one continuous movement.** The panel followed a third of the finger's travel
  and then, at the moment the finger lifted, the arriving panel started afresh from a fixed third
  of a width away with none of the speed the gesture had — so it jumped exactly where it should
  have been smoothest. The panel now tracks the finger one to one, and the arriving panel picks up
  a whole panel's width from wherever the outgoing one was let go, carrying the release velocity
  into the spring. Only one panel is mounted, so it dims as it travels and the arriving one comes
  back up through the same fade, which reads as a dissolve the movement is carrying rather than as
  a hole.

- The eight charts have a **Charts** section of their own in the documentation sidebar, under
  Components. Eight consecutive entries in the middle of an alphabetical list of eighty-seven is
  where a list stops reading as a catalogue. Their URLs move with them and the old ones redirect.

### Fixed

- **`Combobox`** drew typed text below the middle of its field. The input asked for `text-base`,
  which sets a 16px size and a 24px line height together, and the extra leading lands above the
  glyphs — so inside the slot's fixed-height box the text and the placeholder sat a few points
  under the chips they share the row with. It is a length now, as every `Input` size already was.

- **`ScatterChart`'s loading state only ever animated once.** The reveal's guard was latched on the
  first pass and never cleared, so a chart sent back to `loading` came back with no animation at
  all. The placeholder field was also cut at the frame the data landed, leaving the plot briefly
  empty; it now dissolves as the real points grow in.

- **The templates could not be started where they are written.** Run from inside the checkout, a
  template resolves past its own `node_modules` and up into the monorepo's, so the Worklets Babel
  plugin came from one install and the Worklets runtime from another and the app died on the first
  import with the two reporting different versions of themselves — followed by every route
  reporting as missing a default export, which is the same failure one step downstream. Neither
  message names the cause, so each template's `metro.config.js` now refuses to start from in there
  and points at `npm run template`. Inert for a generated project, which is never inside this
  repository.

### Docs

- Both component lists are alphabetical again, and neither is ordered by hand any more. The docs
  sidebar sorts on the name it prints, and the example app derives its catalogue from its array —
  a new component was always appended rather than inserted, which is how the charts collected under
  L and `Item` ended up after `OtpInput`.

- The scrollable **`BottomSheet`** version says which version it is. Every version of that sheet
  looks much the same once open, and this one's heading read only "Choose a country".

## [0.45.0] — 2026-08-05

### Added

- **`ScatterChart`** — two quantities plotted against each other, to show how they relate.
  Composed like the rest of the family: `Grid`, `Points`, `XAxis`, `YAxis`, `Tooltip`, `Legend`,
  `Skeleton` and `Header`. It is the one chart here that *measures* its x rather than spacing
  points evenly by position, because a scatter plot's whole claim is that both coordinates are
  quantities — so `xDataKey` must point at a number, and both domains tween when the data
  changes.

  Touching the plot selects the nearest point by distance, resolved on the UI thread and only
  within a hit radius sized for a fingertip rather than for the dot — so a touch in an empty
  corner selects nothing instead of lighting up whichever point is least far away. Give `Points`
  a `sizeKey` for a bubble chart; the value maps to each point's **area**, not its radius, since
  mapping to the radius makes a point holding twice the value carry four times the ink.

  Neither axis is floored at zero, unlike `AreaChart`'s. A scatter plot's subject is the spread,
  and forcing a cluster of values between 80 and 90 to share a frame with zero squashes it into
  a corner and hides the thing being plotted. Pass `xDomain`/`yDomain` when a fixed frame matters
  more.

- **`LineChart.YAxis`** — value labels down the side, one per grid line, as `AreaChart` and
  `BarChart` already had. The chart's own documentation already told readers to match `Grid`'s
  `rows` to `YAxis`'s `ticks`; the part it described did not exist until now. Like the others it
  reserves its label gutter before the plot is laid out, and its labels read the settled domain
  rather than the tweening one — a number counting through every intermediate value while the
  axis animates is noise.

- `xAt` joins the shared chart maths: a value's x on a measured axis. The counterpart to `xOf`,
  which spreads points evenly by position, and not a replacement for it.

### Docs

- The README's component count had drifted (81, against 83 shipped) and its data-visualisation
  list was missing `KpiChart` and `RadarChart`. Both corrected, alongside the new chart.

## [0.44.0] — 2026-08-05

### Changed

<a id="migration-0-44-0"></a>

- **Breaking:** `Card.Wash` and the `CardWashProps` type are removed. The wash was the only part
  of `Card` that did any work — a shared value, a repeating opacity animation, a resolved theme
  token and a ten-stop gradient — and reaching the gradient meant importing `expo-linear-gradient`
  at module scope. That made a native module mandatory for everyone who renders a `Card`, when
  only the wash ever used it, and a client built without that module hands JavaScript an undefined
  native view which native code then dereferences rather than raising anything catchable. `Card`
  is now six plain views and its registry item declares no dependencies at all, where it
  previously pulled in three. A card that wants a decorative backing layer composes one as its
  first child, inside a root that clips.

### Fixed

- The project templates declare `expo-linear-gradient` and `@react-native-masked-view/masked-view`.
  Both are non-optional peers of the library — the first is still reached by `Shimmer`,
  `ColorPicker`, `Post`, `Panelside`, `Soundwave`, `ScrollFade` and `TextAnimation`, the second by
  `Shimmer` and `ColorPicker` — but neither template listed them. npm installs a missing required
  peer on its own, so nothing failed locally; the versions were simply left to whatever `latest`
  resolved to and stayed invisible to `expo install --check`. Under a client that does not
  auto-install peers there was no native module at all. Both are now pinned to their SDK 57
  versions alongside the rest.
- The starter's component gallery composed `Alert` and `Accordion` against an anatomy they do not
  have, and both showed on screen. `Alert`'s root is a flex row and `Alert.Content` is the flex-1
  wrapper inside it; the gallery put a bare `Text` in the row, so nothing constrained the line and
  it ran past the padding on the right. `Accordion.Trigger` draws no chevron of its own — that is
  `Accordion.Indicator`, a part the caller places, and the trigger is laid out `justify-between` to
  receive it — so a bare string gave a row that opened and closed with nothing saying it could.

## [0.43.0] — 2026-08-04

### Added

- `KpiChart` — the metric card, which until now existed only as a private helper in the example
  app. A number is the message and the chart under it is the footnote, so the parts are sized and
  ordered around that: `Header`, `Icon`, `Title`, `Actions`, `Stat`, `Value`, `Trend`, `Chart`,
  `Progress`, `Footer`, `Separator`, and a `Group` that lays several out as one panel. `Trend`
  takes a signed number rather than a written string, and `goodDirection` says which way the good
  news is — a fall in churn, refunds or latency is what you want, so it is drawn as what you want.
  Colour comes from the meaning rather than the sign, which is the thing a caller keeping a red
  and a minus in step by hand always eventually gets wrong.
- `RadarChart` — several measures of one thing, drawn as one shape. It answers a question a bar
  chart cannot: not which of these is biggest but what shape is this. `Header`, `Grid`, `Axis`,
  `Series` and `Legend`, on the same root as the other charts here. The reveal grows the polygons
  out of the centre, because a polar chart has no left-hand edge for the usual sweep to start
  from, and it scales the values rather than transforming the group so the stroke does not grow
  with the shape. Changing the data makes the outline travel to the new profile a vertex at a
  time, which is what says which axes moved and by how much.
- `ColorPicker.Wheel`, an alternative to `.Area`: hue is the angle and saturation the radius. It
  reads the same channels, so a picker is a wheel *instead of* a square rather than as well as
  one — but a wheel spends both dimensions on hue and saturation, so `ColorPicker.Brightness`
  comes with it. Also `ColorPicker.Field`, the strip that names the colour and prints it, and
  `ColorPicker.Channel`, the readout that names the track under it. Both build their text on the
  UI thread and only cross to JavaScript when the rounded string changes.
- `Tabs` takes `swipeable`, so a horizontal drag on the panel moves between tabs. Off by default,
  because a panel is allowed to contain a carousel or a slider and two horizontal recognisers in
  one tree cannot both win. The arriving panel starts on the side it is arriving from and springs
  in; a tab changed by pressing a trigger moves the same way, since a swipe and a press producing
  different animations would read as two features.
- `SectionRail.Content` takes `maxWidth`, for a screen whose section titles are long enough that
  two lines is not enough either.
- `polarPoint` and `radarPath` join the exported chart maths, both on the same turn convention as
  `arcPath`.

### Changed

- **Moon is a different theme.** It was a second neutral — white or pure black, a bright blue
  accent, and a radius scale tight enough to read as unrounded — which sat too close to the
  default family to be worth choosing. The dark half now runs on a near-black canvas with
  elevation carried by a ladder of four barely-separated surfaces and opaque hairlines instead of
  shadow, under a lavender accent; the light half is derived from the same palette so the pair
  stays one family. The shape scale opens out at the top rather than tightening, because a badge
  looks much the same in any family and a sheet does not. **If you were relying on Moon's old
  colours, this will change how your app looks.**
- `Menu` draws its tick, radio dot and submenu chevron from `lucide-react-native`, which is now a
  dependency. Both sets are on the same geometry, so nothing moves; what changes is that the set
  is complete, so an app can keep one icon vocabulary instead of falling off ours the first time
  it needs a glyph we never drew.
- The ColorPicker thumbs lose a point of ring and the tracks gain four points of height, so a knob
  sits in its track rather than over a hairline.

### Fixed

- `Combobox` in `mode="multiple"`: the chips sat high against the input, because a `Chip` is
  `self-start` by default and that overrode the row's centring; and the input's own text sat
  differently again, because it had vertical padding rather than a height and Android does not
  centre a single-line input on its own.
- A `Combobox` list could take two taps to answer. Which side it opened on was recomputed from its
  measured height on every layout, and that height changes — it is 0 on the frame it opens, and
  picking an option in multiple mode clears the query and re-expands the list, so a finger already
  on its way down landed where the option used to be. The side is now decided once. Separately,
  the full-window dismiss catcher covered the field that opened the list, so a tap on the input or
  the chevron was spent dismissing; it is now the four strips around the field.
- `SectionRail` cropped its section titles. The panel was capped at 60% of the screen with every
  row on one line, and a row spends at least 40pt on indent and padding before any text. The cap
  is now 78% with a 200pt floor, and a row wraps to two lines before it truncates. The row indent
  also moves from `paddingLeft` to `paddingStart`, so it falls on the same side as the bar it
  belongs to under RTL.

### Docs

- A **Templates** page: `panelui-cli init` in an empty directory now writes a working Expo app —
  a theme, a native tab bar and the whole Metro pipeline already wired. Linked from Installation
  and the CLI page.
- Theming gains a per-family radius table, the two CSS install shapes side by side, a complete
  theme picker, how to read a token from JavaScript, and all sixty tokens in one paste-able block.

## [0.42.0] — 2026-08-04

### Added

- `ColorPicker` — a colour chosen by dragging rather than typed: a square with saturation across
  it and brightness up it, a hue scale, an opacity scale over a checkerboard, a preview and a row
  of presets. Every part is optional and renders where you write it, so a picker with no opacity
  is one with no `ColorPicker.Alpha` in it rather than one with a prop turned off. It stores hue,
  saturation, value and alpha rather than the string it hands back, which is what keeps the thumb
  where you left it — a fully black colour is `#000` whatever produced it, so a picker that stored
  its own output would lose the thumb in the corner of the square and have nowhere to put it back.
  Nothing about a drag crosses to JavaScript: the four channels are shared values and every fill
  is computed from them on the UI thread, including the opacity ramp, which is a gradient used as
  a mask over a solid colour rather than a gradient whose colours React would have to re-declare
  on every frame.
- `Slider` takes `range` and `defaultRange`, and reports through `onRangeChange` and
  `onRangeCommit`. A range is a second pair of props rather than a tuple in the first one, so a
  one-thumb slider's handler stays `(value: number) => void` and no existing caller has to narrow
  a union to read a number out of it. `minStepsBetweenThumbs` is the gap the span can never
  close; the two thumbs bound each other rather than the track, so they meet but never cross.
- The colour maths the picker is built on is exported: `parseColor`, `formatColor`, `hsvToHex`,
  `hsvToRgb`, `rgbToHsv`, `hsvToHsl`, `hsvToCss` and `isValidColor`. Every one is a worklet, so
  they can be called from an animated style as well as from ordinary code.

### Fixed

- A controlled `Slider` fought the finger while being dragged. Each change was echoed straight
  back as a new prop, and the effect that keeps the thumb in step with an outside change sprang it
  onto that echo — so at a coarse `step` every frame pulled the knob back onto the last snapped
  value while the finger had already moved past it. The sync now stands down for the length of a
  gesture.

## [0.41.0] — 2026-08-03

### Added

- `TextAnimation` — five ways a piece of text or a number arrives: `Typing`, `Rotating`,
  `Counting`, `Sliding` and `Scrolling`. One component rather than five, because they share
  every prop that says *how*: put `duration`, `delay`, `loop` or `enabled` on the root and it
  becomes the default for everything under it. Almost none of it re-renders — `Counting` runs on
  the UI thread and crosses back only when the rounded number changes, and the two that roll
  digits never cross back at all.
- `Card.Wash` — a decorative layer for the back of a card: the tint rising from its bottom edge
  on a power curve, so the top two thirds are untouched and the colour arrives in the lower
  third. A straight fade would read as a tinted panel, which is a different thing.
- `Drawer.Content` takes `closeSide`. The close button takes the corner away from the docked
  edge, which is right for a drawer opened once and wrong for a filter panel opened all day —
  where a target always under the same thumb beats one that moves with the edge.
- `Panelside` takes `haptics`, and `scale`, `radius` and `dim` as defaults for every
  `Panelside.Scene` under it, so the three numbers that describe the curve live where the panel
  is configured. `Panelside.Scene` takes `scrimClassName`, for a dim that is not black.
- `Panelside.Cta` and `Panelside.Item` take `size`.
- `Map.Heatmap` takes `color`, `colors` and `points`.

### Fixed

- A mirrored chevron stayed mirrored after the direction flipped back. `useFlip` returned no
  transform in a left-to-right subtree, which *removes* the prop rather than setting an identity,
  and the renderer keeps the last matrix it was handed — so one toggle into RTL left every list
  row pointing at its own text, for good. Icons now write a transform on every render.
- `Map.Heatmap` ramped through `--color-chart-1`, the series colour a chart is *about*, which
  every theme starts close to the foreground: near-black in a light theme, near-white in a dark
  one. Over a basemap that is a smudge rather than a measurement. Its intensity was also
  constant, so the same points packed into fewer pixels at world zoom saturated the whole field.
- A `Pagination` run wider than its container spilled past both edges of a centred row, leaving
  the leading number half off the screen. It clips to its own bounds now, and `size="sm"` draws
  genuinely smaller targets — 32pt, with the extra `hitSlop` raised to keep the 44pt reach.
- `Panelside`'s compose pill stood a step above the account button beside it and sized the whole
  footer row with it. The default is 40pt; `size="lg"` is the old one.

### Changed

- The outward arrow and the send plane mirror in a right-to-left subtree, alongside the two
  chevrons. The vertical arrows and the asymmetric glyphs that are not directions — a pencil, a
  magnifier, a play triangle — stay as they are drawn.
- `Map` drops its two analytics screens for a street map that is the whole screen. Both put a map
  inside a dashboard, which is a chart with geography rather than a map, and they were the first
  thing anyone opening the component saw.

## [0.40.0] — 2026-08-03

### Added

- `RingChart.Header` and `HeatmapChart.Header` — the strip above the plot carrying a title, a
  readout and a key, which the bar, line and area charts already had. All five charts now
  introduce themselves the same way, and the part belongs to the chart rather than to the card
  around it: its value changes as the plot is read.
- `RingChart` takes `startAngle` and `endAngle`, in degrees clockwise from twelve o'clock. Leave
  less than a turn between them and the ring opens into a gauge, with the track and the touch
  target both stopping where the arc does.
- `RingChart.Ring` takes `segments` and `segmentGap`, breaking the ring into countable ticks —
  eight of twelve reads off ticks you can count, and off a smooth arc only as "about two thirds".
- `HeatmapChart.XAxis` takes `labels`, for a grid whose columns are not weeks. The axis emitted a
  label where the month changed, which such a grid never does; `YAxis` already had the equivalent
  for its rows.

### Fixed

- `HeatmapChart.Tooltip` reported "No data" over every cell of a grid built without dates, having
  treated a missing date as missing data and discarded the count it had already computed. A cell
  with no date is a cell in a grid that is not a calendar; it now reads as its count.
- A `RingChart` given a `size` drew its plot against the leading edge of its container instead of
  in the middle of it.

### Changed

- The `RingChart` root is two views, so a header is not measured as part of the square. A chart
  that sets no `size` is unaffected.

### Docs

- The RingChart page documents the gauge and the segmented ring, and its versions are the gauge,
  the segmented ring and a set of separate dials.
- The HeatmapChart page documents the punchcard — hours in the rows, weekdays in the columns.
