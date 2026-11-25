'use client';

/**
 * Share — invite people to something by email, choose what they can do, and
 * copy its link.
 *
 * ```tsx
 * <Share link="https://example.com/d/launch" onInvite={({ emails, role }) => invite(emails, role)}>
 *   <Share.Trigger people={members} />
 *   <Share.Content title="Share “Launch notes”">
 *     <Share.Invite roles={ROLES} defaultRole="viewer" />
 *     <Share.People>
 *       {members.map((member) => (
 *         <Share.Person key={member.email} name={member.name} role={member.role} />
 *       ))}
 *     </Share.People>
 *     <Share.Footer>
 *       <Share.CopyLink />
 *       <Share.Send />
 *     </Share.Footer>
 *   </Share.Content>
 * </Share>
 * ```
 *
 * ## What it is for
 *
 * Giving other people access to one document, board or file. The panel holds
 * the three things that job needs in the order they are done: who to add, who
 * already has access, and the two ways to send it, by invitation or by link.
 *
 * ## The invite field
 *
 * An address becomes a chip when it is followed by Enter, a comma or a space,
 * or when the field is left, so several can be added before sending.
 * Backspace in an empty field takes the last chip back. The role select at
 * the field's end applies to everyone in it. Send stays disabled until there
 * is at least one address, chipped or typed.
 *
 * ## Sending and copying answer in place
 *
 * `Share.Send` calls `onInvite` and turns into a spinner while the promise it
 * returns is pending, then into a green "Sent" for a moment before it is
 * ready again, and the chips are cleared. `Share.CopyLink` writes `link` to
 * the clipboard and says "Copied". Both keep their width while they change,
 * so the footer does not move under the pointer, and both announce the change
 * to a screen reader.
 *
 * ## A popover or a dialog
 *
 * `presentation="popover"` opens the panel beside its trigger, for a share
 * button in a toolbar. `presentation="dialog"` opens it in the middle of the
 * screen over a dimmed page, for a share action reached from a menu.
 */
import { Dialog as BaseDialog } from '@base-ui/react/dialog';
import { Popover as BasePopover } from '@base-ui/react/popover';
import { Select as BaseSelect } from '@base-ui/react/select';
import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { ComponentProps, KeyboardEvent, ReactNode } from 'react';
import { tv } from 'tailwind-variants';

const EASE = 'ease-[cubic-bezier(0.23,1,0.32,1)]';

