'use client';

/**
 * Canvas — a surface for other components to sit on: a field of dots, a
 * grid or crosses, with a light that can follow the pointer across it.
 *
 * ```tsx
 * <Canvas className="h-96">
 *   <Canvas.Pattern variant="dots" />
 *   <Canvas.Spotlight />
 *   <Canvas.Content>…</Canvas.Content>
 * </Canvas>
 * ```
 *
 * ## Layers on one surface
 *
 * A canvas is a stack of layers. `Canvas.Pattern` draws marks across the
 * whole surface, several patterns stack, `Canvas.Spotlight` lights them near
 * the pointer, and `Canvas.Content` is what sits on top. Every layer is
 * drawn from the same `viewport`, so a layer added later, such as ink drawn
 * with the pointer, lines up with the pattern without measuring it.
 *
 * ## It moves with what is on it
 *
 * `viewport` takes the `{ x, y, zoom }` a Flow reports from
 * `onViewportChange`, so the pattern pans and scales with the graph on top
 * of it instead of staying behind as the graph slides over it.
 *
 * ## The light follows the hand
 *
 * The spotlight is a second copy of the pattern in the foreground colour,
 * shown through a round window centred on the pointer that fades from the
 * middle to its edge. It follows the pointer without easing, from events on
 * the canvas itself, so it works over whatever is in the content. It is
 * written straight to the element, once a frame, without rendering, and it
 * fades out when the pointer leaves. On a touch screen it shows while a
 * finger is down.
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
  type ComponentProps,
  type CSSProperties,
} from 'react';
import { tv } from 'tailwind-variants';
import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import type { ElementType as RenderElementType } from 'react';

/** Draws a part as another element, or composes it with a component: `render={<a href="/" />}`. */
type RenderProp<Tag extends RenderElementType> = { render?: useRender.ComponentProps<Tag>['render'] };

const canvasVariants = tv({
  slots: {
    root: 'relative isolate overflow-hidden bg-background text-foreground',
    layer: 'pointer-events-none absolute inset-0 size-full',
    // The resting marks: the foreground at a fraction of its strength, so the
    // field reads as a texture and not as content.
    pattern: 'text-foreground',
    spotlight:
      'text-foreground opacity-0 transition-opacity duration-200 data-on:opacity-100 motion-reduce:transition-none',
    content: 'relative z-10 size-full',
  },
});

/** Where the canvas is looking: the same shape a Flow reports. */
export interface CanvasViewport {
  x: number;
  y: number;
  zoom: number;
}

/** The marks a pattern draws. */
export type CanvasPatternVariant = 'dots' | 'grid' | 'cross';

/** How a pattern fades out: not at all, towards every edge, or towards the bottom. */
export type CanvasFade = 'none' | 'edges' | 'bottom';

interface PatternSpec {
  variant: CanvasPatternVariant;
  gap: number;
  size: number;
  major?: number;
  fade: CanvasFade;
}

interface CanvasContextValue {
  viewport: CanvasViewport;
  root: HTMLDivElement | null;
  patterns: Array<{ key: string } & PatternSpec>;
  register(key: string, spec: PatternSpec): () => void;
}

const CanvasContext = createContext<CanvasContextValue | null>(null);

function useCanvas(part: string): CanvasContextValue {
  const canvas = useContext(CanvasContext);
  if (!canvas) throw new Error(`${part} must be used inside a <Canvas>.`);
  return canvas;
}

const ORIGIN: CanvasViewport = { x: 0, y: 0, zoom: 1 };

const FADES: Record<CanvasFade, string | undefined> = {
  none: undefined,
  edges: 'radial-gradient(ellipse 75% 70% at 50% 50%, #000 35%, transparent 100%)',
  bottom: 'linear-gradient(to bottom, #000 40%, transparent 95%)',
};

export interface CanvasProps extends ComponentProps<'div'> {
  /**
   * Where the canvas is looking, as `{ x, y, zoom }`. Pass what a Flow reports
   * from `onViewportChange`, and the pattern pans and scales with the graph.
   * Default `{ x: 0, y: 0, zoom: 1 }`.
   */
  viewport?: CanvasViewport;
}

function CanvasRoot({ viewport = ORIGIN, className, children, ...props }: CanvasProps) {
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const [patterns, setPatterns] = useState<CanvasContextValue['patterns']>([]);

  const register = useCallback((key: string, spec: PatternSpec) => {
    setPatterns((current) => [...current.filter((pattern) => pattern.key !== key), { key, ...spec }]);
    return () => setPatterns((current) => current.filter((pattern) => pattern.key !== key));
  }, []);

  const context = useMemo<CanvasContextValue>(
    () => ({ viewport, root, patterns, register }),
    [viewport, root, patterns, register]
  );

  return (
    <CanvasContext.Provider value={context}>
      <div ref={setRoot} data-slot="canvas" className={canvasVariants().root({ className })} {...props}>
        {children}
      </div>
    </CanvasContext.Provider>
  );
}
CanvasRoot.displayName = 'Canvas';

