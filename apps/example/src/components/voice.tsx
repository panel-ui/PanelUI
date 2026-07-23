/**
 * The microphone behind the Soundwave demos.
 *
 * `Soundwave` draws a level and never records one, so the showcase has to be
 * the app that does — which is also the honest way to demonstrate it: the wave
 * is only convincing if it is tracking a real voice.
 *
 * Metering comes back as dBFS, is normalised to 0–1 and written into a
 * `SharedValue`. The polling lives in `MicMeter`, which renders nothing, so
 * twenty updates a second re-render one empty component instead of a screen.
 *
 * A simulator has no microphone and a reader can refuse the permission, so
 * every version keeps a slider that takes over when the real thing is not
 * available, and says why.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
  type AudioRecorder,
} from 'expo-audio';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';
import { Button, MicIcon, Slider, Switch, Text } from 'panelui-native';

/** Quietest level worth drawing, in dBFS. Below this a room is just noise. */
const FLOOR_DB = -55;

/** Bars a stored waveform keeps. Enough shape to recognise, small enough to save. */
export const NOTE_BARS = 40;

/** dBFS — negative, logarithmic, platform-dependent — to the 0–1 a wave wants. */
export function normaliseMetering(db: number | undefined | null): number {
  if (db == null || !Number.isFinite(db)) return 0;
  const value = (db - FLOOR_DB) / -FLOOR_DB;
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

/** Squashes a recording's samples down to the bars a bubble has room for. */
export function downsample(samples: number[], bars = NOTE_BARS): number[] {
  if (!samples.length) return [];
  const out: number[] = [];
  for (let i = 0; i < bars; i++) {
    const from = Math.floor((i / bars) * samples.length);
    const to = Math.max(from + 1, Math.floor(((i + 1) / bars) * samples.length));
    let peak = 0;
    for (let j = from; j < to; j++) peak = Math.max(peak, samples[j] ?? 0);
    // Peak rather than mean: an average of a syllable and the pause after it is
    // a flat bar, and a waveform of flat bars says nothing about the recording.
    out.push(peak);
  }
  return out;
}

export const formatClock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

export interface RecordedNote {
  uri: string;
  levels: number[];
  seconds: number;
}

/**
 * Polls the recorder and writes the level out. Renders nothing on purpose —
 * this is the component that re-renders twenty times a second, and it has no
 * children to take with it.
 */
function MicMeter({
  recorder,
  level,
  samples,
}: {
  recorder: AudioRecorder;
  level: SharedValue<number>;
  samples: React.RefObject<number[]>;
}) {
  const state = useAudioRecorderState(recorder, 60);
  const { metering, durationMillis } = state;

  useEffect(() => {
    const value = normaliseMetering(metering);
    level.value = value;
    samples.current.push(value);
    // `durationMillis` is in the dependencies because it changes on every poll
    // and the level often does not — without it, a held note stops sampling.
  }, [metering, durationMillis, level, samples]);

  return null;
}

export interface VoiceRecorder {
  recording: boolean;
  seconds: number;
  /** Live level, 0–1, on the UI thread. Hand this straight to `Soundwave`. */
  level: SharedValue<number>;
  toggle: () => void;
  /** Stop and throw the recording away, for a composer's cancel. */
  cancel: () => void;
  /** The last finished recording, for the versions that play one back. */
  note: RecordedNote | null;
  /** Forget the last recording, once a screen has taken it. */
  clearNote: () => void;
  /** True when the slider is standing in for the microphone. */
  manual: boolean;
  setManual: (value: boolean) => void;
  manualLevel: number;
  setManualLevel: (value: number) => void;
  /** Why the microphone is not being used, when it is not. */
  reason: string | null;
  meter: React.ReactNode;
}

export function useVoiceRecorder(): VoiceRecorder {
  const recorder = useAudioRecorder({
    ...RecordingPresets.HIGH_QUALITY,
    isMeteringEnabled: true,
  });

  const level = useSharedValue(0);
  const samples = useRef<number[]>([]);

  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [note, setNote] = useState<RecordedNote | null>(null);
  const [manual, setManual] = useState(false);
  const [manualLevel, setManualLevel] = useState(0.55);
  const [reason, setReason] = useState<string | null>(null);

  // The slider is the microphone while it is on, so it writes to the same place
  // real metering does and nothing downstream can tell the difference.
  useEffect(() => {
    if (manual) level.value = manualLevel;
  }, [manual, manualLevel, level]);

  useEffect(() => {
    if (!recording) return;
    const id = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => clearInterval(id);
  }, [recording]);

  // A slider run collects samples too, at the rate the microphone would, so a
  // note "recorded" without one still has a waveform to draw afterwards.
  useEffect(() => {
    if (!recording || !manual) return;
    const id = setInterval(() => samples.current.push(manualLevel), 60);
    return () => clearInterval(id);
  }, [recording, manual, manualLevel]);

  const start = useCallback(async () => {
    setSeconds(0);
    samples.current = [];

    if (manual) {
      setRecording(true);
      return;
    }

    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setReason('Microphone permission was denied, so the slider is driving the wave.');
        setManual(true);
        setRecording(true);
        return;
      }

      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setReason(null);
      setRecording(true);
    } catch {
      // A simulator with no input device, or a build without the module: the
      // demo still has to demonstrate something.
      setReason('No microphone here, so the slider is driving the wave.');
      setManual(true);
      setRecording(true);
    }
  }, [manual, recorder]);

  const finish = useCallback(
    async (keep: boolean) => {
      setRecording(false);
      level.value = 0;

      // The slider run has no file behind it, but it does have a shape — the
      // samples were collected all the same — so a "sent" note still draws.
      if (manual) {
        if (keep && samples.current.length) {
          setNote({ uri: '', levels: downsample(samples.current), seconds });
        }
        return;
      }

      try {
        await recorder.stop();
        await setAudioModeAsync({ allowsRecording: false });
        const levels = downsample(samples.current);
        if (keep && recorder.uri && levels.length) {
          setNote({ uri: recorder.uri, levels, seconds });
        }
      } catch {
        // Nothing was recording; there is nothing to save.
      }
    },
    [manual, recorder, seconds, level]
  );

  const toggle = useCallback(() => {
    if (recording) void finish(true);
    else void start();
  }, [recording, start, finish]);

  const cancel = useCallback(() => {
    void finish(false);
  }, [finish]);

  const clearNote = useCallback(() => setNote(null), []);

  return {
    recording,
    seconds,
    level,
    toggle,
    cancel,
    note,
    clearNote,
    manual,
    setManual,
    manualLevel,
    setManualLevel,
    reason,
    meter:
      recording && !manual ? (
        <MicMeter recorder={recorder} level={level} samples={samples} />
      ) : null,
  };
}

