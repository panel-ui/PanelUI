# PageHeader

Cover, face and actions at the top of a profile.

```tsx
import { PageHeader } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { PageHeader } from '@/components/ui/page-header';
```

### Anatomy

```tsx
<PageHeader>
  <PageHeader.Cover />          {/* the banner, or a gradient */}
  <PageHeader.Row>              {/* the face, and anything beside it */}
    <PageHeader.Avatar />
    <PageHeader.Stats>
      <PageHeader.Stat value="788" label="Followers" />
    </PageHeader.Stats>
  </PageHeader.Row>
  <PageHeader.Content>
    <PageHeader.Title>…</PageHeader.Title>
    <PageHeader.Description>…</PageHeader.Description>
    <PageHeader.Meta icon={<LinkIcon />}>…</PageHeader.Meta>
  </PageHeader.Content>
  <PageHeader.Actions>…</PageHeader.Actions>
</PageHeader>
```

### Variants

- **variant** — `card` *(default)*, `page`
- **align** — `start`, `center` *(default)*

### Parts

- `PageHeader.Cover` — The banner. Give it a `source` for an image; without one it draws a gradient, because a header with no banner still has to read as a header. `height` sets the band, `alt` describes the picture — left out, it is treated as decoration.
- `PageHeader.Avatar` — The face, in a ring of whatever surface is behind it. It lifts over the cover's bottom edge on its own: the root looks for a `PageHeader.Cover` among its children, so a header without one leaves the face where it is. `overlap` overrides that either way. Pass `children` to put something else in the ring — a logo, a monogram, a live thumbnail.
- `PageHeader.Row` — The face, and whatever sits beside it — for the profile that puts its counts next to the picture rather than under the name. Leave it out when the face stands alone; `PageHeader.Avatar` carries its own inset then.
- `PageHeader.Content` — The text block. Everything in it takes the header's alignment.
- `PageHeader.Title` — Whose page it is. Announces itself as a heading.
- `PageHeader.Description` — The handle, the email, the one quiet line under the name.
- `PageHeader.Meta` — One fact about the account — a link, a location, the month it was opened. The `icon` takes the muted colour without being told.
- `PageHeader.Stats` — The row of counts. `layout="stacked"` puts the label under the figure, for counts read as a set; `inline` runs them together — "533 Followers" — for counts read as part of a sentence. `divided` rules between them. Centred and stacked, the counts take equal widths across the row, so the middle one lands on the same centre line as the name and the buttons.
- `PageHeader.Stat` — One count. Announced as a single thing — "533 Followers" — because a figure and its label read apart are two pieces of nothing. Give it an `onPress` and it becomes a real button.
- `PageHeader.Actions` — What you can do about the account. Give the buttons `className="flex-1"` for the pair that splits the width evenly.

### Props

#### `PageHeaderProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

#### `PageHeaderRootProps`

Extends `PageHeaderProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `variant` | `PageHeaderVariant` | `card` | `card` is a surface of its own, with the cover held off its edges. `page` drops the surface and lets the cover run to the screen's edges. |
| `align` | `PageHeaderAlign` | `center` | Which edge the face, the text and the actions line up on. `center` is the profile card; `start` is the screen header, where the name is the first thing on the line rather than the middle of it. |

#### `PageHeaderCoverProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `source` | `ImageSourcePropType` | — | The banner. Left out, the cover draws a gradient instead. |
| `height` | `number` | — | How tall the band is. |
| `colors` | `readonly [string, string, ...string[]]` | — | The gradient, when there is no image. Two colours or more, as real colour strings — this is painted rather than classed. |
| `alt` | `string` | — | What the banner shows. Left out, it is treated as decoration. |
| `children` | `ReactNode` | — | — |

#### `PageHeaderAvatarProps`

Extends `Omit<AvatarProps, 'size' \| 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `size` | `AvatarSizeName` | `xl` | How big the face is. |
| `children` | `ReactNode` | — | What goes in the ring instead of a face — a logo, a monogram, a live thumbnail. It fills the ring, so give it its own background and padding. |
| `verified` | `boolean` | — | Draws the verification rosette in the face's bottom corner. |
| `badge` | `ReactNode` | — | Anything else for that corner — a camera button, a presence dot, a "+". Wins over `verified`. |
| `overlap` | `boolean` | — | Whether the face lifts over the cover's bottom edge. Set by the presence of a `PageHeader.Cover`; pass it to override that either way. |

#### `PageHeaderRowProps`

Extends `PageHeaderProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `children` | `ReactNode` | — | — |

#### `PageHeaderContentProps`

Extends `PageHeaderProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `children` | `ReactNode` | — | — |

#### `PageHeaderMetaProps`

Extends `PageHeaderProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `icon` | `ReactNode` | — | A glyph before the line. Takes the muted colour without being told. |
| `children` | `ReactNode` | — | — |

#### `PageHeaderStatsProps`

