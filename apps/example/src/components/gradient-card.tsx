/**
 * Home screen hero card: a tall gradient panel with a count chip at the top,
 * a title/subtitle at the bottom, and a circular arrow affordance.
 */
import { Pressable, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowUpRightIcon, Text } from 'panelui-native';

export interface GradientCardProps {
  title: string;
  subtitle: string;
  /** Rendered as "N total" in the chip. */
  count: number;
  /** Gradient stops, corner to corner. */
  colors: [string, string, ...string[]];
  onPress: () => void;
}

export function GradientCard({
  title,
  subtitle,
  count,
  colors,
  onPress,
}: GradientCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}. ${count} total.`}
      onPress={onPress}
      className="overflow-hidden rounded-3xl border border-border"
    >
      <LinearGradient
        colors={colors}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ height: 240, justifyContent: 'space-between', padding: 20 }}
      >
        <View className="self-start rounded-full bg-black/30 px-3 py-1">
          <Text size="sm" className="text-white">
            {count} total
          </Text>
        </View>

        <View className="flex-row items-end justify-between">
          <View className="flex-1">
            <Text size="3xl" weight="bold" className="text-white">
              {title}
            </Text>
            <Text size="lg" className="text-white/70">
              {subtitle}
            </Text>
          </View>
          <View className="h-12 w-12 items-center justify-center rounded-full bg-white/15">
            <ArrowUpRightIcon size={22} color="#ffffff" />
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
}
