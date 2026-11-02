/**
 * QRCode — a string, drawn as something a camera can read.
 *
 * ```tsx
 * <QRCode value="https://panelui.dev">
 *   <QRCode.Frame>
 *     <QRCode.Canvas />
 *   </QRCode.Frame>
 *   <QRCode.Caption>Scan to open the docs</QRCode.Caption>
 * </QRCode>
 * ```
 *
 * Composition is the API, as everywhere else here: a code in a titled panel is
 * one with a `QRCode.Header` in it, and a code behind a button is one wrapped
 * in a `QRCode.Trigger` and a `QRCode.Content` — not one with a prop turned on.
 *
 * ## What it draws
 *
 * Three `<Path>`s: the body, the three corner rings, and the three corner
 * centres. Every module is a subpath of one of them, not a `<Rect>` of its
 * own. A version 10 code is 3,481 modules; half of them dark is seventeen
 * hundred native views for a picture that never changes, and the difference
 * between that and three nodes is the difference between a code that appears
 * and one that appears eventually.
 *
 * Three rather than one because they are the three things worth colouring and
 * shaping separately. A code is found by its corner eyes before a single
 * module is read, so they are the part a design touches first — and the part
 * it is most dangerous to touch badly.
 *
 * The colours come from the theme, so a code drawn on a card is legible on
 * every one of them — and light-on-dark is drawn the way scanners expect it,
 * with the quiet zone painted rather than left transparent. A code with
 * nothing behind it reads at about half the distance.
 *
 * ## Shaping it
 *
 * `moduleShape`, `eyeFrameShape` and `eyeBallShape` on `QRCode.Canvas` change
 * the geometry; `color`, `eyeFrameColor`, `eyeBallColor` and `backgroundColor`
 * change the ink. A scanner samples the centre of each cell, so every shape
 * here reads exactly as a square does — what changes is how much of the cell
 * is covered. `dot` fills about two thirds of it and `diamond` half, which is
 * read distance spent on a look. Raise `errorCorrection` to pay for it, and
 * check a printed code rather than one on a screen.
 *
 * ## The hole in the middle
 *
 * `QRCode.Logo` clears a square of modules and puts its children there.
 * Error correction is what makes that survivable — the modules are gone, and
 * the code still reads because there is enough redundancy to reconstruct them.
 * How much is `errorCorrection`, and a logo raises the level it needs: the
 * default `M` tolerates about 15% loss, `H` about 30%. A logo is measured
 * against that budget and the level is raised for you if it has to be.
 */
import {
  createContext,
  forwardRef,
  useContext,
  useMemo,
  type ReactElement,
  type ReactNode,
} from 'react';
import { View, type ViewProps } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { tv, type VariantProps } from 'tailwind-variants';
import { useCSSVariable } from 'uniwind';
import { Text } from '../../primitives/text';
import { cn } from '../../utils/cn';
import { Popover, type PopoverContentProps } from '../popover';
import { encodeQr, type ErrorCorrectionLevel, type QrMatrix } from './qr-encode';
import {
  eyeBallPath,
  eyeFramePath,
  finderOrigins,
  inFinder,
  modulePath,
  type QRCodeEyeBallShape,
  type QRCodeEyeFrameShape,
  type QRCodeModuleShape,
} from './qr-shapes';
import type { ViewRef } from '../../primitives/refs';

export type { ErrorCorrectionLevel };
export type { QRCodeModuleShape, QRCodeEyeFrameShape, QRCodeEyeBallShape };

