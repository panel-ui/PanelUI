'use client';

/**
 * Prompt — where a message to an assistant is written, with what goes with
 * it: files, a model, tools, and a button that sends it.
 *
 * ```tsx
 * <Prompt onSubmit={({ text, files }) => send(text, files)} status={status} onStop={stop}>
 *   <Prompt.Field>
 *     <Prompt.Attachments />
 *     <Prompt.Textarea placeholder="Ask anything" />
 *     <Prompt.Footer>
 *       <Prompt.Tools>
 *         <Prompt.Menu>
 *           <Prompt.AttachItem />
 *         </Prompt.Menu>
 *         <Prompt.Model items={models} defaultValue="swift" />
 *       </Prompt.Tools>
 *       <Prompt.Submit />
 *     </Prompt.Footer>
 *   </Prompt.Field>
 *   <Prompt.Status>Reading the files</Prompt.Status>
 * </Prompt>
 * ```
 *
 * ## A field in a tray
 *
 * The field is a raised card. What is said about it, rather than in it, sits
 * in bands that the card overlaps: `Prompt.Banner` above for something to do
 * first, `Prompt.Status` below for what the answer is doing, and
 * `Prompt.Context` below, inset, for where the message is going. A band opens
 * and closes with its `open` prop, folding under the card, so a band can come
 * and go without the page jumping by more than its own height.
 *
 * ## Modes
 *
 * A prompt that changes with what the app is doing names its states with
 * `mode`, and each band says which of them it belongs to with its own
 * `mode`. The bands that match open and the others fold, in one movement,
 * so the card moves once, by the difference between them. A band's own
 * `open` still wins over its mode.
 *
 * ## Sending
 *
 * Enter sends and Shift+Enter starts a new line; Enter while a character is
 * still being composed is left to the input method. `onSubmit` is handed the
 * text, trimmed, and the files, and the field is cleared. Nothing is sent
 * while it is empty or while `status` is `submitted` or `streaming`.
 *
 * ## One button, four jobs
 *
 * `Prompt.Submit` sends. While the answer is on its way it stops it instead,
 * calling `onStop`, with a ring turning round it. Given `onVoice`, it is a
 * voice button while the field is empty, and its bars move while `listening`.
 * The icons cross-fade in place, so the button never moves under the pointer.
 *
 * ## Files
 *
 * Files arrive from `Prompt.AttachItem` in the menu or `Prompt.Attach`, from
 * ⌘U or Ctrl+U in the field, from a paste, or dropped on the field.
 * `accept` and `maxFiles` decide which are taken, and `onReject` is told about
 * the rest. Images are shown as thumbnails, anything else as a chip with its
 * name and size.
 */
