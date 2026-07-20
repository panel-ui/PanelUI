import { useCallback, useMemo, useState } from 'react';

export interface UseDisclosureOptions {
  defaultOpen?: boolean;
  /** Controlled open state. Pass this to drive it from outside. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export interface UseDisclosureResult {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  /** Spread onto Dialog, BottomSheet or Select. */
  props: { open: boolean; onOpenChange: (open: boolean) => void };
}

/**
 * Open/closed state for an overlay.
 *
 * The same controlled-or-uncontrolled pattern Dialog, BottomSheet and Select
 * implement internally, lifted out for when you need to drive one from
 * elsewhere — closing a sheet after a request settles, say.
 *
 * ```tsx
 * const sheet = useDisclosure();
 * <Button onPress={sheet.open}>Share</Button>
 * <BottomSheet {...sheet.props}>…</BottomSheet>
 * ```
 */
export function useDisclosure({
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
}: UseDisclosureOptions = {}): UseDisclosureResult {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : uncontrolledOpen;

  const setOpen = useCallback(
    (next: boolean) => {
      if (!isControlled) setUncontrolledOpen(next);
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange]
  );

  const open = useCallback(() => setOpen(true), [setOpen]);
  const close = useCallback(() => setOpen(false), [setOpen]);
  const toggle = useCallback(() => setOpen(!isOpen), [setOpen, isOpen]);

  return useMemo(
    () => ({ isOpen, open, close, toggle, props: { open: isOpen, onOpenChange: setOpen } }),
    [isOpen, open, close, toggle, setOpen]
  );
}
