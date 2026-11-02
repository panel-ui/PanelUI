'use client';

/**
 * Radio Group — one choice from a short list, all of it visible at once.
 *
 * ```tsx
 * <RadioGroup defaultValue="standard" aria-label="Delivery">
 *   <Label><Radio value="standard" /><Label.Text>Standard</Label.Text></Label>
 *   <Label><Radio value="express" /><Label.Text>Express</Label.Text></Label>
 * </RadioGroup>
 * ```
 *
 * ## The dot lands
 *
 * The chosen radio's centre grows in with a small overshoot, and the ring
 * thickens to meet it, so the choice reads as something being set down
 * rather than a colour changing. The one it leaves shrinks back at the same
 * time. With reduced motion both happen at once.
 *
 * ## Arrow keys move the choice
 *
 * The group is one stop for Tab. Inside it, the arrow keys move the choice
 * from one radio to the next, as a native radio group does.
 *
 * ## As cards
 *
 * `RadioGroup.Card` puts each option in a card of its own, with a title, a
 * line of description and something at the far end such as a price, and the
 * radio drawn inside it. The whole card is the target. It comes in three
 * versions: `outline` rings the chosen card in its colour, `filled` tints
 * it, and `dither` fills it from the far edge with an ordered dither in its
 * colour, densest at the edge and thinning towards the text, which sweeps in
 * as the card is chosen and back out as it is left.
 *
 * ## When to use something else
 *
 * For two to five options that each need a line of explanation, ChoiceCards
 * lays them out as cards. For more than about seven, a Select keeps the form
 * short. For a choice that takes effect at once, without a form to submit,
 * Tabs or a ButtonGroup read better.
 */
import { Radio as BaseRadio } from '@base-ui/react/radio';
import { RadioGroup as BaseRadioGroup } from '@base-ui/react/radio-group';
import type { ComponentProps, CSSProperties, ReactNode } from 'react';
import { tv } from 'tailwind-variants';
import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import type { ElementType as RenderElementType } from 'react';

/** Draws a part as another element, or composes it with a component: `render={<a href="/" />}`. */
type RenderProp<Tag extends RenderElementType> = { render?: useRender.ComponentProps<Tag>['render'] };

export type RadioSize = 'sm' | 'md' | 'lg';
export type RadioColor = 'primary' | 'success' | 'info' | 'destructive';

const radioVariants = tv({
  slots: {
    group:
      'flex gap-3 data-[orientation=vertical]:flex-col data-[orientation=horizontal]:flex-row data-[orientation=horizontal]:flex-wrap',
    root: [
      'group/radio relative inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full border outline-none',
      'border-input bg-background shadow-xs dark:bg-input/30',
      'transition-[border-color,border-width,box-shadow] duration-200',
      'hover:not-data-disabled:border-[color-mix(in_oklab,var(--input),var(--foreground)_25%)]',
      'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      'data-checked:border-(--radio-color)',
      'aria-invalid:border-destructive',
      'data-disabled:cursor-not-allowed data-disabled:opacity-50',
      "after:absolute after:-inset-2 after:content-['']",
    ],
    indicator: [
      'pointer-events-none size-[46%] rounded-full bg-(--radio-color)',
      'scale-0 transition-transform duration-300 ease-[cubic-bezier(0.3,1.6,0.5,1)]',
      'data-checked:scale-100 motion-reduce:transition-none',
    ],
  },
  variants: {
    size: {
      sm: { root: 'size-3.5' },
      md: { root: 'size-4 data-checked:border-[1.5px]' },
      lg: { root: 'size-5 data-checked:border-2' },
    },
    color: {
      primary: { root: '[--radio-color:var(--primary)]' },
      success: { root: '[--radio-color:var(--success)]' },
      info: { root: '[--radio-color:var(--info)]' },
      destructive: { root: '[--radio-color:var(--destructive)]' },
    },
  },
  defaultVariants: { size: 'md', color: 'primary' },
});

export interface RadioGroupProps extends Omit<BaseRadioGroup.Props<string>, 'className'> {
  /** Whether the radios stack or sit in a row. Also sets which arrow keys move the choice. Default `vertical`. */
  orientation?: 'vertical' | 'horizontal';
  className?: string;
}

/** Holds one value for the radios inside it. Takes `value`/`onValueChange` or `defaultValue`, and `name` for a form. */
function RadioGroupRoot({ orientation = 'vertical', className, ...props }: RadioGroupProps) {
  return (
    <BaseRadioGroup
      data-slot="radio-group"
      data-orientation={orientation}
      aria-orientation={orientation}
      className={radioVariants().group({ className })}
      {...props}
    />
  );
}
RadioGroupRoot.displayName = 'RadioGroup';

