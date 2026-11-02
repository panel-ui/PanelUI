'use client';

/**
 * Input — a single line to type into.
 *
 * ```tsx
 * <Input placeholder="you@example.com" type="email" />
 *
 * <Input.Group>
 *   <Input.Addon><SearchIcon /></Input.Addon>
 *   <Input placeholder="Search" />
 *   <Input.Addon align="end"><kbd>⌘K</kbd></Input.Addon>
 * </Input.Group>
 * ```
 *
 * ## The group owns the box
 *
 * On its own, the input draws its border, background and focus ring. Inside
 * `Input.Group`, it drops all three and the group draws them around the input
 * and its addons together, so an icon or a unit reads as part of the field and
 * the ring goes round the whole of it. Pressing an addon that is not a button
 * moves focus into the input.
 *
 * ## Inside a Field
 *
 * Put in a `Field`, the input takes the field's label, description and error
 * without ids passed by hand, and turns invalid when the field does.
 */
import { Input as BaseInput } from '@base-ui/react/input';
import type { ComponentProps, MouseEvent, Ref } from 'react';
import { tv } from 'tailwind-variants';
import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import type { ElementType as RenderElementType } from 'react';

/** Draws a part as another element, or composes it with a component: `render={<a href="/" />}`. */
type RenderProp<Tag extends RenderElementType> = { render?: useRender.ComponentProps<Tag>['render'] };

const inputVariants = tv({
  slots: {
    input: [
      'w-full min-w-0 bg-transparent text-foreground outline-none',
      'placeholder:text-muted-foreground/80 selection:bg-primary selection:text-primary-foreground',
      'file:me-3 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground',
      'disabled:cursor-not-allowed disabled:opacity-50',
      // Alone, it is the box. In a group, the group is.
      'not-in-data-[slot=input-group]:rounded-lg not-in-data-[slot=input-group]:border not-in-data-[slot=input-group]:border-input',
      'not-in-data-[slot=input-group]:bg-background not-in-data-[slot=input-group]:shadow-xs dark:not-in-data-[slot=input-group]:bg-input/30',
      'not-in-data-[slot=input-group]:transition-[border-color,box-shadow]',
      'not-in-data-[slot=input-group]:focus-visible:border-ring not-in-data-[slot=input-group]:focus-visible:ring-[3px] not-in-data-[slot=input-group]:focus-visible:ring-ring/30',
      'aria-invalid:not-in-data-[slot=input-group]:border-destructive aria-invalid:not-in-data-[slot=input-group]:ring-destructive/20',
    ],
    group: [
      'group/input flex w-full min-w-0 items-center rounded-lg border border-input bg-background shadow-xs transition-[border-color,box-shadow] dark:bg-input/30',
      'has-[input:focus-visible]:border-ring has-[input:focus-visible]:ring-[3px] has-[input:focus-visible]:ring-ring/30',
      'has-[input[aria-invalid=true]]:border-destructive has-[input[aria-invalid=true]]:ring-destructive/20',
      'has-[input:disabled]:opacity-50',
    ],
    addon: [
      'flex shrink-0 cursor-text items-center gap-1.5 text-sm text-muted-foreground select-none',
      '[&_svg]:pointer-events-none [&_svg:not([class*=size-])]:size-4',
      '[&_kbd]:rounded [&_kbd]:border [&_kbd]:bg-muted [&_kbd]:px-1.5 [&_kbd]:font-sans [&_kbd]:text-xs',
      // Padded to the group's size, read from the group so it is set once.
      'px-3 group-data-[size=sm]/input:px-2.5 group-data-[size=lg]/input:px-3.5',
    ],
  },
  variants: {
    size: {
      sm: { input: 'h-8 px-2.5 text-[0.8125rem]', group: 'h-8' },
      md: { input: 'h-9 px-3 text-sm', group: 'h-9' },
      lg: { input: 'h-11 px-3.5 text-[0.9375rem]', group: 'h-11 rounded-xl' },
    },
    align: {
      // An addon sits closer to the text it belongs to than to the edge.
      start: { addon: 'order-first -me-1.5' },
      end: { addon: 'order-last -ms-1.5' },
    },
  },
  compoundVariants: [
    // In a group the input's own height is the group's, minus its border.
    // Its text and padding follow the group's size too, so the size is set once.
    {
      size: ['sm', 'md', 'lg'],
      className: {
        input:
          'in-data-[slot=input-group]:h-full group-data-[size=sm]/input:px-2.5 group-data-[size=sm]/input:text-[0.8125rem] group-data-[size=lg]/input:px-3.5 group-data-[size=lg]/input:text-[0.9375rem]',
      },
    },
  ],
  defaultVariants: { size: 'md', align: 'start' },
});

export type InputSize = 'sm' | 'md' | 'lg';

export interface InputProps extends Omit<ComponentProps<'input'>, 'size'> {
  /** Its height and text size. Inside a group, set it on the group instead. Default `md`. */
  size?: InputSize;
}

/** A single-line field. Every attribute of `<input>` passes through. */
function InputRoot({ size, className, type = 'text', ref, ...props }: InputProps) {
  return (
    <BaseInput
      type={type}
      data-slot="input"
      ref={ref as Ref<HTMLElement>}
      className={inputVariants({ size }).input({ className })}
      {...props}
    />
  );
}
InputRoot.displayName = 'Input';

export interface InputGroupProps extends ComponentProps<'div'> {
  /** The height of the input and its addons together. Default `md`. */
  size?: InputSize;
}

/** Draws one box round an input and its addons. */
function InputGroup({ size, className, render, ...props }: InputGroupProps & RenderProp<'div'>) {
  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        role: 'group',
        'data-slot': 'input-group',
        'data-size': size ?? 'md',
        className: inputVariants({ size }).group({ className }),
      },
      props
    ),
  });
}
InputGroup.displayName = 'Input.Group';

export interface InputAddonProps extends ComponentProps<'div'> {
  /** Which side of the input it sits on, whatever its place in the markup. Default `start`. */
  align?: 'start' | 'end';
}

/** An icon, unit, shortcut or button beside the input, inside its box. */
function InputAddon({ align, className, onMouseDown, render, ...props }: InputAddonProps & RenderProp<'div'>) {
  // A press on the addon's own surface is a press on the field. A button or
  // link inside it is left to do what it does.
  const focusField = (event: MouseEvent<HTMLDivElement>) => {
    onMouseDown?.(event);
    if (event.defaultPrevented) return;
    if ((event.target as HTMLElement).closest('button, a, input, select, textarea')) return;
    const input = event.currentTarget.parentElement?.querySelector('input');
    if (!input) return;
    event.preventDefault();
    input.focus();
  };
  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        'data-slot': 'input-addon',
        'data-align': align ?? 'start',
        className: inputVariants({ align }).addon({ className }),
        onMouseDown: focusField,
      },
      props
    ),
  });
}
InputAddon.displayName = 'Input.Addon';

export const Input = Object.assign(InputRoot, {
  Group: InputGroup,
  Addon: InputAddon,
});

export { InputGroup, InputAddon };
