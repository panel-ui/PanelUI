/**
 * ScrollText — a line of text that resolves word by word as you scroll past it.
 *
 * The reader's thumb becomes the playhead. Words arrive left to right as the
 * block crosses the viewport, and going back up unresolves them — the effect is
 * scrubbed, not triggered, so it is reversible and lands exactly on both ends.
 *
 * ```tsx
 * <ScrollProgress>
 *   <ScrollView>
 *     <ScrollText size="3xl" weight="semibold">
 *       Every control ships with its accessibility wiring already done.
 *     </ScrollText>
 *   </ScrollView>
 * </ScrollProgress>
 * ```
 *
 * ## Two layouts, and why
 *
 * `color`, `fade` and `highlight` render the words as nested `Text` inside one
 * parent, which is the only way React Native will break them into real lines —
 * hyphenation, justification, the lot. Nested text cannot be transformed,
 * though: a `translateY` on it is ignored.
 *
 * So `rise` lays the words out as a wrapping row of separate views instead.
 * That buys transforms and costs real line-breaking — words wrap on their own
 * boundaries and the spacing is a margin rather than a space. Worth knowing
 * before picking the effect for a paragraph rather than a heading.
 */
import { useMemo } from 'react';
import { Text as RNText, View, type TextStyle } from 'react-native';
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  type SharedValue,
} from 'react-native-reanimated';
import { useCSSVariable } from 'uniwind';
import { useRevealProgress } from '../../hooks/use-reveal-progress';
import { Text, type TextProps } from '../../primitives/text';

const AnimatedText = Animated.createAnimatedComponent(RNText);

/** How far a word rises from, in pixels, for the `rise` effect. */
const RISE_DISTANCE = 18;

export type ScrollTextEffect = 'color' | 'fade' | 'rise' | 'highlight';
export type ScrollTextSplit = 'word' | 'character';

/** Effects that need a transform, and so cannot use nested text. */
const NEEDS_ROW: ScrollTextEffect[] = ['rise'];

export interface ScrollTextProps extends Omit<TextProps, 'children'> {
  className?: string;
  /** The sentence. Split into words or characters, then revealed across them. */
  children?: string;
  /**
   * `color` crossfades each word between two colours, `fade` brings it up from
   * transparent, `rise` lifts it into place, `highlight` sweeps a background
   * behind it.
   */
  effect?: ScrollTextEffect;
  /** Reveal a word at a time, or a character at a time. */
  by?: ScrollTextSplit;
  /** Colour before a word is reached. Defaults to the muted foreground token. */
  from?: string;
  /** Colour once it has been. Defaults to the foreground token. */
  to?: string;
  /**
   * Where down the viewport the block's top sits when the reveal starts, as a
   * fraction of the viewport height.
   */
  start?: number;
  /** Where its bottom sits when the reveal completes. Smaller is a longer scrub. */
  end?: number;
  /**
   * How much of the whole reveal a single word takes, `0` to `1`. Small values
   * make a hard edge travelling along the line; large ones make the whole
   * sentence brighten together.
   */
  stagger?: number;
  /**
   * Drive the reveal from a value of your own rather than from scroll — a
   * progress bar, a gesture, a timeline.
   */
  progress?: SharedValue<number>;
  /** Set false to render the text resolved, with no effect at all. */
  enabled?: boolean;
}

