/**
 * Checkbox — one choice that is on or off, usually among others that are too.
 *
 * ```tsx
 * <Label>
 *   <Checkbox defaultChecked />
 *   <Label.Text>Email me a receipt</Label.Text>
 * </Label>
 *
 * <Checkbox.Group defaultValue={['sms']} aria-label="Notify me by">
 *   <Label><Checkbox value="email" /><Label.Text>Email</Label.Text></Label>
 *   <Label><Checkbox value="sms" /><Label.Text>Text message</Label.Text></Label>
 * </Checkbox.Group>
 * ```
 *
 * ## The tick is drawn, not swapped in
 *
 * When it is checked, the tick is drawn as a line from its short end to its
 * long one, the way a pen would make it, and the box fills behind it. Unchecked,
 * the line goes back the way it came. A box that only changes colour is easy to
 * miss in a long list; one that draws its mark is not. With reduced motion the
 * tick appears at once.
 *
 * ## Some, but not all
 *
 * `indeterminate` draws a dash instead of a tick, for a box that stands for a
 * group whose members are mixed. A `Checkbox.Group` with `allValues` does the
 * bookkeeping: a checkbox in it marked `parent` is checked when every member
 * is, a dash when some are, and checks or clears them all when pressed.
 *
 * ## Choosing a colour
 *
 * A checkbox fills with `primary`. `success`, `info` and `destructive` are for
 * a box whose meaning is that colour — "I accept the risk" is `destructive`.
 */
import { Checkbox as BaseCheckbox } from '@base-ui/react/checkbox';
import { CheckboxGroup as BaseCheckboxGroup } from '@base-ui/react/checkbox-group';
import type { CSSProperties } from 'react';
import { tv } from 'tailwind-variants';

export type CheckboxSize = 'sm' | 'md' | 'lg';
export type CheckboxColor = 'primary' | 'success' | 'info' | 'destructive';

const checkboxVariants = tv({
  slots: {
    root: [
      'group/checkbox relative inline-flex shrink-0 cursor-pointer items-center justify-center rounded-[0.3rem] border outline-none',
      'border-input bg-background shadow-xs dark:bg-input/30',
      'transition-[background-color,border-color,box-shadow] duration-150',
      'hover:not-data-disabled:border-[color-mix(in_oklab,var(--input),var(--foreground)_25%)]',
      'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      // Checked or mixed: the box fills with the colour, and the border goes with it.
      'data-checked:border-(--checkbox-color) data-checked:bg-(--checkbox-color)',
      'data-indeterminate:border-(--checkbox-color) data-indeterminate:bg-(--checkbox-color)',
      'aria-invalid:border-destructive aria-invalid:ring-destructive/20',
      'data-disabled:cursor-not-allowed data-disabled:opacity-50',
      // A wider target than the box, so it is not a fiddle to hit on a phone.
      "after:absolute after:-inset-2 after:content-['']",
    ],
    indicator: 'pointer-events-none absolute inset-0 flex items-center justify-center text-(--checkbox-mark)',
    mark: 'size-[78%] overflow-visible',
    // The tick is one path of length ~1; the dash offset draws and undraws it.
    tick: [
      '[stroke-dasharray:1] [stroke-dashoffset:1] transition-[stroke-dashoffset] duration-200 ease-out',
      'group-data-checked/checkbox:[stroke-dashoffset:0] group-data-checked/checkbox:delay-75',
      'motion-reduce:transition-none',
    ],
    dash: 'origin-center scale-x-0 transition-transform duration-150 group-data-indeterminate/checkbox:scale-x-100 motion-reduce:transition-none',
    group: 'flex flex-col gap-3',
  },
  variants: {
    size: {
      sm: { root: 'size-3.5' },
      md: { root: 'size-4' },
      lg: { root: 'size-5 rounded-[0.375rem]' },
    },
    color: {
      primary: { root: '[--checkbox-color:var(--primary)] [--checkbox-mark:var(--primary-foreground)]' },
      success: { root: '[--checkbox-color:var(--success)] [--checkbox-mark:white]' },
      info: { root: '[--checkbox-color:var(--info)] [--checkbox-mark:white]' },
      destructive: { root: '[--checkbox-color:var(--destructive)] [--checkbox-mark:white]' },
    },
  },
  defaultVariants: { size: 'md', color: 'primary' },
});

export interface CheckboxProps extends Omit<BaseCheckbox.Root.Props, 'className' | 'color'> {
  /** Default `md`. */
  size?: CheckboxSize;
  /** The colour it fills with when checked. `primary` by default. */
  color?: CheckboxColor;
  /** What a screen reader calls it, when there is no visible label tied to it. */
  label?: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * A checkbox. Takes `checked`/`onCheckedChange` or `defaultChecked`,
 * `indeterminate`, and `name` and `value` for a form or a `Checkbox.Group`.
 */
function CheckboxRoot({ size = 'md', color, label, className, ...props }: CheckboxProps) {
  const slots = checkboxVariants({ size, color });
  return (
    <BaseCheckbox.Root data-slot="checkbox" data-size={size} aria-label={label} className={slots.root({ className })} {...props}>
      <BaseCheckbox.Indicator data-slot="checkbox-indicator" keepMounted className={slots.indicator()}>
        <svg viewBox="0 0 16 16" aria-hidden="true" fill="none" className={slots.mark()}>
          <path
            className={slots.tick()}
            pathLength={1}
            d="M3.5 8.5 6.6 11.5 12.5 4.75"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path className={slots.dash()} d="M4 8h8" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
        </svg>
      </BaseCheckbox.Indicator>
    </BaseCheckbox.Root>
  );
}
CheckboxRoot.displayName = 'Checkbox';

export interface CheckboxGroupProps extends Omit<BaseCheckboxGroup.Props, 'className'> {
  className?: string;
}

/**
 * Holds the values of the checkboxes inside it as one array. Takes
 * `value`/`onValueChange` or `defaultValue`, and `allValues` for a `parent` box.
 */
function CheckboxGroup({ className, ...props }: CheckboxGroupProps) {
  return <BaseCheckboxGroup data-slot="checkbox-group" className={checkboxVariants().group({ className })} {...props} />;
}
CheckboxGroup.displayName = 'Checkbox.Group';

export const Checkbox = Object.assign(CheckboxRoot, { Group: CheckboxGroup });

export { CheckboxGroup };
