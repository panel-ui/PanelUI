import { Fragment } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { ChevronRightIcon, EmptyState, SearchIcon, Text, useThemeMode } from 'panelui-native';
import { ScreenHeader } from '../../src/components/screen-header';
import { BLOCKS, type BlockEntry } from '../../src/data/blocks';

/** One block, drawn with the same parts as a row in the component list. */
function BlockRow({ entry, tint }: { entry: BlockEntry; tint: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${entry.name}. ${entry.summary}.`}
      onPress={() => router.push(`/blocks/${entry.slug}`)}
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

export default function BlocksScreen() {
  const { mode } = useThemeMode();
  const tint = mode === 'dark' ? '#818181' : '#686868';

  return (
    <View className="flex-1">
      <ScreenHeader title="Blocks" showBack />

      {BLOCKS.length === 0 ? (
        <EmptyState>
          <EmptyState.Header>
            <EmptyState.Media variant="icon">
              <SearchIcon size={18} color={tint} />
            </EmptyState.Media>
            <EmptyState.Title>No blocks yet</EmptyState.Title>
            <EmptyState.Description>
              Whole screens built from the components will be listed here.
            </EmptyState.Description>
          </EmptyState.Header>
        </EmptyState>
      ) : (
        <ScrollView contentContainerClassName="pb-10" showsVerticalScrollIndicator={false}>
          {BLOCKS.map((entry, index) => (
            <Fragment key={entry.slug}>
              {index > 0 ? <View className="mx-5 h-px bg-border" /> : null}
              <BlockRow entry={entry} tint={tint} />
            </Fragment>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
