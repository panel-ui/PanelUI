/**
 * Home screen hero card: a tall panel with a count chip at the top, a
 * title/subtitle at the bottom, and a circular arrow affordance.
 *
 * Built entirely from theme tokens rather than a gradient, so it repaints
 * correctly in all six themes — including their differing radius scales.
 */
import { Pressable, View } from 'react-native';
import { ArrowUpRightIcon, Text, useThemeMode } from 'panelui-native';

export interface HomeCardProps {
  title: string;
  subtitle: string;
  /** Rendered as "N total" in the chip. */
  count: number;
  onPress: () => void;
}

export function HomeCard({ title, subtitle, count, onPress }: HomeCardProps) {
  const { mode } = useThemeMode();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}. ${count} total.`}
      onPress={onPress}
      className="h-52 justify-between rounded-3xl border border-border bg-card p-5 active:opacity-90"
    >
      <View className="self-start rounded-full bg-muted px-3 py-1">
        <Text size="sm" muted>
          {count} total
        </Text>
      </View>

      <View className="flex-row items-end justify-between gap-4">
        <View className="flex-1">
          <Text size="3xl" weight="bold">
            {title}
          </Text>
          <Text size="base" muted>
            {subtitle}
          </Text>
        </View>
        <View className="h-12 w-12 items-center justify-center rounded-full bg-primary">
          <ArrowUpRightIcon
            size={22}
            color={mode === 'dark' ? '#262626' : '#fafafa'}
          />
        </View>
      </View>
    </Pressable>
  );
}
