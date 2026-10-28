'use client';

/**
 * Toolbar — a strip of tools and actions for an editor: one tool chosen at a
 * time, and buttons that act at once.
 *
 * ```tsx
 * <Toolbar shortcuts>
 *   <Toolbar.Group defaultValue="select" aria-label="Tools">
 *     <Toolbar.Tool value="select" label="Select" shortcut="V"><PointerIcon /></Toolbar.Tool>
 *     <Toolbar.Tool value="pen" label="Pen" shortcut="P"><PenIcon /></Toolbar.Tool>
 *   </Toolbar.Group>
 *   <Toolbar.Separator />
 *   <Toolbar.Button label="Undo" shortcut="⌘Z"><UndoIcon /></Toolbar.Button>
 * </Toolbar>
 * ```
 *
 * ## One marker, and it travels
 *
 * The chosen tool sits on a filled marker in the primary colour. There is
 * one marker per group and it glides from tool to tool, so changing tools
 * reads as moving a hand along the strip rather than as one button going
 * dark while another lights up.
 *
 * ## Tools and actions are different things
 *
 * `Toolbar.Tool` is a mode: exactly one in a `Toolbar.Group` is on, and it
 * stays on until another is chosen. `Toolbar.Button` is an action, undo or
 * zoom, and leaves nothing behind. Keeping the two apart is what lets the
 * strip say at a glance which mode the editor is in.
 *
 * ## The keyboard
 *
 * Arrow keys move along the strip and Home and End jump to its ends. Give a
 * tool or button a `shortcut` and its tooltip shows the key; set `shortcuts`
 * on the toolbar and a single key press, anywhere on the page outside a text
 * field, chooses that tool or presses that button.
 */
import { Toggle } from '@base-ui/react/toggle';
import { ToggleGroup } from '@base-ui/react/toggle-group';
import { Toolbar as BaseToolbar } from '@base-ui/react/toolbar';
import { Tooltip } from '@base-ui/react/tooltip';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from 'react';
import { tv } from 'tailwind-variants';

export type ToolbarVariant = 'floating' | 'inline';
export type ToolbarSize = 'sm' | 'md' | 'lg';

const toolbarVariants = tv({
  slots: {
    root: [
      'group/toolbar relative inline-flex w-fit items-center gap-0.5 outline-none',
      'data-[orientation=vertical]:flex-col',
      'data-disabled:pointer-events-none data-disabled:opacity-50',
    ],
    group: 'relative isolate flex items-center gap-0.5 group-data-[orientation=vertical]/toolbar:flex-col',
    marker: [
      'pointer-events-none absolute -z-10 rounded-(--toolbar-radius) bg-primary opacity-0 data-ready:opacity-100',
      'shadow-[0_1px_2px_rgb(0_0_0/0.18),inset_0_1px_0_rgb(255_255_255/0.18)]',
      'top-(--marker-y) left-(--marker-x) h-(--marker-h) w-(--marker-w)',
      'data-ready:transition-[left,top,width,height] data-ready:duration-[380ms] data-ready:ease-[cubic-bezier(0.3,1.2,0.4,1)] motion-reduce:transition-none',
    ],
    item: [
      'relative inline-flex h-(--toolbar-item) min-w-(--toolbar-item) shrink-0 cursor-pointer items-center justify-center gap-0.5 rounded-(--toolbar-radius) px-[calc((var(--toolbar-item)-var(--toolbar-icon))/2)]',
      'text-muted-foreground outline-none select-none transition-[color,background-color,scale] duration-150',
      'hover:bg-foreground/[0.06] hover:text-foreground active:scale-[0.94]',
      'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
      'data-disabled:pointer-events-none data-disabled:opacity-40 disabled:pointer-events-none disabled:opacity-40',
      // Menus opened from the strip keep their button marked while open.
      'data-popup-open:bg-foreground/[0.08] data-popup-open:text-foreground',
      '[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-(--toolbar-icon)',
      // A button that is only a caret is the options of the tool before it:
      // a slim chevron against that tool, with no fill of its own.
      'has-[>[data-slot=toolbar-caret]:only-child]:w-3.5 has-[>[data-slot=toolbar-caret]:only-child]:min-w-0 has-[>[data-slot=toolbar-caret]:only-child]:px-0',
      'has-[>[data-slot=toolbar-caret]:only-child]:bg-transparent has-[>[data-slot=toolbar-caret]:only-child]:active:scale-100',
      'has-[>[data-slot=toolbar-caret]:only-child]:data-popup-open:bg-transparent',
    ],
    // A chosen tool sits on the marker; the hover fill would hide it.
    tool: 'data-pressed:bg-transparent data-pressed:text-primary-foreground data-pressed:hover:bg-transparent',
    separator: [
      'mx-1 h-[calc(var(--toolbar-item)*0.5)] w-px shrink-0 rounded-full bg-foreground/15',
      'data-[orientation=horizontal]:mx-0 data-[orientation=horizontal]:my-1 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-[calc(var(--toolbar-item)*0.5)]',
    ],
    caret: [
      'pointer-events-none -me-1 flex size-3 shrink-0 items-center justify-center opacity-60 transition-opacity duration-150 [&_svg]:size-3',
      // On its own it takes its button's colour: muted until the hand is on
      // it or its menu is open.
      'only:me-0 only:opacity-100 motion-reduce:transition-none',
    ],
    tooltip: [
      'flex origin-(--transform-origin) items-center gap-2 rounded-lg bg-foreground px-2 py-1 text-xs font-medium text-background shadow-md',
      'transition-[opacity,scale] duration-150 data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:opacity-0',
      'data-instant:duration-0 motion-reduce:transition-none',
    ],
    kbd: 'rounded bg-background/15 px-1 font-sans text-[11px] tabular-nums text-background/80',
  },
  variants: {
    variant: {
      floating: {
        root: [
          'rounded-[calc(var(--toolbar-radius)+var(--toolbar-pad))] bg-popover p-(--toolbar-pad) text-popover-foreground',
          'shadow-[0_10px_30px_-12px_rgb(0_0_0/0.3)] ring-1 ring-foreground/[0.06] dark:ring-foreground/10',
        ],
      },
      inline: {},
    },
    size: {
      sm: { root: '[--toolbar-item:1.75rem] [--toolbar-icon:0.875rem] [--toolbar-radius:0.5rem] [--toolbar-pad:0.25rem]' },
      md: { root: '[--toolbar-item:2.25rem] [--toolbar-icon:1.125rem] [--toolbar-radius:0.75rem] [--toolbar-pad:0.3125rem]' },
      lg: { root: '[--toolbar-item:2.75rem] [--toolbar-icon:1.25rem] [--toolbar-radius:0.875rem] [--toolbar-pad:0.375rem]' },
    },
  },
  defaultVariants: { variant: 'floating', size: 'md' },
});

