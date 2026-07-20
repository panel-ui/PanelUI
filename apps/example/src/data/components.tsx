/**
 * The component catalogue — the single source of truth for the showcase.
 *
 * Both the list screen and the detail screen read from here, and the home
 * screen derives its counts from it, so adding a component means adding one
 * entry and nothing else.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import {
  Alert,
  Avatar,
  Badge,
  BottomSheet,
  Button,
  Card,
  Checkbox,
  Dialog,
  EmptyState,
  Frame,
  InlineSelect,
  Input,
  InputGroup,
  Label,
  Progress,
  RadioGroup,
  SearchIcon,
  Select,
  Skeleton,
  Spinner,
  Switch,
  Tabs,
  Text,
  Toast,
  Typography,
  useToast,
} from 'panelui-native';

export interface Demo {
  /** Label shown in the variant picker. */
  label: string;
  render: () => ReactNode;
}

export interface ComponentEntry {
  slug: string;
  name: string;
  /** One-line summary, shown under the name in the list. */
  summary: string;
  demos: Demo[];
}

/* -------------------------------------------------------------------------- */
/* Stateful demo wrappers                                                     */
/* -------------------------------------------------------------------------- */

function SwitchDemo() {
  const [enabled, setEnabled] = useState(true);
  const [push, setPush] = useState(false);

  return (
    <Card className="w-full">
      <Card.Content className="gap-5 p-4">
        <View className="flex-row items-center justify-between gap-4">
          <View className="flex-1">
            <Text weight="medium">Email notifications</Text>
            <Text size="sm" muted>
              Receive updates and newsletters
            </Text>
          </View>
          <Switch value={enabled} onValueChange={setEnabled} />
        </View>
        <View className="flex-row items-center justify-between gap-4">
          <View className="flex-1">
            <Text weight="medium">Push notifications</Text>
            <Text size="sm" muted>
              Get instant alerts on your device
            </Text>
          </View>
          <Switch value={push} onValueChange={setPush} />
        </View>
      </Card.Content>
    </Card>
  );
}

function CheckboxDemo() {
  const [marketing, setMarketing] = useState(true);
  const [updates, setUpdates] = useState(false);

  return (
    <View className="w-full gap-5">
      <Checkbox
        checked={marketing}
        onCheckedChange={setMarketing}
        label="Marketing & promotions"
        description="Special offers and exclusive deals"
      />
      <Checkbox
        checked={updates}
        onCheckedChange={setUpdates}
        label="Product updates"
        description="News about features and releases"
      />
    </View>
  );
}

function RadioGroupDemo() {
  const [plan, setPlan] = useState('pro');

  return (
    <RadioGroup value={plan} onValueChange={setPlan} className="w-full">
      <RadioGroup.Item value="free" label="Free — $0/month" />
      <RadioGroup.Item value="pro" label="Pro — $12/month" />
      <RadioGroup.Item value="team" label="Team — $36/month" />
    </RadioGroup>
  );
}

function SelectDemo() {
  const [fruit, setFruit] = useState<string>();

  return (
    <View className="w-full gap-1.5">
      <Label>Favorite fruit</Label>
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
  );
}

function InlineSelectDemo() {
  const [region, setRegion] = useState<string>();

  return (
    <View className="w-full gap-1.5">
      <Label>Region</Label>
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
  );
}

function LoadingButtonDemo() {
  const [saving, setSaving] = useState(false);

  return (
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
  );
}

function ProgressDemo() {
  const [uploaded, setUploaded] = useState(20);

  useEffect(() => {
    const id = setInterval(() => {
      setUploaded((current) => (current >= 100 ? 0 : current + 20));
    }, 1200);
    return () => clearInterval(id);
  }, []);

  return (
    <View className="w-full gap-4">
      <Progress value={uploaded} />
      <Progress value={uploaded} color="success" size="sm" />
      <Progress value={70} color="warning" size="lg" />
      <Progress indeterminate color="info" />
    </View>
  );
}

function PasswordInputDemo() {
  const [visible, setVisible] = useState(false);

  return (
    <View className="w-full gap-1.5">
      <Label isRequired>Password</Label>
      <InputGroup>
        <InputGroup.Input placeholder="Enter your password" secureTextEntry={!visible} />
        <InputGroup.Suffix>
          <Button variant="ghost" size="sm" onPress={() => setVisible((v) => !v)}>
            {visible ? 'Hide' : 'Show'}
          </Button>
        </InputGroup.Suffix>
      </InputGroup>
    </View>
  );
}

