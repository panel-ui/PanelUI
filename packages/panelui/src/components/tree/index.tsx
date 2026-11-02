/**
 * Tree — a hierarchy you can open a level at a time.
 *
 * The shape behind a file browser, a folder of settings, a category picker, a
 * table of contents: rows that contain other rows, where a parent's children
 * only exist on screen once you ask for them. Accordion is the one-level
 * version of this and stops there — its items cannot hold items. A tree's can,
 * to any depth, and everything that follows from that is what this component
 * owns: which node a row sits under, how far in it is drawn, whether it is a
 * branch at all, and which of its ancestors are open.
 *
 * ```tsx
 * <Tree defaultExpanded={['src']} selectionMode="single">
 *   <Tree.Item value="src">
 *     <Tree.Trigger>
 *       <Tree.Indicator />
 *       <Tree.Label>src</Tree.Label>
 *     </Tree.Trigger>
 *     <Tree.Group>
 *       <Tree.Item value="src/index.ts">
 *         <Tree.Trigger>
 *           <Tree.Indicator />
 *           <Tree.Label>index.ts</Tree.Label>
 *         </Tree.Trigger>
 *       </Tree.Item>
 *     </Tree.Group>
 *   </Tree.Item>
 * </Tree>
 * ```
 *
 * A closed branch renders nothing below it — the subtree is unmounted, not
 * hidden — so the cost of a tree is what is open in it rather than what is in
 * it. A folder of ten thousand files that nobody has opened costs one row.
 *
 * An item is a branch because it holds a `Tree.Group`, not because it was
 * declared one, so there is no second fact to keep true. The exception is a
 * branch whose children have not been fetched yet: it has no group to be
 * detected by, so it says `hasChildren` and gets its chevron, and the fetch
 * hangs off `onExpandedChange`.
 *
 * Expansion and selection are separate pieces of state because they answer
 * separate questions — which parts of the hierarchy are open, and which row is
 * the chosen one — and a tree commonly needs one without the other. Either can
 * be controlled or left alone.
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
import Animated, {
  LinearTransition,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from 'react-native-reanimated';
import { tv } from 'tailwind-variants';
import { useCSSVariable } from 'uniwind';
import { ChevronRightIcon, IconColorProvider } from '../../icons';
import { useDirection } from '../../hooks/use-direction';
import { Text, type TextProps } from '../../primitives/text';
import type { TextRef, ViewRef } from '../../primitives/refs';

export type TreeSize = 'sm' | 'default';

/** `none` makes the rows expanders only — nothing is ever the chosen one. */
export type TreeSelectionMode = 'none' | 'single' | 'multiple';

/** How far one level is drawn in from its parent, in points. */
const DEFAULT_INDENT = 16;

/** Matches the disclosure and layout timings the rest of the library uses. */
const TRANSITION_DURATION = 200;

const treeVariants = tv({
  slots: {
    root: 'w-full',
    item: '',
    trigger: 'flex-row items-center gap-2 rounded-lg',
    indicator: 'items-center justify-center',
    icon: 'items-center justify-center',
    label: 'flex-1 text-foreground',
    actions: 'flex-row items-center gap-1',
    // The colour is set unconditionally and the width is not: `showLines` puts
    // a border on the start edge, and a colour with no width draws nothing.
    group: 'border-border',
  },
  variants: {
    size: {
      sm: {
        trigger: 'px-1.5 py-1',
        indicator: 'h-4 w-4',
        icon: 'h-4 w-4',
        label: 'text-xs',
      },
      default: {
        trigger: 'px-2 py-1.5',
        indicator: 'h-5 w-5',
        icon: 'h-5 w-5',
        label: 'text-sm',
      },
    },
    isSelected: {
      true: { trigger: 'bg-accent', label: 'font-medium text-accent-foreground' },
    },
    isDisabled: {
      true: { trigger: 'opacity-50' },
    },
  },
  defaultVariants: {
    size: 'default',
  },
});

interface TreeContextValue {
  expanded: string[];
  toggleExpanded: (value: string) => void;
  selected: string[];
  select: (value: string) => void;
  selectionMode: TreeSelectionMode;
  expandOnPress: boolean;
  showLines: boolean;
  indent: number;
  size: TreeSize;
}

interface TreeItemContextValue {
  value: string;
  /** 0 for a root item; one more than its parent's for anything nested. */
  level: number;
  isExpanded: boolean;
  isSelected: boolean;
  isDisabled: boolean;
  isBranch: boolean;
}

const TreeContext = createContext<TreeContextValue | null>(null);
const TreeItemContext = createContext<TreeItemContextValue | null>(null);