type Orientation = 'horizontal' | 'vertical';

interface ToolbarContextValue {
  orientation: Orientation;
  /** Lets a tool or button answer a key press. Returns the undo. */
  bind(key: string, run: () => void): () => void;
}

const ToolbarContext = createContext<ToolbarContextValue | null>(null);

function useToolbar(part: string) {
  const context = useContext(ToolbarContext);
  if (!context) throw new Error(`${part} must be used inside a <Toolbar>.`);
  return context;
}

/** Whether a key press belongs to something being typed into. */
function typing(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"], [role="textbox"]'));
}

/** The key a shortcut is pressed with, when it is one key on its own: "V" is, "⌘Z" is not. */
function plainKey(shortcut: string) {
  return [...shortcut].length === 1 && !'⌘⌥⌃⇧'.includes(shortcut) ? shortcut.toLowerCase() : null;
}

export interface ToolbarProps extends Omit<BaseToolbar.Root.Props, 'className' | 'style'> {
  /** `floating` sits on a raised surface of its own; `inline` draws only the buttons. Default `floating`. */
  variant?: ToolbarVariant;
  /** The size of every button in it. Default `md`. */
  size?: ToolbarSize;
  /**
   * Answer single-key shortcuts anywhere on the page: a key in a tool's or
   * button's `shortcut` chooses that tool or presses that button. Keys typed
   * into a field are left alone. Off by default; turn it on for the one
   * toolbar that owns the page.
   */
  shortcuts?: boolean;
  /** Which side of a button its tooltip opens on. Default below a row and beside a column. */
  tooltipSide?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  style?: CSSProperties;
}

const TooltipSideContext = createContext<'top' | 'bottom' | 'left' | 'right'>('bottom');