const shareVariants = tv({
  slots: {
    trigger: [
      'group/share inline-flex h-9 items-center gap-2 rounded-full bg-primary ps-1 pe-3.5 text-sm font-medium text-primary-foreground shadow-xs outline-none',
      'inset-shadow-[0_1px_0_rgb(255_255_255/0.12)] transition-[background-color,scale] duration-150',
      'hover:bg-primary/90 active:scale-[0.97] focus-visible:ring-[3px] focus-visible:ring-ring/50',
      'has-[[data-slot=share-faces]]:ps-1 not-has-[[data-slot=share-faces]]:ps-3.5',
      'motion-reduce:transition-none [&_svg:not([class*=size-])]:size-4',
    ],
    faces: 'flex items-center -space-x-1.5 pe-0.5',
    face: [
      'inline-flex size-7 items-center justify-center overflow-hidden rounded-full bg-primary-foreground/15 text-[0.625rem] font-semibold text-primary-foreground ring-2 ring-primary',
      'transition-transform duration-200 group-hover/share:not-first:translate-x-0.5',
    ],
    backdrop:
      'fixed inset-0 z-50 bg-black/30 transition-opacity duration-200 data-starting-style:opacity-0 data-ending-style:opacity-0 motion-reduce:transition-none',
    viewport: 'fixed inset-0 z-50 grid place-items-center p-4',
    positioner: 'z-50 outline-none',
    // The band and the panel inside it: the band is the darker of the two in
    // either theme, and its radius is the panel's plus the 6px between them.
    shell: [
      'w-[min(23rem,calc(100vw-2rem))] rounded-[28px] bg-[color-mix(in_oklab,var(--popover),black_5%)] p-1.5 text-popover-foreground shadow-xl outline-none',
      'ring-1 ring-foreground/[0.06] dark:bg-[color-mix(in_oklab,var(--popover),black_14%)] dark:shadow-black/40',
      `origin-(--transform-origin) transition-[opacity,scale,translate] duration-200 ${EASE}`,
      'data-starting-style:scale-[0.96] data-starting-style:opacity-0 data-ending-style:scale-[0.97] data-ending-style:opacity-0 data-ending-style:duration-150',
      'motion-reduce:transition-none',
    ],
    panel: 'flex flex-col gap-4 rounded-[22px] bg-popover p-4 shadow-xs',
    header: 'flex items-center gap-2.5',
    headerIcon:
      'flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground [&_svg]:size-4',
    title: 'min-w-0 flex-1 truncate text-[15px] font-semibold tracking-[-0.01em]',
    close: [
      'inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground outline-none',
      'transition-[background-color,color,scale] duration-150 hover:bg-foreground/10 hover:text-foreground active:scale-95',
      'focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none [&_svg]:size-3.5',
    ],
    invite: [
      'flex min-h-10 items-center gap-1.5 rounded-2xl border bg-background py-1 ps-3 pe-1 text-sm transition-[border-color,box-shadow] duration-150',
      'has-[input:focus-visible]:border-ring has-[input:focus-visible]:ring-[3px] has-[input:focus-visible]:ring-ring/30 dark:bg-input/30',
    ],
    inviteIcon: 'size-4 shrink-0 text-muted-foreground',
    inviteList: 'flex min-w-0 flex-1 flex-wrap items-center gap-1',
    input: 'h-8 min-w-24 flex-1 bg-transparent outline-none placeholder:text-muted-foreground',
    chip: [
      'inline-flex h-7 max-w-full items-center gap-1 rounded-full bg-muted ps-2.5 pe-1 text-[0.8125rem]',
      `transition-[opacity,scale] duration-200 ${EASE} starting:scale-90 starting:opacity-0 motion-reduce:transition-none`,
    ],
    chipText: 'truncate',
    chipRemove:
      'inline-flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none hover:bg-foreground/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-3',
    roleTrigger: [
      'inline-flex h-8 shrink-0 items-center gap-1 rounded-xl px-2.5 text-[0.8125rem] font-medium outline-none',
      'transition-colors duration-150 hover:bg-muted data-popup-open:bg-muted focus-visible:ring-2 focus-visible:ring-ring',
      '[&_svg]:size-3.5 [&_svg]:text-muted-foreground',
    ],
    rolePositioner: 'z-[60] outline-none',
    rolePopup: [
      'min-w-36 origin-(--transform-origin) rounded-xl border bg-popover p-1 text-popover-foreground shadow-lg outline-none',
      'transition-[opacity,scale] duration-150 data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:opacity-0',
      'motion-reduce:transition-none',
    ],
    roleItem: [
      'grid cursor-default grid-cols-[1fr_auto] items-center gap-x-3 rounded-lg px-2.5 py-1.5 text-sm outline-none select-none',
      'data-highlighted:bg-accent',
    ],
    roleDescription: 'col-span-1 text-xs text-muted-foreground',
    roleCheck: 'row-span-2 row-start-1 col-start-2 text-foreground [&_svg]:size-3.5',
    section: 'flex flex-col gap-1',
    sectionLabel: 'pb-1 text-xs font-medium text-muted-foreground',
    person: 'flex min-h-10 items-center gap-3',
    avatar:
      'inline-flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-[0.6875rem] font-semibold text-muted-foreground',
    personText: 'flex min-w-0 flex-1 flex-col',
    personName: 'truncate text-sm',
    personMeta: 'truncate text-xs text-muted-foreground',
    personRole: 'shrink-0 text-[0.8125rem] text-muted-foreground',
    access: 'flex items-center gap-3 rounded-2xl bg-muted/70 py-2 ps-2.5 pe-1',
    accessIcon:
      'flex size-7 shrink-0 items-center justify-center rounded-full bg-popover text-muted-foreground shadow-xs [&_svg]:size-3.5',
    footer: 'flex gap-1.5 px-1 pt-1.5 pb-0.5 *:h-11 *:min-w-0 *:flex-1',
    button: [
      'relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full text-sm font-medium outline-none',
      'transition-[background-color,color,opacity,scale] duration-200 active:not-disabled:scale-[0.98]',
      'focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none',
      'motion-reduce:transition-none [&_svg]:size-4 [&_svg]:shrink-0',
    ],
    buttonLabel: `inline-flex items-center gap-2 transition-[opacity,translate,filter] duration-200 ${EASE} motion-reduce:transition-none`,
  },
});

