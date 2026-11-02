/**
 * Steps — a stepper for multi-step flows.
 *
 * A row or column of numbered stops, each one completed, active, inactive or
 * loading. An item works that state out from its own position against the
 * root's `value` rather than being told it, so the four states stay mutually
 * exclusive and in order — there is no way to write two active steps, or to
 * mark step four done while step three is still pending.
 *
 * The state is resolved in JS and passed down through context into `tv()`
 * variants, because React Native has no attribute selectors a stylesheet could
 * key off. Alert and Timeline resolve their states the same way.
 *
 * Steps does not own your flow: it reflects whatever step your app says is
 * active. Pass `value` to control it, or `defaultValue` to let it manage
 * its own.
 *
 * The connectors are the component's job, not yours. The root counts the items
 * it holds and each one draws the connector to the next, so a stepper is just
 * its steps — there is no separator to forget, mis-order, or leave dangling
 * past the last stop. An item that contains its own `Steps.Separator` keeps it
 * and gets no second one, so hand-placed connectors still work; `separators`
 * turns the automatic ones off wholesale.
 *
 * Knowing the count is also what lets a step say where it sits. A screen reader
 * reaching the middle of a wizard hears "Payment, step 2 of 3, completed" —
 * the position and the state, which are the two things the circle and its fill
 * convey to everyone else.
 */
import {
  Children,
  createContext,
  forwardRef,
  isValidElement,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  Pressable,
  View,
  type PressableProps,
  type Text as RNText,
  type ViewProps,
} from 'react-native';
import { tv } from 'tailwind-variants';
import { useCSSVariable } from 'uniwind';
import { CheckIcon } from '../../icons';
import { Text, type TextProps, textChildren } from '../../primitives/text';
import { Spinner } from '../spinner';
import { stepsTriggerDisabled } from './steps-trigger';
import type { TextRef, ViewRef } from '../../primitives/refs';

export type StepState = 'active' | 'completed' | 'inactive' | 'loading';
export type StepsOrientation = 'horizontal' | 'vertical';

