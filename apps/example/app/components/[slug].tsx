import { ScrollView, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState, Text } from 'panelui-native';
import { ScreenHeader } from '../../src/components/screen-header';
import { COMPONENTS_BY_SLUG } from '../../src/data/components';

export default function ComponentDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const entry = COMPONENTS_BY_SLUG[slug ?? ''];
  const insets = useSafeAreaInsets();

  if (!entry) {
    return (
      <View className="flex-1">
        <ScreenHeader title="Not found" showBack />
        <EmptyState>
          <EmptyState.Header>
            <EmptyState.Title>Unknown component</EmptyState.Title>
            <EmptyState.Description>
              There is no component with the slug “{slug}”.
            </EmptyState.Description>
          </EmptyState.Header>
        </EmptyState>
      </View>
    );
  }

  return (
    <View className="flex-1">
      <ScreenHeader title={entry.name} showBack />

      {/* Every variant on one page — scroll to see the rest. */}
      <ScrollView
        contentContainerClassName="px-5 pt-2"
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        <Text size="sm" muted className="pb-6">
          {entry.summary}
        </Text>

        {entry.demos.map((demo, index) => (
          <View key={demo.label}>
            {index > 0 ? <View className="my-8 h-px bg-border" /> : null}
            <Text
              size="xs"
              weight="semibold"
              muted
              className="mb-4 uppercase tracking-wider"
            >
              {demo.label}
            </Text>
            <View className="w-full items-center">{demo.render()}</View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
