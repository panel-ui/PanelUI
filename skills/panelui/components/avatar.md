# Avatar

User image with an initials fallback, a badge overlay, and a stack for a group of them.

```tsx
import { Avatar } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { Avatar } from '@/components/ui/avatar';
```

### Anatomy

```tsx
<Avatar>
  <Avatar.Badge>…</Avatar.Badge>
</Avatar>

<Avatar.Group>
  <Avatar />
</Avatar.Group>
```

### Variants

- **size** — `sm`, `md` *(default)*, `lg`, `xl`

### Parts

- `Avatar.Badge` — Overlay pinned to the top-right — an unread count or a presence dot.
- `Avatar.Group` — A row of avatars, each overlapping the one after it, with the people who did not fit counted at the end.

### Props

#### `AvatarProps`

Extends `ViewProps, VariantProps<typeof avatarVariants>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `source` | `ImageSourcePropType` | — | Image source; falls back to initials when missing or on load error. |
| `fallback` | `string` | — | Fallback text, e.g. initials ("KA"). |
| `imageProps` | `Omit<ImageProps, 'source'>` | — | — |

#### `AvatarBadgeProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

#### `AvatarGroupProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `size` | `AvatarSizeName` | `md` | Size for every avatar in the stack. A child's own `size` still wins. |
| `max` | `number` | — | How many faces to show. The rest are counted into a trailing `+N`. It caps the faces, not the row: `max={3}` with five people shows three avatars and a `+2`. |
| `total` | `number` | — | How many people there are, when the children are only the first few of them. The count is measured against this instead of against the number of children, so a stack of three out of forty reads `+37`. |
| `overlap` | `number` | — | Points each avatar slides under the one before it. Defaults to a third of the size. |

### Example — Image with an initials fallback

The fallback shows while the image is missing **and** if it fails to load, so a dead URL never leaves an empty circle.

```tsx
<Avatar source={{ uri: user.avatarUrl }} fallback="KA" />

{/* No source at all — straight to initials. */}
<Avatar fallback="OL" />
```

### Notes

When an image fails, Avatar shows the fallback for that exact source. Changing the URI, request headers, or asset retries with the new source; a consumer `imageProps.onError` is called after the fallback state is secured.

A plain avatar renders as one clipped node. Adding children wraps it in an unclipped container so a corner badge is not cut in half by the circular mask.

`Avatar.Group` keeps people in the order they were written and exposes each visible person, followed by the `+N` overflow summary, as a list item. Explicit stacking order puts the first face on top without reversing assistive-technology traversal. This logical order is preserved in both LTR and RTL layouts.

Each face in a group gets a ring in the page background, so the stack reads as separate people on any surface. The fill behind the initials is opaque for the same reason: a face that slides over another hides it rather than letting it show through. Pass `overlap` to change how far they slide under each other — `0` closes the stack up into a plain row.

---

Full page, with every example: https://panelui.dev/docs/components/avatar
