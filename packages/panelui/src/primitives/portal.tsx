import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from 'react';

type PortalMap = ReadonlyMap<string, ReactNode>;

class PortalStore {
  private portals = new Map<string, ReactNode>();
  private snapshot: PortalMap = this.portals;
  private listeners = new Set<() => void>();

  mount = (key: string, node: ReactNode) => {
    this.portals.set(key, node);
    this.emit();
  };

  unmount = (key: string) => {
    this.portals.delete(key);
    this.emit();
  };

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): PortalMap => this.snapshot;

  private emit() {
    this.snapshot = new Map(this.portals);
    this.listeners.forEach((listener) => listener());
  }
}

const PortalContext = createContext<PortalStore | null>(null);

export function PortalProvider({ children }: { children: ReactNode }) {
  const storeRef = useRef<PortalStore | null>(null);
  storeRef.current ??= new PortalStore();
  return (
    <PortalContext.Provider value={storeRef.current}>
      {children}
    </PortalContext.Provider>
  );
}

function usePortalStore(component: string): PortalStore {
  const store = useContext(PortalContext);
  if (!store) {
    throw new Error(`${component} must be used within a <PanelUIProvider>`);
  }
  return store;
}

/** Renders children into the nearest PortalHost (above everything else). */
export function Portal({ children }: { children: ReactNode }) {
  const store = usePortalStore('Portal');
  const key = useId();

  useEffect(() => {
    store.mount(key, children);
    return () => store.unmount(key);
  }, [store, key, children]);

  return null;
}

/** Mount point for portaled content. PanelUIProvider renders one automatically. */
export function PortalHost() {
  const store = usePortalStore('PortalHost');
  const portals = useSyncExternalStore(store.subscribe, store.getSnapshot);

  return (
    <>
      {Array.from(portals.entries(), ([key, node]) => (
        <PortalFragment key={key}>{node}</PortalFragment>
      ))}
    </>
  );
}

function PortalFragment({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
