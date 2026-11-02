'use client';

/**
 * Avatar — a person or a team as a picture, with their initials when there
 * is no picture to show.
 *
 * ```tsx
 * <Avatar src="/noor.jpg" name="Noor Haddad" />
 *
 * <Avatar name="Tomás Ferreira" size="lg">
 *   <Avatar.Badge status="online" />
 * </Avatar>
 *
 * <Avatar.Group max={4}>
 *   {people.map((person) => <Avatar key={person.id} src={person.photo} name={person.name} />)}
 * </Avatar.Group>
 * ```
 *
 * ## Initials in a colour of their own
 *
 * Without a picture, or while one loads, the avatar shows the initials of
 * `name` on a tint of one of the theme's chart colours. The colour is picked
 * from the name, so the same person has the same colour on every screen, and
 * a row of people without pictures can still be told apart at a glance.
 *
 * ## Cut out, not ringed
 *
 * A badge, and the avatar overlapping the next one in a group, are not drawn
 * with a ring in the page's background colour. The avatar underneath is cut
 * away with a mask instead, so the gap round them is a real gap: it shows
 * whatever the avatar sits on, a card, a tinted row, a photograph, and needs
 * no colour to match it.
 *
 * ## A group opens up
 *
 * Avatars in a group overlap. Hovered or focused, they move apart, and the cut
 * in each moves with the one beside it. Past `max`, the rest are counted in a
 * last circle that opens a list of who they are.
 */
import { Avatar as BaseAvatar } from '@base-ui/react/avatar';
import { Popover } from '@base-ui/react/popover';
import {
  Children,
  createContext,
  isValidElement,
  useContext,
  useMemo,
  type ComponentProps,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from 'react';
import { tv } from 'tailwind-variants';
import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import type { ElementType as RenderElementType } from 'react';

/** Draws a part as another element, or composes it with a component: `render={<a href="/" />}`. */
type RenderProp<Tag extends RenderElementType> = { render?: useRender.ComponentProps<Tag>['render'] };

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type AvatarShape = 'circle' | 'square';
export type AvatarColor = 'chart-1' | 'chart-2' | 'chart-3' | 'chart-4' | 'chart-5' | 'muted';
export type AvatarStatus = 'online' | 'away' | 'busy' | 'offline';

const SIZE: Record<AvatarSize, string> = {
  xs: '1.5rem',
  sm: '2rem',
  md: '2.5rem',
  lg: '3.5rem',
  xl: '4.5rem',
};

const COLORS: AvatarColor[] = ['chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5'];

const avatarVariants = tv({
  slots: {
    root: 'relative inline-flex size-(--avatar-size) shrink-0 align-middle',
    /*
     * The face is what gets cut. Its hairline is inside it, so the cut takes
     * the hairline with it and no stray arc of it is left in the gap.
     */
    face: [
      'relative flex size-full overflow-hidden bg-muted select-none',
      "after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:ring-1 after:ring-inset after:ring-foreground/10 after:content-['']",
      '[mask-repeat:no-repeat] [mask-composite:intersect]',
    ],
    image: 'size-full object-cover',
    fallback: [
      'flex size-full items-center justify-center font-medium leading-none tracking-tight',
      'text-[calc(var(--avatar-size)*0.38)]',
      'bg-[color-mix(in_oklab,var(--avatar-color)_22%,var(--card))] text-[color-mix(in_oklab,var(--avatar-color)_70%,var(--foreground))]',
      '[&_svg]:size-[55%] [&_svg]:opacity-70',
    ],
    badge: [
      'absolute flex size-(--badge-size) items-center justify-center rounded-full',
      'left-[calc(var(--badge-center)-var(--badge-size)/2)] top-[calc(var(--badge-center)-var(--badge-size)/2)]',
      'text-[calc(var(--badge-size)*0.6)] [&_svg]:size-[70%]',
    ],
    group: [
      'group/avatars inline-flex items-center [--avatar-overlap:0.22]',
      // Hovered or focused, the group opens up so each face can be seen whole.
      'hover:[--avatar-overlap:0.08] has-focus-visible:[--avatar-overlap:0.08] motion-reduce:hover:[--avatar-overlap:0.22]',
    ],
    item: [
      'not-first:ms-[calc(var(--avatar-size)*var(--avatar-overlap)*-1)]',
      'transition-[margin] duration-300 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none',
      // The face's cut follows the margin, in step with it.
      '*:data-[slot=avatar-face]:transition-[mask-position] *:data-[slot=avatar-face]:duration-300 *:data-[slot=avatar-face]:ease-[cubic-bezier(0.2,0,0,1)]',
    ],
    count: [
      'flex size-full cursor-pointer items-center justify-center bg-muted font-medium tabular-nums text-muted-foreground outline-none',
      'text-[calc(var(--avatar-size)*0.34)] transition-colors hover:bg-accent hover:text-foreground',
      'focus-visible:ring-2 focus-visible:ring-ring data-popup-open:bg-accent data-popup-open:text-foreground',
    ],
    popup: [
      'z-50 min-w-52 origin-(--transform-origin) rounded-xl border bg-popover p-1 text-popover-foreground shadow-lg outline-none',
      'max-h-(--available-height) overflow-y-auto',
      'transition-[opacity,scale] duration-150 ease-out data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0',
      'motion-reduce:transition-none',
    ],
    row: 'flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm',
  },
  variants: {
    shape: {
      circle: { face: 'rounded-full', root: '[--badge-center:85.4%]' },
      // The badge sits further in on a square, whose corner is further out.
      square: { face: 'rounded-[28%]', root: '[--badge-center:calc(100%-var(--badge-size)*0.3)]' },
    },
    status: {
      online: { badge: 'bg-success' },
      away: { badge: 'bg-warning' },
      busy: { badge: 'bg-destructive' },
      // Hollow: there, but not reachable.
      offline: { badge: 'border-[max(1.5px,calc(var(--badge-size)*0.2))] border-muted-foreground/70' },
    },
    color: {
      'chart-1': { root: '[--avatar-color:var(--chart-1)]', badge: 'bg-chart-1 text-background' },
      'chart-2': { root: '[--avatar-color:var(--chart-2)]', badge: 'bg-chart-2 text-background' },
      'chart-3': { root: '[--avatar-color:var(--chart-3)]', badge: 'bg-chart-3 text-background' },
      'chart-4': { root: '[--avatar-color:var(--chart-4)]', badge: 'bg-chart-4 text-background' },
      'chart-5': { root: '[--avatar-color:var(--chart-5)]', badge: 'bg-chart-5 text-background' },
      muted: { root: '[--avatar-color:var(--muted-foreground)]', badge: 'bg-foreground text-background' },
    },
  },
  defaultVariants: { shape: 'circle' },
});

/** The same name always lands on the same colour. */
function colorOf(name: string | undefined): AvatarColor {
  if (!name) return 'muted';
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.codePointAt(0)!) | 0;
  return COLORS[Math.abs(hash) % COLORS.length]!;
}