type SendState = 'idle' | 'sending' | 'sent';

export interface ShareRole {
  /** What is stored: `viewer`. */
  value: string;
  /** What is shown: "Can view". */
  label: string;
  /** A line under it in the list: "Comment and read". */
  description?: string;
}

export interface ShareInvitation {
  /** Everyone in the field, chipped or typed. */
  emails: string[];
  /** The role chosen in the field. */
  role: string;
}

interface ShareContextValue {
  presentation: 'popover' | 'dialog';
  link?: string;
  onCopy?: (link: string) => void;
  emails: string[];
  setEmails: (next: string[] | ((current: string[]) => string[])) => void;
  draft: string;
  setDraft: (next: string) => void;
  role: string;
  setRole: (next: string) => void;
  sendState: SendState;
  send: () => void;
  canSend: boolean;
  titleId: string;
}

const ShareContext = createContext<ShareContextValue | null>(null);

function useShare(part: string) {
  const context = useContext(ShareContext);
  if (!context) throw new Error(`${part} must be inside <Share>.`);
  return context;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Whether a string looks like an email address. */
export function isEmail(value: string) {
  return EMAIL.test(value.trim());
}

export interface ShareProps {
  children?: ReactNode;
  /** `popover` opens beside the trigger; `dialog` in the middle of the screen. Default `popover`. */
  presentation?: 'popover' | 'dialog';
  /** Whether it is open, when the caller holds that. */
  open?: boolean;
  /** Whether it starts open, when the caller does not hold it. */
  defaultOpen?: boolean;
  /** Called when it opens or closes. */
  onOpenChange?: (open: boolean) => void;
  /** The address `Share.CopyLink` copies. */
  link?: string;
  /** Called after the link has been copied. */
  onCopy?: (link: string) => void;
  /**
   * Called by `Share.Send` with the addresses and the role. Return a promise
   * to keep the button spinning until it settles; a rejected promise puts the
   * button back without clearing the field.
   */
  onInvite?: (invitation: ShareInvitation) => void | Promise<unknown>;
  /** The role the invite field starts on. Default the first in `Share.Invite`'s `roles`, or `viewer`. */
  defaultRole?: string;
  /** How long "Sent" shows before the button is ready again, in ms. Default `1600`. */
  sentDuration?: number;
}

/** Holds who is being invited, the chosen role and whether it is open. */
function ShareRoot({
  children,
  presentation = 'popover',
  open,
  defaultOpen,
  onOpenChange,
  link,
  onCopy,
  onInvite,
  defaultRole = 'viewer',
  sentDuration = 1600,
}: ShareProps) {
  const [emails, setEmails] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [role, setRole] = useState(defaultRole);
  const [sendState, setSendState] = useState<SendState>('idle');
  const titleId = useId();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const pending = useMemo(() => {
    const typed = draft.trim();
    return isEmail(typed) && !emails.includes(typed) ? [...emails, typed] : emails;
  }, [draft, emails]);

  const send = useCallback(() => {
    if (pending.length === 0 || sendState !== 'idle') return;
    setSendState('sending');
    const finish = () => {
      setEmails([]);
      setDraft('');
      setSendState('sent');
      timer.current = setTimeout(() => setSendState('idle'), sentDuration);
    };
    let result: void | Promise<unknown>;
    try {
      result = onInvite?.({ emails: pending, role });
    } catch {
      setSendState('idle');
      return;
    }
    if (result && typeof (result as Promise<unknown>).then === 'function') {
      (result as Promise<unknown>).then(finish, () => setSendState('idle'));
    } else {
      // A synchronous handler still gets a beat of "Sending", so the change reads.
      timer.current = setTimeout(finish, 450);
    }
  }, [pending, sendState, onInvite, role, sentDuration]);

  const value = useMemo<ShareContextValue>(
    () => ({
      presentation,
      link,
      onCopy,
      emails,
      setEmails,
      draft,
      setDraft,
      role,
      setRole,
      sendState,
      send,
      canSend: pending.length > 0 && sendState === 'idle',
      titleId,
    }),
    [presentation, link, onCopy, emails, draft, role, sendState, send, pending.length, titleId],
  );

  const Root = presentation === 'dialog' ? BaseDialog.Root : BasePopover.Root;
  return (
    <ShareContext.Provider value={value}>
      <Root
        open={open}
        defaultOpen={defaultOpen}
        onOpenChange={onOpenChange ? (next) => onOpenChange(next) : undefined}
      >
        {children}
      </Root>
    </ShareContext.Provider>
  );
}
ShareRoot.displayName = 'Share';

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '')).toUpperCase();
}

