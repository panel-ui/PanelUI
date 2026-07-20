import './global.css';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { FlatList, ScrollView, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Alert,
  Avatar,
  Badge,
  BottomSheet,
  Button,
  Card,
  Checkbox,
  Dialog,
  Frame,
  InlineSelect,
  Input,
  PanelUIProvider,
  Progress,
  RadioGroup,
  Select,
  Skeleton,
  Spinner,
  Switch,
  Tabs,
  Text,
  useTheme,
} from 'panelui-native';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-3">
      <Text
        size="sm"
        weight="semibold"
        className="uppercase tracking-wider text-muted-foreground"
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

const SWATCHES = [
  { name: 'background', className: 'bg-background' },
  { name: 'card', className: 'bg-card' },
  { name: 'surface', className: 'bg-surface' },
  { name: 'skeleton', className: 'bg-skeleton' },
  { name: 'muted', className: 'bg-muted' },
  { name: 'secondary', className: 'bg-secondary' },
  { name: 'primary', className: 'bg-primary' },
  { name: 'destructive', className: 'bg-destructive' },
];

/**
 * Renders the resolved theme plus a swatch per token. If the theme toggle
 * works, every swatch changes when you switch modes. If a swatch is blank,
 * that token failed to compile.
 */
function ThemeDiagnostics() {
  const { theme, setTheme } = useTheme();

  return (
    <Card>
      <Card.Content className="gap-3 p-4">
        <View className="flex-row items-center justify-between">
          <Text weight="semibold">Resolved theme</Text>
          <Badge variant={theme === 'dark' ? 'default' : 'secondary'}>{theme}</Badge>
        </View>
        <View className="flex-row flex-wrap gap-2">
          <Button size="sm" variant="outline" onPress={() => setTheme('light')}>
            Light
          </Button>
          <Button size="sm" variant="outline" onPress={() => setTheme('dark')}>
            Dark
          </Button>
          <Button size="sm" variant="outline" onPress={() => setTheme('system')}>
            System
          </Button>
        </View>
        <View className="flex-row flex-wrap gap-3">
          {SWATCHES.map((swatch) => (
            <View key={swatch.name} className="items-center gap-1">
              <View
                className={`h-10 w-10 rounded-lg border border-border ${swatch.className}`}
              />
              <Text size="xs" muted>
                {swatch.name}
              </Text>
            </View>
          ))}
        </View>
      </Card.Content>
    </Card>
  );
}

