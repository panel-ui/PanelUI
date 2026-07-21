/**
 * Attachment — a file, with its upload life.
 *
 * A file in a chat composer or an upload list is the same row shape `Item`
 * already draws — media, a name, a size, a remove button — so this is that row,
 * not a second one. What it adds is the part `Item` has no opinion on: the
 * file's *state*. A file is picked, then uploading, then processing, then done
 * (or failed), and each of those has to look different or the user cannot tell
 * a stuck upload from a finished one.
 *
 * ```tsx
 * <Attachment state="uploading">
 *   <Attachment.Media><FileIcon /></Attachment.Media>
 *   <Attachment.Content>
 *     <Attachment.Title>report.pdf</Attachment.Title>
 *     <Attachment.Description>PDF · 2.4 MB</Attachment.Description>
 *   </Attachment.Content>
 *   <Attachment.Actions>
 *     <Attachment.Action aria-label="Cancel"><XIcon size={14} /></Attachment.Action>
 *   </Attachment.Actions>
 * </Attachment>
 * ```
 *
 * While uploading or processing the title shimmers — the same sweep the rest of
 * the library uses for "in progress" — and an optional bar tracks `progress`.
 * A failed file tints its name and description in the destructive colour, which
 * carries the state without relying on an icon nobody reads.
 */