function useTree(component: string): TreeContextValue {
  const context = useContext(TreeContext);
  if (!context) throw new Error(`${component} must be used within a <Tree>`);
  return context;
}

function useTreeItem(component: string): TreeItemContextValue {
  const context = useContext(TreeItemContext);
  if (!context) throw new Error(`${component} must be used within a <Tree.Item>`);
  return context;
}

const toArray = (value: string | string[] | undefined): string[] =>
  value === undefined ? [] : Array.isArray(value) ? value : [value];

export interface TreeProps extends ViewProps {
  className?: string;
  /** Row density. `sm` for a sidebar or a picker inside a sheet. */
  size?: TreeSize;
  /** Whether a row can be the chosen one, and how many can be at once. */
  selectionMode?: TreeSelectionMode;
  /** Selected value(s), controlled. An array when `selectionMode` is `multiple`. */
  value?: string | string[];
  defaultValue?: string | string[];
  /** Handed back in the shape it was given — a string when single, an array when multiple. */
  onValueChange?: (value: string | string[]) => void;
  /** Values of the open branches, controlled. */
  expanded?: string[];
  defaultExpanded?: string[];
  /** Fires with the next set of open branches — the hook to load a branch's children on. */
  onExpandedChange?: (expanded: string[]) => void;
  /**
   * Whether pressing anywhere on a branch's row opens it, as well as selecting
   * it. Turn it off when selecting a branch has to be possible without opening
   * it; the chevron still opens it either way.
   */
  expandOnPress?: boolean;
  /** Draw a hairline down each level, connecting a branch to the rows inside it. */
  showLines?: boolean;
  /** How far one level is drawn in from its parent, in points. */
  indent?: number;
  children?: ReactNode;
}

const TreeRoot = forwardRef<ViewRef, TreeProps>(
  (
    {
      className,
      size = 'default',
      selectionMode = 'none',
      value,
      defaultValue,
      onValueChange,
      expanded,
      defaultExpanded,
      onExpandedChange,
      expandOnPress = true,
      showLines = false,
      indent = DEFAULT_INDENT,
      children,
      ...props
    },
    ref
  ) => {
    const [internalExpanded, setInternalExpanded] = useState<string[]>(
      () => defaultExpanded ?? []
    );
    const isExpandedControlled = expanded !== undefined;
    const expandedValues = isExpandedControlled ? expanded : internalExpanded;

    const [internalSelected, setInternalSelected] = useState<string[]>(() =>
      toArray(defaultValue)
    );
    const isSelectionControlled = value !== undefined;
    const selected = isSelectionControlled ? toArray(value) : internalSelected;

    const toggleExpanded = useCallback(
      (itemValue: string) => {
        const next = expandedValues.includes(itemValue)
          ? expandedValues.filter((entry) => entry !== itemValue)
          : [...expandedValues, itemValue];

        if (!isExpandedControlled) setInternalExpanded(next);
        onExpandedChange?.(next);
      },
      [expandedValues, isExpandedControlled, onExpandedChange]
    );

    const select = useCallback(
      (itemValue: string) => {
        if (selectionMode === 'none') return;

        const next =
          selectionMode === 'single'
            ? [itemValue]
            : selected.includes(itemValue)
              ? selected.filter((entry) => entry !== itemValue)
              : [...selected, itemValue];

        if (!isSelectionControlled) setInternalSelected(next);
        // Hand back the shape the caller gave us, as Accordion does.
        onValueChange?.(selectionMode === 'single' ? (next[0] ?? '') : next);
      },
      [selected, selectionMode, isSelectionControlled, onValueChange]
    );

    const context = useMemo(
      () => ({
        expanded: expandedValues,
        toggleExpanded,
        selected,
        select,
        selectionMode,
        expandOnPress,
        showLines,
        indent,
        size,
      }),
      [
        expandedValues,
        toggleExpanded,
        selected,
        select,
        selectionMode,
        expandOnPress,
        showLines,
        indent,
        size,
      ]
    );

    const { root } = treeVariants({ size });

    return (
      <TreeContext.Provider value={context}>
        <Animated.View
          ref={ref}
          {...props}
          layout={LinearTransition.duration(TRANSITION_DURATION)}
          accessibilityRole="list"
          className={root({ className })}
        >
          {children}
        </Animated.View>
      </TreeContext.Provider>
    );
  }
);
TreeRoot.displayName = 'Tree';

