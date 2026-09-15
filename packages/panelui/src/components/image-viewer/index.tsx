/**
 * ImageViewer — a picture that opens out of the page to fill the screen.
 *
 * Pressing a trigger lifts its image from where it sits, grows it to the whole
 * picture in the middle of the screen, and blurs the page behind it. From there
 * it can be pinched and double-tapped to zoom, swiped sideways to the next
 * image under the same root, and dragged away to put it back.
 *
 * ```tsx
 * <ImageViewer>
 *   {photos.map((photo) => (
 *     <ImageViewer.Trigger
 *       key={photo.id}
 *       source={photo.source}
 *       alt={photo.alt}
 *       radius={12}
 *       className="h-40 flex-1 rounded-xl"
 *     />
 *   ))}
 * </ImageViewer>
 * ```
 *
 * ## The image travels; nothing appears
 *
 * The viewer never fades a second copy of the picture in over the first. The
 * thumbnail is hidden and the same image is drawn in a frame that starts at the
 * thumbnail's exact rectangle and corner radius and ends at the fitted one. The
 * picture inside that frame is always drawn at the size that *covers* it, so the
 * crop a thumbnail shows opens out into the whole image as the frame grows — and
 * closes back into the crop on the way home. That continuity is the point: the
 * picture on screen is the one that was pressed, not a picture of it.
 *
 * The frame animates its bounds rather than a transform, because a transform
 * cannot change a crop. It is one view with one child, so the layout pass it
 * costs per frame is small.
 *
 * ## Every trigger under one root is a page
 *
 * Triggers register themselves with the root as they mount, in render order or
 * by an explicit `index`. Opening one opens the gallery at its page, and the
 * thumbnail hidden underneath follows the page — close on the third image and it
 * flies back into the third thumbnail.
 *
 * ## One gesture surface, decided at the start
 *
 * Pinching, panning a zoomed image, turning the page and dragging to dismiss all
 * begin as a one- or two-finger drag, and which one it is gets decided the
 * moment it starts: two fingers zoom, one finger on a zoomed image pans it, one
 * finger moving sideways across a gallery turns the page, and anything else
 * drags the image away. Deciding once keeps a drag from changing its mind
 * halfway, which is what makes a viewer feel loose.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  type AccessibilityActionEvent,
  type ImageSourcePropType,
  type LayoutChangeEvent,
  type PressableProps,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  runOnJS,
  runOnUI,
  useAnimatedProps,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withDecay,
  withDelay,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCSSVariable } from 'uniwind';
import { XIcon } from '../../icons';
import { useControllableState } from '../../primitives/controllable-state';
import { ModalPortal } from '../../primitives/portal';
import { Scrim } from '../../primitives/scrim';
import { Text, textChildren } from '../../primitives/text';
import { useBackHandler } from '../../hooks/use-back-handler';
import { useThemeMode } from '../../theme/use-theme';
import { cn } from '../../utils/cn';
import { selectionTick } from '../../utils/haptics';
import {
  clamp,
  coverSize,
  dragFade,
  dragScale,
  fitWithin,
  focalTranslation,
  hitsRect,
  lerp,
  lerpRect,
  panBound,
  rubberBandClamp,
  shouldDismiss,
  snapPage,
  type Rect,
  type Size,
} from './image-viewer-geometry';

/** Space between two pages of a gallery, so a page turn reads as two pictures. */
const PAGE_GAP = 16;

/**
 * Out of the page. Just short of critically damped: enough give that the
 * picture seems to arrive rather than stop, not enough to wobble.
 */
const OPEN_SPRING = { damping: 30, stiffness: 260, mass: 1 } as const;

/**
 * Back into the page. Clamped, because a frame that overshoots its thumbnail
 * shrinks past it and grows back — a visible bounce at the one moment the image
 * is supposed to be settling into place.
 */
const CLOSE_SPRING = { damping: 32, stiffness: 300, mass: 1, overshootClamping: true } as const;

/** Zoom settling and page turns. Firm, so a flick lands without drifting. */
const SETTLE_SPRING = { damping: 34, stiffness: 320, mass: 1 } as const;

/**
 * Margin between the open picture and the screen, in points. Enough to show the
 * blur on all four sides, so the picture reads as held up over the page rather
 * than as a new screen that happens to be a photograph.
 */
const DEFAULT_INSET = 16;

/** Corners of the open picture, matching the library's large surfaces. */
const DEFAULT_CORNER_RADIUS = 16;

/** How strongly the blur comes up behind the picture. */
const BLUR_INTENSITY = 50;

const PHASE_OPENING = 0;
const PHASE_OPEN = 1;
const PHASE_CLOSING = 2;

const MODE_NONE = 0;
const MODE_PAN = 1;
const MODE_PAGE = 2;
const MODE_DISMISS = 3;

/* -------------------------------------------------------------------------- */
/* Registry                                                                   */
/* -------------------------------------------------------------------------- */