export interface RadioProps extends Omit<BaseRadio.Root.Props<string>, 'className' | 'color'> {
  /** Default `md`. */
  size?: RadioSize;
  /** The colour of the chosen radio. `primary` by default. */
  color?: RadioColor;
  /** What a screen reader calls it, when there is no visible label tied to it. */
  label?: string;
  className?: string;
  style?: CSSProperties;
}

/** One option. `value` is what the group's value becomes when it is chosen. */
function Radio({ size = 'md', color, label, className, ...props }: RadioProps) {
  const slots = radioVariants({ size, color });
  return (
    <BaseRadio.Root
      data-slot="radio"
      data-size={size}
      aria-label={label}
      className={slots.root({ className })}
      {...props}
    >
      <BaseRadio.Indicator data-slot="radio-indicator" keepMounted className={slots.indicator()} />
    </BaseRadio.Root>
  );
}
Radio.displayName = 'RadioGroup.Item';

/** The 4×4 Bayer matrix, as thresholds 0–15. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

/** Masks an element to an even ordered dither at `level` of 16, in 2px cells. */
function ditherMask(level: number): CSSProperties {
  let rects = '';
  BAYER.forEach((threshold, index) => {
    if (threshold < level) rects += `<rect x='${index % 4}' y='${Math.floor(index / 4)}' width='1' height='1'/>`;
  });
  const image = `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 4 4' shape-rendering='crispEdges'>${rects}</svg>`
  )}")`;
  return { maskImage: image, WebkitMaskImage: image, maskSize: '8px 8px', WebkitMaskSize: '8px 8px' };
}

/** The dither ramp's bands, from the far edge in: how wide each reaches, and how dense it is. */
const RAMP = [
  { reach: '9%', level: 12 },
  { reach: '17%', level: 7 },
  { reach: '25%', level: 3 },
  { reach: '32%', level: 1 },
].map((band) => ({ ...band, style: ditherMask(band.level) }));

export type RadioCardAppearance = 'outline' | 'filled' | 'dither';

const cardVariants = tv({
  slots: {
    card: [
      'group/card relative flex w-full min-w-0 cursor-pointer items-start gap-3 overflow-hidden rounded-xl border p-3.5 text-start outline-none select-none',
      'border-border bg-background shadow-xs transition-[border-color,background-color,box-shadow] duration-200 dark:bg-input/20',
      'hover:not-data-disabled:border-[color-mix(in_oklab,var(--border),var(--foreground)_18%)]',
      'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      'data-disabled:cursor-not-allowed data-disabled:opacity-50',
    ],
    dot: [
      'relative z-10 mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-full border border-input bg-background',
      'transition-[border-color,border-width] duration-200 group-data-checked/card:border-[1.5px] group-data-checked/card:border-(--radio-color)',
    ],
    dotFill: [
      'size-[46%] rounded-full bg-(--radio-color) scale-0 transition-transform duration-300 ease-[cubic-bezier(0.3,1.6,0.5,1)]',
      'group-data-checked/card:scale-100 motion-reduce:transition-none',
    ],
    body: 'relative z-10 flex min-w-0 flex-1 flex-col gap-0.5',
    title: 'text-sm font-medium leading-5 text-foreground',
    description: 'text-[0.8125rem] leading-5 text-muted-foreground',
    aside: 'relative z-10 ms-auto shrink-0 text-sm font-medium tabular-nums text-foreground',
    ramp: 'pointer-events-none absolute inset-0',
    band: [
      'absolute inset-y-0 end-0 bg-(--radio-color)',
      // Hidden by sliding its clip to the far edge, so the sweep runs from there inwards.
      '[clip-path:inset(0_0_0_100%)] rtl:[clip-path:inset(0_100%_0_0)] transition-[clip-path] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]',
      'group-data-checked/card:[clip-path:inset(0_0_0_0)] motion-reduce:transition-none',
    ],
    cards: 'grid gap-2',
  },
  variants: {
    appearance: {
      outline: {
        card: 'data-checked:border-(--radio-color) data-checked:shadow-[0_0_0_1px_var(--radio-color)]',
      },
      filled: {
        card: [
          'data-checked:border-[color-mix(in_oklab,var(--radio-color)_45%,var(--background))]',
          'data-checked:bg-[color-mix(in_oklab,var(--radio-color)_9%,var(--background))] dark:data-checked:bg-[color-mix(in_oklab,var(--radio-color)_16%,var(--background))]',
        ],
      },
      dither: {
        card: 'data-checked:border-[color-mix(in_oklab,var(--radio-color)_55%,var(--background))]',
      },
    },
    color: {
      primary: { card: '[--radio-color:var(--primary)]' },
      success: { card: '[--radio-color:var(--success)]' },
      info: { card: '[--radio-color:var(--info)]' },
      destructive: { card: '[--radio-color:var(--destructive)]' },
    },
  },
  defaultVariants: { appearance: 'outline', color: 'primary' },
});

