import { ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { PANEL_THEMES } from 'panelui-native';
import { GradientCard } from '../src/components/gradient-card';
import { ScreenHeader } from '../src/components/screen-header';
import { COMPONENTS } from '../src/data/components';

/** Total demos across the catalogue — the "showcases" count. */
const DEMO_COUNT = COMPONENTS.reduce((total, entry) => total + entry.demos.length, 0);

export default function HomeScreen() {
  return (
    <View className="flex-1">
      <ScreenHeader />
      <ScrollView
        contentContainerClassName="gap-5 px-5 pb-10"
        showsVerticalScrollIndicator={false}
      >
        <GradientCard
          title="Components"
          subtitle="Explore all components"
          count={COMPONENTS.length}
          colors={['#1e3a5f', '#0f172a', '#020617']}
          onPress={() => router.push('/components')}
        />
        <GradientCard
          title="Themes"
          subtitle="Try different themes"
          count={PANEL_THEMES.length}
          colors={['#6d28d9', '#3b0764', '#1e1b4b']}
          onPress={() => router.push('/themes')}
        />
        <GradientCard
          title="Showcases"
          subtitle="View components in context"
          count={DEMO_COUNT}
          colors={['#0369a1', '#082f49', '#020617']}
          onPress={() => router.push('/components')}
        />
      </ScrollView>
    </View>
  );
}