/** Draws one pattern's marks into an SVG, from the viewport. */
function Marks({ id, spec, viewport }: { id: string; spec: PatternSpec; viewport: CanvasViewport }) {
  const { variant, gap, size, major } = spec;
  const transform = `translate(${viewport.x.toFixed(2)} ${viewport.y.toFixed(2)}) scale(${viewport.zoom.toFixed(4)})`;
  const half = gap / 2;

  const mark = (scale: number, at: number) => {
    if (variant === 'dots') return <circle cx={at} cy={at} r={size * scale} fill="currentColor" />;
    if (variant === 'cross') {
      const arm = size * scale;
      return (
        <path
          d={`M${at - arm} ${at}h${arm * 2}M${at} ${at - arm}v${arm * 2}`}
          stroke="currentColor"
          strokeWidth={scale > 1 ? 1.25 : 1}
          strokeLinecap="round"
          fill="none"
        />
      );
    }
    return null;
  };

  // Every variant marks the same lattice points, half a gap in from each
  // tile's corner, so stacked patterns line up: a cross lands on a grid's
  // crossing, and a major line on a minor one.
  const tile = major ? gap * major : gap;
  return (
    <>
      <defs>
        <pattern id={`${id}-minor`} width={gap} height={gap} patternUnits="userSpaceOnUse" patternTransform={transform}>
          {variant === 'grid' ? (
            <path
              d={`M${half} 0V${gap}M0 ${half}H${gap}`}
              fill="none"
              stroke="currentColor"
              strokeWidth={size}
              opacity={major ? 0.6 : 1}
            />
          ) : (
            mark(1, half)
          )}
        </pattern>
        {major ? (
          <pattern
            id={`${id}-major`}
            width={tile}
            height={tile}
            patternUnits="userSpaceOnUse"
            patternTransform={transform}
          >
            {variant === 'grid' ? (
              <path
                d={`M${half} 0V${tile}M0 ${half}H${tile}`}
                fill="none"
                stroke="currentColor"
                strokeWidth={size * 1.5}
              />
            ) : (
              mark(variant === 'dots' ? 1.8 : 1.6, half)
            )}
          </pattern>
        ) : null}
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id}-minor)`} />
      {major ? <rect width="100%" height="100%" fill={`url(#${id}-major)`} /> : null}
    </>
  );
}

export interface CanvasPatternProps extends Omit<ComponentProps<'svg'>, 'children'> {
  /** Dots, a grid of lines, or small crosses. Default `dots`. */
  variant?: CanvasPatternVariant;
  /** The distance from one mark to the next, in pixels at a zoom of 1. Default `12`, or `24` for a grid. */
  gap?: number;
  /** How big a mark is: a dot's radius, a line's width, half a cross's arm. Default `0.75`, `1` or `3`. */
  size?: number;
  /** Draws every this-many-th line or mark stronger, as on graph paper. */
  major?: number;
  /** Fades the pattern out towards every edge or towards the bottom. Default `none`. */
  fade?: CanvasFade;
  /**
   * How strongly the marks show at rest, as a share of the foreground
   * colour. Default `28%` for dots and crosses, `10%` for a grid.
   */
  strength?: string;
}