import {
  Children,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type ComponentProps,
  type DragEvent,
  type FormEvent,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from 'react';
import { tv } from 'tailwind-variants';
import { Button, type ButtonProps } from '../button';
import { Menu, type MenuContentProps, type MenuItemProps } from '../menu';
import { Select } from '../select';
import { Textarea, type TextareaProps } from '../textarea';
import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import type * as ReactTypes from 'react';
import type { ElementType as RenderElementType } from 'react';

/** Draws a part as another element, or composes it with a component: `render={<a href="/" />}`. */
type RenderProp<Tag extends RenderElementType> = { render?: useRender.ComponentProps<Tag>['render'] };

const promptVariants = tv({
  slots: {
    root: 'isolate flex w-full flex-col',
    /*
     * A band is a grid row that goes from no height to its own, so its
     * opening can be animated without measuring it. The negative margin that
     * tucks it under the card moves with it, or the card would be pulled
     * over nothing while the band is shut.
     */
    band: 'grid transition-[grid-template-rows,margin] duration-300 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none',
    bandClip: 'min-h-0 overflow-hidden',
    bandInner:
      'flex items-center gap-2.5 bg-muted px-4 text-sm text-muted-foreground transition-opacity duration-300 motion-reduce:transition-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-4',
    bannerAction: 'ms-auto h-7 px-3 text-xs',
    // The card. It sits over the bands, so its rounded corners show the tray behind them.
    field: [
      'relative z-10 flex flex-col rounded-[1.375rem] border bg-card text-card-foreground shadow-sm',
      'transition-[border-color,box-shadow] duration-200',
      'focus-within:border-ring/70 has-[textarea:focus-visible]:shadow-md',
      'data-dragging:border-primary data-dragging:ring-4 data-dragging:ring-primary/10',
      'data-[status=error]:border-destructive/60',
      // One line: the parts sit in a row, and the text takes the room between them.
      'data-[layout=inline]:flex-row data-[layout=inline]:flex-wrap data-[layout=inline]:items-end data-[layout=inline]:gap-1.5 data-[layout=inline]:rounded-[1.75rem] data-[layout=inline]:p-2',
    ],
    textarea:
      'px-4 pb-1 pt-3.5 text-[0.9375rem] leading-6 in-data-[layout=inline]:min-w-0 in-data-[layout=inline]:flex-1 in-data-[layout=inline]:basis-40 in-data-[layout=inline]:px-1.5 in-data-[layout=inline]:py-2',
    attachments:
      'flex flex-wrap gap-2 px-3 pt-3 in-data-[layout=inline]:basis-full in-data-[layout=inline]:px-1 in-data-[layout=inline]:pb-1 in-data-[layout=inline]:pt-1',
    attachment: [
      'group/attachment relative flex items-center gap-2 rounded-xl border bg-background text-xs',
      'transition-[opacity,scale] duration-200 ease-out starting:scale-90 starting:opacity-0 motion-reduce:transition-none',
    ],
    // Not clipped, so the remove button can sit over the corner; the picture rounds itself.
    attachmentImage: 'size-14 p-0',
    attachmentFile: 'h-14 max-w-56 py-2 pe-8 ps-2',
    attachmentGlyph:
      'flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground [&_svg]:size-4',
    attachmentName: 'block truncate font-medium text-foreground',
    attachmentMeta: 'block truncate text-muted-foreground',
    attachmentRemove: [
      'absolute -end-1.5 -top-1.5 flex size-5 cursor-pointer items-center justify-center rounded-full border bg-background text-muted-foreground shadow-xs outline-none',
      'opacity-0 transition-opacity group-hover/attachment:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100',
      'hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-3',
    ],
    // Bottom-aligned: when the tools wrap, the submit button stays on their last row.
    footer: 'flex items-end justify-between gap-2 p-2.5 pt-1.5',
    // The padding makes a row of tools as tall as the submit button, so a single row lines up with it.
    tools: 'flex min-w-0 flex-wrap items-center gap-1.5 py-0.5',
    // Switched on, a tool is drawn in the theme's info colour, so it reads as on at a glance.
    tool: [
      'aria-pressed:border-[color-mix(in_oklab,var(--info)_40%,transparent)] aria-pressed:bg-[color-mix(in_oklab,var(--info)_12%,transparent)] aria-pressed:text-[var(--info)]',
      'aria-pressed:hover:not-disabled:bg-[color-mix(in_oklab,var(--info)_18%,transparent)] aria-pressed:hover:not-disabled:text-[var(--info)]',
    ],
    // The plus turns to a cross while its menu is open.
    menuTrigger:
      'data-popup-open:bg-accent [&_svg]:transition-transform [&_svg]:duration-200 data-popup-open:[&_svg]:rotate-45 motion-reduce:[&_svg]:transition-none',
    modelValue: 'flex min-w-0 items-center gap-2 [&_svg]:size-4',
    submit: ['relative size-10 shrink-0 overflow-visible rounded-full p-0', 'disabled:opacity-40'],
    submitIcon:
      'absolute inset-0 m-auto flex items-center justify-center transition-[opacity,scale,rotate] duration-200 ease-out motion-reduce:transition-none [&_svg]:size-[18px]',
    submitRing:
      'pointer-events-none absolute -inset-[3px] size-[calc(100%+6px)] text-primary transition-opacity duration-200',
    statusText:
      'min-w-0 truncate bg-[linear-gradient(90deg,var(--muted-foreground)_35%,var(--foreground)_50%,var(--muted-foreground)_65%)] bg-[length:250%_100%] bg-clip-text text-transparent',
    statusSpinner: 'ms-auto size-4 animate-spin text-muted-foreground motion-reduce:animate-none',
    // The strip folds like a band: its tuck under the card moves with it.
    contextFold:
      'mx-4 grid transition-[grid-template-rows,margin,opacity] duration-300 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none',
    context: [
      'relative flex items-center gap-x-4 gap-y-1 rounded-b-[1rem] border bg-muted px-3.5 pb-2 pt-6.5 text-xs text-muted-foreground',
      'flex-wrap [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-3.5',
    ],
    contextItem: 'inline-flex min-w-0 items-center gap-1.5 whitespace-nowrap',
    contextButton:
      'cursor-pointer rounded-md outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring',
    tasksHeader:
      'flex h-9 w-full cursor-pointer items-center gap-2.5 px-4 text-start outline-none transition-colors hover:text-foreground focus-visible:text-foreground',
    tasksTitle: 'min-w-0 truncate font-medium text-foreground',
    tasksCount: 'shrink-0 tabular-nums',
    tasksChevron: 'ms-auto transition-transform duration-200 motion-reduce:transition-none',
    tasksBody:
      'grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none',
    tasksList: [
      'relative flex flex-col overflow-y-auto overscroll-contain px-2 py-1 [scrollbar-color:var(--border)_transparent] [scrollbar-width:thin]',
      // Rows fade out at the edges they scroll past, instead of being cut by them.
      '[mask-image:linear-gradient(to_bottom,transparent,black_0.75rem,black_calc(100%-0.75rem),transparent)]',
    ],
    task: 'flex items-start gap-2.5 rounded-lg px-2 py-1 text-sm',
    taskMark: 'mt-0.5 flex size-4 shrink-0 items-center justify-center',
    // Pops in as the task finishes.
    taskDone:
      'size-4 transition-[scale,opacity] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] starting:scale-50 starting:opacity-0 motion-reduce:transition-none',
    taskPending: 'size-3.5 rounded-full border-[1.5px] border-dashed border-muted-foreground/50',
    taskError:
      'flex size-4 items-center justify-center rounded-full bg-destructive text-[0.625rem] font-bold leading-none text-white',
    commandsLabel: 'px-4 pb-1 pt-2.5 text-xs font-medium',
    commandsList:
      'flex flex-col overflow-y-auto overscroll-contain px-2 pb-1 [scrollbar-color:var(--border)_transparent] [scrollbar-width:thin]',
    command:
      'flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-foreground aria-selected:bg-card aria-selected:shadow-xs [&_svg]:text-muted-foreground',
    commandName: 'shrink-0 font-medium',
    commandDescription: 'min-w-0 truncate text-muted-foreground',
    recorder: 'flex flex-col',
    recorderTranscript: 'min-h-[3.25rem] px-4 pb-1 pt-3.5 text-[0.9375rem] leading-6 text-foreground',
    recorderListening:
      'bg-[linear-gradient(90deg,var(--muted-foreground)_35%,var(--foreground)_50%,var(--muted-foreground)_65%)] bg-[length:250%_100%] bg-clip-text text-transparent',
    recorderControls: 'flex items-center gap-1.5 p-2.5 pt-1.5',
    // Older sound fades out to the left as it scrolls away.
    recorderWave:
      'flex h-10 min-w-0 flex-1 items-center justify-end gap-[2px] overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_18%)]',
    recorderBar:
      'w-[3px] shrink-0 rounded-full bg-foreground transition-[height] duration-75 ease-out motion-reduce:transition-none',
    recorderTime: 'flex shrink-0 items-center gap-1.5 ps-1.5 text-xs font-medium tabular-nums text-muted-foreground',
    recorderDot: 'size-2 animate-pulse rounded-full bg-destructive motion-reduce:animate-none',
    recorderDone: 'size-10 p-0 [&_svg]:size-[18px]',
    hint: 'px-4 pt-2 text-xs text-muted-foreground [&_kbd]:rounded-[0.3rem] [&_kbd]:border [&_kbd]:bg-muted [&_kbd]:px-1 [&_kbd]:py-px [&_kbd]:font-sans [&_kbd]:text-[0.6875rem] [&_kbd]:text-foreground',
  },
  variants: {
    /** Where a band sits against the card. */
    edge: {
      top: {
        bandInner: 'rounded-t-[1.375rem] pb-[calc(0.625rem+1.5rem)] pt-2.5',
      },
      bottom: {
        bandInner: 'rounded-b-[1.375rem] pb-2.5 pt-[calc(0.625rem+1.5rem)]',
      },
    },
    open: { true: { bandInner: 'opacity-100' }, false: { bandInner: 'opacity-0' } },
  },
  compoundVariants: [
    { edge: 'top', open: true, className: { band: 'mb-[-1.5rem] grid-rows-[1fr]' } },
    { edge: 'top', open: false, className: { band: 'mb-0 grid-rows-[0fr]' } },
    { edge: 'bottom', open: true, className: { band: 'mt-[-1.5rem] grid-rows-[1fr]' } },
    { edge: 'bottom', open: false, className: { band: 'mt-0 grid-rows-[0fr]' } },
  ],
});

export type PromptState = 'idle' | 'submitted' | 'streaming' | 'error';

export interface PromptMessage {
  /** What was written, trimmed. */
  text: string;
  /** The files that were attached, in the order they were added. */
  files: File[];
}

export interface PromptAttachment {
  id: string;
  file: File;
  /** An object URL for an image, to show it by. */
  preview?: string;
}

export type PromptRejectReason = 'accept' | 'max-files';

interface PromptContextValue {
  value: string;
  setValue(value: string): void;
  attachments: PromptAttachment[];
  addFiles(files: Iterable<File>): void;
  removeAttachment(id: string): void;
  openFileDialog(): void;
  status: PromptState;
  /** The state the developer has put the prompt in, which bands open by. */
  mode?: string;
  busy: boolean;
  disabled: boolean;
  empty: boolean;
  submit(): void;
  stop(): void;
  hasStop: boolean;
  dragging: boolean;
  setDragging(dragging: boolean): void;
  fieldId: string;
  /** The field's card, for a menu that spans it. */
  fieldRef: RefObject<HTMLDivElement | null>;
  /** A part that wants the field's keys first, such as the command list. Returns true when it used the key. */
  keyHandler: { current: ((event: KeyboardEvent<HTMLTextAreaElement>) => boolean) | null };
  /** What the field should point a screen reader at while the command list is open. */
  listbox: { id: string; active?: string } | null;
  setListbox(listbox: { id: string; active?: string } | null): void;
}

const PromptStore = createContext<PromptContextValue | null>(null);

function usePrompt(part: string): PromptContextValue {
  const prompt = useContext(PromptStore);
  if (!prompt) throw new Error(`${part} must be used inside a <Prompt>.`);
  return prompt;
}

/** Whether a file is one `accept` allows: a MIME type, a `type/*` family or an extension. */
function accepts(file: File, accept: string | undefined) {
  if (!accept) return true;
  const name = file.name.toLowerCase();
  return accept
    .split(',')
    .map((rule) => rule.trim().toLowerCase())
    .filter(Boolean)
    .some((rule) => {
      if (rule.startsWith('.')) return name.endsWith(rule);
      if (rule.endsWith('/*')) return file.type.startsWith(rule.slice(0, -1));
      return file.type === rule;
    });
}

function attach(file: File): PromptAttachment {
  return {
    id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 8)}`,
    file,
    preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
  };
}

export interface PromptProps extends Omit<ComponentProps<'form'>, 'onSubmit' | 'defaultValue'> {
  /** What is written in the field, when the caller holds it. */
  value?: string;
  /** What the field starts with, when the caller does not hold it. */
  defaultValue?: string;
  /** Called with what is written, each time it changes, and with `''` when it is sent. */
  onValueChange?: (value: string) => void;
  /** Called with the text and the files when the message is sent. */
  onSubmit?: (message: PromptMessage) => void;
  /**
   * Where the answer is. `submitted` and `streaming` stop the field being
   * sent and turn the submit button into a stop button; `error` marks the
   * field. Default `idle`.
   */
  status?: PromptState;
  /** Called when the stop button is pressed. Without it, the button cannot be pressed while busy. */
  onStop?: () => void;
  /** Turns the whole prompt off. */
  disabled?: boolean;
  /** Files attached to begin with, such as those of a message being edited and sent again. */
  defaultFiles?: File[];
  /** Which files can be attached, as for `<input type="file">`: `image/*,.pdf`. Default any. */
  accept?: string;
  /** How many files can be attached at once. Default no limit. */
  maxFiles?: number;
  /** Called with the files that were not taken, and why. */
  onReject?: (files: File[], reason: PromptRejectReason) => void;
  /**
   * The state the prompt is in, named by you: `"connect"`, `"tasks"`,
   * `"writing"`. Each band given a `mode` of its own opens while this
   * matches it and folds away otherwise.
   */
  mode?: string;
}

