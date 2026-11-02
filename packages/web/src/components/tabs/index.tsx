'use client';

/**
 * Tabs — a few views of one thing, one at a time, chosen from a row of tabs.
 *
 * ```tsx
 * <Tabs defaultValue="overview">
 *   <Tabs.List>
 *     <Tabs.Trigger value="overview">Overview</Tabs.Trigger>
 *     <Tabs.Trigger value="activity">
 *       Activity <Tabs.Badge>12</Tabs.Badge>
 *     </Tabs.Trigger>
 *   </Tabs.List>
 *   <Tabs.Content value="overview">…</Tabs.Content>
 *   <Tabs.Content value="activity">…</Tabs.Content>
 * </Tabs>
 * ```
 *
 * ## Three weights
 *
 * `segmented` sets the tabs in a track with the chosen one raised out of it:
 * a control for switching what a panel shows. `underline` is lighter, a line
 * under the chosen tab, for the sections of a page. `pills` fills the chosen
 * tab with the primary colour, for a filter that should be seen from across
 * the screen.
 *
 * ## It moves the way the hand did
 *
 * The marker slides to the new tab. The underline stretches as it goes, its
 * leading end arriving first and the trailing end catching up, so a long jump
 * reads as one movement and not as a line teleporting. The new panel slides
 * in from the side the tab was on, so going right looks like going right.
 *
 * ## A row that does not fit scrolls
 *
 * When the tabs are wider than the space for them, the row scrolls sideways
 * and fades at the end that has more, rather than wrapping onto a second line
 * or shrinking the labels.
 */
import { Tabs as BaseTabs } from '@base-ui/react/tabs';
import { createContext, useContext, useEffect, useRef, type ComponentProps } from 'react';
import { tv } from 'tailwind-variants';
import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import type { ElementType as RenderElementType } from 'react';

/** Draws a part as another element, or composes it with a component: `render={<a href="/" />}`. */
type RenderProp<Tag extends RenderElementType> = { render?: useRender.ComponentProps<Tag>['render'] };

export type TabsVariant = 'segmented' | 'underline' | 'pills';

/** One curve for the marker and the panel, so they move as one thing. */
const EASE = 'ease-[cubic-bezier(0.3,0.7,0.1,1)]';

const tabsVariants = tv({
  slots: {
    root: 'group/tabs flex flex-col gap-4 data-[orientation=vertical]:flex-row',
    list: [
      'relative z-0 flex shrink-0 items-center',
      'data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-stretch',
      // Scrolls rather than wraps, with no bar of its own; the fade says there is more.
      'data-[orientation=horizontal]:max-w-full data-[orientation=horizontal]:overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
      'data-overflow-start:[--fade-start:3rem] data-overflow-end:[--fade-end:3rem]',
      '[mask-image:linear-gradient(to_right,transparent,#000_var(--fade-start,0px),#000_calc(100%-var(--fade-end,0px)),transparent)]',
    ],
    trigger: [
      'relative z-10 inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap text-sm font-medium outline-none select-none',
      'text-muted-foreground transition-colors duration-200 hover:text-foreground data-active:text-foreground',
      'data-disabled:pointer-events-none data-disabled:opacity-50',
      'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
      '[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-4',
      'group-data-[orientation=vertical]/tabs:justify-start',
    ],
    indicator: 'absolute -z-10',
    badge: [
      'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-medium tabular-nums',
      'bg-foreground/[0.07] text-muted-foreground transition-colors duration-200',
      'in-data-active:bg-foreground/10 in-data-active:text-foreground',
    ],
    content: [
      'min-w-0 flex-1 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      // The new panel arrives from the side its tab was on. The old one goes at once.
      `transition-[opacity,translate] duration-300 ${EASE} motion-reduce:transition-none`,
      'data-starting-style:opacity-0',
      'data-[activation-direction=right]:data-starting-style:translate-x-3 data-[activation-direction=left]:data-starting-style:-translate-x-3',
      'data-[activation-direction=down]:data-starting-style:translate-y-2 data-[activation-direction=up]:data-starting-style:-translate-y-2',
      'data-ending-style:hidden',
    ],
  },
  variants: {
    variant: {
      segmented: {
        list: 'w-fit gap-0.5 rounded-xl bg-muted p-1',
        trigger: 'h-8 rounded-lg px-3',
        indicator: [
          'top-(--active-tab-top) left-(--active-tab-left) h-(--active-tab-height) w-(--active-tab-width) rounded-lg',
          'bg-background shadow-sm ring-1 ring-foreground/[0.06] dark:bg-input dark:ring-foreground/10',
          `transition-[left,top,width,height] duration-300 ${EASE} motion-reduce:transition-none`,
        ],
      },
      underline: {
        list: [
          'gap-1 data-[orientation=horizontal]:w-full data-[orientation=horizontal]:shadow-[inset_0_-1px_0_var(--border)]',
          'data-[orientation=vertical]:shadow-[inset_-1px_0_0_var(--border)]',
        ],
        trigger: [
          'h-10 px-3',
          'group-data-[orientation=vertical]/tabs:h-9 group-data-[orientation=vertical]/tabs:pe-5',
          // The hover fill sits inside the row, clear of the line.
          "before:absolute before:inset-x-0.5 before:inset-y-1.5 before:-z-10 before:rounded-md before:transition-colors before:content-[''] hover:before:bg-muted/70",
        ],
        indicator: [
          'bg-foreground',
          // The two ends move separately: the one going first is quick and the
          // other follows, so the line stretches on the way and settles.
          'data-[orientation=horizontal]:bottom-0 data-[orientation=horizontal]:h-0.5 data-[orientation=horizontal]:rounded-t-full',
          'data-[orientation=horizontal]:left-(--active-tab-left) data-[orientation=horizontal]:right-(--active-tab-right)',
          'data-[orientation=vertical]:right-0 data-[orientation=vertical]:w-0.5 data-[orientation=vertical]:rounded-s-full',
          'data-[orientation=vertical]:top-(--active-tab-top) data-[orientation=vertical]:bottom-(--active-tab-bottom)',
          `transition-[left,right,top,bottom] ${EASE} motion-reduce:transition-none`,
          '[transition-duration:300ms]',
          'data-[activation-direction=right]:[transition-duration:420ms,200ms] data-[activation-direction=left]:[transition-duration:200ms,420ms]',
          'data-[activation-direction=down]:[transition-duration:0ms,0ms,420ms,200ms] data-[activation-direction=up]:[transition-duration:0ms,0ms,200ms,420ms]',
        ],
      },
      pills: {
        list: 'w-fit gap-1',
        trigger:
          'h-8 rounded-full px-3.5 hover:bg-muted data-active:text-primary-foreground data-active:hover:bg-transparent',
        badge: 'in-data-active:bg-primary-foreground/20 in-data-active:text-primary-foreground',
        indicator: [
          'top-(--active-tab-top) left-(--active-tab-left) h-(--active-tab-height) w-(--active-tab-width) rounded-full bg-primary',
          `transition-[left,top,width,height] duration-300 ${EASE} motion-reduce:transition-none`,
        ],
      },
    },
  },
  compoundVariants: [
    // A vertical segmented list is a column of full-width rows.
    { variant: 'segmented', className: { list: 'data-[orientation=vertical]:w-48' } },
    { variant: 'pills', className: { list: 'data-[orientation=vertical]:w-48' } },
  ],
  defaultVariants: { variant: 'segmented' },
});