function ShareGlyph() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 15V3M7 8l5-5 5 5" />
      <path d="M5 12v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
    </svg>
  );
}

export interface ShareFace {
  /** Who it is, for the initials and the trigger's name. */
  name: string;
  /** A picture. Without it, the initials show. */
  src?: string;
}

export interface ShareTriggerProps extends Omit<ComponentProps<'button'>, 'children'> {
  /** Who already has access, drawn as overlapping faces at the button's start. Three show. */
  people?: ShareFace[];
  /** The label. Default "Share". */
  children?: ReactNode;
}

/** The button that opens it: a pill with the share glyph, and the faces of who has access. */
function ShareTrigger({ people, children = 'Share', className, ...props }: ShareTriggerProps) {
  const { presentation } = useShare('Share.Trigger');
  const slots = shareVariants();
  const shown = people?.slice(0, 3) ?? [];
  const Trigger = presentation === 'dialog' ? BaseDialog.Trigger : BasePopover.Trigger;
  return (
    <Trigger data-slot="share-trigger" className={slots.trigger({ className })} {...props}>
      {shown.length > 0 ? (
        <span data-slot="share-faces" className={slots.faces()} aria-hidden="true">
          {shown.map((person) => (
            <span key={person.name} className={slots.face()}>
              {person.src ? <img src={person.src} alt="" className="size-full object-cover" /> : initials(person.name)}
            </span>
          ))}
        </span>
      ) : null}
      <ShareGlyph />
      {children}
      {people && people.length > 0 ? <span className="sr-only">, with {people.length} people</span> : null}
    </Trigger>
  );
}
ShareTrigger.displayName = 'Share.Trigger';

export interface ShareContentProps extends Omit<ComponentProps<'div'>, 'title'> {
  /** The heading: `Share “Launch notes”`. It is what the panel is announced as. */
  title: ReactNode;
  /** The glyph beside the title. Default the share glyph; `null` for none. */
  icon?: ReactNode;
  /** For a popover: which side of the trigger it opens on. Default `bottom`. */
  side?: BasePopover.Positioner.Props['side'];
  /** For a popover: how it lines up with the trigger. Default `end`. */
  align?: BasePopover.Positioner.Props['align'];
  /** For a popover: the gap to the trigger, in px. Default `8`. */
  sideOffset?: number;
}

/**
 * The panel. The footer sits in the band around it; everything else is in
 * the panel, in the order it is written.
 */