interface ViewerItem {
  id: string;
  order: number;
  index?: number;
  source: ImageSourcePropType;
  fullSource?: ImageSourcePropType;
  alt?: string;
  caption?: ReactNode;
  radius: number;
  size: Size | null;
  measure: (done: (rect: Rect | null) => void) => void;
}

/**
 * The triggers under one root, in page order.
 *
 * An external store rather than state on the root, because a trigger updating
 * its caption should re-render the open viewer and nothing else — root state
 * would re-render every trigger, which would register again, which would
 * re-render the root.
 */
class ViewerStore {
  private items = new Map<string, ViewerItem>();
  private listeners = new Set<() => void>();
  private counter = 0;
  private version = 0;
  private sorted: ViewerItem[] = [];

  nextOrder = () => this.counter++;

  set = (item: ViewerItem) => {
    this.items.set(item.id, item);
    this.emit();
  };

  delete = (id: string) => {
    if (this.items.delete(id)) this.emit();
  };

  list = (): ViewerItem[] => this.sorted;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = () => this.version;

  private emit() {
    this.version += 1;
    this.sorted = [...this.items.values()].sort(
      (a, b) => (a.index ?? a.order) - (b.index ?? b.order)
    );
    this.listeners.forEach((listener) => listener());
  }
}

interface ViewerContextValue {
  store: ViewerStore;
  /** The trigger whose picture is out on the screen, and so hidden in the page. */
  hiddenId: string | null;
  openItem: (id: string) => void;
}

const ViewerContext = createContext<ViewerContextValue | null>(null);

function useViewer(part: string): ViewerContextValue {
  const context = useContext(ViewerContext);
  if (!context) throw new Error(`${part} must be used inside <ImageViewer>.`);
  return context;
}

/* -------------------------------------------------------------------------- */
/* Root                                                                       */
/* -------------------------------------------------------------------------- */

export interface ImageViewerProps {
  children?: ReactNode;
  /** Controlled open state. */
  open?: boolean;
  /** Initial open state when uncontrolled. */
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Controlled page — which trigger's image is showing, in page order. */
  index?: number;
  /** Initial page when uncontrolled. */
  defaultIndex?: number;
  onIndexChange?: (index: number) => void;
  /**
   * Blur the page behind the picture. Needs the optional `expo-blur`, and dims
   * instead without it. Reduce Transparency draws an opaque backdrop.
   */
  blur?: boolean;
  /** How far a pinch can zoom in, as a multiple of the fitted size. */
  maxScale?: number;
  /** Where a double tap zooms to, as a multiple of the fitted size. */
  doubleTapScale?: number;
  /** Tick as a drag to dismiss begins. Needs the optional `expo-haptics`. */
  haptics?: boolean;
  /** Draw the close button. Tapping outside the picture and dragging it away still close it. */
  showClose?: boolean;
  /** Read out for the close button. */
  closeLabel?: string;
  /**
   * Space kept between the open picture and the edges of the screen, in points.
   * Measured from the safe area at the top and bottom, and the larger of the
   * two is used for both, so the picture stays centred. `0` fills the screen.
   */
  inset?: number;
  /**
   * Corner radius of the open picture, in points. The corners stay this size on
   * screen while the picture is zoomed or dragged. `0` squares them.
   */
  cornerRadius?: number;
}

function ImageViewerRoot({
  children,
  open,
  defaultOpen = false,
  onOpenChange,
  index,
  defaultIndex = 0,
  onIndexChange,
  blur = true,
  maxScale = 4,
  doubleTapScale = 2.5,
  haptics = true,
  showClose = true,
  closeLabel = 'Close',
  inset = DEFAULT_INSET,
  cornerRadius = DEFAULT_CORNER_RADIUS,
}: ImageViewerProps) {
  const storeRef = useRef<ViewerStore | null>(null);
  storeRef.current ??= new ViewerStore();
  const store = storeRef.current;

  const { value: isOpen, setValue: setOpen } = useControllableState({
    value: open,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });
  const { value: page, setValue: setPage } = useControllableState({
    value: index,
    defaultValue: defaultIndex,
    onChange: onIndexChange,
  });

  // Mounted from the moment it opens until the picture is back in the page,
  // which is after `open` has already gone false.
  const [mounted, setMounted] = useState(isOpen);
  if (isOpen && !mounted) setMounted(true);
  const [hiddenId, setHiddenId] = useState<string | null>(null);

  const openItem = useCallback(
    (id: string) => {
      const at = store.list().findIndex((item) => item.id === id);
      if (at < 0) return;
      setPage(at);
      setOpen(true);
    },
    [setOpen, setPage, store]
  );

  const requestClose = useCallback(() => setOpen(false), [setOpen]);
  const exited = useCallback(() => {
    setMounted(false);
    setHiddenId(null);
  }, []);

  useBackHandler(isOpen, requestClose);

  const context = useMemo<ViewerContextValue>(
    () => ({ store, hiddenId, openItem }),
    [store, hiddenId, openItem]
  );

  return (
    <ViewerContext.Provider value={context}>
      {children}
      {mounted ? (
        <ModalPortal>
          <ViewerOverlay
            store={store}
            open={isOpen}
            index={page}
            onIndexChange={setPage}
            onRequestClose={requestClose}
            onExited={exited}
            onShow={setHiddenId}
            blur={blur}
            maxScale={maxScale}
            doubleTapScale={doubleTapScale}
            haptics={haptics}
            showClose={showClose}
            closeLabel={closeLabel}
            inset={inset}
            cornerRadius={cornerRadius}
          />
        </ModalPortal>
      ) : null}
    </ViewerContext.Provider>
  );
}

