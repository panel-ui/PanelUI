# Leaderboard

Entries ranked by a value, with the top three on a podium.

```tsx
import { Leaderboard } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { Leaderboard } from '@/components/ui/leaderboard';
```

### Usage

```tsx
<Leaderboard
  data={[
    { id: 'maya', name: 'Maya Chen', value: 84210, change: 2 },
    { id: 'omar', name: 'Omar Haddad', value: 79655 },
    { id: 'lena', name: 'Lena Brandt', value: 71038, change: -1 },
    { id: 'sam', name: 'Sam Okafor', value: 66402, change: 1 },
    { id: 'ines', name: 'Inès Moreau', value: 61987, change: -2 },
  ]}
  unit="steps"
/>
```

### Props

#### `LeaderboardProps`

Extends `Omit<ViewProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `data` | `readonly LeaderboardEntry[]` | **required** | The entries, in any order. Places are worked out from `value`. |
| `podium` | `LeaderboardPodium` | `bars` | How the top three are drawn. `bars` stands them on a podium whose bars are scaled to their values; `cards` gives each a card, with first raised between the other two; `none` puts everyone in the list. |
| `order` | `'desc' \| 'asc'` | `desc` | `desc` ranks the highest value first. `asc` ranks the lowest first, for a time or a golf score. |
| `podiumScale` | `'value' \| 'rank'` | `value` | What the podium bar heights follow. `value` draws each against the leader's value; `rank` steps them by place. Always `rank` when `order` is `asc`, where the winning value is the smallest. |
| `podiumHeight` | `number` | `132` | Height of the tallest podium bar, in points. |
| `limit` | `number` | — | Show at most this many entries, podium included. |
| `highlightId` | `string` | — | The entry to mark — usually the person looking at the board. Their row is tinted, and if `limit` cuts them off it is pinned at the bottom with their real place. |
| `formatValue` | `(value: number) => string` | `(value: number) => value.toLocaleString('en-US')` | Turns a value into its label. Defaults to grouped digits: 12,480. |
| `unit` | `string` | — | Word read after the value by a screen reader, e.g. "points". |
| `onPressEntry` | `(entry: LeaderboardEntry, rank: number) => void` | — | Makes every row and podium place pressable. |
| `emptyText` | `string` | `No entries yet` | Shown when `data` has nothing to rank. |

### Example — Podium bars to scale

The default podium. Each bar is drawn against the leader's value, so a close race looks close and a runaway looks like one. A floor keeps third place visible as a bar when the leader is far ahead. Set `podiumScale="rank"` to step the heights by place instead.

```tsx
<Leaderboard data={walkers} unit="steps" podiumHeight={140} />
```

### Notes

### Accessibility

Each podium place and each row is a single accessible element, read as one sentence: "Rank 2, Omar Haddad, 79,655 steps, up 1 place". A tie adds "tied" after the rank. Pass `unit` so the value is read with what it counts; without it, the reader hears a bare number.

### Reduced motion

The podium bars grow on mount, third place first and the leader last. With reduce motion on, they are drawn at full height straight away.

### Colour

The podium uses the theme's primary colour at three strengths rather than gold, silver and bronze. Fixed medal colours would clash with most of the themes, and the place is already shown by the number on the bar.

---

Full page, with every example: https://panelui.dev/docs/components/leaderboard