export interface TreeItemProps extends ViewProps {
  className?: string;
  /** Identifies this node in the tree's expanded and selected state. */
  value: string;
  isDisabled?: boolean;
  /**
   * Marks the item as a branch when it has no `Tree.Group` to be detected by —
   * a folder whose contents are fetched the first time it is opened. It gets a
   * chevron, and opening it fires `onExpandedChange` with nothing to show yet.
   */
  hasChildren?: boolean;
  children?: ReactNode;
}

/**
 * One node. Whether it is a branch or a leaf is read off its children rather
 * than declared: an item holding a `Tree.Group` is a branch, and anything else
 * is a leaf that renders a chevron-sized gap in place of the chevron so its
 * label still lines up with its siblings'.
 */
const TreeItem = forwardRef<ViewRef, TreeItemProps>(
  ({ className, value, isDisabled = false, hasChildren, children, ...props }, ref) => {
    const { expanded, selected } = useTree('Tree.Item');
    const parent = useContext(TreeItemContext);
    const { item } = treeVariants();

    const isBranch =
      hasChildren ??
      Children.toArray(children).some(
        (child) => isValidElement(child) && child.type === TreeGroup
      );

    const context = useMemo(
      () => ({
        value,
        level: parent ? parent.level + 1 : 0,
        isExpanded: expanded.includes(value),
        isSelected: selected.includes(value),
        isDisabled,
        isBranch,
      }),
      [value, parent, expanded, selected, isDisabled, isBranch]
    );

    return (
      <TreeItemContext.Provider value={context}>
        <Animated.View
          ref={ref}
          layout={LinearTransition.duration(TRANSITION_DURATION)}
          className={item({ className })}
          {...props}
        >
          {children}
        </Animated.View>
      </TreeItemContext.Provider>
    );
  }
);
TreeItem.displayName = 'Tree.Item';

/** Pressable props are forwarded; `onPress` runs after the tree updates its state. */
export interface TreeTriggerProps extends Omit<PressableProps, 'children'> {
  className?: string;
  children?: ReactNode;
}

/**
 * The node's row: everything you see on one line, and the thing you press.
 *
 * `aria-level` is set from the item's depth, but the role stays `button`.
 * React Native has no tree role that any platform screen reader implements, so
 * announcing the row as what it behaves like — a button that opens something,
 * with its expanded and selected state attached — is the description that
 * actually survives to the user.
 */
const TreeTrigger = forwardRef<ViewRef, TreeTriggerProps>(
  ({ className, onPress, disabled = false, children, ...props }, ref) => {
    const { toggleExpanded, select, selectionMode, expandOnPress, size } =
      useTree('Tree.Trigger');
    const { value, level, isExpanded, isSelected, isDisabled, isBranch } =
      useTreeItem('Tree.Trigger');
    const accentForeground = useCSSVariable('--color-accent-foreground');
    const selectedColor = typeof accentForeground === 'string' ? accentForeground : undefined;

    const triggerDisabled = Boolean(isDisabled || disabled);
    const { trigger } = treeVariants({ size, isSelected, isDisabled: triggerDisabled });
    const handlePress: NonNullable<PressableProps['onPress']> = (event) => {
      if (isBranch && expandOnPress) toggleExpanded(value);
      select(value);
      onPress?.(event);
    };

    return (
      <Pressable
        ref={ref}
        {...props}
        accessibilityRole="button"
        accessibilityState={{
          expanded: isBranch ? isExpanded : undefined,
          selected: selectionMode === 'none' ? undefined : isSelected,
          disabled: triggerDisabled,
        }}
        aria-level={level + 1}
        disabled={triggerDisabled}
        className={trigger({ className })}
        onPress={handlePress}
      >
        <IconColorProvider color={isSelected ? selectedColor : undefined}>
          {children}
        </IconColorProvider>
      </Pressable>
    );
  }
);
TreeTrigger.displayName = 'Tree.Trigger';

export interface TreeIndicatorProps extends ViewProps {
  className?: string;
  /** Replaces the default chevron. It is rotated for you while the branch is open. */
  children?: ReactNode;
}

/**
 * The chevron, and the second way to open a branch.
 *
 * It is pressable in its own right, and because a press is consumed by the
 * innermost target that handles it, hitting the chevron opens the branch
 * without also selecting the row — which is the only way to look inside a
 * folder without choosing it when `expandOnPress` is off.
 *
 * On a leaf it becomes an empty box of the same size rather than disappearing,
 * so a leaf's label starts where its siblings' labels do.
 */