function PromptRoot({
  value: controlledValue,
  defaultValue = '',
  onValueChange,
  onSubmit,
  status = 'idle',
  onStop,
  disabled = false,
  defaultFiles,
  accept,
  maxFiles,
  onReject,
  mode,
  className,
  children,
  ...props
}: PromptProps) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const value = controlledValue ?? internalValue;
  const [attachments, setAttachments] = useState<PromptAttachment[]>(() => (defaultFiles ?? []).map(attach));
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const keyHandler = useRef<PromptContextValue['keyHandler']['current']>(null);
  const [listbox, setListbox] = useState<PromptContextValue['listbox']>(null);
  const fieldId = useId();
  const busy = status === 'submitted' || status === 'streaming';
  const empty = value.trim() === '' && attachments.length === 0;

  const setValue = useCallback(
    (next: string) => {
      if (controlledValue === undefined) setInternalValue(next);
      onValueChange?.(next);
    },
    [controlledValue, onValueChange]
  );

  // Kept in a ref as well, for the cleanup on unmount, which sees only the
  // first render's state otherwise.
  const live = useRef(attachments);
  live.current = attachments;
  useEffect(
    () => () => {
      for (const attachment of live.current) if (attachment.preview) URL.revokeObjectURL(attachment.preview);
    },
    []
  );

  const addFiles = useCallback(
    (incoming: Iterable<File>) => {
      const list = [...incoming];
      const refused = list.filter((file) => !accepts(file, accept));
      const taken = list.filter((file) => accepts(file, accept));
      if (refused.length > 0) onReject?.(refused, 'accept');
      const room = maxFiles === undefined ? taken.length : Math.max(0, maxFiles - live.current.length);
      if (taken.length > room) onReject?.(taken.slice(room), 'max-files');
      const added = taken.slice(0, room).map(attach);
      if (added.length > 0) setAttachments((current) => [...current, ...added]);
    },
    [accept, maxFiles, onReject]
  );

  const removeAttachment = useCallback((id: string) => {
    setAttachments((current) => {
      const gone = current.find((attachment) => attachment.id === id);
      if (gone?.preview) URL.revokeObjectURL(gone.preview);
      return current.filter((attachment) => attachment.id !== id);
    });
  }, []);

  const openFileDialog = useCallback(() => fileInput.current?.click(), []);

  const submit = useCallback(() => {
    if (busy || disabled || empty) return;
    onSubmit?.({ text: value.trim(), files: attachments.map((attachment) => attachment.file) });
    setValue('');
    // The previews are not revoked here: the caller may still be showing the files.
    setAttachments([]);
  }, [busy, disabled, empty, onSubmit, value, attachments, setValue]);

  const stop = useCallback(() => onStop?.(), [onStop]);

  const context = useMemo<PromptContextValue>(
    () => ({
      value,
      setValue,
      attachments,
      addFiles,
      removeAttachment,
      openFileDialog,
      status,
      mode,
      busy,
      disabled,
      empty,
      submit,
      stop,
      hasStop: onStop !== undefined,
      dragging,
      setDragging,
      fieldId,
      fieldRef,
      keyHandler,
      listbox,
      setListbox,
    }),
    [
      value,
      setValue,
      attachments,
      addFiles,
      removeAttachment,
      openFileDialog,
      status,
      mode,
      busy,
      disabled,
      empty,
      submit,
      stop,
      onStop,
      dragging,
      fieldId,
      listbox,
    ]
  );

  const send = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submit();
  };

  return (
    <PromptStore.Provider value={context}>
      <form
        data-slot="prompt"
        data-status={status}
        data-mode={mode}
        aria-busy={busy || undefined}
        className={promptVariants().root({ className })}
        onSubmit={send}
        {...props}
      >
        {children}
        <input
          ref={fileInput}
          type="file"
          multiple={maxFiles !== 1}
          accept={accept}
          tabIndex={-1}
          aria-hidden="true"
          className="hidden"
          onChange={(event) => {
            if (event.target.files) addFiles(event.target.files);
            // Cleared, so choosing the same file again still counts as a change.
            event.target.value = '';
          }}
        />
      </form>
    </PromptStore.Provider>
  );
}
PromptRoot.displayName = 'Prompt';

/* ------------------------------------------------------------------ bands */

function Band({
  edge,
  open,
  slot,
  className,
  children,
  ...props
}: ComponentProps<'div'> & { edge: 'top' | 'bottom'; open: boolean; slot: string }) {
  const slots = promptVariants({ edge, open });
  const clip = useRef<HTMLDivElement>(null);
  // Nothing in a shut band can be reached. Set on the element: how React
  // writes a boolean `inert` differs between versions.
  useEffect(() => {
    clip.current?.toggleAttribute('inert', !open);
  }, [open]);
  return (
    <div data-slot={slot} data-open={open ? '' : undefined} className={slots.band()}>
      <div ref={clip} className={slots.bandClip()}>
        <div className={slots.bandInner({ className })} {...props}>
          {children}
        </div>
      </div>
    </div>
  );
}

/** A band's `mode`: the prompt mode, or modes, it is open in. */
export type PromptBandMode = string | string[];

/**
 * Whether a band is open: its own `open` if given, else whether the
 * prompt's mode is one of the band's, else what the band does by default.
 */
function useBandOpen(
  part: string,
  open: boolean | undefined,
  mode: PromptBandMode | undefined,
  fallback: (prompt: PromptContextValue) => boolean
) {
  const prompt = usePrompt(part);
  if (open !== undefined) return open;
  if (mode !== undefined)
    return prompt.mode !== undefined && (Array.isArray(mode) ? mode : [mode]).includes(prompt.mode);
  return fallback(prompt);
}

export interface PromptBannerProps extends ComponentProps<'div'> {
  /** Whether it is shown. It folds under the field when it is not. Default: shown, or with `mode`, while the prompt is in that mode. */
  open?: boolean;
  /** The prompt modes it is shown in. It folds away in any other. */
  mode?: PromptBandMode;
}

/** A band above the field, for something to do before or while writing: connect an account, pick a project. */
function PromptBanner({ open, mode, ...props }: PromptBannerProps) {
  const shown = useBandOpen('Prompt.Banner', open, mode, () => true);
  return <Band edge="top" open={shown} slot="prompt-banner" {...props} />;
}
PromptBanner.displayName = 'Prompt.Banner';

export interface PromptBannerActionProps extends ButtonProps {}

/** The banner's button, at its end. */
function PromptBannerAction({ className, size = 'sm', shape = 'pill', ...props }: PromptBannerActionProps) {
  return (
    <Button
      data-slot="prompt-banner-action"
      size={size}
      shape={shape}
      className={promptVariants().bannerAction({ className })}
      {...props}
    />
  );
}
PromptBannerAction.displayName = 'Prompt.BannerAction';

