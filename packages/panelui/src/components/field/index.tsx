/**
 * Field — the layout and validation-state kit a form control composes into.
 *
 * PanelUI's own controls (`Input`, `Checkbox`, `Switch`, `RadioGroup`) already
 * carry their own label, description and error slot, so the common case needs
 * no wrapper at all — pass those props straight through. `Field` exists for
 * what doesn't fit that shape: a horizontal row pairing a control with a
 * label off to the side (a `Switch` in a settings list), several controls
 * grouped under one legend, or a rule breaking a long form into sections.
 *
 * `invalid` / `disabled` / `required` set on the root flow to `Field.Label`
 * and `Field.Description` through context, so a multi-field row states its
 * validity once instead of repeating the prop at every leaf.
 *
 * ```tsx
 * <Field orientation="horizontal">
 *   <Field.Content>
 *     <Field.Title>Marketing emails</Field.Title>
 *     <Field.Description>Product updates, at most weekly.</Field.Description>
 *   </Field.Content>
 *   <Switch value={subscribed} onValueChange={setSubscribed} />
 * </Field>
 * ```
 */
import {
  createContext,
  forwardRef,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import { View, type Text as RNText, type ViewProps } from 'react-native';
import { tv } from 'tailwind-variants';
import { Text, type TextProps } from '../../primitives/text';
import { Label, type LabelProps } from '../label';
import { Separator } from '../separator';

const fieldVariants = tv({
  slots: {
    root: 'gap-2',
    content: 'flex-1 flex-col gap-0.5',
    description: 'text-sm text-muted-foreground',
    error: 'gap-1',
    errorText: 'text-sm text-destructive',
    bullet: 'flex-row gap-1.5',
    bulletDot: 'text-sm text-destructive',
    set: 'gap-4',
    legend: 'text-foreground',
    group: 'gap-6',
    separator: 'flex-row items-center gap-3',
    separatorLabel: 'text-xs text-muted-foreground',
    title: 'text-base font-medium text-foreground',
  },
  variants: {
    orientation: {
      vertical: { root: 'flex-col' },
      horizontal: { root: 'flex-row items-center justify-between gap-4' },
    },
    disabled: {
      true: { root: 'opacity-[0.64]' },
    },
    legendVariant: {
      legend: { legend: 'text-base font-semibold' },
      label: { legend: 'text-sm font-medium' },
    },
  },
  defaultVariants: {
    orientation: 'vertical',
  },
});

interface FieldState {
  invalid: boolean;
  disabled: boolean;
  required: boolean;
}

const FieldContext = createContext<FieldState>({
  invalid: false,
  disabled: false,
  required: false,
});

export interface FieldProps extends ViewProps {
  className?: string;
  /** `horizontal` puts a label beside the control instead of above it. */
  orientation?: 'vertical' | 'horizontal';
  /** Marks every `Field.Label`/`Field.Description` below as invalid. */
  invalid?: boolean;
  disabled?: boolean;
  /** Marks every `Field.Label` below as required, same as `Label`'s own prop. */
  required?: boolean;
  children?: ReactNode;
}

const FieldRoot = forwardRef<View, FieldProps>(
  (
    {
      className,
      orientation = 'vertical',
      invalid = false,
      disabled = false,
      required = false,
      children,
      ...props
    },
    ref
  ) => {
    const { root } = fieldVariants({ orientation, disabled });
    const state = useMemo(
      () => ({ invalid, disabled, required }),
      [invalid, disabled, required]
    );

    return (
      <FieldContext.Provider value={state}>
        <View
          ref={ref}
          role="group"
          accessibilityState={{ disabled }}
          className={root({ className })}
          {...props}
        >
          {children}
        </View>
      </FieldContext.Provider>
    );
  }
);
FieldRoot.displayName = 'Field';

export interface FieldContentProps extends ViewProps {
  className?: string;
  children?: ReactNode;
}

const FieldContent = forwardRef<View, FieldContentProps>(
  ({ className, ...props }, ref) => {
    const { content } = fieldVariants();
    return <View ref={ref} className={content({ className })} {...props} />;
  }
);
FieldContent.displayName = 'Field.Content';

export interface FieldLabelProps extends LabelProps {}

const FieldLabel = forwardRef<View, FieldLabelProps>(
  ({ isRequired, isInvalid, isDisabled, ...props }, ref) => {
    const ctx = useContext(FieldContext);
    return (
      <Label
        ref={ref}
        isRequired={isRequired ?? ctx.required}
        isInvalid={isInvalid ?? ctx.invalid}
        isDisabled={isDisabled ?? ctx.disabled}
        {...props}
      />
    );
  }
);
FieldLabel.displayName = 'Field.Label';

export interface FieldDescriptionProps extends TextProps {
  className?: string;
}

const FieldDescription = forwardRef<RNText, FieldDescriptionProps>(
  ({ className, ...props }, ref) => {
    const { disabled } = useContext(FieldContext);
    const { description } = fieldVariants({ disabled });
    return <Text ref={ref} className={description({ className })} {...props} />;
  }
);
FieldDescription.displayName = 'Field.Description';

export interface FieldErrorProps extends Omit<ViewProps, 'children'> {
  className?: string;
  /**
   * Error messages to render, deduplicated by message. A single entry renders
   * as plain text; more than one renders as a bulleted list, since RN has no
   * `<ul>`. Prefer this over `children` when the messages come from a form's
   * validation state, which is naturally an array.
   */
  errors?: Array<string | { message?: string } | null | undefined>;
  children?: ReactNode;
}

const FieldError = forwardRef<View, FieldErrorProps>(
  ({ className, errors, children, ...props }, ref) => {
    const messages = useMemo(() => {
      if (!errors) return null;
      const seen = new Set<string>();
      const out: string[] = [];
      for (const item of errors) {
        const message = typeof item === 'string' ? item : item?.message;
        if (message && !seen.has(message)) {
          seen.add(message);
          out.push(message);
        }
      }
      return out;
    }, [errors]);

    const hasContent = messages ? messages.length > 0 : !!children;
    if (!hasContent) return null;

    const { error, errorText, bullet, bulletDot } = fieldVariants();

    return (
      <View
        ref={ref}
        // Web-aligned `role`, same as `Separator` already uses — RN's older
        // accessibilityRole list has no alert, the ARIA-aligned one does.
        role="alert"
        accessibilityLiveRegion="polite"
        className={error({ className })}
        {...props}
      >
        {messages ? (
          messages.length === 1 ? (
            <Text className={errorText()}>{messages[0]}</Text>
          ) : (
            messages.map((message) => (
              <View key={message} className={bullet()}>
                <Text className={bulletDot()}>{'•'}</Text>
                <Text className={errorText()}>{message}</Text>
              </View>
            ))
          )
        ) : typeof children === 'string' ? (
          <Text className={errorText()}>{children}</Text>
        ) : (
          children
        )}
      </View>
    );
  }
);
FieldError.displayName = 'Field.Error';

export interface FieldSetProps extends ViewProps {
  className?: string;
  children?: ReactNode;
}

const FieldSet = forwardRef<View, FieldSetProps>(
  ({ className, ...props }, ref) => {
    const { set } = fieldVariants();
    return <View ref={ref} role="group" className={set({ className })} {...props} />;
  }
);
FieldSet.displayName = 'Field.Set';

export interface FieldLegendProps extends TextProps {
  className?: string;
  /** `legend` reads as a section heading; `label` sits closer to a field label. */
  variant?: 'legend' | 'label';
}

const FieldLegend = forwardRef<RNText, FieldLegendProps>(
  ({ className, variant = 'legend', ...props }, ref) => {
    const { legend } = fieldVariants({ legendVariant: variant });
    return (
      <Text ref={ref} role="heading" className={legend({ className })} {...props} />
    );
  }
);
FieldLegend.displayName = 'Field.Legend';

export interface FieldGroupProps extends ViewProps {
  className?: string;
  children?: ReactNode;
}

const FieldGroup = forwardRef<View, FieldGroupProps>(
  ({ className, ...props }, ref) => {
    const { group } = fieldVariants();
    return <View ref={ref} className={group({ className })} {...props} />;
  }
);
FieldGroup.displayName = 'Field.Group';

export interface FieldSeparatorProps extends ViewProps {
  className?: string;
  /** Centered text, e.g. "Or" — omit for a plain rule. */
  children?: ReactNode;
}

const FieldSeparator = forwardRef<View, FieldSeparatorProps>(
  ({ className, children, ...props }, ref) => {
    const { separator, separatorLabel } = fieldVariants();
    return (
      <View ref={ref} className={separator({ className })} {...props}>
        <Separator className="flex-1" />
        {children ? (
          <>
            <Text className={separatorLabel()}>{children}</Text>
            <Separator className="flex-1" />
          </>
        ) : null}
      </View>
    );
  }
);
FieldSeparator.displayName = 'Field.Separator';

export interface FieldTitleProps extends TextProps {
  className?: string;
}

const FieldTitle = forwardRef<RNText, FieldTitleProps>(
  ({ className, ...props }, ref) => {
    const { title } = fieldVariants();
    return <Text ref={ref} className={title({ className })} {...props} />;
  }
);
FieldTitle.displayName = 'Field.Title';

export const Field = Object.assign(FieldRoot, {
  Content: FieldContent,
  Label: FieldLabel,
  Description: FieldDescription,
  Error: FieldError,
  Set: FieldSet,
  Legend: FieldLegend,
  Group: FieldGroup,
  Separator: FieldSeparator,
  Title: FieldTitle,
});
