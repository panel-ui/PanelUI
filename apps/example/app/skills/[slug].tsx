import { useCallback, useEffect, useState, type ComponentType } from 'react';
import { ScrollView, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { EmptyState, Text } from 'panelui-native';
import { ScreenHeader } from '../../src/components/screen-header';
import { SKILL_EXAMPLES, findSkillExample, type SkillFigureProps } from '../../src/data/skills';

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; Figure: ComponentType<SkillFigureProps> }
  | { status: 'unavailable' };

/**
 * One figure made with a skill, with the request that produced it.
 *
 * The figure's model runs only while this screen is focused, so a figure left
 * behind in the stack stops stepping its physics.
 */
export default function SkillExampleScreen() {
  const { slug = '' } = useLocalSearchParams<{ slug: string }>();
  const example = findSkillExample(slug);
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [focused, setFocused] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, [])
  );

  useEffect(() => {
    if (!example) return;
    let live = true;
    setState({ status: 'loading' });
    example.load().then(
      (Figure) => {
        if (live) setState({ status: 'ready', Figure });
      },
      () => {
        if (live) setState({ status: 'unavailable' });
      }
    );
    return () => {
      live = false;
    };
  }, [example]);

  if (!example) {
    return (
      <View className="flex-1">
        <ScreenHeader title="Not found" showBack />
        <EmptyState>
          <EmptyState.Header>
            <EmptyState.Title>Unknown figure</EmptyState.Title>
            <EmptyState.Description>{`There is no figure with the slug “${slug}”.`}</EmptyState.Description>
          </EmptyState.Header>
        </EmptyState>
      </View>
    );
  }

  const number = SKILL_EXAMPLES.filter((item) => item.skill === example.skill).indexOf(example) + 1;

  return (
    <View className="flex-1">
      <ScreenHeader title={example.name} showBack />
      <ScrollView contentContainerClassName="gap-5 px-5 pb-12 pt-2" showsVerticalScrollIndicator={false}>
        {state.status === 'ready' ? (
          <state.Figure figure={number} active={focused} />
        ) : (
          <Text size="sm" muted>
            {state.status === 'loading' ? 'Loading figure…' : 'This figure could not be loaded.'}
          </Text>
        )}
        <View className="gap-1 rounded-2xl border border-border bg-surface p-4">
          <Text size="xs" muted>
            {`Asked of the ${example.skill} skill`}
          </Text>
          <Text size="sm">{example.prompt}</Text>
        </View>
      </ScrollView>
    </View>
  );
}
