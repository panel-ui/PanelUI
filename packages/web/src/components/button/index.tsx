/**
 * Button — something to press, in the weight its action deserves.
 *
 * ```tsx
 * <Button>Save</Button>
 * <Button variant="outline" size="sm">Cancel</Button>
 * <Button variant="ghost" size="icon" aria-label="Close"><XIcon /></Button>
 * <Button loading>Saving</Button>
 * ```
 *
 * ## Weight
 *
 * `default` is the one action a view is for, and there should be one of it.
 * `secondary` and `outline` are the actions beside it, `ghost` the ones that
 * should not draw the eye until they are looked for, and `destructive` the
 * one that cannot be taken back.
 *
 * ## Loading
 *
 * `loading` sets a spinner over the label and stops presses. The label stays
 * in place, hidden, so the width does not change: a button that resizes as it
 * is pressed moves whatever sits beside it.
 *
 * ## A link that looks like a button
 *
 * An action that goes to another page is a link, whatever it looks like, so
 * that it opens in a new tab and reads as a link to a screen reader. Pass the
 * link as `render` and the button's look and behaviour are put on it:
 * `<Button render={<a href="/" />}>Home</Button>`. The button is the headless
 * button primitive underneath, so keyboard handling, `disabled` and focus work
 * the same whatever it is drawn as.
 */
import { Button as BaseButton } from '@base-ui/react/button';
import { isValidElement, type ComponentProps, type ReactElement } from 'react';
import { tv, type VariantProps } from 'tailwind-variants';

export const buttonVariants = tv({
  base: [
    'relative inline-flex shrink-0 cursor-pointer select-none items-center justify-center gap-2 whitespace-nowrap font-medium outline-none',
    'transition-[background-color,color,border-color,box-shadow,scale] duration-150',
    'focus-visible:ring-[3px] focus-visible:ring-ring/40',
    'active:not-disabled:scale-[0.97] motion-reduce:active:scale-100',
    'disabled:cursor-default disabled:opacity-50 aria-busy:cursor-progress',
    '[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-4',
  ],
  variants: {
    variant: {
      default:
        'bg-primary text-primary-foreground shadow-xs inset-shadow-[0_1px_0_rgb(255_255_255/0.12)] hover:not-disabled:bg-primary/90',
      secondary: 'bg-secondary text-secondary-foreground hover:not-disabled:bg-secondary/80',
      outline:
        'border bg-background text-foreground shadow-xs hover:not-disabled:bg-accent hover:not-disabled:text-accent-foreground dark:bg-input/30',
      ghost: 'text-foreground hover:not-disabled:bg-accent hover:not-disabled:text-accent-foreground',
      destructive:
        'bg-destructive text-white shadow-xs hover:not-disabled:bg-destructive/90 focus-visible:ring-destructive/40',
      link: 'text-foreground underline-offset-4 hover:underline',
    },
    size: {
      sm: 'h-8 rounded-md px-3 text-[0.8125rem]',
      md: 'h-9 rounded-lg px-4 text-sm',
      lg: 'h-11 rounded-xl px-5 text-[0.9375rem]',
      'icon-sm': 'size-8 rounded-md',
      icon: 'size-9 rounded-lg',
      'icon-lg': 'size-11 rounded-xl [&_svg:not([class*=size-])]:size-5',
    },
    /** `pill` rounds the ends fully, whatever the size. */
    shape: {
      default: '',
      pill: 'rounded-full',
    },
  },
  defaultVariants: { variant: 'default', size: 'md', shape: 'default' },
});

export type ButtonVariant = NonNullable<VariantProps<typeof buttonVariants>['variant']>;
export type ButtonSize = NonNullable<VariantProps<typeof buttonVariants>['size']>;

export interface ButtonProps extends ComponentProps<'button'> {
  /** How much the button asks to be pressed. Default `default`. */
  variant?: ButtonVariant;
  /** Its height and padding. The `icon` sizes are square, for a button that holds only an icon. Default `md`. */
  size?: ButtonSize;
  /** `pill` rounds the ends fully. Default `default`. */
  shape?: 'default' | 'pill';
  /** Shows a spinner over the label, sets `aria-busy` and stops presses, keeping the width. */
  loading?: boolean;
  /**
   * An element to draw the button as, such as `<a href="/" />` or a router's
   * link, or a function of the props and state that returns one. It takes the
   * button's classes, children, ref and event handlers. A link stays a link: it
   * is not given `type`, and Space does not press it.
   */
  render?: BaseButton.Props['render'];
  /**
   * Whether `render` draws a native `<button>`. Set automatically for an
   * element; pass it when `render` is a function that returns something else.
   */
  nativeButton?: boolean;
}

function Spinner() {
  return (
    <svg
      aria-hidden="true"
      data-slot="button-spinner"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      className="absolute inset-0 m-auto animate-spin motion-reduce:animate-none"
    >
      <path d="M21 12a9 9 0 1 1-6.22-8.56" />
    </svg>
  );
}

/** A button. Every attribute of `<button>` passes through. */
function ButtonRoot({
  variant,
  size,
  shape,
  loading = false,
  disabled,
  type = 'button',
  className,
  children,
  render,
  nativeButton,
  ...props
}: ButtonProps) {
  // An element to render tells whether it is a native button; a function cannot, so it says.
  const native = nativeButton ?? (render === undefined || (isValidElement(render) && render.type === 'button'));
  return (
    <BaseButton
      type={native ? type : undefined}
      data-slot="button"
      data-variant={variant ?? 'default'}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      focusableWhenDisabled={loading}
      nativeButton={native}
      render={render as ReactElement | undefined}
      className={buttonVariants({ variant, size, shape, className })}
      {...(props as Omit<BaseButton.Props, 'className'>)}
    >
      {loading ? <Spinner /> : null}
      {/* `contents`, so the label still lays out in the button's own row. */}
      <span className={loading ? 'invisible contents' : 'contents'}>{children}</span>
    </BaseButton>
  );
}
ButtonRoot.displayName = 'Button';

export const Button = ButtonRoot;