/** Record button, timer, and the slider that stands in for the microphone. */
export function VoiceControls({
  voice,
  compact = false,
}: {
  voice: VoiceRecorder;
  compact?: boolean;
}) {
  return (
    <View className="w-full gap-5 px-5">
      {voice.meter}

      <View className="flex-row items-center justify-center gap-5">
        <Button
          variant={voice.recording ? 'destructive' : 'primary'}
          size="icon"
          className={compact ? 'size-12 rounded-full' : 'size-16 rounded-full'}
          onPress={voice.toggle}
          accessibilityLabel={voice.recording ? 'Stop' : 'Start listening'}
        >
          {/* No colour of its own: Button publishes the foreground its variant
              reads against, so the icon stays visible in both themes. */}
          {voice.recording ? (
            <View className="size-4 rounded-sm bg-primary-foreground" />
          ) : (
            <MicIcon size={compact ? 18 : 22} />
          )}
        </Button>
        <Text size="lg" muted={!voice.recording}>
          {formatClock(voice.seconds)}
        </Text>
      </View>

      {voice.reason ? (
        <Text size="xs" muted className="text-center">
          {voice.reason}
        </Text>
      ) : null}

      <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-4">
          <Text size="sm">Use the slider instead</Text>
          <Text size="xs" muted>
            For a simulator, or anywhere talking out loud is not an option.
          </Text>
        </View>
        <Switch value={voice.manual} onValueChange={voice.setManual} />
      </View>

      <Slider
        label="Mic level"
        showValue
        formatValue={(value) => value.toFixed(2)}
        min={0}
        max={1}
        step={0.01}
        value={voice.manualLevel}
        onValueChange={voice.setManualLevel}
        disabled={!voice.manual}
      />
    </View>
  );
}