function ShareContent({
  title,
  icon,
  side = 'bottom',
  align = 'end',
  sideOffset = 8,
  className,
  children,
  ...props
}: ShareContentProps) {
  const { presentation } = useShare('Share.Content');
  const slots = shareVariants();
  const Title = presentation === 'dialog' ? BaseDialog.Title : BasePopover.Title;
  const Close = presentation === 'dialog' ? BaseDialog.Close : BasePopover.Close;

  // The footer is pulled out of the panel into the band below it, so it can
  // be written anywhere among the children.
  // Focus starts in the invite field when there is one, since adding people
  // is what the panel was opened for; otherwise on the first control.
  const popup = useRef<HTMLDivElement>(null);
  const initialFocus = () => popup.current?.querySelector<HTMLElement>('[data-slot=share-invite] input') ?? true;

  const all = Array.isArray(children) ? children : [children];
  const footer = all.filter((child) => isPart(child, 'Share.Footer'));
  const rest = all.filter((child) => !isPart(child, 'Share.Footer'));

  const inside = (
    <>
      <div data-slot="share-panel" className={slots.panel()}>
        <div data-slot="share-header" className={slots.header()}>
          {icon === null ? null : <span className={slots.headerIcon()}>{icon ?? <ShareGlyph />}</span>}
          <Title data-slot="share-title" className={slots.title()}>
            {title}
          </Title>
          <Close data-slot="share-close" aria-label="Close" className={slots.close()}>
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.4}
              strokeLinecap="round"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </Close>
        </div>
        {rest}
      </div>
      {footer}
    </>
  );

  if (presentation === 'dialog') {
    return (
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className={slots.backdrop()} />
        <BaseDialog.Viewport className={slots.viewport()}>
          <BaseDialog.Popup
            ref={popup}
            initialFocus={initialFocus}
            data-slot="share-content"
            className={slots.shell({ className })}
            {...props}
          >
            {inside}
          </BaseDialog.Popup>
        </BaseDialog.Viewport>
      </BaseDialog.Portal>
    );
  }
  return (
    <BasePopover.Portal>
      <BasePopover.Positioner side={side} align={align} sideOffset={sideOffset} className={slots.positioner()}>
        <BasePopover.Popup
          ref={popup}
          initialFocus={initialFocus}
          data-slot="share-content"
          className={slots.shell({ className })}
          {...props}
        >
          {inside}
        </BasePopover.Popup>
      </BasePopover.Positioner>
    </BasePopover.Portal>
  );
}
ShareContent.displayName = 'Share.Content';

function isPart(child: unknown, name: string) {
  return (
    typeof child === 'object' &&
    child !== null &&
    'type' in child &&
    (child as { type: { displayName?: string } }).type?.displayName === name
  );
}

function Check() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}

