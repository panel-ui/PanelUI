/**
 * The card an apparatus figure sits in.
 *
 * The drawing carries no words, so everything a reader needs to read sits in
 * the frame around it: a short title and the figure number in the header, what
 * to do with it at the bottom left, the live number at the bottom right, and a
 * caption under the card saying what the machine stands for. The readout is
 * set in tabular figures so it does not jitter as it counts.
 *
 * Built from PanelUI's Frame parts, so it takes the theme's radius, border and
 * surfaces like every other widget in the app.
 */
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Frame } from 'panelui-native/components/frame';
import { Text } from 'panelui-native/primitives/text';

export interface ApparatusFrameProps {
  /** The figure's number in its set: `1` renders as "Fig. 1". */
  figure: number;
  /** What the machine shows, in a few words. */
  title: string;
  /** What to do with it: "Drag the carriage, then let go". */
  hint: string;
  /** The live value, already formatted. */
  readout: string;
  /** One or two sentences under the card: what each moving part stands for. */
  caption?: ReactNode;
  /** The figure: an `IsoStage` inside a `FigureCanvas`, usually under a gesture detector. */
  children: ReactNode;
  className?: string;
}

export function ApparatusFrame({ figure, title, hint, readout, caption, children, className }: ApparatusFrameProps) {
  return (
    <View className={className}>
      <Frame>
        <Frame.Header>
          <Frame.Title>{title}</Frame.Title>
          <Frame.Action>{`Fig. ${figure}`}</Frame.Action>
        </Frame.Header>
        <Frame.Panel>{children}</Frame.Panel>
        <Frame.Footer>
          <Text size="sm" muted className="flex-1">
            {hint}
          </Text>
          <Text size="sm" weight="medium" style={{ fontVariant: ['tabular-nums'] }}>
            {readout}
          </Text>
        </Frame.Footer>
      </Frame>
      {caption ? (
        <Text size="sm" muted className="mt-3 px-1">
          {caption}
        </Text>
      ) : null}
    </View>
  );
}