export interface RadioCardProps extends Omit<BaseRadio.Root.Props<string>, 'className' | 'color' | 'children'> {
  /**
   * How the chosen card is marked: a ring, a tint, or a dither ramp from the
   * far edge. The ramp draws where `RadioGroup.CardAside` would sit, so leave
   * the aside out of a `dither` card. Default `outline`.
   */
  appearance?: RadioCardAppearance;
  /** The colour the chosen card is marked in. `primary` by default. */
  color?: RadioColor;
  className?: string;
  style?: CSSProperties;
  /** `RadioGroup.CardTitle`, `RadioGroup.CardDescription` and `RadioGroup.CardAside`. */
  children?: ReactNode;
}

/** One option drawn as a card, with its radio inside. The whole card is pressed to choose it. */
function RadioCard({ appearance = 'outline', color, className, children, ...props }: RadioCardProps) {
  const slots = cardVariants({ appearance, color });
  return (
    <BaseRadio.Root
      data-slot="radio-card"
      data-appearance={appearance}
      className={slots.card({ className })}
      {...props}
    >
      {appearance === 'dither' ? (
        <span aria-hidden="true" className={slots.ramp()}>
          {RAMP.map((band) => (
            <span key={band.level} className={slots.band()} style={{ width: band.reach, ...band.style }} />
          ))}
        </span>
      ) : null}
      <span data-slot="radio-card-indicator" aria-hidden="true" className={slots.dot()}>
        <span className={slots.dotFill()} />
      </span>
      {children}
    </BaseRadio.Root>
  );
}
RadioCard.displayName = 'RadioGroup.Card';

/** Holds a card's title and description, beside the radio. */
function RadioCardBody({ className, render, ...props }: ComponentProps<'span'> & RenderProp<'span'>) {
  return useRender({
    defaultTagName: 'span',
    render,
    props: mergeProps({ 'data-slot': 'radio-card-body', className: cardVariants().body({ className }) }, props),
  });
}
RadioCardBody.displayName = 'RadioGroup.CardBody';

/** The option's name. */
function RadioCardTitle({ className, render, ...props }: ComponentProps<'span'> & RenderProp<'span'>) {
  return useRender({
    defaultTagName: 'span',
    render,
    props: mergeProps({ 'data-slot': 'radio-card-title', className: cardVariants().title({ className }) }, props),
  });
}
RadioCardTitle.displayName = 'RadioGroup.CardTitle';

/** A line under the name saying what the option means. */
function RadioCardDescription({ className, render, ...props }: ComponentProps<'span'> & RenderProp<'span'>) {
  return useRender({
    defaultTagName: 'span',
    render,
    props: mergeProps(
      { 'data-slot': 'radio-card-description', className: cardVariants().description({ className }) },
      props
    ),
  });
}
RadioCardDescription.displayName = 'RadioGroup.CardDescription';

/** Pushed to the far end of the card: a price, a duration, a badge. */
function RadioCardAside({ className, render, ...props }: ComponentProps<'span'> & RenderProp<'span'>) {
  return useRender({
    defaultTagName: 'span',
    render,
    props: mergeProps({ 'data-slot': 'radio-card-aside', className: cardVariants().aside({ className }) }, props),
  });
}
RadioCardAside.displayName = 'RadioGroup.CardAside';

export const RadioGroup = Object.assign(RadioGroupRoot, {
  Item: Radio,
  Card: RadioCard,
  CardBody: RadioCardBody,
  CardTitle: RadioCardTitle,
  CardDescription: RadioCardDescription,
  CardAside: RadioCardAside,
});

export {
  Radio,
  Radio as RadioGroupItem,
  RadioCard,
  RadioCard as RadioGroupCard,
  RadioCardBody as RadioGroupCardBody,
  RadioCardTitle as RadioGroupCardTitle,
  RadioCardDescription as RadioGroupCardDescription,
  RadioCardAside as RadioGroupCardAside,
};
