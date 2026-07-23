import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { EmptyState, Text } from 'panelui-native';
import { ScreenHeader } from '../../../src/components/screen-header';
import { COMPONENTS_BY_SLUG } from '../../../src/data/components';

/**
 * One demo, filling the screen.
 *
 * No padding, no scroll wrapper and no surrounding sections: a component that
 * earns this route is one whose whole point is how it behaves at full height,
 * and anything wrapped around it would be measuring something else.
 */
export default function ComponentVersionScreen() {
  const { slug, demo: demoId } = useLocalSearchParams<{ slug: string; demo: string }>();
  const entry = COMPONENTS_BY_SLUG[slug ?? ''];
  const demo = entry?.demos.find((candidate) => candidate.id === demoId);

  if (!demo) {
    return (
      <View className="flex-1">
        <ScreenHeader title="Not found" showBack />
        <EmptyState>
          <EmptyState.Header>
            <EmptyState.Title>Unknown version</EmptyState.Title>
            <EmptyState.Description>
              {entry
                ? `${entry.name} has no version called “${demoId}”.`
                : `There is no component with the slug “${slug}”.`}
            </EmptyState.Description>
          </EmptyState.Header>
        </EmptyState>
      </View>
    );
  }

  // A full-bleed demo gets the screen and nothing else — no header, no
  // description, no padding. It draws its own way back.
  if (demo.fullBleed) {
    return <View className="flex-1">{demo.render()}</View>;
  }

  return (
    <View className="flex-1">
      <ScreenHeader title={demo.label} showBack />
      {demo.description ? (
        <Text size="sm" muted className="px-5 pb-3">
          {demo.description}
        </Text>
      ) : null}
      <View className="flex-1">{demo.render()}</View>
    </View>
  );
}
