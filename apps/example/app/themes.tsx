import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Checkbox,
  Frame,
  PANEL_THEMES,
  Progress,
  Switch,
  Text,
  useThemeMode,
} from 'panelui-native';
import { ScreenHeader } from '../src/components/screen-header';

/** One circular colour swatch; the active family gets a ring. */
function ThemeSwatch({
  id,
  name,
  color,
  active,
  onPress,
}: {
  id: string;
  name: string;
  color: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`${name} theme`}
      onPress={onPress}
      className="items-center gap-2"
      testID={`theme-${id}`}
    >
      <View
        className={
          active
            ? 'h-[68px] w-[68px] items-center justify-center rounded-full border-2 border-ring'
            : 'h-[68px] w-[68px] items-center justify-center rounded-full'
        }
      >
        <View className="h-14 w-14 rounded-full" style={{ backgroundColor: color }} />
      </View>
      <Text size="sm" weight={active ? 'semibold' : 'normal'} muted={!active}>
        {name}
      </Text>
    </Pressable>
  );
}

export default function ThemesScreen() {
  const { family, mode, setFamily } = useThemeMode();
  const [emails, setEmails] = useState(true);
  const [push, setPush] = useState(false);
  const [marketing, setMarketing] = useState(true);

  return (
    <View className="flex-1">
      <ScreenHeader title="Themes" showBack />

      <ScrollView
        contentContainerClassName="gap-6 px-5 pb-12"
        showsVerticalScrollIndicator={false}
      >
        <View
          accessibilityRole="radiogroup"
          className="flex-row justify-around py-2"
        >
          {PANEL_THEMES.map((candidate) => (
            <ThemeSwatch
              key={candidate.id}
              id={candidate.id}
              name={candidate.name}
              // Swatch tracks the current mode so it reads against the page.
              color={candidate.swatch[mode === 'dark' ? 1 : 0]}
              active={candidate.id === family.id}
              onPress={() => setFamily(candidate.id)}
            />
          ))}
        </View>

        <Text size="sm" muted className="text-center">
          {family.name} · {mode}. A theme sets radius as well as colour — watch the
          corners change, not just the palette.
        </Text>

        {/* Radius ramp, so the shape difference between families is obvious. */}
        <View className="flex-row items-end justify-between gap-2">
          {(['sm', 'md', 'lg', 'xl', '2xl', '3xl'] as const).map((step) => (
            <View key={step} className="flex-1 items-center gap-1.5">
              <View
                className={
                  step === 'sm'
                    ? 'h-12 w-full border border-border bg-surface rounded-sm'
                    : step === 'md'
                      ? 'h-12 w-full border border-border bg-surface rounded-md'
                      : step === 'lg'
                        ? 'h-12 w-full border border-border bg-surface rounded-lg'
                        : step === 'xl'
                          ? 'h-12 w-full border border-border bg-surface rounded-xl'
                          : step === '2xl'
                            ? 'h-12 w-full border border-border bg-surface rounded-2xl'
                            : 'h-12 w-full border border-border bg-surface rounded-3xl'
                }
              />
              <Text size="xs" muted>
                {step}
              </Text>
            </View>
          ))}
        </View>

        {/* Live preview — a slice of real UI, so a theme can be judged in use. */}
        <View className="flex-row gap-3">
          {[
            ['Indie Hackers', '148 members', 'IH', 'warning'],
            ['AI Builders', '362 members', 'AB', 'success'],
          ].map(([title, members, initials, tone]) => (
            <Card key={title} className="flex-1">
              <Card.Content className="gap-3 p-4">
                <Avatar size="lg" fallback={initials} />
                <View>
                  <Text weight="semibold">{title}</Text>
                  <Text size="sm" muted>
                    {members}
                  </Text>
                </View>
                <Badge variant={tone as 'warning' | 'success'}>Active</Badge>
              </Card.Content>
            </Card>
          ))}
        </View>

        <Frame>
          <Frame.Panel>
            <Frame.Row>
              <View className="flex-1">
                <Text weight="medium">Email notifications</Text>
                <Text size="sm" muted>
                  Receive updates and newsletters via email
                </Text>
              </View>
              <Switch value={emails} onValueChange={setEmails} />
            </Frame.Row>
            <Frame.Row divided>
              <View className="flex-1">
                <Text weight="medium">Push notifications</Text>
                <Text size="sm" muted>
                  Get instant alerts on your device
                </Text>
              </View>
              <Switch value={push} onValueChange={setPush} />
            </Frame.Row>
          </Frame.Panel>
        </Frame>

        <Checkbox
          checked={marketing}
          onCheckedChange={setMarketing}
          label="Marketing & promotions"
          description="Special offers and exclusive deals"
        />

        <View className="gap-3">
          <Progress value={64} />
          <View className="flex-row gap-2">
            <Button size="sm">Primary</Button>
            <Button size="sm" variant="secondary">
              Secondary
            </Button>
            <Button size="sm" variant="outline">
              Outline
            </Button>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
