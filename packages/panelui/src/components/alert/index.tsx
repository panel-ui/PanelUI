/**
 * Alert — a status message with an optional leading status icon.
 *
 * Adapted from: heroui-inc/heroui-native src/components/alert/alert.tsx
 * (Indicator / Content / Title / Description anatomy, status-driven icon and
 * title colour), restyled with Coss UI tokens.
 *
 * The `variant` prop name is kept from PanelUI v0.2 rather than renamed to
 * HeroUI's `status`, so existing code keeps working.
 */
import { createContext, forwardRef, useContext, type ReactNode } from 'react';
import { View, type Text as RNText, type ViewProps } from 'react-native';
import { tv, type VariantProps } from 'tailwind-variants';
import { useCSSVariable } from 'uniwind';
import { cn } from '../../utils/cn';
import { Text, type TextProps } from '../../primitives/text';
import { AlertTriangleIcon, CheckCircleIcon, InfoIcon } from '../../icons';

const alertVariants = tv({
  slots: {
    root: 'w-full flex-row gap-3 rounded-xl border px-3.5 py-3',
    indicator: 'pt-px',
    content: 'flex-1 gap-0.5',
    title: 'text-sm font-medium',
    description: 'text-sm text-muted-foreground',
  },
  variants: {
    variant: {
      default: {
        root: 'border-border bg-surface',
        title: 'text-card-foreground',
      },
      info: {
        root: 'border-info/32 bg-info-soft',
        title: 'text-info-foreground',
      },
      success: {
        root: 'border-success/32 bg-success-soft',
        title: 'text-success-foreground',
      },
      warning: {
        root: 'border-warning/32 bg-warning-soft',
        title: 'text-warning-foreground',
      },
      destructive: {
        root: 'border-destructive/32 bg-destructive-soft',
        title: 'text-destructive-foreground',
      },
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

type AlertVariant = NonNullable<VariantProps<typeof alertVariants>['variant']>;

const AlertContext = createContext<AlertVariant>('default');

/** CSS variable each variant's indicator icon takes its colour from. */
const INDICATOR_COLOR_VAR: Record<AlertVariant, string> = {
  default: '--color-muted-foreground',
  info: '--color-info-foreground',
  success: '--color-success-foreground',
  warning: '--color-warning-foreground',
  destructive: '--color-destructive-foreground',
};

const INDICATOR_ICON: Record<AlertVariant, typeof InfoIcon> = {
  default: InfoIcon,
  info: InfoIcon,
  success: CheckCircleIcon,
  warning: AlertTriangleIcon,
  destructive: AlertTriangleIcon,
};

export interface AlertProps extends ViewProps, VariantProps<typeof alertVariants> {
  className?: string;
  /**
   * Leading element rendered before the content.
   *
   * @deprecated Prefer `<Alert.Indicator>`, which picks a status icon for you.
   * Still honoured so v0.2 call sites keep rendering.
   */
  icon?: ReactNode;
  children?: ReactNode;
}

const AlertRoot = forwardRef<View, AlertProps>(
  ({ className, variant = 'default', icon, children, ...props }, ref) => {
    const { root, indicator, content } = alertVariants({ variant });

    return (
      <AlertContext.Provider value={variant}>
        <View
          ref={ref}
          accessibilityRole="alert"
          className={root({ className })}
          {...props}
        >
          {icon ? (
            <>
              <View className={indicator()}>{icon}</View>
              <View className={content()}>{children}</View>
            </>
          ) : (
            children
          )}
        </View>
      </AlertContext.Provider>
    );
  }
);
AlertRoot.displayName = 'Alert';

export interface AlertIndicatorProps extends ViewProps {
  className?: string;
  /** Overrides the size/colour of the default status icon. */
  iconProps?: { size?: number; color?: string };
  /** Replaces the default status icon entirely. */
  children?: ReactNode;
}

/**
 * Leading status icon. Resolves both the icon and its colour from the parent
 * Alert's variant, so it follows the active theme.
 */
const AlertIndicator = forwardRef<View, AlertIndicatorProps>(
  ({ className, iconProps, children, ...props }, ref) => {
    const variant = useContext(AlertContext);
    const { indicator } = alertVariants({ variant });
    const themeColor = useCSSVariable(INDICATOR_COLOR_VAR[variant]);
    const Icon = INDICATOR_ICON[variant];

    const color =
      iconProps?.color ?? (typeof themeColor === 'string' ? themeColor : undefined);

    return (
      <View ref={ref} className={indicator({ className })} {...props}>
        {children ?? <Icon size={iconProps?.size ?? 18} color={color} />}
      </View>
    );
  }
);
AlertIndicator.displayName = 'Alert.Indicator';

/** Flex-1 wrapper for Alert.Title and Alert.Description. */
const AlertContent = forwardRef<View, ViewProps & { className?: string }>(
  ({ className, ...props }, ref) => {
    const variant = useContext(AlertContext);
    const { content } = alertVariants({ variant });
    return <View ref={ref} className={content({ className })} {...props} />;
  }
);
AlertContent.displayName = 'Alert.Content';

const AlertTitle = forwardRef<RNText, TextProps>(
  ({ className, ...props }, ref) => {
    const variant = useContext(AlertContext);
    const { title } = alertVariants({ variant });
    return <Text ref={ref} className={cn(title(), className)} {...props} />;
  }
);
AlertTitle.displayName = 'Alert.Title';

const AlertDescription = forwardRef<RNText, TextProps>(
  ({ className, ...props }, ref) => {
    const variant = useContext(AlertContext);
    const { description } = alertVariants({ variant });
    return <Text ref={ref} className={cn(description(), className)} {...props} />;
  }
);
AlertDescription.displayName = 'Alert.Description';

export const Alert = Object.assign(AlertRoot, {
  /** @optional Status icon rendered as the leading visual element. */
  Indicator: AlertIndicator,
  /** @optional Wrapper for title and description. */
  Content: AlertContent,
  Title: AlertTitle,
  Description: AlertDescription,
});
