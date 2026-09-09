import {
  AlertCircleIcon,
  ArrowUpIcon,
  CalendarIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  EllipsisIcon,
  FileIcon,
  GripVerticalIcon,
  ImageIcon,
  InboxIcon,
  MapPinIcon,
  MicIcon,
  MinusIcon,
  PlusIcon,
  SearchIcon,
  StarIcon,
  UserRoundIcon,
  XIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import {
  Accent,
  AccentBar,
  Bar,
  Chartlet,
  Fill,
  Glyph,
  Plate,
  Row,
  Stack,
} from '@/components/wireframe';

/**
 * One wireframe per component, for the gallery on the components index.
 *
 * Every one is built from the six primitives in `wireframe.tsx` — see the note
 * there for why these are drawn rather than captured or rendered. The rule
 * within a card is that it shows the component's **silhouette**, not its
 * content: the reader is deciding whether this is the shape they need, and at
 * this size the shape is all that survives.
 *
 * Two things keep a hundred and sixteen of them looking like one set. Nothing
 * picks a colour — tone comes from the primitives, which read in both themes
 * with no override. And a card has at most one `Accent`, on the component's
 * primary control, so the eye lands on the part that is the point.
 *
 * Adding a component? Add a thumbnail here under the same key as its slug in
 * `scripts/meta.json`. A slug with no entry renders an empty panel, which is
 * ugly rather than broken — the grid keeps working while the drawing is
 * outstanding.
 */

/* -------------------------------------------------------------------------- */
/* Actions                                                                    */
/* -------------------------------------------------------------------------- */

const button = (
  <Accent className="grid h-9 w-28 place-items-center rounded-lg">
    <AccentBar className="w-12" />
  </Accent>
);

const buttonGroup = (
  <Plate className="w-44 flex-row overflow-hidden">
    <div className="flex flex-1 items-center justify-center py-2.5">
      <Bar className="w-8" />
    </div>
    <div className="flex flex-1 items-center justify-center border-x border-fd-border bg-fd-muted-foreground/10 py-2.5">
      <Bar className="w-8" />
    </div>
    <div className="flex flex-1 items-center justify-center py-2.5">
      <Bar className="w-8" />
    </div>
  </Plate>
);

const chip = (
  <Row className="flex-wrap justify-center">
    <Accent className="grid h-7 w-16 place-items-center rounded-full">
      <AccentBar className="w-7" />
    </Accent>
    <Fill className="flex h-7 w-20 items-center justify-center rounded-full">
      <Bar className="w-9" faint />
    </Fill>
    <Fill className="flex h-7 w-14 items-center justify-center rounded-full">
      <Bar className="w-6" faint />
    </Fill>
  </Row>
);

const contextMenu = (
  <div className="relative w-44">
    <Fill className="h-14 w-full rounded-xl" />
    <Plate className="absolute -bottom-6 end-2 w-32 gap-2.5 p-2.5">
      {[0, 1, 2].map((i) => (
        <Row key={i}>
          <Glyph icon={EllipsisIcon} className="size-3" />
          <Bar className="flex-1" faint />
        </Row>
      ))}
    </Plate>
  </div>
);

const fab = (
  <div className="relative h-28 w-40">
    <Stack className="pt-2">
      <Bar className="w-24" faint />
      <Bar className="w-32" faint />
      <Bar className="w-20" faint />
    </Stack>
    <Accent className="absolute bottom-0 end-0 grid size-12 place-items-center rounded-full">
      <PlusIcon className="size-5 text-fd-primary-foreground/80" />
    </Accent>
  </div>
);

const menu = (
  <Plate className="w-40 gap-3 p-3">
    {[InboxIcon, StarIcon, FileIcon, XIcon].map((icon, i) => (
      <Row key={i}>
        <Glyph icon={icon} className="size-3.5" />
        <Bar className="flex-1" faint />
      </Row>
    ))}
  </Plate>
);

/* A pill rail with the thumb partway along it — the position is the silhouette. */
const slideButton = (
  <Fill className="relative h-11 w-36 rounded-full">
    <Accent className="absolute start-[58%] top-1 h-9 w-9 rounded-full" />
  </Fill>
);

const progressButton = (
  <div className="relative h-9 w-32 overflow-hidden rounded-lg bg-fd-muted-foreground/15">
    <Accent className="absolute inset-y-0 start-0 w-2/3 rounded-none" />
  </div>
);

const selectionMode = (
  <Stack className="w-44">
    {[true, false, true].map((checked, i) => (
      <Row key={i}>
        {checked ? (
          <Accent className="grid size-4 shrink-0 place-items-center rounded">
            <CheckIcon className="size-3 text-fd-primary-foreground" />
          </Accent>
        ) : (
          <Fill className="size-4 shrink-0 rounded" />
        )}
        <Bar className="flex-1" faint />
      </Row>
    ))}
  </Stack>
);

const swipe = (
  <Row className="w-44 gap-0 overflow-hidden rounded-xl">
    <Plate className="w-32 shrink-0 gap-2 rounded-e-none p-3">
      <Bar className="w-16" />
      <Bar className="w-24" faint />
    </Plate>
    <div className="flex h-[58px] flex-1 items-center justify-center bg-fd-muted-foreground/25">
      <Glyph icon={XIcon} className="size-3.5" />
    </div>
  </Row>
);

const toggleButton = (
  <Row>
    <Accent className="grid size-10 place-items-center rounded-lg">
      <StarIcon className="size-4 text-fd-primary-foreground" />
    </Accent>
    <Fill className="grid size-10 place-items-center rounded-lg">
      <Glyph icon={StarIcon} />
    </Fill>
  </Row>
);

/* -------------------------------------------------------------------------- */
/* Forms and input                                                            */
/* -------------------------------------------------------------------------- */

const monthGrid = (accent = 12) => (
  <div className="grid grid-cols-7 gap-1.5">
    {Array.from({ length: 28 }, (_, i) =>
      i === accent ? (
        <Accent key={i} className="size-2 rounded-full" />
      ) : (
        <div key={i} className="size-2 rounded-full bg-fd-muted-foreground/22" />
      )
    )}
  </div>
);

const calendar = (
  <Plate className="gap-3 p-3">
    <Row className="justify-between">
      <Glyph icon={ChevronLeftIcon} className="size-3" />
      <Bar className="w-12" />
      <Glyph icon={ChevronRightIcon} className="size-3" />
    </Row>
    {monthGrid()}
  </Plate>
);

const checkbox = (
  <Stack className="w-40">
    {[true, false, false].map((checked, i) => (
      <Row key={i}>
        {checked ? (
          <Accent className="grid size-4 shrink-0 place-items-center rounded">
            <CheckIcon className="size-3 text-fd-primary-foreground" />
          </Accent>
        ) : (
          <div key={i} className="size-4 shrink-0 rounded border border-fd-muted-foreground/35" />
        )}
        <Bar className="flex-1" faint />
      </Row>
    ))}
  </Stack>
);

const colorPicker = (
  <Stack className="w-36">
    <div className="relative h-20 rounded-lg bg-gradient-to-br from-fd-muted-foreground/10 via-fd-primary/50 to-fd-foreground/70">
      <div className="absolute end-4 top-4 size-3 rounded-full border-2 border-white shadow" />
    </div>
    <div className="h-2.5 rounded-full bg-gradient-to-r from-fd-muted-foreground/30 via-fd-primary/60 to-fd-muted-foreground/30" />
  </Stack>
);

const field = (
  <Stack className="w-44 gap-1.5">
    <Bar className="w-14" />
    <Plate className="h-9 justify-center px-3">
      <Bar className="w-20" faint />
    </Plate>
    <Bar className="w-28" faint />
  </Stack>
);

const combobox = (
  <Stack className="w-40 gap-1.5">
    <Plate className="h-9 flex-row items-center gap-2 px-3">
      <Bar className="flex-1" faint />
      <Glyph icon={ChevronDownIcon} className="size-3" />
    </Plate>
    <Plate className="gap-2.5 p-2.5">
      <Bar className="w-24" />
      <Bar className="w-20" faint />
      <Bar className="w-28" faint />
    </Plate>
  </Stack>
);

const datePicker = (
  <Stack className="w-40 gap-1.5">
    <Plate className="h-9 flex-row items-center gap-2 px-3">
      <Glyph icon={CalendarIcon} className="size-3.5" />
      <Bar className="w-16" faint />
    </Plate>
    <Plate className="p-3">{monthGrid(9)}</Plate>
  </Stack>
);

const dateTimePicker = (
  <Stack className="w-40 gap-1.5">
    <Plate className="p-3">{monthGrid(16)}</Plate>
    <Plate className="h-8 flex-row items-center justify-center gap-2 px-3">
      <Bar className="w-6" />
      <Bar className="w-1" />
      <Bar className="w-6" />
    </Plate>
  </Stack>
);

const form = (
  <Stack className="w-44 gap-3">
    {[0, 1].map((i) => (
      <Stack key={i} className="gap-1.5">
        <Bar className="w-12" />
        <Plate className="h-8" />
      </Stack>
    ))}
    <Accent className="grid h-8 w-full place-items-center rounded-lg">
      <AccentBar className="w-12" />
    </Accent>
  </Stack>
);

const input = (
  <Plate className="h-10 w-44 flex-row items-center gap-2 px-3">
    <Bar className="w-20" faint />
    <div className="h-4 w-px bg-fd-primary" />
  </Plate>
);

const inputGroup = (
  <Plate className="h-10 w-48 flex-row items-center overflow-hidden">
    <div className="flex h-full items-center border-e border-fd-border bg-fd-muted-foreground/10 px-3">
      <Bar className="w-5" faint />
    </div>
    <div className="flex flex-1 px-3">
      <Bar className="w-16 self-center" faint />
    </div>
    <Accent className="grid h-full w-10 place-items-center rounded-none">
      <Glyph icon={SearchIcon} className="size-3.5 text-fd-primary-foreground/70" />
    </Accent>
  </Plate>
);

const label = (
  <Stack className="w-40 gap-1.5">
    <Row className="gap-1">
      <Bar className="w-14" />
      <div className="size-1 rounded-full bg-fd-primary" />
    </Row>
    <Plate className="h-9" />
  </Stack>
);

const markdownEditor = (
  <Plate className="w-44 overflow-hidden">
    <Row className="gap-3 border-b border-fd-border px-3 py-2">
      <Bar className="w-3" />
      <Bar className="w-3" />
      <Bar className="w-3" />
      <Bar className="w-3" faint />
    </Row>
    <Stack className="gap-2 p-3">
      <Bar className="w-20" />
      <Bar className="w-full" faint />
      <Bar className="w-28" faint />
    </Stack>
  </Plate>
);

const numberInput = (
  <Plate className="h-10 w-40 flex-row items-center overflow-hidden">
    <div className="grid h-full w-9 place-items-center border-e border-fd-border">
      <Glyph icon={MinusIcon} className="size-3.5" />
    </div>
    <div className="flex flex-1 justify-center">
      <Bar className="w-6" />
    </div>
    <div className="grid h-full w-9 place-items-center border-s border-fd-border">
      <Glyph icon={PlusIcon} className="size-3.5" />
    </div>
  </Plate>
);

const otpInput = (
  <Row className="gap-1.5">
    {[0, 1, 2, 3, 4, 5].map((i) => (
      <Plate key={i} className="size-8 items-center justify-center rounded-lg">
        {i < 3 ? <Bar className="w-2.5" /> : null}
      </Plate>
    ))}
  </Row>
);

const questionnaire = (
  <Stack className="w-44">
    <div className="h-1 w-full overflow-hidden rounded-full bg-fd-muted-foreground/15">
      <Accent className="h-full w-2/5 rounded-none" />
    </div>
    <Bar className="w-32" />
    {[true, false, false].map((picked, i) =>
      picked ? (
        <Plate key={i} className="h-8 flex-row items-center gap-2 border-fd-primary/50 px-3">
          <Accent className="size-3 rounded-full" />
          <Bar className="w-16" faint />
        </Plate>
      ) : (
        <Plate key={i} className="h-8 flex-row items-center gap-2 px-3">
          <div className="size-3 rounded-full border border-fd-muted-foreground/35" />
          <Bar className="w-20" faint />
        </Plate>
      )
    )}
  </Stack>
);

const radioGroup = (
  <Stack className="w-40">
    {[true, false, false].map((picked, i) => (
      <Row key={i}>
        {picked ? (
          <div className="grid size-4 shrink-0 place-items-center rounded-full border-2 border-fd-primary">
            <div className="size-1.5 rounded-full bg-fd-primary" />
          </div>
        ) : (
          <div className="size-4 shrink-0 rounded-full border border-fd-muted-foreground/35" />
        )}
        <Bar className="flex-1" faint />
      </Row>
    ))}
  </Stack>
);

const rating = (
  <Row className="gap-1.5">
    {[0, 1, 2, 3, 4].map((i) => (
      <StarIcon
        key={i}
        className={
          i < 3
            ? 'size-6 fill-fd-primary text-fd-primary'
            : 'size-6 text-fd-muted-foreground/30'
        }
      />
    ))}
  </Row>
);

const searchBar = (
  <Row className="w-48 gap-2">
    <Plate className="h-10 flex-1 flex-row items-center gap-2 rounded-full px-3.5">
      <Glyph icon={SearchIcon} className="size-3.5" />
      <Bar className="flex-1" faint />
      <div className="grid size-4 shrink-0 place-items-center rounded-full bg-fd-muted-foreground/25">
        <XIcon className="size-2.5 text-fd-card" />
      </div>
    </Plate>
    <Bar className="w-10 shrink-0" />
  </Row>
);

const select = (
  <Stack className="w-40 gap-1.5">
    <Plate className="h-9 flex-row items-center justify-between px-3">
      <Bar className="w-16" />
      <Glyph icon={ChevronDownIcon} className="size-3" />
    </Plate>
    <Plate className="gap-2.5 p-2.5">
      <Row>
        <Glyph icon={CheckIcon} className="size-3 text-fd-primary" />
        <Bar className="w-20" />
      </Row>
      <Bar className="ms-5 w-24" faint />
      <Bar className="ms-5 w-16" faint />
    </Plate>
  </Stack>
);

const signature = (
  <Plate className="w-44 items-center justify-center p-4">
    <svg viewBox="0 0 120 40" className="w-full text-fd-muted-foreground/60" fill="none">
      <path
        d="M4 30c10-18 16 6 24-4s10-18 18-12 8 22 18 14 12-18 22-14 10 12 10 12"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  </Plate>
);

const slider = (
  <div className="w-44">
    <div className="relative h-1.5 rounded-full bg-fd-muted-foreground/15">
      <Accent className="absolute inset-y-0 start-0 w-3/5 rounded-full" />
      <div className="absolute start-3/5 top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-fd-primary bg-fd-card shadow" />
    </div>
  </div>
);

const switchThumb = (
  <Stack className="items-center">
    <div className="flex h-6 w-11 items-center justify-end rounded-full bg-fd-primary px-0.5">
      <div className="size-5 rounded-full bg-white shadow" />
    </div>
    <div className="flex h-6 w-11 items-center rounded-full bg-fd-muted-foreground/20 px-0.5">
      <div className="size-5 rounded-full bg-white shadow" />
    </div>
  </Stack>
);

const tagInput = (
  <Plate className="w-44 flex-row flex-wrap items-center gap-1.5 p-2">
    {['w-8', 'w-11'].map((width) => (
      <Row key={width} className="gap-1 rounded-md bg-fd-muted-foreground/15 px-2 py-1">
        <Bar className={width} faint />
        <XIcon className="size-2.5 text-fd-muted-foreground/60" />
      </Row>
    ))}
    <div className="h-4 w-px bg-fd-primary" />
  </Plate>
);

const textarea = (
  <Plate className="w-44 gap-2 p-3">
    <Bar className="w-full" faint />
    <Bar className="w-full" faint />
    <Bar className="w-24" faint />
    <Bar className="w-full" faint />
    <Bar className="w-16" faint />
  </Plate>
);

/** Three miniature screens — light, dark, and the one that follows the device. */
const themeSelector = (
  <Row className="items-end gap-2.5">
    <div className="flex h-14 w-11 shrink-0 flex-col gap-1 rounded-lg border-2 border-fd-primary bg-white p-1.5">
      <div className="h-1 w-6 rounded-full bg-zinc-400" />
      <div className="h-1 w-full rounded-full bg-zinc-300" />
      <div className="h-1 w-7 rounded-full bg-zinc-300" />
    </div>
    <div className="flex h-14 w-11 shrink-0 flex-col gap-1 rounded-lg border border-fd-border bg-zinc-900 p-1.5">
      <div className="h-1 w-6 rounded-full bg-zinc-500" />
      <div className="h-1 w-full rounded-full bg-zinc-700" />
      <div className="h-1 w-7 rounded-full bg-zinc-700" />
    </div>
    {/* The one that follows the device: half of each. Both halves carry rows,
        because a bare white half vanishes into a light card and a bare dark
        half vanishes into a dark one — and either way the tile reads as
        narrower than the two beside it. */}
    <div className="flex h-14 w-11 shrink-0 overflow-hidden rounded-lg border border-fd-border">
      <div className="flex flex-1 flex-col gap-1 bg-white p-1.5">
        <div className="h-1 w-3 rounded-full bg-zinc-400" />
        <div className="h-1 w-full rounded-full bg-zinc-300" />
        <div className="h-1 w-2.5 rounded-full bg-zinc-300" />
      </div>
      <div className="flex flex-1 flex-col gap-1 bg-zinc-900 p-1.5">
        <div className="h-1 w-3 rounded-full bg-zinc-500" />
        <div className="h-1 w-full rounded-full bg-zinc-700" />
        <div className="h-1 w-2.5 rounded-full bg-zinc-700" />
      </div>
    </div>
  </Row>
);

const timePicker = (
  <Plate className="w-40 flex-row justify-around overflow-hidden py-2">
    {[0, 1, 2].map((column) => (
      <Stack key={column} className="items-center gap-2">
        <Bar className="w-5" faint />
        <Bar className="w-6" />
        <Bar className="w-5" faint />
      </Stack>
    ))}
  </Plate>
);

/* -------------------------------------------------------------------------- */
/* Overlays                                                                   */
/* -------------------------------------------------------------------------- */

/** A phone-shaped ground, for the overlays that are about *where* they land. */
function Screen({ children }: { children?: ReactNode }) {
  return (
    <div className="relative h-32 w-24 overflow-hidden rounded-xl border border-fd-border bg-fd-card">
      {children}
    </div>
  );
}

const bottomSheet = (
  <Screen>
    <Stack className="gap-1.5 p-2.5">
      <Bar className="w-12" faint />
      <Bar className="w-16" faint />
    </Stack>
    <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 rounded-t-xl border-t border-fd-border bg-fd-muted p-3 shadow-[0_-4px_12px_rgb(0_0_0/0.06)]">
      <div className="mx-auto h-1 w-8 rounded-full bg-fd-muted-foreground/35" />
      <Bar className="w-14" />
      <Bar className="w-full" faint />
      <Bar className="w-12" faint />
    </div>
  </Screen>
);

/*
 * The nesting is the whole component, so the thumbnail is the nesting: a well
 * inside a rounded shell, with the two actions in the band under it.
 */
const feedback = (
  <Screen>
    <div className="absolute inset-0 bg-fd-foreground/25" />
    <div className="absolute inset-x-2.5 top-1/2 -translate-y-1/2 rounded-[10px] bg-fd-muted p-1">
      <Plate className="gap-1.5 rounded-[7px] p-2">
        <Bar className="w-14" />
        <Bar className="w-full" faint />
        <Bar className="w-10" faint />
      </Plate>
      <Row className="mt-1.5 justify-center gap-1.5 px-2">
        <Fill className="flex h-4 flex-1 items-center justify-center rounded-full">
          <Bar className="w-3" faint />
        </Fill>
        <Accent className="grid h-4 flex-1 place-items-center rounded-full">
          <AccentBar className="w-3" />
        </Accent>
      </Row>
    </div>
  </Screen>
);

const dialog = (
  <Screen>
    <div className="absolute inset-0 bg-fd-foreground/25" />
    <Plate className="absolute inset-x-2.5 top-1/2 -translate-y-1/2 gap-2 p-3">
      <Bar className="w-12" />
      <Bar className="w-full" faint />
      <Row className="mt-1 justify-end gap-1.5">
        <Fill className="flex h-4 w-7 items-center justify-center">
          <Bar className="w-3" faint />
        </Fill>
        <Accent className="grid h-4 w-7 place-items-center">
          <AccentBar className="w-3" />
        </Accent>
      </Row>
    </Plate>
  </Screen>
);

const drawer = (
  <Screen>
    <div className="absolute inset-0 bg-fd-foreground/25" />
    <div className="absolute inset-y-0 start-0 flex w-16 flex-col gap-2 border-e border-fd-border bg-fd-muted p-2.5">
      <Bar className="w-10" />
      <Bar className="w-full" faint />
      <Bar className="w-8" faint />
      <Bar className="w-11" faint />
    </div>
  </Screen>
);

const popover = (
  <div className="flex flex-col items-center">
    <Plate className="w-36 gap-2 p-3">
      <Bar className="w-16" />
      <Bar className="w-full" faint />
      <Bar className="w-20" faint />
    </Plate>
    <div className="-mt-1.5 size-3 rotate-45 border-b border-e border-fd-border bg-fd-card" />
    <Fill className="mt-3 h-7 w-20" />
  </div>
);

const toast = (
  <Plate className="w-48 flex-row items-center gap-2.5 p-3">
    <div className="size-2 shrink-0 rounded-full bg-fd-primary" />
    <Stack className="flex-1 gap-1.5">
      <Bar className="w-20" />
      <Bar className="w-full" faint />
    </Stack>
    <Glyph icon={XIcon} className="size-3" />
  </Plate>
);

const tooltip = (
  <div className="flex flex-col items-center">
    <div className="flex items-center rounded-md bg-fd-foreground px-2.5 py-1.5">
      <div className="h-1.5 w-12 rounded-full bg-fd-background/70" />
    </div>
    <div className="-mt-1 size-2 rotate-45 bg-fd-foreground" />
    <Fill className="mt-3 size-8 rounded-full" />
  </div>
);

/* -------------------------------------------------------------------------- */
/* Navigation                                                                 */
/* -------------------------------------------------------------------------- */

const breadcrumb = (
  <Row className="gap-1.5">
    <Bar className="w-8" faint />
    <Glyph icon={ChevronRightIcon} className="size-3" />
    <Bar className="w-12" faint />
    <Glyph icon={ChevronRightIcon} className="size-3" />
    <Bar className="w-10" />
  </Row>
);

const pagination = (
  <Row className="gap-1.5">
    <Glyph icon={ChevronLeftIcon} className="size-3.5" />
    <Fill className="grid size-7 place-items-center">
      <Bar className="w-2" faint />
    </Fill>
    <Accent className="grid size-7 place-items-center">
      <div className="h-1.5 w-2 rounded-full bg-fd-primary-foreground/70" />
    </Accent>
    <Fill className="grid size-7 place-items-center">
      <Bar className="w-2" faint />
    </Fill>
    <Glyph icon={ChevronRightIcon} className="size-3.5" />
  </Row>
);

/*
 * It floats: the rail is pinned to the edge and the page runs underneath it,
 * so the two need visible daylight between them or the card reads as a list
 * with something wrong at the end of it.
 */
const sectionRail = (
  <div className="flex w-44 items-center gap-5">
    <Stack className="flex-1 gap-2">
      <Bar className="w-full" faint />
      <Bar className="w-20" faint />
      <Bar className="w-full" faint />
      <Bar className="w-24" faint />
      <Bar className="w-16" faint />
    </Stack>
    <Stack className="items-end gap-2">
      <div className="h-1 w-2.5 rounded-full bg-fd-muted-foreground/25" />
      <div className="h-1 w-4 rounded-full bg-fd-muted-foreground/35" />
      <div className="h-1 w-7 rounded-full bg-fd-primary" />
      <div className="h-1 w-4 rounded-full bg-fd-muted-foreground/35" />
      <div className="h-1 w-2.5 rounded-full bg-fd-muted-foreground/25" />
    </Stack>
  </div>
);

const sectionProgress = (
  <Stack className="w-44 items-center gap-3">
    <Stack className="w-full gap-2">
      <Bar className="w-full" faint />
      <Bar className="w-24" faint />
      <Bar className="w-full" faint />
      <Bar className="w-16" faint />
    </Stack>
    {/* The pill: a ring part-filled, and the section it names. */}
    <Plate className="h-7 flex-row items-center gap-2 rounded-full px-2.5">
      <div className="size-3.5 rounded-full border-2 border-fd-muted-foreground/25 border-l-fd-primary border-t-fd-primary" />
      <Bar className="w-12" />
    </Plate>
  </Stack>
);

const sortable = (
  <Stack className="w-40">
    <Plate className="h-8 flex-row items-center gap-2 px-2">
      <Glyph icon={GripVerticalIcon} className="size-3.5" />
      <Bar className="flex-1" faint />
    </Plate>
    <Plate className="h-8 translate-x-2 flex-row items-center gap-2 border-fd-primary/40 px-2 shadow-md">
      <Glyph icon={GripVerticalIcon} className="size-3.5" />
      <Bar className="flex-1" />
    </Plate>
    <Plate className="h-8 flex-row items-center gap-2 px-2">
      <Glyph icon={GripVerticalIcon} className="size-3.5" />
      <Bar className="flex-1" faint />
    </Plate>
  </Stack>
);

const steps = (
  <div className="flex w-44 items-center">
    {[0, 1, 2].map((i) => (
      <div key={i} className="flex flex-1 items-center last:flex-none">
        {i < 2 ? (
          <Accent className="grid size-6 shrink-0 place-items-center rounded-full">
            <CheckIcon className="size-3.5 text-fd-primary-foreground" />
          </Accent>
        ) : (
          <div className="size-6 shrink-0 rounded-full border-2 border-fd-muted-foreground/30" />
        )}
        {i < 2 ? (
          <div
            className={`h-0.5 flex-1 ${i === 0 ? 'bg-fd-primary' : 'bg-fd-muted-foreground/20'}`}
          />
        ) : null}
      </div>
    ))}
  </div>
);

const tabs = (
  <Stack className="w-44 gap-3">
    <Row className="gap-1 rounded-lg bg-fd-muted-foreground/12 p-1">
      <div className="flex flex-1 justify-center rounded-md bg-fd-card py-1.5 shadow-sm">
        <Bar className="w-8" />
      </div>
      <div className="flex flex-1 justify-center py-1.5">
        <Bar className="w-8" faint />
      </div>
      <div className="flex flex-1 justify-center py-1.5">
        <Bar className="w-8" faint />
      </div>
    </Row>
    <Stack className="gap-1.5">
      <Bar className="w-full" faint />
      <Bar className="w-28" faint />
    </Stack>
  </Stack>
);

const tour = (
  <Screen>
    <Stack className="gap-1.5 p-2.5">
      <Bar className="w-12" faint />
      <Bar className="w-16" faint />
    </Stack>
    <div className="absolute inset-0 bg-fd-foreground/25" />
    <div className="absolute end-2.5 top-2.5 size-8 rounded-full border-2 border-fd-primary bg-fd-card" />
    <Plate className="absolute inset-x-2.5 bottom-4 gap-1.5 p-2.5">
      <Bar className="w-10" />
      <Bar className="w-full" faint />
    </Plate>
  </Screen>
);

const tree = (
  <Stack className="w-40 gap-2.5">
    <Row>
      <Glyph icon={ChevronDownIcon} className="size-3" />
      <Bar className="w-16" />
    </Row>
    <Row className="ms-4">
      <Glyph icon={ChevronRightIcon} className="size-3" />
      <Bar className="w-20" faint />
    </Row>
    <Row className="ms-4">
      <Glyph icon={ChevronDownIcon} className="size-3" />
      <Bar className="w-14" faint />
    </Row>
    <Row className="ms-8">
      <Glyph icon={FileIcon} className="size-3" />
      <Bar className="w-16" faint />
    </Row>
  </Stack>
);

/* -------------------------------------------------------------------------- */
/* Layout and structure                                                       */
/* -------------------------------------------------------------------------- */

const accordion = (
  <Plate className="w-44 divide-y divide-fd-border overflow-hidden">
    <Row className="justify-between p-3">
      <Bar className="w-20" />
      <Glyph icon={ChevronDownIcon} className="size-3" />
    </Row>
    <Stack className="gap-2 p-3">
      <Row className="justify-between">
        <Bar className="w-16" />
        <ChevronDownIcon className="size-3 rotate-180 text-fd-muted-foreground/70" />
      </Row>
      <Bar className="w-full" faint />
      <Bar className="w-24" faint />
    </Stack>
    <Row className="justify-between p-3">
      <Bar className="w-24" />
      <Glyph icon={ChevronDownIcon} className="size-3" />
    </Row>
  </Plate>
);

const card = (
  <Plate className="w-44 overflow-hidden">
    <Stack className="gap-2 p-3">
      <Bar className="w-20" />
      <Bar className="w-full" faint />
      <Bar className="w-28" faint />
    </Stack>
    <Row className="justify-end gap-1.5 border-t border-fd-border p-2.5">
      <Fill className="flex h-5 w-9 items-center justify-center">
        <Bar className="w-4" faint />
      </Fill>
      <Accent className="grid h-5 w-9 place-items-center">
        <AccentBar className="w-4" />
      </Accent>
    </Row>
  </Plate>
);

const carousel = (
  <Stack className="items-center gap-3">
    <Row className="gap-2">
      <Fill className="h-16 w-6 rounded-lg" />
      <Plate className="h-20 w-28" />
      <Fill className="h-16 w-6 rounded-lg" />
    </Row>
    <Row className="gap-1.5">
      <div className="size-1.5 rounded-full bg-fd-primary" />
      <div className="size-1.5 rounded-full bg-fd-muted-foreground/25" />
      <div className="size-1.5 rounded-full bg-fd-muted-foreground/25" />
    </Row>
  </Stack>
);

const collapsible = (
  <Stack className="w-44 gap-2.5">
    <Row className="justify-between">
      <Bar className="w-20" />
      <ChevronDownIcon className="size-3 rotate-180 text-fd-muted-foreground/70" />
    </Row>
    <Fill className="h-14 w-full rounded-lg" />
  </Stack>
);

const direction = (
  <Stack className="w-44 gap-4">
    <Row className="gap-2">
      <Glyph icon={ChevronRightIcon} className="size-3.5" />
      <Bar className="w-16" />
      <Bar className="w-8" faint />
    </Row>
    <Row className="justify-end gap-2">
      <Bar className="w-8" faint />
      <Bar className="w-16" />
      <Glyph icon={ChevronLeftIcon} className="size-3.5" />
    </Row>
  </Stack>
);

const frame = (
  <Plate className="w-44 gap-2 bg-fd-muted/60 p-2">
    <Row className="justify-between px-1">
      <Bar className="w-14" />
      <Bar className="w-6" faint />
    </Row>
    <Plate className="h-16 bg-fd-card" />
  </Plate>
);

const pageHeader = (
  <Plate className="w-44 overflow-hidden p-1.5">
    {/* The cover, held off the card's edges and rounded on its top corners. */}
    <Fill className="h-12 rounded-t-lg" />
    <Stack className="-mt-4 items-center gap-1.5 px-3 pb-2">
      <div className="size-8 rounded-full border-2 border-fd-card bg-fd-muted-foreground/25" />
      <Bar className="w-16" />
      <Bar className="w-20" faint />
      <Row className="gap-1.5 pt-1">
        <Fill className="flex h-5 w-14 items-center justify-center rounded-md">
          <Bar className="w-6" faint />
        </Fill>
        <Accent className="grid h-5 w-14 place-items-center rounded-md">
          <AccentBar className="w-6" />
        </Accent>
      </Row>
    </Stack>
  </Plate>
);

const gridItem = (
  <div className="grid w-40 grid-cols-2 gap-2">
    <Fill className="col-span-2 h-10 rounded-lg" />
    <Fill className="h-14 rounded-lg" />
    <Fill className="h-14 rounded-lg" />
  </div>
);

const item = (
  <Plate className="w-44 flex-row items-center gap-3 p-3">
    <Fill className="size-9 shrink-0 rounded-lg" />
    <Stack className="flex-1 gap-1.5">
      <Bar className="w-20" />
      <Bar className="w-full" faint />
    </Stack>
    <Glyph icon={ChevronRightIcon} className="size-3.5" />
  </Plate>
);

/*
 * Both states at once, which is the only way one still frame can say what this
 * does: the small title pinned on a ruled bar, and the large one still under
 * it with the list sliding up past both.
 */
const scrollHeader = (
  <Plate className="w-44 overflow-hidden p-0">
    <Row className="justify-between border-b border-fd-border px-3 py-2">
      <Bar className="w-12" />
      <Glyph icon={SearchIcon} className="size-3" />
    </Row>
    <Stack className="gap-1.5 px-3 pb-2 pt-2.5">
      <Bar className="h-2.5 w-24" />
      <Bar className="w-14" faint />
    </Stack>
    <Stack className="gap-2 px-3 pb-3 opacity-60">
      <Bar className="w-full" faint />
      <Bar className="w-32" faint />
      <Bar className="w-36" faint />
    </Stack>
  </Plate>
);

const scrollCanvas = (
  <div className="relative h-24 w-40 overflow-hidden rounded-xl border-2 border-dashed border-fd-muted-foreground/30 p-1.5">
    {/*
      The picture is taller than the frame and sits high in it, so the frame's
      own edge shows above and below — which is the whole of what a parallax
      frame looks like held still. Filled to the frame it is just a tile.
    */}
    <div className="relative h-full overflow-hidden rounded-lg">
      <div className="absolute -top-5 grid h-32 w-full place-items-center bg-fd-muted-foreground/20">
        <Glyph icon={ImageIcon} className="size-6" />
      </div>
    </div>
  </div>
);

/*
 * Widths written out rather than mapped from an array of numbers. Tailwind
 * generates the classes it can see in the source, and a class built at runtime
 * is a class that is not in the stylesheet.
 */
/*
 * Blurred at both ends rather than faded: the rows stay where they are and go
 * out of focus, which is the difference between this and ScrollFade and the
 * only thing the two thumbnails have to say apart from each other.
 */
const scrollBlur = (
  <Stack className="w-40 gap-2">
    <Row className="gap-2 blur-[2px]">
      <Bar className="w-full" faint />
    </Row>
    <Row className="gap-2 blur-[1px]">
      <Bar className="w-32" faint />
    </Row>
    <Bar className="w-36" faint />
    <Bar className="w-28" faint />
    <Bar className="w-36" faint />
    <Row className="gap-2 blur-[1px]">
      <Bar className="w-24" faint />
    </Row>
    <Row className="gap-2 blur-[2px]">
      <Bar className="w-32" faint />
    </Row>
  </Stack>
);

const scrollFade = (
  <Stack className="w-40 gap-2 [mask-image:linear-gradient(to_bottom,transparent,black_30%,black_70%,transparent)]">
    <Bar className="w-full" faint />
    <Bar className="w-32" faint />
    <Bar className="w-36" faint />
    <Bar className="w-28" faint />
    <Bar className="w-36" faint />
    <Bar className="w-24" faint />
    <Bar className="w-32" faint />
  </Stack>
);

const separator = (
  <Stack className="w-40 gap-3">
    <Bar className="w-28" faint />
    <div className="h-px w-full bg-fd-border" />
    <Bar className="w-20" faint />
    <Row className="gap-2">
      <div className="h-px flex-1 bg-fd-border" />
      <Bar className="w-6" faint />
      <div className="h-px flex-1 bg-fd-border" />
    </Row>
    <Bar className="w-24" faint />
  </Stack>
);

const splitView = (
  <div className="flex h-28 w-40 flex-col overflow-hidden rounded-xl border border-fd-border">
    <Stack className="flex-1 gap-2 p-2.5">
      <Bar className="w-14" />
      <Bar className="w-full" faint />
      <Bar className="w-20" faint />
    </Stack>
    <div className="flex justify-center border-y border-fd-border bg-fd-muted py-1.5">
      <div className="h-1 w-8 rounded-full bg-fd-muted-foreground/40" />
    </div>
    <Stack className="h-12 gap-2 bg-fd-muted/50 p-2.5">
      <Bar className="w-16" faint />
      <Bar className="w-24" faint />
    </Stack>
  </div>
);

const splitter = (
  <Row className="h-24 w-44 gap-0 overflow-hidden rounded-xl border border-fd-border">
    <Fill className="h-full flex-1 rounded-none" />
    <div className="flex h-full w-2.5 items-center justify-center bg-fd-muted-foreground/25">
      <div className="h-7 w-0.5 rounded-full bg-fd-muted-foreground/70" />
    </div>
    <Fill className="h-full flex-[2] rounded-none" />
  </Row>
);

/*
 * The rungs step in a tone taken from the muted foreground rather than from
 * the card and muted tokens. Those two are nearly the same colour in a dark
 * theme, so a ladder built out of them has three rungs in the light one and
 * one in the dark.
 */
const surface = (
  <Stack className="w-40 gap-2.5">
    {[
      ['bg-fd-muted-foreground/5 shadow-none', 'w-12'],
      ['bg-fd-muted-foreground/12 shadow-sm', 'w-16'],
      ['bg-fd-muted-foreground/22 shadow-md', 'w-20'],
    ].map(([tone, width]) => (
      <div
        key={tone}
        className={`flex h-9 items-center gap-2 rounded-xl border border-fd-border px-3 ${tone}`}
      >
        <div className="size-2 rounded-full bg-fd-muted-foreground/40" />
        <Bar className={width} faint />
      </div>
    ))}
  </Stack>
);

const typography = (
  <Stack className="w-40 gap-2.5">
    <div className="h-3 w-28 rounded-sm bg-fd-muted-foreground/50" />
    <div className="h-2.5 w-20 rounded-sm bg-fd-muted-foreground/45" />
    <Bar className="w-full" faint />
    <Bar className="w-full" faint />
    <Bar className="w-24" faint />
  </Stack>
);

/* -------------------------------------------------------------------------- */
/* Data                                                                       */
/* -------------------------------------------------------------------------- */

const flow = (
  <Chartlet className="max-w-44">
    <path d="M30 20h16M30 44h16M74 20h10v24H74" stroke="currentColor" strokeWidth="2" />
    <rect x="4" y="10" width="26" height="20" rx="5" fill="currentColor" opacity="0.3" />
    <rect x="4" y="34" width="26" height="20" rx="5" fill="currentColor" opacity="0.3" />
    <rect x="46" y="22" width="28" height="20" rx="5" fill="currentColor" opacity="0.55" />
    <rect x="90" y="22" width="26" height="20" rx="5" fill="currentColor" opacity="0.3" />
  </Chartlet>
);

const kpi = (
  <Plate className="w-44 gap-2 p-3">
    <Bar className="w-14" faint />
    <Row className="justify-between">
      <div className="h-4 w-16 rounded-sm bg-fd-muted-foreground/55" />
      <Row className="gap-0.5">
        <ArrowUpIcon className="size-3 text-fd-primary" />
        <div className="h-1.5 w-5 rounded-full bg-fd-primary/70" />
      </Row>
    </Row>
    <svg viewBox="0 0 100 20" className="w-full text-fd-primary/60" fill="none">
      <path d="M0 16 20 10 36 13 54 5 72 8 88 2 100 6" stroke="currentColor" strokeWidth="2" />
    </svg>
  </Plate>
);

const map = (
  <div className="relative h-24 w-40 overflow-hidden rounded-xl border border-fd-border bg-fd-muted/60">
    <svg viewBox="0 0 160 96" className="absolute inset-0 h-full w-full text-fd-muted-foreground/25" fill="none">
      <path d="M0 30h60l20 24h80M40 96V54l20-24" stroke="currentColor" strokeWidth="6" />
      <path d="M0 72h30l14-18" stroke="currentColor" strokeWidth="4" />
    </svg>
    <MapPinIcon className="absolute left-1/2 top-1/2 size-6 -translate-x-1/2 -translate-y-full fill-fd-primary/20 text-fd-primary" />
  </div>
);

const planner = (
  <div className="grid w-44 grid-cols-5 gap-1">
    {Array.from({ length: 5 }, (_, i) => (
      <Bar key={`h${i}`} className="w-full" />
    ))}
    {Array.from({ length: 15 }, (_, i) => {
      const filled = [1, 2, 6, 9, 12, 13].includes(i);
      const accent = i === 6;
      return (
        <div
          key={i}
          className={
            accent
              ? 'h-5 rounded bg-fd-primary/80'
              : filled
                ? 'h-5 rounded bg-fd-muted-foreground/25'
                : 'h-5 rounded bg-fd-muted-foreground/8'
          }
        />
      );
    })}
  </div>
);

const table = (
  <Plate className="w-48 overflow-hidden">
    <Row className="gap-3 border-b border-fd-border bg-fd-muted/60 px-3 py-2">
      <Bar className="flex-1" />
      <Bar className="w-8" />
      <Bar className="w-6" />
    </Row>
    {[0, 1, 2].map((i) => (
      <Row key={i} className="gap-3 border-b border-fd-border px-3 py-2 last:border-b-0">
        <Bar className="flex-1" faint />
        <Bar className="w-8" faint />
        <Bar className="w-6" faint />
      </Row>
    ))}
  </Plate>
);

const timeline = (
  <div className="flex w-44 gap-3">
    <div className="relative flex flex-col items-center">
      <Accent className="size-2.5 rounded-full" />
      <div className="w-0.5 flex-1 bg-fd-primary/50" />
      <div className="size-2.5 rounded-full bg-fd-muted-foreground/30" />
      <div className="w-0.5 flex-1 bg-fd-muted-foreground/20" />
      <div className="size-2.5 rounded-full bg-fd-muted-foreground/30" />
    </div>
    <Stack className="flex-1 gap-4 py-0.5">
      {[0, 1, 2].map((i) => (
        <Stack key={i} className="gap-1.5">
          <Bar className="w-16" />
          <Bar className="w-full" faint />
        </Stack>
      ))}
    </Stack>
  </div>
);

/* -------------------------------------------------------------------------- */
/* Charts                                                                     */
/*                                                                            */
/* One viewBox for all sixteen, so a bar in one is the same height as a bar   */
/* in the next and the row reads as a set rather than as sixteen drawings.    */
/* -------------------------------------------------------------------------- */

const areaChart = (
  <Chartlet>
    <path
      d="M4 46 24 30 44 38 64 18 84 26 116 10V60H4Z"
      fill="currentColor"
      opacity="0.35"
    />
    <path d="M4 46 24 30 44 38 64 18 84 26 116 10" stroke="currentColor" strokeWidth="2.5" />
  </Chartlet>
);

const barChart = (
  <Chartlet>
    {[24, 40, 18, 52, 34, 46].map((h, i) => (
      <rect
        key={i}
        x={6 + i * 19}
        y={60 - h}
        width="12"
        height={h}
        rx="3"
        fill="currentColor"
        opacity={i === 3 ? 0.85 : 0.4}
      />
    ))}
  </Chartlet>
);

const candlestickChart = (
  <Chartlet>
    {[
      [10, 20, 44],
      [28, 14, 40],
      [46, 24, 52],
      [64, 10, 34],
      [82, 22, 48],
      [100, 16, 38],
    ].map(([x, top, bottom], i) => (
      <g key={i} opacity={i % 2 ? 0.75 : 0.4}>
        <line x1={x} y1={top - 6} x2={x} y2={bottom + 6} stroke="currentColor" strokeWidth="2" />
        <rect x={x - 4} y={top} width="8" height={bottom - top} rx="2" fill="currentColor" />
      </g>
    ))}
  </Chartlet>
);

const funnelChart = (
  <Chartlet>
    {[
      [4, 112, 0.6],
      [14, 92, 0.48],
      [26, 68, 0.36],
      [38, 44, 0.26],
    ].map(([x, w, o], i) => (
      <rect key={i} x={x} y={6 + i * 14} width={w} height="10" rx="3" fill="currentColor" opacity={o} />
    ))}
  </Chartlet>
);

const heatmapChart = (
  <Chartlet>
    {Array.from({ length: 24 }, (_, i) => (
      <rect
        key={i}
        x={6 + (i % 8) * 14}
        y={10 + Math.floor(i / 8) * 15}
        width="11"
        height="12"
        rx="2.5"
        fill="currentColor"
        opacity={0.15 + ((i * 7) % 9) / 12}
      />
    ))}
  </Chartlet>
);

const hexChart = (
  <Chartlet>
    {[
      [30, 18],
      [50, 18],
      [70, 18],
      [40, 34],
      [60, 34],
      [80, 34],
      [50, 50],
      [70, 50],
    ].map(([cx, cy], i) => (
      <polygon
        key={i}
        points={Array.from({ length: 6 }, (_, k) => {
          const angle = (Math.PI / 3) * k - Math.PI / 6;
          return `${(cx + 9 * Math.cos(angle)).toFixed(1)},${(cy + 9 * Math.sin(angle)).toFixed(1)}`;
        }).join(' ')}
        fill="currentColor"
        opacity={0.2 + ((i * 3) % 7) / 10}
      />
    ))}
  </Chartlet>
);

const lineChart = (
  <Chartlet>
    <path
      d="M4 48 24 30 44 40 64 16 84 28 116 12"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    <path
      d="M4 56 24 50 44 54 64 42 84 48 116 40"
      stroke="currentColor"
      strokeWidth="2.5"
      opacity="0.4"
      strokeLinecap="round"
    />
  </Chartlet>
);

const liveLineChart = (
  <Chartlet>
    <path
      d="M4 44 20 36 34 48 48 26 62 38 76 20 90 32 104 14"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    <circle cx="104" cy="14" r="5" className="fill-fd-primary" />
    <circle cx="104" cy="14" r="9" className="fill-fd-primary" opacity="0.2" />
  </Chartlet>
);

const pieChart = (
  <Chartlet>
    <circle cx="60" cy="32" r="24" fill="currentColor" opacity="0.3" />
    <path d="M60 32V8a24 24 0 0 1 21 35Z" className="fill-fd-primary" opacity="0.85" />
    <path d="M60 32 39 44a24 24 0 0 1 0-24Z" fill="currentColor" opacity="0.55" />
  </Chartlet>
);

const plot = (
  <Chartlet>
    <path d="M12 6v48h100" stroke="currentColor" strokeWidth="2" opacity="0.4" />
    <path d="M18 44 40 30 62 36 84 18 108 24" stroke="currentColor" strokeWidth="2.5" />
    {[
      [18, 44],
      [40, 30],
      [62, 36],
      [84, 18],
      [108, 24],
    ].map(([cx, cy], i) => (
      <circle key={i} cx={cx} cy={cy} r="3" fill="currentColor" />
    ))}
  </Chartlet>
);

const polarAreaChart = (
  <Chartlet>
    {[
      [24, 0.8],
      [18, 0.55],
      [26, 0.35],
      [14, 0.6],
      [21, 0.4],
    ].map(([r, o], i) => {
      const a0 = (Math.PI * 2 * i) / 5 - Math.PI / 2;
      const a1 = (Math.PI * 2 * (i + 1)) / 5 - Math.PI / 2;
      const x0 = 60 + r * Math.cos(a0);
      const y0 = 32 + r * Math.sin(a0);
      const x1 = 60 + r * Math.cos(a1);
      const y1 = 32 + r * Math.sin(a1);
      return (
        <path
          key={i}
          d={`M60 32L${x0.toFixed(1)} ${y0.toFixed(1)}A${r} ${r} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}Z`}
          fill="currentColor"
          opacity={o}
        />
      );
    })}
  </Chartlet>
);

const radarChart = (
  <Chartlet>
    {[26, 17, 9].map((r) => (
      <polygon
        key={r}
        points={Array.from({ length: 5 }, (_, k) => {
          const angle = (Math.PI * 2 * k) / 5 - Math.PI / 2;
          return `${(60 + r * Math.cos(angle)).toFixed(1)},${(32 + r * Math.sin(angle)).toFixed(1)}`;
        }).join(' ')}
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.35"
      />
    ))}
    <polygon
      points={[24, 14, 22, 10, 19]
        .map((r, k) => {
          const angle = (Math.PI * 2 * k) / 5 - Math.PI / 2;
          return `${(60 + r * Math.cos(angle)).toFixed(1)},${(32 + r * Math.sin(angle)).toFixed(1)}`;
        })
        .join(' ')}
      className="fill-fd-primary"
      opacity="0.45"
    />
  </Chartlet>
);

const ringChart = (
  <Chartlet>
    {[
      [26, 0.72],
      [18, 0.48],
      [10, 0.85],
    ].map(([r, fraction], i) => {
      const circumference = 2 * Math.PI * r;
      return (
        <g key={r} transform="rotate(-90 60 32)">
          <circle cx="60" cy="32" r={r} stroke="currentColor" strokeWidth="6" opacity="0.2" />
          <circle
            cx="60"
            cy="32"
            r={r}
            className="stroke-fd-primary"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${(circumference * fraction).toFixed(1)} ${circumference.toFixed(1)}`}
            opacity={1 - i * 0.22}
          />
        </g>
      );
    })}
  </Chartlet>
);

const scatterChart = (
  <Chartlet>
    {[
      [18, 44],
      [30, 34],
      [26, 50],
      [44, 26],
      [52, 40],
      [64, 18],
      [70, 34],
      [82, 24],
      [92, 40],
      [100, 14],
      [40, 46],
      [78, 48],
    ].map(([cx, cy], i) => (
      <circle key={i} cx={cx} cy={cy} r="4" fill="currentColor" opacity={i % 3 ? 0.35 : 0.7} />
    ))}
  </Chartlet>
);

const pyramidChart = (
  <Chartlet>
    {[
      [30, 42],
      [46, 38],
      [22, 30],
      [14, 18],
    ].map(([left, right], i) => (
      <g key={i} opacity={i === 1 ? 0.8 : 0.4}>
        <rect x={60 - left} y={6 + i * 14} width={left} height="10" rx="2" fill="currentColor" />
        <rect x="64" y={6 + i * 14} width={right} height="10" rx="2" fill="currentColor" />
      </g>
    ))}
    <line x1="62" y1="4" x2="62" y2="62" stroke="currentColor" strokeWidth="1" opacity="0.35" />
  </Chartlet>
);

const bubbleChart = (
  <Chartlet>
    {[
      [22, 44, 9],
      [44, 24, 6],
      [62, 42, 12],
      [86, 20, 8],
      [100, 46, 10],
      [34, 14, 5],
    ].map(([cx, cy, r], i) => (
      <circle key={i} cx={cx} cy={cy} r={r} fill="currentColor" opacity={i % 2 ? 0.35 : 0.65} />
    ))}
  </Chartlet>
);

const treemapChart = (
  <Chartlet>
    <rect x="4" y="6" width="58" height="34" rx="3" fill="currentColor" opacity="0.6" />
    <rect x="66" y="6" width="50" height="20" rx="3" fill="currentColor" opacity="0.4" />
    <rect x="66" y="30" width="24" height="28" rx="3" fill="currentColor" opacity="0.3" />
    <rect x="94" y="30" width="22" height="28" rx="3" fill="currentColor" opacity="0.22" />
    <rect x="4" y="44" width="58" height="14" rx="3" fill="currentColor" opacity="0.3" />
  </Chartlet>
);

const waterfallChart = (
  <Chartlet>
    {[
      [6, 34, 22],
      [26, 22, 12],
      [46, 16, 8],
      [66, 24, 14],
      [86, 12, 12],
      [104, 12, 42],
    ].map(([x, y, h], i) => (
      <rect
        key={i}
        x={x}
        y={y}
        width="12"
        height={h}
        rx="2.5"
        fill="currentColor"
        opacity={i === 5 ? 0.8 : 0.4}
      />
    ))}
    <path
      d="M18 34h8M38 22h8M58 16h8M78 24h8M98 12h6"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeDasharray="3 3"
      opacity="0.5"
    />
  </Chartlet>
);

/* -------------------------------------------------------------------------- */
/* Feedback and status                                                        */
/* -------------------------------------------------------------------------- */

const alert = (
  <Plate className="w-48 flex-row items-start gap-2.5 p-3">
    <Glyph icon={AlertCircleIcon} className="mt-0.5 size-4 text-fd-primary/80" />
    <Stack className="flex-1 gap-1.5">
      <Bar className="w-20" />
      <Bar className="w-full" faint />
      <Bar className="w-24" faint />
    </Stack>
  </Plate>
);

/*
 * Mid-roll: the outgoing word on its way up out of the pill and the incoming
 * one still below the line. A still thumbnail of a badge is a badge.
 */
const animatedBadge = (
  <Stack className="w-40 items-center gap-3">
    <Row className="items-center gap-2 rounded-full border border-fd-border px-3 py-1.5">
      <Accent className="h-2.5 w-2.5 rounded-full" />
      <Bar className="w-12 -translate-y-1 opacity-40" faint />
    </Row>
    <Row className="items-center gap-2 rounded-full border border-fd-border px-3 py-1.5">
      <Accent className="h-2.5 w-2.5 rounded-full" />
      <Bar className="w-16" faint />
    </Row>
  </Stack>
);

const badge = (
  <Row className="gap-2">
    <Accent className="h-5 w-12 rounded-full" />
    <div className="flex h-5 items-center rounded-full border border-fd-border px-2">
      <Bar className="w-7" faint />
    </div>
    <Fill className="h-5 w-9 rounded-full" />
  </Row>
);

const emptyState = (
  <Stack className="w-40 items-center gap-2.5">
    <Fill className="grid size-11 place-items-center rounded-full">
      <Glyph icon={InboxIcon} className="size-5" />
    </Fill>
    <Bar className="w-24" />
    <Bar className="w-32" faint />
    <Accent className="mt-1 grid h-7 w-20 place-items-center rounded-lg">
      <AccentBar className="w-9" />
    </Accent>
  </Stack>
);

const loader = (
  <Row className="gap-2">
    {[0.85, 0.5, 0.25].map((o, i) => (
      <div key={i} className="size-3 rounded-full bg-fd-primary" style={{ opacity: o }} />
    ))}
  </Row>
);

const marker = (
  <Stack className="w-44 gap-2.5">
    <Plate className="me-8 gap-1.5 rounded-2xl rounded-bl-md p-2.5">
      <Bar className="w-full" faint />
      <Bar className="w-16" faint />
    </Plate>
    {/* The note itself: centred between the turns, and smaller than both. */}
    <Row className="justify-center gap-1.5">
      <div className="size-1.5 rounded-full bg-fd-primary" />
      <Bar className="w-16" />
    </Row>
    <div className="ms-8 rounded-2xl rounded-br-md bg-fd-primary/85 p-2.5">
      <div className="h-1.5 w-20 rounded-full bg-fd-primary-foreground/60" />
    </div>
  </Stack>
);

const meter = (
  <Stack className="w-40 gap-2">
    <Row className="gap-1">
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className={`h-2 flex-1 rounded-full ${i < 3 ? 'bg-fd-primary' : 'bg-fd-muted-foreground/18'}`}
        />
      ))}
    </Row>
    <Row className="justify-between">
      <Bar className="w-10" faint />
      <Bar className="w-6" faint />
    </Row>
  </Stack>
);

const progress = (
  <Stack className="w-40 gap-2">
    <div className="h-2 w-full overflow-hidden rounded-full bg-fd-muted-foreground/15">
      <Accent className="h-full w-2/3 rounded-none" />
    </div>
    <div className="h-2 w-full overflow-hidden rounded-full bg-fd-muted-foreground/15">
      <div className="h-full w-1/3 rounded-none bg-fd-muted-foreground/40" />
    </div>
  </Stack>
);

const skeleton = (
  <Row className="w-44 items-start gap-3">
    <Fill className="size-10 shrink-0 rounded-full" />
    <Stack className="flex-1 gap-2">
      <Fill className="h-2.5 w-full rounded-full" />
      <Fill className="h-2.5 w-full rounded-full" />
      <Fill className="h-2.5 w-20 rounded-full" />
    </Stack>
  </Row>
);

const spinner = (
  <div className="size-10 rounded-full border-[3px] border-fd-muted-foreground/20 border-t-fd-primary" />
);

/* -------------------------------------------------------------------------- */
/* Media and motion                                                           */
/* -------------------------------------------------------------------------- */

const attachment = (
  <Plate className="w-48 flex-row items-center gap-3 p-2.5">
    <Fill className="grid size-10 shrink-0 place-items-center rounded-lg">
      <Glyph icon={FileIcon} className="size-4" />
    </Fill>
    <Stack className="flex-1 gap-1.5">
      <Bar className="w-20" />
      <Bar className="w-12" faint />
    </Stack>
    <Glyph icon={XIcon} className="size-3.5" />
  </Plate>
);

const avatar = (
  <Row className="gap-3">
    <div className="relative">
      <div className="grid size-11 place-items-center rounded-full bg-fd-muted-foreground/15">
        <Glyph icon={UserRoundIcon} className="size-5" />
      </div>
      {/* The badge overlay, which is the third thing the summary names. */}
      <div className="absolute -end-0.5 -top-0.5 size-3.5 rounded-full border-2 border-fd-card bg-fd-primary" />
    </div>
    <Row className="-space-x-3">
      {[0, 1].map((i) => (
        <div
          key={i}
          className="grid size-9 place-items-center rounded-full border-2 border-fd-card bg-fd-muted-foreground/15"
        >
          <Glyph icon={UserRoundIcon} className="size-4" />
        </div>
      ))}
      <div className="grid size-9 place-items-center rounded-full border-2 border-fd-card bg-fd-muted-foreground/25">
        <div className="h-1.5 w-3.5 rounded-full bg-fd-muted-foreground/60" />
      </div>
    </Row>
  </Row>
);

/*
 * Cut at both edges rather than faded at them. A fade has to match the ground
 * it fades into, and the ground here is a translucent tone over a card — so
 * the gradient was always a shade out. A chip running off the edge says the
 * same thing and cannot be wrong.
 */
const circularText = (
  <div className="relative size-24">
    {Array.from('PANELUI · CIRCULAR TEXT ·').map((character, index, all) => (
      <span
        key={`${character}-${index}`}
        className="absolute inset-0 flex items-start justify-center text-[9px] font-bold tracking-[0.2em] text-fd-muted-foreground"
        style={{ transform: `rotate(${(360 / all.length) * index}deg)` }}
      >
        {character}
      </span>
    ))}
  </div>
);

const flipCard = (
  <div className="relative size-24 [perspective:600px]">
    <div className="absolute inset-x-2 inset-y-4 rounded-lg border border-fd-border bg-fd-muted [transform:rotateY(-28deg)]" />
    <div className="absolute inset-x-2 inset-y-4 rounded-lg border border-fd-border bg-fd-card [transform:rotateY(24deg)_translateZ(10px)]" />
  </div>
);

const marquee = (
  <div className="flex w-full max-w-52 justify-center overflow-hidden">
    <Row className="w-max shrink-0 gap-2">
      {['w-10', 'w-14', 'w-8', 'w-12', 'w-9', 'w-11'].map((width) => (
        <div
          key={width}
          className="flex h-7 shrink-0 items-center rounded-full bg-fd-muted-foreground/15 px-3"
        >
          <Bar className={width} faint />
        </div>
      ))}
    </Row>
  </div>
);

const message = (
  <Stack className="w-44 gap-2.5">
    <Row className="items-end gap-2">
      <Fill className="size-6 shrink-0 rounded-full" />
      <Plate className="max-w-28 gap-1.5 rounded-2xl rounded-bl-md p-2.5">
        <Bar className="w-20" faint />
        <Bar className="w-14" faint />
      </Plate>
    </Row>
    <div className="ms-auto flex max-w-32 flex-col gap-1.5 rounded-2xl rounded-br-md bg-fd-primary/85 p-2.5">
      <div className="h-1.5 w-24 rounded-full bg-fd-primary-foreground/60" />
      <div className="h-1.5 w-16 rounded-full bg-fd-primary-foreground/60" />
    </div>
  </Stack>
);

const messageScroller = (
  <div className="relative w-44">
    <Stack className="gap-2">
      <Plate className="me-8 gap-1.5 rounded-2xl rounded-bl-md p-2.5">
        <Bar className="w-full" faint />
        <Bar className="w-16" faint />
      </Plate>
      <div className="ms-8 rounded-2xl rounded-br-md bg-fd-primary/85 p-2.5">
        <div className="h-1.5 w-20 rounded-full bg-fd-primary-foreground/60" />
      </div>
      <Plate className="me-8 gap-1.5 rounded-2xl rounded-bl-md p-2.5">
        <Bar className="w-20" faint />
      </Plate>
    </Stack>
    <div className="absolute -bottom-3 left-1/2 grid size-7 -translate-x-1/2 place-items-center rounded-full border border-fd-border bg-fd-card shadow">
      <ChevronDownIcon className="size-3.5 text-fd-muted-foreground/70" />
    </div>
  </div>
);

const post = (
  <Plate className="w-44 gap-2.5 p-3">
    <Row>
      <Fill className="size-7 shrink-0 rounded-full" />
      <Stack className="flex-1 gap-1">
        <Bar className="w-16" />
        <Bar className="w-10" faint />
      </Stack>
    </Row>
    <Bar className="w-full" faint />
    <Bar className="w-28" faint />
    <Fill className="grid h-14 place-items-center rounded-lg">
      <Glyph icon={ImageIcon} className="size-4" />
    </Fill>
    <Row className="justify-between pt-0.5">
      <Bar className="w-6" faint />
      <Bar className="w-6" faint />
      <Bar className="w-6" faint />
    </Row>
  </Plate>
);

const qrCode = (
  <div className="grid size-24 grid-cols-7 grid-rows-7 gap-[3px] rounded-lg bg-white p-2">
    {Array.from({ length: 49 }, (_, i) => {
      const x = i % 7;
      const y = Math.floor(i / 7);
      const eye =
        (x < 3 && y < 3) || (x > 3 && y < 3) || (x < 3 && y > 3)
          ? (x === 1 && y === 1) || (x === 5 && y === 1) || (x === 1 && y === 5)
          : null;
      if (eye !== null) {
        return (
          <div
            key={i}
            className={eye ? 'rounded-[2px] bg-zinc-900' : 'rounded-[2px] bg-zinc-900/15'}
          />
        );
      }
      return (
        <div
          key={i}
          className={(x * 5 + y * 3) % 3 ? 'rounded-[2px] bg-zinc-900' : ''}
        />
      );
    })}
  </div>
);

const scrollText = (
  <Stack className="w-40 gap-2">
    <Bar className="w-full" />
    <Bar className="w-32" />
    {/* The line the reader is on: half of it settled, half still faint. */}
    <Row className="gap-1">
      <Bar className="w-16" />
      <Bar className="w-8" faint />
      <Bar className="w-10" faint />
    </Row>
    <Bar className="w-36" faint />
    <Bar className="w-24" faint />
  </Stack>
);

const textAnimation = (
  <Stack className="w-40 gap-2">
    <Bar className="w-full" />
    <Bar className="w-32" />
    <Row className="gap-1">
      <Bar className="w-16" />
      <div className="h-3.5 w-0.5 bg-fd-primary" />
    </Row>
  </Stack>
);

/* -------------------------------------------------------------------------- */
/* AI components                                                              */
/* -------------------------------------------------------------------------- */

const aiInput = (
  <Plate className="w-48 gap-3 rounded-2xl p-3">
    <Bar className="w-24" faint />
    <Row className="justify-between">
      <Row className="gap-2">
        <Fill className="grid size-7 place-items-center rounded-full">
          <Glyph icon={PlusIcon} className="size-3.5" />
        </Fill>
        <Fill className="grid size-7 place-items-center rounded-full">
          <Glyph icon={MicIcon} className="size-3.5" />
        </Fill>
      </Row>
      <Accent className="grid size-7 place-items-center rounded-full">
        <ArrowUpIcon className="size-3.5 text-fd-primary-foreground" />
      </Accent>
    </Row>
  </Plate>
);

const codeBlock = (
  <Plate className="w-48 gap-2 bg-fd-foreground/[0.04] p-3">
    <Row className="justify-between">
      <Bar className="w-10" faint />
      <Glyph icon={CopyIcon} className="size-3" />
    </Row>
    <Row className="gap-1.5">
      <div className="h-1.5 w-6 rounded-full bg-fd-primary/60" />
      <Bar className="w-12" faint />
    </Row>
    <Row className="ms-3 gap-1.5">
      <Bar className="w-8" faint />
      <div className="h-1.5 w-10 rounded-full bg-fd-primary/40" />
    </Row>
    <Row className="ms-3 gap-1.5">
      <div className="h-1.5 w-5 rounded-full bg-fd-primary/60" />
      <Bar className="w-14" faint />
    </Row>
  </Plate>
);

const panelside = (
  <div className="relative h-28 w-44 overflow-hidden rounded-xl bg-fd-muted-foreground/10">
    <Stack className="w-24 gap-2 p-3">
      <Bar className="w-12" />
      <Bar className="w-16" faint />
      <Bar className="w-12" faint />
      <Bar className="w-14" faint />
    </Stack>
    <Plate className="absolute inset-y-2 -end-6 w-28 gap-2 rounded-2xl p-3 shadow-lg">
      <Bar className="w-14" />
      <Bar className="w-full" faint />
      <Bar className="w-12" faint />
    </Plate>
  </div>
);

const plan = (
  <Stack className="w-44">
    {[true, true, false, false].map((done, i) => (
      <Row key={i}>
        {done ? (
          <Accent className="grid size-4 shrink-0 place-items-center rounded-full">
            <CheckIcon className="size-2.5 text-fd-primary-foreground" />
          </Accent>
        ) : (
          <div className="size-4 shrink-0 rounded-full border border-fd-muted-foreground/30" />
        )}
        <Bar className={i % 2 ? 'w-24' : 'w-32'} faint />
      </Row>
    ))}
  </Stack>
);

const reasoning = (
  <Stack className="w-44 gap-2.5">
    <Row>
      <ChevronDownIcon className="size-3 rotate-180 text-fd-muted-foreground/70" />
      <Bar className="w-20" />
    </Row>
    <Stack className="ms-4 gap-2 border-s border-fd-border ps-3">
      <Bar className="w-full" faint />
      <Bar className="w-24" faint />
      <Bar className="w-28" faint />
    </Stack>
  </Stack>
);

const response = (
  <Stack className="w-44 gap-2.5">
    <Bar className="w-20" />
    <Bar className="w-full" faint />
    <Bar className="w-full" faint />
    <Bar className="w-28" faint />
    <Row className="ms-1">
      <div className="size-1 rounded-full bg-fd-muted-foreground/45" />
      <Bar className="w-24" faint />
    </Row>
    <Row className="ms-1">
      <div className="size-1 rounded-full bg-fd-muted-foreground/45" />
      <Bar className="w-20" faint />
    </Row>
  </Stack>
);

/* A square of dots with a band of them lit — the field, at rest. */
const imageGeneration = (
  <Stack className="w-32 gap-2">
    <Plate className="grid h-24 w-32 grid-cols-8 place-items-center gap-1 p-2">
      {Array.from({ length: 40 }, (_, index) => (
        <div
          key={index}
          className="h-1 w-1 rounded-full bg-fd-muted-foreground"
          style={{ opacity: index % 8 === 3 || index % 8 === 4 ? 0.85 : 0.2 }}
        />
      ))}
    </Plate>
    <Bar className="w-20" />
  </Stack>
);

const shimmer = (
  <div className="relative w-40 overflow-hidden">
    <Stack className="gap-2">
      <Bar className="w-full" faint />
      <Bar className="w-32" faint />
      <Bar className="w-24" faint />
    </Stack>
    <div className="absolute inset-y-0 start-1/4 w-16 bg-gradient-to-r from-transparent via-fd-foreground/15 to-transparent" />
  </div>
);

const soundwave = (
  <Row className="h-14 items-center gap-1">
    {[8, 20, 34, 48, 30, 44, 18, 38, 26, 12, 30, 16].map((h, i) => (
      <div
        key={i}
        className={`w-1.5 rounded-full ${i < 6 ? 'bg-fd-primary/80' : 'bg-fd-muted-foreground/25'}`}
        style={{ height: h }}
      />
    ))}
  </Row>
);

const sources = (
  <Row className="w-44 flex-wrap gap-1.5">
    {[0, 1, 2].map((i) => (
      <Row
        key={i}
        className="gap-1.5 rounded-full border border-fd-border bg-fd-card px-2 py-1"
      >
        <div className="size-2.5 rounded-sm bg-fd-muted-foreground/35" />
        <Bar className={i === 1 ? 'w-10' : 'w-8'} faint />
      </Row>
    ))}
    <Fill className="flex h-6 items-center rounded-full px-2">
      <Bar className="w-4" faint />
    </Fill>
  </Row>
);

const task = (
  <Plate className="w-44 gap-2.5 p-3">
    <Row>
      <div className="size-3.5 shrink-0 rounded-full border-2 border-fd-muted-foreground/20 border-t-fd-primary" />
      <Bar className="w-24" />
    </Row>
    <Row className="ms-2">
      <Glyph icon={FileIcon} className="size-3" />
      <Bar className="w-20" faint />
    </Row>
    <Row className="ms-2">
      <Glyph icon={CheckIcon} className="size-3 text-fd-primary" />
      <Bar className="w-16" faint />
    </Row>
  </Plate>
);

/** Dotted, per its own description — a ring of points rather than a disc. */
const thinkingOrb = (
  <svg viewBox="0 0 80 80" className="size-20 text-fd-primary" aria-hidden="true">
    <circle cx="40" cy="40" r="34" className="fill-fd-primary" opacity="0.07" />
    {Array.from({ length: 24 }, (_, i) => {
      const angle = (Math.PI * 2 * i) / 24;
      const radius = 26 + (i % 3) * 3;
      return (
        <circle
          key={i}
          cx={(40 + radius * Math.cos(angle)).toFixed(1)}
          cy={(40 + radius * Math.sin(angle)).toFixed(1)}
          r={i % 4 === 0 ? 3 : 2}
          fill="currentColor"
          opacity={0.3 + ((i * 5) % 7) / 10}
        />
      );
    })}
    {Array.from({ length: 8 }, (_, i) => {
      const angle = (Math.PI * 2 * i) / 8 + 0.4;
      return (
        <circle
          key={i}
          cx={(40 + 13 * Math.cos(angle)).toFixed(1)}
          cy={(40 + 13 * Math.sin(angle)).toFixed(1)}
          r="2.5"
          fill="currentColor"
          opacity="0.75"
        />
      );
    })}
  </svg>
);

/* -------------------------------------------------------------------------- */

const THUMBNAILS: Record<string, ReactNode> = {
  // Actions
  button,
  'button-group': buttonGroup,
  chip,
  'context-menu': contextMenu,
  fab,
  menu,
  'progress-button': progressButton,
  'slide-button': slideButton,
  'selection-mode': selectionMode,
  swipe,
  'toggle-button': toggleButton,

  // Forms and input
  calendar,
  checkbox,
  'color-picker': colorPicker,
  combobox,
  'date-picker': datePicker,
  'date-time-picker': dateTimePicker,
  field,
  form,
  input,
  'input-group': inputGroup,
  label,
  'markdown-editor': markdownEditor,
  'number-input': numberInput,
  'otp-input': otpInput,
  questionnaire,
  'radio-group': radioGroup,
  rating,
  'search-bar': searchBar,
  select,
  signature,
  slider,
  switch: switchThumb,
  'tag-input': tagInput,
  textarea,
  'theme-selector': themeSelector,
  'time-picker': timePicker,

  // Overlays
  'bottom-sheet': bottomSheet,
  'feedback': feedback,
  dialog,
  drawer,
  popover,
  toast,
  tooltip,

  // Navigation
  breadcrumb,
  pagination,
  'section-rail': sectionRail,
  'section-progress': sectionProgress,
  sortable,
  steps,
  tabs,
  tour,
  tree,

  // Layout and structure
  accordion,
  card,
  carousel,
  collapsible,
  direction,
  frame,
  'grid-item': gridItem,
  item,
  'page-header': pageHeader,
  'scroll-canvas': scrollCanvas,
  'scroll-blur': scrollBlur,
  'scroll-fade': scrollFade,
  'scroll-header': scrollHeader,
  separator,
  'split-view': splitView,
  splitter,
  surface,
  typography,

  // Data
  flow,
  kpi,
  map,
  planner,
  table,
  timeline,

  // Charts
  'area-chart': areaChart,
  'bar-chart': barChart,
  'candlestick-chart': candlestickChart,
  'funnel-chart': funnelChart,
  'heatmap-chart': heatmapChart,
  'hex-chart': hexChart,
  'line-chart': lineChart,
  'live-line-chart': liveLineChart,
  'pie-chart': pieChart,
  plot,
  'polar-area-chart': polarAreaChart,
  'radar-chart': radarChart,
  'ring-chart': ringChart,
  'bubble-chart': bubbleChart,
  'pyramid-chart': pyramidChart,
  'scatter-chart': scatterChart,
  'treemap-chart': treemapChart,
  'waterfall-chart': waterfallChart,

  // Feedback and status
  alert,
  'animated-badge': animatedBadge,
  badge,
  'empty-state': emptyState,
  loader,
  marker,
  meter,
  progress,
  skeleton,
  spinner,

  // Media and motion
  attachment,
  avatar,
  'circular-text': circularText,
  'flip-card': flipCard,
  marquee,
  message,
  'message-scroller': messageScroller,
  post,
  'qr-code': qrCode,
  'scroll-text': scrollText,
  'text-animation': textAnimation,

  // AI components
  'ai-input': aiInput,
  'code-block': codeBlock,
  panelside,
  plan,
  reasoning,
  response,
  shimmer,
  'image-generation': imageGeneration,
  soundwave,
  sources,
  task,
  'thinking-orb': thinkingOrb,
};

/** The wireframe for a slug, or nothing where one has not been drawn yet. */
export function getComponentThumbnail(slug: string): ReactNode {
  return THUMBNAILS[slug];
}
