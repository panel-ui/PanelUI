'use client';

/**
 * Steps — a flow that moves one stop at a time: a checkout, a wizard, an
 * onboarding, anything with a beginning, a middle and an end.
 *
 * ```tsx
 * <Steps defaultValue={1}>
 *   <Steps.Item step={0}>
 *     <Steps.Trigger>
 *       <Steps.Indicator />
 *       <Steps.Title>Basket</Steps.Title>
 *     </Steps.Trigger>
 *   </Steps.Item>
 *   <Steps.Item step={1}>
 *     <Steps.Trigger>
 *       <Steps.Indicator />
 *       <Steps.Title>Delivery</Steps.Title>
 *     </Steps.Trigger>
 *   </Steps.Item>
 *   <Steps.Item step={2}>
 *     <Steps.Trigger>
 *       <Steps.Indicator />
 *       <Steps.Title>Payment</Steps.Title>
 *     </Steps.Trigger>
 *   </Steps.Item>
 * </Steps>
 * ```
 *
 * ## The state is worked out, not handed in
 *
 * An item knows whether it is complete, current or still to come by comparing
 * its own `step` with the root's active one. There is nothing to keep in sync
 * and no way to write a step that is both done and ahead: the circle, the
 * label and the connector after it all read the same answer, which is why a
 * flow of four steps cannot end up with two of them lit.
 *
 * The root decides which step is active. Pass `value` to hold it yourself, or
 * `defaultValue` to let the stepper keep its own, and `onValueChange` to hear
 * about every move. `Steps.Trigger` moves it; without a trigger an item is a
 * label with no button in it.
 *
 * ## The connectors are the component's job
 *
 * The root counts the items it holds, so a step with one after it draws the
 * connector to it — there is no separator to forget, mis-order, or leave
 * hanging past the last stop. The line fills as far as the flow has got: the
 * segment after a completed step is primary, the segment waiting for the step
 * ahead is muted. `separators={false}` turns the automatic ones off for a
 * stepper that wants none at all. An item holding its own `Steps.Separator`
 * keeps it and is given no second one, so a connector can still be dressed by
 * hand.
 *
 * ## Going back, not skipping ahead
 *
 * A completed step is a button: it can be reached with Tab, pressed with
 * Enter or Space, and takes you back to where it is. The step the flow is on
 * would only press itself, so it is marked with `aria-current="step"` instead
 * of being a control that does nothing, and a step still to come has not been
 * earned, so it is neither — no dead stops between the ones that work. A flow
 * that can be entered part-way says so with `reachable` on the item.
 *
 * ## A flow, not tabs
 *
 * These are not tablist semantics. The steps are a sequence moving forward,
 * so the current trigger carries `aria-current="step"` and its name carries
 * its position — "Payment, step 2 of 3" — while a completed one says so. The
 * arrow keys do nothing: a row of tabs is a set to browse, a stepper is a
 * line to walk.
 *
 * ## Two directions
 *
 * `orientation="horizontal"` runs left to right with the labels under the
 * circles and the connectors between them; `vertical` runs top to bottom with
 * the circle beside each label and the connector dropping to the next. The
 * rules for which state is which, and which steps can be pressed, are the same
 * either way.
 */
