import { View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { EmptyState, Text } from 'panelui-native';
import { ScreenHeader } from '../../../src/components/screen-header';
import { useComponentEntry } from '../../../src/data/use-component-entry';

/**
 * One demo, filling the screen.
 *
 * No padding, no scroll wrapper and no surrounding sections: a component that
 * earns this route is one whose whole point is how it behaves at full height,
 * and anything wrapped around it would be measuring something else.
 */
export default function ComponentVersionScreen() {
  const { slug, demo: demoId } = useLocalSearchParams<{ slug: string; demo: string }>();
  const { entry, status } = useComponentEntry(slug ?? '');
  const demo = entry?.demos.find((candidate) => candidate.id === demoId);

  if (status === 'loading') {
    return (
      <View className="flex-1">
        <ScreenHeader title="Demo" showBack />
        <Text size="sm" muted className="p-5">
          Loading demo…
        </Text>
      </View>
    );
  }

  if (status === 'unavailable') {
    return (
      <View className="flex-1">
        <ScreenHeader title="Unavailable" showBack />
        <EmptyState>
          <EmptyState.Header>
            <EmptyState.Title>Demo unavailable</EmptyState.Title>
            <EmptyState.Description>
              This demo could not be loaded. Try again later.
            </EmptyState.Description>
          </EmptyState.Header>
        </EmptyState>
      </View>
    );
  }

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
  //
  // The native back-swipe goes with it by default. iOS claims the left screen
  // edge for popping the stack, and it wins over anything JavaScript puts
  // there, so a demo whose own gesture starts at that edge never sees a touch.
  //
  // A demo that does not own the edge asks for the swipe back with
  // `backSwipe`, and then has two ways out rather than one.
  if (demo.fullBleed) {
    return (
      <View className="flex-1">
        <Stack.Screen options={{ gestureEnabled: demo.backSwipe ?? false }} />
        {demo.render()}
      </View>
    );
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
