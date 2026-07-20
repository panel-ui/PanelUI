import { useMemo, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import Animated, {
  useAnimatedKeyboard,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronRightIcon,
  EmptyState,
  Input,
  SearchIcon,
  Text,
  useThemeMode,
} from 'panelui-native';
import { ScreenHeader } from '../../src/components/screen-header';
import { COMPONENTS, type ComponentEntry } from '../../src/data/components';

function ComponentRow({ entry, tint }: { entry: ComponentEntry; tint: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${entry.name}. ${entry.summary}.`}
      onPress={() => router.push(`/components/${entry.slug}`)}
      className="flex-row items-center gap-3 px-5 py-4 active:bg-muted"
    >
      <View className="flex-1">
        <Text size="lg">{entry.name}</Text>
        <Text size="sm" muted>
          {entry.summary}
        </Text>
      </View>
      <ChevronRightIcon size={18} color={tint} />
    </Pressable>
  );
}

export default function ComponentListScreen() {
  const [query, setQuery] = useState('');
  const insets = useSafeAreaInsets();
  const { mode } = useThemeMode();
  const tint = mode === 'dark' ? '#818181' : '#686868';

  // Ride above the keyboard instead of hiding under it. On the UI thread, so
  // the bar tracks the keyboard frame-for-frame as it opens.
  const keyboard = useAnimatedKeyboard();
  const searchBarStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: -Math.max(keyboard.height.value - insets.bottom, 0) },
    ],
  }));

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return COMPONENTS;
    return COMPONENTS.filter(
      (entry) =>
        entry.name.toLowerCase().includes(needle) ||
        entry.summary.toLowerCase().includes(needle)
    );
  }, [query]);

  return (
    <View className="flex-1">
      <ScreenHeader title="Components" showBack />

      <FlatList
        data={results}
        keyExtractor={(entry) => entry.slug}
        renderItem={({ item }) => <ComponentRow entry={item} tint={tint} />}
        ItemSeparatorComponent={() => <View className="mx-5 h-px bg-border" />}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        // Room for the floating search bar to sit over the list.
        contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}
        ListEmptyComponent={
          <EmptyState className="pt-16">
            <EmptyState.Header>
              <EmptyState.Media variant="icon">
                <SearchIcon size={18} color={tint} />
              </EmptyState.Media>
              <EmptyState.Title>No components found</EmptyState.Title>
              <EmptyState.Description>
                Nothing matches “{query}”. Try a different search.
              </EmptyState.Description>
            </EmptyState.Header>
          </EmptyState>
        }
      />

      <Animated.View
        pointerEvents="box-none"
        className="absolute left-0 right-0 px-5"
        style={[{ bottom: insets.bottom + 16 }, searchBarStyle]}
      >
        <View className="flex-row items-center gap-2 rounded-full border border-border bg-surface px-4 shadow-lg">
          <SearchIcon size={18} color={tint} />
          <Input
            value={query}
            onChangeText={setQuery}
            placeholder="Search"
            className="flex-1 border-0 bg-transparent px-0"
            containerClassName="flex-1"
            accessibilityLabel="Search components"
            autoCorrect={false}
            autoCapitalize="none"
          />
        </View>
      </Animated.View>
    </View>
  );
}