import {
  Children,
  cloneElement,
  Fragment,
  createContext,
  isValidElement,
  useContext,
  useState,
  type ComponentProps,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import { tv } from 'tailwind-variants';
import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { Spinner } from '../spinner';
import { deriveStepState, stepAnnouncement, type StepState, type StepsOrientation } from './steps-state';

export type { StepState, StepsOrientation };

/** The one curve every state change here uses: quick enough to feel like a reply, slow enough to follow. */
const SETTLE = 'transition-[background-color,color,box-shadow,opacity] duration-200 ease-out motion-reduce:transition-none';

const stepsVariants = tv({
  slots: {
    root: 'flex w-full',
    item: 'relative flex min-w-0',
    trigger: [
      'outline-none select-none',
      SETTLE,
      'focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      '[&_svg]:pointer-events-none [&_svg]:shrink-0',
    ],
    indicator: [
      'relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums',
      SETTLE,
    ],
    title: ['text-sm font-medium leading-5', SETTLE].join(' '),
    description: ['text-sm leading-5 text-muted-foreground', SETTLE].join(' '),
    separator: [
      'pointer-events-none z-0 rounded-full bg-border',
      'transition-[background-color] duration-300 ease-out motion-reduce:transition-none',
    ],
  },
  variants: {
    orientation: {
      /*
       * Across: the label sits under the circle and the connector runs from
       * the edge of one circle to the edge of the next, at circle height.
       * The calc is half the item either side of its own circle.
       */
      horizontal: {
        root: 'items-start',
        item: 'flex-1 flex-col items-center',
        trigger: 'grid grid-cols-1 justify-items-center gap-2 px-2 pb-1.5 text-center',
        separator: 'absolute top-4 start-[calc(50%_+_1.25rem)] end-[calc(-50%_+_1.25rem)] h-0.5 -translate-y-1/2',
      },
      /*
       * Down: the circle stays in a column of its own and the label sits
       * beside it, so a description can run on under a title without moving
       * the line. The connector drops from the circle's column to the next.
       */
      vertical: {
        root: 'flex-col',
        item: 'w-full flex-col items-start',
        trigger: 'grid w-full grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 gap-y-1 pe-4 text-start',
        indicator: 'row-span-2',
        title: 'mt-1.5',
        separator: 'ms-4 h-8 w-0.5',
      },
    },
    state: {
      upcoming: {
        indicator: 'bg-muted text-muted-foreground ring-1 ring-border',
        title: 'text-muted-foreground',
      },
      current: {
        indicator: 'bg-primary text-primary-foreground ring-4 ring-primary/15',
        title: 'text-foreground',
      },
      completed: {
        indicator: 'bg-primary text-primary-foreground',
        title: 'text-foreground',
        separator: 'bg-primary',
      },
      loading: {
        indicator: 'bg-primary/10 text-primary ring-4 ring-primary/15',
        title: 'text-foreground',
      },
    },
    clickable: {
      true: { trigger: 'cursor-pointer rounded-xl hover:bg-muted/50' },
      false: { trigger: 'cursor-default' },
    },
    disabled: {
      true: { trigger: 'opacity-60' },
    },
  },
  defaultVariants: { orientation: 'horizontal', state: 'upcoming', clickable: false, disabled: false },
});

interface StepsContextValue {
  activeStep: number;
  setActiveStep: (step: number) => void;
  orientation: StepsOrientation;
  separators: boolean;
}

interface StepItemContextValue {
  step: number;
  state: StepState;
  filled: boolean;
  loading: boolean;
  disabled: boolean;
  reachable: boolean;
  completed: boolean;
}

/**
 * Where an item sits among its siblings, published by the root.
 *
 * Deliberately not the item's own `step`: that is the author's numbering of
 * the flow and may skip, repeat or start anywhere, while the connector and
 * the "2 of 3" announcement both need the position in the row as rendered.
 */
interface StepPlacementContextValue {
  position: number;
  total: number;
}

const StepsContext = createContext<StepsContextValue | null>(null);
const StepItemContext = createContext<StepItemContextValue | null>(null);
const StepPlacementContext = createContext<StepPlacementContextValue | null>(null);

function useSteps(component: string): StepsContextValue {
  const context = useContext(StepsContext);
  if (!context) throw new Error(`${component} must be used within a <Steps>`);
  return context;
}

function useStepItem(component: string): StepItemContextValue {
  const context = useContext(StepItemContext);
  if (!context) throw new Error(`${component} must be used within a <Steps.Item>`);
  return context;
}

/**
 * Runs the children through fragments, so a step wrapped in one still gets
 * its position. Only the top level is looked at, which is where a step has to
 * be: an item buried inside another component cannot be given a connector
 * that lines up with its siblings.
 */
function flattenSteps(children: ReactNode, prefix = ''): ReactNode[] {
  return Children.toArray(children).flatMap((node) => {
    if (isValidElement<{ children?: ReactNode }>(node) && node.type === Fragment) {
      return flattenSteps(node.props.children, `${prefix}${String(node.key ?? '')}/`);
    }
    if (prefix && isValidElement(node)) {
      return [cloneElement(node, { key: `${prefix}${String(node.key ?? '')}` })];
    }
    return [node];
  });
}

export interface StepsProps extends Omit<ComponentProps<'div'>, 'defaultValue' | 'onChange'> {
  /** The active step, when the caller holds it. */
  value?: number;
  /** The step it starts on, when the caller does not. Default `0`. */
  defaultValue?: number;
  /** Called with the step chosen, whether by a trigger or by your own controls. */
  onValueChange?: (value: number) => void;
  /** Which way the flow runs. Default `horizontal`. */
  orientation?: StepsOrientation;
  /**
   * Draw the connector between one step and the next. On by default. An item
   * holding its own `Steps.Separator` is left alone either way, so this is for
   * a stepper that wants no connectors at all.
   */
  separators?: boolean;
  /** Classes for the row, or column, that holds the steps. */
  className?: string;
  /** The steps, in order, and anything else that belongs in the row. */
  children?: ReactNode;
}

/** Holds which step is active for every part inside it. */
function StepsRoot({
  value,
  defaultValue = 0,
  onValueChange,
  orientation = 'horizontal',
  separators = true,
  className,
  children,
  ...props
}: StepsProps) {
  const [innerStep, setInnerStep] = useState(defaultValue);
  const controlled = value !== undefined;
  const activeStep = controlled ? value : innerStep;

  const setActiveStep = (next: number) => {
    if (!controlled) setInnerStep(next);
    onValueChange?.(next);
  };

  const nodes = flattenSteps(children);
  const total = nodes.filter((node) => isValidElement(node) && node.type === StepsItem).length;
  const slots = stepsVariants({ orientation });

  /*
   * Positions are counted here rather than registered by each item on mount,
   * so the count is right on the first frame: a connector that appears only
   * after the items have reported in would flicker on every mount, and the
   * announcement would say "of 1" until it did. A Provider adds no element,
   * so wrapping an item in one leaves the layout exactly as it was.
   */
  let position = -1;
  const placed = nodes.map((node, at) => {
    if (!isValidElement(node) || node.type !== StepsItem) return node;
    position += 1;
    const placement = { position, total };
    return (
      <StepPlacementContext.Provider key={node.key ?? `step-${position}-${at}`} value={placement}>
        {node}
      </StepPlacementContext.Provider>
    );
  });

  return (
    <StepsContext.Provider value={{ activeStep, setActiveStep, orientation, separators }}>
      <div
        data-slot="steps"
        data-orientation={orientation}
        data-separators={separators ? '' : undefined}
        className={slots.root({ className })}
        {...props}
      >
        {placed}
      </div>
    </StepsContext.Provider>
  );
}
StepsRoot.displayName = 'Steps';

export interface StepsItemProps extends Omit<ComponentProps<'div'>, 'children'> {
  /** This step's position in the flow, as you number it. */
  step: number;
  /** Force it complete, whatever the active step is. */
  completed?: boolean;
  /** Keep it from being chosen, and quiet its trigger. */
  disabled?: boolean;
  /** Show a spinner in the indicator while this is the active step. */
  loading?: boolean;
  /**
   * Let this step be chosen while it is still ahead of the active one. For a
   * flow that can be entered at any point; without it only steps already
   * reached are pressable.
   */
  reachable?: boolean;
  /** Classes for the box holding the trigger and its connector. */
  className?: string;
  /** The trigger, and a separator of your own if you want to dress this one. */
  children?: ReactNode;
}

/**
 * One stop. It works out its own state from `step` and the root's active
 * step, and draws the connector to the next item unless it is the last one or
 * holds a separator of its own.
 */
function StepsItem({
  step,
  completed = false,
  disabled = false,
  loading = false,
  reachable = false,
  className,
  children,
  ...props
}: StepsItemProps) {
  const { activeStep, orientation, separators } = useSteps('Steps.Item');
  const placement = useContext(StepPlacementContext);

  const { state, filled, loading: busy } = deriveStepState({
    step,
    activeStep,
    completed,
    loading,
    disabled,
    reachable,
  });

  /*
   * The last item has nothing to connect to, and one placed by hand is the
   * author's — adding a second beside it would double the line rather than
   * replace it. Only the top level is inspected, which is where a connector
   * has to be anyway: it is a sibling of the trigger, not something buried
   * inside it.
   */
  const isLast = placement ? placement.position === placement.total - 1 : true;
  const hasOwnSeparator = flattenSteps(children).some(
    (child) => isValidElement(child) && child.type === StepsSeparator
  );
  const slots = stepsVariants({ orientation, state });

  return (
    <StepItemContext.Provider
      value={{ step, state, filled, loading: busy, disabled, reachable, completed }}
    >
      <div
        data-slot="steps-item"
        data-state={state}
        data-position={placement?.position}
        data-last={isLast ? '' : undefined}
        className={slots.item({ className })}
        {...props}
      >
        {children}
        {separators && !isLast && !hasOwnSeparator ? <StepsSeparator /> : null}
      </div>
    </StepItemContext.Provider>
  );
}
StepsItem.displayName = 'Steps.Item';

export interface StepsTriggerProps extends Omit<ComponentProps<'button'>, 'className'> {
  /** Classes for the button, or the element `render` draws. */
  className?: string;
  /**
   * Draw the trigger as another element, or compose it with a component:
   * `render={<a href="/step-2" />}`. The step's classes, handlers and
   * announcement are put on it.
   */
  render?: useRender.ComponentProps<'button'>['render'];
}

/** The circle. A number, a tick once completed, or a spinner while loading. */
export interface StepsIndicatorProps extends Omit<ComponentProps<'span'>, 'className' | 'children'> {
  /** Classes for the circle. */
  className?: string;
  /** Replaces the number, tick or spinner with something of your own. */
  children?: ReactNode;
  /** Draw it as another element, or compose it with a component. */
  render?: useRender.ComponentProps<'span'>['render'];
}

function StepsIndicator({ className, children, render, ...props }: StepsIndicatorProps) {
  const { orientation } = useSteps('Steps.Indicator');
  const { state, step } = useStepItem('Steps.Indicator');
  const placement = useContext(StepPlacementContext);
  const slots = stepsVariants({ orientation, state });
  const shown = children ?? (
    state === 'loading' ? (
      <Spinner size="sm" aria-hidden />
    ) : state === 'completed' ? (
      <CheckIcon />
    ) : (
      // Steps are numbered by where they sit in the row, not by the value the
      // caller compares; `step` may skip or start anywhere.
      <span aria-hidden>{placement ? placement.position + 1 : step + 1}</span>
    )
  );

  return useRender({
    defaultTagName: 'span',
    render,
    props: mergeProps(
      {
        'data-slot': 'steps-indicator',
        'data-state': state,
        className: slots.indicator({ className }),
        children: shown,
      },
      props
    ),
  });
}
StepsIndicator.displayName = 'Steps.Indicator';

function CheckIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
    >
      <path d="m3.4 8.4 3 3 6.2-6.8" />
    </svg>
  );
}