/** The strip. `orientation="vertical"` stands it up as a rail. */
function ToolbarRoot({
  variant,
  size,
  shortcuts = false,
  tooltipSide,
  orientation = 'horizontal',
  className,
  children,
  ...props
}: ToolbarProps) {
  const slots = toolbarVariants({ variant, size });
  const bindings = useRef(new Map<string, () => void>());

  useEffect(() => {
    if (!shortcuts) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || event.defaultPrevented || typing(event.target)) return;
      const run = bindings.current.get(event.key.toLowerCase());
      if (!run) return;
      event.preventDefault();
      run();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [shortcuts]);

  const context = useMemo<ToolbarContextValue>(
    () => ({
      orientation,
      bind: (key, run) => {
        bindings.current.set(key, run);
        return () => {
          if (bindings.current.get(key) === run) bindings.current.delete(key);
        };
      },
    }),
    [orientation]
  );

  return (
    <ToolbarContext.Provider value={context}>
      <TooltipSideContext.Provider value={tooltipSide ?? (orientation === 'vertical' ? 'right' : 'bottom')}>
        <Tooltip.Provider delay={500} closeDelay={0}>
          <BaseToolbar.Root
            data-slot="toolbar"
            orientation={orientation}
            className={slots.root({ className })}
            {...props}
          >
            {children}
          </BaseToolbar.Root>
        </Tooltip.Provider>
      </TooltipSideContext.Provider>
    </ToolbarContext.Provider>
  );
}
ToolbarRoot.displayName = 'Toolbar';

interface GroupContextValue {
  choose(value: string): void;
}

const GroupContext = createContext<GroupContextValue | null>(null);

export interface ToolbarGroupProps
  extends Omit<ComponentProps<'div'>, 'defaultValue' | 'onChange' | 'dir'> {
  /** The chosen tool's `value`, when the caller holds it. */
  value?: string;
  /** The tool chosen at first, when the caller does not hold it. */
  defaultValue?: string;
  /** Called with the `value` of the tool that was chosen. */
  onValueChange?: (value: string) => void;
  /** Turns every tool in the group off. */
  disabled?: boolean;
}

/**
 * Tools of which exactly one is on: the select tool, the pen, the shape.
 * Choosing the one already on leaves it on.
 */
