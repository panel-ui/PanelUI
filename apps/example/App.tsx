import './global.css';

import { useState, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  Checkbox,
  Input,
  PanelUIProvider,
  RadioGroup,
  Skeleton,
  Spinner,
  Switch,
  Text,
  useTheme,
} from 'panelui-native';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-3">
      <Text size="sm" weight="semibold" className="uppercase tracking-wider text-muted-foreground">
        {title}
      </Text>
      {children}
    </View>
  );
}

function Showcase() {
  const { theme, setTheme } = useTheme();
  const [checked, setChecked] = useState(true);
  const [enabled, setEnabled] = useState(true);
  const [plan, setPlan] = useState('pro');

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <ScrollView
        contentContainerClassName="gap-8 p-5 pb-16"
        showsVerticalScrollIndicator={false}
      >
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
    </SafeAreaView>
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
