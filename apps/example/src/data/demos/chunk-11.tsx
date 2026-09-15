import { useEffect, useRef, useState } from "react";
import Animated, { cancelAnimation, Easing, FadeInDown, FadeOutDown, runOnJS, useAnimatedRef, useAnimatedStyle, useSharedValue, withSpring, withTiming, ZoomIn } from "react-native-reanimated";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Pressable, ScrollView, View } from "react-native";
import { Alert, Avatar, Badge, BookmarkIcon, BottomSheet, Button, Card, CheckIcon, ChevronLeftIcon, EllipsisIcon, EyeIcon, Frame, HeartIcon, ImageViewer, Item, ListChecksIcon, MaximizeIcon, Message, MessageCircleIcon, MessageScroller, Plan, MicIcon, MoonIcon, PackageIcon, PauseIcon, PencilIcon, PlayIcon, Post, type PostVote, Portal, Progress, RepeatIcon, Scrim, SendIcon, ShareNodesIcon, ScrollBlur, ScrollFade, Separator, Signature, type SignatureHandle, Skeleton, Sortable, reorderItems, useSortableItem, Soundwave, Steps, SunIcon, Surface, Task, Text, XIcon, ToggleButton, ToggleButtonGroup, useThemeMode } from "panelui-native";
import { formatClock, useVoiceRecorder, VoiceControls } from "../../components/voice";
import { useCSSVariable } from 'uniwind';
import type { ComponentEntry } from '../component-types';

/** Stable remote portraits for the Avatar demos. */
const AVATARS = [
  'https://i.pravatar.cc/150?img=12',
  'https://i.pravatar.cc/150?img=32',
  'https://i.pravatar.cc/150?img=47',
];

/** Photographs for the Post demos, wide enough to crop to 16:10 without blur. */
const POST_PHOTOS = {
  savings: 'https://images.unsplash.com/photo-1579621970588-a35d0e7ab9b6?w=900&q=60',
  workshop: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=900&q=60',
  coast: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=900&q=60',
};

/* Signature */

/** The pad on its own, with the controls it usually travels with. */
function SignatureDemo({ guideline = false }: { guideline?: boolean }) {
  const pad = useRef<SignatureHandle>(null);
  const [count, setCount] = useState(0);

  return (
    <View className="w-full gap-3">
      <Signature
        ref={pad}
        guideline={guideline}
        guidelineLabel={guideline ? 'Sign above the line' : undefined}
        onChange={setCount}
      />
      <Signature.Toolbar>
        <View className="flex-row gap-2">
          <Signature.Undo disabled={count === 0} onPress={() => pad.current?.undo()} />
          <Signature.Clear disabled={count === 0} onPress={() => pad.current?.clear()} />
        </View>
        <Text size="xs" muted>
          {count === 0 ? 'Nothing signed yet' : `${count} strokes`}
        </Text>
      </Signature.Toolbar>
    </View>
  );
}

/** How far the frame lifts to make room for the confirm button. */
const SIGNING_LIFT = 28;

/**
 * The frame version: the pad comes up as a framed panel over a frosted screen,
 * which is where a signature is usually asked for — over the thing being
 * signed, not instead of it.
 *
 * The confirm button is not in the frame. Inside it, it is a third control
 * competing with redo and close for a strip of chrome, and it is disabled for
 * as long as the pad is empty — which is a button asking to be pressed and
 * refusing. Outside and absent until there is a stroke, it appears exactly when
 * it means something, and the frame lifts to acknowledge it.
 */
function SignatureSheetVersion() {
  const [open, setOpen] = useState(false);
  const [signed, setSigned] = useState(false);

  return (
    <View className="flex-1 items-center justify-center gap-4 px-6">
      {signed ? (
        <Alert variant="success" className="w-full">
          <Alert.Indicator />
          <Text size="sm">Signed. The agreement is on its way.</Text>
        </Alert>
      ) : (
        <Text size="sm" muted className="text-center">
          A signature is asked for over the thing being signed, so the pad comes
          up over the screen rather than taking you to another one.
        </Text>
      )}
      <Button onPress={() => setOpen(true)}>
        {signed ? 'Sign again' : 'Sign the agreement'}
      </Button>

      {/* Mounted only while open, so the pad starts empty every time and the
          frame plays its entrance rather than being revealed already there. */}
      {open ? (
        <Portal>
          <SigningFrame
            onClose={() => setOpen(false)}
            onFinish={() => {
              setSigned(true);
              setOpen(false);
            }}
          />
        </Portal>
      ) : null}
    </View>
  );
}

/**
 * The frame itself, and the backdrop it sits over. One shape for one job, so
 * signing feels the same wherever it is asked for — `onFinish` is handed the
 * pad so a caller that wants the drawing back can take it before it goes.
 */
function SigningFrame({
  guideline = false,
  onClose,
  onFinish,
}: {
  guideline?: boolean;
  onClose: () => void;
  onFinish: (pad: SignatureHandle | null) => void;
}) {
  const pad = useRef<SignatureHandle>(null);
  const [count, setCount] = useState(0);
  const lift = useSharedValue(0);

  useEffect(() => {
    lift.value = withSpring(count > 0 ? -SIGNING_LIFT : 0, {
      damping: 22,
      stiffness: 240,
      mass: 0.8,
    });
  }, [count, lift]);

  const rise = useAnimatedStyle(() => ({
    transform: [{ translateY: lift.value }],
  }));

  return (
    <View className="absolute inset-0 items-center justify-center px-6">
      {/* Scrim frosts the screen and takes no touches of its own, so the
          dismiss Pressable goes over it rather than around it. */}
      <Scrim blur />
      <Pressable
        accessibilityLabel="Close"
        className="absolute inset-0"
        onPress={onClose}
      />

      {/* The entry animation and the lift are on separate views on purpose.
          A layout animation owns the transform of the view it is applied to,
          so an animated `translateY` on the same view is fought over and
          Reanimated warns about it — the wrapper enters, the child lifts. */}
      <Animated.View
        entering={ZoomIn.springify().damping(18).stiffness(250).mass(0.6)}
        className="w-full"
      >
        <Animated.View style={rise}>
          {/* The dashed edge says the whole panel is the thing being filled in,
              the way a form field does. */}
          <Frame className="rounded-[28px] border-2 border-dashed">
            <Frame.Header>
              {/* Clear rather than undo: at the size a signature is drawn, a
                  stroke is rarely the unit you want back — you either keep the
                  signature or start it again. It dims once there is nothing to
                  wipe, which is also when the confirm button is gone. */}
              <Signature.Clear
                accessibilityLabel="Start over"
                className="bg-transparent"
                disabled={count === 0}
                onPress={() => pad.current?.clear()}
              />
              {/* Two equal-width round buttons on either side, so a flexible
                  centred title lands in the middle of the strip. */}
              <Frame.Title weight="semibold" className="flex-1 text-center text-foreground">
                Sign
              </Frame.Title>
              <SigningCloseButton onPress={onClose} />
            </Frame.Header>
            {/* The shell's radius less its 2px border. The panel is clipped to
                the shell's *outer* rounded rect, so without its own bottom
                radius its opaque corners paint straight over the dashed edge. */}
            <Frame.Panel className="rounded-b-[26px]">
              {/* `bg-background` rather than a literal white: on a dark theme a
                  hardcoded white pad puts light-grey placeholder text on white. */}
              <Signature
                ref={pad}
                size="lg"
                guideline={guideline}
                onChange={setCount}
                className="rounded-none border-0 bg-background"
              />
            </Frame.Panel>
          </Frame>
        </Animated.View>
      </Animated.View>

      {count > 0 ? (
        <Animated.View
          entering={FadeInDown.springify().damping(18).stiffness(220).mass(0.6)}
          exiting={FadeOutDown.duration(150)}
          className="absolute inset-x-6 bottom-16 items-center"
        >
          {/* The label goes through `children` as a string and the icon
              through `startContent`. Passing both as children skips the
              button's own label styling, and a `py-` on top of its fixed
              height pushes the text into the pill's corner radius. */}
          <Button
            size="lg"
            startContent={<PencilIcon size={18} />}
            className="rounded-full px-8"
            onPress={() => onFinish(pad.current)}
          >
            Finish Signature
          </Button>
        </Animated.View>
      ) : null}
    </View>
  );
}

/** The round X in the signing frame's header. */
function SigningCloseButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Close"
      hitSlop={8}
      onPress={onPress}
      className="h-9 w-9 items-center justify-center rounded-full bg-muted active:opacity-70"
    >
      <XIcon size={16} />
    </Pressable>
  );
}