/** Runs a background sweep across the text, unless motion is reduced. */
function useShimmer(active: boolean) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node || !active || typeof node.animate !== 'function') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const animation = node.animate([{ backgroundPosition: '125% 0' }, { backgroundPosition: '-25% 0' }], {
      duration: 1800,
      iterations: Infinity,
      easing: 'linear',
    });
    return () => animation.cancel();
  }, [active]);
  return ref;
}

export interface PromptStatusProps extends ComponentProps<'div'> {
  /** Whether it is shown. Default: while `status` is `submitted` or `streaming`, or with `mode`, while the prompt is in that mode. */
  open?: boolean;
  /** The prompt modes it is shown in. It folds away in any other. */
  mode?: PromptBandMode;
  /** Something before the words: the model's mark, a tool's icon. */
  icon?: ReactNode;
  /** Whether a spinner turns at its end. Default `true`. */
  spinner?: boolean;
}

/** A band under the field saying what the answer is doing, with the words lit by a moving sweep. */
function PromptStatus({ open, mode, icon, spinner = true, children, ...props }: PromptStatusProps) {
  const shown = useBandOpen('Prompt.Status', open, mode, (prompt) => prompt.busy);
  const slots = promptVariants();
  const text = useShimmer(shown);
  return (
    <Band edge="bottom" open={shown} slot="prompt-status" role="status" {...props}>
      {icon}
      <span ref={text} className={slots.statusText()}>
        {children}
      </span>
      {spinner ? (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          className={slots.statusSpinner()}
        >
          <path d="M21 12a9 9 0 1 1-6.22-8.56" />
        </svg>
      ) : null}
    </Band>
  );
}
PromptStatus.displayName = 'Prompt.Status';

export interface PromptContextProps extends ComponentProps<'div'> {
  /** Whether it is shown. It folds under the field when it is not. Default: shown, or with `mode`, while the prompt is in that mode. */
  open?: boolean;
  /** The prompt modes it is shown in. It folds away in any other. */
  mode?: PromptBandMode;
}

/** A strip under the field, inset from its edges, for where the message is going: a branch, a folder, a ticket. */
function PromptContext({ open, mode, className, render, ...props }: PromptContextProps & RenderProp<'div'>) {
  const shown = useBandOpen('Prompt.Context', open, mode, () => true);
  const slots = promptVariants();
  const clip = useRef<HTMLDivElement>(null);
  useEffect(() => {
    clip.current?.toggleAttribute('inert', !shown);
  }, [shown]);
  const element = useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps({ className: slots.context({ className }) }, props),
  });
  return (
    <div
      data-slot="prompt-context"
      data-open={shown ? '' : undefined}
      className={slots.contextFold({
        className: shown ? '-mt-5 grid-rows-[1fr] opacity-100' : 'mt-0 grid-rows-[0fr] opacity-0',
      })}
    >
      <div ref={clip} className="min-h-0 overflow-hidden">
        {element}
      </div>
    </div>
  );
}
PromptContext.displayName = 'Prompt.Context';

export interface PromptContextItemProps extends ComponentProps<'span'> {
  /** Called when it is pressed. Passing this makes the item a button. */
  onSelect?: () => void;
}

/** One fact in the context strip, with an icon before it. */
function PromptContextItem({
  onSelect,
  className,
  children,
  render,
  ...props
}: PromptContextItemProps & RenderProp<'span'>) {
  const slots = promptVariants();
  if (onSelect) {
    return (
      <button
        type="button"
        data-slot="prompt-context-item"
        onClick={onSelect}
        className={slots.contextItem({ className: [slots.contextButton(), className] })}
      >
        {children}
      </button>
    );
  }
  return useRender({
    defaultTagName: 'span',
    render,
    props: mergeProps(
      { 'data-slot': 'prompt-context-item', className: slots.contextItem({ className }), children: <>{children}</> },
      props
    ),
  });
}
PromptContextItem.displayName = 'Prompt.ContextItem';

export interface PromptHintProps extends ComponentProps<'p'> {}

/** A quiet line under the prompt. Keys written in `<kbd>` are drawn as keys. */
function PromptHint({ className, children, render, ...props }: PromptHintProps & RenderProp<'p'>) {
  return useRender({
    defaultTagName: 'p',
    render,
    props: mergeProps(
      {
        'data-slot': 'prompt-hint',
        className: promptVariants().hint({ className }),
        children: (
          <>
            {children ?? (
              <>
                <kbd>Shift</kbd> + <kbd>Enter</kbd> for a new line
              </>
            )}
          </>
        ),
      },
      props
    ),
  });
}
PromptHint.displayName = 'Prompt.Hint';

/* ------------------------------------------------------------------ field */

export interface PromptFieldProps extends ComponentProps<'div'> {
  /**
   * `stacked` puts the text above a footer. `inline` puts every part in one
   * row, the text between them, for a one-line composer; the row wraps as
   * the text grows. Default `stacked`.
   */
  layout?: 'stacked' | 'inline';
}

/** The card that holds the text, the files and the footer. Files can be dropped on it. */
function PromptField({
  layout = 'stacked',
  className,
  onDragOver,
  onDragLeave,
  onDrop,
  render,
  ...props
}: PromptFieldProps & RenderProp<'div'>) {
  const prompt = usePrompt('Prompt.Field');
  const hasFiles = (event: DragEvent) => [...event.dataTransfer.types].includes('Files');
  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        ref: prompt.fieldRef,
        'data-slot': 'prompt-field',
        'data-layout': layout,
        'data-status': prompt.status,
        'data-dragging': prompt.dragging ? '' : undefined,
        className: promptVariants().field({ className }),
        onDragOver: (event: ReactTypes.DragEvent<HTMLDivElement>) => {
          onDragOver?.(event);
          if (prompt.disabled || !hasFiles(event)) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = 'copy';
          if (!prompt.dragging) prompt.setDragging(true);
        },
        onDragLeave: (event: ReactTypes.DragEvent<HTMLDivElement>) => {
          onDragLeave?.(event);
          // Leaving for a child of the field is not leaving the field.
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) prompt.setDragging(false);
        },
        onDrop: (event: ReactTypes.DragEvent<HTMLDivElement>) => {
          onDrop?.(event);
          prompt.setDragging(false);
          if (prompt.disabled || !hasFiles(event)) return;
          event.preventDefault();
          prompt.addFiles(event.dataTransfer.files);
        },
      },
      props
    ),
  });
}
PromptField.displayName = 'Prompt.Field';

export interface PromptTextareaProps extends Omit<TextareaProps, 'value' | 'defaultValue' | 'onChange' | 'variant'> {}

/** Where the message is written. Enter sends, Shift+Enter starts a new line, and pasted files are attached. */
function PromptTextarea({
  className,
  minRows = 2,
  maxRows = 10,
  onKeyDown,
  onPaste,
  'aria-label': ariaLabel = 'Message',
  ...props
}: PromptTextareaProps) {
  const prompt = usePrompt('Prompt.Textarea');
  return (
    <Textarea
      id={prompt.fieldId}
      variant="ghost"
      aria-label={ariaLabel}
      minRows={minRows}
      maxRows={maxRows}
      disabled={prompt.disabled}
      value={prompt.value}
      onChange={(event) => prompt.setValue(event.target.value)}
      aria-controls={prompt.listbox?.id}
      aria-activedescendant={prompt.listbox?.active}
      onKeyDown={(event: KeyboardEvent<HTMLTextAreaElement>) => {
        onKeyDown?.(event);
        if (event.defaultPrevented) return;
        if (prompt.keyHandler.current?.(event)) return;
        // The usual shortcut for attaching, where underlining means nothing.
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'u') {
          event.preventDefault();
          prompt.openFileDialog();
          return;
        }
        // `isComposing`: Enter that ends a composition in an input method is not a send.
        if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
          event.preventDefault();
          prompt.submit();
        }
      }}
      onPaste={(event: ClipboardEvent<HTMLTextAreaElement>) => {
        onPaste?.(event);
        const files = event.clipboardData.files;
        if (event.defaultPrevented || files.length === 0) return;
        event.preventDefault();
        prompt.addFiles(files);
      }}
      className={promptVariants().textarea({ className })}
      {...props}
    />
  );
}
PromptTextarea.displayName = 'Prompt.Textarea';

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const XIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

