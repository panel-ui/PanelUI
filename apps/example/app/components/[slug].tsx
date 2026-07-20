import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BottomSheet,
  EmptyState,
  Text,
  useThemeMode,
} from 'panelui-native';
import { ScreenHeader } from '../../src/components/screen-header';
import { COMPONENTS_BY_SLUG } from '../../src/data/components';

/** The FAB glyph — three stacked lines, matching the design's variant button. */
function VariantsGlyph({ color }: { color: string }) {
  return (
    <View className="gap-1.5">
      {[0, 1, 2].map((line) => (
        <View
          key={line}
          className="h-0.5 w-4 rounded-full"
          style={{ backgroundColor: color }}
        />
      ))}
    </View>
  );
}

export default function ComponentDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const entry = COMPONENTS_BY_SLUG[slug ?? ''];
  const [index, setIndex] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const { mode } = useThemeMode();

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

  const demo = entry.demos[index] ?? entry.demos[0]!;
  const hasVariants = entry.demos.length > 1;

  return (
    <View className="flex-1">
      <ScreenHeader title={entry.name} showBack />

      <ScrollView
        contentContainerClassName="grow justify-center px-5 py-6"
        contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="w-full items-center">{demo.render()}</View>
      </ScrollView>

      {/* Current variant, bottom-left; picker FAB, bottom-right. */}
      <View
        pointerEvents="box-none"
        className="absolute left-0 right-0 flex-row items-end justify-between px-5"
        style={{ bottom: insets.bottom + 16 }}
      >
        <View className="flex-1 pr-4">
          <Text size="lg" weight="medium">
            {demo.label}
          </Text>
          <Text size="sm" muted>
            {entry.demos.length} {entry.demos.length === 1 ? 'variant' : 'variants'}
          </Text>
        </View>

        {hasVariants ? (
          <BottomSheet open={pickerOpen} onOpenChange={setPickerOpen}>
            <BottomSheet.Trigger>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Choose a variant"
                className="h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg"
              >
                <VariantsGlyph color={mode === 'dark' ? '#262626' : '#fafafa'} />
              </Pressable>
            </BottomSheet.Trigger>
            <BottomSheet.Content>
              <Text size="lg" weight="semibold" className="mb-3">
                {entry.name} variants
              </Text>
              <View className="gap-1 pb-2">
                {entry.demos.map((item, itemIndex) => (
                  <Pressable
                    key={item.label}
                    accessibilityRole="button"
                    accessibilityState={{ selected: itemIndex === index }}
                    onPress={() => {
                      setIndex(itemIndex);
                      setPickerOpen(false);
                    }}
                    className="rounded-lg px-3 py-3 active:bg-muted"
                  >
                    <Text
                      weight={itemIndex === index ? 'semibold' : 'normal'}
                      muted={itemIndex !== index}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </BottomSheet.Content>
          </BottomSheet>
        ) : null}
      </View>
    </View>
  );
}
