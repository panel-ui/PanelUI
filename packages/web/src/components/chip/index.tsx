'use client';

/**
 * Chip — a small pill that can be pressed: a filter turned on and off, or a value taken back out.
 *
 * ```tsx
 * <Chip.Group defaultValue={['open']} aria-label="Show">
 *   <Chip value="open">Open</Chip>
 *   <Chip value="merged">Merged</Chip>
 *   <Chip value="closed">Closed</Chip>
 * </Chip.Group>
 *
 * <Chip onRemove={() => drop('design')}>design</Chip>
 * ```
 *
 * ## Two jobs, one shape
 *
 * A chip on its own, or in a `Chip.Group`, is a toggle: pressing it turns a
 * filter on, and a tick slides in at its start while the pill fills, so a
 * row of them reads as a row of switches rather than a row of tags. The
 * group holds the values that are on as one array; pass `multiple={false}`
 * for a row where only one can be on.
 *
 * Given `onRemove`, a chip is a value that has been added — a recipient, a
 * tag — and carries a small × to take it back out. It is not a toggle then,
 * and pressing Backspace or Delete while its × has focus removes it too.
 *
 * For a label that only says what something is, and is never pressed, use
 * Badge.
 */
import { Toggle as BaseToggle } from '@base-ui/react/toggle';
import { ToggleGroup as BaseToggleGroup } from '@base-ui/react/toggle-group';
import type { ComponentProps, CSSProperties, KeyboardEvent, ReactNode } from 'react';
import { tv } from 'tailwind-variants';

export type ChipSize = 'sm' | 'md' | 'lg';
export type ChipColor = 'primary' | 'success' | 'info' | 'warning' | 'destructive';

const chipVariants = tv({
  slots: {
    root: [
      'group/chip inline-flex shrink-0 items-center whitespace-nowrap rounded-full border font-medium outline-none select-none',
      'border-border bg-background text-foreground shadow-xs dark:bg-input/30',
      'transition-[background-color,border-color,color,padding] duration-200',
      'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      'data-disabled:pointer-events-none data-disabled:opacity-50',
      '[&_svg:not([class*=size-])]:size-3.5 [&_svg]:shrink-0',
    ],
    // A toggle: tinted in its colour when on.
    toggle: [
      'cursor-pointer hover:bg-muted/60',
      'data-pressed:border-[color-mix(in_oklab,var(--chip-color)_40%,var(--background))]',
      'data-pressed:bg-[color-mix(in_oklab,var(--chip-color)_12%,var(--background))] dark:data-pressed:bg-[color-mix(in_oklab,var(--chip-color)_20%,var(--background))]',
      'data-pressed:text-[color-mix(in_oklab,var(--chip-color),var(--foreground)_35%)]',
    ],
    // The tick's box opens from nothing, so the label slides over to make room for it.
    check: [
      'grid w-0 overflow-hidden opacity-0 transition-[width,opacity,margin] duration-200 ease-out',
      'group-data-pressed/chip:w-3.5 group-data-pressed/chip:opacity-100 group-data-pressed/chip:me-1',
      'motion-reduce:transition-none',
    ],
    remove: [
      'relative -me-1 ms-1 inline-flex size-4 cursor-pointer items-center justify-center rounded-full text-muted-foreground outline-none',
      'hover:bg-foreground/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring',
      // A bigger target than the mark.
      "after:absolute after:-inset-1.5 after:content-['']",
    ],
    group: 'flex flex-wrap gap-2',
  },
  variants: {
    size: {
      sm: { root: 'h-6 px-2 text-xs' },
      md: { root: 'h-7 px-2.5 text-[0.8125rem]' },
      lg: { root: 'h-8 px-3 text-sm' },
    },
    color: {
      primary: { root: '[--chip-color:var(--primary)]' },
      success: { root: '[--chip-color:var(--success)]' },
      info: { root: '[--chip-color:var(--info)]' },
      warning: { root: '[--chip-color:var(--warning)]' },
      destructive: { root: '[--chip-color:var(--destructive)]' },
    },
  },
  defaultVariants: { size: 'md', color: 'primary' },
});

interface ChipBaseProps {
  /** Default `md`. */
  size?: ChipSize;
  /** The colour it takes when on. `primary` by default. */
  color?: ChipColor;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

export interface ChipToggleProps extends ChipBaseProps, Omit<BaseToggle.Props, 'className' | 'color' | 'children' | 'style'> {
  onRemove?: undefined;
}

export interface ChipRemovableProps extends ChipBaseProps, Omit<ComponentProps<'span'>, 'color' | 'children'> {
  /**
   * Makes the chip a value that can be taken out: it shows a × that calls
   * this. A removable chip is not a toggle.
   */
  onRemove: () => void;
  /** What the × is called to a screen reader. Default `Remove <text>`, when the text is a string. */
  removeLabel?: string;
  disabled?: boolean;
}

export type ChipProps = ChipToggleProps | ChipRemovableProps;

/**
 * A toggle pill. Takes `pressed`/`onPressedChange` or `defaultPressed` on its
 * own, and `value` inside a `Chip.Group`. Given `onRemove`, a removable value instead.
 */
function ChipRoot(props: ChipProps) {
  if (props.onRemove) {
    const { size = 'md', color, className, children, onRemove, removeLabel, disabled, ...rest } = props;
    const slots = chipVariants({ size, color });
    const label = removeLabel ?? (typeof children === 'string' ? `Remove ${children}` : 'Remove');
    const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === 'Backspace' || event.key === 'Delete') {
        event.preventDefault();
        onRemove();
      }
    };
    return (
      <span
        data-slot="chip"
        data-removable=""
        data-disabled={disabled ? '' : undefined}
        className={slots.root({ className })}
        {...rest}
      >
        {children}
        <button
          type="button"
          data-slot="chip-remove"
          aria-label={label}
          disabled={disabled}
          onClick={onRemove}
          onKeyDown={onKeyDown}
          className={slots.remove()}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true" fill="none" className="size-3">
            <path d="M4.5 4.5l7 7m0-7l-7 7" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" />
          </svg>
        </button>
      </span>
    );
  }

  const { size = 'md', color, className, children, onRemove: _onRemove, ...rest } = props;
  const slots = chipVariants({ size, color });
  return (
    <BaseToggle data-slot="chip" data-size={size} className={slots.root({ className: [slots.toggle(), className] })} {...rest}>
      <span data-slot="chip-check" aria-hidden="true" className={slots.check()}>
        <svg viewBox="0 0 16 16" fill="none" className="size-3.5">
          <path d="M3.5 8.5 6.6 11.5 12.5 4.75" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      {children}
    </BaseToggle>
  );
}
ChipRoot.displayName = 'Chip';

export interface ChipGroupProps extends Omit<BaseToggleGroup.Props<string>, 'className'> {
  className?: string;
}

/**
 * A row of toggle chips whose values are held as one array. Several can be on
 * at once; pass `multiple={false}` for one at a time.
 */
function ChipGroup({ multiple = true, className, ...props }: ChipGroupProps) {
  return (
    <BaseToggleGroup
      data-slot="chip-group"
      multiple={multiple}
      className={chipVariants().group({ className })}
      {...props}
    />
  );
}
ChipGroup.displayName = 'Chip.Group';

export const Chip = Object.assign(ChipRoot, { Group: ChipGroup });

export { ChipGroup };
