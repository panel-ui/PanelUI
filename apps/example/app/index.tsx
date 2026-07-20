import { ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { PANEL_THEMES } from 'panelui-native';
import { HomeCard } from '../src/components/home-card';
import { ScreenHeader } from '../src/components/screen-header';
import { BLOCKS } from '../src/data/blocks';
import { COMPONENTS } from '../src/data/components';

/** Documented hooks, plus ScrollFade and Shimmer shown on the same screen. */
const HOOK_COUNT = 8;

export default function HomeScreen() {
  return (
    <View className="flex-1">
      <ScreenHeader />
      <ScrollView
        contentContainerClassName="gap-5 px-5 pb-10"
        showsVerticalScrollIndicator={false}
      >
        <HomeCard
          title="Components"
          subtitle="Explore all components"
          count={COMPONENTS.length}
          onPress={() => router.push('/components')}
        />
        <HomeCard
          title="Themes"
          subtitle="Try different themes"
          count={PANEL_THEMES.length}
          onPress={() => router.push('/themes')}
        />
        <HomeCard
          title="Hooks"
          subtitle="Utilities and state helpers"
          count={HOOK_COUNT}
          onPress={() => router.push('/hooks')}
        />
        <HomeCard
          title="Blocks"
          subtitle="Ready-made page sections"
          count={BLOCKS.length}
          onPress={() => router.push('/blocks')}
        />
      </ScrollView>
    </View>
  );
}