import { createContext, forwardRef, useContext, type ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';
import { tv } from 'tailwind-variants';
import { useCSSVariable } from 'uniwind';
import { AnimatedPressable, type AnimatedPressableProps } from '../../primitives/animated-pressable';
import { Text, type TextProps } from '../../primitives/text';
import { cn } from '../../utils/cn';
import { Item } from '../item';
import { Shimmer } from '../shimmer';

export type AttachmentState = 'idle' | 'uploading' | 'processing' | 'error' | 'done';
type AttachmentSize = 'default' | 'sm' | 'xs';

interface AttachmentContextValue {
  state: AttachmentState;
  size: AttachmentSize;
}

const AttachmentContext = createContext<AttachmentContextValue>({
  state: 'done',
  size: 'default',
});

/** True while the file is still moving — the two states that shimmer. */
function isBusy(state: AttachmentState): boolean {
  return state === 'uploading' || state === 'processing';
}

const rootVariants = tv({
  base: '',
  variants: {
    state: {
      idle: '',
      uploading: '',
      processing: '',
      // The border carries the failure, so it reads at a glance in a list.
      error: 'border border-destructive',
      done: '',
    },
  },
});

export interface AttachmentProps
  extends Omit<AnimatedPressableProps, 'children' | 'disabled'> {
  className?: string;
  /**
   * Where the file is in its life. `uploading`/`processing` shimmer the name;
   * `error` tints the row destructive. Default `done`.
   */
  state?: AttachmentState;
  /** Row density, passed through to the underlying Item. */
  size?: AttachmentSize;
  /** Stack the row into a card — for a horizontal group of thumbnails. */
  orientation?: 'horizontal' | 'vertical';
  /** Upload progress 0–1. Draws a thin bar along the bottom while busy. */
  progress?: number;
  disabled?: boolean;
  children?: ReactNode;
}

const AttachmentRoot = forwardRef<View, AttachmentProps>(
  (
    { className, state = 'done', size = 'default', orientation, progress, children, ...props },
    ref
  ) => {
    const track = useCSSVariable('--color-primary');

    return (
      <AttachmentContext.Provider value={{ state, size }}>
        <Item
          ref={ref}
          size={size}
          orientation={orientation}
          variant="outline"
          className={cn('overflow-hidden', rootVariants({ state }), className)}
          {...props}
        >
          {children}

          {/* A determinate bar while busy, if progress is known. Absolute so it
              rides the row's bottom edge without shifting the layout. */}
          {isBusy(state) && progress !== undefined ? (
            <View className="absolute bottom-0 left-0 right-0 h-0.5 bg-muted">
              <View
                style={{
                  width: `${Math.min(100, Math.max(0, progress * 100))}%`,
                  backgroundColor: typeof track === 'string' ? track : undefined,
                }}
                className="h-full"
              />
            </View>
          ) : null}
        </Item>
      </AttachmentContext.Provider>
    );
  }
);
AttachmentRoot.displayName = 'Attachment';

export interface AttachmentGroupProps extends ViewProps {
  className?: string;
  orientation?: 'horizontal' | 'vertical';
  children?: ReactNode;
}

/** A row (or column) of attachments — the same stack `Item.Group` provides. */
const AttachmentGroup = forwardRef<View, AttachmentGroupProps>(
  ({ className, orientation = 'vertical', children, ...props }, ref) => (
    <Item.Group ref={ref} orientation={orientation} className={className} {...props}>
      {children}
    </Item.Group>
  )
);
AttachmentGroup.displayName = 'Attachment.Group';

export interface AttachmentMediaProps extends ViewProps {
  className?: string;
  /** `icon` frames it in a tile; `image` clips it for a thumbnail. */
  variant?: 'default' | 'icon' | 'image';
  children?: ReactNode;
}

/** Leading slot — a file-type icon tile, or an image thumbnail. */
const AttachmentMedia = forwardRef<View, AttachmentMediaProps>(
  ({ className, variant = 'icon', children, ...props }, ref) => (
    <Item.Media ref={ref} variant={variant} className={className} {...props}>
      {children}
    </Item.Media>
  )
);
AttachmentMedia.displayName = 'Attachment.Media';

export interface AttachmentContentProps extends ViewProps {
  className?: string;
  children?: ReactNode;
}

const AttachmentContent = forwardRef<View, AttachmentContentProps>(
  ({ className, children, ...props }, ref) => (
    <Item.Content ref={ref} className={className} {...props}>
      {children}
    </Item.Content>
  )
);
AttachmentContent.displayName = 'Attachment.Content';

export interface AttachmentTitleProps extends TextProps {
  className?: string;
  children?: ReactNode;
}

/** The file name. Shimmers while the file is uploading or processing. */
const AttachmentTitle = forwardRef<React.ElementRef<typeof Text>, AttachmentTitleProps>(
  ({ className, children, ...props }, ref) => {
    const { state } = useContext(AttachmentContext);

    if (isBusy(state)) {
      // Shimmer owns the text so it can mask the sweep to the glyphs.
      return <Shimmer textClassName={cn('text-base font-medium', className)}>{children}</Shimmer>;
    }

    return (
      <Item.Title
        ref={ref}
        className={cn(state === 'error' && 'text-destructive', className)}
        {...props}
      >
        {children}
      </Item.Title>
    );
  }
);
AttachmentTitle.displayName = 'Attachment.Title';

export interface AttachmentDescriptionProps extends TextProps {
  className?: string;
  children?: ReactNode;
}

/** File type, size or status. Tints destructive on `error`. */
const AttachmentDescription = forwardRef<
  React.ElementRef<typeof Text>,
  AttachmentDescriptionProps
>(({ className, children, ...props }, ref) => {
  const { state } = useContext(AttachmentContext);

  return (
    <Item.Description
      ref={ref}
      className={cn(state === 'error' && 'text-destructive', className)}
      {...props}
    >
      {children}
    </Item.Description>
  );
});
AttachmentDescription.displayName = 'Attachment.Description';

export interface AttachmentActionsProps extends ViewProps {
  className?: string;
  children?: ReactNode;
}

const AttachmentActions = forwardRef<View, AttachmentActionsProps>(
  ({ className, children, ...props }, ref) => (
    <Item.Actions ref={ref} className={className} {...props}>
      {children}
    </Item.Actions>
  )
);
AttachmentActions.displayName = 'Attachment.Actions';

export interface AttachmentActionProps
  extends Omit<AnimatedPressableProps, 'children'> {
  className?: string;
  accessibilityLabel: string;
  children?: ReactNode;
}

/**
 * A single icon button in the actions slot — remove, retry, download. An icon
 * on its own says nothing to a screen reader, so the label is required.
 */
const AttachmentAction = forwardRef<View, AttachmentActionProps>(
  ({ className, accessibilityLabel, children, ...props }, ref) => (
    <AnimatedPressable
      ref={ref}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      className={cn(
        'h-8 w-8 items-center justify-center rounded-full active:bg-muted',
        className
      )}
      {...props}
    >
      {children}
    </AnimatedPressable>
  )
);
AttachmentAction.displayName = 'Attachment.Action';

export const Attachment = Object.assign(AttachmentRoot, {
  Group: AttachmentGroup,
  Media: AttachmentMedia,
  Content: AttachmentContent,
  Title: AttachmentTitle,
  Description: AttachmentDescription,
  Actions: AttachmentActions,
  Action: AttachmentAction,
});