/* -------------------------------------------------------------------------- */
/* Trigger                                                                    */
/* -------------------------------------------------------------------------- */

export interface ImageViewerTriggerProps
  extends Omit<PressableProps, 'children' | 'style' | 'disabled'> {
  /**
   * Classes on the pressable. Without `children` the image fills it, so give it
   * a size — `h-48 w-full`, `aspect-square flex-1`.
   */
  className?: string;
  /** The picture. Shown in the page and, until `fullSource` loads, in the viewer. */
  source: ImageSourcePropType;
  /**
   * A larger copy to show once the viewer is open. It loads when the viewer
   * opens and replaces `source` when it arrives, so a feed can carry thumbnails.
   */
  fullSource?: ImageSourcePropType;
  /** Described for a screen reader, on the trigger and in the viewer. */
  alt?: string;
  /** Shown under the picture while it is open. A string is set as text. */
  caption?: ReactNode;
  /** Page order within the root. Render order when left out. */
  index?: number;
  /**
   * The corner radius the picture has in the page, in points, so the flight
   * starts from the same shape. Match it to the `rounded-*` class you gave the
   * trigger — a class cannot be read back.
   */
  radius?: number;
  /**
   * The image's own width and height, when known. Saves looking it up, and is
   * the only way the viewer knows the proportions before a remote image loads.
   */
  width?: number;
  height?: number;
  /** Nothing opens, and the press is not reported. */
  disabled?: boolean;
  /**
   * Draw the picture yourself — a `Post.Media`, a card. It should show `source`
   * cropped to fill, the way the viewer's own flight starts. Left out, the
   * trigger draws `source` to fill its box.
   */
  children?: ReactNode;
}

/** The image's proportions from what can be known without loading it. */
function knownSize(source: ImageSourcePropType, width?: number, height?: number): Size | null {
  if (width && height) return { width, height };
  if (typeof source === 'number') {
    const asset = Image.resolveAssetSource(source);
    if (asset?.width && asset?.height) return { width: asset.width, height: asset.height };
  }
  return null;
}

function uriOf(source: ImageSourcePropType): string | undefined {
  if (source && typeof source === 'object' && !Array.isArray(source)) {
    return (source as { uri?: string }).uri;
  }
  return undefined;
}

/**
 * The thing pressed to open the viewer.
 *
 * It registers its picture with the root, so the gallery is simply every
 * trigger under that root. While its picture is out on the screen it is drawn
 * transparent — not removed, so the page does not reflow under the blur and the
 * flight home has somewhere to land.
 */
