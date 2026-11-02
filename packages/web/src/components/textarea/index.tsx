'use client';

/**
 * Textarea — a field for more than one line, that grows as it is written in.
 *
 * ```tsx
 * <Textarea placeholder="What happened?" />
 * <Textarea minRows={1} maxRows={6} variant="ghost" />
 * ```
 *
 * ## Growing
 *
 * It starts `minRows` lines tall and grows a line at a time as text is
 * written, up to `maxRows`. Past that it scrolls, with a thin scrollbar of its
 * own rather than the browser's. Pass `autoResize={false}` for a field that
 * keeps the size `rows` gives it and can be resized by hand.
 *
 * The height is measured from the text, so it is right on the first render
 * for a value that was already there, and for a value set from outside.
 *
 * ## Ghost
 *
 * `variant="ghost"` drops the border, background and ring, for a field set
 * inside something that already draws them, such as a card or a composer.
 *
 * ## Inside a Field
 *
 * Put in a `Field`, it takes the field's label, description and error without
 * ids passed by hand, and turns invalid when the field does.
 */
import { Field as BaseField } from '@base-ui/react/field';
import { useCallback, useLayoutEffect, useRef, type ComponentProps, type Ref } from 'react';
import { tv } from 'tailwind-variants';

const textareaVariants = tv({
  base: [
    'block w-full min-w-0 bg-transparent text-foreground outline-none',
    'placeholder:text-muted-foreground/80 selection:bg-primary selection:text-primary-foreground',
    'disabled:cursor-not-allowed disabled:opacity-50',
    // A thin bar in the theme's border colour, never the platform's wide one.
    '[scrollbar-color:var(--border)_transparent] [scrollbar-width:thin]',
  ],
  variants: {
    variant: {
      default: [
        'rounded-lg border border-input bg-background shadow-xs transition-[border-color,box-shadow] dark:bg-input/30',
        'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30',
        'aria-invalid:border-destructive aria-invalid:ring-destructive/20',
      ],
      ghost: 'rounded-none border-0 p-0 shadow-none',
    },
    size: {
      sm: 'text-[0.8125rem] leading-5',
      md: 'text-sm leading-6',
      lg: 'text-base leading-7',
    },
    autoResize: {
      true: 'resize-none',
      false: 'resize-y',
    },
  },
  compoundVariants: [
    { variant: 'default', size: 'sm', className: 'px-2.5 py-1.5' },
    { variant: 'default', size: 'md', className: 'px-3 py-2' },
    { variant: 'default', size: 'lg', className: 'px-3.5 py-2.5' },
  ],
  defaultVariants: { variant: 'default', size: 'md', autoResize: true },
});

export interface TextareaProps extends Omit<ComponentProps<'textarea'>, 'size'> {
  /** `ghost` draws no box, for a field inside something that draws one. Default `default`. */
  variant?: 'default' | 'ghost';
  /** Its text size and line height. Default `md`. */
  size?: 'sm' | 'md' | 'lg';
  /** Whether it grows with what is written in it. Default `true`. */
  autoResize?: boolean;
  /** How many lines tall it starts, while growing. Default `2`. */
  minRows?: number;
  /** How many lines tall it can grow before it scrolls. Default `8`. */
  maxRows?: number;
}

function setRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === 'function') ref(value);
  else if (ref) (ref as { current: T | null }).current = value;
}

/** A multi-line field. Every attribute of `<textarea>` passes through. */
function TextareaRoot({
  variant,
  size,
  autoResize = true,
  minRows = 2,
  maxRows = 8,
  rows,
  value,
  onInput,
  className,
  style,
  ref,
  ...props
}: TextareaProps) {
  const field = useRef<HTMLTextAreaElement>(null);

  // Set to one row, read how tall the text wants to be, and clamp that to the
  // rows allowed. The padding and border are part of both ends of the clamp.
  const fit = useCallback(() => {
    const node = field.current;
    if (!node || !autoResize) return;
    const computed = getComputedStyle(node);
    const line = parseFloat(computed.lineHeight) || 20;
    const frame =
      parseFloat(computed.paddingTop) +
      parseFloat(computed.paddingBottom) +
      parseFloat(computed.borderTopWidth) +
      parseFloat(computed.borderBottomWidth);
    node.style.height = 'auto';
    const wanted = node.scrollHeight + parseFloat(computed.borderTopWidth) + parseFloat(computed.borderBottomWidth);
    const min = line * minRows + frame;
    const max = line * Math.max(maxRows, minRows) + frame;
    node.style.height = `${Math.min(Math.max(wanted, min), max)}px`;
    node.style.overflowY = wanted > max ? 'auto' : 'hidden';
  }, [autoResize, minRows, maxRows]);

  // Before paint, so a value that was already there never shows at the wrong height.
  useLayoutEffect(fit, [fit, value]);

  const control = {
    'data-slot': 'textarea',
    rows: autoResize ? minRows : rows,
    value,
    onInput: (event: Parameters<NonNullable<TextareaProps['onInput']>>[0]) => {
      onInput?.(event);
      fit();
    },
    className: textareaVariants({ variant, size, autoResize, className }),
    style,
    ...props,
  };

  // Rendered through the field's control, so a Field around it can label,
  // describe and validate it. Outside a Field it is a plain textarea.
  return (
    <BaseField.Control
      ref={(node: HTMLElement | null) => {
        field.current = node as HTMLTextAreaElement | null;
        setRef(ref, node as HTMLTextAreaElement | null);
      }}
      render={<textarea />}
      {...(control as unknown as BaseField.Control.Props)}
    />
  );
}
TextareaRoot.displayName = 'Textarea';

export const Textarea = TextareaRoot;