export interface StepsTitleProps extends Omit<ComponentProps<'span'>, 'className'> {
  /** Classes for the step's name. */
  className?: string;
  /** Draw it as another element, such as a heading: `render={<h3 />}`. */
  render?: useRender.ComponentProps<'span'>['render'];
}

/** What the step is called. */
function StepsTitle({ className, render, ...props }: StepsTitleProps) {
  const { orientation } = useSteps('Steps.Title');
  const { state } = useStepItem('Steps.Title');
  const slots = stepsVariants({ orientation, state });
  return useRender({
    defaultTagName: 'span',
    render,
    props: mergeProps(
      { 'data-slot': 'steps-title', className: slots.title({ className }) },
      props
    ),
  });
}
StepsTitle.displayName = 'Steps.Title';

export interface StepsDescriptionProps extends Omit<ComponentProps<'span'>, 'className'> {
  /** Classes for the quieter line under the name. */
  className?: string;
  /** Draw it as another element. */
  render?: useRender.ComponentProps<'span'>['render'];
}

/** A quieter line about the step: what it asks for, or what happened there. */
function StepsDescription({ className, render, ...props }: StepsDescriptionProps) {
  const { orientation } = useSteps('Steps.Description');
  const { state } = useStepItem('Steps.Description');
  const slots = stepsVariants({ orientation, state });
  return useRender({
    defaultTagName: 'span',
    render,
    props: mergeProps(
      { 'data-slot': 'steps-description', className: slots.description({ className }) },
      props
    ),
  });
}
StepsDescription.displayName = 'Steps.Description';