function ToastDemo() {
  const { toast } = useToast();

  return (
    <View className="w-full gap-3">
      <Button variant="outline" onPress={() => toast.show('Link copied to clipboard')}>
        Simple string
      </Button>
      <Button
        variant="outline"
        onPress={() =>
          toast.show({
            variant: 'success',
            label: 'Deployment complete',
            description: 'panelui.dev is live on production.',
            actionLabel: 'View',
          })
        }
      >
        With action
      </Button>
      <Button
        variant="outline"
        onPress={() =>
          toast.show({
            variant: 'destructive',
            label: 'Upload failed',
            description: 'The file exceeds the 25 MB limit.',
            placement: 'top',
          })
        }
      >
        Destructive, top
      </Button>
      <Button
        variant="outline"
        onPress={() =>
          toast.show({
            duration: 6000,
            component: ({ hide }) => (
              <Toast variant="info" onHide={hide}>
                <Toast.Indicator />
                <Toast.Content>
                  <Toast.Title>Custom component</Toast.Title>
                  <Toast.Description>
                    Rendered entirely by the caller.
                  </Toast.Description>
                </Toast.Content>
                <Toast.Close />
              </Toast>
            ),
          })
        }
      >
        Custom component
      </Button>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Catalogue                                                                  */
/* -------------------------------------------------------------------------- */

export const COMPONENTS: ComponentEntry[] = [
  {
    slug: 'alert',
    name: 'Alert',
    summary: 'Status message with an icon',
    demos: [
      {
        label: 'Variants',
        render: () => (
          <View className="w-full gap-3">
            {(['info', 'success', 'warning', 'destructive'] as const).map((variant) => (
              <Alert key={variant} variant={variant}>
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Title>
                    {variant === 'info'
                      ? 'Heads up'
                      : variant === 'success'
                        ? 'Payment received'
                        : variant === 'warning'
                          ? 'Storage almost full'
                          : 'Something went wrong'}
                  </Alert.Title>
                  <Alert.Description>
                    {variant === 'info'
                      ? 'A new version of PanelUI is available.'
                      : variant === 'success'
                        ? 'Your invoice has been paid.'
                        : variant === 'warning'
                          ? "You've used 92% of your quota."
                          : 'Your session has expired.'}
                  </Alert.Description>
                </Alert.Content>
              </Alert>
            ))}
          </View>
        ),
      },
      {
        label: 'Title only',
        render: () => (
          <Alert variant="success">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Changes saved</Alert.Title>
            </Alert.Content>
          </Alert>
        ),
      },
      {
        label: 'No icon',
        render: () => (
          <Alert>
            <Alert.Content>
              <Alert.Title>Plain alert</Alert.Title>
              <Alert.Description>
                Omit Alert.Indicator for a text-only alert.
              </Alert.Description>
            </Alert.Content>
          </Alert>
        ),
      },
    ],
  },
  {
    slug: 'avatar',
    name: 'Avatar',
    summary: 'User image with initials fallback',
    demos: [
      {
        label: 'Sizes',
        render: () => (
          <View className="flex-row items-end gap-3">
            <Avatar size="sm" fallback="KA" />
            <Avatar fallback="KA" />
            <Avatar size="lg" fallback="PU" />
            <Avatar size="xl" fallback="P" />
          </View>
        ),
      },
    ],
  },
  {
    slug: 'badge',
    name: 'Badge',
    summary: 'Compact status label',
    demos: [
      {
        label: 'Variants',
        render: () => (
          <View className="flex-row flex-wrap items-center justify-center gap-2">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="destructive">Error</Badge>
            <Badge variant="info">Info</Badge>
          </View>
        ),
      },
    ],
  },
  {
    slug: 'bottom-sheet',
    name: 'BottomSheet',
    summary: 'Draggable sheet anchored to the bottom',
    demos: [
      {
        label: 'Basic',
        render: () => (
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
        ),
      },
    ],
  },
  {
    slug: 'button',
    name: 'Button',
    summary: 'Pressable action with variants and loading',
    demos: [
      {
        label: 'Variants',
        render: () => (
          <View className="w-full gap-2">
            <Button fullWidth>Primary</Button>
            <Button fullWidth variant="secondary">
              Secondary
            </Button>
            <Button fullWidth variant="outline">
              Outline
            </Button>
            <Button fullWidth variant="ghost">
              Ghost
            </Button>
            <Button fullWidth variant="destructive">
              Delete
            </Button>
          </View>
        ),
      },
      {
        label: 'Sizes',
        render: () => (
          <View className="items-center gap-3">
            <Button size="sm" variant="outline">
              Small
            </Button>
            <Button>Medium</Button>
            <Button size="lg">Large</Button>
            <Button disabled>Disabled</Button>
          </View>
        ),
      },
      { label: 'Loading', render: () => <LoadingButtonDemo /> },
    ],
  },
  {
    slug: 'card',
    name: 'Card',
    summary: 'Grouped content surface',
    demos: [
      {
        label: 'Basic card',
        render: () => (
          <Card className="w-full">
            <Card.Header>
              <Card.Title>Living room Sofa</Card.Title>
              <Card.Description>
                This sofa is perfect for modern tropical spaces, baroque
                inspired spaces.
              </Card.Description>
            </Card.Header>
            <Card.Footer className="gap-2">
              <Button fullWidth>Buy now</Button>
            </Card.Footer>
          </Card>
        ),
      },
      {
        label: 'With form',
        render: () => (
          <Card className="w-full">
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
        ),
      },
    ],
  },
  {
    slug: 'checkbox',
    name: 'Checkbox',
    summary: 'Multi-select control with label',
    demos: [{ label: 'Basic', render: () => <CheckboxDemo /> }],
  },
  {
    slug: 'dialog',
    name: 'Dialog',
    summary: 'Modal confirmation overlay',
    demos: [
      {
        label: 'Confirmation',
        render: () => (
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
        ),
      },
    ],
  },
  {
    slug: 'empty-state',
    name: 'EmptyState',
    summary: 'Placeholder for a view with no content',
    demos: [
      {
        label: 'With icon',
        render: () => (
          <EmptyState>
            <EmptyState.Header>
              <EmptyState.Media variant="icon">
                <SearchIcon size={18} />
              </EmptyState.Media>
              <EmptyState.Title>No results found</EmptyState.Title>
              <EmptyState.Description>
                Try adjusting your search or filters to find what you're looking
                for.
              </EmptyState.Description>
            </EmptyState.Header>
            <EmptyState.Content>
              <Button variant="outline" fullWidth>
                Clear filters
              </Button>
            </EmptyState.Content>
          </EmptyState>
        ),
      },
      {
        label: 'Text only',
        render: () => (
          <EmptyState>
            <EmptyState.Header>
              <EmptyState.Title>Nothing here yet</EmptyState.Title>
              <EmptyState.Description>
                Projects you create will show up on this screen.
              </EmptyState.Description>
            </EmptyState.Header>
          </EmptyState>
        ),
      },
    ],
  },
  {
    slug: 'frame',
    name: 'Frame',
    summary: 'Grouped list section with header and rows',
    demos: [
      {
        label: 'Member list',
        render: () => (
          <Frame className="w-full">
            <Frame.Header>
              <Frame.Title>Team members</Frame.Title>
              <Frame.Description>People with access to this project</Frame.Description>
            </Frame.Header>
            <Frame.Panel>
              {[
                ['KA', 'Khalid Abdi', 'khalid@example.com', 'Owner'],
                ['JD', 'Jamie Doe', 'jamie@example.com', 'Editor'],
                ['SM', 'Sam Miller', 'sam@example.com', 'Viewer'],
              ].map(([initials, name, email, role], index) => (
                <Frame.Row key={email} divided={index > 0}>
                  <Avatar size="sm" fallback={initials} />
                  <View className="flex-1">
                    <Text size="sm" weight="medium">
                      {name}
                    </Text>
                    <Text size="xs" muted>
                      {email}
                    </Text>
                  </View>
                  <Badge variant="outline">{role}</Badge>
                </Frame.Row>
              ))}
            </Frame.Panel>
            <Frame.Footer>
              <Text size="sm" muted>
                3 members with access
              </Text>
            </Frame.Footer>
          </Frame>
        ),
      },
    ],
  },
  {
    slug: 'inline-select',
    name: 'InlineSelect',
    summary: 'Picker that expands in place',
    demos: [{ label: 'Basic', render: () => <InlineSelectDemo /> }],
  },
  {
    slug: 'input',
    name: 'Input',
    summary: 'Text field with label and validation',
    demos: [
      {
        label: 'States',
        render: () => (
          <View className="w-full gap-4">
            <Input label="Name" placeholder="Khalid Abdi" />
            <Input
              label="Description"
              placeholder="A short description"
              description="Shown on your public profile."
            />
            <Input
              label="Email"
              placeholder="you@example.com"
              errorMessage="This email is already taken."
            />
            <Input label="Plan" value="Premium" disabled />
          </View>
        ),
      },
    ],
  },
  {
    slug: 'input-group',
    name: 'InputGroup',
    summary: 'Input with prefix and suffix decorators',
    demos: [
      {
        label: 'With prefix',
        render: () => (
          <InputGroup className="w-full">
            <InputGroup.Prefix isDecorative>
              <SearchIcon size={16} />
            </InputGroup.Prefix>
            <InputGroup.Input placeholder="Search products…" />
          </InputGroup>
        ),
      },
      { label: 'Interactive suffix', render: () => <PasswordInputDemo /> },
      {
        label: 'Disabled',
        render: () => (
          <InputGroup isDisabled className="w-full">
            <InputGroup.Prefix isDecorative>
              <SearchIcon size={16} />
            </InputGroup.Prefix>
            <InputGroup.Input placeholder="Disabled input" />
          </InputGroup>
        ),
      },
    ],
  },
  {
    slug: 'label',
    name: 'Label',
    summary: 'Form field label with required and invalid states',
    demos: [
      {
        label: 'States',
        render: () => (
          <View className="w-full gap-5">
            <View className="gap-1.5">
              <Label>Username</Label>
              <Input placeholder="Choose a username" />
            </View>
            <View className="gap-1.5">
              <Label isRequired>Password</Label>
              <Input placeholder="Create a password" secureTextEntry />
            </View>
            <View className="gap-1.5">
              <Label isInvalid>Confirm password</Label>
              <Input value="different" errorMessage="Passwords do not match" />
            </View>
            <View className="gap-1.5">
              <Label isDisabled>Subscription plan</Label>
              <Input value="Premium" disabled />
            </View>
          </View>
        ),
      },
    ],
  },
  {
    slug: 'progress',
    name: 'Progress',
    summary: 'Determinate and indeterminate progress bar',
    demos: [{ label: 'Animated', render: () => <ProgressDemo /> }],
  },
  {
    slug: 'radio-group',
    name: 'RadioGroup',
    summary: 'Single-select list of options',
    demos: [{ label: 'Basic', render: () => <RadioGroupDemo /> }],
  },
  {
    slug: 'select',
    name: 'Select',
    summary: 'Picker that opens in a bottom sheet',
    demos: [{ label: 'Basic', render: () => <SelectDemo /> }],
  },
  {
    slug: 'skeleton',
    name: 'Skeleton',
    summary: 'Shimmer placeholder for loading content',
    demos: [
      {
        label: 'List row',
        render: () => (
          <View className="w-full gap-4">
            <View className="flex-row items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <View className="flex-1 gap-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </View>
            </View>
            <Skeleton className="h-32 w-full rounded-xl" />
          </View>
        ),
      },
    ],
  },
  {
    slug: 'spinner',
    name: 'Spinner',
    summary: 'Indeterminate loading indicator',
    demos: [
      {
        label: 'Sizes',
        render: () => (
          <View className="flex-row items-center gap-6">
            <Spinner size="sm" />
            <Spinner />
            <Spinner size="lg" />
          </View>
        ),
      },
    ],
  },
  {
    slug: 'switch',
    name: 'Switch',
    summary: 'On/off toggle',
    demos: [{ label: 'Settings rows', render: () => <SwitchDemo /> }],
  },
  {
    slug: 'tabs',
    name: 'Tabs',
    summary: 'Segmented navigation between panels',
    demos: [
      {
        label: 'Basic',
        render: () => (
          <Tabs defaultValue="account" className="w-full">
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
        ),
      },
    ],
  },
  {
    slug: 'toast',
    name: 'Toast',
    summary: 'Transient notification with swipe to dismiss',
    demos: [{ label: 'Usage patterns', render: () => <ToastDemo /> }],
  },
  {
    slug: 'typography',
    name: 'Typography',
    summary: 'Semantic text presets',
    demos: [
      {
        label: 'Types',
        render: () => (
          <View className="w-full gap-3">
            <Typography type="h1">Heading 1</Typography>
            <Typography type="h2">Heading 2</Typography>
            <Typography type="h3">Heading 3</Typography>
            <Typography type="h4">Heading 4</Typography>
            <Typography type="body">Body text</Typography>
            <Typography type="body-sm" muted>
              Small body text
            </Typography>
            <Typography.Code>npm i panelui-native</Typography.Code>
          </View>
        ),
      },
      {
        label: 'Paragraphs',
        render: () => (
          <View className="w-full gap-3">
            <Typography.Paragraph>
              This is a default body paragraph. It uses the base font size and
              normal weight for comfortable reading.
            </Typography.Paragraph>
            <Typography.Paragraph type="body-sm" muted>
              A smaller paragraph, useful for captions, footnotes, or secondary
              descriptions.
            </Typography.Paragraph>
          </View>
        ),
      },
    ],
  },
];

/** Catalogue keyed by slug, for the detail route. */
export const COMPONENTS_BY_SLUG: Record<string, ComponentEntry> = Object.fromEntries(
  COMPONENTS.map((entry) => [entry.slug, entry])
);