function ImageViewerTrigger({
  className,
  source,
  fullSource,
  alt,
  caption,
  index,
  radius = 0,
  width,
  height,
  disabled = false,
  children,
  onPress,
  onLayout,
  ...props
}: ImageViewerTriggerProps) {
  const { store, hiddenId, openItem } = useViewer('ImageViewer.Trigger');
  const id = useId();
  const ref = useRef<View>(null);
  const orderRef = useRef<number | null>(null);
  orderRef.current ??= store.nextOrder();

  const [size, setSize] = useState<Size | null>(() => knownSize(source, width, height));
  const [box, setBox] = useState<Size | null>(null);
  const uri = uriOf(source);

  useEffect(() => {
    const known = knownSize(source, width, height);
    if (known) {
      setSize(known);
      return;
    }
    if (!uri) return;
    let live = true;
    Image.getSize(
      uri,
      (w, h) => {
        if (live) setSize({ width: w, height: h });
      },
      () => {}
    );
    return () => {
      live = false;
    };
    // `source` is compared through its uri; an inline `{ uri }` is new every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uri, width, height]);

  const measure = useCallback((done: (rect: Rect | null) => void) => {
    const node = ref.current;
    if (!node) {
      done(null);
      return;
    }
    node.measureInWindow((x, y, w, h) => {
      done(w > 0 && h > 0 ? { x, y, width: w, height: h } : null);
    });
  }, []);

  useLayoutEffect(() => {
    store.set({
      id,
      order: orderRef.current ?? 0,
      index,
      source,
      fullSource,
      alt,
      caption,
      radius,
      // The box's own proportions stand in until the image's are known, which
      // is right for a thumbnail that shows the picture uncropped and close
      // enough for one that does not.
      size: size ?? box,
      measure,
    });
  }, [store, id, index, source, fullSource, alt, caption, radius, size, box, measure]);

  useLayoutEffect(() => () => store.delete(id), [store, id]);

  const handleLayout = (event: LayoutChangeEvent) => {
    onLayout?.(event);
    const { width: w, height: h } = event.nativeEvent.layout;
    if (w > 0 && h > 0) setBox({ width: w, height: h });
  };

  return (
    <Pressable
      ref={ref}
      collapsable={false}
      accessibilityRole="imagebutton"
      accessibilityLabel={alt}
      accessibilityHint="Opens the image"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={(event) => {
        onPress?.(event);
        openItem(id);
      }}
      onLayout={handleLayout}
      className={cn('overflow-hidden', className)}
      style={[radius ? { borderRadius: radius } : null, { opacity: hiddenId === id ? 0 : 1 }]}
      {...props}
    >
      {children ?? (
        <Image
          source={source}
          resizeMode="cover"
          accessible={false}
          onLoad={(event) => {
            if (size) return;
            const loaded = event.nativeEvent.source;
            if (loaded?.width && loaded?.height) {
              setSize({ width: loaded.width, height: loaded.height });
            }
          }}
          style={StyleSheet.absoluteFill}
        />
      )}
    </Pressable>
  );
}

/* -------------------------------------------------------------------------- */
/* Overlay                                                                    */
/* -------------------------------------------------------------------------- */

interface ViewerOverlayProps {
  store: ViewerStore;
  open: boolean;
  index: number;
  onIndexChange: (index: number) => void;
  onRequestClose: () => void;
  onExited: () => void;
  onShow: (id: string | null) => void;
  blur: boolean;
  maxScale: number;
  doubleTapScale: number;
  haptics: boolean;
  showClose: boolean;
  closeLabel: string;
  inset: number;
  cornerRadius: number;
}

function ViewerOverlay({
  store,
  open,
  index,
  onIndexChange,
  onRequestClose,
  onExited,
  onShow,
  blur,
  maxScale,
  doubleTapScale,
  haptics,
  showClose,
  closeLabel,
  inset,
  cornerRadius,
}: ViewerOverlayProps) {
  const version = useSyncExternalStore(store.subscribe, store.getSnapshot);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const items = useMemo(() => store.list(), [store, version]);
  const count = items.length;
  const page = count ? clamp(index, 0, count - 1) : 0;
  const item = items[page];

  const { width: W, height: H } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const { mode } = useThemeMode();
  const foreground = useCSSVariable('--color-foreground');
  const pageWidth = W + PAGE_GAP;

  /*
   * The area the picture is fitted into. The same margin on both sides of each
   * axis, so the fitted picture is centred on the screen — the zoom and pan
   * arithmetic is measured from the screen's centre and relies on that.
   */
  const box = useMemo<Rect>(() => {
    const vertical = Math.max(insets.top, insets.bottom) + inset;
    return {
      x: inset,
      y: vertical,
      width: Math.max(W - inset * 2, 1),
      height: Math.max(H - vertical * 2, 1),
    };
  }, [H, W, inset, insets.bottom, insets.top]);

  const fit = useMemo(
    () => fitWithin(item?.size ?? box, box),
    [item?.size, box]
  );

  // The flight, 0 in the page and 1 on the screen.
  const t = useSharedValue(0);
  const phase = useSharedValue(PHASE_OPENING);
  const origin = useSharedValue<Rect | null>(null);
  const radius = useSharedValue(0);

  // Zoom of the current page, measured from the screen's centre.
  const scale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const startScale = useSharedValue(1);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const focalOffsetX = useSharedValue(0);
  const focalOffsetY = useSharedValue(0);
  const lastFocalX = useSharedValue(0);
  const lastFocalY = useSharedValue(0);
  const pinching = useSharedValue(false);

  // Dragging the picture away.
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const shrink = useSharedValue(1);
  const fade = useSharedValue(1);

  // The gallery.
  const pagerX = useSharedValue(-page * pageWidth);
  const pagerStart = useSharedValue(0);
  const activePage = useSharedValue(page);

  const gestureMode = useSharedValue(MODE_NONE);
  const chrome = useSharedValue(0);
  const chromeOn = useSharedValue(true);

  const backdrop = useDerivedValue(() => clamp(t.value, 0, 1) * fade.value);

  const itemRef = useRef(item);
  itemRef.current = item;

  /**
   * Where the current page's thumbnail is now. Measured again on every page
   * change and before every close, because the flight home has to land where
   * the thumbnail actually is. A thumbnail that has left the screen gives no
   * rectangle, and the picture fades instead of flying somewhere invisible.
   */
  const measureCurrent = useCallback(
    (then?: () => void) => {
      const current = itemRef.current;
      if (!current) {
        origin.value = null;
        then?.();
        return;
      }
      current.measure((rect) => {
        const onScreen =
          rect !== null &&
          rect.y + rect.height > 0 &&
          rect.y < H &&
          rect.x + rect.width > 0 &&
          rect.x < W;
        origin.value = onScreen ? rect : null;
        radius.value = current.radius;
        then?.();
      });
    },
    [H, W, origin, radius]
  );

  const startClose = useCallback(
    (velocityX: number, velocityY: number) => {
      'worklet';
      phase.value = PHASE_CLOSING;
      gestureMode.value = MODE_NONE;
      chrome.value = withTiming(0, { duration: 120 });
      const done = (finished?: boolean) => {
        'worklet';
        if (finished && phase.value === PHASE_CLOSING) runOnJS(onExited)();
      };
      if (reduced) {
        t.value = withTiming(0, { duration: 180 }, done);
        return;
      }
      t.value = withSpring(0, CLOSE_SPRING, done);
      dragX.value = withSpring(0, { ...CLOSE_SPRING, velocity: velocityX });
      dragY.value = withSpring(0, { ...CLOSE_SPRING, velocity: velocityY });
      shrink.value = withSpring(1, CLOSE_SPRING);
      scale.value = withSpring(1, CLOSE_SPRING);
      tx.value = withSpring(0, CLOSE_SPRING);
      ty.value = withSpring(0, CLOSE_SPRING);
    },
    [chrome, dragX, dragY, gestureMode, onExited, phase, reduced, scale, shrink, t, tx, ty]
  );

  const settleOpen = useCallback(() => {
    phase.value = PHASE_OPENING;
    const done = (finished?: boolean) => {
      'worklet';
      if (finished) phase.value = PHASE_OPEN;
    };
    t.value = reduced ? withTiming(1, { duration: 200 }, done) : withSpring(1, OPEN_SPRING, done);
    fade.value = withTiming(1, { duration: 150 });
    chrome.value = withDelay(120, withTiming(chromeOn.value ? 1 : 0, { duration: 200 }));
  }, [chrome, chromeOn, fade, phase, reduced, t]);

  // Opening and closing follow `open`, whoever changed it.
  const hasOpened = useRef(false);
  useEffect(() => {
    if (!itemRef.current) {
      onRequestClose();
      onExited();
      return;
    }
    if (open) {
      if (hasOpened.current) {
        settleOpen();
        return;
      }
      hasOpened.current = true;
      activePage.value = page;
      pagerX.value = -page * pageWidth;
      measureCurrent(() => {
        onShow(itemRef.current?.id ?? null);
        settleOpen();
      });
      return;
    }
    // A gesture that closed the viewer has already started the flight home.
    if (phase.value === PHASE_CLOSING) return;
    measureCurrent(() => runOnUI(startClose)(0, 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // A page change from anywhere: the pager, the accessibility actions, or the owner.
  const firstPage = useRef(true);
  useEffect(() => {
    if (firstPage.current) {
      firstPage.current = false;
      return;
    }
    if (!itemRef.current) return;
    if (activePage.value !== page) {
      activePage.value = page;
      scale.value = 1;
      tx.value = 0;
      ty.value = 0;
      pagerX.value = reduced
        ? -page * pageWidth
        : withSpring(-page * pageWidth, SETTLE_SPRING);
    }
    measureCurrent();
    onShow(itemRef.current.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // A rotation re-fits everything, and a zoom that no longer means anything goes.
  const firstSize = useRef(true);
  useEffect(() => {
    if (firstSize.current) {
      firstSize.current = false;
      return;
    }
    cancelAnimation(pagerX);
    pagerX.value = -activePage.value * pageWidth;
    scale.value = 1;
    tx.value = 0;
    ty.value = 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [W, H]);

  const settleZoom = useCallback(() => {
    'worklet';
    const target = clamp(scale.value, 1, maxScale);
    if (target <= 1.01) {
      scale.value = withSpring(1, SETTLE_SPRING);
      tx.value = withSpring(0, SETTLE_SPRING);
      ty.value = withSpring(0, SETTLE_SPRING);
      chrome.value = withTiming(chromeOn.value ? 1 : 0, { duration: 180 });
      return;
    }
    const nextX =
      target === scale.value
        ? tx.value
        : focalTranslation(lastFocalX.value, focalOffsetX.value, startScale.value, target);
    const nextY =
      target === scale.value
        ? ty.value
        : focalTranslation(lastFocalY.value, focalOffsetY.value, startScale.value, target);
    const boundX = panBound(fit.width, target, W);
    const boundY = panBound(fit.height, target, H);
    scale.value = withSpring(target, SETTLE_SPRING);
    tx.value = withSpring(clamp(nextX, -boundX, boundX), SETTLE_SPRING);
    ty.value = withSpring(clamp(nextY, -boundY, boundY), SETTLE_SPRING);
  }, [
    H,
    W,
    chrome,
    chromeOn,
    fit.height,
    fit.width,
    focalOffsetX,
    focalOffsetY,
    lastFocalX,
    lastFocalY,
    maxScale,
    scale,
    startScale,
    tx,
    ty,
  ]);

  const gesture = useMemo(() => {
    const pinch = Gesture.Pinch()
      .onStart((event) => {
        'worklet';
        if (phase.value !== PHASE_OPEN) return;
        pinching.value = true;
        cancelAnimation(scale);
        cancelAnimation(tx);
        cancelAnimation(ty);
        startScale.value = scale.value;
        lastFocalX.value = event.focalX - W / 2;
        lastFocalY.value = event.focalY - H / 2;
        focalOffsetX.value = lastFocalX.value - tx.value;
        focalOffsetY.value = lastFocalY.value - ty.value;
        chrome.value = withTiming(0, { duration: 120 });
      })
      .onUpdate((event) => {
        'worklet';
        if (!pinching.value) return;
        const next = rubberBandClamp(startScale.value * event.scale, 1, maxScale, maxScale);
        lastFocalX.value = event.focalX - W / 2;
        lastFocalY.value = event.focalY - H / 2;
        scale.value = next;
        tx.value = focalTranslation(lastFocalX.value, focalOffsetX.value, startScale.value, next);
        ty.value = focalTranslation(lastFocalY.value, focalOffsetY.value, startScale.value, next);
      })
      .onEnd(() => {
        'worklet';
        if (!pinching.value) return;
        pinching.value = false;
        settleZoom();
      });

    const pan = Gesture.Pan()
      .maxPointers(1)
      .minDistance(8)
      .onStart((event) => {
        'worklet';
        if (phase.value !== PHASE_OPEN || pinching.value) {
          gestureMode.value = MODE_NONE;
          return;
        }
        if (scale.value > 1.01) {
          gestureMode.value = MODE_PAN;
          cancelAnimation(tx);
          cancelAnimation(ty);
          startX.value = tx.value;
          startY.value = ty.value;
          return;
        }
        if (count > 1 && Math.abs(event.translationX) > Math.abs(event.translationY)) {
          gestureMode.value = MODE_PAGE;
          cancelAnimation(pagerX);
          pagerStart.value = pagerX.value;
          return;
        }
        gestureMode.value = MODE_DISMISS;
        chrome.value = withTiming(0, { duration: 120 });
        if (haptics) runOnJS(selectionTick)();
      })
      .onUpdate((event) => {
        'worklet';
        if (gestureMode.value === MODE_PAN) {
          const boundX = panBound(fit.width, scale.value, W);
          const boundY = panBound(fit.height, scale.value, H);
          tx.value = rubberBandClamp(startX.value + event.translationX, -boundX, boundX, W);
          ty.value = rubberBandClamp(startY.value + event.translationY, -boundY, boundY, H);
        } else if (gestureMode.value === MODE_PAGE) {
          pagerX.value = rubberBandClamp(
            pagerStart.value + event.translationX,
            -(count - 1) * pageWidth,
            0,
            W
          );
        } else if (gestureMode.value === MODE_DISMISS) {
          dragX.value = event.translationX;
          dragY.value = event.translationY;
          shrink.value = dragScale(event.translationY, H);
          fade.value = dragFade(event.translationY, H);
        }
      })
      .onEnd((event, success) => {
        'worklet';
        const current = gestureMode.value;
        gestureMode.value = MODE_NONE;
        if (current === MODE_PAN) {
          const boundX = panBound(fit.width, scale.value, W);
          const boundY = panBound(fit.height, scale.value, H);
          if (boundX === 0 || Math.abs(tx.value) > boundX) {
            tx.value = withSpring(clamp(tx.value, -boundX, boundX), SETTLE_SPRING);
          } else {
            tx.value = withDecay({ velocity: event.velocityX, clamp: [-boundX, boundX] });
          }
          if (boundY === 0 || Math.abs(ty.value) > boundY) {
            ty.value = withSpring(clamp(ty.value, -boundY, boundY), SETTLE_SPRING);
          } else {
            ty.value = withDecay({ velocity: event.velocityY, clamp: [-boundY, boundY] });
          }
        } else if (current === MODE_PAGE) {
          const target = snapPage(pagerX.value, event.velocityX, activePage.value, count, pageWidth);
          pagerX.value = withSpring(-target * pageWidth, {
            ...SETTLE_SPRING,
            velocity: event.velocityX,
          });
          if (target !== activePage.value) {
            activePage.value = target;
            runOnJS(onIndexChange)(target);
          }
        } else if (current === MODE_DISMISS) {
          if (success && shouldDismiss(event.translationY, event.velocityY)) {
            startClose(event.velocityX, event.velocityY);
            runOnJS(onRequestClose)();
            return;
          }
          dragX.value = withSpring(0, SETTLE_SPRING);
          dragY.value = withSpring(0, SETTLE_SPRING);
          shrink.value = withSpring(1, SETTLE_SPRING);
          fade.value = withTiming(1, { duration: 180 });
          chrome.value = withTiming(chromeOn.value ? 1 : 0, { duration: 180 });
        }
      });

    const doubleTap = Gesture.Tap()
      .numberOfTaps(2)
      .maxDelay(250)
      .maxDistance(24)
      .onEnd((event, success) => {
        'worklet';
        if (!success || phase.value !== PHASE_OPEN) return;
        if (scale.value > 1.01) {
          scale.value = withSpring(1, SETTLE_SPRING);
          tx.value = withSpring(0, SETTLE_SPRING);
          ty.value = withSpring(0, SETTLE_SPRING);
          chrome.value = withTiming(chromeOn.value ? 1 : 0, { duration: 180 });
          return;
        }
        const target = Math.min(doubleTapScale, maxScale);
        const focalX = event.x - W / 2;
        const focalY = event.y - H / 2;
        const boundX = panBound(fit.width, target, W);
        const boundY = panBound(fit.height, target, H);
        scale.value = withSpring(target, SETTLE_SPRING);
        tx.value = withSpring(
          clamp(focalTranslation(focalX, focalX, 1, target), -boundX, boundX),
          SETTLE_SPRING
        );
        ty.value = withSpring(
          clamp(focalTranslation(focalY, focalY, 1, target), -boundY, boundY),
          SETTLE_SPRING
        );
        chrome.value = withTiming(0, { duration: 120 });
      });

    const singleTap = Gesture.Tap()
      .maxDistance(10)
      .onEnd((event, success) => {
        'worklet';
        if (!success || phase.value !== PHASE_OPEN) return;
        const onImage = hitsRect(event.x, event.y, fit, scale.value, tx.value, ty.value);
        if (!onImage) {
          startClose(0, 0);
          runOnJS(onRequestClose)();
          return;
        }
        chromeOn.value = !chromeOn.value;
        chrome.value = withTiming(chromeOn.value ? 1 : 0, { duration: 180 });
      });

    return Gesture.Race(
      Gesture.Simultaneous(pinch, pan),
      Gesture.Exclusive(doubleTap, singleTap)
    );
  }, [
    H,
    W,
    activePage,
    chrome,
    chromeOn,
    count,
    doubleTapScale,
    dragX,
    dragY,
    fade,
    fit,
    focalOffsetX,
    focalOffsetY,
    gestureMode,
    haptics,
    lastFocalX,
    lastFocalY,
    maxScale,
    onIndexChange,
    onRequestClose,
    pageWidth,
    pagerStart,
    pagerX,
    phase,
    pinching,
    scale,
    settleZoom,
    shrink,
    startClose,
    startScale,
    startX,
    startY,
    tx,
    ty,
  ]);

  const pagerStyle = useAnimatedStyle(() => ({ transform: [{ translateX: pagerX.value }] }));

  const chromeStyle = useAnimatedStyle(() => ({
    opacity: chrome.value * clamp(t.value, 0, 1) * fade.value,
  }));
  const chromeProps = useAnimatedProps(() => ({
    pointerEvents: (chrome.value > 0.5 ? 'box-none' : 'none') as 'box-none' | 'none',
  }));

  const onAccessibilityAction = (event: AccessibilityActionEvent) => {
    const name = event.nativeEvent.actionName;
    if (name === 'increment' && page < count - 1) onIndexChange(page + 1);
    else if (name === 'decrement' && page > 0) onIndexChange(page - 1);
    else if (name === 'escape' || name === 'magicTap') onRequestClose();
  };

  if (!item) return null;

  const visiblePages = items
    .map((entry, at) => ({ entry, at }))
    .filter(({ at }) => Math.abs(at - page) <= 1);

  const iconColour = typeof foreground === 'string' ? foreground : '#0a0a0a';
  const caption = item.caption;

  return (
    <View
      style={StyleSheet.absoluteFill}
      accessibilityViewIsModal
      onAccessibilityEscape={onRequestClose}
    >
      <Scrim
        blur={blur}
        progress={backdrop}
        intensity={BLUR_INTENSITY}
        tint={mode === 'dark' ? 'dark' : 'light'}
        dimClassName="bg-black/60"
        pointerEvents="none"
      />

      <GestureDetector gesture={gesture}>
        <View
          style={StyleSheet.absoluteFill}
          collapsable={false}
          accessible
          accessibilityRole={count > 1 ? 'adjustable' : 'image'}
          accessibilityLabel={item.alt}
          accessibilityValue={count > 1 ? { text: `${page + 1} of ${count}` } : undefined}
          accessibilityActions={[
            ...(count > 1 ? [{ name: 'increment' }, { name: 'decrement' }] : []),
            { name: 'escape' },
            { name: 'magicTap' },
          ]}
          onAccessibilityAction={onAccessibilityAction}
        >
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, pagerStyle]}>
            {visiblePages.map(({ entry, at }) => (
              <ViewerPage
                key={entry.id}
                item={entry}
                at={at}
                left={at * pageWidth}
                viewport={{ width: W, height: H }}
                box={box}
                cornerRadius={cornerRadius}
                reduced={reduced}
                activePage={activePage}
                t={t}
                origin={origin}
                radius={radius}
                scale={scale}
                tx={tx}
                ty={ty}
                dragX={dragX}
                dragY={dragY}
                shrink={shrink}
              />
            ))}
          </Animated.View>
        </View>
      </GestureDetector>

      <Animated.View
        style={[StyleSheet.absoluteFill, chromeStyle]}
        animatedProps={chromeProps}
      >
        <View
          pointerEvents="box-none"
          className="absolute inset-x-4 flex-row items-center justify-between"
          style={{ top: insets.top + 8 }}
        >
          {/* Close at the leading edge, where the platform puts the way out of
              a full-screen view — and clear of the trailing corner, where an
              app's own floating controls tend to live. */}
          {showClose ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={closeLabel}
              hitSlop={8}
              onPress={onRequestClose}
              className="h-10 w-10 items-center justify-center rounded-full bg-background/80"
            >
              <XIcon size={18} color={iconColour} />
            </Pressable>
          ) : (
            <View className="h-10 w-10" />
          )}
          {count > 1 ? (
            <View
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              className="rounded-full bg-background/80 px-3 py-1.5"
            >
              <Text size="sm" weight="medium" className="tabular-nums text-foreground">
                {`${page + 1} of ${count}`}
              </Text>
            </View>
          ) : null}
          <View className="h-10 w-10" />
        </View>

        {caption !== undefined && caption !== null ? (
          <View
            pointerEvents="box-none"
            className="absolute inset-x-4 rounded-2xl bg-background/80 px-4 py-3"
            style={{ bottom: insets.bottom + 16 }}
          >
            {textChildren(caption, (text) => (
              <Text size="sm" className="text-foreground">
                {text}
              </Text>
            ))}
          </View>
        ) : null}
      </Animated.View>
    </View>
  );
}

interface ViewerPageProps {
  item: ViewerItem;
  at: number;
  left: number;
  viewport: Size;
  box: Rect;
  cornerRadius: number;
  reduced: boolean;
  activePage: SharedValue<number>;
  t: SharedValue<number>;
  origin: SharedValue<Rect | null>;
  radius: SharedValue<number>;
  scale: SharedValue<number>;
  tx: SharedValue<number>;
  ty: SharedValue<number>;
  dragX: SharedValue<number>;
  dragY: SharedValue<number>;
  shrink: SharedValue<number>;
}

/**
 * One picture in the pager.
 *
 * Only the current page flies, zooms and drags; its neighbours sit fitted and
 * still, waiting to be turned to. That is also why one set of zoom values is
 * enough for the whole gallery — a page is reset before it stops being current.
 */
function ViewerPage({
  item,
  at,
  left,
  viewport,
  box,
  cornerRadius,
  reduced,
  activePage,
  t,
  origin,
  radius,
  scale,
  tx,
  ty,
  dragX,
  dragY,
  shrink,
}: ViewerPageProps) {
  const size = item.size ?? box;
  const fit = fitWithin(size, box);
  const [fullLoaded, setFullLoaded] = useState(false);

  const frameStyle = useAnimatedStyle(() => {
    if (activePage.value !== at) {
      return {
        left: fit.x,
        top: fit.y,
        width: fit.width,
        height: fit.height,
        borderRadius: cornerRadius,
        opacity: 1,
        transform: [{ translateX: 0 }, { translateY: 0 }, { scale: 1 }],
      };
    }
    const progress = t.value;
    const from = origin.value;
    const flies = from !== null && !reduced;
    const rect = flies ? lerpRect(from, fit, progress) : fit;
    const settled = clamp(progress, 0, 1);
    const visualScale = scale.value * shrink.value * (flies ? 1 : lerp(0.92, 1, settled));
    // The radius is drawn inside the scale, so it is divided back out: a
    // picture zoomed to four times keeps corners the size they were, rather
    // than rounding into a pill.
    const corner = flies ? lerp(radius.value, cornerRadius, progress) : cornerRadius;
    return {
      left: rect.x,
      top: rect.y,
      width: Math.max(rect.width, 1),
      height: Math.max(rect.height, 1),
      borderRadius: Math.max(0, corner) / Math.max(visualScale, 0.01),
      opacity: flies ? 1 : settled,
      transform: [
        { translateX: tx.value + dragX.value },
        { translateY: ty.value + dragY.value },
        { scale: visualScale },
      ],
    };
  });

  const pictureStyle = useAnimatedStyle(() => {
    const active = activePage.value === at;
    const from = origin.value;
    const flies = active && from !== null && !reduced;
    const rect = flies ? lerpRect(from, fit, t.value) : fit;
    const cover = coverSize(size, rect);
    return {
      left: (rect.width - cover.width) / 2,
      top: (rect.height - cover.height) / 2,
      width: cover.width,
      height: cover.height,
    };
  });

  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', left, top: 0, width: viewport.width, height: viewport.height }}
    >
      <Animated.View style={[{ position: 'absolute', overflow: 'hidden' }, frameStyle]}>
        <Animated.View style={[{ position: 'absolute' }, pictureStyle]}>
          <Image
            source={item.source}
            resizeMode="cover"
            accessible={false}
            style={StyleSheet.absoluteFill}
          />
          {item.fullSource ? (
            <Image
              source={item.fullSource}
              resizeMode="cover"
              accessible={false}
              onLoad={() => setFullLoaded(true)}
              style={[StyleSheet.absoluteFill, { opacity: fullLoaded ? 1 : 0 }]}
            />
          ) : null}
        </Animated.View>
      </Animated.View>
    </View>
  );
}

export const ImageViewer = Object.assign(ImageViewerRoot, {
  Trigger: ImageViewerTrigger,
});