export interface StepsSeparatorProps extends Omit<ComponentProps<'div'>, 'children'> {
  /** Classes for the connector. */
  className?: string;
}

/**
 * The connector between one step and the next. It fills with the primary
 * colour once the step before it is complete.
 *
 * Every item draws one automatically, so this is only worth writing to dress
 * a particular connector — an item that holds its own keeps it and gets no
 * second. It belongs inside a `Steps.Item`, so it can read that item's state.
 */
function StepsSeparator({ className, ...props }: StepsSeparatorProps) {
  const { orientation } = useSteps('Steps.Separator');
  const { state, filled } = useStepItem('Steps.Separator');
  const slots = stepsVariants({ orientation, state });
  return (
    <div
      data-slot="steps-separator"
      data-state={state}
      data-filled={filled ? '' : undefined}
      aria-hidden
      className={slots.separator({ className })}
      {...props}
    />
  );
}
StepsSeparator.displayName = 'Steps.Separator';

/**
 * Makes its item selectable. Omit it for a stepper that only reports where
 * the flow is.
 *
 * It is always a `<button>`, so the element does not change under a reader
 * when a completed step becomes the current one and focus would otherwise be
 * thrown away. A step that cannot be chosen is `aria-disabled` and
 * `tabIndex={-1}` instead of being a different tag: it is out of the tab
 * order, but a reader already on it keeps their place. Pass `render` to make
 * it a link instead.
 */