export interface PromptAttachmentsProps extends ComponentProps<'ul'> {}

/** The files attached so far: images as thumbnails, anything else as a chip. Takes no room while there are none. */
function PromptAttachments({
  className,
  'aria-label': ariaLabel = 'Attached files',
  render,
  ...props
}: PromptAttachmentsProps & RenderProp<'ul'>) {
  const prompt = usePrompt('Prompt.Attachments');
  const slots = promptVariants();
  if (prompt.attachments.length === 0) return null;
  return useRender({
    defaultTagName: 'ul',
    render,
    props: mergeProps(
      {
        'data-slot': 'prompt-attachments',
        'aria-label': ariaLabel,
        className: slots.attachments({ className }),
        children: (
          <>
            {prompt.attachments.map(({ id, file, preview }) => (
              <li
                key={id}
                className={slots.attachment({ className: preview ? slots.attachmentImage() : slots.attachmentFile() })}
              >
                {preview ? (
                  <img src={preview} alt={file.name} className="size-full rounded-[inherit] object-cover" />
                ) : (
                  <>
                    <span aria-hidden="true" className={slots.attachmentGlyph()}>
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
                        <path d="M14 3v5h5" />
                      </svg>
                    </span>
                    <span className="min-w-0">
                      <span className={slots.attachmentName()}>{file.name}</span>
                      <span className={slots.attachmentMeta()}>{formatSize(file.size)}</span>
                    </span>
                  </>
                )}
                <button
                  type="button"
                  aria-label={`Remove ${file.name}`}
                  className={slots.attachmentRemove()}
                  onClick={() => prompt.removeAttachment(id)}
                >
                  <XIcon />
                </button>
              </li>
            ))}
          </>
        ),
      },
      props
    ),
  });
}
PromptAttachments.displayName = 'Prompt.Attachments';

export interface PromptFooterProps extends ComponentProps<'div'> {}

/** The row under the text: tools at the start, the submit button at the end. */
function PromptFooter({ className, render, ...props }: PromptFooterProps & RenderProp<'div'>) {
  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps({ 'data-slot': 'prompt-footer', className: promptVariants().footer({ className }) }, props),
  });
}
PromptFooter.displayName = 'Prompt.Footer';

export interface PromptToolsProps extends ComponentProps<'div'> {}

/** The tools at the start of the footer. Wraps onto a second line where it has to. */
function PromptTools({ className, render, ...props }: PromptToolsProps & RenderProp<'div'>) {
  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps({ 'data-slot': 'prompt-tools', className: promptVariants().tools({ className }) }, props),
  });
}
PromptTools.displayName = 'Prompt.Tools';

export interface PromptToolProps extends Omit<ButtonProps, 'aria-pressed'> {
  /** What it does, for a screen reader and for the tooltip. Shown beside the icon with `showLabel`. */
  label: string;
  /** Whether it is switched on, for a tool that stays on. Leave it out for one that acts once. */
  pressed?: boolean;
  /** Called with the new state when a tool with `pressed` is pressed. */
  onPressedChange?: (pressed: boolean) => void;
  /** Writes the label beside the icon. */
  showLabel?: boolean;
}

/** A round button in the footer, holding an icon. With `pressed`, it switches on and off. */
function PromptTool({
  label,
  pressed,
  onPressedChange,
  showLabel = false,
  onClick,
  className,
  children,
  variant = 'outline',
  ...props
}: PromptToolProps) {
  const prompt = usePrompt('Prompt.Tool');
  return (
    <Button
      data-slot="prompt-tool"
      variant={variant}
      shape="pill"
      size={showLabel ? 'md' : 'icon'}
      aria-label={showLabel ? undefined : label}
      title={showLabel ? undefined : label}
      aria-pressed={pressed}
      disabled={prompt.disabled}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented && pressed !== undefined) onPressedChange?.(!pressed);
      }}
      className={promptVariants().tool({ className: [showLabel ? 'px-3' : undefined, className] })}
      {...props}
    >
      {children}
      {showLabel ? label : null}
    </Button>
  );
}
PromptTool.displayName = 'Prompt.Tool';

export interface PromptAttachProps extends Omit<PromptToolProps, 'label' | 'pressed' | 'onPressedChange'> {
  /** Default `Attach files`. */
  label?: string;
}

/** A tool that opens the file picker. Files can also be pasted, or dropped on the field. */
function PromptAttach({ label = 'Attach files', onClick, children, ...props }: PromptAttachProps) {
  const prompt = usePrompt('Prompt.Attach');
  return (
    <PromptTool
      label={label}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) prompt.openFileDialog();
      }}
      {...props}
    >
      {children ?? <PaperclipIcon />}
    </PromptTool>
  );
}
PromptAttach.displayName = 'Prompt.Attach';

export interface PromptModelItem {
  value: string;
  label: string;
  /** Shown before the label, in the list and on the button once chosen. */
  icon?: ReactNode;
  /** A second line in the list. */
  description?: ReactNode;
}

export interface PromptModelProps {
  /** The models to choose from. */
  items: readonly PromptModelItem[];
  /** The chosen model, when the caller holds it. */
  value?: string;
  /** The model chosen to begin with, when the caller does not hold it. */
  defaultValue?: string;
  /** Called with the model's `value` when another is chosen. */
  onValueChange?: (value: string) => void;
  /** `pill` has an edge, like the tools beside it. `ghost` has none until hovered. Default `pill`. */
  variant?: 'pill' | 'ghost';
  /** What a screen reader calls the button. Default `Model`. */
  label?: string;
  className?: string;
}

/** Chooses the model the message goes to. The button shows the chosen one's icon and name. */
function PromptModel({
  items,
  value,
  defaultValue,
  onValueChange,
  variant = 'pill',
  label = 'Model',
  className,
}: PromptModelProps) {
  const prompt = usePrompt('Prompt.Model');
  const slots = promptVariants();
  return (
    <Select
      items={items}
      value={value}
      defaultValue={defaultValue ?? (value === undefined ? items[0]?.value : undefined)}
      onValueChange={(next) => {
        if (typeof next === 'string') onValueChange?.(next);
      }}
      disabled={prompt.disabled}
    >
      <Select.Trigger
        aria-label={label}
        variant={variant}
        size="md"
        className={[variant === 'ghost' ? 'text-foreground' : undefined, className].filter(Boolean).join(' ')}
      >
        <Select.Value className={slots.modelValue()}>
          {(chosen: string | null) => {
            const item = items.find((entry) => entry.value === chosen);
            return item ? (
              <>
                {item.icon}
                <span className="truncate">{item.label}</span>
              </>
            ) : null;
          }}
        </Select.Value>
      </Select.Trigger>
      <Select.Content>
        {items.map((item) => (
          <Select.Item key={item.value} value={item.value} icon={item.icon} description={item.description}>
            {item.label}
          </Select.Item>
        ))}
      </Select.Content>
    </Select>
  );
}
PromptModel.displayName = 'Prompt.Model';

const PaperclipIcon = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m16 6-8.41 8.59a2 2 0 0 0 2.83 2.83l8.41-8.59a4 4 0 0 0-5.66-5.66l-8.58 8.59a6 6 0 1 0 8.49 8.49L21.5 12" />
  </svg>
);

export interface PromptMenuProps extends Omit<MenuContentProps, 'children'> {
  /** What a screen reader and the tooltip call the button. Default `Add`. */
  label?: string;
  /** Replaces the plus on the button. */
  icon?: ReactNode;
  /** The menu: `Prompt.AttachItem`, and any `Menu` items, check items and submenus. */
  children?: ReactNode;
  /** `field` opens the menu as wide as the field, lined up with it, for items with descriptions. Default `auto`. */
  width?: 'auto' | 'field';
}