/** First letter of the first and last words: "Noor al-Haddad" is "NA". */
function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  const first = [...words[0]!][0] ?? '';
  const last = words.length > 1 ? ([...words[words.length - 1]!][0] ?? '') : '';
  return (first + last).toUpperCase();
}

const STATUS_LABEL: Record<AvatarStatus, string> = {
  online: 'online',
  away: 'away',
  busy: 'busy',
  offline: 'offline',
};

/* -------------------------------------------------------------------------- */
/* Masks                                                                      */
/* -------------------------------------------------------------------------- */

/*
 * Every face has two mask layers, intersected: one for the badge, one for the
 * avatar overlapping it in a group. A layer with nothing to cut is solid.
 *
 * Each cut is a gradient drawn in a box bigger than the face and placed with
 * `mask-position`, rather than a gradient placed by its own coordinates. A
 * position animates; a gradient's coordinates do not. That is what lets the
 * cut slide along with the next avatar as the group opens.
 */
const SOLID = 'linear-gradient(#000,#000)';
const GAP = 'max(1.5px, calc(var(--avatar-size) * 0.05))';

/** A hole round the badge. */
const BADGE_CUT = `radial-gradient(circle at var(--badge-center) var(--badge-center), transparent calc(var(--badge-size) / 2 + ${GAP}), #000 calc(var(--badge-size) / 2 + ${GAP} + 0.5px))`;

/**
 * A hole where the next avatar lies over this one. The box is three faces
 * wide with the hole at its centre, then shifted so the centre lands on the
 * next avatar's centre: `size × (1 − overlap)` along.
 */
const CIRCLE_CUT = `radial-gradient(circle, transparent calc(var(--avatar-size) / 2 + ${GAP}), #000 calc(var(--avatar-size) / 2 + ${GAP} + 0.5px))`;
const CIRCLE_CUT_SIZE = 'calc(var(--avatar-size) * 3) calc(var(--avatar-size) * 3)';
const CIRCLE_CUT_AT = 'calc(var(--avatar-size) * var(--avatar-overlap) * -1) calc(var(--avatar-size) * -1)';

/**
 * A square's hole is the next square's own shape, a rounded square a little
 * larger than it, drawn in the same three-face box so it moves the same way.
 * A gradient cannot draw a rounded square, so this one is an SVG: 100 units
 * to a face, with the corner at the face's 28% and the gap at 5%.
 */
