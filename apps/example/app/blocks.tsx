import { View } from 'react-native';
import { EmptyState, SearchIcon, useThemeMode } from 'panelui-native';
import { ScreenHeader } from '../src/components/screen-header';
import { BLOCKS } from '../src/data/blocks';

export default function BlocksScreen() {
  const { mode } = useThemeMode();
  const tint = mode === 'dark' ? '#818181' : '#686868';

  return (
    <View className="flex-1">
      <ScreenHeader title="Blocks" showBack />

      {BLOCKS.length === 0 ? (
        <EmptyState>
          <EmptyState.Header>
            <EmptyState.Media variant="icon">
              <SearchIcon size={18} color={tint} />
            </EmptyState.Media>
            <EmptyState.Title>No blocks yet</EmptyState.Title>
            <EmptyState.Description>
              Composed page sections — sign-in forms, settings panels, pricing
              tables — will land here.
            </EmptyState.Description>
          </EmptyState.Header>
        </EmptyState>
      ) : null}
    </View>
  );
}
