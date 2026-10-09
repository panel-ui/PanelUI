import { ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { PANEL_THEMES } from 'panelui-native/theme';
import { HomeCard } from '../src/components/home-card';
import { ScreenHeader } from '../src/components/screen-header';
import { BLOCKS } from '../src/data/blocks';
import { COMPONENT_COUNT } from '../src/data/components.generated';

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
          count={COMPONENT_COUNT}
          onPress={() => router.push('/components')}
        />
        <HomeCard
          title="Themes"
          subtitle="Try different themes"
          count={PANEL_THEMES.length}
          onPress={() => router.push('/themes')}
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
