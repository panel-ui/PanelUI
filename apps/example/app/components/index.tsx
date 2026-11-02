import { useMemo, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronRightIcon,
  EmptyState,
  Input,
  KeyboardAvoider,
  SearchIcon,
  Text,
  useThemeMode,
} from 'panelui-native';
import { ScreenHeader } from '../../src/components/screen-header';
import {
  CHART_COUNT,
  COMPONENTS,
  type ComponentMetadata,
} from '../../src/data/components.generated';

function ComponentRow({ entry, tint }: { entry: ComponentMetadata; tint: string }) {
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

/**
 * The one section above the A–Z.
 *
 * Charts are the group people arrive at without knowing which one they want,
 * because choosing between them is a decision about shape rather than about
 * name — and a list of names is exactly the thing that cannot help with that.
 * So they get a door of their own, and everything else stays in the list.
 */
function AllChartsRow({ tint }: { tint: string }) {
  return (
    // Built from the same parts as a component row, so it reads as the first
    // entry in the list rather than as a banner sitting on top of one.
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`All charts. One example of each of the ${CHART_COUNT} charts.`}
        onPress={() => router.push('/components/all-charts')}
        className="flex-row items-center gap-3 px-5 py-4 active:bg-muted"
      >
        <View className="flex-1">
          <Text size="lg">All charts</Text>
          <Text size="sm" muted>
            {`One example of each of the ${CHART_COUNT} charts`}
          </Text>
        </View>
        <ChevronRightIcon size={18} color={tint} />
      </Pressable>
      {/* The list's separator only goes between items, so the one under this
          row has to come with it. */}
      <View className="mx-5 h-px bg-border" />
    </>
  );
}

export default function ComponentListScreen() {
  const [query, setQuery] = useState('');
  const insets = useSafeAreaInsets();
  const { mode } = useThemeMode();
  const tint = mode === 'dark' ? '#818181' : '#686868';

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
        // Only over the whole catalogue. Above a filtered list it is a door to
        // ten charts sitting on top of the two results somebody searched for,
        // and above an empty one it is a door over the words "nothing matches".
        ListHeaderComponent={query.trim() ? undefined : <AllChartsRow tint={tint} />}
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

      {/* Rides above the keyboard instead of hiding under it — `dock` moves it
          by the keyboard height less the inset it already sits above, on the UI
          thread, so it tracks the keyboard frame-for-frame as it opens. */}
      <KeyboardAvoider
        mode="dock"
        bottomInset={insets.bottom}
        pointerEvents="box-none"
        className="absolute left-0 right-0 px-5"
        style={{ bottom: insets.bottom + 16 }}
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
      </KeyboardAvoider>
    </View>
  );
}