function StepsTrigger({
  className,
  children,
  type = 'button',
  disabled: disabledProp,
  onClick,
  render,
  ...props
}: StepsTriggerProps) {
  const { activeStep, setActiveStep, orientation } = useSteps('Steps.Trigger');
  const item = useStepItem('Steps.Trigger');
  const placement = useContext(StepPlacementContext);
  const disabled = item.disabled || disabledProp === true;
  const { state, clickable } = deriveStepState({
    step: item.step,
    activeStep,
    completed: item.completed,
    loading: item.loading,
    disabled,
    reachable: item.reachable,
  });
  const slots = stepsVariants({ orientation, state, clickable, disabled });
  // Loading is still the step the flow is on, so it is marked as current too.
  const current = state === 'current' || state === 'loading';
  const unavailable = disabled || !clickable;

  const announcement = stepAnnouncement(
    placement?.position ?? -1,
    placement?.total ?? 0,
    state
  );

  return useRender({
    defaultTagName: 'button',
    render,
    props: mergeProps(
      {
        'data-slot': 'steps-trigger',
        'data-state': state,
        'data-clickable': clickable ? '' : undefined,
        'data-disabled': disabled ? '' : undefined,
        'aria-current': current ? 'step' : undefined,
        'aria-disabled': unavailable ? true : undefined,
        'aria-busy': state === 'loading' ? true : undefined,
        // Only a rendered tag gets `type`; a link keeps its own.
        ...(render === undefined ? { type, tabIndex: unavailable ? -1 : undefined } : { tabIndex: unavailable ? -1 : undefined }),
        className: slots.trigger({ className }),
        onClick: (event: ReactMouseEvent<HTMLElement>) => {
          if (unavailable) {
            event.preventDefault();
            return;
          }
          onClick?.(event as ReactMouseEvent<HTMLButtonElement>);
          setActiveStep(item.step);
        },
        children: (
          <>
            {children}
            {announcement ? <span className="sr-only">, {announcement}</span> : null}
          </>
        ),
      },
      props
    ),
  });
}
StepsTrigger.displayName = 'Steps.Trigger';

export const Steps = Object.assign(StepsRoot, {
  Item: StepsItem,
  Trigger: StepsTrigger,
  Indicator: StepsIndicator,
  Title: StepsTitle,
  Description: StepsDescription,
  Separator: StepsSeparator,
});

export {
  StepsItem,
  StepsTrigger,
  StepsIndicator,
  StepsTitle,
  StepsDescription,
  StepsSeparator,
  stepsVariants,
  deriveStepState,
  stepAnnouncement,
};
