/**
 * Steps — a stepper for multi-step flows.
 *
 * Adapted from: origin-space/originui apps/origin/registry/default/ui/stepper.tsx
 * (the Stepper / Item / Trigger / Indicator / Title / Description / Separator
 * anatomy, and the completed | active | inactive | loading state resolution).
 *
 * Upstream drives all styling through `data-*` attributes, which React Native
 * has no equivalent for. Here the state is resolved in JS and passed down
 * through context into `tv()` variants — the same approach Alert uses.
 *
 * Steps does not own your flow: it reflects whatever step your app says is
 * active. Pass `value` to control it, or `defaultValue` to let it manage
 * its own.
 */
import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Pressable, View, type Text as RNText, type ViewProps } from 'react-native';
import { tv } from 'tailwind-variants';
import { useCSSVariable } from 'uniwind';
import { CheckIcon } from '../../icons';
import { Text, type TextProps } from '../../primitives/text';
import { Spinner } from '../spinner';

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
        separator: 'ml-3.5 h-8 w-0.5',
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
}

interface StepItemContextValue {
  step: number;
  state: StepState;
  isDisabled: boolean;
  isLoading: boolean;
}

const StepsContext = createContext<StepsContextValue | null>(null);
const StepItemContext = createContext<StepItemContextValue | null>(null);

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
  children?: ReactNode;
}

const StepsRoot = forwardRef<View, StepsProps>(
  (
    {
      className,
      defaultValue = 0,
      value,
      onValueChange,
      orientation = 'horizontal',
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
      () => ({ activeStep, setActiveStep, orientation }),
      [activeStep, setActiveStep, orientation]
    );

    const { root } = stepsVariants({ orientation });

    return (
      <StepsContext.Provider value={context}>
        <View ref={ref} className={root({ className })} {...props}>
          {children}
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

const StepsItem = forwardRef<View, StepsItemProps>(
  (
    { className, step, completed = false, disabled = false, loading = false, children, ...props },
    ref
  ) => {
    const { activeStep, orientation } = useSteps('Steps.Item');

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

    return (
      <StepItemContext.Provider value={context}>
        <View ref={ref} className={item({ className })} {...props}>
          {children}
        </View>
      </StepItemContext.Provider>
    );
  }
);
StepsItem.displayName = 'Steps.Item';

export interface StepsTriggerProps extends ViewProps {
  className?: string;
  children?: ReactNode;
}

/** Makes its item selectable. Omit it for a read-only stepper. */
const StepsTrigger = forwardRef<View, StepsTriggerProps>(
  ({ className, children, ...props }, ref) => {
    const { setActiveStep, orientation } = useSteps('Steps.Trigger');
    const { step, state, isDisabled } = useStepItem('Steps.Trigger');
    const { trigger } = stepsVariants({ orientation, state, isDisabled });

    return (
      <Pressable
        ref={ref}
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled, selected: state === 'active' }}
        disabled={isDisabled}
        onPress={() => setActiveStep(step)}
        className={trigger({ className })}
        {...props}
      >
        {children}
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
const StepsIndicator = forwardRef<View, StepsIndicatorProps>(
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

const StepsTitle = forwardRef<RNText, TextProps>(({ className, ...props }, ref) => {
  const { orientation } = useSteps('Steps.Title');
  const { state } = useStepItem('Steps.Title');
  const { title } = stepsVariants({ orientation, state });
  return <Text ref={ref} className={title({ className })} {...props} />;
});
StepsTitle.displayName = 'Steps.Title';

const StepsDescription = forwardRef<RNText, TextProps>(({ className, ...props }, ref) => {
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
 * The connector between two steps. Fills with the primary colour once the
 * step before it is complete.
 *
 * Place it inside a Steps.Item so it can read that item's state — the
 * separator after step 1 goes solid when step 1 is done.
 */
const StepsSeparator = forwardRef<View, StepsSeparatorProps>(
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
