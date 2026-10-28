'use client';

/**
 * Inspector — the settings panel beside an editor's canvas: a rail of
 * icons, each opening a page of titled sections.
 *
 * ```tsx
 * <Inspector defaultValue="pointer">
 *   <Inspector.Rail>
 *     <Inspector.Tab value="pointer" label="Pointer"><MousePointer2Icon /></Inspector.Tab>
 *     <Inspector.Tab value="audio" label="Audio"><Volume2Icon /></Inspector.Tab>
 *   </Inspector.Rail>
 *   <Inspector.Panel>
 *     <Inspector.Page value="pointer">
 *       <Inspector.Section>
 *         <Inspector.SectionTitle>Click sound</Inspector.SectionTitle>
 *         <Inspector.SectionAction><Switch label="Click sound" /></Inspector.SectionAction>
 *         <Inspector.SectionContent>…</Inspector.SectionContent>
 *       </Inspector.Section>
 *     </Inspector.Page>
 *   </Inspector.Panel>
 * </Inspector>
 * ```
 *
 * ## The rail stands apart
 *
 * The rail is a pill of its own beside the panel, not a strip inside it.
 * It is navigation, and the panel is the thing being navigated; drawn
 * apart, the eye knows which of the two it is looking at. A filled marker
 * slides along the rail to the chosen page, and the page arrives from the
 * direction the marker went.
 *
 * ## Sections carry their own switch
 *
 * A section's title sits on one line with its action: the switch that turns
 * the whole section on, or a Reset that puts its values back. The controls
 * under it are what that switch or reset applies to, so the relation never
 * has to be explained. A section can fold away with `collapsible`.
 */
import { Collapsible } from '@base-ui/react/collapsible';
import { ScrollArea } from '@base-ui/react/scroll-area';
import { Tabs } from '@base-ui/react/tabs';
import { Tooltip } from '@base-ui/react/tooltip';
import { createContext, useContext, type ComponentProps, type CSSProperties, type ReactNode } from 'react';
import { tv } from 'tailwind-variants';

const EASE = 'ease-[cubic-bezier(0.3,1.2,0.4,1)]';

