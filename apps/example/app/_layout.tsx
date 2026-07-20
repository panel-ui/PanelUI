import '../global.css';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PanelUIProvider } from 'panelui-native';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <PanelUIProvider>
        {/* Headers are drawn by ScreenHeader so they can carry the theme
            toggle and match the design; the native header stays off. */}
        <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />
        <StatusBar style="auto" />
      </PanelUIProvider>
    </SafeAreaProvider>
  );
}
