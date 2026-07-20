/**
 * Toast queue.
 *
 * A module-level store rather than React state, so `toast.show()` works from
 * anywhere — event handlers, API clients, code outside the component tree —
 * without threading a context through. The viewport subscribes with
 * `useSyncExternalStore`.
 */
import type { ReactNode } from 'react';

export type ToastVariant = 'default' | 'info' | 'success' | 'warning' | 'destructive';
export type ToastPlacement = 'top' | 'bottom';

/** Handle given to action callbacks so they can dismiss their own toast. */
export interface ToastHandle {
  id: string;
  hide: () => void;
}

export interface ToastOptions {
  variant?: ToastVariant;
  placement?: ToastPlacement;
  /** Title line. */
  label?: string;
  description?: string;
  /** Overrides the variant's default status icon. Pass `null` for no icon. */
  icon?: ReactNode;
  /** Renders a trailing action button when set. */
  actionLabel?: string;
  onActionPress?: (handle: ToastHandle) => void;
  /** Show a close button. Defaults to true when there is no action. */
  closable?: boolean;
  /** Milliseconds before auto-dismiss. `0` keeps it up until dismissed. */
  duration?: number;
  /** Fully custom rendering. Receives the same handle as action callbacks. */
  component?: (handle: ToastHandle) => ReactNode;
}

export interface ToastItem extends ToastOptions {
  id: string;
}

const DEFAULT_DURATION = 4000;

let counter = 0;

class ToastStore {
  private items: ToastItem[] = [];
  private snapshot: readonly ToastItem[] = this.items;
  private listeners = new Set<() => void>();
  private timers = new Map<string, ReturnType<typeof setTimeout>>();

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): readonly ToastItem[] => this.snapshot;

  show = (options: ToastOptions | string): string => {
    const resolved: ToastOptions =
      typeof options === 'string' ? { label: options } : options;
    const id = `toast-${++counter}`;

    this.items = [...this.items, { ...resolved, id }];
    this.emit();

    const duration = resolved.duration ?? DEFAULT_DURATION;
    if (duration > 0) {
      this.timers.set(
        id,
        setTimeout(() => this.hide(id), duration)
      );
    }

    return id;
  };

  hide = (id: string) => {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
    if (!this.items.some((item) => item.id === id)) return;
    this.items = this.items.filter((item) => item.id !== id);
    this.emit();
  };

  hideAll = () => {
    this.timers.forEach(clearTimeout);
    this.timers.clear();
    if (this.items.length === 0) return;
    this.items = [];
    this.emit();
  };

  private emit() {
    this.snapshot = this.items;
    this.listeners.forEach((listener) => listener());
  }
}

export const toastStore = new ToastStore();

/**
 * Imperative toast API. Also returned from `useToast()`.
 *
 * ```ts
 * toast.show('Saved');
 * toast.show({ variant: 'success', label: 'Deployed', actionLabel: 'View' });
 * ```
 */
export const toast = {
  show: toastStore.show,
  hide: toastStore.hide,
  hideAll: toastStore.hideAll,
};