const qrCodeVariants = tv({
  slots: {
    root: 'items-center gap-3',
    // The widget shell every chart in the library is shown in: a titled tray
    // with the card flush inside it. A code is the same kind of thing — one
    // object with a label over it — so it is the same shape.
    frame: 'w-full overflow-hidden rounded-3xl border border-border bg-surface',
    header: 'w-full flex-row items-center justify-between gap-3 px-4 pb-3 pt-2.5',
    // Flush left, right and bottom: the shell's own edge is already there.
    panel: 'relative items-center justify-center overflow-hidden rounded-t-2xl border-t border-border bg-card p-4',
    caption: 'text-center text-sm text-muted-foreground',
    value: 'text-center text-xs text-muted-foreground',
  },
  variants: {
    size: {
      sm: {},
      md: {},
      lg: {},
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

type QrCodeVariantProps = VariantProps<typeof qrCodeVariants>;

/** How big the drawn code is. */
export type QRCodeSize = NonNullable<QrCodeVariantProps['size']>;

/** Side length in points per size. The module grid divides into it. */
const CANVAS_SIZE: Record<QRCodeSize, number> = { sm: 128, md: 180, lg: 240 };

/**
 * The quiet zone, in modules. Four is what the specification asks for and what
 * scanners are tuned to; less and a code against a busy background stops being
 * found at all.
 */
const QUIET_ZONE = 4;

/** Roughly how much of the code each level can lose and still be read. */
const TOLERANCE: Record<ErrorCorrectionLevel, number> = { L: 0.07, M: 0.15, Q: 0.25, H: 0.3 };

/** Ascending, so "the next level up" is a step through this. */
const LEVELS: ErrorCorrectionLevel[] = ['L', 'M', 'Q', 'H'];

/** How much of the code a logo of this fraction covers. */
function coverage(logoFraction: number) {
  return logoFraction * logoFraction;
}

/**
 * The cleared square, in module coordinates.
 *
 * Both the canvas and the logo compute it from this, so the hole and the thing
 * filling it are the same square. Two nearly-equal calculations is how you get
 * a dark ring around a logo, which is the failure the screenshot showed.
 */
function holeBounds(matrixSize: number, logoFraction: number) {
  const from = Math.floor((matrixSize * (1 - logoFraction)) / 2);
  const to = Math.ceil((matrixSize * (1 + logoFraction)) / 2);
  return { from, to };
}

/**
 * The level actually used: the one asked for, unless a logo would eat more of
 * the code than it can afford, in which case the next one that can.
 */
function levelFor(requested: ErrorCorrectionLevel, logoFraction: number): ErrorCorrectionLevel {
  const needed = coverage(logoFraction);
  // Half the budget, not all of it: the rest is for the things a code in the
  // world actually loses — glare, a fold, a thumb.
  const affordable = (level: ErrorCorrectionLevel) => TOLERANCE[level] / 2 >= needed;

  if (affordable(requested)) return requested;
  return LEVELS.slice(LEVELS.indexOf(requested)).find(affordable) ?? 'H';
}

interface QRCodeContextValue {
  matrix: QrMatrix | null;
  /** What went wrong, when there is no matrix. */
  error: string | null;
  value: string;
  size: QRCodeSize;
  /** Side of the logo hole as a fraction of the code, `0` for none. */
  logoFraction: number;
  slots: ReturnType<typeof qrCodeVariants>;
}

const QRCodeContext = createContext<QRCodeContextValue | null>(null);

function useQRCode(part: string) {
  const context = useContext(QRCodeContext);
  if (!context) throw new Error(`${part} must be used inside <QRCode>.`);
  return context;
}

/** Where the code is drawn: in place, in a popover, or up from the bottom. */
export type QRCodePresentation = 'inline' | 'popover' | 'bottom-sheet';

export interface QRCodeProps extends Omit<ViewProps, 'children'>, QrCodeVariantProps {
  className?: string;
  /**
   * What the code encodes. Anything: a URL, a WiFi string, a vCard. Encoded
   * as UTF-8, and the version grows to fit it.
   */
  value: string;
  /**
   * How much of the code can be lost and still read — `L` about 7%, `M` 15%,
   * `Q` 25%, `H` 30%. More correction means a denser code at the same size, so
   * `M` is the default. Raised automatically when a `QRCode.Logo` needs it.
   */
  errorCorrection?: ErrorCorrectionLevel;
  /**
   * Fix the QR version, 1–40, instead of taking the smallest that fits. Worth
   * setting when the content changes and the code should not visibly change
   * density with it.
   */
  version?: number;
  /**
   * Where the code appears. `inline` draws it where it sits; the other two
   * put it behind a `QRCode.Trigger` and draw it in a `QRCode.Content`.
   */
  presentation?: QRCodePresentation;
  /** Controlled open state. Ignored while `presentation` is `inline`. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: ReactNode;
}

const QRCodeRoot = forwardRef<ViewRef, QRCodeProps>(
  (
    {
      className,
      value,
      errorCorrection = 'M',
      version,
      size = 'md',
      presentation = 'inline',
      open,
      onOpenChange,
      children,
      ...props
    },
    ref
  ) => {
    const slots = qrCodeVariants({ size });

    /*
     * A logo is a child, and the matrix has to know about it before the child
     * renders — the level it forces changes the matrix itself. Rather than
     * inspecting children, the fraction is a constant the Logo part also uses,
     * and the root asks whether one is present at all.
     */
    const logoFraction = hasLogo(children) ? LOGO_FRACTION : 0;
    const level = levelFor(errorCorrection, logoFraction);

    const { matrix, error } = useMemo(() => {
      try {
        return { matrix: encodeQr(value, { errorCorrection: level, version }), error: null };
      } catch (cause) {
        // Too much data, or a version too small for it. A throw here would
        // take a screen down over a string, so it draws nothing and says why.
        return { matrix: null, error: (cause as Error).message };
      }
    }, [value, level, version]);

    const context: QRCodeContextValue = { matrix, error, value, size, logoFraction, slots };

    if (presentation !== 'inline') {
      // The provider stays outside the Popover, and Content re-provides it
      // inside — portal content mounts under the portal host, which is not in
      // this subtree.
      return (
        <QRCodeContext.Provider value={context}>
          <Popover open={open} onOpenChange={onOpenChange} presentation={presentation}>
            {children}
          </Popover>
        </QRCodeContext.Provider>
      );
    }

    return (
      <QRCodeContext.Provider value={context}>
        <View ref={ref} className={slots.root({ className })} {...props}>
          {children}
        </View>
      </QRCodeContext.Provider>
    );
  }
);
QRCodeRoot.displayName = 'QRCode';

/* ------------------------------------------------------------------ *
 * The code itself.
 * ------------------------------------------------------------------ */

export interface QRCodeCanvasProps extends Omit<ViewProps, 'children'> {
  className?: string;
  /** Side length in points. Defaults to the size variant's. */
  pixelSize?: number;
  /** Dark modules. See the note below before overriding this. */
  color?: string;
  /** The plate the modules sit on. See the note below. */
  backgroundColor?: string;
  /**
   * How a data module is drawn.
   *
   * `rounded` and `classy` join to their neighbours — a corner is rounded only
   * where both cells touching it are light — so a run reads as one stroke
   * rather than as a string of beads with a light seam through it.
   *
   * `dot` and `diamond` do not tile, and cost read distance for it: `dot`
   * covers about two thirds of its cell and `diamond` exactly half, so the
   * same code is a fainter code at the same size. Raise `errorCorrection` with
   * them, and check a printed one rather than a screen.
   */
  moduleShape?: QRCodeModuleShape;
  /** How the ring around each of the three corner eyes is drawn. */
  eyeFrameShape?: QRCodeEyeFrameShape;
  /** How the square inside each corner eye is drawn. */
  eyeBallShape?: QRCodeEyeBallShape;
  /** The three corner rings. Defaults to `color`. */
  eyeFrameColor?: string;
  /** The three corner centres. Defaults to `eyeFrameColor`, then `color`. */
  eyeBallColor?: string;
}

/**
 * Dark modules on a light plate, whatever the theme is doing.
 *
 * This is the one place in the library that does not follow the tokens, and it
 * is deliberate. A QR code is not a surface — it is a thing a camera has to
 * read, and readers expect dark on light. Inverted, a code is rejected outright
 * by a good share of scanners and found late by most of the rest, which turns a
 * dark theme into a bug report about a code that "sometimes does not work".
 *
 * On a light theme the plate is white on a near-white card, which looks like
 * nothing at all — correct, and the intended outcome. On a dark theme it reads
 * as a light plate holding a code, which is the shape everyone recognises.
 *
 * `color` and `backgroundColor` override both, for a code that is definitely
 * being read by something you control.
 */
const PLATE = '#ffffff';
const MODULE = '#111111';

const QRCodeCanvas = forwardRef<ViewRef, QRCodeCanvasProps>(
  (
    {
      className,
      pixelSize,
      color,
      backgroundColor,
      moduleShape = 'square',
      eyeFrameShape = 'square',
      eyeBallShape = 'square',
      eyeFrameColor,
      eyeBallColor,
      ...props
    },
    ref
  ) => {
    const { matrix, error, value, size, logoFraction } = useQRCode('QRCode.Canvas');

    const side = pixelSize ?? CANVAS_SIZE[size];
    const dark = color ?? MODULE;
    const light = backgroundColor ?? PLATE;
    const frameInk = eyeFrameColor ?? dark;
    const ballInk = eyeBallColor ?? frameInk;

    /*
     * Three paths for the whole code: the body, the three corner rings, and
     * the three corner centres.
     *
     * Three rather than one because they are three different things a reader
     * can colour and shape separately — and still three rather than one node
     * per module, which is what a version 10 code would cost: 3,481 cells,
     * half of them dark, seventeen hundred native views for a picture that
     * never changes.
     *
     * The viewBox is in module units, so a shape is written once and scales to
     * whatever `side` is — no arithmetic per module, and no rounding gaps
     * between neighbours at fractional sizes.
     */
    const paths = useMemo(() => {
      if (!matrix) return { body: '', frames: '', balls: '' };

      const hole = logoFraction ? holeBounds(matrix.size, logoFraction) : null;

      /*
       * The body, as its own matrix rather than as a filter inside the loop.
       * The rounded shapes ask their neighbours whether a corner is free, and
       * the answer has to be about what is *drawn* — a module beside the logo
       * hole or beside an eye has nothing there to join to, and joining to it
       * leaves a squared-off corner facing a gap.
       */
      const body: boolean[][] = [];
      for (let y = 0; y < matrix.size; y++) {
        const row: boolean[] = [];
        for (let x = 0; x < matrix.size; x++) {
          const lit =
            !!matrix.modules[y]![x] &&
            !inFinder(x, y, matrix.size) &&
            // Modules under the logo are not drawn at all — drawing them and
            // covering them leaves a dark edge wherever the logo is smaller
            // than the square it cleared.
            !(hole && x >= hole.from && x < hole.to && y >= hole.from && y < hole.to);
          row.push(lit);
        }
        body.push(row);
      }

      let d = '';
      for (let y = 0; y < matrix.size; y++) {
        for (let x = 0; x < matrix.size; x++) {
          if (!body[y]![x]) continue;
          d += modulePath(moduleShape, body, x, y, matrix.size, QUIET_ZONE);
        }
      }

      let frames = '';
      let balls = '';
      for (const [x, y, corner] of finderOrigins(matrix.size)) {
        frames += eyeFramePath(eyeFrameShape, x, y, QUIET_ZONE, corner);
        balls += eyeBallPath(eyeBallShape, x, y, QUIET_ZONE);
      }

      return { body: d, frames, balls };
    }, [matrix, logoFraction, moduleShape, eyeFrameShape, eyeBallShape]);

    if (error) {
      // A box the size the code would have been, so the layout does not jump
      // when the value becomes something that fits.
      return (
        <View
          ref={ref}
          accessibilityRole="image"
          accessibilityLabel="QR code could not be generated"
          className={cn('items-center justify-center rounded-lg bg-muted', className)}
          style={{ width: side, height: side }}
          {...props}
        />
      );
    }

    if (!matrix) return null;

    const grid = matrix.size + QUIET_ZONE * 2;

    return (
      <View
        ref={ref}
        accessibilityRole="image"
        accessibilityLabel={`QR code for ${value}`}
        className={className}
        style={{ width: side, height: side }}
        {...props}
      >
        <Svg width="100%" height="100%" viewBox={`0 0 ${grid} ${grid}`}>
          {/* Painted, not left transparent: a scanner needs the quiet zone to
              be lighter than the code, and "whatever is behind it" is not.
              Rounded, because at this point it is an object on the card rather
              than a rectangle of paper. */}
          <Rect x={0} y={0} width={grid} height={grid} rx={2.5} fill={light} />
          <Path d={paths.body} fill={dark} />
          {/* `evenodd` is what makes the ring a ring: the 5×5 subpath inside
              the 7×7 one is a hole rather than a second filled square. A
              stroke would be centred on its path and put the eye's outer edge
              half a module outside the seven the specification allows, and the
              width of that square is the one measurement a scanner takes
              before it reads anything. */}
          <Path d={paths.frames} fill={frameInk} fillRule="evenodd" />
          <Path d={paths.balls} fill={ballInk} />
        </Svg>
      </View>
    );
  }
);
QRCodeCanvas.displayName = 'QRCode.Canvas';

/* ------------------------------------------------------------------ *
 * The shells around it.
 * ------------------------------------------------------------------ */

export interface QRCodeFrameProps extends ViewProps {
  className?: string;
  children?: ReactNode;
}

/**
 * The tray the code sits in — the same widget shell the charts use: a titled
 * strip, and a card flush inside it holding the thing itself.
 */
const QRCodeFrame = forwardRef<ViewRef, QRCodeFrameProps>(
  ({ className, children, ...props }, ref) => {
    const { slots } = useQRCode('QRCode.Frame');
    return (
      <View ref={ref} className={slots.frame({ className })} {...props}>
        {children}
      </View>
    );
  }
);
QRCodeFrame.displayName = 'QRCode.Frame';

export interface QRCodeHeaderProps extends ViewProps {
  className?: string;
  children?: ReactNode;
}

/**
 * The strip across the top of the tray. `QRCode.Title` takes the flexible
 * side and `QRCode.Action` the end, so a long title truncates rather than
 * shoving the trailing slot off the edge.
 */
const QRCodeHeader = forwardRef<ViewRef, QRCodeHeaderProps>(
  ({ className, children, ...props }, ref) => {
    const { slots } = useQRCode('QRCode.Header');
    return (
      <View ref={ref} className={slots.header({ className })} {...props}>
        {children}
      </View>
    );
  }
);
QRCodeHeader.displayName = 'QRCode.Header';

export interface QRCodeTitleProps {
  className?: string;
  children?: ReactNode;
}

/** What the code is for. Muted — it is a caption on the tray, not a heading. */
function QRCodeTitle({ className, children }: QRCodeTitleProps) {
  useQRCode('QRCode.Title');
  return (
    <Text size="sm" muted numberOfLines={1} className={cn('min-w-0 shrink', className)}>
      {children}
    </Text>
  );
}
QRCodeTitle.displayName = 'QRCode.Title';

export interface QRCodeActionProps extends ViewProps {
  className?: string;
  children?: ReactNode;
}

/**
 * The trailing slot on the header row — an expiry, a count, a button. A plain
 * string draws as muted text; anything else draws as itself.
 */
const QRCodeAction = forwardRef<ViewRef, QRCodeActionProps>(
  ({ className, children, ...props }, ref) => {
    useQRCode('QRCode.Action');
    return (
      <View
        ref={ref}
        className={cn('shrink-0 flex-row items-center gap-2', className)}
        {...props}
      >
        {typeof children === 'string' ? (
          <Text size="sm" muted>
            {children}
          </Text>
        ) : (
          children
        )}
      </View>
    );
  }
);
QRCodeAction.displayName = 'QRCode.Action';

export interface QRCodePanelProps extends ViewProps {
  className?: string;
  children?: ReactNode;
}

/**
 * The card the code is drawn on, flush inside the tray. It is also what the
 * logo positions itself against, so a `QRCode.Logo` belongs in here beside the
 * canvas rather than anywhere else.
 */
const QRCodePanel = forwardRef<ViewRef, QRCodePanelProps>(
  ({ className, children, ...props }, ref) => {
    const { slots } = useQRCode('QRCode.Panel');
    return (
      <View ref={ref} className={slots.panel({ className })} {...props}>
        {children}
      </View>
    );
  }
);
QRCodePanel.displayName = 'QRCode.Panel';

/* ------------------------------------------------------------------ *
 * The readouts.
 * ------------------------------------------------------------------ */

export interface QRCodeDescriptionProps {
  className?: string;
  children?: ReactNode;
}

/** A muted line inside the panel, under the code. */
function QRCodeDescription({ className, children }: QRCodeDescriptionProps) {
  useQRCode('QRCode.Description');
  return (
    <Text size="sm" muted className={cn('text-center', className)}>
      {children}
    </Text>
  );
}
QRCodeDescription.displayName = 'QRCode.Description';

export interface QRCodeCaptionProps {
  className?: string;
  children?: ReactNode;
}

/** A line under the code saying what scanning it does. */
function QRCodeCaption({ className, children }: QRCodeCaptionProps) {
  const { slots } = useQRCode('QRCode.Caption');
  return <Text className={slots.caption({ className })}>{children}</Text>;
}
QRCodeCaption.displayName = 'QRCode.Caption';

export interface QRCodeValueProps {
  className?: string;
  /** Show the whole string rather than one line of it. */
  full?: boolean;
}

/**
 * The encoded string itself, for someone who cannot scan it — typing a URL out
 * is slower than pointing a camera at it and it is the only way through when
 * the camera is the thing you are setting up.
 */
function QRCodeValue({ className, full }: QRCodeValueProps) {
  const { value, slots } = useQRCode('QRCode.Value');
  return (
    <Text
      className={slots.value({ className })}
      numberOfLines={full ? undefined : 1}
      selectable
    >
      {value}
    </Text>
  );
}
QRCodeValue.displayName = 'QRCode.Value';

/* ------------------------------------------------------------------ *
 * The logo.
 * ------------------------------------------------------------------ */

/**
 * How much of the code's width the logo hole takes.
 *
 * Constant rather than a prop, because the value has to be known before the
 * matrix is built — it decides the error-correction level — and a prop on a
 * child cannot be read from the parent without inspecting the tree. A quarter
 * costs about 6% of the modules, which every level above `L` can afford.
 */
const LOGO_FRACTION = 0.25;

export interface QRCodeLogoProps extends ViewProps {
  className?: string;
  children?: ReactNode;
}

/** Whether the tree contains a `QRCode.Logo`, without walking it deeply. */
function hasLogo(children: ReactNode): boolean {
  let found = false;

  const walk = (node: ReactNode) => {
    if (found || !node) return;
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    const element = node as ReactElement<{ children?: ReactNode }> & { type?: unknown };
    if (typeof element !== 'object' || !('type' in element)) return;
    if (element.type === QRCodeLogo) {
      found = true;
      return;
    }
    walk(element.props?.children);
  };

  walk(children);
  return found;
}

/**
 * Content for the cleared square in the middle — a mark, an avatar, an icon.
 * Its presence is what clears the square, and what raises the error-correction
 * level if the one asked for could not afford it.
 */
const QRCodeLogo = forwardRef<ViewRef, QRCodeLogoProps>(
  ({ className, children, ...props }, ref) => {
    const { size, matrix } = useQRCode('QRCode.Logo');
    if (!matrix) return null;

    /*
     * Sized from the same square the canvas cleared, in the same units.
     *
     * Taking a flat 25% of the canvas instead is close, but not equal — the
     * hole is a whole number of modules and the canvas is not necessarily
     * divisible by them, so the two disagreed by a module or so and the
     * difference showed as a dark ring around the logo.
     */
    const { from, to } = holeBounds(matrix.size, LOGO_FRACTION);
    const grid = matrix.size + QUIET_ZONE * 2;
    const box = ((to - from) / grid) * CANVAS_SIZE[size];

    return (
      // `inset-0` and centred, not `absolute` with nothing else: an absolute
      // box with no offsets takes its parent's alignment, which put the logo
      // at the top of the panel rather than over the middle of the code.
      <View
        pointerEvents="none"
        className="absolute bottom-0 left-0 right-0 top-0 items-center justify-center"
      >
        <View
          ref={ref}
          // The plate colour, so the square reads as part of the code rather
          // than as a hole cut in it — and rounded, matching the plate.
          className={cn('items-center justify-center overflow-hidden rounded-md', className)}
          style={{ width: box, height: box, backgroundColor: PLATE }}
          {...props}
        >
          {children}
        </View>
      </View>
    );
  }
);
QRCodeLogo.displayName = 'QRCode.Logo';

/* ------------------------------------------------------------------ *
 * Folded away.
 * ------------------------------------------------------------------ */

export interface QRCodeTriggerProps {
  /** The element that opens it. Must accept `onPress`. */
  children: ReactElement<{ onPress?: (...args: unknown[]) => void }>;
}

/** What opens a `popover` or `bottom-sheet` code. */
function QRCodeTrigger({ children }: QRCodeTriggerProps) {
  useQRCode('QRCode.Trigger');
  return <Popover.Trigger>{children}</Popover.Trigger>;
}
QRCodeTrigger.displayName = 'QRCode.Trigger';

export interface QRCodeContentProps extends PopoverContentProps {}

/** The panel the code is drawn in, when it is not drawn in place. */
function QRCodeContent({ className, width = 'content-fit', children, ...props }: QRCodeContentProps) {
  const context = useQRCode('QRCode.Content');
  return (
    <Popover.Content width={width} className={cn('items-center gap-3', className)} {...props}>
      <QRCodeContext.Provider value={context}>{children}</QRCodeContext.Provider>
    </Popover.Content>
  );
}
QRCodeContent.displayName = 'QRCode.Content';

export const QRCode = Object.assign(QRCodeRoot, {
  Canvas: QRCodeCanvas,
  Frame: QRCodeFrame,
  Header: QRCodeHeader,
  Title: QRCodeTitle,
  Action: QRCodeAction,
  Panel: QRCodePanel,
  Description: QRCodeDescription,
  Caption: QRCodeCaption,
  Value: QRCodeValue,
  Logo: QRCodeLogo,
  Trigger: QRCodeTrigger,
  Content: QRCodeContent,
});