export function ScrollText({
  className,
  children = '',
  effect = 'color',
  by = 'word',
  from,
  to,
  start = 0.9,
  end = 0.5,
  stagger = 0.35,
  progress: external,
  enabled = true,
  ...textProps
}: ScrollTextProps) {
  const reducedMotion = useReducedMotion();
  const active = enabled && !reducedMotion;

  const { ref, progress } = useRevealProgress({
    start,
    end,
    progress: external,
    enabled: active,
  });

  const mutedToken = useCSSVariable('--color-muted-foreground');
  const foregroundToken = useCSSVariable('--color-foreground');
  const accentToken = useCSSVariable('--color-accent');

  const dim = from ?? (typeof mutedToken === 'string' ? mutedToken : '#a1a1aa');
  const lit = to ?? (typeof foregroundToken === 'string' ? foregroundToken : '#0a0a0a');
  const highlight = typeof accentToken === 'string' ? accentToken : 'rgba(0,0,0,0.08)';

  const tokens = useMemo(() => splitText(children, by), [children, by]);

  // Every token gets the same slice of the reveal, offset along the line. The
  // slice is a fraction of the whole rather than a fixed duration, so a long
  // sentence and a short one both finish exactly when the block has passed.
  const span = Math.max(stagger, 0.01);
  const stride = tokens.length > 1 ? (1 - span) / (tokens.length - 1) : 0;

  const asRow = NEEDS_ROW.includes(effect);

  if (asRow) {
    return (
      <View ref={ref} className="flex-row flex-wrap items-baseline">
        {tokens.map((token, index) => (
          <RisingToken
            key={`${index}-${token}`}
            text={token}
            progress={progress}
            startAt={index * stride}
            span={span}
            last={index === tokens.length - 1}
            textProps={textProps}
            className={className}
          />
        ))}
      </View>
    );
  }

  return (
    <View ref={ref}>
      <Text {...textProps} className={className}>
        {tokens.map((token, index) => (
          <InkedToken
            key={`${index}-${token}`}
            text={token}
            progress={progress}
            startAt={index * stride}
            span={span}
            effect={effect}
            dim={dim}
            lit={lit}
            highlight={highlight}
            last={index === tokens.length - 1}
          />
        ))}
      </Text>
    </View>
  );
}

ScrollText.displayName = 'ScrollText';

/**
 * One word or character inside the parent's text flow, inked by the reveal.
 *
 * Nested text, so React Native breaks the sentence into real lines. That rules
 * out transforms — colour, opacity and background are what nested text will
 * animate, which is exactly the three effects routed here.
 */
function InkedToken({
  text,
  progress,
  startAt,
  span,
  effect,
  dim,
  lit,
  highlight,
  last,
}: {
  text: string;
  progress: SharedValue<number>;
  startAt: number;
  span: number;
  effect: ScrollTextEffect;
  dim: string;
  lit: string;
  highlight: string;
  last: boolean;
}) {
  const style = useAnimatedStyle(() => {
    const local = Math.min(1, Math.max(0, (progress.value - startAt) / span));

    if (effect === 'fade') {
      // Not all the way to transparent: a word that vanishes takes the line's
      // shape with it, and the paragraph reflows as you scroll.
      return { opacity: interpolate(local, [0, 1], [0.18, 1]), color: lit } as TextStyle;
    }
    if (effect === 'highlight') {
      return {
        color: interpolateColor(local, [0, 1], [dim, lit]),
        backgroundColor: interpolateColor(local, [0, 1], ['transparent', highlight]),
      } as TextStyle;
    }
    return { color: interpolateColor(local, [0, 1], [dim, lit]) } as TextStyle;
  });

  return <AnimatedText style={style}>{last ? text : `${text} `}</AnimatedText>;
}

/**
 * One word as its own box, lifted into place.
 *
 * A transform needs a view, and a view in a text flow is a word that no longer
 * takes part in line-breaking — hence the wrapping row above, and hence the
 * margin below, since a trailing space inside a box is not a space between
 * boxes.
 */
function RisingToken({
  text,
  progress,
  startAt,
  span,
  last,
  textProps,
  className,
}: {
  text: string;
  progress: SharedValue<number>;
  startAt: number;
  span: number;
  last: boolean;
  textProps: Omit<TextProps, 'children' | 'className'>;
  className?: string;
}) {
  const style = useAnimatedStyle(() => {
    const local = Math.min(1, Math.max(0, (progress.value - startAt) / span));
    return {
      opacity: local,
      transform: [{ translateY: interpolate(local, [0, 1], [RISE_DISTANCE, 0]) }],
    };
  });

  return (
    <Animated.View style={[style, last ? undefined : { marginRight: 6 }]}>
      <Text {...textProps} className={className}>
        {text}
      </Text>
    </Animated.View>
  );
}

/**
 * Splits on whitespace, keeping punctuation attached to the word it belongs to.
 * Splitting a sentence into bare words and re-joining with single spaces loses
 * the double space after a full stop and every non-breaking space in it.
 */
function splitText(text: string, by: ScrollTextSplit): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (by === 'character') return Array.from(trimmed);
  return trimmed.split(/\s+/);
}