const SQUARE_CUT = `url("data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" preserveAspectRatio="none"><path fill-rule="evenodd" d="M0 0H300V300H0Z M128 95H172A33 33 0 0 1 205 128V172A33 33 0 0 1 172 205H128A33 33 0 0 1 95 172V128A33 33 0 0 1 128 95Z"/></svg>'
)}")`;

function maskStyle(shape: AvatarShape, badge: boolean, overlapped: boolean): CSSProperties | undefined {
  if (!badge && !overlapped) return undefined;
  const layers = [
    badge ? [BADGE_CUT, '100% 100%', '0 0'] : [SOLID, '100% 100%', '0 0'],
    overlapped
      ? shape === 'circle'
        ? [CIRCLE_CUT, CIRCLE_CUT_SIZE, CIRCLE_CUT_AT]
        : [SQUARE_CUT, CIRCLE_CUT_SIZE, CIRCLE_CUT_AT]
      : [SOLID, '100% 100%', '0 0'],
  ];
  return {
    maskImage: layers.map((layer) => layer[0]).join(', '),
    maskSize: layers.map((layer) => layer[1]).join(', '),
    maskPosition: layers.map((layer) => layer[2]).join(', '),
  };
}

/* -------------------------------------------------------------------------- */
/* Avatar                                                                     */
/* -------------------------------------------------------------------------- */

interface GroupContextValue {
  size: AvatarSize;
  shape: AvatarShape;
}

const GroupContext = createContext<GroupContextValue | null>(null);
/** Set on every avatar in a group but the last, which nothing overlaps. */
const OverlappedContext = createContext(false);

export interface AvatarProps extends Omit<ComponentProps<'span'>, 'color'> {
  /** The picture. Without it, or until it has loaded, the initials show. */
  src?: string;
  /** Who it is. Gives the initials, the colour and what a screen reader says. */
  name?: string;
  /** Read out in place of `name`, when that is not the right thing to say. */
  alt?: string;
  /** Default `md`. In a group, the group's size. */
  size?: AvatarSize;
  /** `circle` for people, `square` for teams, projects and things. Default `circle`. */
  shape?: AvatarShape;
  /** The tint behind the initials. Picked from `name` when left out. */
  color?: AvatarColor;
  /** In place of the initials, such as an icon for a team or a bot. */
  fallback?: ReactNode;
  /** An `Avatar.Badge`. */
  children?: ReactNode;
}

/** A picture of someone, or their initials in a colour of their own. */
function AvatarRoot({
  src,
  name,
  alt,
  size,
  shape,
  color,
  fallback,
  className,
  style,
  children,
  render,
  ...props
}: AvatarProps & RenderProp<'span'>) {
  const group = useContext(GroupContext);
  const overlapped = useContext(OverlappedContext);
  const resolvedSize = size ?? group?.size ?? 'md';
  const resolvedShape = shape ?? group?.shape ?? 'circle';
  const slots = avatarVariants({ shape: resolvedShape, color: color ?? colorOf(name) });

  // A badge's status is part of who it is, so it is said with the name.
  const badge = Children.toArray(children).find(
    (child): child is ReactElement<AvatarBadgeProps> => isValidElement(child) && child.type === AvatarBadge
  );
  const status = badge?.props.label ?? (badge?.props.status ? STATUS_LABEL[badge.props.status] : undefined);
  const label = [alt ?? name, status].filter(Boolean).join(', ') || undefined;

  return useRender({
    defaultTagName: 'span',
    render,
    props: mergeProps(
      {
        'data-slot': 'avatar',
        'data-size': resolvedSize,
        'data-shape': resolvedShape,
        role: label ? 'img' : undefined,
        'aria-label': label,
        className: slots.root({ className }),
        style: {
          ['--avatar-size' as string]: SIZE[resolvedSize],
          // Here and not on the badge, so the face's cut and the badge's place can both read it.
          ['--badge-size' as string]: 'max(0.5rem, calc(var(--avatar-size) * 0.28))',
          ...style,
        },
        children: (
          <>
            <BaseAvatar.Root
              data-slot="avatar-face"
              aria-hidden="true"
              className={slots.face()}
              style={maskStyle(resolvedShape, badge !== undefined, overlapped)}
            >
              {src ? <BaseAvatar.Image src={src} alt="" className={slots.image()} /> : null}
              <BaseAvatar.Fallback className={slots.fallback()}>
                {fallback ?? (name ? initialsOf(name) : <PersonGlyph />)}
              </BaseAvatar.Fallback>
            </BaseAvatar.Root>
            {children}
          </>
        ),
      },
      props
    ),
  });
}
AvatarRoot.displayName = 'Avatar';

function PersonGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="8.5" r="4" />
      <path d="M4 20.5c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5z" />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Badge                                                                      */
/* -------------------------------------------------------------------------- */

export interface AvatarBadgeProps extends Omit<ComponentProps<'span'>, 'color'> {
  /** A presence dot in the colour that says it. Leave out for a badge of your own. */
  status?: AvatarStatus;
  /** For a badge with an icon in it: the fill behind the icon. */
  color?: AvatarColor;
  /** What a screen reader says after the name. Defaults to the status. */
  label?: string;
  /** An icon, such as a check for a verified account. */
  children?: ReactNode;
}

/**
 * A dot or a small icon on the avatar's lower trailing edge. The avatar is
 * cut away round it, so it reads on any background.
 */
function AvatarBadge({
  status,
  color,
  label: _label,
  className,
  render,
  ...props
}: AvatarBadgeProps & RenderProp<'span'>) {
  const slots = avatarVariants({ status, color: status ? undefined : (color ?? 'muted') });
  return useRender({
    defaultTagName: 'span',
    render,
    props: mergeProps(
      {
        'aria-hidden': 'true',
        'data-slot': 'avatar-badge',
        'data-status': status,
        className: slots.badge({ className }),
      },
      props
    ),
  });
}
AvatarBadge.displayName = 'Avatar.Badge';

/* -------------------------------------------------------------------------- */
/* Group                                                                      */
/* -------------------------------------------------------------------------- */

export interface AvatarGroupProps extends ComponentProps<'div'> {
  /** How many to show. The rest are counted in a last circle that lists them. */
  max?: number;
  /** The size of every avatar in it. Default `md`. */
  size?: AvatarSize;
  /** The shape of every avatar in it. Default `circle`. */
  shape?: AvatarShape;
  /** What a screen reader calls the group, such as "Members". */
  label?: string;
}

/** A row of overlapping avatars, that opens up when it is hovered or focused. */
function AvatarGroup({
  max,
  size = 'md',
  shape = 'circle',
  label,
  className,
  style,
  children,
  ...props
}: AvatarGroupProps) {
  const slots = avatarVariants({ shape });
  const context = useMemo(() => ({ size, shape }), [size, shape]);
  const all = Children.toArray(children).filter(isValidElement) as ReactElement<AvatarProps>[];
  const shown = max !== undefined && all.length > max ? all.slice(0, Math.max(0, max)) : all;
  const rest = all.slice(shown.length);
  const items: ReactNode[] = shown.map((child, index) => (
    <OverlappedContext.Provider key={child.key ?? index} value={index < shown.length - 1 || rest.length > 0}>
      <span data-slot="avatar-group-item" className={slots.item()}>
        {child}
      </span>
    </OverlappedContext.Provider>
  ));

  return (
    <GroupContext.Provider value={context}>
      <div
        role="group"
        aria-label={label}
        data-slot="avatar-group"
        className={slots.group({ className })}
        style={{ ['--avatar-size' as string]: SIZE[size], ...style }}
        {...props}
      >
        {items}
        {rest.length > 0 ? (
          <span data-slot="avatar-group-item" className={slots.item()}>
            <AvatarGroupCount people={rest} shape={shape} />
          </span>
        ) : null}
      </div>
    </GroupContext.Provider>
  );
}
AvatarGroup.displayName = 'Avatar.Group';

/** "+3", which opens a list of the three. */
function AvatarGroupCount({ people, shape }: { people: ReactElement<AvatarProps>[]; shape: AvatarShape }) {
  const slots = avatarVariants({ shape });
  const names = people.map((person) => person.props.alt ?? person.props.name).filter(Boolean);
  return (
    <span data-slot="avatar" className={slots.root()}>
      <Popover.Root>
        <Popover.Trigger
          data-slot="avatar-group-count"
          aria-label={`${people.length} more${names.length ? `: ${names.join(', ')}` : ''}`}
          className={avatarVariants({ shape }).face({ className: slots.count() })}
        >
          +{people.length}
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner side="bottom" align="start" sideOffset={8} className="z-50">
            <Popover.Popup className={slots.popup()}>
              <GroupContext.Provider value={null}>
                {people.map((person, index) => (
                  <div key={person.key ?? index} className={slots.row()}>
                    <AvatarRoot {...person.props} size="xs" shape={shape}>
                      {null}
                    </AvatarRoot>
                    <span className="min-w-0 truncate">{person.props.name ?? person.props.alt}</span>
                  </div>
                ))}
              </GroupContext.Provider>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    </span>
  );
}

export const Avatar = Object.assign(AvatarRoot, {
  Badge: AvatarBadge,
  Group: AvatarGroup,
});

export { AvatarBadge, AvatarGroup };
