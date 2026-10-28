'use client';

/**
 * ChoiceCards — one option chosen from a few, each shown as a picture of
 * what it does.
 *
 * ```tsx
 * <ChoiceCards defaultValue="rounded" aria-label="Pointer">
 *   <ChoiceCards.Item value="classic">
 *     <ChoiceCards.Media><ClassicPointer /></ChoiceCards.Media>
 *     <ChoiceCards.Label>Classic</ChoiceCards.Label>
 *   </ChoiceCards.Item>
 *   …
 * </ChoiceCards>
 * ```
 *
 * ## Show the option, not its name
 *
 * A pointer style, an aspect ratio, a background: options that are seen
 * before they are understood. Each card leads with a picture of the option,
 * so the choice is made by looking, and the name under it confirms it.
 *
 * ## The chosen one comes forward
 *
 * The chosen card is ringed in the theme colour, a check settles into its
 * corner, and its picture grows a little, as if lifted towards the reader.
 * The others stay flat, so a row of cards still reads as one choice and one
 * set of alternatives.
 */
import { Radio } from '@base-ui/react/radio';
import { RadioGroup } from '@base-ui/react/radio-group';
import { createContext, useContext, useId, type ComponentProps, type CSSProperties, type ReactNode } from 'react';
import { tv } from 'tailwind-variants';

export type ChoiceCardsColor = 'primary' | 'info' | 'success' | 'warning' | 'destructive';

const SPRING = 'ease-[cubic-bezier(0.3,1.35,0.45,1)]';

const choiceCardsVariants = tv({
  slots: {
    root: 'grid w-full grid-cols-(--choice-columns) gap-2 data-disabled:opacity-50',
    item: [
      'group/choice relative flex min-w-0 cursor-pointer flex-col gap-1.5 rounded-[18px] p-1.5 text-start outline-none select-none',
      'bg-muted/60 transition-[background-color,box-shadow] duration-200 hover:bg-muted',
      // The ring stands clear of the card, so it never sits on the picture.
      'ring-offset-2 ring-offset-background data-checked:bg-muted data-checked:ring-2 data-checked:ring-(--choice)',
      'focus-visible:ring-2 focus-visible:ring-ring',
      'data-disabled:cursor-not-allowed data-disabled:opacity-50',
    ],
    media: [
      'relative flex aspect-(--choice-aspect) w-full items-center justify-center overflow-hidden rounded-xl',
      // A frame a step lighter than the card in either theme, with a hairline edge.
      'bg-background/80 ring-1 ring-inset ring-foreground/[0.05] dark:bg-foreground/[0.06]',
      'text-foreground/80 [&>*]:transition-transform [&>*]:duration-[420ms] [&>*]:ease-[cubic-bezier(0.3,1.35,0.45,1)]',
      'group-data-checked/choice:text-foreground group-data-checked/choice:[&>*]:scale-[1.06] motion-reduce:[&>*]:transition-none',
      '[&>img]:size-full [&>img]:object-cover',
    ],
    check: [
      'pointer-events-none absolute end-1.5 top-1.5 z-10 flex size-5 items-center justify-center rounded-full bg-(--choice) text-(--choice-foreground)',
      `scale-0 opacity-0 shadow-sm transition-[scale,opacity] duration-300 ${SPRING}`,
      'group-data-checked/choice:scale-100 group-data-checked/choice:opacity-100 motion-reduce:transition-none',
    ],
    text: 'flex flex-col gap-0.5 px-1.5 pb-1',
    label: 'truncate text-[13px] font-medium text-foreground/80 group-data-checked/choice:text-foreground',
    description: 'text-xs leading-4 text-muted-foreground',
  },
  variants: {
    color: {
      primary: { root: '[--choice:var(--primary)] [--choice-foreground:var(--primary-foreground)]' },
      info: { root: '[--choice:var(--info)] [--choice-foreground:white]' },
      success: { root: '[--choice:var(--success)] [--choice-foreground:white]' },
      warning: { root: '[--choice:var(--warning)] [--choice-foreground:black]' },
      destructive: { root: '[--choice:var(--destructive)] [--choice-foreground:white]' },
    },
  },
  defaultVariants: { color: 'primary' },
});

interface ItemContextValue {
  labelId: string;
  descriptionId: string;
}

const ItemContext = createContext<ItemContextValue | null>(null);