/** An agreement you scroll, with the signature landing back in the document. */
function SignatureDocumentVersion() {
  const [open, setOpen] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);

  return (
    <View className="flex-1">
      <ScrollView contentContainerClassName="gap-4 px-5 pb-10 pt-2">
        <Text size="lg" weight="semibold">
          Services agreement
        </Text>
        {Array.from({ length: 6 }, (_, index) => (
          <Text key={index} size="sm" muted>
            {index + 1}. This clause exists so the agreement is long enough to
            scroll, which is the point of signing at the bottom of one rather
            than on a screen of its own.
          </Text>
        ))}

        <Frame className="mt-2">
          <Frame.Header>
            <Frame.Title>Signature</Frame.Title>
            <Frame.Action>{signature ? 'Signed' : 'Required'}</Frame.Action>
          </Frame.Header>
          <Frame.Panel>
            <Frame.Row onPress={() => setOpen(true)} chevron>
              <Frame.Media>
                <PencilIcon size={18} />
              </Frame.Media>
              <Frame.Content>
                <Frame.Title>
                  {signature ? 'Signed by Khalid Abdi' : 'Tap to sign'}
                </Frame.Title>
                <Frame.Description>
                  {signature
                    ? 'Captured as an SVG, stored with the agreement.'
                    : 'Your signature is captured as vector paths, not a photo.'}
                </Frame.Description>
              </Frame.Content>
            </Frame.Row>
          </Frame.Panel>
        </Frame>

        {signature ? (
          <Text size="xs" muted numberOfLines={3}>
            {signature.slice(0, 180)}…
          </Text>
        ) : null}
      </ScrollView>

      {/* The same signing frame as the standalone version — one shape for one
          job, so signing feels the same wherever it is asked for. */}
      {open ? (
        <Portal>
          <SigningFrame
            guideline
            onClose={() => setOpen(false)}
            onFinish={(signed) => {
              setSignature(signed?.toSVG() ?? null);
              setOpen(false);
            }}
          />
        </Portal>
      ) : null}
    </View>
  );
}

/** Saving to a file — the part that needs the optional packages. */
function SignatureExportVersion() {
  const pad = useRef<SignatureHandle>(null);
  const [count, setCount] = useState(0);
  const [format, setFormat] = useState('svg');
  const [result, setResult] = useState<string | null>(null);

  return (
    <View className="flex-1 gap-4 px-5 pt-2">
      <Signature ref={pad} size="lg" guideline onChange={setCount} />

      <ToggleButtonGroup
        selectionMode="single"
        value={[format]}
        onValueChange={(next) => setFormat(next[0] ?? 'svg')}
      >
        <ToggleButton id="svg">SVG</ToggleButton>
        <ToggleButton id="png">PNG</ToggleButton>
      </ToggleButtonGroup>

      <View className="flex-row gap-2">
        <Button
          variant="outline"
          className="flex-1"
          disabled={count === 0}
          onPress={() => pad.current?.clear()}
        >
          Clear
        </Button>
        <Button
          className="flex-1"
          disabled={count === 0}
          onPress={async () => {
            try {
              const file = await pad.current?.save({
                filename: 'agreement',
                format: format as 'svg' | 'png',
              });
              setResult(file ? `${file.uri} (${file.width}×${file.height})` : null);
            } catch (error) {
              // The optional packages report themselves by name, so showing the
              // message is more useful than a generic failure.
              setResult(error instanceof Error ? error.message : String(error));
            }
          }}
        >
          Save
        </Button>
      </View>

      {result ? (
        <Text size="xs" muted>
          {result}
        </Text>
      ) : (
        <Text size="xs" muted>
          Saving writes to the app&apos;s document directory. PNG needs the
          optional raster package; SVG needs nothing.
        </Text>
      )}
    </View>
  );
}

/** The whole screen is the pad — for a form that signs and nothing else. */
function SignatureFullScreenVersion() {
  const pad = useRef<SignatureHandle>(null);
  const [count, setCount] = useState(0);

  return (
    <View className="flex-1">
      <Signature
        ref={pad}
        size="full"
        guideline
        guidelineLabel="Khalid Abdi"
        onChange={setCount}
        placeholder={
          <Text size="sm" muted>
            Turn the device sideways and sign across the screen
          </Text>
        }
      />
      <View className="flex-row items-center justify-between gap-2 border-t border-border px-5 py-4">
        <Signature.Clear disabled={count === 0} onPress={() => pad.current?.clear()} />
        <Button disabled={count === 0} className="flex-1">
          Accept and continue
        </Button>
      </View>
    </View>
  );
}

/** Proof of delivery — the shape a courier app actually asks for. */
function SignatureDeliveryVersion() {
  const pad = useRef<SignatureHandle>(null);
  const [count, setCount] = useState(0);
  const [confirmed, setConfirmed] = useState(false);

  return (
    <ScrollView contentContainerClassName="gap-4 px-5 pb-10 pt-2">
      <Frame>
        <Frame.Header>
          <Frame.Title>Delivery 4821</Frame.Title>
          <Frame.Action>
            <Badge variant="secondary">2 parcels</Badge>
          </Frame.Action>
        </Frame.Header>
        <Frame.Panel>
          <Frame.Row>
            <Frame.Media>
              <PackageIcon size={18} />
            </Frame.Media>
            <Frame.Content>
              <Frame.Title>Khalid Abdi</Frame.Title>
              <Frame.Description>
                14 Cadogan Street · Handed to the recipient
              </Frame.Description>
            </Frame.Content>
          </Frame.Row>
          <Frame.Row>
            <Frame.Content>
              <Frame.Title>Received at</Frame.Title>
            </Frame.Content>
            <Frame.Actions>
              <Text size="sm" muted>
                14:32
              </Text>
            </Frame.Actions>
          </Frame.Row>
        </Frame.Panel>
      </Frame>

      <Text size="sm" muted>
        Recipient signature
      </Text>
      <Signature ref={pad} guideline onChange={setCount} />

      <View className="flex-row gap-2">
        <Signature.Clear disabled={count === 0} onPress={() => pad.current?.clear()} />
        <Button
          className="flex-1"
          disabled={count === 0 || confirmed}
          onPress={() => setConfirmed(true)}
        >
          {confirmed ? 'Confirmed' : 'Confirm delivery'}
        </Button>
      </View>

      {confirmed ? (
        <Alert variant="success">
          <Alert.Indicator />
          <Text size="sm">Delivery confirmed and the signature attached.</Text>
        </Alert>
      ) : null}
    </ScrollView>
  );
}

/* -------------------------------------------------------------------------- */
/* Soundwave                                                                  */
/* -------------------------------------------------------------------------- */

const WAVE_STATES = ['idle', 'listening', 'thinking', 'speaking'] as const;

/** The capsules over a microphone button — a voice-mode screen. */
function SoundwavePillsVersion() {
  const voice = useVoiceRecorder();
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-1 justify-between pt-6"
      style={{ paddingBottom: insets.bottom + 24 }}
    >
      <View className="flex-1 items-center justify-center gap-8">
        <Soundwave
          variant="pills"
          state={voice.recording ? 'listening' : 'idle'}
          level={voice.recording ? voice.level : undefined}
          height={120}
          barWidth={34}
          barGap={12}
        />
        <Text muted>{voice.recording ? 'Listening' : 'Press record to start'}</Text>
      </View>

      <VoiceControls voice={voice} />
    </View>
  );
}

/** The metering strip, in both modes, at the size it is actually used. */
function SoundwaveBarsVersion() {
  const voice = useVoiceRecorder();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      contentContainerClassName="gap-6 py-6"
      contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
    >
      <View className="gap-3 px-5">
        <Text size="sm" muted>
          static — every bar is a band of the current level
        </Text>
        <Card>
          <Card.Content className="p-4">
            <Soundwave
              variant="bars"
              mode="static"
              state={voice.recording ? 'listening' : 'idle'}
              level={voice.recording ? voice.level : undefined}
              height={64}
            />
          </Card.Content>
        </Card>
      </View>

      <View className="gap-3 px-5">
        <Text size="sm" muted>
          scrolling — history slides left, newest on the right
        </Text>
        <Card>
          <Card.Content className="p-4">
            <Soundwave
              variant="bars"
              mode="scrolling"
              state={voice.recording ? 'listening' : 'idle'}
              level={voice.recording ? voice.level : undefined}
              height={64}
            />
          </Card.Content>
        </Card>
      </View>

      <View className="gap-3 px-5">
        <Text size="sm" muted>
          not centered, and thicker — a recording row
        </Text>
        <Card>
          <Card.Content className="flex-row items-center gap-3 p-4">
            <MicIcon size={18} />
            <View className="flex-1">
              <Soundwave
                variant="bars"
                mode="scrolling"
                centered={false}
                bars={28}
                barWidth={5}
                height={40}
                state={voice.recording ? 'listening' : 'idle'}
                level={voice.recording ? voice.level : undefined}
              />
            </View>
            <Text size="sm" muted>
              {formatClock(voice.seconds)}
            </Text>
          </Card.Content>
        </Card>
      </View>

      <VoiceControls voice={voice} compact />
    </ScrollView>
  );
}

