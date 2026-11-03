import { Fragment } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { ChevronRightIcon, Text, useThemeMode } from 'panelui-native';
import { ScreenHeader } from '../../src/components/screen-header';
import { SKILLS, SKILL_EXAMPLES, type SkillExample } from '../../src/data/skills';

/** One figure, drawn with the same parts as a row in the block list. */
function ExampleRow({ example, tint }: { example: SkillExample; tint: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${example.name}. ${example.summary}.`}
      onPress={() => router.push(`/skills/${example.slug}`)}
      className="flex-row items-center gap-3 px-5 py-4 active:bg-muted"
    >
      <View className="flex-1">
        <Text size="lg">{example.name}</Text>
        <Text size="sm" muted>
          {example.summary}
        </Text>
      </View>
      <ChevronRightIcon size={18} color={tint} />
    </Pressable>
  );
}

export default function SkillsScreen() {
  const { mode } = useThemeMode();
  const tint = mode === 'dark' ? '#818181' : '#686868';

  return (
    <View className="flex-1">
      <ScreenHeader title="Skills" showBack />
      <ScrollView contentContainerClassName="pb-10" showsVerticalScrollIndicator={false}>
        {SKILLS.map((skill) => (
          <View key={skill.name}>
            <View className="px-5 pb-2 pt-4">
              <Text size="sm" weight="medium">
                {skill.title}
              </Text>
              <Text size="sm" muted>
                {skill.summary}
              </Text>
            </View>
            {SKILL_EXAMPLES.filter((example) => example.skill === skill.name).map((example, index) => (
              <Fragment key={example.slug}>
                {index > 0 ? <View className="mx-5 h-px bg-border" /> : null}
                <ExampleRow example={example} tint={tint} />
              </Fragment>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
