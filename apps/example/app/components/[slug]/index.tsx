import { ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRightIcon, EmptyState, Item, Text } from 'panelui-native';
import { ScreenHeader } from '../../../src/components/screen-header';
import { COMPONENTS_BY_SLUG, type Demo } from '../../../src/data/components';

/**
 * A demo that needs the whole screen gets a row here instead of being rendered
 * inline. A chat transcript squeezed into a section between two dividers
 * demonstrates nothing except that it does not fit — so it is listed,
 * described, and opened on a screen of its own.
 */
function VersionRow({ slug, demo }: { slug: string; demo: Demo }) {
  return (
    <Item size="sm" onPress={() => router.push(`/components/${slug}/${demo.id}`)}>
      <Item.Content>
        <Item.Title>{demo.label}</Item.Title>
        {demo.description ? <Item.Description>{demo.description}</Item.Description> : null}
      </Item.Content>
      <Item.Actions>
        <ChevronRightIcon size={16} />
      </Item.Actions>
    </Item>
  );
}

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

  const versions = entry.demos.filter((demo) => demo.fullPage);
  const inline = entry.demos.filter((demo) => !demo.fullPage);

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

        {versions.length ? (
          <View>
            <Text size="xs" weight="semibold" muted className="mb-4 uppercase tracking-wider">
              Versions
            </Text>
            <Item.Group>
              {versions.map((demo, index) => (
                <View key={demo.id}>
                  {index > 0 ? <Item.Separator /> : null}
                  <VersionRow slug={entry.slug} demo={demo} />
                </View>
              ))}
            </Item.Group>
          </View>
        ) : null}

        {inline.map((demo, index) => (
          <View key={demo.label}>
            {index > 0 || versions.length ? <View className="my-8 h-px bg-border" /> : null}
            <Text size="xs" weight="semibold" muted className="mb-4 uppercase tracking-wider">
              {demo.label}
            </Text>
            <View className="w-full items-center">{demo.render()}</View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
