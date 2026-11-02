'use client';

/**
 * Label — the name of a field, and the line it sits on.
 *
 * ```tsx
 * <Label htmlFor="email" required>Email</Label>
 * <Input id="email" type="email" required />
 *
 * <Label htmlFor="password">
 *   <Label.Text>Password</Label.Text>
 *   <Label.Action><a href="/reset">Forgot it?</a></Label.Action>
 * </Label>
 * ```
 *
 * ## One line, three things on it
 *
 * A field's label is rarely only its name. It says whether the field must be
 * filled, it carries a hint (a limit, a format, "Optional"), and it often has
 * something at the far end: a link to reset a password, a count of what is
 * left. Putting those on the label's own line, rather than in lines of their
 * own round the field, keeps a form to one row per field, and keeps the hint
 * next to the name it qualifies.
 *
 * ## The control decides, where it can
 *
 * A label wrapped round its control, such as a checkbox, reads that control's
 * state: it fades when the control is disabled and turns to the destructive
 * colour when the control is invalid, with nothing passed. A label tied to its
 * control by `htmlFor` cannot see it, so it takes `invalid` and `disabled`.
 *
 * ## It renders on the server
 *
 * The state reaches the parts through data attributes and CSS rather than
 * through context, so a label has no client JavaScript of its own.
 */
import type { ComponentProps } from 'react';
import { tv } from 'tailwind-variants';
import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import type { ElementType as RenderElementType } from 'react';

/** Draws a part as another element, or composes it with a component: `render={<a href="/" />}`. */
type RenderProp<Tag extends RenderElementType> = { render?: useRender.ComponentProps<Tag>['render'] };

const labelVariants = tv({
  slots: {
    root: [
      'group/label flex w-full min-w-0 items-center gap-2 text-sm font-medium leading-5 text-foreground select-none',
      // A control wrapped in the label tells it how it is.
      'has-disabled:cursor-not-allowed has-disabled:opacity-50 has-[[aria-invalid=true]]:text-destructive',
      'data-disabled:cursor-not-allowed data-disabled:opacity-50 data-invalid:text-destructive',
    ],
    // The required mark is drawn after the text by CSS, so it follows the name
    // however the label is composed, and is not read out as "star".
    text: [
      'flex min-w-0 items-baseline',
      "group-data-required/label:after:ms-0.5 group-data-required/label:after:text-destructive group-data-required/label:after:content-['*']",
    ],
    textInner: 'min-w-0 truncate',
    hint: [
      'shrink-0 font-normal text-muted-foreground',
      // An invalid field's hint is the reason, so it takes the colour too.
      'group-data-invalid/label:text-destructive group-has-[[aria-invalid=true]]/label:text-destructive',
    ],
    action: [
      'order-last ms-auto flex shrink-0 items-center gap-1.5 font-normal text-muted-foreground',
      '[&_a]:text-foreground [&_a]:underline-offset-4 [&_a]:outline-none [&_a:hover]:underline [&_a:focus-visible]:underline',
      'group-data-invalid/label:text-destructive',
    ],
  },
});

export interface LabelProps extends ComponentProps<'label'> {
  /**
   * Marks the field as one that must be filled. The mark is for the eye; set
   * `required` on the control as well, which is what a screen reader announces.
   */
  required?: boolean;
  /** Shows "Optional" after the text, for a form where most fields are required. */
  optional?: boolean;
  /**
   * Turns the label to the destructive colour. Needed when the label is tied
   * to its control by `htmlFor`; a label wrapped round its control reads it.
   */
  invalid?: boolean;
  /** Fades the label. As with `invalid`, a wrapped control is read on its own. */
  disabled?: boolean;
}

/**
 * The label element. A string child is the label's text; for more, compose
 * `Label.Text`, `Label.Hint` and `Label.Action`.
 */
function LabelRoot({
  required = false,
  optional = false,
  invalid = false,
  disabled = false,
  className,
  children,
  render,
  ...props
}: LabelProps & RenderProp<'label'>) {
  const slots = labelVariants();
  const plain = typeof children === 'string' || typeof children === 'number';
  return useRender({
    defaultTagName: 'label',
    render,
    props: mergeProps(
      {
        'data-slot': 'label',
        'data-required': required ? '' : undefined,
        'data-invalid': invalid ? '' : undefined,
        'data-disabled': disabled ? '' : undefined,
        className: slots.root({ className }),
        children: (
          <>
            {plain ? <LabelText>{children}</LabelText> : children}
            {optional ? <LabelHint>Optional</LabelHint> : null}
          </>
        ),
      },
      props
    ),
  });
}
LabelRoot.displayName = 'Label';

export interface LabelTextProps extends ComponentProps<'span'> {}

/** The field's name. It truncates rather than pushing the action off the line. */
function LabelText({ className, children, render, ...props }: LabelTextProps & RenderProp<'span'>) {
  const slots = labelVariants();
  return useRender({
    defaultTagName: 'span',
    render,
    props: mergeProps(
      {
        'data-slot': 'label-text',
        className: slots.text({ className }),
        children: (
          <>
            <span className={slots.textInner()}>{children}</span>
          </>
        ),
      },
      props
    ),
  });
}
LabelText.displayName = 'Label.Text';

export interface LabelHintProps extends ComponentProps<'span'> {}

/**
 * A quieter word or two after the name: a limit, a format, a unit. On an
 * invalid field it takes the destructive colour, so it can say what is wrong.
 */
function LabelHint({ className, render, ...props }: LabelHintProps & RenderProp<'span'>) {
  return useRender({
    defaultTagName: 'span',
    render,
    props: mergeProps({ 'data-slot': 'label-hint', className: labelVariants().hint({ className }) }, props),
  });
}
LabelHint.displayName = 'Label.Hint';

export interface LabelActionProps extends ComponentProps<'span'> {}

/** Pushed to the far end of the line: a link, a count, a small button. */
function LabelAction({ className, render, ...props }: LabelActionProps & RenderProp<'span'>) {
  return useRender({
    defaultTagName: 'span',
    render,
    props: mergeProps({ 'data-slot': 'label-action', className: labelVariants().action({ className }) }, props),
  });
}
LabelAction.displayName = 'Label.Action';

export const Label = Object.assign(LabelRoot, {
  Text: LabelText,
  Hint: LabelHint,
  Action: LabelAction,
});

export { LabelText, LabelHint, LabelAction };