export interface ChoiceCardsProps
  extends Omit<RadioGroup.Props<string>, 'className' | 'style' | 'children'> {
  /** How many cards stand in a row. Default: one per item, up to four. */
  columns?: number;
  /** The shape of every card's picture, as a CSS aspect ratio. Default `4 / 3`. */
  aspect?: string;
  /** The colour of the ring and the check on the chosen card. Default `primary`. */
  color?: ChoiceCardsColor;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/**
 * The cards, of which one is chosen. `value` and `onValueChange`, or
 * `defaultValue`, hold which; `name` submits it with a form.
 */
function ChoiceCardsRoot({
  columns,
  aspect = '4 / 3',
  color,
  className,
  style,
  children,
  ...props
}: ChoiceCardsProps) {
  const slots = choiceCardsVariants({ color });
  const count = Array.isArray(children) ? children.filter(Boolean).length : 1;
  const across = columns ?? Math.min(Math.max(count, 1), 4);
  return (
    <RadioGroup
      data-slot="choice-cards"
      className={slots.root({ className })}
      style={
        {
          ...style,
          '--choice-columns': `repeat(${across}, minmax(0, 1fr))`,
          '--choice-aspect': aspect,
        } as CSSProperties
      }
      {...props}
    >
      {children}
    </RadioGroup>
  );
}
ChoiceCardsRoot.displayName = 'ChoiceCards';

export interface ChoiceCardsItemProps extends Omit<Radio.Root.Props, 'className' | 'value'> {
  /** What choosing this card sets the group's value to. */
  value: string;
  className?: string;
}

/** One option: a `ChoiceCards.Media` picture, a `Label`, and maybe a `Description`. */
function ChoiceCardsItem({ className, children, ...props }: ChoiceCardsItemProps) {
  const slots = choiceCardsVariants();
  const id = useId();
  const ids = { labelId: `${id}-label`, descriptionId: `${id}-description` };
  return (
    <ItemContext.Provider value={ids}>
      <Radio.Root
        data-slot="choice-cards-item"
        aria-labelledby={ids.labelId}
        aria-describedby={ids.descriptionId}
        className={slots.item({ className })}
        {...props}
      >
        <span aria-hidden data-slot="choice-cards-check" className={slots.check()}>
          <svg viewBox="0 0 12 12" className="size-3" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M2.75 6.25 5 8.5l4.25-5" />
          </svg>
        </span>
        {children}
      </Radio.Root>
    </ItemContext.Provider>
  );
}
ChoiceCardsItem.displayName = 'ChoiceCards.Item';

export interface ChoiceCardsMediaProps extends ComponentProps<'span'> {}

/** The picture of the option: a drawing, an icon or an image, centred in a rounded frame. */
function ChoiceCardsMedia({ className, ...props }: ChoiceCardsMediaProps) {
  const slots = choiceCardsVariants();
  return <span aria-hidden data-slot="choice-cards-media" className={slots.media({ className })} {...props} />;
}
ChoiceCardsMedia.displayName = 'ChoiceCards.Media';

/** Gathers the label and description under the picture, with the card's padding. */
function useItem(part: string) {
  const item = useContext(ItemContext);
  if (!item) throw new Error(`${part} must be used inside a <ChoiceCards.Item>.`);
  return item;
}

export interface ChoiceCardsLabelProps extends ComponentProps<'span'> {}

/** The option's name, under its picture. It is what a screen reader calls the card. */
function ChoiceCardsLabel({ className, ...props }: ChoiceCardsLabelProps) {
  const { labelId } = useItem('ChoiceCards.Label');
  const slots = choiceCardsVariants();
  return (
    <span data-slot="choice-cards-text" className={slots.text()}>
      <span id={labelId} data-slot="choice-cards-label" className={slots.label({ className })} {...props} />
    </span>
  );
}
ChoiceCardsLabel.displayName = 'ChoiceCards.Label';

export interface ChoiceCardsDescriptionProps extends ComponentProps<'span'> {}

/** A line under the label: what the option costs or does. */
function ChoiceCardsDescription({ className, ...props }: ChoiceCardsDescriptionProps) {
  const { descriptionId } = useItem('ChoiceCards.Description');
  const slots = choiceCardsVariants();
  return (
    <span
      id={descriptionId}
      data-slot="choice-cards-description"
      className={slots.description({ className: ['-mt-1.5 px-1.5 pb-1', className] })}
      {...props}
    />
  );
}
ChoiceCardsDescription.displayName = 'ChoiceCards.Description';

export const ChoiceCards = Object.assign(ChoiceCardsRoot, {
  Item: ChoiceCardsItem,
  Media: ChoiceCardsMedia,
  Label: ChoiceCardsLabel,
  Description: ChoiceCardsDescription,
});

export { ChoiceCardsItem, ChoiceCardsMedia, ChoiceCardsLabel, ChoiceCardsDescription, choiceCardsVariants };