function ToolbarGroup({
  value: valueProp,
  defaultValue,
  onValueChange,
  disabled,
  className,
  children,
  ...props
}: ToolbarGroupProps) {
  const { orientation } = useToolbar('Toolbar.Group');
  const slots = toolbarVariants();
  const [inner, setInner] = useState(defaultValue ?? '');
  const value = valueProp ?? inner;
  const live = useRef({ onValueChange, controlled: valueProp !== undefined });
  live.current = { onValueChange, controlled: valueProp !== undefined };

  const choose = useCallback((next: string) => {
    if (!live.current.controlled) setInner(next);
    live.current.onValueChange?.(next);
  }, []);

  // The marker follows the chosen tool, measured where it sits in the group.
  const group = useRef<HTMLDivElement>(null);
  const marker = useRef<HTMLSpanElement>(null);
  useIsomorphicLayoutEffect(() => {
    const box = group.current;
    const mark = marker.current;
    if (!box || !mark) return;
    const place = () => {
      const tool = box.querySelector<HTMLElement>(':scope > [data-pressed], :scope > * > [data-pressed]');
      if (!tool) {
        mark.removeAttribute('data-ready');
        return;
      }
      mark.style.setProperty('--marker-x', `${tool.offsetLeft}px`);
      mark.style.setProperty('--marker-y', `${tool.offsetTop}px`);
      mark.style.setProperty('--marker-w', `${tool.offsetWidth}px`);
      mark.style.setProperty('--marker-h', `${tool.offsetHeight}px`);
      // Shown only once placed, so it never slides in from the corner.
      requestAnimationFrame(() => mark.setAttribute('data-ready', ''));
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(box);
    return () => observer.disconnect();
  }, [value]);

  return (
    <GroupContext.Provider value={useMemo(() => ({ choose }), [choose])}>
      <ToggleGroup
        ref={group}
        data-slot="toolbar-group"
        value={value ? [value] : []}
        onValueChange={(next) => {
          // A tool cannot be switched off by choosing it again.
          const picked = next.find((each) => each !== value) ?? next[0];
          if (picked && picked !== value) choose(picked);
        }}
        orientation={orientation}
        disabled={disabled}
        className={slots.group({ className })}
        {...props}
      >
        <span ref={marker} aria-hidden data-slot="toolbar-marker" className={slots.marker()} />
        {children}
      </ToggleGroup>
    </GroupContext.Provider>
  );
}
ToolbarGroup.displayName = 'Toolbar.Group';

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/** Wraps a button in its tooltip, when it has something to say. */
function WithTooltip({ label, shortcut, trigger }: { label?: string; shortcut?: string; trigger: ReactElement }) {
  const side = useContext(TooltipSideContext);
  const slots = toolbarVariants();
  if (!label) return trigger;
  return (
    <Tooltip.Root>
      <Tooltip.Trigger render={trigger} />
      <Tooltip.Portal>
        <Tooltip.Positioner side={side} sideOffset={10} className="z-50">
          <Tooltip.Popup data-slot="toolbar-tooltip" className={slots.tooltip()}>
            {label}
            {shortcut ? <kbd className={slots.kbd()}>{shortcut}</kbd> : null}
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

/** Answers the toolbar's single-key shortcut, when there is one. */
function useShortcut(shortcut: string | undefined, run: () => void) {
  const { bind } = useToolbar('A toolbar item');
  const latest = useRef(run);
  latest.current = run;
  useEffect(() => {
    const key = shortcut ? plainKey(shortcut) : null;
    if (!key) return;
    return bind(key, () => latest.current());
  }, [shortcut, bind]);
}

export interface ToolbarToolProps extends Omit<ComponentProps<'button'>, 'value' | 'children'> {
  /** Names the tool in its group's `value`. */
  value: string;
  /** What the tool is called: its tooltip, and what a screen reader reads. */
  label?: string;
  /** The key that chooses it, shown in the tooltip, such as `V`. */
  shortcut?: string;
  /** Usually an icon, and a `Toolbar.Caret` when it has options. */
  children?: ReactNode;
}

/** One tool in a `Toolbar.Group`. Choosing it moves the marker onto it. */
function ToolbarTool({ value, label, shortcut, className, children, disabled, ...props }: ToolbarToolProps) {
  const group = useContext(GroupContext);
  if (!group) throw new Error('Toolbar.Tool must be used inside a <Toolbar.Group>.');
  const slots = toolbarVariants();
  useShortcut(disabled ? undefined : shortcut, () => group.choose(value));
  return (
    <WithTooltip
      label={label}
      shortcut={shortcut}
      trigger={
        <BaseToolbar.Button
          data-slot="toolbar-tool"
          aria-label={label}
          disabled={disabled}
          className={slots.item({ className: [slots.tool(), className] })}
          render={<Toggle value={value} />}
          {...props}
        >
          {children}
        </BaseToolbar.Button>
      }
    />
  );
}
ToolbarTool.displayName = 'Toolbar.Tool';

export interface ToolbarButtonProps extends Omit<ComponentProps<'button'>, 'children'> {
  /** What it does: its tooltip, and what a screen reader reads. */
  label?: string;
  /** The key or keys that press it, shown in the tooltip, such as `⌘Z`. A single key is also answered. */
  shortcut?: string;
  /**
   * Another trigger to be the button, such as a `Menu.Trigger`, so a menu
   * opens from the strip and keeps its place in the arrow-key order.
   */
  render?: ReactElement;
  /** Usually an icon. */
  children?: ReactNode;
}

/** An action on the strip: undo, zoom, export. It does not stay on. */
function ToolbarButton({ label, shortcut, render, className, children, ...props }: ToolbarButtonProps) {
  const slots = toolbarVariants();
  const self = useRef<HTMLButtonElement>(null);
  useShortcut(props.disabled ? undefined : shortcut, () => self.current?.click());
  return (
    <WithTooltip
      label={label}
      shortcut={shortcut}
      trigger={
        <BaseToolbar.Button
          ref={self}
          data-slot="toolbar-button"
          aria-label={label}
          render={render}
          className={slots.item({ className })}
          {...props}
        >
          {children}
        </BaseToolbar.Button>
      }
    />
  );
}
ToolbarButton.displayName = 'Toolbar.Button';

export interface ToolbarSeparatorProps extends Omit<BaseToolbar.Separator.Props, 'className'> {
  className?: string;
}

/** A short line between groups of tools that belong apart. */
function ToolbarSeparator({ className, ...props }: ToolbarSeparatorProps) {
  const slots = toolbarVariants();
  return <BaseToolbar.Separator data-slot="toolbar-separator" className={slots.separator({ className })} {...props} />;
}
ToolbarSeparator.displayName = 'Toolbar.Separator';

export interface ToolbarCaretProps extends ComponentProps<'span'> {}

/** A small chevron after a tool's icon, saying it opens more choices. */
function ToolbarCaret({ className, children, ...props }: ToolbarCaretProps) {
  const slots = toolbarVariants();
  return (
    <span aria-hidden data-slot="toolbar-caret" className={slots.caret({ className })} {...props}>
      {children ?? (
        <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M3.5 4.75 6 7.25l2.5-2.5" />
        </svg>
      )}
    </span>
  );
}
ToolbarCaret.displayName = 'Toolbar.Caret';

export const Toolbar = Object.assign(ToolbarRoot, {
  Group: ToolbarGroup,
  Tool: ToolbarTool,
  Button: ToolbarButton,
  Separator: ToolbarSeparator,
  Caret: ToolbarCaret,
});

export { ToolbarGroup, ToolbarTool, ToolbarButton, ToolbarSeparator, ToolbarCaret, toolbarVariants };