const TreeIndicator = forwardRef<ViewRef, TreeIndicatorProps>(
  ({ className, children, ...props }, ref) => {
    const { toggleExpanded, size } = useTree('Tree.Indicator');
    const { value, isExpanded, isDisabled, isBranch } = useTreeItem('Tree.Indicator');
    const { indicator } = treeVariants({ size });
    const direction = useDirection();

    /*
     * The glyph already points along the reading direction — it is drawn
     * mirrored in a right-to-left subtree — so the quarter turn that makes it
     * point downwards has to follow it round, or an open branch in Arabic
     * would have its chevron pointing at the ceiling.
     */
    const openRotation = direction === 'rtl' ? -90 : 90;
    const rotation = useDerivedValue(
      () => withTiming(isExpanded ? openRotation : 0, { duration: TRANSITION_DURATION }),
      [isExpanded, openRotation]
    );
    const rotationStyle = useAnimatedStyle(() => ({
      transform: [{ rotate: `${rotation.value}deg` }],
    }));

    // After the hooks, never before them: a leaf still runs every one of them.
    if (!isBranch) {
      return <View ref={ref} className={indicator({ className })} {...props} />;
    }

    return (
      <Pressable
        ref={ref}
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded, disabled: isDisabled }}
        disabled={isDisabled}
        onPress={() => toggleExpanded(value)}
        className={indicator({ className })}
        {...props}
      >
        <Animated.View style={rotationStyle}>
          {children ?? <ChevronRightIcon size={size === 'sm' ? 14 : 16} />}
        </Animated.View>
      </Pressable>
    );
  }
);
TreeIndicator.displayName = 'Tree.Indicator';

export interface TreeIconProps extends ViewProps {
  className?: string;
  children?: ReactNode;
}

/** The leading glyph, between the chevron and the label. */
const TreeIcon = forwardRef<ViewRef, TreeIconProps>(({ className, ...props }, ref) => {
  const { size } = useTree('Tree.Icon');
  const { icon } = treeVariants({ size });
  return <View ref={ref} className={icon({ className })} {...props} />;
});
TreeIcon.displayName = 'Tree.Icon';

/** The row's text. Takes the selected colour with the rest of the row. */
const TreeLabel = forwardRef<TextRef, TextProps>(({ className, ...props }, ref) => {
  const { size } = useTree('Tree.Label');
  const { isSelected } = useTreeItem('Tree.Label');
  const { label } = treeVariants({ size, isSelected });
  return <Text ref={ref} numberOfLines={1} className={label({ className })} {...props} />;
});
TreeLabel.displayName = 'Tree.Label';

export interface TreeActionsProps extends ViewProps {
  className?: string;
  children?: ReactNode;
}

/** The trailing slot: a count, a badge, a menu button for the node. */
const TreeActions = forwardRef<ViewRef, TreeActionsProps>(({ className, ...props }, ref) => {
  const { actions } = treeVariants();
  return <View ref={ref} className={actions({ className })} {...props} />;
});
TreeActions.displayName = 'Tree.Actions';

export interface TreeGroupProps extends ViewProps {
  className?: string;
  children?: ReactNode;
}

/**
 * The rows inside a branch, and the reason its item is a branch at all.
 *
 * It unmounts when the branch is closed, so a subtree nobody has opened has
 * never rendered and a tree costs what is open in it rather than what is in it.
 * The item's layout transition animates the height the group's rows take up,
 * the same way `Accordion` animates a panel.
 *
 * The indent is `paddingStart`, not `paddingLeft`, and the guide line is a
 * start-edge border: an indent that always fell on the left would run the wrong
 * way in a right-to-left subtree and put every level further from its parent.
 */
const TreeGroup = forwardRef<ViewRef, TreeGroupProps>(
  ({ className, children, ...props }, ref) => {
    const { showLines, indent } = useTree('Tree.Group');
    const { isExpanded } = useTreeItem('Tree.Group');
    const { group } = treeVariants();

    if (!isExpanded) return null;

    return (
      <View
        ref={ref}
        style={{
          // Split in half when there is a line to put between the halves, so a
          // level is indented by the same amount either way and the hairline
          // lands midway rather than adding a step of its own.
          marginStart: showLines ? indent / 2 : 0,
          paddingStart: showLines ? indent / 2 : indent,
          borderStartWidth: showLines ? 1 : 0,
        }}
        className={group({ className })}
        {...props}
      >
        {children}
      </View>
    );
  }
);
TreeGroup.displayName = 'Tree.Group';

export const Tree = Object.assign(TreeRoot, {
  Item: TreeItem,
  Trigger: TreeTrigger,
  Indicator: TreeIndicator,
  Icon: TreeIcon,
  Label: TreeLabel,
  Actions: TreeActions,
  Group: TreeGroup,
});