/** The travelling wave, and what each state does to it with no level supplied. */
function SoundwaveLineVersion() {
  const [state, setState] = useState<string[]>(['speaking']);
  const voice = useVoiceRecorder();
  const insets = useSafeAreaInsets();
  const picked = WAVE_STATES.find((name) => name === state[0]) ?? 'speaking';
  // Recording wins over the picker: pressing the button is the demo, and a
  // wave that ignored it would be the wrong lesson.
  const current = voice.recording ? 'listening' : picked;

  return (
    <ScrollView
      contentContainerClassName="gap-6 py-6"
      contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
    >
      <View className="px-5">
        <Card>
          <Card.Content className="p-4">
            <Soundwave
              variant="line"
              state={current}
              level={voice.recording ? voice.level : undefined}
              height={96}
            />
          </Card.Content>
        </Card>
      </View>

      <View className="gap-3 px-5">
        <Text size="sm" muted>
          state — what it animates with no level supplied
        </Text>
        <ToggleButtonGroup selectionMode="single" value={state} onValueChange={setState}>
          {WAVE_STATES.map((name) => (
            <ToggleButton key={name} id={name}>
              {name}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </View>

      <View className="gap-3 px-5">
        <Text size="sm" muted>
          Under a reply, at the size it would sit there
        </Text>
        <Message>
          <Message.Avatar>
            <Avatar size="sm" fallback="AI" />
          </Message.Avatar>
          <Message.Content>
            <Message.Bubble>
              <View className="w-full gap-2">
                <Text size="sm">Here is what I found in the changelog.</Text>
                <Soundwave variant="line" state="speaking" height={36} barWidth={2} />
              </View>
            </Message.Bubble>
          </Message.Content>
        </Message>
      </View>

      <VoiceControls voice={voice} compact />
    </ScrollView>
  );
}

/**
 * The glow, taking the whole screen.
 *
 * This one runs full bleed — no title bar above it — because that is the only
 * way to see what it does: a rim of light around the *screen* reads as a lit
 * room, and the same thing under a header reads as a coloured box. So the
 * screen's chrome comes inside it instead: a way back, and a light/dark toggle,
 * since half the point of an ambient glow is how differently it sits in the two.
 */
function SoundwaveAmbientVersion() {
  const voice = useVoiceRecorder();
  const insets = useSafeAreaInsets();
  const { mode, toggleMode } = useThemeMode();

  return (
    <View className="flex-1 bg-background">
      {/* Absolutely positioned and non-interactive, so it goes behind the
          screen's own content rather than wrapping it. */}
      <Soundwave
        variant="ambient"
        state={voice.recording ? 'listening' : 'idle'}
        level={voice.recording ? voice.level : undefined}
        radius={40}
      />

      <View
        className="flex-row items-center justify-between px-5"
        style={{ paddingTop: insets.top + 8 }}
      >
        <Button
          variant="ghost"
          size="icon"
          className="size-10 rounded-full"
          onPress={() => router.back()}
          accessibilityLabel="Back"
        >
          <ChevronLeftIcon size={20} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-10 rounded-full"
          onPress={toggleMode}
          accessibilityLabel={mode === 'dark' ? 'Switch to light' : 'Switch to dark'}
        >
          {mode === 'dark' ? <SunIcon size={18} /> : <MoonIcon size={18} />}
        </Button>
      </View>

      <View className="flex-1 items-center justify-center gap-3">
        <Text size="xl" weight="medium">
          {voice.recording ? 'Listening' : 'Start chatting anytime'}
        </Text>
        <Text size="sm" muted>
          The room is lit by the level, not by a spinner.
        </Text>
      </View>

      <View style={{ paddingBottom: insets.bottom + 24 }}>
        <VoiceControls voice={voice} />
      </View>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Soundwave in a conversation                                                */
/* -------------------------------------------------------------------------- */

interface VoiceNote {
  id: string;
  align: 'start' | 'end';
  /** The stored shape of the recording — 40 numbers, not the audio. */
  levels: number[];
  seconds: number;
  time: string;
  /** Empty for the seeded notes: there is no file, only a waveform. */
  uri: string;
}

/** A plausible waveform, seeded so a note looks the same on every render. */
function seedWaveform(seed: number, bars = 40): number[] {
  let state = seed;
  const random = () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
  return Array.from({ length: bars }, (_unused, index) => {
    // Syllables, not noise: a slow envelope with quick peaks riding it, which
    // is what speech looks like once it is metered.
    const envelope = 0.45 + 0.55 * Math.sin((index / bars) * Math.PI * 2.2 + seed);
    return Math.max(0.08, Math.min(1, envelope * (0.5 + 0.7 * random())));
  });
}

const SEED_NOTES: VoiceNote[] = [
  { id: 'n1', align: 'start', levels: seedWaveform(3), seconds: 8, time: '09:41', uri: '' },
  { id: 'n2', align: 'end', levels: seedWaveform(11), seconds: 4, time: '09:42', uri: '' },
  { id: 'n3', align: 'start', levels: seedWaveform(27), seconds: 12, time: '09:44', uri: '' },
];

/**
 * One voice note: play, the waveform, the duration.
 *
 * The waveform is `levels` — the shape captured while recording — and the
 * playhead is `progress`, so the bars behind it fill as it plays. A recorded
 * note plays for real; the seeded ones have no file, so their playhead is
 * animated at the same rate rather than pretending there is audio behind it.
 */
/** The play button. Its icon takes the bubble's own foreground, so it reads on
 *  the sent side and the received one alike. */
function NoteButton({ playing, onPress }: { playing: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={playing ? 'Pause' : 'Play'}
      onPress={onPress}
      className="size-9 items-center justify-center rounded-full"
    >
      {playing ? <PauseIcon size={16} /> : <PlayIcon size={16} />}
    </Pressable>
  );
}

function VoiceNoteBubble({ note }: { note: VoiceNote }) {
  const player = useAudioPlayer(note.uri || null);
  const status = useAudioPlayerStatus(player);
  const progress = useSharedValue(0);
  const [playingSeed, setPlayingSeed] = useState(false);

  useEffect(() => {
    if (!note.uri) return;
    progress.value = status.duration
      ? Math.min(1, status.currentTime / status.duration)
      : 0;
  }, [note.uri, status.currentTime, status.duration, progress]);

  const playing = note.uri ? status.playing : playingSeed;

  const toggle = () => {
    if (note.uri) {
      if (status.playing) player.pause();
      else {
        if (status.didJustFinish || status.currentTime >= status.duration) player.seekTo(0);
        player.play();
      }
      return;
    }

    if (playingSeed) {
      cancelAnimation(progress);
      setPlayingSeed(false);
      return;
    }
    setPlayingSeed(true);
    progress.value = 0;
    progress.value = withTiming(
      1,
      { duration: note.seconds * 1000, easing: Easing.linear },
      (finished) => {
        if (finished) runOnJS(setPlayingSeed)(false);
      }
    );
  };

  return (
    <Message align={note.align}>
      <Message.Content>
        <Message.Bubble className="px-3 py-2.5">
          <View className="w-64 flex-row items-center gap-3">
            <NoteButton playing={playing} onPress={toggle} />

            <View className="flex-1">
              {/* `levels` freezes the wave into the recorded shape, so nothing
                  animates until the playhead moves. */}
              <Soundwave
                variant="bars"
                levels={note.levels}
                progress={progress}
                bars={40}
                barWidth={2}
                height={28}
              />
            </View>

            <Text size="xs" muted>
              {formatClock(note.seconds)}
            </Text>
          </View>
        </Message.Bubble>
        <Message.Footer>{note.time}</Message.Footer>
      </Message.Content>
    </Message>
  );
}

/** Voice notes in a transcript — record one and it joins the thread. */
function SoundwaveNotesVersion() {
  const voice = useVoiceRecorder();
  const insets = useSafeAreaInsets();
  const [notes, setNotes] = useState<VoiceNote[]>(SEED_NOTES);

  useEffect(() => {
    if (!voice.note) return;
    setNotes((current) => [
      ...current,
      {
        id: `rec-${current.length}`,
        align: 'end',
        levels: voice.note!.levels,
        seconds: voice.note!.seconds,
        time: 'now',
        uri: voice.note!.uri,
      },
    ]);
    voice.clearNote();
  }, [voice]);

  return (
    <View className="flex-1">
      <ScrollView contentContainerClassName="gap-3 px-4 py-4">
        {notes.map((note) => (
          <VoiceNoteBubble key={note.id} note={note} />
        ))}
      </ScrollView>

      <View className="border-t border-border pt-5" style={{ paddingBottom: insets.bottom + 20 }}>
        <VoiceControls voice={voice} compact />
      </View>
    </View>
  );
}

/** The composer that turns into a recorder, over a live transcript. */
function SoundwaveComposerVersion() {
  const voice = useVoiceRecorder();
  const insets = useSafeAreaInsets();
  const [notes, setNotes] = useState<VoiceNote[]>(SEED_NOTES.slice(0, 2));

  useEffect(() => {
    if (!voice.note) return;
    setNotes((current) => [
      ...current,
      {
        id: `rec-${current.length}`,
        align: 'end',
        levels: voice.note!.levels,
        seconds: voice.note!.seconds,
        time: 'now',
        uri: voice.note!.uri,
      },
    ]);
    voice.clearNote();
  }, [voice]);

  return (
    <View className="flex-1">
      {voice.meter}

      <MessageScroller autoScroll className="flex-1">
        <MessageScroller.Viewport>
          <MessageScroller.Content className="gap-3 px-4 py-4">
            {notes.map((note) => (
              <MessageScroller.Item key={note.id} messageId={note.id}>
                <VoiceNoteBubble note={note} />
              </MessageScroller.Item>
            ))}
          </MessageScroller.Content>
        </MessageScroller.Viewport>
        <MessageScroller.Button />
      </MessageScroller>

      {/* The version screen renders edge to edge, so the composer is what has
          to clear the home indicator. */}
      <View
        className="border-t border-border p-3"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        {voice.recording ? (
          <View className="flex-row items-center gap-3">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel recording"
              onPress={voice.cancel}
              className="size-10 items-center justify-center rounded-full"
            >
              <XIcon size={18} />
            </Pressable>

            <View className="flex-1">
              {/* Scrolling, because a composer is showing what was just said
                  rather than a level: the last few seconds slide past. */}
              <Soundwave
                variant="bars"
                mode="scrolling"
                level={voice.level}
                bars={32}
                barWidth={3}
                height={36}
              />
            </View>

            <Text size="sm" muted>
              {formatClock(voice.seconds)}
            </Text>

            <Button size="icon" className="size-10 rounded-full" onPress={voice.toggle}>
              <SendIcon size={16} />
            </Button>
          </View>
        ) : (
          <View className="flex-row items-center gap-3">
            <View className="flex-1 rounded-full bg-muted px-4 py-2.5">
              <Text size="sm" muted>
                Hold the mic, or press it
              </Text>
            </View>
            <Button size="icon" className="size-10 rounded-full" onPress={voice.toggle}>
              <MicIcon size={18} />
            </Button>
          </View>
        )}

        {voice.reason ? (
          <Text size="xs" muted className="pt-3 text-center">
            {voice.reason}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Post                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * The full card. Every count in the footer is live, so a press moves a number
 * rather than only lighting an icon.
 */
function FeedPostDemo() {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);

  return (
    <Post variant="feed" className="w-full">
      <Post.Header>
        <Post.Author
          name="Dwayne F. White"
          verified
          timestamp="Posted 3m ago"
          avatar={{ uri: AVATARS[0] }}
        />
        <Post.Action>
          <EllipsisIcon size={18} />
        </Post.Action>
      </Post.Header>

      <Post.Body onTagPress={() => {}}>
        {
          "I've been working hard to pay off my credit card debt, and I'm wondering what strategies you've all found most effective? #FinancialFreedom #DebtSnowball"
        }
      </Post.Body>

      <Post.Media
        source={{ uri: POST_PHOTOS.savings }}
        alt="A coin going into a piggy bank beside stacks of change"
        overlay={
          <View className="absolute end-3 top-3 h-8 w-8 items-center justify-center rounded-lg bg-black/45">
            <MaximizeIcon size={16} color="#ffffff" />
          </View>
        }
      />

      <Post.Footer>
        <Post.Stat icon={EyeIcon} value="5,874" />
        <Post.Stat
          icon={HeartIcon}
          tone="like"
          active={liked}
          value={liked ? 216 : 215}
          onPress={() => setLiked((on) => !on)}
        />
        <Post.Stat icon={MessageCircleIcon} value="11" onPress={() => {}} />
        <Post.Stat
          icon={BookmarkIcon}
          tone="save"
          align="end"
          active={saved}
          value={saved ? 'Saved' : 'Save'}
          onPress={() => setSaved((on) => !on)}
        />
      </Post.Footer>
    </Post>
  );
}

/**
 * The ranked-community shape: a score pill beside the headline. Pressing the
 * arrow already cast clears the vote, so a mind can be changed.
 */
function VotePostDemo() {
  const [vote, setVote] = useState<PostVote>(null);
  const base = 1240;
  const score = base + (vote === 'up' ? 1 : vote === 'down' ? -1 : 0);

  return (
    <Post variant="vote" className="w-full">
      <Post.Header>
        <Post.Community
          name="r/reactnative"
          avatar={{ uri: AVATARS[1] }}
          meta="5h ago"
        />
        <Post.Action>
          <EllipsisIcon size={18} />
        </Post.Action>
      </Post.Header>

      <Post.Title>Reanimated 4 shipped — what actually changed?</Post.Title>
      <Post.Body numberOfLines={3}>
        The worklet runtime is the headline, but the part that matters day to day
        is that layout animations finally compose with shared values.
      </Post.Body>

      <Post.Footer>
        <Post.Votes score={score.toLocaleString()} vote={vote} onVote={setVote} />
        <Post.Stat icon={MessageCircleIcon} value="184" onPress={() => {}} />
        <Post.Stat icon={ShareNodesIcon} value="Share" align="end" onPress={() => {}} />
      </Post.Footer>
    </Post>
  );
}

/** A dense timeline row: name and handle on one line, no media. */
function CompactPostDemo() {
  const [liked, setLiked] = useState(true);
  const [reposted, setReposted] = useState(false);

  return (
    <Post variant="compact" className="w-full">
      <Post.Header>
        <Post.Author
          name="Ada Okonkwo"
          handle="@ada"
          timestamp="12m"
          avatar={{ uri: AVATARS[2] }}
        />
        <Post.Action>
          <EllipsisIcon size={16} />
        </Post.Action>
      </Post.Header>

      <Post.Body onMentionPress={() => {}}>
        Spent the morning deleting a caching layer nobody had touched in a year.
        Fastest the app has ever been. cc @dwayne
      </Post.Body>

      <Post.Footer>
        <Post.Stat icon={MessageCircleIcon} value="8" onPress={() => {}} />
        <Post.Stat
          icon={RepeatIcon}
          tone="repost"
          active={reposted}
          value={reposted ? 41 : 40}
          onPress={() => setReposted((on) => !on)}
        />
        <Post.Stat
          icon={HeartIcon}
          tone="like"
          active={liked}
          value={liked ? 312 : 311}
          onPress={() => setLiked((on) => !on)}
        />
        <Post.Stat icon={EyeIcon} value="9.1k" align="end" />
      </Post.Footer>
    </Post>
  );
}

/** The image is the card, and the author is laid over it. */
function MediaPostDemo() {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);

  return (
    <Post variant="media" className="w-full">
      {/* The scrim comes with the variant: white type over a photograph is only
          legible against one, and a flat panel would have an edge of its own. */}
      <Post.Media
        source={{ uri: POST_PHOTOS.coast }}
        aspectRatio={4 / 3}
        alt="A coastline at dusk"
      />
      <Post.Header>
        <Post.Author
          name="Marta Lindqvist"
          verified
          timestamp="Yesterday"
          avatar={{ uri: AVATARS[1] }}
        />
      </Post.Header>

      <Post.Body onTagPress={() => {}}>
        Four hours of walking for eleven minutes of light. #goldenhour
      </Post.Body>

      <Post.Footer>
        <Post.Stat
          icon={HeartIcon}
          tone="like"
          active={liked}
          value={liked ? '2,041' : '2,040'}
          onPress={() => setLiked((on) => !on)}
        />
        <Post.Stat icon={MessageCircleIcon} value="63" onPress={() => {}} />
        <Post.Stat
          icon={BookmarkIcon}
          tone="save"
          align="end"
          active={saved}
          onPress={() => setSaved((on) => !on)}
        />
      </Post.Footer>
    </Post>
  );
}

/**
 * An Unsplash photograph for the photo posts: a card-sized copy for the feed, and
 * one large enough to zoom into that only loads once the viewer opens.
 */
function postPhoto(id: string) {
  const url = (width: number) => ({
    uri: `https://images.unsplash.com/photo-${id}?w=${width}&q=70`,
  });
  return { source: url(800), fullSource: url(1600) };
}

const HIKE_PHOTOS = [
  {
    id: '1506905925346-21bda4d32df4',
    alt: 'Mountain peaks above a sea of cloud at sunrise',
    caption: 'Twenty to six, from the top of the pass.',
  },
  {
    id: '1469474968028-56623f02e42e',
    alt: 'A hiker standing on a boulder above a misty valley',
    caption: 'Tom, refusing to come down off that rock.',
  },
  {
    id: '1501785888041-af3ef285b470',
    alt: 'A rowing boat on a turquoise lake under limestone peaks',
    caption: 'The lake at the bottom of the descent.',
  },
  {
    id: '1519681393784-d120267933ba',
    alt: 'The Milky Way over snowy mountains',
    caption: 'The one clear night.',
  },
];

/** A post whose single photo opens full screen. */
function SinglePhotoPost() {
  const [liked, setLiked] = useState(false);
  const photo = postPhoto('1500530855697-b586d89ba3ee');

  return (
    <Post variant="feed" className="w-full">
      <Post.Header>
        <Post.Author
          name="Priya Raman"
          handle="@priyaroams"
          timestamp="2h ago"
          avatar={{ uri: AVATARS[2] }}
        />
        <Post.Action>
          <EllipsisIcon size={18} />
        </Post.Action>
      </Post.Header>

      <Post.Body>Four hundred kilometres and one petrol station. #roadtrip</Post.Body>

      {/* The trigger takes the media's margin and corners, so the picture flies
          out of exactly the shape the card drew it in. */}
      <ImageViewer>
        <ImageViewer.Trigger
          {...photo}
          alt="An empty road running between red rock formations"
          radius={12}
          className="mx-4 rounded-xl"
        >
          <Post.Media source={photo.source} className="mx-0" />
        </ImageViewer.Trigger>
      </ImageViewer>

      <Post.Footer>
        <Post.Stat
          icon={HeartIcon}
          tone="like"
          active={liked}
          value={liked ? 489 : 488}
          onPress={() => setLiked((on) => !on)}
        />
        <Post.Stat icon={MessageCircleIcon} value="32" onPress={() => {}} />
        <Post.Stat icon={ShareNodesIcon} value="Share" align="end" onPress={() => {}} />
      </Post.Footer>
    </Post>
  );
}

/** Four photos in a grid, one gallery: open any and swipe through the rest. */
function PhotoGridPost() {
  const [liked, setLiked] = useState(true);
  const [saved, setSaved] = useState(false);

  return (
    <Post variant="feed" className="w-full">
      <Post.Header>
        <Post.Author
          name="Jonas Reuter"
          verified
          timestamp="Yesterday"
          avatar={{ uri: AVATARS[0] }}
        />
        <Post.Action>
          <EllipsisIcon size={18} />
        </Post.Action>
      </Post.Header>

      <Post.Body>
        Three days over the pass. Fog for most of it, then this. #hiking #nofilter
      </Post.Body>

      <ImageViewer>
        <View className="mx-4 gap-1">
          {[HIKE_PHOTOS.slice(0, 2), HIKE_PHOTOS.slice(2)].map((row, rowIndex) => (
            <View key={rowIndex} className="flex-row gap-1">
              {row.map((entry) => (
                <ImageViewer.Trigger
                  key={entry.id}
                  {...postPhoto(entry.id)}
                  alt={entry.alt}
                  caption={entry.caption}
                  radius={8}
                  className="aspect-square flex-1 rounded-lg bg-muted"
                />
              ))}
            </View>
          ))}
        </View>
      </ImageViewer>

      <Post.Footer>
        <Post.Stat
          icon={HeartIcon}
          tone="like"
          active={liked}
          value={liked ? '1,204' : '1,203'}
          onPress={() => setLiked((on) => !on)}
        />
        <Post.Stat icon={MessageCircleIcon} value="87" onPress={() => {}} />
        <Post.Stat
          icon={BookmarkIcon}
          tone="save"
          align="end"
          active={saved}
          onPress={() => setSaved((on) => !on)}
        />
      </Post.Footer>
    </Post>
  );
}

/** The media-first card, where the whole photograph is the thing to press. */
function MediaFirstPhotoPost() {
  const [liked, setLiked] = useState(false);
  const photo = postPhoto('1493246507139-91e8fad9978e');

  return (
    <Post variant="media" className="w-full">
      <ImageViewer>
        <ImageViewer.Trigger
          {...photo}
          alt="Red peaks reflected in a still lake at dusk"
          caption="Eleven minutes of light, and we nearly left at ten."
        >
          <Post.Media source={photo.source} aspectRatio={4 / 5} />
        </ImageViewer.Trigger>
      </ImageViewer>
      <Post.Header>
        <Post.Author
          name="Marta Lindqvist"
          verified
          timestamp="3d ago"
          avatar={{ uri: AVATARS[1] }}
        />
      </Post.Header>

      <Post.Body>Four hours of walking for eleven minutes of light. #goldenhour</Post.Body>

      <Post.Footer>
        <Post.Stat
          icon={HeartIcon}
          tone="like"
          active={liked}
          value={liked ? '2,041' : '2,040'}
          onPress={() => setLiked((on) => !on)}
        />
        <Post.Stat icon={MessageCircleIcon} value="63" onPress={() => {}} />
      </Post.Footer>
    </Post>
  );
}

/** A feed whose photos open in an ImageViewer. */
function PostPhotosVersion() {
  return (
    <ScrollView
      contentContainerClassName="gap-4 px-4 pb-12 pt-1"
      showsVerticalScrollIndicator={false}
    >
      <SinglePhotoPost />
      <CompactPostDemo />
      <PhotoGridPost />
      <MediaFirstPhotoPost />
    </ScrollView>
  );
}

/**
 * All four in a scroll, which is the only place a feed card is really judged.
 *
 * Not `fullBleed`: this one keeps the screen's header, because it has no way
 * back of its own and a feed running under the notch is a feed you cannot
 * leave.
 */
function PostFeedDemo() {
  return (
    <ScrollView
      contentContainerClassName="gap-4 px-4 pb-12 pt-1"
      showsVerticalScrollIndicator={false}
    >
      <FeedPostDemo />
      <VotePostDemo />
      <CompactPostDemo />
      <MediaPostDemo />
    </ScrollView>
  );
}

const PLAN_STEPS = [
  { title: 'Make the in-range test inclusive', meta: 'utils/date.ts' },
  { title: 'Round the band only where it stops', meta: 'calendar/index.tsx' },
  { title: 'Square the discs against the band', meta: undefined },
  { title: 'Regenerate the docs page', meta: 'scripts/gen.mjs' },
];

/** The rail: four steps, the running one marked, the finished ones filled in. */
function PlanRailDemo() {
  return (
    <Plan>
      <Plan.Header>
        <Plan.Icon>
          <ListChecksIcon size={16} />
        </Plan.Icon>
        <Plan.Title>Fix the calendar range</Plan.Title>
        <Plan.Description>Four files, and no API change.</Plan.Description>
        <Plan.Action>
          <Plan.Progress />
          <Plan.Trigger />
        </Plan.Action>
      </Plan.Header>
      <Plan.Content>
        <Plan.Steps>
          {PLAN_STEPS.map((step, index) => (
            <Plan.Step
              key={step.title}
              status={index < 2 ? 'done' : index === 2 ? 'active' : 'pending'}
              meta={step.meta}
            >
              {step.title}
            </Plan.Step>
          ))}
        </Plan.Steps>
      </Plan.Content>
      <Plan.Footer>
        <Button variant="outline">Revise</Button>
        <Button>Approve</Button>
      </Plan.Footer>
    </Plan>
  );
}

/**
 * A plan whose fields arrive one at a time, which is what the shimmer is for.
 * The rail fills in behind it, so the header count is a live one.
 */
function PlanStreamDemo() {
  const [streaming, setStreaming] = useState(false);
  const [reached, setReached] = useState(PLAN_STEPS.length);

  useEffect(() => {
    if (!streaming) return;
    const timers = PLAN_STEPS.map((_unused, index) =>
      setTimeout(() => setReached(index), 400 + index * 550)
    );
    const done = setTimeout(() => {
      setReached(PLAN_STEPS.length);
      setStreaming(false);
    }, 400 + PLAN_STEPS.length * 550);

    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(done);
    };
  }, [streaming]);

  const start = () => {
    setReached(-1);
    setStreaming(true);
  };

  return (
    <View className="w-full gap-4">
      <Plan isStreaming={streaming}>
        <Plan.Header>
          <Plan.Icon>
            <ListChecksIcon size={16} />
          </Plan.Icon>
          <Plan.Title>Fix the calendar range</Plan.Title>
          <Plan.Description>Four files, and no API change.</Plan.Description>
          <Plan.Action>
            <Plan.Progress />
            <Plan.Trigger />
          </Plan.Action>
        </Plan.Header>
        <Plan.Content>
          <Plan.Steps>
            {PLAN_STEPS.map((step, index) => (
              <Plan.Step
                key={step.title}
                status={
                  index < reached ? 'done' : index === reached ? 'active' : 'pending'
                }
                meta={step.meta}
              >
                {step.title}
              </Plan.Step>
            ))}
          </Plan.Steps>
        </Plan.Content>
        <Plan.Footer>
          <Button variant="outline">Revise</Button>
          <Button>Approve</Button>
        </Plan.Footer>
      </Plan>
      <Button variant="outline" onPress={start} disabled={streaming}>
        {streaming ? 'Writing…' : 'Stream it in'}
      </Button>
    </View>
  );
}

/** A plan being carried out: the steps have statuses, so they are tasks. */
function PlanWithTasksDemo() {
  return (
    <Plan>
      <Plan.Header>
        <Plan.Title>Fix the calendar range</Plan.Title>
        <Plan.Action>
          <Badge variant="secondary">2 of 3</Badge>
          <Plan.Trigger />
        </Plan.Action>
      </Plan.Header>
      <Plan.Content>
        <Task status="complete">
          <Task.Trigger title="Make the test inclusive" />
          <Task.Content>
            <Task.Item>
              Edited <Task.File>calendar/index.tsx</Task.File>
            </Task.Item>
          </Task.Content>
        </Task>
        <Task status="complete">
          <Task.Trigger title="Round only where it stops" />
          <Task.Content>
            <Task.Item>Four corners, from openStart and openEnd.</Task.Item>
          </Task.Content>
        </Task>
        <Task status="running">
          <Task.Trigger title="Regenerate the docs" />
          <Task.Content>
            <Task.Item>Running docs:generate…</Task.Item>
          </Task.Content>
        </Task>
      </Plan.Content>
    </Plan>
  );
}

/* -------------------------------------------------------------------------- *
 * Sortable                                                                    *
 * -------------------------------------------------------------------------- */

/**
 * The plain case: a checklist that has to be done in order, so the order is
 * the content. Drag a grip and the rows underneath move out of the way.
 */
function SortableTasksDemo() {
  const [tasks, setTasks] = useState([
    { id: 'notes', title: 'Draft the release notes' },
    { id: 'tag', title: 'Cut the tag' },
    { id: 'publish', title: 'Publish to npm' },
    { id: 'post', title: 'Post the changelog' },
  ]);

  return (
    <Sortable
      value={tasks.map((task) => task.id)}
      onReorder={(_, { from, to }) => setTasks((t) => reorderItems(t, from, to))}
      gap={8}
      className="w-full"
    >
      {tasks.map((task, index) => (
        <Sortable.Item key={task.id} id={task.id}>
          <Item variant="outline">
            <Item.Media variant="icon">
              <Text size="sm" muted>
                {index + 1}
              </Text>
            </Item.Media>
            <Item.Content>
              <Item.Title>{task.title}</Item.Title>
            </Item.Content>
            <Sortable.Handle />
          </Item>
        </Sortable.Item>
      ))}
    </Sortable>
  );
}

/**
 * No grip, because there is nothing else on these rows to press: a swatch and
 * two lines of text. Hold one for a moment and it comes loose.
 */
function SortableLongPressDemo() {
  const [colors, setColors] = useState([
    { id: 'iris', name: 'Iris', hex: '#6366f1' },
    { id: 'moss', name: 'Moss', hex: '#16a34a' },
    { id: 'ember', name: 'Ember', hex: '#ea580c' },
    { id: 'slate', name: 'Slate', hex: '#475569' },
  ]);

  return (
    <View className="w-full gap-3">
      <Text size="sm" muted>
        Hold a row for a moment, then drag it.
      </Text>
      <Sortable
        value={colors.map((color) => color.id)}
        onReorder={(_, { from, to }) => setColors((c) => reorderItems(c, from, to))}
        activation="longPress"
        gap={8}
        className="w-full"
      >
        {colors.map((color) => (
          <Sortable.Item key={color.id} id={color.id}>
            <Item variant="outline">
              <View
                className="h-9 w-9 rounded-lg"
                style={{ backgroundColor: color.hex }}
              />
              <Item.Content>
                <Item.Title>{color.name}</Item.Title>
                <Item.Description>{color.hex}</Item.Description>
              </Item.Content>
            </Item>
          </Sortable.Item>
        ))}
      </Sortable>
    </View>
  );
}

/**
 * Rows of three different heights in one list — the case a fixed row height
 * gets wrong. Every row reports its own, so each one lands in the slot its
 * middle actually reached rather than the slot an assumed height predicted.
 */
function SortableMixedHeightsDemo() {
  const [notes, setNotes] = useState([
    { id: 'n1', title: 'Ship the registry fix', body: null as string | null },
    {
      id: 'n2',
      title: 'Rewrite the theming page',
      body: 'The token table is out of date in three places, and the dark-mode section still describes the old variable names.',
    },
    { id: 'n3', title: 'Answer the issue about Metro', body: null },
    {
      id: 'n4',
      title: 'Record the previews',
      body: 'Four components changed this week.',
    },
  ]);

  return (
    <Sortable
      value={notes.map((note) => note.id)}
      onReorder={(_, { from, to }) => setNotes((n) => reorderItems(n, from, to))}
      gap={8}
      className="w-full"
    >
      {notes.map((note) => (
        <Sortable.Item key={note.id} id={note.id}>
          <Item variant="outline">
            <Item.Content>
              <Item.Title>{note.title}</Item.Title>
              {note.body ? <Item.Description>{note.body}</Item.Description> : null}
            </Item.Content>
            <Sortable.Handle />
          </Item>
        </Sortable.Item>
      ))}
    </Sortable>
  );
}

/**
 * `useSortableItem` from inside a row of the caller's own. `isActive` changes
 * twice in a whole drag rather than once a frame, so styling from it is two
 * renders and not sixty a second.
 */
function SortableActiveRow({ label }: { label: string }) {
  const { index, isActive } = useSortableItem();

  return (
    <Item
      variant="outline"
      className={isActive ? 'border-primary bg-muted' : undefined}
    >
      <Item.Content>
        <Item.Title>{label}</Item.Title>
        <Item.Description>Position {index + 1}</Item.Description>
      </Item.Content>
      {isActive ? <Badge variant="secondary">Moving</Badge> : null}
      <Sortable.Handle />
    </Item>
  );
}

function SortableActiveDemo() {
  const [rows, setRows] = useState([
    { id: 'r1', label: 'Overview' },
    { id: 'r2', label: 'Usage' },
    { id: 'r3', label: 'Examples' },
    { id: 'r4', label: 'Props' },
  ]);

  return (
    <Sortable
      value={rows.map((row) => row.id)}
      onReorder={(_, { from, to }) => setRows((r) => reorderItems(r, from, to))}
      gap={8}
      className="w-full"
    >
      {rows.map((row) => (
        <Sortable.Item key={row.id} id={row.id}>
          <SortableActiveRow label={row.label} />
        </Sortable.Item>
      ))}
    </Sortable>
  );
}

/**
 * One row that holds its place. Install has to come first to mean anything, so
 * it keeps the top slot and the other three reorder among the rest — a row
 * carried past it goes around it rather than pushing it down.
 */
function SortablePinnedDemo() {
  const [steps, setSteps] = useState([
    { id: 's1', title: 'Install the package', fixed: true },
    { id: 's2', title: 'Add the provider' },
    { id: 's3', title: 'Import the theme' },
    { id: 's4', title: 'Render a Button' },
  ]);

  return (
    <Sortable
      value={steps.map((step) => step.id)}
      onReorder={(_, { from, to }) => setSteps((s) => reorderItems(s, from, to))}
      gap={8}
      className="w-full"
    >
      {steps.map((step) => (
        <Sortable.Item key={step.id} id={step.id} pinned={step.fixed}>
          <Item variant="outline">
            <Item.Content>
              <Item.Title>{step.title}</Item.Title>
            </Item.Content>
            {step.fixed ? (
              <Badge variant="outline">Fixed</Badge>
            ) : (
              <Sortable.Handle />
            )}
          </Item>
        </Sortable.Item>
      ))}
    </Sortable>
  );
}

/**
 * A row that cannot be picked up, which is not the same as one that holds its
 * place. Email address stays where the drag leaves it: the others still move
 * past it and it is carried along with them — it simply has no grip of its own.
 */
function SortableDisabledDemo() {
  const [fields, setFields] = useState([
    { id: 'f1', title: 'Email address', locked: true },
    { id: 'f2', title: 'Display name' },
    { id: 'f3', title: 'Company' },
    { id: 'f4', title: 'Phone number' },
  ]);

  return (
    <Sortable
      value={fields.map((field) => field.id)}
      onReorder={(_, { from, to }) => setFields((f) => reorderItems(f, from, to))}
      gap={8}
      className="w-full"
    >
      {fields.map((field) => (
        <Sortable.Item key={field.id} id={field.id} disabled={field.locked}>
          <Item variant="outline">
            <Item.Content>
              <Item.Title>{field.title}</Item.Title>
            </Item.Content>
            {field.locked ? <Badge variant="secondary">Locked</Badge> : null}
            <Sortable.Handle />
          </Item>
        </Sortable.Item>
      ))}
    </Sortable>
  );
}

const SORTABLE_TRACKS = [
  'Opening titles',
  'The long walk',
  'Nightfall',
  'Something borrowed',
  'A room upstairs',
  'Weather over the bay',
  'Two trains',
  'The argument',
  'Reprise',
  'Last light',
  'Winter, briefly',
  'The letter',
  'Coastline',
  'Everything after',
  'Closing titles',
];

/**
 * A list longer than the screen. `scrollRef` hands the component the scroller
 * it sits in, so a row carried to the top or bottom edge scrolls it and the
 * list can be reordered end to end — without one a drag stops where the screen
 * does, and the row you wanted at the top has nowhere left to go.
 */
function SortableScrollDemo() {
  const scroller = useAnimatedRef<Animated.ScrollView>();
  const [tracks, setTracks] = useState(
    SORTABLE_TRACKS.map((title, index) => ({ id: `t${index}`, title }))
  );

  return (
    <Animated.ScrollView
      ref={scroller}
      contentContainerClassName="px-5 pb-10"
      showsVerticalScrollIndicator={false}
    >
      <Sortable
        value={tracks.map((track) => track.id)}
        onReorder={(_, { from, to }) => setTracks((t) => reorderItems(t, from, to))}
        scrollRef={scroller}
        gap={8}
        className="w-full"
      >
        {tracks.map((track, index) => (
          <Sortable.Item key={track.id} id={track.id}>
            <Item variant="outline">
              <Item.Media variant="icon">
                <Text size="sm" muted>
                  {index + 1}
                </Text>
              </Item.Media>
              <Item.Content>
                <Item.Title>{track.title}</Item.Title>
              </Item.Content>
              <Sortable.Handle />
            </Item>
          </Sortable.Item>
        ))}
      </Sortable>
    </Animated.ScrollView>
  );
}

const FEEDS = [
  ['Ambient Kernel', '12.4k followers'],
  ['Slow Compile', '8.1k followers'],
  ['Null Pointer Club', '6.7k followers'],
  ['Static Types Weekly', '5.2k followers'],
  ['Render Pass', '4.9k followers'],
  ['Heap Fragments', '3.3k followers'],
  ['Tail Call', '2.8k followers'],
  ['Off By One', '2.1k followers'],
  ['Late Binding', '1.6k followers'],
  ['Dangling Ref', '980 followers'],
];

/**
 * The case the component exists for: a button floating over a scrolling list.
 *
 * A fade cannot do this. The sheet's surface is one colour and the rows are
 * another, so a gradient towards either one is visible against the other. The
 * blur band sits between them — the rows stay legible as shape and colour
 * while losing the detail that would compete with the button.
 */
function ScrollBlurSheetVersion() {
  const [open, setOpen] = useState(true);
  // The sheet's surface, so the band fades towards what it is drawn on.
  const token = useCSSVariable('--color-popover');
  const surface = typeof token === 'string' ? token : undefined;

  return (
    <View className="flex-1 items-center justify-center gap-4 p-6">
      <Text size="sm" muted className="text-center">
        The list scrolls under the button, and goes soft as it passes behind it.
      </Text>
      <Button variant="outline" onPress={() => setOpen(true)}>
        Open the sheet
      </Button>

      <BottomSheet open={open} onOpenChange={setOpen}>
        <BottomSheet.Content size="half" showClose={false} showGrabber={false}>
          {/*
            `edges="start"` only: the bottom of the sheet is an edge the sheet
            already draws, and two treatments on one edge read as a mistake.

            `color` is the sheet's own surface, not the page's. The band fades
            towards whatever it is given, and the theme background is a
            different colour from the sheet it would be fading on.
          */}
          <ScrollBlur
            edges="start"
            size={96}
            layers={7}
            color={surface}
            className="flex-1"
          >
            <BottomSheet.Body contentContainerClassName="gap-2 pb-4 pt-20">
              {FEEDS.map(([name, followers]) => (
                <Item key={name} variant="outline" size="sm">
                  <Item.Media variant="icon">
                    <PackageIcon size={16} />
                  </Item.Media>
                  <Item.Content>
                    <Item.Title>{name}</Item.Title>
                    <Item.Description>{followers}</Item.Description>
                  </Item.Content>
                </Item>
              ))}
            </BottomSheet.Body>
          </ScrollBlur>

          {/*
            Over the band, not inside it: the button is the thing in focus, and
            the list is what goes soft behind it. The grabber is off because
            the two would be stacked in the same 20 points of sheet.
          */}
          <View
            pointerEvents="box-none"
            className="absolute inset-x-0 top-0 items-center pt-4"
          >
            <Button size="sm" className="rounded-full px-5">
              Follow all
            </Button>
          </View>
        </BottomSheet.Content>
      </BottomSheet>
    </View>
  );
}

export const ENTRIES: ComponentEntry[] = [
{
    slug: 'post',
    name: 'Post',
    summary: 'A card carrying something somebody said, and what everyone did about it',
    demos: [
      { label: 'Feed card', render: () => <FeedPostDemo /> },
      { label: 'Vote post', render: () => <VotePostDemo /> },
      { label: 'Compact', render: () => <CompactPostDemo /> },
      { label: 'Media first', render: () => <MediaPostDemo /> },
      {
        label: 'A feed',
        id: 'feed',
        description: 'All four in a scroll, which is where a card is really judged.',
        fullPage: true,
        render: () => <PostFeedDemo />,
      },
      {
        label: 'Photos that open',
        id: 'photos',
        description:
          'A feed whose photos open full screen over a blur. The grid of four is one gallery, so swipe between them once one is open.',
        fullPage: true,
        render: () => <PostPhotosVersion />,
      },
    ],
  },
{
    slug: 'plan',
    name: 'Plan',
    summary: 'What an agent intends to do, before it does it',
    demos: [
      { label: 'A rail of steps', render: () => <PlanRailDemo /> },
      { label: 'Streaming in', render: () => <PlanStreamDemo /> },
      { label: 'Steps that are tasks', render: () => <PlanWithTasksDemo /> },
    ],
  },
{
    slug: 'soundwave',
    name: 'Soundwave',
    summary: 'What a voice looks like while an app listens',
    demos: [
      {
        label: 'Capsules',
        id: 'pills',
        fullPage: true,
        description: 'The few big capsules over a microphone button.',
        render: () => <SoundwavePillsVersion />,
      },
      {
        label: 'Metering bars',
        id: 'bars',
        fullPage: true,
        description: 'Static bands and a scrolling history, in a transcript.',
        render: () => <SoundwaveBarsVersion />,
      },
      {
        label: 'Travelling wave',
        id: 'line',
        fullPage: true,
        description: 'One ribbon, and what each state does to it.',
        render: () => <SoundwaveLineVersion />,
      },
      {
        label: 'Ambient glow',
        id: 'ambient',
        fullPage: true,
        fullBleed: true,
        description: 'A bloom off the bottom edge and a rim around the screen.',
        render: () => <SoundwaveAmbientVersion />,
      },
      {
        label: 'Colour',
        render: () => (
          <View className="w-full gap-5">
            <View className="gap-2">
              <Text size="sm" muted>
                a theme token, so it follows the theme into dark mode
              </Text>
              <Soundwave variant="bars" color="--color-info" height={48} />
            </View>
            <View className="gap-2">
              <Text size="sm" muted>
                a colour of your own
              </Text>
              <Soundwave variant="bars" color="#f97316" height={48} />
            </View>
            <View className="gap-2">
              <Text size="sm" muted>
                a gradient across the wave
              </Text>
              <Soundwave
                variant="line"
                gradient={['#6366f1', '#ec4899', '#f59e0b']}
                height={64}
              />
            </View>
            <View className="gap-2">
              <Text size="sm" muted>
                a track colour, for the part not played yet
              </Text>
              <Soundwave
                variant="bars"
                levels={seedWaveform(5)}
                progress={0.45}
                color="--color-success"
                trackColor="--color-muted"
                height={48}
              />
            </View>
          </View>
        ),
      },
      {
        label: 'Voice notes',
        id: 'notes',
        fullPage: true,
        description: 'Recorded waveforms in bubbles, filling as they play.',
        render: () => <SoundwaveNotesVersion />,
      },
      {
        label: 'Recording composer',
        id: 'composer',
        fullPage: true,
        description: 'A composer that turns into a recorder over a transcript.',
        render: () => <SoundwaveComposerVersion />,
      },
    ],
  },
{
    slug: 'scroll-blur',
    name: 'ScrollBlur',
    summary: 'Blurs the edges of a scroll container',
    layout: 'sections',
    demos: [
      {
        label: 'A button over a list',
        id: 'in-a-bottom-sheet',
        fullPage: true,
        description:
          'A blurred band under a floating button, over a list scrolling inside a bottom sheet.',
        render: () => <ScrollBlurSheetVersion />,
      },
      {
        label: 'Vertical list',
        render: () => (
          // The rows go soft as they reach the top and bottom of the viewport,
          // and neither band appears until there is something behind it.
          <ScrollBlur size={64} className="h-72 w-full">
            <ScrollView showsVerticalScrollIndicator={false}>
              <Item.Group>
                {FEEDS.map(([name, followers], index) => (
                  <View key={name}>
                    {index > 0 ? <Item.Separator /> : null}
                    <Item size="sm">
                      <Item.Media variant="icon">
                        <PackageIcon size={14} />
                      </Item.Media>
                      <Item.Content>
                        <Item.Title>{name}</Item.Title>
                        <Item.Description>{followers}</Item.Description>
                      </Item.Content>
                    </Item>
                  </View>
                ))}
              </Item.Group>
            </ScrollView>
          </ScrollBlur>
        ),
      },
      {
        label: 'Horizontal cards',
        render: () => (
          // Orientation is read from the child: `horizontal` moves the bands
          // to the leading and trailing edges, and nothing else changes.
          <ScrollBlur size={48} className="w-full">
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <Item.Group orientation="horizontal">
                {[
                  ['Overlays', 'Dialog, sheet, toast'],
                  ['Forms', 'Input, select, switch'],
                  ['Feedback', 'Alert, progress, spinner'],
                  ['Layout', 'Card, frame, surface'],
                  ['Motion', 'Shimmer, scroll blur'],
                  ['Theming', 'Six themes, three families'],
                ].map(([title, description]) => (
                  <Item
                    key={title}
                    orientation="vertical"
                    variant="outline"
                    size="sm"
                    className="w-44"
                  >
                    <Item.Media variant="icon">
                      <PackageIcon size={16} />
                    </Item.Media>
                    <Item.Content>
                      <Item.Title>{title}</Item.Title>
                      <Item.Description>{description}</Item.Description>
                    </Item.Content>
                  </Item>
                ))}
              </Item.Group>
            </ScrollView>
          </ScrollBlur>
        ),
      },
      {
        label: 'One edge',
        render: () => (
          <ScrollBlur size={56} edges="end" className="w-full">
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <Item.Group orientation="horizontal">
                {['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven'].map((n) => (
                  <Item key={n} variant="muted" size="sm" className="w-32">
                    <Item.Content>
                      <Item.Title>{n}</Item.Title>
                    </Item.Content>
                  </Item>
                ))}
              </Item.Group>
            </ScrollView>
          </ScrollBlur>
        ),
      },
      {
        label: 'Tuning the ramp',
        render: () => (
          <View className="w-full gap-4">
            {/* Four steps over a shallow band: smooth. */}
            <ScrollBlur size={40} layers={4} intensity={30} className="w-full">
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerClassName="gap-2"
              >
                {['Shallow', 'Band', 'Four', 'Layers', 'Low', 'Intensity'].map((n) => (
                  <Badge key={n} variant="secondary">
                    {n}
                  </Badge>
                ))}
              </ScrollView>
            </ScrollBlur>

            {/* A deeper band needs more of them, or the same four spread over
                twice the distance read as four bars. */}
            <ScrollBlur size={96} layers={6} intensity={60} className="w-full">
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerClassName="gap-2"
              >
                {['Deep', 'Band', 'Six', 'Layers', 'Full', 'Intensity'].map((n) => (
                  <Badge key={n}>{n}</Badge>
                ))}
              </ScrollView>
            </ScrollBlur>
          </View>
        ),
      },
    ],
  },
{
    slug: 'scroll-fade',
    name: 'ScrollFade',
    summary: 'Fades the edges of a scroll container',
    layout: 'sections',
    demos: [
      {
        label: 'Horizontal cards',
        render: () => (
          // A horizontal group of vertical Items: each entry is a card, and
          // the fade shows there is more of them past the edge.
          <ScrollFade size={40} className="w-full">
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <Item.Group orientation="horizontal">
                {[
                  ['Overlays', 'Dialog, sheet, toast'],
                  ['Forms', 'Input, select, switch'],
                  ['Feedback', 'Alert, progress, spinner'],
                  ['Layout', 'Card, frame, surface'],
                  ['Motion', 'Shimmer, scroll fade'],
                  ['Theming', 'Six themes, three families'],
                ].map(([title, description]) => (
                  <Item
                    key={title}
                    orientation="vertical"
                    variant="outline"
                    size="sm"
                    className="w-44"
                  >
                    <Item.Media variant="icon">
                      <PackageIcon size={16} />
                    </Item.Media>
                    <Item.Content>
                      <Item.Title>{title}</Item.Title>
                      <Item.Description>{description}</Item.Description>
                    </Item.Content>
                  </Item>
                ))}
              </Item.Group>
            </ScrollView>
          </ScrollFade>
        ),
      },
      {
        label: 'Vertical list',
        render: () => (
          // Orientation is read from the child: no `horizontal` prop, so the
          // fades land on the top and bottom edges instead.
          <ScrollFade size={44} className="h-72 w-full">
            <ScrollView showsVerticalScrollIndicator={false}>
              <Item.Group>
                {[
                  ['Deployed to production', '2 minutes ago'],
                  ['Migration applied', '18 minutes ago'],
                  ['Build passed', '24 minutes ago'],
                  ['Pull request merged', '1 hour ago'],
                  ['Review requested', '2 hours ago'],
                  ['Branch pushed', '3 hours ago'],
                  ['Issue closed', '5 hours ago'],
                  ['Release tagged', 'Yesterday'],
                ].map(([title, when], index) => (
                  <View key={title}>
                    {index > 0 ? <Item.Separator /> : null}
                    <Item size="sm">
                      <Item.Media variant="icon">
                        <CheckIcon size={14} />
                      </Item.Media>
                      <Item.Content>
                        <Item.Title>{title}</Item.Title>
                        <Item.Description>{when}</Item.Description>
                      </Item.Content>
                    </Item>
                  </View>
                ))}
              </Item.Group>
            </ScrollView>
          </ScrollFade>
        ),
      },
      {
        label: 'One edge',
        render: () => (
          <ScrollFade size={56} edges="end" className="w-full">
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <Item.Group orientation="horizontal">
                {['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven'].map((n) => (
                  <Item key={n} variant="muted" size="sm" className="w-32">
                    <Item.Content>
                      <Item.Title>{n}</Item.Title>
                    </Item.Content>
                  </Item>
                ))}
              </Item.Group>
            </ScrollView>
          </ScrollFade>
        ),
      },
      {
        label: 'Content that fits',
        render: () => (
          // Nothing scrolls past either edge, so neither fade ever shows.
          <ScrollFade size={40} className="w-full">
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <Item.Group orientation="horizontal">
                {['One', 'Two'].map((n) => (
                  <Item key={n} variant="outline" size="sm" className="w-32">
                    <Item.Content>
                      <Item.Title>{n}</Item.Title>
                    </Item.Content>
                  </Item>
                ))}
              </Item.Group>
            </ScrollView>
          </ScrollFade>
        ),
      },
      {
        label: 'Tuning the ramp',
        render: () => (
          <View className="w-full gap-4">
            {/* A long ramp fades in gradually over the first 120px of travel. */}
            <ScrollFade size={48} fadeInDistance={120} className="w-full">
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerClassName="gap-2"
              >
                {['Slow', 'Ramp', 'Over', 'A', 'Long', 'Distance', 'Of', 'Travel'].map(
                  (n) => (
                    <Badge key={n} variant="secondary">
                      {n}
                    </Badge>
                  )
                )}
              </ScrollView>
            </ScrollFade>

            {/* Snaps to full opacity almost immediately. */}
            <ScrollFade size={48} fadeInDistance={4} className="w-full">
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerClassName="gap-2"
              >
                {['Instant', 'Ramp', 'On', 'The', 'First', 'Few', 'Pixels'].map((n) => (
                  <Badge key={n}>{n}</Badge>
                ))}
              </ScrollView>
            </ScrollFade>
          </View>
        ),
      },
    ],
  },
{
    slug: 'separator',
    name: 'Separator',
    summary: 'Horizontal or vertical rule between content',
    demos: [
      {
        label: 'Between sections',
        render: () => (
          <Surface variant="secondary" className="w-full px-6 py-7">
            <Text weight="medium">PanelUI</Text>
            <Text size="sm" muted>
              A React Native component library.
            </Text>
            <Separator className="my-4" />
            <View className="h-5 flex-row items-center">
              <Text size="sm">Components</Text>
              <Separator orientation="vertical" className="mx-3" />
              <Text size="sm">Themes</Text>
              <Separator orientation="vertical" className="mx-3" />
              <Text size="sm">Examples</Text>
            </View>
          </Surface>
        ),
      },
      {
        label: 'Labelled',
        render: () => (
          // Children break the rule around a centred label — the "or" divider
          // in a sign-in form. Only the horizontal axis carries a label.
          <View className="w-full gap-4">
            <Button variant="outline" fullWidth>
              Continue with email
            </Button>
            <Separator>or</Separator>
            <Button variant="outline" fullWidth>
              Continue as guest
            </Button>
          </View>
        ),
      },
      {
        label: 'Variants',
        render: () => (
          <View className="w-full gap-5">
            <View className="gap-2">
              <Text size="sm" muted>
                thin
              </Text>
              <Separator />
            </View>
            <View className="gap-2">
              <Text size="sm" muted>
                thick
              </Text>
              <Separator variant="thick" />
            </View>
          </View>
        ),
      },
      {
        label: 'Custom thickness',
        render: () => (
          <View className="w-full gap-5">
            {[1, 3, 6].map((thickness) => (
              <View key={thickness} className="gap-2">
                <Text size="sm" muted>
                  thickness={thickness}
                </Text>
                <Separator thickness={thickness} />
              </View>
            ))}
          </View>
        ),
      },
      {
        label: 'Vertical, stretched by the row',
        render: () => (
          // `items-stretch` gives the separators their length — a vertical
          // separator with no height from the parent measures zero.
          <View className="w-full flex-row items-stretch gap-4 py-2">
            {['Today', 'Week', 'Month'].map((label, index) => (
              <View key={label} className="flex-1 flex-row items-stretch gap-4">
                {index > 0 ? <Separator orientation="vertical" /> : null}
                <View className="flex-1 gap-1">
                  <Text size="xs" muted className="uppercase tracking-wider">
                    {label}
                  </Text>
                  <Text size="lg" weight="semibold">
                    {[128, 904, 3_612][index]?.toLocaleString()}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ),
      },
    ],
  },
{
    slug: 'signature',
    name: 'Signature',
    summary: 'Sign with a finger, and get the result back out',
    demos: [
      { label: 'Default', render: () => <SignatureDemo /> },
      { label: 'With a baseline', render: () => <SignatureDemo guideline /> },
      {
        label: 'Sizes',
        render: () => (
          <View className="w-full gap-4">
            <Signature size="sm" placeholder={null} />
            <Signature size="md" placeholder={null} />
          </View>
        ),
      },
      {
        label: 'Signing frame',
        id: 'sheet',
        fullPage: true,
        description:
          'A framed pad over a frosted screen. Draw a stroke and the frame lifts as the confirm button arrives beneath it.',
        render: () => <SignatureSheetVersion />,
      },
      {
        label: 'Signing a document',
        id: 'document',
        fullPage: true,
        description:
          'An agreement you scroll, with the captured signature landing back in the document.',
        render: () => <SignatureDocumentVersion />,
      },
      {
        label: 'Saving to a file',
        id: 'export',
        fullPage: true,
        description:
          'save() writes SVG or PNG and hands back where it went. The optional packages report themselves by name.',
        render: () => <SignatureExportVersion />,
      },
      {
        label: 'Full screen',
        id: 'full-screen',
        fullPage: true,
        description: 'The whole screen is the pad, for a form that signs and nothing else.',
        render: () => <SignatureFullScreenVersion />,
      },
      {
        label: 'Proof of delivery',
        id: 'delivery',
        fullPage: true,
        description: 'Recipient, timestamp and signature on one screen, the way a courier app asks.',
        render: () => <SignatureDeliveryVersion />,
      },
    ],
  },
{
    slug: 'skeleton',
    name: 'Skeleton',
    summary: 'Shimmer placeholder for loading content',
    demos: [
      {
        label: 'List row',
        render: () => (
          <View className="w-full gap-4">
            <View className="flex-row items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <View className="flex-1 gap-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </View>
            </View>
            <Skeleton className="h-32 w-full rounded-xl" />
          </View>
        ),
      },
      {
        label: 'Card placeholder',
        render: () => (
          <Card className="w-full">
            <Card.Content className="gap-3 p-4">
              <Skeleton className="h-40 w-full rounded-xl" />
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </Card.Content>
          </Card>
        ),
      },
    ],
  },
{
    slug: 'sortable',
    name: 'Sortable',
    summary: 'A list whose rows can be dragged into a different order',
    demos: [
      { label: 'A list you can reorder', render: () => <SortableTasksDemo /> },
      { label: 'Lifting on a long press', render: () => <SortableLongPressDemo /> },
      { label: 'Rows of different heights', render: () => <SortableMixedHeightsDemo /> },
      { label: 'A row that knows it is being carried', render: () => <SortableActiveDemo /> },
      { label: 'A row that stays put', render: () => <SortablePinnedDemo /> },
      { label: 'A row that cannot be picked up', render: () => <SortableDisabledDemo /> },
      {
        label: 'A list longer than the screen',
        id: 'autoscroll',
        description: 'Carry a row to the top or bottom edge and the list scrolls under it.',
        fullPage: true,
        render: () => <SortableScrollDemo />,
      },
    ],
  }
];
export const ENTRIES_BY_SLUG = Object.fromEntries(ENTRIES.map((entry) => [entry.slug, entry]));
