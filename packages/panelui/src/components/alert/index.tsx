import { createContext, forwardRef, useContext, type ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';
import { tv, type VariantProps } from 'tailwind-variants';
import { cn } from '../../utils/cn';
import { Text, type TextProps } from '../../primitives/text';

const alertVariants = tv({
  slots: {
    root: 'w-full gap-1 rounded-xl border p-4',
    title: 'font-semibold',
    description: 'text-sm',
  },
  variants: {
    variant: {
      default: {
        root: 'border-border bg-card',
        title: 'text-card-foreground',
        description: 'text-muted-foreground',
      },
      info: {
        root: 'border-info/30 bg-info/10',
        title: 'text-info',
        description: 'text-info/90',
      },
      success: {
        root: 'border-success/30 bg-success/10',
        title: 'text-success',
        description: 'text-success/90',
      },
      warning: {
        root: 'border-warning/40 bg-warning/10',
        title: 'text-warning-foreground',
        description: 'text-warning-foreground/80',
      },
      destructive: {
        root: 'border-destructive/30 bg-destructive/10',
        title: 'text-destructive',
        description: 'text-destructive/90',
      },
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

type AlertVariant = VariantProps<typeof alertVariants>['variant'];

const AlertContext = createContext<AlertVariant>('default');

export interface AlertProps extends ViewProps, VariantProps<typeof alertVariants> {
  className?: string;
  /** Optional leading icon rendered before the content. */
  icon?: ReactNode;
  children?: ReactNode;
}

const AlertRoot = forwardRef<View, AlertProps>(
  ({ className, variant = 'default', icon, children, ...props }, ref) => {
    const { root } = alertVariants({ variant });

    return (
      <AlertContext.Provider value={variant}>
        <View
          ref={ref}
          accessibilityRole="alert"
          className={root({ className })}
          {...props}
        >
          {icon ? (
            <View className="flex-row items-start gap-3">
              <View className="mt-0.5">{icon}</View>
              <View className="flex-1 gap-1">{children}</View>
            </View>
          ) : (
            children
          )}
        </View>
      </AlertContext.Provider>
    );
  }
);
AlertRoot.displayName = 'Alert';

const AlertTitle = forwardRef<React.ElementRef<typeof Text>, TextProps>(
  ({ className, ...props }, ref) => {
    const variant = useContext(AlertContext);
    const { title } = alertVariants({ variant });
    return <Text ref={ref} className={cn(title(), className)} {...props} />;
  }
);
AlertTitle.displayName = 'Alert.Title';

const AlertDescription = forwardRef<React.ElementRef<typeof Text>, TextProps>(
  ({ className, ...props }, ref) => {
    const variant = useContext(AlertContext);
    const { description } = alertVariants({ variant });
    return <Text ref={ref} className={cn(description(), className)} {...props} />;
  }
);
AlertDescription.displayName = 'Alert.Description';

export const Alert = Object.assign(AlertRoot, {
  Title: AlertTitle,
  Description: AlertDescription,
});