/**
 * One round button that opens a menu of everything that can be added to the
 * message: files, tools, modes. It keeps the footer to one button however
 * many there are.
 */
function PromptMenu({
  label = 'Add',
  icon,
  children,
  side = 'top',
  align = 'start',
  width = 'auto',
  className,
  ...props
}: PromptMenuProps) {
  const prompt = usePrompt('Prompt.Menu');
  return (
    <Menu>
      <Menu.Trigger
        disabled={prompt.disabled}
        aria-label={label}
        title={label}
        render={<Button data-slot="prompt-menu" variant="outline" shape="pill" size="icon" />}
        className={promptVariants().menuTrigger()}
      >
        {icon ?? (
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        )}
      </Menu.Trigger>
      <Menu.Content
        side={side}
        align={align}
        anchor={width === 'field' ? prompt.fieldRef : undefined}
        className={
          [width === 'field' ? 'w-(--anchor-width) rounded-2xl p-1.5' : undefined, className]
            .filter(Boolean)
            .join(' ') || undefined
        }
        {...props}
      >
        {children}
      </Menu.Content>
    </Menu>
  );
}
PromptMenu.displayName = 'Prompt.Menu';

export interface PromptAttachItemProps extends Omit<MenuItemProps, 'children'> {
  /** Default `Add files`. */
  children?: ReactNode;
  /** The keys shown at its end. Default `⌘U`; pass `null` for none. ⌘U and Ctrl+U in the field open the picker. */
  shortcut?: ReactNode;
}

/** The menu item that opens the file picker. */
function PromptAttachItem({ children = 'Add files', shortcut = '⌘U', onClick, ...props }: PromptAttachItemProps) {
  const prompt = usePrompt('Prompt.AttachItem');
  return (
    <Menu.Item
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) prompt.openFileDialog();
      }}
      {...props}
    >
      <PaperclipIcon />
      {children}
      {shortcut === null ? null : <Menu.Shortcut>{shortcut}</Menu.Shortcut>}
    </Menu.Item>
  );
}
PromptAttachItem.displayName = 'Prompt.AttachItem';

/* ----------------------------------------------------------------- submit */

/** Five bars that move while listening, and rest at fixed heights otherwise. */
function Waveform({ listening }: { listening: boolean }) {
  const bars = useRef<(SVGRectElement | null)[]>([]);
  const resting = [6, 12, 16, 10, 6];
  useEffect(() => {
    if (!listening || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const animations = bars.current.map((bar, index) =>
      bar?.animate([{ scale: '1 0.35' }, { scale: '1 1.15' }, { scale: '1 0.35' }], {
        duration: 700 + index * 90,
        delay: index * -160,
        iterations: Infinity,
        easing: 'ease-in-out',
      })
    );
    return () => animations.forEach((animation) => animation?.cancel());
  }, [listening]);
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor">
      {resting.map((height, index) => (
        <rect
          key={index}
          ref={(node) => {
            bars.current[index] = node;
          }}
          x={3.25 + index * 4}
          y={12 - height / 2}
          width="1.75"
          height={height}
          rx="0.875"
          style={{ transformOrigin: 'center', transformBox: 'fill-box' }}
        />
      ))}
    </svg>
  );
}

export interface PromptSubmitProps extends Omit<ButtonProps, 'type' | 'children'> {
  /** Makes the button a voice button while the field is empty. Called when it is pressed. */
  onVoice?: () => void;
  /** Whether voice is being heard. The bars move while it is. */
  listening?: boolean;
  /** What a screen reader calls the button while it sends. Default `Send`. */
  sendLabel?: string;
  /** While it stops the answer. Default `Stop`. */
  stopLabel?: string;
  /** While it starts voice. Default `Speak`. */
  voiceLabel?: string;
}

type SubmitMode = 'send' | 'stop' | 'voice';

/** Sends the message. While busy it stops the answer, and with `onVoice` it starts voice while the field is empty. */
function PromptSubmit({
  onVoice,
  listening = false,
  sendLabel = 'Send',
  stopLabel = 'Stop',
  voiceLabel = 'Speak',
  onClick,
  className,
  disabled,
  ...props
}: PromptSubmitProps) {
  const prompt = usePrompt('Prompt.Submit');
  const slots = promptVariants();
  const mode: SubmitMode = prompt.busy ? 'stop' : prompt.empty && onVoice ? 'voice' : 'send';
  const label = mode === 'stop' ? stopLabel : mode === 'voice' ? voiceLabel : sendLabel;
  const off = disabled || prompt.disabled || (mode === 'send' && prompt.empty) || (mode === 'stop' && !prompt.hasStop);

  // Each icon is always there and only the one for the mode is shown, so they
  // can cross-fade in place.
  const shown = (which: SubmitMode) =>
    mode === which ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-50 -rotate-45';

  return (
    <Button
      data-slot="prompt-submit"
      data-mode={mode}
      type={mode === 'send' ? 'submit' : 'button'}
      aria-label={label}
      aria-pressed={mode === 'voice' ? listening : undefined}
      disabled={off}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        if (mode === 'stop') prompt.stop();
        if (mode === 'voice') onVoice?.();
      }}
      className={slots.submit({ className })}
      {...props}
    >
      <span className={slots.submitIcon({ className: shown('send') })}>
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 19V5M5 12l7-7 7 7" />
        </svg>
      </span>
      <span className={slots.submitIcon({ className: shown('stop') })}>
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor">
          <rect x="7" y="7" width="10" height="10" rx="2" />
        </svg>
      </span>
      <span className={slots.submitIcon({ className: shown('voice') })}>
        <Waveform listening={mode === 'voice' && listening} />
      </span>
      {/* A ring turning round the button while the answer is on its way. */}
      <svg
        aria-hidden="true"
        viewBox="0 0 46 46"
        fill="none"
        className={slots.submitRing({ className: mode === 'stop' ? 'opacity-100' : 'opacity-0' })}
      >
        <circle cx="23" cy="23" r="21.5" stroke="currentColor" strokeOpacity="0.15" strokeWidth="1.5" />
        <circle
          cx="23"
          cy="23"
          r="21.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeDasharray="30 105"
          className="origin-center animate-spin motion-reduce:animate-none [animation-duration:1.1s]"
        />
      </svg>
    </Button>
  );
}
PromptSubmit.displayName = 'Prompt.Submit';

/* ------------------------------------------------------------------ tasks */

/** A filled circle in the success colour with a tick drawn in it. */
const CheckCircle = ({ className }: { className?: string }) => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={className}>
    <path
      d="M22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12Z"
      fill="var(--success)"
      stroke="var(--success)"
      strokeWidth="1.5"
    />
    <path d="M8 12.5L10.5 15L16 9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export type PromptTaskStatus = 'pending' | 'active' | 'done' | 'error';

function reducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** A ring that fills as tasks are done, and becomes a check when all of them are. */
function ProgressRing({ done, total }: { done: number; total: number }) {
  const complete = total > 0 && done === total;
  const r = 6.25;
  const length = 2 * Math.PI * r;
  if (complete) {
    return <CheckCircle className="size-4" />;
  }
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4 -rotate-90">
      <circle cx="8" cy="8" r={r} fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2" />
      <circle
        cx="8"
        cy="8"
        r={r}
        fill="none"
        stroke="var(--success)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={`${(length * done) / Math.max(total, 1)} ${length}`}
        className="transition-[stroke-dasharray] duration-500 ease-out motion-reduce:transition-none"
      />
    </svg>
  );
}

