import { useEffect, useState, type ComponentType } from 'react';
import { View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { EmptyState, Text } from 'panelui-native';
import { ScreenHeader } from '../../src/components/screen-header';
import { isBlockSlug, loadBlock, type BlockProps } from '../../src/data/blocks';

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; Block: ComponentType<BlockProps> }
  | { status: 'unavailable' };

/**
 * One block, filling the screen.
 *
 * A block is a whole screen, so it gets the route to itself: no header, no
 * padding, no scroll wrapper. It draws its own back button from `onBack`, the
 * same prop a project passes once the block is copied into it.
 *
 * The back-swipe stays on. No block starts a gesture at the screen edge, so
 * there is nothing for it to take a touch from.
 */
export default function BlockScreen() {
  const { slug = '' } = useLocalSearchParams<{ slug: string }>();
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    if (!isBlockSlug(slug)) return;
    let active = true;
    setState({ status: 'loading' });
    loadBlock(slug).then(
      (Block) => {
        if (active) setState({ status: 'ready', Block });
      },
      () => {
        if (active) setState({ status: 'unavailable' });
      }
    );
    return () => {
      active = false;
    };
  }, [slug]);

  if (!isBlockSlug(slug)) {
    return (
      <View className="flex-1">
        <ScreenHeader title="Not found" showBack />
        <EmptyState>
          <EmptyState.Header>
            <EmptyState.Title>Unknown block</EmptyState.Title>
            <EmptyState.Description>
              {`There is no block with the slug “${slug}”.`}
            </EmptyState.Description>
          </EmptyState.Header>
        </EmptyState>
      </View>
    );
  }

  if (state.status === 'loading') {
    return (
      <View className="flex-1">
        <ScreenHeader title="Block" showBack />
        <Text size="sm" muted className="p-5">
          Loading block…
        </Text>
      </View>
    );
  }

  if (state.status === 'unavailable') {
    return (
      <View className="flex-1">
        <ScreenHeader title="Unavailable" showBack />
        <EmptyState>
          <EmptyState.Header>
            <EmptyState.Title>Block unavailable</EmptyState.Title>
            <EmptyState.Description>
              This block could not be loaded. Try again later.
            </EmptyState.Description>
          </EmptyState.Header>
        </EmptyState>
      </View>
    );
  }

  const { Block } = state;
  return (
    <View className="flex-1">
      <Stack.Screen options={{ gestureEnabled: true }} />
      <Block onBack={router.back} />
    </View>
  );
}
