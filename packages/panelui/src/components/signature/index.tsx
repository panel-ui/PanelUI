/**
 * Signature — a surface you sign with a finger, and a handle for getting the
 * result back out.
 *
 * ```tsx
 * const pad = useRef<SignatureHandle>(null);
 *
 * <Signature ref={pad} guideline />
 * <Button onPress={() => pad.current?.save({ filename: 'agreement' })}>
 *   Finish signing
 * </Button>
 * ```
 *
 * ## Why the stroke never reaches React
 *
 * A finger produces touch events far faster than a component tree can usefully
 * re-render, and a signature is exactly the case where the lag shows: the line
 * trails the fingertip and the whole thing feels like drawing through syrup.
 *
 * So the stroke being drawn lives in a shared value and is turned into an SVG
 * `d` string by a worklet on the UI thread — React is not involved in a single
 * frame of it. When the finger lifts, that one finished string crosses to
 * JavaScript once and becomes a static path. Committed strokes are ordinary
 * elements that never animate again, so the hundredth stroke costs what the
 * first one did.
 *
 * Points closer together than `minDistance` are dropped as they arrive. A slow
 * finger otherwise emits a point per frame in the same spot, which is a longer
 * path describing the same shape.
 *
 * ## Smoothing
 *
 * Raw touch points joined with straight lines look like a seismograph. Each
 * segment is drawn as a quadratic curve through the midpoint between two
 * points instead — the point itself becomes the control handle, the midpoints
 * become the anchors, and consecutive curves meet with a shared tangent. It
 * needs no lookahead, so a point can be appended to a stroke already on screen
 * without redrawing what came before it differently.
 *
 * ## Getting it out
 *
 * `toSVG()` is pure string building and always works. Writing a file needs
 * `expo-file-system`, and rasterising to PNG needs `react-native-view-shot` as
 * well; both are optional and both are resolved lazily, so a project that only
 * ever reads the SVG installs neither. Asking for something the missing
 * package provides throws with its name in the message rather than failing
 * somewhere further down.
 */
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
  type Ref,
} from 'react';
import {
  AccessibilityInfo,
  View,
  type AccessibilityActionEvent,
  type ViewProps,
} from 'react-native';
import { useCSSVariable } from 'uniwind';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedProps,
  useSharedValue,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { tv, type VariantProps } from 'tailwind-variants';
import {
  PencilIcon,
  RotateCcwIcon,
  RotateCwIcon,
  TrashIcon,
  type IconProps,
} from '../../icons';
import {
  AnimatedPressable,
  type AnimatedPressableProps,
} from '../../primitives/animated-pressable';
import { Text } from '../../primitives/text';
import { cn } from '../../utils/cn';
import {
  signatureAccessibilityActions,
  signatureAccessibilityValue,
  signatureAnnouncement,
  type SignatureChangeKind,
} from './signature-accessibility';
import type { ViewRef } from '../../primitives/refs';

const AnimatedPath = Animated.createAnimatedComponent(Path);

/**
 * `expo-file-system`, or null when it is not installed. Resolved once at module
 * load, the way every optional dependency in the library is.
 */
const FileSystem: {
  documentDirectory?: string | null;
  Paths?: { document?: { uri?: string } };
  writeAsStringAsync?: (uri: string, contents: string, options?: unknown) => Promise<void>;
  EncodingType?: { Base64?: string; UTF8?: string };
  File?: new (...args: unknown[]) => {
    create: (options?: { overwrite?: boolean }) => void;
    write: (contents: string) => void;
    uri: string;
  };
} | null = (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-file-system');
  } catch {
    return null;
  }
})();

/** `react-native-view-shot`'s capture function, or null. PNG export only. */
const captureRef: ((view: unknown, options: unknown) => Promise<string>) | null =
  (() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require('react-native-view-shot');
      return (mod?.captureRef as (v: unknown, o: unknown) => Promise<string>) ?? null;
    } catch {
      return null;
    }
  })();