/** A pattern across the whole canvas, which pans and scales with its viewport. */
function CanvasPattern({
  variant = 'dots',
  gap,
  size,
  major,
  fade = 'none',
  strength,
  className,
  style,
  render,
  ...props
}: CanvasPatternProps & RenderProp<'svg'>) {
  const canvas = useCanvas('Canvas.Pattern');
  const id = `canvas${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const spec = useMemo<PatternSpec>(
    () => ({
      variant,
      gap: gap ?? (variant === 'grid' ? 24 : 12),
      size: size ?? (variant === 'dots' ? 0.75 : variant === 'grid' ? 1 : 3),
      major,
      fade,
    }),
    [variant, gap, size, major, fade]
  );
  const { register } = canvas;
  // Known to the spotlight, which draws a lit copy of every pattern.
  useLayoutEffect(() => register(id, spec), [register, id, spec]);

  const mask = FADES[fade];
  return useRender({
    defaultTagName: 'svg',
    render,
    props: mergeProps(
      {
        'aria-hidden': 'true',
        'data-slot': 'canvas-pattern',
        className: canvasVariants().layer({ className: [canvasVariants().pattern(), className] }),
        style: {
          opacity: strength ?? (variant === 'grid' ? '10%' : '28%'),
          maskImage: mask,
          WebkitMaskImage: mask,
          ...style,
        } as CSSProperties,
        children: (
          <>
            <Marks id={id} spec={spec} viewport={canvas.viewport} />
          </>
        ),
      },
      props
    ),
  });
}
CanvasPattern.displayName = 'Canvas.Pattern';

export interface CanvasSpotlightProps extends Omit<ComponentProps<'div'>, 'children'> {
  /** How far the light reaches from its centre, in pixels. Default `100`. */
  radius?: number;
  /**
   * Holds the light at a point, in pixels from the canvas's top left corner,
   * instead of following the pointer.
   */
  position?: { x: number; y: number };
}

/**
 * Lights the patterns near the pointer: the marks inside the circle brighten
 * towards the foreground colour, most at the centre.
 */
function CanvasSpotlight({
  radius = 100,
  position,
  className,
  style,
  render,
  ...props
}: CanvasSpotlightProps & RenderProp<'div'>) {
  const canvas = useCanvas('Canvas.Spotlight');
  const light = useRef<HTMLDivElement>(null);
  const prefix = `spot${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  // Follows the pointer from events on the whole canvas, so content on top
  // does not stop it. Written to the element once a frame, without rendering.
  useEffect(() => {
    const root = canvas.root;
    const node = light.current;
    if (!root || !node || position) return;
    let frame = 0;
    let x = 0;
    let y = 0;
    let down = false;
    const write = () => {
      frame = 0;
      node.style.setProperty('--canvas-x', `${x}px`);
      node.style.setProperty('--canvas-y', `${y}px`);
    };
    const place = (event: PointerEvent) => {
      const box = root.getBoundingClientRect();
      x = event.clientX - box.left;
      y = event.clientY - box.top;
      if (!frame) frame = requestAnimationFrame(write);
    };
    const show = (on: boolean) => node.toggleAttribute('data-on', on);
    const move = (event: PointerEvent) => {
      place(event);
      if (event.pointerType !== 'touch' || down) show(true);
    };
    const press = (event: PointerEvent) => {
      down = true;
      place(event);
      show(true);
    };
    const release = (event: PointerEvent) => {
      down = false;
      if (event.pointerType === 'touch') show(false);
    };
    const leave = () => show(false);
    root.addEventListener('pointermove', move);
    root.addEventListener('pointerdown', press);
    root.addEventListener('pointerup', release);
    root.addEventListener('pointercancel', release);
    root.addEventListener('pointerleave', leave);
    return () => {
      cancelAnimationFrame(frame);
      root.removeEventListener('pointermove', move);
      root.removeEventListener('pointerdown', press);
      root.removeEventListener('pointerup', release);
      root.removeEventListener('pointercancel', release);
      root.removeEventListener('pointerleave', leave);
    };
  }, [canvas.root, position]);

  // A round window on the lit copy: opaque at the pointer, clear at the radius.
  const circle = `radial-gradient(circle var(--canvas-r) at var(--canvas-x, -999px) var(--canvas-y, -999px), #000, transparent)`;

  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        ref: light,
        'aria-hidden': 'true',
        'data-slot': 'canvas-spotlight',
        'data-on': position ? '' : undefined,
        className: canvasVariants().layer({ className: [canvasVariants().spotlight(), className] }),
        style: {
          '--canvas-r': `${radius}px`,
          ...(position ? { '--canvas-x': `${position.x}px`, '--canvas-y': `${position.y}px` } : null),
          ...style,
        } as CSSProperties,
        children: (
          <>
            {canvas.patterns.map((pattern) => {
              const fade = FADES[pattern.fade];
              // The pattern's own fade still applies inside the light.
              const mask = fade ? `${circle}, ${fade}` : circle;
              return (
                <svg
                  key={pattern.key}
                  className="absolute inset-0 size-full"
                  style={{
                    maskImage: mask,
                    WebkitMaskImage: mask,
                    maskComposite: fade ? 'intersect' : undefined,
                    WebkitMaskComposite: fade ? 'source-in' : undefined,
                  }}
                >
                  <Marks id={`${prefix}${pattern.key}`} spec={pattern} viewport={canvas.viewport} />
                </svg>
              );
            })}
          </>
        ),
      },
      props
    ),
  });
}
CanvasSpotlight.displayName = 'Canvas.Spotlight';

export interface CanvasContentProps extends ComponentProps<'div'> {}

/** What sits on the canvas, above its patterns and its light. */
function CanvasContent({ className, render, ...props }: CanvasContentProps & RenderProp<'div'>) {
  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps({ 'data-slot': 'canvas-content', className: canvasVariants().content({ className }) }, props),
  });
}
CanvasContent.displayName = 'Canvas.Content';

export const Canvas = Object.assign(CanvasRoot, {
  Pattern: CanvasPattern,
  Spotlight: CanvasSpotlight,
  Content: CanvasContent,
});

export { CanvasPattern, CanvasSpotlight, CanvasContent };