function Gallery() {
  const [checked, setChecked] = useState(true);
  const [enabled, setEnabled] = useState(true);
  const [plan, setPlan] = useState('pro');
  const [fruit, setFruit] = useState<string | undefined>();
  const [region, setRegion] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [uploaded, setUploaded] = useState(30);

  useEffect(() => {
    const id = setInterval(() => {
      setUploaded((current) => (current >= 100 ? 0 : current + 20));
    }, 1200);
    return () => clearInterval(id);
  }, []);

  return (
    <ScrollView
      contentContainerClassName="gap-8 p-5 pb-16"
      showsVerticalScrollIndicator={false}
    >
      <Section title="Theme diagnostics">
        <ThemeDiagnostics />
      </Section>

      <Section title="Buttons">
        <View className="flex-row flex-wrap gap-2">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Delete</Button>
        </View>
        <View className="flex-row flex-wrap items-center gap-2">
          <Button size="sm" variant="outline">
            Small
          </Button>
          <Button size="lg">Large</Button>
          <Button disabled>Disabled</Button>
        </View>
        <Button
          fullWidth
          loading={saving}
          onPress={() => {
            setSaving(true);
            setTimeout(() => setSaving(false), 1800);
          }}
        >
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
      </Section>

      <Section title="Badges">
        <View className="flex-row flex-wrap gap-2">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="destructive">Error</Badge>
          <Badge variant="info">Info</Badge>
        </View>
      </Section>

      <Section title="Tabs">
        <Tabs defaultValue="account">
          <Tabs.List>
            <Tabs.Trigger value="account">Account</Tabs.Trigger>
            <Tabs.Trigger value="password">Password</Tabs.Trigger>
            <Tabs.Trigger value="team">Team</Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="account">
            <Card>
              <Card.Content className="gap-4 p-4">
                <Input label="Name" placeholder="Khalid Abdi" />
                <Input label="Username" placeholder="@khalid" />
              </Card.Content>
            </Card>
          </Tabs.Content>
          <Tabs.Content value="password">
            <Card>
              <Card.Content className="gap-4 p-4">
                <Input label="Current password" secureTextEntry />
                <Input label="New password" secureTextEntry />
              </Card.Content>
            </Card>
          </Tabs.Content>
          <Tabs.Content value="team">
            <Card>
              <Card.Content className="flex-row items-center gap-3 p-4">
                <Avatar fallback="KA" />
                <View className="flex-1">
                  <Text weight="medium">Khalid Abdi</Text>
                  <Text size="sm" muted>
                    Owner
                  </Text>
                </View>
                <Badge variant="secondary">Admin</Badge>
              </Card.Content>
            </Card>
          </Tabs.Content>
        </Tabs>
      </Section>

      <Section title="Overlays">
        <View className="flex-row flex-wrap gap-2">
          <Dialog>
            <Dialog.Trigger>
              <Button variant="outline">Open dialog</Button>
            </Dialog.Trigger>
            <Dialog.Content>
              <Dialog.Title>Delete project?</Dialog.Title>
              <Dialog.Description>
                This action cannot be undone. The project and all of its data
                will be permanently removed.
              </Dialog.Description>
              <Dialog.Footer>
                <Dialog.Close>
                  <Button size="sm" variant="ghost">
                    Cancel
                  </Button>
                </Dialog.Close>
                <Dialog.Close>
                  <Button size="sm" variant="destructive">
                    Delete
                  </Button>
                </Dialog.Close>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog>

          <BottomSheet>
            <BottomSheet.Trigger>
              <Button variant="outline">Open sheet</Button>
            </BottomSheet.Trigger>
            <BottomSheet.Content>
              <Text size="lg" weight="semibold" className="mb-1">
                Share project
              </Text>
              <Text size="sm" muted className="mb-4">
                Anyone with the link can view this project.
              </Text>
              <View className="gap-3 pb-2">
                <Input placeholder="https://panelui.dev/p/xK2f9" />
                <Button>Copy link</Button>
              </View>
            </BottomSheet.Content>
          </BottomSheet>
        </View>
      </Section>

      <Section title="Frame">
        <Frame>
          <Frame.Header>
            <Frame.Title>Section header</Frame.Title>
            <Frame.Description>Brief description about the section</Frame.Description>
          </Frame.Header>
          <Frame.Panel>
            <Frame.Row>
              <Avatar size="sm" fallback="KA" />
              <View className="flex-1">
                <Text size="sm" weight="medium">Khalid Abdi</Text>
                <Text size="xs" muted>khalid@example.com</Text>
              </View>
              <Badge variant="outline">Owner</Badge>
            </Frame.Row>
            <Frame.Row divided>
              <Avatar size="sm" fallback="JD" />
              <View className="flex-1">
                <Text size="sm" weight="medium">Jamie Doe</Text>
                <Text size="xs" muted>jamie@example.com</Text>
              </View>
              <Badge variant="outline">Editor</Badge>
            </Frame.Row>
            <Frame.Row divided>
              <Avatar size="sm" fallback="SM" />
              <View className="flex-1">
                <Text size="sm" weight="medium">Sam Miller</Text>
                <Text size="xs" muted>sam@example.com</Text>
              </View>
              <Badge variant="outline">Viewer</Badge>
            </Frame.Row>
          </Frame.Panel>
          <Frame.Footer>
            <Text size="sm" muted>3 members with access</Text>
          </Frame.Footer>
        </Frame>
      </Section>

      <Section title="Card">
        <Card>
          <Card.Header>
            <Card.Title>Project settings</Card.Title>
            <Card.Description>
              Manage how your project appears to others.
            </Card.Description>
          </Card.Header>
          <Card.Content className="gap-4">
            <Input label="Project name" placeholder="PanelUI" />
            <Input
              label="Description"
              placeholder="A short description"
              description="Shown on your public profile."
            />
          </Card.Content>
          <Card.Footer>
            <Button size="sm">Save</Button>
            <Button size="sm" variant="ghost">
              Cancel
            </Button>
          </Card.Footer>
        </Card>
      </Section>

      <Section title="Alerts">
        <Alert variant="info">
          <Alert.Title>Heads up</Alert.Title>
          <Alert.Description>
            A new version of PanelUI is available.
          </Alert.Description>
        </Alert>
        <Alert variant="success">
          <Alert.Title>Payment received</Alert.Title>
          <Alert.Description>Your invoice has been paid.</Alert.Description>
        </Alert>
        <Alert variant="destructive">
          <Alert.Title>Something went wrong</Alert.Title>
          <Alert.Description>Your session has expired.</Alert.Description>
        </Alert>
      </Section>

      <Section title="Form controls">
        <Card>
          <Card.Content className="gap-5 p-4">
            <View className="flex-row items-center justify-between">
              <Text>Push notifications</Text>
              <Switch value={enabled} onValueChange={setEnabled} />
            </View>
            <Checkbox
              checked={checked}
              onCheckedChange={setChecked}
              label="Accept terms and conditions"
            />
            <RadioGroup value={plan} onValueChange={setPlan}>
              <RadioGroup.Item value="free" label="Free — $0/month" />
              <RadioGroup.Item value="pro" label="Pro — $12/month" />
              <RadioGroup.Item value="team" label="Team — $36/month" />
            </RadioGroup>
            <View className="gap-1.5">
              <Text size="sm" weight="medium">
                Region (inline — no sheet)
              </Text>
              <InlineSelect
                value={region}
                onValueChange={setRegion}
                placeholder="Select a region"
              >
                <InlineSelect.Item value="us" label="United States" />
                <InlineSelect.Item value="eu" label="Europe" />
                <InlineSelect.Item value="apac" label="Asia Pacific" />
              </InlineSelect>
            </View>
            <View className="gap-1.5">
              <Text size="sm" weight="medium">
                Favorite fruit (bottom sheet)
              </Text>
              <Select
                value={fruit}
                onValueChange={setFruit}
                placeholder="Select a fruit"
                title="Favorite fruit"
              >
                <Select.Item value="apple" label="Apple" />
                <Select.Item value="banana" label="Banana" />
                <Select.Item value="cherry" label="Cherry" />
                <Select.Item value="mango" label="Mango" />
              </Select>
            </View>
            <Input
              label="Email"
              placeholder="you@example.com"
              errorMessage="This email is already taken."
            />
          </Card.Content>
        </Card>
      </Section>

      <Section title="Feedback">
        <View className="flex-row items-center gap-6">
          <Spinner size="sm" />
          <Spinner />
          <Spinner size="lg" />
        </View>
        <View className="flex-row items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-full" />
          <View className="flex-1 gap-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </View>
        </View>
      </Section>

      <Section title="Progress">
        <View className="gap-4">
          <Progress value={uploaded} />
          <Progress value={uploaded} color="success" size="sm" />
          <Progress value={70} color="warning" size="lg" />
          <Progress indeterminate color="info" />
        </View>
      </Section>

      <Section title="Avatars">
        <View className="flex-row items-end gap-3">
          <Avatar size="sm" fallback="KA" />
          <Avatar fallback="KA" />
          <Avatar
            size="lg"
            source={{ uri: 'https://github.com/Khalidabdi1.png' }}
            fallback="KA"
          />
          <Avatar size="xl" fallback="P" />
        </View>
      </Section>
    </ScrollView>
  );
}