const inspectorVariants = tv({
  slots: {
    root: 'group/inspector flex items-start gap-2 data-[orientation=vertical]:flex-row',
    rail: [
      'relative isolate flex shrink-0 flex-col items-center gap-1 rounded-[20px] bg-popover p-1.5 text-popover-foreground',
      'shadow-[0_10px_30px_-12px_rgb(0_0_0/0.3)] ring-1 ring-foreground/[0.06] dark:ring-foreground/10',
    ],
    marker: [
      'absolute -z-10 rounded-[14px] bg-primary shadow-[0_1px_2px_rgb(0_0_0/0.18),inset_0_1px_0_rgb(255_255_255/0.18)]',
      'top-(--active-tab-top) left-(--active-tab-left) h-(--active-tab-height) w-(--active-tab-width)',
      `transition-[top,height] duration-[380ms] ${EASE} motion-reduce:transition-none`,
    ],
    tab: [
      'relative z-10 inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-[14px] outline-none select-none',
      'text-muted-foreground transition-[color,background-color,scale] duration-150',
      'hover:bg-foreground/[0.06] hover:text-foreground active:scale-[0.94]',
      'data-active:bg-transparent data-active:text-primary-foreground data-active:hover:bg-transparent',
      'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
      'data-disabled:pointer-events-none data-disabled:opacity-40',
      '[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-[1.125rem]',
    ],
    railSeparator: 'my-1 h-px w-5 shrink-0 rounded-full bg-foreground/15',
    tooltip: [
      'origin-(--transform-origin) rounded-lg bg-foreground px-2 py-1 text-xs font-medium text-background shadow-md',
      'transition-[opacity,scale] duration-150 data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:opacity-0',
      'data-instant:duration-0 motion-reduce:transition-none',
    ],
    panel: [
      'relative flex w-72 min-w-0 flex-col overflow-hidden rounded-[22px] bg-popover text-popover-foreground',
      'shadow-[0_10px_30px_-12px_rgb(0_0_0/0.3)] ring-1 ring-foreground/[0.06] dark:ring-foreground/10',
    ],
    page: [
      'flex min-h-0 flex-1 flex-col outline-none',
      `transition-[opacity,translate] duration-300 ${EASE} motion-reduce:transition-none`,
      'data-starting-style:opacity-0',
      'data-[activation-direction=down]:data-starting-style:translate-y-3 data-[activation-direction=up]:data-starting-style:-translate-y-3',
      'data-ending-style:hidden',
    ],
    viewport: 'min-h-0 flex-1 overscroll-contain outline-none',
    content: 'flex flex-col gap-1 p-3.5',
    scrollbar:
      'my-3 me-1 flex w-1.5 opacity-0 transition-opacity delay-300 data-hovering:opacity-100 data-hovering:delay-0 data-scrolling:opacity-100 data-scrolling:delay-0',
    thumb: 'relative flex-1 rounded-full bg-foreground/20',
    section: 'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 py-1.5',
    sectionTitle: [
      'col-start-1 row-start-1 flex min-h-8 items-center text-left text-[13px] font-medium text-foreground',
      // A section that folds: its title is the button, with a chevron that turns.
      'data-[slot=inspector-section-trigger]:-mx-1.5 data-[slot=inspector-section-trigger]:cursor-pointer data-[slot=inspector-section-trigger]:gap-1.5 data-[slot=inspector-section-trigger]:rounded-lg data-[slot=inspector-section-trigger]:px-1.5',
      'data-[slot=inspector-section-trigger]:outline-none data-[slot=inspector-section-trigger]:hover:bg-foreground/[0.04] data-[slot=inspector-section-trigger]:focus-visible:ring-2 data-[slot=inspector-section-trigger]:focus-visible:ring-ring',
    ],
    // Right after the title: up while the section is open, down while it is folded.
    chevron: [
      'size-3.5 shrink-0 rotate-180 text-muted-foreground transition-transform duration-200',
      'in-data-panel-open:rotate-0 motion-reduce:transition-none',
    ],
    sectionAction: 'col-start-2 row-start-1 flex items-center gap-1.5',
    sectionContent: [
      'col-span-2 flex flex-col gap-2 pt-2',
      // Folding: the height follows the content, from and to nothing.
      'data-[slot=inspector-section-panel]:h-(--collapsible-panel-height) data-[slot=inspector-section-panel]:overflow-hidden',
      'data-[slot=inspector-section-panel]:transition-[height,opacity] data-[slot=inspector-section-panel]:duration-300',
      'data-[slot=inspector-section-panel]:ease-[cubic-bezier(0.3,1.2,0.4,1)]',
      'data-starting-style:h-0 data-starting-style:opacity-0 data-ending-style:h-0 data-ending-style:opacity-0 motion-reduce:transition-none',
    ],
    separator: 'my-2 h-px shrink-0 bg-foreground/[0.08]',
  },
});

const SectionContext = createContext<{ collapsible: boolean } | null>(null);

export interface InspectorProps extends Omit<Tabs.Root.Props, 'className' | 'orientation'> {
  className?: string;
}

/**
 * The rail and the panel side by side. `defaultValue`, or `value` with
 * `onValueChange`, names the page that is open.
 */
function InspectorRoot({ className, ...props }: InspectorProps) {
  const slots = inspectorVariants();
  return (
    <Tooltip.Provider delay={500} closeDelay={0}>
      <Tabs.Root data-slot="inspector" orientation="vertical" className={slots.root({ className })} {...props} />
    </Tooltip.Provider>
  );
}
InspectorRoot.displayName = 'Inspector';

export interface InspectorRailProps extends Omit<Tabs.List.Props, 'className'> {
  className?: string;
}

/** The column of page icons, in a pill of its own beside the panel. */
function InspectorRail({ className, children, ...props }: InspectorRailProps) {
  const slots = inspectorVariants();
  return (
    <Tabs.List data-slot="inspector-rail" className={slots.rail({ className })} {...props}>
      {children}
      <Tabs.Indicator data-slot="inspector-marker" className={slots.marker()} renderBeforeHydration />
    </Tabs.List>
  );
}
InspectorRail.displayName = 'Inspector.Rail';

export interface InspectorTabProps extends Omit<Tabs.Tab.Props, 'className' | 'children'> {
  /** What the page is called: the tab's tooltip and its name for a screen reader. */
  label: string;
  /** The icon. */
  children?: ReactNode;
  className?: string;
}