function Chevron() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export interface ShareRoleSelectProps {
  /** The roles to choose from. */
  roles: ShareRole[];
  /** The chosen role's `value`. */
  value: string;
  /** Called with the new role's `value`. */
  onValueChange: (value: string) => void;
  /** What a screen reader calls it. Default "Role". */
  'aria-label'?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * A compact select of roles, as used at the end of the invite field and
 * beside each person. Use it on its own for a role select of your own.
 */
function ShareRoleSelect({
  roles,
  value,
  onValueChange,
  disabled,
  className,
  'aria-label': ariaLabel = 'Role',
}: ShareRoleSelectProps) {
  const slots = shareVariants();
  const items = useMemo(() => roles.map((role) => ({ value: role.value, label: role.label })), [roles]);
  return (
    <BaseSelect.Root
      items={items}
      value={value}
      onValueChange={(next) => next != null && onValueChange(String(next))}
      disabled={disabled}
    >
      <BaseSelect.Trigger data-slot="share-role" aria-label={ariaLabel} className={slots.roleTrigger({ className })}>
        <BaseSelect.Value />
        <Chevron />
      </BaseSelect.Trigger>
      <BaseSelect.Portal>
        <BaseSelect.Positioner
          align="end"
          sideOffset={6}
          alignItemWithTrigger={false}
          className={slots.rolePositioner()}
        >
          <BaseSelect.Popup className={slots.rolePopup()}>
            {roles.map((role) => (
              <BaseSelect.Item key={role.value} value={role.value} className={slots.roleItem()}>
                <BaseSelect.ItemText>{role.label}</BaseSelect.ItemText>
                <BaseSelect.ItemIndicator className={slots.roleCheck()}>
                  <Check />
                </BaseSelect.ItemIndicator>
                {role.description ? <span className={slots.roleDescription()}>{role.description}</span> : null}
              </BaseSelect.Item>
            ))}
          </BaseSelect.Popup>
        </BaseSelect.Positioner>
      </BaseSelect.Portal>
    </BaseSelect.Root>
  );
}
ShareRoleSelect.displayName = 'Share.RoleSelect';

const DEFAULT_ROLES: ShareRole[] = [
  { value: 'viewer', label: 'Viewer' },
  { value: 'editor', label: 'Editor' },
];

export interface ShareInviteProps extends Omit<ComponentProps<'div'>, 'onChange'> {
  /** The roles the field offers. Default Viewer and Editor. Pass `[]` for no role select. */
  roles?: ShareRole[];
  /** The field's placeholder. Default "Add people by email". */
  placeholder?: string;
}

/** The field addresses are typed into, each becoming a chip, with the role select at its end. */
function ShareInvite({
  roles = DEFAULT_ROLES,
  placeholder = 'Add people by email',
  className,
  ...props
}: ShareInviteProps) {
  const { emails, setEmails, draft, setDraft, role, setRole, send, canSend } = useShare('Share.Invite');
  const slots = shareVariants();
  const input = useRef<HTMLInputElement>(null);

  // A role that is not on the list falls back to the first one that is.
  useEffect(() => {
    if (roles.length > 0 && !roles.some((item) => item.value === role)) setRole(roles[0]!.value);
  }, [roles, role, setRole]);

  const commit = (text: string) => {
    const parts = text.split(/[\s,;]+/).filter(Boolean);
    const good = parts.filter(isEmail);
    const bad = parts.filter((part) => !isEmail(part));
    if (good.length > 0) setEmails((current) => [...current, ...good.filter((email) => !current.includes(email))]);
    setDraft(bad.join(' '));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key === 'Enter') {
      event.preventDefault();
      if (draft.trim() === '' && canSend) send();
      else commit(draft);
    } else if ((event.key === ',' || event.key === ' ' || event.key === ';') && isEmail(draft)) {
      event.preventDefault();
      commit(draft);
    } else if (event.key === 'Backspace' && draft === '' && emails.length > 0) {
      event.preventDefault();
      const last = emails[emails.length - 1]!;
      setEmails((current) => current.slice(0, -1));
      setDraft(last);
    }
  };

  return (
    <div
      data-slot="share-invite"
      className={slots.invite({ className })}
      onClick={(event) => {
        if (!(event.target as HTMLElement).closest('button, input')) input.current?.focus();
      }}
      {...props}
    >
      <svg
        className={slots.inviteIcon()}
        viewBox="0 0 24 24"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 7 9 6 9-6" />
      </svg>
      <span className={slots.inviteList()}>
        {emails.map((email) => (
          <span key={email} data-slot="share-chip" className={slots.chip()}>
            <span className={slots.chipText()}>{email}</span>
            <button
              type="button"
              aria-label={`Remove ${email}`}
              className={slots.chipRemove()}
              onClick={() => {
                setEmails((current) => current.filter((item) => item !== email));
                input.current?.focus();
              }}
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.4}
                strokeLinecap="round"
              >
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </span>
        ))}
        <input
          ref={input}
          type="email"
          inputMode="email"
          autoComplete="off"
          spellCheck={false}
          value={draft}
          placeholder={emails.length === 0 ? placeholder : undefined}
          aria-label="Email addresses"
          onChange={(event) => {
            const next = event.target.value;
            // A pasted list is split at once.
            if (/[,;\s]/.test(next) && next.split(/[,;\s]+/).some(isEmail)) commit(next);
            else setDraft(next);
          }}
          onBlur={() => {
            if (isEmail(draft)) commit(draft);
          }}
          onKeyDown={onKeyDown}
          className={slots.input()}
        />
      </span>
      {roles.length > 0 ? (
        <ShareRoleSelect roles={roles} value={role} onValueChange={setRole} aria-label="Role for new people" />
      ) : null}
    </div>
  );
}
ShareInvite.displayName = 'Share.Invite';

export interface SharePeopleProps extends ComponentProps<'div'> {
  /** The heading over the list. Default "People with access"; `null` for none. */
  label?: ReactNode;
}

/** Who already has access, under a small heading. */
function SharePeople({ label = 'People with access', className, children, ...props }: SharePeopleProps) {
  const slots = shareVariants();
  const id = useId();
  return (
    <div data-slot="share-people" className={slots.section({ className })} {...props}>
      {label === null ? null : (
        <div id={id} className={slots.sectionLabel()}>
          {label}
        </div>
      )}
      <ul aria-labelledby={label === null ? undefined : id} className="flex flex-col">
        {children}
      </ul>
    </div>
  );
}
SharePeople.displayName = 'Share.People';