export interface TabsProps extends Omit<BaseTabs.Root.Props, 'className'> {
  /** How the tabs are drawn. Default `segmented`. */
  variant?: TabsVariant;
  className?: string;
}

/**
 * Holds which tab is chosen: `defaultValue`, or `value` with `onValueChange`.
 * `orientation="vertical"` puts the tabs in a column beside the content.
 */
function TabsRoot({ variant = 'segmented', className, ...props }: TabsProps) {
  return (
    <VariantContext.Provider value={variant}>
      <BaseTabs.Root
        data-slot="tabs"
        data-variant={variant}
        className={tabsVariants({ variant }).root({ className })}
        {...props}
      />
    </VariantContext.Provider>
  );
}
TabsRoot.displayName = 'Tabs';

const VariantContext = createContext<TabsVariant>('segmented');

export interface TabsListProps extends Omit<BaseTabs.List.Props, 'className'> {
  className?: string;
}

/** The row of tabs, with the marker under the chosen one. */
function TabsList({ className, children, ...props }: TabsListProps) {
  const ref = useRef<HTMLDivElement>(null);
  const slots = tabsVariants({ variant: useContext(VariantContext) });

  // Marks the ends that have more to scroll to, for the fade.
  useEffect(() => {
    const list = ref.current;
    if (!list) return;
    const read = () => {
      const start = list.scrollLeft > 1;
      const end = list.scrollLeft + list.clientWidth < list.scrollWidth - 1;
      list.toggleAttribute('data-overflow-start', start);
      list.toggleAttribute('data-overflow-end', end);
    };
    read();
    list.addEventListener('scroll', read, { passive: true });
    const observer = new ResizeObserver(read);
    observer.observe(list);
    return () => {
      list.removeEventListener('scroll', read);
      observer.disconnect();
    };
  }, []);

  return (
    <BaseTabs.List ref={ref} data-slot="tabs-list" className={slots.list({ className })} {...props}>
      {children}
      <BaseTabs.Indicator data-slot="tabs-indicator" className={slots.indicator()} renderBeforeHydration />
    </BaseTabs.List>
  );
}
TabsList.displayName = 'Tabs.List';

export interface TabsTriggerProps extends Omit<BaseTabs.Tab.Props, 'className'> {
  className?: string;
}

/**
 * One tab. Its `value` names the `Tabs.Content` it shows. An icon and a
 * `Tabs.Badge` can sit beside its label.
 */
function TabsTrigger({ className, ...props }: TabsTriggerProps) {
  const slots = tabsVariants({ variant: useContext(VariantContext) });
  return <BaseTabs.Tab data-slot="tabs-trigger" className={slots.trigger({ className })} {...props} />;
}
TabsTrigger.displayName = 'Tabs.Trigger';

export interface TabsBadgeProps extends ComponentProps<'span'> {}

/** A count beside a tab's label: unread, open, waiting. */
function TabsBadge({ className, render, ...props }: TabsBadgeProps & RenderProp<'span'>) {
  const slots = tabsVariants({ variant: useContext(VariantContext) });
  return useRender({
    defaultTagName: 'span',
    render,
    props: mergeProps({ 'data-slot': 'tabs-badge', className: slots.badge({ className }) }, props),
  });
}
TabsBadge.displayName = 'Tabs.Badge';

export interface TabsContentProps extends Omit<BaseTabs.Panel.Props, 'className'> {
  className?: string;
}

/** What one tab shows. Only the chosen one is in the page unless `keepMounted` is set. */
function TabsContent({ className, ...props }: TabsContentProps) {
  return <BaseTabs.Panel data-slot="tabs-content" className={tabsVariants().content({ className })} {...props} />;
}
TabsContent.displayName = 'Tabs.Content';

export const Tabs = Object.assign(TabsRoot, {
  List: TabsList,
  Trigger: TabsTrigger,
  Badge: TabsBadge,
  Content: TabsContent,
});

export { TabsList, TabsTrigger, TabsBadge, TabsContent };