/** One page's icon on the rail. */
function InspectorTab({ label, className, children, ...props }: InspectorTabProps) {
  const slots = inspectorVariants();
  return (
    <Tooltip.Root>
      <Tooltip.Trigger
        render={
          <Tabs.Tab data-slot="inspector-tab" aria-label={label} className={slots.tab({ className })} {...props}>
            {children}
          </Tabs.Tab>
        }
      />
      <Tooltip.Portal>
        <Tooltip.Positioner side="left" sideOffset={10} className="z-50">
          <Tooltip.Popup className={slots.tooltip()}>{label}</Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
InspectorTab.displayName = 'Inspector.Tab';

export interface InspectorRailSeparatorProps extends ComponentProps<'span'> {}

/** A short line between groups of pages on the rail. */
function InspectorRailSeparator({ className, ...props }: InspectorRailSeparatorProps) {
  const slots = inspectorVariants();
  return <span aria-hidden data-slot="inspector-rail-separator" className={slots.railSeparator({ className })} {...props} />;
}
InspectorRailSeparator.displayName = 'Inspector.RailSeparator';

export interface InspectorPanelProps extends ComponentProps<'div'> {}

/**
 * The card the pages open in. Give it a height, such as `h-[32rem]`, and a
 * page longer than that scrolls inside it. Without pages, its children are
 * one page of sections.
 */
function InspectorPanel({ className, children, ...props }: InspectorPanelProps) {
  const slots = inspectorVariants();
  return (
    <div data-slot="inspector-panel" className={slots.panel({ className })} {...props}>
      {hasPages(children) ? children : <Scroll>{children}</Scroll>}
    </div>
  );
}
InspectorPanel.displayName = 'Inspector.Panel';

/** Whether the panel's children are pages, rather than sections written straight into it. */
function hasPages(children: ReactNode): boolean {
  const list = Array.isArray(children) ? children : [children];
  return list.some(
    (child) =>
      typeof child === 'object' &&
      child !== null &&
      'type' in child &&
      (child as { type: unknown }).type === InspectorPage
  );
}

/** The scrolling column of a page, with a thin bar that shows while it moves. */
function Scroll({ children }: { children: ReactNode }) {
  const slots = inspectorVariants();
  return (
    <ScrollArea.Root className="relative flex min-h-0 flex-1 flex-col">
      <ScrollArea.Viewport className={slots.viewport()}>
        <ScrollArea.Content className={slots.content()}>{children}</ScrollArea.Content>
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar orientation="vertical" className={slots.scrollbar()}>
        <ScrollArea.Thumb className={slots.thumb()} />
      </ScrollArea.Scrollbar>
    </ScrollArea.Root>
  );
}

export interface InspectorPageProps extends Omit<Tabs.Panel.Props, 'className'> {
  className?: string;
}

/** What one tab opens: a column of sections that scrolls inside the panel. */
function InspectorPage({ className, children, ...props }: InspectorPageProps) {
  const slots = inspectorVariants();
  return (
    <Tabs.Panel data-slot="inspector-page" className={slots.page({ className })} {...props}>
      <Scroll>{children}</Scroll>
    </Tabs.Panel>
  );
}
InspectorPage.displayName = 'Inspector.Page';

export interface InspectorSectionProps extends Omit<ComponentProps<'div'>, 'onChange'> {
  /** Fold the section away by its title. Its content then shows only while it is open. */
  collapsible?: boolean;
  /** Whether a collapsible section starts open. Default true. */
  defaultOpen?: boolean;
  /** Whether a collapsible section is open, when the caller holds it. */
  open?: boolean;
  /** Called when a collapsible section opens or closes. */
  onOpenChange?: (open: boolean) => void;
}

/** A titled group of settings: a title, an action on its line, and the controls under them. */
function InspectorSection({
  collapsible = false,
  defaultOpen = true,
  open,
  onOpenChange,
  className,
  children,
  ...props
}: InspectorSectionProps) {
  const slots = inspectorVariants();
  if (!collapsible) {
    return (
      <SectionContext.Provider value={{ collapsible: false }}>
        <div data-slot="inspector-section" className={slots.section({ className })} {...props}>
          {children}
        </div>
      </SectionContext.Provider>
    );
  }
  return (
    <SectionContext.Provider value={{ collapsible: true }}>
      <Collapsible.Root
        data-slot="inspector-section"
        defaultOpen={defaultOpen}
        open={open}
        onOpenChange={onOpenChange ? (next) => onOpenChange(next) : undefined}
        className={slots.section({ className })}
        {...(props as Omit<Collapsible.Root.Props, 'className'>)}
      >
        {children}
      </Collapsible.Root>
    </SectionContext.Provider>
  );
}
InspectorSection.displayName = 'Inspector.Section';

function useSection(part: string) {
  const section = useContext(SectionContext);
  if (!section) throw new Error(`${part} must be used inside an <Inspector.Section>.`);
  return section;
}

export interface InspectorSectionTitleProps extends ComponentProps<'h3'> {}

/** The section's name. In a collapsible section it is the button that folds it, with a chevron. */
function InspectorSectionTitle({ className, children, ...props }: InspectorSectionTitleProps) {
  const { collapsible } = useSection('Inspector.SectionTitle');
  const slots = inspectorVariants();
  if (!collapsible) {
    return (
      <h3 data-slot="inspector-section-title" className={slots.sectionTitle({ className })} {...props}>
        {children}
      </h3>
    );
  }
  return (
    <h3 className="col-start-1 row-start-1 m-0">
      <Collapsible.Trigger data-slot="inspector-section-trigger" className={slots.sectionTitle({ className: ['w-full', className] })}>
        {children}
        <svg viewBox="0 0 16 16" aria-hidden className={slots.chevron()} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="m4 10 4-4 4 4" />
        </svg>
      </Collapsible.Trigger>
    </h3>
  );
}
InspectorSectionTitle.displayName = 'Inspector.SectionTitle';

export interface InspectorSectionActionProps extends ComponentProps<'div'> {}

/** What sits at the end of the title's line: the switch for the whole section, or a Reset. */
function InspectorSectionAction({ className, ...props }: InspectorSectionActionProps) {
  useSection('Inspector.SectionAction');
  const slots = inspectorVariants();
  return <div data-slot="inspector-section-action" className={slots.sectionAction({ className })} {...props} />;
}
InspectorSectionAction.displayName = 'Inspector.SectionAction';

export interface InspectorSectionContentProps extends ComponentProps<'div'> {}

/** The controls under the title, stacked with an even gap. */
function InspectorSectionContent({ className, children, ...props }: InspectorSectionContentProps) {
  const { collapsible } = useSection('Inspector.SectionContent');
  const slots = inspectorVariants();
  if (!collapsible) {
    return (
      <div data-slot="inspector-section-content" className={slots.sectionContent({ className })} {...props}>
        {children}
      </div>
    );
  }
  return (
    <Collapsible.Panel data-slot="inspector-section-panel" className={slots.sectionContent({ className })} style={props.style as CSSProperties}>
      {children}
    </Collapsible.Panel>
  );
}
InspectorSectionContent.displayName = 'Inspector.SectionContent';

export interface InspectorSeparatorProps extends ComponentProps<'div'> {}

/** A hairline between sections that belong to different things. */
function InspectorSeparator({ className, ...props }: InspectorSeparatorProps) {
  const slots = inspectorVariants();
  return <div role="separator" data-slot="inspector-separator" className={slots.separator({ className })} {...props} />;
}
InspectorSeparator.displayName = 'Inspector.Separator';

export const Inspector = Object.assign(InspectorRoot, {
  Rail: InspectorRail,
  Tab: InspectorTab,
  RailSeparator: InspectorRailSeparator,
  Panel: InspectorPanel,
  Page: InspectorPage,
  Section: InspectorSection,
  SectionTitle: InspectorSectionTitle,
  SectionAction: InspectorSectionAction,
  SectionContent: InspectorSectionContent,
  Separator: InspectorSeparator,
});

export {
  InspectorRail,
  InspectorTab,
  InspectorRailSeparator,
  InspectorPanel,
  InspectorPage,
  InspectorSection,
  InspectorSectionTitle,
  InspectorSectionAction,
  InspectorSectionContent,
  InspectorSeparator,
  inspectorVariants,
};