/** True when a signature can be written to a file. */
export const hasSignatureFileSystem = FileSystem !== null;

/** True when a signature can be rasterised to PNG. */
export const hasSignatureRaster = captureRef !== null;

const signatureVariants = tv({
  slots: {
    root: 'overflow-hidden rounded-2xl border border-border bg-card',
    pad: 'flex-1',
    placeholder: 'absolute inset-0 items-center justify-center gap-2',
    guide: 'absolute inset-x-6 flex-row items-center gap-3',
    toolbar: 'flex-row items-center justify-between gap-2 px-3 py-2',
  },
  variants: {
    size: {
      sm: { root: 'h-32' },
      md: { root: 'h-48' },
      lg: { root: 'h-64' },
      /** Fills whatever it is given — for a full-screen signing surface. */
      full: { root: 'h-auto flex-1 rounded-none border-0' },
    },
    disabled: {
      true: { root: 'opacity-[0.64]' },
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

type SignatureVariantProps = VariantProps<typeof signatureVariants>;

export interface SignatureProps
  extends Omit<ViewProps, 'children'>,
    Omit<SignatureVariantProps, 'disabled'> {
  className?: string;
  /** How tall the pad is. `full` fills its parent instead. */
  size?: 'sm' | 'md' | 'lg' | 'full';
  /** Ink colour. Defaults to the theme's foreground. */
  strokeColor?: string;
  /** Ink width in points. */
  strokeWidth?: number;
  /**
   * Points closer together than this are dropped as they arrive, so a finger
   * resting still does not add hundreds of points describing one spot.
   */
  minDistance?: number;
  /** Draw the baseline and its ✕ mark, the way a paper form does. */
  guideline?: boolean;
  /** Caption beside the baseline. Only shown with `guideline`. */
  guidelineLabel?: string;
  /** Prompt shown over an empty pad. Pass `null` for none. */
  placeholder?: ReactNode;
  /** Take no input. The strokes already there stay visible. */
  disabled?: boolean;
  /**
   * Opens a product-provided non-drawing method, such as typing a legal name,
   * uploading an image, or asking for assisted signing. Exposed as a screen
   * reader action; provide the same choice as a visible control too.
   */
  onRequestAlternative?: () => void;
  /** A stroke has started. */
  onBegin?: () => void;
  /** A stroke has finished. */
  onEnd?: () => void;
  /**
   * The number of committed strokes changed — by drawing, undoing, redoing or
   * clearing. The cheap way to enable a Save button only once something is
   * there to save.
   */
  onChange?: (strokeCount: number) => void;
  /** Class on the drawing surface inside the border. */
  padClassName?: string;
  /** Class on the empty-pad prompt. */
  placeholderClassName?: string;
  /** Class on the baseline. */
  guideClassName?: string;
}

export interface SignatureSaveOptions {
  /**
   * Directory to write into, as a `file://` URI. Defaults to the app's own
   * document directory, which survives restarts and is not visible to the user.
   */
  directory?: string;
  /** Filename without an extension. Defaults to `signature-<timestamp>`. */
  filename?: string;
  /** `svg` needs no extra packages; `png` rasterises the pad. */
  format?: 'svg' | 'png';
  /** PNG only — pixels per point. Higher is sharper and larger. */
  scale?: number;
}

export interface SignatureFile {
  /** Where it was written, as a `file://` URI. */
  uri: string;
  format: 'svg' | 'png';
  /** The pad's size in points, which is the SVG's coordinate space. */
  width: number;
  height: number;
}

export interface SignatureHandle {
  /** Drop every stroke. */
  clear(): void;
  /** Remove the last stroke. Repeatable down to empty. */
  undo(): void;
  /** Put back the last undone stroke. Drawing again discards the redo stack. */
  redo(): void;
  /** True until the first stroke lands. */
  isEmpty(): boolean;
  /** How many strokes are on the pad. */
  strokeCount(): number;
  /**
   * The signature as a standalone SVG document, sized to the pad. Pure string
   * building — no optional package, no async, safe to call every render.
   */
  toSVG(): string;
  /**
   * A `data:` URI. `svg` is always available; `png` needs
   * `react-native-view-shot` and throws by name without it.
   */
  toDataURL(format?: 'svg' | 'png'): Promise<string>;
  /**
   * Write the signature to a file and resolve where it went. Needs
   * `expo-file-system`, plus `react-native-view-shot` for `png`.
   */
  save(options?: SignatureSaveOptions): Promise<SignatureFile>;
}

/**
 * Turns a flat `[x, y, x, y, …]` buffer into a path, curving through the
 * midpoint between each pair of points.
 *
 * A worklet, because it runs against the live stroke on the UI thread — and
 * because the same function has to produce the committed string once the
 * finger lifts, so the line does not shift the instant it stops being live.
 */
function strokePath(points: number[]): string {
  'worklet';
  const count = points.length / 2;
  if (count === 0) return '';

  // A tap is a dot. Without this it would be an empty path and the touch would
  // leave no mark at all, which reads as the pad having missed it.
  if (count === 1) {
    return `M${points[0]},${points[1]} l0.01,0`;
  }

  let d = `M${points[0]},${points[1]}`;
  for (let i = 1; i < count; i += 1) {
    const px = points[(i - 1) * 2]!;
    const py = points[(i - 1) * 2 + 1]!;
    const x = points[i * 2]!;
    const y = points[i * 2 + 1]!;
    // The point is the control handle and the midpoint is the anchor, so the
    // curve leaving this segment shares a tangent with the one entering the
    // next and the join is invisible.
    d += ` Q${px},${py} ${(px + x) / 2},${(py + y) / 2}`;
  }

  // Finish at the real last point rather than at the midpoint before it, or
  // the stroke stops visibly short of where the finger lifted.
  d += ` L${points[(count - 1) * 2]},${points[(count - 1) * 2 + 1]}`;
  return d;
}

function SignatureRoot(
  {
    className,
    size = 'md',
    strokeColor,
    strokeWidth = 2.5,
    minDistance = 1.5,
    guideline = false,
    guidelineLabel,
    placeholder,
    disabled = false,
    onRequestAlternative,
    onBegin,
    onEnd,
    onChange,
    padClassName,
    placeholderClassName,
    guideClassName,
    accessibilityLabel,
    accessibilityHint,
    accessibilityActions,
    onAccessibilityAction,
    ...props
  }: SignatureProps,
  ref: Ref<SignatureHandle>
) {
  const slots = signatureVariants({ size, disabled });

  const [strokes, setStrokes] = useState<string[]>([]);
  const [undone, setUndone] = useState<string[]>([]);
  const [layout, setLayout] = useState({ width: 0, height: 0 });

  // The live stroke: a flat buffer so the worklet reads numbers rather than
  // objects, which is what keeps the per-frame cost flat.
  const live = useSharedValue<number[]>([]);
  const padRef = useRef<ViewRef>(null);

  const inkToken = useCSSVariable('--color-foreground');
  const ink =
    strokeColor ?? (typeof inkToken === 'string' ? inkToken : '#0a0a0a');

  // Latest-props refs, so the gesture is built once and still calls the
  // handlers the component was last rendered with.
  const changeRef = useRef(onChange);
  changeRef.current = onChange;
  const beginRef = useRef(onBegin);
  beginRef.current = onBegin;
  const endRef = useRef(onEnd);
  endRef.current = onEnd;
  const alternativeRef = useRef(onRequestAlternative);
  alternativeRef.current = onRequestAlternative;

  // `onChange` fires from an effect rather than from inside a state updater.
  // An updater can be replayed during a render, and calling a parent's setState
  // from there is the "cannot update a component while rendering a different
  // component" warning — earned, not spurious.
  const reported = useRef(0);
  const changeKind = useRef<SignatureChangeKind>('draw');
  useEffect(() => {
    if (reported.current === strokes.length) return;
    const previous = reported.current;
    reported.current = strokes.length;
    changeRef.current?.(strokes.length);
    const announcement = signatureAnnouncement(
      previous,
      strokes.length,
      changeKind.current
    );
    if (announcement) AccessibilityInfo.announceForAccessibility(announcement);
  }, [strokes.length]);

  const commit = useCallback((d: string) => {
    changeKind.current = 'draw';
    setStrokes((current) => [...current, d]);
    // Drawing again is a new branch of history, so what was undone is gone.
    setUndone([]);
    endRef.current?.();
  }, []);

  const begin = useCallback(() => beginRef.current?.(), []);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        // Without this a signature's first, shortest stroke — the dot on an
        // i, a full stop — never activates the gesture and is simply lost.
        .minDistance(0)
        .averageTouches(true)
        .enabled(!disabled)
        .onBegin((event) => {
          'worklet';
          live.value = [event.x, event.y];
          runOnJS(begin)();
        })
        .onUpdate((event) => {
          'worklet';
          const points = live.value;
          const last = points.length;
          if (last >= 2) {
            const dx = event.x - points[last - 2]!;
            const dy = event.y - points[last - 1]!;
            if (dx * dx + dy * dy < minDistance * minDistance) return;
          }
          // A new array, not a push: a shared value only notifies on
          // assignment, and mutating in place leaves the path stale.
          live.value = [...points, event.x, event.y];
        })
        .onFinalize(() => {
          'worklet';
          const points = live.value;
          live.value = [];
          if (points.length === 0) return;
          runOnJS(commit)(strokePath(points));
        }),
    [begin, commit, disabled, live, minDistance]
  );

  const liveProps = useAnimatedProps(() => ({ d: strokePath(live.value) }));

  const svgDocument = useCallback(() => {
    const width = Math.round(layout.width) || 1;
    const height = Math.round(layout.height) || 1;
    const paths = strokes
      .map(
        (d) =>
          `<path d="${d}" fill="none" stroke="${ink}" stroke-width="${strokeWidth}" ` +
          'stroke-linecap="round" stroke-linejoin="round"/>'
      )
      .join('');
    return (
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" ` +
      `viewBox="0 0 ${width} ${height}">${paths}</svg>`
    );
  }, [ink, layout.height, layout.width, strokeWidth, strokes]);

  const rasterise = useCallback(
    async (scale: number) => {
      if (!captureRef) {
        throw new Error(
          'Signature: PNG export needs the optional `react-native-view-shot` package. ' +
            'Install it, or export SVG instead.'
        );
      }
      return captureRef(padRef.current, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
        width: Math.round(layout.width * scale),
        height: Math.round(layout.height * scale),
      });
    },
    [layout.height, layout.width]
  );

  const clear = useCallback(() => {
    changeKind.current = 'clear';
    setStrokes([]);
    setUndone([]);
  }, []);

  const undo = useCallback(() => {
    const last = strokes[strokes.length - 1];
    if (last === undefined) return;
    changeKind.current = 'undo';
    setUndone((stack) => [...stack, last]);
    setStrokes(strokes.slice(0, -1));
  }, [strokes]);

  const redo = useCallback(() => {
    const restored = undone[undone.length - 1];
    if (restored === undefined) return;
    changeKind.current = 'redo';
    setUndone(undone.slice(0, -1));
    setStrokes([...strokes, restored]);
  }, [strokes, undone]);

  useImperativeHandle(
    ref,
    (): SignatureHandle => ({
      // These read the current arrays and set flat values rather than nesting
      // one updater inside another — a nested updater runs during the render
      // pass, which is not a safe place to schedule another component's update.
      clear,
      undo,
      redo,
      isEmpty: () => strokes.length === 0,
      strokeCount: () => strokes.length,
      toSVG: svgDocument,
      async toDataURL(format = 'svg') {
        if (format === 'svg') {
          // encodeURIComponent rather than base64: no polyfill needed, and the
          // result is legible in a log, which matters when debugging a save.
          return `data:image/svg+xml;utf8,${encodeURIComponent(svgDocument())}`;
        }
        const uri = await rasterise(2);
        if (!FileSystem) {
          throw new Error(
            'Signature: reading a PNG back as a data URI needs the optional ' +
              '`expo-file-system` package. The file itself is at ' +
              `${uri} — pass that to an <Image> instead.`
          );
        }
        const read = (
          FileSystem as unknown as {
            readAsStringAsync?: (u: string, o?: unknown) => Promise<string>;
          }
        ).readAsStringAsync;
        if (!read) throw new Error('Signature: `expo-file-system` has no readAsStringAsync.');
        const base64 = await read(uri, { encoding: 'base64' });
        return `data:image/png;base64,${base64}`;
      },
      async save(options = {}) {
        const { directory, filename, format = 'svg', scale = 2 } = options;

        if (!FileSystem) {
          throw new Error(
            'Signature: save() needs the optional `expo-file-system` package. ' +
              'Install it, or use toSVG() and write the string yourself.'
          );
        }

        const base =
          directory ??
          FileSystem.documentDirectory ??
          FileSystem.Paths?.document?.uri;
        if (!base) {
          throw new Error(
            'Signature: no document directory available — pass `directory` explicitly.'
          );
        }

        const name = filename ?? `signature-${Date.now()}`;
        const dir = base.endsWith('/') ? base : `${base}/`;
        const uri = `${dir}${name}.${format}`;

        if (format === 'png') {
          const temporary = await rasterise(scale);
          const copy = (
            FileSystem as unknown as {
              copyAsync?: (o: { from: string; to: string }) => Promise<void>;
            }
          ).copyAsync;
          if (!copy) {
            throw new Error('Signature: `expo-file-system` has no copyAsync.');
          }
          await copy({ from: temporary, to: uri });
        } else if (FileSystem.File) {
          // The current file-object API. Tried first: `writeAsStringAsync` is
          // the legacy one and warns on every call in recent versions.
          const file = new FileSystem.File(uri);
          file.create({ overwrite: true });
          file.write(svgDocument());
        } else if (FileSystem.writeAsStringAsync) {
          await FileSystem.writeAsStringAsync(uri, svgDocument());
        } else {
          throw new Error(
            'Signature: `expo-file-system` exposes neither writeAsStringAsync nor File.'
          );
        }

        return {
          uri,
          format,
          width: Math.round(layout.width),
          height: Math.round(layout.height),
        };
      },
    }),
    [clear, layout.height, layout.width, rasterise, redo, strokes, svgDocument, undo]
  );

  const empty = strokes.length === 0;
  const padActions = useMemo(
    () =>
      disabled
        ? []
        : [
            ...(accessibilityActions ?? []),
            ...signatureAccessibilityActions(
              strokes.length,
              undone.length,
              Boolean(onRequestAlternative),
              false
            ),
          ],
    [accessibilityActions, disabled, onRequestAlternative, strokes.length, undone.length]
  );
  const handleAccessibilityAction = useCallback(
    (event: AccessibilityActionEvent) => {
      if (disabled) return;
      switch (event.nativeEvent.actionName) {
        case 'signature-undo':
          undo();
          return;
        case 'signature-redo':
          redo();
          return;
        case 'signature-clear':
          clear();
          return;
        case 'signature-alternative':
          alternativeRef.current?.();
          return;
        default:
          onAccessibilityAction?.(event);
      }
    },
    [clear, disabled, onAccessibilityAction, redo, undo]
  );

  return (
    <View className={slots.root({ className })} {...props}>
      <GestureDetector gesture={pan}>
        {/* collapsable={false} keeps the view in the native tree, which both
            the gesture handler and the screenshot capture need. */}
        <View
          ref={padRef}
          collapsable={false}
          className={slots.pad({ className: padClassName })}
          onLayout={(event) => setLayout(event.nativeEvent.layout)}
          accessible
          accessibilityRole="image"
          accessibilityLabel={accessibilityLabel ?? 'Signature pad'}
          accessibilityHint={
            accessibilityHint ??
            (onRequestAlternative
              ? 'Direct touch drawing requires tracing a path. Use actions to edit or choose another signature method.'
              : 'Direct touch drawing requires tracing a path. Use actions to undo, redo, or clear strokes.')
          }
          accessibilityState={{ disabled }}
          accessibilityValue={signatureAccessibilityValue(strokes.length)}
          accessibilityActions={padActions}
          onAccessibilityAction={handleAccessibilityAction}
        >
          {guideline && layout.height > 0 ? (
            <View
              className={slots.guide({ className: guideClassName })}
              style={{ top: layout.height * 0.72 }}
              pointerEvents="none"
            >
              <Text size="lg" muted>
                ✕
              </Text>
              <View className="h-px flex-1 bg-border" />
              {guidelineLabel ? (
                <Text size="xs" muted>
                  {guidelineLabel}
                </Text>
              ) : null}
            </View>
          ) : null}

          <Svg width="100%" height="100%" pointerEvents="none">
            {strokes.map((d, index) => (
              <Path
                // Strokes are only ever appended or dropped from the end, so
                // the index is stable for the life of each one.
                key={index}
                d={d}
                fill="none"
                stroke={ink}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
            <AnimatedPath
              animatedProps={liveProps}
              fill="none"
              stroke={ink}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>

          {empty && placeholder !== null ? (
            <View
              className={slots.placeholder({ className: placeholderClassName })}
              pointerEvents="none"
            >
              {placeholder ?? (
                <>
                  <PencilIcon size={20} />
                  <Text size="sm" muted>
                    Sign here
                  </Text>
                </>
              )}
            </View>
          ) : null}
        </View>
      </GestureDetector>
    </View>
  );
}

const SignatureForwarded = forwardRef<SignatureHandle, SignatureProps>(SignatureRoot);
SignatureForwarded.displayName = 'Signature';

export interface SignatureToolbarProps extends ViewProps {
  className?: string;
  children?: ReactNode;
}

/** A row of controls under or over the pad. Purely layout. */
function SignatureToolbar({ className, ...props }: SignatureToolbarProps) {
  return (
    <View
      className={cn('flex-row items-center justify-between gap-2', className)}
      {...props}
    />
  );
}
SignatureToolbar.displayName = 'Signature.Toolbar';

export interface SignatureButtonProps
  extends Omit<AnimatedPressableProps, 'children'> {
  className?: string;
  /** Take no input, and dim to say so. */
  disabled?: boolean;
  /** Replaces the default icon. */
  children?: ReactNode;
}

/**
 * The pad controls are all the same round button with a different icon and a
 * different spoken name, so they are built rather than written out each time.
 */
function circleButton(
  Icon: ComponentType<IconProps>,
  label: string,
  displayName: string
) {
  function Control({
    className,
    disabled,
    children,
    accessibilityLabel,
    ...props
  }: SignatureButtonProps) {
    return (
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ disabled }}
        disabled={disabled}
        hitSlop={8}
        className={cn(
          'h-9 w-9 items-center justify-center rounded-full bg-muted',
          disabled && 'opacity-[0.48]',
          className
        )}
        {...props}
      >
        {children ?? <Icon size={16} />}
      </AnimatedPressable>
    );
  }
  Control.displayName = displayName;
  return Control;
}

/** Removes the last stroke. Wire it to `ref.current?.undo()`. */
const SignatureUndo = circleButton(RotateCcwIcon, 'Undo last stroke', 'Signature.Undo');

/** Puts back the last undone stroke. Wire it to `ref.current?.redo()`. */
const SignatureRedo = circleButton(RotateCwIcon, 'Redo last stroke', 'Signature.Redo');

/** Drops every stroke. Wire it to `ref.current?.clear()`. */
const SignatureClear = circleButton(TrashIcon, 'Clear signature', 'Signature.Clear');

export const Signature = Object.assign(SignatureForwarded, {
  Toolbar: SignatureToolbar,
  Undo: SignatureUndo,
  Redo: SignatureRedo,
  Clear: SignatureClear,
});