export interface PromptTasksProps extends Omit<ComponentProps<'div'>, 'title'> {
  /** Whether the band is shown. It folds under the field when it is not. Default: shown, or with `mode`, while the prompt is in that mode. */
  open?: boolean;
  /** The prompt modes it is shown in. It folds away in any other. */
  mode?: PromptBandMode;
  /** What the agent is doing, on the band's one line: "Preparing the release". */
  title: ReactNode;
  /** Whether the list is open under the title, when the caller holds it. */
  expanded?: boolean;
  /** Whether the list starts open, when the caller does not hold it. Default `false`. */
  defaultExpanded?: boolean;
  /** Called when the title is pressed to open or close the list. */
  onExpandedChange?: (expanded: boolean) => void;
  /** How tall the list grows before it scrolls, as a CSS length. Default `10rem`. */
  maxHeight?: string;
}

/**
 * A band above the field with an agent's tasks: one line with a ring that
 * fills as they are done, opening into the list. The list scrolls past
 * `maxHeight`, and keeps the task in progress in view.
 */
function PromptTasks({
  open,
  mode,
  title,
  expanded,
  defaultExpanded = false,
  onExpandedChange,
  maxHeight = '10rem',
  className,
  children,
  ...props
}: PromptTasksProps) {
  const shown = useBandOpen('Prompt.Tasks', open, mode, () => true);
  const slots = promptVariants();
  const [inner, setInner] = useState(defaultExpanded);
  const isExpanded = expanded ?? inner;
  const listId = useId();
  const list = useRef<HTMLOListElement>(null);
  const tasks = Children.toArray(children).filter(isValidElement) as ReactElement<PromptTaskProps>[];
  const done = tasks.filter((task) => task.props.status === 'done').length;
  const active = tasks.findIndex((task) => task.props.status === 'active');

  // The task in progress is kept in the middle of the list, so a long run can
  // be followed without scrolling. The list scrolls, never the page.
  useEffect(() => {
    const node = list.current;
    const current = node?.querySelector<HTMLElement>('[data-status=active]');
    if (!node || !current || !isExpanded) return;
    node.scrollTo({
      top: current.offsetTop - node.clientHeight / 2 + current.offsetHeight / 2,
      behavior: reducedMotion() ? 'auto' : 'smooth',
    });
  }, [active, isExpanded]);

  const toggle = () => {
    if (expanded === undefined) setInner(!isExpanded);
    onExpandedChange?.(!isExpanded);
  };

  return (
    <Band
      edge="top"
      open={shown}
      slot="prompt-tasks"
      className={['flex-col items-stretch gap-0 px-0 pt-0.5', className].filter(Boolean).join(' ')}
      {...props}
    >
      <button
        type="button"
        aria-expanded={isExpanded}
        aria-controls={listId}
        onClick={toggle}
        className={slots.tasksHeader()}
      >
        <ProgressRing done={done} total={tasks.length} />
        <span className={slots.tasksTitle()}>{title}</span>
        <span className={slots.tasksCount()}>
          {done}/{tasks.length}
        </span>
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={slots.tasksChevron({ className: isExpanded ? 'rotate-180' : undefined })}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      <div className={slots.tasksBody({ className: isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]' })}>
        <div className="min-h-0 overflow-hidden">
          <ol ref={list} id={listId} aria-label="Tasks" className={slots.tasksList()} style={{ maxHeight }}>
            {children}
          </ol>
        </div>
      </div>
    </Band>
  );
}
PromptTasks.displayName = 'Prompt.Tasks';

export interface PromptTaskProps extends ComponentProps<'li'> {
  /** `pending`, `active` (its words are lit while it runs), `done` (a check) or `error`. Default `pending`. */
  status?: PromptTaskStatus;
}

/** One task in `Prompt.Tasks`. */
function PromptTask({ status = 'pending', className, children, render, ...props }: PromptTaskProps & RenderProp<'li'>) {
  const slots = promptVariants();
  const text = useShimmer(status === 'active');
  return useRender({
    defaultTagName: 'li',
    render,
    props: mergeProps(
      {
        'data-status': status,
        className: slots.task({ className }),
        children: (
          <>
            <span className={slots.taskMark()}>
              {status === 'done' ? (
                <CheckCircle className={slots.taskDone()} />
              ) : status === 'active' ? (
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.75"
                  strokeLinecap="round"
                  className="size-3.5 animate-spin text-foreground motion-reduce:animate-none"
                >
                  <path d="M21 12a9 9 0 1 1-6.22-8.56" />
                </svg>
              ) : status === 'error' ? (
                <span className={slots.taskError()}>!</span>
              ) : (
                <span className={slots.taskPending()} />
              )}
            </span>
            <span
              ref={text}
              className={
                status === 'active'
                  ? slots.statusText({ className: 'whitespace-normal' })
                  : status === 'done'
                    ? 'text-muted-foreground line-through decoration-muted-foreground/40'
                    : status === 'error'
                      ? 'text-destructive'
                      : 'text-muted-foreground'
              }
            >
              {children}
            </span>
            <span className="sr-only">
              {status === 'done'
                ? ', done'
                : status === 'active'
                  ? ', in progress'
                  : status === 'error'
                    ? ', failed'
                    : ''}
            </span>
          </>
        ),
      },
      props
    ),
  });
}
PromptTask.displayName = 'Prompt.Task';

/* --------------------------------------------------------------- commands */

export interface PromptCommandItem {
  /** What is typed after the trigger to reach it: `summarise` for `/summarise`. */
  value: string;
  /** Its name in the list. Default the trigger and the value. */
  label?: ReactNode;
  /** What it does, after the name. */
  description?: ReactNode;
  icon?: ReactNode;
}

export interface PromptCommandsProps {
  /** The commands. */
  items: readonly PromptCommandItem[];
  /** The character that opens the list when the field starts with it. Default `/`. */
  trigger?: string;
  /**
   * Called with the command chosen. With it, the field is cleared and the
   * command is yours to show; without it, the command is written into the field.
   */
  onSelect?: (item: PromptCommandItem) => void;
  /** The heading over the list. Default `Commands`. */
  label?: ReactNode;
  /** How tall the list grows before it scrolls, as a CSS length. Default `12rem`. */
  maxHeight?: string;
}

/**
 * A band above the field listing commands while the text is a trigger and a
 * word, `/sum`. The arrow keys move through it, Enter or Tab chooses, Escape
 * puts it away.
 */
function PromptCommands({
  items,
  trigger = '/',
  onSelect,
  label = 'Commands',
  maxHeight = '12rem',
}: PromptCommandsProps) {
  const prompt = usePrompt('Prompt.Commands');
  const slots = promptVariants();
  const listId = useId();
  const [activeIndex, setActiveIndex] = useState(0);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const list = useRef<HTMLDivElement>(null);

  const query =
    prompt.value.startsWith(trigger) && !/\s/.test(prompt.value)
      ? prompt.value.slice(trigger.length).toLowerCase()
      : null;
  const matches =
    query === null
      ? []
      : items
          .filter(
            (item) =>
              item.value.toLowerCase().includes(query) ||
              String(item.label ?? '')
                .toLowerCase()
                .includes(query)
          )
          // Those whose name starts with what was typed come first.
          .sort(
            (a, b) =>
              Number(!a.value.toLowerCase().startsWith(query)) - Number(!b.value.toLowerCase().startsWith(query))
          );
  const open = matches.length > 0 && dismissed !== prompt.value;
  const active = Math.min(activeIndex, Math.max(matches.length - 1, 0));
  const optionId = (index: number) => `${listId}-${index}`;

  // A new query starts at the top of what it matches.
  useEffect(() => setActiveIndex(0), [query]);

  const choose = (item: PromptCommandItem) => {
    if (onSelect) {
      onSelect(item);
      prompt.setValue('');
    } else {
      prompt.setValue(`${trigger}${item.value} `);
    }
  };

  // The field's keys come here first while the list is open.
  useEffect(() => {
    prompt.keyHandler.current = (event) => {
      if (!open) return false;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const step = event.key === 'ArrowDown' ? 1 : -1;
        setActiveIndex((active + step + matches.length) % matches.length);
        return true;
      }
      if ((event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) || event.key === 'Tab') {
        event.preventDefault();
        choose(matches[active]!);
        return true;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        setDismissed(prompt.value);
        return true;
      }
      return false;
    };
    return () => {
      prompt.keyHandler.current = null;
    };
  });

  // The field points a screen reader at the highlighted command.
  const { setListbox } = prompt;
  useEffect(() => {
    setListbox(open ? { id: listId, active: optionId(active) } : null);
    return () => setListbox(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, active, listId, setListbox]);

  // The highlighted row is kept in view inside the list.
  useEffect(() => {
    const node = list.current;
    const row = node?.querySelector<HTMLElement>('[aria-selected=true]');
    if (!node || !row) return;
    if (row.offsetTop < node.scrollTop) node.scrollTop = row.offsetTop;
    else if (row.offsetTop + row.offsetHeight > node.scrollTop + node.clientHeight) {
      node.scrollTop = row.offsetTop + row.offsetHeight - node.clientHeight;
    }
  }, [active]);

  return (
    <Band edge="top" open={open} slot="prompt-commands" className="flex-col items-stretch gap-0 px-0 pt-0">
      <div className={slots.commandsLabel()}>{label}</div>
      <div
        ref={list}
        id={listId}
        role="listbox"
        aria-label={typeof label === 'string' ? label : 'Commands'}
        className={slots.commandsList({ className: 'relative' })}
        style={{ maxHeight }}
      >
        {matches.map((item, index) => (
          <div
            key={item.value}
            id={optionId(index)}
            role="option"
            aria-selected={index === active}
            className={slots.command()}
            // Pressed without taking focus from the field.
            onMouseDown={(event) => event.preventDefault()}
            onMouseMove={() => index !== active && setActiveIndex(index)}
            onClick={() => choose(item)}
          >
            {item.icon}
            <span className={slots.commandName()}>{item.label ?? `${trigger}${item.value}`}</span>
            {item.description ? <span className={slots.commandDescription()}>{item.description}</span> : null}
          </div>
        ))}
      </div>
    </Band>
  );
}
PromptCommands.displayName = 'Prompt.Commands';

/* --------------------------------------------------------------- recorder */

/** Enough history to fill a wide field; only as many bars as fit are drawn. */
const BARS = 160;
/** A bar and the gap after it, in pixels: `w-[3px]` and `gap-[2px]`. */
const BAR_PITCH = 5;

export interface PromptRecorderProps extends ComponentProps<'div'> {
  /** What has been heard so far, written in as it arrives. */
  transcript?: ReactNode;
  /** Shown, lit by a moving sweep, until there is a transcript. Default `Listening…`. */
  placeholder?: ReactNode;
  /** Called when the cross is pressed, to throw the recording away. */
  onCancel?: () => void;
  /** Called when the check is pressed, to keep it. */
  onDone?: () => void;
  /**
   * How loud the input is now, from 0 to 1, to draw from a real microphone.
   * Without it the wave moves on its own, as a sign that it is listening.
   */
  level?: number;
  /** What a screen reader calls the cross. Default `Cancel recording`. */
  cancelLabel?: string;
  /** And the check. Default `Finish recording`. */
  doneLabel?: string;
}

/**
 * Takes the place of the text and the footer while voice is recorded: what
 * has been heard so far, the sound as a wave scrolling to the left, how long
 * it has been, and buttons to throw it away or keep it.
 */
function PromptRecorder({
  transcript,
  placeholder = 'Listening…',
  onCancel,
  onDone,
  level,
  cancelLabel = 'Cancel recording',
  doneLabel = 'Finish recording',
  className,
  render,
  ...props
}: PromptRecorderProps & RenderProp<'div'>) {
  const slots = promptVariants();
  // Starts on a low murmur rather than flat silence, so the wave is never a row of dots.
  const [levels, setLevels] = useState<number[]>(() =>
    Array.from({ length: BARS }, (_, i) => 0.12 + 0.06 * Math.sin(i * 1.7))
  );
  const [seconds, setSeconds] = useState(0);
  const latest = useRef(level);
  latest.current = level;
  const listening = useShimmer(!transcript);
  // The wave fills its row from the cross to the timer, however wide that is.
  const wave = useRef<HTMLDivElement>(null);
  const [fits, setFits] = useState(48);
  useEffect(() => {
    const node = wave.current;
    if (!node || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
      setFits(Math.max(8, Math.min(BARS, Math.floor((entry!.contentRect.width + 2) / BAR_PITCH))));
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const started = Date.now();
    const clock = window.setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 250);
    if (reducedMotion() && latest.current === undefined) {
      setLevels(Array.from({ length: BARS }, (_, i) => 0.25 + 0.2 * Math.sin(i / 3)));
      return () => window.clearInterval(clock);
    }
    let t = 0;
    let smooth = 0.2;
    const tick = window.setInterval(() => {
      t += 1;
      // Speech: phrases that swell and fall, with syllables riding on them.
      const phrase = Math.max(0, Math.sin(t / 11) * 0.6 + 0.45);
      const syllable = Math.abs(Math.sin(t * 0.85 + Math.sin(t * 0.31) * 2));
      const target = latest.current ?? Math.min(1, 0.1 + phrase * (0.3 + syllable * 0.6) + Math.random() * 0.12);
      smooth += (target - smooth) * 0.55;
      setLevels((current) => [...current.slice(1), smooth]);
    }, 70);
    return () => {
      window.clearInterval(clock);
      window.clearInterval(tick);
    };
  }, []);

  const time = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        'data-slot': 'prompt-recorder',
        className: slots.recorder({ className }),
        children: (
          <>
            <p aria-live="polite" className={slots.recorderTranscript()}>
              {transcript || (
                <span ref={listening} className={slots.recorderListening()}>
                  {placeholder}
                </span>
              )}
            </p>
            <div className={slots.recorderControls()}>
              <Button variant="ghost" size="icon" shape="pill" aria-label={cancelLabel} onClick={onCancel}>
                <XIcon />
              </Button>
              <div ref={wave} aria-hidden="true" className={slots.recorderWave()}>
                {levels.slice(-fits).map((value, index) => (
                  <span key={index} className={slots.recorderBar()} style={{ height: `${3 + value * 33}px` }} />
                ))}
              </div>
              <span role="timer" aria-label={`Recording, ${time}`} className={slots.recorderTime()}>
                <span className={slots.recorderDot()} />
                {time}
              </span>
              <Button shape="pill" aria-label={doneLabel} onClick={onDone} className={slots.recorderDone()}>
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </Button>
            </div>
          </>
        ),
      },
      props
    ),
  });
}
PromptRecorder.displayName = 'Prompt.Recorder';

