/**
 * Screen chrome: an optional circular back button, a centered title, and the
 * light/dark toggle. Matches the header in every screen of the design.
 */
import { Image, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeftIcon,
  MoonIcon,
  SunIcon,
  Text,
  useThemeMode,
} from 'panelui-native';

const CIRCLE = 'h-11 w-11 items-center justify-center rounded-full border border-border bg-surface';

function CircleButton({
  onPress,
  label,
  children,
}: {
  onPress: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className={CIRCLE}
    >
      {children}
    </Pressable>
  );
}

/** Toggles light ↔ dark while staying in the active theme family. */
export function ThemeToggle() {
  const { mode, toggleMode } = useThemeMode();

  return (
    <CircleButton
      onPress={toggleMode}
      label={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {mode === 'dark' ? (
        <SunIcon size={18} color="#f5f5f5" />
      ) : (
        <MoonIcon size={18} color="#262626" />
      )}
    </CircleButton>
  );
}

export interface ScreenHeaderProps {
  title?: string;
  /** Shows the circular back button. */
  showBack?: boolean;
}

export function ScreenHeader({ title, showBack = false }: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();
  const { mode } = useThemeMode();

  return (
    <View
      className="flex-row items-center justify-between px-5 pb-3"
      style={{ paddingTop: insets.top + 8 }}
    >
      <View className="w-11">
        {showBack ? (
          <CircleButton onPress={() => router.back()} label="Go back">
            <ChevronLeftIcon size={20} color={mode === 'dark' ? '#f5f5f5' : '#262626'} />
          </CircleButton>
        ) : null}
      </View>

      {title ? (
        <Text weight="semibold" size="lg">
          {title}
        </Text>
      ) : (
        <Image
          // The mark is drawn for the surface behind it: the dark mark on
          // light backgrounds, the light one on dark.
          source={
            mode === 'dark'
              ? require('../../assets/logo-dark.png')
              : require('../../assets/logo-light.png')
          }
          style={{ width: 30, height: 30 }}
          resizeMode="contain"
          accessibilityLabel="PanelUI"
        />
      )}

      <ThemeToggle />
    </View>
  );
}