const stepsVariants = tv({
  slots: {
    root: '',
    item: 'items-center',
    trigger: 'flex-row items-center gap-3',
    indicator: 'h-7 w-7 shrink-0 items-center justify-center rounded-full',
    indicatorLabel: 'text-xs font-medium',
    title: 'text-sm font-medium text-foreground',
    description: 'text-sm text-muted-foreground',
    separator: 'bg-muted',
  },
  variants: {
    orientation: {
      horizontal: {
        root: 'w-full flex-row items-center',
        item: 'flex-row',
        separator: 'h-0.5 flex-1',
      },
      vertical: {
        root: 'flex-col',
        item: 'flex-col items-start',
        separator: 'ms-3.5 h-8 w-0.5',
      },
    },
    state: {
      inactive: {
        indicator: 'bg-muted',
        indicatorLabel: 'text-muted-foreground',
      },
      active: {
        indicator: 'bg-primary',
        indicatorLabel: 'text-primary-foreground',
      },
      completed: {
        indicator: 'bg-primary',
        indicatorLabel: 'text-primary-foreground',
        separator: 'bg-primary',
      },
      loading: {
        indicator: 'bg-muted',
        indicatorLabel: 'text-muted-foreground',
      },
    },
    isDisabled: {
      true: { trigger: 'opacity-[0.64]' },
    },
  },
  defaultVariants: {
    orientation: 'horizontal',
    state: 'inactive',
  },
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
  isDisabled: boolean;
  isLoading: boolean;
}

/**
 * Where an item sits among its siblings, published by the root.
 *
 * Deliberately not the item's own `step` prop: that is the author's numbering
 * of the flow and may skip, repeat or start anywhere, while the connector and
 * the "2 of 3" announcement both need the position in the row as rendered.
 * Absent when an item is used outside a root that maps its children, which is
 * why every reader of it has a fallback.
 */
interface StepPositionContextValue {
  position: number;
  total: number;
}

const StepsContext = createContext<StepsContextValue | null>(null);
const StepItemContext = createContext<StepItemContextValue | null>(null);
const StepPositionContext = createContext<StepPositionContextValue | null>(null);

function useSteps(component: string): StepsContextValue {
  const context = useContext(StepsContext);
  if (!context) {
    throw new Error(`${component} must be used within a <Steps>`);
  }
  return context;
}

function useStepItem(component: string): StepItemContextValue {
  const context = useContext(StepItemContext);
  if (!context) {
    throw new Error(`${component} must be used within a <Steps.Item>`);
  }
  return context;
}

export interface StepsProps extends ViewProps {
  className?: string;
  /** Active step when uncontrolled. */
  defaultValue?: number;
  /** Active step, controlled. */
  value?: number;
  onValueChange?: (value: number) => void;
  orientation?: StepsOrientation;
  /**
   * Draw the connector between one item and the next. On by default — an item
   * that holds its own `Steps.Separator` is left alone either way, so this is
   * for a stepper that wants no connectors at all rather than for one that
   * places them by hand.
   */
  separators?: boolean;
  children?: ReactNode;
}

const StepsRoot = forwardRef<ViewRef, StepsProps>(
  (
    {
      className,
      defaultValue = 0,
      value,
      onValueChange,
      orientation = 'horizontal',
      separators = true,
      children,
      ...props
    },
    ref
  ) => {
    const [internalStep, setInternalStep] = useState(defaultValue);
    const isControlled = value !== undefined;
    const activeStep = isControlled ? value : internalStep;

    const setActiveStep = useCallback(
      (step: number) => {
        if (!isControlled) setInternalStep(step);
        onValueChange?.(step);
      },
      [isControlled, onValueChange]
    );

    const context = useMemo(
      () => ({ activeStep, setActiveStep, orientation, separators }),
      [activeStep, setActiveStep, orientation, separators]
    );

    const { root } = stepsVariants({ orientation });

    /*
     * Items are counted here rather than registered by each one on mount,
     * because the count has to be right on the first frame: a connector that
     * appears after the last item and disappears once the registrations land
     * is a visible flicker on every mount. Reading the children gives the whole
     * row at once, and a Provider adds no host view, so wrapping an item in one
     * leaves the flex layout exactly as it was.
     */
    const nodes = Children.toArray(textChildren(children));
    const total = nodes.filter((node) => isValidElement(node) && node.type === StepsItem).length;
    let position = -1;

    return (
      <StepsContext.Provider value={context}>
        <View ref={ref} className={root({ className })} {...props}>
          {nodes.map((node) => {
            if (!isValidElement(node) || node.type !== StepsItem) return node;
            position += 1;
            const placement = { position, total };
            return (
              <StepPositionContext.Provider key={node.key ?? position} value={placement}>
                {node}
              </StepPositionContext.Provider>
            );
          })}
        </View>
      </StepsContext.Provider>
    );
  }
);
StepsRoot.displayName = 'Steps';

export interface StepsItemProps extends ViewProps {
  className?: string;
  /** This item's position in the flow, zero-based by convention. */
  step: number;
  /** Force the completed state, regardless of the active step. */
  completed?: boolean;
  disabled?: boolean;
  /** Shows a spinner in place of the number while this step is active. */
  loading?: boolean;
  children?: ReactNode;
}

const StepsItem = forwardRef<ViewRef, StepsItemProps>(
  (
    { className, step, completed = false, disabled = false, loading = false, children, ...props },
    ref
  ) => {
    const { activeStep, orientation, separators } = useSteps('Steps.Item');
    const placement = useContext(StepPositionContext);

    const isLoading = loading && step === activeStep;
    const state: StepState =
      completed || step < activeStep
        ? 'completed'
        : step === activeStep
          ? isLoading
            ? 'loading'
            : 'active'
          : 'inactive';

    const context = useMemo(
      () => ({ step, state, isDisabled: disabled, isLoading }),
      [step, state, disabled, isLoading]
    );

    const { item } = stepsVariants({ orientation, state });

    /*
     * The last item has nothing to connect to, and one placed by hand is the
     * author's — adding a second beside it would double the line rather than
     * replace it. Only the top level is inspected, which is where a connector
     * has to be anyway: it is a sibling of the trigger, not something buried
     * inside it.
     */
    const isLast = placement ? placement.position === placement.total - 1 : true;
    const hasOwnSeparator = Children.toArray(children).some(
      (child) => isValidElement(child) && child.type === StepsSeparator
    );

    return (
      <StepItemContext.Provider value={context}>
        <View ref={ref} className={item({ className })} {...props}>
          {textChildren(children)}
          {separators && !isLast && !hasOwnSeparator ? <StepsSeparator /> : null}
        </View>
      </StepItemContext.Provider>
    );
  }
);
StepsItem.displayName = 'Steps.Item';

export interface StepsTriggerProps extends PressableProps {
  className?: string;
  children?: ReactNode;
}

/** What each state is called when a screen reader reaches the step. */
const STATE_WORDS: Record<StepState, string> = {
  completed: 'completed',
  active: 'current step',
  loading: 'in progress',
  inactive: 'not started',
};

/** Makes its item selectable. Omit it for a read-only stepper. */
const StepsTrigger = forwardRef<ViewRef, StepsTriggerProps>(
  (
    {
      className,
      children,
      disabled,
      onPress,
      accessibilityState,
      accessibilityValue,
      ...props
    },
    ref
  ) => {
    const { setActiveStep, orientation } = useSteps('Steps.Trigger');
    const { step, state, isDisabled } = useStepItem('Steps.Trigger');
    const placement = useContext(StepPositionContext);
    const triggerDisabled = stepsTriggerDisabled(isDisabled, disabled);
    const { trigger } = stepsVariants({ orientation, state, isDisabled: triggerDisabled });

    /*
     * Said as a value rather than a label, because the label is the step's own
     * title and the circle beside it — text the trigger already merges. An
     * `accessibilityLabel` here would replace all of that with the position,
     * trading the name of the step for its number; a value is read after it.
     */
    const position = placement
      ? `step ${placement.position + 1} of ${placement.total}, ${STATE_WORDS[state]}`
      : STATE_WORDS[state];

    return (
      <Pressable
        ref={ref}
        {...props}
        accessibilityRole="button"
        accessibilityState={{
          ...accessibilityState,
          disabled: triggerDisabled,
          selected: state === 'active',
        }}
        accessibilityValue={{ ...accessibilityValue, text: position }}
        disabled={triggerDisabled}
        onPress={(event) => {
          onPress?.(event);
          setActiveStep(step);
        }}
        className={trigger({ className })}
      >
        {textChildren(children)}
      </Pressable>
    );
  }
);
StepsTrigger.displayName = 'Steps.Trigger';

export interface StepsIndicatorProps extends ViewProps {
  className?: string;
  /** Replaces the number / check / spinner entirely. */
  children?: ReactNode;
}

/**
 * The circle. Shows the step number, a check once completed, or a spinner
 * while loading.
 */
const StepsIndicator = forwardRef<ViewRef, StepsIndicatorProps>(
  ({ className, children, ...props }, ref) => {
    const { orientation } = useSteps('Steps.Indicator');
    const { step, state, isLoading } = useStepItem('Steps.Indicator');
    const { indicator, indicatorLabel } = stepsVariants({ orientation, state });
    const checkColor = useCSSVariable('--color-primary-foreground');

    return (
      <View ref={ref} className={indicator({ className })} {...props}>
        {children ?? (
          <>
            {isLoading ? (
              <Spinner size="sm" />
            ) : state === 'completed' ? (
              <CheckIcon
                size={14}
                color={typeof checkColor === 'string' ? checkColor : '#fff'}
              />
            ) : (
              // Steps are zero-based internally but read as 1, 2, 3.
              <Text className={indicatorLabel()}>{step + 1}</Text>
            )}
          </>
        )}
      </View>
    );
  }
);
StepsIndicator.displayName = 'Steps.Indicator';

const StepsTitle = forwardRef<TextRef, TextProps>(({ className, ...props }, ref) => {
  const { orientation } = useSteps('Steps.Title');
  const { state } = useStepItem('Steps.Title');
  const { title } = stepsVariants({ orientation, state });
  return <Text ref={ref} className={title({ className })} {...props} />;
});
StepsTitle.displayName = 'Steps.Title';

const StepsDescription = forwardRef<TextRef, TextProps>(({ className, ...props }, ref) => {
  const { orientation } = useSteps('Steps.Description');
  const { state } = useStepItem('Steps.Description');
  const { description } = stepsVariants({ orientation, state });
  return <Text ref={ref} className={description({ className })} {...props} />;
});
StepsDescription.displayName = 'Steps.Description';

export interface StepsSeparatorProps extends ViewProps {
  className?: string;
}

/**
 * The connector between two steps. Fills with the primary colour once the step
 * before it is complete.
 *
 * Every item draws one automatically, so this is only worth writing to dress a
 * particular connector — an item that holds its own keeps it and gets no
 * second. It belongs inside a `Steps.Item` either way, so it can read that
 * item's state: the connector after step 1 goes solid when step 1 is done.
 */
const StepsSeparator = forwardRef<ViewRef, StepsSeparatorProps>(
  ({ className, ...props }, ref) => {
    const { orientation } = useSteps('Steps.Separator');
    const { state } = useStepItem('Steps.Separator');
    const { separator } = stepsVariants({ orientation, state });

    return (
      <View
        ref={ref}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        className={separator({ className })}
        {...props}
      />
    );
  }
);
StepsSeparator.displayName = 'Steps.Separator';

export const Steps = Object.assign(StepsRoot, {
  Item: StepsItem,
  Trigger: StepsTrigger,
  Indicator: StepsIndicator,
  Title: StepsTitle,
  Description: StepsDescription,
  Separator: StepsSeparator,
});