export const Prompt = Object.assign(PromptRoot, {
  Banner: PromptBanner,
  BannerAction: PromptBannerAction,
  Field: PromptField,
  Attachments: PromptAttachments,
  Textarea: PromptTextarea,
  Footer: PromptFooter,
  Tools: PromptTools,
  Tool: PromptTool,
  Attach: PromptAttach,
  Menu: PromptMenu,
  AttachItem: PromptAttachItem,
  Model: PromptModel,
  Submit: PromptSubmit,
  Status: PromptStatus,
  Tasks: PromptTasks,
  Task: PromptTask,
  Commands: PromptCommands,
  Recorder: PromptRecorder,
  Context: PromptContext,
  ContextItem: PromptContextItem,
  Hint: PromptHint,
});

/* By name as well, for a Server Component, which cannot dot into a client
   module. */
export {
  PromptBanner,
  PromptBannerAction,
  PromptField,
  PromptAttachments,
  PromptTextarea,
  PromptFooter,
  PromptTools,
  PromptTool,
  PromptAttach,
  PromptMenu,
  PromptAttachItem,
  PromptModel,
  PromptSubmit,
  PromptStatus,
  PromptTasks,
  PromptTask,
  PromptCommands,
  PromptRecorder,
  PromptContext,
  PromptContextItem,
  PromptHint,
};