Extends `PageHeaderProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `layout` | `PageHeaderStatsLayout` | — | `stacked` puts the label under the figure, for a row of counts read as a set. `inline` runs them together — "533 Followers" — for counts read as part of a sentence. |
| `divided` | `boolean` | — | Rule between each count and the next. |
| `children` | `ReactNode` | — | — |

#### `PageHeaderStatProps`

Extends `Omit<PressableProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `value` | `ReactNode` | **required** | The figure. |
| `label` | `ReactNode` | **required** | What it counts. |
| `divided` | `boolean` | — | Rule before this count. `PageHeader.Stats` sets it; pass it to override. |

#### `PageHeaderActionsProps`

Extends `PageHeaderProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `children` | `ReactNode` | — | — |

### Example — The profile card

The default. The cover is held off the card's edges and rounded on its top corners only, so its bottom edge meets the content rather than floating above it.

Nothing here says the face should lift over the cover — the card can see the cover among its children and works it out.

```tsx
<PageHeader>
  <PageHeader.Cover />
  <PageHeader.Avatar source={{ uri: face }} fallback="OR" verified />
  <PageHeader.Content>
    <PageHeader.Title>Olivia Rhye</PageHeader.Title>
    <PageHeader.Description>olivia@panelui.dev</PageHeader.Description>
  </PageHeader.Content>
  <PageHeader.Actions>
    <Button variant="secondary" className="flex-1">Message</Button>
    <Button className="flex-1">Follow</Button>
  </PageHeader.Actions>
</PageHeader>
```

### Notes

### Why the cover is inset

In `card` the cover is held off the card's edges by the card's own padding, and rounded on its top corners only. Its bottom edge is square and meets the content, so the two read as one object rather than as a picture with a panel under it.

The radii are a pair on the theme's own scale — `rounded-3xl` on the card, `rounded-2xl` on the cover — one step apart, which in most themes is exactly the padding between them. That keeps the curves concentric without a fixed number that would be wrong in half of them.

Restyle the card's radius and give the cover the matching one yourself. Both arrive as `className` strings, which the component cannot read.

### The face lifts itself

`PageHeader.Avatar` pulls up over the cover's bottom edge by half its own diameter, and works out whether to: the root looks for a `PageHeader.Cover` among its children and says so through context.

A header with no cover has nothing to overlap, and an avatar that lifted anyway would hang off the top of it. Pass `overlap` to decide it yourself — for a cover rendered conditionally, where the children the root can see are not the children it will draw.

### The ring is a surface, not a border

The ring around the face is drawn in the surface behind it — the card in `card`, the page in `page` — rather than in the border colour. A border reads as an outline on top of the cover; a ring in the surface behind reads as the face being punched out of it.

That is also why the badge hangs off a second view rather than off the ring: the ring clips to a circle, and a badge inside it would be cut in half by the very edge it is meant to sit against.

### The rosette is at the bottom

`Avatar.Badge` pins to the top corner, which is where an unread count belongs. A verification mark belongs at the bottom, beside the name it is vouching for, so `PageHeader.Avatar` draws its own corner instead.

`badge` takes that corner for anything else — a camera button, a presence dot, a "+" to add to a story — and wins over `verified`.

### The gradient is two series tokens

A cover with no `source` draws a gradient between `--color-chart-2` and `--color-chart-5`. They are series tokens rather than a pair of hexes, so an app that puts its charts on brand puts this on brand with them.

Pass `colors` for a gradient of your own — two or more real colour strings, because a gradient is painted rather than classed. Resolve tokens with `useCSSVariable` if that is where they come from.

Give each header in an app its own ramp. A gallery of profiles that all open on the same banner reads as one page that failed to change.

### At full screen, the cover needs the status bar

`variant="page"` runs the cover to the screen's edges, top included. Give `height` the safe-area inset on top of the band you want — `insets.top + 120` — or the gradient stops under the clock and the header opens with a strip of page above it.

The header draws nothing over the cover, so a full-screen profile needs its own way back. Put it in `PageHeader.Cover`'s children, or absolutely over the whole thing.

### It is the top of a scroll, so let people pull on it

A profile header is the first thing under the status bar and the thing people pull down on to see whether anything is new. Give the scroll it sits in a `RefreshControl` — the spinner appears above the cover, the header holds its place, and both settle back when the refresh resolves.

Tint the spinner from a token. The platform default is a mid grey that disappears against a dark cover.

The header does not own the scroll, so this is yours to wire — which is also what lets the same refresh cover the feed under it.

### Centred counts are measured, not just centred

A stacked row of counts under a centred name takes equal widths across the row rather than sitting at its content width.

Left to their content, the counts are centred as a block but not as figures: "Followers" is twice the width of "Posts", so the middle count sits off the centre line the name and the buttons are on. The row reads as very slightly wrong without it being obvious why.

---

Full page, with every example: https://panelui.dev/docs/components/page-header