const PERF_DATA = Array.from({ length: 1000 }, (_, index) => ({
  id: String(index),
  title: `Row ${index + 1}`,
}));

function PerfRow({ title }: { title: string }) {
  return (
    <Card className="mx-5 mb-2">
      <Card.Content className="flex-row items-center gap-3 p-3">
        <Avatar size="sm" fallback={title.slice(4)} />
        <View className="flex-1">
          <Text size="sm" weight="medium">
            {title}
          </Text>
          <Text size="xs" muted>
            1,000-row perf smoke test
          </Text>
        </View>
        <Badge variant="success">60fps</Badge>
      </Card.Content>
    </Card>
  );
}

function PerfScreen() {
  const renderItem = useCallback(
    ({ item }: { item: (typeof PERF_DATA)[number] }) => (
      <PerfRow title={item.title} />
    ),
    []
  );

  return (
    <FlatList
      data={PERF_DATA}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      contentContainerClassName="py-3"
      showsVerticalScrollIndicator={false}
    />
  );
}

function Showcase() {
  const { theme, setTheme } = useTheme();
  const [screen, setScreen] = useState('gallery');
  const insets = useSafeAreaInsets();

  return (
    // A plain View, not SafeAreaView: native wrappers ignore className, so
    // insets are applied as style and the theming stays on a real View.
    <View
      className="flex-1"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <View className="gap-4 px-5 pt-2">
        <View className="flex-row items-center justify-between">
          <View>
            <Text size="2xl" weight="bold">
              PanelUI
            </Text>
            <Text size="sm" muted>
              High-performance components for Expo
            </Text>
          </View>
          <View className="flex-row items-center gap-2">
            <Text size="sm" muted>
              Dark
            </Text>
            <Switch
              value={theme === 'dark'}
              onValueChange={(dark) => setTheme(dark ? 'dark' : 'light')}
            />
          </View>
        </View>
        <Tabs value={screen} onValueChange={setScreen} defaultValue="gallery">
          <Tabs.List>
            <Tabs.Trigger value="gallery">Gallery</Tabs.Trigger>
            <Tabs.Trigger value="perf">Perf (1k rows)</Tabs.Trigger>
          </Tabs.List>
        </Tabs>
      </View>
      {screen === 'gallery' ? <Gallery /> : <PerfScreen />}
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <PanelUIProvider>
        <Showcase />
        <StatusBar style="auto" />
      </PanelUIProvider>
    </SafeAreaProvider>
  );
}