export interface SharePersonProps extends Omit<ComponentProps<'li'>, 'role'> {
  /** Their name. */
  name: string;
  /** A second line, such as their email. */
  description?: ReactNode;
  /** A picture. Without it, the initials show. */
  src?: string;
  /** Their role's `value`, or text for a role that cannot be changed: "Owner". */
  role?: string;
  /** The roles they can be given. With `onRoleChange`, the role becomes a select. */
  roles?: ShareRole[];
  /** Called with the new role's `value`. */
  onRoleChange?: (role: string) => void;
}

/** One person with access: their initials or picture, their name and their role. */
function SharePerson({ name, description, src, role, roles, onRoleChange, className, ...props }: SharePersonProps) {
  const slots = shareVariants();
  const editable = roles && roles.length > 0 && onRoleChange && role !== undefined;
  const label = roles?.find((item) => item.value === role)?.label ?? role;
  return (
    <li data-slot="share-person" className={slots.person({ className })} {...props}>
      <span className={slots.avatar()} aria-hidden="true">
        {src ? <img src={src} alt="" className="size-full object-cover" /> : initials(name)}
      </span>
      <span className={slots.personText()}>
        <span className={slots.personName()}>{name}</span>
        {description ? <span className={slots.personMeta()}>{description}</span> : null}
      </span>
      {editable ? (
        <ShareRoleSelect
          roles={roles}
          value={role}
          onValueChange={onRoleChange}
          aria-label={`Role for ${name}`}
          className="-me-1.5 text-muted-foreground data-popup-open:text-foreground hover:text-foreground"
        />
      ) : label ? (
        <span className={slots.personRole()}>{label}</span>
      ) : null}
    </li>
  );
}
SharePerson.displayName = 'Share.Person';

export interface ShareAccessProps extends Omit<ComponentProps<'div'>, 'title'> {
  /** The line: "Anyone with the link". */
  title: ReactNode;
  /** A line under it: "Can open it without signing in". */
  description?: ReactNode;
  /** The glyph at the start. Default a globe. */
  icon?: ReactNode;
  /** The levels to choose from, such as No access, Can view, Can edit. */
  options: ShareRole[];
  /** The chosen level's `value`. */
  value: string;
  /** Called with the new level's `value`. */
  onValueChange: (value: string) => void;
}

/** Who can open it from the link alone, as a row with a select at its end. */
function ShareAccess({
  title,
  description,
  icon,
  options,
  value,
  onValueChange,
  className,
  ...props
}: ShareAccessProps) {
  const slots = shareVariants();
  return (
    <div data-slot="share-access" className={slots.access({ className })} {...props}>
      <span className={slots.accessIcon()}>
        {icon ?? (
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
          </svg>
        )}
      </span>
      <span className={slots.personText()}>
        <span className="truncate text-sm font-medium">{title}</span>
        {description ? <span className={slots.personMeta()}>{description}</span> : null}
      </span>
      <ShareRoleSelect roles={options} value={value} onValueChange={onValueChange} aria-label="Link access" />
    </div>
  );
}
ShareAccess.displayName = 'Share.Access';

export interface ShareFooterProps extends ComponentProps<'div'> {}

/** The two buttons, as equal pills in the band under the panel, wherever it is written in `Share.Content`. */
function ShareFooter({ className, ...props }: ShareFooterProps) {
  const slots = shareVariants();
  return <div data-slot="share-footer" className={slots.footer({ className })} {...props} />;
}
ShareFooter.displayName = 'Share.Footer';

/** Two labels in one place, one showing: the button keeps the width of the wider. */
function Swap({ show, children }: { show: number; children: ReactNode[] }) {
  const slots = shareVariants();
  return (
    <span className="grid place-items-center">
      {children.map((child, index) => (
        <span
          key={index}
          aria-hidden={index !== show}
          className={slots.buttonLabel({
            className: [
              'col-start-1 row-start-1',
              index === show ? 'translate-y-0 opacity-100 blur-none' : 'opacity-0 blur-[2px]',
              index !== show && (index < show ? '-translate-y-2' : 'translate-y-2'),
            ],
          })}
        >
          {child}
        </span>
      ))}
    </span>
  );
}

export interface ShareCopyLinkProps extends Omit<ComponentProps<'button'>, 'children'> {
  /** The label. Default "Copy link". */
  children?: ReactNode;
  /** The label once copied. Default "Copied". */
  copiedLabel?: ReactNode;
}

/** Copies the root's `link` and says so for a moment. */
function ShareCopyLink({
  children = 'Copy link',
  copiedLabel = 'Copied',
  className,
  onClick,
  ...props
}: ShareCopyLinkProps) {
  const { link, onCopy } = useShare('Share.CopyLink');
  const slots = shareVariants();
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <button
      type="button"
      data-slot="share-copy"
      data-copied={copied || undefined}
      disabled={!link}
      className={slots.button({
        className: [
          'bg-popover text-foreground shadow-xs ring-1 ring-foreground/[0.06] hover:bg-[color-mix(in_oklab,var(--popover),var(--foreground)_5%)] data-copied:text-success-foreground',
          className,
        ],
      })}
      onClick={(event) => {
        onClick?.(event);
        if (!link || event.defaultPrevented) return;
        void navigator.clipboard?.writeText(link).catch(() => {});
        onCopy?.(link);
        setCopied(true);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopied(false), 1600);
      }}
      {...props}
    >
      <Swap show={copied ? 1 : 0}>
        {[
          <>
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1" />
              <path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1" />
            </svg>
            {children}
          </>,
          <>
            <Check />
            {copiedLabel}
          </>,
        ]}
      </Swap>
      <span className="sr-only" aria-live="polite">
        {copied ? 'Link copied' : ''}
      </span>
    </button>
  );
}
ShareCopyLink.displayName = 'Share.CopyLink';

export interface ShareSendProps extends Omit<ComponentProps<'button'>, 'children'> {
  /** The label. Default "Send invite", or "Send N invites" for more than one. */
  children?: ReactNode;
}

/** Sends the invitations through `onInvite`, showing Sending and then Sent in place. */
function ShareSend({ children, className, ...props }: ShareSendProps) {
  const { sendState, send, canSend, emails, draft } = useShare('Share.Send');
  const slots = shareVariants();
  const count = emails.length + (isEmail(draft) && !emails.includes(draft.trim()) ? 1 : 0);
  const label = children ?? (count > 1 ? `Send ${count} invites` : 'Send invite');
  const show = sendState === 'sending' ? 1 : sendState === 'sent' ? 2 : 0;
  return (
    <button
      type="button"
      data-slot="share-send"
      data-state={sendState}
      disabled={!canSend && sendState === 'idle'}
      aria-disabled={sendState !== 'idle' || undefined}
      className={slots.button({
        className: [
          'bg-primary text-primary-foreground shadow-xs inset-shadow-[0_1px_0_rgb(255_255_255/0.12)] hover:bg-primary/90',
          'disabled:bg-[color-mix(in_oklab,var(--primary),var(--popover)_55%)]',
          'data-[state=sent]:bg-success data-[state=sent]:text-white',
          className,
        ],
      })}
      onClick={send}
      {...props}
    >
      <Swap show={show}>
        {[
          <>
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 3 10.5 13.5M21 3l-6.5 18-4-7.5L3 9.5 21 3Z" />
            </svg>
            {label}
          </>,
          <>
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="animate-spin motion-reduce:animate-none"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
            >
              <path d="M12 3a9 9 0 1 0 9 9" />
            </svg>
            Sending
          </>,
          <>
            <Check />
            Sent
          </>,
        ]}
      </Swap>
      <span className="sr-only" aria-live="polite">
        {sendState === 'sending' ? 'Sending invitation' : sendState === 'sent' ? 'Invitation sent' : ''}
      </span>
    </button>
  );
}
ShareSend.displayName = 'Share.Send';

export const Share = Object.assign(ShareRoot, {
  Trigger: ShareTrigger,
  Content: ShareContent,
  Invite: ShareInvite,
  RoleSelect: ShareRoleSelect,
  People: SharePeople,
  Person: SharePerson,
  Access: ShareAccess,
  Footer: ShareFooter,
  CopyLink: ShareCopyLink,
  Send: ShareSend,
});

export {
  ShareTrigger,
  ShareContent,
  ShareInvite,
  ShareRoleSelect,
  SharePeople,
  SharePerson,
  ShareAccess,
  ShareFooter,
  ShareCopyLink,
  ShareSend,
};
